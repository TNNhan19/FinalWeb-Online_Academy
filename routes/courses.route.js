import express from 'express';
// Assuming your course model is correctly exported from models/courseModel.js
import * as courseModel from '../models/courseModel.js';

const router = express.Router();

router.get('/:id', async (req, res) => {
  try {
    const courseId = req.params.id;
    const courseDetails = await courseModel.getCourseDetailsById(courseId);

    if (!courseDetails || !courseDetails.course) {
      return res.status(404).render('error', {
        layout: 'main',
        pageTitle: "Không tìm thấy",
        message: "Xin lỗi, không tìm thấy khóa học bạn yêu cầu."
      });
    }

    res.render('courses/detail', {
      layout: 'main',
      pageTitle: courseDetails.course.title,
      ...courseDetails,
      user: req.session.user
    });

  } catch (error) {
    console.error("❌ Lỗi khi lấy chi tiết khóa học:", error);
    res.status(500).render('error', {
       layout: 'main',
       pageTitle: "Lỗi máy chủ",
       message: "Đã xảy ra lỗi khi tải trang chi tiết khóa học. Vui lòng thử lại sau."
     });
  }
});

export default router;