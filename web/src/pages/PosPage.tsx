import { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import type { Customer, PaymentMethod, Product } from '../lib/types';
import { Card } from '../components/Card';
import { money } from '../lib/format';
import { CheckCircle2, ClipboardList, Printer, Plus, Save, User } from 'lucide-react';
import { clsx } from 'clsx';
import { apiPathWithToken } from '../lib/api';

type CartItem = {
  product_id: string;
  name: string;
  unit_price: number;
  qty: number;
  discount: number;
};

type DiscountMode = 'amount' | 'percent';

type ParkedCart = {
  id: string;
  name: string;
  saved_at: string;
  cart: CartItem[];
  discount: number;
  discountMode: DiscountMode;
  payment: PaymentMethod;
  saleDate: string;
  customerId: string;
  customerName: string;
};

const PARKED_KEY = 'elman_pos_parked_carts_v1';

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
  const [discountMode, setDiscountMode] = useState<DiscountMode>('amount');
  const [payment, setPayment] = useState<PaymentMethod>('Cash');
  const [submitting, setSubmitting] = useState(false);
  const [lastReceipt, setLastReceipt] = useState<string | null>(null);
  const [parked, setParked] = useState<ParkedCart[]>([]);

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

  const subtotal = useMemo(() => {
    return cart.reduce((s, it) => {
      const lineTotalBeforeDiscount = it.unit_price * it.qty;
      const lineTotal = Math.max(0, lineTotalBeforeDiscount - (it.discount || 0));
      return s + lineTotal;
    }, 0);
  }, [cart]);

  const discountAmount = useMemo(() => {
    const d = Number(discount || 0);
    if (!Number.isFinite(d) || d <= 0) return 0;
    if (discountMode === 'percent') {
      const pct = Math.min(100, Math.max(0, d));
      return (subtotal * pct) / 100;
    }
    return d;
  }, [discount, discountMode, subtotal]);

  const total = useMemo(
    () => Math.max(0, subtotal - discountAmount),
    [subtotal, discountAmount]
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

  useEffect(() => {
    // load parked carts
    try {
      const raw = localStorage.getItem(PARKED_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as ParkedCart[];
      if (Array.isArray(parsed)) setParked(parsed);
    } catch {
      // ignore
    }
  }, []);

  function persistParked(next: ParkedCart[]) {
    setParked(next);
    try {
      localStorage.setItem(PARKED_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  }

  function parkCart() {
    if (!cart.length) return;
    const name = prompt('Name this parked cart (optional):', customerName.trim() || 'Parked cart');
    const id = `${Date.now()}`;
    const item: ParkedCart = {
      id,
      name: (name ?? '').trim() || 'Parked cart',
      saved_at: new Date().toISOString(),
      cart,
      discount,
      discountMode,
      payment,
      saleDate,
      customerId,
      customerName
    };
    const next = [item, ...parked].slice(0, 20);
    persistParked(next);
    // clear current
    setCart([]);
    setDiscount(0);
    setDiscountMode('amount');
    setCustomerId('');
    setCustomerName('');
    setLastReceipt(null);
  }

  function resumeCart(id: string) {
    const found = parked.find((p) => p.id === id);
    if (!found) return;
    setCart(found.cart);
    setDiscount(found.discount);
    setDiscountMode(found.discountMode);
    setPayment(found.payment);
    setSaleDate(found.saleDate);
    setCustomerId(found.customerId);
    setCustomerName(found.customerName);
    setLastReceipt(null);
    persistParked(parked.filter((p) => p.id !== id));
  }

  function deleteParked(id: string) {
    persistParked(parked.filter((p) => p.id !== id));
  }

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
          qty: q,
          discount: 0
        }
      ];
    });
  }

  function updateCartItemDiscount(index: number, discount: number) {
    setCart((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], discount: Math.max(0, Number(discount) || 0) };
      return next;
    });
  }

  function removeCartItem(index: number) {
    setCart((prev) => prev.filter((_, i) => i !== index));
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
        discount: Number(discountAmount || 0),
        unpaid: false,
        items: cart.map((c) => ({
          product_id: c.product_id,
          qty: c.qty,
          discount: Number(c.discount || 0)
        }))
      });
      setLastReceipt(res.receipt_ref);
      setCart([]);
      setDiscount(0);
      setDiscountMode('amount');
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
            
            {cart.length > 0 && (
              <div className='mt-3 rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-xs text-brand-700'>
                💡 <strong>Tip:</strong> Enter a discount amount in the "Discount" column for any item to apply a discount to that specific item.
              </div>
            )}

            <div className='mt-3 flex flex-wrap items-center justify-between gap-3'>
              <div className='text-xs text-slate-500'>
                {parked.length ? `${parked.length} parked` : 'No parked carts'}
              </div>
              <div className='flex items-center gap-2'>
                <button
                  type='button'
                  onClick={parkCart}
                  disabled={!cart.length}
                  className='inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50'
                >
                  <Save size={16} />
                  Park cart
                </button>
              </div>
            </div>

            {parked.length ? (
              <div className='mt-4 overflow-x-auto rounded-xl border border-slate-200'>
                <table className='w-full text-left text-sm'>
                  <thead className='bg-slate-50 text-slate-600'>
                    <tr>
                      <th className='px-4 py-3 font-medium'>Parked carts</th>
                      <th className='px-4 py-3 font-medium'>Items</th>
                      <th className='px-4 py-3 font-medium'></th>
                    </tr>
                  </thead>
                  <tbody>
                    {parked.slice(0, 5).map((p) => (
                      <tr key={p.id} className='border-t border-slate-200'>
                        <td className='px-4 py-3 font-medium text-slate-900'>{p.name}</td>
                        <td className='px-4 py-3 text-slate-600'>{p.cart.length}</td>
                        <td className='px-4 py-3'>
                          <div className='flex items-center justify-end gap-2'>
                            <button
                              type='button'
                              onClick={() => resumeCart(p.id)}
                              className='inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50'
                            >
                              <ClipboardList size={16} />
                              Resume
                            </button>
                            <button
                              type='button'
                              onClick={() => deleteParked(p.id)}
                              className='rounded-xl border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-700 shadow-sm hover:bg-red-50'
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}

            <div className='mt-4 overflow-x-auto rounded-xl border border-slate-200'>
              <table className='w-full text-left text-sm'>
                <thead className='bg-slate-50 text-slate-600'>
                  <tr>
                    <th className='px-4 py-3 font-medium'>Item Name</th>
                    <th className='px-4 py-3 font-medium'>Price</th>
                    <th className='px-4 py-3 font-medium'>Qty</th>
                    <th className='px-4 py-3 font-medium'>
                      <div className='flex items-center gap-1'>
                        <span>Discount</span>
                        <span className='text-xs text-slate-400'>(per item)</span>
                      </div>
                    </th>
                    <th className='px-4 py-3 font-medium'>Total</th>
                    <th className='px-4 py-3 font-medium'></th>
                  </tr>
                </thead>
                <tbody>
                  {cart.length === 0 ? (
                    <tr>
                      <td className='px-4 py-10 text-center text-slate-500' colSpan={6}>
                        No items added yet
                      </td>
                    </tr>
                  ) : (
                    cart.map((it, idx) => {
                      const lineTotalBeforeDiscount = it.unit_price * it.qty;
                      const lineTotal = Math.max(0, lineTotalBeforeDiscount - (it.discount || 0));
                      return (
                        <tr key={`${it.product_id}-${idx}`} className='border-t border-slate-200'>
                          <td className='px-4 py-3 font-medium text-slate-900'>{it.name}</td>
                          <td className='px-4 py-3 text-slate-600'>{money(it.unit_price)}</td>
                          <td className='px-4 py-3 text-slate-600'>{it.qty}</td>
                          <td className='px-4 py-3'>
                            <div className='flex flex-col gap-1'>
                              <input
                                type='number'
                                min={0}
                                step='0.01'
                                className='w-28 rounded-lg border-2 border-brand-200 bg-white px-3 py-2 text-sm font-medium outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200'
                                value={it.discount || 0}
                                onChange={(e) => updateCartItemDiscount(idx, Number(e.target.value))}
                                placeholder='0.00'
                                title='Enter discount amount for this item'
                              />
                              {it.discount > 0 && (
                                <div className='text-xs font-semibold text-emerald-600'>
                                  -{money(it.discount)}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className='px-4 py-3 font-semibold text-slate-900'>
                            <div className='flex flex-col'>
                              {it.discount > 0 ? (
                                <>
                                  <span className='text-emerald-600'>{money(lineTotal)}</span>
                                  <span className='text-xs font-normal text-slate-400 line-through'>
                                    {money(lineTotalBeforeDiscount)}
                                  </span>
                                </>
                              ) : (
                                <span>{money(lineTotal)}</span>
                              )}
                            </div>
                          </td>
                          <td className='px-4 py-3'>
                            <button
                              type='button'
                              onClick={() => removeCartItem(idx)}
                              className='rounded-lg border border-red-200 bg-white px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-50'
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      );
                    })
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
                <button
                  type='button'
                  onClick={() => setDiscountMode(discountMode === 'amount' ? 'percent' : 'amount')}
                  className='rounded-lg bg-slate-700 px-2 py-1 text-xs font-bold text-white'
                  title='Toggle discount type'
                >
                  {discountMode === 'amount' ? '$' : '%'}
                </button>
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

          {lastReceipt ? (
            <Card className='mt-6 p-6'>
              <div className='text-lg font-bold'>Last sale</div>
              <div className='mt-1 text-sm text-slate-600'>Receipt: {lastReceipt}</div>
              <div className='mt-4 flex flex-wrap gap-2'>
                <a
                  className='inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50'
                  href={apiPathWithToken(`/api/sales/${lastReceipt}/pdf`)}
                  target='_blank'
                  rel='noreferrer'
                >
                  <Printer size={16} />
                  Print / PDF
                </a>
              </div>
            </Card>
          ) : null}

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