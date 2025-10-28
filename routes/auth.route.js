import express from "express";
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import * as accountModel from "../models/accountModel.js";

dotenv.config();
const router = express.Router();

router.get("/register", (req, res) => {
  res.render("auth/register", { pageTitle: "Đăng ký tài khoản" });
});

router.post("/register", async (req, res) => {
  try {
    const { full_name, email, password } = req.body;
    const existing = await accountModel.findByEmail(email);
    if (existing) {
      return res.render("auth/register", { error: "Email đã được sử dụng!" });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: 'statghoul@gmail.com',
        pass: 'zrzzzidzybbvotng',
      },
    });

    await transporter.sendMail({
      from: process.env.MAIL_USER,
      to: email,
      subject: "Mã xác nhận tài khoản - Online Academy",
      text: `Xin chào ${full_name},\n\nMã OTP của bạn là: ${otp}\nMã có hiệu lực trong 5 phút.\n\nTrân trọng,\nĐội ngũ Online Academy.`,
    });

    await accountModel.createAccount(full_name, email, password_hash, otp);
    res.render("auth/verify", { email });
  } catch (error) {
    console.error("❌ Lỗi khi đăng ký:", error);
    res.render("auth/register", {
      error: "Đăng ký thất bại. Vui lòng thử lại sau!",
    });
  }
});

router.post("/verify", async (req, res) => {
  try {
    const { email, otp } = req.body;
    const verified = await accountModel.verifyOTP(email, otp);

    if (!verified) {
      return res.render("auth/verify", {
        email,
        error: "Mã OTP không hợp lệ hoặc đã hết hạn.",
      });
    }

    res.render("auth/login", {
      success: "Xác nhận thành công! Bạn có thể đăng nhập ngay.",
    });
  } catch (error) {
    console.error("❌ Lỗi khi xác minh OTP:", error);
    res.render("auth/verify", {
      email: req.body.email,
      error: "Có lỗi xảy ra khi xác minh OTP.",
    });
  }
});

router.get("/login", (req, res) => {
  res.render("auth/login", { pageTitle: "Đăng nhập" });
});
router.get("/signup", (req, res) => {
  res.render("auth/signup", { pageTitle: "Sign Up | Online Academy" });
});
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await accountModel.findByEmail(email);

    if (!user) {
      return res.render("auth/login", { error: "Email không tồn tại!" });
    }

    if (!user.is_verified) {
      return res.render("auth/login", {
        error: "Tài khoản chưa được xác minh. Vui lòng kiểm tra email!",
      });
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.render("auth/login", { error: "Mật khẩu không chính xác!" });
    }

    // ✅ Thêm instructor_id nếu là giảng viên
    let instructor_id = null;
    if (user.role === "instructor") {
      const { pool } = await import("../configs/db.js");
      const result = await pool.query(
        "SELECT instructor_id FROM instructors WHERE account_id = $1",
        [user.account_id]
      );
      instructor_id = result.rows[0]?.instructor_id || null;
    }

    // ✅ Lưu session đầy đủ
    req.session.user = {
      account_id: user.account_id,
      email: user.email,
      role: user.role,
      full_name: user.full_name,
      instructor_id
    };


    // ✅ Điều hướng theo role
    if (user.role === "instructor") {
      return res.redirect("/instructor");
    } else if (user.role === "admin") {
      return res.redirect("/admin");
    } else {
      return res.redirect("/");
    }
  } catch (error) {
    console.error("❌ Lỗi khi đăng nhập:", error);
    res.render("auth/login", {
      error: "Đăng nhập thất bại. Vui lòng thử lại!",
    });
  }
});

router.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/auth/login");
  });
});

export default router;