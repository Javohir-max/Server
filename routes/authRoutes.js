import { Router } from "express";
import {
  register,
  login,
  refresh,
  logout,
  me,
  resetPassword,
  changePassword
} from "../controllers/authController.js";
import authMiddleware from "../middleware/authMiddleware.js";
import upload from "../middleware/upload.js";

const router = Router();

router.post("/register", upload.single("avatar"), register);
router.post("/login", login);
router.post("/refresh", refresh);
router.post("/logout", authMiddleware, logout);
router.get("/me", authMiddleware, me);
router.post("/reset-password", resetPassword);
router.put("/change-password", changePassword);

export default router;
