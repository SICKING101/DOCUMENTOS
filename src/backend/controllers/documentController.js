// src/backend/controllers/documentController.js
import { DeleteObjectCommand } from '@aws-sdk/client-s3';
import mongoose from 'mongoose';
import Document from '../models/Document.js';
import { s3Client, SPACES_CONFIG } from '../config/cloudinaryConfig.js';
import FileService from '../services/fileService.js';
import NotificationService from '../services/notificationService.js';
import { PERMISSIONS, hasPermission } from '../config/permissions.js';
import AuditService from '../services/auditService.js';

// =============================================================================
// FUNCIONES AUXILIARES (fuera de la clase)
// =============================================================================

function canBypassApprovalGate(role) {
  return hasPermission(role, PERMISSIONS.APPROVE_DOCUMENTS) || hasPermission(role, PERMISSIONS.UPLOAD_DOCUMENTS);
}

function canAccessDocumentByStatus(role, status) {
  return true;
}

/**
 * Actualiza los contadores de categorías padre recursivamente
 * @param {string} categoryId - ID de la categoría
 * @param {number} delta - Cambio en el contador (+1 o -1)
 */
async function updateParentCategoryCounts(categoryId, delta) {
  try {
    const Category = mongoose.model('Category');
    const category = await Category.findById(categoryId);
    
    if (category && category.parent_id) {
      await Category.findByIdAndUpdate(category.parent_id, {
        $inc: { documentCount: delta }
      });
      
      // Recursivamente actualizar padres
      await updateParentCategoryCounts(category.parent_id, delta);
    }
  } catch (error) {
    console.warn('⚠️ Error actualizando contadores padre:', error.message);
  }
}

// =============================================================================
// CLASE PRINCIPAL
// =============================================================================

class DocumentController {
  
  // ===========================================================================
  // OBTENER TODOS LOS DOCUMENTOS
  // ===========================================================================
  static async getAll(req, res) {
    try {
      console.log('📋 DocumentController.getAll - Iniciando');
      console.log('🏫 req.schoolId:', req.schoolId || 'superadmin (sin filtro)');

      const filter = {
        activo: true,
        $or: [
          { isDeleted: false },
          { isDeleted: { $exists: false } }
        ]
      };

      if (req.schoolId) {
        filter.schoolId = req.schoolId;
      }

      const documents = await Document.find(filter)
        .populate('persona_id', 'nombre email departamento puesto')
        .sort({ fecha_subida: -1 });

      console.log(`✅ ${documents.length} documentos encontrados`);
      res.json({ success: true, documents });
    } catch (error) {
      console.error('❌ Error obteniendo documentos:', error);
      res.status(500).json({ success: false, message: 'Error al obtener documentos' });
    }
  }

