import { useEffect, useState } from "react";

import productService, {
  type Product,
  type ProductInput,
  type ProductUpdateInput,
} from "../services/product.service";

import ProductForm from "../pages/Products/ProductForm";
import "../pages/Products/ProductsPage.css";

function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);

  const [searchTerm, setSearchTerm] = useState("");

  const [statusFilter, setStatusFilter] = useState<
    "ACTIVE" | "INACTIVE" | "ALL"
  >("ACTIVE");

  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const [message, setMessage] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);

  const [editingProduct, setEditingProduct] =
    useState<Product | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadProducts();
    }, 250);

    return () => {
      window.clearTimeout(timer);
    };
  }, [searchTerm, statusFilter]);

  async function loadProducts() {
    try {
      setLoading(true);
      setError(null);

      const includeInactive =
        statusFilter !== "ACTIVE";

      const trimmedSearch = searchTerm.trim();

      let result: Product[];

      if (trimmedSearch) {
        result = await productService.searchProducts(
          trimmedSearch,
          includeInactive
        );
      } else {
        result = await productService.getAllProducts({
          includeInactive,
        });
      }

      if (statusFilter === "INACTIVE") {
        result = result.filter(
          (product) =>
            product.status === "INACTIVE"
        );
      }

      setProducts(result);
    } catch (err) {
      console.error(
        "Failed to load products:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Failed to load products."
      );
    } finally {
      setLoading(false);
    }
  }

  function openAddForm() {
    setEditingProduct(null);
    setError(null);
    setMessage(null);
    setShowForm(true);
  }

  function openEditForm(product: Product) {
    setEditingProduct(product);
    setError(null);
    setMessage(null);
    setShowForm(true);
  }

  function closeForm() {
    if (saving) {
      return;
    }

    setShowForm(false);
    setEditingProduct(null);
  }

  async function handleProductSubmit(
    data: ProductInput | ProductUpdateInput
  ) {
    try {
      setSaving(true);
      setError(null);
      setMessage(null);

      if (editingProduct) {
        await productService.updateProduct(
          editingProduct.id,
          data as ProductUpdateInput
        );

        setMessage(
          `"${editingProduct.name}" updated successfully.`
        );
      } else {
        await productService.createProduct(
          data as ProductInput
        );

        setMessage(
          "Product created successfully."
        );
      }

      setShowForm(false);
      setEditingProduct(null);

      await loadProducts();
    } catch (err) {
      console.error(
        "Failed to save product:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Failed to save product."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate(
    product: Product
  ) {
    const confirmed = window.confirm(
      `Deactivate "${product.name}"?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setError(null);
      setMessage(null);

      await productService.deactivateProduct(
        product.id
      );

      setMessage(
        `"${product.name}" was deactivated successfully.`
      );

      await loadProducts();
    } catch (err) {
      console.error(
        "Failed to deactivate product:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Failed to deactivate product."
      );
    }
  }

  async function handleActivate(
    product: Product
  ) {
    try {
      setError(null);
      setMessage(null);

      await productService.activateProduct(
        product.id
      );

      setMessage(
        `"${product.name}" was activated successfully.`
      );

      await loadProducts();
    } catch (err) {
      console.error(
        "Failed to activate product:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Failed to activate product."
      );
    }
  }

  function getStockClass(product: Product) {
    if (product.currentStock <= 0) {
      return "stock-danger";
    }

    if (
      product.currentStock <=
      product.minimumStock
    ) {
      return "stock-warning";
    }

    return "stock-normal";
  }

  return (
    <section className="products-page">
      <div className="products-header">
        <div>
          <p className="eyebrow">PRODUCTS</p>

          <h1>Product Management</h1>

          <p className="page-description">
            Manage products, pricing, stock and product
            information.
          </p>
        </div>

        <button
          type="button"
          className="primary-button"
          onClick={openAddForm}
        >
          + Add Product
        </button>
      </div>

      {message && (
        <div className="message success-message">
          {message}
        </div>
      )}

      {error && (
        <div className="message error-message">
          {error}
        </div>
      )}

      <div className="toolbar">
        <div className="search-wrapper">
          <label htmlFor="product-search">
            Search Products
          </label>

          <input
            id="product-search"
            type="text"
            value={searchTerm}
            onChange={(event) =>
              setSearchTerm(event.target.value)
            }
            placeholder="Search by name, SKU or barcode..."
          />
        </div>

        <div className="filter-wrapper">
          <label htmlFor="status-filter">
            Status
          </label>

          <select
            id="status-filter"
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(
                event.target.value as
                  | "ACTIVE"
                  | "INACTIVE"
                  | "ALL"
              )
            }
          >
            <option value="ACTIVE">
              Active
            </option>

            <option value="INACTIVE">
              Inactive
            </option>

            <option value="ALL">
              All Products
            </option>
          </select>
        </div>

        <div className="product-total">
          <span>Total</span>

          <strong>{products.length}</strong>
        </div>
      </div>

      <div className="table-card">
        {loading ? (
          <div className="empty-state">
            <p>Loading products...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="empty-state">
            <h3>No products found</h3>

            <p>
              Add a product or change your
              search/filter.
            </p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="products-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>SKU</th>
                  <th>Barcode</th>
                  <th>Price</th>
                  <th>GST</th>
                  <th>Stock</th>
                  <th>Unit</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {products.map((product) => (
                  <tr key={product.id}>
                    <td>
                      <div className="product-name">
                        <strong>
                          {product.name}
                        </strong>

                        <span>
                          Purchase ₹
                          {product.purchasePrice.toFixed(
                            2
                          )}
                        </span>
                      </div>
                    </td>

                    <td>{product.sku}</td>

                    <td>
                      {product.barcode || "—"}
                    </td>

                    <td>
                      ₹
                      {product.sellingPrice.toFixed(
                        2
                      )}
                    </td>

                    <td>
                      {product.gstRate}%
                    </td>

                    <td>
                      <span
                        className={`stock-badge ${getStockClass(
                          product
                        )}`}
                      >
                        {product.currentStock}
                      </span>

                      <small>
                        Min:{" "}
                        {product.minimumStock}
                      </small>
                    </td>

                    <td>{product.unit}</td>

                    <td>
                      <span
                        className={`status-badge ${
                          product.status ===
                          "ACTIVE"
                            ? "status-active"
                            : "status-inactive"
                        }`}
                      >
                        {product.status}
                      </span>
                    </td>

                    <td>
                      <div className="action-buttons">
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() =>
                            openEditForm(product)
                          }
                        >
                          Edit
                        </button>

                        {product.status ===
                        "ACTIVE" ? (
                          <button
                            type="button"
                            className="danger-button"
                            onClick={() =>
                              handleDeactivate(
                                product
                              )
                            }
                          >
                            Deactivate
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="activate-button"
                            onClick={() =>
                              handleActivate(
                                product
                              )
                            }
                          >
                            Activate
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showForm && (
        <div className="modal-backdrop">
          <div
            className="product-form-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="product-form-title"
          >
            <ProductForm
              product={editingProduct}
              onSubmit={handleProductSubmit}
              onCancel={closeForm}
              isSubmitting={saving}
            />
          </div>
        </div>
      )}
    </section>
  );
}

export default ProductsPage;