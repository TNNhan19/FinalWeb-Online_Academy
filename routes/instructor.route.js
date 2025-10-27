import express from "express";
import { pool } from "../configs/db.js";

const router = express.Router();

// 🚫 Tạm thời bỏ kiểm tra đăng nhập/role
const ensureInstructor = (req, res, next) => next();

router.get("/", (req, res) => {
  res.render("instructor/index", {
    layout: "main",
    instructor: { name: "Giảng viên thử nghiệm" },
    stats: { courses: 3, students: 58 },
  });
});

// ====================
// 1️⃣ DASHBOARD
// ====================
router.get("/dashboard", ensureInstructor, async (req, res) => {
  const { rows } = await pool.query(`
    SELECT c.*, cat.name AS category_name
    FROM courses c
    LEFT JOIN categories cat ON c.category_id = cat.category_id
    ORDER BY c.created_at DESC
  `);
  res.render("instructor/dashboard", { pageTitle: "Khoá học của tôi", courses: rows });
});

// ====================
// 2️⃣ ĐĂNG KHÓA HỌC MỚI
// ====================
router.get("/new", ensureInstructor, async (req, res) => {
  const { rows: categories } = await pool.query("SELECT * FROM categories ORDER BY name ASC");
  res.render("instructor/course_form", { pageTitle: "Đăng khoá học mới", isNew: true, categories });
});

router.post("/new", ensureInstructor, async (req, res) => {
  const {
    title, description, detail_html, image_url, category_id,
    total_hours, total_lectures, current_price, original_price
  } = req.body;

  await pool.query(
    `INSERT INTO courses 
      (title, description, detail_html, image_url, category_id, total_hours, total_lectures, current_price, original_price, status, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'incomplete',NOW())`,
    [title, description, detail_html, image_url, category_id || null, total_hours || 0, total_lectures || 0, current_price, original_price]
  );

  res.redirect("/instructor/dashboard");
});


// ====================
// 3️⃣ CHỈNH SỬA KHÓA HỌC
// ====================
router.get("/edit/:id", ensureInstructor, async (req, res) => {
  const { id } = req.params;
  const { rows: courses } = await pool.query(`
    SELECT * FROM courses WHERE course_id = $1
  `, [id]);

  const { rows: categories } = await pool.query("SELECT * FROM categories ORDER BY name ASC");
  const { rows: sections } = await pool.query(`
    SELECT * FROM course_sections WHERE course_id = $1 ORDER BY order_index
  `, [id]);

  const { rows: lectures } = await pool.query(`
    SELECT l.*, s.title AS section_title 
    FROM lectures l 
    JOIN course_sections s ON s.section_id = l.section_id 
    WHERE s.course_id = $1 
    ORDER BY s.order_index, l.order_index
  `, [id]);

  res.render("instructor/course_form", {
    pageTitle: "Cập nhật khoá học",
    isNew: false,
    course: courses[0],
    categories,
    sections,
    lectures
  });
});

router.post("/edit/:id", ensureInstructor, async (req, res) => {
  const { id } = req.params;
  const {
    title, description, image_url, total_hours,
    total_lectures, current_price, original_price, status
  } = req.body;

  await pool.query(
    `UPDATE courses 
     SET title=$1, description=$2, image_url=$3, total_hours=$4, 
         total_lectures=$5, current_price=$6, original_price=$7, status=$8 
     WHERE course_id=$9`,
    [title, description, image_url, total_hours, total_lectures, current_price, original_price, status || 'incomplete', id]
  );

  res.redirect("/instructor/dashboard");
});

// ====================
// 🧩 Thêm chương mới
// ====================
router.post("/section/:course_id", async (req, res) => {
  const { course_id } = req.params;
  const { title, order_index } = req.body;

  try {
    await pool.query(
      `INSERT INTO course_sections (course_id, title, order_index)
       VALUES ($1, $2, $3)`,
      [course_id, title, order_index || 1]
    );

    // Kiểm tra và cập nhật trạng thái khóa học
    await pool.query(`
      UPDATE courses SET status = CASE
        WHEN EXISTS (
          SELECT 1 FROM course_sections s
          JOIN lectures l ON s.section_id = l.section_id
          WHERE s.course_id = $1
        )
        THEN 'complete'
        ELSE 'incomplete'
      END
      WHERE course_id = $1;
    `, [course_id]);

    res.redirect(`/instructor/edit/${course_id}`);
  } catch (err) {
    console.error("❌ Lỗi khi thêm chương:", err);
    res.status(500).send("Lỗi máy chủ");
  }
});

