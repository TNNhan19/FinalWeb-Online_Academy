// routes/learn.route.js
import express from 'express';
import { getCourseDetailsById } from '../models/courseModel.js';
import db from '../configs/db.js';
import { addOrUpdateReview, checkEnrollment } from '../models/reviewModel.js';
import { getStudentId, markLectureComplete, updateCourseProgress, getCompletedLectures } from '../models/learnModel.js';

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

    // Get student_id
    const studentId = await getStudentId(accountId);
    
    // Get list of completed lecture IDs
    const completedIds = await getCompletedLectures(studentId, courseId);
    
    // Loop through sections and lectures to add 'is_completed' flag
    courseDetails.sections.forEach(section => {
      section.lectures.forEach(lecture => {
        if (completedIds.includes(lecture.lecture_id)) {
          lecture.is_completed = true;
        } else {
          lecture.is_completed = false;
        }
      });
    });

    // Render the learning page
    res.render('learn/detail', {
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

// Route POST to mark a lecture as completed and update course progress
router.post('/:courseId/complete', requireLogin, async (req, res) => {
  const courseId = req.params.courseId;
  const accountId = req.session.user.account_id;
  const { lectureId } = req.body;

  if (!lectureId) {
    return res.status(400).json({ success: false, message: 'Missing lectureId' });
  }

  try {
    // Verify enrollment
    const isEnrolled = await checkEnrollment(accountId, courseId);
    if (!isEnrolled) {
      return res.status(403).json({ success: false, message: 'User not enrolled in course' });
    }

    // Verify lecture belongs to this course
    const lectureCheck = await db.query(
      `SELECT l.lecture_id FROM lectures l JOIN course_sections cs ON l.section_id = cs.section_id WHERE l.lecture_id = $1 AND cs.course_id = $2`,
      [lectureId, courseId]
    );
    if (!lectureCheck || lectureCheck.length === 0) {
      return res.status(400).json({ success: false, message: 'Lecture does not belong to course' });
    }

    // Resolve student id
    const studentId = await getStudentId(accountId);
    if (!studentId) {
      return res.status(400).json({ success: false, message: 'Student record not found' });
    }

    // Mark lecture complete (idempotent due to upsert in model)
    const ok = await markLectureComplete(studentId, lectureId);
    if (!ok) {
      return res.status(500).json({ success: false, message: 'Failed to mark lecture complete' });
    }

    // Update course progress and return the new percentage
    const newProgress = await updateCourseProgress(studentId, courseId);

    return res.json({ success: true, newProgress });
  } catch (error) {
    console.error(`❌ Error in /learn/${courseId}/complete:`, error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;