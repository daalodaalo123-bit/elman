import { useEffect, useMemo, useState } from 'react';
import { Card } from '../components/Card';
import { api } from '../lib/api';
import type {
  Customer,
  CustomerInsightsReport,
  ExpenseListRow,
  InventoryReport,
  LowStockReport,
  ProfitReport,
  SalesHistoryRow,
  TopProductsReport
} from '../lib/types';
import { money } from '../lib/format';
import { Boxes, CircleDollarSign, ShoppingBag, TriangleAlert, Users } from 'lucide-react';

function asDate(v: string): Date | null {
  const d = new Date(v);
  if (!Number.isFinite(d.getTime())) return null;
  return d;
}

function isWithinDays(dateStr: string, days: number): boolean {
  const d = asDate(dateStr);
  if (!d) return false;
  const now = Date.now();
  const ms = days * 24 * 60 * 60 * 1000;
  return d.getTime() >= now - ms;
}

function StatCard(props: {
  title: string;
  value: string;
  hint?: string;
  icon: React.ReactNode;
  tone?: 'default' | 'danger' | 'success';
}) {
  const tone =
    props.tone === 'danger'
      ? 'border-red-200 bg-red-50'
      : props.tone === 'success'
        ? 'border-emerald-200 bg-emerald-50'
        : 'border-slate-200 bg-white';

  return (
    <Card className={`p-6 ${tone}`}>
      <div className='flex items-start justify-between gap-4'>
        <div>
          <div className='text-sm font-semibold text-slate-600'>{props.title}</div>
          <div className='mt-2 text-3xl font-extrabold tracking-tight text-slate-900'>
            {props.value}
          </div>
          {props.hint ? <div className='mt-1 text-sm text-slate-500'>{props.hint}</div> : null}
        </div>
        <div className='rounded-2xl border border-slate-200 bg-white p-3 text-slate-700 shadow-sm'>
          {props.icon}
        </div>
      </div>
    </Card>
  );
}

