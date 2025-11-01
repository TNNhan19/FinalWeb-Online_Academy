import db from "../configs/db.js";

// ========================= POPULAR (mặc định 4) =========================
export async function findPopular(limit = 4) {
  const query = `
    SELECT 
      c.course_id,
      c.title,
      c.description,
      c.image_url,
      c.current_price,
      c.original_price,
      c.student,
      c.star,
      i.name AS instructor_name,
      cat.name AS category_name
    FROM courses c
    LEFT JOIN instructors i ON c.instructor_id = i.instructor_id
    LEFT JOIN categories  cat ON c.category_id = cat.category_id
    ORDER BY c.is_bestseller DESC, c.student DESC, c.created_at DESC
    LIMIT $1;
  `;
  const rows = await db.query(query, [limit]);
  return rows;
}

// ========================= ALL COURSES =========================
export async function findAll() {
  const query = `
    SELECT 
      c.course_id,
      c.title,
      c.description,
      c.image_url,
      c.current_price,
      c.original_price,
      c.student,
      c.star,
      i.name AS instructor_name,
      cat.name AS category_name
    FROM courses c
    LEFT JOIN instructors i ON c.instructor_id = i.instructor_id
    LEFT JOIN categories  cat ON c.category_id = cat.category_id
    ORDER BY c.created_at DESC;
  `;
  const rows = await db.query(query);
  return rows;
}

export async function getAllCourses() {
  const query = `
    SELECT 
      c.course_id,
      c.title,
      c.description,
      c.image_url,
      c.current_price,
      c.original_price,
      c.student,
      c.star,
      i.name AS instructor_name,
      cat.name AS category_name
    FROM courses c
    LEFT JOIN instructors i ON c.instructor_id = i.instructor_id
    LEFT JOIN categories  cat ON c.category_id = cat.category_id
    ORDER BY c.created_at DESC;
  `;
  const rows = await db.query(query);
  return rows;
}

// ========================= BEST SELLERS (mặc định 8) =========================
export async function findBestSellers(limit = 8, categoryName = null) {
  let idx = 1;
  const params = [];

  let query = `
    SELECT 
      c.course_id,
      c.title,
      c.description,
      c.image_url,
      c.current_price,
      c.original_price,
      c.student,
      c.star,
      i.name AS instructor_name,
      cat.name AS category_name
    FROM courses c
    LEFT JOIN instructors i ON c.instructor_id = i.instructor_id
    LEFT JOIN categories cat ON c.category_id = cat.category_id
    WHERE c.is_bestseller = TRUE
      AND c.is_published = TRUE
  `;

  if (
    categoryName &&
    categoryName.toLowerCase() !== "all" &&
    categoryName.toLowerCase() !== "tất cả"
  ) {
    query += ` AND cat.name = $${idx++}`;
    params.push(categoryName);
  }

  query += ` ORDER BY c.student DESC, c.created_at DESC LIMIT $${idx};`;
  params.push(limit);

  const rows = await db.query(query, params);
  return rows;
}
// 🟢 Lấy các khóa học nổi bật nhất trong tuần qua
export async function findWeeklyHighlights(limit = 4) {
  const query = `
    SELECT 
      c.course_id,
      c.title,
      c.description,
      c.image_url,
      c.current_price,
      c.original_price,
      c.student,
      c.star,
      i.name AS instructor_name,
      cat.name AS category_name,
      COUNT(v.view_id) AS weekly_views
    FROM courses c
    LEFT JOIN instructors i ON c.instructor_id = i.instructor_id
    LEFT JOIN categories cat ON c.category_id = cat.category_id
    LEFT JOIN course_views v ON c.course_id = v.course_id 
        AND v.viewed_at >= NOW() - INTERVAL '7 days'
    WHERE c.is_published = TRUE
    GROUP BY c.course_id, i.name, cat.name
    ORDER BY 
      weekly_views DESC,      -- lượt xem trong tuần
      c.student DESC,         -- học viên nhiều
      c.star DESC,            -- điểm đánh giá cao
      c.created_at DESC       -- ưu tiên khóa học mới hơn
    LIMIT $1;
  `;
  const rows = await db.query(query, [limit]);
  return rows;
}


