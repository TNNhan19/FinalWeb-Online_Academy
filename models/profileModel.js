import db from '../configs/db.js';

// ========= Profile =========
export const getProfileById = async (account_id) => {
  try {
    console.log('Fetching profile for account_id:', account_id);
    
    // Query trực tiếp từ bảng accounts
    const query = `
      SELECT 
        account_id,
        email,
        role,
        full_name,
        password_hash,
        is_verified,
        created_at
      FROM accounts
      WHERE account_id = $1
    `;

    const result = await db.query(query, [account_id]);
    console.log('Query Result:', result);

    if (!result || result.length === 0) {
      console.log('No account found for account_id:', account_id);
      return null;
    }

    // Nếu chưa có name trong bảng role tương ứng, dùng email làm full_name
    const profile = {
      ...result[0],
      full_name: result[0].full_name || result[0].email.split('@')[0]
    };

    console.log('Returned profile:', profile);
    return profile;
  } catch (error) {
    console.error('Error in getProfileById:', error);
    throw error;
  }
};

// Tạo và lưu mã OTP
export const createOTP = async (email) => {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const query = `
    UPDATE accounts 
    SET otp = $2
    WHERE email = $1
    RETURNING *
  `;
  const result = await db.query(query, [email, otp]);
  return result[0];
};

// Xác thực mã OTP
export const verifyOTP = async (email, otp) => {
  const query = `
    SELECT * FROM accounts
    WHERE email = $1 AND otp = $2
  `;
  const result = await db.query(query, [email, otp]);
  if (result.length > 0) {
    // Xóa OTP sau khi xác thực thành công
    await db.query('UPDATE accounts SET otp = NULL WHERE email = $1', [email]);
    return true;
  }
  return false;
};

export const updateProfile = async (account_id, data) => {
  const fields = Object.keys(data);
  const values = Object.values(data);
  
  const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');
  const query = `
    UPDATE accounts 
    SET ${setClause}
    WHERE account_id = $1
  `;
  
  await db.query(query, [account_id, ...values]);
  return true;
};

// ========= Lấy student_id từ account_id (mock) =========
export const getStudentId = async (account_id) => 1;

// ========= Watchlist =========
export const getWatchlist = async (account_id) => {
  const query = `
    SELECT c.* FROM watchlist w
    JOIN courses c ON w.course_id = c.course_id
    JOIN students s ON w.student_id = s.student_id
    WHERE s.account_id = $1
  `;
  return await db.query(query, [account_id]);
};

export const removeFromWatchlist = async (account_id, course_id) => {
  const query = `
    DELETE FROM watchlist
    USING students
    WHERE watchlist.student_id = students.student_id
    AND students.account_id = $1 
    AND watchlist.course_id = $2
  `;
  await db.query(query, [account_id, course_id]);
  return true;
};

export const addToWatchlist = async (account_id, course_id) => {
  // --- ADD LOGGING ---
  console.log(`[addToWatchlist] Called with account_id: ${account_id}, course_id: ${course_id}`);
  // --- END LOGGING ---
  try {
    // --- ADD LOGGING: Check if student_id exists ---
    const studentCheckQuery = `SELECT student_id FROM students WHERE account_id = $1`;
    const studentCheckResult = await db.query(studentCheckQuery, [account_id]);
    const studentId = studentCheckResult[0]?.student_id;
    console.log(`[addToWatchlist] Found student_id: ${studentId} for account_id: ${account_id}`);
    // --- END LOGGING ---

    if (!studentId) {
       console.error(`[addToWatchlist] ERROR: No student_id found for account_id ${account_id}. Cannot insert into watchlist.`);
       return false; // Indicate failure
    }

    // Original insert query (now using the found studentId directly)
    const query = `
      INSERT INTO watchlist (student_id, course_id)
      VALUES ($1, $2)
      ON CONFLICT (student_id, course_id) DO NOTHING
    `;
    // Use the found studentId
    const result = await db.query(query, [studentId, course_id]);
    console.log(`[addToWatchlist] Insert result (rowCount might be 0 if conflict):`, result); // Log the result object if available

    return true; // Indicate success (or conflict ignored)
  } catch (error) {
    console.error(`[addToWatchlist] Database error:`, error);
    throw error; // Re-throw error to be caught by route handler
  }
};

export const isInWatchlist = async (account_id, course_id) => {
  const query = `
    SELECT EXISTS(
      SELECT 1 FROM watchlist w
      JOIN students s ON w.student_id = s.student_id
      WHERE s.account_id = $1 AND w.course_id = $2
    )
  `;
  const result = await db.query(query, [account_id, course_id]);
  return result[0]?.exists || false;
};

// ========= Enrolled =========
export const getEnrolledCourses = async (account_id) => {
  const query = `
    SELECT c.*, e.progress, e.enrolled_at
    FROM enrollments e
    JOIN courses c ON e.course_id = c.course_id
    JOIN students s ON e.student_id = s.student_id
    WHERE s.account_id = $1
  `;
  return await db.query(query, [account_id]);
};

