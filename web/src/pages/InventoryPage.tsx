import { useEffect, useMemo, useState } from 'react';
import { Pencil, X } from 'lucide-react';
import { Card } from '../components/Card';
import { api } from '../lib/api';
import type { Product } from '../lib/types';
import { money } from '../lib/format';

type ProductForm = {
  name: string;
  category: string;
  price: number;
  stock: number;
  low_stock_threshold: number;
};

type RestockForm = {
  productId: string;
  productName: string;
  qty: number;
  reason: string;
};

type RemoveStockForm = {
  productId: string;
  productName: string;
  qty: number;
  reason: string;
};

type EditProductForm = {
  productId: string;
  productName: string;
  price: number;
  low_stock_threshold: number;
};

const defaultForm: ProductForm = {
  name: '',
  category: 'Crochet',
  price: 0,
  stock: 0,
  low_stock_threshold: 5
};

export function InventoryPage() {
  const [rows, setRows] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState<ProductForm>(defaultForm);

  const [restock, setRestock] = useState<RestockForm | null>(null);
  const [removeStock, setRemoveStock] = useState<RemoveStockForm | null>(null);
  const [editProduct, setEditProduct] = useState<EditProductForm | null>(null);

  async function load() {
    setLoading(true);
    try {
      const data = await api.get<Product[]>('/api/products');
      setRows(data);
      setError(null);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load inventory');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const empty = useMemo(() => !loading && rows.length === 0, [loading, rows.length]);

  function openAdd() {
    setForm(defaultForm);
    setShowAdd(true);
  }

  function closeAdd() {
    setShowAdd(false);
  }

  async function addProduct() {
    if (!form.name.trim()) {
      alert('Please enter product name');
      return;
    }
    if (!form.category.trim()) {
      alert('Please enter category');
      return;
    }

    try {
      await api.post('/api/products', {
        ...form,
        stock: Math.max(0, Math.floor(form.stock || 0)),
        low_stock_threshold: Math.max(0, Math.floor(form.low_stock_threshold || 0)),
        price: Math.max(0, Number(form.price || 0))
      });
      closeAdd();
      await load();
    } catch (e: any) {
      alert(e?.message ?? 'Failed to add product');
    }
  }

  function openRestock(p: Product) {
    setRestock({
      productId: String(p.id),
      productName: p.name,
      qty: 1,
      reason: 'Restock'
    });
  }

  function closeRestock() {
    setRestock(null);
  }

  function openRemoveStock(p: Product) {
    setRemoveStock({
      productId: String(p.id),
      productName: p.name,
      qty: 1,
      reason: 'Damaged / Lost'
    });
  }

  function closeRemoveStock() {
    setRemoveStock(null);
  }

  function openEdit(p: Product) {
    setEditProduct({
      productId: String(p.id),
      productName: p.name,
      price: Number(p.price ?? 0),
      low_stock_threshold: Number(p.low_stock_threshold ?? 0)
    });
  }

  function closeEdit() {
    setEditProduct(null);
  }

  async function submitRestock() {
    if (!restock) return;
    const qty = Math.max(1, Math.floor(restock.qty || 1));
    const reason = restock.reason?.trim() || 'Restock';

    try {
      await api.post(`/api/products/${restock.productId}/restock`, { qty, reason });
      closeRestock();
      await load();
    } catch (e: any) {
      alert(e?.message ?? 'Failed to restock');
    }
  }

  async function submitRemoveStock() {
    if (!removeStock) return;
    const qty = Math.max(1, Math.floor(removeStock.qty || 1));
    const reason = removeStock.reason?.trim() || 'Stock adjustment';

    try {
      await api.post(`/api/products/${removeStock.productId}/decrease`, { qty, reason });
      closeRemoveStock();
      await load();
    } catch (e: any) {
      alert(e?.message ?? 'Failed to remove stock');
    }
  }

  async function submitEdit() {
    if (!editProduct) return;
    const price = Math.max(0, Number(editProduct.price || 0));
    const low_stock_threshold = Math.max(0, Math.floor(editProduct.low_stock_threshold || 0));

    try {
      await api.put(`/api/products/${editProduct.productId}`, { price, low_stock_threshold });
      closeEdit();
      await load();
    } catch (e: any) {
      alert(e?.message ?? 'Failed to update product');
    }
  }

  return (
    <div>
      <div className='mb-6 flex items-start justify-between gap-4'>
        <div>
          <div className='text-3xl font-extrabold tracking-tight'>Inventory</div>
          <div className='mt-1 text-slate-500'>Manage products and stock levels</div>
        </div>
        <button
          className='rounded-2xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white shadow-soft hover:bg-brand-700'
          onClick={openAdd}
          type='button'
        >
          + Add Product
        </button>
      </div>

      <Card className='overflow-hidden'>
        <div className='overflow-x-auto'>
          <table className='w-full text-left text-sm'>
            <thead className='bg-white'>
              <tr className='border-b border-slate-200 text-slate-600'>
                <th className='px-5 py-4 font-medium'>Product</th>
                <th className='px-5 py-4 font-medium'>Category</th>
                <th className='px-5 py-4 font-medium'>Price</th>
                <th className='px-5 py-4 font-medium'>Stock</th>
                <th className='px-5 py-4 font-medium'>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className='px-5 py-10 text-center text-slate-500'>
                    Loading...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={5} className='px-5 py-10 text-center text-red-600'>
                    {error}
                  </td>
                </tr>
              ) : empty ? (
                <tr>
                  <td colSpan={5} className='px-5 py-10 text-center text-slate-500'>
                    No products yet. Click "Add Product".
                  </td>
                </tr>
              ) : (
                rows.map((p) => (
                  <tr key={p.id} className='border-b border-slate-100'>
                    <td className='px-5 py-4 font-medium text-slate-900'>{p.name}</td>
                    <td className='px-5 py-4 text-slate-600'>{p.category}</td>
                    <td className='px-5 py-4 text-slate-600'>{money(Number(p.price))}</td>
                    <td className='px-5 py-4'>
                      <span
                        className={
                          Number(p.stock) <= Number(p.low_stock_threshold)
                            ? 'rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700'
                            : 'rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700'
                        }
                      >
                        {p.stock}
                      </span>
                    </td>
                    <td className='px-5 py-4'>
                      <div className='flex items-center gap-2'>
                        <button
                          type='button'
                          onClick={() => openEdit(p)}
                          className='inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50'
                          title='Edit price'
                        >
                          <Pencil size={16} />
                          Edit
                        </button>
                        <button
                          type='button'
                          onClick={() => openRestock(p)}
                          className='rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50'
                        >
                          Restock
                        </button>
                        <button
                          type='button'
                          onClick={() => openRemoveStock(p)}
                          className='rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-700 shadow-sm hover:bg-red-50'
                        >
                          Remove
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {showAdd && (
        <div className='fixed inset-0 z-20 flex items-center justify-center bg-black/40 p-4'>
          <div className='w-full max-w-xl rounded-2xl bg-white p-8 shadow-soft'>
            <div className='flex items-center justify-between'>
              <div className='text-lg font-extrabold text-slate-900'>Add New Product</div>
              <button
                type='button'
                onClick={closeAdd}
                className='rounded-xl p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900'
                aria-label='Close'
              >
                <X size={18} />
              </button>
            </div>

            <div className='mt-6 space-y-5'>
              <div>
                <div className='text-sm font-semibold text-slate-700'>Name</div>
                <input
                  className='mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-brand-300'
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>

              <div>
                <div className='text-sm font-semibold text-slate-700'>Category</div>
                <input
                  className='mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-brand-300'
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                />
              </div>

              <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
                <div>
                  <div className='text-sm font-semibold text-slate-700'>Price ($)</div>
                  <input
                    type='number'
                    min={0}
                    step='0.01'
                    className='mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-brand-300'
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <div className='text-sm font-semibold text-slate-700'>Initial Stock</div>
                  <input
                    type='number'
                    min={0}
                    step='1'
                    className='mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-brand-300'
                    value={form.stock}
                    onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div>
                <div className='text-sm font-semibold text-slate-700'>Low Stock Alert Threshold</div>
                <input
                  type='number'
                  min={0}
                  step='1'
                  className='mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-brand-300'
                  value={form.low_stock_threshold}
                  onChange={(e) =>
                    setForm({ ...form, low_stock_threshold: Number(e.target.value) })
                  }
                />
              </div>

              <button
                type='button'
                onClick={addProduct}
                className='mt-2 w-full rounded-xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white shadow-soft hover:bg-brand-700'
              >
                Add Product
              </button>
            </div>
          </div>
        </div>
      )}

      {restock && (
        <div className='fixed inset-0 z-20 flex items-center justify-center bg-black/40 p-4'>
          <div className='w-full max-w-xl rounded-2xl bg-white p-8 shadow-soft'>
            <div className='flex items-center justify-between'>
              <div className='text-lg font-extrabold text-slate-900'>Restock Product</div>
              <button
                type='button'
                onClick={closeRestock}
                className='rounded-xl p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900'
                aria-label='Close'
              >
                <X size={18} />
              </button>
            </div>

            <div className='mt-2 text-sm text-slate-500'>{restock.productName}</div>

            <div className='mt-6 space-y-5'>
              <div>
                <div className='text-sm font-semibold text-slate-700'>Quantity</div>
                <input
                  type='number'
                  min={1}
                  step='1'
                  className='mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-brand-300'
                  value={restock.qty}
                  onChange={(e) => setRestock({ ...restock, qty: Number(e.target.value) })}
                />
              </div>

              <div>
                <div className='text-sm font-semibold text-slate-700'>Reason</div>
                <input
                  className='mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-brand-300'
                  value={restock.reason}
                  onChange={(e) => setRestock({ ...restock, reason: e.target.value })}
                />
              </div>

              <button
                type='button'
                onClick={submitRestock}
                className='mt-2 w-full rounded-xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white shadow-soft hover:bg-brand-700'
              >
                Restock
              </button>
            </div>
          </div>
        </div>
      )}

      {editProduct && (
        <div className='fixed inset-0 z-20 flex items-center justify-center bg-black/40 p-4'>
          <div className='w-full max-w-xl rounded-2xl bg-white p-8 shadow-soft'>
            <div className='flex items-center justify-between'>
              <div className='text-lg font-extrabold text-slate-900'>Edit Product</div>
              <button
                type='button'
                onClick={closeEdit}
                className='rounded-xl p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900'
                aria-label='Close'
              >
                <X size={18} />
              </button>
            </div>

            <div className='mt-2 text-sm text-slate-500'>{editProduct.productName}</div>

            <div className='mt-6 space-y-5'>
              <div>
                <div className='text-sm font-semibold text-slate-700'>Unit price ($)</div>
                <input
                  type='number'
                  min={0}
                  step='0.01'
                  className='mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-brand-300'
                  value={editProduct.price}
                  onChange={(e) => setEditProduct({ ...editProduct, price: Number(e.target.value) })}
                />
              </div>

              <div>
                <div className='text-sm font-semibold text-slate-700'>Low stock threshold</div>
                <input
                  type='number'
                  min={0}
                  step='1'
                  className='mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-brand-300'
                  value={editProduct.low_stock_threshold}
                  onChange={(e) =>
                    setEditProduct({ ...editProduct, low_stock_threshold: Number(e.target.value) })
                  }
                />
              </div>

              <button
                type='button'
                onClick={submitEdit}
                className='mt-2 w-full rounded-xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white shadow-soft hover:bg-brand-700'
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {removeStock && (
        <div className='fixed inset-0 z-20 flex items-center justify-center bg-black/40 p-4'>
          <div className='w-full max-w-xl rounded-2xl bg-white p-8 shadow-soft'>
            <div className='flex items-center justify-between'>
              <div className='text-lg font-extrabold text-slate-900'>Remove Stock</div>
              <button
                type='button'
                onClick={closeRemoveStock}
                className='rounded-xl p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900'
                aria-label='Close'
              >
                <X size={18} />
              </button>
            </div>

            <div className='mt-2 text-sm text-slate-500'>{removeStock.productName}</div>

            <div className='mt-6 space-y-5'>
              <div>
                <div className='text-sm font-semibold text-slate-700'>Quantity</div>
                <input
                  type='number'
                  min={1}
                  step='1'
                  className='mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-brand-300'
                  value={removeStock.qty}
                  onChange={(e) => setRemoveStock({ ...removeStock, qty: Number(e.target.value) })}
                />
              </div>

              <div>
                <div className='text-sm font-semibold text-slate-700'>Reason</div>
                <input
                  className='mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-brand-300'
                  value={removeStock.reason}
                  onChange={(e) => setRemoveStock({ ...removeStock, reason: e.target.value })}
                />
              </div>

              <button
                type='button'
                onClick={submitRemoveStock}
                className='mt-2 w-full rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white shadow-soft hover:bg-red-700'
              >
                Remove Stock
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}