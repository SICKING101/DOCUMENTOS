import mongoose from 'mongoose';

const taskSchema = new mongoose.Schema({
  titulo: {
    type: String,
    required: true,
    trim: true
  },
  descripcion: {
    type: String,
    default: ''
  },
  prioridad: {
    type: String,
    enum: ['baja', 'media', 'alta', 'critica'],
    default: 'media'
  },
  estado: {
    type: String,
    enum: ['pendiente', 'en-progreso', 'completada'],
    default: 'pendiente'
  },
  categoria: {
    type: String,
    default: ''
  },
  recordatorio: {
    type: Boolean,
    default: false
  },
  fecha_limite: {
    type: Date,
    default: null
  },
  hora_limite: {
    type: String,
    default: null
  },
  creado_por: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  fecha_creacion: {
    type: Date,
    default: Date.now
  },
  fecha_actualizacion: {
    type: Date,
    default: Date.now
  },
  activo: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Actualizar fecha_actualizacion antes de guardar
taskSchema.pre('save', function(next) {
  this.fecha_actualizacion = new Date();
  next();
});

const Task = mongoose.model('Task', taskSchema);

export default Task;