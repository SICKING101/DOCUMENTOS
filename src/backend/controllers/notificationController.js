import NotificationService from '../services/notificationService.js';

class NotificationController {
  // Obtener todas las notificaciones con filtros
  static async getAll(req, res) {
    try {
      console.log('📥 Obteniendo notificaciones con filtros:', req.query);
      
      const {
        leida,
        tipo,
        prioridad,
        desde,
        hasta,
        limite = 50,
        pagina = 1
      } = req.query;

      const filtros = {};
      if (leida !== undefined) filtros.leida = leida === 'true';
      if (tipo) filtros.tipo = tipo;
      if (prioridad) filtros.prioridad = prioridad;
      if (desde) filtros.desde = desde;
      if (hasta) filtros.hasta = hasta;

      const resultado = await NotificationService.obtener(filtros, {
        limite: parseInt(limite),
        pagina: parseInt(pagina)
      });

      console.log(`✅ ${resultado.notificaciones.length} notificaciones obtenidas`);

      res.json({
        success: true,
        data: resultado
      });

    } catch (error) {
      console.error('❌ Error obteniendo notificaciones:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener notificaciones: ' + error.message
      });
    }
  }

  // Obtener notificaciones no leídas
  static async getUnread(req, res) {
    try {
      console.log('📥 Obteniendo notificaciones no leídas');
      
      const resultado = await NotificationService.obtener({ leida: false });
      
      console.log(`✅ ${resultado.notificaciones.length} notificaciones no leídas`);

      res.json({
        success: true,
        data: resultado
      });

    } catch (error) {
      console.error('❌ Error obteniendo notificaciones no leídas:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener notificaciones: ' + error.message
      });
    }
  }

  // Obtener estadísticas de notificaciones
  static async getStats(req, res) {
    try {
      console.log('📊 Obteniendo estadísticas de notificaciones');
      
      const estadisticas = await NotificationService.obtenerEstadisticas();
      
      console.log('✅ Estadísticas obtenidas:', estadisticas);

      res.json({
        success: true,
        data: estadisticas
      });

    } catch (error) {
      console.error('❌ Error obteniendo estadísticas:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener estadísticas: ' + error.message
      });
    }
  }

  // Marcar notificación como leída
  static async markAsRead(req, res) {
    try {
      const { id } = req.params;
      console.log('✅ Marcando notificación como leída:', id);

      const notificacion = await NotificationService.marcarLeida(id);

      res.json({
        success: true,
        message: 'Notificación marcada como leída',
        data: notificacion
      });

    } catch (error) {
      console.error('❌ Error marcando notificación:', error);
      res.status(500).json({
        success: false,
        message: 'Error al marcar notificación: ' + error.message
      });
    }
  }

  // Marcar todas las notificaciones como leídas
  static async markAllAsRead(req, res) {
    try {
      console.log('✅ Marcando todas las notificaciones como leídas');

      const cantidad = await NotificationService.marcarTodasLeidas();

      res.json({
        success: true,
        message: `${cantidad} notificación(es) marcada(s) como leída(s)`,
        data: { cantidad }
      });

    } catch (error) {
      console.error('❌ Error marcando notificaciones:', error);
      res.status(500).json({
        success: false,
        message: 'Error al marcar notificaciones: ' + error.message
      });
    }
  }

  // Eliminar notificación
  static async delete(req, res) {
    try {
      const { id } = req.params;
      console.log('🗑️ Eliminando notificación:', id);

      await NotificationService.eliminar(id);

      res.json({
        success: true,
        message: 'Notificación eliminada correctamente'
      });

    } catch (error) {
      console.error('❌ Error eliminando notificación:', error);
      res.status(500).json({
        success: false,
        message: 'Error al eliminar notificación: ' + error.message
      });
    }
  }

  // Limpiar notificaciones antiguas
  static async cleanup(req, res) {
    try {
      const { dias = 30 } = req.body;
      console.log(`🧹 Limpiando notificaciones de más de ${dias} días`);

      const cantidad = await NotificationService.limpiarAntiguas(dias);

      res.json({
        success: true,
        message: `${cantidad} notificación(es) antigua(s) eliminada(s)`,
        data: { cantidad }
      });

    } catch (error) {
      console.error('❌ Error limpiando notificaciones:', error);
      res.status(500).json({
        success: false,
        message: 'Error al limpiar notificaciones: ' + error.message
      });
    }
  }
}

export default NotificationController;