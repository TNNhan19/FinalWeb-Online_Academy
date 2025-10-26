import express from "express";
import { engine } from "express-handlebars";
import path from "path";
import { fileURLToPath } from "url";
import hbs_sections from "express-handlebars-sections";

import homeRoute from "./routes/home.route.js";
import authRoutes from "./routes/auth.route.js";  // chỉ 1 lần
import instructorRoutes from "./routes/instructor.route.js";
import adminRoutes from "./routes/admin.route.js";




const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.engine("hbs", engine({
  extname: ".hbs",
  helpers: {
    section: hbs_sections(),
    year: () => new Date().getFullYear()
  }
}));
app.set("view engine", "hbs");
app.set("views", path.join(__dirname, "views"));

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "Public"))); // chữ P hoa

// Mock giảng viên để test (xóa khi có auth)
app.use((req, res, next) => {
  req.user = {
    account_id: 1,      // ID thật của giảng viên trong bảng instructors
    role: "instructor", // đúng vai trò
    name: "John Doe"
  };
  next();
});



app.use("/admin", adminRoutes);
// Routes
app.use("/", homeRoute);
app.use("/auth", authRoutes);
app.use("/instructor", instructorRoutes);


// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server running at http://localhost:${PORT}`));
