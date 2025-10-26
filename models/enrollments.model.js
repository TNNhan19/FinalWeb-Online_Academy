// models/enrollments.model.js
import db from "../configs/db.js";

const TABLE = "enrollments";

export async function getCoursesByStudent(studentId) {
  // JOIN enrollments + courses + instructors
  return await db
    .select(
      "c.id as course_id",
      "c.title",
      "c.thumbnail",
      "i.fullname as instructor",
      "e.progress"
    )
    .from(`${TABLE} as e`)
    .join("courses as c", "c.id", "e.course_id")
    .join("instructors as i", "i.id", "c.instructor_id")
    .where("e.student_id", studentId);
}

// Hàm cập nhật tiến độ (khi học viên học xong 1 bài)
export async function updateProgress(studentId, courseId, newProgress) {
  return await db(TABLE)
    .where({ student_id: studentId, course_id: courseId })
    .update({ progress: newProgress });
}
