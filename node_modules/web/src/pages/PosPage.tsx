import { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import type { Customer, PaymentMethod, Product } from '../lib/types';
import { Card } from '../components/Card';
import { money } from '../lib/format';
import { CheckCircle2, Plus, User } from 'lucide-react';
import { clsx } from 'clsx';

type CartItem = {
  product_id: string;
  name: string;
  unit_price: number;
  qty: number;
};

function nowForDateTimeLocal(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(
    d.getMinutes()
  )}`;
}

export function PosPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [qty, setQty] = useState<number>(1);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState<number>(0);
  const [payment, setPayment] = useState<PaymentMethod>('Cash');
  const [submitting, setSubmitting] = useState(false);

  // Sale date (can be past/future)
  const [saleDate, setSaleDate] = useState<string>(() => nowForDateTimeLocal());

  // Customer
  const [customerId, setCustomerId] = useState<string>('');
  const [customerName, setCustomerName] = useState('');

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    Promise.all([api.get<Product[]>('/api/products'), api.get<Customer[]>('/api/customers')])
      .then(([p, c]) => {
        if (!mounted) return;
        setProducts(p);
        setCustomers(c);
        setError(null);
      })
      .catch((e: any) => {
        if (!mounted) return;
        setError(e?.message ?? 'Failed to load data');
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const selectedProduct = useMemo(
    () => products.find((p) => p.id === selectedProductId),
    [products, selectedProductId]
  );

  const subtotal = useMemo(() => cart.reduce((s, it) => s + it.unit_price * it.qty, 0), [cart]);

  const total = useMemo(
    () => Math.max(0, subtotal - (Number.isFinite(discount) ? discount : 0)),
    [subtotal, discount]
  );

  const selectedCustomer = useMemo(
    () => customers.find((c) => c.id === customerId),
    [customers, customerId]
  );

  useEffect(() => {
    if (selectedCustomer) {
      setCustomerName(selectedCustomer.name);
    }
  }, [selectedCustomer]);

  function addToCart() {
    if (!selectedProduct) return;
    const q = Math.max(1, Math.floor(qty || 1));
    setCart((prev) => {
      const idx = prev.findIndex((x) => x.product_id === selectedProduct.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], qty: next[idx].qty + q };
        return next;
      }
      return [
        ...prev,
        {
          product_id: selectedProduct.id,
          name: selectedProduct.name,
          unit_price: Number(selectedProduct.price),
          qty: q
        }
      ];
    });
  }

  async function completeSale() {
    if (!cart.length) return;
    setSubmitting(true);
    try {
      const res = await api.post<{ receipt_ref: string }>('/api/sales', {
        cashier: 'Main Cashier',
        sale_date: saleDate ? new Date(saleDate).toISOString() : undefined,
        customer: customerName.trim() ? customerName.trim() : undefined,
        customer_id: customerId ? customerId : undefined,
        payment_method: payment,
        discount: discount || 0,
        unpaid: false,
        items: cart.map((c) => ({ product_id: c.product_id, qty: c.qty }))
      });
      alert(`Sale completed. Receipt: ${res.receipt_ref}`);
      setCart([]);
      setDiscount(0);
      setCustomerId('');
      setCustomerName('');
    } catch (e: any) {
      alert(e?.message ?? 'Sale failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <div className='mb-6'>
        <div className='text-3xl font-extrabold tracking-tight'>POS</div>
        <div className='mt-1 text-slate-500'>Create and complete sales transactions</div>
      </div>

      <div className='grid grid-cols-1 gap-6 lg:grid-cols-12'>
        {/* left */}
        <div className='lg:col-span-7'>
          <Card className='p-6'>
            <div className='flex items-center gap-2 text-lg font-bold'>
              <span className='inline-flex h-8 w-8 items-center justify-center rounded-xl bg-brand-50 text-brand-700'>
                <Plus size={18} />
              </span>
              Add Item
            </div>

            <div className='mt-5 grid grid-cols-1 gap-4 md:grid-cols-12'>
              <div className='md:col-span-7'>
                <div className='text-sm font-medium text-slate-600'>Product</div>
                <select
                  className='mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 outline-none focus:border-brand-300'
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                >
                  <option value=''>Select product...</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                {loading && <div className='mt-2 text-sm text-slate-500'>Loading...</div>}
                {error && <div className='mt-2 text-sm text-red-600'>{error}</div>}
              </div>

              <div className='md:col-span-3'>
                <div className='text-sm font-medium text-slate-600'>Qty</div>
                <input
                  type='number'
                  min={1}
                  className='mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 outline-none focus:border-brand-300'
                  value={qty}
                  onChange={(e) => setQty(Number(e.target.value))}
                />
              </div>

              <div className='md:col-span-2'>
                <div className='text-sm font-medium text-slate-600'>&nbsp;</div>
                <button
                  type='button'
                  onClick={addToCart}
                  disabled={!selectedProduct}
                  className='mt-2 w-full rounded-xl bg-brand-500 px-3 py-3 text-sm font-semibold text-white shadow-soft transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50'
                >
                  Add
                </button>
              </div>
            </div>

            {/* Sale Date */}
            <div className='mt-5 grid grid-cols-1 gap-4 md:grid-cols-12'>
              <div className='md:col-span-5'>
                <div className='text-sm font-medium text-slate-600'>Sale Date</div>
                <input
                  type='datetime-local'
                  className='mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm outline-none focus:border-brand-300'
                  value={saleDate}
                  onChange={(e) => setSaleDate(e.target.value)}
                />
              </div>
              <div className='md:col-span-7'>
                <div className='mt-7 text-xs text-slate-500'>
                  You can set past or future dates. This will be saved in History.
                </div>
              </div>
            </div>

            {/* Customer */}
            <div className='mt-5 grid grid-cols-1 gap-4 md:grid-cols-12'>
              <div className='md:col-span-5'>
                <div className='text-sm font-medium text-slate-600'>Customer (CRM)</div>
                <select
                  className='mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 outline-none focus:border-brand-300'
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                >
                  <option value=''>Select customer...</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                      {c.phone ? ` - ${c.phone}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className='md:col-span-7'>
                <div className='text-sm font-medium text-slate-600'>Customer Name</div>
                <div className='relative mt-2'>
                  <span className='pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400'>
                    <User size={16} />
                  </span>
                  <input
                    className='w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-9 pr-3 text-sm outline-none focus:border-brand-300'
                    placeholder='Optional: type a customer name'
                    value={customerName}
                    onChange={(e) => {
                      setCustomerName(e.target.value);
                      setCustomerId('');
                    }}
                  />
                </div>
              </div>
            </div>
          </Card>

          <Card className='mt-6 p-6'>
            <div className='flex items-center justify-between'>
              <div className='text-lg font-bold'>Current Cart</div>
              <div className='rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm text-slate-600'>
                {cart.length} items
              </div>
            </div>

            <div className='mt-4 overflow-hidden rounded-xl border border-slate-200'>
              <table className='w-full text-left text-sm'>
                <thead className='bg-slate-50 text-slate-600'>
                  <tr>
                    <th className='px-4 py-3 font-medium'>Item Name</th>
                    <th className='px-4 py-3 font-medium'>Price</th>
                    <th className='px-4 py-3 font-medium'>Qty</th>
                    <th className='px-4 py-3 font-medium'>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {cart.length === 0 ? (
                    <tr>
                      <td className='px-4 py-10 text-center text-slate-500' colSpan={4}>
                        No items added yet
                      </td>
                    </tr>
                  ) : (
                    cart.map((it) => (
                      <tr key={it.product_id} className='border-t border-slate-200'>
                        <td className='px-4 py-3 font-medium text-slate-900'>{it.name}</td>
                        <td className='px-4 py-3 text-slate-600'>{money(it.unit_price)}</td>
                        <td className='px-4 py-3 text-slate-600'>{it.qty}</td>
                        <td className='px-4 py-3 font-semibold text-slate-900'>
                          {money(it.unit_price * it.qty)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* right */}
        <div className='lg:col-span-5'>
          <div className='rounded-2xl bg-slate-900 p-6 text-white shadow-soft'>
            <div className='flex items-center justify-between'>
              <div className='text-sm text-slate-300'>Subtotal</div>
              <div className='text-sm font-semibold'>{money(subtotal)}</div>
            </div>

            <div className='mt-4 flex items-center justify-between gap-3'>
              <div className='text-sm text-slate-300'>Discount</div>
              <div className='flex items-center gap-2 rounded-xl bg-slate-800 px-3 py-2'>
                <span className='text-slate-300'>$</span>
                <input
                  type='number'
                  min={0}
                  value={discount}
                  onChange={(e) => setDiscount(Number(e.target.value))}
                  className='w-24 bg-transparent text-right text-sm text-white outline-none'
                />
              </div>
            </div>

            <div className='mt-5 border-t border-slate-700 pt-5'>
              <div className='flex items-end justify-between'>
                <div className='text-lg font-bold'>Total</div>
                <div className='text-4xl font-extrabold tracking-tight'>{money(total)}</div>
              </div>
            </div>
          </div>

          <Card className='mt-6 p-6'>
            <div className='text-lg font-bold'>Payment Method</div>
            <div className='mt-4 grid grid-cols-3 gap-3'>
              {(['Cash', 'Zaad', 'Edahab'] as PaymentMethod[]).map((m) => (
                <button
                  key={m}
                  type='button'
                  onClick={() => setPayment(m)}
                  className={clsx(
                    'rounded-2xl border px-3 py-4 text-center text-sm font-semibold transition',
                    payment === m
                      ? 'border-brand-500 bg-brand-50 text-brand-700'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  )}
                >
                  {m === 'Cash' ? 'Cash' : m.toUpperCase()}
                </button>
              ))}
            </div>

            <button
              type='button'
              onClick={completeSale}
              disabled={!cart.length || submitting}
              className='mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-4 py-4 text-base font-semibold text-white shadow-soft transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60'
            >
              <CheckCircle2 size={18} />
              {submitting ? 'Completing...' : 'Complete Sale'}
            </button>
          </Card>

          <div className='mt-4 text-xs text-slate-500'>Tip: Manage customer info in the Customers tab.</div>
        </div>
      </div>
    </div>
  );
}