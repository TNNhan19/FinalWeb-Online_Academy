import express from "express";
import * as courseModel from "../models/courseModel.js";
import db from "../configs/db.js";
import { getTopCategoriesByEnrollment } from "../models/categoryModel.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    // 🧮 Lấy thống kê tổng số lượng
    const [courseCount, studentCount, instructorCount] = await Promise.all([
      db.query("SELECT COUNT(*) FROM courses"),
      db.query("SELECT COUNT(*) FROM students"),
      db.query("SELECT COUNT(*) FROM instructors"),
    ]);

    // 🏷️ Lấy danh sách danh mục
    const categories = await db.query(`
      SELECT c1.category_id, c1.name AS category_name, c2.name AS parent_name
      FROM categories c1
      LEFT JOIN categories c2 ON c1.parent_id = c2.category_id
      ORDER BY c2.name NULLS FIRST, c1.name;
    `);

    // 🔥 Các danh sách khóa học
    const [
      bestSellers,          // khóa học bán chạy
      topViewedCourses,     // khóa học được xem nhiều nhất
      weeklyHighlights,     // khóa học nổi bật trong tuần
      newestCourses,        // khóa học mới nhất
      topCategories         // lĩnh vực được học viên yêu thích nhất
    ] = await Promise.all([
      courseModel.findBestSellers(4),
      courseModel.findTopViewed(10),
      courseModel.findWeeklyHighlights(4),
      courseModel.findNewestCourses(10),
      getTopCategoriesByEnrollment()
    ]);

    // 🖼️ Render trang chủ
    res.render("home/index", {
      pageTitle: "Online Academy",
      categories,
      bestSellers,
      topViewedCourses,
      weeklyHighlights,
      newestCourses,
      topCategories, // ✅ thêm vào view
      user: req.session.user || null,
      stats: {
        courses: Number(courseCount?.[0]?.count || 0),
        students: Number(studentCount?.[0]?.count || 0),
        instructors: Number(instructorCount?.[0]?.count || 0),
      },
    });

  } catch (error) {
    console.error("❌ Lỗi khi tải trang chủ:", error);
    res.render("home/index", {
      pageTitle: "Online Academy",
      error: "Không thể tải dữ liệu từ cơ sở dữ liệu!",
    });
  }
});

export default router;
