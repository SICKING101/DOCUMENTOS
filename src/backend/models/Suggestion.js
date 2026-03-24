import mongoose from 'mongoose';

const suggestionSchema = new mongoose.Schema({
    // Información básica
    title: {
        type: String,
        required: [true, 'El título es requerido'],
        trim: true,
        minlength: [5, 'El título debe tener al menos 5 caracteres'],
        maxlength: [100, 'El título no puede exceder 100 caracteres']
    },
    
    category: {
        type: String,
        required: [true, 'La categoría es requerida'],
        enum: ['funcionalidad', 'mejora', 'ui', 'rendimiento', 'seguridad', 'documentos', 'tareas', 'reportes', 'otro']
    },
    
    description: {
        type: String,
        required: [true, 'La descripción es requerida'],
        trim: true,
        minlength: [10, 'La descripción debe tener al menos 10 caracteres'],
        maxlength: [1000, 'La descripción no puede exceder 1000 caracteres']
    },
    
    benefit: {
        type: String,
        trim: true,
        maxlength: [500, 'El beneficio no puede exceder 500 caracteres'],
        default: ''
    },
    
    priority: {
        type: String,
        enum: ['baja', 'media', 'alta'],
        default: 'media'
    },
    
    // Autor de la sugerencia
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    
    authorName: {
        type: String,
        default: ''
    },
    
    authorEmail: {
        type: String,
        default: ''
    },
    
    // Si es anónimo, no se guarda el nombre
    anonymous: {
        type: Boolean,
        default: false
    },
    
    // Estado (solo para seguimiento)
    status: {
        type: String,
        enum: ['pending', 'reviewed', 'implemented'],
        default: 'pending'
    },
    
    // Metadatos
    ipAddress: {
        type: String
    },
    
    userAgent: {
        type: String
    },
    
    createdAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Índices
suggestionSchema.index({ createdAt: -1 });
suggestionSchema.index({ category: 1 });
suggestionSchema.index({ status: 1 });

const Suggestion = mongoose.model('Suggestion', suggestionSchema);

export default Suggestion;