// routes/watchlist.route.js
import express from "express";
import * as Watchlist from "../models/watchlist.model.js";

const router = express.Router();


router.get("/", async (req, res) => {
  const studentId = req.session.userId; 
  const courses = await Watchlist.getByStudentId(studentId);
  res.render("profile/watchlist", { courses });
});


router.post("/add/:id", async (req, res) => {
  const studentId = req.session.userId;
  const courseId = req.params.id;
  await Watchlist.add(studentId, courseId);
  res.redirect("back");
});


router.post("/remove/:id", async (req, res) => {
  const studentId = req.session.userId;
  const courseId = req.params.id;
  await Watchlist.remove(studentId, courseId);
  res.redirect("/profile/watchlist");
});

export default router;
