import Document from '../models/Document.js';
import cloudinary from 'cloudinary';
import AuditLog from '../models/AuditLog.js'; // ✅ IMPORTACIÓN DIRECTA DEL MODELO
import mongoose from 'mongoose';

class TrashController {
  // ===========================================================================
  // OBTENER DOCUMENTOS EN PAPELERA - CON AUDITORÍA (SOLO LECTURA, OPCIONAL)
  // ===========================================================================
  static async getTrashDocuments(req, res) {
    try {
      console.log('🗑️ ========== OBTENIENDO PAPELERA ==========');
      
      const documents = await Document.find({ 
        isDeleted: true,
        activo: true
      })
        .populate('persona_id', 'nombre email departamento puesto')
        .sort({ deletedAt: -1 });

      console.log(`📊 Documentos en papelera encontrados: ${documents.length}`);
      
      // Calcular días restantes para cada documento
      const documentsWithDaysLeft = documents.map(doc => {
        const deletedDate = new Date(doc.deletedAt);
        const expirationDate = new Date(deletedDate);
        expirationDate.setDate(expirationDate.getDate() + 30);
        
        const now = new Date();
        const daysLeft = Math.ceil((expirationDate - now) / (1000 * 60 * 60 * 24));
        
        return {
          ...doc.toObject(),
          daysLeft: Math.max(0, daysLeft),
          expirationDate
        };
      });

      // =======================================================================
      // REGISTRAR EN AUDITORÍA (OPCIONAL, ES UNA CONSULTA DE LECTURA)
      // =======================================================================
      try {
        const auditData = {
          userId: req.user?._id || new mongoose.Types.ObjectId(),
          username: req.user?.usuario || 'sistema',
          userRole: req.user?.rol || 'sistema',
          userEmail: req.user?.correo || 'sistema@local',
          action: 'TRASH_VIEW',
          actionType: 'VIEW',
          actionCategory: 'TRASH',
          targetId: null,
          targetModel: 'Trash',
          targetName: 'Papelera',
          description: `Usuario visualizó la papelera (${documents.length} documentos)`,
          severity: 'INFO',
          status: 'SUCCESS',
          metadata: {
            ipAddress: req.ip || req.connection?.remoteAddress || '0.0.0.0',
            userAgent: req.headers['user-agent'] || 'Desconocido',
            documentCount: documents.length,
            timestamp: new Date().toISOString()
          }
        };

        await AuditLog.create(auditData);
        console.log('✅✅✅ VISUALIZACIÓN DE PAPELERA REGISTRADA EN AUDITORÍA');
      } catch (auditError) {
        console.error('❌ Error registrando visualización de papelera:', auditError.message);
        // No interrumpimos el flujo principal
      }

      console.log('🗑️ ========== FIN OBTENER PAPELERA ==========');
      res.json({ 
        success: true, 
        documents: documentsWithDaysLeft,
        count: documentsWithDaysLeft.length
      });
    } catch (error) {
      console.error('❌ Error obteniendo papelera:', error);
      
      // Registrar error en auditoría
      try {
        const auditData = {
          userId: req.user?._id || new mongoose.Types.ObjectId(),
          username: req.user?.usuario || 'sistema',
          userRole: req.user?.rol || 'sistema',
          userEmail: req.user?.correo || 'sistema@local',
          action: 'TRASH_VIEW',
          actionType: 'VIEW',
          actionCategory: 'TRASH',
          targetId: null,
          targetModel: 'Trash',
          targetName: 'Papelera',
          description: `Error al visualizar papelera: ${error.message}`,
          severity: 'ERROR',
          status: 'FAILED',
          metadata: {
            ipAddress: req.ip || req.connection?.remoteAddress || '0.0.0.0',
            userAgent: req.headers['user-agent'] || 'Desconocido',
            error: error.message,
            timestamp: new Date().toISOString()
          }
        };
        await AuditLog.create(auditData);
      } catch (auditError) {
        console.error('❌ Error registrando fallo de visualización:', auditError.message);
      }

      res.status(500).json({ 
        success: false, 
        message: 'Error al obtener documentos de la papelera' 
      });
    }
  }

  // ===========================================================================
  // RESTAURAR DOCUMENTO - CON AUDITORÍA (CORREGIDO)
  // ===========================================================================
  static async restoreDocument(req, res) {
    console.log('\n🔍 ========== RESTAURANDO DOCUMENTO ==========');
    console.log('📝 ID:', req.params.id);

    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        console.log('❌ ID inválido:', id);
        return res.status(400).json({ 
          success: false, 
          message: 'ID inválido' 
        });
      }

