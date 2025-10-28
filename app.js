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

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.engine(
  "hbs",
  engine({
    extname: ".hbs",
    helpers: {
      section: hbs_sections(),
      eq: (a, b) => String(a) === String(b),
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
        return { "+": lvalue + rvalue, "-": lvalue - rvalue, "*": lvalue * rvalue, "/": lvalue / rvalue, "%": lvalue % rvalue }[operator];
      },
      stars: (rating) => {
        const r = Math.round(parseFloat(rating || 0) * 2) / 2;
        const fullStars = Math.floor(r);
        const halfStar = r % 1 !== 0;
        const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);
        let classes = [];
        for(let i=0; i<fullStars; i++) classes.push('bi-star-fill');
        if(halfStar) classes.push('bi-star-half');
        for(let i=0; i<emptyStars; i++) classes.push('bi-star');
        return classes; // Return array of classes
      },
      formatDate: (date) => {
         if (!date) return 'N/A';
         try { return format(new Date(date), 'dd/MM/yyyy'); }
         catch(e) { console.error("Date format error:", e); return date.toString(); }
      },
      formatDuration: (durationInSeconds) => { // Assuming DB stores seconds now
        if (durationInSeconds === null || durationInSeconds === undefined) return '';
        const totalSeconds = Number(durationInSeconds);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      },
      firstLetter: (str) => str ? str.charAt(0).toUpperCase() : '?',
      eq: function (a, b) {
        return a === b;
      },
    },
    layoutsDir: path.join(__dirname, "views", "layouts"),
    partialsDir: path.join(__dirname, "views", "partials"),
    defaultLayout: "main"
  })
);

app.set("view engine", "hbs");
app.set("views", path.join(__dirname, "views"));

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

// Authentication middleware
app.use((req, res, next) => {
  const user = req.session.user || null;
  // Gán user vào cả req.user và res.locals.user
  req.user = user;
  res.locals.user = user;
  res.locals.isAuthenticated = !!user;
  next();
});
// Đăng ký các routes
app.use("/", homeRoute);
app.use("/auth", authRoute);
app.use("/courses", coursesRoutes);
app.use("/instructor", instructorRoutes);
app.use("/admin", adminRoutes);
app.use("/profile", profileRoutes);
app.use("/category", categoryRoute);
app.use("/enrollment", enrollmentRoutes);

// Redirect /home to /
app.get("/home", (req, res) => res.redirect("/"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});