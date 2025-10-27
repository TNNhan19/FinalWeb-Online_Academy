document.addEventListener("DOMContentLoaded", () => {
  console.log("✅ Script main.js đã sẵn sàng.");

  // ===================== 1️⃣ XỬ LÝ CLICK DANH MỤC (CATEGORY) =====================
  const categoryCards = document.querySelectorAll(".category-card");
  const categoryList = document.getElementById("categoryList");

  if (categoryCards.length && categoryList) {
    categoryCards.forEach(card => {
      card.addEventListener("click", async () => {
        const category = card.dataset.category;
        try {
          const res = await fetch(`/category/api/${encodeURIComponent(category)}`);
          if (!res.ok) throw new Error("Lỗi khi gọi API danh mục");

          const courses = await res.json();
          console.log("📦 Dữ liệu nhận được:", courses);

          // Xóa các khối cũ
          document.querySelectorAll(".course-block").forEach(block => block.remove());

          if (!courses || !courses.length) {
            const msg = document.createElement("div");
            msg.className = "alert alert-info mt-3 text-center course-block";
            msg.textContent = `Không có khóa học nào trong danh mục "${category}".`;
            categoryList.insertAdjacentElement("afterend", msg);
            return;
          }

          const wrapper = document.createElement("div");
          wrapper.className = "mt-5 course-block";
          wrapper.innerHTML = `
            <h4 class="fw-bold text-primary mb-4 text-center">${category}</h4>
            <div class="row g-4">
              ${courses
                .map(
                  c => `
                <div class="col-12 col-sm-6 col-lg-3">
                  <div class="card shadow-sm border-0 rounded-4 h-100 hover-shadow course-card"
                       data-id="${c.course_id}" data-category="${c.category_name}"
                       style="cursor:pointer;">
                    <img src="${c.image_url}" alt="${c.title}" class="card-img-top"
                         style="height:180px;object-fit:cover;border-top-left-radius:1rem;border-top-right-radius:1rem;">
                    <div class="card-body d-flex flex-column justify-content-between">
                      <div>
                        <span class="badge bg-light text-primary mb-2">${c.category_name}</span>
                        <h6 class="fw-semibold mb-1 text-dark">${c.title}</h6>
                        <p class="text-muted small mb-3" style="min-height:40px;overflow:hidden;">
                          ${c.description || ""}
                        </p>
                      </div>
                      <div class="d-flex align-items-center justify-content-between">
                        <div>
                          <i class="bi bi-star-fill text-warning"></i>
                          <span class="fw-semibold small">4.8</span>
                          <span class="text-muted small ms-1">12.5k học viên</span>
                        </div>
                        <span class="fw-bold text-primary">$${c.current_price || "0.00"}</span>
                      </div>
                    </div>
                  </div>
                </div>`
                )
                .join("")}
            </div>`;
          categoryList.insertAdjacentElement("afterend", wrapper);
        } catch (err) {
          console.error("❌ Lỗi khi tải danh mục:", err);
          alert("Không thể tải danh sách khóa học. Vui lòng thử lại!");
        }
      });
    });
  }

  // ===================== 2️⃣ NÚT LỌC KHÓA HỌC (FILTER - DÙNG API) =====================
const filterButtons = document.querySelectorAll(".filter-btn");
const popularGrid = document.getElementById("popularCoursesGrid");

if (filterButtons.length && popularGrid) {
  filterButtons.forEach(btn => {
    btn.addEventListener("click", async () => {
      const selectedCategory = btn.dataset.category;

      // Đổi màu nút đang chọn
      filterButtons.forEach(b => b.classList.remove("active", "btn-outline-primary"));
      filterButtons.forEach(b => b.classList.add("btn-outline-secondary"));
      btn.classList.add("active", "btn-outline-primary");
      btn.classList.remove("btn-outline-secondary");

      // Hiển thị loading
      popularGrid.innerHTML = `
        <div class="col-12 text-center py-5">
          <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">Đang tải...</span>
          </div>
        </div>
      `;

      try {
        // 🧠 Gọi API
        const res = await fetch(`/category/api/${encodeURIComponent(selectedCategory)}`);
        if (!res.ok) throw new Error("Lỗi khi gọi API danh mục");

        const courses = await res.json();
        console.log("📦 Dữ liệu khóa học theo danh mục:", courses);

        // 🧹 Làm sạch lưới
        popularGrid.innerHTML = "";

        if (!courses.length) {
          popularGrid.innerHTML = `
            <div class="col-12 text-center text-muted py-5">
              <p>Không có khóa học nào trong danh mục này.</p>
            </div>`;
          return;
        }

        // 🔧 Sinh HTML hiển thị
        const html = courses
          .map(
            c => `
            <div class="col-12 col-sm-6 col-lg-3 d-flex course-card" 
                 data-id="${c.course_id}" data-category="${c.category_name}">
              <div class="card shadow-sm border-0 rounded-4 h-100 w-100 hover-shadow">
                <img src="${c.image_url}" alt="${c.title}" 
                     class="card-img-top course-img"
                     style="height:180px; object-fit:cover; border-top-left-radius:1rem; border-top-right-radius:1rem;">
                <div class="card-body d-flex flex-column justify-content-between">
                  <div>
                    <span class="badge bg-light text-primary mb-2">${c.category_name}</span>
                    <h6 class="fw-semibold mb-1 text-dark">${c.title}</h6>
                    <p class="text-muted small mb-3" style="min-height:40px; overflow:hidden;">
                      ${c.description || ""}
                    </p>
                  </div>
                  <div>
                    <div class="d-flex align-items-center mb-2">
                      <span class="small text-dark">${c.instructor_name || "Giảng viên ẩn danh"}</span>
                    </div>
                    <div class="d-flex align-items-center justify-content-between">
                      <div>
                        <i class="bi bi-star-fill text-warning"></i>
                        <span class="fw-semibold small">4.8</span>
                        <span class="text-muted small ms-1">12.5k học viên</span>
                      </div>
                      <span class="fw-bold text-primary">$${c.current_price || "0.00"}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>`
          )
          .join("");

        popularGrid.innerHTML = html;
      } catch (error) {
        console.error("❌ Lỗi khi tải khóa học:", error);
        popularGrid.innerHTML = `
          <div class="col-12 text-center text-danger py-5">
            <p>Không thể tải danh sách khóa học. Vui lòng thử lại!</p>
          </div>`;
      }
    });
  });
}


  // ===================== 3️⃣ HIỂN THỊ CHI TIẾT KHÓA HỌC (CẢ HOME & CATEGORY) =====================
  document.addEventListener("click", async (e) => {
    const card = e.target.closest(".course-card");
    if (!card) return;

    const courseId = card.dataset.id;
    if (!courseId) return;

    try {
      const res = await fetch(`/courses/detail/${courseId}`);
      if (!res.ok) throw new Error("Không thể tải chi tiết khóa học");
      const course = await res.json();

      const modalEl = document.getElementById("courseModal");
      const modalBody = document.getElementById("modalContent");

      modalBody.innerHTML = `
        <div class="text-center">
          <img src="${course.image_url}" alt="${course.title}" 
              class="w-100 rounded-4 mb-4" 
              style="max-height:340px; object-fit:cover; border-radius:1rem;">
        </div>
        <div class="px-3">
          <h4 class="fw-bold text-start mb-2">${course.title}</h4>
          <div class="d-flex align-items-center flex-wrap text-muted small mb-3">
            <i class="bi bi-person-circle text-primary me-1"></i>
            <span class="me-2">${course.instructor_name || "Không rõ"}</span>
            <i class="bi bi-clock-history text-primary me-1"></i>
            <span class="me-2">${course.total_hours || "55.5"} giờ</span>
            <i class="bi bi-mortarboard text-warning me-1"></i>
            <span class="me-2">${course.level || "Beginner"}</span>
            <i class="bi bi-star-fill text-warning me-1"></i>
            <span>4.8 <span class="text-muted">(12.5k học viên)</span></span>
          </div>

          <p class="text-secondary mb-4 text-start" style="min-height:60px;">
            ${course.description || "Khóa học giúp bạn làm chủ các kỹ năng lập trình web hiện đại từ cơ bản đến nâng cao."}
          </p>

          <div class="d-flex justify-content-between align-items-center mt-4">
            <span class="fs-5 fw-bold text-primary">$${course.current_price}</span>
            <div class="d-flex gap-2">
              <a href="/courses/${course.course_id}" 
                class="btn btn-outline-primary rounded-3 px-3 py-2">
                Xem chi tiết
              </a>
              <button class="btn btn-primary rounded-3 px-3 py-2">
                Đăng ký học
              </button>
            </div>
          </div>
        </div>
      `;



      let modalInstance = bootstrap.Modal.getInstance(modalEl);
      if (!modalInstance) {
        modalInstance = new bootstrap.Modal(modalEl, { backdrop: true });
      }

      modalInstance.show();

      // 🧼 Đảm bảo backdrop luôn bị xóa khi modal đóng
      modalEl.addEventListener("hidden.bs.modal", () => {
        document.body.classList.remove("modal-open");
        document.querySelectorAll(".modal-backdrop").forEach(b => b.remove());
      });
    } catch (error) {
      console.error("❌ Lỗi khi hiển thị chi tiết:", error);
      alert("Không thể tải thông tin chi tiết khóa học.");
    }
  });
});