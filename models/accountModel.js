import db, { pool } from "../configs/db.js";

export async function findByEmail(email) {
  const rows = await db.query("SELECT * FROM accounts WHERE email = $1", [email]);
  return rows[0];
}

// 🔍 Tìm theo ID
export async function findById(id) {
  const result = await pool.query("SELECT * FROM accounts WHERE account_id = $1", [id]);
  return result.rows[0];
}

// 🆕 Tạo user mới từ Google OAuth
export async function createFromOAuth({ email, full_name, role = "student", provider = "google" }) {
  const result = await pool.query(
    `INSERT INTO accounts (email, full_name, role, is_verified)
     VALUES ($1, $2, $3, TRUE)
     RETURNING *`,
    [email, full_name, role]
  );
  return result.rows[0];  
}

export async function createAccount(full_name, email, password_hash, otp, role = 'student') {
  // Use a transaction to ensure both account and student profile are created
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Insert into accounts table
    const accountQuery = `
      INSERT INTO accounts (full_name, email, password_hash, role, is_verified, created_at, otp)
      VALUES ($1, $2, $3, $4, false, NOW(), $5)
      RETURNING account_id, full_name, role;
    `;
    const accountValues = [full_name, email, password_hash, role, otp];
    const accountResult = await client.query(accountQuery, accountValues);
    const newAccount = accountResult.rows[0];

    // ✨ If the role is 'student', create a corresponding student record
    if (newAccount && newAccount.role === 'student') {
      const studentQuery = `
        INSERT INTO students (account_id, name, created_at)
        VALUES ($1, $2, NOW());
      `;
      // Use the full_name from the account as the initial student name
      await client.query(studentQuery, [newAccount.account_id, newAccount.full_name]);
      console.log(`✅ Created student record for account_id: ${newAccount.account_id}`);
    }
     // ✨ Add similar logic here for 'instructor' if needed

    await client.query('COMMIT');
    return newAccount; // Return the created account info

  } catch (error) {
    await client.query('ROLLBACK');
    console.error("❌ Error during account creation transaction:", error);
    throw error; // Re-throw the error
  } finally {
    client.release();
  }
}
export async function verifyOTP(email, otp) {
  const rows = await db.query("SELECT otp FROM accounts WHERE email = $1", [email]);
  if (!rows[0] || rows[0].otp !== otp) return false;
  await db.query("UPDATE accounts SET is_verified = true, otp = NULL WHERE email = $1", [email]);
  return true;
}



export async function updateAvatar(id, avatarUrl) {
  const query = `
    UPDATE accounts 
    SET avatar = $1
    WHERE id = $2
    RETURNING *;
  `;
  const rows = await db.query(query, [avatarUrl, id]);
  return rows[0];
}

export async function updateProfile(id, full_name) {
  const query = `
    UPDATE accounts 
    SET full_name = $1
    WHERE id = $2
    RETURNING *;
  `;
  const rows = await db.query(query, [full_name, id]);
  return rows[0];
}

export async function updatePassword(id, newHash) {
  const query = `
    UPDATE accounts 
    SET password_hash = $1
    WHERE id = $2
    RETURNING *;
  `;
  const rows = await db.query(query, [newHash, id]);
  return rows[0];
}
