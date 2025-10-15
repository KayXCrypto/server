import express from "express";
import cors from "cors";
import pkg from "pg";
const { Pool } = pkg;

const app = express();
app.use(express.json());

// ✅ CORS — bắt buộc cấu hình thủ công
app.use((req, res, next) => {
  // Cho phép mọi origin (vì Zalo WebView không gửi Origin)
  res.setHeader("Access-Control-Allow-Origin", "*");

  // Hoặc nếu bạn muốn giới hạn chỉ cho Zalo:
  // res.setHeader("Access-Control-Allow-Origin", "https://mini.zalo.me");

  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Credentials", "true");

  // Bắt OPTIONS request trả luôn 200
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }

  next();
});

// 🧱 PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// 🚀 Tạo bảng nếu chưa có
const initDB = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS zalo_users (
      id SERIAL PRIMARY KEY,
      zalo_id VARCHAR(50),
      name TEXT,
      login_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
  console.log("✅ Database ready");
};
initDB();

// ✅ Test route
app.get("/", (req, res) => {
  res.json({ message: "🚀 Zalo Mini App Server is running!" });
});

// ✅ API lưu user
app.post("/api/zalo-login", async (req, res) => {
  try {
    console.log("📩 Nhận request body:", req.body);

    const { user } = req.body;
    if (!user || !user.id || !user.name) {
      return res.status(400).json({ error: "Thiếu thông tin người dùng" });
    }

    const loginTime = new Date().toISOString();

    await pool.query(
      `INSERT INTO zalo_users (zalo_id, name, login_time)
       VALUES ($1, $2, $3)`,
      [user.id, user.name, loginTime]
    );

    console.log("✅ Đã lưu user:", user.name);
    res.json({ success: true, message: "Lưu thành công", user });
  } catch (err) {
    console.error("❌ Lỗi khi lưu user:", err);
    res.status(500).json({ error: "Server error", details: err.message });
  }
});

// 🧠 Khởi động server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server chạy trên cổng ${PORT}`));
