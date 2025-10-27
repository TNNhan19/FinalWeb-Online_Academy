import express from "express";
import { pool } from "../configs/db.js";

const router = express.Router();

// Trang tổng quan chung của quản trị viên
router.get("/", async (req, res) => {
  try {
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
      admin: { name: "Quản trị viên hệ thống" },
    });
  } catch (err) {
    console.error("Lỗi khi tải trang admin:", err);
    res.status(500).send("Không thể tải trang quản trị viên");
  }
});


//Dashboard
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


//Quản lý lĩnh vực (Categories)
router.get("/categories", async (req, res) => {
  const { rows } = await pool.query("SELECT * FROM categories ORDER BY category_id ASC");
  res.render("admin/categories", { layout: "main", categories: rows });
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

  //Không được xóa lĩnh vực đã có khóa học
  const { rows } = await pool.query("SELECT 1 FROM courses WHERE category_id=$1 LIMIT 1", [id]);
  if (rows.length > 0) {
    return res.send("<h3 style='color:red;text-align:center;margin-top:40px;'>Không thể xóa lĩnh vực đã có khóa học!</h3>");
  }

  await pool.query("DELETE FROM categories WHERE category_id=$1", [id]);
  res.redirect("/admin/categories");
});


//Quản lý khoá học
router.get("/courses", async (req, res) => {
  const { rows } = await pool.query(`
    SELECT c.course_id, c.title, c.current_price, cat.name AS category, i.name AS instructor
    FROM courses c
    LEFT JOIN categories cat ON cat.category_id = c.category_id
    LEFT JOIN instructors i ON i.instructor_id = c.instructor_id
    ORDER BY c.course_id ASC
  `);
  res.render("admin/courses", { layout: "main", courses: rows });
});

//Gỡ bỏ khoá học
router.post("/courses/delete/:id", async (req, res) => {
  const { id } = req.params;
  await pool.query("DELETE FROM courses WHERE course_id=$1", [id]);
  res.redirect("/admin/courses");
});


//Quản lý danh sách học viên & giảng viên
router.get("/users", async (req, res) => {
  try {
    // Giảng viên đã có hồ sơ
    const instructors = await pool.query(`
      SELECT 
        i.instructor_id, 
        i.name, 
        a.email, 
        i.total_students
      FROM instructors i
      JOIN accounts a ON i.account_id = a.account_id
      ORDER BY i.instructor_id ASC
    `);

    // Các tài khoản có role=instructor nhưng chưa nằm trong instructors
    const unregistered = await pool.query(`
      SELECT a.account_id, a.full_name AS name, a.email
      FROM accounts a
      WHERE a.role = 'instructor'
        AND a.account_id NOT IN (SELECT account_id FROM instructors)
      ORDER BY a.account_id ASC
    `);

    // Học viên
    const students = await pool.query(`
      SELECT account_id AS student_id, full_name AS name, email
      FROM accounts
      WHERE role = 'student'
      ORDER BY account_id ASC
    `);

    res.render("admin/users", {
      layout: "main",
      instructors: instructors.rows,
      students: students.rows,
      unregistered: unregistered.rows,
    });
  } catch (err) {
    console.error("Lỗi khi tải danh sách người dùng:", err);
    res.status(500).send("Lỗi khi tải danh sách người dùng");
  }
});

// Thêm giảng viên từ bảng accounts
router.post("/users/add-instructor/:account_id", async (req, res) => {
  try {
    const { account_id } = req.params;

    // Lấy thông tin cơ bản từ accounts
    const { rows } = await pool.query(
      "SELECT full_name, email FROM accounts WHERE account_id = $1 AND role = 'instructor'",
      [account_id]
    );

    if (rows.length === 0) {
      return res.status(404).send("Không tìm thấy tài khoản giảng viên hợp lệ.");
    }

    const name = rows[0].full_name || "Giảng viên mới";

    // Thêm vào bảng instructors
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


export default router;