export function DashboardPage() {
  const [customers, setCustomers] = useState<Customer[] | null>(null);
  const [inventory, setInventory] = useState<InventoryReport | null>(null);
  const [sales, setSales] = useState<SalesHistoryRow[] | null>(null);
  const [expenses, setExpenses] = useState<ExpenseListRow[] | null>(null);
  const [profit, setProfit] = useState<ProfitReport | null>(null);
  const [topProducts, setTopProducts] = useState<TopProductsReport | null>(null);
  const [customerInsights, setCustomerInsights] = useState<CustomerInsightsReport | null>(null);
  const [lowStock, setLowStock] = useState<LowStockReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    Promise.all([
      api.get<Customer[]>('/api/customers'),
      api.get<InventoryReport>('/api/reports/inventory'),
      api.get<SalesHistoryRow[]>('/api/sales/history'),
      api.get<ExpenseListRow[]>('/api/expenses'),
      api.get<ProfitReport>('/api/reports/profit?period=monthly'),
      api.get<TopProductsReport>('/api/reports/top-products?period=monthly'),
      api.get<CustomerInsightsReport>('/api/reports/customer-insights?period=monthly'),
      api.get<LowStockReport>('/api/reports/low-stock')
    ])
      .then(([c, inv, s, e, pr, tp, ci, ls]) => {
        if (!mounted) return;
        setCustomers(c);
        setInventory(inv);
        setSales(s);
        setExpenses(e);
        setProfit(pr);
        setTopProducts(tp);
        setCustomerInsights(ci);
        setLowStock(ls);
        setError(null);
      })
      .catch((e: any) => {
        if (!mounted) return;
        setError(e?.message ?? 'Failed to load dashboard stats');
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const computed = useMemo(() => {
    const invTotals = inventory?.totals ?? {
      total_products: 0,
      low_stock_items: 0,
      total_inventory_value: 0
    };

    const salesRows = sales ?? [];
    const expRows = expenses ?? [];

    const sales7d = salesRows.filter((r) => isWithinDays(r.date, 7));
    const sales30d = salesRows.filter((r) => isWithinDays(r.date, 30));

    const expenses7d = expRows.filter((r) => isWithinDays(r.expense_date, 7));
    const expenses30d = expRows.filter((r) => isWithinDays(r.expense_date, 30));

    const sum = (xs: number[]) => xs.reduce((s, n) => s + (Number.isFinite(n) ? n : 0), 0);

    const sales7dRevenue = sum(sales7d.map((r) => Number(r.total)));
    const sales30dRevenue = sum(sales30d.map((r) => Number(r.total)));
    const unpaidCount = salesRows.reduce((n, r) => n + (r.unpaid ? 1 : 0), 0);

    const expenses7dTotal = sum(expenses7d.map((r) => Number(r.total_amount)));
    const expenses30dTotal = sum(expenses30d.map((r) => Number(r.total_amount)));

    const lastSales = [...salesRows]
      .sort((a, b) => Number(asDate(b.date)?.getTime() ?? 0) - Number(asDate(a.date)?.getTime() ?? 0))
      .slice(0, 5);

    const lastExpenses = [...expRows]
      .sort(
        (a, b) =>
          Number(asDate(b.expense_date)?.getTime() ?? 0) - Number(asDate(a.expense_date)?.getTime() ?? 0)
      )
      .slice(0, 5);

    const lastMoves = (inventory?.history ?? []).slice(0, 5);

    return {
      customersCount: customers?.length ?? 0,
      invTotals,
      sales7dRevenue,
      sales30dRevenue,
      sales7dCount: sales7d.length,
      sales30dCount: sales30d.length,
      unpaidCount,
      expenses7dTotal,
      expenses30dTotal,
      net30d: sales30dRevenue - expenses30dTotal,
      lastSales,
      lastExpenses,
      lastMoves,
      profitTotals: profit?.totals ?? null,
      topProducts: topProducts?.rows ?? [],
      topCustomers: (customerInsights?.rows ?? []).slice(0, 10),
      lowStock: lowStock?.rows ?? []
    };
  }, [customers, expenses, inventory, sales, profit, topProducts, customerInsights, lowStock]);

  const updatedAt = useMemo(() => new Date().toLocaleString(), []);

  return (
    <div>
      <div className='mb-6 flex items-start justify-between gap-4'>
        <div>
          <div className='text-3xl font-extrabold tracking-tight'>Dashboard</div>
          <div className='mt-1 text-slate-500'>Quick statistics and recent activity</div>
        </div>
        <div className='text-right'>
          <div className='text-xs font-semibold text-slate-500'>Last loaded</div>
          <div className='mt-1 text-sm font-semibold text-slate-700'>{updatedAt}</div>
        </div>
      </div>

      {error ? (
        <Card className='p-6'>
          <div className='text-sm font-semibold text-red-700'>{error}</div>
          <div className='mt-1 text-sm text-slate-600'>
            Make sure the API is running on <span className='font-semibold'>localhost:5050</span>.
          </div>
        </Card>
      ) : null}

      <div className='grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4'>
        <StatCard
          title='Customers'
          value={loading ? '—' : String(computed.customersCount)}
          hint='Saved in CRM'
          icon={<Users size={18} />}
        />
        <StatCard
          title='Products'
          value={loading ? '—' : String(computed.invTotals.total_products)}
          hint='Total items in inventory'
          icon={<Boxes size={18} />}
        />
        <StatCard
          title='Low stock'
          value={loading ? '—' : String(computed.invTotals.low_stock_items)}
          hint='Need restock soon'
          tone={computed.invTotals.low_stock_items > 0 ? 'danger' : 'default'}
          icon={<TriangleAlert size={18} />}
        />
        <StatCard
          title='Inventory value'
          value={loading ? '—' : money(Number(computed.invTotals.total_inventory_value))}
          hint='Stock × price'
          icon={<ShoppingBag size={18} />}
        />
      </div>

      {/* Profit snapshot */}
      <div className='mt-6 grid grid-cols-1 gap-6 md:grid-cols-3'>
        <Card className='p-6'>
          <div className='text-sm font-semibold text-slate-600'>Revenue (this month)</div>
          <div className='mt-2 text-3xl font-extrabold'>
            {loading ? '—' : money(Number(computed.profitTotals?.revenue ?? 0))}
          </div>
          <div className='mt-1 text-sm text-slate-500'>
            {loading ? '—' : `${Number(computed.profitTotals?.transactions ?? 0)} transactions`}
          </div>
        </Card>
        <Card className='p-6'>
          <div className='text-sm font-semibold text-slate-600'>Expenses (this month)</div>
          <div className='mt-2 text-3xl font-extrabold'>
            {loading ? '—' : money(Number(computed.profitTotals?.expenses ?? 0))}
          </div>
          <div className='mt-1 text-sm text-slate-500'>From Expenses entries</div>
        </Card>
        <Card className='p-6'>
          <div className='text-sm font-semibold text-slate-600'>Net profit (this month)</div>
          <div
            className={
              (computed.profitTotals?.net_profit ?? 0) >= 0
                ? 'mt-2 text-3xl font-extrabold text-emerald-700'
                : 'mt-2 text-3xl font-extrabold text-red-700'
            }
          >
            {loading ? '—' : money(Number(computed.profitTotals?.net_profit ?? 0))}
          </div>
          <div className='mt-1 text-sm text-slate-500'>
            Gross profit: {loading ? '—' : money(Number(computed.profitTotals?.gross_profit ?? 0))}
          </div>
        </Card>
      </div>

      <div className='mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12'>
        <div className='lg:col-span-6'>
          <Card className='p-6'>
            <div className='flex items-center justify-between'>
              <div>
                <div className='text-lg font-extrabold'>Sales</div>
                <div className='mt-1 text-sm text-slate-500'>Last 7 and 30 days</div>
              </div>
              <div className='rounded-2xl border border-slate-200 bg-white p-3 text-slate-700 shadow-sm'>
                <CircleDollarSign size={18} />
              </div>
            </div>

            <div className='mt-5 grid grid-cols-1 gap-4 md:grid-cols-2'>
              <div className='rounded-2xl bg-slate-50 p-4'>
                <div className='text-sm font-semibold text-slate-600'>Last 7 days</div>
                <div className='mt-2 text-2xl font-extrabold text-slate-900'>
                  {loading ? '—' : money(computed.sales7dRevenue)}
                </div>
                <div className='mt-1 text-sm text-slate-500'>
                  {loading ? '—' : `${computed.sales7dCount} transactions`}
                </div>
              </div>
              <div className='rounded-2xl bg-slate-50 p-4'>
                <div className='text-sm font-semibold text-slate-600'>Last 30 days</div>
                <div className='mt-2 text-2xl font-extrabold text-slate-900'>
                  {loading ? '—' : money(computed.sales30dRevenue)}
                </div>
                <div className='mt-1 text-sm text-slate-500'>
                  {loading ? '—' : `${computed.sales30dCount} transactions`}
                </div>
              </div>
            </div>

            <div className='mt-4 flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3'>
              <div className='text-sm font-semibold text-slate-700'>Unpaid sales</div>
              <div className='text-sm font-extrabold text-slate-900'>
                {loading ? '—' : String(computed.unpaidCount)}
              </div>
            </div>
          </Card>
        </div>

        <div className='lg:col-span-6'>
          <Card className='p-6'>
            <div className='text-lg font-extrabold'>Expenses</div>
            <div className='mt-1 text-sm text-slate-500'>Last 7 and 30 days</div>

            <div className='mt-5 grid grid-cols-1 gap-4 md:grid-cols-2'>
              <div className='rounded-2xl bg-slate-50 p-4'>
                <div className='text-sm font-semibold text-slate-600'>Last 7 days</div>
                <div className='mt-2 text-2xl font-extrabold text-slate-900'>
                  {loading ? '—' : money(computed.expenses7dTotal)}
                </div>
              </div>
              <div className='rounded-2xl bg-slate-50 p-4'>
                <div className='text-sm font-semibold text-slate-600'>Last 30 days</div>
                <div className='mt-2 text-2xl font-extrabold text-slate-900'>
                  {loading ? '—' : money(computed.expenses30dTotal)}
                </div>
              </div>
            </div>

            <div className='mt-4 flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3'>
              <div className='text-sm font-semibold text-slate-700'>Net (sales - expenses, 30d)</div>
              <div
                className={
                  computed.net30d >= 0
                    ? 'text-sm font-extrabold text-emerald-700'
                    : 'text-sm font-extrabold text-red-700'
                }
              >
                {loading ? '—' : money(computed.net30d)}
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Top products + low stock + customer insights */}
      <div className='mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12'>
        <Card className='overflow-hidden lg:col-span-6'>
          <div className='border-b border-slate-200 p-6'>
            <div className='text-lg font-extrabold'>Top products (this month)</div>
            <div className='mt-1 text-sm text-slate-500'>Best sellers by quantity</div>
          </div>
          <div className='overflow-x-auto'>
            <table className='w-full text-left text-sm'>
              <thead className='bg-white'>
                <tr className='border-b border-slate-200 text-slate-600'>
                  <th className='px-5 py-4 font-medium'>Product</th>
                  <th className='px-5 py-4 font-medium'>Qty</th>
                  <th className='px-5 py-4 font-medium'>Revenue</th>
                  <th className='px-5 py-4 font-medium'>Profit</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={4} className='px-5 py-10 text-center text-slate-500'>
                      Loading...
                    </td>
                  </tr>
                ) : computed.topProducts.length === 0 ? (
                  <tr>
                    <td colSpan={4} className='px-5 py-10 text-center text-slate-500'>
                      No sales yet.
                    </td>
                  </tr>
                ) : (
                  computed.topProducts.slice(0, 10).map((r) => (
                    <tr key={r.product_id} className='border-b border-slate-100'>
                      <td className='px-5 py-4 font-medium text-slate-900'>{r.product_name}</td>
                      <td className='px-5 py-4 text-slate-700'>{r.qty_sold}</td>
                      <td className='px-5 py-4 font-semibold text-slate-900'>{money(Number(r.revenue))}</td>
                      <td className='px-5 py-4 font-semibold text-slate-900'>{money(Number(r.profit))}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className='overflow-hidden lg:col-span-6'>
          <div className='border-b border-slate-200 p-6'>
            <div className='text-lg font-extrabold'>Low stock suggestions</div>
            <div className='mt-1 text-sm text-slate-500'>What to restock next</div>
          </div>
          <div className='overflow-x-auto'>
            <table className='w-full text-left text-sm'>
              <thead className='bg-white'>
                <tr className='border-b border-slate-200 text-slate-600'>
                  <th className='px-5 py-4 font-medium'>Product</th>
                  <th className='px-5 py-4 font-medium'>Stock</th>
                  <th className='px-5 py-4 font-medium'>Threshold</th>
                  <th className='px-5 py-4 font-medium'>Suggested</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={4} className='px-5 py-10 text-center text-slate-500'>
                      Loading...
                    </td>
                  </tr>
                ) : computed.lowStock.length === 0 ? (
                  <tr>
                    <td colSpan={4} className='px-5 py-10 text-center text-slate-500'>
                      No low stock items 🎉
                    </td>
                  </tr>
                ) : (
                  computed.lowStock.slice(0, 10).map((r) => (
                    <tr key={r.id} className='border-b border-slate-100'>
                      <td className='px-5 py-4 font-medium text-slate-900'>{r.name}</td>
                      <td className='px-5 py-4 text-slate-700'>{r.stock}</td>
                      <td className='px-5 py-4 text-slate-700'>{r.low_stock_threshold}</td>
                      <td className='px-5 py-4 font-semibold text-slate-900'>{r.suggested_restock}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <Card className='mt-6 overflow-hidden'>
        <div className='border-b border-slate-200 p-6'>
          <div className='text-lg font-extrabold'>Top customers (this month)</div>
          <div className='mt-1 text-sm text-slate-500'>Revenue and unpaid totals</div>
        </div>
        <div className='overflow-x-auto'>
          <table className='w-full text-left text-sm'>
            <thead className='bg-white'>
              <tr className='border-b border-slate-200 text-slate-600'>
                <th className='px-5 py-4 font-medium'>Customer</th>
                <th className='px-5 py-4 font-medium'>Transactions</th>
                <th className='px-5 py-4 font-medium'>Revenue</th>
                <th className='px-5 py-4 font-medium'>Unpaid</th>
                <th className='px-5 py-4 font-medium'>Last purchase</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className='px-5 py-10 text-center text-slate-500'>
                    Loading...
                  </td>
                </tr>
              ) : computed.topCustomers.length === 0 ? (
                <tr>
                  <td colSpan={5} className='px-5 py-10 text-center text-slate-500'>
                    No customer activity yet.
                  </td>
                </tr>
              ) : (
                computed.topCustomers.map((r) => (
                  <tr key={r.customer} className='border-b border-slate-100'>
                    <td className='px-5 py-4 font-medium text-slate-900'>{r.customer}</td>
                    <td className='px-5 py-4 text-slate-700'>{r.transactions}</td>
                    <td className='px-5 py-4 font-semibold text-slate-900'>{money(Number(r.revenue))}</td>
                    <td className='px-5 py-4 font-semibold text-slate-900'>{money(Number(r.unpaid_total))}</td>
                    <td className='px-5 py-4 text-slate-600'>
                      {r.last_purchase ? new Date(String(r.last_purchase)).toLocaleString() : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <div className='mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12'>
        <Card className='overflow-hidden lg:col-span-6'>
          <div className='border-b border-slate-200 p-6'>
            <div className='text-lg font-extrabold'>Recent sales</div>
            <div className='mt-1 text-sm text-slate-500'>Latest 5 transactions</div>
          </div>
          <div className='overflow-x-auto'>
            <table className='w-full text-left text-sm'>
              <thead className='bg-white'>
                <tr className='border-b border-slate-200 text-slate-600'>
                  <th className='px-5 py-4 font-medium'>Receipt</th>
                  <th className='px-5 py-4 font-medium'>Date</th>
                  <th className='px-5 py-4 font-medium'>Total</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={3} className='px-5 py-10 text-center text-slate-500'>
                      Loading...
                    </td>
                  </tr>
                ) : computed.lastSales.length === 0 ? (
                  <tr>
                    <td colSpan={3} className='px-5 py-10 text-center text-slate-500'>
                      No sales yet.
                    </td>
                  </tr>
                ) : (
                  computed.lastSales.map((r) => (
                    <tr key={r.receipt_ref} className='border-b border-slate-100'>
                      <td className='px-5 py-4 font-medium text-slate-900'>{r.receipt_ref}</td>
                      <td className='px-5 py-4 text-slate-600'>{asDate(r.date)?.toLocaleString() ?? r.date}</td>
                      <td className='px-5 py-4 font-semibold text-slate-900'>{money(Number(r.total))}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className='overflow-hidden lg:col-span-6'>
          <div className='border-b border-slate-200 p-6'>
            <div className='text-lg font-extrabold'>Recent expenses</div>
            <div className='mt-1 text-sm text-slate-500'>Latest 5 entries</div>
          </div>
          <div className='overflow-x-auto'>
            <table className='w-full text-left text-sm'>
              <thead className='bg-white'>
                <tr className='border-b border-slate-200 text-slate-600'>
                  <th className='px-5 py-4 font-medium'>Date</th>
                  <th className='px-5 py-4 font-medium'>Type</th>
                  <th className='px-5 py-4 font-medium'>Total</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={3} className='px-5 py-10 text-center text-slate-500'>
                      Loading...
                    </td>
                  </tr>
                ) : computed.lastExpenses.length === 0 ? (
                  <tr>
                    <td colSpan={3} className='px-5 py-10 text-center text-slate-500'>
                      No expenses yet.
                    </td>
                  </tr>
                ) : (
                  computed.lastExpenses.map((r) => (
                    <tr key={r.id} className='border-b border-slate-100'>
                      <td className='px-5 py-4 text-slate-600'>
                        {asDate(r.expense_date)?.toLocaleString() ?? r.expense_date}
                      </td>
                      <td className='px-5 py-4 font-medium text-slate-900'>{r.category}</td>
                      <td className='px-5 py-4 font-semibold text-slate-900'>
                        {money(Number(r.total_amount))}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <Card className='mt-6 overflow-hidden'>
        <div className='border-b border-slate-200 p-6'>
          <div className='text-lg font-extrabold'>Recent inventory movement</div>
          <div className='mt-1 text-sm text-slate-500'>Latest 5 changes</div>
        </div>
        <div className='overflow-x-auto'>
          <table className='w-full text-left text-sm'>
            <thead className='bg-white'>
              <tr className='border-b border-slate-200 text-slate-600'>
                <th className='px-5 py-4 font-medium'>Date</th>
                <th className='px-5 py-4 font-medium'>Product</th>
                <th className='px-5 py-4 font-medium'>Change</th>
                <th className='px-5 py-4 font-medium'>Reason</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className='px-5 py-10 text-center text-slate-500'>
                    Loading...
                  </td>
                </tr>
              ) : computed.lastMoves.length === 0 ? (
                <tr>
                  <td colSpan={4} className='px-5 py-10 text-center text-slate-500'>
                    No inventory movement yet.
                  </td>
                </tr>
              ) : (
                computed.lastMoves.map((h, idx) => (
                  <tr key={idx} className='border-b border-slate-100'>
                    <td className='px-5 py-4 text-slate-600'>
                      {asDate(h.date)?.toLocaleString() ?? String(h.date)}
                    </td>
                    <td className='px-5 py-4 font-medium text-slate-900'>{h.product}</td>
                    <td className='px-5 py-4 font-semibold text-slate-900'>{h.change}</td>
                    <td className='px-5 py-4 text-slate-600'>{h.reason}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}


