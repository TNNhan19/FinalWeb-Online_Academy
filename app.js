import dotenv from "dotenv";
dotenv.config();

import express from "express";
import { engine } from "express-handlebars";
import path from "path";
import { fileURLToPath } from "url";
import hbs_sections from "express-handlebars-sections";
import Handlebars from "handlebars";
import session from "express-session";
import { format } from "date-fns";

import homeRoute from "./routes/home.route.js";
import authRoute from "./routes/auth.route.js";
import instructorRoutes from "./routes/instructor.route.js";
import adminRoutes from "./routes/admin.route.js";
import coursesRoutes from "./routes/courses.route.js";
import profileRoutes from "./routes/profile.route.js";
import categoryRoute from "./routes/category.route.js";
import enrollmentRoutes from "./routes/enrollment.route.js";
import Learn from "./routes/learn.route.js";
import categoryRoutes from "./routes/category.route.js";
import searchApi from "./routes/search.api.js";
import cookieParser from "cookie-parser";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

const hbsEngine = engine({
  extname: ".hbs",
  helpers: {
    section: hbs_sections(),
    eq: (a, b) => String(a) === String(b),
    includes: (str, substring) =>
      typeof str === "string" && str.includes(substring),
    year: () => new Date().getFullYear(),
    ifEquals: function (a, b, options) {
      return a === b ? options.fn(this) : options.inverse(this);
    },
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
    makeArray: (n) => Array.from(Array(Math.floor(n || 0)).keys()),
    math: (lvalue, operator, rvalue) => {
      lvalue = parseFloat(lvalue);
      rvalue = parseFloat(rvalue);
      return {
        "+": lvalue + rvalue,
        "-": lvalue - rvalue,
        "*": lvalue * rvalue,
        "/": lvalue / rvalue,
        "%": lvalue % rvalue,
      }[operator];
    },
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
    isYouTube: (url) => {
      if (!url || typeof url !== "string") return false;
      return /(?:youtu\.be\/|youtube\.com\/watch\?v=|youtube\.com\/embed\/)/i.test(
        url
      );
    },
    youtubeEmbed: (url) => {
      if (!url || typeof url !== "string") return "";
      try {
        const match = url.match(
          /(?:youtu\.be\/([\w-]{11})|v=([\w-]{11})|embed\/([\w-]{11}))/i
        );
        const id = match && (match[1] || match[2] || match[3]);
        if (!id) return "";
        return `https://www.youtube.com/embed/${id}`;
      } catch (e) {
        return "";
      }
    },
    formatDate: (date) => {
      if (!date) return "N/A";
      try {
        return format(new Date(date), "dd/MM/yyyy");
      } catch (e) {
        console.error("Date format error:", e);
        return date.toString();
      }
    },
    formatDuration: (durationInSeconds) => {
      if (durationInSeconds === null || durationInSeconds === undefined)
        return "";
      const totalSeconds = Number(durationInSeconds);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      return `${minutes.toString().padStart(2, "0")}:${seconds
        .toString()
        .padStart(2, "0")}`;
    },
    firstLetter: (str) => (str ? str.charAt(0).toUpperCase() : "?"),
    slice: (arr, start, end) =>
      Array.isArray(arr) ? arr.slice(start, end) : [],
  },
  layoutsDir: path.join(__dirname, "views", "layouts"),
  partialsDir: path.join(__dirname, "views", "partials"),
  defaultLayout: "main",
});

try {
  if (Handlebars && typeof Handlebars.registerHelper === "function") {
    Handlebars.registerHelper("section", hbs_sections());
    Handlebars.registerHelper("formatDate", (date) => {
      if (!date) return "N/A";
      try {
        return format(new Date(date), "dd/MM/yyyy");
      } catch (e) {
        return date ? date.toString() : "N/A";
      }
    });
    Handlebars.registerHelper("formatDuration", (durationInSeconds) => {
      if (durationInSeconds === null || durationInSeconds === undefined)
        return "";
      const totalSeconds = Number(durationInSeconds);
      if (Number.isNaN(totalSeconds)) return "";
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      return `${minutes.toString().padStart(2, "0")}:${seconds
        .toString()
        .padStart(2, "0")}`;
    });
    console.log(
      "Registered fallback helpers on global Handlebars: section, formatDate"
    );
  }
} catch (e) {
  console.warn(
    "Could not register fallback helpers on Handlebars:",
    e && e.message
  );
}

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

app.engine("hbs", hbsEngine);
if (process.env.NODE_ENV !== "production") app.set("view cache", false);

app.set("view engine", "hbs");
app.set("views", path.join(__dirname, "views"));

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

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "Public")));
app.use(cookieParser());
app.use(
  session({
    secret: process.env.SESSION_SECRET || "supersecretkey",
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 24 * 60 * 60 * 1000 },
  })
);

app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  res.locals.isAuthenticated = !!req.session.user;
  next();
});

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

app.get("/home", (req, res) => res.redirect("/"));
app.use("/category", categoryRoute);
app.use("/categories", categoryRoutes);
app.use("/search", searchApi);
app.use("/api/search", searchApi);
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
