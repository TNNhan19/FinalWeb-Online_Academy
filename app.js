import express from "express";
import { engine } from "express-handlebars";
import path from "path";
import { fileURLToPath } from "url";
import hbs_sections from "express-handlebars-sections";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

// Cấu hình Handlebars
app.engine("hbs", engine({
  extname: "hbs",
  helpers: {
    section: hbs_sections(),
    year: () => new Date().getFullYear()
  }
}));
app.set("view engine", "hbs");
app.set("views", path.join(__dirname, "views"));

// Static files (CSS, JS, Images)
app.use(express.static(path.join(__dirname, "public")));

// Route chính
import homeRoute from "./routes/home.route.js";
app.use("/", homeRoute);

// Chạy server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server running at http://localhost:${PORT}`));
