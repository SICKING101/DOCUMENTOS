// src/backend/models/CalendarEvent.js
import mongoose from 'mongoose';

const calendarEventSchema = new mongoose.Schema({
  // ID local generado en el frontend (para evitar duplicados y mapeo)
  localId: {
    type: String,
    required: true,
    index: true
  },
  // ID de serie (para eventos recurrentes o grupos)
  seriesId: {
    type: String,
    index: true,
    default: null
  },
  titulo: {
    type: String,
    required: true,
    maxlength: 200
  },
  tipo: {
    type: String,
    enum: ['academic', 'meetings', 'deadlines', 'holidays', 'exam', 'personal'],
    default: 'academic'
  },
  prioridad: {
    type: String,
    enum: ['normal', 'high', 'urgent', 'low'],
    default: 'normal'
  },
  color: {
    type: String,
    default: '#6366f1'
  },
  // Fecha principal del evento (almacenada a mediodia UTC para evitar desfases)
  fecha: {
    type: Date,
    required: true,
    index: true
  },
  fechaFin: {
    type: Date,
    default: null
  },
  horaInicio: {
    type: String,
    default: null
  },
  horaFin: {
    type: String,
    default: null
  },
  ubicacion: {
    type: String,
    maxlength: 150,
    default: ''
  },
  descripcion: {
    type: String,
    maxlength: 2000,
    default: ''
  },
  recurrencia: {
    type: String,
    enum: ['none', 'daily', 'weekly', 'biweekly', 'monthly', 'yearly'],
    default: 'none'
  },
  // ✅ Solo 2 opciones de recordatorio: 1 día y 3 días
  recordatorio: {
    type: String,
    enum: ['', '1d', '3d'],
    default: ''
  },
  // ✅ Para evitar enviar recordatorio más de una vez
  recordatorio_enviado: {
    type: Boolean,
    default: false
  },
  creadoPor: {
    type: String,
    default: 'sistema'
  },
  schoolId: {
    type: String,
    index: true,
    default: null
  },
  activo: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Índices compuestos
calendarEventSchema.index({ fecha: 1, schoolId: 1 });
calendarEventSchema.index({ localId: 1, schoolId: 1 });
calendarEventSchema.index({ seriesId: 1, schoolId: 1 });
calendarEventSchema.index({ recordatorio: 1, recordatorio_enviado: 1, activo: 1 });

const CalendarEvent = mongoose.model('CalendarEvent', calendarEventSchema);
export default CalendarEvent;