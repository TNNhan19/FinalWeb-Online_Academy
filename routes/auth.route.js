import express from "express";
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import * as accountModel from "../models/accountModel.js";

dotenv.config();
const router = express.Router();

// ✅ ROUTE GET /auth/register → hiển thị form
router.get("/register", (req, res) => {
  res.render("auth/register", { pageTitle: "Đăng ký tài khoản" });
});

// ✅ ROUTE POST /auth/register → xử lý form
router.post("/register", async (req, res) => {
  try {
    const { full_name, email, password } = req.body;

    // Kiểm tra email trùng
    const existing = await accountModel.findByEmail(email);
    if (existing) {
      return res.render("auth/register", { error: "Email đã được sử dụng!" });
    }

    // Hash mật khẩu
    const password_hash = await bcrypt.hash(password, 10);

    // Sinh mã OTP ngẫu nhiên
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Gửi OTP qua Gmail
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
    });

    await transporter.sendMail({
      to: email,
      subject: "Mã xác nhận tài khoản - Online Academy",
      text: `Xin chào ${full_name},\n\nMã OTP của bạn là: ${otp}\nMã có hiệu lực trong 5 phút.`,
    });

    // Lưu user vào DB
    await accountModel.createAccount(full_name, email, password_hash, otp);

    // Chuyển sang trang nhập OTP
    res.render("auth/verify", { email });
  } catch (error) {
    console.error("❌ Lỗi khi đăng ký:", error);
    res.render("auth/register", {
      error: "Đăng ký thất bại. Vui lòng thử lại sau!",
    });
  }
});

export default router;
