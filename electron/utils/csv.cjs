const fs = require("fs");

function escapeCsvValue(value) {
  if (value === null || value === undefined) {
    return "";
  }

  const stringValue = String(value);

  if (
    stringValue.includes(",") ||
    stringValue.includes('"') ||
    stringValue.includes("\n") ||
    stringValue.includes("\r")
  ) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

function productsToCsv(products) {
  const headers = [
    "ID",
    "Server ID",
    "Product Name",
    "SKU",
    "Barcode",
    "Category ID",
    "Selling Price",
    "Purchase Price",
    "GST Rate",
    "Current Stock",
    "Minimum Stock",
    "Unit",
    "Image Path",
    "Status",
    "Created At",
    "Updated At",
    "Sync Status",
    "Device ID",
  ];

  const rows = products.map((product) => [
    product.id,
    product.serverId,
    product.name,
    product.sku,
    product.barcode,
    product.categoryId,
    product.sellingPrice,
    product.purchasePrice,
    product.gstRate,
    product.currentStock,
    product.minimumStock,
    product.unit,
    product.imagePath,
    product.status,
    product.createdAt,
    product.updatedAt,
    product.syncStatus,
    product.deviceId,
  ]);

  const csvRows = [
    headers.map(escapeCsvValue).join(","),
    ...rows.map((row) =>
      row.map(escapeCsvValue).join(",")
    ),
  ];

  return csvRows.join("\r\n");
}

function writeProductsCsv(filePath, products) {
  if (!filePath) {
    throw new Error("Export file path is required");
  }

  const csv = productsToCsv(products);

  fs.writeFileSync(filePath, csv, {
    encoding: "utf8",
  });

  return filePath;
}

module.exports = {
  productsToCsv,
  writeProductsCsv,
};