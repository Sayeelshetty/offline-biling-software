export type ReportDateRange = {
  from?: string | null;
  to?: string | null;
};

export type SalesSummary = {
  totalBills: number;
  totalSales: number;
  totalDiscount: number;
  totalTax: number;
};

export type DailySalesReport = {
  date: string;
  billCount: number;
  totalSales: number;
  totalDiscount: number;
  totalTax: number;
};

export type WeeklySalesReport = {
  week: string;
  billCount: number;
  totalSales: number;
};

export type MonthlySalesReport = {
  month: string;
  billCount: number;
  totalSales: number;
};

export type ProductWiseSalesReport = {
  productId: string;
  productName: string;
  billCount: number;
  quantitySold: number;
  salesAmount: number;
};

export type PaymentMethodSalesReport = {
  paymentMethod: string;
  billCount: number;
  totalSales: number;
};

export type CurrentStockReport = {
  productId: string;
  productName: string;
  sku: string;
  currentStock: number;
  minimumStock: number;
  purchasePrice: number;
  sellingPrice: number;
  unit: string;
  status: "ACTIVE" | "INACTIVE";
  stockValue: number;
  sellingValue: number;
  isLowStock: boolean;
};

export type LowStockProductReport = {
  productId: string;
  productName: string;
  sku: string;
  currentStock: number;
  minimumStock: number;
  unit: string;
  purchasePrice: number;
  sellingPrice: number;
  shortageQuantity: number;
};

export type StockMovementReport = {
  id: string;
  transactionId: string;
  productId: string;
  productName: string;
  sku: string;
  type:
    | "STOCK_IN"
    | "STOCK_OUT"
    | "ADJUSTMENT";
  quantity: number;
  referenceType: string | null;
  referenceId: string | null;
  createdAt: string;
  updatedAt: string;
  syncStatus: string;
  deviceId: string;
};

export type InventorySummary = {
  totalProducts: number;
  activeProducts: number;
  lowStockProducts: number;
  stockValue: number;
};

export type CustomerPurchasesReport = {
  customerId: string;
  customerName: string;
  mobile: string;
  billCount: number;
  totalPurchases: number;
  lastPurchaseAt: string | null;
};

export type OutstandingPaymentReport = {
  invoiceId: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  mobile: string;
  invoiceTotal: number;
  paidAmount: number;
  outstandingAmount: number;
  dueDate: string | null;
  createdAt: string;
  paymentStatus: "PENDING" | "PARTIAL";
};

export type CustomerOutstandingSummary = {
  customerId: string;
  customerName: string;
  mobile: string;
  outstandingAmount: number;
};

export type CurrentStockReportOptions = {
  includeInactive?: boolean;
};

export type StockMovementReportOptions =
  ReportDateRange & {
    limit?: number;
  };

export type SalesReportOptions = ReportDateRange;

export type ReportResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
};