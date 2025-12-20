import { Router } from "express";
import multer from "multer";
import { convert, download, downloadZip } from '../controllers/convertController.js';

const router = Router();
const upload = multer({ dest: 'uploads/' }); // временная папка для загрузки файлов

router.post("/image", upload.single('file'), convert);
router.get("/download/:name", download);
router.get("/download-zip", downloadZip);

export default router;
