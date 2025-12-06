const Historial = require('./Historial');

/**
 * Servicio para gestionar el historial de acciones del sistema
 * Registra TODAS las acciones para auditoría completa
 */
class HistorialService {
  
  /**
   * Registrar una acción en el historial
   */
  static async registrar(datos) {
    try {
      const entrada = new Historial(datos);
      await entrada.save();
      console.log('📝 Historial registrado:', datos.accion);
      return entrada;
    } catch (error) {
      console.error('❌ Error registrando historial:', error);
      throw error;
    }
  }

  // =============================================================================
  // ACCIONES DE DOCUMENTOS
  // =============================================================================

  static async documentoSubido(documento, persona = null) {
    const nombrePersona = persona ? persona.nombre : 'Usuario';
    return await this.registrar({
      accion: 'documento_subido',
      descripcion: `${nombrePersona} subió el documento "${documento.nombre_original}" en la categoría ${documento.categoria || 'Sin categoría'}`,
      usuario: nombrePersona,
      modulo: 'documentos',
      documento_id: documento._id,
      persona_id: persona?._id || null,
      metadata: {
        tipo_archivo: documento.tipo_archivo,
        tamano: documento.tamano_archivo,
        categoria: documento.categoria
      }
    });
  }

  static async documentoEliminado(nombreDocumento, categoria, usuario = 'Usuario') {
    return await this.registrar({
      accion: 'documento_eliminado',
      descripcion: `${usuario} movió el documento "${nombreDocumento}" (${categoria}) a la papelera`,
      usuario: usuario,
      modulo: 'papelera',
      metadata: {
        documento: nombreDocumento,
        categoria: categoria
      }
    });
  }

  static async documentoRestaurado(documento, usuario = 'Usuario') {
    return await this.registrar({
      accion: 'documento_restaurado',
      descripcion: `${usuario} restauró el documento "${documento.nombre_original}" desde la papelera`,
      usuario: usuario,
      modulo: 'papelera',
      documento_id: documento._id,
      metadata: {
        categoria: documento.categoria
      }
    });
  }

  static async documentoEliminadoDefinitivo(nombreDocumento, categoria, usuario = 'Usuario') {
    return await this.registrar({
      accion: 'documento_eliminado_definitivo',
      descripcion: `${usuario} eliminó DEFINITIVAMENTE el documento "${nombreDocumento}" (${categoria})`,
      usuario: usuario,
      modulo: 'papelera',
      metadata: {
        documento: nombreDocumento,
        categoria: categoria,
        permanente: true
      }
    });
  }

  static async documentoDescargado(documento, usuario = 'Usuario') {
    return await this.registrar({
      accion: 'documento_descargado',
      descripcion: `${usuario} descargó el documento "${documento.nombre_original}"`,
      usuario: usuario,
      modulo: 'documentos',
      documento_id: documento._id,
      metadata: {
        tipo_archivo: documento.tipo_archivo
      }
    });
  }

  static async documentoVisualizacion(documento, usuario = 'Usuario') {
    return await this.registrar({
      accion: 'documento_previsualizacion',
      descripcion: `${usuario} visualizó el documento "${documento.nombre_original}"`,
      usuario: usuario,
      modulo: 'documentos',
      documento_id: documento._id
    });
  }

  // =============================================================================
  // ACCIONES DE PERSONAS
  // =============================================================================

  static async personaAgregada(persona, usuario = 'Usuario') {
    return await this.registrar({
      accion: 'persona_agregada',
      descripcion: `${usuario} agregó a ${persona.nombre} (${persona.departamento || 'Sin departamento'})`,
      usuario: usuario,
      modulo: 'personas',
      persona_id: persona._id,
      metadata: {
        nombre: persona.nombre,
        departamento: persona.departamento,
        email: persona.email
      }
    });
  }

  static async personaEditada(persona, usuario = 'Usuario') {
    return await this.registrar({
      accion: 'persona_editada',
      descripcion: `${usuario} editó la información de ${persona.nombre}`,
      usuario: usuario,
      modulo: 'personas',
      persona_id: persona._id
    });
  }

  static async personaEliminada(nombrePersona, departamento, usuario = 'Usuario') {
    return await this.registrar({
      accion: 'persona_eliminada',
      descripcion: `${usuario} eliminó a ${nombrePersona} (${departamento})`,
      usuario: usuario,
      modulo: 'personas',
      metadata: {
        nombre: nombrePersona,
        departamento: departamento
      }
    });
  }

  // =============================================================================
  // ACCIONES DE CATEGORÍAS
  // =============================================================================

  static async categoriaAgregada(categoria, usuario = 'Usuario') {
    return await this.registrar({
      accion: 'categoria_agregada',
      descripcion: `${usuario} creó la categoría "${categoria.nombre}"`,
      usuario: usuario,
      modulo: 'categorias',
      categoria_id: categoria._id,
      metadata: {
        nombre: categoria.nombre,
        descripcion: categoria.descripcion
      }
    });
  }

  static async categoriaEditada(categoria, usuario = 'Usuario') {
    return await this.registrar({
      accion: 'categoria_editada',
      descripcion: `${usuario} editó la categoría "${categoria.nombre}"`,
      usuario: usuario,
      modulo: 'categorias',
      categoria_id: categoria._id
    });
  }

