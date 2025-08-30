import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  avatar: { type: String }, // путь до аватарки
  imageName: { type: String , required: true} 
});

export default mongoose.model("User", userSchema);
