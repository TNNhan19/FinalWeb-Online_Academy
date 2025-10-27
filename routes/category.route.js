import express from "express";
import { getCoursesByCategory } from "../models/courseModel.js";

const router = express.Router();

// 🟢 API trả danh sách khóa học theo tên danh mục
router.get("/api/:categoryName", async (req, res) => {
  try {
    const { categoryName } = req.params;

    // Gọi model lấy dữ liệu
    const courses = await getCoursesByCategory(categoryName);

    // Debug log để xem kết quả thực tế

    res.json(courses);
  } catch (error) {
    console.error("❌ Lỗi khi lấy khóa học theo danh mục:", error.message);
    res.status(500).json({ error: "Không thể tải danh sách khóa học." });
  }
});

// 🟢 Trang render (nếu cần hiển thị riêng)
router.get("/:categoryName", async (req, res) => {
  try {
    const { categoryName } = req.params;

    const courses = await getCoursesByCategory(categoryName);

    res.render("category", {
      pageTitle: categoryName,
      categoryName,
      courses,
    });
  } catch (error) {
    console.error("❌ Lỗi khi hiển thị trang danh mục:", error.message);
    res.status(500).render("error", { message: "Không thể tải trang danh mục." });
  }
});

export default router;
