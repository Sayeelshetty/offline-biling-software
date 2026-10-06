import {
  useEffect,
  useState,
} from "react";

import { useNavigate } from "react-router-dom";

import invoiceService from "../../services/invoice.service";

import type {
  Invoice,
  InvoiceItem,
} from  "../../types/invoice";;

import "./InvoicePage.css";

function formatCurrency(amount: number) {
  return `₹${amount.toFixed(2)}`;
}

function formatDate(dateString: string) {
  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  return date.toLocaleDateString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  );
}

function formatDateTime(dateString: string) {
  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  return date.toLocaleString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }
  );
}

function getPaymentStatusClass(
  status: Invoice["paymentStatus"]
) {
  switch (status) {
    case "PAID":
      return "invoice-status invoice-status-paid";

    case "PARTIAL":
      return "invoice-status invoice-status-partial";

    case "PENDING":
      return "invoice-status invoice-status-pending";

    case "CANCELLED":
      return "invoice-status invoice-status-cancelled";

    default:
      return "invoice-status";
  }
}

function getPaymentMethodLabel(
  method: Invoice["paymentMethod"]
) {
  switch (method) {
    case "CASH":
      return "Cash";

    case "UPI":
      return "UPI";

    case "CARD":
      return "Card";

    case "CREDIT":
      return "Credit";

    case "OTHER":
      return "Other";

    default:
      return method;
  }
}

