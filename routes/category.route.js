import express from "express";
import { getCoursesByCategory, findBestSellers } from "../models/courseModel.js";
import { getTopCategoriesByEnrollment } from "../models/categoryModel.js";

const router = express.Router();

// 🟢 API 1: Trả TẤT CẢ khóa học theo danh mục (cho phần “Danh Mục Khóa Học”)
router.get("/api/all/:categoryName", async (req, res) => {
  try {
    const { categoryName } = req.params;
    const courses = await getCoursesByCategory(categoryName);

    if (!courses || courses.length === 0) {
      return res.status(404).json([]);
    }

    res.json(courses);
  } catch (error) {
    console.error("❌ Lỗi khi lấy tất cả khóa học:", error.message);
    res.status(500).json({ error: "Không thể tải danh sách khóa học." });
  }
});

// 🟢 API 2: Trả khóa học BÁN CHẠY theo danh mục (cho phần “Khóa Học Phổ Biến”)
router.get("/api/bestseller/:categoryName", async (req, res) => {
  try {
    const { categoryName } = req.params;
    const isAll =
      categoryName.toLowerCase() === "all" ||
      categoryName.toLowerCase() === "tất cả";

    const courses = await findBestSellers(8, isAll ? null : categoryName);

    if (!courses || courses.length === 0) {
      return res.status(404).json([]);
    }

    res.json(courses);
  } catch (error) {
    console.error("❌ Lỗi khi lấy khóa học bán chạy:", error.message);
    res
      .status(500)
      .json({ error: "Không thể tải danh sách khóa học bán chạy." });
  }
});

// 🟢 API 3: Danh sách lĩnh vực được học viên đăng ký nhiều nhất trong tuần qua
router.get("/api/top-categories", async (req, res) => {
  try {
    const topCategories = await getTopCategoriesByEnrollment();
    res.json(topCategories);
  } catch (error) {
    console.error("❌ Lỗi khi lấy top lĩnh vực:", error.message);
    res
      .status(500)
      .json({ error: "Không thể tải danh sách lĩnh vực được đăng ký nhiều nhất." });
  }
});

// 🟢 Trang hiển thị (nếu render bằng Handlebars)
router.get("/top-categories", async (req, res) => {
  try {
    const topCategories = await getTopCategoriesByEnrollment();
    res.render("categories/topCategories", {
      pageTitle: "Lĩnh vực được học nhiều nhất trong tuần",
      layout: "main",
      topCategories,
    });
  } catch (error) {
    console.error("❌ Lỗi khi render top categories:", error.message);
    res.render("categories/topCategories", {
      pageTitle: "Lĩnh vực được học nhiều nhất trong tuần",
      layout: "main",
      topCategories: [],
    });
  }
});

export default router;
