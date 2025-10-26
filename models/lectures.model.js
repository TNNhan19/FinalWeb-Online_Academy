// models/lectures.model.js
import db from "../configs/db.js";

const TABLE = "lectures";

export async function getLecturesByCourse(courseId) {
  return await db(TABLE).where({ course_id: courseId }).orderBy("order_index");
}

export async function markAsLearned(lectureId, studentId) {
  // Giả sử có bảng learned_lectures (student_id, lecture_id)
  const exists = await db("learned_lectures")
    .where({ student_id: studentId, lecture_id: lectureId })
    .first();
  if (!exists) {
    await db("learned_lectures").insert({ student_id: studentId, lecture_id: lectureId });
  }
}
