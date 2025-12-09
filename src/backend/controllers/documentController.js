import mongoose from 'mongoose';
import Document from '../models/Document.js';
import cloudinary from '../config/cloudinaryConfig.js';
import FileService from '../services/fileService.js';
import NotificationService from '../services/notificationService.js';

class DocumentController {
  // Obtener todos los documentos
  static async getAll(req, res) {
    try {
      const documents = await Document.find({ 
        activo: true,
        $or: [
          { isDeleted: false },
          { isDeleted: { $exists: false } }
        ]
      })
        .populate('persona_id', 'nombre email departamento puesto')
        .sort({ fecha_subida: -1 });

      res.json({ success: true, documents });
    } catch (error) {
      console.error('Error obteniendo documentos:', error);
      res.status(500).json({ success: false, message: 'Error al obtener documentos' });
    }
  }

  // Crear/subir documento
  static async create(req, res) {
    try {
      console.log('📥 Recibiendo solicitud de upload de documento...');
      console.log('📋 Body:', req.body);
      console.log('📋 File:', req.file);

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
        // Limpiar archivo temporal
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
        resource_type: cloudinaryResult.resource_type
      });

      await nuevoDocumento.save();
      console.log('✅ Documento guardado en BD con ID:', nuevoDocumento._id);

      // Limpiar archivo temporal
      FileService.cleanTempFile(req.file.path);

      // Obtener documento con datos de persona
      const documentoConPersona = await Document.findById(nuevoDocumento._id)
        .populate('persona_id', 'nombre');

      // Crear notificación de documento subido
      try {
        await NotificationService.documentoSubido(
          documentoConPersona,
          documentoConPersona.persona_id
        );
      } catch (notifError) {
        console.error('⚠️ Error creando notificación:', notifError.message);
      }

      console.log('✅ Upload completado exitosamente');

