import express, { query } from "express";
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import * as accountModel from "../models/accountModel.js";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";
import axios, { AxiosError } from "axios";
import { pool } from "../configs/db.js";
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
    console.error("❌ Lỗi khi đăng ký:", error);
    res.render("auth/register", {
      error: "Đăng ký thất bại. Vui lòng thử lại sau!",
    });
  }
});


// ==========================
// 🟦 GỬI OTP QUA GMAIL
// ==========================
router.post("/forgot-password", express.json(), async (req, res) => {
  const { email } = req.body;

  try {
    const accRes = await pool.query("SELECT * FROM accounts WHERE email = $1", [email]);
    if (accRes.rowCount === 0) return res.status(404).json({ error: "Email không tồn tại." });

    const otp = crypto.randomBytes(3).toString("hex").toUpperCase();
    await pool.query("UPDATE accounts SET otp = $1 WHERE email = $2", [otp, email]);

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: "statghoul@gmail.com",
        pass: "zrzzzidzybbvotng", // App Password
      },
    });

    await transporter.sendMail({
      from: '"Online Academy" <no-reply@academy.com>',
      to: email,
      subject: "Online Academy - Password Reset Code",
      html: `
        <h2 style="color:#2563eb;">Online Academy</h2>
        <p>Here is your OTP code to reset your password:</p>
        <h3 style="letter-spacing:3px;font-size:20px;">${otp}</h3>
        <p>This code will expire in 10 minutes.</p>
      `,
    });

    res.status(200).json({ message: "OTP sent successfully" });
  } catch (err) {
    console.error("❌ Lỗi gửi OTP:", err);
    res.status(500).json({ error: "Lỗi server khi gửi OTP" });
  }
});

// ==========================
// 🟩 XÁC THỰC MÃ OTP
// ==========================
router.post("/verify-otp", express.json(), async (req, res) => {
  const { email, otp } = req.body;

  try {
    const accRes = await pool.query(
      "SELECT * FROM accounts WHERE email = $1 AND otp = $2",
      [email, otp]
    );

    if (accRes.rowCount === 0)
      return res.status(400).json({ error: "Mã OTP không hợp lệ hoặc đã hết hạn." });

    // Nếu đúng → xác thực OK
    res.status(200).json({ message: "OTP verified" });
  } catch (err) {
    console.error("❌ Lỗi xác thực OTP:", err);
    res.status(500).json({ error: "Lỗi server khi xác thực OTP" });
  }
});

// ==========================
// 🟥 ĐẶT LẠI MẬT KHẨU MỚI
// ==========================
router.post("/reset-password", express.json(), async (req, res) => {
  const { email, otp, password, confirm } = req.body;

  if (password !== confirm)
    return res.status(400).json({ error: "Mật khẩu nhập lại không khớp." });

  try {
    const accRes = await pool.query(
      "SELECT * FROM accounts WHERE email = $1 AND otp = $2",
      [email, otp]
    );
    if (accRes.rowCount === 0)
      return res.status(400).json({ error: "OTP không hợp lệ hoặc đã hết hạn." });

    const hash = await bcrypt.hash(password, 10);
    await pool.query("UPDATE accounts SET password_hash = $1, otp = NULL WHERE email = $2", [
      hash,
      email,
    ]);

    res.status(200).json({ message: "Password reset successful" });
  } catch (err) {
    console.error("❌ Lỗi đặt lại mật khẩu:", err);
    res.status(500).json({ error: "Lỗi server khi đặt lại mật khẩu." });
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
console.log("[auth] router loaded"); // <-- log để biết file này đã được nạp

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY,
  {
    auth: {
      flowType: "pkce",
    },
  }
);

// 🟢 Route login bằng Google (server-side PKCE) — we generate PKCE pair, store verifier in session,
// then redirect user to Supabase authorize URL carrying the code_challenge.
router.get("/google", async (req, res) => {
  try {
    const redirectTo = "http://localhost:3000/auth/callback";

    // Generate a code_verifier (random URL-safe string)
    const code_verifier = crypto.randomBytes(64).toString("base64url");

    // Compute code_challenge = BASE64URL(SHA256(code_verifier))
    const hash = crypto.createHash("sha256").update(code_verifier).digest();
    const code_challenge = Buffer.from(hash).toString("base64url");

    // Store code_verifier in session so we can use it on callback
    req.session.code_verifier = code_verifier;

    // Construct the authorize URL manually
    const authorizeUrl = `${process.env.SUPABASE_URL}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(
      redirectTo
    )}&code_challenge=${encodeURIComponent(code_challenge)}&code_challenge_method=s256&access_type=offline`;

    // Save session before redirect to ensure the cookie/session is persisted
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
  // Log the incoming query for debugging (helps diagnose malformed 'code')
  console.log("/auth/callback req.query:", req.query);

  const { code } = req.query;
  if (!code) return res.redirect("/auth/login");

  // Ensure `code` is a string (sometimes parsers can turn it into an object/array)
  let authCode;
  if (Array.isArray(code)) authCode = code[0];
  else if (code && typeof code === "object") {
    // If it's an object, try common nested shapes
    authCode = code.auth_code || code.code || code[""] || null;
    if (!authCode) {
      // Fallback: log and attempt JSON->string coercion (will likely fail server-side, but gives more info)
      console.warn("Warning: received non-string 'code' in query:", code);
      authCode = String(code);
    }
  } else authCode = String(code);

  console.log("Resolved authCode (first 64 chars):", authCode ? authCode.substring(0, 64) : authCode);

  // Use Supabase client library to exchange the authorization code for a session
  let sUser = null;
  try {
    console.log("Using code_verifier from session:", !!req.session.code_verifier);
    console.log("Code verifier value:", req.session.code_verifier ? req.session.code_verifier.substring(0, 20) + '...' : 'null');

    // Manual token exchange using fetch/axios to avoid client library parameter issues
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

      // Clear code_verifier from session
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

  // 🔹 1. Tìm user theo email
  let account = await findByEmail(email);

  // 🔹 2. Nếu chưa có thì tạo mới
  if (!account) {
    account = await createFromOAuth({
      email,
      full_name: name,
      role: "student",
      provider: "google",
    });
  }

  // 🔹 3. Lấy lại user để chắc chắn có account_id
  const found = await findById(account.account_id);

  // 🔹 4. Lưu vào session
  req.session.user = {
    account_id: found.account_id,
    email: found.email,
    full_name: found.full_name,
    role: found.role,
  };

  console.log("✅ User logged in:", req.session.user);

  res.redirect("/");
});
export default router;