      const document = await Document.findById(id);
      if (!document) {
        console.log('❌ Documento no encontrado:', id);
        return res.status(404).json({ 
          success: false, 
          message: 'Documento no encontrado' 
        });
      }

      if (!document.isDeleted) {
        console.log('❌ Documento no está en papelera');
        return res.status(400).json({ 
          success: false, 
          message: 'El documento no está en la papelera' 
        });
      }

      // Guardar estado antes de restaurar
      const beforeState = {
        isDeleted: document.isDeleted,
        deletedAt: document.deletedAt,
        deletedBy: document.deletedBy
      };

      // Restaurar documento
      document.isDeleted = false;
      document.deletedAt = null;
      document.deletedBy = null;
      await document.save();

      console.log(`✅ Documento restaurado exitosamente: ${document.nombre_original}`);

      // =======================================================================
      // REGISTRAR RESTAURACIÓN EN AUDITORÍA (CORREGIDO)
      // =======================================================================
      try {
        const afterState = {
          isDeleted: document.isDeleted,
          deletedAt: document.deletedAt,
          deletedBy: document.deletedBy
        };

        const auditData = {
          userId: req.user?._id || new mongoose.Types.ObjectId(),
          username: req.user?.usuario || 'sistema',
          userRole: req.user?.rol || 'sistema',
          userEmail: req.user?.correo || 'sistema@local',
          action: 'DOCUMENT_RESTORE',
          actionType: 'UPDATE',
          actionCategory: 'DOCUMENTS',
          targetId: document._id,
          targetModel: 'Document',
          targetName: document.nombre_original, // ✅ CORREGIDO: nombre_original en lugar de nombre
          description: `Documento restaurado desde papelera: ${document.nombre_original}`, // ✅ CORREGIDO
          severity: 'INFO',
          status: 'SUCCESS',
          changes: {
            before: beforeState,
            after: afterState
          },
          metadata: {
            ipAddress: req.ip || req.connection?.remoteAddress || '0.0.0.0',
            userAgent: req.headers['user-agent'] || 'Desconocido',
            documentId: document._id.toString(),
            documentName: document.nombre_original,
            documentType: document.tipo_archivo,
            personaId: document.persona_id?.toString(),
            timestamp: new Date().toISOString()
          }
        };

        const auditLog = new AuditLog(auditData);
        await auditLog.save();
        console.log('✅✅✅ RESTAURACIÓN REGISTRADA EN AUDITORÍA - ID:', auditLog._id);

      } catch (auditError) {
        console.error('❌ Error registrando restauración:', auditError.message);
      }

      console.log('✅✅✅ RESTAURACIÓN COMPLETADA');
      console.log('🔍 ========== FIN ==========\n');

