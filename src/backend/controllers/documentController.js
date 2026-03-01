import mongoose from 'mongoose';
import Document from '../models/Document.js';
import cloudinary from '../config/cloudinaryConfig.js';
import FileService from '../services/fileService.js';
import NotificationService from '../services/notificationService.js';
import { PERMISSIONS, hasPermission } from '../config/permissions.js';
import AuditService from '../services/auditService.js';

function canBypassApprovalGate(role) {
  return hasPermission(role, PERMISSIONS.APPROVE_DOCUMENTS) || hasPermission(role, PERMISSIONS.UPLOAD_DOCUMENTS);
}

function canAccessDocumentByStatus(role, status) {
  const effectiveStatus = status || 'approved';
  if (effectiveStatus === 'approved') return true;
  return canBypassApprovalGate(role);
}

class DocumentController {
  // ===========================================================================
  // OBTENER TODOS LOS DOCUMENTOS
  // ===========================================================================
  static async getAll(req, res) {
    try {
      console.log('📋 DocumentController.getAll - Iniciando');
      
      const role = req.user?.rol;
      const statusFilter = canBypassApprovalGate(role) ? {} : { status: 'approved' };

      const documents = await Document.find({ 
        activo: true,
        ...statusFilter,
        $or: [
          { isDeleted: false },
          { isDeleted: { $exists: false } }
        ]
      })
        .populate('persona_id', 'nombre email departamento puesto')
        .sort({ fecha_subida: -1 });

      console.log(`✅ ${documents.length} documentos encontrados`);
      
      res.json({ success: true, documents });
    } catch (error) {
      console.error('❌ Error obteniendo documentos:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error al obtener documentos' 
      });
    }
  }

  // ===========================================================================
  // CREAR/SUBIR DOCUMENTO
  // ===========================================================================
  static async create(req, res) {
    console.log('\n🔍 ========== SUBIENDO NUEVO DOCUMENTO ==========');
    console.log('📝 Body recibido:', req.body);
    console.log('📋 File:', req.file);
    console.log('👤 Usuario autenticado:', req.user ? {
      id: req.user._id,
      usuario: req.user.usuario,
      rol: req.user.rol,
      email: req.user.correo
    } : '❌ NO HAY USUARIO');

    try {
      if (!req.file) {
        console.error('❌ No se recibió archivo en la solicitud');
        return res.status(400).json({ 
          success: false, 
          message: 'No se ha subido ningún archivo' 
        });
      }

      console.log('✅ Archivo recibido:', req.file.originalname);
      console.log('📊 Tamaño:', req.file.size);

      const { descripcion, categoria, fecha_vencimiento, persona_id } = req.body;

      console.log('📤 Subiendo a Cloudinary...');

      // Subir a Cloudinary
      let cloudinaryResult;
      try {
        cloudinaryResult = await FileService.uploadToCloudinary(req.file.path);
        console.log('✅ Archivo subido a Cloudinary:', cloudinaryResult.secure_url);
      } catch (cloudinaryError) {
        console.error('❌ Error subiendo a Cloudinary:', cloudinaryError);
        FileService.cleanTempFile(req.file.path);
        return res.status(500).json({ 
          success: false, 
          message: 'Error al subir el archivo a la nube: ' + cloudinaryError.message 
        });
      }

      console.log('💾 Guardando documento en la base de datos...');

      // Crear documento en la base de datos
      const nuevoDocumento = new Document({
        nombre_original: req.file.originalname,
        tipo_archivo: req.file.originalname.split('.').pop().toLowerCase(),
        tamano_archivo: req.file.size,
        descripcion: descripcion || '',
        categoria: categoria || 'General',
        fecha_vencimiento: fecha_vencimiento || null,
        persona_id: persona_id || null,
        cloudinary_url: cloudinaryResult.secure_url,
        public_id: cloudinaryResult.public_id,
        resource_type: cloudinaryResult.resource_type,
        status: 'pending'
      });

      await nuevoDocumento.save();
      console.log('✅ Documento guardado en BD con ID:', nuevoDocumento._id);

      // Limpiar archivo temporal
      FileService.cleanTempFile(req.file.path);

      // Obtener documento con datos de persona
      const documentoConPersona = await Document.findById(nuevoDocumento._id)
        .populate('persona_id', 'nombre');

      // =======================================================================
      // REGISTRAR EN AUDITORÍA
      // =======================================================================
      
      console.log('📝 Intentando registrar en auditoría...');
      
      try {
        await AuditService.logDocumentUpload(req, nuevoDocumento, documentoConPersona?.persona_id);
        console.log('✅✅✅ AUDITORÍA REGISTRADA EXITOSAMENTE');
      } catch (auditError) {
        console.error('❌ ERROR REGISTRANDO AUDITORÍA:', auditError.message);
      }

      // Crear notificación
      try {
        await NotificationService.documentoSubido(
          documentoConPersona,
          documentoConPersona.persona_id
        );
        console.log('✅ Notificación creada');
      } catch (notifError) {
        console.error('⚠️ Error creando notificación:', notifError.message);
      }

      console.log('✅✅✅ UPLOAD COMPLETADO EXITOSAMENTE');
      console.log('🔍 ========== FIN ==========\n');

      res.json({
        success: true,
        message: 'Documento subido correctamente',
        document: documentoConPersona
      });

    } catch (error) {
      console.error('🔥 ERROR CRÍTICO en create:');
      console.error('📌 Mensaje:', error.message);
      console.error('📌 Stack:', error.stack);
      
      if (req.file && req.file.path) {
        FileService.cleanTempFile(req.file.path);
      }
      
      res.status(500).json({ 
        success: false, 
        message: 'Error al subir documento: ' + error.message 
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
        console.log('❌ ID inválido:', id);
        return res.status(400).json({ 
          success: false, 
          message: 'ID inválido' 
        });
      }

      const documento = await Document.findOne({ _id: id, activo: true });
      if (!documento) {
        console.log('❌ Documento no encontrado:', id);
        return res.status(404).json({ 
          success: false, 
          message: 'Documento no encontrado' 
        });
      }

      // Guardar estado anterior
      const beforeState = {
        status: documento.status,
        reviewedAt: documento.reviewedAt,
        reviewedBy: documento.reviewedBy,
        reviewComment: documento.reviewComment
      };

      documento.status = 'approved';
      documento.reviewedAt = new Date();
      documento.reviewedBy = req.user?.usuario || req.user?.correo || 'Revisor';
      documento.reviewComment = comment ? String(comment) : '';
      await documento.save();

      console.log('✅ Documento aprobado:', documento.nombre_original);

      // =======================================================================
      // REGISTRAR APROBACIÓN EN AUDITORÍA
      // =======================================================================
      
      try {
        await AuditService.logDocumentApprove(req, documento, comment);
        console.log('✅✅✅ APROBACIÓN REGISTRADA');
      } catch (auditError) {
        console.error('❌ Error registrando aprobación:', auditError.message);
      }

      console.log('✅✅✅ APROBACIÓN COMPLETADA');
      console.log('🔍 ========== FIN ==========\n');

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
        console.log('❌ ID inválido:', id);
        return res.status(400).json({ 
          success: false, 
          message: 'ID inválido' 
        });
      }

      const documento = await Document.findOne({ _id: id, activo: true });
      if (!documento) {
        console.log('❌ Documento no encontrado:', id);
        return res.status(404).json({ 
          success: false, 
          message: 'Documento no encontrado' 
        });
      }

      // Guardar estado anterior
      const beforeState = {
        status: documento.status,
        reviewedAt: documento.reviewedAt,
        reviewedBy: documento.reviewedBy,
        reviewComment: documento.reviewComment,
        isDeleted: documento.isDeleted,
        deletedAt: documento.deletedAt,
        deletedBy: documento.deletedBy
      };

      documento.status = 'rejected';
      documento.reviewedAt = new Date();
      documento.reviewedBy = req.user?.usuario || req.user?.correo || 'Revisor';
      documento.reviewComment = comment ? String(comment) : '';

      // Enviar a papelera
      documento.isDeleted = true;
      documento.deletedAt = new Date();
      documento.deletedBy = req.user?.usuario || req.user?.correo || 'Sistema';
      await documento.save();

      console.log('✅ Documento rechazado:', documento.nombre_original);

      // =======================================================================
      // REGISTRAR RECHAZO EN AUDITORÍA
      // =======================================================================
      
      try {
        await AuditService.logDocumentReject(req, documento, comment);
        console.log('✅✅✅ RECHAZO REGISTRADO');
      } catch (auditError) {
        console.error('❌ Error registrando rechazo:', auditError.message);
      }

      console.log('✅✅✅ RECHAZO COMPLETADO');
      console.log('🔍 ========== FIN ==========\n');

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
        return res.status(400).json({ 
          success: false, 
          message: 'ID inválido' 
        });
      }

      const documento = await Document.findOne({ _id: id, activo: true });

      if (!documento) {
        return res.status(404).json({ 
          success: false, 
          message: 'Documento no encontrado' 
        });
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
    console.log('\n🔍 ========== ELIMINANDO DOCUMENTO ==========');
    console.log('📝 ID:', req.params.id);
    console.log('👤 Usuario:', req.user?.usuario);

    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        console.log('❌ ID inválido:', id);
        return res.status(400).json({ 
          success: false, 
          message: 'ID inválido' 
        });
      }

      const documento = await Document.findOne({ _id: id, activo: true });

      if (!documento) {
        console.log('❌ Documento no encontrado:', id);
        return res.status(404).json({ 
          success: false, 
          message: 'Documento no encontrado' 
        });
      }

      console.log('📋 Documento a eliminar:', {
        nombre: documento.nombre_original,
        categoria: documento.categoria,
        status: documento.status
      });

      // Soft delete - mover a papelera
      documento.isDeleted = true;
      documento.deletedAt = new Date();
      documento.deletedBy = req.user?.usuario || req.body.deletedBy || 'Usuario';
      await documento.save();

      console.log(`🗑️ Documento movido a papelera: ${documento.nombre_original}`);

      // =======================================================================
      // REGISTRAR ELIMINACIÓN EN AUDITORÍA
      // =======================================================================
      
      try {
        await AuditService.logDocumentDelete(req, documento, true);
        console.log('✅✅✅ ELIMINACIÓN REGISTRADA EN AUDITORÍA');
      } catch (auditError) {
        console.error('❌ Error registrando eliminación:', auditError.message);
      }

      // Crear notificación
      try {
        await NotificationService.documentoEliminado(documento.nombre_original, documento.categoria);
        console.log('✅ Notificación creada');
      } catch (notifError) {
        console.error('⚠️ Error creando notificación:', notifError.message);
      }

      console.log('✅✅✅ ELIMINACIÓN COMPLETADA');
      console.log('🔍 ========== FIN ==========\n');

      res.json({ 
        success: true, 
        message: 'Documento eliminado correctamente' 
      });

    } catch (error) {
      console.error('🔥 Error eliminando documento:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error al eliminar documento: ' + error.message 
      });
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

      console.log('📋 Parámetros recibidos:', { id, filename });

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: 'ID de documento inválido'
        });
      }

      const documento = await Document.findOne({ 
        _id: id, 
        activo: true 
      }).populate('persona_id', 'nombre');

      if (!documento) {
        return res.status(404).json({
          success: false,
          message: 'Documento no encontrado'
        });
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

      console.log('📄 Documento encontrado:', {
        fileName,
        extension: fileExtension,
        url: cloudinaryUrl
      });

      if (!cloudinaryUrl) {
        return res.status(404).json({
          success: false,
          message: 'URL de archivo no disponible'
        });
      }

      // =======================================================================
      // REGISTRAR DESCARGA EN AUDITORÍA (ASÍNCRONO)
      // =======================================================================
      
      AuditService.logDocumentDownload(req, documento)
        .catch(err => console.error('❌ Error registrando descarga:', err.message));

      // Tipos de archivo
      const isImage = ['png','jpg','jpeg','gif','webp','bmp'].includes(fileExtension);
      const isPDF = fileExtension === 'pdf';

      if (isImage) {
        console.log('🖼️ Imagen detectada → redirección directa');
        let finalUrl = cloudinaryUrl.replace('/upload/', '/upload/fl_attachment/');
        return res.redirect(finalUrl);
      }

      console.log('📄 Documento → usando servidor proxy');

      let response = await this.tryFetch(cloudinaryUrl);

      if (!response.ok) {
        console.log('⚠️ Intento 1 falló, probando URL mejorada para Cloudinary...');
        
        const modifiedUrl = FileService.buildCloudinaryDownloadURL(cloudinaryUrl, fileExtension);
        console.log('🔗 URL modificada final:', modifiedUrl);

        response = await this.tryFetch(modifiedUrl);

        if (!response.ok) {
          console.log('❌ Intento 2 también falló. Haciendo redirección como último recurso.');
          
          res.setHeader('Content-Type', FileService.getContentType(fileExtension));
          res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
          return res.redirect(cloudinaryUrl);
        }
      }

      await this.processAndSendFile(response, res, fileName, fileExtension);

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
        headers: {
          'User-Agent': 'Mozilla/5.0'
        },
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

    if (nodeBuffer.length === 0) {
      throw new Error('Buffer vacío');
    }

    if (fileExtension === 'pdf') {
      const firstBytes = nodeBuffer.slice(0, 5).toString();
      if (!firstBytes.includes('%PDF')) {
        console.log('⚠️ El archivo no empieza con %PDF, Cloudinary devolvió HTML');
        throw new Error('Respuesta inválida para PDF');
      }
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
    console.log('📝 Obteniendo contenido para vista previa de texto');
    
    try {
      const { id } = req.params;
      const { limit = 50000 } = req.query;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: 'ID de documento inválido'
        });
      }

      const documento = await Document.findOne({ 
        _id: id, 
        activo: true 
      });

      if (!documento) {
        return res.status(404).json({
          success: false,
          message: 'Documento no encontrado'
        });
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
        return res.status(500).json({
          success: false,
          message: 'URL del archivo no disponible'
        });
      }

      console.log('📥 Descargando contenido desde Cloudinary...');

      let finalUrl = cloudinaryUrl;
      if (cloudinaryUrl.includes('cloudinary.com')) {
        if (!cloudinaryUrl.includes('/raw/')) {
          finalUrl = cloudinaryUrl.replace('/upload/', '/upload/fl_attachment/');
        }
      }

      const { default: fetch } = await import('node-fetch');
      const response = await fetch(finalUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0'
        }
      });

      if (!response.ok) {
        throw new Error(`Error al descargar desde Cloudinary: ${response.status}`);
      }

      const buffer = await response.arrayBuffer();
      
      if (buffer.byteLength === 0) {
        return res.status(500).json({
          success: false,
          message: 'El archivo está vacío'
        });
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
        return res.status(404).json({ 
          success: false, 
          message: 'Documento no encontrado' 
        });
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
    console.log('📝 Body:', req.body);
    console.log('📋 File:', req.file ? 'Nuevo archivo recibido' : 'Sin nuevo archivo');
    console.log('👤 Usuario:', req.user?.usuario);

    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        console.log('❌ ID inválido:', id);
        return res.status(400).json({ 
          success: false, 
          message: 'ID inválido' 
        });
      }

      const documentoOriginal = await Document.findOne({ _id: id, activo: true });

      if (!documentoOriginal) {
        console.log('❌ Documento no encontrado:', id);
        return res.status(404).json({ 
          success: false, 
          message: 'Documento no encontrado' 
        });
      }

      console.log('📋 Documento original:', {
        nombre: documentoOriginal.nombre_original,
        categoria: documentoOriginal.categoria,
        status: documentoOriginal.status
      });

      // Guardar estado anterior
      const beforeState = {
        nombre_original: documentoOriginal.nombre_original,
        tipo_archivo: documentoOriginal.tipo_archivo,
        tamano_archivo: documentoOriginal.tamano_archivo,
        descripcion: documentoOriginal.descripcion,
        categoria: documentoOriginal.categoria,
        fecha_vencimiento: documentoOriginal.fecha_vencimiento,
        persona_id: documentoOriginal.persona_id ? documentoOriginal.persona_id.toString() : null,
        cloudinary_url: documentoOriginal.cloudinary_url,
        public_id: documentoOriginal.public_id,
        status: documentoOriginal.status
      };

      let archivoReemplazado = false;

      // Si se envió un nuevo archivo, reemplazar en Cloudinary
      if (req.file) {
        console.log('📤 Nuevo archivo detectado, reemplazando en Cloudinary...');
        archivoReemplazado = true;
        
        try {
          // Eliminar archivo anterior de Cloudinary
          if (documentoOriginal.public_id) {
            await cloudinary.uploader.destroy(documentoOriginal.public_id, {
              resource_type: documentoOriginal.resource_type || 'auto'
            });
            console.log('🗑️ Archivo anterior eliminado de Cloudinary');
          }

          // Subir nuevo archivo
          const cloudinaryResult = await FileService.uploadToCloudinary(req.file.path);
          console.log('✅ Nuevo archivo subido a Cloudinary');

          // Actualizar campos relacionados con el archivo
          documentoOriginal.nombre_original = req.file.originalname;
          documentoOriginal.tipo_archivo = req.file.originalname.split('.').pop().toLowerCase();
          documentoOriginal.tamano_archivo = req.file.size;
          documentoOriginal.cloudinary_url = cloudinaryResult.secure_url;
          documentoOriginal.public_id = cloudinaryResult.public_id;
          documentoOriginal.resource_type = cloudinaryResult.resource_type;

          // Limpiar archivo temporal
          FileService.cleanTempFile(req.file.path);
        } catch (uploadError) {
          console.error('❌ Error subiendo nuevo archivo:', uploadError);
          if (req.file && req.file.path) {
            FileService.cleanTempFile(req.file.path);
          }
          return res.status(500).json({ 
            success: false, 
            message: 'Error al subir el nuevo archivo: ' + uploadError.message 
          });
        }
      }

      // Actualizar campos permitidos (excepto fecha_subida)
      const { descripcion, categoria, fecha_vencimiento, persona_id } = req.body;
      
      if (descripcion !== undefined) documentoOriginal.descripcion = descripcion;
      if (categoria !== undefined) documentoOriginal.categoria = categoria;
      if (fecha_vencimiento !== undefined) documentoOriginal.fecha_vencimiento = fecha_vencimiento || null;
      if (persona_id !== undefined) documentoOriginal.persona_id = persona_id || null;

      await documentoOriginal.save();
      console.log('✅ Documento actualizado exitosamente');

      // Obtener documento con datos de persona
      const documentoActualizado = await Document.findById(documentoOriginal._id)
        .populate('persona_id', 'nombre');

      // Estado después
      const afterState = {
        nombre_original: documentoOriginal.nombre_original,
        tipo_archivo: documentoOriginal.tipo_archivo,
        tamano_archivo: documentoOriginal.tamano_archivo,
        descripcion: documentoOriginal.descripcion,
        categoria: documentoOriginal.categoria,
        fecha_vencimiento: documentoOriginal.fecha_vencimiento,
        persona_id: documentoOriginal.persona_id ? documentoOriginal.persona_id.toString() : null,
        cloudinary_url: documentoOriginal.cloudinary_url,
        public_id: documentoOriginal.public_id,
        status: documentoOriginal.status
      };

      // Calcular qué campos cambiaron
      const camposModificados = [];
      for (const key in beforeState) {
        if (beforeState[key] !== afterState[key]) {
          camposModificados.push(key);
        }
      }

      if (archivoReemplazado) {
        camposModificados.push('archivo');
      }

      // =======================================================================
      // REGISTRAR ACTUALIZACIÓN EN AUDITORÍA
      // =======================================================================
      
      try {
        await AuditService.logDocumentUpdate(req, documentoActualizado, beforeState, afterState, camposModificados);
        console.log('✅✅✅ ACTUALIZACIÓN REGISTRADA EN AUDITORÍA');
      } catch (auditError) {
        console.error('❌ Error registrando actualización:', auditError.message);
      }

      // Crear notificación
      try {
        await NotificationService.create({
          titulo: 'Documento actualizado',
          mensaje: `El documento "${documentoOriginal.nombre_original}" ha sido actualizado`,
          tipo: 'info',
          categoria: 'documento'
        });
        console.log('✅ Notificación creada');
      } catch (notifError) {
        console.error('⚠️ Error creando notificación:', notifError.message);
      }

      console.log('✅✅✅ ACTUALIZACIÓN COMPLETADA');
      console.log('🔍 ========== FIN ==========\n');

      res.json({
        success: true,
        message: 'Documento actualizado correctamente',
        document: documentoActualizado
      });

    } catch (error) {
      console.error('🔥 Error actualizando documento:', error);
      if (req.file && req.file.path) {
        FileService.cleanTempFile(req.file.path);
      }
      res.status(500).json({ 
        success: false, 
        message: 'Error al actualizar documento: ' + error.message 
      });
    }
  }
}

export default DocumentController;