// =============================================================================
// src/backend/config/multerConfig.js (SIN OFFICE)
// Solo permite: PDF, imágenes y texto
// =============================================================================

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const timestamp = Date.now();
    const random = Math.round(Math.random() * 1E9);
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const fileName = `${timestamp}-${random}-${safeName}`;
    cb(null, fileName);
  }
});

// ✅ SOLO formatos que Cloudinary gratis acepta bien
const allowedExtensions = ['pdf', 'txt', 'csv', 'jpg', 'jpeg', 'png'];

function createUpload({ fileSizeBytes }) {
  return multer({
    storage,
    limits: { 
      fileSize: fileSizeBytes,
      files: 1
    },
    fileFilter: (req, file, cb) => {
      const fileExtension = file.originalname.split('.').pop().toLowerCase();

      if (allowedExtensions.includes(fileExtension)) {
        cb(null, true);
      } else {
        const error = new Error(`Tipo de archivo no permitido: .${fileExtension}. Formatos aceptados: PDF, TXT, CSV, JPG, PNG`);
        error.code = 'INVALID_FILE_TYPE';
        return cb(error, false);
      }
    }
  });
}

// 10MB para Cloudinary free
export const uploadDocuments = createUpload({ fileSizeBytes: 10 * 1024 * 1024 });

export const uploadSmallFiles = createUpload({ fileSizeBytes: 10 * 1024 * 1024 });

export default uploadDocuments;