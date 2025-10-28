import express from "express";
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();
import {
  getProfileById,
  updateProfile,
  getWatchlist,
  addToWatchlist,
  removeFromWatchlist,
  getEnrolledCourses,
  createOTP,
  verifyOTP,
  isInWatchlist,
} from "../models/profileModel.js";

const router = express.Router();

// Ensure `req.user` is populated from session or res.locals so routes can use it
router.use((req, res, next) => {
  if (!req.user) {
    req.user = req.session?.user || res.locals.user || null;
  }
  next();
});

// 🧩 Xem hồ sơ
router.get("/", async (req, res) => {
  const user = req.user;
  if (!user) return res.redirect("/auth/login");

  const profile = await getProfileById(user.account_id);
  console.log("User:", user);
  console.log("Profile:", profile);
  res.render("profile/view", {
    title: "Hồ sơ cá nhân",
    profile,
  });
});

// 🧩 Trang chỉnh sửa hồ sơ
// Trang chỉnh sửa hồ sơ
router.get("/edit", async (req, res) => {
  if (!req.user) return res.redirect("/auth/login");

  // Kiểm tra session có verified chưa
  if (!req.session.isVerified) {
    try {
      const profile = await getProfileById(req.user.account_id);
      const otpInfo = await createOTP(profile.email);

      // Gửi email chứa OTP (nếu cấu hình MAIL_USER/MAIL_PASS có sẵn)
      try {
        if (!process.env.MAIL_USER || !process.env.MAIL_PASS) throw new Error('Mail config missing');

        const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: process.env.MAIL_USER,
            pass: process.env.MAIL_PASS,
          },
        });

        await transporter.sendMail({
          from: process.env.MAIL_USER,
          to: profile.email,
          subject: 'Mã OTP xác thực - Online Academy',
          text: `Mã OTP của bạn là: ${otpInfo.otp}. Mã có hiệu lực trong vài phút. Nếu bạn không yêu cầu mã này, hãy bỏ qua email này.`,
        });
      } catch (mailErr) {
        // Nếu gửi mail thất bại, in OTP ra console để test
        console.warn('Could not send OTP email, falling back to console. Reason:', mailErr.message);
        console.log('OTP for testing:', otpInfo.otp);
      }

      return res.render("profile/verify", {
        title: "Xác thực tài khoản",
        email: profile.email,
        success: 'Mã OTP đã được gửi. Kiểm tra email hoặc console server nếu không nhận được.'
      });
    } catch (error) {
      console.error("Error sending OTP:", error);
      return res.redirect("/profile");
    }
  }

  // Nếu đã verified, hiển thị form edit
  const profile = await getProfileById(req.user.account_id);
  res.render("profile/edit", {
    title: "Chỉnh sửa hồ sơ",
    profile
  });
});

// Xác thực OTP
router.post("/verify-otp", async (req, res) => {
  if (!req.user) return res.redirect("/auth/login");

  const { otp } = req.body;
  const profile = await getProfileById(req.user.account_id);

  const isValid = await verifyOTP(profile.email, otp);
  if (!isValid) {
    return res.render("profile/verify", {
      title: "Xác thực tài khoản",
      email: profile.email,
      error: "Mã xác thực không đúng"
    });
  }

  // Lưu trạng thái đã xác thực vào session
  req.session.isVerified = true;
  res.redirect("/profile/edit");
});

// Gửi lại OTP
router.post("/resend-otp", async (req, res) => {
  if (!req.user) return res.redirect("/auth/login");

    try {
      const profile = await getProfileById(req.user.account_id);
      const otpInfo = await createOTP(profile.email);

      try {
        if (!process.env.MAIL_USER || !process.env.MAIL_PASS) throw new Error('Mail config missing');

        const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: process.env.MAIL_USER,
            pass: process.env.MAIL_PASS,
          },
        });

        await transporter.sendMail({
          from: process.env.MAIL_USER,
          to: profile.email,
          subject: 'Mã OTP xác thực - Online Academy',
          text: `Mã OTP của bạn là: ${otpInfo.otp}. Mã có hiệu lực trong vài phút. Nếu bạn không yêu cầu mã này, hãy bỏ qua email này.`,
        });
      } catch (mailErr) {
        console.warn('Could not send OTP email on resend, falling back to console. Reason:', mailErr.message);
        console.log('New OTP for testing:', otpInfo.otp);
      }

      res.render("profile/verify", {
        title: "Xác thực tài khoản",
        email: profile.email,
        success: "Đã gửi lại mã xác thực (hoặc xem console server nếu không nhận được)."
      });
    } catch (error) {
      console.error("Error resending OTP:", error);
      res.redirect("/profile");
    }
});

