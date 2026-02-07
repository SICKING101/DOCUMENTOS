import NotificationService from '../services/notificationService.js';

// ============================================================================
// SECCIÓN: CONTROLADOR DE NOTIFICACIONES
// ============================================================================
// Este archivo maneja todas las operaciones relacionadas con notificaciones.
// Actúa como intermediario entre las rutas HTTP y el servicio de notificaciones,
// manejando la lógica de peticiones/respuestas, validaciones básicas y errores.
// ============================================================================

class NotificationController {
  
  // ********************************************************************
  // MÓDULO 1: OBTENCIÓN DE NOTIFICACIONES CON FILTROS
  // ********************************************************************
  // Descripción: Obtiene una lista paginada de notificaciones aplicando
  // filtros opcionales como estado de lectura, tipo, prioridad y rango de fechas.
  // Incluye paginación para manejar grandes volúmenes de datos.
  // ********************************************************************
  static async getAll(req, res) {
    try {
      console.log('📥 Obteniendo notificaciones con filtros:', req.query);
      
      // ----------------------------------------------------------------
      // BLOQUE 1.1: Extracción y preparación de parámetros de consulta
      // ----------------------------------------------------------------
      // Desestructura los query parameters para obtener los filtros y
      // opciones de paginación. Establece valores por defecto para
      // límite y página si no se proporcionan.
      const {
        leida,
        tipo,
        prioridad,
        desde,
        hasta,
        limite = 50,
        pagina = 1
      } = req.query;

      // ----------------------------------------------------------------
      // BLOQUE 1.2: Construcción del objeto de filtros
      // ----------------------------------------------------------------
      // Crea un objeto de filtros dinámicamente basado en los parámetros
      // proporcionados. Solo incluye los filtros que tienen valor.
      const filtros = {};
      if (leida !== undefined) filtros.leida = leida === 'true';
      if (tipo) filtros.tipo = tipo;
      if (prioridad) filtros.prioridad = prioridad;
      if (desde) filtros.desde = desde;
      if (hasta) filtros.hasta = hasta;

      // ----------------------------------------------------------------
      // BLOQUE 1.3: Llamada al servicio con paginación
      // ----------------------------------------------------------------
      // Envía los filtros y opciones de paginación al servicio de notificaciones.
      // Convierte los parámetros de límite y página a enteros para evitar
      // problemas de tipo de dato.
      const resultado = await NotificationService.obtener(filtros, {
        limite: parseInt(limite),
        pagina: parseInt(pagina)
      });

      console.log(`✅ ${resultado.notificaciones.length} notificaciones obtenidas`);

      // ----------------------------------------------------------------
      // BLOQUE 1.4: Respuesta estructurada con datos
      // ----------------------------------------------------------------
      // Devuelve un objeto JSON estandarizado con el resultado completo
      // que incluye notificaciones, total de páginas, etc.
      res.json({
        success: true,
        data: resultado
      });

    } catch (error) {
      // ----------------------------------------------------------------
      // BLOQUE 1.5: Manejo de errores detallado
      // ----------------------------------------------------------------
      // Registra el error completo en consola para depuración, pero
      // envía solo el mensaje de error al cliente por seguridad.
      console.error('❌ Error obteniendo notificaciones:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener notificaciones: ' + error.message
      });
    }
  }

  // ********************************************************************
  // MÓDULO 2: OBTENCIÓN DE NOTIFICACIONES NO LEÍDAS
  // ********************************************************************
  // Descripción: Obtiene exclusivamente las notificaciones que no han sido
  // marcadas como leídas. Este endpoint es útil para implementar badges
  // de notificaciones pendientes en interfaces de usuario.
  // ********************************************************************
  static async getUnread(req, res) {
    try {
      console.log('📥 Obteniendo notificaciones no leídas');
      
      // ----------------------------------------------------------------
      // BLOQUE 2.1: Llamada directa al servicio con filtro predefinido
      // ----------------------------------------------------------------
      // Pasa directamente el filtro {leida: false} al servicio para
      // obtener solo notificaciones pendientes de lectura.
      const resultado = await NotificationService.obtener({ leida: false });
      
      console.log(`✅ ${resultado.notificaciones.length} notificaciones no leídas`);

      // ----------------------------------------------------------------
      // BLOQUE 2.2: Respuesta con conteo implícito
      // ----------------------------------------------------------------
      // El cliente puede verificar la longitud del array para saber
      // cuántas notificaciones no leídas existen.
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

  // ********************************************************************
  // MÓDULO 3: OBTENCIÓN DE ESTADÍSTICAS DE NOTIFICACIONES
  // ********************************************************************
  // Descripción: Obtiene métricas agregadas sobre las notificaciones,
  // como conteos por tipo, prioridad, estado de lectura, etc. Útil para
  // dashboards y paneles de administración.
  // ********************************************************************
  static async getStats(req, res) {
    try {
      console.log('📊 Obteniendo estadísticas de notificaciones');
      
      // ----------------------------------------------------------------
      // BLOQUE 3.1: Delegación al servicio especializado
      // ----------------------------------------------------------------
      // El cálculo de estadísticas se delega completamente al servicio,
      // manteniendo el controlador enfocado en manejar la petición HTTP.
      const estadisticas = await NotificationService.obtenerEstadisticas();
      
      console.log('✅ Estadísticas obtenidas:', estadisticas);

      // ----------------------------------------------------------------
      // BLOQUE 3.2: Respuesta con datos estadísticos
      // ----------------------------------------------------------------
      // Devuelve las estadísticas en formato estructurado para que
      // el frontend pueda generar gráficos o mostrar resúmenes.
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

  // ********************************************************************
  // MÓDULO 4: MARCAR NOTIFICACIÓN COMO LEÍDA
  // ********************************************************************
  // Descripción: Cambia el estado de una notificación específica de "no leída"
  // a "leída". Se identifica la notificación por su ID único.
  // ********************************************************************
  static async markAsRead(req, res) {
    try {
      const { id } = req.params;
      console.log('✅ Marcando notificación como leída:', id);

      // ----------------------------------------------------------------
      // BLOQUE 4.1: Actualización de estado individual
      // ----------------------------------------------------------------
      // Llama al servicio para actualizar el campo 'leida' de una
      // notificación específica. El servicio debe validar que el ID exista.
      const notificacion = await NotificationService.marcarLeida(id);

      // ----------------------------------------------------------------
      // BLOQUE 4.2: Respuesta con la notificación actualizada
      // ----------------------------------------------------------------
      // Devuelve la notificación completa después de la actualización
      // para que el cliente pueda actualizar su estado local si es necesario.
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

  // ********************************************************************
  // MÓDULO 5: MARCAR TODAS LAS NOTIFICACIONES COMO LEÍDAS
  // ********************************************************************
  // Descripción: Actualiza masivamente el estado de todas las notificaciones
  // no leídas a leídas. Operación útil para usuarios que quieren limpiar
  // todas sus notificaciones pendientes de una vez.
  // ********************************************************************
  static async markAllAsRead(req, res) {
    try {
      console.log('✅ Marcando todas las notificaciones como leídas');

      // ----------------------------------------------------------------
      // BLOQUE 5.1: Actualización masiva de estado
      // ----------------------------------------------------------------
      // El servicio realiza una operación de actualización masiva
      // en la base de datos (probablemente un updateMany).
      const cantidad = await NotificationService.marcarTodasLeidas();

      // ----------------------------------------------------------------
      // BLOQUE 5.2: Respuesta con conteo de actualizaciones
      // ----------------------------------------------------------------
      // Incluye el número de notificaciones afectadas en la respuesta
      // para dar retroalimentación precisa al usuario.
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

  // ********************************************************************
  // MÓDULO 6: ELIMINACIÓN DE NOTIFICACIÓN
  // ********************************************************************
  // Descripción: Elimina permanentemente una notificación específica
  // de la base de datos. Esta operación no se puede deshacer.
  // ********************************************************************
  static async delete(req, res) {
    try {
      const { id } = req.params;
      console.log('🗑️ Eliminando notificación:', id);

      // ----------------------------------------------------------------
      // BLOQUE 6.1: Eliminación permanente
      // ----------------------------------------------------------------
      // Delega la operación de eliminación física al servicio.
      // El servicio debe manejar la validación de existencia del ID.
      await NotificationService.eliminar(id);

      // ----------------------------------------------------------------
      // BLOQUE 6.2: Confirmación de eliminación
      // ----------------------------------------------------------------
      // Respuesta simple de confirmación ya que el recurso ya no existe.
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

  // ********************************************************************
  // MÓDULO 7: LIMPIEZA DE NOTIFICACIONES ANTIGUAS
  // ********************************************************************
  // Descripción: Elimina automáticamente notificaciones que sean más
  // antiguas que un número específico de días. Sirve como mantenimiento
  // automático para evitar acumulación excesiva de datos históricos.
  // ********************************************************************
  static async cleanup(req, res) {
    try {
      // ----------------------------------------------------------------
      // BLOQUE 7.1: Configuración del período de limpieza
      // ----------------------------------------------------------------
      // Recibe el número de días desde el body de la petición.
      // Usa un valor por defecto de 30 días si no se especifica.
      const { dias = 30 } = req.body;
      console.log(`🧹 Limpiando notificaciones de más de ${dias} días`);

      // ----------------------------------------------------------------
      // BLOQUE 7.2: Ejecución de limpieza automática
      // ----------------------------------------------------------------
      // El servicio calcula la fecha de corte (hoy - días) y elimina
      // todas las notificaciones más antiguas que esa fecha.
      const cantidad = await NotificationService.limpiarAntiguas(dias);

      // ----------------------------------------------------------------
      // BLOQUE 7.3: Respuesta con métricas de limpieza
      // ----------------------------------------------------------------
      // Proporciona el conteo de notificaciones eliminadas para
      // transparencia en la operación de mantenimiento.
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