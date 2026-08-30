const express = require("express")
const multer = require("multer")
const path = require("path")
const fs = require("fs")
const { authMiddleware } = require("../middleware/auth")

const router = express.Router()

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, "../../uploads")
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true })
}

// Multer storage config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir)
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase()
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`
    cb(null, uniqueName)
  },
})

const fileFilter = (req, file, cb) => {
  const allowed = [".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg"]
  const ext = path.extname(file.originalname).toLowerCase()
  if (allowed.includes(ext)) {
    cb(null, true)
  } else {
    cb(new Error("Only image files are allowed (jpg, jpeg, png, webp, gif, svg)"), false)
  }
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
})

// POST /api/uploads/image — upload single image (auth required)
router.post("/image", authMiddleware, upload.single("image"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" })
  }

  // Return the public URL path
  const fileUrl = `/uploads/${req.file.filename}`
  res.status(201).json({
    message: "Image uploaded successfully",
    url: fileUrl,
    filename: req.file.filename,
    size: req.file.size,
  })
})

// POST /api/uploads/images — upload multiple images (auth required, max 10)
router.post("/images", authMiddleware, upload.array("images", 10), (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: "No files uploaded" })
  }

  const urls = req.files.map((file) => `/uploads/${file.filename}`)
  res.status(201).json({
    message: `${req.files.length} images uploaded successfully`,
    urls,
  })
})

module.exports = router
