const Notification = require('./Notification');

/**
 * Servicio para gestionar notificaciones del sistema
 */
class NotificationService {
  
  /**
   * Crear una nueva notificación
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

  /**
   * Notificación: Documento subido
   */
  static async documentoSubido(documento, persona = null) {
    const nombrePersona = persona ? persona.nombre : 'Usuario';
    return await this.crear({
      tipo: 'documento_subido',
      titulo: 'Documento subido',
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
   * Notificación: Documento eliminado
   */
  static async documentoEliminado(nombreDocumento, categoria, usuario = 'Usuario') {
    return await this.crear({
      tipo: 'documento_eliminado',
      titulo: 'Documento eliminado',
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
   * Notificación: Documento próximo a vencer
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
   * Notificación: Documento vencido
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

  /**
   * Notificación: Persona agregada
   */
  static async personaAgregada(persona) {
    return await this.crear({
      tipo: 'persona_agregada',
      titulo: 'Persona agregada',
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
   * Notificación: Persona eliminada
   */
  static async personaEliminada(nombrePersona) {
    return await this.crear({
      tipo: 'persona_eliminada',
      titulo: 'Persona eliminada',
      mensaje: `Se eliminó a ${nombrePersona} del sistema`,
      icono: 'user-minus',
      prioridad: 'baja'
    });
  }

  /**
   * Notificación: Categoría agregada
   */
  static async categoriaAgregada(categoria) {
    return await this.crear({
      tipo: 'categoria_agregada',
      titulo: 'Categoría agregada',
      mensaje: `Se creó la categoría "${categoria.nombre}"`,
      icono: 'folder-plus',
      prioridad: 'baja',
      categoria_id: categoria._id
    });
  }

  /**
   * Notificación: Reporte generado
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
      titulo: 'Reporte generado',
      mensaje: `Se generó el reporte "${nombresReportes[tipoReporte] || tipoReporte}" en formato ${formato.toUpperCase()} con ${cantidadRegistros} registro(s)`,
      icono: 'file-chart',
      prioridad: 'baja',
      metadata: {
        tipo_reporte: tipoReporte,
        formato: formato,
        registros: cantidadRegistros
      }
    });
  }

  /**
   * Notificación: Sistema iniciado
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
   * Notificación: Error del sistema
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

  /**
   * Obtener notificaciones con filtros
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
   * Marcar notificación como leída
   */
  static async marcarLeida(id) {
    const notificacion = await Notification.findById(id);
    if (!notificacion) {
      throw new Error('Notificación no encontrada');
    }
    return await notificacion.marcarLeida();
  }

  /**
   * Marcar todas como leídas
   */
  static async marcarTodasLeidas() {
    const resultado = await Notification.updateMany(
      { leida: false },
      { leida: true }
    );
    return resultado.modifiedCount;
  }

  /**
   * Eliminar notificación
   */
  static async eliminar(id) {
    return await Notification.findByIdAndDelete(id);
  }

  /**
   * Obtener estadísticas
   */
  static async obtenerEstadisticas() {
    return await Notification.obtenerEstadisticas();
  }

  /**
   * Limpiar notificaciones antiguas
   */
  static async limpiarAntiguas(dias = 30) {
    return await Notification.limpiarAntiguas(dias);
  }
}

module.exports = NotificationService;
