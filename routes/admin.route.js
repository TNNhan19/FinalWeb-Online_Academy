import express from "express";
import { pool } from "../configs/db.js";
import { requireAdmin } from "../middlewares/authAdmin.js";

import bcrypt from "bcryptjs";
import multer from "multer";
import path from "path";
import fs from "fs";

// Hàm để upload ảnh
const uploadDir = path.join(process.cwd(), "public/uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const fileName = `course_${Date.now()}${ext}`;
    cb(null, fileName);
  }
});
const upload = multer({ storage });

const router = express.Router();

// Chặn truy cập
router.use(requireAdmin);

// Trang chủ admin
router.get("/", async (req, res) => {
  try {
    const accountId = req.session.user.id;
    const { rows: adminRows } = await pool.query(
      "SELECT full_name FROM accounts WHERE account_id = $1",
      [accountId]
    );
    const adminName = adminRows[0]?.full_name || "Quản trị viên hệ thống";

    const [cat, course, instructor, student] = await Promise.all([
      pool.query("SELECT COUNT(*) FROM categories"),
      pool.query("SELECT COUNT(*) FROM courses"),
      pool.query("SELECT COUNT(*) FROM instructors"),
      pool.query("SELECT COUNT(*) FROM accounts WHERE role = 'student'"),
    ]);

    res.render("admin/index", {
      layout: "main",
      stats: {
        categories: cat.rows[0].count,
        courses: course.rows[0].count,
        instructors: instructor.rows[0].count,
        students: student.rows[0].count,
      },
      admin: { name: adminName },
    });
  } catch (err) {
    console.error("Lỗi khi tải trang admin:", err);
    res.status(500).send("Không thể tải trang quản trị viên");
  }
});

// Dashboard
router.get("/dashboard", async (req, res) => {
  try {
    const [cat, course, instructor, student] = await Promise.all([
      pool.query("SELECT COUNT(*) FROM categories"),
      pool.query("SELECT COUNT(*) FROM courses"),
      pool.query("SELECT COUNT(*) FROM instructors"),
      pool.query("SELECT COUNT(*) FROM accounts WHERE role = 'student'"),
    ]);

    res.render("admin/dashboard", {
      layout: "main",
      stats: {
        categories: cat.rows[0].count,
        courses: course.rows[0].count,
        instructors: instructor.rows[0].count,
        students: student.rows[0].count,
      },
    });
  } catch (err) {
    console.error("Lỗi tải dashboard:", err);
    res.status(500).send("Lỗi khi tải dashboard");
  }
});

