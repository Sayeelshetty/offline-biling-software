const fs = require("fs");

/*
|--------------------------------------------------------------------------
| CSV Helpers
|--------------------------------------------------------------------------
*/

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

/*
|--------------------------------------------------------------------------
| Products → CSV
|--------------------------------------------------------------------------
*/

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

/*
|--------------------------------------------------------------------------
| Write Products CSV
|--------------------------------------------------------------------------
*/

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

/*
|--------------------------------------------------------------------------
| Parse CSV
|--------------------------------------------------------------------------
|
| Supports:
| - Comma-separated values
| - Quoted values
| - Commas inside quoted values
| - Quotes escaped as ""
| - New lines inside quoted values
|
|--------------------------------------------------------------------------
*/

function parseCsvText(csvText) {
  const rows = [];

  let currentRow = [];
  let currentValue = "";
  let insideQuotes = false;

  for (let index = 0; index < csvText.length; index += 1) {
    const character = csvText[index];
    const nextCharacter = csvText[index + 1];

    if (insideQuotes) {
      if (character === '"') {
        if (nextCharacter === '"') {
          currentValue += '"';
          index += 1;
        } else {
          insideQuotes = false;
        }
      } else {
        currentValue += character;
      }

      continue;
    }

    if (character === '"') {
      insideQuotes = true;
      continue;
    }

    if (character === ",") {
      currentRow.push(currentValue);
      currentValue = "";
      continue;
    }

    if (character === "\r") {
      if (nextCharacter === "\n") {
        index += 1;
      }

      currentRow.push(currentValue);
      rows.push(currentRow);

      currentRow = [];
      currentValue = "";

      continue;
    }

    if (character === "\n") {
      currentRow.push(currentValue);
      rows.push(currentRow);

      currentRow = [];
      currentValue = "";

      continue;
    }

    currentValue += character;
  }

  if (
    currentValue.length > 0 ||
    currentRow.length > 0
  ) {
    currentRow.push(currentValue);
    rows.push(currentRow);
  }

  return rows.filter((row) =>
    row.some(
      (value) => value.trim().length > 0
    )
  );
}

/*
|--------------------------------------------------------------------------
| CSV → Objects
|--------------------------------------------------------------------------
*/

function csvToObjects(csvText) {
  const rows = parseCsvText(csvText);

  if (rows.length === 0) {
    return [];
  }

  const headers = rows[0].map((header) =>
    header.trim()
  );

  if (headers.length === 0) {
    return [];
  }

  return rows.slice(1).map((row) => {
    const object = {};

    headers.forEach((header, index) => {
      object[header] =
        row[index] !== undefined
          ? row[index].trim()
          : "";
    });

    return object;
  });
}

/*
|--------------------------------------------------------------------------
| Read CSV File
|--------------------------------------------------------------------------
*/

function readProductsCsv(filePath) {
  if (!filePath) {
    throw new Error("Import file path is required");
  }

  if (!fs.existsSync(filePath)) {
    throw new Error("Import CSV file was not found");
  }

  const csvText = fs.readFileSync(
    filePath,
    "utf8"
  );

  return csvToObjects(csvText);
}

/*
|--------------------------------------------------------------------------
| Exports
|--------------------------------------------------------------------------
*/

module.exports = {
  productsToCsv,
  writeProductsCsv,
  parseCsvText,
  csvToObjects,
  readProductsCsv,
};