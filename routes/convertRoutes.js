import { Router } from "express";
import multer from "multer";
import { convert, download } from '../controllers/convertController.js';

const router = Router();
const upload = multer({ dest: 'uploads/' }); // временная папка для загрузки файлов

router.post("/image", upload.single('file'), convert);
router.get("/download:name", download);

export default router;
