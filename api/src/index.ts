import express, { type NextFunction, type Request, type Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { z } from 'zod';
import path from 'node:path';
import fs from 'node:fs';
import { connectDb, dbStatus } from './db/db.js';
import {
  CreateCustomerSchema,
  CreateExpenseSchema,
  CreateProductSchema,
  CreateSaleSchema,
  DecreaseStockSchema,
  RestockSchema,
  UpdateCustomerSchema,
  UpdateProductSchema
} from './schemas.js';
import {
  createProduct,
  decreaseStockProduct,
  inventorySummary,
  listProducts,
  productStockHistory,
  restockProduct,
  updateProduct
} from './inventory.js';
import { createSale, getSaleByReceipt, getSalesHistory, salesReport } from './sales.js';
import { createCustomer, listCustomers, updateCustomer } from './customers.js';
import { createExpense, getExpense, listExpenses } from './expenses.js';
import { sendPdf, hr, kv, money, tableHeader, tableRow, title } from './pdf.js';
import {
  customerInsightsReport,
  lowStockReport,
  profitReport,
  topProductsReport
} from './reports.js';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) =>
  (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

// Ensure DB connected for API routes
app.use(
  asyncHandler(async (req, _res, next) => {
    if (req.path.startsWith('/api')) {
      await connectDb();
    }
    next();
  })
);

// connect to MongoDB Atlas (best-effort)
connectDb().catch((err) => {
  console.error('Failed to connect to MongoDB', err);
});

app.get('/health', (_req, res) => {
  res.json({ ok: true, name: 'Elman API', time: new Date().toISOString(), db: dbStatus() });
});

// --- Customers (CRM) ---
app.get(
  '/api/customers',
  asyncHandler(async (req, res) => {
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;
    res.json(await listCustomers(search));
  })
);

app.post(
  '/api/customers',
  asyncHandler(async (req, res) => {
    const parsed = CreateCustomerSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(parsed.error.flatten());
    const id = await createCustomer(parsed.data);
    res.status(201).json({ id });
  })
);

app.put(
  '/api/customers/:id',
  asyncHandler(async (req, res) => {
    const parsed = UpdateCustomerSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(parsed.error.flatten());
    await updateCustomer(String(req.params.id), parsed.data);
    res.json({ ok: true });
  })
);

// --- Expenses ---
app.get(
  '/api/expenses',
  asyncHandler(async (req, res) => {
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;
    res.json(await listExpenses({ search }));
  })
);

app.get(
  '/api/expenses/:id',
  asyncHandler(async (req, res) => {
    const exp = await getExpense(String(req.params.id));
    if (!exp) return res.status(404).json({ error: 'Not found' });
    res.json(exp);
  })
);

app.get(
  '/api/expenses/:id/pdf',
  asyncHandler(async (req, res) => {
    const exp = await getExpense(String(req.params.id));
    if (!exp) return res.status(404).json({ error: 'Not found' });

    sendPdf(res, `expense-${exp.id}.pdf`, (doc) => {
      title(doc, 'ELMAN â€” Expense');
      kv(doc, 'Date', new Date(exp.expense_date).toLocaleString());
      kv(doc, 'Type', String(exp.category));
      kv(doc, 'Vendor', exp.vendor ?? '');
      kv(doc, 'Notes', exp.notes ?? '');
      hr(doc);

      title(doc, 'Items');
      const widths = [260, 70, 90, 90];
      tableHeader(doc, ['Name', 'Qty', 'Unit', 'Total'], widths);
      if (!exp.items.length) {
        tableRow(doc, ['(no items â€” bill/utility)', '', '', ''], widths);
      } else {
        for (const it of exp.items) {
          tableRow(
            doc,
            [String(it.item_name), String(it.quantity), money(it.unit_price), money(it.line_total)],
            widths
          );
        }
      }
      hr(doc);
      kv(doc, 'Total Amount', money(exp.total_amount));
    });
  })
);

app.post(
  '/api/expenses',
  asyncHandler(async (req, res) => {
    const parsed = CreateExpenseSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(parsed.error.flatten());
    try {
      const id = await createExpense(parsed.data);
      res.status(201).json({ id });
    } catch (e: any) {
      res.status(400).json({ error: e?.message ?? 'Expense failed' });
    }
  })
);

// Products / Inventory
app.get(
  '/api/products',
  asyncHandler(async (_req, res) => {
    res.json(await listProducts());
  })
);

app.post(
  '/api/products',
  asyncHandler(async (req, res) => {
    const parsed = CreateProductSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(parsed.error.flatten());
    const id = await createProduct(parsed.data);
    res.status(201).json({ id });
  })
);

app.put(
  '/api/products/:id',
  asyncHandler(async (req, res) => {
    const parsed = UpdateProductSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(parsed.error.flatten());
    await updateProduct(String(req.params.id), parsed.data);
    res.json({ ok: true });
  })
);

app.post(
  '/api/products/:id/restock',
  asyncHandler(async (req, res) => {
    const parsed = RestockSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(parsed.error.flatten());
    await restockProduct(String(req.params.id), parsed.data.qty, parsed.data.reason);
    res.json({ ok: true });
  })
);

app.post(
  '/api/products/:id/decrease',
  asyncHandler(async (req, res) => {
    const parsed = DecreaseStockSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(parsed.error.flatten());
    await decreaseStockProduct(String(req.params.id), parsed.data.qty, parsed.data.reason);
    res.json({ ok: true });
  })
);

app.get(
  '/api/products/:id/history',
  asyncHandler(async (req, res) => {
    res.json(await productStockHistory(String(req.params.id)));
  })
);

app.get(
  '/api/reports/inventory',
  asyncHandler(async (_req, res) => {
    res.json(await inventorySummary());
  })
);

app.get(
  '/api/reports/profit',
  asyncHandler(async (req, res) => {
    const p = (String(req.query.period ?? 'monthly') as any) ?? 'monthly';
    if (p !== 'daily' && p !== 'weekly' && p !== 'monthly') {
      return res.status(400).json({ error: 'Invalid period' });
    }
    res.json(await profitReport(p));
  })
);

app.get(
  '/api/reports/top-products',
  asyncHandler(async (req, res) => {
    const p = (String(req.query.period ?? 'monthly') as any) ?? 'monthly';
    if (p !== 'daily' && p !== 'weekly' && p !== 'monthly') {
      return res.status(400).json({ error: 'Invalid period' });
    }
    res.json(await topProductsReport(p));
  })
);

app.get(
  '/api/reports/customer-insights',
  asyncHandler(async (req, res) => {
    const p = (String(req.query.period ?? 'monthly') as any) ?? 'monthly';
    if (p !== 'daily' && p !== 'weekly' && p !== 'monthly') {
      return res.status(400).json({ error: 'Invalid period' });
    }
    res.json(await customerInsightsReport(p));
  })
);

app.get(
  '/api/reports/low-stock',
  asyncHandler(async (_req, res) => {
    res.json(await lowStockReport());
  })
);

app.get(
  '/api/reports/inventory/pdf',
  asyncHandler(async (_req, res) => {
    const report = await inventorySummary();
    sendPdf(res, 'inventory-history.pdf', (doc) => {
      title(doc, 'ELMAN â€” Inventory Movement History');
      kv(doc, 'Printed', new Date().toLocaleString());
      hr(doc);

      const widths = [140, 180, 60, 140];
      tableHeader(doc, ['Date', 'Product', 'Change', 'Reason'], widths);
      for (const h of report.history) {
        tableRow(
          doc,
          [
            new Date(String(h.date)).toLocaleString(),
            String(h.product),
            String(h.change),
            String(h.reason)
          ],
          widths
        );
      }
      hr(doc);
      kv(doc, 'Total Products', String(report.totals?.total_products ?? 0));
      kv(doc, 'Low Stock Items', String(report.totals?.low_stock_items ?? 0));
      kv(doc, 'Inventory Value', money(report.totals?.total_inventory_value ?? 0));
    });
  })
);

// Sales / POS
app.post(
  '/api/sales',
  asyncHandler(async (req, res) => {
    const parsed = CreateSaleSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(parsed.error.flatten());
    try {
      const result = await createSale(parsed.data);
      res.status(201).json(result);
    } catch (e: any) {
      res.status(400).json({ error: e?.message ?? 'Sale failed' });
    }
  })
);

app.get(
  '/api/sales/history',
  asyncHandler(async (req, res) => {
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;
    res.json(await getSalesHistory({ search }));
  })
);

app.get(
  '/api/sales/:receipt_ref/pdf',
  asyncHandler(async (req, res) => {
    const receipt_ref = String(req.params.receipt_ref);
    const sale = await getSaleByReceipt(receipt_ref);
    if (!sale) return res.status(404).json({ error: 'Not found' });

    sendPdf(res, `receipt-${receipt_ref}.pdf`, (doc) => {
      title(doc, 'ELMAN â€” Sales Receipt');
      kv(doc, 'Receipt Ref', String(sale.receipt_ref));
      kv(doc, 'Date', new Date(sale.sale_date).toLocaleString());
      kv(doc, 'Cashier', String(sale.cashier));
      kv(doc, 'Customer', sale.customer ?? '');
      kv(doc, 'Payment', String(sale.payment_method));
      hr(doc);

      const widths = [240, 60, 90, 90];
      tableHeader(doc, ['Item', 'Qty', 'Unit', 'Total'], widths);
      for (const it of sale.items) {
        tableRow(
          doc,
          [String(it.product_name), String(it.qty), money(it.unit_price), money(it.line_total)],
          widths
        );
      }
      hr(doc);
      kv(doc, 'Subtotal', money(sale.subtotal));
      kv(doc, 'Discount', money(sale.discount));
      kv(doc, 'Total', money(sale.total));
    });
  })
);

app.get(
  '/api/reports/sales',
  asyncHandler(async (req, res) => {
    const periodSchema = z.enum(['daily', 'weekly', 'monthly']);
    const period = periodSchema.safeParse(req.query.period ?? 'daily');
    if (!period.success) return res.status(400).json({ error: 'Invalid period' });
    res.json(await salesReport(period.data));
  })
);

// Express error handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  const msg =
    err && typeof err.message === 'string' && err.message.trim()
      ? err.message
      : String(err ?? 'Server error');
  res.status(500).json({ error: msg });
});

// --- Serve the React web app in production ---
const webDist = path.resolve(process.cwd(), '..', 'web', 'dist');
if (fs.existsSync(webDist)) {
  app.use(express.static(webDist));

  // SPA fallback
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api') || req.path === '/health') {
      return res.status(404).json({ error: 'Not found' });
    }
    res.sendFile(path.join(webDist, 'index.html'));
  });
}

const port = Number(process.env.PORT ?? 5050);
app.listen(port, () => {
  console.log(`Elman server listening on http://localhost:${port}`);
});