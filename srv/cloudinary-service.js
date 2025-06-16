// srv/cloudinary-service.js
const cds = require('@sap/cds');
const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const { Readable } = require('stream');

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});

function bufferToStream(buffer) {
  return new Readable({
    read() {
      this.push(buffer);
      this.push(null);
    }
  });
}

module.exports = (srv) => {
  console.log('Cloudinary service module called');
  
  const cloudConfig = {
    cloud_name: 'dpx8zy9gp',
    api_key: '526765971232184',
    api_secret: 'EVmlefCgKpI0Ftbgj5VLnxJTl-4'
  };
  
  cloudinary.config(cloudConfig);
  console.log('Cloudinary configured');
  
  cds.on('served', () => {
    console.log('=== CLOUDINARY SERVICE: CDS SERVED ===');
    
    if (!cds.app) {
      console.error('CRITICAL: cds.app is not available!');
      return;
    }
    
    console.log('Registering Cloudinary endpoints...');
    
    try {
      // Upload endpoint với support cho cả multipart và raw binary
      cds.app.post('/api/cloudinary/upload', (req, res) => {
        console.log('=== CLOUDINARY UPLOAD ENDPOINT HIT ===');
        console.log('Method:', req.method);
        console.log('Content-Type:', req.headers['content-type']);
        console.log('Content-Length:', req.headers['content-length']);
        
        const contentType = req.headers['content-type'] || '';
        
        // Kiểm tra xem có phải raw binary không
        if (contentType.startsWith('image/') || contentType.startsWith('application/octet-stream')) {
          console.log('Processing as RAW BINARY upload');
          
          // Xử lý raw binary data
          let chunks = [];
          let totalSize = 0;
          
          req.on('data', (chunk) => {
            chunks.push(chunk);
            totalSize += chunk.length;
            console.log(`Received chunk: ${chunk.length} bytes, total: ${totalSize} bytes`);
          });
          
          req.on('end', async () => {
            try {
              console.log(`Raw binary upload complete: ${totalSize} bytes`);
              
              if (totalSize === 0) {
                return res.status(400).json({
                  error: true,
                  message: 'No data received'
                });
              }
              
              // Combine all chunks into single buffer
              const fileBuffer = Buffer.concat(chunks);
              console.log(`Combined buffer size: ${fileBuffer.length} bytes`);
              
              // Extract filename từ query params hoặc headers
              const fileName = req.query.filename || 
                               req.headers['x-filename'] || 
                               req.headers['x-file-name'] ||
                               `upload_${Date.now()}.${getExtensionFromMimeType(contentType)}`;
              
              console.log('Processing file:', fileName);
              
              // Upload to Cloudinary
              const result = await uploadToCloudinary(fileBuffer, fileName);
              
              console.log('Upload successful:', result.public_id);
              
              res.json({
                success: true,
                url: result.secure_url,
                public_id: result.public_id,
                fileName: fileName,
                fileSize: fileBuffer.length,
                width: result.width,
                height: result.height
              });
              
            } catch (error) {
              console.error('Raw binary upload error:', error);
              res.status(500).json({
                error: true,
                message: `Raw upload failed: ${error.message}`
              });
            }
          });
          
          req.on('error', (error) => {
            console.error('Request error:', error);
            res.status(500).json({
              error: true,
              message: `Request error: ${error.message}`
            });
          });
          
        } else if (contentType.includes('multipart/form-data')) {
          console.log('Processing as MULTIPART upload');
          
          // Xử lý multipart form data
          const uploadAny = upload.any();
          
          uploadAny(req, res, async (err) => {
            console.log('=== MULTER CALLBACK ===');
            
            if (err) {
              console.error('Multer error:', err);
              return res.status(400).json({
                error: true,
                message: `Multer error: ${err.message}`
              });
            }
            
            console.log('Files count:', req.files ? req.files.length : 0);
            
            let fileToUpload = null;
            
            if (req.files && req.files.length > 0) {
              fileToUpload = req.files[0];
            } else if (req.file) {
              fileToUpload = req.file;
            }
            
            if (!fileToUpload) {
              return res.status(400).json({
                error: true,
                message: 'Không có file nào được upload trong multipart'
              });
            }
            
            try {
              const result = await uploadToCloudinary(fileToUpload.buffer, fileToUpload.originalname);
              
              res.json({
                success: true,
                url: result.secure_url,
                public_id: result.public_id,
                fileName: fileToUpload.originalname,
                fileSize: fileToUpload.size
              });
              
            } catch (error) {
              console.error('Multipart upload error:', error);
              res.status(500).json({
                error: true,
                message: `Multipart upload failed: ${error.message}`
              });
            }
          });
          
        } else {
          console.log('Unsupported content type:', contentType);
          res.status(400).json({
            error: true,
            message: `Unsupported content type: ${contentType}`
          });
        }
      });
      
      console.log('Cloudinary endpoints registered successfully');
      
    } catch (error) {
      console.error('Error registering Cloudinary endpoints:', error);
    }
  });
  
  // Helper function để upload lên Cloudinary
  async function uploadToCloudinary(buffer, fileName) {
    return new Promise((resolve, reject) => {
      const publicId = `tour_${Date.now()}_${fileName.replace(/\.[^/.]+$/, "")}`;
      
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'tour_images',
          public_id: publicId,
          resource_type: 'image',
          quality: 'auto',
          fetch_format: 'auto'
        },
        (error, result) => {
          if (error) {
            console.error('Cloudinary error:', error);
            return reject(error);
          }
          console.log('Cloudinary success:', result.public_id);
          resolve(result);
        }
      );
      
      bufferToStream(buffer).pipe(uploadStream);
    });
  }
  
  // Helper function để lấy extension từ MIME type
  function getExtensionFromMimeType(mimeType) {
    const mimeMap = {
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/png': 'png',
      'image/gif': 'gif',
      'image/webp': 'webp',
      'image/bmp': 'bmp',
      'image/tiff': 'tiff'
    };
    return mimeMap[mimeType] || 'jpg';
  }
};