import bcrypt from "bcryptjs";
import User from "../models/User.js";
import { supabase } from "../supabase.js";
import Post from "../models/Post.js";


// Обновить профиль
export const update = async (req, res) => {
    // твоя логика Обновить профиль сюда
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
};

// Все пользователи
export const all = async (req, res) => {
    // твоя логика Все пользователи сюда
    try {
        const users = await User.find().select("-password -refreshToken");
        res.json(users);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Ошибка при получении пользователей" });
    }
};

// Удалить аккаунт
export const delet = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ error: "Пользователь не найден" });
    }

    // ✅ Если есть аватар — удаляем
    if (user.imageName) {
      const { error: avatarErr } = await supabase.storage
        .from(process.env.S3_BUCKET_ONE)
        .remove([user.imageName]);

      if (avatarErr) {
        console.error("❌ Ошибка удаления аватара из Supabase:", avatarErr.message);
      } else {
        console.log("✅ Аватар удалён из Supabase");
      }
    }

    // ✅ Удаляем все посты юзера
    const posts = await Post.find({ userId: req.user.id });

    if (posts.length > 0) {
      // соберём все пути файлов из постов (если там картинки в Supabase)
      const filesToDelete = posts
        .map((p) => p.postImgName) // предположим, что поле imageName хранит имя файла
        .filter(Boolean);

      if (filesToDelete.length > 0) {
        const { error: postsErr } = await supabase.storage
          .from(process.env.S3_BUCKET_TWO)
          .remove(filesToDelete);

        if (postsErr) {
          console.error("❌ Ошибка удаления файлов постов:", postsErr.message);
        } else {
          console.log("✅ Файлы постов удалены из Supabase");
        }
      }

      // удаляем записи постов в Mongo
      await Post.deleteMany({ userId: req.user.id });
    }

    // ❌ Удаляем юзера
    await User.findByIdAndDelete(req.user.id);

    res.json({
      msg: `Аккаунт и связанные данные удалены`,
      deletedPosts: posts.length,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
};