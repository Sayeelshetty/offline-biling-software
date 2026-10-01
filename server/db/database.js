const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.NODE_ENV === "production"
      ? {
          rejectUnauthorized: false,
        }
      : false,
});

pool.on("connect", () => {
  console.log("PostgreSQL connection established.");
});

pool.on("error", (error) => {
  console.error("Unexpected PostgreSQL pool error:", error);
});

async function query(text, params) {
  return pool.query(text, params);
}

async function testDatabaseConnection() {
  const result = await pool.query("SELECT NOW()");
  return result.rows[0];
}

module.exports = {
  pool,
  query,
  testDatabaseConnection,
};