const cds = require('@sap/cds');
const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
const { Readable } = require('stream');

// Hàm hỗ trợ chuyển buffer thành stream
function bufferToStream(buffer) {
  const readable = new Readable({
    read() {
      this.push(buffer);
      this.push(null);
    }
  });
  return readable;
}

// Cấu hình Cloudinary
function configureCloudinary() {
  // Lấy cấu hình từ cds.env
  const config = cds.env.requires.cloudinary.credentials;
  cloudinary.config({
    cloud_name: config.cloud_name,
    api_key: config.api_key,
    api_secret: config.api_secret
  });
}

// Upload ảnh lên Cloudinary
async function uploadToCloudinary(fileBuffer, fileName) {
  return new Promise((resolve, reject) => {
    // Tạo unique public_id dựa vào timestamp
    const publicId = `tour_${Date.now()}_${fileName.replace(/\.\w+$/, '')}`;
    
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'tour_images',
        public_id: publicId,
        resource_type: 'image'
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );

    // Pipe buffer thành stream vào uploadStream
    bufferToStream(fileBuffer).pipe(uploadStream);
  });
}

// Middleware để xử lý upload ảnh
function uploadMiddleware(req, res, next) {
  upload.single('file')(req, res, async (err) => {
    if (err) {
      return res.status(400).json({
        error: true,
        message: `Upload error: ${err.message}`
      });
    }

    // Nếu không có file
    if (!req.file) {
      return res.status(400).json({
        error: true,
        message: 'No file was uploaded'
      });
    }

    try {
      // Upload file lên Cloudinary
      const result = await uploadToCloudinary(req.file.buffer, req.file.originalname);
      
      // Trả về thông tin upload thành công
      res.json({
        success: true,
        url: result.secure_url,
        public_id: result.public_id,
        fileName: req.file.originalname,
        fileSize: req.file.size
      });
    } catch (error) {
      console.error('Error uploading to Cloudinary:', error);
      res.status(500).json({
        error: true,
        message: `Cloudinary upload failed: ${error.message}`
      });
    }
  });
}

module.exports = {
  configureCloudinary,
  uploadMiddleware
};