// src/backend/services/notificationService.js
import Notification from '../models/Notification.js';

class NotificationService {

  // =============================================================================
  // COLA DE NOTIFICACIONES PARA EVITAR DUPLICADOS
  // =============================================================================

  static notificationQueue = new Map();
  static DEBOUNCE_TIME = 5000; // 5 segundos

  static async crearConDebounce(data, key = null) {
    const debounceKey = key || `${data.tipo}:${data.mensaje}`;
    const now = Date.now();

    for (const [k, timestamp] of this.notificationQueue.entries()) {
      if (now - timestamp > this.DEBOUNCE_TIME * 2) {
        this.notificationQueue.delete(k);
      }
    }

    if (this.notificationQueue.has(debounceKey)) {
      const lastTime = this.notificationQueue.get(debounceKey);
      if (now - lastTime < this.DEBOUNCE_TIME) {
        console.log('🔄 Notificación duplicada ignorada:', debounceKey);
        return null;
      }
    }

    this.notificationQueue.set(debounceKey, now);
    return await this.crear(data);
  }

  // =============================================================================
  // MÉTODO GENÉRICO DE CREACIÓN
  // =============================================================================

  static async crear(data) {
    try {
      const existingNotification = await Notification.findOne({
        tipo: data.tipo,
        mensaje: data.mensaje,
        schoolId: data.schoolId || null,
        fecha_creacion: {
          $gte: new Date(Date.now() - 10000)
        }
      });

      if (existingNotification) {
        console.log('🔄 Notificación duplicada detectada en BD, ignorando:', existingNotification._id);
        return existingNotification;
      }

      const notificacion = new Notification(data);
      await notificacion.save();
      console.log('🔔 Notificación creada:', notificacion.titulo, '| schoolId:', notificacion.schoolId || 'global');
      return notificacion;
    } catch (error) {
      console.error('❌ Error creando notificación:', error);
      throw error;
    }
  }

  // =============================================================================
  // ✅ NOTIFICACIONES DE RECORDATORIO DE TAREAS
  // =============================================================================

  /**
   * Crea una notificación de recordatorio para una tarea que vence en ~1 día.
   * @param {Object} tarea - Documento Task de Mongoose
   */
  static async tareaRecordatorio(tarea) {
    const tipoTarea = {
      personal: 'personal',
      asignada: 'asignada',
      grupal: 'grupal',
      clase: 'de clase'
    }[tarea.tipo] || tarea.tipo;

    const fechaFormateada = tarea.fecha_limite
      ? new Date(tarea.fecha_limite).toLocaleDateString('es-MX', {
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        })
      : 'sin fecha definida';

    const horaStr = tarea.hora_limite ? ` a las ${tarea.hora_limite}` : '';

    return await this.crearConDebounce({
      tipo: 'tarea_recordatorio',
      titulo: '⏰ Recordatorio de tarea',
      mensaje: `La tarea ${tipoTarea} "${tarea.titulo}" vence mañana${horaStr} (${fechaFormateada})`,
      icono: 'clock',
      prioridad: tarea.prioridad === 'critica' ? 'critica' : tarea.prioridad === 'alta' ? 'alta' : 'media',
      tarea_id: tarea._id,
      schoolId: tarea.schoolId || null,
      metadata: {
        tarea_titulo: tarea.titulo,
        tarea_tipo: tarea.tipo,
        fecha_limite: tarea.fecha_limite,
        hora_limite: tarea.hora_limite,
        creado_por: tarea.creado_por_nombre
      }
    }, `tarea_recordatorio:${tarea._id}`);
  }

  // =============================================================================
  // ✅ NOTIFICACIONES DE RECORDATORIO DE CALENDARIO
  // =============================================================================

  /**
   * Crea una notificación de recordatorio para un evento de calendario.
   * @param {Object} evento - Documento CalendarEvent de Mongoose
   * @param {number} diasRestantes - 1 o 3
   */
  static async calendarioRecordatorio(evento, diasRestantes) {
    const fechaEvento = new Date(evento.fecha);
    const fechaFormateada = fechaEvento.toLocaleDateString('es-MX', {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    });

    const horaStr = evento.horaInicio ? ` a las ${evento.horaInicio}` : '';
    const diasLabel = diasRestantes === 1 ? 'mañana' : `en ${diasRestantes} días`;

    const tiposIcono = {
      academic: 'book',
      meetings: 'users',
      deadlines: 'clock',
      holidays: 'star',
      exam: 'file-alt',
      personal: 'user'
    };

    return await this.crearConDebounce({
      tipo: 'calendario_recordatorio',
      titulo: `📅 Evento próximo: ${evento.titulo}`,
      mensaje: `El evento "${evento.titulo}" ocurre ${diasLabel}${horaStr} (${fechaFormateada})`,
      icono: tiposIcono[evento.tipo] || 'calendar-alt',
      prioridad: evento.prioridad === 'urgent' ? 'alta' : 'media',
      calendario_id: evento._id,
      schoolId: evento.schoolId || null,
      metadata: {
        evento_titulo: evento.titulo,
        evento_tipo: evento.tipo,
        fecha: evento.fecha,
        hora_inicio: evento.horaInicio,
        ubicacion: evento.ubicacion,
        dias_restantes: diasRestantes
      }
    }, `calendario_recordatorio:${evento._id}:${diasRestantes}d`);
  }

