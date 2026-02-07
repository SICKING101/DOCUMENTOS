import fs from 'fs';
import path from 'path';
import cloudinary from '../config/cloudinaryConfig.js';
import Document from '../models/Document.js';

// ============================================================================
// SECCIÓN: SERVICIO DE GESTIÓN DE ARCHIVOS
// ============================================================================
// Este archivo proporciona funcionalidades para manejo de archivos en el
// sistema, incluyendo operaciones con Cloudinary, formato de datos, gestión
// de archivos temporales y construcción de URLs para descarga y visualización.
// ============================================================================

class FileService {
  
  // ********************************************************************
  // MÓDULO 1: FUNCIONES DE FORMATEO DE DATOS
  // ********************************************************************
  // Descripción: Utilidades para presentar datos de archivos de manera
  // legible para usuarios, incluyendo fechas en formato local y tamaños
  // de archivo en unidades comprensibles (Bytes, KB, MB, GB).
  // ********************************************************************

  // ----------------------------------------------------------------
  // BLOQUE 1.1: Formateo de fechas para visualización
  // ----------------------------------------------------------------
  // Convierte objetos Date a cadenas de texto legibles en español
  // con formato largo (ej: "15 de enero de 2024").
  static formatDate(date) {
    if (!date) return '-';
    const d = new Date(date);
    return d.toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
  }

  // ----------------------------------------------------------------
  // BLOQUE 1.2: Formateo de tamaños de archivo
  // ----------------------------------------------------------------
  // Convierte bytes a unidades más legibles (KB, MB, GB) con
  // precisión de 2 decimales y la unidad apropiada.
  static formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // ********************************************************************
  // MÓDULO 2: CONSTRUCCIÓN Y MANIPULACIÓN DE URLS CLOUDINARY
  // ********************************************************************
  // Descripción: Funcionalidades específicas para trabajar con URLs de
  // Cloudinary, incluyendo modificación para forzar descargas y ajuste
  // de extensiones para tipos de archivo específicos como PDF.
  // ********************************************************************

  // ----------------------------------------------------------------
  // BLOQUE 2.1: Construcción de URL para descarga forzada
  // ----------------------------------------------------------------
  // Modifica URLs de Cloudinary para incluir el parámetro fl_attachment
  // que fuerza la descarga del archivo en lugar de mostrarlo en el navegador.
  // También maneja extensiones específicas como .pdf para tipos MIME correctos.
  static buildCloudinaryDownloadURL(url, extension) {
    // ------------------------------------------------------------
    // SUB-BLOQUE 2.1.1: Validación de URL Cloudinary
    // ------------------------------------------------------------
    // Verifica que sea una URL válida de Cloudinary que contenga
    // el patrón /upload/ característico de sus URLs.
    if (!url.includes('/upload/')) return url;

    // ------------------------------------------------------------
    // SUB-BLOQUE 2.1.2: Inserción del parámetro fl_attachment
    // ------------------------------------------------------------
    // Reemplaza /upload/ por /upload/fl_attachment/ para forzar
    // descarga. Maneja tanto URLs con versión (/v123456/) como sin ella.
    let newUrl = url.replace(/\/upload\/(?:v\d+\/)?/, match => {
      return match.replace('upload/', 'upload/fl_attachment/');
    });

    // ------------------------------------------------------------
    // SUB-BLOQUE 2.1.3: Ajuste específico para archivos PDF
    // ------------------------------------------------------------
    // Cloudinary requiere explícitamente la extensión .pdf al final
    // de la URL para archivos PDF. Asegura que esté presente incluso
    // si Cloudinary la omitió originalmente.
    if (extension === 'pdf' && !newUrl.endsWith('.pdf')) {
      if (newUrl.includes('.pdf')) {
        newUrl = newUrl.split('.pdf')[0] + '.pdf';
      } else {
        newUrl += '.pdf';
      }
    }

    return newUrl;
  }

  // ********************************************************************
  // MÓDULO 3: GESTIÓN DE TIPOS MIME Y CONTENIDO
  // ********************************************************************
  // Descripción: Utilidades para determinar tipos MIME correctos basados
  // en extensiones de archivo, asegurando que los navegadores interpreten
  // correctamente los archivos durante descarga o visualización.
  // ********************************************************************

  // ----------------------------------------------------------------
  // BLOQUE 3.1: Obtención de tipo de contenido por extensión
  // ----------------------------------------------------------------
  // Mapea extensiones de archivo comunes a sus correspondientes
  // tipos MIME para configurar correctamente los headers Content-Type
  // en respuestas HTTP de descarga/visualización.
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

  // ********************************************************************
  // MÓDULO 4: LIMPIEZA DE ARCHIVOS TEMPORALES
  // ********************************************************************
  // Descripción: Funciones para gestionar archivos temporales creados
  // durante procesos de subida o procesamiento, evitando acumulación
  // de archivos no utilizados en el sistema de archivos del servidor.
  // ********************************************************************

  // ----------------------------------------------------------------
  // BLOQUE 4.1: Eliminación segura de archivos temporales
  // ----------------------------------------------------------------
  // Elimina archivos temporales del sistema de archivos después de su
  // uso (ej: después de subir a Cloudinary). Incluye validación de
  // existencia y manejo de errores para evitar fallos en el proceso.
  static cleanTempFile(filePath) {
    // ------------------------------------------------------------
    // SUB-BLOQUE 4.1.1: Validación de existencia del archivo
    // ------------------------------------------------------------
    // Verifica que el archivo exista antes de intentar eliminarlo,
    // evitando errores por rutas inválidas o archivos ya eliminados.
    if (filePath && fs.existsSync(filePath)) {
      try {
        // --------------------------------------------------------
        // SUB-BLOQUE 4.1.2: Eliminación síncrona del archivo
        // --------------------------------------------------------
        fs.unlinkSync(filePath);
        console.log('🧹 Archivo temporal eliminado:', filePath);
      } catch (error) {
        console.error('❌ Error eliminando archivo temporal:', error);
      }
    }
  }

  // ********************************************************************
  // MÓDULO 5: OPERACIONES CON CLOUDINARY
  // ********************************************************************
  // Descripción: Funciones para interactuar con la API de Cloudinary
  // para subida, eliminación y gestión de archivos en la nube.
  // ********************************************************************

  // ----------------------------------------------------------------
  // BLOQUE 5.1: Subida de archivos a Cloudinary
  // ----------------------------------------------------------------
  // Sube un archivo desde el sistema de archivos local a Cloudinary
  // con opciones configurables como carpeta de destino y tipo de recurso.
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

  // ----------------------------------------------------------------
  // BLOQUE 5.2: Eliminación de archivos de Cloudinary
  // ----------------------------------------------------------------
  // Elimina un archivo de Cloudinary usando su public_id.
  // Maneja errores silenciosamente para no interrumpir flujos donde
  // el archivo podría haber sido eliminado previamente o no existir.
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