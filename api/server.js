const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 4000;

const uploadDir = path.join(__dirname, 'uploads/images');
fs.mkdirSync(uploadDir, { recursive: true });

const ACCEPTED_FORMATS = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/jpg'];
const MAX_SIZE = 200 * 1024; // 200kB

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: MAX_SIZE },
  fileFilter: (req, file, cb) => {
    if (!ACCEPTED_FORMATS.includes(file.mimetype)) {
      return cb(new Error('Only jpg, jpeg, png, webp, gif files are allowed!'), false);
    }
    cb(null, true);
  }
});

app.use(cors());

app.post('/microcement/api/upload-image', (req, res) => {
  upload.single('image')(req, res, function (err) {
    console.log("Ivan POST response: ", res)
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'File too large. Max size is 200kB.' });
      }
      return res.status(400).json({ error: err.message });
    } else if (err) {
      return res.status(400).json({ error: err.message });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    res.json({ filePath: `/uploads/images/${req.file.filename}` });
  });
});

app.use('/uploads/images', express.static(uploadDir));

app.listen(PORT, () => {
  console.log(`Image upload server running on port ${PORT}`);
}); 