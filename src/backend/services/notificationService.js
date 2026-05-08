// src/backend/services/notificationService.js
import Notification from '../models/Notification.js';

class NotificationService {
  
  // =============================================================================
  // MÉTODO GENÉRICO DE CREACIÓN
  // =============================================================================
  
  static async crear(data) {
    try {
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
  // NOTIFICACIONES DE USUARIOS
  // =============================================================================

  static async usuarioCreado(nuevoUsuario, creadoPor = 'Administrador', schoolId = null) {
    return await this.crear({
      tipo: 'usuario_creado',
      titulo: '👤 Nuevo usuario creado',
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
    });
  }
  
  // =============================================================================
  // NOTIFICACIONES DE DOCUMENTOS
  // =============================================================================
  
  static async documentoSubido(documento, persona = null, schoolId = null) {
    const nombrePersona = persona ? persona.nombre : 'Usuario';
    return await this.crear({
      tipo: 'documento_subido',
      titulo: '✅ Documento subido',
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
    });
  }

  static async documentoEliminado(nombreDocumento, categoria, usuario = 'Usuario', schoolId = null) {
    return await this.crear({
      tipo: 'documento_eliminado',
      titulo: '❌ Documento eliminado',
      mensaje: `${usuario} eliminó el documento "${nombreDocumento}" de la categoría ${categoria}`,
      icono: 'trash',
      prioridad: 'baja',
      schoolId: schoolId || null,
      metadata: { documento: nombreDocumento, categoria: categoria }
    });
  }

  static async documentoRestaurado(nombreDocumento, categoria, usuario = 'Usuario', schoolId = null) {
    return await this.crear({
      tipo: 'documento_restaurado',
      titulo: '♻️ Documento restaurado',
      mensaje: `${usuario} restauró el documento "${nombreDocumento}" de la categoría ${categoria}`,
      icono: 'undo',
      prioridad: 'media',
      schoolId: schoolId || null,
      metadata: { documento: nombreDocumento, categoria: categoria }
    });
  }

  static async documentoProximoVencer(documento, diasRestantes) {
    return await this.crear({
      tipo: 'documento_proximo_vencer',
      titulo: '⚠️ Documento próximo a vencer',
      mensaje: `El documento "${documento.nombre_original}" vence en ${diasRestantes} día${diasRestantes !== 1 ? 's' : ''}`,
      icono: 'clock',
      prioridad: diasRestantes <= 3 ? 'alta' : 'media',
      documento_id: documento._id,
      schoolId: documento.schoolId || null,
      metadata: {
        dias_restantes: diasRestantes,
        fecha_vencimiento: documento.fecha_vencimiento
      }
    });
  }

  static async documentoVencido(documento) {
    return await this.crear({
      tipo: 'documento_vencido',
      titulo: '🚨 Documento vencido',
      mensaje: `El documento "${documento.nombre_original}" ha vencido y requiere atención inmediata`,
      icono: 'exclamation-triangle',
      prioridad: 'critica',
      documento_id: documento._id,
      schoolId: documento.schoolId || null,
      metadata: { fecha_vencimiento: documento.fecha_vencimiento }
    });
  }
  
  // =============================================================================
  // NOTIFICACIONES DE PERSONAS
  // =============================================================================
  
  static async personaAgregada(persona, schoolId = null) {
    return await this.crear({
      tipo: 'persona_agregada',
      titulo: '✅ Persona agregada',
      mensaje: `Se agregó a ${persona.nombre} (${persona.puesto || 'Sin puesto'}) al sistema`,
      icono: 'user-plus',
      prioridad: 'baja',
      persona_id: persona._id,
      schoolId: schoolId || persona.schoolId || null,
      metadata: {
        departamento: persona.departamento,
        puesto: persona.puesto
      }
    });
  }

  static async personaEliminada(nombrePersona, schoolId = null) {
    return await this.crear({
      tipo: 'persona_eliminada',
      titulo: '❌ Persona eliminada',
      mensaje: `Se eliminó a ${nombrePersona} del sistema`,
      icono: 'user-minus',
      prioridad: 'baja',
      schoolId: schoolId || null
    });
  }
  
  // =============================================================================
  // NOTIFICACIONES DE CATEGORÍAS
  // =============================================================================
  
  static async categoriaAgregada(categoria, schoolId = null) {
    return await this.crear({
      tipo: 'categoria_agregada',
      titulo: '✅ Categoría agregada',
      mensaje: `Se creó la categoría "${categoria.nombre}"`,
      icono: 'folder-plus',
      prioridad: 'baja',
      categoria_id: categoria._id,
      schoolId: schoolId || categoria.schoolId || null
    });
  }
  
  // =============================================================================
  // NOTIFICACIONES DE REPORTES Y SISTEMA
  // =============================================================================
  
  static async reporteGenerado(tipoReporte, formato, cantidadRegistros, schoolId = null) {
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
      schoolId: schoolId || null,
      metadata: { tipo_reporte: tipoReporte, formato: formato, registros: cantidadRegistros }
    });
  }

  static async sistemaIniciado() {
    return await this.crear({
      tipo: 'sistema_iniciado',
      titulo: '✅ Sistema iniciado',
      mensaje: `Sistema de Gestión de Documentos CBTIS051 iniciado correctamente el ${new Date().toLocaleString('es-MX')}`,
      icono: 'check-circle',
      prioridad: 'baja',
      schoolId: null,
      metadata: { fecha_inicio: new Date(), version: '1.0.0' }
    });
  }

  static async errorSistema(mensaje, detalles = {}) {
    return await this.crear({
      tipo: 'error_sistema',
      titulo: '❌ Error del sistema',
      mensaje: mensaje,
      icono: 'exclamation-circle',
      prioridad: 'alta',
      schoolId: null,
      metadata: detalles
    });
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

    // ✅ Filtrar por escuela
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