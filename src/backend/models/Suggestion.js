// src/backend/models/Suggestion.js
import mongoose from 'mongoose';

const suggestionSchema = new mongoose.Schema({
    suggestionNumber: {
        type: String,
        unique: true,
        default: function() {
            const date = new Date();
            const dateStr = date.getFullYear() + 
                           String(date.getMonth() + 1).padStart(2, '0') + 
                           String(date.getDate()).padStart(2, '0');
            const randomNum = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
            return `SUG-${dateStr}-${randomNum}`;
        }
    },
    
    titulo: {
        type: String,
        required: [true, 'El título es obligatorio'],
        trim: true,
        maxlength: [200, 'El título no puede exceder 200 caracteres']
    },
    
    descripcion: {
        type: String,
        required: [true, 'La descripción es obligatoria'],
        trim: true,
        maxlength: [5000, 'La descripción no puede exceder 5000 caracteres']
    },
    
    categoria: {
        type: String,
        required: [true, 'La categoría es obligatoria'],
        enum: ['mejora', 'nueva_funcionalidad', 'reporte_error', 'experiencia_usuario', 'rendimiento', 'seguridad', 'otros'],
        default: 'mejora'
    },
    
    attachments: [{
        filename: String,
        originalname: String,
        size: Number,
        mimetype: String,
        cloudinary_url: String,
        public_id: String,
        uploadedAt: {
            type: Date,
            default: Date.now
        }
    }],
    
    usuario: {
        id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: false,
            default: null
        },
        nombre: {
            type: String,
            required: true
        },
        email: {
            type: String,
            required: true,
            lowercase: true,
            trim: true
        },
        rol: {
            type: String,
            default: 'usuario'
        }
    },
    
    estado: {
        type: String,
        enum: ['pendiente', 'vista', 'considerando', 'implementada', 'rechazada'],
        default: 'pendiente'
    },
    
    fechaEnvio: {
        type: Date,
        default: Date.now
    },
    
    fechaVista: {
        type: Date,
        default: null
    },
    
    vistaPor: {
        type: String,
        default: null
    },
    
    metadata: {
        userAgent: { type: String, default: '' },
        ipAddress: { type: String, default: '' }
    }
}, {
    timestamps: true
});

suggestionSchema.index({ suggestionNumber: 1 });
suggestionSchema.index({ estado: 1 });
suggestionSchema.index({ categoria: 1 });
suggestionSchema.index({ fechaEnvio: -1 });

suggestionSchema.methods.toPublicJSON = function() {
    return {
        id: this._id,
        suggestionNumber: this.suggestionNumber,
        titulo: this.titulo,
        categoria: this.categoria,
        estado: this.estado,
        fechaEnvio: this.fechaEnvio,
        fechaVista: this.fechaVista,
        usuario: {
            nombre: this.usuario.nombre,
            rol: this.usuario.rol
        },
        tieneAdjuntos: this.attachments && this.attachments.length > 0
    };
};

const Suggestion = mongoose.model('Suggestion', suggestionSchema);
export default Suggestion;