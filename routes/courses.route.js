const courseRes = await pool.query(`
  SELECT c.*, i.name AS instructor_name, i.total_students, i.bio
  FROM courses c
  LEFT JOIN instructors i ON c.instructor_id = i.instructor_id
  WHERE c.course_id = $1
`, [req.params.id]);

const course = courseRes.rows[0];

res.render("courses/detail", {
  layout: "main",
  course,
  instructor: {
    name: course.instructor_name,
    bio: course.bio,
    total_students: course.total_students
  }
});
