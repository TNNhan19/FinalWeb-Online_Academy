import express from "express";
import { getCoursesByCategory, findBestSellers } from "../models/courseModel.js";
import { getTopCategoriesByEnrollment } from "../models/categoryModel.js";

const router = express.Router();


router.get("/api/all/:categoryName", async (req, res) => {
  try {
    const { categoryName } = req.params;

    const courses = await getCoursesByCategory(categoryName);

    if (!courses || courses.length === 0) {
      console.warn(` Không tìm thấy khóa học thuộc danh mục: ${categoryName}`);
      return res.json([]);
    }

    res.json(courses);
  } catch (error) {
    console.error(" Lỗi khi lấy tất cả khóa học:", error);
    res.status(500).json({ error: "Không thể tải danh sách khóa học. Vui lòng thử lại!" });
  }
});


router.get("/api/bestseller/:categoryName", async (req, res) => {
  try {
    const { categoryName } = req.params;

    const isAll =
      categoryName.toLowerCase() === "all" ||
      categoryName.toLowerCase() === "tất cả";

    const courses = await findBestSellers(8, isAll ? null : categoryName);

    if (!courses || courses.length === 0) {
      console.warn(`Không có khóa học bán chạy trong danh mục: ${categoryName}`);
      return res.json([]);
    }

    res.json(courses);
  } catch (error) {
    console.error("Lỗi khi lấy khóa học bán chạy:", error);
    res.status(500).json({ error: "Không thể tải danh sách khóa học bán chạy." });
  }
});


router.get("/api/top-categories", async (req, res) => {
  try {
    const topCategories = await getTopCategoriesByEnrollment();
    res.json(topCategories || []);
  } catch (error) {
    console.error(" Lỗi khi lấy top lĩnh vực:", error);
    res.status(500).json({
      error: "Không thể tải danh sách lĩnh vực được đăng ký nhiều nhất.",
    });
  }
});


router.get("/top-categories", async (req, res) => {
  try {
    const topCategories = await getTopCategoriesByEnrollment();
    res.render("categories/topCategories", {
      pageTitle: "Lĩnh vực được học nhiều nhất trong tuần",
      layout: "main",
      topCategories,
    });
  } catch (error) {
    console.error(" Lỗi khi render top categories:", error);
    res.render("categories/topCategories", {
      pageTitle: "Lĩnh vực được học nhiều nhất trong tuần",
      layout: "main",
      topCategories: [],
    });
  }
});

export default router;
