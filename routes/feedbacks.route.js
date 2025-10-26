import express from "express";
import * as Feedbacks from "../models/feedbacks.model.js";
import * as Enrollments from "../models/enrollments.model.js"; // để check học viên có học khóa đó chưa

const router = express.Router();

// Hiển thị tất cả feedback của học viên
router.get("/", async (req, res) => {
  try {
    const studentId = req.session.userId;
    const feedbacks = await Feedbacks.getByStudent(studentId);
    res.render("profile/feedbacks", { feedbacks });
  } catch (err) {
    console.error(err);
    res.render("profile/feedbacks", { error: "Không thể tải đánh giá của bạn." });
  }
});

// Form gửi feedback (GET /feedbacks/add?course_id=)
router.get("/add", async (req, res) => {
  const courseId = req.query.course_id;
  res.render("profile/feedbacks", { addMode: true, courseId });
});

// Xử lý gửi feedback
router.post("/add", async (req, res) => {
  try {
    const studentId = req.session.userId;
    const { course_id, rating, comment } = req.body;
    await Feedbacks.addFeedback(studentId, course_id, rating, comment);
    res.redirect("/feedbacks");
  } catch (err) {
    console.error(err);
    res.render("profile/feedbacks", { error: "Không thể gửi đánh giá." });
  }
});

export default router;
