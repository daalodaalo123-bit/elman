import mongoose from 'mongoose';
import { Customer, InventoryLog, Product, Sale } from './models.js';
import { makeReceiptRef } from './utils.js';

async function resolveCustomerName(customer_id?: string, customer?: string | null): Promise<string | null> {
  if (customer_id) {
    const c = await Customer.findById(new mongoose.Types.ObjectId(customer_id)).lean();
    if (c?.name) return String(c.name);
  }
  return customer ? String(customer) : null;
}

export async function createSale(input: any) {
  const receipt_ref = makeReceiptRef();

  const session = await mongoose.startSession();
  try {
    let result: any;

    await session.withTransaction(async () => {
      let subtotal = 0;
      const items: any[] = [];

      for (const it of input.items) {
        const prod = await Product.findById(new mongoose.Types.ObjectId(it.product_id)).session(session);
        if (!prod) throw new Error(`Product not found: ${it.product_id}`);
        if (prod.stock < it.qty) throw new Error(`Insufficient stock for ${prod.name}. Available: ${prod.stock}`);

        const unit_price = it.unit_price ?? Number(prod.price);
        const line_total = unit_price * it.qty;
        subtotal += line_total;

        items.push({
          product_id: prod._id,
          product_name: prod.name,
          qty: it.qty,
          unit_price,
          line_total
        });
      }

      const discount = Number(input.discount ?? 0);
      const total = Math.max(0, subtotal - discount);

      const customer_id = input.customer_id ? String(input.customer_id) : undefined;
      const customer_name = await resolveCustomerName(customer_id, input.customer ?? null);

      const sale_date = input.sale_date ? new Date(String(input.sale_date)) : new Date();

      const sale = await Sale.create(
        [
          {
            receipt_ref,
            sale_date,
            cashier: input.cashier,
            customer: customer_name ?? undefined,
            customer_id: customer_id ? new mongoose.Types.ObjectId(customer_id) : undefined,
            payment_method: input.payment_method,
            subtotal,
            discount,
            total,
            unpaid: Boolean(input.unpaid),
            items
          }
        ],
        { session }
      );

      // decrement stock + log
      for (const it of items) {
        await Product.updateOne({ _id: it.product_id }, { $inc: { stock: -it.qty } }).session(session);
        await InventoryLog.create(
          [
            {
              product_id: it.product_id,
              product_name: it.product_name,
              change_type: 'SALE',
              qty_change: -it.qty,
              reason: `Sale ${receipt_ref}`
            }
          ],
          { session }
        );
      }

      result = {
        sale_id: String(sale[0]._id),
        receipt_ref,
        subtotal,
        discount,
        total,
        sale_date: sale_date.toISOString()
      };
    });

    return result;
  } finally {
    await session.endSession();
  }
}

export async function getSalesHistory(queryArg?: { search?: string }) {
  const search = (queryArg?.search ?? '').trim();
  const filter: any = {};
  if (search) {
    const re = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ receipt_ref: re }, { customer: re }];
  }

  const rows = await Sale.find(filter)
    .sort({ sale_date: -1 })
    .limit(200)
    .select('receipt_ref sale_date cashier customer payment_method total unpaid')
    .lean();

  return rows.map((s: any) => ({
    receipt_ref: s.receipt_ref,
    date: s.sale_date,
    cashier: s.cashier,
    customer: s.customer ?? null,
    payment: s.payment_method,
    total: s.total,
    unpaid: s.unpaid ? 1 : 0
  }));
}

export async function getSaleByReceipt(receipt_ref: string) {
  const sale = await Sale.findOne({ receipt_ref }).lean();
  if (!sale) return undefined;
  return {
    id: String(sale._id),
    receipt_ref: sale.receipt_ref,
    sale_date: sale.sale_date,
    cashier: sale.cashier,
    customer: sale.customer ?? null,
    payment_method: sale.payment_method,
    subtotal: sale.subtotal,
    discount: sale.discount,
    total: sale.total,
    unpaid: sale.unpaid,
    items: (sale.items ?? []).map((it: any) => ({
      product_name: it.product_name,
      qty: it.qty,
      unit_price: it.unit_price,
      line_total: it.line_total
    }))
  };
}

export async function salesReport(period: 'daily' | 'weekly' | 'monthly') {
  const now = new Date();
  let start: Date;
  if (period === 'daily') {
    start = new Date(now);
    start.setHours(0, 0, 0, 0);
  } else if (period === 'weekly') {
    start = new Date(now);
    start.setDate(start.getDate() - 7);
  } else {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
  }

  const totalsAgg = await Sale.aggregate([
    { $match: { sale_date: { $gte: start } } },
    {
      $group: {
        _id: null,
        transactions: { $sum: 1 },
        revenue: { $sum: '$total' }
      }
    },
    {
      $project: {
        _id: 0,
        transactions: 1,
        revenue: { $round: ['$revenue', 2] }
      }
    }
  ]);

  const bestAgg = await Sale.aggregate([
    { $match: { sale_date: { $gte: start } } },
    { $unwind: '$items' },
    {
      $group: {
        _id: '$items.product_name',
        product_name: { $first: '$items.product_name' },
        total_sold: { $sum: '$items.qty' },
        revenue: { $sum: '$items.line_total' }
      }
    },
    { $sort: { total_sold: -1 } },
    { $limit: 10 },
    { $project: { _id: 0, product_id: 0, product_name: 1, total_sold: 1, revenue: { $round: ['$revenue', 2] } } }
  ]);

  return { totals: totalsAgg[0] ?? { transactions: 0, revenue: 0 }, best: bestAgg };
}