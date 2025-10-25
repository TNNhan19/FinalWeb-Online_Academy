// routes/profile.route.js
import express from "express";
import * as Student from "../models/students.model.js";

const router = express.Router();

router.get("/", async (req, res) => {
  const student = await Student.getById(req.session.userId);
  res.render("profile/edit-profile", { student });
});

router.post("/update", async (req, res) => {
  await Student.updateProfile(req.session.userId, req.body);
  res.redirect("/profile");
});

router.post("/change-password", async (req, res) => {
  try {
    await Student.updatePassword(req.session.userId, req.body.oldPass, req.body.newPass);
    res.redirect("/profile");
  } catch (err) {
    res.render("profile/edit-profile", { error: err.message });
  }
});

export default router;
