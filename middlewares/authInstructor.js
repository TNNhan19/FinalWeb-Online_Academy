export function requireInstructor(req, res, next) {
  // Nếu chưa đăng nhập
  if (!req.session || !req.session.account) {
    return res.redirect("/");
  }

  // Nếu không phải role instructor
  if (req.session.account.role !== "instructor") {
    return res.redirect("/");
  }

  // Cho phép truy cập
  next();
}
