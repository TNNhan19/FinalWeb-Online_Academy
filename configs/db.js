import pg from "pg";
const { Pool } = pg;

// 🟢 Kết nối Supabase
const pool = new Pool({
  host: "db.ndbcbzxoqstwxhjgwpyj.supabase.co",
  port: 5432,
  user: "postgres",
  password: "dbwebdev123",
  database: "postgres",
  ssl: { rejectUnauthorized: false },
});

// 🟢 Export default cho file testdb.js import được
const db = {
  async query(text, params) {
    const res = await pool.query(text, params);
    return res.rows;
  },
};

export default db;