      res.json({
        success: true,
        message: 'Documento subido correctamente',
        document: documentoConPersona
      });

    } catch (error) {
      console.error('❌ Error general subiendo documento:', error);
      console.error('❌ Stack trace:', error.stack);
      // Limpiar archivo temporal si existe
      FileService.cleanTempFile(req.file && req.file.path);
      res.status(500).json({ 
        success: false, 
        message: 'Error al subir documento: ' + error.message 
      });
    }
  }

  // Vista previa de documento
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

      if (!documento.cloudinary_url) {
        return res.status(500).json({ 
          success: false, 
          message: 'URL del documento no disponible' 
        });
      }

      console.log('👁️ Vista previa para:', documento.nombre_original);
      
      // PARA PDF: Cloudinary puede mostrar vista previa
      // PARA IMÁGENES: Redirigir directamente
      res.redirect(documento.cloudinary_url);

    } catch (error) {
      console.error('❌ Error en vista previa:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error al cargar vista previa' 
      });
    }
  }

  // Eliminar documento
  static async delete(req, res) {
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

      // Soft delete - mover a papelera
      documento.isDeleted = true;
      documento.deletedAt = new Date();
      documento.deletedBy = req.body.deletedBy || 'Usuario';
      await documento.save();

      console.log(`🗑️ Documento movido a papelera: ${documento.nombre_original}`);

      // Crear notificación de documento movido a papelera
      try {
        await NotificationService.documentoEliminado(documento.nombre_original, documento.categoria);
      } catch (notifError) {
        console.error('⚠️ Error creando notificación:', notifError.message);
      }

      res.json({ 
        success: true, 
        message: 'Documento eliminado correctamente' 
      });

    } catch (error) {
      console.error('Error eliminando documento:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error al eliminar documento' 
      });
    }
  }

  // Descargar documento
  static async download(req, res) {
    console.log('📥 ====== INICIO ENDPOINT DESCARGA ======');

    try {
      const { id } = req.params;
      const { filename } = req.query;

      console.log('📋 Parámetros recibidos:', { id, filename });

      // 1. Validar ID
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: 'ID de documento invalido'
        });
      }

      // 2. Buscar en BD
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

      // Tipos de archivo
      const isImage = ['png','jpg','jpeg','gif','webp','bmp'].includes(fileExtension);
      const isPDF = fileExtension === 'pdf';

      // ESTRATEGIA 1: Redireccion directa para IMAGENES
      if (isImage) {
        console.log('🖼️ Imagen detectada → redireccion directa');
        let finalUrl = cloudinaryUrl.replace('/upload/', '/upload/fl_attachment/');
        return res.redirect(finalUrl);
      }

      // ESTRATEGIA 2: SERVIDOR PROXY PARA PDF, DOCX, XLSX, TXT, ETC
      console.log('📄 Documento → usando servidor proxy');

      // Intento 1: URL original
      let response = await this.tryFetch(cloudinaryUrl);

      // Si fallo, intentamos con URL modificada
      if (!response.ok) {
        console.log('⚠️ Intento 1 fallo, probando URL mejorada para Cloudinary...');
        
        const modifiedUrl = FileService.buildCloudinaryDownloadURL(cloudinaryUrl, fileExtension);
        console.log('🔗 URL modificada final:', modifiedUrl);

        response = await this.tryFetch(modifiedUrl);

        if (!response.ok) {
          console.log('❌ Intento 2 tambien fallo. Haciendo redireccion como ultimo recurso.');
          
          res.setHeader('Content-Type', FileService.getContentType(fileExtension));
          res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
          return res.redirect(cloudinaryUrl);
        }
      }

      // Procesar archivo
      await this.processAndSendFile(response, res, fileName, fileExtension);

    } catch (error) {
      console.error('❌ ERROR CRITICO:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno en la descarga',
        error: error.message
      });
    } finally {
      console.log('📥 ====== FIN ENDPOINT DESCARGA ======');
    }
  }

  // Método auxiliar para fetch
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

  // Método auxiliar para procesar y enviar archivo
  static async processAndSendFile(fetchResponse, res, fileName, fileExtension) {
    const buffer = await fetchResponse.arrayBuffer();
    const nodeBuffer = Buffer.from(buffer);

    if (nodeBuffer.length === 0) {
      throw new Error('Buffer vacio');
    }

    // Verificación PDF
    if (fileExtension === 'pdf') {
      const firstBytes = nodeBuffer.slice(0, 5).toString();
      if (!firstBytes.includes('%PDF')) {
        console.log('⚠️ El archivo no empieza con %PDF, Cloudinary devolvio HTML');
        throw new Error('Respuesta invalida para PDF');
      }
    }

    // Headers
    const contentType = FileService.getContentType(fileExtension);
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', nodeBuffer.length);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);

    return res.end(nodeBuffer);
  }

  // Obtener contenido de archivo de texto
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

      // Buscar documento
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

      // Verificar que sea archivo de texto
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

      // Descargar desde Cloudinary
      const { default: fetch } = await import('node-fetch');
      const response = await fetch(finalUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0'
        }
      });

      if (!response.ok) {
        throw new Error(`Error al descargar desde Cloudinary: ${response.status}`);
      }

      // Leer el contenido
      const buffer = await response.arrayBuffer();
      
      if (buffer.byteLength === 0) {
        return res.status(500).json({
          success: false,
          message: 'El archivo está vacío'
        });
      }

      // Convertir a texto
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

      // Limitar contenido si es muy grande
      const maxLength = parseInt(limit);
      let isTruncated = false;
      
      if (textContent.length > maxLength) {
        textContent = textContent.substring(0, maxLength);
        isTruncated = true;
      }

      // Determinar tipo de contenido
      let contentType = 'text/plain; charset=utf-8';
      if (extension === 'html' || extension === 'htm') contentType = 'text/html; charset=utf-8';
      if (extension === 'json') contentType = 'application/json; charset=utf-8';
      if (extension === 'xml') contentType = 'application/xml; charset=utf-8';
      if (extension === 'css') contentType = 'text/css; charset=utf-8';
      if (extension === 'js') contentType = 'application/javascript; charset=utf-8';
      if (extension === 'csv') contentType = 'text/csv; charset=utf-8';
      if (extension === 'md') contentType = 'text/markdown; charset=utf-8';

      // Configurar respuesta
      res.setHeader('Content-Type', contentType);
      res.setHeader('X-File-Name', encodeURIComponent(documento.nombre_original));
      res.setHeader('X-File-Size', buffer.byteLength);
      res.setHeader('X-Content-Length', textContent.length);
      if (isTruncated) {
        res.setHeader('X-Content-Truncated', 'true');
        res.setHeader('X-Original-Length', buffer.byteLength);
      }

      // Enviar contenido
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

  // Obtener información del documento
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
          resource_type: documento.resource_type
        }
      });
      
    } catch (error) {
      console.error('Error obteniendo info del documento:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error al obtener información del documento' 
      });
    }
  }
}

export default DocumentController;