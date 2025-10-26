import db from "../configs/db.js";

export async function findByEmail(email) {
  const rows = await db.query("SELECT * FROM accounts WHERE email = $1", [email]);
  return rows[0];
}

export async function createAccount(full_name, email, password_hash, otp) {
  const query = `
    INSERT INTO accounts (full_name, email, password_hash, role, is_verified, created_at, otp)
    VALUES ($1, $2, $3, 'student', false, NOW(), $4)
    RETURNING *;
  `;
  const values = [full_name, email, password_hash, otp];
  const rows = await db.query(query, values);
  return rows[0];
}

export async function verifyOTP(email, otp) {
  const rows = await db.query("SELECT otp FROM accounts WHERE email = $1", [email]);
  if (!rows[0] || rows[0].otp !== otp) return false;
  await db.query("UPDATE accounts SET is_verified = true, otp = NULL WHERE email = $1", [email]);
  return true;
}

export async function findById(id) {
  const rows = await db.query("SELECT * FROM accounts WHERE id = $1", [id]);
  return rows[0];
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
