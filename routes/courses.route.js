import express from "express";
import { findById, getCourseDetailsById } from "../models/courseModel.js";

const router = express.Router();

// 🟢 Lấy chi tiết khóa học
router.get("/detail/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const course = await findById(id);
    if (!course) {
      return res.status(404).json({ error: "Không tìm thấy khóa học" });
    }
    res.json(course);
  } catch (error) {
    console.error("❌ Lỗi khi lấy chi tiết khóa học:", error.message);
    res.status(500).json({ error: "Lỗi khi tải chi tiết khóa học." });
  }
});

// --- ROUTE 2: FOR THE FULL DETAIL PAGE (From your branch) ---
// This renders the full HTML page when "Xem chi tiết" is clicked
router.get('/:id', async (req, res, next) => {
  try {
    const courseId = req.params.id;
    if (isNaN(courseId)) {
       return res.status(400).render('error', {
         layout: 'main',
         pageTitle: "ID không hợp lệ",
         message: "ID khóa học không hợp lệ."
       });
    }

    // Use the NEW function to get all details
    const courseDetails = await getCourseDetailsById(courseId);

    if (!courseDetails || !courseDetails.course) {
      return res.status(404).render('error', {
        layout: 'main',
        pageTitle: "Không tìm thấy",
        message: "Xin lỗi, không tìm thấy khóa học bạn yêu cầu."
      });
    }

    // Render the full detail page
    res.render('courses/detail', { // Renders views/courses/detail.hbs
      layout: 'main',
      pageTitle: courseDetails.course.title,
      ...courseDetails,
      user: req.session.user
    });

  } catch (error) {
    console.error("❌ Lỗi khi lấy chi tiết khóa học (PAGE):", error);
    next(error); // Pass to central error handler
  }
});

export default router;
