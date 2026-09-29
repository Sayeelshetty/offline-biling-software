const { randomUUID } = require("crypto");
const { getDatabase } = require("../connection.cjs");

function mapCategoryRow(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    serverId: row.server_id,
    name: row.name,
    description: row.description,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    syncStatus: row.sync_status,
    deviceId: row.device_id,
  };
}

function createCategory({ name, description = "", deviceId }) {
  const database = getDatabase();

  if (!name || !name.trim()) {
    throw new Error("Category name is required");
  }

  if (!deviceId || !deviceId.trim()) {
    throw new Error("Device ID is required");
  }

  const id = randomUUID();
  const now = new Date().toISOString();

  const statement = database.prepare(`
    INSERT INTO categories (
      id,
      server_id,
      name,
      description,
      status,
      created_at,
      updated_at,
      sync_status,
      device_id
    )
    VALUES (
      @id,
      NULL,
      @name,
      @description,
      'ACTIVE',
      @createdAt,
      @updatedAt,
      'PENDING',
      @deviceId
    )
  `);

  statement.run({
    id,
    name: name.trim(),
    description: description.trim(),
    createdAt: now,
    updatedAt: now,
    deviceId: deviceId.trim(),
  });

  return getCategoryById(id);
}

function getCategoryById(id) {
  const database = getDatabase();

  const row = database
    .prepare(`
      SELECT
        id,
        server_id,
        name,
        description,
        status,
        created_at,
        updated_at,
        sync_status,
        device_id
      FROM categories
      WHERE id = ?
    `)
    .get(id);

  return mapCategoryRow(row);
}

function getCategoryByName(name) {
  const database = getDatabase();

  const row = database
    .prepare(`
      SELECT
        id,
        server_id,
        name,
        description,
        status,
        created_at,
        updated_at,
        sync_status,
        device_id
      FROM categories
      WHERE LOWER(name) = LOWER(?)
      LIMIT 1
    `)
    .get(name.trim());

  return mapCategoryRow(row);
}

function getAllCategories({ includeInactive = false } = {}) {
  const database = getDatabase();

  let query = `
    SELECT
      id,
      server_id,
      name,
      description,
      status,
      created_at,
      updated_at,
      sync_status,
      device_id
    FROM categories
  `;

  if (!includeInactive) {
    query += ` WHERE status = 'ACTIVE' `;
  }

  query += ` ORDER BY name COLLATE NOCASE ASC `;

  const rows = database.prepare(query).all();

  return rows.map(mapCategoryRow);
}

function searchCategories(searchText = "", { includeInactive = false } = {}) {
  const database = getDatabase();

  const search = `%${searchText.trim()}%`;

  let query = `
    SELECT
      id,
      server_id,
      name,
      description,
      status,
      created_at,
      updated_at,
      sync_status,
      device_id
    FROM categories
    WHERE (
      LOWER(name) LIKE LOWER(@search)
      OR LOWER(COALESCE(description, '')) LIKE LOWER(@search)
    )
  `;

  if (!includeInactive) {
    query += ` AND status = 'ACTIVE' `;
  }

  query += ` ORDER BY name COLLATE NOCASE ASC `;

  const rows = database.prepare(query).all({
    search,
  });

  return rows.map(mapCategoryRow);
}

function updateCategory({
  id,
  name,
  description = "",
}) {
  const database = getDatabase();

  if (!id) {
    throw new Error("Category ID is required");
  }

  if (!name || !name.trim()) {
    throw new Error("Category name is required");
  }

  const existingCategory = getCategoryById(id);

  if (!existingCategory) {
    throw new Error("Category not found");
  }

  const now = new Date().toISOString();

  const statement = database.prepare(`
    UPDATE categories
    SET
      name = @name,
      description = @description,
      updated_at = @updatedAt,
      sync_status = 'PENDING'
    WHERE id = @id
  `);

  statement.run({
    id,
    name: name.trim(),
    description: description.trim(),
    updatedAt: now,
  });

  return getCategoryById(id);
}

function deactivateCategory(id) {
  const database = getDatabase();

  if (!id) {
    throw new Error("Category ID is required");
  }

  const existingCategory = getCategoryById(id);

  if (!existingCategory) {
    throw new Error("Category not found");
  }

  const now = new Date().toISOString();

  database
    .prepare(`
      UPDATE categories
      SET
        status = 'INACTIVE',
        updated_at = ?,
        sync_status = 'PENDING'
      WHERE id = ?
    `)
    .run(now, id);

  return getCategoryById(id);
}

function activateCategory(id) {
  const database = getDatabase();

  if (!id) {
    throw new Error("Category ID is required");
  }

  const existingCategory = getCategoryById(id);

  if (!existingCategory) {
    throw new Error("Category not found");
  }

  const now = new Date().toISOString();

  database
    .prepare(`
      UPDATE categories
      SET
        status = 'ACTIVE',
        updated_at = ?,
        sync_status = 'PENDING'
      WHERE id = ?
    `)
    .run(now, id);

  return getCategoryById(id);
}

module.exports = {
  createCategory,
  getCategoryById,
  getCategoryByName,
  getAllCategories,
  searchCategories,
  updateCategory,
  deactivateCategory,
  activateCategory,
};