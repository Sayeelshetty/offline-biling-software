import type {
  CreateInvoiceInput,
  CreateInvoiceResult,
  Invoice,
} from "../types/invoice";

type DesktopInvoiceApi = {
  create: (
    input: CreateInvoiceInput
  ) => Promise<CreateInvoiceResult>;

  getById: (
    invoiceId: string
  ) => Promise<Invoice | null>;

  getByTransactionId: (
    transactionId: string
  ) => Promise<Invoice | null>;

  getByNumber: (
    invoiceNumber: string
  ) => Promise<Invoice | null>;

  getRecent: (
    limit?: number
  ) => Promise<Invoice[]>;
};

function getInvoiceApi(): DesktopInvoiceApi {
  const api = window.desktopAPI?.invoices as
    | DesktopInvoiceApi
    | undefined;

  if (!api) {
    throw new Error(
      "Invoice API is not available."
    );
  }

  return api;
}

async function createInvoice(
  input: CreateInvoiceInput
): Promise<CreateInvoiceResult> {
  return getInvoiceApi().create(input);
}

async function getInvoiceById(
  invoiceId: string
): Promise<Invoice | null> {
  return getInvoiceApi().getById(invoiceId);
}

async function getInvoiceByTransactionId(
  transactionId: string
): Promise<Invoice | null> {
  return getInvoiceApi().getByTransactionId(
    transactionId
  );
}

async function getInvoiceByNumber(
  invoiceNumber: string
): Promise<Invoice | null> {
  return getInvoiceApi().getByNumber(
    invoiceNumber
  );
}

async function getRecentInvoices(
  limit = 50
): Promise<Invoice[]> {
  return getInvoiceApi().getRecent(limit);
}

const invoiceService = {
  createInvoice,
  getInvoiceById,
  getInvoiceByTransactionId,
  getInvoiceByNumber,
  getRecentInvoices,
};

export default invoiceService;