  static async categoriaEliminada(nombreCategoria, usuario = 'Usuario') {
    return await this.registrar({
      accion: 'categoria_eliminada',
      descripcion: `${usuario} eliminó la categoría "${nombreCategoria}"`,
      usuario: usuario,
      modulo: 'categorias',
      metadata: {
        nombre: nombreCategoria
      }
    });
  }

  // =============================================================================
  // ACCIONES DE REPORTES
  // =============================================================================

  static async reporteGenerado(tipo, filtros, cantidad, usuario = 'Usuario') {
    const tipos = {
      'excel': 'Excel',
      'pdf': 'PDF',
      'csv': 'CSV'
    };
    
    return await this.registrar({
      accion: `reporte_${tipo}_generado`,
      descripcion: `${usuario} generó un reporte en ${tipos[tipo]} con ${cantidad} registro(s)`,
      usuario: usuario,
      modulo: 'reportes',
      metadata: {
        tipo: tipo,
        filtros: filtros,
        cantidad: cantidad
      }
    });
  }

  // =============================================================================
  // ACCIONES DE TAREAS
  // =============================================================================

  static async tareaCreada(tarea, usuario = 'Usuario') {
    return await this.registrar({
      accion: 'tarea_creada',
      descripcion: `${usuario} creó la tarea "${tarea.titulo}"`,
      usuario: usuario,
      modulo: 'tareas',
      metadata: {
        titulo: tarea.titulo,
        prioridad: tarea.prioridad,
        estado: tarea.estado
      }
    });
  }

  static async tareaEditada(tarea, usuario = 'Usuario') {
    return await this.registrar({
      accion: 'tarea_editada',
      descripcion: `${usuario} editó la tarea "${tarea.titulo}"`,
      usuario: usuario,
      modulo: 'tareas',
      metadata: {
        titulo: tarea.titulo
      }
    });
  }

  static async tareaCompletada(tarea, usuario = 'Usuario') {
    return await this.registrar({
      accion: 'tarea_completada',
      descripcion: `${usuario} completó la tarea "${tarea.titulo}"`,
      usuario: usuario,
      modulo: 'tareas',
      metadata: {
        titulo: tarea.titulo
      }
    });
  }

  static async tareaEliminada(titulo, usuario = 'Usuario') {
    return await this.registrar({
      accion: 'tarea_eliminada',
      descripcion: `${usuario} eliminó la tarea "${titulo}"`,
      usuario: usuario,
      modulo: 'tareas',
      metadata: {
        titulo: titulo
      }
    });
  }

  // =============================================================================
  // ACCIONES DE SISTEMA
  // =============================================================================

  static async sistemaIniciado() {
    return await this.registrar({
      accion: 'sistema_iniciado',
      descripcion: 'Sistema iniciado correctamente',
      usuario: 'Sistema',
      modulo: 'sistema'
    });
  }

  static async papeleraVaciada(cantidad, usuario = 'Usuario') {
    return await this.registrar({
      accion: 'papelera_vaciada',
      descripcion: `${usuario} vació la papelera eliminando ${cantidad} documento(s) definitivamente`,
      usuario: usuario,
      modulo: 'papelera',
      metadata: {
        cantidad: cantidad
      }
    });
  }

  static async busquedaRealizada(termino, resultados, usuario = 'Usuario') {
    return await this.registrar({
      accion: 'busqueda_realizada',
      descripcion: `${usuario} buscó "${termino}" - ${resultados} resultado(s)`,
      usuario: usuario,
      modulo: 'busqueda',
      metadata: {
        termino: termino,
        resultados: resultados
      }
    });
  }

  static async filtroAplicado(filtros, resultados, usuario = 'Usuario') {
    return await this.registrar({
      accion: 'filtro_aplicado',
      descripcion: `${usuario} aplicó filtros - ${resultados} resultado(s)`,
      usuario: usuario,
      modulo: 'busqueda',
      metadata: {
        filtros: filtros,
        resultados: resultados
      }
    });
  }

  // =============================================================================
  // CONSULTAS
  // =============================================================================

  /**
   * Obtener historial con filtros y paginación
   */
  static async obtener(filtros = {}, opciones = {}) {
    const {
      accion = null,
      modulo = null,
      usuario = null,
      desde = null,
      hasta = null,
      limite = 100,
      pagina = 1
    } = { ...filtros, ...opciones };

    const query = {};
    
    if (accion) query.accion = accion;
    if (modulo) query.modulo = modulo;
    if (usuario) query.usuario = usuario;
    if (desde || hasta) {
      query.fecha = {};
      if (desde) query.fecha.$gte = new Date(desde);
      if (hasta) query.fecha.$lte = new Date(hasta);
    }

    const skip = (pagina - 1) * limite;

    const entradas = await Historial.find(query)
      .populate('documento_id', 'nombre_original categoria')
      .populate('persona_id', 'nombre departamento')
      .populate('categoria_id', 'nombre')
      .sort({ fecha: -1 })
      .limit(limite)
      .skip(skip);

    const total = await Historial.countDocuments(query);

    return {
      entradas,
      total,
      pagina,
      totalPaginas: Math.ceil(total / limite)
    };
  }

  /**
   * Obtener estadísticas del historial
   */
  static async obtenerEstadisticas() {
    return await Historial.obtenerEstadisticas();
  }

  /**
   * Limpiar historial antiguo
   */
  static async limpiarAntiguo(dias = 90) {
    return await Historial.limpiarAntiguo(dias);
  }
}

module.exports = HistorialService;
