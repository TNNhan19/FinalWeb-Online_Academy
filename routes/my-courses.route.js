// routes/my-courses.route.js
import express from "express";
import * as Enrollments from "../models/enrollments.model.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const studentId = req.session.userId;
    const courses = await Enrollments.getCoursesByStudent(studentId);
    res.render("profile/my-courses", { courses });
  } catch (err) {
    res.render("profile/my-courses", { error: "Không thể tải danh sách khóa học." });
  }
});

export default router;
