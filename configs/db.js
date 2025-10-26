import pg from "pg";
const { Pool } = pg;

export const pool = new Pool({
  host: "db.ndbcbzxoqstwxhjgwpyj.supabase.co",      
  port: 5432,                  
  user: "postgres",            
  password: "ndbcbzxoqstwxhjgwpyj",  
  database: "postgres",  
  ssl: { rejectUnauthorized: false 
    
  },
});
