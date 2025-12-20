import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import path from 'path';
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import postRoutes from "./routes/postRoutes.js";
import convertRoutes from "./routes/convertRoutes.js";

dotenv.config();
const app = express();
app.use(express.json());
// app.use(cors({ origin: "http://localhost:3000", credentials: true }));
// app.use(cors({ origin: "https://site-nu-liart.vercel.app", credentials: true }));
const allowedOrigins = [
  "http://localhost:3000",
  "https://site-nu-liart.vercel.app",
  "https://me-app-two.vercel.app"
];

app.use(
  cors({
    origin: function (origin, callback) {
      // Если запрос без origin (например, Postman) – разрешаем
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      } else {
        return callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

// Статика для отдачи сконвертированных изображений
app.use(express.static(path.join(process.cwd(), 'public')));

// маршруты
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/convert", convertRoutes);
app.get("/api/start", async (req, res) => {
  const response = {
    message: "Server is running",
    status: true
  };
  res.json(response);
});

// старт сервера
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB connected");
    app.listen(process.env.PORT, () =>
      console.log(`🚀 Server running on port ${process.env.PORT}`)
    );
  })
  .catch(err => console.error("❌ MongoDB error:", err));
