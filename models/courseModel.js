import db from "../configs/db.js";

export async function findPopular(limit = 10) {
  const query = `
    SELECT 
      c.course_id,
      c.title,
      c.description,
      c.image_url,
      c.current_price,
      c.original_price,
      i.name AS instructor_name,
      cat.name AS category_name
    FROM courses c
    LEFT JOIN instructors i ON c.instructor_id = i.instructor_id
    LEFT JOIN categories cat ON c.category_id = cat.category_id
    ORDER BY c.is_bestseller DESC, c.created_at DESC
    LIMIT $1;
  `;
  const rows = await db.query(query, [limit]);
  return rows;
}

export async function findAll() {
  const query = `
    SELECT 
      c.course_id,
      c.title,
      c.description,
      c.image_url,
      c.current_price,
      c.original_price,
      i.name AS instructor_name,
      cat.name AS category_name
    FROM courses c
    LEFT JOIN instructors i ON c.instructor_id = i.instructor_id
    LEFT JOIN categories cat ON c.category_id = cat.category_id
    ORDER BY c.created_at DESC;
  `;
  const rows = await db.query(query);
  return rows;
}

export async function findById(id) {
  const query = `
    SELECT 
      c.*, 
      i.name AS instructor_name, 
      cat.name AS category_name
    FROM courses c
    LEFT JOIN instructors i ON c.instructor_id = i.instructor_id
    LEFT JOIN categories cat ON c.category_id = cat.category_id
    WHERE c.course_id = $1;
  `;
  const rows = await db.query(query, [id]);
  return rows[0];
}
//-- new function for detailed course info

export async function getCourseDetailsById(courseId) {
  // 1. Get Course, Instructor, Category, Rating, Enrollment Count
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
    LEFT JOIN categories cat ON c.category_id = cat.category_id
    LEFT JOIN reviews r ON c.course_id = r.course_id
    WHERE c.course_id = $1
    GROUP BY c.course_id, i.instructor_id, cat.category_id;
  `;
  const courseResult = await db.query(courseQuery, [courseId]);
  const course = courseResult[0]; // Assuming db.query returns rows

  if (!course) {
    return null;
  }

  // 2. Get Sections and Lectures
  const sectionsQuery = `SELECT * FROM course_sections WHERE course_id = $1 ORDER BY order_index ASC;`;
  const sections = await db.query(sectionsQuery, [courseId]);

  const lecturesQuery = `
    SELECT l.* FROM lectures l
    JOIN course_sections cs ON l.section_id = cs.section_id
    WHERE cs.course_id = $1
    ORDER BY cs.order_index ASC, l.order_index ASC;
  `;
  const lectures = await db.query(lecturesQuery, [courseId]);

  // Attach lectures to their sections
  sections.forEach(section => {
    section.lectures = lectures.filter(lecture => lecture.section_id === section.section_id);
  });

  // 3. Get Reviews with Student Names
  const reviewsQuery = `
    SELECT r.rating, r.feedback, r.created_at, s.name AS student_name
    FROM reviews r
    JOIN students s ON r.student_id = s.student_id
    WHERE r.course_id = $1
    ORDER BY r.created_at DESC;
  `;
  const reviews = await db.query(reviewsQuery, [courseId]);

  // 4. Get 5 Related Courses (Same Category, Most Enrolled, Exclude Current)
  const relatedCoursesQuery = `
    SELECT
      rc.course_id, rc.title, rc.image_url, rc.current_price, rc.original_price,
      i.name AS instructor_name,
      COALESCE(AVG(rr.rating), 0.0)::DECIMAL(2,1) AS average_rating,
      COUNT(DISTINCT re.enrollment_id) AS enrollment_count
    FROM courses rc
    LEFT JOIN instructors i ON rc.instructor_id = i.instructor_id
    LEFT JOIN reviews rr ON rc.course_id = rr.course_id
    LEFT JOIN enrollments re ON rc.course_id = re.course_id
    WHERE rc.category_id = $1 AND rc.course_id != $2
    GROUP BY rc.course_id, i.instructor_id
    ORDER BY enrollment_count DESC, average_rating DESC
    LIMIT 5;
  `;
  const relatedCourses = await db.query(relatedCoursesQuery, [course.category_id, courseId]);
  // 5. Get Gallery Images (optional)
  const imagesQuery = `SELECT image_url, description FROM course_images WHERE course_id = $1;`;
  const galleryImages = await db.query(imagesQuery, [courseId]);

  return {
    course: course,
    sections: sections,
    reviews: reviews,
    relatedCourses: relatedCourses,
    galleryImages: galleryImages
  };
}