      res.json({ 
        success: true, 
        message: 'Documento restaurado correctamente',
        document 
      });
    } catch (error) {
      console.error('❌ Error restaurando documento:', error);
      
      // Registrar error en auditoría
      try {
        const auditData = {
          userId: req.user?._id || new mongoose.Types.ObjectId(),
          username: req.user?.usuario || 'sistema',
          userRole: req.user?.rol || 'sistema',
          userEmail: req.user?.correo || 'sistema@local',
          action: 'DOCUMENT_RESTORE',
          actionType: 'UPDATE',
          actionCategory: 'DOCUMENTS',
          targetId: req.params.id,
          targetModel: 'Document',
          targetName: 'Documento',
          description: `Error al restaurar documento: ${error.message}`,
          severity: 'ERROR',
          status: 'FAILED',
          metadata: {
            ipAddress: req.ip || req.connection?.remoteAddress || '0.0.0.0',
            userAgent: req.headers['user-agent'] || 'Desconocido',
            error: error.message,
            documentId: req.params.id,
            timestamp: new Date().toISOString()
          }
        };
        await AuditLog.create(auditData);
      } catch (auditError) {
        console.error('❌ Error registrando fallo de restauración:', auditError.message);
      }

      res.status(500).json({ 
        success: false, 
        message: 'Error al restaurar documento' 
      });
    }
  }

  // ===========================================================================
  // ELIMINAR DOCUMENTO PERMANENTEMENTE - CON AUDITORÍA
  // ===========================================================================
  static async deletePermanently(req, res) {
    console.log('\n🔍 ========== ELIMINANDO PERMANENTEMENTE DOCUMENTO ==========');
    console.log('📝 ID:', req.params.id);

    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        console.log('❌ ID inválido:', id);
        return res.status(400).json({ 
          success: false, 
          message: 'ID inválido' 
        });
      }

      const document = await Document.findById(id);
      if (!document) {
        console.log('❌ Documento no encontrado:', id);
        return res.status(404).json({ 
          success: false, 
          message: 'Documento no encontrado' 
        });
      }

      // Guardar datos del documento para auditoría
      const documentData = {
        id: document._id,
        nombre_original: document.nombre_original,
        tipo_archivo: document.tipo_archivo,
        tamano_archivo: document.tamano_archivo,
        public_id: document.public_id,
        persona_id: document.persona_id,
        categoria: document.categoria,
        isDeleted: document.isDeleted,
        deletedAt: document.deletedAt,
        deletedBy: document.deletedBy
      };

      // Eliminar de Cloudinary
      if (document.public_id) {
        try {
          await cloudinary.v2.uploader.destroy(document.public_id, {
            resource_type: document.resource_type || 'auto'
          });
          console.log(`☁️ Archivo eliminado de Cloudinary: ${document.public_id}`);
        } catch (cloudinaryError) {
          console.error('⚠️ Error eliminando de Cloudinary:', cloudinaryError);
          // No interrumpimos el flujo si falla Cloudinary
        }
      }

      // Marcar como inactivo en la base de datos
      document.activo = false;
      await document.save();
      console.log(`✅ Documento marcado como inactivo: ${document.nombre_original}`);

      // =======================================================================
      // REGISTRAR ELIMINACIÓN PERMANENTE EN AUDITORÍA
      // =======================================================================
      try {
        const auditData = {
          userId: req.user?._id || new mongoose.Types.ObjectId(),
          username: req.user?.usuario || 'sistema',
          userRole: req.user?.rol || 'sistema',
          userEmail: req.user?.correo || 'sistema@local',
          action: 'DOCUMENT_PERMANENT_DELETE',
          actionType: 'DELETE',
          actionCategory: 'DOCUMENTS',
          targetId: document._id,
          targetModel: 'Document',
          targetName: document.nombre_original,
          description: `Documento eliminado permanentemente de la papelera: ${document.nombre_original}`,
          severity: 'WARNING',
          status: 'SUCCESS',
          metadata: {
            ipAddress: req.ip || req.connection?.remoteAddress || '0.0.0.0',
            userAgent: req.headers['user-agent'] || 'Desconocido',
            documentId: document._id.toString(),
            documentName: document.nombre_original,
            documentType: document.tipo_archivo,
            documentSize: document.tamano_archivo,
            public_id: document.public_id,
            personaId: document.persona_id?.toString(),
            categoria: document.categoria,
            eliminacionPermanente: true,
            timestamp: new Date().toISOString()
          }
        };

        const auditLog = new AuditLog(auditData);
        await auditLog.save();
        console.log('✅✅✅ ELIMINACIÓN PERMANENTE REGISTRADA EN AUDITORÍA - ID:', auditLog._id);

      } catch (auditError) {
        console.error('❌ Error registrando eliminación permanente:', auditError.message);
      }

      console.log('✅✅✅ ELIMINACIÓN PERMANENTE COMPLETADA');
      console.log('🔍 ========== FIN ==========\n');

      res.json({ 
        success: true, 
        message: 'Documento eliminado permanentemente' 
      });
    } catch (error) {
      console.error('❌ Error eliminando documento permanentemente:', error);
      
      // Registrar error en auditoría
      try {
        const auditData = {
          userId: req.user?._id || new mongoose.Types.ObjectId(),
          username: req.user?.usuario || 'sistema',
          userRole: req.user?.rol || 'sistema',
          userEmail: req.user?.correo || 'sistema@local',
          action: 'DOCUMENT_PERMANENT_DELETE',
          actionType: 'DELETE',
          actionCategory: 'DOCUMENTS',
          targetId: req.params.id,
          targetModel: 'Document',
          targetName: 'Documento',
          description: `Error al eliminar documento permanentemente: ${error.message}`,
          severity: 'ERROR',
          status: 'FAILED',
          metadata: {
            ipAddress: req.ip || req.connection?.remoteAddress || '0.0.0.0',
            userAgent: req.headers['user-agent'] || 'Desconocido',
            error: error.message,
            documentId: req.params.id,
            timestamp: new Date().toISOString()
          }
        };
        await AuditLog.create(auditData);
      } catch (auditError) {
        console.error('❌ Error registrando fallo de eliminación permanente:', auditError.message);
      }

      res.status(500).json({ 
        success: false, 
        message: 'Error al eliminar documento permanentemente' 
      });
    }
  }

  // ===========================================================================
  // VACIAR PAPELERA COMPLETA - CON AUDITORÍA
  // ===========================================================================
  static async emptyTrash(req, res) {
    console.log('\n🔍 ========== VACIANDO PAPELERA COMPLETA ==========');

    try {
      const documents = await Document.find({ 
        isDeleted: true,
        activo: true
      });

      let deletedCount = 0;
      let errors = [];
      const deletedDocuments = []; // Para auditoría

      for (const doc of documents) {
        try {
          // Guardar datos para auditoría
          deletedDocuments.push({
            id: doc._id,
            nombre_original: doc.nombre_original,
            tipo_archivo: doc.tipo_archivo,
            public_id: doc.public_id,
            persona_id: doc.persona_id
          });

          // Eliminar de Cloudinary
          if (doc.public_id) {
            await cloudinary.v2.uploader.destroy(doc.public_id, {
              resource_type: doc.resource_type || 'auto'
            });
          }

          // Marcar como inactivo
          doc.activo = false;
          await doc.save();
          deletedCount++;
        } catch (error) {
          console.error(`Error eliminando documento ${doc._id}:`, error);
          errors.push({ id: doc._id, error: error.message });
        }
      }

      console.log(`✅ Papelera vaciada: ${deletedCount} documentos eliminados`);

      // =======================================================================
      // REGISTRAR VACIADO DE PAPELERA EN AUDITORÍA
      // =======================================================================
      try {
        const auditData = {
          userId: req.user?._id || new mongoose.Types.ObjectId(),
          username: req.user?.usuario || 'sistema',
          userRole: req.user?.rol || 'sistema',
          userEmail: req.user?.correo || 'sistema@local',
          action: 'TRASH_EMPTY',
          actionType: 'DELETE',
          actionCategory: 'TRASH',
          targetId: null,
          targetModel: 'Trash',
          targetName: 'Papelera',
          description: `Papelera vaciada: ${deletedCount} documentos eliminados permanentemente`,
          severity: 'WARNING',
          status: errors.length > 0 ? 'PARTIAL' : 'SUCCESS',
          metadata: {
            ipAddress: req.ip || req.connection?.remoteAddress || '0.0.0.0',
            userAgent: req.headers['user-agent'] || 'Desconocido',
            deletedCount,
            errors: errors.length > 0 ? errors : undefined,
            deletedDocuments: deletedDocuments.map(d => ({
              id: d.id.toString(),
              nombre_original: d.nombre_original,
              tipo_archivo: d.tipo_archivo
            })),
            timestamp: new Date().toISOString()
          }
        };

        const auditLog = new AuditLog(auditData);
        await auditLog.save();
        console.log('✅✅✅ VACIADO DE PAPELERA REGISTRADO EN AUDITORÍA - ID:', auditLog._id);

      } catch (auditError) {
        console.error('❌ Error registrando vaciado de papelera:', auditError.message);
      }

      console.log('✅✅✅ VACIADO DE PAPELERA COMPLETADO');
      console.log('🔍 ========== FIN ==========\n');

      res.json({ 
        success: true, 
        message: `Papelera vaciada: ${deletedCount} documentos eliminados`,
        deletedCount,
        errors: errors.length > 0 ? errors : undefined
      });
    } catch (error) {
      console.error('❌ Error vaciando papelera:', error);
      
      // Registrar error en auditoría
      try {
        const auditData = {
          userId: req.user?._id || new mongoose.Types.ObjectId(),
          username: req.user?.usuario || 'sistema',
          userRole: req.user?.rol || 'sistema',
          userEmail: req.user?.correo || 'sistema@local',
          action: 'TRASH_EMPTY',
          actionType: 'DELETE',
          actionCategory: 'TRASH',
          targetId: null,
          targetModel: 'Trash',
          targetName: 'Papelera',
          description: `Error al vaciar papelera: ${error.message}`,
          severity: 'ERROR',
          status: 'FAILED',
          metadata: {
            ipAddress: req.ip || req.connection?.remoteAddress || '0.0.0.0',
            userAgent: req.headers['user-agent'] || 'Desconocido',
            error: error.message,
            timestamp: new Date().toISOString()
          }
        };
        await AuditLog.create(auditData);
      } catch (auditError) {
        console.error('❌ Error registrando fallo de vaciado:', auditError.message);
      }

      res.status(500).json({ 
        success: false, 
        message: 'Error al vaciar papelera' 
      });
    }
  }

  // ===========================================================================
  // LIMPIEZA AUTOMÁTICA (documentos con más de 30 días) - CON AUDITORÍA
  // ===========================================================================
  static async autoCleanup(req, res) {
    console.log('\n🔍 ========== INICIANDO LIMPIEZA AUTOMÁTICA DE PAPELERA ==========');

    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const documents = await Document.find({ 
        isDeleted: true,
        activo: true,
        deletedAt: { $lt: thirtyDaysAgo }
      });

      let deletedCount = 0;
      const deletedDocuments = []; // Para auditoría

      for (const doc of documents) {
        try {
          // Guardar datos para auditoría
          deletedDocuments.push({
            id: doc._id,
            nombre_original: doc.nombre_original,
            tipo_archivo: doc.tipo_archivo,
            public_id: doc.public_id,
            persona_id: doc.persona_id,
            deletedAt: doc.deletedAt
          });

          // Eliminar de Cloudinary
          if (doc.public_id) {
            await cloudinary.v2.uploader.destroy(doc.public_id, {
              resource_type: doc.resource_type || 'auto'
            });
          }

          // Marcar como inactivo
          doc.activo = false;
          await doc.save();
          deletedCount++;
        } catch (error) {
          console.error(`Error en limpieza automática del documento ${doc._id}:`, error);
        }
      }

      console.log(`✅ Limpieza automática completada: ${deletedCount} documentos eliminados`);

      // =======================================================================
      // REGISTRAR LIMPIEZA AUTOMÁTICA EN AUDITORÍA
      // =======================================================================
      try {
        const auditData = {
          userId: new mongoose.Types.ObjectId(), // Sistema
          username: 'sistema',
          userRole: 'sistema',
          userEmail: 'sistema@local',
          action: 'TRASH_AUTO_CLEANUP',
          actionType: 'DELETE',
          actionCategory: 'TRASH',
          targetId: null,
          targetModel: 'Trash',
          targetName: 'Papelera',
          description: `Limpieza automática: ${deletedCount} documentos con más de 30 días eliminados permanentemente`,
          severity: 'INFO',
          status: 'SUCCESS',
          metadata: {
            ipAddress: req.ip || req.connection?.remoteAddress || '0.0.0.0',
            userAgent: req.headers['user-agent'] || 'Desconocido',
            deletedCount,
            daysThreshold: 30,
            cutoffDate: thirtyDaysAgo.toISOString(),
            deletedDocuments: deletedDocuments.map(d => ({
              id: d.id.toString(),
              nombre_original: d.nombre_original,
              tipo_archivo: d.tipo_archivo,
              deletedAt: d.deletedAt
            })),
            timestamp: new Date().toISOString()
          }
        };

        const auditLog = new AuditLog(auditData);
        await auditLog.save();
        console.log('✅✅✅ LIMPIEZA AUTOMÁTICA REGISTRADA EN AUDITORÍA - ID:', auditLog._id);

      } catch (auditError) {
        console.error('❌ Error registrando limpieza automática:', auditError.message);
      }

      console.log('✅✅✅ LIMPIEZA AUTOMÁTICA COMPLETADA');
      console.log('🔍 ========== FIN ==========\n');

      res.json({ 
        success: true, 
        message: `Limpieza automática completada: ${deletedCount} documentos eliminados`,
        deletedCount
      });
    } catch (error) {
      console.error('❌ Error en limpieza automática:', error);
      
      // Registrar error en auditoría
      try {
        const auditData = {
          userId: new mongoose.Types.ObjectId(), // Sistema
          username: 'sistema',
          userRole: 'sistema',
          userEmail: 'sistema@local',
          action: 'TRASH_AUTO_CLEANUP',
          actionType: 'DELETE',
          actionCategory: 'TRASH',
          targetId: null,
          targetModel: 'Trash',
          targetName: 'Papelera',
          description: `Error en limpieza automática: ${error.message}`,
          severity: 'ERROR',
          status: 'FAILED',
          metadata: {
            ipAddress: req.ip || req.connection?.remoteAddress || '0.0.0.0',
            userAgent: req.headers['user-agent'] || 'Desconocido',
            error: error.message,
            timestamp: new Date().toISOString()
          }
        };
        await AuditLog.create(auditData);
      } catch (auditError) {
        console.error('❌ Error registrando fallo de limpieza automática:', auditError.message);
      }

      res.status(500).json({ 
        success: false, 
        message: 'Error en limpieza automática' 
      });
    }
  }
}

export default TrashController;