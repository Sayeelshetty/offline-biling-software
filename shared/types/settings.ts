export type BusinessSettings = {
  businessName: string;
  address: string;
  phone: string;
  gstNumber: string;
  logoPath: string | null;
};

export type InvoiceSettings = {
  invoicePrefix: string;
  startingNumber: number;
  thermalPaperWidth: 58 | 80;
  printFormat: "THERMAL" | "A4";
};

export type BillingSettings = {
  taxEnabled: boolean;
  defaultGstRate: number;
  discountEnabled: boolean;
  paymentMethods: Array<
    "CASH" | "UPI" | "CARD" | "CREDIT" | "OTHER"
  >;
};

export type PrinterSettings = {
  printerType: "THERMAL" | "A4";
  printerName: string;
  paperWidth: 58 | 80;
};

export type SettingsData = {
  business: BusinessSettings;
  invoice: InvoiceSettings;
  billing: BillingSettings;
  printer: PrinterSettings;
};

export type SettingsResponse = {
  success: boolean;
  data?: SettingsData;
  error?: string;
};

export type UpdateSettingsResponse = SettingsResponse;

export type BackupResponse = {
  success: boolean;
  canceled?: boolean;
  filePath?: string;
  error?: string;
};

export type RestoreResponse = {
  success: boolean;
  canceled?: boolean;
  filePath?: string;
  error?: string;
};