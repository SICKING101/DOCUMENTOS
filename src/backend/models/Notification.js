// src/backend/models/Notification.js
import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  tipo: {
    type: String,
    required: true,
    enum: [
      'usuario_creado',
      'documento_subido',
      'documento_eliminado',
      'documento_restaurado',
      'documento_proximo_vencer',
      'documento_vencido',
      'persona_agregada',
      'persona_eliminada',
      'categoria_agregada',
      'categoria_eliminada',
      'reporte_generado',
      'sistema_iniciado',
      'error_sistema',
      'tarea_recordatorio',
      'calendario_recordatorio'
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
  // 🆕 Cambiado de Boolean a Array de userIds
  leidaPor: [{
    type: String
  }],
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
  tarea_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task',
    default: null
  },
  calendario_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CalendarEvent',
    default: null
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  fecha_creacion: {
    type: Date,
    default: Date.now
  },
  schoolId: {
    type: String,
    index: true,
    default: null
  },
}, {
  timestamps: true
});

// Índices
notificationSchema.index({ fecha_creacion: -1 });
notificationSchema.index({ leidaPor: 1 });
notificationSchema.index({ tipo: 1, fecha_creacion: -1 });
notificationSchema.index({ prioridad: 1 });
notificationSchema.index({ schoolId: 1, fecha_creacion: -1 });

// 🆕 Método de instancia - Marcar leída por usuario específico
notificationSchema.methods.marcarLeida = async function (userId) {
  if (!this.leidaPor) this.leidaPor = [];
  if (!this.leidaPor.includes(userId)) {
    this.leidaPor.push(userId);
    await this.save();
  }
  return this;
};

// Métodos estáticos
notificationSchema.statics.limpiarAntiguas = async function (dias = 30) {
  const fechaLimite = new Date();
  fechaLimite.setDate(fechaLimite.getDate() - dias);
  const resultado = await this.deleteMany({
    fecha_creacion: { $lt: fechaLimite }
  });
  return resultado.deletedCount;
};

notificationSchema.statics.obtenerEstadisticas = async function (schoolId = null, userId = null) {
  const query = {};
  if (schoolId) {
    query.$or = [
      { schoolId: schoolId },
      { schoolId: { $exists: false } },
      { schoolId: null }
    ];
  }
  const total = await this.countDocuments(query);
  const noLeidasQuery = { ...query };
  if (userId) {
    noLeidasQuery.leidaPor = { $ne: userId };
  }
  const noLeidas = await this.countDocuments(noLeidasQuery);
  const porTipo = await this.aggregate([
    { $match: query },
    { $group: { _id: '$tipo', count: { $sum: 1 } } }
  ]);
  return { total, leidas: total - noLeidas, noLeidas, porTipo };
};

const Notification = mongoose.model('Notification', notificationSchema);
export default Notification;