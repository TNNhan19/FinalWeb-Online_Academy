import 'dotenv/config';
import pg from "pg";
const { Pool } = pg;

// Build pool config after env is loaded
const connectionString = process.env.DATABASE_URL;

const poolConfig = {};
if (connectionString && connectionString.length > 0) {
  poolConfig.connectionString = connectionString;
}

// Enable SSL by default for hosted providers (e.g., Supabase/Render)
// Allow override via DB_SSL env ("true"/"false")
const sslEnabled = (process.env.DB_SSL ?? "true").toLowerCase() === "true";
if (sslEnabled) {
  poolConfig.ssl = { rejectUnauthorized: false };
}

poolConfig.connectionTimeoutMillis = Number(process.env.DB_CONNECT_TIMEOUT_MS ?? 8000);

const pool = new Pool(poolConfig);

const db = {
  async query(text, params) {
    const res = await pool.query(text, params);
    return res.rows;
  },
};

export default db;
export { pool };