function InvoicePage() {
  const navigate = useNavigate();

  const [invoices, setInvoices] =
    useState<Invoice[]>([]);

  const [selectedInvoice, setSelectedInvoice] =
    useState<Invoice | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const [downloadingPdf, setDownloadingPdf] =
    useState(false);

  const [sharingInvoice, setSharingInvoice] =
    useState(false);

  async function loadInvoices() {
    try {
      setLoading(true);
      setError(null);

      const result =
        await invoiceService.getRecentInvoices(
          100
        );

      setInvoices(result);

      if (selectedInvoice) {
        const refreshedInvoice =
          await invoiceService.getInvoiceById(
            selectedInvoice.id
          );

        if (refreshedInvoice) {
          setSelectedInvoice(
            refreshedInvoice
          );
        }
      } else if (result.length > 0) {
        setSelectedInvoice(result[0]);
      }
    } catch (err) {
      console.error(
        "Failed to load invoices:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Failed to load invoices."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadInvoices();
  }, []);

  function openInvoice(invoice: Invoice) {
    setSelectedInvoice(invoice);
    setError(null);
  }

  function handlePrint() {
    if (!selectedInvoice) {
      return;
    }

    window.print();
  }

  async function handleDownloadPdf() {
    if (!selectedInvoice || downloadingPdf) {
      return;
    }

    try {
      setDownloadingPdf(true);
      setError(null);

      const result =
        await invoiceService.downloadPdf(
          selectedInvoice.invoiceNumber
        );

      if (result?.canceled) {
        return;
      }

      if (result?.filePath) {
        window.alert(
          `Invoice PDF saved successfully.\n\n${result.filePath}`
        );
        return;
      }

      setError(
        "Invoice PDF could not be saved."
      );
    } catch (err) {
      console.error(
        "Failed to download invoice PDF:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Failed to download invoice PDF."
      );
    } finally {
      setDownloadingPdf(false);
    }
  }

  async function handleShare() {
  if (
    !selectedInvoice ||
    sharingInvoice
  ) {
    return;
  }

  try {
    setSharingInvoice(true);
    setError(null);

    const shareText = [
      "Invoice",
      `Bill No: ${selectedInvoice.invoiceNumber}`,
      `Date: ${formatDateTime(
        selectedInvoice.createdAt
      )}`,
      `Payment: ${getPaymentMethodLabel(
        selectedInvoice.paymentMethod
      )}`,
      `Status: ${selectedInvoice.paymentStatus}`,
      `Subtotal: ${formatCurrency(
        selectedInvoice.subtotal
      )}`,
      `Discount: ${formatCurrency(
        selectedInvoice.discount
      )}`,
      `GST / Tax: ${formatCurrency(
        selectedInvoice.tax
      )}`,
      `Total: ${formatCurrency(
        selectedInvoice.total
      )}`,
      "",
      "Thank you for your purchase.",
    ].join("\n");

    try {
      await invoiceService.shareInvoice(
        shareText
      );

      try {
        await navigator.clipboard.writeText(
          shareText
        );
      } catch {
        // Clipboard is only a fallback.
      }

      window.alert(
        "WhatsApp Web has been opened with the invoice details."
      );
    } catch (shareError) {
      console.error(
        "WhatsApp sharing failed:",
        shareError
      );

      try {
        await navigator.clipboard.writeText(
          shareText
        );

        window.alert(
          "Invoice details were copied successfully. Paste them into WhatsApp, email, or another messaging app."
        );
      } catch {
        throw shareError;
      }
    }
  } catch (err) {
    console.error(
      "Failed to share invoice:",
      err
    );

    setError(
      err instanceof Error
        ? err.message
        : "Failed to share invoice."
    );
  } finally {
    setSharingInvoice(false);
  }
}

  function handleNewBill() {
    navigate("/billing");
  }

  return (
    <section className="invoice-page">
      <div className="invoice-page-header">
        <div>
          <p className="eyebrow">
            INVOICES
          </p>

          <h1>Invoice / Receipt</h1>

          <p className="page-description">
            View generated bills and print customer
            receipts stored locally.
          </p>
        </div>

        <div className="invoice-header-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={loadInvoices}
            disabled={loading}
          >
            {loading
              ? "Refreshing..."
              : "Refresh"}
          </button>

          <button
            type="button"
            className="primary-button"
            onClick={handleNewBill}
          >
            + New Bill
          </button>
        </div>
      </div>

      {error && (
        <div className="invoice-message invoice-error">
          {error}
        </div>
      )}

      <div className="invoice-layout">
        <div className="invoice-history-card">
          <div className="invoice-history-header">
            <div>
              <p className="eyebrow">
                BILL HISTORY
              </p>

              <h2>
                Recent Invoices
              </h2>
            </div>

            <span className="invoice-count">
              {invoices.length}
            </span>
          </div>

          {loading ? (
            <div className="invoice-empty-state">
              <p>
                Loading invoices...
              </p>
            </div>
          ) : invoices.length === 0 ? (
            <div className="invoice-empty-state">
              <div className="invoice-empty-icon">
                ₹
              </div>

              <h3>
                No invoices yet
              </h3>

              <p>
                Generated bills will appear here.
              </p>

              <button
                type="button"
                className="primary-button"
                onClick={handleNewBill}
              >
                Create First Bill
              </button>
            </div>
          ) : (
            <div className="invoice-list">
              {invoices.map((invoice) => {
                const isSelected =
                  selectedInvoice?.id ===
                  invoice.id;

                return (
                  <button
                    type="button"
                    key={invoice.id}
                    className={`invoice-list-item ${
                      isSelected
                        ? "invoice-list-item-selected"
                        : ""
                    }`}
                    onClick={() =>
                      openInvoice(invoice)
                    }
                  >
                    <div className="invoice-list-main">
                      <strong>
                        {invoice.invoiceNumber}
                      </strong>

                      <span>
                        {formatDate(
                          invoice.createdAt
                        )}
                      </span>
                    </div>

                    <div className="invoice-list-side">
                      <strong>
                        {formatCurrency(
                          invoice.total
                        )}
                      </strong>

                      <span
                        className={getPaymentStatusClass(
                          invoice.paymentStatus
                        )}
                      >
                        {
                          invoice.paymentStatus
                        }
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="invoice-preview-card">
          {selectedInvoice ? (
            <>
              <div className="invoice-preview-toolbar">
                <div>
                  <p className="eyebrow">
                    BILL GENERATED
                  </p>

                  <h2>
                    {
                      selectedInvoice.invoiceNumber
                    }
                  </h2>
                </div>

                <div className="invoice-preview-actions">
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={handlePrint}
                    disabled={
                      downloadingPdf ||
                      sharingInvoice
                    }
                  >
                    Print
                  </button>

                  <button
                    type="button"
                    className="secondary-button"
                    onClick={
                      handleDownloadPdf
                    }
                    disabled={
                      downloadingPdf ||
                      sharingInvoice
                    }
                  >
                    {downloadingPdf
                      ? "Saving PDF..."
                      : "Download PDF"}
                  </button>

                  <button
                    type="button"
                    className="secondary-button"
                    onClick={handleShare}
                    disabled={
                      downloadingPdf ||
                      sharingInvoice
                    }
                  >
                    {sharingInvoice
                      ? "Sharing..."
                      : "Share"}
                  </button>

                  <button
                    type="button"
                    className="primary-button"
                    onClick={handleNewBill}
                  >
                    New Bill
                  </button>
                </div>
              </div>

              <div className="invoice-paper">
                <div className="invoice-paper-header">
                  <div>
                    <p className="invoice-business-name">
                      Offline Billing
                    </p>

                    <p className="invoice-business-subtitle">
                      POS Billing System
                    </p>
                  </div>

                  <div className="invoice-title-block">
                    <h3>
                      TAX INVOICE
                    </h3>

                    <span>
                      {
                        selectedInvoice.invoiceNumber
                      }
                    </span>
                  </div>
                </div>

                <div className="invoice-meta-grid">
                  <div>
                    <span>
                      Bill Date
                    </span>

                    <strong>
                      {formatDateTime(
                        selectedInvoice.createdAt
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Payment Method
                    </span>

                    <strong>
                      {getPaymentMethodLabel(
                        selectedInvoice.paymentMethod
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Payment Status
                    </span>

                    <strong>
                      {
                        selectedInvoice.paymentStatus
                      }
                    </strong>
                  </div>

                  <div>
                    <span>
                      Sync Status
                    </span>

                    <strong>
                      {
                        selectedInvoice.syncStatus
                      }
                    </strong>
                  </div>
                </div>

                {selectedInvoice.customerId && (
                  <div className="invoice-customer-box">
                    <span>
                      Customer
                    </span>

                    <strong>
                      Customer ID:{" "}
                      {
                        selectedInvoice.customerId
                      }
                    </strong>
                  </div>
                )}

                <div className="invoice-items-wrapper">
                  <table className="invoice-items-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Item</th>
                        <th>Qty</th>
                        <th>Rate</th>
                        <th>GST</th>
                        <th>Discount</th>
                        <th>Amount</th>
                      </tr>
                    </thead>

                    <tbody>
                      {selectedInvoice.items.map(
                        (
                          item: InvoiceItem,
                          index
                        ) => (
                          <tr key={item.id}>
                            <td>
                              {index + 1}
                            </td>

                            <td>
                              <strong>
                                {
                                  item.productName
                                }
                              </strong>
                            </td>

                            <td>
                              {item.quantity}
                            </td>

                            <td>
                              {formatCurrency(
                                item.rate
                              )}
                            </td>

                            <td>
                              {
                                item.gstRate
                              }
                              %
                            </td>

                            <td>
                              {formatCurrency(
                                item.discount
                              )}
                            </td>

                            <td>
                              {formatCurrency(
                                item.amount
                              )}
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="invoice-total-section">
                  <div className="invoice-total-notes">
                    <span>
                      Thank you for your purchase.
                    </span>

                    <small>
                      This invoice was generated
                      locally and is stored in the
                      offline database.
                    </small>
                  </div>

                  <div className="invoice-totals">
                    <div>
                      <span>
                        Subtotal
                      </span>

                      <strong>
                        {formatCurrency(
                          selectedInvoice.subtotal
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>
                        Discount
                      </span>

                      <strong>
                        {formatCurrency(
                          selectedInvoice.discount
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>
                        GST / Tax
                      </span>

                      <strong>
                        {formatCurrency(
                          selectedInvoice.tax
                        )}
                      </strong>
                    </div>

                    <div className="invoice-grand-total">
                      <span>
                        Total
                      </span>

                      <strong>
                        {formatCurrency(
                          selectedInvoice.total
                        )}
                      </strong>
                    </div>
                  </div>
                </div>

                <div className="invoice-paper-footer">
                  <span>
                    Invoice ID:{" "}
                    {selectedInvoice.id}
                  </span>

                  <span>
                    Transaction ID:{" "}
                    {
                      selectedInvoice.transactionId
                    }
                  </span>
                </div>
              </div>
            </>
          ) : (
            <div className="invoice-empty-state">
              <div className="invoice-empty-icon">
                ₹
              </div>

              <h3>
                Select an invoice
              </h3>

              <p>
                Choose a bill from the history to
                view the receipt.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export default InvoicePage;