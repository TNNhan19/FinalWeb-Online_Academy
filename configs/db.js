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
    try {
      const res = await pool.query(text, params);
      return res.rows;
    } catch (err) {
      if (err && (err.code === 'ENOTFOUND' || err.errno === -3008)) {
        console.error('\n\n❌ Database connection failed: could not resolve host', process.env.DB_HOST);
        console.error(' - Check your DB_HOST in .env and your network/DNS settings.');
        console.error(' - If you are developing locally, consider setting DB_HOST=localhost and running a local Postgres.');
        console.error(' - Example (PowerShell): nslookup ' + process.env.DB_HOST);
        console.error(' - Example (PowerShell): Test-NetConnection -ComputerName ' + process.env.DB_HOST + ' -Port ' + (process.env.DB_PORT || 5432));
      }
      throw err;
    }
  },
};

export default db;
export { pool };

// Optional: test connection on startup and log a helpful message (non-fatal)
(async function testConnection() {
  try {
    const client = await pool.connect();
    client.release();
    console.log('✅ Database pool connected to', process.env.DB_HOST || 'localhost');
  } catch (err) {
    console.error('\n❌ Initial database connection test failed:', err && err.message);
    console.error('   Host:', process.env.DB_HOST);
    console.error('   Port:', process.env.DB_PORT || 5432);
    console.error('   User:', process.env.DB_USER);
    console.error('   If this is unexpected, check your .env and network connectivity.');
  }
})();