  // ===========================================================================
  // CREAR/SUBIR DOCUMENTO
  // ===========================================================================
  static async create(req, res) {
    console.log('\n🔍 ========== SUBIENDO NUEVO DOCUMENTO ==========');
    console.log('🏫 School ID:', req.schoolId || 'superadmin');
    console.log('📁 Archivo:', req.file?.originalname);
    console.log('📏 Tamaño:', req.file?.size ? FileService.formatFileSize(req.file.size) : 'N/A');

    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No se ha subido ningún archivo'
        });
      }

      const { descripcion, categoria, fecha_vencimiento, persona_id } = req.body;

      const MAX_SIZE = 10 * 1024 * 1024;
      if (req.file.size > MAX_SIZE) {
        FileService.cleanTempFile(req.file.path);
        console.warn(`⚠️ Archivo excede 10MB: ${FileService.formatFileSize(req.file.size)}`);
        return res.status(400).json({
          success: false,
          message: `El archivo excede el límite de 10 MB (tamaño: ${FileService.formatFileSize(req.file.size)})`
        });
      }

      const fileExtension = req.file.originalname.split('.').pop().toLowerCase();
      const officeExtensions = ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'];
      const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'];

      let resourceType = 'auto';
      if (officeExtensions.includes(fileExtension)) {
        resourceType = 'raw';
      } else if (imageExtensions.includes(fileExtension)) {
        resourceType = 'image';
      } else if (fileExtension === 'pdf') {
        resourceType = 'auto';
      } else {
        resourceType = 'raw';
      }

      let cloudinaryResult;
      try {
        cloudinaryResult = await FileService.uploadToCloudinary(req.file.path, {
          resource_type: resourceType
        });
        console.log('✅ Cloudinary OK:', {
          url: cloudinaryResult.secure_url?.substring(0, 60) + '...',
          format: cloudinaryResult.format
        });
      } catch (cloudinaryError) {
        FileService.cleanTempFile(req.file.path);
        console.error('❌ Error Cloudinary:', cloudinaryError.message);
        return res.status(500).json({
          success: false,
          message: 'Error al subir el archivo a la nube: ' + cloudinaryError.message
        });
      }

      const nuevoDocumento = new Document({
        nombre_original: req.file.originalname,
        tipo_archivo: fileExtension,
        tamano_archivo: req.file.size,
        descripcion: descripcion || '',
        categoria: categoria || 'General',
        fecha_vencimiento: fecha_vencimiento || null,
        persona_id: persona_id || null,
        cloudinary_url: cloudinaryResult.secure_url,
        public_id: cloudinaryResult.public_id,
        resource_type: cloudinaryResult.resource_type,
        status: 'approved',
        schoolId: req.schoolId || 'superadmin',
        uploadedBy: req.user?._id || null
      });

      await nuevoDocumento.save();
      console.log('✅ Documento guardado en MongoDB:', nuevoDocumento._id);

      FileService.cleanTempFile(req.file.path);

      const documentoConPersona = await Document.findById(nuevoDocumento._id)
        .populate('persona_id', 'nombre email departamento puesto');

      try {
        await NotificationService.documentoSubido(
          documentoConPersona,
          documentoConPersona.persona_id,
          req.schoolId
        );
        console.log('✅ Notificación de subida creada');
      } catch (notifError) {
        console.error('⚠️ Error creando notificación:', notifError.message);
      }

      try {
        await AuditService.logDocumentUpload(req, nuevoDocumento, documentoConPersona?.persona_id);
        console.log('✅ Auditoría registrada');
      } catch (auditError) {
        console.error('⚠️ Error registrando auditoría:', auditError.message);
      }

      console.log('✅✅✅ SUBIDA COMPLETADA');
      console.log('🔍 ========== FIN ==========\n');

      return res.json({
        success: true,
        message: 'Documento subido correctamente',
        document: documentoConPersona
      });

    } catch (error) {
      console.error('🔥 ERROR CRÍTICO en create:', error.message);
      console.error('📌 Stack:', error.stack);

      if (req.file && req.file.path) {
        FileService.cleanTempFile(req.file.path);
      }

      let errorMsg = 'Error al subir documento';
      if (error.code === 11000) {
        errorMsg = 'Ya existe un documento con ese nombre';
      } else if (error.name === 'ValidationError') {
        const messages = Object.values(error.errors).map(e => e.message).join(', ');
        errorMsg = 'Datos del documento inválidos: ' + messages;
      }

      return res.status(500).json({
        success: false,
        message: errorMsg
      });
    }
  }

  // ===========================================================================
  // APROBAR DOCUMENTO
  // ===========================================================================
  static async approve(req, res) {
    console.log('\n🔍 ========== APROBANDO DOCUMENTO ==========');
    console.log('📝 ID:', req.params.id);
    console.log('👤 Usuario:', req.user?.usuario);

    try {
      const { id } = req.params;
      const { comment } = req.body || {};

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, message: 'ID inválido' });
      }

      const documento = await Document.findOne({ _id: id, activo: true });
      if (!documento) {
        return res.status(404).json({ success: false, message: 'Documento no encontrado' });
      }

      documento.status = 'approved';
      documento.reviewedAt = new Date();
      documento.reviewedBy = req.user?.usuario || req.user?.correo || 'Revisor';
      documento.reviewComment = comment ? String(comment) : '';
      await documento.save();

      console.log('✅ Documento aprobado:', documento.nombre_original);

      try {
        await AuditService.logDocumentApprove(req, documento, comment);
        console.log('✅✅✅ APROBACIÓN REGISTRADA');
      } catch (auditError) {
        console.error('❌ Error registrando aprobación:', auditError.message);
      }

      return res.json({
        success: true,
        message: 'Documento aprobado',
        document: documento
      });
    } catch (error) {
      console.error('🔥 Error aprobando documento:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al aprobar documento: ' + error.message
      });
    }
  }

  // ===========================================================================
  // RECHAZAR DOCUMENTO
  // ===========================================================================
  static async reject(req, res) {
    console.log('\n🔍 ========== RECHAZANDO DOCUMENTO ==========');
    console.log('📝 ID:', req.params.id);
    console.log('👤 Usuario:', req.user?.usuario);

    try {
      const { id } = req.params;
      const { comment } = req.body || {};

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, message: 'ID inválido' });
      }

      const documento = await Document.findOne({ _id: id, activo: true });
      if (!documento) {
        return res.status(404).json({ success: false, message: 'Documento no encontrado' });
      }

      documento.status = 'rejected';
      documento.reviewedAt = new Date();
      documento.reviewedBy = req.user?.usuario || req.user?.correo || 'Revisor';
      documento.reviewComment = comment ? String(comment) : '';
      documento.isDeleted = true;
      documento.deletedAt = new Date();
      documento.deletedBy = req.user?.usuario || req.user?.correo || 'Sistema';
      await documento.save();

      console.log('✅ Documento rechazado:', documento.nombre_original);

      try {
        await AuditService.logDocumentReject(req, documento, comment);
        console.log('✅✅✅ RECHAZO REGISTRADO');
      } catch (auditError) {
        console.error('❌ Error registrando rechazo:', auditError.message);
      }

      return res.json({
        success: true,
        message: 'Documento rechazado',
        document: documento
      });
    } catch (error) {
      console.error('🔥 Error rechazando documento:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al rechazar documento: ' + error.message
      });
    }
  }

  // ===========================================================================
  // VISTA PREVIA DE DOCUMENTO
  // ===========================================================================
  static async preview(req, res) {
    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, message: 'ID inválido' });
      }

      const documento = await Document.findOne({ _id: id, activo: true });

      if (!documento) {
        return res.status(404).json({ success: false, message: 'Documento no encontrado' });
      }

      const role = req.user?.rol;
      if (!canAccessDocumentByStatus(role, documento.status)) {
        return res.status(403).json({
          success: false,
          message: 'No tienes permisos para ver este documento.'
        });
      }

      if (!documento.cloudinary_url) {
        return res.status(500).json({
          success: false,
          message: 'URL del documento no disponible'
        });
      }

      console.log('👁️ Vista previa para:', documento.nombre_original);
      res.redirect(documento.cloudinary_url);

    } catch (error) {
      console.error('❌ Error en vista previa:', error);
      res.status(500).json({
        success: false,
        message: 'Error al cargar vista previa: ' + error.message
      });
    }
  }

  // ===========================================================================
  // ELIMINAR DOCUMENTO (SOFT DELETE)
  // ===========================================================================
  static async delete(req, res) {
    try {
      const { id } = req.params;
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, message: 'ID inválido' });
      }

      const filter = { _id: id, activo: true };
      if (req.schoolId) filter.schoolId = req.schoolId;

      const documento = await Document.findOne(filter);
      if (!documento) {
        return res.status(404).json({ success: false, message: 'Documento no encontrado' });
      }

      documento.isDeleted = true;
      documento.deletedAt = new Date();
      documento.deletedBy = req.user?.usuario || 'Usuario';
      await documento.save();

      try {
        await NotificationService.documentoEliminado(
          documento.nombre_original,
          documento.categoria,
          req.user?.usuario || 'Usuario',
          req.schoolId
        );
      } catch (notifError) {
        console.error('⚠️ Error creando notificación:', notifError.message);
      }

      res.json({ success: true, message: 'Documento eliminado correctamente' });
    } catch (error) {
      console.error('🔥 Error eliminando documento:', error);
      res.status(500).json({ success: false, message: 'Error al eliminar documento' });
    }
  }

  // ===========================================================================
  // DESCARGA DE DOCUMENTO
  // ===========================================================================
  static async download(req, res) {
    console.log('📥 ====== INICIO ENDPOINT DESCARGA ======');

    try {
      const { id } = req.params;
      const { filename } = req.query;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, message: 'ID de documento inválido' });
      }

      const documento = await Document.findOne({ _id: id, activo: true })
        .populate('persona_id', 'nombre');

      if (!documento) {
        return res.status(404).json({ success: false, message: 'Documento no encontrado' });
      }

      const role = req.user?.rol;
      if (!canAccessDocumentByStatus(role, documento.status)) {
        return res.status(403).json({
          success: false,
          message: 'No tienes permisos para descargar este documento.'
        });
      }

      const fileName = filename || documento.nombre_original;
      const cloudinaryUrl = documento.cloudinary_url || documento.url_cloudinary;
      const fileExtension = fileName.split('.').pop().toLowerCase();

      if (!cloudinaryUrl) {
        return res.status(404).json({ success: false, message: 'URL de archivo no disponible' });
      }

      AuditService.logDocumentDownload(req, documento)
        .catch(err => console.error('❌ Error registrando descarga:', err.message));

      const isImage = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp'].includes(fileExtension);

      if (isImage) {
        let finalUrl = cloudinaryUrl.replace('/upload/', '/upload/fl_attachment/');
        return res.redirect(finalUrl);
      }

      let response = await DocumentController.tryFetch(cloudinaryUrl);

      if (!response.ok) {
        const modifiedUrl = FileService.buildCloudinaryDownloadURL(cloudinaryUrl, fileExtension);
        response = await DocumentController.tryFetch(modifiedUrl);

        if (!response.ok) {
          res.setHeader('Content-Type', FileService.getContentType(fileExtension));
          res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
          return res.redirect(cloudinaryUrl);
        }
      }

      await DocumentController.processAndSendFile(response, res, fileName, fileExtension);

    } catch (error) {
      console.error('❌ ERROR CRÍTICO:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno en la descarga',
        error: error.message
      });
    } finally {
      console.log('📥 ====== FIN ENDPOINT DESCARGA ======');
    }
  }

  // ===========================================================================
  // MÉTODOS AUXILIARES PARA DESCARGA
  // ===========================================================================
  static async tryFetch(url) {
    try {
      const { default: fetch } = await import('node-fetch');
      return await fetch(url, {
        method: 'GET',
        headers: { 'User-Agent': 'Mozilla/5.0' },
        timeout: 30000
      });
    } catch (err) {
      console.error('❌ Error en fetch:', err);
      return { ok: false, status: 0 };
    }
  }

  static async processAndSendFile(fetchResponse, res, fileName, fileExtension) {
    const buffer = await fetchResponse.arrayBuffer();
    const nodeBuffer = Buffer.from(buffer);

    if (nodeBuffer.length === 0) throw new Error('Buffer vacío');

    if (fileExtension === 'pdf') {
      const firstBytes = nodeBuffer.slice(0, 5).toString();
      if (!firstBytes.includes('%PDF')) throw new Error('Respuesta inválida para PDF');
    }

    const contentType = FileService.getContentType(fileExtension);
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', nodeBuffer.length);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
    return res.end(nodeBuffer);
  }

  // ===========================================================================
  // OBTENER CONTENIDO DE ARCHIVO DE TEXTO
  // ===========================================================================
  static async getContent(req, res) {
    try {
      const { id } = req.params;
      const { limit = 50000 } = req.query;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, message: 'ID de documento inválido' });
      }

      const documento = await Document.findOne({ _id: id, activo: true });
      if (!documento) {
        return res.status(404).json({ success: false, message: 'Documento no encontrado' });
      }

      const role = req.user?.rol;
      if (!canAccessDocumentByStatus(role, documento.status)) {
        return res.status(403).json({
          success: false,
          message: 'No tienes permisos para acceder a este documento.'
        });
      }

      const extension = documento.nombre_original.split('.').pop().toLowerCase();
      const textExtensions = ['txt', 'csv', 'json', 'xml', 'html', 'htm', 'js', 'css', 'md'];

      if (!textExtensions.includes(extension)) {
        return res.status(400).json({
          success: false,
          message: 'Este tipo de archivo no puede ser previsualizado como texto'
        });
      }

      const cloudinaryUrl = documento.cloudinary_url;
      if (!cloudinaryUrl) {
        return res.status(500).json({ success: false, message: 'URL del archivo no disponible' });
      }

      let finalUrl = cloudinaryUrl;
      if (cloudinaryUrl.includes('cloudinary.com') && !cloudinaryUrl.includes('/raw/')) {
        finalUrl = cloudinaryUrl.replace('/upload/', '/upload/fl_attachment/');
      }

      const { default: fetch } = await import('node-fetch');
      const response = await fetch(finalUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });

      if (!response.ok) throw new Error(`Error al descargar desde Cloudinary: ${response.status}`);

      const buffer = await response.arrayBuffer();
      if (buffer.byteLength === 0) {
        return res.status(500).json({ success: false, message: 'El archivo está vacío' });
      }

      let textContent;
      try {
        textContent = new TextDecoder('utf-8').decode(buffer);
      } catch (utf8Error) {
        try {
          textContent = new TextDecoder('latin-1').decode(buffer);
        } catch (latinError) {
          return res.status(500).json({
            success: false,
            message: 'No se pudo decodificar el contenido del archivo'
          });
        }
      }

      const maxLength = parseInt(limit);
      let isTruncated = false;
      if (textContent.length > maxLength) {
        textContent = textContent.substring(0, maxLength);
        isTruncated = true;
      }

      let contentType = 'text/plain; charset=utf-8';
      if (extension === 'html' || extension === 'htm') contentType = 'text/html; charset=utf-8';
      if (extension === 'json') contentType = 'application/json; charset=utf-8';
      if (extension === 'xml') contentType = 'application/xml; charset=utf-8';
      if (extension === 'css') contentType = 'text/css; charset=utf-8';
      if (extension === 'js') contentType = 'application/javascript; charset=utf-8';
      if (extension === 'csv') contentType = 'text/csv; charset=utf-8';
      if (extension === 'md') contentType = 'text/markdown; charset=utf-8';

      res.setHeader('Content-Type', contentType);
      res.setHeader('X-File-Name', encodeURIComponent(documento.nombre_original));
      res.setHeader('X-File-Size', buffer.byteLength);
      res.setHeader('X-Content-Length', textContent.length);
      if (isTruncated) {
        res.setHeader('X-Content-Truncated', 'true');
        res.setHeader('X-Original-Length', buffer.byteLength);
      }

      res.send(textContent);
      console.log(`✅ Contenido enviado: ${textContent.length} caracteres`);

    } catch (error) {
      console.error('❌ Error en endpoint de contenido:', error);
      res.setHeader('Content-Type', 'application/json');
      res.status(500).json({
        success: false,
        message: 'Error al obtener contenido: ' + error.message
      });
    }
  }

  // ===========================================================================
  // OBTENER INFORMACIÓN DEL DOCUMENTO
  // ===========================================================================
  static async getInfo(req, res) {
    try {
      const { id } = req.params;

      const documento = await Document.findOne({ _id: id, activo: true })
        .populate('persona_id', 'nombre email departamento puesto');

      if (!documento) {
        return res.status(404).json({ success: false, message: 'Documento no encontrado' });
      }

      const role = req.user?.rol;
      if (!canAccessDocumentByStatus(role, documento.status)) {
        return res.status(403).json({
          success: false,
          message: 'No tienes permisos para acceder a este documento.'
        });
      }

      res.json({
        success: true,
        document: {
          id: documento._id,
          nombre_original: documento.nombre_original,
          tipo_archivo: documento.tipo_archivo,
          tamano_archivo: documento.tamano_archivo,
          descripcion: documento.descripcion,
          categoria: documento.categoria,
          fecha_subida: documento.fecha_subida,
          fecha_vencimiento: documento.fecha_vencimiento,
          persona: documento.persona_id,
          cloudinary_url: documento.cloudinary_url,
          public_id: documento.public_id,
          resource_type: documento.resource_type,
          status: documento.status,
          reviewedAt: documento.reviewedAt,
          reviewedBy: documento.reviewedBy
        }
      });

    } catch (error) {
      console.error('Error obteniendo info del documento:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener información del documento: ' + error.message
      });
    }
  }

  // ===========================================================================
  // ACTUALIZAR DOCUMENTO (RENOVAR O EDITAR)
  // ===========================================================================
  static async update(req, res) {
    console.log('\n🔍 ========== ACTUALIZANDO DOCUMENTO ==========');
    console.log('📝 ID:', req.params.id);
    console.log('👤 Usuario:', req.user?.usuario);

    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, message: 'ID inválido' });
      }

      const documentoOriginal = await Document.findOne({ _id: id, activo: true });
      if (!documentoOriginal) {
        return res.status(404).json({ success: false, message: 'Documento no encontrado' });
      }

      const beforeState = {
        nombre_original: documentoOriginal.nombre_original,
        tipo_archivo: documentoOriginal.tipo_archivo,
        tamano_archivo: documentoOriginal.tamano_archivo,
        descripcion: documentoOriginal.descripcion,
        categoria: documentoOriginal.categoria,
        fecha_vencimiento: documentoOriginal.fecha_vencimiento,
        persona_id: documentoOriginal.persona_id?.toString() || null,
        cloudinary_url: documentoOriginal.cloudinary_url,
        public_id: documentoOriginal.public_id,
        status: documentoOriginal.status
      };

      let archivoReemplazado = false;

      if (req.file) {
        archivoReemplazado = true;
        try {
          if (documentoOriginal.public_id) {
            await s3Client.send(new DeleteObjectCommand({
              Bucket: SPACES_CONFIG.bucket,
              Key: documentoOriginal.public_id,
            }));
          }

          const cloudinaryResult = await FileService.uploadToCloudinary(req.file.path);
          documentoOriginal.nombre_original = req.file.originalname;
          documentoOriginal.tipo_archivo = req.file.originalname.split('.').pop().toLowerCase();
          documentoOriginal.tamano_archivo = req.file.size;
          documentoOriginal.cloudinary_url = cloudinaryResult.secure_url;
          documentoOriginal.public_id = cloudinaryResult.public_id;
          documentoOriginal.resource_type = cloudinaryResult.resource_type;

          FileService.cleanTempFile(req.file.path);
        } catch (uploadError) {
          if (req.file?.path) FileService.cleanTempFile(req.file.path);
          return res.status(500).json({
            success: false,
            message: 'Error al subir el nuevo archivo: ' + uploadError.message
          });
        }
      }

      const { descripcion, categoria, fecha_vencimiento, persona_id } = req.body;
      if (descripcion !== undefined) documentoOriginal.descripcion = descripcion;
      if (categoria !== undefined) documentoOriginal.categoria = categoria;
      if (fecha_vencimiento !== undefined) documentoOriginal.fecha_vencimiento = fecha_vencimiento || null;
      if (persona_id !== undefined) documentoOriginal.persona_id = persona_id || null;

      await documentoOriginal.save();

      const documentoActualizado = await Document.findById(documentoOriginal._id)
        .populate('persona_id', 'nombre');

      try {
        const afterState = {
          nombre_original: documentoOriginal.nombre_original,
          tipo_archivo: documentoOriginal.tipo_archivo,
          tamano_archivo: documentoOriginal.tamano_archivo,
          descripcion: documentoOriginal.descripcion,
          categoria: documentoOriginal.categoria,
          fecha_vencimiento: documentoOriginal.fecha_vencimiento,
          persona_id: documentoOriginal.persona_id?.toString() || null,
          cloudinary_url: documentoOriginal.cloudinary_url,
          public_id: documentoOriginal.public_id,
          status: documentoOriginal.status
        };

        const camposModificados = [];
        for (const key in beforeState) {
          if (beforeState[key] !== afterState[key]) camposModificados.push(key);
        }
        if (archivoReemplazado) camposModificados.push('archivo');

        await AuditService.logDocumentUpdate(req, documentoActualizado, beforeState, afterState, camposModificados);
      } catch (auditError) {
        console.error('❌ Error registrando actualización:', auditError.message);
      }

      try {
        await NotificationService.create({
          titulo: 'Documento actualizado',
          mensaje: `El documento "${documentoOriginal.nombre_original}" ha sido actualizado`,
          tipo: 'info',
          categoria: 'documento'
        });
      } catch (notifError) {
        console.error('⚠️ Error creando notificación:', notifError.message);
      }

      console.log('✅✅✅ ACTUALIZACIÓN COMPLETADA\n');
      res.json({
        success: true,
        message: 'Documento actualizado correctamente',
        document: documentoActualizado
      });

    } catch (error) {
      console.error('🔥 Error actualizando documento:', error);
      if (req.file?.path) FileService.cleanTempFile(req.file.path);
      res.status(500).json({
        success: false,
        message: 'Error al actualizar documento: ' + error.message
      });
    }
  }

  // ===========================================================================
  // MOVER DOCUMENTO A OTRA CARPETA
  // ===========================================================================
  static async moveToFolder(req, res) {
    console.log('\n🚀 ========== MOVIENDO DOCUMENTO A CARPETA ==========');
    console.log('📝 Document ID:', req.params.id);
    console.log('📁 Folder ID:', req.body.folder_id);
    console.log('👤 Usuario:', req.user?.usuario);
    console.log('🏫 School ID:', req.schoolId);

    try {
      const { id } = req.params;
      const { folder_id } = req.body;

      // ── 1. VALIDACIONES INICIALES ─────────────────────────────────────────
      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'ID de documento es requerido'
        });
      }

      // folder_id debe estar presente en el body (puede ser null para raíz)
      if (folder_id === undefined) {
        return res.status(400).json({
          success: false,
          message: 'folder_id es requerido (puede ser null para mover a raíz)'
        });
      }

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: 'ID de documento inválido'
        });
      }

      if (folder_id && !mongoose.Types.ObjectId.isValid(folder_id)) {
        return res.status(400).json({
          success: false,
          message: 'ID de carpeta inválido'
        });
      }

      // ── 2. BUSCAR EL DOCUMENTO ────────────────────────────────────────────
      const documento = await Document.findOne({
        _id: id,
        activo: true,
        schoolId: req.schoolId
      });

      if (!documento) {
        return res.status(404).json({
          success: false,
          message: 'Documento no encontrado o no pertenece a esta escuela'
        });
      }

      console.log('📄 Documento encontrado:', {
        id: documento._id,
        nombre: documento.nombre_original,
        folderActual: documento.folder_id || 'raíz',
        categoria: documento.categoria
      });

      // ── 3. VALIDAR CARPETA DESTINO ────────────────────────────────────────
      let folderDestino = null;
      const Category = mongoose.model('Category');

      if (folder_id) {
        folderDestino = await Category.findOne({
          _id: folder_id,
          activo: true,
          schoolId: req.schoolId
        });

        if (!folderDestino) {
          return res.status(404).json({
            success: false,
            message: 'Carpeta destino no encontrada o no pertenece a esta escuela'
          });
        }

        console.log('📁 Carpeta destino:', {
          id: folderDestino._id,
          nombre: folderDestino.nombre
        });

        // Verificar que no sea la misma carpeta
        if (documento.folder_id?.toString() === folder_id) {
          return res.status(400).json({
            success: false,
            message: 'El documento ya se encuentra en esta carpeta'
          });
        }
      } else {
        console.log('📁 Moviendo a raíz (sin carpeta)');
        
        // Verificar que no esté ya en la raíz
        if (!documento.folder_id) {
          return res.status(400).json({
            success: false,
            message: 'El documento ya se encuentra en la raíz'
          });
        }
      }

      // ── 4. GUARDAR ESTADO ANTERIOR ────────────────────────────────────────
      const folderAnterior = documento.folder_id;
      const categoriaAnterior = documento.categoria;

      let nombreFolderAnterior = 'Raíz';
      if (folderAnterior) {
        try {
          const folderAnt = await Category.findById(folderAnterior);
          if (folderAnt) nombreFolderAnterior = folderAnt.nombre;
        } catch (e) {
          console.warn('⚠️ No se pudo obtener nombre de carpeta anterior:', e.message);
        }
      }

      // ── 5. ACTUALIZAR DOCUMENTO ───────────────────────────────────────────
      if (folder_id) {
        documento.folder_id = folder_id;
        documento.categoria = folderDestino.nombre;
      } else {
        documento.folder_id = null;
        documento.categoria = 'General';
      }

      documento.updatedAt = new Date();
      await documento.save();

      console.log('✅ Documento actualizado:', {
        folderAnterior: nombreFolderAnterior,
        folderNuevo: folderDestino?.nombre || 'Raíz',
        categoriaAnterior,
        categoriaNueva: documento.categoria
      });

      // ── 6. ACTUALIZAR CONTADORES ──────────────────────────────────────────
      try {
        // Decrementar carpeta anterior
        if (folderAnterior) {
          await Category.findByIdAndUpdate(folderAnterior, {
            $inc: { documentCount: -1 }
          });
        }

        // Incrementar carpeta nueva
        if (folder_id) {
          await Category.findByIdAndUpdate(folder_id, {
            $inc: { documentCount: 1 }
          });
          
          // Actualizar padres recursivamente
          await updateParentCategoryCounts(folder_id, 1);
        }
      } catch (countError) {
        console.warn('⚠️ Error actualizando contadores:', countError.message);
      }

      // ── 7. DATOS PARA RESPUESTA ───────────────────────────────────────────
      const documentoActualizado = await Document.findById(id)
        .populate('persona_id', 'nombre email departamento puesto')
        .lean();

      const categoriasActualizadas = await Category.find({
        activo: true,
        schoolId: req.schoolId
      })
        .select('nombre descripcion color icon parent_id documentCount')
        .lean();

      // ── 8. AUDITORÍA ──────────────────────────────────────────────────────
      try {
        if (typeof AuditService?.logDocumentMove === 'function') {
          await AuditService.logDocumentMove(
            req,
            documentoActualizado,
            {
              folder_id: folderAnterior,
              categoria: categoriaAnterior,
              nombreFolder: nombreFolderAnterior
            },
            {
              folder_id: folder_id || null,
              categoria: documento.categoria,
              nombreFolder: folderDestino?.nombre || 'Raíz'
            }
          );
          console.log('✅ Auditoría registrada');
        }
      } catch (auditError) {
        console.warn('⚠️ Error registrando auditoría:', auditError.message);
      }

      // ── 9. RESPUESTA EXITOSA ──────────────────────────────────────────────
      console.log('✅ ========== MOVIMIENTO COMPLETADO ==========\n');

      const nombreDestino = folderDestino?.nombre || 'Raíz';

      return res.json({
        success: true,
        message: `Documento movido exitosamente a "${nombreDestino}"`,
        document: documentoActualizado,
        categories: categoriasActualizadas,
        movement: {
          from: {
            folder_id: folderAnterior || null,
            folder_name: nombreFolderAnterior,
            category: categoriaAnterior
          },
          to: {
            folder_id: folder_id || null,
            folder_name: nombreDestino,
            category: documento.categoria
          },
          movedBy: req.user?.usuario || 'Sistema',
          movedAt: new Date().toISOString()
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('🔥 ERROR CRÍTICO en moveToFolder:', error.message);
      console.error('📌 Stack:', error.stack);

      if (error.name === 'CastError') {
        return res.status(400).json({
          success: false,
          message: 'Error en el formato de los datos proporcionados'
        });
      }

      if (error.name === 'ValidationError') {
        const messages = Object.values(error.errors).map(e => e.message).join(', ');
        return res.status(400).json({
          success: false,
          message: 'Error de validación: ' + messages
        });
      }

      return res.status(500).json({
        success: false,
        message: 'Error interno al mover el documento: ' + error.message
      });
    }
  }

  // ===========================================================================
  // ELIMINACIÓN MÚLTIPLE DE DOCUMENTOS
  // ===========================================================================
  static async bulkDelete(req, res) {
    console.log('\n🔍 ========== ELIMINACIÓN MÚLTIPLE DE DOCUMENTOS ==========');
    console.log('👤 Usuario:', req.user?.usuario);

    try {
      const { document_ids } = req.body;

      if (!document_ids || !Array.isArray(document_ids) || document_ids.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Se requiere un array de IDs de documentos'
        });
      }

      const validIds = document_ids.filter(id => mongoose.Types.ObjectId.isValid(id));

      if (validIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No se proporcionaron IDs válidos'
        });
      }

      const documentos = await Document.find({
        _id: { $in: validIds },
        activo: true,
        isDeleted: { $ne: true }
      });

      if (documentos.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'No se encontraron documentos para eliminar'
        });
      }

      const foundIds = documentos.map(doc => doc._id.toString());
      const notFoundIds = validIds.filter(id => !foundIds.includes(id));

      const now = new Date();
      const deletedBy = req.user?.usuario || req.user?.correo || 'Usuario';

      await Document.updateMany(
        { _id: { $in: foundIds } },
        {
          $set: {
            isDeleted: true,
            deletedAt: now,
            deletedBy: deletedBy
          }
        }
      );

      try {
        for (const doc of documentos) {
          await AuditService.logDocumentDelete(req, doc, true);
        }
      } catch (auditError) {
        console.error('❌ Error registrando auditoría:', auditError.message);
      }

      console.log('✅✅✅ ELIMINACIÓN MÚLTIPLE COMPLETADA\n');

      return res.json({
        success: true,
        message: `${documentos.length} de ${document_ids.length} documentos eliminados correctamente`,
        deleted: documentos.length,
        total: document_ids.length,
        notFound: notFoundIds,
        results: {
          successful: documentos.map(d => d._id),
          failed: notFoundIds
        }
      });

    } catch (error) {
      console.error('🔥 Error en eliminación múltiple:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al eliminar documentos: ' + error.message
      });
    }
  }
}

export default DocumentController;