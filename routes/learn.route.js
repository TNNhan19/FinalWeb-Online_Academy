// routes/learn.route.js
import express from 'express';
import { getCourseDetailsById } from '../models/courseModel.js';
import db from '../configs/db.js';
import { addOrUpdateReview, checkEnrollment } from '../models/reviewModel.js';

const router = express.Router();

// Middleware to check login
function requireLogin(req, res, next) {
  if (!req.session.user) {
    // Store intended URL and redirect to login
    req.session.returnTo = req.originalUrl;
    return res.redirect('/auth/login');
  }
  next();
}

// Route GET for the learning page
router.get('/:courseId', requireLogin, async (req, res, next) => {
  const courseId = req.params.courseId;
  const accountId = req.session.user.account_id;

  try {
    // Check if the user is enrolled in this course
    const isEnrolled = await checkEnrollment(accountId, courseId);

    if (!isEnrolled) {
       console.log(`User ${accountId} tried to access course ${courseId} without enrollment.`);
       return res.status(403).render('error', {
            layout: 'main',
            pageTitle: "Không có quyền truy cập",
            message: "Bạn cần đăng ký khóa học này để có thể vào học."
       });
    }

    // Get course details (includes sections and lectures)
    const courseDetails = await getCourseDetailsById(courseId);

    if (!courseDetails || !courseDetails.course) {
      return res.status(404).render('error', {
        layout: 'main',
        pageTitle: "Không tìm thấy",
        message: "Xin lỗi, không tìm thấy khóa học bạn yêu cầu."
      });
    }

    // Render the learning page
    res.render('learn/course', {
      layout: 'main', // Or a different layout for learning pages
      pageTitle: `Học: ${courseDetails.course.title}`,
      courseData: courseDetails,
      user: req.session.user,
      isEnrolled: isEnrolled // Pass enrollment status to view
    });

  } catch (error) {
    console.error(`❌ Lỗi khi tải trang học cho khóa học ${courseId}:`, error);
    next(error); // Pass error to central handler
  }
});

// Route POST to handle review submission
router.post('/:courseId/review', requireLogin, async (req, res, next) => {
    const courseId = req.params.courseId;
    const accountId = req.session.user.account_id;
    const { rating, feedback } = req.body;

    // Basic input validation
    const ratingNum = parseInt(rating, 10);
    if (!ratingNum || ratingNum < 1 || ratingNum > 5) {
        console.log("Validation failed: Invalid rating");
        // Use flash messages for better UX instead of query params if possible
        return res.redirect(`/learn/${courseId}?error=invalid_rating`);
    }
    if (!feedback || feedback.trim() === '') {
        console.log("Validation failed: Empty feedback");
        return res.redirect(`/learn/${courseId}?error=empty_feedback`);
    }

    try {
        // Double-check enrollment for security
        const isEnrolled = await checkEnrollment(accountId, courseId);
        if (!isEnrolled) {
            console.log(`Attempt to review course ${courseId} by non-enrolled user ${accountId}`);
            return res.status(403).send("Bạn không thể đánh giá khóa học này.");
        }

        // Save the review
        const success = await addOrUpdateReview(accountId, courseId, ratingNum, feedback.trim());

        if (success) {
            console.log(`Review saved successfully for course ${courseId} by user ${accountId}`);
            return res.redirect(`/learn/${courseId}?success=review_saved`);
        } else {
             console.log(`Failed to save review for course ${courseId} by user ${accountId} (model returned false)`);
            return res.redirect(`/learn/${courseId}?error=save_failed`);
        }

    } catch (error) {
        console.error(`❌ Lỗi khi xử lý đánh giá cho khóa học ${courseId}:`, error);
        return res.redirect(`/learn/${courseId}?error=server_error`);
    }
});

export default router;