// ========================= BY ID =========================
export async function findById(id) {
  const query = `
    SELECT 
      c.*,
      i.name AS instructor_name, 
      cat.name AS category_name
    FROM courses c
    LEFT JOIN instructors i ON c.instructor_id = i.instructor_id
    LEFT JOIN categories  cat ON c.category_id = cat.category_id
    WHERE c.course_id = $1;
  `;
  const rows = await db.query(query, [id]);
  return rows[0];
}


// ========================= BY CATEGORY (tất cả khóa học trong danh mục) =========================

export async function getCoursesByCategory(categoryName) {
  try {
    // 1️⃣ Lấy ID & parent_id của danh mục được click
    const categories = await db.query(
      `SELECT category_id, parent_id FROM categories WHERE LOWER(name) = LOWER($1)`,
      [categoryName.trim()]
    );

    if (!categories || categories.length === 0) {
      console.warn(`⚠️ Không tìm thấy danh mục: ${categoryName}`);
      return [];
    }

    const { category_id, parent_id } = categories[0];
    let courses = [];

    // 2️⃣ Nếu là danh mục CHA → lấy tất cả KHÓA HỌC của các danh mục CON
    if (parent_id === null) {
      courses = await db.query(
        `
        SELECT c.*, cat.name AS category_name, i.name AS instructor_name
        FROM courses c
        JOIN categories cat ON c.category_id = cat.category_id
        LEFT JOIN instructors i ON c.instructor_id = i.instructor_id
        WHERE cat.parent_id = $1
        ORDER BY c.course_id DESC
        `,
        [category_id]
      );
    }
    // 3️⃣ Nếu là danh mục CON → chỉ lấy khóa học thuộc mục con đó
    else {
      courses = await db.query(
        `
        SELECT c.*, cat.name AS category_name, i.name AS instructor_name
        FROM courses c
        JOIN categories cat ON c.category_id = cat.category_id
        LEFT JOIN instructors i ON c.instructor_id = i.instructor_id
        WHERE cat.category_id = $1
        ORDER BY c.course_id DESC
        `,
        [category_id]
      );
    }

    if (!courses || courses.length === 0) {
      console.warn(`⚠️ Không có khóa học thuộc danh mục: ${categoryName}`);
      return [];
    }

    return courses;
  } catch (error) {
    console.error("❌ Lỗi khi lấy khóa học theo danh mục:", error);
    return [];
  }
}


// 🆕 Lấy 10 khóa học mới nhất (mọi lĩnh vực)
export async function findNewestCourses(limit = 10) {
  const query = `
    SELECT 
      c.course_id,
      c.title,
      c.description,
      c.image_url,
      c.current_price,
      c.original_price,
      c.student,
      c.star,
      c.view,
      i.name AS instructor_name,
      cat.name AS category_name,
      c.created_at
    FROM courses c
    LEFT JOIN instructors i ON c.instructor_id = i.instructor_id
    LEFT JOIN categories cat ON c.category_id = cat.category_id
    WHERE c.is_published = TRUE
    ORDER BY c.created_at DESC
    LIMIT $1;
  `;
  const rows = await db.query(query, [limit]);
  return rows;
}


// 🟢 Lĩnh vực có nhiều học viên và đánh giá cao nhất (dựa trên bảng courses)
export async function findTopCategoriesByStudentsAndRating(limit = 6) {
  const query = `
    SELECT 
      cat.category_id,
      cat.name AS category_name,
      COALESCE(parent.name, '') AS parent_name,
      ROUND(AVG(COALESCE(c.star, 0))::numeric, 1) AS avg_star,   -- trung bình sao
      COALESCE(SUM(COALESCE(c.student, 0)), 0) AS total_students  -- tổng học viên
    FROM courses c
    JOIN categories cat ON c.category_id = cat.category_id
    LEFT JOIN categories parent ON cat.parent_id = parent.category_id
    GROUP BY cat.category_id, cat.name, parent.name
    ORDER BY total_students DESC, avg_star DESC
    LIMIT $1;
  `;
  const rows = await db.query(query, [limit]);
  return rows;
}



