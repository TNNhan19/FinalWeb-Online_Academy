import express from "express";
import db from "../configs/db.js";

const router = express.Router();

// Middleware: chỉ admin được truy cập
function ensureAdmin(req, res, next) {
  if (req.user && req.user.role === "admin") return next();
  return res.status(403).send("Truy cập bị từ chối: chỉ quản trị viên được phép.");
}

// ===================
// DASHBOARD
// ===================
router.get("/", ensureAdmin, async (req, res) => {
  const [catCount, courseCount, instructorCount, studentCount] = await Promise.all([
    db.query("SELECT COUNT(*) FROM categories"),
    db.query("SELECT COUNT(*) FROM courses"),
    db.query("SELECT COUNT(*) FROM instructors"),
    db.query("SELECT COUNT(*) FROM students"),
  ]);
  res.render("admin/dashboard", {
    pageTitle: "Bảng điều khiển quản trị",
    stats: {
      categories: catCount[0].count,
      courses: courseCount[0].count,
      instructors: instructorCount[0].count,
      students: studentCount[0].count,
    },
  });
});

// ===================
// QUẢN LÝ LĨNH VỰC
// ===================
router.get("/categories", ensureAdmin, async (req, res) => {
  const rows = await db.query("SELECT * FROM categories ORDER BY category_id ASC");
  res.render("admin/categories", { pageTitle: "Quản lý lĩnh vực", categories: rows });
});

router.post("/categories", ensureAdmin, async (req, res) => {
  const { name, parent_id } = req.body;
  await db.query("INSERT INTO categories (name, parent_id) VALUES ($1, $2)", [
    name,
    parent_id || null,
  ]);
  res.redirect("/admin/categories");
});

router.post("/categories/delete/:id", ensureAdmin, async (req, res) => {
  const { id } = req.params;
  const rows = await db.query("SELECT 1 FROM courses WHERE category_id = $1 LIMIT 1", [id]);
  if (rows.length > 0)
    return res.send("❌ Không thể xoá lĩnh vực vì đã có khoá học liên kết.");
  await db.query("DELETE FROM categories WHERE category_id = $1", [id]);
  res.redirect("/admin/categories");
});

router.post("/categories/update/:id", ensureAdmin, async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  await db.query("UPDATE categories SET name=$1 WHERE category_id=$2", [name, id]);
  res.redirect("/admin/categories");
});

// ===================
// QUẢN LÝ KHÓA HỌC
// ===================
router.get("/courses", ensureAdmin, async (req, res) => {
  const q = `
    SELECT c.course_id, c.title, c.current_price, c.is_bestseller,
           i.name AS instructor, cat.name AS category
    FROM courses c
    LEFT JOIN instructors i ON c.instructor_id = i.instructor_id
    LEFT JOIN categories cat ON c.category_id = cat.category_id
    ORDER BY c.course_id DESC`;
  const rows = await db.query(q);
  res.render("admin/courses", { pageTitle: "Quản lý khoá học", courses: rows });
});

router.post("/courses/delete/:id", ensureAdmin, async (req, res) => {
  await db.query("DELETE FROM courses WHERE course_id = $1", [req.params.id]);
  res.redirect("/admin/courses");
});

// ===================
// QUẢN LÝ NGƯỜI DÙNG
// ===================
router.get("/users", ensureAdmin, async (req, res) => {
  const instructors = await db.query("SELECT * FROM instructors");
  const students = await db.query("SELECT * FROM students");
  res.render("admin/users", {
    pageTitle: "Danh sách người dùng",
    instructors,
    students,
  });
});

export default router;
