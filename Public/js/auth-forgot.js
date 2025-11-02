document.addEventListener("DOMContentLoaded", () => {
  console.log("✅ auth-forgot.js loaded");

  const forgotForm = document.querySelector("#forgotForm");
  const otpForm = document.querySelector("#otpForm");
  const resetForm = document.querySelector("#resetForm");

  // ========================
  // 🟦 GỬI MÃ OTP QUA EMAIL
  // ========================
  forgotForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.querySelector("#forgotEmail").value.trim();

    try {
      const res = await fetch("/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (res.ok) {
        document.activeElement.blur();
        bootstrap.Modal.getInstance(document.getElementById("forgotModal")).hide();

        setTimeout(() => {
          document.querySelector("#otpEmail").value = email;
          new bootstrap.Modal(document.getElementById("otpModal")).show();
        }, 300);
      } else {
        alert("❌ Email không tồn tại trong hệ thống.");
      }
    } catch {
      alert("⚠️ Lỗi kết nối server.");
    }
  });

  // ========================
  // 🟩 XÁC MINH MÃ OTP
  // ========================
  otpForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.querySelector("#otpEmail").value.trim();
    const otp = document.querySelector("#otpCode").value.trim();

    try {
      const res = await fetch("/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });

      if (res.ok) {
        document.activeElement.blur();
        bootstrap.Modal.getInstance(document.getElementById("otpModal")).hide();

        setTimeout(() => {
          document.querySelector("#resetEmail").value = email;
          document.querySelector("#resetOtp").value = otp;
          new bootstrap.Modal(document.getElementById("resetModal")).show();
        }, 300);
      } else {
        alert("❌ Mã OTP không hợp lệ.");
      }
    } catch {
      alert("⚠️ Lỗi xác minh OTP.");
    }
  });

  // ========================
  // 🟥 ĐẶT LẠI MẬT KHẨU
  // ========================
  resetForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.querySelector("#resetEmail").value;
    const otp = document.querySelector("#resetOtp").value;
    const password = document.querySelector("#newPassword").value;
    const confirm = document.querySelector("#confirmPassword").value;

    if (password !== confirm) return alert("⚠️ Mật khẩu nhập lại không khớp.");

    try {
      const res = await fetch("/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp, password, confirm }),
      });

      if (res.ok) {
        alert("✅ Đặt lại mật khẩu thành công! Hãy đăng nhập lại.");
        bootstrap.Modal.getInstance(document.getElementById("resetModal")).hide();
      } else {
        alert("❌ Không thể đặt lại mật khẩu.");
      }
    } catch {
      alert("⚠️ Lỗi máy chủ khi đặt lại mật khẩu.");
    }
  });
});
