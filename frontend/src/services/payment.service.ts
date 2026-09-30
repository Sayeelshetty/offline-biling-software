import type {
  Payment,
  PaymentWithDetails,
  PaymentSearchOptions,
  OutstandingPayment,
  PaymentSummary,
  RecordPaymentInput,
} from "../../../shared/types/payment";

type RecordPaymentResult = {
  payment: PaymentWithDetails | null;

  invoice: {
    id: string;
    invoiceTotal: number;
    previousPaidAmount: number;
    paidAmount: number;
    outstandingAmount: number;
    paymentStatus: "PAID" | "PARTIAL";
  };
};

type DesktopPaymentApi = {
  getById: (
    paymentId: string
  ) => Promise<PaymentWithDetails | null>;

  getAll: (
    options?: PaymentSearchOptions
  ) => Promise<Payment[]>;

  getOutstanding: () =>
    Promise<OutstandingPayment[]>;

  getSummary: () =>
    Promise<PaymentSummary>;

  record: (
    input: RecordPaymentInput
  ) => Promise<RecordPaymentResult>;
};

function getPaymentApi(): DesktopPaymentApi {
  const api = window.desktopAPI?.payments as
    | DesktopPaymentApi
    | undefined;

  if (!api) {
    throw new Error(
      "Payment API is not available."
    );
  }

  return api;
}

async function getPaymentById(
  paymentId: string
): Promise<PaymentWithDetails | null> {
  return getPaymentApi().getById(paymentId);
}

async function getPayments(
  options: PaymentSearchOptions = {}
): Promise<Payment[]> {
  return getPaymentApi().getAll(options);
}

async function getOutstandingPayments(): Promise<
  OutstandingPayment[]
> {
  return getPaymentApi().getOutstanding();
}

async function getPaymentSummary(): Promise<PaymentSummary> {
  return getPaymentApi().getSummary();
}

async function recordPayment(
  input: RecordPaymentInput
): Promise<RecordPaymentResult> {
  return getPaymentApi().record(input);
}

const paymentService = {
  getPaymentById,
  getPayments,
  getOutstandingPayments,
  getPaymentSummary,
  recordPayment,
};

export default paymentService;