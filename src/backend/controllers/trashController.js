import Document from '../models/Document.js';
import cloudinary from 'cloudinary';

class TrashController {
  // Obtener documentos en papelera
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

      console.log('🗑️ ========== FIN OBTENER PAPELERA ==========');
      res.json({ 
        success: true, 
        documents: documentsWithDaysLeft,
        count: documentsWithDaysLeft.length
      });
    } catch (error) {
      console.error('❌ Error obteniendo papelera:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error al obtener documentos de la papelera' 
      });
    }
  }

  // Restaurar documento
  static async restoreDocument(req, res) {
    try {
      const { id } = req.params;
      console.log(`♻️ Restaurando documento: ${id}`);

      const document = await Document.findById(id);
      if (!document) {
        return res.status(404).json({ 
          success: false, 
          message: 'Documento no encontrado' 
        });
      }

      if (!document.isDeleted) {
        return res.status(400).json({ 
          success: false, 
          message: 'El documento no está en la papelera' 
        });
      }

      document.isDeleted = false;
      document.deletedAt = null;
      document.deletedBy = null;
      await document.save();

      console.log(`✅ Documento restaurado exitosamente`);
      res.json({ 
        success: true, 
        message: 'Documento restaurado correctamente',
        document 
      });
    } catch (error) {
      console.error('❌ Error restaurando documento:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error al restaurar documento' 
      });
    }
  }

  // Eliminar documento permanentemente
  static async deletePermanently(req, res) {
    try {
      const { id } = req.params;
      console.log(`🗑️ Eliminando permanentemente documento: ${id}`);

      const document = await Document.findById(id);
      if (!document) {
        return res.status(404).json({ 
          success: false, 
          message: 'Documento no encontrado' 
        });
      }

      // Eliminar de Cloudinary
      if (document.public_id) {
        try {
          await cloudinary.v2.uploader.destroy(document.public_id, {
            resource_type: document.resource_type || 'auto'
          });
          console.log(`☁️ Archivo eliminado de Cloudinary`);
        } catch (cloudinaryError) {
          console.error('⚠️ Error eliminando de Cloudinary:', cloudinaryError);
        }
      }

      // Marcar como inactivo en la base de datos
      document.activo = false;
      await document.save();

      console.log(`✅ Documento eliminado permanentemente`);
      res.json({ 
        success: true, 
        message: 'Documento eliminado permanentemente' 
      });
    } catch (error) {
      console.error('❌ Error eliminando documento permanentemente:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error al eliminar documento permanentemente' 
      });
    }
  }

  // Vaciar papelera completa
  static async emptyTrash(req, res) {
    try {
      console.log('🗑️ Vaciando papelera completa...');

      const documents = await Document.find({ 
        isDeleted: true,
        activo: true
      });

      let deletedCount = 0;
      let errors = [];

      for (const doc of documents) {
        try {
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
      res.json({ 
        success: true, 
        message: `Papelera vaciada: ${deletedCount} documentos eliminados`,
        deletedCount,
        errors: errors.length > 0 ? errors : undefined
      });
    } catch (error) {
      console.error('❌ Error vaciando papelera:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error al vaciar papelera' 
      });
    }
  }

  // Limpieza automática (documentos con más de 30 días)
  static async autoCleanup(req, res) {
    try {
      console.log('🧹 Iniciando limpieza automática de papelera...');

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const documents = await Document.find({ 
        isDeleted: true,
        activo: true,
        deletedAt: { $lt: thirtyDaysAgo }
      });

      let deletedCount = 0;

      for (const doc of documents) {
        try {
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
      res.json({ 
        success: true, 
        message: `Limpieza automática completada: ${deletedCount} documentos eliminados`,
        deletedCount
      });
    } catch (error) {
      console.error('❌ Error en limpieza automática:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error en limpieza automática' 
      });
    }
  }
}

export default TrashController;
