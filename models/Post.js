import mongoose from "mongoose";

const postSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  title: { type: String, required: true },
  image: { type: String }, // путь до изображения поста
  createdAt: { type: Date, default: Date.now },
  postImgName: { type: String , required: true},
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }]
});

export default mongoose.model("Post", postSchema);
