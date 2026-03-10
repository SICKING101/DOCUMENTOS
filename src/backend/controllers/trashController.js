import Document from '../models/Document.js';
import cloudinary from 'cloudinary';
import AuditService from '../services/auditService.js';
import mongoose from 'mongoose';

class TrashController {
  // ===========================================================================
  // OBTENER DOCUMENTOS EN PAPELERA
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
      // REGISTRAR EN AUDITORÍA
      // =======================================================================
      
      try {
        await AuditService.logTrashView(req, documents.length);
        console.log('✅✅✅ VISUALIZACIÓN DE PAPELERA REGISTRADA EN AUDITORÍA');
      } catch (auditError) {
        console.error('❌ Error registrando visualización de papelera:', auditError.message);
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
        await AuditService.log(req, {
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
            error: error.message
          }
        });
      } catch (auditError) {
        console.error('❌ Error registrando fallo de visualización:', auditError.message);
      }

      res.status(500).json({ 
        success: false, 
        message: 'Error al obtener documentos de la papelera: ' + error.message 
      });
    }
  }

  // ===========================================================================
  // RESTAURAR DOCUMENTO
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

      // Estado después
      const afterState = {
        isDeleted: document.isDeleted,
        deletedAt: document.deletedAt,
        deletedBy: document.deletedBy
      };

      console.log(`✅ Documento restaurado exitosamente: ${document.nombre_original}`);

      // =======================================================================
      // REGISTRAR RESTAURACIÓN EN AUDITORÍA
      // =======================================================================
      
      try {
        await AuditService.logDocumentRestore(req, document, beforeState, afterState);
        console.log('✅✅✅ RESTAURACIÓN REGISTRADA EN AUDITORÍA');
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
        await AuditService.log(req, {
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
            error: error.message,
            documentId: req.params.id
          }
        });
      } catch (auditError) {
        console.error('❌ Error registrando fallo de restauración:', auditError.message);
      }

      res.status(500).json({ 
        success: false, 
        message: 'Error al restaurar documento: ' + error.message 
      });
    }
  }

  // ===========================================================================
  // ELIMINAR DOCUMENTO PERMANENTEMENTE
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

      // Guardar datos del documento para referencia
      const documentData = {
        _id: document._id,
        nombre_original: document.nombre_original,
        tipo_archivo: document.tipo_archivo,
        tamano_archivo: document.tamano_archivo,
        public_id: document.public_id,
        persona_id: document.persona_id,
        categoria: document.categoria
      };

      // Eliminar de Cloudinary
      if (document.public_id) {
        try {
          await cloudinary.v2.uploader.destroy(document.public_id, {
            resource_type: document.resource_type || 'auto'
          });
          console.log(`☁️ Archivo eliminado de Cloudinary: ${document.public_id}`);
        } catch (cloudinaryError) {
          console.error('⚠️ Error eliminando de Cloudinary:', cloudinaryError.message);
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
        await AuditService.logDocumentDelete(req, document, false); // false = eliminación permanente
        console.log('✅✅✅ ELIMINACIÓN PERMANENTE REGISTRADA EN AUDITORÍA');
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
        await AuditService.log(req, {
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
            error: error.message,
            documentId: req.params.id
          }
        });
      } catch (auditError) {
        console.error('❌ Error registrando fallo de eliminación permanente:', auditError.message);
      }

      res.status(500).json({ 
        success: false, 
        message: 'Error al eliminar documento permanentemente: ' + error.message 
      });
    }
  }

  // ===========================================================================
  // VACIAR PAPELERA COMPLETA
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
      const deletedDocuments = [];

      for (const doc of documents) {
        try {
          // Guardar datos para auditoría
          deletedDocuments.push({
            _id: doc._id,
            nombre_original: doc.nombre_original,
            tipo_archivo: doc.tipo_archivo,
            public_id: doc.public_id
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
          console.error(`Error eliminando documento ${doc._id}:`, error.message);
          errors.push({ id: doc._id, error: error.message });
        }
      }

      console.log(`✅ Papelera vaciada: ${deletedCount} documentos eliminados`);

      // =======================================================================
      // REGISTRAR VACIADO DE PAPELERA EN AUDITORÍA
      // =======================================================================
      
      try {
        await AuditService.logTrashEmpty(req, deletedCount, deletedDocuments);
        console.log('✅✅✅ VACIADO DE PAPELERA REGISTRADO EN AUDITORÍA');
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
        await AuditService.log(req, {
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
            error: error.message
          }
        });
      } catch (auditError) {
        console.error('❌ Error registrando fallo de vaciado:', auditError.message);
      }

      res.status(500).json({ 
        success: false, 
        message: 'Error al vaciar papelera: ' + error.message 
      });
    }
  }

  // ===========================================================================
  // LIMPIEZA AUTOMÁTICA (documentos con más de 30 días)
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
      const deletedDocuments = [];

      for (const doc of documents) {
        try {
          // Guardar datos para auditoría
          deletedDocuments.push({
            _id: doc._id,
            nombre_original: doc.nombre_original,
            tipo_archivo: doc.tipo_archivo,
            public_id: doc.public_id,
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
          console.error(`Error en limpieza automática del documento ${doc._id}:`, error.message);
        }
      }

      console.log(`✅ Limpieza automática completada: ${deletedCount} documentos eliminados`);

      // =======================================================================
      // REGISTRAR LIMPIEZA AUTOMÁTICA EN AUDITORÍA
      // =======================================================================
      
      try {
        await AuditService.logTrashAutoCleanup(req, deletedCount, 30);
        console.log('✅✅✅ LIMPIEZA AUTOMÁTICA REGISTRADA EN AUDITORÍA');
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
        await AuditService.log(req, {
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
            error: error.message
          }
        });
      } catch (auditError) {
        console.error('❌ Error registrando fallo de limpieza automática:', auditError.message);
      }

      res.status(500).json({ 
        success: false, 
        message: 'Error en limpieza automática: ' + error.message 
      });
    }
  }
}

export default TrashController;