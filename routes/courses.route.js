import express from 'express';
import { isInWatchlist, addToWatchlist, removeFromWatchlist } from '../models/profileModel.js';



const router = express.Router();

router.get('/:id', async (req, res) => {
  const user = req.user;
  const courseId = req.params.id;

  const course = await getCourseById(courseId); // lấy thông tin khóa học
  let isFavorite = false;

  if (user && user.role === "student") {
    isFavorite = await isInWatchlist(user.account_id, courseId);
  }

  res.render('vwCourses/detail', {
    title: course.title,
    course,
    isFavorite
  });
});

// 🩷 Thêm khóa học vào watchlist
router.post('/:id/favorite', async (req, res) => {
  const user = req.user;
  const courseId = req.params.id;

  if (!user) return res.redirect('/auth/signin');

  await addToWatchlist(user.account_id, courseId);
  res.redirect(`/courses/${courseId}`);
});

// 💔 Bỏ khóa học khỏi watchlist
router.post('/:id/unfavorite', async (req, res) => {
  const user = req.user;
  const courseId = req.params.id;

  if (!user) return res.redirect('/auth/signin');

  await removeFromWatchlist(user.account_id, courseId);
  res.redirect(`/courses/${courseId}`);
});

export default router;