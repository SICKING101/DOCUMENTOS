import mongoose from 'mongoose';
import Document from '../models/Document.js';
import cloudinary from '../config/cloudinaryConfig.js';
import FileService from '../services/fileService.js';
import NotificationService from '../services/notificationService.js';

// ============================================================================
// SECCIÓN: CONTROLADOR DE DOCUMENTOS
// ============================================================================
// Este archivo maneja todas las operaciones CRUD relacionadas con documentos.
// Incluye subida de archivos a Cloudinary, gestión de metadatos, descargas,
// vistas previas, eliminación lógica y actualizaciones. Es el controlador
// más complejo del sistema debido a la integración con servicios externos.
// ============================================================================

class DocumentController {
  
  // ********************************************************************
  // MÓDULO 1: OBTENCIÓN DE TODOS LOS DOCUMENTOS ACTIVOS
  // ********************************************************************
  // Descripción: Obtiene la lista completa de documentos activos que no
  // están en la papelera de reciclaje. Incluye datos poblados de las
  // personas asignadas y ordena por fecha de subida descendente.
  // ********************************************************************
  static async getAll(req, res) {
    try {
      // ----------------------------------------------------------------
      // BLOQUE 1.1: Consulta de documentos activos no eliminados
      // ----------------------------------------------------------------
      // Busca documentos con activo=true y que no estén marcados como
      // eliminados (isDeleted: false o campo inexistente). El operador $or
      // maneja documentos antiguos que no tienen el campo isDeleted.
      const documents = await Document.find({ 
        activo: true,
        $or: [
          { isDeleted: false },
          { isDeleted: { $exists: false } }
        ]
      })
        .populate('persona_id', 'nombre email departamento puesto')
        .sort({ fecha_subida: -1 });

      // ----------------------------------------------------------------
      // BLOQUE 1.2: Respuesta con documentos completos
      // ----------------------------------------------------------------
      res.json({ success: true, documents });
      
    } catch (error) {
      console.error('Error obteniendo documentos:', error);
      res.status(500).json({ success: false, message: 'Error al obtener documentos' });
    }
  }

  // ********************************************************************
  // MÓDULO 2: CREACIÓN/SUBIDA DE NUEVO DOCUMENTO
  // ********************************************************************
  // Descripción: Procesa la subida de un nuevo documento al sistema.
  // Incluye validación de archivo, upload a Cloudinary, creación de
  // registro en base de datos y limpieza de archivos temporales.
  // ********************************************************************
  static async create(req, res) {
    try {
      console.log('📥 Recibiendo solicitud de upload de documento...');
      console.log('📋 Body:', req.body);
      console.log('📋 File:', req.file);

      // ----------------------------------------------------------------
      // BLOQUE 2.1: Validación de archivo recibido
      // ----------------------------------------------------------------
      // Middleware de multer debe haber procesado el archivo y adjuntado
      // el objeto 'file' a la solicitud. Si no existe, la subida falló.
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

      // ----------------------------------------------------------------
      // BLOQUE 2.2: Subida a Cloudinary
      // ----------------------------------------------------------------
      // Delega la subida del archivo al servicio especializado FileService.
      // Maneja tanto la comunicación con Cloudinary como posibles errores.
      let cloudinaryResult;
      try {
        cloudinaryResult = await FileService.uploadToCloudinary(req.file.path);
        console.log('✅ Archivo subido a Cloudinary:', cloudinaryResult.secure_url);
      } catch (cloudinaryError) {
        console.error('❌ Error subiendo a Cloudinary:', cloudinaryError);
        // Limpiar archivo temporal incluso si falla la subida
        FileService.cleanTempFile(req.file.path);
        return res.status(500).json({ 
          success: false, 
          message: 'Error al subir el archivo a la nube: ' + cloudinaryError.message 
        });
      }

      console.log('💾 Guardando documento en la base de datos...');

      // ----------------------------------------------------------------
      // BLOQUE 2.3: Creación del registro en base de datos
      // ----------------------------------------------------------------
      // Construye un nuevo documento con toda la información del archivo
      // y los metadatos proporcionados en el formulario.
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

      // ----------------------------------------------------------------
      // BLOQUE 2.4: Limpieza de archivo temporal
      // ----------------------------------------------------------------
      // Elimina el archivo temporal creado por multer en el servidor
      // local, ya que ahora está almacenado en Cloudinary.
      FileService.cleanTempFile(req.file.path);

      // ----------------------------------------------------------------
      // BLOQUE 2.5: Obtención del documento con datos poblados
      // ----------------------------------------------------------------
      // Vuelve a consultar el documento recién creado pero con la
      // información de la persona asignada poblada para incluir en la respuesta.
      const documentoConPersona = await Document.findById(nuevoDocumento._id)
        .populate('persona_id', 'nombre');

      // ----------------------------------------------------------------
      // BLOQUE 2.6: Notificación de documento subido (opcional)
      // ----------------------------------------------------------------
      // Informa al sistema de notificaciones sobre la nueva subida.
      // Si falla, solo se registra el error sin afectar la operación principal.
      try {
        await NotificationService.documentoSubido(
          documentoConPersona,
          documentoConPersona.persona_id
        );
      } catch (notifError) {
        console.error('⚠️ Error creando notificación:', notifError.message);
      }

      console.log('✅ Upload completado exitosamente');

      // ----------------------------------------------------------------
      // BLOQUE 2.7: Respuesta exitosa con datos completos
      // ----------------------------------------------------------------
      res.json({
        success: true,
        message: 'Documento subido correctamente',
        document: documentoConPersona
      });

    } catch (error) {
      console.error('❌ Error general subiendo documento:', error);
      console.error('❌ Stack trace:', error.stack);
      // Limpieza de archivo temporal en caso de error general
      FileService.cleanTempFile(req.file && req.file.path);
      res.status(500).json({ 
        success: false, 
        message: 'Error al subir documento: ' + error.message 
      });
    }
  }

