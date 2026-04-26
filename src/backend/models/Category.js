import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  descripcion: String,
  color: { type: String, default: '#4f46e5' },
  icon: { type: String, default: 'folder' },
  activo: { type: Boolean, default: true },
  // ===== 🆕 NUEVO: Identificador de escuela =====
  schoolId: { 
    type: String, 
    required: true, 
    index: true 
  },
}, { timestamps: true });

// Índice compuesto para búsquedas por escuela
categorySchema.index({ schoolId: 1, activo: 1 });

const Category = mongoose.model('Category', categorySchema);
export default Category;