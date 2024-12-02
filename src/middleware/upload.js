const multer = require('multer');
const path = require('path');

const storage = multer.memoryStorage(); // Usamos memoryStorage para manejar el archivo como un buffer

const fileFilter = (req, file, cb) => {
  // Verificar que el archivo sea una imagen
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('El archivo debe ser una imagen'), false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 50 * 1024 * 1024 } // Limitar el tamaño a 50MB
});


module.exports = upload;