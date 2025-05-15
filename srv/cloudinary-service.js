const cds = require('@sap/cds');
const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
const { Readable } = require('stream');

// Hàm hỗ trợ chuyển buffer thành stream
function bufferToStream(buffer) {
  return new Readable({
    read() {
      this.push(buffer);
      this.push(null);
    }
  });
}

module.exports = (srv) => {
  // Cấu hình Cloudinary từ biến môi trường
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
  
  // Đảm bảo rằng cds.app tồn tại
  if (cds.app) {
    // Endpoint upload ảnh lên Cloudinary
    cds.app.post('/api/cloudinary/upload', upload.single('file'), async (req, res) => {
      if (!req.file) {
        return res.status(400).json({
          error: true,
          message: 'Không có file nào được upload'
        });
      }
      
      try {
        // Upload file lên Cloudinary
        const uploadPromise = new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            {
              folder: 'tour_images',
              public_id: `tour_${Date.now()}`,
              resource_type: 'image'
            },
            (error, result) => {
              if (error) return reject(error);
              resolve(result);
            }
          );
          
          // Pipe buffer thành stream
          bufferToStream(req.file.buffer).pipe(uploadStream);
        });
        
        // Đợi kết quả upload
        const result = await uploadPromise;
        
        // Trả về kết quả cho client
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
          message: `Upload failed: ${error.message}`
        });
      }
    });
    
    // Endpoint xóa ảnh trên Cloudinary
    cds.app.delete('/api/cloudinary/delete/:publicId', async (req, res) => {
      const publicId = req.params.publicId;
      
      if (!publicId) {
        return res.status(400).json({
          error: true,
          message: 'Public ID không được cung cấp'
        });
      }
      
      try {
        // Xóa ảnh từ Cloudinary
        const result = await cloudinary.uploader.destroy(publicId);
        
        if (result.result === 'ok') {
          res.json({
            success: true,
            message: 'Ảnh đã được xóa thành công từ Cloudinary'
          });
        } else {
          res.status(400).json({
            error: true,
            message: `Không thể xóa ảnh: ${result.result}`
          });
        }
      } catch (error) {
        console.error('Error deleting from Cloudinary:', error);
        res.status(500).json({
          error: true,
          message: `Xóa thất bại: ${error.message}`
        });
      }
    });
  } else {
    console.warn('cds.app not available, Cloudinary endpoints not registered');
  }
};