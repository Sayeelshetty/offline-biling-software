import { useEffect, useMemo, useState } from "react";
import type {
  Customer,
  CustomerInput,
  CustomerUpdateInput,
} from "../../types/customer";
import customerService from "../../services/customer.service";
import "./CustomerPage.css";

const DEVICE_STORAGE_KEY = "offline-billing-device-id";

function getDeviceId(): string {
  const existing = localStorage.getItem(DEVICE_STORAGE_KEY);

  if (existing) {
    return existing;
  }

  const generated = `DEV-${crypto.randomUUID()}`;
  localStorage.setItem(DEVICE_STORAGE_KEY, generated);

  return generated;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);
}


export default function CustomerPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showOutstandingOnly, setShowOutstandingOnly] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(
    null
  );

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [form, setForm] = useState({
    name: "",
    mobile: "",
    email: "",
    address: "",
  });

  async function loadCustomers() {
    try {
      setIsLoading(true);
      setErrorMessage("");

      const data = searchTerm.trim()
        ? await customerService.searchCustomers(searchTerm.trim())
        : await customerService.getAllCustomers();

      setCustomers(data);
    } catch (error) {
      console.error("Failed to load customers:", error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to load customers."
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadCustomers();
  }, [searchTerm]);

  function openAddForm() {
    setEditingCustomer(null);

    setForm({
      name: "",
      mobile: "",
      email: "",
      address: "",
    });

    setErrorMessage("");
    setSuccessMessage("");
    setShowForm(true);
  }

  function openEditForm(customer: Customer) {
    setEditingCustomer(customer);

    setForm({
      name: customer.name,
      mobile: customer.mobile,
      email: customer.email ?? "",
      address: customer.address ?? "",
    });

    setErrorMessage("");
    setSuccessMessage("");
    setShowForm(true);
  }

  function closeForm() {
    if (isSaving) {
      return;
    }

    setShowForm(false);
    setEditingCustomer(null);
  }

  function updateField(
    field: "name" | "mobile" | "email" | "address",
    value: string
  ) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const name = form.name.trim();
    const mobile = form.mobile.trim();
    const email = form.email.trim();
    const address = form.address.trim();

    if (!name) {
      setErrorMessage("Customer name is required.");
      return;
    }

    if (!mobile) {
      setErrorMessage("Mobile number is required.");
      return;
    }

    if (!/^[0-9+\-\s()]{7,20}$/.test(mobile)) {
      setErrorMessage("Please enter a valid mobile number.");
      return;
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErrorMessage("Please enter a valid email address.");
      return;
    }

    try {
      setIsSaving(true);
      setErrorMessage("");
      setSuccessMessage("");

      if (editingCustomer) {
        const input: CustomerUpdateInput = {
          name,
          mobile,
          email: email || null,
          address: address || null,
        };

        await customerService.updateCustomer(editingCustomer.id, input);

        setSuccessMessage("Customer updated successfully.");
      } else {
        const input: CustomerInput = {
          name,
          mobile,
          email: email || null,
          address: address || null,
          deviceId: getDeviceId(),
        };

        await customerService.createCustomer(input);

        setSuccessMessage("Customer created successfully.");
      }

      await loadCustomers();

      setForm({
        name: "",
        mobile: "",
        email: "",
        address: "",
      });

      setEditingCustomer(null);
      setShowForm(false);
    } catch (error) {
      console.error("Failed to save customer:", error);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to save customer."
      );
    } finally {
      setIsSaving(false);
    }
  }

  const displayedCustomers = useMemo(() => {
    if (!showOutstandingOnly) {
      return customers;
    }

    return customers.filter(
      (customer) => customer.outstandingAmount > 0
    );
  }, [customers, showOutstandingOnly]);

  const totalCustomers = customers.length;

  const totalOutstanding = customers.reduce(
    (total, customer) => total + customer.outstandingAmount,
    0
  );

  const totalPurchases = customers.reduce(
    (total, customer) => total + customer.totalPurchases,
    0
  );

  return (
    <div className="customer-page">
      <div className="customer-page-header">
        <div>
          <h1>Customers</h1>
          <p>Manage customer details, purchases and outstanding payments.</p>
        </div>

        <button
          className="customer-primary-button"
          onClick={openAddForm}
        >
          + Add Customer
        </button>
      </div>

      {successMessage && (
        <div className="customer-alert customer-alert-success">
          {successMessage}
        </div>
      )}

      {errorMessage && (
        <div className="customer-alert customer-alert-error">
          {errorMessage}
        </div>
      )}

      <div className="customer-summary-grid">
        <div className="customer-summary-card">
          <span>Total Customers</span>
          <strong>{totalCustomers}</strong>
        </div>

        <div className="customer-summary-card">
          <span>Total Purchases</span>
          <strong>{formatCurrency(totalPurchases)}</strong>
        </div>

        <div className="customer-summary-card customer-summary-card-warning">
          <span>Total Outstanding</span>
          <strong>{formatCurrency(totalOutstanding)}</strong>
        </div>
      </div>

      <div className="customer-toolbar">
        <div className="customer-search-wrapper">
          <span className="customer-search-icon">⌕</span>

          <input
            type="text"
            placeholder="Search by name, mobile or email..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </div>

        <label className="customer-outstanding-filter">
          <input
            type="checkbox"
            checked={showOutstandingOnly}
            onChange={(event) =>
              setShowOutstandingOnly(event.target.checked)
            }
          />

          <span>Outstanding only</span>
        </label>
      </div>

      <div className="customer-table-card">
        <div className="customer-table-header">
          <div>
            <h2>Customer List</h2>
            <span>
              {displayedCustomers.length} customer
              {displayedCustomers.length === 1 ? "" : "s"}
            </span>
          </div>
        </div>

        {isLoading ? (
          <div className="customer-empty-state">
            <p>Loading customers...</p>
          </div>
        ) : displayedCustomers.length === 0 ? (
          <div className="customer-empty-state">
            <div className="customer-empty-icon">👤</div>

            <h3>No customers found</h3>

            <p>
              Add a customer or change the search/filter to see customers.
            </p>

            <button
              className="customer-secondary-button"
              onClick={openAddForm}
            >
              Add Customer
            </button>
          </div>
        ) : (
          <div className="customer-table-wrapper">
            <table className="customer-table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Mobile</th>
                  <th>Email</th>
                  <th>Total Purchases</th>
                  <th>Outstanding</th>
                  <th>Sync</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {displayedCustomers.map((customer) => (
                  <tr key={customer.id}>
                    <td>
                      <div className="customer-name-cell">
                        <div className="customer-avatar">
                          {customer.name.charAt(0).toUpperCase()}
                        </div>

                        <div>
                          <strong>{customer.name}</strong>

                          {customer.address && (
                            <span>{customer.address}</span>
                          )}
                        </div>
                      </div>
                    </td>

                    <td>{customer.mobile}</td>

                    <td>{customer.email || "—"}</td>

                    <td>
                      {formatCurrency(customer.totalPurchases)}
                    </td>

                    <td>
                      <span
                        className={
                          customer.outstandingAmount > 0
                            ? "customer-outstanding-value"
                            : "customer-paid-value"
                        }
                      >
                        {formatCurrency(customer.outstandingAmount)}
                      </span>
                    </td>

                    <td>
                      <span
                        className={`customer-sync-badge customer-sync-${customer.syncStatus.toLowerCase()}`}
                      >
                        {customer.syncStatus}
                      </span>
                    </td>

                    <td>
                      <button
                        className="customer-action-button"
                        onClick={() => openEditForm(customer)}
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showForm && (
        <div
          className="customer-modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeForm();
            }
          }}
        >
          <div className="customer-modal">
            <div className="customer-modal-header">
              <div>
                <h2>
                  {editingCustomer ? "Edit Customer" : "Add Customer"}
                </h2>

                <p>
                  {editingCustomer
                    ? "Update customer information."
                    : "Create a new customer profile."}
                </p>
              </div>

              <button
                className="customer-modal-close"
                onClick={closeForm}
                type="button"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="customer-form-grid">
                <div className="customer-form-group">
                  <label htmlFor="customer-name">
                    Name <span>*</span>
                  </label>

                  <input
                    id="customer-name"
                    type="text"
                    value={form.name}
                    onChange={(event) =>
                      updateField("name", event.target.value)
                    }
                    placeholder="Enter customer name"
                  />
                </div>

                <div className="customer-form-group">
                  <label htmlFor="customer-mobile">
                    Mobile <span>*</span>
                  </label>

                  <input
                    id="customer-mobile"
                    type="text"
                    value={form.mobile}
                    onChange={(event) =>
                      updateField("mobile", event.target.value)
                    }
                    placeholder="Enter mobile number"
                  />
                </div>

                <div className="customer-form-group">
                  <label htmlFor="customer-email">Email</label>

                  <input
                    id="customer-email"
                    type="email"
                    value={form.email}
                    onChange={(event) =>
                      updateField("email", event.target.value)
                    }
                    placeholder="Enter email address"
                  />
                </div>

                <div className="customer-form-group customer-form-group-full">
                  <label htmlFor="customer-address">Address</label>

                  <textarea
                    id="customer-address"
                    value={form.address}
                    onChange={(event) =>
                      updateField("address", event.target.value)
                    }
                    placeholder="Enter customer address"
                    rows={4}
                  />
                </div>
              </div>

              {errorMessage && (
                <div className="customer-form-error">
                  {errorMessage}
                </div>
              )}

              <div className="customer-modal-footer">
                <button
                  type="button"
                  className="customer-secondary-button"
                  onClick={closeForm}
                  disabled={isSaving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="customer-primary-button"
                  disabled={isSaving}
                >
                  {isSaving
                    ? "Saving..."
                    : editingCustomer
                    ? "Update Customer"
                    : "Create Customer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}