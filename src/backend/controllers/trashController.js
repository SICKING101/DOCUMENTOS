import Document from '../models/Document.js';
import cloudinary from 'cloudinary';

// ============================================================================
// SECCIÓN: CONTROLADOR DE PAPELERA/RECICLAJE
// ============================================================================
// Este archivo maneja todas las operaciones relacionadas con la gestión de
// documentos eliminados (papelera de reciclaje). Incluye funcionalidades para
// listar documentos en papelera, restaurarlos, eliminarlos permanentemente,
// vaciar la papelera completa y realizar limpiezas automáticas por tiempo.
// ============================================================================

class TrashController {
  
  // ********************************************************************
  // MÓDULO 1: OBTENCIÓN DE DOCUMENTOS EN PAPELERA
  // ********************************************************************
  // Descripción: Obtiene todos los documentos marcados como eliminados
  // (isDeleted: true) que aún están activos en el sistema. Incluye cálculo
  // de días restantes antes de la eliminación permanente automática (30 días).
  // ********************************************************************
  static async getTrashDocuments(req, res) {
    try {
      console.log('🗑️ ========== OBTENIENDO PAPELERA ==========');
      
      // ----------------------------------------------------------------
      // BLOQUE 1.1: Consulta de documentos en papelera
      // ----------------------------------------------------------------
      // Busca documentos con isDeleted=true y activo=true (aún no eliminados
      // permanentemente). Popula los datos de la persona relacionada para
      // mostrar información contextual. Ordena por fecha de eliminación
      // descendente (más recientes primero).
      const documents = await Document.find({ 
        isDeleted: true,
        activo: true
      })
        .populate('persona_id', 'nombre email departamento puesto')
        .sort({ deletedAt: -1 });

      console.log(`📊 Documentos en papelera encontrados: ${documents.length}`);
      
      // ----------------------------------------------------------------
      // BLOQUE 1.2: Cálculo de días restantes para eliminación permanente
      // ----------------------------------------------------------------
      // Para cada documento, calcula cuántos días faltan para que se elimine
      // automáticamente (30 días después de deletedAt). Usa Math.max para
      // asegurar que nunca sea negativo (0 si ya pasó la fecha).
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
      
      // ----------------------------------------------------------------
      // BLOQUE 1.3: Respuesta con datos enriquecidos
      // ----------------------------------------------------------------
      // Devuelve los documentos con los días calculados y un conteo total
      // para que el frontend pueda mostrar información como "X documentos
      // en papelera, Y días restantes".
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

  // ********************************************************************
  // MÓDULO 2: RESTAURACIÓN DE DOCUMENTO
  // ********************************************************************
  // Descripción: Restaura un documento desde la papelera a su estado normal
  // (isDeleted: false). Limpia los campos relacionados con la eliminación
  // y permite que el documento vuelva a estar disponible en el sistema.
  // ********************************************************************
  static async restoreDocument(req, res) {
    try {
      const { id } = req.params;
      console.log(`♻️ Restaurando documento: ${id}`);

      // ----------------------------------------------------------------
      // BLOQUE 2.1: Verificación de existencia del documento
      // ----------------------------------------------------------------
      // Obtiene el documento completo para validar que existe y verificar
      // su estado actual antes de proceder con la restauración.
      const document = await Document.findById(id);
      if (!document) {
        return res.status(404).json({ 
          success: false, 
          message: 'Documento no encontrado' 
        });
      }

      // ----------------------------------------------------------------
      // BLOQUE 2.2: Validación de estado en papelera
      // ----------------------------------------------------------------
      // Verifica que el documento realmente esté marcado como eliminado.
      // Previene intentos de restaurar documentos que ya están activos.
      if (!document.isDeleted) {
        return res.status(400).json({ 
          success: false, 
          message: 'El documento no está en la papelera' 
        });
      }

      // ----------------------------------------------------------------
      // BLOQUE 2.3: Restauración de campos de eliminación
      // ----------------------------------------------------------------
      // Reestablece los tres campos relacionados con eliminación:
      // - isDeleted: vuelve a false (documento activo)
      // - deletedAt: se establece a null (elimina timestamp)
      // - deletedBy: se establece a null (elimina referencia al usuario)
      document.isDeleted = false;
      document.deletedAt = null;
      document.deletedBy = null;
      await document.save();

      console.log(`✅ Documento restaurado exitosamente`);
      
      // ----------------------------------------------------------------
      // BLOQUE 2.4: Respuesta con documento actualizado
      // ----------------------------------------------------------------
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

  // ********************************************************************
  // MÓDULO 3: ELIMINACIÓN PERMANENTE DE DOCUMENTO
  // ********************************************************************
  // Descripción: Elimina permanentemente un documento específico de la
  // papelera. Esto implica dos acciones: eliminar el archivo físico de
  // Cloudinary y marcar el registro como inactivo en la base de datos.
  // ********************************************************************
  static async deletePermanently(req, res) {
    try {
      const { id } = req.params;
      console.log(`🗑️ Eliminando permanentemente documento: ${id}`);

      // ----------------------------------------------------------------
      // BLOQUE 3.1: Verificación de existencia del documento
      // ----------------------------------------------------------------
      const document = await Document.findById(id);
      if (!document) {
        return res.status(404).json({ 
          success: false, 
          message: 'Documento no encontrado' 
        });
      }

      // ----------------------------------------------------------------
      // BLOQUE 3.2: Eliminación del archivo en Cloudinary
      // ----------------------------------------------------------------
      // Si el documento tiene un public_id (identificador único en Cloudinary),
      // intenta eliminar el archivo físico del servicio de almacenamiento.
      // Esta operación es independiente de la eliminación en la base de datos.
      if (document.public_id) {
        try {
          // resource_type: 'auto' permite que Cloudinary detecte automáticamente
          // si es imagen, video, PDF, etc., y lo elimine correctamente.
          await cloudinary.v2.uploader.destroy(document.public_id, {
            resource_type: document.resource_type || 'auto'
          });
          console.log(`☁️ Archivo eliminado de Cloudinary`);
        } catch (cloudinaryError) {
          // Si falla la eliminación en Cloudinary, solo se registra el error
          // pero se continúa con la eliminación en la base de datos.
          // Esto evita que un problema en Cloudinary bloquee completamente
          // la gestión de la papelera.
          console.error('⚠️ Error eliminando de Cloudinary:', cloudinaryError);
        }
      }

      // ----------------------------------------------------------------
      // BLOQUE 3.3: Eliminación lógica permanente en base de datos
      // ----------------------------------------------------------------
      // Marca el documento como inactivo (activo: false) en lugar de
      // eliminarlo físicamente de la colección. Esto mantiene un registro
      // histórico pero lo excluye de todas las consultas normales.
      document.activo = false;
      await document.save();

      console.log(`✅ Documento eliminado permanentemente`);
      
      // ----------------------------------------------------------------
      // BLOQUE 3.4: Confirmación de eliminación completa
      // ----------------------------------------------------------------
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

  // ********************************************************************
  // MÓDULO 4: VACIADO COMPLETO DE PAPELERA
  // ********************************************************************
  // Descripción: Elimina permanentemente TODOS los documentos que están
  // actualmente en la papelera. Procesa cada documento individualmente
  // para manejar posibles errores específicos sin fallar toda la operación.
  // ********************************************************************
  static async emptyTrash(req, res) {
    try {
      console.log('🗑️ Vaciando papelera completa...');

      // ----------------------------------------------------------------
      // BLOQUE 4.1: Obtención de todos los documentos en papelera
      // ----------------------------------------------------------------
      // Busca todos los documentos marcados como eliminados pero aún activos.
      const documents = await Document.find({ 
        isDeleted: true,
        activo: true
      });

      let deletedCount = 0;
      let errors = [];

      // ----------------------------------------------------------------
      // BLOQUE 4.2: Procesamiento secuencial con manejo de errores
      // ----------------------------------------------------------------
      // Usa un bucle for...of en lugar de Promise.all para procesar los
      // documentos uno por uno, permitiendo un mejor control de errores
      // y evitando sobrecargar Cloudinary con múltiples peticiones simultáneas.
      for (const doc of documents) {
        try {
          // Eliminar de Cloudinary si existe el archivo
          if (doc.public_id) {
            await cloudinary.v2.uploader.destroy(doc.public_id, {
              resource_type: doc.resource_type || 'auto'
            });
          }

          // Marcar como inactivo en base de datos
          doc.activo = false;
          await doc.save();
          deletedCount++;
          
        } catch (error) {
          // Si falla un documento específico, registra el error pero
          // continúa con los demás documentos.
          console.error(`Error eliminando documento ${doc._id}:`, error);
          errors.push({ id: doc._id, error: error.message });
        }
      }

      console.log(`✅ Papelera vaciada: ${deletedCount} documentos eliminados`);
      
      // ----------------------------------------------------------------
      // BLOQUE 4.3: Respuesta con reporte detallado
      // ----------------------------------------------------------------
      // Incluye conteo de eliminaciones exitosas y, si hubo errores,
      // una lista de los documentos que fallaron para que el administrador
      // pueda tomar acción correctiva.
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

  // ********************************************************************
  // MÓDULO 5: LIMPIEZA AUTOMÁTICA POR TIEMPO
  // ********************************************************************
  // Descripción: Ejecuta una limpieza automática de documentos que llevan
  // más de 30 días en la papelera. Esta función puede ser llamada manualmente
  // o programada como tarea periódica (cron job).
  // ********************************************************************
  static async autoCleanup(req, res) {
    try {
      console.log('🧹 Iniciando limpieza automática de papelera...');

      // ----------------------------------------------------------------
      // BLOQUE 5.1: Cálculo de fecha límite (30 días atrás)
      // ----------------------------------------------------------------
      // Crea una fecha que representa "hace 30 días". Los documentos con
      // deletedAt anterior a esta fecha serán eliminados permanentemente.
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // ----------------------------------------------------------------
      // BLOQUE 5.2: Consulta de documentos antiguos
      // ----------------------------------------------------------------
      // Busca documentos que cumplan tres condiciones:
      // 1. Están marcados como eliminados (isDeleted: true)
      // 2. Siguen activos en el sistema (activo: true)
      // 3. Fueron eliminados hace más de 30 días (deletedAt < thirtyDaysAgo)
      const documents = await Document.find({ 
        isDeleted: true,
        activo: true,
        deletedAt: { $lt: thirtyDaysAgo }
      });

      let deletedCount = 0;

      // ----------------------------------------------------------------
      // BLOQUE 5.3: Procesamiento con tolerancia a fallos
      // ----------------------------------------------------------------
      // Similar al vaciado completo, pero con un manejo de errores más
      // silencioso ya que es una operación automática.
      for (const doc of documents) {
        try {
          // Eliminar archivo de Cloudinary si existe
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
          // En limpieza automática, solo se registra el error sin
          // detener el proceso ni reportarlo al usuario final.
          console.error(`Error en limpieza automática del documento ${doc._id}:`, error);
        }
      }

      console.log(`✅ Limpieza automática completada: ${deletedCount} documentos eliminados`);
      
      // ----------------------------------------------------------------
      // BLOQUE 5.4: Respuesta con métricas de limpieza
      // ----------------------------------------------------------------
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