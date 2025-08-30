import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import multer from "multer";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { supabase } from "./supabase.js";

import User from "./models/User.js";
import Post from "./models/Post.js";

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors({ origin: "http://localhost:3000", credentials: true }));

// multer для загрузки в память
const storage = multer.memoryStorage();
const upload = multer({ storage });

// 🔑 middleware
function authMiddleware(req, res, next) {
  const token = req.headers["authorization"]?.split(" ")[1];
  if (!token) return res.status(401).json({ msg: "Нет токена" });

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ msg: "Неверный токен" });
    req.user = user;
    next();
  });
}

// 📌 Регистрация с аватаркой
app.post("/api/auth/register", upload.single("avatar"), async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    let avatarUrl = null;
    if (req.file) {
      const fileName = `avatars/${Date.now()}-${req.file.originalname}`;
      const { error } = await supabase.storage
        .from("avatars")
        .upload(fileName, req.file.buffer, { contentType: req.file.mimetype });
      if (error) throw error;

      const { data: publicUrl } = supabase.storage.from("avatars").getPublicUrl(fileName);
      avatarUrl = publicUrl.publicUrl;
    }

    const newUser = new User({ name, email, password: hashedPassword, avatar: avatarUrl, fileName: fileName });
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

// 📌 Профиль
app.get("/api/auth/me", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) return res.status(404).json({ msg: "Пользователь не найден" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ msg: "Ошибка сервера", error: err.message });
  }
});

// 📌 Все пользователи
app.get("/api/users", authMiddleware, async (req, res) => {
  const users = await User.find();
  res.json(users);
});

// 📌 Создать пост
app.post("/api/posts", authMiddleware, upload.single("postImg"), async (req, res) => {
  try {
    let postImgUrl = null;
    if (req.file) {
      const fileName = `posts/${Date.now()}-${req.file.originalname}`;
      const { error } = await supabase.storage
        .from("posts")
        .upload(fileName, req.file.buffer, { contentType: req.file.mimetype });
      if (error) throw error;

      const { data: publicUrl } = supabase.storage.from("posts").getPublicUrl(fileName);
      postImgUrl = publicUrl.publicUrl;
    }

    const newPost = new Post({ userId: req.user.id, title: req.body.title, postImg: postImgUrl });
    await newPost.save();

    res.json({ msg: "Пост создан", post: newPost });
  } catch (err) {
    res.status(500).json({ msg: "Ошибка создания поста", error: err.message });
  }
});

// 📌 Все посты
app.get("/api/posts", async (req, res) => {
  const posts = await Post.find().populate("userId", "name email avatar");
  res.json(posts);
});

// 📌 Удалить аккаунт
app.delete("/api/users/me", authMiddleware, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.user.id);
    res.json({ msg: "Пользователь удалён" });
  } catch (err) {
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// 🚀 Mongo + сервер
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB connected");
    app.listen(process.env.PORT, () => console.log(`🚀 Server running on port ${process.env.PORT}`));
  })
  .catch(err => console.error("❌ MongoDB error:", err));
