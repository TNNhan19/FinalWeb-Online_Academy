import db from "../configs/db.js";

// Đăng ký khóa học mới
export const enrollCourse = async (account_id, course_id) => {
  try {
    // Lấy student_id từ account_id
    const studentQuery = `
      SELECT student_id FROM students 
      WHERE account_id = $1
    `;
    const student = await db.query(studentQuery, [account_id]);
    if (!student.length) {
      throw new Error('Student not found');
    }

    // Kiểm tra xem đã đăng ký chưa
    const checkQuery = `
      SELECT * FROM enrollments 
      WHERE student_id = $1 AND course_id = $2
    `;
    const existing = await db.query(checkQuery, [student[0].student_id, course_id]);
    if (existing.length > 0) {
      throw new Error('Already enrolled');
    }

    // Thêm vào enrollments
    const enrollQuery = `
      INSERT INTO enrollments (student_id, course_id, enrolled_at, progress)
      VALUES ($1, $2, CURRENT_TIMESTAMP, 0)
      RETURNING *
    `;
    const result = await db.query(enrollQuery, [student[0].student_id, course_id]);
    return result[0];
  } catch (error) {
    console.error('Error in enrollCourse:', error);
    throw error;
  }
};

// Kiểm tra người dùng đã đăng ký khóa học chưa
export const isEnrolled = async (account_id, course_id) => {
  try {
    const query = `
      SELECT EXISTS (
        SELECT 1 FROM enrollments e
        JOIN students s ON e.student_id = s.student_id
        WHERE s.account_id = $1 AND e.course_id = $2
      ) as enrolled
    `;
    const result = await db.query(query, [account_id, course_id]);
    return result[0].enrolled;
  } catch (error) {
    console.error('Error in isEnrolled:', error);
    throw error;
  }
};

// Cập nhật tiến độ học
export const updateProgress = async (account_id, course_id, progress) => {
  try {
    const query = `
      UPDATE enrollments
      SET progress = $3
      FROM students
      WHERE enrollments.student_id = students.student_id
      AND students.account_id = $1
      AND enrollments.course_id = $2
      RETURNING *
    `;
    const result = await db.query(query, [account_id, course_id, progress]);
    return result[0];
  } catch (error) {
    console.error('Error in updateProgress:', error);
    throw error;
  }
};

// Lấy tất cả khóa học đã đăng ký của user
export const getEnrolledCourses = async (account_id) => {
  try {
    const query = `
      SELECT 
        c.*,
        e.enrolled_at,
        e.progress,
        i.name as instructor_name,
        cat.name as category_name,
        (SELECT EXISTS(
          SELECT 1 FROM watchlist w
          JOIN students s2 ON w.student_id = s2.student_id
          WHERE s2.account_id = s.account_id AND w.course_id = c.course_id
        )) as is_in_watchlist
      FROM enrollments e
      JOIN students s ON e.student_id = s.student_id
      JOIN courses c ON e.course_id = c.course_id
      LEFT JOIN instructors i ON c.instructor_id = i.instructor_id
      LEFT JOIN categories cat ON c.category_id = cat.category_id
      WHERE s.account_id = $1
      ORDER BY e.enrolled_at DESC
    `;
    const result = await db.query(query, [account_id]);
    return result;
  } catch (error) {
    console.error('Error in getEnrolledCourses:', error);
    throw error;
  }
};