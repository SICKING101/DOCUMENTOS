import mongoose from 'mongoose';

const departmentSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  descripcion: String,
  color: { type: String, default: '#3b82f6' },
  icon: { type: String, default: 'building' },
  activo: { type: Boolean, default: true }
}, { timestamps: true });

const Department = mongoose.model('Department', departmentSchema);
export default Department;
