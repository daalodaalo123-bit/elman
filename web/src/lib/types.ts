export type PaymentMethod = 'Cash' | 'Zaad' | 'Edahab';

export type Product = {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  low_stock_threshold: number;
  created_at: string;
};

export type Customer = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  created_at: string;
};

export type InventoryReport = {
  totals: {
    total_products: number;
    low_stock_items: number;
    total_inventory_value: number;
  };
  history: Array<{
    date: string;
    product: string;
    change: number;
    reason: string;
  }>;
};

export type SalesHistoryRow = {
  receipt_ref: string;
  date: string;
  cashier: string;
  customer: string | null;
  payment: PaymentMethod;
  total: number;
  unpaid: 0 | 1;
};

export type ExpenseCategory = 'Inventory Purchase' | 'Vendor Bill' | 'Electricity' | 'Rent' | 'Other';

export type ExpenseListRow = {
  id: string;
  expense_date: string;
  category: ExpenseCategory;
  vendor: string | null;
  notes: string | null;
  total_amount: number;
  items_count: number;
};

export type ExpenseItem = {
  id?: string;
  item_name: string;
  quantity: number;
  unit_price: number;
  line_total?: number;
};

export type ExpenseDetail = {
  id: string;
  expense_date: string;
  category: ExpenseCategory;
  vendor: string | null;
  notes: string | null;
  total_amount: number;
  created_at: string;
  items: Array<{
    id: string;
    item_name: string;
    quantity: number;
    unit_price: number;
    line_total: number;
  }>;
};