import Notification from '../models/Notification.js';

// ============================================================================
// SECCIÓN: SERVICIO DE NOTIFICACIONES
// ============================================================================
// Este archivo define la clase principal que centraliza todas las operaciones
// relacionadas con notificaciones del sistema. Proporciona métodos para
// creación de diferentes tipos de notificaciones, consultas filtradas,
// gestión de estado y operaciones de mantenimiento.
// ============================================================================

// ********************************************************************
// MÓDULO 1: CLASE PRINCIPAL DEL SERVICIO DE NOTIFICACIONES
// ********************************************************************
// Descripción: Clase estática que encapsula toda la lógica de negocio
// relacionada con notificaciones. No necesita instanciación, todos sus
// métodos son estáticos y pueden llamarse directamente desde controladores.
// ********************************************************************
class NotificationService {
  
  // ********************************************************************
  // MÓDULO 2: MÉTODO BASE PARA CREACIÓN DE NOTIFICACIONES
  // ********************************************************************
  // Descripción: Método genérico que crea cualquier tipo de notificación
  // en la base de datos. Sirve como base para todos los métodos específicos
  // que crean notificaciones de diferentes tipos y contextos.
  // ********************************************************************
  
  // ----------------------------------------------------------------
  // BLOQUE 2.1: Creación genérica de notificación
  // ----------------------------------------------------------------
  // Método interno utilizado por todas las funciones específicas para
  // persistir notificaciones en la base de datos con validación y logging.
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
  
  // ********************************************************************
  // MÓDULO 3: NOTIFICACIONES ESPECÍFICAS PARA OPERACIONES CON DOCUMENTOS
  // ********************************************************************
  // Descripción: Métodos especializados para crear notificaciones
  // relacionadas con operaciones del módulo de documentos (subida,
  // eliminación, restauración, vencimientos).
  // ********************************************************************
  
  // ----------------------------------------------------------------
  // BLOQUE 3.1: Notificación de subida exitosa de documento
  // ----------------------------------------------------------------
  // Genera una notificación cuando un usuario sube un nuevo documento
  // al sistema, incluyendo detalles como nombre, categoría y persona asociada.
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

  // ----------------------------------------------------------------
  // BLOQUE 3.2: Notificación de eliminación de documento
  // ----------------------------------------------------------------
  // Crea una notificación cuando un documento es eliminado del sistema,
  // ya sea por eliminación directa o mediante envío a la papelera.
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

  // ----------------------------------------------------------------
  // BLOQUE 3.3: Notificación de restauración desde papelera
  // ----------------------------------------------------------------
  // Genera notificación cuando un documento previamente eliminado
  // (enviado a papelera) es restaurado al sistema principal.
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

  // ----------------------------------------------------------------
  // BLOQUE 3.4: Notificación preventiva de vencimiento cercano
  // ----------------------------------------------------------------
  // Crea alertas preventivas para documentos cuya fecha de vencimiento
  // está próxima (menos de 7 días). La prioridad aumenta a medida que
  // se acerca la fecha límite.
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

  // ----------------------------------------------------------------
  // BLOQUE 3.5: Notificación crítica de documento vencido
  // ----------------------------------------------------------------
  // Genera alerta de prioridad crítica para documentos cuya fecha
  // de vencimiento ya ha pasado, requiriendo atención inmediata.
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
  
  // ********************************************************************
  // MÓDULO 4: NOTIFICACIONES PARA OPERACIONES CON PERSONAS
  // ********************************************************************
  // Descripción: Métodos para crear notificaciones relacionadas con
  // la gestión de personas en el sistema (altas, bajas, modificaciones).
  // ********************************************************************
  
  // ----------------------------------------------------------------
  // BLOQUE 4.1: Notificación de nueva persona agregada
  // ----------------------------------------------------------------
  // Informa sobre la creación de un nuevo registro de persona en el
  // sistema, incluyendo detalles como nombre, puesto y departamento.
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

  // ----------------------------------------------------------------
  // BLOQUE 4.2: Notificación de persona eliminada
  // ----------------------------------------------------------------
  // Informa sobre la eliminación de un registro de persona del sistema,
  // manteniendo trazabilidad de cambios en la base de contactos.
  static async personaEliminada(nombrePersona) {
    return await this.crear({
      tipo: 'persona_eliminada',
      titulo: '❌ Persona eliminada',
      mensaje: `Se eliminó a ${nombrePersona} del sistema`,
      icono: 'user-minus',
      prioridad: 'baja'
    });
  }
  
  // ********************************************************************
  // MÓDULO 5: NOTIFICACIONES PARA OPERACIONES CON CATEGORÍAS
  // ********************************************************************
  // Descripción: Métodos para notificar operaciones relacionadas con
  // la gestión de categorías de documentos en el sistema.
  // ********************************************************************
  
