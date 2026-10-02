const crypto = require("crypto");
const { getDatabase } = require("../connection.cjs");

const db = getDatabase();

const DEFAULT_SETTINGS = {
  business: {
    businessName: "Offline Billing",
    address: "",
    phone: "",
    gstNumber: "",
    logoPath: null,
  },

  invoice: {
    invoicePrefix: "INV",
    startingNumber: 1,
    thermalPaperWidth: 80,
    printFormat: "A4",
  },

  billing: {
    taxEnabled: true,
    defaultGstRate: 5,
    discountEnabled: true,
    paymentMethods: [
      "CASH",
      "UPI",
      "CARD",
      "CREDIT",
      "OTHER",
    ],
  },

  printer: {
    printerType: "A4",
    printerName: "",
    paperWidth: 80,
  },
};

function createId() {
  return crypto.randomUUID();
}

function getNow() {
  return new Date().toISOString();
}

function cloneDefaultSettings() {
  return JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
}

function parseSettingValue(value, fallback) {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }

  try {
    return JSON.parse(value);
  } catch (error) {
    console.error(
      "Failed to parse setting value:",
      error
    );

    return fallback;
  }
}

function getSettingRow(key) {
  return db
    .prepare(
      `
      SELECT
        id,
        key,
        value,
        created_at,
        updated_at
      FROM settings
      WHERE key = ?
      LIMIT 1
      `
    )
    .get(key);
}

function saveSetting(key, value) {
  const existing = getSettingRow(key);

  const now = getNow();
  const serializedValue = JSON.stringify(value);

  if (existing) {
    db.prepare(
      `
      UPDATE settings
      SET
        value = ?,
        updated_at = ?
      WHERE key = ?
      `
    ).run(
      serializedValue,
      now,
      key
    );

    return;
  }

  db.prepare(
    `
    INSERT INTO settings (
      id,
      key,
      value,
      created_at,
      updated_at
    )
    VALUES (
      ?,
      ?,
      ?,
      ?,
      ?
    )
    `
  ).run(
    createId(),
    key,
    serializedValue,
    now,
    now
  );
}

function initializeDefaultSettings() {
  const transaction = db.transaction(() => {
    const keys = Object.keys(DEFAULT_SETTINGS);

    for (const key of keys) {
      const existing = getSettingRow(key);

      if (!existing) {
        saveSetting(
          key,
          DEFAULT_SETTINGS[key]
        );
      }
    }
  });

  transaction();
}

function getSettings() {
  initializeDefaultSettings();

  const settings = cloneDefaultSettings();

  for (const key of Object.keys(settings)) {
    const row = getSettingRow(key);

    if (!row) {
      continue;
    }

    settings[key] = parseSettingValue(
      row.value,
      settings[key]
    );
  }

  return settings;
}

function updateSettings(input) {
  if (!input || typeof input !== "object") {
    throw new Error(
      "Settings data is required."
    );
  }

  initializeDefaultSettings();

  const currentSettings = getSettings();

  const nextSettings = {
    business: {
      ...currentSettings.business,
      ...(input.business || {}),
    },

    invoice: {
      ...currentSettings.invoice,
      ...(input.invoice || {}),
    },

    billing: {
      ...currentSettings.billing,
      ...(input.billing || {}),
    },

    printer: {
      ...currentSettings.printer,
      ...(input.printer || {}),
    },
  };

  const transaction = db.transaction(() => {
    saveSetting(
      "business",
      nextSettings.business
    );

    saveSetting(
      "invoice",
      nextSettings.invoice
    );

    saveSetting(
      "billing",
      nextSettings.billing
    );

    saveSetting(
      "printer",
      nextSettings.printer
    );
  });

  transaction();

  return nextSettings;
}

function resetSettings() {
  const transaction = db.transaction(() => {
    for (const [key, value] of Object.entries(
      DEFAULT_SETTINGS
    )) {
      saveSetting(key, value);
    }
  });

  transaction();

  return cloneDefaultSettings();
}

module.exports = {
  DEFAULT_SETTINGS,
  initializeDefaultSettings,
  getSettings,
  updateSettings,
  resetSettings,
};