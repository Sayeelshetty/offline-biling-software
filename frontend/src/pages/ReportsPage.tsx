import { useEffect, useMemo, useState } from "react";
import {
  getSalesSummary,
  getDailySales,
  getWeeklySales,
  getMonthlySales,
  getProductWiseSales,
  getPaymentMethodSales,
  getCurrentStock,
  getLowStock,
  getStockMovements,
  getInventorySummary,
  getCustomerPurchases,
  getOutstandingPayments,
} from "../services/report.service";

import type {
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
} from "../../../shared/types/report";

import "./ReportsPage.css";

type MainTab = "SALES" | "INVENTORY" | "CUSTOMERS";

type SalesReportTab =
  | "DAILY"
  | "WEEKLY"
  | "MONTHLY"
  | "PRODUCT"
  | "PAYMENT_METHOD";

type InventoryReportTab =
  | "CURRENT_STOCK"
  | "LOW_STOCK"
  | "STOCK_MOVEMENTS";

type CustomerReportTab =
  | "PURCHASES"
  | "OUTSTANDING";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value || 0);
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 2,
  }).format(value || 0);
}

function formatDate(value: string | null | undefined): string {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getToday(): string {
  return new Date().toISOString().slice(0, 10);
}

function getFirstDayOfMonth(): string {
  const date = new Date();

  return new Date(date.getFullYear(), date.getMonth(), 1)
    .toISOString()
    .slice(0, 10);
}

export default function ReportsPage() {
  const [mainTab, setMainTab] = useState<MainTab>("SALES");

  const [salesTab, setSalesTab] =
    useState<SalesReportTab>("DAILY");

  const [inventoryTab, setInventoryTab] =
    useState<InventoryReportTab>("CURRENT_STOCK");

  const [customerTab, setCustomerTab] =
    useState<CustomerReportTab>("PURCHASES");

  const [fromDate, setFromDate] =
    useState<string>(getFirstDayOfMonth());

  const [toDate, setToDate] =
    useState<string>(getToday());

  const [includeInactive, setIncludeInactive] =
    useState<boolean>(false);

  const [salesSummary, setSalesSummary] =
    useState<SalesSummary | null>(null);

  const [dailySales, setDailySales] =
    useState<DailySalesReport[]>([]);

  const [weeklySales, setWeeklySales] =
    useState<WeeklySalesReport[]>([]);

  const [monthlySales, setMonthlySales] =
    useState<MonthlySalesReport[]>([]);

  const [productSales, setProductSales] =
    useState<ProductWiseSalesReport[]>([]);

  const [paymentMethodSales, setPaymentMethodSales] =
    useState<PaymentMethodSalesReport[]>([]);

  const [currentStock, setCurrentStock] =
    useState<CurrentStockReport[]>([]);

  const [lowStock, setLowStock] =
    useState<LowStockProductReport[]>([]);

  const [stockMovements, setStockMovements] =
    useState<StockMovementReport[]>([]);

  const [inventorySummary, setInventorySummary] =
    useState<InventorySummary | null>(null);

  const [customerPurchases, setCustomerPurchases] =
    useState<CustomerPurchasesReport[]>([]);

  const [outstandingPayments, setOutstandingPayments] =
    useState<OutstandingPaymentReport[]>([]);

  const [loading, setLoading] =
    useState<boolean>(false);

  const [error, setError] =
    useState<string>("");

  const dateOptions = useMemo(
    () => ({
      from: fromDate || null,
      to: toDate || null,
    }),
    [fromDate, toDate]
  );

  async function loadReports() {
    setLoading(true);
    setError("");

    try {
      if (mainTab === "SALES") {
        const summary = await getSalesSummary(dateOptions);

        setSalesSummary(summary);

        if (salesTab === "DAILY") {
          setDailySales(await getDailySales(dateOptions));
        }

        if (salesTab === "WEEKLY") {
          setWeeklySales(await getWeeklySales(dateOptions));
        }

        if (salesTab === "MONTHLY") {
          setMonthlySales(await getMonthlySales(dateOptions));
        }

        if (salesTab === "PRODUCT") {
          setProductSales(await getProductWiseSales(dateOptions));
        }

        if (salesTab === "PAYMENT_METHOD") {
          setPaymentMethodSales(
            await getPaymentMethodSales(dateOptions)
          );
        }
      }

      if (mainTab === "INVENTORY") {
        const summary = await getInventorySummary();

        setInventorySummary(summary);

        if (inventoryTab === "CURRENT_STOCK") {
          setCurrentStock(
            await getCurrentStock({
              includeInactive,
            })
          );
        }

        if (inventoryTab === "LOW_STOCK") {
          setLowStock(await getLowStock());
        }

        if (inventoryTab === "STOCK_MOVEMENTS") {
          setStockMovements(
            await getStockMovements({
              ...dateOptions,
              limit: 200,
            })
          );
        }
      }

      if (mainTab === "CUSTOMERS") {
        if (customerTab === "PURCHASES") {
          setCustomerPurchases(
            await getCustomerPurchases(dateOptions)
          );
        }

        if (customerTab === "OUTSTANDING") {
          setOutstandingPayments(
            await getOutstandingPayments()
          );
        }
      }
    } catch (err) {
      console.error("Failed to load reports:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to load reports"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReports();
  }, [
    mainTab,
    salesTab,
    inventoryTab,
    customerTab,
    fromDate,
    toDate,
    includeInactive,
  ]);

  function resetDates() {
    setFromDate(getFirstDayOfMonth());
    setToDate(getToday());
  }

  return (
    <section className="reports-page">
      <div className="reports-header">
        <div>
          <p className="reports-eyebrow">
            BUSINESS INSIGHTS
          </p>

          <h1>Reports</h1>

          <p className="reports-description">
            Review sales, inventory and customer activity
            using your offline local data.
          </p>
        </div>

        <button
          type="button"
          className="reports-refresh-button"
          onClick={loadReports}
          disabled={loading}
        >
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      <div className="reports-filter-card">
        <div className="reports-filter-group">
          <label htmlFor="reports-from-date">
            From
          </label>

          <input
            id="reports-from-date"
            type="date"
            value={fromDate}
            onChange={(event) =>
              setFromDate(event.target.value)
            }
          />
        </div>

        <div className="reports-filter-group">
          <label htmlFor="reports-to-date">
            To
          </label>

          <input
            id="reports-to-date"
            type="date"
            value={toDate}
            onChange={(event) =>
              setToDate(event.target.value)
            }
          />
        </div>

        {mainTab === "INVENTORY" &&
          inventoryTab === "CURRENT_STOCK" && (
            <label className="reports-checkbox">
              <input
                type="checkbox"
                checked={includeInactive}
                onChange={(event) =>
                  setIncludeInactive(event.target.checked)
                }
              />

              <span>Include inactive products</span>
            </label>
          )}

        <button
          type="button"
          className="reports-reset-button"
          onClick={resetDates}
        >
          Reset dates
        </button>
      </div>

      {error && (
        <div className="reports-error">
          <strong>Unable to load report</strong>
          <span>{error}</span>
        </div>
      )}

      <div className="reports-main-tabs">
        <button
          type="button"
          className={
            mainTab === "SALES"
              ? "report-main-tab active"
              : "report-main-tab"
          }
          onClick={() => setMainTab("SALES")}
        >
          Sales
        </button>

        <button
          type="button"
          className={
            mainTab === "INVENTORY"
              ? "report-main-tab active"
              : "report-main-tab"
          }
          onClick={() => setMainTab("INVENTORY")}
        >
          Inventory
        </button>

        <button
          type="button"
          className={
            mainTab === "CUSTOMERS"
              ? "report-main-tab active"
              : "report-main-tab"
          }
          onClick={() => setMainTab("CUSTOMERS")}
        >
          Customers
        </button>
      </div>

      {mainTab === "SALES" && (
        <>
          <div className="reports-summary-grid">
            <div className="report-summary-card">
              <span>Total Bills</span>
              <strong>
                {formatNumber(
                  salesSummary?.totalBills ?? 0
                )}
              </strong>
            </div>

            <div className="report-summary-card">
              <span>Total Sales</span>
              <strong>
                {formatCurrency(
                  salesSummary?.totalSales ?? 0
                )}
              </strong>
            </div>

            <div className="report-summary-card">
              <span>Total Discount</span>
              <strong>
                {formatCurrency(
                  salesSummary?.totalDiscount ?? 0
                )}
              </strong>
            </div>

            <div className="report-summary-card">
              <span>Total Tax</span>
              <strong>
                {formatCurrency(
                  salesSummary?.totalTax ?? 0
                )}
              </strong>
            </div>
          </div>

          <div className="reports-subtabs">
            <button
              type="button"
              className={
                salesTab === "DAILY"
                  ? "report-subtab active"
                  : "report-subtab"
              }
              onClick={() => setSalesTab("DAILY")}
            >
              Daily
            </button>

            <button
              type="button"
              className={
                salesTab === "WEEKLY"
                  ? "report-subtab active"
                  : "report-subtab"
              }
              onClick={() => setSalesTab("WEEKLY")}
            >
              Weekly
            </button>

            <button
              type="button"
              className={
                salesTab === "MONTHLY"
                  ? "report-subtab active"
                  : "report-subtab"
              }
              onClick={() => setSalesTab("MONTHLY")}
            >
              Monthly
            </button>

            <button
              type="button"
              className={
                salesTab === "PRODUCT"
                  ? "report-subtab active"
                  : "report-subtab"
              }
              onClick={() => setSalesTab("PRODUCT")}
            >
              Product-wise
            </button>

            <button
              type="button"
              className={
                salesTab === "PAYMENT_METHOD"
                  ? "report-subtab active"
                  : "report-subtab"
              }
              onClick={() =>
                setSalesTab("PAYMENT_METHOD")
              }
            >
              Payment Method
            </button>
          </div>

          <div className="reports-table-card">
            {salesTab === "DAILY" && (
              <>
                <div className="reports-table-header">
                  <div>
                    <h2>Daily Sales</h2>
                    <p>
                      Sales grouped by business day.
                    </p>
                  </div>
                </div>

                <div className="reports-table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Bills</th>
                        <th>Sales</th>
                        <th>Discount</th>
                        <th>Tax</th>
                      </tr>
                    </thead>

                    <tbody>
                      {dailySales.length === 0 ? (
                        <tr>
                          <td
                            colSpan={5}
                            className="reports-empty"
                          >
                            No sales found for the selected
                            period.
                          </td>
                        </tr>
                      ) : (
                        dailySales.map((row) => (
                          <tr key={row.date}>
                            <td>
                              {formatDate(row.date)}
                            </td>
                            <td>{row.billCount}</td>
                            <td>
                              {formatCurrency(
                                row.totalSales
                              )}
                            </td>
                            <td>
                              {formatCurrency(
                                row.totalDiscount
                              )}
                            </td>
                            <td>
                              {formatCurrency(
                                row.totalTax
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {salesTab === "WEEKLY" && (
              <>
                <div className="reports-table-header">
                  <div>
                    <h2>Weekly Sales</h2>
                    <p>
                      Sales grouped by calendar week.
                    </p>
                  </div>
                </div>

                <div className="reports-table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>Week</th>
                        <th>Bills</th>
                        <th>Total Sales</th>
                      </tr>
                    </thead>

                    <tbody>
                      {weeklySales.length === 0 ? (
                        <tr>
                          <td
                            colSpan={3}
                            className="reports-empty"
                          >
                            No weekly sales found.
                          </td>
                        </tr>
                      ) : (
                        weeklySales.map((row) => (
                          <tr key={row.week}>
                            <td>{row.week}</td>
                            <td>{row.billCount}</td>
                            <td>
                              {formatCurrency(
                                row.totalSales
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {salesTab === "MONTHLY" && (
              <>
                <div className="reports-table-header">
                  <div>
                    <h2>Monthly Sales</h2>
                    <p>
                      Sales grouped by month.
                    </p>
                  </div>
                </div>

                <div className="reports-table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>Month</th>
                        <th>Bills</th>
                        <th>Total Sales</th>
                      </tr>
                    </thead>

                    <tbody>
                      {monthlySales.length === 0 ? (
                        <tr>
                          <td
                            colSpan={3}
                            className="reports-empty"
                          >
                            No monthly sales found.
                          </td>
                        </tr>
                      ) : (
                        monthlySales.map((row) => (
                          <tr key={row.month}>
                            <td>{row.month}</td>
                            <td>{row.billCount}</td>
                            <td>
                              {formatCurrency(
                                row.totalSales
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {salesTab === "PRODUCT" && (
              <>
                <div className="reports-table-header">
                  <div>
                    <h2>Product-wise Sales</h2>
                    <p>
                      Products contributing to sales in the
                      selected period.
                    </p>
                  </div>
                </div>

                <div className="reports-table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>Bills</th>
                        <th>Quantity Sold</th>
                        <th>Sales Amount</th>
                      </tr>
                    </thead>

                    <tbody>
                      {productSales.length === 0 ? (
                        <tr>
                          <td
                            colSpan={4}
                            className="reports-empty"
                          >
                            No product sales found.
                          </td>
                        </tr>
                      ) : (
                        productSales.map((row) => (
                          <tr key={row.productId}>
                            <td>
                              <div className="reports-product-name">
                                <strong>
                                  {row.productName}
                                </strong>

                                <span>
                                  {row.productId}
                                </span>
                              </div>
                            </td>

                            <td>{row.billCount}</td>

                            <td>
                              {formatNumber(
                                row.quantitySold
                              )}
                            </td>

                            <td>
                              {formatCurrency(
                                row.salesAmount
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {salesTab === "PAYMENT_METHOD" && (
              <>
                <div className="reports-table-header">
                  <div>
                    <h2>Payment Method Sales</h2>
                    <p>
                      Sales grouped by payment method.
                    </p>
                  </div>
                </div>

                <div className="reports-table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>Payment Method</th>
                        <th>Bills</th>
                        <th>Total Sales</th>
                      </tr>
                    </thead>

                    <tbody>
                      {paymentMethodSales.length === 0 ? (
                        <tr>
                          <td
                            colSpan={3}
                            className="reports-empty"
                          >
                            No payment data found.
                          </td>
                        </tr>
                      ) : (
                        paymentMethodSales.map((row) => (
                          <tr key={row.paymentMethod}>
                            <td>
                              <span className="reports-method-badge">
                                {row.paymentMethod}
                              </span>
                            </td>

                            <td>{row.billCount}</td>

                            <td>
                              {formatCurrency(
                                row.totalSales
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </>
      )}

      {mainTab === "INVENTORY" && (
        <>
          <div className="reports-summary-grid">
            <div className="report-summary-card">
              <span>Total Products</span>
              <strong>
                {formatNumber(
                  inventorySummary?.totalProducts ?? 0
                )}
              </strong>
            </div>

            <div className="report-summary-card">
              <span>Active Products</span>
              <strong>
                {formatNumber(
                  inventorySummary?.activeProducts ?? 0
                )}
              </strong>
            </div>

            <div className="report-summary-card report-warning-card">
              <span>Low Stock</span>
              <strong>
                {formatNumber(
                  inventorySummary?.lowStockProducts ?? 0
                )}
              </strong>
            </div>

            <div className="report-summary-card">
              <span>Stock Value</span>
              <strong>
                {formatCurrency(
                  inventorySummary?.stockValue ?? 0
                )}
              </strong>
            </div>
          </div>

          <div className="reports-subtabs">
            <button
              type="button"
              className={
                inventoryTab === "CURRENT_STOCK"
                  ? "report-subtab active"
                  : "report-subtab"
              }
              onClick={() =>
                setInventoryTab("CURRENT_STOCK")
              }
            >
              Current Stock
            </button>

            <button
              type="button"
              className={
                inventoryTab === "LOW_STOCK"
                  ? "report-subtab active"
                  : "report-subtab"
              }
              onClick={() =>
                setInventoryTab("LOW_STOCK")
              }
            >
              Low Stock
            </button>

            <button
              type="button"
              className={
                inventoryTab === "STOCK_MOVEMENTS"
                  ? "report-subtab active"
                  : "report-subtab"
              }
              onClick={() =>
                setInventoryTab("STOCK_MOVEMENTS")
              }
            >
              Stock Movement
            </button>
          </div>

          <div className="reports-table-card">
            {inventoryTab === "CURRENT_STOCK" && (
              <>
                <div className="reports-table-header">
                  <div>
                    <h2>Current Stock</h2>
                    <p>
                      Current inventory position and
                      valuation.
                    </p>
                  </div>
                </div>

                <div className="reports-table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>SKU</th>
                        <th>Stock</th>
                        <th>Min Stock</th>
                        <th>Purchase Value</th>
                        <th>Selling Value</th>
                        <th>Status</th>
                      </tr>
                    </thead>

                    <tbody>
                      {currentStock.length === 0 ? (
                        <tr>
                          <td
                            colSpan={7}
                            className="reports-empty"
                          >
                            No inventory records found.
                          </td>
                        </tr>
                      ) : (
                        currentStock.map((row) => (
                          <tr key={row.productId}>
                            <td>
                              <div className="reports-product-name">
                                <strong>
                                  {row.productName}
                                </strong>

                                <span>
                                  {row.unit}
                                </span>
                              </div>
                            </td>

                            <td>{row.sku || "-"}</td>

                            <td>
                              {formatNumber(
                                row.currentStock
                              )}
                            </td>

                            <td>
                              {formatNumber(
                                row.minimumStock
                              )}
                            </td>

                            <td>
                              {formatCurrency(
                                row.stockValue
                              )}
                            </td>

                            <td>
                              {formatCurrency(
                                row.sellingValue
                              )}
                            </td>

                            <td>
                              {row.status === "ACTIVE" ? (
                                row.isLowStock ? (
                                  <span className="reports-status warning">
                                    Low Stock
                                  </span>
                                ) : (
                                  <span className="reports-status success">
                                    Healthy
                                  </span>
                                )
                              ) : (
                                <span className="reports-status neutral">
                                  Inactive
                                </span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {inventoryTab === "LOW_STOCK" && (
              <>
                <div className="reports-table-header">
                  <div>
                    <h2>Low Stock Products</h2>
                    <p>
                      Products at or below their minimum
                      stock level.
                    </p>
                  </div>
                </div>

                <div className="reports-table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>SKU</th>
                        <th>Current Stock</th>
                        <th>Minimum Stock</th>
                        <th>Shortage</th>
                        <th>Unit</th>
                      </tr>
                    </thead>

                    <tbody>
                      {lowStock.length === 0 ? (
                        <tr>
                          <td
                            colSpan={6}
                            className="reports-empty"
                          >
                            No low-stock products found.
                          </td>
                        </tr>
                      ) : (
                        lowStock.map((row) => (
                          <tr key={row.productId}>
                            <td>
                              <strong>
                                {row.productName}
                              </strong>
                            </td>

                            <td>{row.sku || "-"}</td>

                            <td>
                              {formatNumber(
                                row.currentStock
                              )}
                            </td>

                            <td>
                              {formatNumber(
                                row.minimumStock
                              )}
                            </td>

                            <td>
                              <span className="reports-shortage">
                                {formatNumber(
                                  row.shortageQuantity
                                )}
                              </span>
                            </td>

                            <td>{row.unit}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {inventoryTab === "STOCK_MOVEMENTS" && (
              <>
                <div className="reports-table-header">
                  <div>
                    <h2>Stock Movement</h2>
                    <p>
                      Inventory changes during the selected
                      period.
                    </p>
                  </div>
                </div>

                <div className="reports-table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Product</th>
                        <th>SKU</th>
                        <th>Type</th>
                        <th>Quantity</th>
                        <th>Reference</th>
                        <th>Sync</th>
                      </tr>
                    </thead>

                    <tbody>
                      {stockMovements.length === 0 ? (
                        <tr>
                          <td
                            colSpan={7}
                            className="reports-empty"
                          >
                            No stock movements found.
                          </td>
                        </tr>
                      ) : (
                        stockMovements.map((row) => (
                          <tr key={row.id}>
                            <td>
                              {formatDate(
                                row.createdAt
                              )}
                            </td>

                            <td>
                              <strong>
                                {row.productName}
                              </strong>
                            </td>

                            <td>{row.sku || "-"}</td>

                            <td>
                              <span className="reports-movement-badge">
                                {row.type.replace(
                                  "_",
                                  " "
                                )}
                              </span>
                            </td>

                            <td>
                              {formatNumber(row.quantity)}
                            </td>

                            <td>
                              {row.referenceType ||
                              row.referenceId
                                ? `${row.referenceType ?? ""}${
                                    row.referenceId
                                      ? ` / ${row.referenceId}`
                                      : ""
                                  }`
                                : "-"}
                            </td>

                            <td>
                              <span
                                className={
                                  row.syncStatus === "SYNCED"
                                    ? "reports-status success"
                                    : row.syncStatus ===
                                        "FAILED"
                                      ? "reports-status danger"
                                      : "reports-status warning"
                                }
                              >
                                {row.syncStatus}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </>
      )}

      {mainTab === "CUSTOMERS" && (
        <>
          <div className="reports-subtabs">
            <button
              type="button"
              className={
                customerTab === "PURCHASES"
                  ? "report-subtab active"
                  : "report-subtab"
              }
              onClick={() =>
                setCustomerTab("PURCHASES")
              }
            >
              Customer Purchases
            </button>

            <button
              type="button"
              className={
                customerTab === "OUTSTANDING"
                  ? "report-subtab active"
                  : "report-subtab"
              }
              onClick={() =>
                setCustomerTab("OUTSTANDING")
              }
            >
              Outstanding Payments
            </button>
          </div>

          <div className="reports-table-card">
            {customerTab === "PURCHASES" && (
              <>
                <div className="reports-table-header">
                  <div>
                    <h2>Customer Purchases</h2>
                    <p>
                      Customer purchase activity for the
                      selected period.
                    </p>
                  </div>
                </div>

                <div className="reports-table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>Customer</th>
                        <th>Mobile</th>
                        <th>Bills</th>
                        <th>Total Purchases</th>
                        <th>Last Purchase</th>
                      </tr>
                    </thead>

                    <tbody>
                      {customerPurchases.length === 0 ? (
                        <tr>
                          <td
                            colSpan={5}
                            className="reports-empty"
                          >
                            No customer purchases found.
                          </td>
                        </tr>
                      ) : (
                        customerPurchases.map((row) => (
                          <tr key={row.customerId}>
                            <td>
                              <div className="reports-product-name">
                                <strong>
                                  {row.customerName}
                                </strong>

                                <span>
                                  {row.customerId}
                                </span>
                              </div>
                            </td>

                            <td>{row.mobile || "-"}</td>

                            <td>{row.billCount}</td>

                            <td>
                              {formatCurrency(
                                row.totalPurchases
                              )}
                            </td>

                            <td>
                              {formatDate(
                                row.lastPurchaseAt
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {customerTab === "OUTSTANDING" && (
              <>
                <div className="reports-table-header">
                  <div>
                    <h2>Outstanding Payments</h2>
                    <p>
                      Credit invoices with pending or partial
                      payment.
                    </p>
                  </div>
                </div>

                <div className="reports-table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>Invoice</th>
                        <th>Customer</th>
                        <th>Mobile</th>
                        <th>Invoice Total</th>
                        <th>Paid</th>
                        <th>Outstanding</th>
                        <th>Due Date</th>
                        <th>Status</th>
                      </tr>
                    </thead>

                    <tbody>
                      {outstandingPayments.length === 0 ? (
                        <tr>
                          <td
                            colSpan={8}
                            className="reports-empty"
                          >
                            No outstanding payments found.
                          </td>
                        </tr>
                      ) : (
                        outstandingPayments.map((row) => (
                          <tr key={row.invoiceId}>
                            <td>
                              <strong>
                                {row.invoiceNumber}
                              </strong>
                            </td>

                            <td>
                              {row.customerName}
                            </td>

                            <td>{row.mobile || "-"}</td>

                            <td>
                              {formatCurrency(
                                row.invoiceTotal
                              )}
                            </td>

                            <td>
                              {formatCurrency(
                                row.paidAmount
                              )}
                            </td>

                            <td>
                              <span className="reports-outstanding">
                                {formatCurrency(
                                  row.outstandingAmount
                                )}
                              </span>
                            </td>

                            <td>
                              {formatDate(row.dueDate)}
                            </td>

                            <td>
                              <span className="reports-status warning">
                                {row.paymentStatus}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </section>
  );
}