  // =============================================================================
  // NOTIFICACIONES DE USUARIOS
  // =============================================================================

  static async usuarioCreado(nuevoUsuario, creadoPor = 'Administrador', schoolId = null) {
    return await this.crearConDebounce({
      tipo: 'usuario_creado',
      titulo: 'Nuevo usuario creado',
      mensaje: `${creadoPor} creó el usuario "${nuevoUsuario.usuario}" (${nuevoUsuario.correo}) con rol ${nuevoUsuario.rol}`,
      icono: 'user-plus',
      prioridad: 'media',
      schoolId: schoolId || nuevoUsuario.schoolId || null,
      metadata: {
        usuario: nuevoUsuario.usuario,
        correo: nuevoUsuario.correo,
        rol: nuevoUsuario.rol,
        creado_por: creadoPor
      }
    }, `user_created:${nuevoUsuario._id}`);
  }

  // =============================================================================
  // NOTIFICACIONES DE DOCUMENTOS
  // =============================================================================

  static async documentoSubido(documento, persona = null, schoolId = null) {
    const nombrePersona = persona ? persona.nombre : 'Usuario';
    return await this.crearConDebounce({
      tipo: 'documento_subido',
      titulo: 'Documento subido',
      mensaje: `${nombrePersona} subió el documento "${documento.nombre_original}" en la categoría ${documento.categoria}`,
      icono: 'file-upload',
      prioridad: 'media',
      documento_id: documento._id,
      persona_id: persona?._id || null,
      schoolId: schoolId || documento.schoolId || null,
      metadata: {
        tipo_archivo: documento.tipo_archivo,
        tamano: documento.tamano_archivo,
        categoria: documento.categoria
      }
    }, `doc_upload:${documento._id}`);
  }

  static async documentoEliminado(nombreDocumento, categoria, usuario = 'Usuario', schoolId = null) {
    return await this.crearConDebounce({
      tipo: 'documento_eliminado',
      titulo: 'Documento eliminado',
      mensaje: `${usuario} eliminó el documento "${nombreDocumento}" de la categoría ${categoria}`,
      icono: 'trash',
      prioridad: 'baja',
      schoolId: schoolId || null,
      metadata: { documento: nombreDocumento, categoria: categoria }
    }, `doc_delete:${nombreDocumento}`);
  }

  static async documentoRestaurado(nombreDocumento, categoria, usuario = 'Usuario', schoolId = null) {
    return await this.crearConDebounce({
      tipo: 'documento_restaurado',
      titulo: 'Documento restaurado',
      mensaje: `${usuario} restauró el documento "${nombreDocumento}" de la categoría ${categoria}`,
      icono: 'undo',
      prioridad: 'media',
      schoolId: schoolId || null,
      metadata: { documento: nombreDocumento, categoria: categoria }
    }, `doc_restore:${nombreDocumento}`);
  }

  static async documentoProximoVencer(documento, diasRestantes) {
    return await this.crearConDebounce({
      tipo: 'documento_proximo_vencer',
      titulo: 'Documento próximo a vencer',
      mensaje: `El documento "${documento.nombre_original}" vence en ${diasRestantes} día${diasRestantes !== 1 ? 's' : ''}`,
      icono: 'clock',
      prioridad: diasRestantes <= 3 ? 'alta' : 'media',
      documento_id: documento._id,
      schoolId: documento.schoolId || null,
      metadata: {
        dias_restantes: diasRestantes,
        fecha_vencimiento: documento.fecha_vencimiento
      }
    }, `doc_expiring:${documento._id}`);
  }

  static async documentoVencido(documento) {
    return await this.crearConDebounce({
      tipo: 'documento_vencido',
      titulo: 'Documento vencido',
      mensaje: `El documento "${documento.nombre_original}" ha vencido y requiere atención`,
      icono: 'exclamation-triangle',
      prioridad: 'critica',
      documento_id: documento._id,
      schoolId: documento.schoolId || null,
      metadata: { fecha_vencimiento: documento.fecha_vencimiento }
    }, `doc_expired:${documento._id}`);
  }

  // =============================================================================
  // NOTIFICACIONES DE PERSONAS
  // =============================================================================

  static async personaAgregada(persona, schoolId = null) {
    return await this.crearConDebounce({
      tipo: 'persona_agregada',
      titulo: 'Persona agregada',
      mensaje: `Se agregó a ${persona.nombre} (${persona.puesto || 'Sin puesto'}) al sistema`,
      icono: 'user-plus',
      prioridad: 'baja',
      persona_id: persona._id,
      schoolId: schoolId || persona.schoolId || null,
      metadata: {
        departamento: persona.departamento,
        puesto: persona.puesto
      }
    }, `person_added:${persona._id}`);
  }

