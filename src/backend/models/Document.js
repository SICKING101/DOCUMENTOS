import mongoose from 'mongoose';

const documentSchema = new mongoose.Schema({
  nombre_original: { type: String, required: true },
  tipo_archivo: { type: String, required: true },
  tamano_archivo: { type: Number, required: true },
  descripcion: String,
  categoria: String,
  fecha_subida: { type: Date, default: Date.now },
  fecha_vencimiento: Date,
  persona_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Person' },
  cloudinary_url: { type: String, required: true },
  public_id: { type: String, required: true },
  resource_type: { type: String, required: true },
  // Flujo de revisión/aprobación
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'approved'
  },
  reviewedAt: { type: Date, default: null },
  reviewedBy: { type: String, default: null },
  reviewComment: { type: String, default: '' },
  activo: { type: Boolean, default: true },
  // Campos para papelera
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date, default: null },
  deletedBy: { type: String, default: null }
}, { timestamps: true });

// Índices para optimizar consultas frecuentes
documentSchema.index({ persona_id: 1 });
documentSchema.index({ categoria: 1 });
documentSchema.index({ fecha_subida: -1 });
documentSchema.index({ status: 1 });
documentSchema.index({ isDeleted: 1 });

const Document = mongoose.model('Document', documentSchema);
export default Document;