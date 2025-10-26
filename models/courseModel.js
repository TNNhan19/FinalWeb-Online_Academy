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
