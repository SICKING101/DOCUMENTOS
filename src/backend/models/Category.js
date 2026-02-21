import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  descripcion: String,
  color: { type: String, default: '#4f46e5' },
  icon: { type: String, default: 'folder' },
  activo: { type: Boolean, default: true }
}, { timestamps: true });

// Usar export default
const Category = mongoose.model('Category', categorySchema);
export default Category;