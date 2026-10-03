const crypto = require("crypto");
const os = require("os");

const {
  getDatabase,
} = require("../connection.cjs");

const DEVICE_ID =
  `${os.hostname()}-LOCAL`;

const PASSWORD_SALT_BYTES = 16;
const PASSWORD_KEY_LENGTH = 64;

const SCRYPT_OPTIONS = {
  N: 16384,
  r: 8,
  p: 1,
};

function createId() {
  return crypto.randomUUID();
}

function nowIso() {
  return new Date().toISOString();
}

/**
 * Hash a password using Node.js built-in scrypt.
 *
 * Stored format:
 * scrypt$N$r$p$salt$hash
 */
function hashPassword(password) {
  if (
    typeof password !== "string" ||
    password.length === 0
  ) {
    throw new Error(
      "Password is required."
    );
  }

  const salt =
    crypto.randomBytes(
      PASSWORD_SALT_BYTES
    );

  const derivedKey =
    crypto.scryptSync(
      password,
      salt,
      PASSWORD_KEY_LENGTH,
      SCRYPT_OPTIONS
    );

  return [
    "scrypt",
    SCRYPT_OPTIONS.N,
    SCRYPT_OPTIONS.r,
    SCRYPT_OPTIONS.p,
    salt.toString("hex"),
    derivedKey.toString("hex"),
  ].join("$");
}

/**
 * Compare a plain password with a stored hash.
 */
function verifyPassword(
  password,
  storedHash
) {
  if (
    typeof password !== "string" ||
    typeof storedHash !== "string"
  ) {
    return false;
  }

  const parts =
    storedHash.split("$");

  if (
    parts.length !== 6 ||
    parts[0] !== "scrypt"
  ) {
    return false;
  }

  const N = Number(parts[1]);
  const r = Number(parts[2]);
  const p = Number(parts[3]);
  const saltHex = parts[4];
  const storedKeyHex = parts[5];

  if (
    !Number.isInteger(N) ||
    !Number.isInteger(r) ||
    !Number.isInteger(p) ||
    !saltHex ||
    !storedKeyHex
  ) {
    return false;
  }

  try {
    const salt =
      Buffer.from(
        saltHex,
        "hex"
      );

    const storedKey =
      Buffer.from(
        storedKeyHex,
        "hex"
      );

    const derivedKey =
      crypto.scryptSync(
        password,
        salt,
        storedKey.length,
        {
          N,
          r,
          p,
        }
      );

    if (
      derivedKey.length !==
      storedKey.length
    ) {
      return false;
    }

    return crypto.timingSafeEqual(
      derivedKey,
      storedKey
    );
  } catch {
    return false;
  }
}

function mapUser(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    serverId:
      row.server_id,
    businessId:
      row.business_id,
    name: row.name,
    email: row.email,
    role: row.role,
    createdAt:
      row.created_at,
    updatedAt:
      row.updated_at,
    syncStatus:
      row.sync_status,
    deviceId:
      row.device_id,
  };
}

/**
 * Find a user by email.
 */
function findUserByEmail(email) {
  const database =
    getDatabase();

  return database
    .prepare(`
      SELECT
        id,
        server_id,
        business_id,
        name,
        email,
        password_hash,
        role,
        created_at,
        updated_at,
        sync_status,
        device_id
      FROM users
      WHERE LOWER(email) = LOWER(?)
      LIMIT 1
    `)
    .get(email.trim());
}

/**
 * Find a user by ID.
 */
function findUserById(id) {
  const database =
    getDatabase();

  const row =
    database
      .prepare(`
        SELECT
          id,
          server_id,
          business_id,
          name,
          email,
          password_hash,
          role,
          created_at,
          updated_at,
          sync_status,
          device_id
        FROM users
        WHERE id = ?
        LIMIT 1
      `)
      .get(id);

  return mapUser(row);
}

/**
 * Create a local user.
 */
function createUser({
  name,
  email,
  password,
  role = "CASHIER",
  businessId = null,
}) {
  const database =
    getDatabase();

  const normalizedEmail =
    String(email || "")
      .trim()
      .toLowerCase();

  const normalizedName =
    String(name || "")
      .trim();

  if (!normalizedName) {
    throw new Error(
      "User name is required."
    );
  }

  if (!normalizedEmail) {
    throw new Error(
      "User email is required."
    );
  }

  if (!password) {
    throw new Error(
      "User password is required."
    );
  }

  const allowedRoles = [
    "ADMIN",
    "CASHIER",
    "MANAGER",
  ];

  if (
    !allowedRoles.includes(role)
  ) {
    throw new Error(
      "Invalid user role."
    );
  }

  const existingUser =
    findUserByEmail(
      normalizedEmail
    );

  if (existingUser) {
    throw new Error(
      "A user with this email already exists."
    );
  }

  const id = createId();
  const timestamp = nowIso();
  const passwordHash =
    hashPassword(password);

  database
    .prepare(`
      INSERT INTO users (
        id,
        server_id,
        business_id,
        name,
        email,
        password_hash,
        role,
        created_at,
        updated_at,
        sync_status,
        device_id
      )
      VALUES (
        @id,
        NULL,
        @businessId,
        @name,
        @email,
        @passwordHash,
        @role,
        @createdAt,
        @updatedAt,
        'PENDING',
        @deviceId
      )
    `)
    .run({
      id,
      businessId,
      name: normalizedName,
      email: normalizedEmail,
      passwordHash,
      role,
      createdAt: timestamp,
      updatedAt: timestamp,
      deviceId: DEVICE_ID,
    });

  return findUserById(id);
}

/**
 * Authenticate a user using email and password.
 */
function authenticateUser(
  email,
  password
) {
  const normalizedEmail =
    String(email || "")
      .trim()
      .toLowerCase();

  if (
    !normalizedEmail ||
    !password
  ) {
    return null;
  }

  const row =
    findUserByEmail(
      normalizedEmail
    );

  if (!row) {
    return null;
  }

  const validPassword =
    verifyPassword(
      password,
      row.password_hash
    );

  if (!validPassword) {
    return null;
  }

  return mapUser(row);
}

/**
 * Create the initial local administrator.
 *
 * This runs only when the users table
 * does not already contain a user.
 */
function initializeDefaultAdmin() {
  const database =
    getDatabase();

  const existingUser =
    database
      .prepare(`
        SELECT id
        FROM users
        LIMIT 1
      `)
      .get();

  if (existingUser) {
    return false;
  }

  createUser({
    name: "Administrator",
    email: "admin@offlinebilling.local",
    password: "admin123",
    role: "ADMIN",
  });

  return true;
}

/**
 * Return all users without exposing password hashes.
 */
function getAllUsers() {
  const database =
    getDatabase();

  const rows =
    database
      .prepare(`
        SELECT
          id,
          server_id,
          business_id,
          name,
          email,
          role,
          created_at,
          updated_at,
          sync_status,
          device_id
        FROM users
        ORDER BY name ASC
      `)
      .all();

  return rows.map(mapUser);
}

module.exports = {
  hashPassword,
  verifyPassword,
  findUserByEmail,
  findUserById,
  createUser,
  authenticateUser,
  initializeDefaultAdmin,
  getAllUsers,
};