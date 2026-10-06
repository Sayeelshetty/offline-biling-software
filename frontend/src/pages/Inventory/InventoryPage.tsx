import { useEffect, useState } from "react";

import type { Product } from "../../types/product";

import type {
  StockMovement,
  StockSummary,
}  from "../../types/inventory";

import productService from "../../services/product.service";

import inventoryService from "../../services/inventory.service";

import "./InventoryPage.css";

type InventoryOperation =
  | "STOCK_IN"
  | "STOCK_OUT"
  | "ADJUSTMENT";

function getDeviceId(): string {
  const existingDeviceId = localStorage.getItem(
    "offline-billing-device-id"
  );

  if (existingDeviceId) {
    return existingDeviceId;
  }

  const newDeviceId = crypto.randomUUID();

  localStorage.setItem(
    "offline-billing-device-id",
    newDeviceId
  );

  return newDeviceId;
}

function InventoryPage() {
  const [products, setProducts] = useState<Product[]>(
    []
  );

  const [summary, setSummary] = useState<
    StockSummary[]
  >([]);

  const [movements, setMovements] = useState<
    StockMovement[]
  >([]);

  const [selectedProductId, setSelectedProductId] =
    useState("");

  const [operation, setOperation] =
    useState<InventoryOperation>("STOCK_IN");

  const [quantity, setQuantity] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [loadingMovements, setLoadingMovements] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [message, setMessage] =
    useState<string | null>(null);

  const deviceId = getDeviceId();

  /*
  |--------------------------------------------------------------------------
  | Load Inventory
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    loadInventory();
  }, []);

  async function loadInventory() {
    try {
      setLoading(true);
      setError(null);

      const [
        productResult,
        summaryResult,
        movementResult,
      ] = await Promise.all([
        productService.getAllProducts({
          includeInactive: false,
        }),

        inventoryService.getStockSummary(),

        inventoryService.getAllStockMovements(
          200
        ),
      ]);

      setProducts(productResult);
      setSummary(summaryResult);
      setMovements(movementResult);
    } catch (err) {
      console.error(
        "Failed to load inventory:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Failed to load inventory."
      );
    } finally {
      setLoading(false);
    }
  }

  /*
  |--------------------------------------------------------------------------
  | Load Product Movements
  |--------------------------------------------------------------------------
  */

  async function loadProductMovements(
    productId: string
  ) {
    if (!productId) {
      setMovements([]);
      return;
    }

    try {
      setLoadingMovements(true);
      setError(null);

      const result =
        await inventoryService.getStockMovements(
          productId,
          100
        );

      setMovements(result);
    } catch (err) {
      console.error(
        "Failed to load product movements:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Failed to load product movements."
      );
    } finally {
      setLoadingMovements(false);
    }
  }

  /*
  |--------------------------------------------------------------------------
  | Product Selection
  |--------------------------------------------------------------------------
  */

  function handleProductChange(
    productId: string
  ) {
    setSelectedProductId(productId);
    setMessage(null);
    setError(null);

    if (productId) {
      loadProductMovements(productId);
    } else {
      loadInventory();
    }
  }

  /*
  |--------------------------------------------------------------------------
  | Inventory Operation
  |--------------------------------------------------------------------------
  */

  async function handleInventoryOperation(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError(null);
    setMessage(null);

    if (!selectedProductId) {
      setError(
        "Please select a product."
      );

      return;
    }

    const numericQuantity =
      Number(quantity);

    if (
      !Number.isFinite(
        numericQuantity
      )
    ) {
      setError(
        "Please enter a valid quantity."
      );

      return;
    }

    if (
      operation !== "ADJUSTMENT" &&
      numericQuantity <= 0
    ) {
      setError(
        "Quantity must be greater than zero."
      );

      return;
    }

    if (
      operation === "ADJUSTMENT" &&
      numericQuantity === 0
    ) {
      setError(
        "Adjustment quantity cannot be zero."
      );

      return;
    }

    try {
      setSaving(true);

      let result;

      if (operation === "STOCK_IN") {
        result =
          await inventoryService.stockIn({
            productId:
              selectedProductId,

            quantity:
              numericQuantity,

            referenceType:
              "MANUAL",

            referenceId:
              null,

            deviceId,
          });
      } else if (
        operation === "STOCK_OUT"
      ) {
        result =
          await inventoryService.stockOut({
            productId:
              selectedProductId,

            quantity:
              numericQuantity,

            referenceType:
              "MANUAL",

            referenceId:
              null,

            deviceId,
          });
      } else {
        result =
          await inventoryService.adjustStock({
            productId:
              selectedProductId,

            adjustmentQuantity:
              numericQuantity,

            referenceType:
              "MANUAL",

            referenceId:
              null,

            deviceId,
          });
      }

      const selectedProduct =
        products.find(
          (product) =>
            product.id ===
            selectedProductId
        );

      setMessage(
        `${
          selectedProduct?.name ??
          "Product"
        } stock updated successfully. Current stock: ${result.currentStock}`
      );

      setQuantity("");

      await loadInventory();

      await loadProductMovements(
        selectedProductId
      );
    } catch (err) {
      console.error(
        "Inventory operation failed:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Inventory operation failed."
      );
    } finally {
      setSaving(false);
    }
  }

  /*
  |--------------------------------------------------------------------------
  | Summary Helpers
  |--------------------------------------------------------------------------
  */

  const totalProducts =
    summary.length;

  const lowStockProducts =
    summary.filter(
      (product) =>
        product.status === "ACTIVE" &&
        product.currentStock <=
          product.minimumStock
    ).length;

  const totalStockValue =
    summary.reduce(
      (total, product) =>
        total + product.stockValue,
      0
    );

  const currentProduct =
    summary.find(
      (product) =>
        product.productId ===
        selectedProductId
    );

  /*
  |--------------------------------------------------------------------------
  | Movement Helpers
  |--------------------------------------------------------------------------
  */

  function getMovementClass(
    type: StockMovement["type"]
  ) {
    if (type === "STOCK_IN") {
      return "movement-in";
    }

    if (type === "STOCK_OUT") {
      return "movement-out";
    }

    return "movement-adjustment";
  }

  function formatMovementQuantity(
    movement: StockMovement
  ) {
    if (
      movement.type ===
      "STOCK_OUT"
    ) {
      return `-${Math.abs(
        movement.quantity
      )}`;
    }

    if (
      movement.type ===
      "STOCK_IN"
    ) {
      return `+${Math.abs(
        movement.quantity
      )}`;
    }

    if (
      movement.quantity > 0
    ) {
      return `+${movement.quantity}`;
    }

    return `${movement.quantity}`;
  }

  function formatDate(
    value: string
  ) {
    return new Date(
      value
    ).toLocaleString();
  }

  /*
  |--------------------------------------------------------------------------
  | Render
  |--------------------------------------------------------------------------
  */

  return (
    <section className="inventory-page">
      <div className="inventory-header">
        <div>
          <p className="eyebrow">
            INVENTORY
          </p>

          <h1>
            Inventory Management
          </h1>

          <p className="page-description">
            Manage stock, movements and
            inventory valuation offline.
          </p>
        </div>

        <button
          type="button"
          className="secondary-button"
          onClick={loadInventory}
          disabled={
            loading ||
            saving ||
            loadingMovements
          }
        >
          Refresh
        </button>
      </div>

      {message && (
        <div className="inventory-message inventory-success">
          {message}
        </div>
      )}

      {error && (
        <div className="inventory-message inventory-error">
          {error}
        </div>
      )}

      {/* Summary Cards */}

      <div className="inventory-summary-grid">
        <div className="inventory-summary-card">
          <span>Total Products</span>

          <strong>
            {totalProducts}
          </strong>
        </div>

        <div className="inventory-summary-card">
          <span>Low Stock</span>

          <strong>
            {lowStockProducts}
          </strong>
        </div>

        <div className="inventory-summary-card">
          <span>Stock Value</span>

          <strong>
            ₹{totalStockValue.toFixed(2)}
          </strong>
        </div>
      </div>

      {/* Stock Operation */}

      <div className="inventory-operation-card">
        <div className="inventory-card-header">
          <div>
            <h2>
              Update Stock
            </h2>

            <p>
              Record stock in, stock out or
              stock adjustment.
            </p>
          </div>
        </div>

        <form
          className="inventory-operation-form"
          onSubmit={
            handleInventoryOperation
          }
        >
          <div className="inventory-field">
            <label htmlFor="inventory-product">
              Product
            </label>

            <select
              id="inventory-product"
              value={
                selectedProductId
              }
              onChange={(event) =>
                handleProductChange(
                  event.target.value
                )
              }
              disabled={
                saving ||
                loading
              }
            >
              <option value="">
                Select product
              </option>

              {products.map(
                (product) => (
                  <option
                    key={product.id}
                    value={product.id}
                  >
                    {product.name} —{" "}
                    {product.sku}
                  </option>
                )
              )}
            </select>
          </div>

          <div className="inventory-field">
            <label htmlFor="inventory-operation">
              Operation
            </label>

            <select
              id="inventory-operation"
              value={operation}
              onChange={(event) =>
                setOperation(
                  event.target.value as InventoryOperation
                )
              }
              disabled={saving}
            >
              <option value="STOCK_IN">
                Stock In
              </option>

              <option value="STOCK_OUT">
                Stock Out
              </option>

              <option value="ADJUSTMENT">
                Adjustment
              </option>
            </select>
          </div>

          <div className="inventory-field">
            <label htmlFor="inventory-quantity">
              {operation ===
              "ADJUSTMENT"
                ? "Adjustment Quantity"
                : "Quantity"}
            </label>

            <input
              id="inventory-quantity"
              type="number"
              step="0.01"
              value={quantity}
              onChange={(event) =>
                setQuantity(
                  event.target.value
                )
              }
              placeholder={
                operation ===
                "ADJUSTMENT"
                  ? "Example: +10 or -5"
                  : "Enter quantity"
              }
              disabled={saving}
            />

            {operation ===
              "ADJUSTMENT" && (
              <small>
                Positive values increase stock.
                Negative values decrease stock.
              </small>
            )}
          </div>

          <button
            type="submit"
            className="primary-button inventory-submit-button"
            disabled={
              saving ||
              loading ||
              !selectedProductId
            }
          >
            {saving
              ? "Updating..."
              : "Update Stock"}
          </button>
        </form>

        {currentProduct && (
          <div className="inventory-current-stock">
            <span>
              Current Stock
            </span>

            <strong>
              {
                currentProduct.currentStock
              }{" "}
              {currentProduct.unit}
            </strong>

            <small>
              Minimum:{" "}
              {
                currentProduct.minimumStock
              }{" "}
              {currentProduct.unit}
            </small>
          </div>
        )}
      </div>

      {/* Product Inventory Table */}

      <div className="inventory-card">
        <div className="inventory-card-header">
          <div>
            <h2>
              Current Inventory
            </h2>

            <p>
              Current stock and inventory
              valuation for each product.
            </p>
          </div>
        </div>

        <div className="inventory-table-wrapper">
          <table className="inventory-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>SKU</th>
                <th>Current Stock</th>
                <th>Minimum Stock</th>
                <th>Purchase Price</th>
                <th>Stock Value</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={7}
                    className="inventory-empty"
                  >
                    Loading inventory...
                  </td>
                </tr>
              ) : summary.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="inventory-empty"
                  >
                    No inventory records found.
                  </td>
                </tr>
              ) : (
                summary.map(
                  (product) => {
                    const isLowStock =
                      product.status ===
                        "ACTIVE" &&
                      product.currentStock <=
                        product.minimumStock;

                    return (
                      <tr
                        key={
                          product.productId
                        }
                      >
                        <td>
                          <strong>
                            {product.name}
                          </strong>
                        </td>

                        <td>
                          {product.sku}
                        </td>

                        <td>
                          <span
                            className={
                              isLowStock
                                ? "inventory-low-stock"
                                : "inventory-normal-stock"
                            }
                          >
                            {
                              product.currentStock
                            }{" "}
                            {product.unit}
                          </span>
                        </td>

                        <td>
                          {
                            product.minimumStock
                          }{" "}
                          {product.unit}
                        </td>

                        <td>
                          ₹
                          {product.purchasePrice.toFixed(
                            2
                          )}
                        </td>

                        <td>
                          ₹
                          {product.stockValue.toFixed(
                            2
                          )}
                        </td>

                        <td>
                          <span
                            className={
                              product.status ===
                              "ACTIVE"
                                ? "inventory-status-active"
                                : "inventory-status-inactive"
                            }
                          >
                            {
                              product.status
                            }
                          </span>
                        </td>
                      </tr>
                    );
                  }
                )
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Movement History */}

      <div className="inventory-card">
        <div className="inventory-card-header">
          <div>
            <h2>
              {selectedProductId
                ? "Product Stock History"
                : "Recent Stock Movements"}
            </h2>

            <p>
              {selectedProductId
                ? "Movement history for the selected product."
                : "Latest inventory stock movements."}
            </p>
          </div>
        </div>

        <div className="inventory-table-wrapper">
          <table className="inventory-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Quantity</th>
                <th>Reference</th>
                <th>Sync Status</th>
              </tr>
            </thead>

            <tbody>
              {loadingMovements ? (
                <tr>
                  <td
                    colSpan={5}
                    className="inventory-empty"
                  >
                    Loading movements...
                  </td>
                </tr>
              ) : movements.length ===
                0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="inventory-empty"
                  >
                    No stock movements found.
                  </td>
                </tr>
              ) : (
                movements.map(
                  (movement) => (
                    <tr
                      key={
                        movement.id
                      }
                    >
                      <td>
                        {formatDate(
                          movement.createdAt
                        )}
                      </td>

                      <td>
                        <span
                          className={`inventory-movement-badge ${getMovementClass(
                            movement.type
                          )}`}
                        >
                          {
                            movement.type
                          }
                        </span>
                      </td>

                      <td>
                        <strong>
                          {formatMovementQuantity(
                            movement
                          )}
                        </strong>
                      </td>

                      <td>
                        {movement.referenceType ||
                          "—"}
                      </td>

                      <td>
                        <span className="inventory-sync-status">
                          {
                            movement.syncStatus
                          }
                        </span>
                      </td>
                    </tr>
                  )
                )
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

export default InventoryPage;