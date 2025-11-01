import express from 'express';
import * as profileModel from '../models/profileModel.js';
import { pool } from "../configs/db.js";
import { isInWatchlist, addToWatchlist, removeFromWatchlist } from "../models/profileModel.js";
import db from "../configs/db.js";
import { findById, getCourseDetailsById } from "../models/courseModel.js";
import * as enrollmentModel from '../models/enrollmentModel.js';

const router = express.Router();

 //API: Lấy chi tiết khóa học + tăng lượt xem (dành cho modal / AJAX)

router.get("/detail/:id", async (req, res) => {
  try {
    const courseId = parseInt(req.params.id);

    if (isNaN(courseId)) {
      return res.status(400).json({ error: "ID khóa học không hợp lệ" });
    }

    // 1️⃣ Tăng view trong bảng "courses"
    await db.query("UPDATE courses SET view = view + 1 WHERE course_id = $1", [courseId]);

    // 2️⃣ Ghi log lượt xem vào bảng "course_views"
    await db.query(
      "INSERT INTO course_views (course_id, viewed_at) VALUES ($1, NOW())",
      [courseId]
    );

    // 3️⃣ Lấy lại thông tin chi tiết khóa học
    const course = await findById(courseId);
    if (!course) {
      return res.status(404).json({ error: "Khóa học không tồn tại" });
    }

    // ✅ Trả dữ liệu JSON cho front-end (dùng trong modal)
    res.json(course);
  } catch (error) {
    console.error("❌ Lỗi khi tải chi tiết khóa học:", error);
    res.status(500).json({ error: "Không thể tải dữ liệu khóa học." });
  }
});

/* ===========================================================
   🧱 2️⃣ Trang chi tiết đầy đủ (hiển thị giao diện .hbs)
   =========================================================== */
router.get('/:id', async (req, res, next) => {
  try {
    const courseId = parseInt(req.params.id);
    if (isNaN(courseId)) {
      return res.status(400).render('error', {
        layout: 'main',
        pageTitle: 'ID không hợp lệ',
        message: 'ID khóa học không hợp lệ.',
      });
    }

    // Lấy toàn bộ chi tiết (instructor, section, review, gallery,…)
    const courseDetails = await getCourseDetailsById(courseId);

    if (!courseDetails || !courseDetails.course) {
      return res.status(404).render('error', {
        layout: 'main',
        pageTitle: 'Không tìm thấy',
        message: 'Xin lỗi, không tìm thấy khóa học bạn yêu cầu.',
      });
    }

    // Kiểm tra trạng thái đăng ký và yêu thích nếu user đã đăng nhập
    let isEnrolled = false;
    let isInWatchlist = false;
    let isFavorite = false;

    const accountId = req.user?.account_id || req.session?.user?.account_id || null;
    if (accountId) {
      [isEnrolled, isInWatchlist] = await Promise.all([
        enrollmentModel.isEnrolled(accountId, courseId),
        profileModel.isInWatchlist(accountId, courseId),
      ]);
      isFavorite = isInWatchlist;
    }

    // Render the full detail page once
    return res.render('courses/detail', {
      layout: 'main',
      pageTitle: courseDetails.course.title,
      ...courseDetails,
      user: req.session?.user || req.user || null,
      isEnrolled,
      isInWatchlist,
      isFavorite,
    });
  } catch (error) {
    console.error('❌ Lỗi khi lấy chi tiết khóa học (PAGE):', error);
    next(error);
  }
});

/* ===========================================================
   💖 3️⃣ Thêm khóa học vào danh sách yêu thích (Watchlist)
   =========================================================== */
router.post("/:id/favorite", async (req, res) => {
  try {
    console.log('Favorite request - Params:', req.params);
    console.log('Favorite request - User:', req.session?.user);
    
    if (!req.session?.user) {
      return res.status(401).json({ error: 'Vui lòng đăng nhập' });
    }

    const courseId = req.params.id;
    const user = req.session.user;

    await profileModel.addToWatchlist(user.account_id, courseId);
    res.json({ success: true });
  } catch (err) {
    console.error('❌ Lỗi add watchlist:', err);
    res.status(500).json({ 
      error: 'Có lỗi xảy ra khi thêm vào yêu thích',
      message: err.message 
    });
  }
});

/* ===========================================================
   💔 4️⃣ Xóa khóa học khỏi danh sách yêu thích (Watchlist)
   =========================================================== */
router.post("/:id/unfavorite", async (req, res) => {
  try {
    console.log('Unfavorite request - Params:', req.params);
    console.log('Unfavorite request - User:', req.session?.user);
    
    if (!req.session?.user) {
      return res.status(401).json({ error: 'Vui lòng đăng nhập' });
    }

    const courseId = req.params.id;
    const user = req.session.user;

    await profileModel.removeFromWatchlist(user.account_id, courseId);
    res.json({ success: true });
  } catch (err) {
    console.error('❌ Lỗi remove watchlist:', err);
    res.status(500).json({ 
      error: 'Có lỗi xảy ra khi xóa khỏi yêu thích',
      message: err.message 
    });
  }
});

// 📚 Đăng ký khóa học
router.post('/:id/enroll', async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).json({ error: 'Vui lòng đăng nhập để đăng ký khóa học' });
    }
    
    const user = req.session.user;
    console.log('User from session:', user);

    // Kiểm tra xem user có student record chưa
    const studentQuery = `SELECT student_id FROM students WHERE account_id = $1`;
    const studentResult = await pool.query(studentQuery, [user.account_id]);
    console.log('Student query result:', studentResult.rows);
    
    let studentId;
    if (!studentResult.rows || studentResult.rows.length === 0) {
      // Tự động tạo student record nếu chưa có
      const insertStudentQuery = `
        INSERT INTO students (account_id, name) 
        VALUES ($1, $2) 
        RETURNING student_id
      `;
      const newStudent = await pool.query(
        insertStudentQuery, 
        [user.account_id, user.full_name || 'Student_' + user.account_id]
      );
      console.log('Created new student record:', newStudent.rows[0]);
      studentId = newStudent.rows[0].student_id;
    } else {
      studentId = studentResult.rows[0].student_id;
    }

    const courseId = req.params.id;

    // Kiểm tra khóa học tồn tại
    const course = await findById(courseId);
    if (!course) {
      return res.status(404).json({ error: 'Không tìm thấy khóa học' });
    }

    // Kiểm tra đã đăng ký chưa
    const checkEnrollmentQuery = `
      SELECT * FROM enrollments 
      WHERE student_id = $1 AND course_id = $2
    `;
    const existingEnrollment = await pool.query(checkEnrollmentQuery, [studentId, courseId]);
    
    if (existingEnrollment.rows.length > 0) {
      return res.status(400).json({ error: 'Bạn đã đăng ký khóa học này rồi' });
    }

    // Thực hiện đăng ký
    const enrollQuery = `
      INSERT INTO enrollments (student_id, course_id, enrolled_at, progress)
      VALUES ($1, $2, CURRENT_TIMESTAMP, 0)
      RETURNING *
    `;
    await pool.query(enrollQuery, [studentId, courseId]);
    
    res.json({ 
      success: true, 
      message: 'Đăng ký khóa học thành công',
      redirect: `/profile/enrolled`
    });
  } catch (error) {
    console.error('❌ Lỗi đăng ký khóa học:', error);
    res.status(500).json({ 
      error: 'Có lỗi xảy ra khi đăng ký khóa học',
      details: error.message
    });
  }
});

export default router;
