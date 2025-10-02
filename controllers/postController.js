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
        const newPost = new Post({ 
            userId: req.user.id,
            title: req.body.title,
            image: imageUrl,
            postImgName: postName,
            likes: []
        });
        await newPost.save();

        res.json({ msg: "Пост создан", status: "success", post: newPost });
    } catch (err) {
        res.status(500).json({ msg: "Ошибка сервера", status: "error",  error: err.message });
    }
};

// Все посты
export const all = async (req, res) => {
    try {
        const posts = await Post.find().populate("userId", "name avatar");
        res.json(posts);
    } catch (error) {
        console.log(error);
        res.status(500).json({ msg: "Ошибка сервера", status: "error",  error: err.message });
    }
    // твоя логика Все посты сюда
};
// Мои посты
export const mePosts = async (req, res) => {
    // твоя логика Мои посты сюда
    try {
        const myPost = await Post.find({ userId: req.user.id })
        .populate("userId", "name avatar"); // подтягиваем данные юзера
        
        if (!myPost || myPost.length === 0) {
            return res.status(404).json({ msg: "У тебя пока нет постов", status: "error"});
        }
        res.json(myPost);
    } catch (error) {
        console.log(error);
        res.status(500).json({ msg: "Ошибка сервера", status: "error",  error: err.message });
    }
};
// Лайк
export const liked = async (req, res) => {
    // твоя логика Лайк сюда
    try {
        const postId = req.params.id;
        const userId = req.user.id;

        const post = await Post.findById(postId);
        if (!post) return res.status(404).json({ msg: "Пост не найден", status: "error" });

        // если уже лайкнул → убираем
        if (post.likes.includes(userId)) {
            post.likes = post.likes.filter(id => id.toString() !== userId);
        } else {
            post.likes.push(userId);
        }

        await post.save();
        res.json({ likesCount: post.likes.length, liked: post.likes.includes(userId) });
    } catch (error) {
        console.log(error);
        res.status(500).json({ msg: "Ошибка сервера", status: "error" });
    }
};
// Комментарий
export const comment = async (req, res) => {
    // твоя логика Комментарий сюда
    try {
        const postId = req.params.id;
        const userId = req.user.id;
        const commet = req.body.comment

        const post = await Post.findById(postId);
        if (!post) return res.status(404).json({ msg: "Пост не найден", status: "error" });

        const newComment = { userId, text: commet, createdAt: new Date().getTime() };
        post.comments.push(newComment);
        await post.save();
        res.json({ msg: "Комментарий добавлен", status: "success", comment: newComment });
    } catch (error) {
        console.log(error);
        res.status(500).json({ msg: "Ошибка сервера", status: "error" });
    }
};
// Удалить мой пост
export const deletMePost = async (req, res) => {
    // твоя логика Удалить пост сюда
    try {
        const postId = req.params.id
        const post = await Post.findById(postId)
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
    } catch (error) {
        console.log(error);
        res.status(500).json({ msg: "Ошибка сервера", status: "error",  error: err.message });
    }
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