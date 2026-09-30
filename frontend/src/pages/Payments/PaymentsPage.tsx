import { useEffect, useState } from "react";

import paymentService from "../../services/payment.service";

import type {
  OutstandingPayment,
  PaymentMethod,
  PaymentSummary,
} from "../../../shared/types/payment";

import "./PaymentsPage.css";

const PAYMENT_METHODS: Array<{
  value: "CASH" | "UPI" | "CARD" | "OTHER";
  label: string;
}> = [
  {
    value: "CASH",
    label: "Cash",
  },
  {
    value: "UPI",
    label: "UPI",
  },
  {
    value: "CARD",
    label: "Card",
  },
  {
    value: "OTHER",
    label: "Other",
  },
];

function getDeviceId() {
  const storageKey = "offline-billing-device-id";

  const existingId =
    window.localStorage.getItem(storageKey);

  if (existingId) {
    return existingId;
  }

  const newId = `DEVICE-${crypto.randomUUID()}`;

  window.localStorage.setItem(
    storageKey,
    newId
  );

  return newId;
}

function formatCurrency(amount: number) {
  return `₹${amount.toFixed(2)}`;
}

function formatDate(dateString: string | null) {
  if (!dateString) {
    return "—";
  }

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getStatusClass(
  status: OutstandingPayment["paymentStatus"]
) {
  if (status === "PAID") {
    return "payment-status payment-status-paid";
  }

  if (status === "PARTIAL") {
    return "payment-status payment-status-partial";
  }

  return "payment-status payment-status-pending";
}

function PaymentsPage() {
  const [summary, setSummary] =
    useState<PaymentSummary>({
      totalPayments: 0,
      totalPaid: 0,
      totalOutstanding: 0,
    });

  const [outstandingPayments, setOutstandingPayments] =
    useState<OutstandingPayment[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const [message, setMessage] =
    useState<string | null>(null);

  const [selectedPayment, setSelectedPayment] =
    useState<OutstandingPayment | null>(null);

  const [paymentAmount, setPaymentAmount] =
    useState("");

  const [paymentMethod, setPaymentMethod] =
    useState<
      "CASH" | "UPI" | "CARD" | "OTHER"
    >("CASH");

  const [saving, setSaving] =
    useState(false);

  async function loadPayments() {
    try {
      setLoading(true);
      setError(null);

      const [
        paymentSummary,
        outstanding,
      ] = await Promise.all([
        paymentService.getPaymentSummary(),
        paymentService.getOutstandingPayments(),
      ]);

      setSummary(paymentSummary);
      setOutstandingPayments(outstanding);
    } catch (err) {
      console.error(
        "Failed to load payments:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Failed to load payments."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPayments();
  }, []);

  function openCollectPayment(
    payment: OutstandingPayment
  ) {
    setSelectedPayment(payment);

    setPaymentAmount(
      payment.outstandingAmount.toFixed(2)
    );

    setPaymentMethod("CASH");

    setMessage(null);
    setError(null);
  }

  function closeCollectPayment() {
    if (saving) {
      return;
    }

    setSelectedPayment(null);
    setPaymentAmount("");
    setPaymentMethod("CASH");
  }

  async function handleRecordPayment() {
    if (!selectedPayment) {
      return;
    }

    const amount = Number(paymentAmount);

    if (
      Number.isNaN(amount) ||
      amount <= 0
    ) {
      setError(
        "Enter a valid payment amount."
      );

      return;
    }

    if (
      amount >
      selectedPayment.outstandingAmount +
        0.009
    ) {
      setError(
        `Payment cannot exceed the outstanding amount of ${formatCurrency(
          selectedPayment.outstandingAmount
        )}.`
      );

      return;
    }

    try {
      setSaving(true);
      setError(null);
      setMessage(null);

      await paymentService.recordPayment({
        invoiceId:
          selectedPayment.invoiceId,

        customerId:
          selectedPayment.customerId,

        amount,

        method:
          paymentMethod as PaymentMethod,

        dueDate:
          selectedPayment.dueDate,

        deviceId: getDeviceId(),
      });

      setMessage(
        `${formatCurrency(
          amount
        )} payment recorded successfully for ${selectedPayment.invoiceNumber}.`
      );

      closeCollectPayment();

      await loadPayments();
    } catch (err) {
      console.error(
        "Failed to record payment:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Failed to record payment."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="payments-page">
      <div className="payments-header">
        <div>
          <p className="eyebrow">
            PAYMENTS
          </p>

          <h1>Payment Management</h1>

          <p className="page-description">
            Track payments and collect outstanding
            customer balances offline.
          </p>
        </div>

        <button
          type="button"
          className="secondary-button"
          onClick={loadPayments}
          disabled={loading}
        >
          {loading
            ? "Refreshing..."
            : "Refresh"}
        </button>
      </div>

      {message && (
        <div className="payment-message payment-success">
          {message}
        </div>
      )}

      {error && (
        <div className="payment-message payment-error">
          {error}
        </div>
      )}

      <div className="payment-summary-grid">
        <div className="payment-summary-card">
          <span>Total Payments</span>

          <strong>
            {summary.totalPayments}
          </strong>

          <small>
            Payment records stored locally
          </small>
        </div>

        <div className="payment-summary-card">
          <span>Total Paid</span>

          <strong>
            {formatCurrency(
              summary.totalPaid
            )}
          </strong>

          <small>
            All non-cancelled payments
          </small>
        </div>

        <div className="payment-summary-card outstanding-summary-card">
          <span>Outstanding</span>

          <strong>
            {formatCurrency(
              summary.totalOutstanding
            )}
          </strong>

          <small>
            Amount still due from customers
          </small>
        </div>
      </div>

      <div className="payments-section-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">
              CREDIT BALANCES
            </p>

            <h2>
              Outstanding Payments
            </h2>
          </div>

          <span className="outstanding-count">
            {outstandingPayments.length}{" "}
            {outstandingPayments.length === 1
              ? "invoice"
              : "invoices"}
          </span>
        </div>

        {loading ? (
          <div className="payment-empty-state">
            <p>
              Loading outstanding payments...
            </p>
          </div>
        ) : outstandingPayments.length ===
          0 ? (
          <div className="payment-empty-state">
            <div className="empty-icon">
              ✓
            </div>

            <h3>
              No outstanding payments
            </h3>

            <p>
              All credit invoices are currently
              settled.
            </p>
          </div>
        ) : (
          <div className="payments-table-wrapper">
            <table className="payments-table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Invoice</th>
                  <th>Total</th>
                  <th>Paid</th>
                  <th>Outstanding</th>
                  <th>Due Date</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {outstandingPayments.map(
                  (payment) => (
                    <tr key={payment.invoiceId}>
                      <td>
                        <div className="customer-cell">
                          <strong>
                            {
                              payment.customerName
                            }
                          </strong>

                          <span>
                            Customer
                          </span>
                        </div>
                      </td>

                      <td>
                        <strong>
                          {
                            payment.invoiceNumber
                          }
                        </strong>
                      </td>

                      <td>
                        {formatCurrency(
                          payment.invoiceTotal
                        )}
                      </td>

                      <td>
                        {formatCurrency(
                          payment.paidAmount
                        )}
                      </td>

                      <td>
                        <strong className="outstanding-amount">
                          {formatCurrency(
                            payment.outstandingAmount
                          )}
                        </strong>
                      </td>

                      <td>
                        {formatDate(
                          payment.dueDate
                        )}
                      </td>

                      <td>
                        <span
                          className={getStatusClass(
                            payment.paymentStatus
                          )}
                        >
                          {
                            payment.paymentStatus
                          }
                        </span>
                      </td>

                      <td>
                        <button
                          type="button"
                          className="primary-button collect-button"
                          onClick={() =>
                            openCollectPayment(
                              payment
                            )
                          }
                        >
                          Collect Payment
                        </button>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedPayment && (
        <div className="payment-modal-backdrop">
          <div
            className="payment-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="collect-payment-title"
          >
            <div className="payment-modal-header">
              <div>
                <p className="eyebrow">
                  COLLECT PAYMENT
                </p>

                <h2 id="collect-payment-title">
                  Record Customer Payment
                </h2>
              </div>

              <button
                type="button"
                className="modal-close-button"
                onClick={
                  closeCollectPayment
                }
                disabled={saving}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className="payment-invoice-details">
              <div>
                <span>Customer</span>

                <strong>
                  {
                    selectedPayment.customerName
                  }
                </strong>
              </div>

              <div>
                <span>Invoice</span>

                <strong>
                  {
                    selectedPayment.invoiceNumber
                  }
                </strong>
              </div>

              <div>
                <span>Invoice Total</span>

                <strong>
                  {formatCurrency(
                    selectedPayment.invoiceTotal
                  )}
                </strong>
              </div>

              <div>
                <span>Already Paid</span>

                <strong>
                  {formatCurrency(
                    selectedPayment.paidAmount
                  )}
                </strong>
              </div>

              <div className="modal-outstanding">
                <span>Outstanding</span>

                <strong>
                  {formatCurrency(
                    selectedPayment.outstandingAmount
                  )}
                </strong>
              </div>

              <div>
                <span>Due Date</span>

                <strong>
                  {formatDate(
                    selectedPayment.dueDate
                  )}
                </strong>
              </div>
            </div>

            <div className="payment-form">
              <div className="payment-form-field">
                <label htmlFor="payment-amount">
                  Payment Amount
                </label>

                <input
                  id="payment-amount"
                  type="number"
                  min="0.01"
                  max={
                    selectedPayment.outstandingAmount
                  }
                  step="0.01"
                  value={paymentAmount}
                  onChange={(event) =>
                    setPaymentAmount(
                      event.target.value
                    )
                  }
                  disabled={saving}
                  autoFocus
                />

                <small>
                  Maximum:{" "}
                  {formatCurrency(
                    selectedPayment.outstandingAmount
                  )}
                </small>
              </div>

              <div className="payment-form-field">
                <label>
                  Payment Method
                </label>

                <div className="payment-method-grid">
                  {PAYMENT_METHODS.map(
                    (method) => (
                      <button
                        key={method.value}
                        type="button"
                        className={`payment-method-button ${
                          paymentMethod ===
                          method.value
                            ? "payment-method-active"
                            : ""
                        }`}
                        onClick={() =>
                          setPaymentMethod(
                            method.value
                          )
                        }
                        disabled={saving}
                      >
                        {method.label}
                      </button>
                    )
                  )}
                </div>
              </div>
            </div>

            <div className="payment-modal-footer">
              <button
                type="button"
                className="secondary-button"
                onClick={
                  closeCollectPayment
                }
                disabled={saving}
              >
                Cancel
              </button>

              <button
                type="button"
                className="primary-button"
                onClick={
                  handleRecordPayment
                }
                disabled={saving}
              >
                {saving
                  ? "Recording..."
                  : "Record Payment"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default PaymentsPage;