// routes/courses.route.js
import express from "express";
import { isInWatchlist, addToWatchlist, removeFromWatchlist } from "../models/profileModel.js";
import db from "../configs/db.js";
import { findById, getCourseDetailsById } from "../models/courseModel.js";

const router = express.Router();

/* ===========================================================
   🧠 1️⃣ API: Lấy chi tiết khóa học + tăng lượt xem (dành cho modal / AJAX)
   =========================================================== */
router.get("/detail/:id", async (req, res) => {
  try {
    const courseId = parseInt(req.params.id);

    if (isNaN(courseId)) {
      return res.status(400).json({ error: "ID khóa học không hợp lệ" });
    }

    // 1️⃣ Tăng view trong bảng "courses"
    await db.query("UPDATE courses SET view = view + 1 WHERE course_id = $1", [courseId]);

    // 2️⃣ Ghi log lượt xem vào bảng "course_views"
    await db.query(
      "INSERT INTO course_views (course_id, viewed_at) VALUES ($1, NOW())",
      [courseId]
    );

    // 3️⃣ Lấy lại thông tin chi tiết khóa học
    const course = await findById(courseId);
    if (!course) {
      return res.status(404).json({ error: "Khóa học không tồn tại" });
    }

    // ✅ Trả dữ liệu JSON cho front-end (dùng trong modal)
    res.json(course);
  } catch (error) {
    console.error("❌ Lỗi khi tải chi tiết khóa học:", error);
    res.status(500).json({ error: "Không thể tải dữ liệu khóa học." });
  }
});

/* ===========================================================
   🧱 2️⃣ Trang chi tiết đầy đủ (hiển thị giao diện .hbs)
   =========================================================== */
router.get("/:id", async (req, res, next) => {
  try {
    const courseId = parseInt(req.params.id);
    if (isNaN(courseId)) {
      return res.status(400).render("error", {
        layout: "main",
        pageTitle: "ID không hợp lệ",
        message: "ID khóa học không hợp lệ.",
      });
    }

    // 🧠 Lấy toàn bộ chi tiết (instructor, section, review, gallery,…)
    const courseDetails = await getCourseDetailsById(courseId);

    if (!courseDetails || !courseDetails.course) {
      return res.status(404).render("error", {
        layout: "main",
        pageTitle: "Không tìm thấy",
        message: "Xin lỗi, không tìm thấy khóa học bạn yêu cầu.",
      });
    }

    // ✅ Render ra trang chi tiết khóa học
    res.render("courses/detail", {
      layout: "main",
      pageTitle: courseDetails.course.title,
      ...courseDetails,
      user: req.session.user || null,
    });
  } catch (error) {
    console.error("❌ Lỗi khi lấy chi tiết khóa học (PAGE):", error);
    next(error);
  }
});

/* ===========================================================
   💖 3️⃣ Thêm khóa học vào danh sách yêu thích (Watchlist)
   =========================================================== */
router.post("/:id/favorite", async (req, res) => {
  try {
    const user = req.session.user;
    const courseId = req.params.id;

    if (!user) return res.redirect("/auth/login");

    await addToWatchlist(user.account_id, courseId);
    return res.redirect(`/courses/${courseId}`);
  } catch (err) {
    console.error("❌ Lỗi add watchlist:", err);
    return res.status(500).send("Lỗi server");
  }
});

/* ===========================================================
   💔 4️⃣ Xóa khóa học khỏi danh sách yêu thích (Watchlist)
   =========================================================== */
router.post("/:id/unfavorite", async (req, res) => {
  try {
    const user = req.session.user;
    const courseId = req.params.id;

    if (!user) return res.redirect("/auth/login");

    await removeFromWatchlist(user.account_id, courseId);
    return res.redirect(`/courses/${courseId}`);
  } catch (err) {
    console.error("❌ Lỗi remove watchlist:", err);
    return res.status(500).send("Lỗi server");
  }
});

export default router;
