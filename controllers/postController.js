import Post from "../models/Post.js";
import { supabase } from "../supabase.js";


// Создать пост
export const createPost = async (req, res) => {
    // твоя логика Создать пост сюда
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
};

// Все посты
export const all = async (req, res) => {
    // твоя логика Все посты сюда
    const posts = await Post.find().populate("userId", "name email avatar");
    res.json(posts);
};
// Мои посты
export const mePosts = async (req, res) => {
    // твоя логика Все посты сюда
    const posts = await User.findById(req.user.id).populate("userId", "name avatar");
    if (!posts) return res.status(404).json({ msg: "Пользователь не найден" });
    res.json(posts);
};