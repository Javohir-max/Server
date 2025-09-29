import { Router } from "express";
import { update, all, delet, follow } from '../controllers/userController.js'
import authMiddleware from "../middleware/authMiddleware.js";
import upload from "../middleware/upload.js";

const router = Router();

router.put("/me", authMiddleware, upload.single("avatar"), update);
router.get("/all", authMiddleware, all);
router.post("/:id/follow", authMiddleware, follow);
router.delete("/me", authMiddleware, delet);

export default router;