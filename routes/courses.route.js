import express from 'express';
// Import necessary functions from profileModel
import { isInWatchlist, addToWatchlist, removeFromWatchlist } from '../models/profileModel.js';
import { pool } from "../configs/db.js";
import { findById, getCourseDetailsById } from "../models/courseModel.js";

const router = express.Router();


// 🟢 Lấy chi tiết khóa học (API for modal, maybe?)
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

// --- ROUTE 2: FOR THE FULL DETAIL PAGE ---
// This renders the full HTML page (views/courses/detail.hbs)
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

    // Use the function to get all details needed for the page
    const courseDetails = await getCourseDetailsById(courseId); //

    if (!courseDetails || !courseDetails.course) {
      return res.status(404).render('error', {
        layout: 'main',
        pageTitle: "Không tìm thấy",
        message: "Xin lỗi, không tìm thấy khóa học bạn yêu cầu."
      });
    }

    // ✨ ADDED LOGIC: CHECK IF THE COURSE IS IN WATCHLIST
    let isFavorite = false;
    // Only check if a user is logged in
    if (req.session.user) { //
      // Call the model function to check watchlist status
      isFavorite = await isInWatchlist(req.session.user.account_id, courseId); //
    }
    // ===================================================

    // Render the full detail page, passing all details AND the isFavorite status
    res.render('courses/detail', { // Renders views/courses/detail.hbs
      layout: 'main',
      pageTitle: courseDetails.course.title,
      ...courseDetails, // Pass course, sections, reviews, relatedCourses, etc.
      user: req.session.user, // Pass user info for conditional rendering in template
      isFavorite: isFavorite // <-- Pass the watchlist status to the template
    });

  } catch (error) {
    console.error("❌ Lỗi khi lấy chi tiết khóa học (PAGE):", error);
    next(error); // Pass to central error handler
  }
});

// 🩷 Thêm khóa học vào watchlist
router.post('/:id/favorite', async (req, res) => {
  try {
    // <-- FIXED: Use req.session.user
    const user = req.session.user; //
    const courseId = req.params.id;
    // Redirect to login if user is not logged in
    if (!user) return res.redirect('/auth/login');

    // Call the model function to add to watchlist
    await addToWatchlist(user.account_id, courseId); //
    // Redirect back to the course detail page
    return res.redirect(`/courses/${courseId}`);
  } catch (err) {
    console.error('❌ Lỗi add watchlist:', err);
    return res.status(500).send('Lỗi server');
  }
});

// 💔 Bỏ khóa học khỏi watchlist
router.post('/:id/unfavorite', async (req, res) => {
  try {
    // <-- FIXED: Use req.session.user
    const user = req.session.user; //
    const courseId = req.params.id;
    // Redirect to login if user is not logged in
    if (!user) return res.redirect('/auth/login');

    // Call the model function to remove from watchlist
    await removeFromWatchlist(user.account_id, courseId); //
    // Redirect back to the course detail page
    return res.redirect(`/courses/${courseId}`);
  } catch (err) {
    console.error('❌ Lỗi remove watchlist:', err);
    return res.status(500).send('Lỗi server');
  }
});

export default router;