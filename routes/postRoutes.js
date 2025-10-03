import { Router } from "express";
import { 
    createPost, 
    all, 
    mePosts, 
    liked,
    comment,
    deletMePost, 
    deletMePosts 
} from '../controllers/postController.js'
import authMiddleware from "../middleware/authMiddleware.js";
import upload from "../middleware/upload.js";

const router = Router();

router.post("/me", authMiddleware, upload.single("image"), createPost);
router.get("/all", all);
router.get("/me", authMiddleware, mePosts);
router.post("/:id/like", authMiddleware, liked);
router.post("/:id/comment", authMiddleware, comment);
router.delete("/me/:id", authMiddleware, deletMePost);
router.delete("/all", authMiddleware, deletMePosts);

export default router;