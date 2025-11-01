import express from 'express';
import * as courseModel from '../models/courseModel.js';
import * as enrollmentModel from '../models/enrollmentModel.js';

const router = express.Router();

// Đăng ký khóa học mới
router.post('/:courseId/enroll', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Vui lòng đăng nhập để đăng ký khóa học' });
    }

    const { courseId } = req.params;
    const course = await courseModel.findById(courseId);
    
    if (!course) {
      return res.status(404).json({ error: 'Không tìm thấy khóa học' });
    }

    // Kiểm tra xem đã đăng ký chưa
    const isAlreadyEnrolled = await enrollmentModel.isEnrolled(req.user.account_id, courseId);
    if (isAlreadyEnrolled) {
      return res.status(400).json({ error: 'Bạn đã đăng ký khóa học này rồi' });
    }

    // Thực hiện đăng ký
    await enrollmentModel.enrollCourse(req.user.account_id, courseId);
    
    return res.json({ 
      success: true, 
      message: 'Đăng ký khóa học thành công',
      redirect: `/courses/${courseId}` 
    });
  } catch (error) {
    console.error('Error enrolling in course:', error);
    return res.status(500).json({ error: 'Có lỗi xảy ra khi đăng ký khóa học' });
  }
});

// Cập nhật tiến độ học
router.post('/:courseId/progress', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Vui lòng đăng nhập' });
    }

    const { courseId } = req.params;
    const { progress } = req.body;

    if (typeof progress !== 'number' || progress < 0 || progress > 100) {
      return res.status(400).json({ error: 'Tiến độ không hợp lệ' });
    }

    const isEnrolled = await enrollmentModel.isEnrolled(req.user.account_id, courseId);
    if (!isEnrolled) {
      return res.status(403).json({ error: 'Bạn chưa đăng ký khóa học này' });
    }

    await enrollmentModel.updateProgress(req.user.account_id, courseId, progress);
    
    return res.json({ success: true });
  } catch (error) {
    console.error('Error updating progress:', error);
    return res.status(500).json({ error: 'Có lỗi xảy ra khi cập nhật tiến độ' });
  }
});

export default router;