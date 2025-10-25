import { pool } from "../configs/db.js";

export async function findByEmail(email) {
  const { rows } = await pool.query("SELECT * FROM accounts WHERE email = $1", [email]);
  return rows[0];
}

export async function createAccount(full_name, email, password_hash, otp) {
  const query = `
    INSERT INTO accounts (full_name, email, password_hash, role, is_verified, created_at, otp)
    VALUES ($1, $2, $3, 'student', false, NOW(), $4)
    RETURNING *;
  `;
  const values = [full_name, email, password_hash, otp];
  const { rows } = await pool.query(query, values);
  return rows[0];
}

export async function verifyOTP(email, otp) {
  const { rows } = await pool.query("SELECT otp FROM accounts WHERE email = $1", [email]);
  if (!rows[0] || rows[0].otp !== otp) return false;

  await pool.query("UPDATE accounts SET is_verified = true, otp = NULL WHERE email = $1", [email]);
  return true;
}
