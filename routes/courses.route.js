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
