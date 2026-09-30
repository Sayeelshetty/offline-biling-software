export type PaymentMethod =
  | "CASH"
  | "UPI"
  | "CARD"
  | "CREDIT"
  | "OTHER";

export type PaymentStatus =
  | "PAID"
  | "PENDING"
  | "PARTIAL"
  | "CANCELLED";

export type InvoiceSyncStatus =
  | "PENDING"
  | "SYNCED"
  | "FAILED";

export type InvoiceItem = {
  id: string;
  invoiceId: string;
  productId: string;
  productName: string;
  quantity: number;
  rate: number;
  gstRate: number;
  discount: number;
  amount: number;
  createdAt: string;
};

export type Invoice = {
  id: string;
  serverId: string | null;
  transactionId: string;
  invoiceNumber: string;
  customerId: string | null;

  subtotal: number;
  discount: number;
  tax: number;
  total: number;

  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;

  createdAt: string;
  updatedAt: string;

  syncStatus: InvoiceSyncStatus;
  deviceId: string;

  items: InvoiceItem[];
};

export type BillingItemInput = {
  productId: string;
  productName: string;
  quantity: number;
  rate: number;
  gstRate: number;
  discount: number;
};

export type CreateInvoiceInput = {
  customerId?: string | null;

  items: BillingItemInput[];

  discount: number;

  paymentMethod: PaymentMethod;

  paymentStatus: PaymentStatus;

  paymentAmount: number;

  dueDate?: string | null;

  deviceId: string;
};

export type InvoiceSummary = {
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
};

export type CreateInvoiceResult = {
  invoice: Invoice;
  payment: {
    id: string;
    transactionId: string;
    invoiceId: string;
    customerId: string | null;
    amount: number;
    method: PaymentMethod;
    dueDate: string | null;
    status: PaymentStatus;
    createdAt: string;
    updatedAt: string;
    syncStatus: InvoiceSyncStatus;
    deviceId: string;
  };
};