import multer from "multer";

const storage = multer.memoryStorage(); // сохраняем файл в память
const upload = multer({ storage });

export default upload;
