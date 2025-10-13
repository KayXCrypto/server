import express from "express";
import fetch from "node-fetch";
import pkg from "pg";
const { Pool } = pkg;

const app = express();
app.use(express.json());

// 🧩 Kết nối PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// 🧱 Khởi tạo bảng nếu chưa có
const initDB = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS zalo_users (
      id SERIAL PRIMARY KEY,
      zalo_id VARCHAR(50) UNIQUE NOT NULL,
      name TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
  console.log("✅ Database ready");
};
initDB();

// 🔐 API xác thực token Zalo
app.post("/api/zalo-login", async (req, res) => {
  try {
    const { token, user } = req.body;
    if (!token) return res.status(400).json({ error: "Missing token" });

    // ✅ Xác thực token với Zalo Graph API
    const zaloRes = await fetch("https://graph.zalo.me/v2.0/me?fields=id,name", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const zaloData = await zaloRes.json();

    if (zaloData.error) {
      console.error("❌ Invalid token:", zaloData);
      return res.status(401).json({ error: "Invalid Zalo token" });
    }

    // ✅ Lưu vào PostgreSQL
    const zaloId = zaloData.id;
    const name = zaloData.name || user?.name || null;

    await pool.query(
      `INSERT INTO zalo_users (zalo_id, name)
       VALUES ($1, $2)
       ON CONFLICT (zalo_id)
       DO UPDATE SET name = EXCLUDED.name`,
      [zaloId, name]
    );

    console.log("📝 Saved user:", zaloId);

    res.json({
      message: "Login success",
      zalo_id: zaloId,
      name,
    });
  } catch (err) {
    console.error("⚠️ Server error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// 🚀 Chạy server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