// Cập nhật thông tin
router.post("/update", async (req, res) => {
  if (!req.user) return res.redirect("/auth/login");
  if (!req.session.isVerified) return res.redirect("/profile/edit");

  const { full_name, old_password, new_password, confirm_password } = req.body;
  const profile = await getProfileById(req.user.account_id);

  try {
    let updateData = { full_name };

    // Nếu có nhập mật khẩu
    if (new_password) {
      if (!old_password) {
        return res.render("profile/edit", {
          title: "Chỉnh sửa hồ sơ",
          profile,
          error: "Vui lòng nhập mật khẩu hiện tại"
        });
      }

      if (new_password !== confirm_password) {
        return res.render("profile/edit", {
          title: "Chỉnh sửa hồ sơ",
          profile,
          error: "Mật khẩu mới không khớp"
        });
      }

      // Kiểm tra mật khẩu cũ
      const match = await bcrypt.compare(old_password, profile.password_hash);
      if (!match) {
        return res.render("profile/edit", {
          title: "Chỉnh sửa hồ sơ",
          profile,
          error: "Mật khẩu hiện tại không đúng"
        });
      }

      // Hash mật khẩu mới
      updateData.password_hash = await bcrypt.hash(new_password, 10);
    }

    // Cập nhật thông tin
    await updateProfile(req.user.account_id, updateData);
    
    // Xóa trạng thái xác thực
  delete req.session.isVerified;
  // Xóa trạng thái xác thực mật khẩu tạm thời để bắt buộc nhập lại lần sau
  delete req.session.pwVerified;

    // Cập nhật session user nếu có thay đổi tên
    req.session.user.full_name = full_name;
    
    res.redirect("/profile");
  } catch (error) {
    console.error("Error updating profile:", error);
    res.render("profile/edit", {
      title: "Chỉnh sửa hồ sơ",
      profile,
      error: "Có lỗi xảy ra khi cập nhật thông tin"
    });
  }
});

// 🧩 Xem danh sách yêu thích
router.get("/watchlist", async (req, res) => {
  const user = req.user;
  const list = await getWatchlist(user.account_id);
  res.render("profile/watchlist", {
    title: "Khoá học yêu thích",
    courses: list,
  });
});

// 🧩 Thêm/Xóa khóa học yêu thích (API endpoints)
router.post("/watchlist/add/:id", async (req, res) => {
  if (!req.user) return res.status(401).json({ error: "Unauthorized" });
  try {
    await addToWatchlist(req.user.account_id, req.params.id);
    res.json({ success: true });
  } catch (error) {
    console.error("Error adding to watchlist:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/watchlist/remove/:id", async (req, res) => {
  if (!req.user) return res.status(401).json({ error: "Unauthorized" });
  try {
    await removeFromWatchlist(req.user.account_id, req.params.id);
    res.json({ success: true });
  } catch (error) {
    console.error("Error removing from watchlist:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// 🧩 Danh sách khóa học đã đăng ký
router.get("/enrolled", async (req, res) => {
  const user = req.user;
  if (!user) return res.redirect("/auth/login");

  try {
    // Lấy danh sách khóa học đã đăng ký
    const enrolledCourses = await getEnrolledCourses(user.account_id);
    
    // Lấy danh sách khóa học yêu thích
    const watchlistCourses = await getWatchlist(user.account_id);
    
    // Đánh dấu các khóa học có trong watchlist
    const enrolledWithWatchlist = await Promise.all(enrolledCourses.map(async course => ({
      ...course,
      is_in_watchlist: await isInWatchlist(user.account_id, course.course_id)
    })));

    res.render("profile/enrolled", {
      title: "Khoá học của tôi",
      courses: enrolledWithWatchlist,
      watchlistCourses: watchlistCourses,
      helpers: {
        formatDate: function(date) {
          return new Date(date).toLocaleDateString('vi-VN');
        },
        formatPrice: function(price) {
          return new Intl.NumberFormat('vi-VN').format(price);
        }
      }
    });
  } catch (error) {
    console.error("Error fetching courses:", error);
    res.status(500).send("Có lỗi xảy ra khi tải danh sách khóa học");
  }
});

export default router;
