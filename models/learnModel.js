import db, { pool } from '../configs/db.js';

async function getStudentId(accountId) {
  // Check if account_id exists in students table
  const result = await db.query('SELECT student_id FROM students WHERE account_id = $1', [accountId]);
  if (result.length > 0) {
    return result[0].student_id;
  }

  // Fallback: Check if account_id exists in accounts table with role 'student', then find the student_id. This is a safety check.
  const accountResult = await db.query('SELECT account_id FROM accounts WHERE account_id = $1 AND role = $2', [accountId, 'student']);
  if (accountResult.length > 0) {  
    console.warn(`[learnModel] No student_id found for account_id ${accountId} in students table.`);
  } else {
    console.error(`[learnModel] No account found or account is not a student for account_id ${accountId}`);
  }
  return null;
}

export async function markLectureComplete(studentId, lectureId) {
  if (!studentId || !lectureId) {
    console.warn(`[learnModel] Invalid input to markLectureComplete: studentId=${studentId}, lectureId=${lectureId}`);
    return false;
  }

  const query = `
    INSERT INTO lecture_progress (student_id, lecture_id, is_completed, last_watched_at)
    VALUES ($1, $2, TRUE, NOW())
    ON CONFLICT (student_id, lecture_id) 
    DO UPDATE SET is_completed = TRUE, last_watched_at = NOW();
  `;
  
  try {
    await db.query(query, [studentId, lectureId]);
    console.log(`[learnModel] Lecture ${lectureId} marked complete for student ${studentId}`);
    return true;
  } catch (error) {
    console.error(`[learnModel] Error marking lecture complete: ${error.message}`);
    return false;
  }
}

export async function updateCourseProgress(studentId, courseId) {
  if (!studentId || !courseId) return null;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Get total number of lectures in the course by counting lectures
    const totalLecturesResult = await client.query(
      `
      SELECT COUNT(l.lecture_id) AS total
      FROM lectures l
      JOIN course_sections cs ON l.section_id = cs.section_id
      WHERE cs.course_id = $1
      `,
      [courseId]
    );
    const totalLectures = parseInt(totalLecturesResult.rows[0]?.total || 0, 10);

    if (!totalLectures) {
      await client.query(
        'UPDATE enrollments SET progress = 0 WHERE student_id = $1 AND course_id = $2',
        [studentId, courseId]
      );
      await client.query('COMMIT');
      console.log(`[learnModel] Course ${courseId} has 0 lectures. Progress set to 0.`);
      return 0;
    }

    // 2. Count completed lectures for this student in this course
    const completedLecturesResult = await client.query(
      `
      SELECT COUNT(DISTINCT lp.lecture_id)
      FROM lecture_progress lp
      JOIN lectures l ON lp.lecture_id = l.lecture_id
      JOIN course_sections cs ON l.section_id = cs.section_id
      WHERE lp.student_id = $1 AND cs.course_id = $2 AND lp.is_completed = TRUE
      `,
      [studentId, courseId]
    );
    const completedLectures = parseInt(completedLecturesResult.rows[0].count, 10);

    // 3. Calculate new progress percentage
    const newProgress = Math.round((completedLectures / totalLectures) * 100);

    // 4. Update the enrollments table
    const updateResult = await client.query(
      `
      UPDATE enrollments
      SET progress = $1
      WHERE student_id = $2 AND course_id = $3
      RETURNING progress;
      `,
      [newProgress, studentId, courseId]
    );

    await client.query('COMMIT');
    
    console.log(`[learnModel] Progress updated for student ${studentId}, course ${courseId}: ${newProgress}%`);
    return updateResult.rows[0].progress;

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[learnModel] Error in updateCourseProgress transaction:', error);
    throw error;
  } finally {
    client.release();
  }
}

export async function getCompletedLectures(studentId, courseId) {
  if (!studentId || !courseId) return [];

  const query = `
    SELECT lp.lecture_id
    FROM lecture_progress lp
    JOIN lectures l ON lp.lecture_id = l.lecture_id
    JOIN course_sections cs ON l.section_id = cs.section_id
    WHERE lp.student_id = $1 AND cs.course_id = $2 AND lp.is_completed = TRUE;
  `;
  
  const results = await db.query(query, [studentId, courseId]);
  return results.map(row => row.lecture_id); // Return just an array of IDs
}

export { getStudentId };