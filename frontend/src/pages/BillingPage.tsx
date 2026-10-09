import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import productService from "../services/product.service";

import BarcodeScanner from "../components/BarcodeScanner";

import type { Product } from "../types/product";

import invoiceService from "../services/invoice.service";

import { getSettings } from "../services/settings.service";

import type {
  PaymentMethod,
  PaymentStatus,
} from "../types/invoice";

import type { Customer } from "../types/customer";

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

  const [customerSearchTerm, setCustomerSearchTerm] =
  useState("");

const [showCustomerResults, setShowCustomerResults] =
  useState(false);


const customerComboboxControlRef =
  useRef<HTMLDivElement>(null);

const [
  customerDropdownPlacement,
  setCustomerDropdownPlacement,
] = useState<"above" | "below">("below");

const [
  customerDropdownMaxHeight,
  setCustomerDropdownMaxHeight,
] = useState(240);

const [highlightedCustomerIndex, setHighlightedCustomerIndex] =
  useState(0);

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
  discountEnabled,
  setDiscountEnabled,
] = useState(true);



const [
  paymentMethods,
  setPaymentMethods,
] = useState<PaymentMethod[]>([
  "CASH",
  "UPI",
  "CARD",
  "CREDIT",
  "OTHER",
]);

  const [
    error,
    setError,
  ] = useState<string | null>(null);

  const [
    successMessage,
    setSuccessMessage,
  ] = useState<string | null>(null);


  const [showBarcodeScanner, setShowBarcodeScanner] =
  useState(false);

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

      setDiscountEnabled(
  settings.billing.discountEnabled
);

setPaymentMethods(
  settings.billing.paymentMethods
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
  if (paymentMethods.length === 0) {
    setPaymentMethod("CASH");
    return;
  }

  if (!paymentMethods.includes(paymentMethod)) {
    const nextMethod = paymentMethods[0];

    setPaymentMethod(nextMethod);

    if (nextMethod !== "CREDIT") {
      setDueDate("");
    }
  }
}, [
  paymentMethods,
  paymentMethod,
]);

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



  useEffect(() => {
  // product search logic...
}, [searchTerm]);

