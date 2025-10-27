import express from "express";
import { engine } from "express-handlebars";
import path from "path";
import { fileURLToPath } from "url";
import hbs_sections from "express-handlebars-sections";
import session from "express-session";
import dotenv from "dotenv";

import homeRoute from "./routes/home.route.js";
import authRoute from "./routes/auth.route.js";
import coursesRoutes from "./routes/courses.route.js";

dotenv.config();

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

app.use("/", homeRoute);
app.use("/auth", authRoute);
app.use(express.static(path.join(__dirname, "Public")));
app.use("/courses", coursesRoutes);

app.get("/home", (req, res) => res.redirect("/"));

import categoryRoute from "./routes/category.route.js";
app.use("/category", categoryRoute);

app.use(express.static("Public"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
