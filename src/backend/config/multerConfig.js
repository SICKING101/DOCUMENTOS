import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';

// Obtener __dirname en ES Modules
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
    const safeName = Date.now() + '-' + Math.round(Math.random() * 1E9) + '-' + file.originalname;
    cb(null, safeName);
  }
});

const allowedTypes = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'txt', 'jpg', 'jpeg', 'png'];

function createUpload({ fileSizeBytes }) {
  return multer({
    storage,
    limits: { fileSize: fileSizeBytes },
    fileFilter: (req, file, cb) => {
      const fileExtension = file.originalname.split('.').pop().toLowerCase();

      if (allowedTypes.includes(fileExtension)) {
        cb(null, true);
      } else {
        cb(new Error('Tipo de archivo no permitido'), false);
      }
    }
  });
}

// Documentos: 1GB
export const uploadDocuments = createUpload({ fileSizeBytes: 1024 * 1024 * 1024 });

// Otros (ej: tickets/soporte): mantener límite anterior (10MB)
export const uploadSmallFiles = createUpload({ fileSizeBytes: 10 * 1024 * 1024 });

// Compat: mantener default export como el upload de documentos
export default uploadDocuments;