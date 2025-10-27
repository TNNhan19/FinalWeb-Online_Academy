// ❌ Không cần import db thật
// import database from "../configs/db.js";

// ✅ MOCK DATA (chạy không cần database)
const mockProfile = {
  account_id: 15,
  full_name: "Duy",
  email: "duy@example.com",
  password_hash: "$2a$10$FakeHashForTesting"
};

const mockWatchlist = [
  {
    id: 3,
    title: "Lập trình Node.js từ cơ bản đến nâng cao",
    thumbnail_url: "https://images.pexels.com/photos/1181671/pexels-photo-1181671.jpeg",
    price: 1999000,
    discount_price: 499000,
    added_at: "2025-10-26"
  },
  {
    id: 5,
    title: "ReactJS toàn tập cho người mới bắt đầu",
    thumbnail_url: "https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg",
    price: 1599000,
    discount_price: 699000,
    added_at: "2025-10-27"
  }
];

const mockEnrolled = [
  {
    id: 9,
    title: "Python Bootcamp - Học từ A đến Z",
    thumbnail_url: "https://images.pexels.com/photos/3861972/pexels-photo-3861972.jpeg",
    price: 1999000,
    discount_price: 999000,
    enrolled_at: "2025-10-27"
  }
];

// ========= Profile =========
export const getProfileById = async (account_id) => mockProfile;

export const updateProfile = async (account_id, data) => {
  console.log("📝 Đã cập nhật hồ sơ:", data);
  return true;
};

// ========= Lấy student_id từ account_id (mock) =========
export const getStudentId = async (account_id) => 1;

// ========= Watchlist =========
export const getWatchlist = async (account_id) => mockWatchlist;

export const removeFromWatchlist = async (account_id, course_id) => {
  console.log("❌ Đã xóa khỏi danh sách yêu thích:", course_id);
  return true;
};

export const addToWatchlist = async (account_id, course_id) => {
  console.log("❤️ Đã thêm vào danh sách yêu thích:", course_id);
  return true;
};

export const isInWatchlist = async (account_id, course_id) => {
  // giả lập chỉ có id=3 là đã yêu thích
  return course_id == 3;
};

// ========= Enrolled =========
export const getEnrolledCourses = async (account_id) => mockEnrolled;

