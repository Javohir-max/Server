import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { generateTokens } from "../utils/tokens.js";
import { transporter } from "../utils/mailer.js";

// регистрация
export const register = async (req, res) => {
    // твоя логика регистрации сюда
    try {
        const { name, email, password, date } = req.body;
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
        
    
        const newUser = new User({ name, email, password: hashedPassword, avatar: avatarUrl, imageName: imgName, date });
        await newUser.save();
    
        res.json({ msg: "Пользователь зарегистрирован", user: newUser });
    } catch (err) {
        res.status(500).json({ msg: "Ошибка регистрации", error: err.message });
    }
};

// логин
export const login = async (req, res) => {
    // твоя логика логина сюда
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
};

// refresh
export const refresh = async (req, res) => {
    // твоя логика refresh сюда
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
          process.env.JWT_SECRET
        );
    
        res.json({ accessToken });
    } catch (err) {
        res.status(403).json({ msg: "Неверный или просроченный refresh" });
    }
};

// logout
export const logout = async (req, res) => {
    // твоя логика logout сюда
    const user = await User.findById(req.user.id);
    if (user) {
        user.refreshToken = null; // убираем refresh
        await user.save();
    }
    res.json({ msg: "Вы вышли" });
};

// профиль
export const me = async (req, res) => {
    // твоя логика me сюда
    try {
        const user = await User.findById(req.user.id).select("-password");
        if (!user) return res.status(404).json({ msg: "Пользователь не найден" });
        res.json(user);
    } catch (err) {
        res.status(500).json({ msg: "Ошибка сервера", error: err.message });
    }
};

// сброс пароля
export const resetPassword = async (req, res) => {
    // логика reset password
    const { email } = req.body
    if (!email) {
        return res.status(400).json({ error: "Нет почты!" })
    }
    let query = {};
    query.email = new RegExp(email); // поиск по email (без учета регистра)
    const users = await User.find(query).select("-password -refreshToken");
    if (users.length === 0) {
        return res.status(404).json({ error: "Почта не найдена" })
    }
    const seccretCode = Math.floor(100000 + Math.random() * 900000) // случайный код 6 цифр
    const message = `Ваш код для восстановления: ${seccretCode}. Если вы не запрашивали восстановление, просто проигнорируйте это письмо.`
    try {
        await transporter.sendMail({
            from: process.env.EMAIL_USER, 
            to: email,
            subject: "Восстановление доступа",
            text: message
        })

        res.json({ msg: "✅ Код отправлен на электронную почту.", code: seccretCode })
    } catch (err) {
        console.error("Ошибка при отправке:", err)  
        res.status(500).json({ error: "Ошибка при отправке кода" })
    }

};

// смена пароля
export const changePassword = async (req, res) => {
    // логика change password
    const { email, newPassword } = req.body
    if (!email || !newPassword) {
        return res.status(400).json({ error: "Почты или пароля нет!" })
    }
    let query = {};
    query.email = new RegExp(email);
    const users = await User.find(query);
    if (users.length === 0) {
        return res.status(404).json({ error: "Пользователь не найден" })
    } else {
        const user = users[0]
        user.password = await bcrypt.hash(newPassword, 10); // хешируем новый пароль
        await user.save()
        res.json({ msg: "✅ Пароль изменён." })
    } 
};
