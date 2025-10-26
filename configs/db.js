import pg from "pg";
const { Pool } = pg;

// 🟢 Kết nối Supabase
const pool = new Pool({
  host: "db.ndbcbzxoqstwxhjgwpyj.supabase.co",
  port: 5432,
  user: "postgres",
<<<<<<< HEAD
  password: "dbwebdev123", 
=======
  password: "dbwebdev123", // ⚠️ bạn nên đổi mật khẩu thật, không dùng ref ID làm password
>>>>>>> origin/Emi
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
export { pool };