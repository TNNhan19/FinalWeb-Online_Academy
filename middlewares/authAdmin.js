export function requireAdmin(req, res, next) {
  const user = req.session.user;

  if (!user) {
    return res.redirect("/auth/login");
  }

  if (user.role === "student") {
    return res.redirect("/");
  }

  if (user.role === "instructor") {
    return res.redirect("/instructor");
  }

  if (user.role !== "admin") {
    return res.redirect("/");
  }

  next();
}