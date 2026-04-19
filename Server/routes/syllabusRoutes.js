// routes/syllabusRoutes.js
const express  = require('express');
const multer   = require('multer');
const path     = require('path');
const fs       = require('fs');
const router   = express.Router();

const SyllabusMaterial = require('../models/SyllabusMaterial');
const { protect, restrictTo } = require('../middleware/auth');

// ── Multer disk storage ─────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const dir = path.join(__dirname, '../uploads/syllabus');
    fs.mkdirSync(dir, { recursive: true });   // auto-create folder if missing
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}-${file.originalname}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },   // 20 MB cap
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true);
    else cb(new Error('Only PDF files are allowed.'));
  },
});

// POST /api/syllabus/upload  (Faculty only)
router.post(
  '/upload',
  protect,
  restrictTo('Faculty'),
  upload.single('pdf'),
  async (req, res) => {
    try {
      const { subjectCode, subjectName } = req.body;
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'No PDF file uploaded.' });
      }

      const material = await SyllabusMaterial.create({
        subjectCode,
        subjectName,
        filename:     req.file.filename,
        originalName: req.file.originalname,
        uploader:     req.user._id,
        uploaderName: req.user.name,
        filePath:     req.file.path,
        fileSize:     req.file.size,
      });

      res.status(201).json({ success: true, data: material });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

// GET /api/syllabus/materials/:subjectCode  (any authenticated user)
router.get('/materials/:subjectCode', protect, async (req, res) => {
  try {
    const materials = await SyllabusMaterial
      .find({ subjectCode: req.params.subjectCode })
      .sort({ createdAt: -1 });
    res.json({ success: true, data: materials });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/syllabus/file/:filename  — stream / download the actual PDF
router.get('/file/:filename', protect, (req, res) => {
  const filePath = path.join(__dirname, '../uploads/syllabus', req.params.filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ success: false, message: 'File not found.' });
  }
  // Strip the timestamp prefix so the downloaded file has a clean name
  const cleanName = req.params.filename.replace(/^\d+-\d+-/, '');
  res.download(filePath, cleanName);
});

module.exports = router;
