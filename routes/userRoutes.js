import { Router } from "express";
import { update, all, delet } from '../controllers/userController.js'
import authMiddleware from "../middleware/authMiddleware.js";
import upload from "../middleware/upload.js";

const router = Router();

router.put("/me", authMiddleware, upload.single("avatar"), update);
router.get("/all", authMiddleware, all);
router.delete("/me", authMiddleware, delet);

export default router;