import express from "express";
const router = express.Router();

router.get("/", (req, res) => {
  res.render("home/index", {
    pageTitle: "Trang chủ",
    user: req.session.user,
    filters: [
      { id: "dev", label: "Phát triển web" },
      { id: "design", label: "Thiết kế" },
      { id: "python", label: "Python" },
      { id: "music", label: "Âm nhạc" },
      { id: "ai", label: "Trí tuệ nhân tạo" },
      { id: "marketing", label: "Marketing" },
      { id: "finance", label: "Tài chính" }
    ],
    topViewed: miniList(),
    newest: miniList(),
    sections: [
      { title: "THẮC KHẢO PYTHON", courses: bigCards() },
      { title: "THẮC KHÓA HỌC", courses: bigCards() }
    ],
    pagination: {
      prev: 1,
      next: 3,
      dots: [{ active: true }, {}, {}, {}]
    }
  });
});

function miniList() {
  return Array.from({ length: 10 }).map((_, i) => ({
    thumb: "sample",
    title: `Khoá #${i + 1}`,
    rating: (4 + Math.random()).toFixed(1)
  }));
}

function bigCards() {
  return Array.from({ length: 6 }).map((_, i) => ({
    id: `c_${i + 1}`,
    title: i % 2 ? "Thiết kế UX/UI nâng cao" : "Tiếp thu chuyên sâu Python",
    subtitle: "Lessons • Lộ trình học • Tài nguyên kèm theo",
    hero_image_url: "sample",
    rating: (4 + Math.random()).toFixed(1),
    students: 300 + i * 20,
    lessons: 36 + i,
    duration: "30:00",
    price: "$19.99",
    promo_price: i % 3 === 0 ? "$12.99" : null
  }));
}

export default router;
