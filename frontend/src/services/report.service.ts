import type {
  ReportDateRange,
  SalesSummary,
  DailySalesReport,
  WeeklySalesReport,
  MonthlySalesReport,
  ProductWiseSalesReport,
  PaymentMethodSalesReport,
  CurrentStockReport,
  LowStockProductReport,
  StockMovementReport,
  InventorySummary,
  CustomerPurchasesReport,
  OutstandingPaymentReport,
  CustomerOutstandingSummary,
  CurrentStockReportOptions,
  StockMovementReportOptions,
  SalesReportOptions,
} from "../../../shared/types/report";

type ReportsApi = NonNullable<Window["desktopAPI"]["reports"]>;

function getReportsApi(): ReportsApi {
  const api = window.desktopAPI?.reports;

  if (!api) {
    throw new Error("Reports API is not available");
  }

  return api;
}

export async function getSalesSummary(
  options: ReportDateRange = {}
): Promise<SalesSummary> {
  return getReportsApi().getSalesSummary(options);
}

export async function getDailySales(
  options: SalesReportOptions = {}
): Promise<DailySalesReport[]> {
  return getReportsApi().getDailySales(options);
}

export async function getWeeklySales(
  options: SalesReportOptions = {}
): Promise<WeeklySalesReport[]> {
  return getReportsApi().getWeeklySales(options);
}

export async function getMonthlySales(
  options: SalesReportOptions = {}
): Promise<MonthlySalesReport[]> {
  return getReportsApi().getMonthlySales(options);
}

export async function getProductWiseSales(
  options: SalesReportOptions = {}
): Promise<ProductWiseSalesReport[]> {
  return getReportsApi().getProductWiseSales(options);
}

export async function getPaymentMethodSales(
  options: SalesReportOptions = {}
): Promise<PaymentMethodSalesReport[]> {
  return getReportsApi().getPaymentMethodSales(options);
}

export async function getCurrentStock(
  options: CurrentStockReportOptions = {}
): Promise<CurrentStockReport[]> {
  return getReportsApi().getCurrentStock(options);
}

export async function getLowStock(): Promise<LowStockProductReport[]> {
  return getReportsApi().getLowStock();
}

export async function getStockMovements(
  options: StockMovementReportOptions = {}
): Promise<StockMovementReport[]> {
  return getReportsApi().getStockMovements(options);
}

export async function getInventorySummary(): Promise<InventorySummary> {
  return getReportsApi().getInventorySummary();
}

export async function getCustomerPurchases(
  options: SalesReportOptions = {}
): Promise<CustomerPurchasesReport[]> {
  return getReportsApi().getCustomerPurchases(options);
}

export async function getOutstandingPayments(): Promise<
  OutstandingPaymentReport[]
> {
  return getReportsApi().getOutstandingPayments();
}

export async function getCustomerOutstandingSummary(): Promise<
  CustomerOutstandingSummary[]
> {
  return getReportsApi().getCustomerOutstandingSummary();
}