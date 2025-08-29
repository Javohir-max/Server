import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import multer from "multer";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import fs from "fs"; // 👈 добавь
import path from "path"; // 👈 добавь

import User from "./models/User.js";
import Post from "./models/Post.js";

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors({ origin: "http://localhost:3000", credentials: true }));
app.use("/uploads", express.static("uploads")); // отдаём картинки

// 📌 Проверяем, есть ли папка uploads — если нет, создаём
const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log("📂 Папка uploads создана автоматически");
}

// подключение к MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch(err => console.error("❌ MongoDB error:", err));

// multer (хранение файлов в /uploads)
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname)
});
const upload = multer({ storage });


// auth middleware
function authMiddleware(req, res, next) {
  const token = req.headers["authorization"]?.split(" ")[1];
  if (!token) return res.status(401).json({ msg: "Нет токена" });

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ msg: "Неверный токен" });
    req.user = user;
    next();
  });
}

// 📌 Регистрация с загрузкой аватарки
app.post("/api/auth/register", upload.single("avatar"), async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      avatar: req.file ? `/uploads/${req.file.filename}` : null
    });

    await newUser.save();
    res.json({ msg: "Пользователь зарегистрирован", user: newUser });
  } catch (err) {
    res.status(500).json({ msg: "Ошибка регистрации", error: err.message });
  }
});

// 📌 Логин
app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });

  if (!user) return res.status(400).json({ msg: "Пользователь не найден" });

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) return res.status(400).json({ msg: "Неверный пароль" });

  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "1h" });
  res.json({ token, user });
});

// 📌 Получить профиль текущего пользователя
app.get("/api/auth/me", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password"); // убираем пароль
    if (!user) return res.status(404).json({ msg: "Пользователь не найден" });

    res.json(user);
  } catch (err) {
    res.status(500).json({ msg: "Ошибка сервера", error: err.message });
  }
});


// 📌 Получить всех пользователей
app.get("/api/users", authMiddleware, async (req, res) => {
  const users = await User.find();
  res.json(users);
});

// 📌 Создать пост (с картинкой)
app.post("/api/posts", authMiddleware, upload.single("postImg"), async (req, res) => {
  try {
    const newPost = new Post({
      userId: req.user.id,
      title: req.body.title,
      postImg: req.file ? `/uploads/${req.file.filename}` : null
    });

    await newPost.save();
    res.json({ msg: "Пост создан", post: newPost });
  } catch (err) {
    res.status(500).json({ msg: "Ошибка создания поста", error: err.message });
  }
});

// 📌 Получить все посты
app.get("/api/posts", async (req, res) => {
  const posts = await Post.find().populate("userId", "name email avatar");
  res.json(posts);
});

// старт сервера
app.listen(process.env.PORT, () => console.log(`🚀 Server running on port ${process.env.PORT}`));
