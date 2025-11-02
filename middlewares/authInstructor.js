export function requireInstructor(req, res, next) {
  if (!req.session || !req.session.account) {
    return res.redirect("/");
  }

  if (req.session.account.role !== "instructor") {
    return res.redirect("/");
  }
  next();
}