// 🟢 Lấy 10 khóa học có lượt xem nhiều nhất
export async function findTopViewed(limit = 10) {
  const query = `
    SELECT 
      c.course_id,
      c.title,
      c.description,
      c.image_url,
      c.current_price,
      c.original_price,
      c.student,
      c.star,
      c.view,
      i.name AS instructor_name,
      cat.name AS category_name
    FROM courses c
    LEFT JOIN instructors i ON c.instructor_id = i.instructor_id
    LEFT JOIN categories cat ON c.category_id = cat.category_id
    WHERE c.is_published = TRUE
    ORDER BY c.view DESC, c.star DESC, c.student DESC
    LIMIT $1;
  `;
  const rows = await db.query(query, [limit]);
  return rows;
}




// ========================= COURSE DETAILS (giữ nguyên cấu trúc) =========================
export async function getCourseDetailsById(courseId) {
  try {
    const courseQuery = `
      SELECT
        c.*,
        i.instructor_id, i.name AS instructor_name, i.bio AS instructor_bio, i.total_students AS instructor_total_students,
        cat.name AS category_name,
        (SELECT COUNT(*) FROM enrollments e WHERE e.course_id = c.course_id) AS enrollment_count,
        COALESCE(AVG(r.rating), 0.0)::DECIMAL(2,1) AS average_rating,
        COUNT(DISTINCT r.review_id) AS total_reviews
      FROM courses c
      LEFT JOIN instructors i ON c.instructor_id = i.instructor_id
      LEFT JOIN categories  cat ON c.category_id = cat.category_id
      LEFT JOIN reviews     r   ON c.course_id = r.course_id
      WHERE c.course_id = $1
      GROUP BY c.course_id, i.instructor_id, cat.category_id;
    `;
    const courseResult = await db.query(courseQuery, [courseId]);
    const course = courseResult[0];
    if (!course) return null;

    const sectionsQuery = `
      SELECT * FROM course_sections 
      WHERE course_id = $1 
      ORDER BY order_index ASC;
    `;
    const sections = await db.query(sectionsQuery, [courseId]);

    const lecturesQuery = `
      SELECT l.* FROM lectures l
      JOIN course_sections cs ON l.section_id = cs.section_id
      WHERE cs.course_id = $1
      ORDER BY cs.order_index ASC, l.order_index ASC;
    `;
    const lectures = await db.query(lecturesQuery, [courseId]);
    sections.forEach(s => {
      s.lectures = lectures.filter(l => l.section_id === s.section_id);
    });

    const reviewsQuery = `
      SELECT r.rating, r.feedback, r.created_at, s.name AS student_name
      FROM reviews r
      JOIN students s ON r.student_id = s.student_id
      WHERE r.course_id = $1
      ORDER BY r.created_at DESC;
    `;
    const reviews = await db.query(reviewsQuery, [courseId]);

    const relatedCoursesQuery = `
      SELECT rc.course_id, rc.title, rc.image_url, rc.current_price
      FROM courses rc
      WHERE rc.category_id = $1 AND rc.course_id != $2
      ORDER BY (SELECT COUNT(*) FROM enrollments e WHERE e.course_id = rc.course_id) DESC
      LIMIT 5;
    `;
    const relatedCourses = await db.query(relatedCoursesQuery, [course.category_id, courseId]);

    const imagesQuery = `SELECT image_url, description FROM course_images WHERE course_id = $1;`;
    const galleryImages = await db.query(imagesQuery, [courseId]);

    return { course, sections, reviews, relatedCourses, galleryImages };
  } catch (error) {
    console.error(`Error in getCourseDetailsById for courseId ${courseId}:`, error);
    throw error;
  }
}
