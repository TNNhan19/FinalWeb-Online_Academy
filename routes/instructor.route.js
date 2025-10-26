import express from "express";
import { pool } from "../configs/db.js";

const router = express.Router();

// Middleware: chỉ cho giảng viên
function ensureInstructor(req, res, next) {
  if (req.user && req.user.role === "instructor") return next();
  return res.status(403).send("Truy cập bị từ chối: chỉ giảng viên được phép.");
}

// ====================
// DASHBOARD
// ====================
router.get("/dashboard", ensureInstructor, async (req, res) => {
  const { account_id } = req.user;
  const q = `
    SELECT c.*, cat.name AS category_name
    FROM courses c
    LEFT JOIN categories cat ON c.category_id = cat.category_id
    JOIN instructors i ON c.instructor_id = i.instructor_id
    WHERE i.account_id = $1
    ORDER BY c.created_at DESC`;
  const { rows } = await pool.query(q, [account_id]);
  res.render("instructor/dashboard", { pageTitle: "Khoá học của tôi", courses: rows });
});

// ====================
// TẠO KHÓA HỌC MỚI
// ====================
router.get("/new", ensureInstructor, (req, res) => {
  res.render("instructor/course_form", { pageTitle: "Đăng khoá học mới", isNew: true });
});

router.post("/new", ensureInstructor, async (req, res) => {
  const { account_id } = req.user;
  const { rows: inst } = await pool.query(
    "SELECT instructor_id FROM instructors WHERE account_id = $1",
    [account_id]
  );
  if (!inst[0]) return res.send("Không tìm thấy hồ sơ giảng viên.");

  const { title, description, image_url, category_id, total_hours, total_lectures, current_price, original_price } = req.body;

  await pool.query(
    `INSERT INTO courses (title, description, image_url, instructor_id, category_id, total_hours, total_lectures, current_price, original_price)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [title, description, image_url, inst[0].instructor_id, category_id || null, total_hours || 0, total_lectures || 0, current_price, original_price]
  );

  res.redirect("/instructor/dashboard");
});

// ====================
// CHỈNH SỬA KHÓA HỌC
// ====================
router.get("/edit/:id", ensureInstructor, async (req, res) => {
  const { account_id } = req.user;
  const { id } = req.params;

  const q = `
    SELECT c.*, i.account_id
    FROM courses c
    JOIN instructors i ON c.instructor_id = i.instructor_id
    WHERE c.course_id = $1 AND i.account_id = $2`;
  const { rows } = await pool.query(q, [id, account_id]);
  if (!rows[0]) return res.status(404).send("Không tìm thấy khoá học.");

  const course = rows[0];
  const sections = (await pool.query("SELECT * FROM course_sections WHERE course_id = $1 ORDER BY order_index", [id])).rows;
  const lectures = (await pool.query(
    `SELECT l.*, s.title AS section_title 
     FROM lectures l 
     JOIN course_sections s ON s.section_id = l.section_id 
     WHERE s.course_id = $1 
     ORDER BY s.order_index, l.order_index`,
    [id]
  )).rows;

  res.render("instructor/course_form", { pageTitle: "Cập nhật khoá học", course, sections, lectures });
});

router.post("/edit/:id", ensureInstructor, async (req, res) => {
  const { id } = req.params;
  const { title, description, image_url, total_hours, total_lectures, current_price, original_price } = req.body;

  await pool.query(
    `UPDATE courses SET title=$1, description=$2, image_url=$3,
     total_hours=$4, total_lectures=$5, current_price=$6, original_price=$7
     WHERE course_id=$8`,
    [title, description, image_url, total_hours, total_lectures, current_price, original_price, id]
  );
  res.redirect("/instructor/dashboard");
});

// ====================
// THÊM CHƯƠNG & BÀI GIẢNG
// ====================
router.post("/section/:course_id", ensureInstructor, async (req, res) => {
  const { course_id } = req.params;
  const { title, order_index } = req.body;
  await pool.query(
    "INSERT INTO course_sections (course_id, title, order_index) VALUES ($1,$2,$3)",
    [course_id, title, order_index || 1]
  );
  res.redirect(`/instructor/edit/${course_id}`);
});

router.post("/lecture/:section_id", ensureInstructor, async (req, res) => {
  const { section_id } = req.params;
  const { title, video_url, duration, is_preview, order_index } = req.body;
  await pool.query(
    `INSERT INTO lectures (section_id, title, video_url, duration, is_preview, order_index)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [section_id, title, video_url, duration, is_preview === "on", order_index || 1]
  );
  res.redirect("back");
});

// ====================
// CẬP NHẬT HỒ SƠ GIẢNG VIÊN
// ====================
router.get("/profile", ensureInstructor, async (req, res) => {
  const { account_id } = req.user;
  const { rows } = await pool.query("SELECT * FROM instructors WHERE account_id = $1", [account_id]);
  res.render("instructor/profile", { pageTitle: "Hồ sơ giảng viên", profile: rows[0] });
});

router.post("/profile", ensureInstructor, async (req, res) => {
  const { account_id } = req.user;
  const { name, bio } = req.body;
  await pool.query(
    `UPDATE instructors SET name=$1, bio=$2 WHERE account_id=$3`,
    [name, bio, account_id]
  );
  res.redirect("/instructor/profile");
});

export default router;
