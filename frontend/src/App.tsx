import { useEffect, useState } from "react";
import "./App.css";

type AppInfo = {
  name: string;
  version: string;
  platform: string;
};

type DatabaseStatus = {
  success: boolean;
  path?: string;
  tableCount?: number;
  tables?: string[];
  error?: string;
};

type Product = {
  id: string;
  serverId: string | null;

  name: string;
  sku: string;
  barcode: string | null;

  categoryId: string | null;

  sellingPrice: number;
  purchasePrice: number;

  gstRate: number;

  currentStock: number;
  minimumStock: number;

  unit: string;

  imagePath: string | null;

  status: "ACTIVE" | "INACTIVE";

  createdAt: string;
  updatedAt: string;

  syncStatus: "PENDING" | "SYNCED" | "FAILED";

  deviceId: string;
};

type ProductResult = {
  success: boolean;
  products?: Product[];
  error?: string;
};

type SingleProductResult = {
  success: boolean;
  product?: Product | null;
  error?: string;
};

function App() {
  const [appInfo, setAppInfo] = useState<AppInfo | null>(null);

  const [databaseStatus, setDatabaseStatus] =
    useState<DatabaseStatus | null>(null);

  const [products, setProducts] = useState<Product[]>([]);

  const [productStatus, setProductStatus] = useState(
    "Checking products..."
  );

  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    loadProducts();
  }, []);

  async function loadProducts() {
    try {
      const info = await window.desktopAPI.getAppInfo();

      const database =
        await window.desktopAPI.database.getStatus();

      const productResult: ProductResult =
        await window.desktopAPI.products.getAll();

      setAppInfo(info);

      setDatabaseStatus(database);

      if (productResult.success) {
        setProducts(productResult.products ?? []);

        setProductStatus(
          `Product repository working. ${
            productResult.products?.length ?? 0
          } products found.`
        );
      } else {
        setProductStatus(
          `Product repository error: ${productResult.error}`
        );
      }
    } catch (error) {
      console.error(
        "Failed to load system information:",
        error
      );

      setProductStatus(
        "Failed to communicate with Electron."
      );
    }
  }

  async function createTestProduct() {
    if (isCreating) {
      return;
    }

    try {
      setIsCreating(true);

      const existingProduct: SingleProductResult =
        await window.desktopAPI.products.getBySku(
          "TEST-RICE-001"
        );

      if (existingProduct.product) {
        setProductStatus(
          "Test product already exists. Loading products..."
        );

        await loadProducts();

        return;
      }

      const result =
        await window.desktopAPI.products.create({
          name: "Test Rice 1kg",
          sku: "TEST-RICE-001",
          barcode: "890000000001",
          categoryId: null,
          sellingPrice: 60,
          purchasePrice: 50,
          gstRate: 5,
          currentStock: 100,
          minimumStock: 10,
          unit: "PCS",
          imagePath: null,
          status: "ACTIVE",
          deviceId: "DEV-LOCAL-001",
        });

      if (!result.success) {
        setProductStatus(
          `Failed to create product: ${result.error}`
        );

        return;
      }

      setProductStatus(
        "Test product created successfully."
      );

      await loadProducts();
    } catch (error) {
      console.error(
        "Create test product error:",
        error
      );

      setProductStatus(
        "Unexpected error while creating test product."
      );
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <div className="app">
      <header className="app-header">
        <div>
          <p className="eyebrow">OFFLINE POS</p>

          <h1>Offline Billing Software</h1>

          <p className="subtitle">
            Offline-first desktop billing and inventory management
          </p>
        </div>

        <div className="status">
          <span className="status-dot"></span>
          Electron Desktop
        </div>
      </header>

      <main className="content">
        <section className="card">
          <p className="label">SYSTEM STATUS</p>

          <h2>
            Electron and SQLite are connected.
          </h2>

          {appInfo && (
            <div className="info-grid">
              <div className="info-box">
                <span>Application</span>
                <strong>{appInfo.name}</strong>
              </div>

              <div className="info-box">
                <span>Version</span>
                <strong>{appInfo.version}</strong>
              </div>

              <div className="info-box">
                <span>Platform</span>
                <strong>{appInfo.platform}</strong>
              </div>
            </div>
          )}

          <div className="database-section">
            <p className="label">DATABASE STATUS</p>

            {databaseStatus?.success && (
              <>
                <div className="info-grid">
                  <div className="info-box">
                    <span>Database</span>
                    <strong>SQLite</strong>
                  </div>

                  <div className="info-box">
                    <span>Tables</span>
                    <strong>
                      {databaseStatus.tableCount}
                    </strong>
                  </div>

                  <div className="info-box">
                    <span>Status</span>
                    <strong>Connected</strong>
                  </div>
                </div>

                <div className="tables-section">
                  <h3>Created Tables</h3>

                  <div className="table-list">
                    {databaseStatus.tables?.map(
                      (table) => (
                        <span key={table}>
                          {table}
                        </span>
                      )
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="product-section">
            <p className="label">
              PRODUCT REPOSITORY
            </p>

            <div className="product-status">
              <span className="status-dot"></span>

              <strong>{productStatus}</strong>
            </div>

            <button
              type="button"
              onClick={createTestProduct}
              disabled={isCreating}
              className="test-button"
            >
              {isCreating
                ? "Creating..."
                : "Create Test Product"}
            </button>

            <div className="product-count">
              <span>Total Products</span>

              <strong>{products.length}</strong>
            </div>

            {products.length > 0 && (
              <div className="product-list">
                {products.map((product) => (
                  <div
                    className="product-row"
                    key={product.id}
                  >
                    <div>
                      <strong>
                        {product.name}
                      </strong>

                      <span>
                        SKU: {product.sku}
                      </span>
                    </div>

                    <div>
                      <strong>
                        ₹{product.sellingPrice}
                      </strong>

                      <span>
                        Stock:{" "}
                        {product.currentStock}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;