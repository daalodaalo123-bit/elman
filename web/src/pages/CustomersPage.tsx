import { useEffect, useMemo, useState } from 'react';
import { X, Download, Upload } from 'lucide-react';
import { Card } from '../components/Card';
import { api } from '../lib/api';
import type { Customer } from '../lib/types';

type CustomerForm = {
  name: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
};

const emptyForm: CustomerForm = {
  name: '',
  phone: '',
  email: '',
  address: '',
  notes: ''
};

function toCsv(rows: Customer[]): string {
  const header = ['name', 'phone', 'email', 'address', 'notes'];
  const esc = (v: any) => {
    const s = String(v ?? '');
    if (/[\n\r,\"]/g.test(s)) return `"${s.replace(/\"/g, '""')}"`;
    return s;
  };
  const lines = [header.join(',')];
  for (const r of rows) {
    lines.push(
      [r.name, r.phone, r.email, r.address, r.notes].map(esc).join(',')
    );
  }
  return lines.join('\n');
}

function parseCsv(text: string): CustomerForm[] {
  // Minimal CSV parser for header + rows (comma, quotes). Good enough for portability.
  const rows: string[][] = [];
  let cur = '';
  let inQ = false;
  let row: string[] = [];

  const pushCell = () => {
    row.push(cur);
    cur = '';
  };
  const pushRow = () => {
    rows.push(row);
    row = [];
  };

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];
    if (inQ) {
      if (ch === '"' && next === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') {
        inQ = false;
      } else {
        cur += ch;
      }
    } else {
      if (ch === '"') inQ = true;
      else if (ch === ',') pushCell();
      else if (ch === '\n') {
        pushCell();
        pushRow();
      } else if (ch !== '\r') {
        cur += ch;
      }
    }
  }
  pushCell();
  pushRow();

  const [header, ...data] = rows;
  if (!header) return [];
  const idx = (name: string) => header.findIndex((h) => h.trim().toLowerCase() === name);
  const iName = idx('name');
  const iPhone = idx('phone');
  const iEmail = idx('email');
  const iAddress = idx('address');
  const iNotes = idx('notes');

  return data
    .filter((r) => r.some((c) => String(c ?? '').trim().length))
    .map((r) => ({
      name: (r[iName] ?? '').trim(),
      phone: (r[iPhone] ?? '').trim(),
      email: (r[iEmail] ?? '').trim(),
      address: (r[iAddress] ?? '').trim(),
      notes: (r[iNotes] ?? '').trim()
    }))
    .filter((r) => r.name);
}

export function CustomersPage() {
  const [rows, setRows] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [form, setForm] = useState<CustomerForm>(emptyForm);

  const query = useMemo(() => search.trim(), [search]);

  async function load() {
    setLoading(true);
    try {
      const data = await api.get<Customer[]>(
        `/api/customers${query ? `?search=${encodeURIComponent(query)}` : ''}`
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

  function openAdd() {
    setEditing(null);
    setForm(emptyForm);
    setShowModal(true);
  }

  function openEdit(c: Customer) {
    setEditing(c);
    setForm({
      name: c.name ?? '',
      phone: c.phone ?? '',
      email: c.email ?? '',
      address: c.address ?? '',
      notes: c.notes ?? ''
    });
    setShowModal(true);
  }

  function close() {
    setShowModal(false);
  }

  async function save() {
    if (!form.name.trim()) {
      alert('Customer name is required');
      return;
    }
    const payload = {
      name: form.name.trim(),
      phone: form.phone.trim() || undefined,
      email: form.email.trim() || undefined,
      address: form.address.trim() || undefined,
      notes: form.notes.trim() || undefined
    };

    if (editing) {
      await api.put(`/api/customers/${editing.id}`, payload);
    } else {
      await api.post('/api/customers', payload);
    }

    close();
    await load();
  }

  function downloadCsv() {
    const csv = toCsv(rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'elman-customers.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  async function uploadCsv(file: File) {
    const text = await file.text();
    const items = parseCsv(text);
    if (!items.length) {
      alert('No customers found in CSV');
      return;
    }
    for (const c of items) {
      await api.post('/api/customers', {
        name: c.name,
        phone: c.phone || undefined,
        email: c.email || undefined,
        address: c.address || undefined,
        notes: c.notes || undefined
      });
    }
    await load();
  }

  return (
    <div>
      <div className='mb-6 flex items-start justify-between gap-4'>
        <div>
          <div className='text-3xl font-extrabold tracking-tight'>Customers</div>
          <div className='mt-1 text-slate-500'>CRM â€” store customer information</div>
        </div>

        <div className='flex items-center gap-2'>
          <button
            type='button'
            onClick={downloadCsv}
            className='inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50'
          >
            <Download size={16} />
            Export
          </button>

          <label className='inline-flex cursor-pointer items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50'>
            <Upload size={16} />
            Import
            <input
              type='file'
              accept='.csv,text/csv'
              className='hidden'
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) uploadCsv(f);
                e.currentTarget.value = '';
              }}
            />
          </label>

          <button
            className='rounded-2xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white shadow-soft hover:bg-brand-700'
            onClick={openAdd}
            type='button'
          >
            + Add Customer
          </button>
        </div>
      </div>

      <div className='mb-4'>
        <input
          className='w-full max-w-md rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-brand-300'
          placeholder='Search name, phone, email...'
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <Card className='overflow-hidden'>
        <div className='overflow-x-auto'>
          <table className='w-full text-left text-sm'>
            <thead className='bg-white'>
              <tr className='border-b border-slate-200 text-slate-600'>
                <th className='px-5 py-4 font-medium'>Name</th>
                <th className='px-5 py-4 font-medium'>Phone</th>
                <th className='px-5 py-4 font-medium'>Email</th>
                <th className='px-5 py-4 font-medium'>Address</th>
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
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className='px-5 py-10 text-center text-slate-500'>
                    No customers yet.
                  </td>
                </tr>
              ) : (
                rows.map((c) => (
                  <tr key={c.id} className='border-b border-slate-100'>
                    <td className='px-5 py-4 font-medium text-slate-900'>{c.name}</td>
                    <td className='px-5 py-4 text-slate-600'>{c.phone ?? 'â€”'}</td>
                    <td className='px-5 py-4 text-slate-600'>{c.email ?? 'â€”'}</td>
                    <td className='px-5 py-4 text-slate-600'>{c.address ?? 'â€”'}</td>
                    <td className='px-5 py-4'>
                      <button
                        type='button'
                        onClick={() => openEdit(c)}
                        className='rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50'
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {showModal && (
        <div className='fixed inset-0 z-20 flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:items-center'>
          <div className='my-8 w-full max-w-xl rounded-2xl bg-white p-6 shadow-soft sm:p-8'>
            <div className='flex items-center justify-between'>
              <div className='text-lg font-extrabold text-slate-900'>
                {editing ? 'Edit Customer' : 'Add New Customer'}
              </div>
              <button
                type='button'
                onClick={close}
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

              <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
                <div>
                  <div className='text-sm font-semibold text-slate-700'>Phone</div>
                  <input
                    className='mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-brand-300'
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                </div>
                <div>
                  <div className='text-sm font-semibold text-slate-700'>Email</div>
                  <input
                    className='mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-brand-300'
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <div className='text-sm font-semibold text-slate-700'>Address</div>
                <input
                  className='mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-brand-300'
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                />
              </div>

              <div>
                <div className='text-sm font-semibold text-slate-700'>Notes</div>
                <textarea
                  className='mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-brand-300'
                  rows={3}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </div>

              <button
                type='button'
                onClick={save}
                className='mt-2 w-full rounded-xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white shadow-soft hover:bg-brand-700'
              >
                {editing ? 'Save Changes' : 'Add Customer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
