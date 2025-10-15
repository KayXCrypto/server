import express from "express";
import cors from "cors";
import pkg from "pg";
const { Pool } = pkg;

const app = express();
app.use(express.json());

// ✅ Cho phép Zalo Mini App truy cập API
const allowedOrigins = [
  "https://mini.zalo.me", // domain chính thức Zalo Mini App
];

app.use(cors({
  origin: (origin, callback) => {
    // Cho phép gọi từ Zalo hoặc từ tool dev (khi test)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("CORS not allowed"));
    }
  },
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type"],
  credentials: true,
}));

// ✅ Đảm bảo phản hồi cả preflight request
app.options("*", cors());

// 🧩 Kết nối PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// 🧱 Khởi tạo bảng
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

// 🚀 Kiểm tra server hoạt động
app.get("/", (req, res) => {
  res.json({ message: "Zalo Mini App server is running 🚀" });
});

// 🔐 API lưu user
app.post("/api/zalo-login", async (req, res) => {
  try {
    console.log("📩 Nhận request:", req.body);
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

// 🚀 Khởi động server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server chạy trên cổng ${PORT}`));
