import db from "../configs/db.js";

(async () => {
  try {
    const rows = await db.query("SELECT NOW() AS current_time");
    console.log("✅ Connected to Supabase Session Pooler!");
    console.log(rows[0]);
    process.exit(0);
  } catch (err) {
    console.error("❌ Connection failed:", err.message);
    process.exit(1);
  }
})();
