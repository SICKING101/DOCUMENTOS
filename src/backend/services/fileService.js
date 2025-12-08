import fs from 'fs';
import path from 'path';
import cloudinary from '../config/cloudinaryConfig.js';
import Document from '../models/Document.js';

class FileService {
  // Función auxiliar para formatear fechas
  static formatDate(date) {
    if (!date) return '-';
    const d = new Date(date);
    return d.toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
  }

  // Función auxiliar para formatear tamaño de archivo
  static formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Función: Corregir URL para descarga desde Cloudinary
  static buildCloudinaryDownloadURL(url, extension) {
    if (!url.includes('/upload/')) return url;

    // Inserta fl_attachment incluso si existe /v123456/
    let newUrl = url.replace(/\/upload\/(?:v\d+\/)?/, match => {
      return match.replace('upload/', 'upload/fl_attachment/');
    });

    // Cloudinary requiere .pdf al final para PDFs
    if (extension === 'pdf' && !newUrl.endsWith('.pdf')) {
      if (newUrl.includes('.pdf')) {
        newUrl = newUrl.split('.pdf')[0] + '.pdf';
      } else {
        newUrl += '.pdf';
      }
    }

    return newUrl;
  }

  // Obtener tipo de contenido
  static getContentType(ext) {
    const types = {
      'pdf': 'application/pdf',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'xls': 'application/vnd.ms-excel',
      'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'txt': 'text/plain',
      'csv': 'text/csv',
      'rtf': 'application/rtf',
      'png': 'image/png',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'gif': 'image/gif',
      'webp': 'image/webp',
      'bmp': 'image/bmp'
    };

    return types[ext.toLowerCase()] || 'application/octet-stream';
  }

  // Limpiar archivo temporal
  static cleanTempFile(filePath) {
    if (filePath && fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
        console.log('🧹 Archivo temporal eliminado:', filePath);
      } catch (error) {
        console.error('❌ Error eliminando archivo temporal:', error);
      }
    }
  }

  // Subir archivo a Cloudinary
  static async uploadToCloudinary(filePath, options = {}) {
    try {
      const result = await cloudinary.uploader.upload(filePath, {
        folder: 'documentos_cbtis051',
        resource_type: 'auto',
        ...options
      });
      return result;
    } catch (error) {
      console.error('❌ Error subiendo a Cloudinary:', error);
      throw error;
    }
  }

  // Eliminar archivo de Cloudinary
  static async deleteFromCloudinary(publicId, resourceType = 'auto') {
    try {
      const result = await cloudinary.uploader.destroy(publicId, {
        resource_type: resourceType
      });
      return result;
    } catch (error) {
      console.warn('⚠️ No se pudo eliminar de Cloudinary:', error);
      return null;
    }
  }
}


export default FileService;