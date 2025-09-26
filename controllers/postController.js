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

        res.json({ msg: "Пост создан", status: "success", post: newPost });
    } catch (err) {
        res.status(500).json({ msg: "Ошибка создания поста", status: "error",  error: err.message });
    }
};

// Все посты
export const all = async (req, res) => {
    // твоя логика Все посты сюда
    const posts = await Post.find().populate("userId", "name avatar");
    res.json({ msg: "Получены все посты", status: "success", posts});
};
// Мои посты
export const mePosts = async (req, res) => {
    // твоя логика Мои посты сюда
    const myPost = await Post.find({ userId: req.user.id })
      .populate("userId", "name avatar"); // подтягиваем данные юзера

    if (!myPost || myPost.length === 0) {
      return res.status(404).json({ msg: "У тебя пока нет постов", status: "error"});
    }
    res.json({ msg: "Получены все мои посты", status: "success",  myposts: myPost});
};
// Удалить мой пост
export const deletMePost = async (req, res) => {
    // твоя логика Удалить пост сюда
    const { id } = req.body
    const post = await Post.findById(id)
    if (!post || post.length === 0) {
      return res.status(404).json({ msg: "Пост не найден", status: "error"});
    }
    // ✅ Если есть аватар — удаляем
    if (post.postImgName) {
        const { error: avatarErr } = await supabase.storage
            .from(process.env.S3_BUCKET_TWO)
            .remove([post.postImgName]);
        if (avatarErr) {
          console.error("❌ Ошибка удаления аватара из Supabase:", avatarErr.message);
        } else {
          console.log("✅ Аватар удалён из Supabase");
        }
    }

    await Post.findByIdAndDelete(post._id);
    res.json({ msg: "Пост удален ✅", status: "success" });
};
// Удалить мои посты
export const deletMePosts = async (req, res) => {
    // твоя логика Удалить посты сюда
    try {
        const posts = await Post.find({ userId: req.user.id });
    
        if (posts.length === 0) return res.status(404).json({ msg: "Посты не найден ❌", status: "error" })
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
        await Post.deleteMany({ userId: req.user.id });
        res.json({ msg: "Удалены все посты ✅", status: "success" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ msg: "Ошибка сервера", status: "error", error: err.message });
    }
};