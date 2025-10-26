// models/students.model.js
import db from "../configs/db.js";
import bcrypt from "bcryptjs";

const TABLE = "students";

export async function getById(id) {
  return await db(TABLE).where({ id }).first();
}

export async function updateProfile(id, data) {
  return await db(TABLE).where({ id }).update(data);
}

export async function updatePassword(id, oldPass, newPass) {
  const user = await getById(id);
  const match = await bcrypt.compare(oldPass, user.password);
  if (!match) throw new Error("Sai mật khẩu cũ");
  const hashed = await bcrypt.hash(newPass, 10);
  return await db(TABLE).where({ id }).update({ password: hashed });
}