  // ********************************************************************
  // MÓDULO 3: VISTA PREVIA DE DOCUMENTO
  // ********************************************************************
  // Descripción: Redirige al usuario a la URL de Cloudinary para visualizar
  // el documento directamente en el navegador. Útil para imágenes y PDFs
  // que Cloudinary puede mostrar en línea.
  // ********************************************************************
  static async preview(req, res) {
    try {
      const { id } = req.params;

      // ----------------------------------------------------------------
      // BLOQUE 3.1: Validación de formato de ID
      // ----------------------------------------------------------------
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ 
          success: false, 
          message: 'ID inválido' 
        });
      }

      // ----------------------------------------------------------------
      // BLOQUE 3.2: Búsqueda del documento activo
      // ----------------------------------------------------------------
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
      
      // ----------------------------------------------------------------
      // BLOQUE 3.3: Redirección a Cloudinary
      // ----------------------------------------------------------------
      // Cloudinary puede mostrar directamente imágenes y PDFs en el navegador.
      // Para otros tipos de archivos, el navegador intentará descargarlos.
      res.redirect(documento.cloudinary_url);

    } catch (error) {
      console.error('❌ Error en vista previa:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error al cargar vista previa' 
      });
    }
  }

  // ********************************************************************
  // MÓDULO 4: ELIMINACIÓN LÓGICA DE DOCUMENTO
  // ********************************************************************
  // Descripción: Realiza una eliminación lógica (soft delete) moviendo
  // el documento a la papelera de reciclaje en lugar de eliminarlo
  // permanentemente. Permite recuperación posterior.
  // ********************************************************************
  static async delete(req, res) {
    try {
      const { id } = req.params;

      // ----------------------------------------------------------------
      // BLOQUE 4.1: Validación de formato de ID
      // ----------------------------------------------------------------
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ 
          success: false, 
          message: 'ID inválido' 
        });
      }

      // ----------------------------------------------------------------
      // BLOQUE 4.2: Búsqueda del documento activo
      // ----------------------------------------------------------------
      const documento = await Document.findOne({ _id: id, activo: true });

      if (!documento) {
        return res.status(404).json({ 
          success: false, 
          message: 'Documento no encontrado' 
        });
      }

      // ----------------------------------------------------------------
      // BLOQUE 4.3: Marcar como eliminado (soft delete)
      // ----------------------------------------------------------------
      // Establece los campos de eliminación lógica:
      // - isDeleted: true (indica que está en papelera)
      // - deletedAt: timestamp del momento de eliminación
      // - deletedBy: identificación de quien realizó la eliminación
      documento.isDeleted = true;
      documento.deletedAt = new Date();
      documento.deletedBy = req.body.deletedBy || 'Usuario';
      await documento.save();

      console.log(`🗑️ Documento movido a papelera: ${documento.nombre_original}`);

      // ----------------------------------------------------------------
      // BLOQUE 4.4: Notificación de documento eliminado
      // ----------------------------------------------------------------
      try {
        await NotificationService.documentoEliminado(documento.nombre_original, documento.categoria);
      } catch (notifError) {
        console.error('⚠️ Error creando notificación:', notifError.message);
      }

      // ----------------------------------------------------------------
      // BLOQUE 4.5: Confirmación de eliminación lógica
      // ----------------------------------------------------------------
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

  // ********************************************************************
  // MÓDULO 5: DESCARGA DE DOCUMENTO
  // ********************************************************************
  // Descripción: Maneja la descarga de documentos desde Cloudinary
  // con múltiples estrategias de fallback. Incluye validaciones,
  // detección de tipo de archivo y manejo robusto de errores.
  // ********************************************************************
  static async download(req, res) {
    console.log('📥 ====== INICIO ENDPOINT DESCARGA ======');

    try {
      const { id } = req.params;
      const { filename } = req.query;

      console.log('📋 Parámetros recibidos:', { id, filename });

      // ----------------------------------------------------------------
      // BLOQUE 5.1: Validación de ID de MongoDB
      // ----------------------------------------------------------------
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: 'ID de documento invalido'
        });
      }

      // ----------------------------------------------------------------
      // BLOQUE 5.2: Búsqueda del documento en base de datos
      // ----------------------------------------------------------------
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

      // ----------------------------------------------------------------
      // BLOQUE 5.3: Preparación de datos para descarga
      // ----------------------------------------------------------------
      const fileName = filename || documento.nombre_original;
      const cloudinaryUrl = documento.cloudinary_url || documento.url_cloudinary;
      const fileExtension = fileName.split('.').pop().toLowerCase();

      console.log('📄 Documento encontrado:', {
        fileName,
        extension: fileExtension,
        url: cloudinaryUrl
      });

      // Validación de URL de Cloudinary
      if (!cloudinaryUrl) {
        return res.status(404).json({
          success: false,
          message: 'URL de archivo no disponible'
        });
      }

      // ----------------------------------------------------------------
      // BLOQUE 5.4: Estrategias de descarga según tipo de archivo
      // ----------------------------------------------------------------
      // Detecta si es imagen para usar estrategia de redirección directa
      const isImage = ['png','jpg','jpeg','gif','webp','bmp'].includes(fileExtension);
      const isPDF = fileExtension === 'pdf';

      // ESTRATEGIA 1: Redireccion directa para IMAGENES
      if (isImage) {
        console.log('🖼️ Imagen detectada → redireccion directa');
        // Agrega parámetro de descarga forzada a URL de Cloudinary
        let finalUrl = cloudinaryUrl.replace('/upload/', '/upload/fl_attachment/');
        return res.redirect(finalUrl);
      }

      // ESTRATEGIA 2: SERVIDOR PROXY PARA OTROS TIPOS DE ARCHIVOS
      console.log('📄 Documento → usando servidor proxy');

      // Intento 1: URL original de Cloudinary
      let response = await this.tryFetch(cloudinaryUrl);

      // Si fallo, intentamos con URL modificada
      if (!response.ok) {
        console.log('⚠️ Intento 1 fallo, probando URL mejorada para Cloudinary...');
        
        // Construye URL optimizada para descarga desde Cloudinary
        const modifiedUrl = FileService.buildCloudinaryDownloadURL(cloudinaryUrl, fileExtension);
        console.log('🔗 URL modificada final:', modifiedUrl);

        response = await this.tryFetch(modifiedUrl);

        if (!response.ok) {
          console.log('❌ Intento 2 tambien fallo. Haciendo redireccion como ultimo recurso.');
          
          // Último recurso: redirección directa con headers de descarga
          res.setHeader('Content-Type', FileService.getContentType(fileExtension));
          res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
          return res.redirect(cloudinaryUrl);
        }
      }

      // ----------------------------------------------------------------
      // BLOQUE 5.5: Procesamiento y envío del archivo
      // ----------------------------------------------------------------
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

  // ********************************************************************
  // MÓDULO 6: MÉTODO AUXILIAR PARA FETCH
  // ********************************************************************
  // Descripción: Realiza peticiones HTTP a Cloudinary con manejo de errores
  // y timeout configurable. Usa importación dinámica de node-fetch.
  // ********************************************************************
  static async tryFetch(url) {
    try {
      // Importación dinámica para compatibilidad con diferentes versiones de Node.js
      const { default: fetch } = await import('node-fetch');
      return await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0' // User-Agent genérico para evitar bloqueos
        },
        timeout: 30000 // Timeout de 30 segundos
      });
    } catch (err) {
      console.error('❌ Error en fetch:', err);
      return { ok: false, status: 0 }; // Retorna objeto simulado para manejo uniforme
    }
  }

  // ********************************************************************
  // MÓDULO 7: MÉTODO AUXILIAR PARA PROCESAR Y ENVIAR ARCHIVO
  // ********************************************************************
  // Descripción: Procesa el buffer recibido de Cloudinary, valida el
  // contenido y envía el archivo al cliente con los headers apropiados.
  // ********************************************************************
  static async processAndSendFile(fetchResponse, res, fileName, fileExtension) {
    // ----------------------------------------------------------------
    // BLOQUE 7.1: Conversión a buffer Node.js
    // ----------------------------------------------------------------
    const buffer = await fetchResponse.arrayBuffer();
    const nodeBuffer = Buffer.from(buffer);

    // Validación de buffer no vacío
    if (nodeBuffer.length === 0) {
      throw new Error('Buffer vacio');
    }

    // ----------------------------------------------------------------
    // BLOQUE 7.2: Validación especial para PDF
    // ----------------------------------------------------------------
    // Verifica que los primeros bytes contengan la firma de PDF
    if (fileExtension === 'pdf') {
      const firstBytes = nodeBuffer.slice(0, 5).toString();
      if (!firstBytes.includes('%PDF')) {
        console.log('⚠️ El archivo no empieza con %PDF, Cloudinary devolvio HTML');
        throw new Error('Respuesta invalida para PDF');
      }
    }

    // ----------------------------------------------------------------
    // BLOQUE 7.3: Configuración de headers HTTP
    // ----------------------------------------------------------------
    const contentType = FileService.getContentType(fileExtension);
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', nodeBuffer.length);
    // Header de descarga con nombre de archivo codificado para UTF-8
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);

    // ----------------------------------------------------------------
    // BLOQUE 7.4: Envío del archivo al cliente
    // ----------------------------------------------------------------
    return res.end(nodeBuffer);
  }

  // ********************************************************************
  // MÓDULO 8: OBTENCIÓN DE CONTENIDO PARA VISTA PREVIA DE TEXTO
  // ********************************************************************
  // Descripción: Obtiene el contenido textual de archivos de texto plano
  // (txt, csv, json, etc.) para previsualización en el navegador sin
  // necesidad de descarga completa.
  // ********************************************************************
  static async getContent(req, res) {
    console.log('📝 Obteniendo contenido para vista previa de texto');
    
    try {
      const { id } = req.params;
      const { limit = 50000 } = req.query; // Límite por defecto: 50,000 caracteres

      // ----------------------------------------------------------------
      // BLOQUE 8.1: Validación de ID
      // ----------------------------------------------------------------
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: 'ID de documento inválido'
        });
      }

      // ----------------------------------------------------------------
      // BLOQUE 8.2: Búsqueda del documento
      // ----------------------------------------------------------------
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

      // ----------------------------------------------------------------
      // BLOQUE 8.3: Verificación de tipo de archivo compatible
      // ----------------------------------------------------------------
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

      // ----------------------------------------------------------------
      // BLOQUE 8.4: Construcción de URL optimizada para Cloudinary
      // ----------------------------------------------------------------
      let finalUrl = cloudinaryUrl;
      if (cloudinaryUrl.includes('cloudinary.com')) {
        if (!cloudinaryUrl.includes('/raw/')) {
          // Agrega parámetro de descarga forzada para archivos raw
          finalUrl = cloudinaryUrl.replace('/upload/', '/upload/fl_attachment/');
        }
      }

      // ----------------------------------------------------------------
      // BLOQUE 8.5: Descarga del contenido desde Cloudinary
      // ----------------------------------------------------------------
      const { default: fetch } = await import('node-fetch');
      const response = await fetch(finalUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0'
        }
      });

      if (!response.ok) {
        throw new Error(`Error al descargar desde Cloudinary: ${response.status}`);
      }

      // ----------------------------------------------------------------
      // BLOQUE 8.6: Lectura y decodificación del contenido
      // ----------------------------------------------------------------
      const buffer = await response.arrayBuffer();
      
      if (buffer.byteLength === 0) {
        return res.status(500).json({
          success: false,
          message: 'El archivo está vacío'
        });
      }

      // Intenta decodificar como UTF-8, falla a latin-1 si es necesario
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

      // ----------------------------------------------------------------
      // BLOQUE 8.7: Limitación de contenido para archivos muy grandes
      // ----------------------------------------------------------------
      const maxLength = parseInt(limit);
      let isTruncated = false;
      
      if (textContent.length > maxLength) {
        textContent = textContent.substring(0, maxLength);
        isTruncated = true;
      }

      // ----------------------------------------------------------------
      // BLOQUE 8.8: Determinación del tipo MIME según extensión
      // ----------------------------------------------------------------
      let contentType = 'text/plain; charset=utf-8';
      if (extension === 'html' || extension === 'htm') contentType = 'text/html; charset=utf-8';
      if (extension === 'json') contentType = 'application/json; charset=utf-8';
      if (extension === 'xml') contentType = 'application/xml; charset=utf-8';
      if (extension === 'css') contentType = 'text/css; charset=utf-8';
      if (extension === 'js') contentType = 'application/javascript; charset=utf-8';
      if (extension === 'csv') contentType = 'text/csv; charset=utf-8';
      if (extension === 'md') contentType = 'text/markdown; charset=utf-8';

      // ----------------------------------------------------------------
      // BLOQUE 8.9: Configuración de headers informativos
      // ----------------------------------------------------------------
      res.setHeader('Content-Type', contentType);
      res.setHeader('X-File-Name', encodeURIComponent(documento.nombre_original));
      res.setHeader('X-File-Size', buffer.byteLength);
      res.setHeader('X-Content-Length', textContent.length);
      if (isTruncated) {
        res.setHeader('X-Content-Truncated', 'true');
        res.setHeader('X-Original-Length', buffer.byteLength);
      }

      // ----------------------------------------------------------------
      // BLOQUE 8.10: Envío del contenido al cliente
      // ----------------------------------------------------------------
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

  // ********************************************************************
  // MÓDULO 9: OBTENCIÓN DE INFORMACIÓN DETALLADA DEL DOCUMENTO
  // ********************************************************************
  // Descripción: Obtiene los metadatos completos de un documento específico
  // sin incluir el archivo binario. Útil para mostrar información detallada
  // en interfaces de usuario.
  // ********************************************************************
  static async getInfo(req, res) {
    try {
      const { id } = req.params;
      
      // ----------------------------------------------------------------
      // BLOQUE 9.1: Búsqueda con datos poblados de persona
      // ----------------------------------------------------------------
      const documento = await Document.findOne({ _id: id, activo: true })
        .populate('persona_id', 'nombre email departamento puesto');
      
      if (!documento) {
        return res.status(404).json({ 
          success: false, 
          message: 'Documento no encontrado' 
        });
      }
      
      // ----------------------------------------------------------------
      // BLOQUE 9.2: Estructuración de respuesta detallada
      // ----------------------------------------------------------------
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

  // ********************************************************************
  // MÓDULO 10: ACTUALIZACIÓN DE DOCUMENTO
  // ********************************************************************
  // Descripción: Permite actualizar tanto los metadatos del documento
  // como reemplazar completamente el archivo en Cloudinary. Maneja
  // eliminación del archivo anterior y upload del nuevo.
  // ********************************************************************
  static async update(req, res) {
    try {
      const { id } = req.params;
      console.log('📝 Actualizando documento:', id);

      // ----------------------------------------------------------------
      // BLOQUE 10.1: Validación de formato de ID
      // ----------------------------------------------------------------
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ 
          success: false, 
          message: 'ID inválido' 
        });
      }

      // ----------------------------------------------------------------
      // BLOQUE 10.2: Búsqueda del documento existente
      // ----------------------------------------------------------------
      const documento = await Document.findOne({ _id: id, activo: true });

      if (!documento) {
        return res.status(404).json({ 
          success: false, 
          message: 'Documento no encontrado' 
        });
      }

      // ----------------------------------------------------------------
      // BLOQUE 10.3: Reemplazo de archivo en Cloudinary (si se proporciona)
      // ----------------------------------------------------------------
      // Si se adjuntó un nuevo archivo en la solicitud, reemplaza el existente
      if (req.file) {
        console.log('📤 Nuevo archivo detectado, reemplazando en Cloudinary...');
        
        try {
          // Eliminar archivo anterior de Cloudinary
          if (documento.public_id) {
            await cloudinary.uploader.destroy(documento.public_id, {
              resource_type: documento.resource_type || 'auto'
            });
            console.log('🗑️ Archivo anterior eliminado de Cloudinary');
          }

          // Subir nuevo archivo a Cloudinary
          const cloudinaryResult = await FileService.uploadToCloudinary(req.file.path);
          console.log('✅ Nuevo archivo subido a Cloudinary');

          // Actualizar campos relacionados con el archivo
          documento.nombre_original = req.file.originalname;
          documento.tipo_archivo = req.file.originalname.split('.').pop().toLowerCase();
          documento.tamano_archivo = req.file.size;
          documento.cloudinary_url = cloudinaryResult.secure_url;
          documento.public_id = cloudinaryResult.public_id;
          documento.resource_type = cloudinaryResult.resource_type;

          // Limpiar archivo temporal
          FileService.cleanTempFile(req.file.path);
        } catch (uploadError) {
          console.error('❌ Error subiendo nuevo archivo:', uploadError);
          FileService.cleanTempFile(req.file && req.file.path);
          return res.status(500).json({ 
            success: false, 
            message: 'Error al subir el nuevo archivo: ' + uploadError.message 
          });
        }
      }

      // ----------------------------------------------------------------
      // BLOQUE 10.4: Actualización de campos de metadatos
      // ----------------------------------------------------------------
      // Actualiza solo los campos proporcionados en el body de la solicitud
      const { descripcion, categoria, fecha_vencimiento, persona_id } = req.body;
      
      if (descripcion !== undefined) documento.descripcion = descripcion;
      if (categoria !== undefined) documento.categoria = categoria;
      if (fecha_vencimiento !== undefined) documento.fecha_vencimiento = fecha_vencimiento || null;
      if (persona_id !== undefined) documento.persona_id = persona_id || null;

      await documento.save();
      console.log('✅ Documento actualizado exitosamente');

      // ----------------------------------------------------------------
      // BLOQUE 10.5: Obtención del documento actualizado con datos poblados
      // ----------------------------------------------------------------
      const documentoActualizado = await Document.findById(documento._id)
        .populate('persona_id', 'nombre');

      // ----------------------------------------------------------------
      // BLOQUE 10.6: Notificación de actualización
      // ----------------------------------------------------------------
      try {
        await NotificationService.create({
          titulo: 'Documento actualizado',
          mensaje: `El documento "${documento.nombre_original}" ha sido actualizado`,
          tipo: 'info',
          categoria: 'documento'
        });
      } catch (notifError) {
        console.error('⚠️ Error creando notificación:', notifError.message);
      }

      // ----------------------------------------------------------------
      // BLOQUE 10.7: Respuesta con documento actualizado
      // ----------------------------------------------------------------
      res.json({
        success: true,
        message: 'Documento actualizado correctamente',
        document: documentoActualizado
      });

    } catch (error) {
      console.error('❌ Error actualizando documento:', error);
      // Limpieza de archivo temporal en caso de error
      FileService.cleanTempFile(req.file && req.file.path);
      res.status(500).json({ 
        success: false, 
        message: 'Error al actualizar documento: ' + error.message 
      });
    }
  }
  
}

export default DocumentController;