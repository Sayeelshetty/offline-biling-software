import type {
  PaymentMethod,
  PaymentStatus,
} from "./invoice";

export type PaymentSyncStatus =
  | "PENDING"
  | "SYNCED"
  | "FAILED";

export type Payment = {
  id: string;
  serverId: string | null;

  transactionId: string;

  invoiceId: string;
  customerId: string | null;

  amount: number;

  method: PaymentMethod;

  dueDate: string | null;

  status: PaymentStatus;

  createdAt: string;
  updatedAt: string;

  syncStatus: PaymentSyncStatus;

  deviceId: string;
};

export type PaymentWithDetails = Payment & {
  invoiceNumber: string;
  customerName: string | null;
};

export type RecordPaymentInput = {
  invoiceId: string;
  customerId: string;

  amount: number;

  method: PaymentMethod;

  dueDate?: string | null;

  deviceId: string;
};

export type PaymentSearchOptions = {
  status?: PaymentStatus;
  customerId?: string;
  invoiceId?: string;
};

export type OutstandingPayment = {
  invoiceId: string;
  invoiceNumber: string;

  customerId: string;
  customerName: string;

  invoiceTotal: number;
  paidAmount: number;
  outstandingAmount: number;

  dueDate: string | null;

  paymentStatus: PaymentStatus;

  createdAt: string;
};

export type PaymentSummary = {
  totalPayments: number;
  totalPaid: number;
  totalOutstanding: number;
};