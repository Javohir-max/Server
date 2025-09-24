import { Router } from "express";
import { createPost, all, mePosts, deletMePost, deletMePosts } from '../controllers/postController.js'
import authMiddleware from "../middleware/authMiddleware.js";
import upload from "../middleware/upload.js";

const router = Router();

router.post("/me", authMiddleware, upload.single("image"), createPost);
router.get("/all", all);
router.get("/me", authMiddleware, mePosts);
router.delete("/me", authMiddleware, deletMePost);
router.delete("/all", authMiddleware, deletMePosts);

export default router;