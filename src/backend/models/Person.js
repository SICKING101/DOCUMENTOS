import mongoose from 'mongoose';

const personSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  email: { type: String, required: true },
  telefono: String,
  departamento: String,
  puesto: String,
  activo: { type: Boolean, default: true },
  fecha_creacion: { type: Date, default: Date.now }
}, { timestamps: true });

// Usar export default
const Person = mongoose.model('Person', personSchema);
export default Person;