import express from "express";
import * as courseModel from "../models/courseModel.js";
import db from "../configs/db.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    // Queries to get the counts (New)
    const [courseCount, studentCount, instructorCount] = await Promise.all([
      db.query("SELECT COUNT(*) FROM courses"),
      db.query("SELECT COUNT(*) FROM students"),
      db.query("SELECT COUNT(*) FROM instructors"),
    ]);

    // Your existing queries
    const categories = await db.query(`
      SELECT c1.category_id, c1.name AS category_name, c2.name AS parent_name
      FROM categories c1
      LEFT JOIN categories c2 ON c1.parent_id = c2.category_id
      ORDER BY c2.name NULLS FIRST, c1.name;
    `);

    const popularCourses = await courseModel.findPopular(10);
    const newCourses = await courseModel.findAll();
    const newestCourses = newCourses.slice(0, 10);

    res.render("home/index", {
      pageTitle: "Online Academy",
      categories,
      popularCourses,
      newestCourses,
      user: req.session.user || null,
      // Pass the new stats object to the view (New)
      stats: {
        courses: courseCount[0].count || 0,
        students: studentCount[0].count || 0,
        instructors: instructorCount[0].count || 0,
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