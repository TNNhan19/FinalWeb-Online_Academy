import express from "express";
import * as Lectures from "../models/lectures.model.js";
import * as Enrollments from "../models/enrollments.model.js";

const router = express.Router();

// Xem khóa học
router.get("/:courseId", async (req, res) => {
  const courseId = req.params.courseId;
  const studentId = req.session.userId;

  const lectures = await Lectures.getLecturesByCourse(courseId);
  const firstLecture = lectures[0];

  res.render("courses/learn", {
    courseId,
    lectures,
    currentLecture: firstLecture,
  });
});

// Khi học xong 1 bài
router.post("/:courseId/complete/:lectureId", async (req, res) => {
  const { courseId, lectureId } = req.params;
  const studentId = req.session.userId;

  await Lectures.markAsLearned(lectureId, studentId);

  // Tính lại tiến độ (%)
  const totalLectures = await Lectures.getLecturesByCourse(courseId);
  const learned = await db("learned_lectures").where({ student_id: studentId }).andWhereIn("lecture_id", totalLectures.map(l => l.id));
  const progress = Math.round((learned.length / totalLectures.length) * 100);

  await Enrollments.updateProgress(studentId, courseId, progress);
  res.redirect(`/learn/${courseId}`);
});

export default router;
