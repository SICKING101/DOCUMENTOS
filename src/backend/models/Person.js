// models/Person.js

import mongoose from 'mongoose';

const personSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  email: { type: String, required: true },
  telefono: String,
  departamento: String,
  puesto: String,
  activo: { type: Boolean, default: true },
  fecha_creacion: { type: Date, default: Date.now },
  // ===== 🆕 NUEVO: Identificador de escuela =====
  schoolId: { 
    type: String, 
    required: true, 
    index: true 
  },
}, { timestamps: true });

personSchema.index({ schoolId: 1, activo: 1 });

// Usar export default
const Person = mongoose.model('Person', personSchema);
export default Person;