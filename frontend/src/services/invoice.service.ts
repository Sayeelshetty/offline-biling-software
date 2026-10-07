import type {
  CreateInvoiceInput,
  CreateInvoiceResult,
  Invoice,
} from "../types/invoice";

export type DownloadPdfResult = {
  canceled: boolean;
  filePath: string | null;
};

export type ShareInvoiceResult = {
  success: boolean;
};

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

  downloadPdf: (
    invoiceNumber: string
  ) => Promise<DownloadPdfResult>;

 share: (
    shareText: string
  ) => Promise<ShareInvoiceResult>;
};

function getInvoiceApi(): DesktopInvoiceApi {
  const api =
    window.desktopAPI?.invoices as
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

async function downloadInvoicePdf(
  invoiceNumber: string
): Promise<DownloadPdfResult> {
  return getInvoiceApi().downloadPdf(
    invoiceNumber
  );
}

async function shareInvoice(
  shareText: string
): Promise<ShareInvoiceResult> {
  return getInvoiceApi().share(
    shareText
  );
}

const invoiceService = {
  createInvoice,
  getInvoiceById,
  getInvoiceByTransactionId,
  getInvoiceByNumber,
  getRecentInvoices,
  downloadInvoicePdf,
  downloadPdf:
    downloadInvoicePdf,
  shareInvoice,
};

export default invoiceService;