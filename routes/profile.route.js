import express from "express";
import bcrypt from "bcryptjs";
import {
  getProfileById,
  updateProfile,
  getWatchlist,
  removeFromWatchlist,
  getEnrolledCourses,
} from "../models/profileModel.js";

const router = express.Router();

// 🧩 Xem hồ sơ
router.get("/", async (req, res) => {
  const user = req.user;
  if (!user) return res.redirect("/auth/signin");

  const profile = await getProfileById(user.account_id);
  res.render("vwProfile/index", {
    title: "Hồ sơ cá nhân",
    profile,
  });
});

// 🧩 Cập nhật hồ sơ
router.post("/update", async (req, res) => {
  const { full_name, email, old_password, new_password } = req.body;
  const user = req.user;
  const profile = await getProfileById(user.account_id);

  let updatedData = { full_name, email };

  if (new_password && old_password) {
    const isMatch = await bcrypt.compare(old_password, profile.password_hash);
    if (!isMatch) {
      return res.render("vwProfile/index", {
        title: "Hồ sơ cá nhân",
        profile,
        error: "Mật khẩu cũ không đúng!",
      });
    }
    const hash = await bcrypt.hash(new_password, 10);
    updatedData.password_hash = hash;
  }

  await updateProfile(user.account_id, updatedData);
  res.redirect("/profile");
});

// 🧩 Xem danh sách yêu thích
router.get("/watchlist", async (req, res) => {
  const user = req.user;
  const list = await getWatchlist(user.account_id);
  res.render("vwProfile/watchlist", {
    title: "Khoá học yêu thích",
    courses: list,
  });
});

// 🧩 Xóa khóa yêu thích
router.post("/watchlist/remove/:id", async (req, res) => {
  const user = req.user;
  await removeFromWatchlist(user.account_id, req.params.id);
  res.redirect("/profile/watchlist");
});

// 🧩 Danh sách khóa học đã đăng ký
router.get("/enrolled", async (req, res) => {
  const user = req.user;
  const list = await getEnrolledCourses(user.account_id);
  res.render("vwProfile/enrolled", {
    title: "Khoá học của tôi",
    courses: list,
  });
});

export default router;
