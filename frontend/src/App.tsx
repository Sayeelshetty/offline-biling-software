import {
  BrowserRouter,
  Link,
  Route,
  Routes,
} from "react-router-dom";

import ProductsPage from "./pages/ProductsPage.tsx";
import CategoriesPage from "./pages/Categories/CategoriesPage.tsx";

import "./App.css";

function DashboardPage() {
  return (
    <section className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">DASHBOARD</p>
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
  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">OB</div>

          <div>
            <strong>Offline Billing</strong>
            <span>POS System</span>
          </div>
        </div>

        <nav className="navigation">
          <Link to="/">Dashboard</Link>

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
        </nav>
      </aside>

      <div className="main-area">
        <header className="topbar">
          <div>
            <strong>Offline Billing Software</strong>
          </div>

          <div className="connection-status">
            <span className="status-dot" />
            Offline Ready
          </div>
        </header>

        <main className="page-container">
          <Routes>
            {/* Dashboard */}
            <Route
              path="/"
              element={<DashboardPage />}
            />

            {/* Products */}
            <Route
              path="/products"
              element={<ProductsPage />}
            />

            {/* Categories */}
            <Route
              path="/categories"
              element={<CategoriesPage />}
            />

            {/* Billing */}
            <Route
              path="/billing"
              element={
                <section className="page">
                  <h1>Billing</h1>
                  <p>
                    Billing module coming next.
                  </p>
                </section>
              }
            />

            {/* Inventory */}
            <Route
              path="/inventory"
              element={
                <section className="page">
                  <h1>Inventory</h1>
                  <p>
                    Inventory module coming later.
                  </p>
                </section>
              }
            />

            {/* Customers */}
            <Route
              path="/customers"
              element={
                <section className="page">
                  <h1>Customers</h1>
                  <p>
                    Customer module coming later.
                  </p>
                </section>
              }
            />

            {/* Payments */}
            <Route
              path="/payments"
              element={
                <section className="page">
                  <h1>Payments</h1>
                  <p>
                    Payment module coming later.
                  </p>
                </section>
              }
            />

            {/* Invoices */}
            <Route
              path="/invoices"
              element={
                <section className="page">
                  <h1>Invoices</h1>
                  <p>
                    Invoice module coming later.
                  </p>
                </section>
              }
            />

            {/* Reports */}
            <Route
              path="/reports"
              element={
                <section className="page">
                  <h1>Reports</h1>
                  <p>
                    Reports module coming later.
                  </p>
                </section>
              }
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