export type PaymentMethod = 'Cash' | 'Zaad' | 'Edahab';

export type Product = {
  id: string;
  name: string;
  category: string;
  sku?: string | null;
  price: number;
  unit_cost?: number;
  stock: number;
  low_stock_threshold: number;
  created_at: string;
};

export type ProfitReport = {
  period: 'daily' | 'weekly' | 'monthly';
  start: string;
  totals: {
    revenue: number;
    transactions: number;
    expenses: number;
    gross_profit: number;
    net_profit: number;
  };
  series: Array<{
    day: string;
    revenue: number;
    expenses: number;
    gross_profit: number;
    net_profit: number;
  }>;
};

export type TopProductsReport = {
  period: 'daily' | 'weekly' | 'monthly';
  start: string;
  rows: Array<{
    product_id: string;
    product_name: string;
    qty_sold: number;
    revenue: number;
    profit: number;
  }>;
};

export type CustomerInsightsReport = {
  period: 'daily' | 'weekly' | 'monthly';
  start: string;
  days: number;
  rows: Array<{
    customer: string;
    transactions: number;
    revenue: number;
    unpaid_total: number;
    last_purchase: string;
    purchase_frequency_per_day: number;
  }>;
};

export type LowStockReport = {
  total_low_stock: number;
  rows: Array<{
    id: string;
    name: string;
    category: string;
    sku: string | null;
    price: number;
    unit_cost: number;
    stock: number;
    low_stock_threshold: number;
    suggested_restock: number;
  }>;
};

export type ProductHistoryRow = {
  date: string;
  change_type: 'SALE' | 'RESTOCK' | 'ADJUSTMENT' | 'REFUND';
  qty_change: number;
  reason: string;
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
  refunded_total?: number;
  fully_refunded?: boolean;
};

export type SaleDetail = {
  id: string;
  receipt_ref: string;
  sale_date: string;
  cashier: string;
  customer: string | null;
  payment_method: PaymentMethod;
  subtotal: number;
  discount: number;
  total: number;
  unpaid: boolean;
  refunded_total: number;
  fully_refunded: boolean;
  items: Array<{
    product_id: string;
    product_name: string;
    qty: number;
    unit_price: number;
    line_total: number;
  }>;
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