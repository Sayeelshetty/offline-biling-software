import { useEffect, useState } from "react";

import {
  HashRouter,
  Link,
  Route,
  Routes,
} from "react-router-dom";

import type { AuthenticatedUser } from "../../shared/auth";

import LoginPage from "./pages/LoginPage.tsx";
import ProductsPage from "./pages/ProductsPage.tsx";
import CategoriesPage from "./pages/Categories/CategoriesPage.tsx";
import InventoryPage from "./pages/Inventory/InventoryPage.tsx";
import CustomerPage from "./pages/Customers/CustomerPage.tsx";
import BillingPage from "./pages/BillingPage";
import PaymentsPage from "./pages/Payments/PaymentsPage";
import InvoicePage from "./pages/Invoices/InvoicePage";
import ReportsPage from "./pages/ReportsPage";
import SettingsPage from "./pages/SettingsPage";

import connectionService from "./services/connection.service";
import syncEngineService from "./services/sync-engine.service";

import {
  getSettings,
  getLogoData,
} from "./services/settings.service";

import type {
  SyncConnectionStatus,
  SyncEngineStatus,
} from "../../shared/types/sync";


import { getLowStock } from "./services/report.service";
import invoiceService from "./services/invoice.service";

import "./App.css";

const AUTH_SESSION_KEY = "offline-billing-auth-user";

function loadStoredUser(): AuthenticatedUser | null {
  try {
    const storedUser = localStorage.getItem(
      AUTH_SESSION_KEY
    );

    if (!storedUser) {
      return null;
    }

    const parsedUser: unknown = JSON.parse(storedUser);

    if (
      !parsedUser ||
      typeof parsedUser !== "object"
    ) {
      localStorage.removeItem(AUTH_SESSION_KEY);
      return null;
    }

    const user = parsedUser as Record<string, unknown>;

    if (
      typeof user.id !== "string" ||
      typeof user.name !== "string" ||
      !["ADMIN", "CASHIER", "MANAGER"].includes(
        String(user.role)
      )
    ) {
      localStorage.removeItem(AUTH_SESSION_KEY);
      return null;
    }

    return {
      id: user.id,
      serverId:
        typeof user.serverId === "string"
          ? user.serverId
          : null,
      businessId:
        typeof user.businessId === "string"
          ? user.businessId
          : null,
      name: user.name,
      email:
        typeof user.email === "string"
          ? user.email
          : null,
      role: user.role as AuthenticatedUser["role"],
    };
  } catch (error) {
    console.error(
      "Failed to load stored authentication:",
      error
    );

    localStorage.removeItem(AUTH_SESSION_KEY);
    return null;
  }
}

