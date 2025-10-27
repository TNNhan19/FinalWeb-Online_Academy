import 'dotenv/config';
import pg from "pg";
const { Pool } = pg;

// 🟢 Kết nối Supabase
const pool = new Pool({
  host: "db.ndbcbzxoqstwxhjgwpyj.supabase.co",
  port: 5432,
  user: "postgres",
  password: "dbwebdev123", // ⚠️ bạn nên đổi mật khẩu thật, không dùng ref ID làm password
  database: "postgres",
  ssl: { rejectUnauthorized: false },
});

const db = {
  async query(text, params) {
    const res = await pool.query(text, params);
    return res.rows;
  },
};

export default db;
export { pool };