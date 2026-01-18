import { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { Card } from '../components/Card';
import { api } from '../lib/api';
import type { SaleDetail, SalesHistoryRow } from '../lib/types';
import { money } from '../lib/format';

type RefundDraft = {
  receipt_ref: string;
  reason: string;
  items: Array<{
    product_id: string;
    product_name: string;
    maxQty: number;
    qty: number;
    unit_price: number;
  }>;
};

export function HistoryPage() {
  const [rows, setRows] = useState<SalesHistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [refund, setRefund] = useState<RefundDraft | null>(null);
  const [refundSubmitting, setRefundSubmitting] = useState(false);

  const params = useMemo(() => search.trim(), [search]);

  useEffect(() => {
    let mounted = true;
    const t = setTimeout(() => {
      setLoading(true);
      api
        .get<SalesHistoryRow[]>(
          `/api/sales/history${params ? `?search=${encodeURIComponent(params)}` : ''}`
        )
        .then((d) => {
          if (!mounted) return;
          setRows(d);
        })
        .catch(() => {
          if (!mounted) return;
          setRows([]);
        })
        .finally(() => {
          if (!mounted) return;
          setLoading(false);
        });
    }, 200);

    return () => {
      mounted = false;
      clearTimeout(t);
    };
  }, [params]);

  async function openRefund(receipt_ref: string) {
    try {
      const sale = await api.get<SaleDetail>(`/api/sales/${receipt_ref}`);
      const items = (sale.items ?? []).map((it) => ({
        product_id: it.product_id,
        product_name: it.product_name,
        maxQty: Math.max(0, Math.floor(it.qty)),
        qty: 0,
        unit_price: Number(it.unit_price ?? 0)
      }));
      setRefund({ receipt_ref, reason: 'Refund', items });
    } catch (e: any) {
      alert(e?.message ?? 'Failed to load sale');
    }
  }

  function closeRefund() {
    setRefund(null);
    setRefundSubmitting(false);
  }

  function setRefundQty(idx: number, qty: number) {
    setRefund((prev) => {
      if (!prev) return prev;
      const nextItems = [...prev.items];
      const it = nextItems[idx];
      const q = Math.max(0, Math.min(it.maxQty, Math.floor(qty || 0)));
      nextItems[idx] = { ...it, qty: q };
      return { ...prev, items: nextItems };
    });
  }

  async function submitRefund() {
    if (!refund) return;
    const items = refund.items
      .filter((it) => (it.qty ?? 0) > 0)
      .map((it) => ({ product_id: it.product_id, qty: Math.floor(it.qty) }));

    if (!items.length) {
      alert('Select at least one item quantity to refund.');
      return;
    }

    setRefundSubmitting(true);
    try {
      await api.post(`/api/sales/${refund.receipt_ref}/refund`, {
        cashier: 'Main Cashier',
        reason: refund.reason?.trim() || 'Refund',
        items
      });
      closeRefund();
      // reload by re-triggering effect
      setSearch((s) => s);
    } catch (e: any) {
      alert(e?.message ?? 'Refund failed');
    } finally {
      setRefundSubmitting(false);
    }
  }

  return (
    <div>
      <div className='mb-6 flex items-start justify-between gap-4'>
        <div>
          <div className='text-3xl font-extrabold tracking-tight'>Sales History</div>
          <div className='mt-1 text-slate-500'>View and manage past transactions</div>
        </div>
        <input
          className='w-full max-w-md rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-brand-300'
          placeholder='Search receipt # or customer...'
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <Card className='overflow-hidden'>
        <div className='overflow-x-auto'>
          <table className='w-full text-left text-sm'>
            <thead className='bg-white'>
              <tr className='border-b border-slate-200 text-slate-600'>
                <th className='px-5 py-4 font-medium'>Receipt Ref</th>
                <th className='px-5 py-4 font-medium'>Date</th>
                <th className='px-5 py-4 font-medium'>Cashier</th>
                <th className='px-5 py-4 font-medium'>Customer</th>
                <th className='px-5 py-4 font-medium'>Payment</th>
                <th className='px-5 py-4 font-medium'>Total</th>
                <th className='px-5 py-4 font-medium'>Unpaid</th>
                <th className='px-5 py-4 font-medium'>Refund</th>
                <th className='px-5 py-4 font-medium'>Receipt</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className='px-5 py-10 text-center text-slate-500'>
                    Loading...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={9} className='px-5 py-10 text-center text-slate-500'>
                    No sales found.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.receipt_ref} className='border-b border-slate-100'>
                    <td className='px-5 py-4 font-medium text-slate-900'>
                      {r.receipt_ref}
                      {r.fully_refunded ? (
                        <span className='ml-2 rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700'>
                          Refunded
                        </span>
                      ) : null}
                    </td>
                    <td className='px-5 py-4 text-slate-600'>{String(r.date)}</td>
                    <td className='px-5 py-4 text-slate-600'>{r.cashier}</td>
                    <td className='px-5 py-4 text-slate-600'>{r.customer ?? 'â€”'}</td>
                    <td className='px-5 py-4 text-slate-600'>{r.payment}</td>
                    <td className='px-5 py-4 font-semibold text-slate-900'>{money(Number(r.total))}</td>
                    <td className='px-5 py-4'>
                      {r.unpaid ? (
                        <span className='rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700'>
                          Yes
                        </span>
                      ) : (
                        <span className='rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700'>
                          No
                        </span>
                      )}
                    </td>
                    <td className='px-5 py-4'>
                      <button
                        type='button'
                        onClick={() => openRefund(r.receipt_ref)}
                        className='rounded-xl border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-700 shadow-sm hover:bg-red-50'
                      >
                        Refund
                      </button>
                      {r.refunded_total ? (
                        <div className='mt-1 text-xs text-slate-500'>
                          Refunded: {money(Number(r.refunded_total))}
                        </div>
                      ) : null}
                    </td>
                    <td className='px-5 py-4'>
                      <a
                        className='rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50'
                        href={`/api/sales/${r.receipt_ref}/pdf`}
                      >
                        Download Receipt
                      </a>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {refund && (
        <div className='fixed inset-0 z-20 flex items-center justify-center bg-black/40 p-4'>
          <div className='w-full max-w-3xl rounded-2xl bg-white p-8 shadow-soft'>
            <div className='flex items-center justify-between'>
              <div className='text-lg font-extrabold text-slate-900'>Refund / Return</div>
              <button
                type='button'
                onClick={closeRefund}
                className='rounded-xl p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900'
                aria-label='Close'
              >
                <X size={18} />
              </button>
            </div>

            <div className='mt-2 text-sm text-slate-500'>Receipt: {refund.receipt_ref}</div>

            <div className='mt-6'>
              <div className='text-sm font-semibold text-slate-700'>Reason</div>
              <input
                className='mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-brand-300'
                value={refund.reason}
                onChange={(e) => setRefund({ ...refund, reason: e.target.value })}
              />
            </div>

            <div className='mt-5 overflow-hidden rounded-xl border border-slate-200'>
              <table className='w-full text-left text-sm'>
                <thead className='bg-slate-50 text-slate-600'>
                  <tr>
                    <th className='px-4 py-3 font-medium'>Item</th>
                    <th className='px-4 py-3 font-medium'>Unit</th>
                    <th className='px-4 py-3 font-medium'>Max</th>
                    <th className='px-4 py-3 font-medium'>Refund qty</th>
                  </tr>
                </thead>
                <tbody>
                  {refund.items.map((it, idx) => (
                    <tr key={it.product_id} className='border-t border-slate-200'>
                      <td className='px-4 py-3 font-medium text-slate-900'>{it.product_name}</td>
                      <td className='px-4 py-3 text-slate-700'>{money(Number(it.unit_price))}</td>
                      <td className='px-4 py-3 text-slate-700'>{it.maxQty}</td>
                      <td className='px-4 py-3'>
                        <input
                          type='number'
                          min={0}
                          step='1'
                          className='w-24 rounded-lg border border-slate-200 bg-white px-3 py-2 outline-none focus:border-brand-300'
                          value={it.qty}
                          onChange={(e) => setRefundQty(idx, Number(e.target.value))}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button
              type='button'
              onClick={submitRefund}
              disabled={refundSubmitting}
              className='mt-6 w-full rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white shadow-soft hover:bg-red-700 disabled:opacity-60'
            >
              {refundSubmitting ? 'Processing...' : 'Process refund'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}