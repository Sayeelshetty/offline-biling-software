import {
  useEffect,
  useState,
} from "react";

import {
  BrowserRouter,
  Link,
  Route,
  Routes,
} from "react-router-dom";

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

import "./App.css";

function DashboardPage() {
  return (
    <section className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">
            DASHBOARD
          </p>

          <h1>Dashboard</h1>

          <p className="page-description">
            Overview of your billing and business activity.
          </p>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-card">
          <span>Today's Sales</span>
          <strong>₹0</strong>
        </div>

        <div className="dashboard-card">
          <span>Bills Generated</span>
          <strong>0</strong>
        </div>

        <div className="dashboard-card">
          <span>Pending Payments</span>
          <strong>₹0</strong>
        </div>

        <div className="dashboard-card">
          <span>Low Stock</span>
          <strong>0</strong>
        </div>
      </div>
    </section>
  );
}

function AppLayout() {
  const [
    connectionStatus,
    setConnectionStatus,
  ] = useState<SyncConnectionStatus>(
    () =>
      connectionService.getConnectionStatus()
  );

  const [
    syncStatus,
    setSyncStatus,
  ] = useState<SyncEngineStatus>(
    () =>
      syncEngineService.getStatus()
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
      syncEngineService.subscribe(
        (status) => {
          if (mounted) {
            setSyncStatus(status);
          }
        }
      );

    syncEngineService
      .initialize()
      .catch((error) => {
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
        const [
          settings,
          logoData,
        ] = await Promise.all([
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

        setBusinessLogo(
          logoData
        );
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
            <strong>
              {businessName}
            </strong>

            <span>
              POS System
            </span>
          </div>
        </div>

        <nav className="navigation">
          <Link to="/">
            Dashboard
          </Link>

          <Link to="/products">
            Products
          </Link>

          <Link to="/categories">
            Categories
          </Link>

          <Link to="/billing">
            Billing
          </Link>

          <Link to="/inventory">
            Inventory
          </Link>

          <Link to="/customers">
            Customers
          </Link>

          <Link to="/payments">
            Payments
          </Link>

          <Link to="/invoices">
            Invoices
          </Link>

          <Link to="/reports">
            Reports
          </Link>

          <Link to="/settings">
            Settings
          </Link>
        </nav>
      </aside>

      <div className="main-area">
        <header className="topbar">
          <div>
            <strong>
              {businessName}
            </strong>
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

              {isOnline
                ? "Online"
                : "Offline"}
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
  return (
    <BrowserRouter>
      <AppLayout />
    </BrowserRouter>
  );
}

export default App;