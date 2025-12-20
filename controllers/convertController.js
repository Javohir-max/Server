import archiver from 'archiver'
import sharp from 'sharp'
import fs from 'fs'
import path from 'path'

export const convert = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded', status: 'error' })
    }

    // гарантируем наличие папки public
    const publicDir = path.join(process.cwd(), 'public')
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true })
    }

    const buffer = fs.readFileSync(req.file.path)

    // безопасное имя файла (без кириллицы и пробелов)
    const safeName =
      Date.now() + '-' +
      path.parse(req.file.originalname).name
        .replace(/[^a-z0-9]/gi, '_')
        .toLowerCase()

    const outputFileName = `${safeName}.jpg`
    const outputPath = path.join(publicDir, outputFileName)

    await sharp(buffer)
      .jpeg({ quality: 90 })
      .toFile(outputPath)

    res.json({ url: `/${outputFileName}`, status: 'success' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Conversion failed', status: 'error' })
  }
}

export const download = (req, res) => {
  const filePath = path.join(process.cwd(), 'public', req.params.name)

  res.download(filePath) // ← magic here
}

export const downloadZip = (req, res) => {
  const files = req.query.files?.split(',')
  if (!files || files.length === 0) {
    return res.status(400).json({ error: 'No files provided' })
  }

  res.setHeader('Content-Type', 'application/zip')
  res.setHeader(
    'Content-Disposition',
    'attachment; filename="images.zip"'
  )

  const archive = archiver('zip', { zlib: { level: 9 } })
  archive.pipe(res)

  for (const file of files) {
    const filePath = path.join(process.cwd(), 'public', file)
    if (fs.existsSync(filePath)) {
      archive.file(filePath, { name: file })
    }
  }

  archive.finalize()
}
