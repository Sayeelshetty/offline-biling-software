import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import productService, {
  type Product,
} from "../services/product.service";

import {
  getSettings,
} from "../services/settings.service";

import invoiceService from "../services/invoice.service";

import type {
  PaymentMethod,
  PaymentStatus,
} from "../../../shared/types/invoice";

import type {
  Customer,
} from "../../../shared/types/customer";

import "./BillingPage.css";

type BillingLine = {
  product: Product;
  quantity: number;
  discount: number;
};

type CustomerApi = {
  getAllCustomers?: () => Promise<Customer[]>;
  getAll?: () => Promise<Customer[]>;
};

const DEVICE_STORAGE_KEY =
  "offline-billing-device-id";

function getDeviceId(): string {
  const existing = localStorage.getItem(
    DEVICE_STORAGE_KEY
  );

  if (existing) {
    return existing;
  }

  const generated =
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `device-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2)}`;

  localStorage.setItem(
    DEVICE_STORAGE_KEY,
    generated
  );

  return generated;
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function formatCurrency(value: number): string {
  return `₹${value.toFixed(2)}`;
}

function calculateLineAmount(
  line: BillingLine
): number {
  const gross =
    line.quantity * line.product.sellingPrice;

  return Math.max(
    0,
    gross - line.discount
  );
}

function getEffectiveGstRate(
  _line: BillingLine,
  taxEnabled: boolean,
  defaultGstRate: number
): number {
  if (!taxEnabled) {
    return 0;
  }

  const configuredGstRate =
    Number(defaultGstRate);

  if (
    Number.isFinite(configuredGstRate) &&
    configuredGstRate >= 0
  ) {
    return configuredGstRate;
  }

  return 0;
}

function calculateLineTax(
  line: BillingLine,
  taxEnabled: boolean,
  defaultGstRate: number
): number {
  const taxableAmount =
    calculateLineAmount(line);

  const gstRate =
    getEffectiveGstRate(
      line,
      taxEnabled,
      defaultGstRate
    );

  return (
    taxableAmount *
    (gstRate / 100)
  );
}

function BillingPage() {
  const [
    searchTerm,
    setSearchTerm,
  ] = useState("");

  const [
    searchResults,
    setSearchResults,
  ] = useState<Product[]>([]);

  const [cart, setCart] =
    useState<BillingLine[]>([]);

  const [
    customers,
    setCustomers,
  ] = useState<Customer[]>([]);

  const [
    selectedCustomerId,
    setSelectedCustomerId,
  ] = useState<string>("");

  const [
    paymentMethod,
    setPaymentMethod,
  ] = useState<PaymentMethod>("CASH");

  const [
    dueDate,
    setDueDate,
  ] = useState("");

  const [
    invoiceDiscount,
    setInvoiceDiscount,
  ] = useState("0");

  const [
    loadingProducts,
    setLoadingProducts,
  ] = useState(false);

  const [
    loadingCustomers,
    setLoadingCustomers,
  ] = useState(false);

  const [
    generatingBill,
    setGeneratingBill,
  ] = useState(false);

  const [
  taxEnabled,
  setTaxEnabled,
] = useState(true);

const [
  defaultGstRate,
  setDefaultGstRate,
] = useState(5);

  const [
    error,
    setError,
  ] = useState<string | null>(null);

  const [
    successMessage,
    setSuccessMessage,
  ] = useState<string | null>(null);

  const searchInputRef =
    useRef<HTMLInputElement | null>(null);

  const totals = useMemo(() => {
    const subtotal = cart.reduce(
      (sum, line) =>
        sum + line.quantity * line.product.sellingPrice,
      0
    );

    const itemDiscount = cart.reduce(
      (sum, line) => sum + line.discount,
      0
    );

    const requestedInvoiceDiscount = Number(
      invoiceDiscount
    );

    const safeInvoiceDiscount =
      Number.isNaN(requestedInvoiceDiscount)
        ? 0
        : Math.max(0, requestedInvoiceDiscount);

    const maxInvoiceDiscount = Math.max(
      0,
      subtotal - itemDiscount
    );

    const finalInvoiceDiscount = Math.min(
      safeInvoiceDiscount,
      maxInvoiceDiscount
    );

    const taxableBeforeInvoiceDiscount =
      cart.reduce(
        (sum, line) =>
          sum + calculateLineAmount(line),
        0
      );

    let remainingDiscount =
      finalInvoiceDiscount;

    let tax = 0;

    for (const line of cart) {
      const lineAmount =
        calculateLineAmount(line);

      const proportion =
        taxableBeforeInvoiceDiscount > 0
          ? lineAmount /
            taxableBeforeInvoiceDiscount
          : 0;

      const allocatedDiscount =
        finalInvoiceDiscount * proportion;

      const taxableLineAmount = Math.max(
        0,
        lineAmount - allocatedDiscount
      );

     tax +=
  taxableLineAmount *
  (
    getEffectiveGstRate(
      line,
      taxEnabled,
      defaultGstRate
    ) / 100
  );

      remainingDiscount -= allocatedDiscount;
    }

    if (Math.abs(remainingDiscount) > 0.01) {
      tax = Math.max(0, tax);
    }

    const totalDiscount =
      itemDiscount +
      finalInvoiceDiscount;

    const total =
      Math.max(
        0,
        subtotal - totalDiscount
      ) + tax;

    return {
      subtotal: roundMoney(subtotal),
      itemDiscount: roundMoney(itemDiscount),
      invoiceDiscount: roundMoney(
        finalInvoiceDiscount
      ),
      totalDiscount: roundMoney(totalDiscount),
      tax: roundMoney(tax),
      total: roundMoney(total),
    };
 }, [
  cart,
  invoiceDiscount,
  taxEnabled,
  defaultGstRate,
]);

  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  useEffect(() => {
    loadCustomers();
  }, []);

  useEffect(() => {
  async function loadBillingSettings() {
    try {
      const settings =
        await getSettings();

      setTaxEnabled(
        settings.billing.taxEnabled
      );

      setDefaultGstRate(
        settings.billing.defaultGstRate
      );
    } catch (error) {
      console.error(
        "Failed to load billing settings:",
        error
      );
    }
  }

  loadBillingSettings();
}, []);

  useEffect(() => {
    const trimmed = searchTerm.trim();

    if (!trimmed) {
      setSearchResults([]);
      return;
    }

    const timer = window.setTimeout(
      async () => {
        try {
          setLoadingProducts(true);
          setError(null);

          const products =
            await productService.searchProducts(
              trimmed,
              false
            );

          setSearchResults(products);
        } catch (err) {
          console.error(
            "Failed to search products:",
            err
          );

          setError(
            err instanceof Error
              ? err.message
              : "Failed to search products."
          );

          setSearchResults([]);
        } finally {
          setLoadingProducts(false);
        }
      },
      150
    );

    return () => {
      window.clearTimeout(timer);
    };
  }, [searchTerm]);

  async function loadCustomers() {
    try {
      setLoadingCustomers(true);

      const customerApi =
        window.desktopAPI?.customers as unknown as
          | CustomerApi
          | undefined;

      if (!customerApi) {
        throw new Error(
          "Customer API is not available."
        );
      }

      let result: Customer[] = [];

      if (customerApi.getAllCustomers) {
        result =
          await customerApi.getAllCustomers();
      } else if (customerApi.getAll) {
        result = await customerApi.getAll();
      } else {
        throw new Error(
          "Customer list API is not available."
        );
      }

      setCustomers(result);
    } catch (err) {
      console.error(
        "Failed to load customers:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Failed to load customers."
      );
    } finally {
      setLoadingCustomers(false);
    }
  }

  function addProduct(product: Product) {
    setError(null);
    setSuccessMessage(null);

    if (product.currentStock <= 0) {
      setError(
        `${product.name} is out of stock.`
      );
      return;
    }

    setCart((current) => {
      const existing = current.find(
        (line) =>
          line.product.id === product.id
      );

      if (existing) {
        if (
          existing.quantity >=
          product.currentStock
        ) {
          return current;
        }

        return current.map((line) =>
          line.product.id === product.id
            ? {
                ...line,
                quantity:
                  line.quantity + 1,
              }
            : line
        );
      }

      return [
        ...current,
        {
          product,
          quantity: 1,
          discount: 0,
        },
      ];
    });

    setSearchTerm("");
    setSearchResults([]);

    searchInputRef.current?.focus();
  }

  function updateQuantity(
    productId: string,
    quantity: number
  ) {
    setCart((current) =>
      current.map((line) => {
        if (line.product.id !== productId) {
          return line;
        }

        const safeQuantity = Math.max(
          1,
          Math.min(
            Math.floor(quantity),
            line.product.currentStock
          )
        );

        return {
          ...line,
          quantity: safeQuantity,
        };
      })
    );
  }

  function updateLineDiscount(
    productId: string,
    discount: number
  ) {
    setCart((current) =>
      current.map((line) => {
        if (line.product.id !== productId) {
          return line;
        }

        const gross =
          line.quantity *
          line.product.sellingPrice;

        return {
          ...line,
          discount: Math.min(
            Math.max(0, discount),
            gross
          ),
        };
      })
    );
  }

  function removeProduct(
    productId: string
  ) {
    setCart((current) =>
      current.filter(
        (line) =>
          line.product.id !== productId
      )
    );
  }

  function clearBill() {
    setCart([]);
    setSelectedCustomerId("");
    setPaymentMethod("CASH");
    setDueDate("");
    setInvoiceDiscount("0");
    setError(null);
    setSuccessMessage(null);

    window.setTimeout(() => {
      searchInputRef.current?.focus();
    }, 50);
  }

  function getPaymentStatus(): PaymentStatus {
    if (paymentMethod === "CREDIT") {
      return "PENDING";
    }

    return "PAID";
  }

  async function handleGenerateBill() {
    setError(null);
    setSuccessMessage(null);

    if (cart.length === 0) {
      setError(
        "Add at least one product to the bill."
      );
      return;
    }

    if (paymentMethod === "CREDIT") {
      if (!selectedCustomerId) {
        setError(
          "Select a customer for a credit transaction."
        );
        return;
      }

      if (!dueDate) {
        setError(
          "Select a due date for the credit transaction."
        );
        return;
      }
    }

    try {
      setGeneratingBill(true);

      const result =
        await invoiceService.createInvoice({
          customerId:
            selectedCustomerId || null,

          items: cart.map((line) => ({
            productId: line.product.id,
            productName: line.product.name,
            quantity: line.quantity,
            rate: line.product.sellingPrice,
            gstRate:
  getEffectiveGstRate(
    line,
    taxEnabled,
    defaultGstRate
  ),
            discount: line.discount,
          })),

          discount: totals.invoiceDiscount,

          paymentMethod,

          paymentStatus:
            getPaymentStatus(),

          paymentAmount:
            paymentMethod === "CREDIT"
              ? 0
              : totals.total,

          dueDate:
            paymentMethod === "CREDIT"
              ? dueDate
              : null,

          deviceId: getDeviceId(),
        });

      setSuccessMessage(
        `Bill generated successfully. ${result.invoice.invoiceNumber} — ${formatCurrency(
          result.invoice.total
        )}`
      );

      setCart([]);
      setSelectedCustomerId("");
      setPaymentMethod("CASH");
      setDueDate("");
      setInvoiceDiscount("0");

      window.setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } catch (err) {
      console.error(
        "Failed to generate bill:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Failed to generate bill."
      );
    } finally {
      setGeneratingBill(false);
    }
  }

  return (
    <section className="billing-page">
      <div className="billing-header">
        <div>
          <p className="eyebrow">
            BILLING
          </p>

          <h1>New Bill</h1>

          <p className="billing-description">
            Search products, add quantities and
            generate a bill completely offline.
          </p>
        </div>

        <div className="billing-status">
          <span className="status-dot" />
          <span>Local billing ready</span>
        </div>
      </div>

      {successMessage && (
        <div className="billing-message billing-success">
          {successMessage}
        </div>
      )}

      {error && (
        <div className="billing-message billing-error">
          {error}
        </div>
      )}

      <div className="billing-layout">
        <div className="billing-main-card">
          <div className="product-search-section">
            <label
              htmlFor="billing-product-search"
            >
              Search / Scan Product
            </label>

            <div className="billing-search-wrapper">
              <input
                ref={searchInputRef}
                id="billing-product-search"
                type="text"
                value={searchTerm}
                onChange={(event) =>
                  setSearchTerm(
                    event.target.value
                  )
                }
                placeholder="Search by product name, SKU or barcode..."
                autoComplete="off"
              />

              <span className="search-shortcut">
                Scanner / Enter
              </span>
            </div>

            {searchTerm.trim() && (
              <div className="search-results">
                {loadingProducts ? (
                  <div className="search-loading">
                    Searching...
                  </div>
                ) : searchResults.length ===
                  0 ? (
                  <div className="search-empty">
                    No active products found.
                  </div>
                ) : (
                  searchResults.map(
                    (product) => (
                      <button
                        key={product.id}
                        type="button"
                        className="search-result-item"
                        onClick={() =>
                          addProduct(product)
                        }
                      >
                        <span>
                          <strong>
                            {product.name}
                          </strong>

                          <small>
                            SKU:{" "}
                            {product.sku}

                            {product.barcode
                              ? ` • Barcode: ${product.barcode}`
                              : ""}
                          </small>
                        </span>

                        <span className="search-result-meta">
                          <strong>
                            {formatCurrency(
                              product.sellingPrice
                            )}
                          </strong>

                          <small>
                            Stock:{" "}
                            {
                              product.currentStock
                            }
                          </small>
                        </span>
                      </button>
                    )
                  )
                )}
              </div>
            )}
          </div>

          <div className="billing-table-wrapper">
            {cart.length === 0 ? (
              <div className="billing-empty-state">
                <div className="empty-icon">
                  +
                </div>

                <h3>
                  No products added
                </h3>

                <p>
                  Search for a product above
                  to start a new bill.
                </p>
              </div>
            ) : (
              <table className="billing-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Qty</th>
                    <th>Rate</th>
                    <th>Discount</th>
                    <th>GST</th>
                    <th>Amount</th>
                    <th />
                  </tr>
                </thead>

                <tbody>
                  {cart.map((line) => {
                    const gross =
                      line.quantity *
                      line.product
                        .sellingPrice;

                    const amount =
                      calculateLineAmount(
                        line
                      );

                    return (
                      <tr
                        key={line.product.id}
                      >
                        <td>
                          <div className="bill-product">
                            <strong>
                              {line.product.name}
                            </strong>

                            <span>
                              {
                                line.product
                                  .sku
                              }
                            </span>
                          </div>
                        </td>

                        <td>
                          <div className="quantity-control">
                            <button
                              type="button"
                              onClick={() =>
                                updateQuantity(
                                  line
                                    .product
                                    .id,
                                  line.quantity -
                                    1
                                )
                              }
                              disabled={
                                line.quantity <=
                                  1 ||
                                generatingBill
                              }
                            >
                              −
                            </button>

                            <input
                              type="number"
                              min="1"
                              max={
                                line.product
                                  .currentStock
                              }
                              value={
                                line.quantity
                              }
                              onChange={(
                                event
                              ) =>
                                updateQuantity(
                                  line
                                    .product
                                    .id,
                                  Number(
                                    event
                                      .target
                                      .value
                                  )
                                )
                              }
                              disabled={
                                generatingBill
                              }
                            />

                            <button
                              type="button"
                              onClick={() =>
                                updateQuantity(
                                  line
                                    .product
                                    .id,
                                  line.quantity +
                                    1
                                )
                              }
                              disabled={
                                line.quantity >=
                                  line.product
                                    .currentStock ||
                                generatingBill
                              }
                            >
                              +
                            </button>
                          </div>
                        </td>

                        <td>
                          {formatCurrency(
                            line.product
                              .sellingPrice
                          )}
                        </td>

                        <td>
                          <input
                            className="line-discount-input"
                            type="number"
                            min="0"
                            max={gross}
                            step="0.01"
                            value={
                              line.discount
                            }
                            onChange={(
                              event
                            ) =>
                              updateLineDiscount(
                                line
                                  .product
                                  .id,
                                Number(
                                  event.target
                                    .value
                                )
                              )
                            }
                            disabled={
                              generatingBill
                            }
                          />
                        </td>

                        <td>
                         {getEffectiveGstRate(
  line,
  taxEnabled,
  defaultGstRate
)}
%
                        </td>

                        <td>
                          <strong>
                            {formatCurrency(
                              amount
                            )}
                          </strong>
                        </td>

                        <td>
                          <button
                            type="button"
                            className="remove-line-button"
                            onClick={() =>
                              removeProduct(
                                line
                                  .product
                                  .id
                              )
                            }
                            disabled={
                              generatingBill
                            }
                          >
                            ×
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          <div className="billing-bottom-tools">
            <div className="customer-field">
              <label htmlFor="billing-customer">
                Customer
              </label>

              <select
                id="billing-customer"
                value={selectedCustomerId}
                onChange={(event) =>
                  setSelectedCustomerId(
                    event.target.value
                  )
                }
                disabled={
                  generatingBill ||
                  loadingCustomers
                }
              >
                <option value="">
                  Walk-in Customer
                </option>

                {customers.map(
                  (customer) => (
                    <option
                      key={customer.id}
                      value={customer.id}
                    >
                      {customer.name} —{" "}
                      {customer.mobile}
                    </option>
                  )
                )}
              </select>
            </div>

            <button
              type="button"
              className="clear-bill-button"
              onClick={clearBill}
              disabled={
                cart.length === 0 ||
                generatingBill
              }
            >
              Clear Bill
            </button>
          </div>
        </div>

        <aside className="billing-summary-card">
          <div className="summary-heading">
            <div>
              <p>ORDER SUMMARY</p>
              <h2>Bill Summary</h2>
            </div>

            <span className="item-count">
              {cart.length} items
            </span>
          </div>

          <div className="summary-lines">
            <div>
              <span>Subtotal</span>
              <strong>
                {formatCurrency(
                  totals.subtotal
                )}
              </strong>
            </div>

            <div>
              <span>Item Discount</span>
              <strong>
                −{" "}
                {formatCurrency(
                  totals.itemDiscount
                )}
              </strong>
            </div>

            <div className="invoice-discount-row">
              <label htmlFor="invoice-discount">
                Bill Discount
              </label>

              <input
                id="invoice-discount"
                type="number"
                min="0"
                step="0.01"
                value={invoiceDiscount}
                onChange={(event) =>
                  setInvoiceDiscount(
                    event.target.value
                  )
                }
                disabled={
                  generatingBill ||
                  cart.length === 0
                }
              />
            </div>

            <div>
              <span>GST / Tax</span>
              <strong>
                {formatCurrency(
                  totals.tax
                )}
              </strong>
            </div>
          </div>

          <div className="summary-total">
            <span>Total</span>

            <strong>
              {formatCurrency(
                totals.total
              )}
            </strong>
          </div>

          <div className="payment-section">
            <label>
              Payment Method
            </label>

            <div className="payment-methods">
              {(
                [
                  "CASH",
                  "UPI",
                  "CARD",
                  "CREDIT",
                  "OTHER",
                ] as PaymentMethod[]
              ).map((method) => (
                <button
                  key={method}
                  type="button"
                  className={
                    paymentMethod === method
                      ? "payment-method active"
                      : "payment-method"
                  }
                  onClick={() =>
                    setPaymentMethod(
                      method
                    )
                  }
                  disabled={generatingBill}
                >
                  {method === "CASH"
                    ? "Cash"
                    : method === "UPI"
                    ? "UPI"
                    : method === "CARD"
                    ? "Card"
                    : method === "CREDIT"
                    ? "Credit"
                    : "Other"}
                </button>
              ))}
            </div>
          </div>

          {paymentMethod ===
            "CREDIT" && (
            <div className="credit-section">
              <div className="credit-note">
                Credit payment requires a
                customer and due date.
              </div>

              <div className="credit-field">
                <label htmlFor="credit-due-date">
                  Due Date
                </label>

                <input
                  id="credit-due-date"
                  type="date"
                  value={dueDate}
                  onChange={(event) =>
                    setDueDate(
                      event.target.value
                    )
                  }
                  disabled={generatingBill}
                />
              </div>
            </div>
          )}

          <button
            type="button"
            className="generate-bill-button"
            onClick={
              handleGenerateBill
            }
            disabled={
              generatingBill ||
              cart.length === 0
            }
          >
            {generatingBill
              ? "Generating Bill..."
              : "Generate Bill"}
          </button>

          <p className="offline-note">
            Bill is saved locally first. Cloud
            synchronisation will be handled by
            the sync module.
          </p>
        </aside>
      </div>
    </section>
  );
}

export default BillingPage;