// Quản lý Categories
router.get("/categories", async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT 
        c.category_id,
        c.name AS category_name,
        p.name AS parent_name,
        COUNT(co.course_id) AS total_courses
      FROM categories c
      LEFT JOIN categories p ON c.parent_id = p.category_id
      LEFT JOIN courses co ON co.category_id = c.category_id
      GROUP BY c.category_id, c.name, p.name
      ORDER BY c.category_id ASC
    `);

    res.render("admin/categories", {
      layout: "main",
      pageTitle: "Quản lý lĩnh vực",
      categories: rows,
    });
  } catch (err) {
    console.error("Lỗi khi tải danh sách lĩnh vực:", err.message);
    res.status(500).send("Không thể tải danh sách lĩnh vực.");
  }
});

router.post("/categories", async (req, res) => {
  const { name, parent_id } = req.body;
  await pool.query("INSERT INTO categories (name, parent_id) VALUES ($1, $2)", [name, parent_id || null]);
  res.redirect("/admin/categories");
});

router.post("/categories/update/:id", async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  await pool.query("UPDATE categories SET name=$1 WHERE category_id=$2", [name, id]);
  res.redirect("/admin/categories");
});

router.post("/categories/delete/:id", async (req, res) => {
  const { id } = req.params;

  // Không được xóa lĩnh vực đã có khóa học
  const { rows } = await pool.query("SELECT 1 FROM courses WHERE category_id=$1 LIMIT 1", [id]);
  if (rows.length > 0) {
    return res.send("<h3 style='color:red;text-align:center;margin-top:40px;'>Không thể xóa lĩnh vực đã có khóa học!</h3>");
  }

  await pool.query("DELETE FROM categories WHERE category_id=$1", [id]);
  res.redirect("/admin/categories");
});

// Quản lý khoá học
router.get("/courses", async (req, res) => {
  try {
    const { category, instructor } = req.query;
    const params = [];
    const conditions = [];

    if (category) {
      params.push(category);
      conditions.push(`c.category_id = $${params.length}`);
    }

    if (instructor) {
      params.push(instructor);
      conditions.push(`c.instructor_id = $${params.length}`);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const query = `
    SELECT 
      c.course_id, c.title, c.current_price, c.status,
      cat.name AS category, i.name AS instructor
    FROM courses c
    LEFT JOIN categories cat ON cat.category_id = c.category_id
    LEFT JOIN instructors i ON i.instructor_id = c.instructor_id
    ${whereClause}
    ORDER BY c.course_id ASC
  `;

    const { rows } = await pool.query(query, params);

    const [catRes, instRes] = await Promise.all([
      pool.query("SELECT category_id, name FROM categories ORDER BY name ASC"),
      pool.query("SELECT instructor_id, name FROM instructors ORDER BY name ASC")
    ]);

    res.render("admin/courses", {
      layout: "main",
      courses: rows,
      selectedCategory: category || "",
      selectedInstructor: instructor || "",
      categories: catRes.rows,
      instructors: instRes.rows,
    });
  } catch (err) {
    console.error("Lỗi khi tải khóa học:", err);
    res.status(500).send("Không thể tải danh sách khóa học.");
  }
});

// Gỡ bỏ khoá học
router.post("/courses/delete/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('BEGIN');

    await pool.query("DELETE FROM course_views WHERE course_id=$1", [id]);
    await pool.query("DELETE FROM lectures WHERE section_id IN (SELECT section_id FROM course_sections WHERE course_id=$1)", [id]);
    await pool.query("DELETE FROM course_sections WHERE course_id=$1", [id]);
    await pool.query("DELETE FROM course_images WHERE course_id=$1", [id]);
    await pool.query("DELETE FROM reviews WHERE course_id=$1", [id]);
    await pool.query("DELETE FROM enrollments WHERE course_id=$1", [id]);

    await pool.query("DELETE FROM courses WHERE course_id=$1", [id]);

    await pool.query('COMMIT');

    const backURL = req.get("Referer") || "/admin/courses";
    res.redirect(backURL);
  } catch (err) {

    await pool.query('ROLLBACK');
    console.error("Lỗi khi xóa khóa học:", err);
    res.status(500).send("Không thể xóa khóa học. Vui lòng thử lại.");
  }
});

// Cập nhật trạng thái khóa học
router.post("/courses/update-status/:id", async (req, res) => {
  const { id } = req.params;
  const { newStatus } = req.body;

  try {
    const validStatuses = ["incomplete", "complete", "active", "suspended"];
    if (!validStatuses.includes(newStatus)) {
      return res.status(400).send("Trạng thái không hợp lệ.");
    }

    await pool.query("UPDATE courses SET status = $1 WHERE course_id = $2", [
      newStatus,
      id,
    ]);

    console.log(`Đã đổi trạng thái khóa học ${id} → ${newStatus}`);
    const backURL = req.get("Referer") || "/admin/courses";
    res.redirect(backURL);
  } catch (err) {
    console.error("Lỗi khi cập nhật trạng thái khóa học:", err);
    res.status(500).send("Không thể thay đổi trạng thái khóa học.");
  }
});

// Thêm khóa học mới
router.post("/courses/add", upload.single("image"), async (req, res) => {
  try {
    const {
      title,
      description,
      detail_html,
      category_id,
      instructor_id,
      total_hours,
      total_lectures,
      original_price,
      current_price,
    } = req.body;

    const image_url = req.file ? `/uploads/${req.file.filename}` : null;

    await pool.query(
      `INSERT INTO courses 
      (title, description, detail_html, image_url, category_id, instructor_id, 
       total_hours, total_lectures, original_price, current_price, status, created_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'incomplete', NOW())`,
      [
        title,
        description,
        detail_html,
        image_url,
        category_id,
        instructor_id,
        total_hours || 0,
        total_lectures || 0,
        original_price || 0,
        current_price || 0,
      ]
    );

    res.redirect("/admin/courses");
  } catch (err) {
    console.error("Lỗi khi thêm khóa học:", err);
    res.status(500).send("Không thể thêm khóa học. Vui lòng thử lại.");
  }
});

// Quản lý nguời dùng
router.get("/users", async (req, res) => {
  try {

    const admins = await pool.query(`
      SELECT account_id, full_name, email, role, is_active, created_at 
      FROM accounts 
      WHERE role = 'admin' 
      ORDER BY account_id ASC
    `);

    const instructors = await pool.query(`
    SELECT 
      i.instructor_id, 
      i.name, 
      a.email, 
      i.total_students,
      a.is_active
    FROM instructors i
    JOIN accounts a ON i.account_id = a.account_id
    ORDER BY i.instructor_id ASC
`);

    const unregistered = await pool.query(`
      SELECT a.account_id, a.full_name AS name, a.email
      FROM accounts a
      WHERE a.role = 'instructor'
        AND a.account_id NOT IN (SELECT account_id FROM instructors)
      ORDER BY a.account_id ASC
    `);

    const students = await pool.query(`
      SELECT account_id AS student_id, full_name AS name, email, is_active, created_at
      FROM accounts
      WHERE role = 'student'
      ORDER BY account_id ASC
    `);

    res.render("admin/users", {
      layout: "main",
      admins: admins.rows,
      instructors: instructors.rows,
      students: students.rows,
      unregistered: unregistered.rows,
    });
  } catch (err) {
    console.error("Lỗi khi tải danh sách người dùng:", err);
    res.status(500).send("Lỗi khi tải danh sách người dùng");
  }
});

router.post("/users/add-instructor/:account_id", async (req, res) => {
  try {
    const { account_id } = req.params;

    const { rows } = await pool.query(
      "SELECT full_name, email FROM accounts WHERE account_id = $1 AND role = 'instructor'",
      [account_id]
    );

    if (rows.length === 0) {
      return res.status(404).send("Không tìm thấy tài khoản giảng viên hợp lệ.");
    }

    const name = rows[0].full_name || "Giảng viên mới";

    await pool.query(
      "INSERT INTO instructors (account_id, name, total_students, bio, created_at) VALUES ($1, $2, 0, '', NOW())",
      [account_id, name]
    );

    res.redirect("/admin/users");
  } catch (err) {
    console.error("Lỗi khi thêm giảng viên:", err);
    res.status(500).send("Không thể thêm giảng viên.");
  }
});

// Xem và cập nhật hồ sơ người dùng
router.get("/users/view/:role/:id", async (req, res) => {
  const { role, id } = req.params;
  let profile;
  try {
    if (role === "admin" || role === "student") {
      const { rows } = await pool.query("SELECT * FROM accounts WHERE account_id=$1", [id]);
      profile = rows[0];
    } else if (role === "instructor") {
      const { rows } = await pool.query(
        `SELECT 
        i.*, 
        a.email, 
        a.full_name, 
        i.avatar_url AS avatar_url,
          COALESCE(SUM(e.student_count), 0) AS total_students
          FROM instructors i
          JOIN accounts a ON i.account_id = a.account_id
          LEFT JOIN (
        SELECT c.instructor_id, COUNT(DISTINCT en.student_id) AS student_count
        FROM enrollments en
        JOIN courses c ON en.course_id = c.course_id
        GROUP BY c.instructor_id
        ) e ON e.instructor_id = i.instructor_id
        WHERE i.instructor_id = $1
        GROUP BY i.instructor_id, a.email, a.full_name, i.avatar_url`,
        [id]
      );
      profile = rows[0];

      const { rows: courses } = await pool.query(
        `SELECT course_id, title, status, total_lectures, total_hours, current_price, image_url 
     FROM courses WHERE instructor_id = $1 ORDER BY course_id ASC`,
        [id]
      );
      profile.courses = courses;

      const { rows: categories } = await pool.query(
        "SELECT category_id, name FROM categories ORDER BY name ASC"
      );

      return res.render("admin/user_view", {
        layout: "main",
        pageTitle: "Chi tiết người dùng",
        profile,
        role,
        categories,
      });
    }

    if (!profile) return res.status(404).send("Không tìm thấy hồ sơ người dùng.");

    res.render("admin/user_view", {
      layout: "main",
      pageTitle: "Chi tiết người dùng",
      profile,
      role,
    });
  } catch (err) {
    console.error("Lỗi khi tải hồ sơ người dùng:", err);
    res.status(500).send("Không thể tải hồ sơ người dùng.");
  }
});

router.post("/users/update/:role/:id", async (req, res) => {
  const { role, id } = req.params;
  const { full_name, email, bio, total_students } = req.body;

  try {
    if (role === "admin" || role === "student") {
      await pool.query(
        "UPDATE accounts SET full_name=$1, email=$2 WHERE account_id=$3",
        [full_name, email, id]
      );
    }
    else if (role === "instructor") {
      const { rows } = await pool.query(
        "SELECT account_id FROM instructors WHERE instructor_id=$1",
        [id]
      );
      const accountId = rows[0]?.account_id;

      await pool.query(
        `UPDATE instructors 
     SET name=$1, bio=$2, total_students=$3 
     WHERE instructor_id=$4`,
        [full_name, bio || "", total_students || 0, id]
      );

      if (accountId) {
        await pool.query(
          "UPDATE accounts SET full_name=$1, email=$2 WHERE account_id=$3",
          [full_name, email, accountId]
        );
      }
    }

    const backURL = req.get("Referer") || "/admin/users";
    res.redirect(backURL);
  } catch (err) {
    console.error("Lỗi khi cập nhật hồ sơ:", err);
    res.status(500).send("Không thể cập nhật hồ sơ người dùng.");
  }
});

router.post("/users/delete/:role/:id", async (req, res) => {
  const { role, id } = req.params;

  try {
    await pool.query("BEGIN");

    if (role === "admin" || role === "student") {
      await pool.query("DELETE FROM accounts WHERE account_id = $1", [id]);
    }

    else if (role === "instructor") {
      const { rows: inst } = await pool.query(
        "SELECT account_id FROM instructors WHERE instructor_id = $1",
        [id]
      );

      const accountId = inst[0]?.account_id;
      if (!accountId) {
        await pool.query("ROLLBACK");
        return res.status(404).send("Không tìm thấy giảng viên để xóa.");
      }

      await pool.query("DELETE FROM course_views WHERE course_id IN (SELECT course_id FROM courses WHERE instructor_id=$1)", [id]);
      await pool.query("DELETE FROM lectures WHERE section_id IN (SELECT section_id FROM course_sections WHERE course_id IN (SELECT course_id FROM courses WHERE instructor_id=$1))", [id]);
      await pool.query("DELETE FROM course_sections WHERE course_id IN (SELECT course_id FROM courses WHERE instructor_id=$1)", [id]);
      await pool.query("DELETE FROM reviews WHERE course_id IN (SELECT course_id FROM courses WHERE instructor_id=$1)", [id]);
      await pool.query("DELETE FROM enrollments WHERE course_id IN (SELECT course_id FROM courses WHERE instructor_id=$1)", [id]);
      await pool.query("DELETE FROM courses WHERE instructor_id=$1", [id]);

      await pool.query("DELETE FROM instructors WHERE instructor_id=$1", [id]);
      await pool.query("DELETE FROM accounts WHERE account_id=$1", [accountId]);
    }

    await pool.query("COMMIT");
    res.redirect("/admin/users");
  } catch (err) {
    await pool.query("ROLLBACK");
    console.error("Lỗi khi xóa người dùng:", err);
    res.status(500).send("Không thể xóa người dùng. Vui lòng thử lại.");
  }
});

//Khóa / Mở tài khoản học viên, giảng viên hoặc admin
router.post("/users/toggle/:role/:id", async (req, res) => {
  const { role, id } = req.params;

  try {
    let accountId;
    if (role === "instructor") {
      const { rows } = await pool.query(
        "SELECT account_id FROM instructors WHERE instructor_id=$1",
        [id]
      );
      accountId = rows[0]?.account_id;
    } else {
      accountId = id;
    }

    if (!accountId) {
      return res.status(404).send("Không tìm thấy tài khoản để khóa/mở.");
    }

    const updated = await pool.query(
      "UPDATE accounts SET is_active = NOT COALESCE(is_active, TRUE) WHERE account_id=$1 RETURNING is_active",
      [accountId]
    );

    console.log(`Toggled user ${accountId}: is_active = ${updated.rows[0].is_active}`);

    res.redirect("/admin/users");
  } catch (err) {
    console.error("Lỗi khi khóa/mở tài khoản:", err);
    res.status(500).send("Không thể cập nhật trạng thái tài khoản.");
  }
});


// Tao người dùng mới (Admin)
router.post("/users/add-new", async (req, res) => {
  try {
    const { full_name, email, password, role } = req.body;

    const existing = await pool.query("SELECT 1 FROM accounts WHERE email=$1", [email]);
    if (existing.rows.length > 0) {
      return res.send("<h3 style='color:red;text-align:center;margin-top:40px;'>Email đã tồn tại!</h3>");
    }

    const password_hash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO accounts (full_name, email, password_hash, role, is_verified, created_at)
       VALUES ($1, $2, $3, $4, TRUE, NOW())
       RETURNING account_id`,
      [full_name, email, password_hash, role]
    );

    const newAccountId = result.rows[0].account_id;

    if (role === "instructor") {
      await pool.query(
        `INSERT INTO instructors (account_id, name, bio, total_students, created_at)
         VALUES ($1, $2, '', 0, NOW())`,
        [newAccountId, full_name]
      );
    }

    res.redirect("/admin/users");
  } catch (err) {
    console.error("Lỗi khi thêm người dùng:", err);
    res.status(500).send("Không thể thêm người dùng mới.");
  }
});

