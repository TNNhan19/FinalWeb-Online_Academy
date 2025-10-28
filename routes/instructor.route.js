import express from "express";
import { pool } from "../configs/db.js";

const router = express.Router();

// ✅ Middleware kiểm tra quyền giảng viên
function requireInstructor(req, res, next) {
  if (!req.session.user) return res.redirect("/auth/login");
  if (req.session.user.role !== "instructor") return res.redirect("/");
  next();
}

// ====================
// TRANG CHÍNH GIẢNG VIÊN
// ====================
router.get("/", requireInstructor, async (req, res) => {
  const accountId = req.session.user.account_id;
  const instructorName = req.session.user.full_name;

  try {
    const { rows: stats } = await pool.query(
      `
      SELECT
        COUNT(*) FILTER (WHERE status = 'complete') AS courses,
        COALESCE(SUM(total_lectures), 0) AS lectures
      FROM courses c
      JOIN instructors i ON c.instructor_id = i.instructor_id
      WHERE i.account_id = $1
      `,
      [accountId]
    );

    res.render("instructor/index", {
      layout: "main",
      pageTitle: "Trang giảng viên",
      instructor: { name: instructorName },
      stats: stats[0] || { courses: 0, lectures: 0 },
    });
  } catch (err) {
    console.error("❌ Lỗi khi tải trang giảng viên:", err.message);
    res.render("instructor/index", {
      layout: "main",
      pageTitle: "Trang giảng viên",
      instructor: { name: instructorName },
      stats: { courses: 0, lectures: 0 },
      error: "Không thể tải dữ liệu. Vui lòng thử lại.",
    });
  }
});

// ====================
// DASHBOARD – KHÓA HỌC CỦA TÔI
// ====================
router.get("/dashboard", requireInstructor, async (req, res) => {
  const accountId = req.session.user.account_id;

  try {
    const q = `
      SELECT c.*, cat.name AS category_name
      FROM courses c
      JOIN instructors i ON c.instructor_id = i.instructor_id
      LEFT JOIN categories cat ON c.category_id = cat.category_id
      WHERE i.account_id = $1
      ORDER BY c.created_at DESC
    `;
    const { rows } = await pool.query(q, [accountId]);

    res.render("instructor/dashboard", {
      layout: "main",
      pageTitle: "Khóa học của tôi",
      courses: rows,
    });
  } catch (err) {
    console.error("❌ Lỗi khi tải dashboard:", err.message);
    res.render("instructor/dashboard", {
      layout: "main",
      pageTitle: "Khóa học của tôi",
      courses: [],
      error: "Không thể tải danh sách khóa học.",
    });
  }
});

// ====================
// TẠO KHÓA HỌC MỚI
// ====================
router.get("/new", requireInstructor, async (req, res) => {
  try {
    const { rows: categories } = await pool.query(
      "SELECT * FROM categories ORDER BY name ASC"
    );
    res.render("instructor/course_form", {
      layout: "main",
      pageTitle: "Đăng khóa học mới",
      isNew: true,
      categories,
    });
  } catch (err) {
    console.error("❌ Lỗi khi tải form đăng khóa học:", err.message);
    res.redirect("/instructor/dashboard");
  }
});

router.post("/new", requireInstructor, async (req, res) => {
  const accountId = req.session.user.account_id;

  try {
    const { rows: inst } = await pool.query(
      "SELECT instructor_id FROM instructors WHERE account_id = $1",
      [accountId]
    );

    if (!inst.length) {
      return res.send("❌ Không tìm thấy hồ sơ giảng viên.");
    }

    const {
      title,
      description,
      detail_html,
      image_url,
      category_id,
      total_hours,
      total_lectures,
      current_price,
      original_price,
    } = req.body;

    await pool.query(
      `
      INSERT INTO courses 
        (title, description, detail_html, image_url, instructor_id, category_id, 
         total_hours, total_lectures, current_price, original_price, status, created_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'incomplete',NOW())
      `,
      [
        title,
        description,
        detail_html,
        image_url,
        inst[0].instructor_id,
        category_id || null,
        total_hours || 0,
        total_lectures || 0,
        current_price,
        original_price,
      ]
    );

    res.redirect("/instructor/dashboard");
  } catch (err) {
    console.error("❌ Lỗi khi đăng khóa học:", err.message);
    res.render("instructor/course_form", {
      layout: "main",
      pageTitle: "Đăng khóa học mới",
      error: "Không thể đăng khóa học. Vui lòng thử lại.",
      isNew: true,
    });
  }
});

// ====================
// CHỈNH SỬA KHÓA HỌC
// ====================
router.get("/edit/:id", requireInstructor, async (req, res) => {
  const { id } = req.params;
  const accountId = req.session.user.account_id;

  try {
    const { rows: courseRows } = await pool.query(
      `
      SELECT c.*, cat.name AS category_name
      FROM courses c
      JOIN instructors i ON c.instructor_id = i.instructor_id
      LEFT JOIN categories cat ON c.category_id = cat.category_id
      WHERE c.course_id = $1 AND i.account_id = $2
      `,
      [id, accountId]
    );

    if (!courseRows.length) {
      return res.redirect("/instructor/dashboard");
    }

    const course = courseRows[0];
    const { rows: categories } = await pool.query(
      "SELECT * FROM categories ORDER BY name ASC"
    );
    const { rows: sections } = await pool.query(
      "SELECT * FROM course_sections WHERE course_id = $1 ORDER BY order_index",
      [id]
    );
    const { rows: lectures } = await pool.query(
      `
      SELECT l.*, s.title AS section_title 
      FROM lectures l 
      JOIN course_sections s ON s.section_id = l.section_id 
      WHERE s.course_id = $1 
      ORDER BY s.order_index, l.order_index
      `,
      [id]
    );

    res.render("instructor/course_form", {
      layout: "main",
      pageTitle: "Cập nhật khóa học",
      isNew: false,
      course,
      categories,
      sections,
      lectures,
    });
  } catch (err) {
    console.error("❌ Lỗi khi chỉnh sửa khóa học:", err.message);
    res.redirect("/instructor/dashboard");
  }
});

// ====================
// HỒ SƠ GIẢNG VIÊN
// ====================
router.get("/profile", requireInstructor, async (req, res) => {
  const accountId = req.session.user.account_id;

  try {
    const { rows: profileRows } = await pool.query(
      `
      SELECT i.*, a.email, a.full_name
      FROM instructors i
      JOIN accounts a ON i.account_id = a.account_id
      WHERE i.account_id = $1
      `,
      [accountId]
    );

    const profile = profileRows[0];

    if (!profile) {
      return res.render("instructor/profile", {
        layout: "main",
        pageTitle: "Hồ sơ giảng viên",
        error: "Không tìm thấy hồ sơ giảng viên. Vui lòng tạo mới!",
      });
    }

    const { rows: courseRows } = await pool.query(
      `
      SELECT c.course_id, c.title, c.status, c.current_price, cat.name AS category_name
      FROM courses c
      LEFT JOIN categories cat ON c.category_id = cat.category_id
      WHERE c.instructor_id = $1
      ORDER BY c.created_at DESC
      `,
      [profile.instructor_id]
    );

    res.render("instructor/profile", {
      layout: "main",
      pageTitle: "Hồ sơ giảng viên",
      profile,
      courses: courseRows,
    });
  } catch (err) {
    console.error("❌ Lỗi khi tải hồ sơ giảng viên:", err.message);
    res.render("instructor/profile", {
      layout: "main",
      pageTitle: "Hồ sơ giảng viên",
      error: "Không thể tải hồ sơ. Vui lòng thử lại.",
    });
  }
});

export default router;
