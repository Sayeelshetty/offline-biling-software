import type {
  CreateInvoiceInput,
  CreateInvoiceResult,
  Invoice,
} from "../../../shared/types/invoice";

export type DownloadPdfResult = {
  canceled: boolean;
  filePath: string | null;
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

const invoiceService = {
  createInvoice,
  getInvoiceById,
  getInvoiceByTransactionId,
  getInvoiceByNumber,
  getRecentInvoices,
  downloadInvoicePdf,
};

export default invoiceService;