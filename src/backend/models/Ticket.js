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
        type: mongoose.Schema.Types.Mixed,
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
        user: mongoose.Schema.Types.Mixed,
        userName: String,
        message: String,
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
        type: mongoose.Schema.Types.Mixed,
        ref: 'User'
    },
    assignedAt: Date,
    resolvedAt: Date,
    closedAt: Date,
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

// Middleware pre-save para generar número de ticket
ticketSchema.pre('save', function(next) {
    if (!this.ticketNumber) {
        this.ticketNumber = `TKT-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
    }
    next();
});

const Ticket = mongoose.model('Ticket', ticketSchema);

export default Ticket;