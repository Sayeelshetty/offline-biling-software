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

    const [backupSuccessPath, setBackupSuccessPath] =
  useState<string | null>(null);

  const [cloudBackupDetails, setCloudBackupDetails] = useState<{
  fileName: string;
  fileSize: number;
} | null>(null);


const [restoreConfirmOpen, setRestoreConfirmOpen] =
  useState(false);

const [restoreDialog, setRestoreDialog] = useState<{
  type: "success" | "error";
  message: string;
} | null>(null);


const [syncStatusInfoOpen, setSyncStatusInfoOpen] = useState(false);

const [exportSuccessDetails, setExportSuccessDetails] = useState<{
  path: string;
  count: number;
} | null>(null);

const [importResultDetails, setImportResultDetails] = useState<{
  type: "success" | "warning" | "error";
  count: number;
  errors: string[];
  message: string;
} | null>(null);

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

   if (result.success && result.filePath) {
  setBackupSuccessPath(result.filePath);
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
    const result = await window.desktopAPI.products.exportCsv();

    if (result.canceled) {
      return;
    }

    if (result.success && result.path) {
      setExportSuccessDetails({
        path: result.path,
        count: Number(result.count) || 0,
      });

      return;
    }

    window.alert(result.error || "Failed to export products.");
  } catch (error) {
    console.error("Product export failed:", error);

    window.alert(
      error instanceof Error
        ? error.message
        : "Failed to export products."
    );
  }
}

async function handleCloudBackup() {
  try {
    const result =
      await window.desktopAPI.settings.cloudBackup();

   if (result.success && result.backup) {
  setCloudBackupDetails({
    fileName: result.backup.fileName,
    fileSize: Number(result.backup.fileSize) || 0,
  });
  return;
}

    window.alert(
      result.error ||
        "Failed to create cloud backup."
    );
  } catch (error) {
    console.error(
      "Cloud backup failed:",
      error
    );

    window.alert(
      error instanceof Error
        ? error.message
        : "Failed to create cloud backup."
    );
  }
}


async function handleImportProducts() {
  try {
    const result = await window.desktopAPI.products.importCsv();

    if (result.canceled) {
      return;
    }

    if (result.success) {
      const importedCount = result.count ?? 0;
      const importErrors = result.errors ?? [];

      if (importErrors.length > 0) {
        setImportResultDetails({
          type: "warning",
          count: importedCount,
          errors: importErrors,
          message:
            "The import finished, but some products could not be imported. Review the details below.",
        });

        return;
      }

      setImportResultDetails({
        type: "success",
        count: importedCount,
        errors: [],
        message:
          "Your product data has been imported successfully.",
      });

      return;
    }

    setImportResultDetails({
      type: "error",
      count: 0,
      errors: [],
      message: result.error || "Failed to import products.",
    });
  } catch (error) {
    console.error("Product import failed:", error);

    setImportResultDetails({
      type: "error",
      count: 0,
      errors: [],
      message:
        error instanceof Error
          ? error.message
          : "Failed to import products.",
    });
  }
}


function handleRestore() {
  setRestoreConfirmOpen(true);
}

