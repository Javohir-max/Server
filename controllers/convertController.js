import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

// Конвертация любого изображения в JPG
export const convert = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded', status: 'error' });

    const buffer = fs.readFileSync(req.file.path);

    // Конвертируем в JPG
    const jpgBuffer = await sharp(buffer)
      .jpeg({ quality: 90 })
      .toBuffer();

    const outputFileName = `${path.parse(req.file.originalname).name}.jpg`;
    const outputPath = path.join('public', outputFileName);

    fs.writeFileSync(outputPath, jpgBuffer);

    res.json({ url: `/${outputFileName}`, status: 'success'});
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Conversion failed', status: 'error' });
  }
};
