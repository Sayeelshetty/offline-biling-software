import { useEffect, useState } from "react";

import {
  getSettings,
  updateSettings,
  resetSettings,
  selectLogo,
} from "../services/settings.service";

import type {
  SettingsData,
  BusinessSettings,
  InvoiceSettings,
  BillingSettings,
  PrinterSettings,
} from "../../../shared/types/settings";

import "./SettingsPage.css";

const PAYMENT_METHOD_OPTIONS = [
  {
    value: "CASH" as const,
    label: "Cash",
  },
  {
    value: "UPI" as const,
    label: "UPI",
  },
  {
    value: "CARD" as const,
    label: "Card",
  },
  {
    value: "CREDIT" as const,
    label: "Credit",
  },
  {
    value: "OTHER" as const,
    label: "Other",
  },
];

function SettingsPage() {
  const [settings, setSettings] =
    useState<SettingsData | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [resetting, setResetting] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [message, setMessage] =
    useState<string | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      setLoading(true);
      setError(null);

      const data = await getSettings();

      setSettings(data);
    } catch (err) {
      console.error(
        "Failed to load settings:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Failed to load settings."
      );
    } finally {
      setLoading(false);
    }
  }

  function updateBusiness(
    changes: Partial<BusinessSettings>
  ) {
    setSettings((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,

        business: {
          ...current.business,
          ...changes,
        },
      };
    });

    setMessage(null);
  }

  function updateInvoice(
    changes: Partial<InvoiceSettings>
  ) {
    setSettings((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,

        invoice: {
          ...current.invoice,
          ...changes,
        },
      };
    });

    setMessage(null);
  }

  function updateBilling(
    changes: Partial<BillingSettings>
  ) {
    setSettings((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,

        billing: {
          ...current.billing,
          ...changes,
        },
      };
    });

    setMessage(null);
  }

  function updatePrinter(
    changes: Partial<PrinterSettings>
  ) {
    setSettings((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,

        printer: {
          ...current.printer,
          ...changes,
        },
      };
    });

    setMessage(null);
  }

  function togglePaymentMethod(
    method: BillingSettings["paymentMethods"][number]
  ) {
    setSettings((current) => {
      if (!current) {
        return current;
      }

      const exists =
        current.billing.paymentMethods.includes(
          method
        );

      const nextMethods = exists
        ? current.billing.paymentMethods.filter(
            (item) => item !== method
          )
        : [
            ...current.billing.paymentMethods,
            method,
          ];

      if (nextMethods.length === 0) {
        return current;
      }

      return {
        ...current,

        billing: {
          ...current.billing,
          paymentMethods: nextMethods,
        },
      };
    });

    setMessage(null);
  }

  async function handleSave() {
    if (!settings) {
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setMessage(null);

      const savedSettings =
        await updateSettings(settings);

      setSettings(savedSettings);

      setMessage(
        "Settings saved successfully."
      );
    } catch (err) {
      console.error(
        "Failed to save settings:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Failed to save settings."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleSelectLogo() {
  try {
    const result =
      await selectLogo();

    if (
      result.canceled ||
      !result.filePath
    ) {
      return;
    }

    updateBusiness({
      logoPath: result.filePath,
    });
  } catch (error) {
    console.error(
      "Failed to select logo:",
      error
    );

    setMessage(
      "Failed to select logo."
    );
  }
}

async function handleBackup() {
  try {
    const result =
      await window.desktopAPI.settings.backup();

    if (result.canceled) {
      return;
    }

    if (
      result.success &&
      result.filePath
    ) {
      window.alert(
        `Local database backup created successfully.\n\nSaved to:\n${result.filePath}`
      );

      return;
    }

    window.alert(
      result.error ||
        "Failed to create local database backup."
    );
  } catch (error) {
    console.error(
      "Database backup failed:",
      error
    );

    window.alert(
      error instanceof Error
        ? error.message
        : "Failed to create local database backup."
    );
  }
}


async function handleExportProducts() {
  try {
    const result =
      await window.desktopAPI.products.exportCsv();

    if (result.canceled) {
      return;
    }

    if (
      result.success &&
      result.path
    ) {
      window.alert(
        `Products exported successfully.\n\nSaved to:\n${result.path}\n\nTotal products: ${result.count ?? 0}`
      );

      return;
    }

    window.alert(
      result.error ||
        "Failed to export products."
    );
  } catch (error) {
    console.error(
      "Product export failed:",
      error
    );

    window.alert(
      error instanceof Error
        ? error.message
        : "Failed to export products."
    );
  }
}


async function handleImportProducts() {
  try {
    const result =
      await window.desktopAPI.products.importCsv();

    if (result.canceled) {
      return;
    }

    if (result.success) {
      const importedCount =
        result.count ?? 0;

      const importErrors =
        result.errors ?? [];

      if (importErrors.length > 0) {
        window.alert(
          `Product import completed with errors.\n\nImported products: ${importedCount}\n\nErrors:\n${importErrors.join(
            "\n"
          )}`
        );

        return;
      }

      window.alert(
        `Products imported successfully.\n\nImported products: ${importedCount}`
      );

      return;
    }

    window.alert(
      result.error ||
        "Failed to import products."
    );
  } catch (error) {
    console.error(
      "Product import failed:",
      error
    );

    window.alert(
      error instanceof Error
        ? error.message
        : "Failed to import products."
    );
  }
}


async function handleRestore() {
  const confirmed =
    window.confirm(
      "Restore a database backup?\n\nThis will replace the current local billing data. A safety backup will be created automatically before restore."
    );

  if (!confirmed) {
    return;
  }

  try {
    const result =
      await window.desktopAPI.settings.restore();

    if (result.canceled) {
      return;
    }

    if (
      result.success &&
      result.filePath
    ) {
      window.alert(
        "Database restored successfully.\n\nThe application will restart automatically to load the restored data."
      );

      return;
    }

    window.alert(
      result.error ||
        "Failed to restore database."
    );
  } catch (error) {
    console.error(
      "Database restore failed:",
      error
    );

    window.alert(
      error instanceof Error
        ? error.message
        : "Failed to restore database."
    );
  }
}


  async function handleReset() {
    const confirmed = window.confirm(
      "Reset all settings to their default values?"
    );

    if (!confirmed) {
      return;
    }

    try {
      setResetting(true);
      setError(null);
      setMessage(null);

      const defaultSettings =
        await resetSettings();

      setSettings(defaultSettings);

      setMessage(
        "Settings reset to default values."
      );
    } catch (err) {
      console.error(
        "Failed to reset settings:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Failed to reset settings."
      );
    } finally {
      setResetting(false);
    }
  }

  if (loading) {
    return (
      <section className="settings-page">
        <div className="settings-loading">
          Loading settings...
        </div>
      </section>
    );
  }

  if (!settings) {
    return (
      <section className="settings-page">
        <div className="settings-error-card">
          <h2>Unable to load Settings</h2>

          <p>
            {error ??
              "Settings could not be loaded."}
          </p>

          <button
            type="button"
            className="settings-primary-button"
            onClick={loadSettings}
          >
            Try Again
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="settings-page">
      <div className="settings-header">
        <div>
          <p className="settings-eyebrow">
            APPLICATION CONFIGURATION
          </p>

          <h1>Settings</h1>

          <p className="settings-description">
            Configure your business, billing,
            invoice and printer preferences.
          </p>
        </div>

        <div className="settings-header-actions">
          <button
            type="button"
            className="settings-secondary-button"
            onClick={handleReset}
            disabled={
              saving || resetting
            }
          >
            {resetting
              ? "Resetting..."
              : "Reset Defaults"}
          </button>

          <button
            type="button"
            className="settings-primary-button"
            onClick={handleSave}
            disabled={
              saving || resetting
            }
          >
            {saving
              ? "Saving..."
              : "Save Settings"}
          </button>
        </div>
      </div>

      {message && (
        <div className="settings-message settings-success">
          {message}
        </div>
      )}

      {error && (
        <div className="settings-message settings-error">
          {error}
        </div>
      )}

      <div className="settings-grid">
        {/* BUSINESS */}

        <section className="settings-card">
          <div className="settings-card-header">
            <div>
              <p className="settings-card-eyebrow">
                BUSINESS
              </p>

              <h2>Business Information</h2>

              <p>
                Details used throughout the
                application and invoices.
              </p>
            </div>
          </div>

          <div className="settings-form-grid">
            <div className="settings-field full-width">
              <label htmlFor="business-name">
                Business Name
              </label>

              <input
                id="business-name"
                type="text"
                value={
                  settings.business.businessName
                }
                onChange={(event) =>
                  updateBusiness({
                    businessName:
                      event.target.value,
                  })
                }
                placeholder="Enter business name"
              />
            </div>

            <div className="settings-field full-width">
              <label htmlFor="business-address">
                Address
              </label>

              <textarea
                id="business-address"
                value={
                  settings.business.address
                }
                onChange={(event) =>
                  updateBusiness({
                    address:
                      event.target.value,
                  })
                }
                placeholder="Enter business address"
                rows={3}
              />
            </div>

            <div className="settings-field">
              <label htmlFor="business-phone">
                Phone
              </label>

              <input
                id="business-phone"
                type="tel"
                value={
                  settings.business.phone
                }
                onChange={(event) =>
                  updateBusiness({
                    phone:
                      event.target.value,
                  })
                }
                placeholder="Enter phone number"
              />
            </div>

            <div className="settings-field">
              <label htmlFor="business-gst">
                GST Number
              </label>

              <input
                id="business-gst"
                type="text"
                value={
                  settings.business.gstNumber
                }
                onChange={(event) =>
                  updateBusiness({
                    gstNumber:
                      event.target.value.toUpperCase(),
                  })
                }
                placeholder="Enter GST number"
              />
            </div>
<div className="settings-field full-width">
  <label>
    Business Logo
  </label>

  <div className="settings-logo-picker">
    <button
      type="button"
      className="secondary-button"
      onClick={handleSelectLogo}
    >
      Choose Logo
    </button>

    <div className="settings-logo-path">
      {settings.business.logoPath ? (
        <span>
          {settings.business.logoPath}
        </span>
      ) : (
        <span>
          No logo selected
        </span>
      )}
    </div>
  </div>


              <span className="settings-help">
                Logo file selection will be connected
                through Electron later.
              </span>
            </div>
          </div>
        </section>

        {/* INVOICE */}

        <section className="settings-card">
          <div className="settings-card-header">
            <div>
              <p className="settings-card-eyebrow">
                INVOICE
              </p>

              <h2>Invoice Settings</h2>

              <p>
                Configure invoice numbering and
                receipt format.
              </p>
            </div>
          </div>

          <div className="settings-form-grid">
            <div className="settings-field">
              <label htmlFor="invoice-prefix">
                Invoice Prefix
              </label>

              <input
                id="invoice-prefix"
                type="text"
                value={
                  settings.invoice.invoicePrefix
                }
                onChange={(event) =>
                  updateInvoice({
                    invoicePrefix:
                      event.target.value
                        .trim()
                        .toUpperCase(),
                  })
                }
                placeholder="INV"
              />
            </div>

            <div className="settings-field">
              <label htmlFor="invoice-number">
                Starting Number
              </label>

              <input
                id="invoice-number"
                type="number"
                min={1}
                value={
                  settings.invoice.startingNumber
                }
                onChange={(event) => {
                  const value = Number(
                    event.target.value
                  );

                  updateInvoice({
                    startingNumber:
                      Number.isFinite(value) &&
                      value > 0
                        ? Math.floor(value)
                        : 1,
                  });
                }}
              />
            </div>

            <div className="settings-field">
              <label htmlFor="invoice-paper-width">
                Thermal Paper Width
              </label>

              <select
                id="invoice-paper-width"
                value={
                  settings.invoice
                    .thermalPaperWidth
                }
                onChange={(event) =>
                  updateInvoice({
                    thermalPaperWidth:
                      Number(
                        event.target.value
                      ) === 58
                        ? 58
                        : 80,
                  })
                }
              >
                <option value={58}>
                  58 mm
                </option>

                <option value={80}>
                  80 mm
                </option>
              </select>
            </div>

            <div className="settings-field">
              <label htmlFor="invoice-format">
                Print Format
              </label>

              <select
                id="invoice-format"
                value={
                  settings.invoice.printFormat
                }
                onChange={(event) =>
                  updateInvoice({
                    printFormat:
                      event.target.value ===
                      "THERMAL"
                        ? "THERMAL"
                        : "A4",
                  })
                }
              >
                <option value="A4">
                  A4
                </option>

                <option value="THERMAL">
                  Thermal
                </option>
              </select>
            </div>
          </div>

          <div className="settings-preview-box">
            <span>Invoice preview</span>

            <strong>
              {
                settings.invoice.invoicePrefix
              }
              -001
            </strong>

            <small>
              Future invoices will use the configured
              prefix and numbering settings.
            </small>
          </div>
        </section>

        {/* BILLING */}

        <section className="settings-card">
          <div className="settings-card-header">
            <div>
              <p className="settings-card-eyebrow">
                BILLING
              </p>

              <h2>Billing Configuration</h2>

              <p>
                Configure tax, discount and payment
                methods.
              </p>
            </div>
          </div>

          <div className="settings-toggle-list">
            <label className="settings-toggle-row">
              <div>
                <strong>
                  Enable Tax / GST
                </strong>

                <span>
                  Apply GST calculations during
                  billing.
                </span>
              </div>

              <input
                type="checkbox"
                checked={
                  settings.billing.taxEnabled
                }
                onChange={(event) =>
                  updateBilling({
                    taxEnabled:
                      event.target.checked,
                  })
                }
              />
            </label>

            <label className="settings-toggle-row">
              <div>
                <strong>
                  Enable Discounts
                </strong>

                <span>
                  Allow discounts during billing.
                </span>
              </div>

              <input
                type="checkbox"
                checked={
                  settings.billing
                    .discountEnabled
                }
                onChange={(event) =>
                  updateBilling({
                    discountEnabled:
                      event.target.checked,
                  })
                }
              />
            </label>
          </div>

          <div className="settings-form-grid">
            <div className="settings-field">
              <label htmlFor="default-gst">
                Default GST Rate
              </label>

              <select
                id="default-gst"
                value={
                  settings.billing
                    .defaultGstRate
                }
                onChange={(event) =>
                  updateBilling({
                    defaultGstRate:
                      Number(
                        event.target.value
                      ),
                  })
                }
              >
                <option value={0}>
                  0%
                </option>

                <option value={5}>
                  5%
                </option>

                <option value={12}>
                  12%
                </option>

                <option value={18}>
                  18%
                </option>

                <option value={28}>
                  28%
                </option>
              </select>
            </div>
          </div>

          <div className="settings-payment-methods">
            <div className="settings-section-label">
              Payment Methods
            </div>

            <div className="settings-payment-grid">
              {PAYMENT_METHOD_OPTIONS.map(
                (option) => {
                  const selected =
                    settings.billing.paymentMethods.includes(
                      option.value
                    );

                  return (
                    <button
                      type="button"
                      key={option.value}
                      className={
                        selected
                          ? "settings-payment-option selected"
                          : "settings-payment-option"
                      }
                      onClick={() =>
                        togglePaymentMethod(
                          option.value
                        )
                      }
                    >
                      <span
                        className="settings-payment-check"
                      >
                        {selected ? "✓" : ""}
                      </span>

                      {option.label}
                    </button>
                  );
                }
              )}
            </div>
          </div>
        </section>

        {/* PRINTER */}

        <section className="settings-card">
          <div className="settings-card-header">
            <div>
              <p className="settings-card-eyebrow">
                PRINTER
              </p>

              <h2>Printer Configuration</h2>

              <p>
                Configure the default printer and
                paper format.
              </p>
            </div>
          </div>

          <div className="settings-form-grid">
            <div className="settings-field">
              <label htmlFor="printer-type">
                Printer Type
              </label>

              <select
                id="printer-type"
                value={
                  settings.printer
                    .printerType
                }
                onChange={(event) =>
                  updatePrinter({
                    printerType:
                      event.target.value ===
                      "THERMAL"
                        ? "THERMAL"
                        : "A4",
                  })
                }
              >
                <option value="A4">
                  A4 Printer
                </option>

                <option value="THERMAL">
                  Thermal Printer
                </option>
              </select>
            </div>

            <div className="settings-field">
              <label htmlFor="printer-width">
                Paper Width
              </label>

              <select
                id="printer-width"
                value={
                  settings.printer.paperWidth
                }
                onChange={(event) =>
                  updatePrinter({
                    paperWidth:
                      Number(
                        event.target.value
                      ) === 58
                        ? 58
                        : 80,
                  })
                }
              >
                <option value={58}>
                  58 mm
                </option>

                <option value={80}>
                  80 mm
                </option>
              </select>
            </div>

            <div className="settings-field full-width">
              <label htmlFor="printer-name">
                Printer Name
              </label>

              <input
                id="printer-name"
                type="text"
                value={
                  settings.printer
                    .printerName
                }
                onChange={(event) =>
                  updatePrinter({
                    printerName:
                      event.target.value,
                  })
                }
                placeholder="Enter printer name"
              />

              <span className="settings-help">
                Leave empty to use the system default
                printer.
              </span>
            </div>
          </div>

          <div className="settings-info-box">
            <strong>
              Printer integration
            </strong>

            <span>
              Printer discovery and direct printing
              will be connected through Electron's
              print APIs.
            </span>
          </div>
        </section>

        {/* DATA */}

        <section className="settings-card settings-data-card">
          <div className="settings-card-header">
            <div>
              <p className="settings-card-eyebrow">
                DATA
              </p>

              <h2>Data & Backup</h2>

              <p>
                Database backup, restore, sync,
                import and export tools.
              </p>
            </div>
          </div>

     <div className="settings-data-grid">
  <button
    type="button"
    className="settings-data-action"
    onClick={handleBackup}
  >
    <strong>
      Backup Database
    </strong>

    <span>
      Save a local copy of the SQLite
      database.
    </span>
  </button>

  <button
    type="button"
    className="settings-data-action"
    onClick={handleRestore}
  >
    <strong>
      Restore Database
    </strong>

    <span>
      Restore data from a local backup.
    </span>
  </button>

  <button
    type="button"
    className="settings-data-action"
    onClick={() =>
      window.alert(
        "Use the Sync status in the application header to monitor synchronization."
      )
    }
  >
    <strong>
      Sync Status
    </strong>

    <span>
      Monitor pending and synchronized
      records.
    </span>
  </button>

 <button
  type="button"
  className="settings-data-action"
  onClick={handleExportProducts}
>
  <strong>
    Export Products
  </strong>

  <span>
    Export product data to a CSV file.
  </span>
</button>

<button
  type="button"
  className="settings-data-action"
  onClick={handleImportProducts}
>
  <strong>
    Import Products
  </strong>

  <span>
    Import product data from a CSV file.
  </span>
</button>
</div>
        </section>
      </div>
    </section>
  );
}

export default SettingsPage;