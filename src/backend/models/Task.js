// src/backend/models/Task.js

import mongoose from 'mongoose';

const DEBUG = true;
function tlog(...args) { if (DEBUG) console.log('📝 [Task]', ...args); }

const commentSchema = new mongoose.Schema({
  texto: { type: String, required: true, trim: true, maxlength: 1000 },
  usuario: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  usuarioNombre: { type: String, required: true },
  fecha: { type: Date, default: Date.now },
  editado: { type: Boolean, default: false },
  fechaEdicion: { type: Date, default: null }
}, { _id: true });

const attachmentSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  nombreOriginal: { type: String, required: true },
  url: { type: String, required: true },
  tipo: { type: String, required: true },
  tamaño: { type: Number, required: true },
  subidoPor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  subidoPorNombre: { type: String, required: true },
  fechaSubida: { type: Date, default: Date.now }
}, { _id: true });

const historySchema = new mongoose.Schema({
  campo: { type: String, required: true },
  valorAnterior: mongoose.Schema.Types.Mixed,
  valorNuevo: mongoose.Schema.Types.Mixed,
  modificadoPor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  modificadoPorNombre: { type: String, required: true },
  fecha: { type: Date, default: Date.now }
}, { _id: true });

const taskSchema = new mongoose.Schema({
  titulo: { type: String, required: [true, 'El título es obligatorio'], trim: true, maxlength: 200 },
  descripcion: { type: String, default: '', trim: true, maxlength: 5000 },
  estado: { type: String, enum: ['pendiente', 'en-progreso', 'completada', 'cancelada'], default: 'pendiente' },
  prioridad: { type: String, enum: ['baja', 'media', 'alta', 'critica'], default: 'media' },
  tipo: { type: String, enum: ['personal', 'asignada', 'grupal', 'clase'], default: 'personal' },
  asignado_a: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  completado_por: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  creado_por: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  creado_por_nombre: { type: String, required: true },
  fecha_limite: { type: Date, default: null },
  hora_limite: { type: String, default: null },
  fecha_completada: { type: Date, default: null },
  fecha_inicio: { type: Date, default: Date.now },
  categoria: { type: String, default: '' },
  etiquetas: [{ type: String, trim: true }],
  recordatorio: { type: Boolean, default: false },
  recordatorio_enviado: { type: Boolean, default: false },
  comentarios: [commentSchema],
  archivos: [attachmentSchema],
  historial: [historySchema],
  activo: { type: Boolean, default: true },
  fecha_creacion: { type: Date, default: Date.now },
  fecha_actualizacion: { type: Date, default: Date.now },
  
  // ===== 🆕 NUEVO =====
  schoolId: { type: String, index: true, default: null },
}, { timestamps: true });

taskSchema.index({ asignado_a: 1 });
taskSchema.index({ creado_por: 1 });
taskSchema.index({ estado: 1, prioridad: -1 });
taskSchema.index({ fecha_limite: 1 });
taskSchema.index({ tipo: 1 });
taskSchema.index({ schoolId: 1 });

taskSchema.pre('save', function(next) {
  this.fecha_actualizacion = new Date();
  next();
});

taskSchema.methods.canView = function(userId) {
  if (this.creado_por && this.creado_por.toString() === userId.toString()) return true;
  if (this.asignado_a.some(id => id.toString() === userId.toString())) return true;
  if (this.tipo === 'personal') return false;
  return false;
};

taskSchema.methods.canComplete = function(userId) {
  if (this.estado === 'completada') return false;
  if (this.creado_por && this.creado_por.toString() === userId.toString()) return true;
  if (this.tipo === 'asignada' && this.asignado_a.length === 1) return this.asignado_a.some(id => id.toString() === userId.toString());
  if (this.tipo === 'grupal' || this.tipo === 'clase') return this.asignado_a.some(id => id.toString() === userId.toString());
  if (this.tipo === 'personal') return this.creado_por && this.creado_por.toString() === userId.toString();
  return false;
};

taskSchema.methods.canEdit = function(userId) {
  return this.creado_por && this.creado_por.toString() === userId.toString();
};

taskSchema.methods.canDelete = function(userId) {
  return this.creado_por && this.creado_por.toString() === userId.toString();
};

taskSchema.methods.complete = async function(userId, userName) {
  if (this.estado === 'completada') throw new Error('La tarea ya está completada');
  if (!this.canComplete(userId)) throw new Error('No tienes permiso para completar esta tarea');
  this.historial.push({ campo: 'estado', valorAnterior: this.estado, valorNuevo: 'completada', modificadoPor: userId, modificadoPorNombre: userName, fecha: new Date() });
  this.estado = 'completada';
  this.completado_por = userId;
  this.fecha_completada = new Date();
  await this.save();
};

taskSchema.methods.addComment = async function(commentData) {
  this.comentarios.push({ texto: commentData.texto, usuario: commentData.usuario, usuarioNombre: commentData.usuarioNombre, fecha: new Date() });
  await this.save();
};

taskSchema.methods.addAttachment = async function(fileData) {
  this.archivos.push({ nombre: fileData.nombre, nombreOriginal: fileData.nombreOriginal, url: fileData.url, tipo: fileData.tipo, tamaño: fileData.tamaño, subidoPor: fileData.subidoPor, subidoPorNombre: fileData.subidoPorNombre });
  await this.save();
};

taskSchema.methods.toJSON = function() {
  const obj = this.toObject();
  if (obj.fecha_limite) {
    // Usar fecha LOCAL, no UTC, para evitar desfase de 1 día por zona horaria
    const d = new Date(obj.fecha_limite);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    obj.fecha_limite_formateada = `${year}-${month}-${day}`;
  }
  obj.comentarios_count = obj.comentarios?.length || 0;
  obj.archivos_count = obj.archivos?.length || 0;
  obj.tiene_nuevos_comentarios = false;
  return obj;
};

taskSchema.statics.getUserTasks = async function(userId, filters = {}) {
  const query = { activo: true, $or: [{ creado_por: userId }, { asignado_a: userId }] };
  if (filters.estado && filters.estado !== 'all') query.estado = filters.estado;
  if (filters.prioridad && filters.prioridad !== 'all') query.prioridad = filters.prioridad;
  if (filters.tipo && filters.tipo !== 'all') query.tipo = filters.tipo;
  if (filters.search) query.$or = [{ titulo: { $regex: filters.search, $options: 'i' } }, { descripcion: { $regex: filters.search, $options: 'i' } }];
  return this.find(query).sort({ fecha_limite: 1, prioridad: -1 }).populate('asignado_a', 'usuario correo').populate('creado_por', 'usuario correo').lean();
};

taskSchema.statics.getUserStats = async function(userId) {
  const query = { activo: true, $or: [{ creado_por: userId }, { asignado_a: userId }] };
  const [total, pendientes, enProgreso, completadas, vencidas] = await Promise.all([
    this.countDocuments(query),
    this.countDocuments({ ...query, estado: 'pendiente' }),
    this.countDocuments({ ...query, estado: 'en-progreso' }),
    this.countDocuments({ ...query, estado: 'completada' }),
    this.countDocuments({ ...query, estado: { $ne: 'completada' }, fecha_limite: { $lt: new Date() } })
  ]);
  return { total, pendientes, enProgreso, completadas, vencidas };
};

const Task = mongoose.model('Task', taskSchema);
export default Task;