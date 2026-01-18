import mongoose from 'mongoose';
import { Customer } from './models.js';

export async function listCustomers(search?: string) {
  const q = (search ?? '').trim();
  if (!q) {
    const rows = await Customer.find({}).sort({ created_at: -1 }).limit(200).lean();
    return rows.map((c: any) => ({ ...c, id: String(c._id) }));
  }

  const re = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  const rows = await Customer.find({ $or: [{ name: re }, { phone: re }, { email: re }] })
    .sort({ created_at: -1 })
    .limit(200)
    .lean();

  return rows.map((c: any) => ({ ...c, id: String(c._id) }));
}

export async function createCustomer(input: any) {
  const doc = await Customer.create({
    name: input.name,
    phone: input.phone,
    email: input.email,
    address: input.address,
    notes: input.notes
  });
  return String(doc._id);
}

export async function updateCustomer(id: string, patch: any) {
  const _id = new mongoose.Types.ObjectId(id);
  await Customer.updateOne({ _id }, { $set: patch });
}