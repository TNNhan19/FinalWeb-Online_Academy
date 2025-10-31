// models/reviewModel.js
import db, { pool } from '../configs/db.js';

async function getStudentIdFromAccountId(accountId) {
  // Giả sử bảng students có cột account_id
  const result = await db.query('SELECT student_id FROM students WHERE account_id = $1', [accountId]);
  if (result.length > 0) {
    return result[0].student_id;
  }
  // Quan trọng: Xử lý trường hợp không tìm thấy student_id
  console.error(`Không tìm thấy student_id cho account_id ${accountId}`);
  return null;
}

/**
 * Thêm hoặc cập nhật đánh giá của học viên cho một khóa học.
 * @param {number} accountId ID tài khoản của học viên
 * @param {number} courseId ID khóa học
 * @param {number} rating Điểm đánh giá (1-5)
 * @param {string} feedback Nội dung phản hồi
 * @returns {Promise<boolean>} True nếu thành công, false nếu thất bại (ví dụ: không tìm thấy student_id)
 */
export async function addOrUpdateReview(accountId, courseId, rating, feedback) {
  const studentId = await getStudentIdFromAccountId(accountId);
  if (!studentId) {
    return false; // Không thể lưu nếu không có student_id
  }

  // Kiểm tra xem học viên này đã đánh giá khóa học này chưa
  const checkQuery = `SELECT review_id FROM reviews WHERE student_id = $1 AND course_id = $2`;
  const existingReview = await db.query(checkQuery, [studentId, courseId]);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    if (existingReview.length > 0) {
      // Đã có => Cập nhật
      const reviewId = existingReview[0].review_id;
      const updateQuery = `
        UPDATE reviews
        SET rating = $1, feedback = $2, created_at = NOW()
        WHERE review_id = $3
      `;
      await client.query(updateQuery, [rating, feedback, reviewId]);
      console.log(`Updated review ${reviewId} for student ${studentId}, course ${courseId}`);
    } else {
      // Chưa có => Thêm mới
      const insertQuery = `
        INSERT INTO reviews (student_id, course_id, rating, feedback, created_at)
        VALUES ($1, $2, $3, $4, NOW())
      `;
      await client.query(insertQuery, [studentId, courseId, rating, feedback]);
      console.log(`Added new review for student ${studentId}, course ${courseId}`);
    }
    await client.query('COMMIT');
    return true;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error("Lỗi khi lưu/cập nhật review:", error);
    throw error; // Ném lỗi để route xử lý
  } finally {
    client.release();
  }
}

/**
 * Kiểm tra xem học viên có đăng ký khóa học không.
 * @param {number} accountId ID tài khoản
 * @param {number} courseId ID khóa học
 * @returns {Promise<boolean>} True nếu đã đăng ký, false nếu chưa.
 */
export async function checkEnrollment(accountId, courseId) {
    const studentId = await getStudentIdFromAccountId(accountId);
    if (!studentId) return false;

    const query = `
        SELECT 1 FROM enrollments
        WHERE student_id = $1 AND course_id = $2
        LIMIT 1;
    `;
    const result = await db.query(query, [studentId, courseId]);
    return result.length > 0;
}