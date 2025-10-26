import pg from "pg";
const { Pool } = pg;

export const pool = new Pool({
  host: "aws-1-ap-southeast-1.pooler.supabase.com",      
  port: 5432,                  
  user: "postgres.ndbcbzxoqstwxhjgwpyj",            
  password: "dbwebdev123",  
  database: "postgres",  
  ssl: { rejectUnauthorized: false },
});

export default pool;