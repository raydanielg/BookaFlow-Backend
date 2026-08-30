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
  const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif", "image/svg+xml"]
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true)
  } else {
    cb(null, false)
  }
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
})

// Multer error handler wrapper
function uploadMiddleware(middleware) {
  return (req, res, next) => {
    middleware(req, res, (err) => {
      if (err) {
        console.error("[uploads] Multer error:", err.message)
        return res.status(400).json({ error: err.message })
      }
      next()
    })
  }
}

// POST /api/uploads/image — upload single image (auth required)
router.post("/image", authMiddleware, uploadMiddleware(upload.single("image")), (req, res) => {
  console.log("[uploads] req.file:", req.file ? req.file.originalname : "NONE")
  console.log("[uploads] content-type:", req.headers["content-type"])
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
router.post("/images", authMiddleware, uploadMiddleware(upload.array("images", 10)), (req, res) => {
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