  // ----------------------------------------------------------------
  // BLOQUE 5.1: Notificación de nueva categoría creada
  // ----------------------------------------------------------------
  // Informa sobre la creación de una nueva categoría para clasificar
  // documentos, facilitando la organización y filtrado del contenido.
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
  
  // ********************************************************************
  // MÓDULO 6: NOTIFICACIONES DE REPORTES Y ESTADO DEL SISTEMA
  // ********************************************************************
  // Descripción: Métodos para notificaciones relacionadas con reportes
  // generados, eventos del sistema y errores críticos que requieren atención.
  // ********************************************************************
  
  // ----------------------------------------------------------------
  // BLOQUE 6.1: Notificación de reporte generado exitosamente
  // ----------------------------------------------------------------
  // Confirma la generación exitosa de un reporte en el sistema,
  // incluyendo tipo de reporte, formato y cantidad de registros procesados.
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

  // ----------------------------------------------------------------
  // BLOQUE 6.2: Notificación de inicio exitoso del sistema
  // ----------------------------------------------------------------
  // Registra el evento de inicio del sistema para propósitos de
  // auditoría, monitoreo y diagnóstico de disponibilidad del servicio.
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

  // ----------------------------------------------------------------
  // BLOQUE 6.3: Notificación de error crítico del sistema
  // ----------------------------------------------------------------
  // Crea alertas de alta prioridad para errores críticos que
  // requieren atención administrativa inmediata y seguimiento.
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
  
  // ********************************************************************
  // MÓDULO 7: CONSULTAS Y GESTIÓN DE NOTIFICACIONES EXISTENTES
  // ********************************************************************
  // Descripción: Métodos para consultar, filtrar y gestionar el estado
  // de notificaciones ya creadas en el sistema (marcar como leídas,
  // eliminar, obtener listados).
  // ********************************************************************
  
  // ----------------------------------------------------------------
  // BLOQUE 7.1: Consulta paginada con filtros múltiples
  // ----------------------------------------------------------------
  // Método principal para obtener notificaciones con soporte para
  // paginación, filtrado por tipo/estado/prioridad y rangos de fechas.
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

  // ----------------------------------------------------------------
  // BLOQUE 7.2: Marcar notificación individual como leída
  // ----------------------------------------------------------------
  // Cambia el estado de una notificación específica a "leída" cuando
  // el usuario la visualiza o interactúa con ella en la interfaz.
  static async marcarLeida(id) {
    const notificacion = await Notification.findById(id);
    if (!notificacion) {
      throw new Error('Notificación no encontrada');
    }
    return await notificacion.marcarLeida();
  }

  // ----------------------------------------------------------------
  // BLOQUE 7.3: Marcar todas las notificaciones como leídas (masivo)
  // ----------------------------------------------------------------
  // Cambia masivamente el estado de todas las notificaciones no leídas
  // a leídas, útil para limpiar badges de notificaciones pendientes.
  static async marcarTodasLeidas() {
    const resultado = await Notification.updateMany(
      { leida: false },
      { leida: true }
    );
    return resultado.modifiedCount;
  }

  // ----------------------------------------------------------------
  // BLOQUE 7.4: Eliminar notificación específica permanentemente
  // ----------------------------------------------------------------
  // Elimina una notificación específica de la base de datos de manera
  // permanente, sin opción de restauración.
  static async eliminar(id) {
    return await Notification.findByIdAndDelete(id);
  }
  
  // ********************************************************************
  // MÓDULO 8: ESTADÍSTICAS Y OPERACIONES DE MANTENIMIENTO
  // ********************************************************************
  // Descripción: Métodos para obtener métricas del sistema y realizar
  // tareas de mantenimiento como limpieza automática de notificaciones antiguas.
  // ********************************************************************
  
  // ----------------------------------------------------------------
  // BLOQUE 8.1: Obtener estadísticas generales del sistema
  // ----------------------------------------------------------------
  // Genera métricas agregadas sobre las notificaciones (totales,
  // leídas, no leídas, distribución por tipo) para dashboards de administración.
  static async obtenerEstadisticas() {
    return await Notification.obtenerEstadisticas();
  }

  // ----------------------------------------------------------------
  // BLOQUE 8.2: Limpieza programada de notificaciones antiguas
  // ----------------------------------------------------------------
  // Elimina automáticamente notificaciones leídas que son más antiguas
  // que un número específico de días, previniendo crecimiento excesivo
  // de la base de datos y manteniendo el rendimiento del sistema.
  static async limpiarAntiguas(dias = 30) {
    return await Notification.limpiarAntiguas(dias);
  }
}

export default NotificationService;