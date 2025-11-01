function formatStudents(num) {
  if (!num) return 0;
  return num >= 1000 ? (num / 1000).toFixed(1) + "k" : num;
}

document.addEventListener("DOMContentLoaded", () => {
  console.log("✅ Script main.js đã sẵn sàng.");

// ===================== 1️⃣ XỬ LÝ CLICK DANH MỤC (CATEGORY - TOÀN BỘ KHÓA HỌC) =====================
// 🔧 Chỉ chọn các thẻ category-card bên trong section Danh Mục
const categorySection = document.querySelector(".category-section");
const categoryCards = categorySection ? categorySection.querySelectorAll(".category-card") : [];
const categoryList = document.getElementById("categoryList");

if (categoryCards.length && categoryList) {
  categoryCards.forEach(card => {
    card.addEventListener("click", async () => {
      const category = card.dataset.category;
      try {
        const res = await fetch(`/category/api/all/${encodeURIComponent(category)}`);
        if (!res.ok) throw new Error("Lỗi khi gọi API danh mục");

        const courses = await res.json();
        console.log("📦 Dữ liệu khóa học theo danh mục:", courses);

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
            ${courses.map(c => `
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
                        <i class="bi bi-eye text-primary me-1"></i>
                        <span class="fw-semibold small">${c.view || 0} lượt xem</span><br>
                        <i class="bi bi-star-fill text-warning"></i>
                        <span class="fw-semibold small">${c.star || "4.8"}</span>
                        <span class="text-muted small ms-1">${c.student || 0} học viên</span>
                      </div>
                      <span class="fw-bold text-primary">$${c.current_price || "0.00"}</span>
                    </div>
                  </div>
                </div>
              </div>
            `).join("")}
          </div>`;
        categoryList.insertAdjacentElement("afterend", wrapper);
      } catch (err) {
        console.error("❌ Lỗi khi tải danh mục:", err);
        alert("Không thể tải danh sách khóa học. Vui lòng thử lại!");
      }
    });
  });
}
// ===================== 🆕 1.5 XỬ LÝ CLICK TRONG TOP CATEGORIES =====================
const topCategoryCards = document.querySelectorAll(".top-categories .category-card");

if (topCategoryCards.length) {
  topCategoryCards.forEach(card => {
    if (card.dataset.bound === "true") return;
    card.dataset.bound = "true";

    card.addEventListener("click", async (e) => {
      e.stopPropagation();
      const category = card.dataset.category;

      try {
        const res = await fetch(`/category/api/${encodeURIComponent(category)}`);
        if (!res.ok) throw new Error("Lỗi khi gọi API danh mục");

        const courses = await res.json();
        console.log("🔥 Dữ liệu khóa học từ top-categories:", courses);

        document.querySelectorAll(".course-block").forEach(block => block.remove());
        const container = card.closest(".top-categories").querySelector(".container");

        if (!courses || !courses.length) {
          const msg = document.createElement("div");
          msg.className = "alert alert-info mt-3 text-center course-block";
          msg.textContent = `Không có khóa học nào trong lĩnh vực "${category}".`;
          container.appendChild(msg);
          return;
        }

        const wrapper = document.createElement("div");
        wrapper.className = "py-5 bg-light course-block";
        wrapper.innerHTML = `
          <div class="section-header text-center mb-5">
            <h2 class="fw-bold text-primary">${category}</h2>
            <p class="text-muted">Danh sách khóa học thuộc lĩnh vực này</p>
          </div>
          <div class="row g-4 justify-content-center">
            ${courses.map(c => `
              <div class="col-12 col-sm-6 col-lg-3 d-flex course-card" data-id="${c.course_id}">
                <div class="card shadow-sm border-0 rounded-4 h-100 w-100 hover-shadow">
                  <img src="${c.image_url}" alt="${c.title}"
                       class="card-img-top"
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
                          <i class="bi bi-eye text-primary me-1"></i>
                          <span class="fw-semibold small">${c.view || 0} lượt xem</span><br>
                          <i class="bi bi-star-fill text-warning"></i>
                          <span class="fw-semibold small">${c.star || "4.8"}</span>
                          <span class="text-muted small ms-1">${c.student || 0} học viên</span>
                        </div>
                        <span class="fw-bold text-primary">$${c.current_price || "0.00"}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>`).join("")}
          </div>
          <div class="text-center mt-4">
            <button class="btn btn-outline-secondary" id="backToTopCategories">← Quay lại lĩnh vực</button>
          </div>
        `;

        container.appendChild(wrapper);
        wrapper.scrollIntoView({ behavior: "smooth" });

        document.getElementById("backToTopCategories").addEventListener("click", () => {
          wrapper.remove();
          window.scrollTo({ top: container.offsetTop - 100, behavior: "smooth" });
        });
      } catch (error) {
        console.error("❌ Lỗi khi tải lĩnh vực:", error);
      }
    });
  });
}



  // ===================== 2️⃣ NÚT LỌC KHÓA HỌC (FILTER - KHÓA HỌC BÁN CHẠY) =====================
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
          // 🧠 Gọi API khóa học bán chạy
          const res = await fetch(`/category/api/bestseller/${encodeURIComponent(selectedCategory)}`);
          if (!res.ok) throw new Error("Lỗi khi gọi API khóa học bán chạy");

          const courses = await res.json();
          console.log("🔥 Dữ liệu khóa học bán chạy:", courses);

          // 🧹 Làm sạch lưới
          popularGrid.innerHTML = "";

          if (!courses.length) {
            popularGrid.innerHTML = `
              <div class="col-12 text-center text-muted py-5">
                <p>Không có khóa học bán chạy nào trong danh mục này.</p>
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
                        <div class="d-flex align-items-center justify-content-between">
                          <div>
                            <i class="bi bi-eye text-primary me-1"></i>
                            <span class="fw-semibold small">{{view}} lượt xem</span><br>
                            <i class="bi bi-star-fill text-warning"></i>
                            <span class="fw-semibold small">{{star}}</span>
                            <span class="text-muted small ms-1">{{student}} học viên</span>
                          </div>
                          <span class="fw-bold text-primary">${{current_price}}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>`
            )
            .join("");

          popularGrid.innerHTML = html;
        } catch (error) {
          console.error("❌ Lỗi khi tải khóa học bán chạy:", error);
          popularGrid.innerHTML = `
            <div class="col-12 text-center text-danger py-5">
              <p>Không thể tải danh sách khóa học bán chạy. Vui lòng thử lại!</p>
            </div>`;
        }
      });
    });
  }

  // ===================== 🟣 MODAL CHI TIẾT KHÓA HỌC - TOÀN TRANG =====================
  document.body.addEventListener("click", async (e) => {
    const card = e.target.closest(".course-card");
    if (!card) return;

    const courseId = card.dataset.id;
    if (!courseId) return;

    const modalEl = document.getElementById("courseModal");
    const modalBody = document.getElementById("modalContent");

    // Hiển thị loading trước khi fetch
    modalBody.innerHTML = `
      <div class="text-center text-muted py-5">Đang tải thông tin khóa học...</div>
    `;

    try {
      const res = await fetch(`/courses/detail/${courseId}`);
      if (!res.ok) throw new Error("Không thể tải thông tin khóa học");
      const course = await res.json();

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
            <span>${course.star || "4.8"} <span class="text-muted">(${course.student || 0} học viên)</span></span>
          </div>

          <p class="text-secondary mb-4 text-start" style="min-height:60px;">
            ${course.description || "Khóa học giúp bạn làm chủ kỹ năng lập trình web hiện đại."}
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

      // Hiển thị modal
      let modalInstance = bootstrap.Modal.getInstance(modalEl);
      if (!modalInstance) {
        modalInstance = new bootstrap.Modal(modalEl, { backdrop: true, focus: false });
      }
      modalInstance.show();

      // Xử lý cleanup backdrop
      modalEl.addEventListener("hidden.bs.modal", () => {
        document.body.classList.remove("modal-open");
        document.querySelectorAll(".modal-backdrop").forEach(b => b.remove());
      });

    } catch (error) {
      console.error("❌ Lỗi khi hiển thị chi tiết khóa học:", error);
      modalBody.innerHTML = `
        <div class="text-center text-danger py-5">
          Không thể tải thông tin khóa học. Vui lòng thử lại sau!
        </div>
      `;
    }
  });



// ===================== 🔍 TÌM KIẾM KHÓA HỌC TOÀN TRANG (4 khóa/trang) =====================
const searchForm = document.querySelector("#globalSearchForm");
const searchInput = document.querySelector("#globalSearchInput");
const searchResultsSection = document.querySelector("#searchResultsSection");
const searchResultsContainer = document.querySelector("#searchResultsContainer");
const paginationNav = document.querySelector("#paginationNav");
const sortSelect = document.querySelector("#sortSelect");

let currentPage = 1;
let currentSort = "rating_desc";
let currentKeyword = "";
let lastResults = [];     // lưu kết quả thô của lần tìm gần nhất
const PER_PAGE = 4;

function normalizeCoursesPayload(data) {
  // data có thể là mảng [] hoặc object { courses: [...] }
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.courses)) return data.courses;
  return []; // fallback an toàn
}

async function fetchSearchResults(keyword, page = 1, sort = "rating_desc") {
  try {
    // loading tối giản
    searchResultsSection.style.display = "block";
    searchResultsContainer.innerHTML = `
      <div class="col-12 text-center py-5">
        <div class="spinner-border text-primary" role="status"><span class="visually-hidden">Đang tải...</span></div>
      </div>
    `;
    paginationNav.style.display = "none";

    const res = await fetch(`/api/search?q=${encodeURIComponent(keyword)}&page=${page}&sort=${sort}`);
    const raw = await res.json();

    // Chuẩn hóa về mảng courses
    lastResults = normalizeCoursesPayload(raw);

    currentPage = 1; // luôn quay về trang 1 khi tìm mới
    renderSearchResults(currentPage);
  } catch (err) {
    console.error("❌ Lỗi khi tải kết quả tìm kiếm:", err);
    searchResultsSection.style.display = "block";
    searchResultsContainer.innerHTML = `
      <div class="col-12 text-center text-danger py-5">
        Không thể tải kết quả. Vui lòng thử lại!
      </div>
    `;
    paginationNav.style.display = "none";
  }
}

function renderSearchResults(page) {
  searchResultsSection.style.display = "block";
  searchResultsContainer.innerHTML = "";

  const totalCourses = lastResults.length;
  if (!totalCourses) {
    searchResultsContainer.innerHTML = `
      <div class="col-12 text-center text-muted py-5">
        Không tìm thấy khóa học phù hợp.
      </div>`;
    paginationNav.style.display = "none";
    return;
  }

  const totalPages = Math.ceil(totalCourses / PER_PAGE);
  const startIndex = (page - 1) * PER_PAGE;
  const endIndex = startIndex + PER_PAGE;
  const coursesToShow = lastResults.slice(startIndex, endIndex);

  coursesToShow.forEach(c => {
  const isNew = c.is_new;
  const isHot = (c.student || 0) > 2000;
  const badge = isHot ? "🔥 Best Seller" : (isNew ? "🆕 Mới" : "");

  searchResultsContainer.innerHTML += `
    <div class="col-12 col-sm-6 col-lg-3 d-flex">
      <div class="card shadow-sm border-0 rounded-4 h-100 w-100 hover-shadow position-relative course-card"
          data-id="${c.course_id}">
        ${badge ? `<span class="position-absolute top-0 start-0 bg-warning text-dark fw-semibold small px-2 py-1 rounded-end mt-2">${badge}</span>` : ""}
        <img src="${c.image_url}" alt="${c.title || ""}" class="card-img-top"
             style="height:180px;object-fit:cover;border-top-left-radius:1rem;border-top-right-radius:1rem;">
        <div class="card-body d-flex flex-column justify-content-between">
          <div>
            <span class="badge bg-light text-primary mb-2">${c.category_name || ""}</span>
            <h6 class="fw-semibold mb-1 text-dark">${c.title || ""}</h6>
            <p class="text-muted small mb-3" style="min-height:40px;overflow:hidden;">
              ${c.description || ""}
            </p>
          </div>
          <div>
            <div class="d-flex align-items-center mb-2">
              <span class="small text-dark">${c.instructor_name || "Giảng viên ẩn danh"}</span>
            </div>
            <div class="d-flex align-items-center justify-content-between">
              <div>
                <i class="bi bi-eye text-primary me-1"></i>
                <span class="fw-semibold small">${c.view || 0} lượt xem</span><br>
                <i class="bi bi-star-fill text-warning"></i>
                <span class="fw-semibold small">${c.star || "4.8"}</span>
                <span class="text-muted small ms-1">${c.student || 0} học viên</span>
              </div>
              <span class="fw-bold text-primary">$${c.current_price || "0.00"}</span>
            </div>
          </div>
        </div>
      </div>
    </div>`;
});


  // Phân trang
  paginationNav.style.display = totalPages > 1 ? "flex" : "none";
  const curPageEl = document.querySelector("#currentPage");
  if (curPageEl) curPageEl.textContent = `${page}/${totalPages}`;

  const prevBtn = document.querySelector("#prevPage");
  const nextBtn = document.querySelector("#nextPage");
  if (prevBtn) prevBtn.disabled = page <= 1;
  if (nextBtn) nextBtn.disabled = page >= totalPages;

  // Rebind click để dùng cùng dataset đã có
  if (prevBtn) prevBtn.onclick = () => {
    if (currentPage > 1) {
      currentPage--;
      renderSearchResults(currentPage);
      window.scrollTo({ top: searchResultsSection.offsetTop - 50, behavior: "smooth" });
    }
  };
  if (nextBtn) nextBtn.onclick = () => {
    if (currentPage < totalPages) {
      currentPage++;
      renderSearchResults(currentPage);
      window.scrollTo({ top: searchResultsSection.offsetTop - 50, behavior: "smooth" });
    }
  };
}

// Gửi khi nhấn tìm
searchForm?.addEventListener("submit", e => {
  e.preventDefault();
  currentKeyword = (searchInput?.value || "").trim();
  if (!currentKeyword) return;
  fetchSearchResults(currentKeyword, 1, currentSort);

  // Cuộn xuống phần kết quả
  setTimeout(() => {
    if (searchResultsSection) {
      searchResultsSection.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, 300);
});

// Thay đổi sắp xếp -> render lại từ trang 1, dùng kết quả cũ nếu có
sortSelect?.addEventListener("change", e => {
  currentSort = e.target.value;
  if (currentKeyword) {
    // nếu muốn gọi lại server theo sort, dùng fetchSearchResults
    // còn nếu chỉ sort client-side, bạn có thể sắp xếp lastResults tại đây
    fetchSearchResults(currentKeyword, 1, currentSort);
  }
});


// ===================== 🆕 CLICK TRONG "LĨNH VỰC ĐĂNG KÝ NHIỀU TRONG TUẦN" =====================
const topCategorySection = document.querySelector(".top-categories");
const topCategoryCardsWeekly = topCategorySection ? topCategorySection.querySelectorAll(".category-card") : [];

if (topCategoryCardsWeekly.length) {
  topCategoryCardsWeekly.forEach(card => {
    if (card.dataset.boundTop === "true") return;
    card.dataset.boundTop = "true";

    card.addEventListener("click", async () => {
      const category = card.dataset.category;
      console.log("🔎 Click lĩnh vực:", category);

      try {
        const res = await fetch(`/category/api/all/${encodeURIComponent(category)}`);
        if (!res.ok) throw new Error("Lỗi khi gọi API danh mục");

        const courses = await res.json();
        console.log("📚 Khóa học thuộc lĩnh vực:", courses);

        // Xóa phần cũ nếu có
        document.querySelectorAll(".course-block").forEach(block => block.remove());
        const container = topCategorySection.querySelector(".container");

        // Nếu không có khóa học
        if (!courses || !courses.length) {
          const msg = document.createElement("div");
          msg.className = "alert alert-info mt-3 text-center course-block";
          msg.textContent = `Không có khóa học nào trong lĩnh vực "${category}".`;
          container.appendChild(msg);
          return;
        }

        // ===== ⚙️ Biến phân trang =====
        let currentPage = 1;
        const perPage = 4;
        const totalPages = Math.ceil(courses.length / perPage);

        // ===== ⚙️ Hàm render khóa học theo trang =====
        const renderPage = (page) => {
          const start = (page - 1) * perPage;
          const end = start + perPage;
          const visibleCourses = courses.slice(start, end);

          return `
            <div class="row g-4 justify-content-center">
              ${visibleCourses.map(c => `
                <div class="col-12 col-sm-6 col-lg-3 d-flex course-card" data-id="${c.course_id}">
                  <div class="card shadow-sm border-0 rounded-4 h-100 w-100 hover-shadow">
                    <img src="${c.image_url}" alt="${c.title}" 
                        class="card-img-top"
                        style="height:180px; object-fit:cover; border-top-left-radius:1rem; border-top-right-radius:1rem;">
                    <div class="card-body d-flex flex-column justify-content-between">
                      <div>
                        <span class="badge bg-light text-primary mb-2">${c.category_name}</span>
                        <h6 class="fw-semibold mb-1 text-dark">${c.title}</h6>
                        <p class="text-muted small mb-3" style="min-height:40px; overflow:hidden;">
                          ${c.description || ""}
                        </p>
                      </div>
                       <div class="d-flex align-items-center mb-2">
                        <span class="small text-dark">${c.instructor_name || "Giảng viên ẩn danh"}</span>
                      </div>
                      <div class="d-flex align-items-center justify-content-between">
                        <div>
                          <i class="bi bi-star-fill text-warning"></i>
                          <span class="fw-semibold small">${c.star || "4.8"}</span>
                          <span class="text-muted small ms-1">${c.student || 0} học viên</span>
                        </div>
                        <span class="fw-bold text-primary">$${c.current_price || "0.00"}</span>
                      </div>
                    </div>
                  </div>
                </div>
              `).join("")}
            </div>
          `;
        };

        // ===== ⚙️ Hàm render toàn khối =====
        const renderWrapper = () => {
          wrapper.innerHTML = `
            <div class="section-header text-center mb-5">
              <h2 class="fw-bold text-primary">${category}</h2>
              <p class="text-muted">Danh sách các khóa học thuộc lĩnh vực này</p>
            </div>
            ${renderPage(currentPage)}
            <div class="d-flex justify-content-center align-items-center gap-2 mt-4">
              <button class="btn btn-outline-secondary btn-sm" id="prevPage" ${currentPage === 1 ? "disabled" : ""}>← Trước</button>
              <span class="fw-semibold">Trang ${currentPage}/${totalPages}</span>
              <button class="btn btn-outline-secondary btn-sm" id="nextPage" ${currentPage === totalPages ? "disabled" : ""}>Sau →</button>
            </div>
            <div class="text-center mt-4">
              <button class="btn btn-outline-primary" id="backToTopCategories">← Quay lại lĩnh vực</button>
            </div>
          `;
        };

        // ===== ⚙️ Tạo wrapper và gắn render =====
        const wrapper = document.createElement("div");
        wrapper.className = "py-5 bg-white course-block";
        renderWrapper();
        container.appendChild(wrapper);
        wrapper.scrollIntoView({ behavior: "smooth" });

        // ===== ⚙️ Gắn sự kiện phân trang =====
        const updateEvents = () => {
          const prevBtn = wrapper.querySelector("#prevPage");
          const nextBtn = wrapper.querySelector("#nextPage");
          const backBtn = wrapper.querySelector("#backToTopCategories");

          prevBtn?.addEventListener("click", () => {
            if (currentPage > 1) {
              currentPage--;
              renderWrapper();
              updateEvents();
            }
          });

          nextBtn?.addEventListener("click", () => {
            if (currentPage < totalPages) {
              currentPage++;
              renderWrapper();
              updateEvents();
            }
          });

          backBtn?.addEventListener("click", () => {
            wrapper.remove();
            window.scrollTo({ top: container.offsetTop - 100, behavior: "smooth" });
          });
        };

        // Kích hoạt sự kiện ban đầu
        updateEvents();
      } catch (error) {
        console.error("❌ Lỗi khi tải lĩnh vực:", error);
        alert("Không thể tải danh sách khóa học. Vui lòng thử lại!");
      }
    });
  });
}

// ✅ Đóng DOMContentLoaded
});


// ===================== 🟢 XỬ LÝ CLICK DANH MỤC CON (CÓ PHÂN TRANG) =====================
const subCategoryItems = document.querySelectorAll(".category-section li[data-category]");

if (subCategoryItems.length) {
  subCategoryItems.forEach(item => {
    item.addEventListener("click", async (e) => {
      e.stopPropagation(); // ❗ Ngăn sự kiện lan lên category-card cha

      const subCategory = item.dataset.category;
      console.log("🟢 Click mục con:", subCategory);

      try {
        const res = await fetch(`/category/api/all/${encodeURIComponent(subCategory)}`);
        if (!res.ok) throw new Error("Lỗi khi gọi API danh mục con");

        const courses = await res.json();
        console.log("📚 Dữ liệu khóa học mục con:", courses);

        // Xóa các khối cũ trước đó
        document.querySelectorAll(".course-block").forEach(block => block.remove());

        const wrapper = document.createElement("div");
        wrapper.className = "mt-5 course-block container";

        // Nếu không có khóa học
        if (!courses || !courses.length) {
          wrapper.innerHTML = `
            <div class="alert alert-info text-center">
              Không có khóa học nào trong danh mục "${subCategory}".
            </div>`;
          categoryList.insertAdjacentElement("afterend", wrapper);
          return;
        }

        // ===================== 🧭 PHÂN TRANG =====================
        let currentPage = 1;
        const itemsPerPage = 4;

        function renderCoursesPage(page) {
          const start = (page - 1) * itemsPerPage;
          const end = start + itemsPerPage;
          const pageCourses = courses.slice(start, end);

          wrapper.innerHTML = `
            <h4 class="fw-bold text-primary mb-4 text-center">${subCategory}</h4>
            <div class="row g-4">
              ${pageCourses.map(c => `
                <div class="col-12 col-sm-6 col-lg-3">
                  <div class="card shadow-sm border-0 rounded-4 h-100 hover-shadow course-card" 
                       data-id="${c.course_id}" style="cursor:pointer;">
                    <img src="${c.image_url}" alt="${c.title}" 
                         class="card-img-top"
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
                            <span class="fw-semibold small">${c.star || "4.8"}</span>
                            <span class="text-muted small ms-1">${c.student || 0} học viên</span>
                          </div>
                          <span class="fw-bold text-primary">$${c.current_price || "0.00"}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              `).join("")}
            </div>

            <nav class="mt-5 d-flex justify-content-center" aria-label="Pagination">
              <ul class="pagination pagination-rounded mb-0">
                <li class="page-item">
                  <button class="page-link" id="prevPage">← Trước</button>
                </li>
                <li class="page-item disabled">
                  <span class="page-link" id="currentPage">${page}</span>
                </li>
                <li class="page-item">
                  <button class="page-link" id="nextPage">Sau →</button>
                </li>
              </ul>
            </nav>
          `;

          // Điều hướng trang
          const prevBtn = wrapper.querySelector("#prevPage");
          const nextBtn = wrapper.querySelector("#nextPage");
          prevBtn.disabled = page === 1;
          nextBtn.disabled = end >= courses.length;

          prevBtn.addEventListener("click", () => {
            if (currentPage > 1) {
              currentPage--;
              renderCoursesPage(currentPage);
              window.scrollTo({ top: wrapper.offsetTop - 80, behavior: "smooth" });
            }
          });

          nextBtn.addEventListener("click", () => {
            if (currentPage * itemsPerPage < courses.length) {
              currentPage++;
              renderCoursesPage(currentPage);
              window.scrollTo({ top: wrapper.offsetTop - 80, behavior: "smooth" });
            }
          });
        }

        // ✅ Hiển thị trang đầu tiên
        renderCoursesPage(1);
        categoryList.insertAdjacentElement("afterend", wrapper);

      } catch (err) {
        console.error("❌ Lỗi khi tải mục con:", err);
      }
    });
  });
}
