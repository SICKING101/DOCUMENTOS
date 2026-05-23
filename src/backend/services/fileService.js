// =============================================================================
// src/backend/services/fileService.js (CORREGIDO - COMPLETO)
// Soluciona: "Unsupported ZIP file" para archivos .xlsx/.docx
// =============================================================================

import fs from 'fs';
import path from 'path';
import cloudinary from '../config/cloudinaryConfig.js';

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
      // ✅ Detectar extensión del archivo
      const fileExtension = path.extname(filePath).toLowerCase().replace('.', '');
      
      // ✅ Determinar resource_type correcto según extensión
      let resourceType = options.resource_type || 'auto';
      
      if (resourceType === 'auto') {
        const officeExtensions = ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'];
        const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'];
        const textExtensions = ['txt', 'csv', 'json', 'xml', 'html', 'css', 'js', 'md'];
        
        if (officeExtensions.includes(fileExtension)) {
          resourceType = 'raw'; // ✅ CRÍTICO: Office usa 'raw' para evitar error ZIP
          console.log(`📎 Archivo Office (${fileExtension}) → resource_type: raw`);
        } else if (imageExtensions.includes(fileExtension)) {
          resourceType = 'image';
          console.log(`🖼️ Imagen (${fileExtension}) → resource_type: image`);
        } else if (fileExtension === 'pdf') {
          resourceType = 'auto';
          console.log(`📄 PDF → resource_type: auto`);
        } else if (textExtensions.includes(fileExtension)) {
          resourceType = 'raw';
          console.log(`📝 Texto (${fileExtension}) → resource_type: raw`);
        } else {
          resourceType = 'raw'; // Por defecto usar raw para tipos desconocidos
          console.log(`❓ Desconocido (${fileExtension}) → resource_type: raw (por defecto)`);
        }
      }
      
      console.log('☁️ Subiendo a Cloudinary...');
      console.log(`   📁 Archivo: ${path.basename(filePath)}`);
      console.log(`   🔧 resource_type: ${resourceType}`);
      
      const uploadOptions = {
        folder: 'documentos_cbtis051',
        resource_type: resourceType,
        use_filename: true,
        unique_filename: true,
        overwrite: false,
        timeout: 60000 // 60 segundos máximo
      };
      
      const result = await cloudinary.uploader.upload(filePath, uploadOptions);
      
      console.log('✅ Subida exitosa a Cloudinary:', {
        public_id: result.public_id,
        format: result.format,
        resource_type: result.resource_type,
        bytes: result.bytes,
        url: result.secure_url ? result.secure_url.substring(0, 80) + '...' : 'N/A'
      });
      
      return result;
      
    } catch (error) {
      console.error('❌ Error subiendo a Cloudinary:', {
        message: error.message,
        http_code: error.http_code,
        name: error.name
      });
      
      // Errores específicos con mensajes claros para el usuario
      if (error.http_code === 400) {
        if (error.message.includes('Unsupported ZIP')) {
          throw new Error('Error al procesar el archivo. Los archivos de Office (.xlsx, .docx) requieren configuración especial. Contacta al administrador.');
        }
        throw new Error('Formato de archivo no soportado por el servicio de almacenamiento.');
      } else if (error.http_code === 401) {
        throw new Error('Error de autenticación con el servicio de almacenamiento.');
      } else if (error.http_code === 413) {
        throw new Error('El archivo es demasiado grande. Máximo permitido: 10 MB.');
      } else if (error.http_code === 429) {
        throw new Error('Se ha excedido el límite de subidas. Intenta de nuevo en unos minutos.');
      }
      
      throw error;
    }
  }

  // ===========================================================================
  // ELIMINAR ARCHIVO DE CLOUDINARY
  // ===========================================================================
  static async deleteFromCloudinary(publicId, resourceType = 'raw') {
    try {
      console.log(`🗑️ Eliminando de Cloudinary: ${publicId} (tipo: ${resourceType})`);
      const result = await cloudinary.uploader.destroy(publicId, {
        resource_type: resourceType
      });
      console.log('✅ Resultado eliminación:', result);
      return result;
    } catch (error) {
      console.warn('⚠️ No se pudo eliminar de Cloudinary:', error.message);
      return null;
    }
  }
}

export default FileService;