import { useEffect, useMemo, useState } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { Card } from '../components/Card';
import { api } from '../lib/api';
import { apiPathWithToken } from '../lib/api';
import type {
  ExpenseCategory,
  ExpenseDetail,
  ExpenseItem,
  ExpenseListRow
} from '../lib/types';
import { money } from '../lib/format';

const categories: ExpenseCategory[] = [
  'Inventory Purchase',
  'Vendor Bill',
  'Electricity',
  'Rent',
  'Other'
];

type ExpenseForm = {
  expense_date: string;
  category: ExpenseCategory;
  vendor: string;
  notes: string;
  amount: number | '';
  items: ExpenseItem[];
};

function nowForDateTimeLocal(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(
    d.getMinutes()
  )}`;
}

function formatDateTime(v: string): string {
  const d = new Date(v);
  if (!Number.isFinite(d.getTime())) return v;
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(d);
}

function cleanText(v: string | null | undefined): string {
  if (!v) return 'Ã¢â‚¬â€';
  return String(v).replaceAll('ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â', 'Ã¢â‚¬â€').replaceAll('AÃ¯Â¿Â½Ã¯Â¿Â½,Ã¯Â¿Â½Ã¯Â¿Â½??', 'Ã¢â‚¬â€');
}

const defaultItem = (): ExpenseItem => ({ item_name: '', quantity: 1, unit_price: 0 });

export function ExpensesPage() {
  const [rows, setRows] = useState<ExpenseListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Details modal
  const [openId, setOpenId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ExpenseDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [showAdd, setShowAdd] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState<ExpenseForm>({
    expense_date: nowForDateTimeLocal(),
    category: 'Inventory Purchase',
    vendor: '',
    notes: '',
    amount: '',
    items: [defaultItem()]
  });

  const query = useMemo(() => search.trim(), [search]);

  async function load() {
    setLoading(true);
    try {
      const data = await api.get<ExpenseListRow[]>(
        `/api/expenses${query ? `?search=${encodeURIComponent(query)}` : ''}`
      );
      setRows(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const t = setTimeout(() => {
      load();
    }, 150);
    return () => clearTimeout(t);
  }, [query]);

  async function openExpense(id: string) {
    setOpenId(id);
    setDetail(null);
    setDetailLoading(true);
    try {
      const d = await api.get<ExpenseDetail>(`/api/expenses/${id}`);
      setDetail(d);
    } catch (e: any) {
      alert(e?.message ?? 'Failed to load expense');
      setOpenId(null);
    } finally {
      setDetailLoading(false);
    }
  }

  function closeExpense() {
    setOpenId(null);
    setDetail(null);
  }

  const itemsTotal = useMemo(() => {
    return form.items.reduce(
      (s, it) => s + Number(it.quantity || 0) * Number(it.unit_price || 0),
      0
    );
  }, [form.items]);

  const computedTotal = useMemo(() => {
    const amt = form.amount === '' ? null : Number(form.amount);
    return amt != null ? amt : itemsTotal;
  }, [form.amount, itemsTotal]);

  function openAdd() {
    setForm({
      expense_date: nowForDateTimeLocal(),
      category: 'Inventory Purchase',
      vendor: '',
      notes: '',
      amount: '',
      items: [defaultItem()]
    });
    setShowAdd(true);
  }

  function closeAdd() {
    setShowAdd(false);
  }

  function setItem(idx: number, patch: Partial<ExpenseItem>) {
    setForm((prev) => {
      const next = [...prev.items];
      next[idx] = { ...next[idx], ...patch };
      return { ...prev, items: next };
    });
  }

  function removeItem(idx: number) {
    setForm((prev) => {
      const next = prev.items.filter((_, i) => i !== idx);
      return { ...prev, items: next.length ? next : [defaultItem()] };
    });
  }

  function addItem() {
    setForm((prev) => ({ ...prev, items: [...prev.items, defaultItem()] }));
  }

  async function submit() {
    const cleanedItems = form.items
      .map((it) => ({
        item_name: it.item_name.trim(),
        quantity: Number(it.quantity || 1),
        unit_price: Number(it.unit_price || 0)
      }))
      .filter((it) => it.item_name);

    const amount = form.amount === '' ? undefined : Number(form.amount);

    if (!amount && cleanedItems.length === 0) {
      alert('Add at least one item OR enter an amount (for bills/utilities).');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/api/expenses', {
        expense_date: form.expense_date ? new Date(form.expense_date).toISOString() : undefined,
        category: form.category,
        vendor: form.vendor.trim() || undefined,
        notes: form.notes.trim() || undefined,
        amount,
        items: cleanedItems.length ? cleanedItems : undefined
      });
      closeAdd();
      await load();
    } catch (e: any) {
      alert(e?.message ?? 'Failed to save expense');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <div className='mb-6 flex items-start justify-between gap-4'>
        <div>
          <div className='text-3xl font-extrabold tracking-tight'>Expenses</div>
          <div className='mt-1 text-slate-500'>Track purchases, vendor bills, and utilities</div>
        </div>
        <button
          className='rounded-2xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white shadow-soft hover:bg-brand-700'
          onClick={openAdd}
          type='button'
        >
          + Add Expense
        </button>
      </div>

      <div className='mb-4'>
        <input
          className='w-full max-w-md rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-brand-300'
          placeholder='Search category/vendor/notes...'
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <Card className='overflow-hidden'>
        <div className='overflow-x-auto'>
          <table className='w-full text-left text-sm'>
            <thead className='bg-white'>
              <tr className='border-b border-slate-200 text-slate-600'>
                <th className='px-5 py-4 font-medium'>Date</th>
                <th className='px-5 py-4 font-medium'>Type</th>
                <th className='px-5 py-4 font-medium'>Vendor</th>
                <th className='px-5 py-4 font-medium'>Notes</th>
                <th className='px-5 py-4 font-medium'>Items</th>
                <th className='px-5 py-4 font-medium'>Total</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className='px-5 py-10 text-center text-slate-500'>
                    Loading...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className='px-5 py-10 text-center text-slate-500'>
                    No expenses yet.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr
                    key={r.id}
                    className='cursor-pointer border-b border-slate-100 hover:bg-slate-50'
                    onClick={() => openExpense(r.id)}
                    title='Click to view details'
                  >
                    <td className='px-5 py-4 text-slate-600'>{formatDateTime(r.expense_date)}</td>
                    <td className='px-5 py-4 font-medium text-slate-900'>{r.category}</td>
                    <td className='px-5 py-4 text-slate-600'>{cleanText(r.vendor)}</td>
                    <td className='px-5 py-4 text-slate-600'>{cleanText(r.notes)}</td>
                    <td className='px-5 py-4 text-slate-600'>{r.items_count ?? 0}</td>
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

      {/* Details modal */}
      {openId != null && (
        <div className='modal-overlay fixed inset-0 z-20 flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:items-center'>
          <div className='modal-content my-8 w-full max-w-3xl rounded-2xl bg-white p-6 shadow-soft sm:p-8'>
            <div className='flex items-center justify-between'>
              <div className='text-lg font-extrabold text-slate-900'>Expense Details</div>
              <div className='flex items-center gap-2'>
                <a
                  className='no-print rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50'
                  href={apiPathWithToken(`/api/expenses/${openId}/pdf`)}
                >
                  Download PDF
                </a>
                <button
                  type='button'
                  onClick={closeExpense}
                  className='no-print rounded-xl p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900'
                  aria-label='Close'
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {detailLoading || !detail ? (
              <div className='mt-6 text-sm text-slate-500'>Loading details...</div>
            ) : (
              <div className='mt-6 space-y-5'>
                <div className='grid grid-cols-1 gap-4 md:grid-cols-12'>
                  <div className='md:col-span-4'>
                    <div className='text-xs font-semibold text-slate-500'>Date</div>
                    <div className='mt-1 font-semibold text-slate-900'>
                      {formatDateTime(detail.expense_date)}
                    </div>
                  </div>
                  <div className='md:col-span-4'>
                    <div className='text-xs font-semibold text-slate-500'>Type</div>
                    <div className='mt-1 font-semibold text-slate-900'>{detail.category}</div>
                  </div>
                  <div className='md:col-span-4'>
                    <div className='text-xs font-semibold text-slate-500'>Total</div>
                    <div className='mt-1 text-lg font-extrabold text-slate-900'>
                      {money(Number(detail.total_amount))}
                    </div>
                  </div>

                  <div className='md:col-span-6'>
                    <div className='text-xs font-semibold text-slate-500'>Vendor</div>
                    <div className='mt-1 text-slate-800'>{cleanText(detail.vendor)}</div>
                  </div>
                  <div className='md:col-span-6'>
                    <div className='text-xs font-semibold text-slate-500'>Notes</div>
                    <div className='mt-1 text-slate-800'>{cleanText(detail.notes)}</div>
                  </div>
                </div>

                <div>
                  <div className='text-sm font-extrabold text-slate-900'>Items</div>
                  <div className='mt-3 overflow-x-auto rounded-xl border border-slate-200'>
                    <table className='w-full text-left text-sm'>
                      <thead className='bg-slate-50 text-slate-600'>
                        <tr>
                          <th className='px-4 py-3 font-medium'>Name</th>
                          <th className='px-4 py-3 font-medium'>Qty</th>
                          <th className='px-4 py-3 font-medium'>Unit price</th>
                          <th className='px-4 py-3 font-medium'>Line total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detail.items.length === 0 ? (
                          <tr>
                            <td colSpan={4} className='px-4 py-8 text-center text-slate-500'>
                              No item lines (this may be a bill/utility).
                            </td>
                          </tr>
                        ) : (
                          detail.items.map((it) => (
                            <tr key={it.id} className='border-t border-slate-200'>
                              <td className='px-4 py-3 font-medium text-slate-900'>{it.item_name}</td>
                              <td className='px-4 py-3 text-slate-600'>{it.quantity}</td>
                              <td className='px-4 py-3 text-slate-600'>{money(Number(it.unit_price))}</td>
                              <td className='px-4 py-3 font-semibold text-slate-900'>
                                {money(Number(it.line_total))}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add modal */}
      {showAdd && (
        <div className='modal-overlay fixed inset-0 z-20 flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:items-center'>
          <div className='modal-content my-8 w-full max-w-3xl rounded-2xl bg-white p-6 shadow-soft sm:p-8'>
            <div className='flex items-center justify-between'>
              <div className='text-lg font-extrabold text-slate-900'>Add Expense</div>
              <button
                type='button'
                onClick={closeAdd}
                className='no-print rounded-xl p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900'
                aria-label='Close'
              >
                <X size={18} />
              </button>
            </div>

            <div className='mt-6 grid grid-cols-1 gap-4 md:grid-cols-12'>
              <div className='md:col-span-4'>
                <div className='text-sm font-semibold text-slate-700'>Date</div>
                <input
                  type='datetime-local'
                  className='mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-brand-300'
                  value={form.expense_date}
                  onChange={(e) => setForm({ ...form, expense_date: e.target.value })}
                />
              </div>
              <div className='md:col-span-4'>
                <div className='text-sm font-semibold text-slate-700'>Type</div>
                <select
                  className='mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-brand-300'
                  value={form.category}
                  onChange={(e) =>
                    setForm({ ...form, category: e.target.value as ExpenseCategory })
                  }
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div className='md:col-span-4'>
                <div className='text-sm font-semibold text-slate-700'>Vendor (optional)</div>
                <input
                  className='mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-brand-300'
                  value={form.vendor}
                  onChange={(e) => setForm({ ...form, vendor: e.target.value })}
                />
              </div>

              <div className='md:col-span-8'>
                <div className='text-sm font-semibold text-slate-700'>Notes (optional)</div>
                <input
                  className='mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-brand-300'
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </div>
              <div className='md:col-span-4'>
                <div className='text-sm font-semibold text-slate-700'>Amount (for bills)</div>
                <input
                  type='number'
                  min={0}
                  step='0.01'
                  className='mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-brand-300'
                  value={form.amount}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      amount: e.target.value === '' ? '' : Number(e.target.value)
                    })
                  }
                />
              </div>
            </div>

            <div className='mt-6'>
              <div className='flex items-center justify-between'>
                <div className='text-sm font-extrabold text-slate-900'>Items (optional)</div>
                <button
                  type='button'
                  onClick={addItem}
                  className='no-print inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50'
                >
                  <Plus size={16} />
                  Add item
                </button>
              </div>

              <div className='mt-3 overflow-x-auto rounded-xl border border-slate-200'>
                <table className='w-full text-left text-sm'>
                  <thead className='bg-slate-50 text-slate-600'>
                    <tr>
                      <th className='px-4 py-3 font-medium'>Item name</th>
                      <th className='px-4 py-3 font-medium'>Qty</th>
                      <th className='px-4 py-3 font-medium'>Unit price</th>
                      <th className='px-4 py-3 font-medium'>Line total</th>
                      <th className='px-4 py-3 font-medium no-print'></th>
                    </tr>
                  </thead>
                  <tbody>
                    {form.items.map((it, idx) => {
                      const lt = Number(it.quantity || 0) * Number(it.unit_price || 0);
                      return (
                        <tr key={idx} className='border-t border-slate-200'>
                          <td className='px-4 py-2'>
                            <input
                              className='w-full rounded-lg border border-slate-200 bg-white px-3 py-2 outline-none focus:border-brand-300'
                              value={it.item_name}
                              onChange={(e) => setItem(idx, { item_name: e.target.value })}
                            />
                          </td>
                          <td className='px-4 py-2'>
                            <input
                              type='number'
                              min={0}
                              step='1'
                              className='w-24 rounded-lg border border-slate-200 bg-white px-3 py-2 outline-none focus:border-brand-300'
                              value={it.quantity}
                              onChange={(e) =>
                                setItem(idx, { quantity: Number(e.target.value) })
                              }
                            />
                          </td>
                          <td className='px-4 py-2'>
                            <input
                              type='number'
                              min={0}
                              step='0.01'
                              className='w-32 rounded-lg border border-slate-200 bg-white px-3 py-2 outline-none focus:border-brand-300'
                              value={it.unit_price}
                              onChange={(e) =>
                                setItem(idx, { unit_price: Number(e.target.value) })
                              }
                            />
                          </td>
                          <td className='px-4 py-2 font-semibold text-slate-900'>{money(lt)}</td>
                          <td className='px-4 py-2 no-print'>
                            <button
                              type='button'
                              onClick={() => removeItem(idx)}
                              className='rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900'
                              aria-label='Remove'
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className='mt-4 flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3'>
                <div className='text-sm text-slate-600'>Computed total</div>
                <div className='text-lg font-extrabold text-slate-900'>{money(computedTotal)}</div>
              </div>

              <button
                type='button'
                onClick={submit}
                disabled={submitting}
                className='no-print mt-5 w-full rounded-xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white shadow-soft hover:bg-brand-700 disabled:opacity-60'
              >
                {submitting ? 'Saving...' : 'Save Expense'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}