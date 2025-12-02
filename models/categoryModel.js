import { pool } from "../configs/db.js";

export async function getTopCategoriesByEnrollment() {
  try {
    const query = `
      SELECT 
        cat.category_id,
        cat.name AS category_name,
        COUNT(e.enrollment_id) AS enrollments_this_week,
        COUNT(DISTINCT e.student_id) AS students_this_week,
        ROUND(AVG(crs.star)::numeric, 1) AS avg_star
      FROM enrollments e
      JOIN courses crs ON e.course_id = crs.course_id
      JOIN categories cat ON crs.category_id = cat.category_id
      WHERE e.enrolled_at >= NOW() - INTERVAL '7 days'
      GROUP BY cat.category_id, cat.name
      ORDER BY students_this_week DESC
      LIMIT 8;
    `;
    const result = await pool.query(query);
    return result.rows;
  } catch (error) {
    console.error("❌ Lỗi khi truy vấn top lĩnh vực:", error);
    throw error;
  }
}