function DashboardPage() {
  const [sales, setSales] = useState({
    totalBills: 0,
    totalSales: 0,
    totalRevenue: 0,
  });

  const [pendingPayments, setPendingPayments] =
    useState(0);

  const [lowStockCount, setLowStockCount] =
    useState(0);

  const [lowStockProducts, setLowStockProducts] =
    useState<any[]>([]);

  const [recentBills, setRecentBills] =
    useState<any[]>([]);

  useEffect(() => {
    let mounted = true;

    async function loadDashboardData() {
      try {
        const [
          recentInvoices,
          lowStockProducts,
          paymentSummary,
        ] = await Promise.all([
          invoiceService.getRecentInvoices(500),
          getLowStock(),
          window.desktopAPI.payments.getSummary(),
        ]);

        if (!mounted) {
          return;
        }

        /*
         * Convert the current local date to YYYY-MM-DD.
         * Invoice createdAt values are stored as ISO timestamps.
         */
        const today =
          new Date().toLocaleDateString("en-CA");

        const todaysInvoices =
          recentInvoices.filter((invoice) => {
            if (
              invoice.paymentStatus ===
              "CANCELLED"
            ) {
              return false;
            }

            const invoiceDate =
              new Date(
                invoice.createdAt
              ).toLocaleDateString("en-CA");

            return invoiceDate === today;
          });

        const todaysSales =
          todaysInvoices.reduce(
            (total, invoice) =>
              total +
              Number(invoice.total || 0),
            0
          );

        const todaysRevenue =
          todaysInvoices.reduce(
            (total, invoice) =>
              total +
              Number(invoice.subtotal || 0) -
              Number(invoice.discount || 0),
            0
          );

        setSales({
          totalBills: todaysInvoices.length,
          totalSales: todaysSales,
          totalRevenue: todaysRevenue,
        });

        setRecentBills(
          recentInvoices
            .filter(
              (invoice) =>
                invoice.paymentStatus !==
                "CANCELLED"
            )
            .slice(0, 5)
        );

        setLowStockProducts(
          lowStockProducts.slice(0, 5)
        );

        setLowStockCount(
          lowStockProducts.length
        );

        setPendingPayments(
          Number(
            paymentSummary.totalOutstanding ?? 0
          )
        );
      } catch (error) {
        console.error(
          "Failed to load dashboard data:",
          error
        );

        if (!mounted) {
          return;
        }

        setSales({
          totalBills: 0,
          totalSales: 0,
          totalRevenue: 0,
        });

        setPendingPayments(0);
        setLowStockCount(0);

        setRecentBills([]);
        setLowStockProducts([]);
      }
    }

    loadDashboardData();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <section className="page dashboard-page">
      <div className="page-header dashboard-header">
        <div>
          <p className="eyebrow">OVERVIEW</p>

          <h1>Dashboard</h1>

          <p className="page-description">
            Overview of your billing and business
            activity.
          </p>
        </div>

        <Link
          to="/billing"
          className="dashboard-new-bill-button"
        >
          <span aria-hidden="true">+</span>
          New Bill
        </Link>
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-card dashboard-card-primary">
          <div className="dashboard-card-top">
            <span>Today's Sales</span>
          </div>

          <strong>
            {"\u20B9"}
            {sales.totalSales.toLocaleString(
              "en-IN",
              {
                minimumFractionDigits: 0,
                maximumFractionDigits: 2,
              }
            )}
          </strong>

          <small>
            Total amount billed today
          </small>
        </div>

        <div className="dashboard-card">
          <div className="dashboard-card-top">
            <span>Bills Generated</span>
          </div>

          <strong>
            {sales.totalBills}
          </strong>

          <small>
            Bills created today
          </small>
        </div>

        <div className="dashboard-card">
          <div className="dashboard-card-top">
            <span>Today's Revenue</span>
          </div>

          <strong>
            {"\u20B9"}
            {sales.totalRevenue.toLocaleString(
              "en-IN",
              {
                minimumFractionDigits: 0,
                maximumFractionDigits: 2,
              }
            )}
          </strong>

          <small>
            Net sales before tax
          </small>
        </div>

        <div className="dashboard-card">
          <div className="dashboard-card-top">
            <span>Pending Payments</span>
          </div>

          <strong>
            {"\u20B9"}
            {pendingPayments.toLocaleString(
              "en-IN",
              {
                minimumFractionDigits: 0,
                maximumFractionDigits: 2,
              }
            )}
          </strong>

          <small>
            Amount currently outstanding
          </small>
        </div>
      </div>

      <div className="dashboard-content-grid">
        <section className="dashboard-section-card">
          <div className="dashboard-section-header">
            <div>
              <h2>Low Stock</h2>

              <p>
                Products that need attention
              </p>
            </div>

            <span className="dashboard-section-count">
              {lowStockCount}
            </span>
          </div>

          <div className="dashboard-list">
            {lowStockProducts.length === 0 ? (
              <div className="dashboard-empty-state">
                <strong>
                  Stock looks good
                </strong>

                <span>
                  No products are currently low
                  in stock.
                </span>
              </div>
            ) : (
              lowStockProducts.map((product) => (
                <div
                  className="dashboard-list-row"
                  key={
                    product.productId ??
                    product.id ??
                    product.productName
                  }
                >
                  <div>
                    <strong>
                      {product.productName ??
                        product.name}
                    </strong>

                    <span>
                      Minimum stock:{" "}
                      {Number(
                        product.minimumStock ?? 0
                      )}
                    </span>
                  </div>

                  <span className="dashboard-stock-warning">
                    {Number(
                      product.currentStock ?? 0
                    )}{" "}
                    {product.unit || "PCS"} left
                  </span>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="dashboard-section-card">
          <div className="dashboard-section-header">
            <div>
              <h2>Recent Bills</h2>

              <p>
                Latest billing transactions
              </p>
            </div>

            <Link
              to="/invoices"
              className="dashboard-view-link"
            >
              View all
            </Link>
          </div>

          <div className="dashboard-list">
            {recentBills.length === 0 ? (
              <div className="dashboard-empty-state">
                <strong>
                  No recent bills
                </strong>

                <span>
                  Completed invoices will appear
                  here.
                </span>
              </div>
            ) : (
              recentBills.map((invoice) => (
                <div
                  className="dashboard-list-row"
                  key={invoice.id}
                >
                  <div>
                    <strong>
                      #{invoice.invoiceNumber}
                    </strong>

                    <span>
                      {new Date(
                        invoice.createdAt
                      ).toLocaleTimeString(
                        "en-IN",
                        {
                          hour: "2-digit",
                          minute: "2-digit",
                        }
                      )}
                    </span>
                  </div>

                  <strong className="dashboard-bill-amount">
                    {"\u20B9"}
                    {Number(
                      invoice.total ?? 0
                    ).toLocaleString(
                      "en-IN",
                      {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 2,
                      }
                    )}
                  </strong>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </section>
  );
}

type AppLayoutProps = {
  user: AuthenticatedUser;
  onLogout: () => void;
};

function AppLayout({
  user,
  onLogout,
}: AppLayoutProps) {
  const [
    connectionStatus,
    setConnectionStatus,
  ] = useState<SyncConnectionStatus>(
    () => connectionService.getConnectionStatus()
  );

  const [
    syncStatus,
    setSyncStatus,
  ] = useState<SyncEngineStatus>(
    () => syncEngineService.getStatus()
  );

  const [
    businessName,
    setBusinessName,
  ] = useState("Offline Billing");

  const [
    businessLogo,
    setBusinessLogo,
  ] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribeConnection =
      connectionService.subscribeToConnectionChanges(
        (status) => {
          setConnectionStatus(status);
        }
      );

    return unsubscribeConnection;
  }, []);

  useEffect(() => {
    let mounted = true;

    const unsubscribeSync =
      syncEngineService.subscribe((status) => {
        if (mounted) {
          setSyncStatus(status);
        }
      });

    syncEngineService.initialize().catch((error) => {
      console.error(
        "Failed to initialize sync engine:",
        error
      );
    });

    return () => {
      mounted = false;
      unsubscribeSync();
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    async function loadBusinessBranding() {
      try {
        const [settings, logoData] =
          await Promise.all([
            getSettings(),
            getLogoData(),
          ]);

        if (!mounted) {
          return;
        }

        setBusinessName(
          settings.business.businessName?.trim() ||
            "Offline Billing"
        );

        setBusinessLogo(logoData);
      } catch (error) {
        console.error(
          "Failed to load business branding:",
          error
        );
      }
    }

    loadBusinessBranding();

    return () => {
      mounted = false;
    };
  }, []);

  const isOnline =
    connectionStatus === "ONLINE";

  function getSyncLabel() {
    if (syncStatus.syncing) {
      return "Syncing...";
    }

    if (syncStatus.pending > 0) {
      return `${syncStatus.pending} pending`;
    }

    if (syncStatus.failed > 0) {
      return `${syncStatus.failed} failed`;
    }

    return "All synced";
  }

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="brand">
          <div
            className="brand-icon"
            style={{
              overflow: "hidden",
              padding: businessLogo
                ? "3px"
                : undefined,
            }}
          >
            {businessLogo ? (
              <img
                src={businessLogo}
                alt={`${businessName} logo`}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                  borderRadius: "inherit",
                  display: "block",
                }}
              />
            ) : (
              "OB"
            )}
          </div>

          <div>
            <strong>{businessName}</strong>

            <span>POS System</span>
          </div>
        </div>

        <nav className="navigation">
          <Link to="/">Dashboard</Link>
          <Link to="/products">Products</Link>
          <Link to="/categories">Categories</Link>
          <Link to="/billing">Billing</Link>
          <Link to="/inventory">Inventory</Link>
          <Link to="/customers">Customers</Link>
          <Link to="/payments">Payments</Link>
          <Link to="/invoices">Invoices</Link>
          <Link to="/reports">Reports</Link>
          <Link to="/settings">Settings</Link>
        </nav>

        <div
          className="sidebar-user"
          style={{
            marginTop: "auto",
            padding: "16px",
            borderTop:
              "1px solid rgba(148, 163, 184, 0.18)",
          }}
        >
          <div style={{ marginBottom: "10px" }}>
            <strong
              style={{
                display: "block",
                fontSize: "13px",
              }}
            >
              {user.name}
            </strong>

            <span
              style={{
                display: "block",
                marginTop: "4px",
                fontSize: "11px",
                opacity: 0.7,
              }}
            >
              {user.role}
            </span>

            {user.email && (
              <span
                style={{
                  display: "block",
                  marginTop: "3px",
                  fontSize: "11px",
                  opacity: 0.7,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {user.email}
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={onLogout}
            style={{
              width: "100%",
              padding: "9px 12px",
              borderRadius: "8px",
              border:
                "1px solid rgba(148, 163, 184, 0.3)",
              background: "transparent",
              color: "inherit",
              cursor: "pointer",
              fontSize: "12px",
              fontWeight: 600,
            }}
          >
            Logout
          </button>
        </div>
      </aside>


            <nav className="mobile-bottom-nav">
        <Link to="/" aria-label="Home">
          <span>⌂</span>
          <span>Home</span>
        </Link>

        <Link to="/billing" aria-label="Billing">
          <span>▣</span>
          <span>Billing</span>
        </Link>

        <Link to="/products" aria-label="Products">
          <span>□</span>
          <span>Products</span>
        </Link>

        <Link to="/reports" aria-label="Reports">
          <span>▤</span>
          <span>Reports</span>
        </Link>

        <Link to="/settings" aria-label="More">
          <span>⋯</span>
          <span>More</span>
        </Link>
      </nav>

      

      <div className="main-area">
        <header className="topbar">
          <div>
            <strong>{businessName}</strong>
          </div>

          <div className="topbar-status-group">
            <div
              className={`connection-status ${
                isOnline
                  ? "connection-online"
                  : "connection-offline"
              }`}
            >
              <span className="status-dot" />

              {isOnline ? "Online" : "Offline"}
            </div>

            <div
              className={`sync-status ${
                syncStatus.syncing
                  ? "sync-status-syncing"
                  : syncStatus.pending > 0
                  ? "sync-status-pending"
                  : syncStatus.failed > 0
                  ? "sync-status-failed"
                  : "sync-status-success"
              }`}
            >
              {getSyncLabel()}
            </div>
          </div>
        </header>

        

        <main className="page-container">
          <Routes>
            <Route
              path="/"
              element={<DashboardPage />}
            />

            <Route
              path="/products"
              element={<ProductsPage />}
            />

            <Route
              path="/categories"
              element={<CategoriesPage />}
            />

            <Route
              path="/billing"
              element={<BillingPage />}
            />

            <Route
              path="/inventory"
              element={<InventoryPage />}
            />

            <Route
              path="/customers"
              element={<CustomerPage />}
            />

            <Route
              path="/payments"
              element={<PaymentsPage />}
            />

            <Route
              path="/invoices"
              element={<InvoicePage />}
            />

            <Route
              path="/reports"
              element={<ReportsPage />}
            />

            <Route
              path="/settings"
              element={<SettingsPage />}
            />
          </Routes>
        </main>
      </div>
    </div>
  );
}

function App() {
  const [
    authenticatedUser,
    setAuthenticatedUser,
  ] = useState<AuthenticatedUser | null>(
    () => loadStoredUser()
  );

  function handleLogin(
    user: AuthenticatedUser
  ) {
    localStorage.setItem(
      AUTH_SESSION_KEY,
      JSON.stringify(user)
    );

    window.history.replaceState(
      null,
      "",
      "/"
    );

    setAuthenticatedUser(user);
  }

  function handleLogout() {
    localStorage.removeItem(
      AUTH_SESSION_KEY
    );

    window.history.replaceState(
      null,
      "",
      "/"
    );

    setAuthenticatedUser(null);
  }

  if (!authenticatedUser) {
    return (
      <LoginPage
        onLoginSuccess={handleLogin}
      />
    );
  }

return (
  <HashRouter>
    <AppLayout
      user={authenticatedUser}
      onLogout={handleLogout}
    />
  </HashRouter>
);
}

export default App;