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

function generateTokens(user) {
  const accessToken = jwt.sign(
    { id: user._id },
    process.env.JWT_SECRET
  );

  const refreshToken = jwt.sign(
    { id: user._id },
    process.env.JWT_REFRESH_SECRET, // отдельный секрет
    { expiresIn: "30d" } // живет 30 дней
  );

  return { accessToken, refreshToken };
}


// 📌 Регистрация с аватаркой
app.post("/api/auth/register", upload.single("avatar"), async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    let avatarUrl = null;
    let imgName = null;
    if (req.file) {
      const fileName = `${process.env.S3_BUCKET_ONE}/${Date.now()}-${req.file.originalname}`;
      const { error } = await supabase.storage
        .from(process.env.S3_BUCKET_ONE) // имя bucket-а
        .upload(fileName, req.file.buffer, { contentType: req.file.mimetype });
      if (error) throw error;

      const { data: publicUrl } = supabase.storage.from(process.env.S3_BUCKET_ONE).getPublicUrl(fileName);
      avatarUrl = publicUrl.publicUrl;
      imgName = fileName
    }
    

    const newUser = new User({ name, email, password: hashedPassword, avatar: avatarUrl, imageName: imgName });
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

  const { accessToken, refreshToken } = generateTokens(user);

  // сохраняем refresh в базе
  user.refreshToken = refreshToken;
  await user.save();

  res.json({ accessToken, refreshToken, user });
});

// 📌 Обновление accessToken по refreshToken
app.post("/api/auth/refresh", async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(401).json({ msg: "Нет refresh токена" });

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

    const user = await User.findById(decoded.id);
    if (!user || user.refreshToken !== refreshToken) {
      return res.status(403).json({ msg: "Неверный refresh токен" });
    }

    // генерим новый accessToken
    const accessToken = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "15m" }
    );

    res.json({ accessToken });
  } catch (err) {
    res.status(403).json({ msg: "Неверный или просроченный refresh" });
  }
});

// 📌 Логаут
app.post("/api/auth/logout", authMiddleware, async (req, res) => {
  const user = await User.findById(req.user.id);
  if (user) {
    user.refreshToken = null; // убираем refresh
    await user.save();
  }
  res.json({ msg: "Вы вышли" });
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

// 📌 Обновить профиль
app.put("/api/users/me", authMiddleware, upload.single("avatar"), async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: "Пользователь не найден" });

    const { name, email, password } = req.body;

    // обновляем поля
    if (name) user.name = name;
    if (email) user.email = email;
    if (password) {
      user.password = await bcrypt.hash(password, 10);
    }

    // ⚡️ если загружен новый аватар
    if (req.file) {
      // удалить старый если есть
      if (user.imageName) {
        await supabase.storage.from(process.env.S3_BUCKET_ONE).remove([user.imageName]);
      }

      const fileName = `${process.env.S3_BUCKET_ONE}/${Date.now()}-${req.file.originalname}`;
      const { error } = await supabase.storage
        .from(process.env.S3_BUCKET_ONE)
        .upload(fileName, req.file.buffer, { contentType: req.file.mimetype });
      if (error) throw error;

      const { data: publicUrl } = supabase.storage
        .from(process.env.S3_BUCKET_ONE)
        .getPublicUrl(fileName);

      user.avatar = publicUrl.publicUrl;
      user.imageName = fileName;
    }

    await user.save();

    res.json({ msg: "Профиль обновлён", user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Ошибка обновления профиля" });
  }
});

// 📌 Все пользователи
app.get("/api/users", authMiddleware, async (req, res) => {
  const users = await User.find();
  res.json(users);
});

// 📌 Создать пост
app.post("/api/posts", authMiddleware, upload.single("image"), async (req, res) => {
  try {
    let imageUrl = null;
    let postName = null;
    if (req.file) {
      const fileName = `${process.env.S3_BUCKET_TWO}/${Date.now()}-${req.file.originalname}`;
      const { error } = await supabase.storage
        .from(process.env.S3_BUCKET_TWO)
        .upload(fileName, req.file.buffer, { contentType: req.file.mimetype });
      if (error) throw error;

      const { data: publicUrl } = supabase.storage.from(process.env.S3_BUCKET_TWO).getPublicUrl(fileName);
      imageUrl = publicUrl.publicUrl;
      postName = fileName
    }
    const newPost = new Post({ userId: req.user.id, title: req.body.title, image: imageUrl, postImgName: postName });
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

app.get("/api/start", async (req, res) => {
  const response = {
    message: "Server is running",
    status: true
  };
  res.json(response);
});

// 📌 Удалить аккаунт
app.delete("/api/users/me", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ error: "Пользователь не найден" });
    }

    // 📂 Если у юзера есть аватар — удалить из Supabase
    if (user.imageName) {
      const filePath = user.imageName;

      const { error } = await supabase.storage
        .from(process.env.S3_BUCKET_ONE) // имя bucket-а
        .remove([filePath]);

      if (error) {
        console.error("❌ Ошибка удаления из Supabase:", error.message);
      } else {
        console.log("✅ Аватар удалён из Supabase");
      }
    }

    // ❌ Удаляем юзера из MongoDB
    await User.findByIdAndDelete(req.user.id);

    res.json({ msg: "Пользователь и аватар удалены" });
  } catch (err) {
    console.error(err);
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
