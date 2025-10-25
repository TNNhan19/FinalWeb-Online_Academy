// models/watchlist.model.js
import { pool } from "../configs/db.js";

export async function getByStudentId(studentId) {
  const query = `
    SELECT c.id, c.title, c.thumbnail, c.price, c.discount_price, i.fullname AS instructor
    FROM watchlist w
    JOIN courses c ON w.course_id = c.id
    JOIN instructors i ON c.instructor_id = i.id
    WHERE w.student_id = $1
    ORDER BY w.created_at DESC
  `;
  const result = await pool.query(query, [studentId]);
  return result.rows;
}

export async function add(studentId, courseId) {
  const exists = await pool.query(
    "SELECT * FROM watchlist WHERE student_id=$1 AND course_id=$2",
    [studentId, courseId]
  );
  if (exists.rowCount === 0) {
    await pool.query(
      "INSERT INTO watchlist (student_id, course_id) VALUES ($1, $2)",
      [studentId, courseId]
    );
  }
}

export async function remove(studentId, courseId) {
  await pool.query(
    "DELETE FROM watchlist WHERE student_id=$1 AND course_id=$2",
    [studentId, courseId]
  );
}
