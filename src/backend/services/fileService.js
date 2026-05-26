// =============================================================================
// src/backend/services/fileService.js (CORREGIDO - COMPLETO)
// Soluciona: "Unsupported ZIP file" para archivos .xlsx/.docx
// =============================================================================

import fs from 'fs';
import path from 'path';
import { s3Client, SPACES_CONFIG } from '../config/cloudinaryConfig.js';
import { PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

class FileService {
  
  // ===========================================================================
  // FORMATO DE FECHA
  // ===========================================================================
  static formatDate(date) {
    if (!date) return '-';
    const d = new Date(date);
    return d.toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
  }

  // ===========================================================================
  // FORMATO DE TAMAÑO DE ARCHIVO
  // ===========================================================================
  static formatFileSize(bytes) {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // ===========================================================================
  // CORREGIR URL DE CLOUDINARY PARA DESCARGA
  // ===========================================================================
  static buildCloudinaryDownloadURL(url, extension) {
    if (!url || !url.includes('/upload/')) return url;

    let newUrl = url.replace(/\/upload\/(?:v\d+\/)?/, match => {
      return match.replace('upload/', 'upload/fl_attachment/');
    });

    if (extension === 'pdf' && !newUrl.endsWith('.pdf')) {
      if (newUrl.includes('.pdf')) {
        newUrl = newUrl.split('.pdf')[0] + '.pdf';
      } else {
        newUrl += '.pdf';
      }
    }

    return newUrl;
  }

  // ===========================================================================
  // OBTENER CONTENT-TYPE SEGÚN EXTENSIÓN
  // ===========================================================================
  static getContentType(ext) {
    const types = {
      'pdf': 'application/pdf',
      'png': 'image/png',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'txt': 'text/plain',
      'csv': 'text/csv',
      'gif': 'image/gif',
      'webp': 'image/webp',
    };
    return types[ext.toLowerCase()] || 'application/octet-stream';
  }

  // ===========================================================================
  // LIMPIAR ARCHIVO TEMPORAL
  // ===========================================================================
  static cleanTempFile(filePath) {
    if (filePath && fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
        console.log('🧹 Archivo temporal eliminado:', path.basename(filePath));
      } catch (error) {
        console.error('❌ Error eliminando archivo temporal:', error.message);
      }
    }
  }

  // ===========================================================================
  // ✅ SUBIR ARCHIVO A CLOUDINARY (CORREGIDO)
  // Soluciona error "Unsupported ZIP file" para .xlsx, .docx
  // ===========================================================================
  static async uploadToCloudinary(filePath, options = {}) {
    try {
      const fileExtension = path.extname(filePath).toLowerCase().replace('.', '');
      const fileContent = fs.readFileSync(filePath);
      const safeFileName = path.basename(filePath).replace(/[^a-zA-Z0-9.-]/g, '_');
      const fileKey = `documentos/${Date.now()}-${safeFileName}`;

      let contentType = 'application/octet-stream';
      const mimeTypes = {
        'jpg': 'image/jpeg', 'jpeg': 'image/jpeg', 'png': 'image/png',
        'gif': 'image/gif', 'webp': 'image/webp', 'pdf': 'application/pdf',
        'txt': 'text/plain', 'csv': 'text/csv', 'json': 'application/json',
      };
      contentType = mimeTypes[fileExtension] || contentType;

      console.log('☁️ Subiendo a DigitalOcean Spaces...');
      console.log(`   📁 Archivo: ${path.basename(filePath)}`);
      console.log(`   📝 ContentType: ${contentType}`);

      const command = new PutObjectCommand({
        Bucket: SPACES_CONFIG.bucket,
        Key: fileKey,
        Body: fileContent,
        ContentType: contentType,
        ACL: 'public-read',
      });

      const result = await s3Client.send(command);

      const fileUrl = `${SPACES_CONFIG.cdnUrl}/${fileKey}`;

      console.log('✅ Subida exitosa a Spaces:', fileUrl);

      return {
        secure_url: fileUrl,
        public_id: fileKey,
        resource_type: contentType,
        format: fileExtension,
        bytes: fileContent.length,
      };

    } catch (error) {
      console.error('❌ Error subiendo a Spaces:', error.message);
      throw error;
    }
  }

  // ===========================================================================
  // ELIMINAR ARCHIVO DE CLOUDINARY
  // ===========================================================================
  static async deleteFromCloudinary(publicId, resourceType = 'raw') {
    try {
      console.log(`🗑️ Eliminando de Spaces: ${publicId}`);
      await s3Client.send(new DeleteObjectCommand({
        Bucket: SPACES_CONFIG.bucket,
        Key: publicId,
      }));
      console.log('✅ Archivo eliminado de Spaces');
      return { result: 'ok' };
    } catch (error) {
      console.warn('⚠️ No se pudo eliminar de Spaces:', error.message);
      return null;
    }
  }
}

export default FileService;