// Thêm khoá học ở admin
router.post("/users/add-course/:instructor_id", upload.single("image"), async (req, res) => {
  try {
    const { instructor_id } = req.params;
    const {
      title,
      description,
      detail_html,
      category_id,
      total_hours,
      total_lectures,
      current_price,
      original_price
    } = req.body;

    const imagePath = req.file ? `/uploads/${req.file.filename}` : null;

    const newCourse = await pool.query(
      `INSERT INTO courses
       (title, description, detail_html, image_url, instructor_id, category_id,
        total_hours, total_lectures, current_price, original_price, status, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'incomplete',NOW())
       RETURNING *`,
      [
        title,
        description,
        detail_html,
        imagePath,
        instructor_id,
        category_id || null,
        total_hours || 0,
        total_lectures || 0,
        current_price || 0,
        original_price || 0,
      ]
    );

    res.json({ course: newCourse.rows[0] });
  } catch (err) {
    console.error("Lỗi khi thêm khóa học:", err);
    res.status(500).json({ error: "Không thể thêm khóa học." });
  }
});

// Xoá khoá học ở admin
router.delete("/users/delete-course/:course_id", async (req, res) => {
  const { course_id } = req.params;
  try {
    await pool.query("DELETE FROM courses WHERE course_id = $1", [course_id]);
    res.json({ success: true });
  } catch (err) {
    console.error("Lỗi khi xóa khóa học:", err);
    res.status(500).json({ error: "Không thể xóa khóa học." });
  }
});

export default router;