useEffect(() => {
  if (discountEnabled) {
    return;
  }

  setInvoiceDiscount("0");

  setCart((current) =>
    current.map((line) => ({
      ...line,
      discount: 0,
    }))
  );
}, [discountEnabled]);




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


  async function handleBarcodeDetected(barcode: string) {
  try {
    setShowBarcodeScanner(false);
    setError(null);

    const product = await productService.getProductByBarcode(barcode);

    if (!product) {
      setSearchTerm(barcode);
      setError(`No product found for barcode: ${barcode}`);
      searchInputRef.current?.focus();
      return;
    }

    addProduct(product);
  } catch (err) {
    console.error("Barcode lookup failed:", err);

    setShowBarcodeScanner(false);
    setError("Unable to find the scanned product.");
    searchInputRef.current?.focus();
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

const selectedCustomer = customers.find(
  (customer) =>
    String(customer.id) === String(selectedCustomerId)
);

const selectedCustomerLabel = selectedCustomer
  ? `${selectedCustomer.name}${
      selectedCustomer.mobile
        ? ` — ${selectedCustomer.mobile}`
        : ""
    }`
  : "Walk-in Customer";

const normalizedCustomerQuery =
  customerSearchTerm.trim().toLowerCase();

const filteredCustomers = customers.filter((customer) => {
  const name = String(customer.name ?? "").toLowerCase();
  const mobile = String(customer.mobile ?? "").toLowerCase();

  return (
    name.includes(normalizedCustomerQuery) ||
    mobile.includes(normalizedCustomerQuery)
  );
});

const updateCustomerDropdownPosition = (
  ensureSpaceBelow = false
) => {
  const control = customerComboboxControlRef.current;

  if (!control) return;

  let rect = control.getBoundingClientRect();

  let spaceBelow =
    (document.documentElement.clientHeight || window.innerHeight) -
    rect.bottom -
    12;

  // When needed, move the customer field into view so
  // the dropdown has room to open downward.
  if (ensureSpaceBelow && spaceBelow < 280) {
    control.scrollIntoView({
      block: "center",
      behavior: "auto",
    });

    rect = control.getBoundingClientRect();

    spaceBelow =
      (document.documentElement.clientHeight || window.innerHeight) -
      rect.bottom -
      12;
  }

  // Always open below the input.
  setCustomerDropdownPlacement("below");

  setCustomerDropdownMaxHeight(
    Math.max(100, Math.min(260, spaceBelow - 8))
  );
};

const handleCustomerSelect = (customer: Customer | null) => {
  setSelectedCustomerId(
    customer ? String(customer.id) : ""
  );

  setCustomerSearchTerm("");
  setShowCustomerResults(false);
  setHighlightedCustomerIndex(0);
};

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


         <button
  type="button"
  className="billing-camera-button"
  onClick={() => {
    setError(null);
    setShowBarcodeScanner(true);
  }}
>
  <svg
    className="billing-camera-icon"
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
  >
    <path
      d="M4 8.5A2.5 2.5 0 0 1 6.5 6h2l1.5-2h4l1.5 2h2A2.5 2.5 0 0 1 20 8.5v9a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 17.5v-9Z"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle
      cx="12"
      cy="12.5"
      r="3.2"
      stroke="currentColor"
      strokeWidth="1.7"
    />
  </svg>

  <span>Scan with Camera</span>
</button>

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
               <div className="empty-icon" aria-hidden="true">
  <svg
    viewBox="0 0 48 48"
    fill="none"
    focusable="false"
  >
    <path
      d="M6.5 9h5l4.5 21h19l5-15.5H14"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />

    <circle
      cx="20"
      cy="36"
      r="2.2"
      stroke="currentColor"
      strokeWidth="2"
    />

    <circle
      cx="34"
      cy="36"
      r="2.2"
      stroke="currentColor"
      strokeWidth="2"
    />

    <circle
      cx="36"
      cy="10"
      r="8"
      fill="#dcfce7"
      stroke="#86efac"
      strokeWidth="1.2"
    />

    <path
      d="M36 6.5v7M32.5 10h7"
      stroke="#15803d"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
  </svg>
</div>
                <h3>No products added</h3>

<p>
  Search above or scan a barcode to add your first item.
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
    generatingBill ||
    !discountEnabled
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
  <label htmlFor="billing-customer-search">
    Customer
  </label>

  <div className="customer-combobox">
    <div
      className="customer-combobox-control"
      ref={customerComboboxControlRef}
    >
      <input
        id="billing-customer-search"
        className="customer-search-input"
        type="text"
        role="combobox"
        aria-autocomplete="list"
        aria-haspopup="listbox"
        aria-expanded={showCustomerResults}
        aria-controls="billing-customer-options"
        autoComplete="off"
        spellCheck={false}
        placeholder={
          loadingCustomers
            ? "Loading customers..."
            : "Search by name or phone number..."
        }
        value={
          showCustomerResults
            ? customerSearchTerm
            : selectedCustomerLabel
        }
        disabled={generatingBill || loadingCustomers}
        onFocus={() => {
          setCustomerSearchTerm("");
          setHighlightedCustomerIndex(0);
          setShowCustomerResults(true);
          updateCustomerDropdownPosition();
        }}
        onChange={(event) => {
          const value = event.target.value;
          const query = value.trim().toLowerCase();

          setCustomerSearchTerm(value);
          setShowCustomerResults(true);

          const hasMatch = customers.some(
            (customer) =>
              String(customer.name ?? "")
                .toLowerCase()
                .includes(query) ||
              String(customer.mobile ?? "")
                .toLowerCase()
                .includes(query)
          );

          setHighlightedCustomerIndex(
            query && hasMatch ? 1 : 0
          );

          updateCustomerDropdownPosition();
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            setCustomerSearchTerm("");
            setShowCustomerResults(false);
            setHighlightedCustomerIndex(0);
          }

          if (
            event.key === "ArrowDown" &&
            showCustomerResults
          ) {
            event.preventDefault();
            setHighlightedCustomerIndex((current) =>
              Math.min(current + 1, filteredCustomers.length)
            );
          }

          if (
            event.key === "ArrowUp" &&
            showCustomerResults
          ) {
            event.preventDefault();
            setHighlightedCustomerIndex((current) =>
              Math.max(current - 1, 0)
            );
          }

          if (
            event.key === "Enter" &&
            showCustomerResults
          ) {
            event.preventDefault();

            if (highlightedCustomerIndex === 0) {
              if (!customerSearchTerm.trim()) {
                handleCustomerSelect(null);
              }

              return;
            }

            const customer =
              filteredCustomers[highlightedCustomerIndex - 1];

            if (customer) {
              handleCustomerSelect(customer);
            }
          }
        }}
        onBlur={() => {
          setShowCustomerResults(false);
          setCustomerSearchTerm("");
          setHighlightedCustomerIndex(0);
        }}
      />

      <span
        className="customer-combobox-chevron"
        aria-hidden="true"
      >
        ▾
      </span>
    </div>

    {showCustomerResults && !loadingCustomers && (
      <div
        id="billing-customer-options"
        className={`customer-options ${
          customerDropdownPlacement === "above"
            ? "opens-above"
            : ""
        }`}
        style={{
          maxHeight: `${customerDropdownMaxHeight}px`,
        }}
        role="listbox"
      >
        <button
          id="customer-option-walk-in"
          type="button"
          role="option"
          aria-selected={!selectedCustomerId}
          className={`customer-option ${
            !selectedCustomerId ? "is-selected" : ""
          } ${
            highlightedCustomerIndex === 0
              ? "is-highlighted"
              : ""
          }`}
          onPointerDown={(event) => event.preventDefault()}
          onClick={() => handleCustomerSelect(null)}
        >
          <span className="customer-option-name">
            Walk-in Customer
          </span>
          <span className="customer-option-detail">
            No saved customer required
          </span>
        </button>

        {filteredCustomers.length === 0 ? (
          <div className="customer-options-empty">
            <strong>No matching customers</strong>
            <span>Try another name or phone number.</span>
          </div>
        ) : (
          filteredCustomers.map((customer, index) => {
            const isSelected =
              String(customer.id) === String(selectedCustomerId);

            const isHighlighted =
              highlightedCustomerIndex === index + 1;

            return (
              <button
                id={`customer-option-${index + 1}`}
                key={customer.id}
                type="button"
                role="option"
                aria-selected={isSelected}
                className={`customer-option ${
                  isSelected ? "is-selected" : ""
                } ${
                  isHighlighted ? "is-highlighted" : ""
                }`}
                onPointerDown={(event) =>
                  event.preventDefault()
                }
                onClick={() => handleCustomerSelect(customer)}
              >
                <span className="customer-option-name">
                  {customer.name}
                </span>

                <span className="customer-option-detail">
                  {customer.mobile || "No phone number"}
                </span>
              </button>
            );
          })
        )}
      </div>
    )}
  </div>
</div>
            <button
              type="button"
              className="clear-bill-button"
              onClick={clearBill}
              disabled={
                 generatingBill ||
  cart.length === 0 ||
  !discountEnabled
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
  onChange={(event) => {
    setInvoiceDiscount(
      event.target.value
    );
  }}
  disabled={
    generatingBill ||
    cart.length === 0 ||
    !discountEnabled
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

       <div className="billing-payment-container">
  <div className="payment-section">
    <label>
      Payment Method
    </label>
          

  <div className="payment-methods">
    {paymentMethods.length === 0 ? (
      <p>
        No payment methods are enabled.
      </p>
    ) : (
      paymentMethods.map((method) => (
        <button
          key={method}
          type="button"
          className={
            paymentMethod === method
              ? "payment-method active"
              : "payment-method"
          }
          onClick={() => {
            setPaymentMethod(method);
          }}
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
      ))
    )}
  </div>

  {paymentMethod === "CREDIT" && (
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
          onChange={(event) => {
            setDueDate(
              event.target.value
            );
          }}
          disabled={generatingBill}
        />
      </div>
    </div>
  )}
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

        </aside>
       </div>

      {showBarcodeScanner && (
        <BarcodeScanner
          onDetected={handleBarcodeDetected}
          onClose={() => setShowBarcodeScanner(false)}
        />
      )}
    </section>
  );
}

export default BillingPage;