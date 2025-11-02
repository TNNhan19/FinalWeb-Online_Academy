import express from "express";
import * as courseModel from "../models/courseModel.js";
import db from "../configs/db.js";
import { getTopCategoriesByEnrollment } from "../models/categoryModel.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    // 🧮 Lấy thống kê tổng số lượng
    const [courseCountRes, studentCountRes, instructorCountRes] = await Promise.all([
    db.query("SELECT COUNT(*) FROM courses WHERE status <> 'suspended'"),
      db.query("SELECT COUNT(*) FROM students"),
      db.query("SELECT COUNT(*) FROM instructors"),
    ]);

    // ✅ Với kiểu trả về mảng (không có .rows)
    const courseCount = Number(courseCountRes[0]?.count || 0);
    const studentCount = Number(studentCountRes[0]?.count || 0);
    const instructorCount = Number(instructorCountRes[0]?.count || 0);

    // 🏷️ Lấy danh mục và gom nhóm cha - con
    const allCategories = await db.query(`
      SELECT category_id, name, parent_id
      FROM categories
      ORDER BY parent_id NULLS FIRST, name;
    `);

    // 🧩 Gom nhóm thành 2 cấp
    const categories = allCategories
      .filter(cat => !cat.parent_id)
      .map(parent => ({
        ...parent,
        subcategories: allCategories.filter(c => c.parent_id === parent.category_id),
      }));

    // 🔥 Các danh sách khóa học
    const [
      bestSellers,
      topViewedCourses,
      weeklyHighlights,
      newestCourses,
      topCategories
    ] = await Promise.all([
      courseModel.findBestSellers(4),
      courseModel.findTopViewed(10),
      courseModel.findWeeklyHighlights(4),
      courseModel.findNewestCourses(10),
      getTopCategoriesByEnrollment()
    ]);

    // 🖼️ Render ra view
    res.render("home/index", {
      pageTitle: "Online Academy",
      layout: "main",
      user: req.session.user || null,
      categories,           // ✅ danh mục 2 cấp
      bestSellers,
      topViewedCourses,
      weeklyHighlights,
      newestCourses,
      topCategories,
      stats: {
        courses: courseCount,
        students: studentCount,
        instructors: instructorCount,
      },
    });

  } catch (error) {
    console.error("❌ Lỗi khi tải trang chủ:", error);
    res.render("home/index", {
      pageTitle: "Online Academy",
      layout: "main",
      error: "Không thể tải dữ liệu từ cơ sở dữ liệu!",
    });
  }
});

export default router;
