import express from 'express';
import { isInWatchlist, addToWatchlist, removeFromWatchlist } from '../models/profileModel.js';
import { pool } from "../configs/db.js";

const router = express.Router();

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
