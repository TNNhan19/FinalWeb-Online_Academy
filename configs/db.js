import dotenv from "dotenv";
dotenv.config();

import pg from "pg";
const { Pool } = pg;

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 5432,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,

  ssl: process.env.DB_SSL === "false" ? false : { rejectUnauthorized: false },
});

// Export default cho file testdb.js import được
const db = {
  async query(text, params) {
    const res = await pool.query(text, params);
    return res.rows;
  },
};

export default db;
export { pool };