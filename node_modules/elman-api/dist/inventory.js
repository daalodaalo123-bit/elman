import mongoose from 'mongoose';
import { InventoryLog, Product } from './models.js';
export async function listProducts() {
    const rows = await Product.find({}).sort({ name: 1 }).lean();
    return rows.map((p) => ({
        id: String(p._id),
        name: p.name,
        category: p.category,
        price: p.price,
        stock: p.stock,
        low_stock_threshold: p.low_stock_threshold,
        created_at: p.created_at
    }));
}
export async function createProduct(input) {
    const p = await Product.create({
        name: input.name,
        category: input.category,
        price: input.price,
        stock: input.stock ?? 0,
        low_stock_threshold: input.low_stock_threshold ?? 0
    });
    if ((input.stock ?? 0) > 0) {
        await InventoryLog.create({
            product_id: p._id,
            product_name: p.name,
            change_type: 'RESTOCK',
            qty_change: input.stock,
            reason: 'Initial stock'
        });
    }
    return String(p._id);
}
export async function updateProduct(id, patch) {
    const _id = new mongoose.Types.ObjectId(id);
    await Product.updateOne({ _id }, { $set: patch });
}
export async function restockProduct(id, qty, reason) {
    const _id = new mongoose.Types.ObjectId(id);
    const p = await Product.findByIdAndUpdate(_id, { $inc: { stock: qty } }, { new: true });
    if (!p)
        throw new Error('Product not found');
    await InventoryLog.create({
        product_id: p._id,
        product_name: p.name,
        change_type: 'RESTOCK',
        qty_change: qty,
        reason
    });
}
export async function inventorySummary() {
    const totalsAgg = await Product.aggregate([
        {
            $group: {
                _id: null,
                total_products: { $sum: 1 },
                low_stock_items: {
                    $sum: {
                        $cond: [{ $lte: ['$stock', '$low_stock_threshold'] }, 1, 0]
                    }
                },
                total_inventory_value: { $sum: { $multiply: ['$stock', '$price'] } }
            }
        },
        {
            $project: {
                _id: 0,
                total_products: 1,
                low_stock_items: 1,
                total_inventory_value: { $round: ['$total_inventory_value', 2] }
            }
        }
    ]);
    const totals = totalsAgg[0] ?? {
        total_products: 0,
        low_stock_items: 0,
        total_inventory_value: 0
    };
    const history = await InventoryLog.find({}).sort({ created_at: -1 }).limit(50).lean();
    const mappedHistory = history.map((h) => ({
        date: h.created_at,
        product: h.product_name,
        change: h.qty_change,
        reason: h.reason
    }));
    return { totals, history: mappedHistory };
}
