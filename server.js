const express = require('express');
const multer = require('multer');
const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');
const cron = require('node-cron');
const url = require('url');

const app = express();
const PORT = process.env.PORT || 3000;
const FILE_EXPIRY_HOURS = 48;

// Create uploads directory
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Store file metadata (in production, use a database)
const fileStore = new Map();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueId = uuidv4();
    const ext = path.extname(file.originalname);
    const filename = uniqueId + ext;
    cb(null, filename);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB limit
});

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Clean up expired files
function cleanupExpiredFiles() {
  const now = Date.now();
  const expiryTime = FILE_EXPIRY_HOURS * 60 * 60 * 1000;
  
  for (const [fileId, fileData] of fileStore.entries()) {
    if (now - fileData.uploadTime > expiryTime) {
      const filePath = path.join(uploadsDir, fileData.filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`Deleted expired file: ${fileData.originalName}`);
      }
      fileStore.delete(fileId);
    }
  }
}

// Run cleanup every 5 minutes
cron.schedule('*/5 * * * *', cleanupExpiredFiles);

// API: Upload file
app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const fileId = path.parse(req.file.filename).name;
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const downloadUrl = `${baseUrl}/download/${fileId}`;
    
    // Generate QR code
    const qrCodeDataUrl = await QRCode.toDataURL(downloadUrl, {
      width: 256,
      margin: 2,
      color: { dark: '#333333', light: '#ffffff' }
    });

    // Store file metadata
    fileStore.set(fileId, {
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      uploadTime: Date.now(),
      mimetype: req.file.mimetype
    });

    res.json({
      success: true,
      fileId: fileId,
      originalName: req.file.originalname,
      size: formatFileSize(req.file.size),
      downloadUrl: downloadUrl,
      qrCode: qrCodeDataUrl,
      expiresIn: `${FILE_EXPIRY_HOURS} hour(s)`
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
});

// API: Get file info
app.get('/api/file/:fileId', (req, res) => {
  const fileId = req.params.fileId;
  const fileData = fileStore.get(fileId);
  
  if (!fileData) {
    return res.status(404).json({ error: 'File not found or expired' });
  }
  
  res.json({
    originalName: fileData.originalName,
    size: formatFileSize(fileData.size),
    expiresIn: `${FILE_EXPIRY_HOURS} hour(s)`
  });
});

// API: Download file
app.get('/download/:fileId', (req, res) => {
  const fileId = req.params.fileId;
  const fileData = fileStore.get(fileId);
  
  if (!fileData) {
    return res.status(404).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>File Not Found</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
                 display: flex; justify-content: center; align-items: center; min-height: 100vh; 
                 margin: 0; background: #f5f5f5; }
          .container { text-align: center; padding: 40px; background: white; border-radius: 12px;
                       box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
          h1 { color: #e74c3c; margin-bottom: 10px; }
          p { color: #666; }
          a { display: inline-block; margin-top: 20px; padding: 12px 24px; background: #3498db;
              color: white; text-decoration: none; border-radius: 6px; }
          a:hover { background: #2980b9; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>File Not Found</h1>
          <p>The file has expired or does not exist.</p>
          <a href="/">Go to Home</a>
        </div>
      </body>
      </html>
    `);
  }
  
  const filePath = path.join(uploadsDir, fileData.filename);
  res.download(filePath, fileData.originalName);
});

// Helper function
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

app.listen(PORT, () => {
  console.log(`FileShare server running at http://localhost:${PORT}`);
});
