import express from 'express';
import { isInWatchlist, addToWatchlist, removeFromWatchlist } from '../models/profileModel.js';
import { pool } from "../configs/db.js";
import { findById, getCourseDetailsById } from "../models/courseModel.js";
const router = express.Router();



// 🟢 Lấy chi tiết khóa học
router.get("/detail/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const course = await findById(id);
    if (!course) {
      return res.status(404).json({ error: "Không tìm thấy khóa học" });
    }
    res.json(course);
  } catch (error) {
    console.error("❌ Lỗi khi lấy chi tiết khóa học:", error.message);
    res.status(500).json({ error: "Lỗi khi tải chi tiết khóa học." });
  }
});

// --- ROUTE 2: FOR THE FULL DETAIL PAGE (From your branch) ---
// This renders the full HTML page when "Xem chi tiết" is clicked
router.get('/:id', async (req, res, next) => {
  try {
    const courseId = req.params.id;
    if (isNaN(courseId)) {
       return res.status(400).render('error', {
         layout: 'main',
         pageTitle: "ID không hợp lệ",
         message: "ID khóa học không hợp lệ."
       });
    }

    // Use the NEW function to get all details
    const courseDetails = await getCourseDetailsById(courseId);

    if (!courseDetails || !courseDetails.course) {
      return res.status(404).render('error', {
        layout: 'main',
        pageTitle: "Không tìm thấy",
        message: "Xin lỗi, không tìm thấy khóa học bạn yêu cầu."
      });
    }

    // Render the full detail page
    res.render('courses/detail', { // Renders views/courses/detail.hbs
      layout: 'main',
      pageTitle: courseDetails.course.title,
      ...courseDetails,
      user: req.session.user
    });

  } catch (error) {
    console.error("❌ Lỗi khi lấy chi tiết khóa học (PAGE):", error);
    next(error); // Pass to central error handler

// Hàm helper: lấy chi tiết khóa học (JOIN instructor)
async function getCourseById(courseId) {
  const { rows } = await pool.query(
    `
    SELECT 
      c.*,
      i.name AS instructor_name,
      i.total_students,
      i.bio
    FROM courses c
    LEFT JOIN instructors i ON c.instructor_id = i.instructor_id
    WHERE c.course_id = $1
    `,
    [courseId]
  );
  return rows[0] || null;
}

// GET /courses/:id — xem chi tiết khóa học
router.get('/:id', async (req, res) => {
  try {
    const user = req.user;
    const courseId = req.params.id;

    const course = await getCourseById(courseId);
    if (!course) {
      return res.status(404).render('vwShared/404', { message: 'Khóa học không tồn tại' });
    }

    let isFavorite = false;
    if (user && user.role === 'student') {
      isFavorite = await isInWatchlist(user.account_id, courseId);
    }

    // Giữ nguyên view bạn đang dùng (trước đó là "vwCourses/detail")
    return res.render('vwCourses/detail', {
      title: course.title,
      course,
      isFavorite,
      instructor: {
        name: course.instructor_name,
        bio: course.bio,
        total_students: course.total_students
      }
    });
  } catch (err) {
    console.error('❌ Lỗi khi lấy chi tiết khoá học:', err);
    return res.status(500).render('vwShared/500', { message: 'Lỗi server' });
  }
});

// 🩷 Thêm khóa học vào watchlist
router.post('/:id/favorite', async (req, res) => {
  try {
    const user = req.user;
    const courseId = req.params.id;
  if (!user) return res.redirect('/auth/login');

    await addToWatchlist(user.account_id, courseId);
    return res.redirect(`/courses/${courseId}`);
  } catch (err) {
    console.error('❌ Lỗi add watchlist:', err);
    return res.status(500).send('Lỗi server');
  }
});

// 💔 Bỏ khóa học khỏi watchlist
router.post('/:id/unfavorite', async (req, res) => {
  try {
    const user = req.user;
    const courseId = req.params.id;
  if (!user) return res.redirect('/auth/login');

    await removeFromWatchlist(user.account_id, courseId);
    return res.redirect(`/courses/${courseId}`);
  } catch (err) {
    console.error('❌ Lỗi remove watchlist:', err);
    return res.status(500).send('Lỗi server');
  }
});

export default router;
