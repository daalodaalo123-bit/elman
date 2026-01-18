import { useEffect, useMemo, useState } from 'react';
import { Card } from '../components/Card';
import { api } from '../lib/api';
import type { SalesHistoryRow } from '../lib/types';
import { money } from '../lib/format';

export function HistoryPage() {
  const [rows, setRows] = useState<SalesHistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

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
                <th className='px-5 py-4 font-medium'>Receipt</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className='px-5 py-10 text-center text-slate-500'>
                    Loading...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className='px-5 py-10 text-center text-slate-500'>
                    No sales found.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.receipt_ref} className='border-b border-slate-100'>
                    <td className='px-5 py-4 font-medium text-slate-900'>{r.receipt_ref}</td>
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
    </div>
  );
}