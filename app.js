import dotenv from "dotenv";
dotenv.config();


import express from "express";
import { engine } from "express-handlebars";
import path from "path";
import { fileURLToPath } from "url";
import hbs_sections from "express-handlebars-sections";
import session from "express-session";

import homeRoute from "./routes/home.route.js";
import authRoute from "./routes/auth.route.js";
import instructorRoutes from "./routes/instructor.route.js";
import adminRoutes from "./routes/admin.route.js";

import profileRoutes from "./routes/profile.route.js";
import courseRoutes from "./routes/courses.route.js";



const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.engine(
  "hbs",
  engine({
    extname: ".hbs",
    helpers: {
      section: hbs_sections(),
      year: () => new Date().getFullYear(),
      ifEquals: function (a, b, options) {
        return a === b ? options.fn(this) : options.inverse(this);
      },
    },
    layoutsDir: path.join(__dirname, "views", "layouts"),
    partialsDir: path.join(__dirname, "views", "partials"),
    defaultLayout: "main",
  })
);

app.set("view engine", "hbs");
app.set("views", path.join(__dirname, "views"));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "Public")));

// 🧩 GIẢ LẬP USER ĐÃ ĐĂNG NHẬP (BỎ QUA LOGIN)
app.use((req, res, next) => {
  // Giả lập một học viên (student)
  req.user = {
    account_id: 15, // đúng account_id trong bảng accounts (của Duy)
    full_name: "Duy",
    role: "student"
  };
  next();
});


// Mock giảng viên để test (xóa khi có auth)
app.use((req, res, next) => {
  req.user = {
    account_id: 1,      // ID thật của giảng viên trong bảng instructors
    role: "instructor", // đúng vai trò
    name: "John Doe"
  };
  next();
});

app.use(
  session({
    secret: process.env.SESSION_SECRET || "supersecretkey",
    resave: false,
    saveUninitialized: false,
  })
);

app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  next();
});
app.use("/admin", adminRoutes);
app.use("/", homeRoute);
app.use("/auth", authRoute);
app.use("/instructor", instructorRoutes);

app.get("/home", (req, res) => res.redirect("/"));


app.use("/profile", profileRoutes);
app.use("/courses", courseRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
