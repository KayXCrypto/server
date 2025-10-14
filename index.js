import express from "express";
import pkg from "pg";
const { Pool } = pkg;

const app = express();
app.use(express.json());

// 🧱 Kết nối PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// 🔧 Khởi tạo bảng nếu chưa có
const initDB = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS zalo_users (
      id SERIAL PRIMARY KEY,
      zalo_id VARCHAR(50) UNIQUE NOT NULL,
      name TEXT,
      login_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
  console.log("✅ Database ready");
};
initDB();

// 🪪 API ghi nhận đăng nhập
app.post("/api/zalo-login", async (req, res) => {
  try {
    const { user } = req.body;

    if (!user?.id || !user?.name) {
      return res.status(400).json({ error: "Thiếu thông tin người dùng" });
    }

    // 🧩 Ghi nhận vào DB
    await pool.query(
      `INSERT INTO zalo_users (zalo_id, name, login_time)
       VALUES ($1, $2, CURRENT_TIMESTAMP)
       ON CONFLICT (zalo_id)
       DO UPDATE SET 
         name = EXCLUDED.name,
         login_time = EXCLUDED.login_time`,
      [user.id, user.name]
    );

    console.log("📝 Saved user:", user.name);

    res.json({
      message: "✅ Đã lưu thông tin người dùng",
      zalo_id: user.id,
      name: user.name,
    });
  } catch (err) {
    console.error("⚠️ Lỗi server:", err);
    res.status(500).json({ error: "Lỗi máy chủ" });
  }
});

// 🚀 Khởi chạy server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server chạy tại cổng ${PORT}`));
