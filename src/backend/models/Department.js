import mongoose from 'mongoose';

const departmentSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  descripcion: String,
  color: { type: String, default: '#3b82f6' },
  icon: { type: String, default: 'building' },
  activo: { type: Boolean, default: true },
  // ===== 🆕 NUEVO: Identificador de escuela =====
  schoolId: { 
    type: String, 
    required: true, 
    index: true 
  },
}, { timestamps: true });

// Índice compuesto
departmentSchema.index({ schoolId: 1, activo: 1 });

const Department = mongoose.model('Department', departmentSchema);
export default Department;