import express from "express";
import { pool } from "../configs/db.js";

const router = express.Router();

router.get("/", async (req, res) => {
  const { q = "", page = 1, sort = "rating_desc" } = req.query;
  const limit = 8;
  const offset = (page - 1) * limit;

  let orderBy = "c.star DESC";
  if (sort === "price_asc") orderBy = "c.current_price ASC";
  else if (sort === "newest") orderBy = "c.created_at DESC";
  else if (sort === "bestseller") orderBy = "c.student DESC";

  const params = [];
  let where = "WHERE TRUE";

  // ✅ FULL-TEXT SEARCH + FUZZY SEARCH (pg_trgm)
  if (q) {
    params.push(q);
    params.push(`%${q}%`);
    where += `
      AND (
        to_tsvector('simple', coalesce(c.title,'') || ' ' || coalesce(c.description,'') || ' ' || coalesce(cat.name,''))
        @@ plainto_tsquery('simple', $${params.length - 1})
        OR similarity(c.title, $${params.length - 1}) > 0.3
        OR c.title ILIKE $${params.length}
        OR cat.name ILIKE $${params.length}
      )
    `;
  }

  const query = `
    SELECT 
      c.*,
      i.name AS instructor_name,
      cat.name AS category_name,
      (CURRENT_DATE - c.created_at::date < 14) AS is_new,
      (c.student > 2000) AS is_bestseller,
      (c.current_price < c.original_price) AS is_discounted
    FROM courses c
    LEFT JOIN instructors i ON c.instructor_id = i.instructor_id
    LEFT JOIN categories cat ON c.category_id = cat.category_id
    ${where}
    ORDER BY ${orderBy}
    LIMIT ${limit} OFFSET ${offset};
  `;

  const countQuery = `
    SELECT COUNT(*) AS total
    FROM courses c
    LEFT JOIN categories cat ON c.category_id = cat.category_id
    ${where};
  `;

  try {
    const [dataRes, countRes] = await Promise.all([
      pool.query(query, params),
      pool.query(countQuery, params),
    ]);

    const totalCourses = Number(countRes.rows[0].total);
    const totalPages = Math.ceil(totalCourses / limit);

    res.json({
      courses: dataRes.rows,
      totalPages,
    });
  } catch (error) {
    console.error("❌ Lỗi khi thực hiện truy vấn:", error);
    res.status(500).json({ error: "Không thể tải kết quả tìm kiếm." });
  }
});

export default router;
