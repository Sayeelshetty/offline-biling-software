import {
  lazy,
  Suspense,
  useEffect,
  useState,
} from "react";

import {
  HashRouter,
  Link,
  NavLink,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";

import type { AuthenticatedUser } from "../../shared/auth";

import LoginPage from "./pages/LoginPage.tsx";

const ProductsPage = lazy(
  () => import("./pages/ProductsPage.tsx")
);
const CategoriesPage = lazy(
  () => import("./pages/Categories/CategoriesPage.tsx")
);
const InventoryPage = lazy(
  () => import("./pages/Inventory/InventoryPage.tsx")
);
const CustomerPage = lazy(
  () => import("./pages/Customers/CustomerPage.tsx")
);
const BillingPage = lazy(
  () => import("./pages/BillingPage")
);
const PaymentsPage = lazy(
  () => import("./pages/Payments/PaymentsPage")
);
const InvoicePage = lazy(
  () => import("./pages/Invoices/InvoicePage")
);
const ReportsPage = lazy(
  () => import("./pages/ReportsPage")
);
const SettingsPage = lazy(
  () => import("./pages/SettingsPage")
);

import connectionService from "./services/connection.service";
import syncEngineService from "./services/sync-engine.service";

import {
  getSettings,
  getLogoData,
} from "./services/settings.service";



import productService from "./services/product.service";
import paymentService from "./services/payment.service";

import {
  getDailySales,
  getLowStock,
} from "./services/report.service";


import type {
  SyncConnectionStatus,
  SyncEngineStatus,
} from "../../shared/types/sync";


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
  });

  const [productsCount, setProductsCount] = useState(0);

  const [pendingPayments, setPendingPayments] = useState(0);

  const [lowStockCount, setLowStockCount] = useState(0);

  const [lowStockProducts, setLowStockProducts] = useState<any[]>([]);

  const [recentBills, setRecentBills] = useState<any[]>([]);

  useEffect(() => {
    let mounted = true;

    async function loadDashboardData() {
      try {
        // Build today's date using the computer's local calendar date.
        // This avoids duplicate "today" variables and UTC date shifts.
        const now = new Date();

        const todayKey = [
          now.getFullYear(),
          String(now.getMonth() + 1).padStart(2, "0"),
          String(now.getDate()).padStart(2, "0"),
        ].join("-");

        const [
          recentInvoices,
          lowStockResult,
          paymentSummary,
          products,
          todaySalesRows,
        ] = await Promise.all([
          invoiceService.getRecentInvoices(50),
          getLowStock(),
          paymentService.getPaymentSummary(),
          productService.getAllProducts({
            includeInactive: false,
          }),
          getDailySales({
            from: todayKey,
            to: todayKey,
          }),
        ]);

        if (!mounted) {
          return;
        }

        // Today's sales and bill count come from the SQLite-backed
        // daily sales report instead of filtering only recent invoices.
        const todayBillCount = todaySalesRows.reduce(
          (total, row) => total + Number(row.billCount || 0),
          0
        );

        const todaySalesAmount = todaySalesRows.reduce(
          (total, row) => total + Number(row.totalSales || 0),
          0
        );

        setSales({
          totalBills: todayBillCount,
          totalSales: todaySalesAmount,
        });

        setProductsCount(products.length);

        setPendingPayments(
          Number(paymentSummary.totalOutstanding ?? 0)
        );

        setLowStockProducts(lowStockResult);
        setLowStockCount(lowStockResult.length);

        setRecentBills(
          recentInvoices
            .filter(
              (invoice) => invoice.paymentStatus !== "CANCELLED"
            )
            .slice(0, 5)
        );
      } catch (error) {
        console.error("Failed to load dashboard data:", error);

        if (!mounted) {
          return;
        }

        setSales({
          totalBills: 0,
          totalSales: 0,
        });

        setProductsCount(0);
        setPendingPayments(0);
        setLowStockCount(0);
        setLowStockProducts([]);
        setRecentBills([]);
      }
    }

    void loadDashboardData();

    return () => {
      mounted = false;
    };
  }, []);

  const formatCurrency = (amount: number) =>
    `₹${amount.toLocaleString("en-IN", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })}`;

  return (
    <section className="page dashboard-page">
      <div className="dashboard-header">
        <div className="dashboard-header-content">
          <div className="dashboard-eyebrow">
            <span className="dashboard-eyebrow-mark">◈</span>
            <span>Business Overview</span>
          </div>

          <h1>Dashboard</h1>

          <p className="dashboard-header-description">
            Monitor today's sales, bills, inventory and outstanding payments.
          </p>
        </div>

        <Link
          to="/billing"
          className="dashboard-new-bill-button"
        >
          <span>Create New Bill</span>
        </Link>
      </div>

      {/* Four dashboard summary cards */}
      <div className="dashboard-grid">
        <div className="dashboard-card dashboard-card-primary">
          <div className="dashboard-card-top">
            <span>Today's Sales</span>
          </div>

          <strong>{formatCurrency(sales.totalSales)}</strong>

          <small>Total amount billed today</small>
        </div>

        <div className="dashboard-card">
          <div className="dashboard-card-top">
            <span>Bills Generated</span>
          </div>

          <strong>
            {sales.totalBills.toLocaleString("en-IN")}
          </strong>

          <small>Bills created today</small>
        </div>

        <div className="dashboard-card">
          <div className="dashboard-card-top">
            <span>Products</span>
          </div>

          <strong>
            {productsCount.toLocaleString("en-IN")}
          </strong>

          <small>Active products</small>
        </div>

        <div className="dashboard-card">
          <div className="dashboard-card-top">
            <span>Pending Payments</span>
          </div>

          <strong>{formatCurrency(pendingPayments)}</strong>

          <small>Amount currently outstanding</small>
        </div>
      </div>

      {/* Keep the existing Low Stock and Recent Bills sections */}
      <div className="dashboard-content-grid">
        <section className="dashboard-section-card">
          <div className="dashboard-section-header">
            <div>
              <h2>Low Stock</h2>
              <p>Products that need attention</p>
            </div>

            <span className="dashboard-section-count">
              {lowStockCount}
            </span>
          </div>

          <div className="dashboard-list dashboard-low-stock-list">
            {lowStockProducts.length === 0 ? (
              <div className="dashboard-empty-state">
                <strong>Inventory Up to Date</strong>
                <span>
                  No products need restocking at the moment.
                </span>
              </div>
            ) : (
              lowStockProducts.map((product) => (
                <div
                  className="dashboard-list-row"
                  key={
                    product.productId ??
                    product.id ??
                    product._id ??
                    product.productName ??
                    product.name
                  }
                >
                  <div>
                    <strong>
                      {product.productName ?? product.name ?? "Unnamed product"}
                    </strong>

                    <span>
                      Minimum stock:{" "}
                      {Number(product.minimumStock ?? 0)}
                    </span>
                  </div>

                  <span className="dashboard-stock-warning">
                    {Number(product.currentStock ?? 0)}{" "}
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
              <p>Latest billing transactions</p>
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
                <strong>No recent bills</strong>
                <span>
                  Completed invoices will appear here.
                </span>
              </div>
            ) : (
              recentBills.map((invoice) => (
                <div
                  className="dashboard-list-row"
                  key={invoice.id ?? invoice.invoiceNumber}
                >
                  <div>
                    <strong>
                      #{invoice.invoiceNumber}
                    </strong>

                    <span>
                      {new Date(
                        invoice.createdAt
                      ).toLocaleTimeString("en-IN", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>

                  <strong className="dashboard-bill-amount">
                    {formatCurrency(Number(invoice.total ?? 0))}
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
  const location = useLocation();
  const [isMobileMoreOpen, setIsMobileMoreOpen] = useState(false);
  const isMoreSectionActive = ![
    "/",
    "/billing",
    "/products",
    "/reports",
  ].includes(location.pathname);

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
    if (!isMobileMoreOpen) {
      return;
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsMobileMoreOpen(false);
      }
    }

    window.addEventListener("keydown", closeOnEscape);

    return () => {
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [isMobileMoreOpen]);

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

  function getLastSyncedLabel() {
    if (!syncStatus.lastSyncedAt) {
      return "Never";
    }

    const timestamp = new Date(
      syncStatus.lastSyncedAt
    );

    if (Number.isNaN(timestamp.getTime())) {
      return "Unknown";
    }

    return timestamp.toLocaleTimeString(
      undefined,
      {
        hour: "numeric",
        minute: "2-digit",
      }
    );
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

        <nav className="navigation" aria-label="Main navigation">
          <span className="navigation-heading">Workspace</span>
          <NavLink to="/" end>Dashboard</NavLink>
          <NavLink to="/products">Products</NavLink>
          <NavLink to="/categories">Categories</NavLink>
          <NavLink to="/billing">Billing</NavLink>
          <NavLink to="/inventory">Inventory</NavLink>
          <NavLink to="/customers">Customers</NavLink>
          <NavLink to="/payments">Payments</NavLink>
          <NavLink to="/invoices">Invoices</NavLink>
          <NavLink to="/reports">Reports</NavLink>
          <NavLink to="/settings">Settings</NavLink>
        </nav>

        <div className="sidebar-user">
          <div className="account-identity">
            <span className="account-avatar" aria-hidden="true">
              {user.name
                .trim()
                .split(/\s+/)
                .slice(0, 2)
                .map((part) => part.charAt(0))
                .join("")
                .toUpperCase() || "U"}
            </span>
            <div className="account-details">
              <strong>{user.name}</strong>
              <span className="account-role">{user.role}</span>
              {user.email && (
                <span className="account-email">{user.email}</span>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onLogout}
            className="logout-button"
            aria-label={`Sign out ${user.name}`}
          >
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <path d="M8 3H4.75A1.75 1.75 0 0 0 3 4.75v10.5A1.75 1.75 0 0 0 4.75 17H8" />
              <path d="M11.5 6.5 15 10l-3.5 3.5M15 10H7" />
            </svg>
            <span>Sign out</span>
          </button>
        </div>
      </aside>


      <nav className="mobile-bottom-nav" aria-label="Quick navigation">
        <NavLink to="/" end aria-label="Home">
          <span>⌂</span>
          <span>Home</span>
        </NavLink>

        <NavLink to="/billing" aria-label="Billing">
          <span>▣</span>
          <span>Billing</span>
        </NavLink>

        <NavLink to="/products" aria-label="Products">
          <span>□</span>
          <span>Products</span>
        </NavLink>

        <NavLink to="/reports" aria-label="Reports">
          <span>▤</span>
          <span>Reports</span>
        </NavLink>

        <button
          type="button"
          className="mobile-more-toggle"
          aria-label="More navigation options"
          aria-expanded={isMobileMoreOpen}
          aria-controls="mobile-more-menu"
          data-active={isMoreSectionActive}
          onClick={() => setIsMobileMoreOpen((open) => !open)}
        >
          <span>⋯</span>
          <span>More</span>
        </button>
      </nav>

      {isMobileMoreOpen && (
        <nav
          id="mobile-more-menu"
          className="mobile-more-menu"
          aria-label="More pages"
        >
          <NavLink to="/categories" onClick={() => setIsMobileMoreOpen(false)}>
            Categories
          </NavLink>
          <NavLink to="/inventory" onClick={() => setIsMobileMoreOpen(false)}>
            Inventory
          </NavLink>
          <NavLink to="/customers" onClick={() => setIsMobileMoreOpen(false)}>
            Customers
          </NavLink>
          <NavLink to="/payments" onClick={() => setIsMobileMoreOpen(false)}>
            Payments
          </NavLink>
          <NavLink to="/invoices" onClick={() => setIsMobileMoreOpen(false)}>
            Invoices
          </NavLink>
          <NavLink to="/settings" onClick={() => setIsMobileMoreOpen(false)}>
            Settings
          </NavLink>
        </nav>
      )}

      

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
            <div
              className="sync-last-synced"
              aria-label={`Last synced ${getLastSyncedLabel()}`}
            >
              <span className="sync-last-synced-label">
                Last synced
              </span>
              <time dateTime={syncStatus.lastSyncedAt ?? undefined}>
                {getLastSyncedLabel()}
              </time>
            </div>
          </div>

          <div className="mobile-account">
            <span className="account-avatar" aria-hidden="true">
              {user.name
                .trim()
                .split(/\s+/)
                .slice(0, 2)
                .map((part) => part.charAt(0))
                .join("")
                .toUpperCase() || "U"}
            </span>
            <div className="account-details">
              <strong>{user.name}</strong>
              <span className="account-role">{user.role}</span>
            </div>
            <button
              type="button"
              onClick={onLogout}
              className="logout-button"
              aria-label={`Sign out ${user.name}`}
            >
              <svg viewBox="0 0 20 20" aria-hidden="true">
                <path d="M8 3H4.75A1.75 1.75 0 0 0 3 4.75v10.5A1.75 1.75 0 0 0 4.75 17H8" />
                <path d="M11.5 6.5 15 10l-3.5 3.5M15 10H7" />
              </svg>
              <span>Sign out</span>
            </button>
          </div>
        </header>

        

        <main className="page-container">
          <Suspense
            fallback={
              <div className="route-loading" role="status">
                Loading page...
              </div>
            }
          >
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
          </Suspense>
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