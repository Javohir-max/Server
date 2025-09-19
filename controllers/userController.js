import bcrypt from "bcryptjs";
import User from "../models/User.js";
import { supabase } from "../supabase.js";


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
    // твоя логика Удалить аккаунт сюда
    try {
        const user = await User.findById(req.user.id);

        if (!user) {
        return res.status(404).json({ error: "Пользователь не найден" });
        }

        // 📂 Если у юзера есть аватар — удалить из Supabase
        if (user.imageName) {
        const filePath = user.imageName;

        const { error } = await Supabase.storage
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
};