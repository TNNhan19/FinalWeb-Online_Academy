// models/feedbacks.model.js
import db from "../configs/db.js";

const TABLE = "feedbacks";

export async function getByStudent(studentId) {
  return await db(TABLE)
    .join("courses", "feedbacks.course_id", "courses.id")
    .select(
      "feedbacks.id",
      "feedbacks.rating",
      "feedbacks.comment",
      "feedbacks.created_at",
      "courses.title as course_title",
      "courses.thumbnail"
    )
    .where("feedbacks.student_id", studentId)
    .orderBy("feedbacks.created_at", "desc");
}

export async function addFeedback(studentId, courseId, rating, comment) {
  return await db(TABLE).insert({
    student_id: studentId,
    course_id: courseId,
    rating,
    comment,
    created_at: new Date(),
  });
}
