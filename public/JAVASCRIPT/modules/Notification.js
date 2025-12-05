const mongoose = require('mongoose');

// =============================================================================
// 1. DEFINICIÓN DEL ESQUEMA DE NOTIFICACIONES
// =============================================================================

/**
 * 1.1 Crear esquema principal de notificaciones
 * Define la estructura de datos para las notificaciones en la base de datos MongoDB.
 */
const notificationSchema = new mongoose.Schema({
  tipo: {
    type: String,
    required: true,
    enum: [
      'documento_subido',
      'documento_eliminado',
      'documento_proximo_vencer',
      'documento_vencido',
      'persona_agregada',
      'persona_eliminada',
      'categoria_agregada',
      'categoria_eliminada',
      'reporte_generado',
      'sistema_iniciado',
      'error_sistema'
    ]
  },
  titulo: {
    type: String,
    required: true,
    maxlength: 200
  },
  mensaje: {
    type: String,
    required: true,
    maxlength: 500
  },
  icono: {
    type: String,
    default: 'bell'
  },
  prioridad: {
    type: String,
    enum: ['baja', 'media', 'alta', 'critica'],
    default: 'media'
  },
  leida: {
    type: Boolean,
    default: false
  },
  
  // =============================================================================
  // 2. REFERENCIAS A OTRAS COLECCIONES
  // =============================================================================
  
  /**
   * 2.1 Referencia a documento relacionado
   * Vincula la notificación a un documento específico cuando corresponde.
   */
  documento_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Document',
    default: null
  },
  
  /**
   * 2.2 Referencia a persona relacionada
   * Vincula la notificación a una persona específica cuando corresponde.
   */
  persona_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Person',
    default: null
  },
  
  /**
   * 2.3 Referencia a categoría relacionada
   * Vincula la notificación a una categoría específica cuando corresponde.
   */
  categoria_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    default: null
  },
  
  // =============================================================================
  // 3. METADATOS Y FECHAS
  // =============================================================================
  
  /**
   * 3.1 Metadatos adicionales flexibles
   * Almacena información extra específica de cada tipo de notificación.
   */
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  
  /**
   * 3.2 Fecha de creación personalizada
   * Permite ordenar por fecha de creación específica del evento.
   */
  fecha_creacion: {
    type: Date,
    default: Date.now
  }
}, {
  // =============================================================================
  // 4. CONFIGURACIÓN DEL ESQUEMA
  // =============================================================================
  
  /**
   * 4.1 Habilitar timestamps automáticos
   * Agrega automáticamente campos createdAt y updatedAt a cada documento.
   */
  timestamps: true
});

// =============================================================================
// 5. ÍNDICES PARA OPTIMIZACIÓN DE CONSULTAS
// =============================================================================

/**
 * 5.1 Índice para ordenar por fecha descendente
 * Optimiza consultas que necesitan las notificaciones más recientes primero.
 */
notificationSchema.index({ fecha_creacion: -1 });

/**
 * 5.2 Índice para consultar notificaciones no leídas por fecha
 * Acelera las consultas del dashboard y contador de notificaciones no leídas.
 */
notificationSchema.index({ leida: 1, fecha_creacion: -1 });

/**
 * 5.3 Índice para filtrar por tipo de notificación
 * Mejora el rendimiento al buscar notificaciones de un tipo específico.
 */
notificationSchema.index({ tipo: 1, fecha_creacion: -1 });

/**
 * 5.4 Índice para consultar por prioridad y estado de lectura
 * Optimiza consultas para notificaciones críticas no leídas.
 */
notificationSchema.index({ prioridad: 1, leida: 1 });

// =============================================================================
// 6. MÉTODOS DE INSTANCIA
// =============================================================================

/**
 * 6.1 Marcar notificación como leída
 * Método de instancia para cambiar el estado de lectura y guardar en la base de datos.
 */
notificationSchema.methods.marcarLeida = async function() {
  this.leida = true;
  return await this.save();
};

// =============================================================================
// 7. MÉTODOS ESTÁTICOS (OPERACIONES A NIVEL DE COLECCIÓN)
// =============================================================================

/**
 * 7.1 Limpiar notificaciones antiguas
 * Elimina notificaciones leídas con más de X días para mantener la base de datos optimizada.
 */
notificationSchema.statics.limpiarAntiguas = async function(dias = 30) {
  const fechaLimite = new Date();
  fechaLimite.setDate(fechaLimite.getDate() - dias);
  
  const resultado = await this.deleteMany({
    fecha_creacion: { $lt: fechaLimite },
    leida: true
  });
  
  return resultado.deletedCount;
};

/**
 * 7.2 Obtener estadísticas de notificaciones
 * Genera reporte de estadísticas para dashboard administrativo.
 */
notificationSchema.statics.obtenerEstadisticas = async function() {
  const total = await this.countDocuments();
  const noLeidas = await this.countDocuments({ leida: false });
  const porTipo = await this.aggregate([
    {
      $group: {
        _id: '$tipo',
        count: { $sum: 1 }
      }
    }
  ]);
  
  return {
    total,
    leidas: total - noLeidas,
    noLeidas,
    porTipo
  };
};

// =============================================================================
// 8. CREACIÓN Y EXPORTACIÓN DEL MODELO
// =============================================================================

/**
 * 8.1 Crear modelo de Notification
 * Convierte el esquema en un modelo Mongoose para interactuar con la colección.
 */
const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;