async function confirmRestore() {
  setRestoreConfirmOpen(false);

  try {
    const result = await window.desktopAPI.settings.restore();

    if (result.canceled) {
      return;
    }

    if (result.success && result.filePath) {
      setRestoreDialog({
        type: "success",
        message:
          "Your database backup has been restored successfully. Your billing data has been updated.",
      });

      return;
    }

    setRestoreDialog({
      type: "error",
      message: result.error || "Failed to restore the database.",
    });
  } catch (error) {
    console.error("Database restore failed:", error);

    setRestoreDialog({
      type: "error",
      message:
        error instanceof Error
          ? error.message
          : "Failed to restore the database.",
    });
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
                Your selected logo is saved locally and
                appears in the app branding and invoice PDFs.
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
              These printer preferences are saved, but are
              not applied to printing yet. Invoice PDF
              downloads currently use A4; printer discovery
              and direct printing are not available.
            </span>
          </div>
        </section>

        {/* DATA */}

        <section className="settings-card settings-data-card">
          <div className="settings-card-header">
            <div>

              <h2>Data & Backup</h2>

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
  onClick={handleCloudBackup}
>
  <strong>
    Cloud Backup
  </strong>

  <span>
    Upload a secure copy of the SQLite
    database to the cloud.
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
  onClick={() => setSyncStatusInfoOpen(true)}
>
  <strong>Sync Status</strong>

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
    Export the product catalog to a CSV file.
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
    Import products from a CSV file. Other records are
    included in the database backup, not CSV import.
  </span>
</button>
</div>
        </section>
      </div>
      {backupSuccessPath && (
  <div className="backup-success-overlay">
    <section
      className="backup-success-dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby="backup-success-title"
      aria-describedby="backup-success-message"
    >
      <button
        type="button"
        className="backup-success-close"
        aria-label="Close dialog"
        onClick={() => setBackupSuccessPath(null)}
      >
        ×
      </button>

      <div className="backup-success-icon" aria-hidden="true">
        ✓
      </div>

      <span className="backup-success-label">
        BACKUP COMPLETE
      </span>

      <h2 id="backup-success-title">
        Backup Created Successfully
      </h2>

      <p id="backup-success-message">
        Your local database backup has been created successfully.
        Your saved backup file is ready to use.
      </p>

      <div className="backup-success-file">
        <span>Saved file location</span>
        <code>{backupSuccessPath}</code>
      </div>

      <button
        type="button"
        className="backup-success-done"
        onClick={() => setBackupSuccessPath(null)}
      >
        Done
      </button>
    </section>
  </div>
)}


{cloudBackupDetails && (
  <div className="backup-success-overlay">
    <section
      className="backup-success-dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cloud-backup-success-title"
      aria-describedby="cloud-backup-success-message"
    >
      <button
        type="button"
        className="backup-success-close"
        aria-label="Close dialog"
        onClick={() => setCloudBackupDetails(null)}
      >
        ×
      </button>

      <div className="backup-success-icon" aria-hidden="true">
        ✓
      </div>

      <span className="backup-success-label">
        CLOUD BACKUP COMPLETE
      </span>

      <h2 id="cloud-backup-success-title">
        Cloud Backup Successful
      </h2>

      <p id="cloud-backup-success-message">
        Your cloud backup has been created successfully.
        Your backup file is ready.
      </p>

      <div className="backup-success-file">
        <span>Backup file</span>
        <code>{cloudBackupDetails.fileName}</code>
      </div>

      <div className="backup-success-file cloud-backup-size">
        <span>Backup size</span>
        <code>
          {(cloudBackupDetails.fileSize / 1024).toLocaleString("en-IN", {
            maximumFractionDigits: 2,
          })} KB
          {" "}({cloudBackupDetails.fileSize.toLocaleString("en-IN")} bytes)
        </code>
      </div>

      <button
        type="button"
        className="backup-success-done"
        onClick={() => setCloudBackupDetails(null)}
      >
        Done
      </button>
    </section>
  </div>
)}


{/* Restore confirmation modal */}
{restoreConfirmOpen && (
  <div className="restore-dialog-overlay">
    <section
      className="restore-dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby="restore-confirm-title"
      aria-describedby="restore-confirm-description"
    >
      <button
        type="button"
        className="restore-dialog-close"
        aria-label="Close dialog"
        onClick={() => setRestoreConfirmOpen(false)}
      >
        ×
      </button>

      <div className="restore-dialog-icon restore-warning-icon">
        !
      </div>

      <span className="restore-dialog-eyebrow">
        DATABASE RESTORE
      </span>

      <h2 id="restore-confirm-title">
        Restore database backup?
      </h2>

      <p id="restore-confirm-description">
        This will replace your current local billing data with
        the selected backup.
      </p>

      <div className="restore-dialog-notice">
        <span className="restore-notice-icon">✓</span>
        <div>
          <strong>Your data is protected</strong>
          <p>
            A safety backup of your current database will be
            created automatically before restoration.
          </p>
        </div>
      </div>

      <div className="restore-dialog-actions">
        <button
          type="button"
          className="restore-cancel-button"
          onClick={() => setRestoreConfirmOpen(false)}
        >
          Cancel
        </button>

        <button
          type="button"
          className="restore-confirm-button"
          onClick={() => void confirmRestore()}
        >
          Choose Backup & Restore
        </button>
      </div>
    </section>
  </div>
)}

{/* Restore result modal */}
{restoreDialog && (
  <div className="restore-dialog-overlay">
    <section
      className="restore-dialog restore-result-dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby="restore-result-title"
      aria-describedby="restore-result-message"
    >
      <button
        type="button"
        className="restore-dialog-close"
        aria-label="Close dialog"
        onClick={() => setRestoreDialog(null)}
      >
        ×
      </button>

      <div
        className={`restore-dialog-icon ${
          restoreDialog.type === "success"
            ? "restore-success-icon"
            : "restore-error-icon"
        }`}
        aria-hidden="true"
      >
        {restoreDialog.type === "success" ? "✓" : "!"}
      </div>

      <span
        className={`restore-dialog-eyebrow ${
          restoreDialog.type === "error"
            ? "restore-error-text"
            : ""
        }`}
      >
        {restoreDialog.type === "success"
          ? "RESTORE COMPLETE"
          : "RESTORE FAILED"}
      </span>

      <h2 id="restore-result-title">
        {restoreDialog.type === "success"
          ? "Database Restored Successfully"
          : "Unable to Restore Database"}
      </h2>

      <p id="restore-result-message">
        {restoreDialog.message}
      </p>

      <button
        type="button"
        className={
          restoreDialog.type === "success"
            ? "restore-result-done"
            : "restore-result-error-button"
        }
        onClick={() => setRestoreDialog(null)}
      >
        Done
      </button>

    </section>
  </div>
)}

{/* Sync Status information modal */}
{syncStatusInfoOpen && (
  <div className="sync-info-overlay">
    <section
      className="sync-info-dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby="sync-info-title"
      aria-describedby="sync-info-description"
    >
      <button
        type="button"
        className="sync-info-close"
        aria-label="Close dialog"
        onClick={() => setSyncStatusInfoOpen(false)}
      >
        ×
      </button>

      <div className="sync-info-icon" aria-hidden="true">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M20 7v5h-5" />
          <path d="M4 17v-5h5" />
          <path d="M5.6 9a7 7 0 0 1 11.6-2L20 12" />
          <path d="M18.4 15a7 7 0 0 1-11.6 2L4 12" />
        </svg>
      </div>

      <span className="sync-info-eyebrow">
        DATA SYNCHRONIZATION
      </span>

      <h2 id="sync-info-title">Sync Status</h2>

      <p id="sync-info-description">
        Keep track of pending and synchronized records from your
        application header.
      </p>

      <div className="sync-info-note">
        <span className="sync-info-note-icon" aria-hidden="true">
          i
        </span>

        <p>
          Use the Sync Status indicator in the application header
          to monitor synchronization progress.
        </p>
      </div>

      <button
        type="button"
        className="sync-info-done"
        onClick={() => setSyncStatusInfoOpen(false)}
      >
        Got it
      </button>
    </section>
  </div>
)}

{/* Product export success modal */}
{exportSuccessDetails && (
  <div className="export-success-overlay">
    <section
      className="export-success-dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby="export-success-title"
      aria-describedby="export-success-message"
    >
      <button
        type="button"
        className="export-success-close"
        aria-label="Close dialog"
        onClick={() => setExportSuccessDetails(null)}
      >
        ×
      </button>

      <div className="export-success-icon" aria-hidden="true">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M20 6 9 17l-5-5" />
        </svg>
      </div>

      <span className="export-success-eyebrow">
        EXPORT COMPLETE
      </span>

      <h2 id="export-success-title">
        Products Exported Successfully
      </h2>

      <p id="export-success-message">
        Your product data has been exported successfully.
        Your CSV file is ready to use.
      </p>

      <div className="export-success-file">
        <div className="export-success-file-icon" aria-hidden="true">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <path d="M14 2v6h6" />
            <path d="M8 13h8M8 17h8M8 9h2" />
          </svg>
        </div>

        <div className="export-success-file-details">
          <span className="export-success-file-label">
            Exported CSV file
          </span>

          <strong>
            {exportSuccessDetails.path.split(/[\\/]/).pop()}
          </strong>

          <span className="export-success-file-type">
            CSV spreadsheet
          </span>
        </div>

        <span className="export-success-format">CSV</span>
      </div>

      <div className="export-success-location">
        <span>Saved file location</span>
        <code>{exportSuccessDetails.path}</code>
      </div>

      <div className="export-success-count">
        <div>
          <span className="export-success-count-label">
            Total products exported
          </span>
          <strong>
            {exportSuccessDetails.count}
          </strong>
        </div>

        <span className="export-success-count-caption">
          Products
        </span>
      </div>

      <button
        type="button"
        className="export-success-done"
        onClick={() => setExportSuccessDetails(null)}
      >
        Done
      </button>
    </section>
  </div>
)}

{/* Product import result modal */}
{importResultDetails && (
  <div className="import-result-overlay">
    <section
      className="import-result-dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby="import-result-title"
      aria-describedby="import-result-message"
    >
      <button
        type="button"
        className="import-result-close"
        aria-label="Close dialog"
        onClick={() => setImportResultDetails(null)}
      >
        ×
      </button>

      <div
        className={`import-result-icon import-result-icon-${importResultDetails.type}`}
        aria-hidden="true"
      >
        {importResultDetails.type === "success" ? (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20 6 9 17l-5-5" />
          </svg>
        ) : importResultDetails.type === "warning" ? (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 3 22 20H2L12 3Z" />
            <path d="M12 9v4" />
            <path d="M12 16h.01" />
          </svg>
        ) : (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m18 6-12 12" />
            <path d="m6 6 12 12" />
          </svg>
        )}
      </div>

      <span
        className={`import-result-eyebrow import-result-eyebrow-${importResultDetails.type}`}
      >
        {importResultDetails.type === "success"
          ? "IMPORT COMPLETE"
          : importResultDetails.type === "warning"
            ? "IMPORT NEEDS ATTENTION"
            : "IMPORT FAILED"}
      </span>

      <h2 id="import-result-title">
        {importResultDetails.type === "success"
          ? "Products Imported Successfully"
          : importResultDetails.type === "warning"
            ? "Import Completed with Errors"
            : "Unable to Import Products"}
      </h2>

      <p id="import-result-message">
        {importResultDetails.message}
      </p>

      {importResultDetails.type !== "error" && (
        <div className="import-result-count">
          <div className="import-result-count-icon" aria-hidden="true">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>

          <div className="import-result-count-details">
            <span>Products imported</span>
            <strong>
              {importResultDetails.count.toLocaleString("en-IN")}
            </strong>
          </div>
        </div>
      )}

      {importResultDetails.errors.length > 0 && (
        <div className="import-result-errors">
          <strong>Import errors</strong>

          <ul>
            {importResultDetails.errors.map((error, index) => (
              <li key={`${index}-${error}`}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      <button
        type="button"
        className={`import-result-done import-result-done-${importResultDetails.type}`}
        onClick={() => setImportResultDetails(null)}
      >
        Done
      </button>
    </section>
  </div>
)}

    </section>
  );
}

export default SettingsPage;