// ====================
// 🎥 Thêm bài giảng mới
// ====================
router.post("/lecture/:section_id", async (req, res) => {
  const { section_id } = req.params;
  const { title, video_url, duration, is_preview, order_index } = req.body;

  try {
    await pool.query(
      `INSERT INTO lectures (section_id, title, video_url, duration, is_preview, order_index)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [section_id, title, video_url, duration || 0, is_preview === "on", order_index || 1]
    );

    // Lấy course_id từ section
    const { rows } = await pool.query(
      `SELECT course_id FROM course_sections WHERE section_id = $1`,
      [section_id]
    );
    const course_id = rows[0]?.course_id;

    // Cập nhật trạng thái khóa học
    await pool.query(`
      UPDATE courses SET status = CASE
        WHEN EXISTS (
          SELECT 1 FROM course_sections s
          JOIN lectures l ON s.section_id = l.section_id
          WHERE s.course_id = $1
        )
        THEN 'complete'
        ELSE 'incomplete'
      END
      WHERE course_id = $1;
    `, [course_id]);

    res.redirect(`/instructor/edit/${course_id}`);
  } catch (err) {
    console.error("❌ Lỗi khi thêm bài giảng:", err);
    res.status(500).send("Lỗi máy chủ");
  }
});

router.get("/detail/:id", async (req, res) => {
  const { id } = req.params;

  // Lấy thông tin khóa học
  const { rows: courses } = await pool.query(
    `SELECT c.*, cat.name AS category_name, i.name AS instructor_name, i.bio AS instructor_bio
     FROM courses c
     LEFT JOIN categories cat ON cat.category_id = c.category_id
     LEFT JOIN instructors i ON i.instructor_id = c.instructor_id
     WHERE c.course_id = $1`,
    [id]
  );
  const course = courses[0];

  // Lấy danh sách chương
  const { rows: sections } = await pool.query(
    `SELECT * FROM course_sections WHERE course_id = $1 ORDER BY order_index`,
    [id]
  );

  // Lấy danh sách bài giảng
  const { rows: lectures } = await pool.query(
    `SELECT * FROM lectures WHERE section_id IN (
       SELECT section_id FROM course_sections WHERE course_id = $1
     ) ORDER BY section_id, order_index`,
    [id]
  );

  res.render("instructor/course_detail", {
    layout: "main",
    course,
    sections,
    lectures,
  });
});

router.post("/update-structure/:id", async (req, res) => {
  const { id } = req.params;
  const { sections } = req.body;
  try {
    for (const s of sections) {
      let sectionId = s.section_id;
      if (!sectionId) {
        const result = await pool.query(
          "INSERT INTO course_sections (course_id, title, order_index) VALUES ($1, $2, 1) RETURNING section_id",
          [id, s.title]
        );
        sectionId = result.rows[0].section_id;
      } else {
        await pool.query("UPDATE course_sections SET title=$1 WHERE section_id=$2", [s.title, sectionId]);
      }

      for (const lec of s.lectures) {
        if (!lec.title) continue;
        if (!lec.lecture_id) {
          await pool.query(
            "INSERT INTO lectures (section_id, title, video_url, duration, is_preview) VALUES ($1,$2,$3,$4,$5)",
            [sectionId, lec.title, lec.video_url, lec.duration || 0, lec.is_preview]
          );
        } else {
          await pool.query(
            "UPDATE lectures SET title=$1, video_url=$2, duration=$3, is_preview=$4 WHERE lecture_id=$5",
            [lec.title, lec.video_url, lec.duration || 0, lec.is_preview, lec.lecture_id]
          );
        }
      }
    }
    res.json({ success: true, message: "Đã lưu thay đổi thành công!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Lỗi khi cập nhật cấu trúc!" });
  }
});

// 📄 Trang hồ sơ giảng viên
router.get("/profile", async (req, res) => {
  try {
    // Tạm thời cố định instructor có account_id = 16 (user Nhan)
    const accountId = 16;

    const profileQuery = `
      SELECT i.*, a.email, a.full_name
      FROM instructors i
      JOIN accounts a ON i.account_id = a.account_id
      WHERE i.account_id = $1
    `;
    const { rows: profileRows } = await pool.query(profileQuery, [accountId]);
    const profile = profileRows[0];

    if (!profile) {
      return res.render("instructor/profile", {
        layout: "main",
        error: "Không tìm thấy hồ sơ giảng viên. Vui lòng tạo mới!",
      });
    }

    const courseQuery = `
      SELECT c.course_id, c.title, c.status, c.current_price, cat.name AS category_name
      FROM courses c
      LEFT JOIN categories cat ON c.category_id = cat.category_id
      WHERE c.instructor_id = $1
      ORDER BY c.created_at DESC
    `;
    const { rows: courseRows } = await pool.query(courseQuery, [profile.instructor_id]);

    res.render("instructor/profile", {
      layout: "main",
      profile,
      courses: courseRows,
    });
  } catch (err) {
    console.error("❌ Lỗi khi tải hồ sơ:", err);
    res.status(500).send("Lỗi khi tải hồ sơ giảng viên");
  }
});

// 🧩 Cập nhật hồ sơ
router.post("/profile/update", async (req, res) => {
  try {
    const accountId = 16; // test tạm
    const { name, bio } = req.body;

    await pool.query(
      `UPDATE instructors SET name=$1, bio=$2 WHERE account_id=$3`,
      [name, bio, accountId]
    );

    res.redirect("/instructor/profile");
  } catch (err) {
    console.error("❌ Lỗi khi cập nhật hồ sơ:", err);
    res.status(500).send("Cập nhật hồ sơ thất bại!");
  }
});


export default router;
