// src/backend/controllers/notificationController.js
import NotificationService from '../services/notificationService.js';

class NotificationController {
  
  static async getAll(req, res) {
    try {
      console.log('📥 Obteniendo notificaciones - schoolId:', req.schoolId || 'superadmin');
      
      const {
        leida, tipo, prioridad, desde, hasta,
        limite = 50, pagina = 1
      } = req.query;

      const filtros = {};
      if (leida !== undefined) filtros.leida = leida === 'true';
      if (tipo) filtros.tipo = tipo;
      if (prioridad) filtros.prioridad = prioridad;
      if (desde) filtros.desde = desde;
      if (hasta) filtros.hasta = hasta;
      
      // ✅ Pasar schoolId al servicio
      if (req.schoolId) {
        filtros.schoolId = req.schoolId;
      }

      const resultado = await NotificationService.obtener(filtros, {
        limite: parseInt(limite),
        pagina: parseInt(pagina)
      });

      console.log(`✅ ${resultado.notificaciones.length} notificaciones obtenidas`);
      res.json({ success: true, data: resultado });
    } catch (error) {
      console.error('❌ Error obteniendo notificaciones:', error);
      res.status(500).json({ success: false, message: 'Error al obtener notificaciones: ' + error.message });
    }
  }

  static async getUnread(req, res) {
    try {
      const filtros = { leida: false };
      if (req.schoolId) filtros.schoolId = req.schoolId;
      
      const resultado = await NotificationService.obtener(filtros);
      console.log(`✅ ${resultado.notificaciones.length} notificaciones no leídas`);
      res.json({ success: true, data: resultado });
    } catch (error) {
      console.error('❌ Error obteniendo notificaciones no leídas:', error);
      res.status(500).json({ success: false, message: 'Error al obtener notificaciones: ' + error.message });
    }
  }

  static async getStats(req, res) {
    try {
      const estadisticas = await NotificationService.obtenerEstadisticas(req.schoolId || null);
      res.json({ success: true, data: estadisticas });
    } catch (error) {
      console.error('❌ Error obteniendo estadísticas:', error);
      res.status(500).json({ success: false, message: 'Error al obtener estadísticas: ' + error.message });
    }
  }

  static async markAsRead(req, res) {
    try {
      const { id } = req.params;
      const notificacion = await NotificationService.marcarLeida(id);
      res.json({ success: true, message: 'Notificación marcada como leída', data: notificacion });
    } catch (error) {
      console.error('❌ Error marcando notificación:', error);
      res.status(500).json({ success: false, message: 'Error al marcar notificación: ' + error.message });
    }
  }

  static async markAllAsRead(req, res) {
    try {
      const cantidad = await NotificationService.marcarTodasLeidas(req.schoolId || null);
      res.json({ success: true, message: `${cantidad} notificación(es) marcada(s) como leída(s)`, data: { cantidad } });
    } catch (error) {
      console.error('❌ Error marcando notificaciones:', error);
      res.status(500).json({ success: false, message: 'Error al marcar notificaciones: ' + error.message });
    }
  }

  static async delete(req, res) {
    try {
      const { id } = req.params;
      await NotificationService.eliminar(id);
      res.json({ success: true, message: 'Notificación eliminada correctamente' });
    } catch (error) {
      console.error('❌ Error eliminando notificación:', error);
      res.status(500).json({ success: false, message: 'Error al eliminar notificación: ' + error.message });
    }
  }

  static async cleanup(req, res) {
    try {
      const { dias = 30 } = req.body;
      const cantidad = await NotificationService.limpiarAntiguas(dias);
      res.json({ success: true, message: `${cantidad} notificación(es) antigua(s) eliminada(s)`, data: { cantidad } });
    } catch (error) {
      console.error('❌ Error limpiando notificaciones:', error);
      res.status(500).json({ success: false, message: 'Error al limpiar notificaciones: ' + error.message });
    }
  }
}

export default NotificationController;