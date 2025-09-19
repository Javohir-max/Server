import { Router } from "express";
import { createPost, all } from '../controllers/postController.js'
import authMiddleware from "../middleware/authMiddleware.js";
import upload from "../middleware/upload.js";

const router = Router();

router.post("/me", authMiddleware, upload.single("image"), createPost);
router.get("/all", authMiddleware, all);

export default router;