  static async personaEliminada(nombrePersona, schoolId = null) {
    return await this.crearConDebounce({
      tipo: 'persona_eliminada',
      titulo: 'Persona eliminada',
      mensaje: `Se eliminó a ${nombrePersona} del sistema`,
      icono: 'user-minus',
      prioridad: 'baja',
      schoolId: schoolId || null
    }, `person_deleted:${nombrePersona}`);
  }

  // =============================================================================
  // NOTIFICACIONES DE CATEGORÍAS
  // =============================================================================

  static async categoriaAgregada(categoria, schoolId = null) {
    return await this.crearConDebounce({
      tipo: 'categoria_agregada',
      titulo: 'Categoría agregada',
      mensaje: `Se creó la categoría "${categoria.nombre}"`,
      icono: 'folder-plus',
      prioridad: 'baja',
      categoria_id: categoria._id,
      schoolId: schoolId || categoria.schoolId || null
    }, `cat_added:${categoria._id}`);
  }

  // =============================================================================
  // NOTIFICACIONES DE REPORTES
  // =============================================================================

  static async reporteGenerado(tipoReporte, formato, cantidadRegistros, schoolId = null) {
    const nombresReportes = {
      general: 'General',
      byCategory: 'Por Categoría',
      byPerson: 'Por Persona',
      expiring: 'Documentos Próximos a Vencer',
      expired: 'Documentos Vencidos'
    };
    return await this.crearConDebounce({
      tipo: 'reporte_generado',
      titulo: 'Reporte generado',
      mensaje: `Se generó el reporte "${nombresReportes[tipoReporte] || tipoReporte}" en formato ${formato.toUpperCase()} con ${cantidadRegistros} registro(s)`,
      icono: 'chart-bar',
      prioridad: 'baja',
      schoolId: schoolId || null,
      metadata: { tipo_reporte: tipoReporte, formato: formato, registros: cantidadRegistros }
    }, `report:${tipoReporte}:${Date.now()}`);
  }

  // =============================================================================
  // NOTIFICACIONES DEL SISTEMA
  // =============================================================================

  static async sistemaIniciado() {
    return await this.crearConDebounce({
      tipo: 'sistema_iniciado',
      titulo: 'Sistema iniciado',
      mensaje: `Sistema de Gestión de Documentos CBTIS051 iniciado correctamente el ${new Date().toLocaleString('es-MX')}`,
      icono: 'check-circle',
      prioridad: 'baja',
      schoolId: null,
      metadata: { fecha_inicio: new Date(), version: '1.0.0' }
    }, 'system_start');
  }

  static async errorSistema(mensaje, detalles = {}) {
    return await this.crearConDebounce({
      tipo: 'error_sistema',
      titulo: 'Error del sistema',
      mensaje: mensaje,
      icono: 'exclamation-circle',
      prioridad: 'alta',
      schoolId: null,
      metadata: detalles
    }, `error:${mensaje.substring(0, 50)}`);
  }

  // =============================================================================
  // CONSULTAS Y GESTIÓN
  // =============================================================================

  static async obtener(filtros = {}, opciones = {}) {
    const {
      leida = null,
      tipo = null,
      prioridad = null,
      desde = null,
      hasta = null,
      schoolId = null,
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
    if (schoolId) {
      query.$or = [
        { schoolId: schoolId },
        { schoolId: { $exists: false } },
        { schoolId: null }
      ];
    }

    const skip = (pagina - 1) * limite;
    const notificaciones = await Notification.find(query)
      .populate('documento_id', 'nombre_original categoria tipo_archivo')
      .populate('persona_id', 'nombre departamento')
      .sort({ fecha_creacion: -1 })
      .limit(limite)
      .skip(skip);

    const total = await Notification.countDocuments(query);
    const noLeidas = await Notification.countDocuments({ ...query, leida: false });

    return {
      notificaciones,
      total,
      noLeidas,
      pagina,
      totalPaginas: Math.ceil(total / limite)
    };
  }

  static async marcarLeida(id) {
    const notificacion = await Notification.findById(id);
    if (!notificacion) throw new Error('Notificación no encontrada');
    return await notificacion.marcarLeida();
  }

  static async marcarTodasLeidas(schoolId = null) {
    const query = { leida: false };
    if (schoolId) {
      query.$or = [
        { schoolId: schoolId },
        { schoolId: { $exists: false } },
        { schoolId: null }
      ];
    }
    const resultado = await Notification.updateMany(query, { leida: true });
    return resultado.modifiedCount;
  }

  static async eliminar(id) {
    return await Notification.findByIdAndDelete(id);
  }

  static async obtenerEstadisticas(schoolId = null) {
    return await Notification.obtenerEstadisticas(schoolId);
  }

  static async limpiarAntiguas(dias = 30) {
    return await Notification.limpiarAntiguas(dias);
  }
}

export default NotificationService;