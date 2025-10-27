import express from "express";
import { findById } from "../models/courseModel.js";

const router = express.Router();

// 🟢 Lấy chi tiết khóa học
router.get("/detail/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const course = await findById(id);
    if (!course) {
      return res.status(404).json({ error: "Không tìm thấy khóa học" });
    }
    res.json(course);
  } catch (error) {
    console.error("❌ Lỗi khi lấy chi tiết khóa học:", error.message);
    res.status(500).json({ error: "Lỗi khi tải chi tiết khóa học." });
  }
});

export default router;
