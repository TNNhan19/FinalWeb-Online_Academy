import express from "express";
import { pool } from "../configs/db.js";
import multer from "multer";
import path from "path";
import fs from "fs";

const uploadDir = path.join(process.cwd(), "Public", "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});
const upload = multer({ storage });

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

// ====================
// TẠO KHÓA HỌC MỚI (CÓ UPLOAD ẢNH)
// ====================
router.post("/new", requireInstructor, upload.single("image_file"), async (req, res) => {
  const accountId = req.session.user.account_id;

  try {
    // 🔹 Lấy instructor_id từ account_id
    const { rows: inst } = await pool.query(
      "SELECT instructor_id FROM instructors WHERE account_id = $1",
      [accountId]
    );

    if (!inst.length) {
      return res.send("❌ Không tìm thấy hồ sơ giảng viên.");
    }

    // 🔹 Lấy dữ liệu từ form
    const {
      title,
      description,
      detail_html,
      category_id,
      total_hours,
      total_lectures,
      current_price,
      original_price,
    } = req.body;

    // 🔹 Xử lý ảnh upload
    const image_url = req.file
      ? `/uploads/${req.file.filename}`  // Nếu upload file mới
      : req.body.image_url || null;      // Nếu không upload, lấy link sẵn có

    // 🔹 Lưu vào database
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
// CHỈNH SỬA KHÓA HỌC (HIỂN THỊ FORM)
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
    const { rows: categories } = await pool.query("SELECT * FROM categories ORDER BY name ASC");
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
// CẬP NHẬT (CHỈNH SỬA) KHÓA HỌC
// ====================
router.post("/edit/:id", requireInstructor, upload.single("image_file"), async (req, res) => {
  const { id } = req.params;
  const accountId = req.session.user.account_id;

  try {
    // 🔒 Kiểm tra quyền sở hữu
    const { rows: ownership } = await pool.query(
      `
      SELECT c.*, i.instructor_id
      FROM courses c
      JOIN instructors i ON c.instructor_id = i.instructor_id
      WHERE c.course_id = $1 AND i.account_id = $2
      `,
      [id, accountId]
    );

    if (!ownership.length) {
      return res.status(403).send("❌ Bạn không có quyền chỉnh sửa khóa học này.");
    }

    const oldCourse = ownership[0];

    // 🧾 Lấy dữ liệu từ form
    const {
      title,
      description,
      detail_html,
      category_id,
      total_hours,
      total_lectures,
      current_price,
      original_price,
      status,
    } = req.body;

    // 🖼️ Xử lý ảnh upload
    const image_url = req.file
      ? `/uploads/${req.file.filename}`
      : oldCourse.image_url;

    // 💾 Cập nhật DB
    await pool.query(
      `
      UPDATE courses
      SET
        title = $1,
        description = $2,
        detail_html = $3,
        image_url = $4,
        category_id = $5,
        total_hours = $6,
        total_lectures = $7,
        current_price = $8,
        original_price = $9,
        status = $10
      WHERE course_id = $11
      `,
      [
        title,
        description,
        detail_html,
        image_url,
        category_id || null,
        total_hours || 0,
        total_lectures || 0,
        current_price,
        original_price,
        status || "incomplete",
        id,
      ]
    );

    console.log(`✅ Khóa học ${id} đã được cập nhật bởi ${req.session.user.full_name}`);
    res.redirect("/instructor/dashboard");
  } catch (err) {
    console.error("❌ Lỗi khi cập nhật khóa học:", err.message);
    res.status(500).render("instructor/course_form", {
      layout: "main",
      pageTitle: "Cập nhật khóa học",
      error: "Không thể cập nhật khóa học. Vui lòng thử lại.",
      isNew: false,
    });
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

// ====================
// CHI TIẾT KHÓA HỌC CỦA GIẢNG VIÊN
// ====================
router.get("/detail/:id", requireInstructor, async (req, res) => {
  const courseId = req.params.id;
  const accountId = req.session.user.account_id;

  try {
    // ✅ Lấy thông tin khóa học, kèm thông tin giảng viên
    const { rows: courseRows } = await pool.query(
      `
      SELECT c.*, cat.name AS category_name, i.name AS instructor_name, i.bio AS instructor_bio
      FROM courses c
      JOIN instructors i ON c.instructor_id = i.instructor_id
      LEFT JOIN categories cat ON c.category_id = cat.category_id
      WHERE c.course_id = $1 AND i.account_id = $2
      `,
      [courseId, accountId]
    );

    if (!courseRows.length) {
      return res.redirect("/instructor/dashboard");
    }

    const course = courseRows[0];

    // ✅ Lấy danh sách chương & bài giảng
    const { rows: sections } = await pool.query(
      "SELECT * FROM course_sections WHERE course_id = $1 ORDER BY order_index",
      [courseId]
    );

    const { rows: lectures } = await pool.query(
      `
      SELECT * 
      FROM lectures 
      WHERE section_id IN (SELECT section_id FROM course_sections WHERE course_id = $1)
      ORDER BY order_index
      `,
      [courseId]
    );

    // ✅ Render view chi tiết khóa học
    res.render("instructor/course_detail", {
      layout: "main",
      pageTitle: `Chi tiết khóa học - ${course.title}`,
      course,
      sections,
      lectures,
    });
  } catch (err) {
    console.error("❌ Lỗi khi tải chi tiết khóa học:", err.message);
    res.redirect("/instructor/dashboard");
  }
});

// ====================
// CẬP NHẬT CẤU TRÚC KHÓA HỌC (CHƯƠNG & BÀI GIẢNG)
// ====================
router.post("/update-structure/:courseId", requireInstructor, async (req, res) => {
  const { courseId } = req.params;
  const { sections } = req.body;
  const accountId = req.session.user.account_id;

  try {
    // 🔒 Kiểm tra quyền giảng viên sở hữu khóa học
    const check = await pool.query(
      `
      SELECT c.course_id
      FROM courses c
      JOIN instructors i ON c.instructor_id = i.instructor_id
      WHERE c.course_id = $1 AND i.account_id = $2
      `,
      [courseId, accountId]
    );
    if (!check.rowCount) {
      return res.status(403).json({ message: "Bạn không có quyền sửa khóa học này." });
    }

    // ==========================
    // XÓA CẤU TRÚC CŨ (nếu có)
    // ==========================
    await pool.query(
      "DELETE FROM lectures WHERE section_id IN (SELECT section_id FROM course_sections WHERE course_id = $1)",
      [courseId]
    );
    await pool.query("DELETE FROM course_sections WHERE course_id = $1", [courseId]);

    // ==========================
    // LƯU CẤU TRÚC MỚI
    // ==========================
    for (let sIndex = 0; sIndex < sections.length; sIndex++) {
      const section = sections[sIndex];
      const sectionRes = await pool.query(
        `INSERT INTO course_sections (course_id, title, order_index)
         VALUES ($1, $2, $3) RETURNING section_id`,
        [courseId, section.title, sIndex + 1]
      );
      const sectionId = sectionRes.rows[0].section_id;

      for (let lIndex = 0; lIndex < section.lectures.length; lIndex++) {
        const lec = section.lectures[lIndex];
        await pool.query(
          `INSERT INTO lectures (section_id, title, video_url, duration, is_preview, order_index)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [sectionId, lec.title, lec.video_url, lec.duration || 0, lec.is_preview, lIndex + 1]
        );
      }
    }

    // ==========================
    // CẬP NHẬT TRẠNG THÁI KHÓA HỌC
    // ==========================
    await pool.query(
      `
      UPDATE courses 
      SET status = 'complete'
      WHERE course_id = $1 AND NOT EXISTS (
        SELECT 1 FROM course_sections cs
        LEFT JOIN lectures l ON cs.section_id = l.section_id
        WHERE cs.course_id = $1 AND l.lecture_id IS NULL
      )
      `,
      [courseId]
    );

    res.json({ message: "Đã lưu thay đổi thành công!" });
  } catch (err) {
    console.error("❌ Lỗi khi cập nhật cấu trúc khóa học:", err.message);
    res.status(500).json({ message: "Không thể lưu thay đổi." });
  }
});


export default router;
