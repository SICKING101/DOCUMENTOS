const mongoose = require('mongoose');

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
  // Referencias opcionales para tracking
  documento_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Document',
    default: null
  },
  persona_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Person',
    default: null
  },
  categoria_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    default: null
  },
  // Metadatos adicionales
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  fecha_creacion: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Índices para mejorar consultas
notificationSchema.index({ fecha_creacion: -1 });
notificationSchema.index({ leida: 1, fecha_creacion: -1 });
notificationSchema.index({ tipo: 1, fecha_creacion: -1 });
notificationSchema.index({ prioridad: 1, leida: 1 });

// Método para marcar como leída
notificationSchema.methods.marcarLeida = async function() {
  this.leida = true;
  return await this.save();
};

// Método estático para limpiar notificaciones antiguas (más de 30 días)
notificationSchema.statics.limpiarAntiguas = async function(dias = 30) {
  const fechaLimite = new Date();
  fechaLimite.setDate(fechaLimite.getDate() - dias);
  
  const resultado = await this.deleteMany({
    fecha_creacion: { $lt: fechaLimite },
    leida: true
  });
  
  return resultado.deletedCount;
};

// Método estático para obtener estadísticas
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

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;
