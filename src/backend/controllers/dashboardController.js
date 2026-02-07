import Person from '../models/Person.js';
import Category from '../models/Category.js';
import Document from '../models/Document.js';

// ============================================================================
// SECCIÓN: CONTROLADOR DEL DASHBOARD/PANEL DE CONTROL
// ============================================================================
// Este archivo maneja las operaciones relacionadas con el dashboard principal
// del sistema. Proporciona estadísticas clave y datos resumidos para dar una
// visión general rápida del estado actual del sistema de gestión de documentos.
// ============================================================================

class DashboardController {
  
  // ********************************************************************
  // MÓDULO 1: OBTENCIÓN DE ESTADÍSTICAS DEL DASHBOARD
  // ********************************************************************
  // Descripción: Obtiene las métricas principales y datos resumidos para
  // el panel de control principal. Incluye conteos de entidades clave,
  // documentos próximos a vencer y documentos recientemente subidos.
  // Esta función es típicamente llamada al cargar la página principal.
  // ********************************************************************
  static async getDashboardStats(req, res) {
    try {
      // ----------------------------------------------------------------
      // BLOQUE 1.1: Conteo de personas activas
      // ----------------------------------------------------------------
      // Cuenta todas las personas con estado activo en el sistema.
      // Este número representa el total de usuarios/personas que pueden
      // tener documentos asignados.
      const totalPersonas = await Person.countDocuments({ activo: true });
      
      // ----------------------------------------------------------------
      // BLOQUE 1.2: Conteo de documentos activos
      // ----------------------------------------------------------------
      // Cuenta todos los documentos que están activos en el sistema
      // (no eliminados, no en papelera de reciclaje).
      const totalDocumentos = await Document.countDocuments({ activo: true });
      
      // ----------------------------------------------------------------
      // BLOQUE 1.3: Conteo de categorías activas
      // ----------------------------------------------------------------
      // Cuenta todas las categorías disponibles para clasificar documentos.
      const totalCategorias = await Category.countDocuments({ activo: true });

      // ----------------------------------------------------------------
      // BLOQUE 1.4: Cálculo de documentos próximos a vencer
      // ----------------------------------------------------------------
      // Cuenta documentos cuya fecha de vencimiento está dentro de los
      // próximos 30 días. Esto ayuda a identificar documentos que requieren
      // atención pronto para evitar que expiren.
      const fechaLimite = new Date();
      fechaLimite.setDate(fechaLimite.getDate() + 30);
      const proximosVencer = await Document.countDocuments({
        activo: true,
        fecha_vencimiento: { 
          $gte: new Date(),        // Mayor o igual a hoy
          $lte: fechaLimite        // Menor o igual a hoy+30 días
        }
      });

      // ----------------------------------------------------------------
      // BLOQUE 1.5: Obtención de documentos recientes
      // ----------------------------------------------------------------
      // Recupera los 5 documentos más recientemente subidos al sistema.
      // Se usa populate para incluir información básica de la persona
      // asignada y lean() para mejor rendimiento.
      const recentDocuments = await Document.find({ activo: true })
        .populate('persona_id', 'nombre') // Solo el campo 'nombre' de la persona
        .sort({ fecha_subida: -1 })       // Orden descendente (más recientes primero)
        .limit(5)                         // Limitar a 5 resultados
        .lean();                          // Devuelve objetos planos de JavaScript

      // ----------------------------------------------------------------
      // BLOQUE 1.6: Estructuración de la respuesta
      // ----------------------------------------------------------------
      // Organiza los datos en una estructura clara que separa las
      // estadísticas numéricas de la lista de documentos recientes.
      res.json({
        success: true,
        stats: {
          totalPersonas,
          totalDocumentos,
          proximosVencer,
          totalCategorias
        },
        recent_documents: recentDocuments
      });
      
    } catch (error) {
      console.error('Error en dashboard:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error al cargar el dashboard' 
      });
    }
  }
}

export default DashboardController;