import express, { query } from "express";
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import * as accountModel from "../models/accountModel.js";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";
import axios, { AxiosError } from "axios";
import {
  findByEmail,
  createFromOAuth,
  findById,
} from "../models/accountModel.js";
dotenv.config();
const router = express.Router();

router.get("/register", (req, res) => {
  res.render("auth/register", { pageTitle: "Đăng ký tài khoản" });
});

router.post("/register", async (req, res) => {
  try {
    let { full_name, email, password } = req.body;
    if (!full_name || !full_name.trim()) {
      full_name = (email && email.includes('@')) ? email.split('@')[0] : `Student_${Date.now()}`;
    }
    const existing = await accountModel.findByEmail(email);
    if (existing) {
      return res.render("auth/register", { error: "Email đã được sử dụng!" });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: "statghoul@gmail.com",
        pass: "zrzzzidzybbvotng",
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
    console.error(" Lỗi khi đăng ký:", error);
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
    console.error(" Lỗi khi xác minh OTP:", error);
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

    if (user.is_active === false) {
      return res.render("auth/login", {
        error: "Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên.",
      });
    }


    let instructor_id = null;
    if (user.role === "instructor") {
      const { pool } = await import("../configs/db.js");
      const result = await pool.query(
        "SELECT instructor_id FROM instructors WHERE account_id = $1",
        [user.account_id]
      );
      instructor_id = result.rows[0]?.instructor_id || null;
    }

    req.session.user = {
      account_id: user.account_id,
      email: user.email,
      role: user.role,
      full_name: user.full_name,
      instructor_id,
    };

    if (user.role === "instructor") {
      return res.redirect("/instructor");
    } else if (user.role === "admin") {
      return res.redirect("/admin");
    } else {
      return res.redirect("/");
    }
  } catch (error) {
    console.error("Lỗi khi đăng nhập:", error);
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
console.log("[auth] router loaded"); 

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY,
  {
    auth: {
      flowType: "pkce",
    },
  }
);

router.get("/google", async (req, res) => {
  try {
    const redirectTo = "http://localhost:3000/auth/callback";

    const code_verifier = crypto.randomBytes(64).toString("base64url");

    const hash = crypto.createHash("sha256").update(code_verifier).digest();
    const code_challenge = Buffer.from(hash).toString("base64url");

    req.session.code_verifier = code_verifier;

    const authorizeUrl = `${process.env.SUPABASE_URL}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(
      redirectTo
    )}&code_challenge=${encodeURIComponent(code_challenge)}&code_challenge_method=s256&access_type=offline`;

    req.session.save((err) => {
      if (err) {
        console.error("Failed to save session before OAuth redirect:", err);
        return res.status(500).send("OAuth initiation error");
      }
      console.log("OAuth authorize URL:", authorizeUrl);
      return res.redirect(authorizeUrl);
    });
  } catch (err) {
    console.error("Error initiating OAuth:", err);
    return res.status(500).send("OAuth initiation error");
  }
});

router.get("/callback", async (req, res) => {
  console.log("/auth/callback req.query:", req.query);

  const { code } = req.query;
  if (!code) return res.redirect("/auth/login");

  let authCode;
  if (Array.isArray(code)) authCode = code[0];
  else if (code && typeof code === "object") {
    authCode = code.auth_code || code.code || code[""] || null;
    if (!authCode) {
      console.warn("Warning: received non-string 'code' in query:", code);
      authCode = String(code);
    }
  } else authCode = String(code);

  console.log("Resolved authCode (first 64 chars):", authCode ? authCode.substring(0, 64) : authCode);

  let sUser = null;
  try {
    console.log("Using code_verifier from session:", !!req.session.code_verifier);
    console.log("Code verifier value:", req.session.code_verifier ? req.session.code_verifier.substring(0, 20) + '...' : 'null');

    if (req.session.code_verifier) {
      const tokenUrl = `${process.env.SUPABASE_URL}/auth/v1/token?grant_type=pkce`;
      const tokenBody = {
        auth_code: authCode,
        code_verifier: req.session.code_verifier
      };

      console.log("Token exchange request body:", JSON.stringify(tokenBody));

      const tokenResp = await axios.post(tokenUrl, tokenBody, {
        headers: {
          'Content-Type': 'application/json',
          'apikey': process.env.SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`
        }
      });

      sUser = tokenResp.data?.user;
      console.log("OAuth token exchange successful, user:", sUser?.email);

      delete req.session.code_verifier;
    } else {
      console.error("No code_verifier in session - cannot complete PKCE flow");
      return res.status(500).send("OAuth callback error: missing code_verifier");
    }
  } catch (exchangeErr) {
    console.error("OAuth token exchange exception:", {
      message: exchangeErr?.message,
      response: exchangeErr?.response?.data,
      stack: exchangeErr?.stack,
    });
    return res.status(500).send("OAuth callback error: " + (exchangeErr?.response?.data?.msg || exchangeErr.message));
  } if (!sUser) return res.redirect("/auth/login");
  if (!sUser) return res.redirect("/auth/login");

  const email = sUser.email;
  const name = sUser.user_metadata?.full_name || sUser.user_metadata?.name || email;

  console.log("OAuth user:", email, name);

  let account = await findByEmail(email);

  if (!account) {
    account = await createFromOAuth({
      email,
      full_name: name,
      role: "student",
      provider: "google",
    });
  }

  const found = await findById(account.account_id);

  req.session.user = {
    account_id: found.account_id,
    email: found.email,
    full_name: found.full_name,
    role: found.role,
  };

  console.log("User logged in:", req.session.user);

  res.redirect("/");
});
export default router;
