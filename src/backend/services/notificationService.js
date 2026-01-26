import Notification from '../models/Notification.js';

// =============================================================================
// 1. DEFINICIÓN DEL SERVICIO DE NOTIFICACIONES
// =============================================================================

/**
 * 1.1 Clase principal del servicio de notificaciones
 * Servicio para gestionar todas las operaciones relacionadas con notificaciones,
 * incluyendo creación, consulta y gestión del ciclo de vida.
 */
class NotificationService {
  
  // =============================================================================
  // 2. MÉTODOS GENERALES DE CREACIÓN
  // =============================================================================
  
  /**
   * 2.1 Crear notificación genérica
   * Método base para crear cualquier tipo de notificación en la base de datos.
   */
  static async crear(data) {
    try {
      const notificacion = new Notification(data);
      await notificacion.save();
      console.log('🔔 Notificación creada:', notificacion.titulo);
      return notificacion;
    } catch (error) {
      console.error('❌ Error creando notificación:', error);
      throw error;
    }
  }
  
  // =============================================================================
  // 3. NOTIFICACIONES ESPECÍFICAS DE DOCUMENTOS
  // =============================================================================
  
  /**
   * 3.1 Notificar subida de documento
   * Genera notificación cuando un usuario sube un nuevo documento al sistema.
   */
  static async documentoSubido(documento, persona = null) {
    const nombrePersona = persona ? persona.nombre : 'Usuario';
    return await this.crear({
      tipo: 'documento_subido',
      titulo: '✅ Documento subido',
      mensaje: `${nombrePersona} subió el documento "${documento.nombre_original}" en la categoría ${documento.categoria}`,
      icono: 'file-upload',
      prioridad: 'media',
      documento_id: documento._id,
      persona_id: persona?._id || null,
      metadata: {
        tipo_archivo: documento.tipo_archivo,
        tamano: documento.tamano_archivo,
        categoria: documento.categoria
      }
    });
  }

  /**
   * 3.2 Notificar eliminación de documento
   * Alerta sobre la eliminación de un documento del sistema.
   */
  static async documentoEliminado(nombreDocumento, categoria, usuario = 'Usuario') {
    return await this.crear({
      tipo: 'documento_eliminado',
      titulo: '❌ Documento eliminado',
      mensaje: `${usuario} eliminó el documento "${nombreDocumento}" de la categoría ${categoria}`,
      icono: 'trash',
      prioridad: 'baja',
      metadata: {
        documento: nombreDocumento,
        categoria: categoria
      }
    });
  }

  /**
   * 3.3 Notificar documento restaurado
   * Alerta cuando se restaura un documento desde la papelera.
   */
  static async documentoRestaurado(nombreDocumento, categoria, usuario = 'Usuario') {
    return await this.crear({
      tipo: 'documento_restaurado',
      titulo: '♻️ Documento restaurado',
      mensaje: `${usuario} restauró el documento "${nombreDocumento}" de la categoría ${categoria}`,
      icono: 'undo',
      prioridad: 'media',
      metadata: {
        documento: nombreDocumento,
        categoria: categoria
      }
    });
  }

  /**
   * 3.4 Notificar documento próximo a vencer
   * Alerta preventiva sobre documentos con fecha de vencimiento cercana.
   */
  static async documentoProximoVencer(documento, diasRestantes) {
    return await this.crear({
      tipo: 'documento_proximo_vencer',
      titulo: '⚠️ Documento próximo a vencer',
      mensaje: `El documento "${documento.nombre_original}" vence en ${diasRestantes} día${diasRestantes !== 1 ? 's' : ''}`,
      icono: 'clock',
      prioridad: diasRestantes <= 3 ? 'alta' : 'media',
      documento_id: documento._id,
      metadata: {
        dias_restantes: diasRestantes,
        fecha_vencimiento: documento.fecha_vencimiento
      }
    });
  }

  /**
   * 3.4 Notificar documento vencido
   * Alerta crítica sobre documentos cuya fecha de vencimiento ha expirado
   */
  static async documentoVencido(documento) {
    return await this.crear({
      tipo: 'documento_vencido',
      titulo: '🚨 Documento vencido',
      mensaje: `El documento "${documento.nombre_original}" ha vencido y requiere atención inmediata`,
      icono: 'exclamation-triangle',
      prioridad: 'critica',
      documento_id: documento._id,
      metadata: {
        fecha_vencimiento: documento.fecha_vencimiento
      }
    });
  }
  
  // =============================================================================
  // 4. NOTIFICACIONES DE PERSONAS
  // =============================================================================
  
  /**
   * 4.1 Notificar agregado de persona
   * Informa sobre la creación de un nuevo registro de persona en el sistema.
   */
  static async personaAgregada(persona) {
    return await this.crear({
      tipo: 'persona_agregada',
      titulo: '✅ Persona agregada',
      mensaje: `Se agregó a ${persona.nombre} (${persona.puesto}) al sistema`,
      icono: 'user-plus',
      prioridad: 'baja',
      persona_id: persona._id,
      metadata: {
        departamento: persona.departamento,
        puesto: persona.puesto
      }
    });
  }

  /**
   * 4.2 Notificar eliminación de persona
   * Informa sobre la eliminación de un registro de persona del sistema.
   */
  static async personaEliminada(nombrePersona) {
    return await this.crear({
      tipo: 'persona_eliminada',
      titulo: '❌ Persona eliminada',
      mensaje: `Se eliminó a ${nombrePersona} del sistema`,
      icono: 'user-minus',
      prioridad: 'baja'
    });
  }
  
