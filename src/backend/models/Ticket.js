import mongoose from 'mongoose';

const ticketSchema = new mongoose.Schema({
    ticketNumber: {
        type: String,
        unique: true,
        default: function() {
            return `TKT-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
        }
    },
    subject: {
        type: String,
        required: [true, 'El asunto es obligatorio'],
        trim: true,
        maxlength: [200, 'El asunto no puede exceder 200 caracteres']
    },
    description: {
        type: String,
        required: [true, 'La descripción es obligatoria'],
        trim: true
    },
    category: {
        type: String,
        required: [true, 'La categoría es obligatoria'],
    },
    priority: {
        type: String,
        required: [true, 'La prioridad es obligatoria'],
        enum: ['baja', 'media', 'alta', 'critica'],
        default: 'media'
    },
    status: {
        type: String,
        enum: ['abierto', 'en_proceso', 'resuelto', 'cerrado'],
        default: 'abierto'
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    createdByName: {
        type: String,
        required: true
    },
    createdByEmail: {
        type: String,
        required: true,
        lowercase: true,
        trim: true
    },
    attachments: [{
        filename: String,
        originalname: String,
        size: Number,
        cloudinary_url: String,
        public_id: String,
        uploadedAt: {
            type: Date,
            default: Date.now
        }
    }],
    updates: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        userName: String,
        message: String,
        type: {
            type: String,
            enum: ['user_update', 'system', 'status_change', 'admin_note'],
            default: 'user_update'
        },
        statusChange: {
            from: String,
            to: String
        },
        attachments: [{
            filename: String,
            url: String
        }],
        createdAt: {
            type: Date,
            default: Date.now
        }
    }],
    assignedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    assignedAt: Date,
    resolvedAt: Date,
    closedAt: Date,
    emailNotifications: {
        type: Boolean,
        default: true
    },
    isDeleted: {
        type: Boolean,
        default: false
    },
    deletedAt: Date
}, {
    timestamps: true
});

// Índices para mejor rendimiento
ticketSchema.index({ ticketNumber: 1 });
ticketSchema.index({ status: 1 });
ticketSchema.index({ priority: 1 });
ticketSchema.index({ category: 1 });
ticketSchema.index({ createdAt: -1 });
ticketSchema.index({ createdBy: 1 });
ticketSchema.index({ createdBy: 1, status: 1 }); // Para búsquedas de usuario específico

// Middleware pre-save para generar número de ticket
ticketSchema.pre('save', function(next) {
    if (!this.ticketNumber) {
        this.ticketNumber = `TKT-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
    }
    
    // Asegurar que createdBy es ObjectId
    if (this.createdBy && typeof this.createdBy !== 'object') {
        try {
            this.createdBy = mongoose.Types.ObjectId(this.createdBy);
        } catch (error) {
            console.error('Error convirtiendo createdBy a ObjectId:', error);
        }
    }
    
    next();
});

const Ticket = mongoose.model('Ticket', ticketSchema);

export default Ticket;