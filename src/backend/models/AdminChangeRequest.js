import mongoose from 'mongoose';

const adminChangeRequestSchema = new mongoose.Schema({
    currentAdminId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    currentAdminEmail: {
        type: String,
        required: true
    },
    newAdminUser: {
        type: String,
        required: true,
        trim: true
    },
    newAdminEmail: {
        type: String,
        required: true,
        trim: true,
        lowercase: true
    },
    newAdminPassword: {
        type: String,
        required: true
    },
    verificationToken: {
        type: String,
        required: true,
        unique: true
    },
    tokenExpires: {
        type: Date,
        required: true
    },
    // Estado: pending, approved, rejected, expired
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'expired'],
        default: 'pending'
    },
    // Auditoría
    requestedAt: {
        type: Date,
        default: Date.now
    },
    approvedAt: Date,
    rejectedAt: Date,
    approvedBy: {
        type: String
    },
    ipAddress: String,
    userAgent: String,
    // Historial de intentos de verificación
    verificationAttempts: {
        type: Number,
        default: 0
    },
    lastVerificationAttempt: Date,
    // Para registrar cambios
    oldAdminDeactivated: {
        type: Boolean,
        default: false
    },
    newAdminCreated: {
        type: Boolean,
        default: false
    },
    notificationSent: {
    type: Boolean,
    default: false
}
}, {
    timestamps: true
});

// Índices para búsquedas rápidas
adminChangeRequestSchema.index({ verificationToken: 1 });
adminChangeRequestSchema.index({ status: 1 });
adminChangeRequestSchema.index({ tokenExpires: 1 });
adminChangeRequestSchema.index({ currentAdminId: 1 });

// Método para verificar si el token es válido
adminChangeRequestSchema.methods.isTokenValid = function() {
    return this.status === 'pending' && 
           this.tokenExpires > new Date() && 
           this.verificationAttempts < 5;
};

// Método para incrementar intentos
adminChangeRequestSchema.methods.incrementAttempts = function() {
    this.verificationAttempts += 1;
    this.lastVerificationAttempt = new Date();
    
    if (this.verificationAttempts >= 5) {
        this.status = 'rejected';
    }
    
    return this.save();
};

// Método para marcar como aprobado
adminChangeRequestSchema.methods.markAsApproved = function(approvedBy) {
    this.status = 'approved';
    this.approvedAt = new Date();
    this.approvedBy = approvedBy;
    return this.save();
};

// Método para marcar como rechazado
adminChangeRequestSchema.methods.markAsRejected = function() {
    this.status = 'rejected';
    this.rejectedAt = new Date();
    return this.save();
};

// Middleware para limpiar solicitudes expiradas automáticamente
adminChangeRequestSchema.pre('save', function(next) {
    if (this.tokenExpires && this.tokenExpires < new Date() && this.status === 'pending') {
        this.status = 'expired';
    }
    next();
});

const AdminChangeRequest = mongoose.model('AdminChangeRequest', adminChangeRequestSchema);

export default AdminChangeRequest;