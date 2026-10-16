# User Guide

## 1. About the application

Offline Billing Software is a local-first retail POS desktop application. Bills,
inventory changes, products, and other application data are stored in local
SQLite. Internet access is needed for cloud synchronization and cloud backup,
not for creating a local bill.

The primary navigation is Dashboard, Products, Categories, Billing, Inventory,
Customers, Payments, Invoices, Reports, and Settings. On narrow layouts, the
main actions are available in a bottom navigation bar and the remaining pages
are under **More**.

## 2. Install and sign in

Follow the [installation guide](./INSTALLATION.md) to install and start the
desktop application.

For a fresh local database, the app creates demo accounts:

| Role | Email | Password |
|---|---|---|
| Administrator | `admin@offlinebilling.local` | `admin123` |
| Cashier | `cashier@offlinebilling.local` | `cashier123` |
| Manager | `manager@offlinebilling.local` | `manager123` |

These are fixed development/demo credentials in the current source. There is
no password-change or user-administration screen in the current UI. Do not use
these credentials for a production deployment with real business data; replace
the bootstrap-account approach and add user/password management before
production use. Password hashes are stored in the local database.

## 3. Set up business details

Open **Settings** and enter the business name, address, phone, GST number,
logo, invoice prefix/numbering, tax and discount preferences, payment methods,
and printer preferences. Select **Save Settings** to persist the form.

Logo files are selected from the local computer and used for app branding and
invoice output. The current invoice PDF uses A4. Printer preferences are saved
but printer discovery and direct thermal-printer integration are not currently
implemented.

## 4. Add products and categories

1. Open **Categories** to add product groups if needed.
2. Open **Products** and select **Add Product**.
3. Enter a unique SKU and, when available, barcode, price, tax rate, stock,
   minimum stock, unit, and category.
4. Save the product. Product search in Billing uses the local database.

Products can be exported to or imported from CSV in **Settings → Data &
Backup**. The sample file [products.csv](../test-data/products.csv) shows the
supported header/column order. Use a development database when trying sample
imports.

## 5. Create a bill

1. Open **Billing**.
2. Search by product name, SKU, or barcode, or use **Scan Barcode** where a
   camera is available and permitted.
3. Add items and adjust quantities or discounts.
4. Optionally choose a customer.
5. Select the payment method/status and confirm the amount.
6. Select **Generate Bill**. The invoice, payment, and stock movement are
   written to local SQLite together; stock is updated as part of the local
   billing operation.
7. Use the invoice actions to view, print, download the A4 PDF, or share.

The active billing draft is also stored locally in browser storage so it can
be restored if the screen reloads. A completed invoice is persisted in SQLite
and is not dependent on the internet.

## 6. Inventory, customers, payments, and reports

- **Inventory:** review stock and movements; record stock-in, stock-out, and
  adjustments. Completed bills update stock automatically.
- **Customers:** create and maintain customer details and review purchase or
  outstanding information.
- **Payments:** review recorded payments and outstanding amounts.
- **Reports:** review locally stored sales, inventory, stock movement,
  customer purchase, and outstanding payment information.

## 7. Offline status and cloud synchronization

The application queues local changes for cloud upload. When connectivity is
available, queued changes are sent automatically; a failed change remains
local and can be retried. The top-bar/settings status displays connectivity,
pending/failed counts, and the last successful sync time.

Current synchronization is **device-to-cloud push**. The desktop sync engine
does not pull remote product/customer changes into this device's SQLite
database. See the [conflict strategy](./CONFLICT-RESOLUTION.md) and
[API limitations](./API.md#1-architecture).

## 8. Backup, restore, and data export

- **Local backup:** in Settings → Data & Backup, choose Backup Database and
  select a destination. Keep backups somewhere separate from the app/device.
- **Restore:** choose Restore Database and select a valid SQLite backup.
  Restore replaces the current local data; create a fresh backup first and
  close other copies of the app.
- **Cloud backup:** uploads a SQLite database backup when the cloud service is
  configured and reachable. A failed automatic upload is retried while online.
- **Product CSV:** use Export Products or Import Products for product data.
  This is not a general invoice/payment Excel export.

After restoring or importing data, verify the resulting records before
continuing billing.

## 9. Mobile and camera notes

The React UI includes narrow-screen layouts, a mobile-style bottom navigation,
and camera barcode scanning. The shipped application is an Electron desktop
application, however; it is not packaged as a native Android/iOS app, and
standalone browser use is not supported because data operations depend on the
Electron API bridge. Treat small-window responsiveness as implemented UI, not
as verified mobile-device compatibility.

## 10. Troubleshooting

- **A bill cannot find a product:** confirm the product is active and search by
  SKU/barcode; product lookup uses the local database.
- **Cloud status is offline:** continue local work, then check the network and
  server configuration. Do not delete the local database or pending queue.
- **Camera will not start:** allow camera permission, close other applications
  using it, and check that the device has a camera. Manual barcode/SKU entry
  remains available.
- **Restore failed:** verify the selected file is a valid SQLite backup and
  that the application can write to its data directory.

For current feature boundaries and API details, see
[API documentation](./API.md), [UI design notes](./UI-DESIGN.md), and
[deliverable assessment](./DELIVERABLES.md).
