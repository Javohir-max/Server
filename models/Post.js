import mongoose from "mongoose";

const postSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  title: { type: String, required: true },
  postImg: { type: String }, // путь до изображения поста
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model("Post", postSchema);