  // =============================================================================
  // 5. NOTIFICACIONES DE CATEGORÍAS
  // =============================================================================
  
  /**
   * 5.1 Notificar creación de categoría
   * Informa sobre la creación de una nueva categoría para documentos.
   */
  static async categoriaAgregada(categoria) {
    return await this.crear({
      tipo: 'categoria_agregada',
      titulo: '✅ Categoría agregada',
      mensaje: `Se creó la categoría "${categoria.nombre}"`,
      icono: 'folder-plus',
      prioridad: 'baja',
      categoria_id: categoria._id
    });
  }
  
  // =============================================================================
  // 6. NOTIFICACIONES DE REPORTES Y SISTEMA
  // =============================================================================
  
  /**
   * 6.1 Notificar generación de reporte
   * Confirma la creación exitosa de un reporte en el sistema.
   */
  static async reporteGenerado(tipoReporte, formato, cantidadRegistros) {
    const nombresReportes = {
      general: 'General',
      byCategory: 'Por Categoría',
      byPerson: 'Por Persona',
      expiring: 'Documentos Próximos a Vencer',
      expired: 'Documentos Vencidos'
    };

    return await this.crear({
      tipo: 'reporte_generado',
      titulo: '✅ Reporte generado',
      mensaje: `Se generó el reporte "${nombresReportes[tipoReporte] || tipoReporte}" en formato ${formato.toUpperCase()} con ${cantidadRegistros} registro(s)`,
      icono: 'chart-bar',
      prioridad: 'baja',
      metadata: {
        tipo_reporte: tipoReporte,
        formato: formato,
        registros: cantidadRegistros
      }
    });
  }

  /**
   * 6.2 Notificar inicio del sistema
   * Registra el evento de inicio del sistema para auditoría y monitoreo.
   */
  static async sistemaIniciado() {
    return await this.crear({
      tipo: 'sistema_iniciado',
      titulo: '✅ Sistema iniciado',
      mensaje: `Sistema de Gestión de Documentos CBTIS051 iniciado correctamente el ${new Date().toLocaleString('es-MX')}`,
      icono: 'check-circle',
      prioridad: 'baja',
      metadata: {
        fecha_inicio: new Date(),
        version: '1.0.0'
      }
    });
  }

  /**
   * 6.3 Notificar error del sistema
   * Alerta sobre errores críticos que requieren atención administrativa.
   */
  static async errorSistema(mensaje, detalles = {}) {
    return await this.crear({
      tipo: 'error_sistema',
      titulo: '❌ Error del sistema',
      mensaje: mensaje,
      icono: 'exclamation-circle',
      prioridad: 'alta',
      metadata: detalles
    });
  }
  
  // =============================================================================
  // 7. CONSULTAS Y GESTIÓN DE NOTIFICACIONES
  // =============================================================================
  
  /**
   * 7.1 Obtener notificaciones con filtros
   * Consulta paginada con múltiples filtros para listar notificaciones en el frontend.
   */
  static async obtener(filtros = {}, opciones = {}) {
    const {
      leida = null,
      tipo = null,
      prioridad = null,
      desde = null,
      hasta = null,
      limite = 50,
      pagina = 1
    } = { ...filtros, ...opciones };

    const query = {};
    
    if (leida !== null) query.leida = leida;
    if (tipo) query.tipo = tipo;
    if (prioridad) query.prioridad = prioridad;
    if (desde || hasta) {
      query.fecha_creacion = {};
      if (desde) query.fecha_creacion.$gte = new Date(desde);
      if (hasta) query.fecha_creacion.$lte = new Date(hasta);
    }

    const skip = (pagina - 1) * limite;

    const notificaciones = await Notification.find(query)
      .populate('documento_id', 'nombre_original categoria tipo_archivo')
      .populate('persona_id', 'nombre departamento')
      .sort({ fecha_creacion: -1 })
      .limit(limite)
      .skip(skip);

    const total = await Notification.countDocuments(query);
    const noLeidas = await Notification.countDocuments({ leida: false });

    return {
      notificaciones,
      total,
      noLeidas,
      pagina,
      totalPaginas: Math.ceil(total / limite)
    };
  }

  /**
   * 7.2 Marcar notificación individual como leída
   * Cambia el estado de una notificación específica a "leída".
   */
  static async marcarLeida(id) {
    const notificacion = await Notification.findById(id);
    if (!notificacion) {
      throw new Error('Notificación no encontrada');
    }
    return await notificacion.marcarLeida();
  }

  /**
   * 7.3 Marcar todas las notificaciones como leídas
   * Cambia masivamente el estado de todas las notificaciones no leídas.
   */
  static async marcarTodasLeidas() {
    const resultado = await Notification.updateMany(
      { leida: false },
      { leida: true }
    );
    return resultado.modifiedCount;
  }

  /**
   * 7.4 Eliminar notificación específica
   * Remueve permanentemente una notificación de la base de datos.
   */
  static async eliminar(id) {
    return await Notification.findByIdAndDelete(id);
  }
  
  // =============================================================================
  // 8. ESTADÍSTICAS Y MANTENIMIENTO
  // =============================================================================
  
  /**
   * 8.1 Obtener estadísticas generales
   * Genera métricas sobre el estado de las notificaciones para dashboards.
   */
  static async obtenerEstadisticas() {
    return await Notification.obtenerEstadisticas();
  }

  /**
   * 8.2 Limpiar notificaciones antiguas
   * Tarea de mantenimiento para eliminar notificaciones leídas antiguas.
   */
  static async limpiarAntiguas(dias = 30) {
    return await Notification.limpiarAntiguas(dias);
  }
}

export default NotificationService;