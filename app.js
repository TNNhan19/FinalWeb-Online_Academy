import dotenv from "dotenv";
dotenv.config();


import express from "express";
import { engine } from "express-handlebars";
import path from "path";
import { fileURLToPath } from "url";
import hbs_sections from "express-handlebars-sections";
import session from "express-session";
import { format } from 'date-fns';

import homeRoute from "./routes/home.route.js";
import authRoute from "./routes/auth.route.js";
import instructorRoutes from "./routes/instructor.route.js";
import adminRoutes from "./routes/admin.route.js";
import coursesRoutes from './routes/courses.route.js';
import profileRoutes from "./routes/profile.route.js";
import categoryRoute from "./routes/category.route.js";
import enrollmentRoutes from "./routes/enrollment.route.js";
import Learn from "./routes/learn.route.js";
import categoryRoutes from "./routes/category.route.js";
import searchApi from "./routes/search.api.js";

import cookieParser from "cookie-parser";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.engine(
  "hbs",
  engine({
    extname: ".hbs",
    layoutsDir: path.join(__dirname, "views", "layouts"),
    partialsDir: path.join(__dirname, "views", "partials"),
    defaultLayout: "main",
    helpers: {
      // --- Section handling (used for block layouts)
      section: hbs_sections(),

      // --- Basic comparisons and logic ---
      eq: (a, b) => String(a) === String(b),
      ifEquals: (a, b, options) => (a === b ? options.fn(this) : options.inverse(this)),

      // --- Year and basic formatting ---
      year: () => new Date().getFullYear(),
      formatDate: (date) => {
        if (!date) return "N/A";
        try {
          return format(new Date(date), "dd/MM/yyyy");
        } catch (e) {
          console.error("Date format error:", e);
          return date.toString();
        }
      },

      // --- Math and array helpers ---
      makeArray: (n) => Array.from(Array(Math.floor(n || 0)).keys()),
      math: (l, op, r) => {
        l = parseFloat(l);
        r = parseFloat(r);
        return { "+": l + r, "-": l - r, "*": l * r, "/": l / r, "%": l % r }[op];
      },

      // --- Course rating stars ---
      stars: (rating) => {
        const r = Math.round(parseFloat(rating || 0) * 2) / 2;
        const fullStars = Math.floor(r);
        const halfStar = r % 1 !== 0;
        const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);
        let classes = [];
        for (let i = 0; i < fullStars; i++) classes.push("bi-star-fill");
        if (halfStar) classes.push("bi-star-half");
        for (let i = 0; i < emptyStars; i++) classes.push("bi-star");
        return classes;
      },

      // --- Discount helpers ---
      isDiscount: (current, original) => {
        const curr = parseFloat(current);
        const orig = parseFloat(original);
        return !isNaN(curr) && !isNaN(orig) && curr < orig;
      },
      discountPercent: (current, original) => {
        const curr = parseFloat(current);
        const orig = parseFloat(original);
        if (isNaN(curr) || isNaN(orig) || orig <= 0 || curr >= orig) return 0;
        return Math.round(((orig - curr) / orig) * 100);
      },

      // --- Miscellaneous helpers ---
      formatDuration: (seconds) => {
        if (seconds == null) return "";
        const total = Number(seconds);
        const mins = Math.floor(total / 60);
        const secs = total % 60;
        return `${mins.toString().padStart(2, "0")}:${secs
          .toString()
          .padStart(2, "0")}`;
      },
      firstLetter: (str) => (str ? str.charAt(0).toUpperCase() : "?"),
      slice: (arr, start, end) =>
        Array.isArray(arr) ? arr.slice(start, end) : [],

      // --- YouTube helpers ---
      isYouTube: (url) =>
        typeof url === "string" &&
        /(?:youtu\.be\/|youtube\.com\/watch\?v=|youtube\.com\/embed\/)/i.test(
          url
        ),
      youtubeEmbed: (url) => {
        if (!url || typeof url !== "string") return "";
        const match = url.match(
          /(?:youtu\.be\/([\w-]{11})|v=([\w-]{11})|embed\/([\w-]{11}))/i
        );
        const id = match && (match[1] || match[2] || match[3]);
        return id ? `https://www.youtube.com/embed/${id}` : "";
      },
    },
  })
);

// Set view engine + views directory
app.set("view engine", "hbs");
app.set("views", path.join(__dirname, "views"));

// Disable view cache in dev
if (process.env.NODE_ENV !== "production") {
  app.set("view cache", false);
}

// Log registered helpers for debugging (dev only)
try {
  const helpersObj =
    hbsEngine && hbsEngine.handlebars && hbsEngine.handlebars.helpers;
  if (helpersObj && typeof helpersObj === "object") {
    console.log("Handlebars helpers:", Object.keys(helpersObj).join(", "));
  } else {
    console.log("Handlebars helpers not available on engine object yet.");
  }
} catch (e) {
  console.warn("Could not list handlebars helpers:", e && e.message);
}

// app.engine("hbs", hbsEngine);
// // Disable view cache in development to avoid stale compiled templates
// if (process.env.NODE_ENV !== "production") app.set("view cache", false);

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "Public")));


app.use(
  session({
    secret: process.env.SESSION_SECRET || "supersecretkey",
    resave: false,
    saveUninitialized: false, // Don't save empty sessions
    cookie: { maxAge: 24 * 60 * 60 * 1000 } // Session duration
  })
);

// Đọc session user và lưu vào res.locals để template có thể truy cập
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  res.locals.isAuthenticated = !!req.session.user;
  next();
});

app.use(cookieParser());

// Đăng ký các routes
app.use("/", homeRoute);
app.use("/auth", authRoute);
app.use("/courses", coursesRoutes);
app.use("/instructor", instructorRoutes);
app.use("/admin", adminRoutes);
app.use("/profile", profileRoutes);
app.use("/category", categoryRoute);
app.use("/enrollment", enrollmentRoutes);
app.use("/profile", profileRoutes);
app.use("/learn", Learn);

// Redirect /home to /
app.get("/home", (req, res) => res.redirect("/"));
app.use("/category", categoryRoute);
app.use("/courses", courseRoutes);
app.use("/categories", categoryRoutes);
app.use("/api/search", searchApi);
app.use(express.static("Public"));

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});