const Notification = require('./Notification');

/**
 * Servicio para gestionar notificaciones del sistema
 * Gestiona el historial de eventos y alertas para usuarios
 */
class NotificationService {
  
  // ==========================================
  // MÉTODOS BASE
  // ==========================================

  /**
   * Crear una nueva notificación (Método base)
   */
  static async crear(data) {
    try {
      const notificacion = new Notification(data);
      await notificacion.save();
      console.log('🔔 Notificación creada:', notificacion.titulo);
      return notificacion;
    } catch (error) {
      console.error('❌ Error creando notificación:', error);
      // No lanzamos el error para no interrumpir el flujo principal de la app
      // si falla el sistema de notificaciones
      return null; 
    }
  }

  // ==========================================
  // DOCUMENTOS
  // ==========================================

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
   * Notificación: Documento descargado (NUEVO)
   */
  static async documentoDescargado(documento, usuario = 'Usuario') {
    return await this.crear({
      tipo: 'documento_descargado',
      titulo: 'Documento descargado',
      mensaje: `${usuario} descargó el documento "${documento.nombre_original}"`,
      icono: 'download',
      prioridad: 'baja',
      documento_id: documento._id,
      metadata: {
        documento: documento.nombre_original,
        fecha: new Date()
      }
    });
  }

  /**
   * Notificación: Documento editado (NUEVO)
   */
  static async documentoEditado(documento, usuario = 'Usuario') {
    return await this.crear({
      tipo: 'documento_editado',
      titulo: 'Documento editado',
      mensaje: `${usuario} editó la información del documento "${documento.nombre_original}"`,
      icono: 'file-signature', // o 'edit'
      prioridad: 'media',
      documento_id: documento._id,
      metadata: {
        cambios: 'Metadatos actualizados'
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

  // ==========================================
  // PERSONAS / USUARIOS
  // ==========================================

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
   * Notificación: Persona editada (NUEVO)
   */
  static async personaEditada(persona) {
    return await this.crear({
      tipo: 'persona_editada',
      titulo: 'Persona actualizada',
      mensaje: `Se actualizaron los datos de ${persona.nombre}`,
      icono: 'user-edit',
      prioridad: 'baja',
      persona_id: persona._id,
      metadata: {
        puesto_actual: persona.puesto
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

  // ==========================================
  // DEPARTAMENTOS
  // ==========================================

  /**
   * Notificación: Departamento creado (NUEVO)
   */
  static async departamentoCreado(departamento) {
    return await this.crear({
      tipo: 'departamento_creado',
      titulo: 'Departamento creado',
      mensaje: `Se creó el departamento "${departamento.nombre}"`,
      icono: 'building',
      prioridad: 'baja',
      metadata: { nombre: departamento.nombre }
    });
  }

  /**
   * Notificación: Departamento editado (NUEVO)
   */
  static async departamentoEditado(departamento) {
    return await this.crear({
      tipo: 'departamento_editado',
      titulo: 'Departamento modificado',
      mensaje: `Se modificó la información del departamento "${departamento.nombre}"`,
      icono: 'building', // Puedes usar un icono diferente si tienes edit-building
      prioridad: 'baja',
      metadata: { id: departamento._id }
    });
  }

  /**
   * Notificación: Departamento eliminado (NUEVO)
   */
  static async departamentoEliminado(nombreDepartamento) {
    return await this.crear({
      tipo: 'departamento_eliminado',
      titulo: 'Departamento eliminado',
      mensaje: `Se eliminó el departamento "${nombreDepartamento}" y sus asociaciones`,
      icono: 'trash-alt',
      prioridad: 'media'
    });
  }

  // ==========================================
  // CATEGORÍAS
  // ==========================================

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
   * Notificación: Categoría editada (NUEVO)
   */
  static async categoriaEditada(categoria) {
    return await this.crear({
      tipo: 'categoria_editada',
      titulo: 'Categoría modificada',
      mensaje: `La categoría "${categoria.nombre}" ha sido actualizada`,
      icono: 'folder-open',
      prioridad: 'baja',
      categoria_id: categoria._id
    });
  }

  /**
   * Notificación: Categoría eliminada (NUEVO)
   */
  static async categoriaEliminada(nombreCategoria) {
    return await this.crear({
      tipo: 'categoria_eliminada',
      titulo: 'Categoría eliminada',
      mensaje: `Se eliminó la categoría "${nombreCategoria}"`,
      icono: 'folder-minus',
      prioridad: 'baja'
    });
  }

  // ==========================================
  // TAREAS
  // ==========================================

  /**
   * Notificación: Tarea creada (NUEVO)
   */
  static async tareaCreada(tarea, asignadoA = 'Alguien') {
    return await this.crear({
      tipo: 'tarea_creada',
      titulo: 'Nueva tarea asignada',
      mensaje: `Se asignó la tarea "${tarea.titulo}" a ${asignadoA}`,
      icono: 'clipboard-list',
      prioridad: 'media',
      metadata: {
        tarea_id: tarea._id,
        fecha_limite: tarea.fecha_limite
      }
    });
  }

  /**
   * Notificación: Tarea editada (NUEVO)
   */
  static async tareaEditada(tarea) {
    return await this.crear({
      tipo: 'tarea_editada',
      titulo: 'Tarea actualizada',
      mensaje: `Se actualizó la tarea "${tarea.titulo}"`,
      icono: 'edit',
      prioridad: 'baja',
      metadata: { tarea_id: tarea._id }
    });
  }

  /**
   * Notificación: Tarea completada (NUEVO)
   */
  static async tareaCompletada(tarea, usuario = 'Usuario') {
    return await this.crear({
      tipo: 'tarea_completada',
      titulo: '✅ Tarea completada',
      mensaje: `${usuario} completó la tarea "${tarea.titulo}"`,
      icono: 'check-square',
      prioridad: 'media',
      metadata: {
        tarea_id: tarea._id,
        fecha_completada: new Date()
      }
    });
  }

  /**
   * Notificación: Tarea eliminada (NUEVO)
   */
  static async tareaEliminada(tituloTarea, usuario = 'Usuario') {
    return await this.crear({
      tipo: 'tarea_eliminada',
      titulo: 'Tarea eliminada',
      mensaje: `${usuario} eliminó la tarea "${tituloTarea}"`,
      icono: 'trash',
      prioridad: 'baja'
    });
  }

  /**
   * Notificación: Tarea vencida/pendiente (NUEVO)
   */
  static async tareaVencida(tarea) {
    return await this.crear({
      tipo: 'tarea_vencida',
      titulo: '⌛ Tarea vencida',
      mensaje: `La tarea "${tarea.titulo}" ha excedido su tiempo límite`,
      icono: 'hourglass-end', // o 'alarm'
      prioridad: 'alta',
      metadata: {
        tarea_id: tarea._id,
        fecha_limite: tarea.fecha_limite,
        retraso: 'Tiempo excedido'
      }
    });
  }

  // ==========================================
  // SISTEMA Y REPORTES
  // ==========================================

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
      icono: 'file-chart-line', // Icono ajustado
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
      icono: 'power-off',
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
      icono: 'bug',
      prioridad: 'alta',
      metadata: detalles
    });
  }

  // ==========================================
  // GESTIÓN Y CONSULTA
  // ==========================================

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
   * Eliminar notificación individual
   */
  static async eliminar(id) {
    return await Notification.findByIdAndDelete(id);
  }

  /**
   * Obtener estadísticas (para dashboard)
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