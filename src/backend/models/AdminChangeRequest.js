import mongoose from 'mongoose';

const adminChangeRequestSchema = new mongoose.Schema({
    // =========================================================================
    // ADMINISTRADOR ACTUAL
    // =========================================================================
    currentAdminId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    currentAdminEmail: {
        type: String,
        required: true,
        trim: true,
        lowercase: true
    },
    currentAdminName: {  // ¡IMPORTANTE: AÑADIDO!
        type: String,
        required: true,
        trim: true
    },
    
    // =========================================================================
    // NUEVO ADMINISTRADOR
    // =========================================================================
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
    newAdminPassword: {  // ¡ESTE ES EL CAMPO CRÍTICO!
        type: String,
        required: true
    },
    
    // =========================================================================
    // TOKEN Y SEGURIDAD
    // =========================================================================
    verificationToken: {
        type: String,
        required: true,
        unique: true
    },
    tokenExpires: {
        type: Date,
        required: true
    },
    
    // =========================================================================
    // ESTADO
    // =========================================================================
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'expired', 'pending_no_email'], // ¡AÑADIDO 'pending_no_email'!
        default: 'pending'
    },
    
    // =========================================================================
    // REFERENCIAS A USUARIOS
    // =========================================================================
    newAdminId: {  // ¡IMPORTANTE: AÑADIDO!
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    oldAdminDeactivated: {
        type: Boolean,
        default: false
    },
    newAdminCreated: {
        type: Boolean,
        default: false
    },
    
    // =========================================================================
    // NOTIFICACIONES
    // =========================================================================
    notificationSent: {
        type: Boolean,
        default: false
    },
    emailError: {  // ¡IMPORTANTE: AÑADIDO!
        type: String
    },
    
    // =========================================================================
    // METADATA PARA DEBUGGING
    // =========================================================================
    metadata: {  // ¡IMPORTANTE: AÑADIDO!
        passwordLength: Number,
        requestTimestamp: Date,
        clientInfo: {
            ip: String,
            userAgent: String
        }
    },
    
    // =========================================================================
    // AUDITORÍA
    // =========================================================================
    ipAddress: String,
    userAgent: String,
    
    // =========================================================================
    // INTENTOS DE VERIFICACIÓN
    // =========================================================================
    verificationAttempts: {
        type: Number,
        default: 0
    },
    lastVerificationAttempt: Date,
    
    // =========================================================================
    // TIMESTAMPS
    // =========================================================================
    requestedAt: {
        type: Date,
        default: Date.now
    },
    approvedAt: Date,
    rejectedAt: Date,
    approvedBy: String
}, {
    timestamps: true
});

// =============================================================================
// ÍNDICES PARA OPTIMIZACIÓN
// =============================================================================
adminChangeRequestSchema.index({ verificationToken: 1 });
adminChangeRequestSchema.index({ status: 1 });
adminChangeRequestSchema.index({ tokenExpires: 1 });
adminChangeRequestSchema.index({ currentAdminId: 1 });
adminChangeRequestSchema.index({ newAdminEmail: 1 });  // ¡NUEVO!
adminChangeRequestSchema.index({ 'metadata.requestTimestamp': 1 });  // ¡NUEVO!

// =============================================================================
// MÉTODOS
// =============================================================================

// Método para verificar si el token es válido
adminChangeRequestSchema.methods.isTokenValid = function() {
    return this.status === 'pending' && 
           this.tokenExpires > new Date() && 
           this.verificationAttempts < 5;
};

// Método para incrementar intentos (mantenido para compatibilidad)
adminChangeRequestSchema.methods.incrementAttempts = function() {
    this.verificationAttempts += 1;
    this.lastVerificationAttempt = new Date();
    
    if (this.verificationAttempts >= 5) {
        this.status = 'rejected';
    }
    
    return this.save();
};

// =============================================================================
// MIDDLEWARE
// =============================================================================

// Middleware para limpiar solicitudes expiradas automáticamente
adminChangeRequestSchema.pre('save', function(next) {
    if (this.tokenExpires && this.tokenExpires < new Date() && this.status === 'pending') {
        this.status = 'expired';
        console.log(`🔄 Solicitud ${this._id} marcada como expirada automáticamente`);
    }
    next();
});

// Middleware post-save para logging
adminChangeRequestSchema.post('save', function(doc) {
    console.log(`📝 AdminChangeRequest guardado: ${doc._id}`);
    console.log(`   - Estado: ${doc.status}`);
    console.log(`   - Nuevo admin: ${doc.newAdminUser}`);
    console.log(`   - Contraseña almacenada: ${doc.newAdminPassword ? '✅ Sí' : '❌ No'}`);
    if (doc.newAdminPassword) {
        console.log(`   - Longitud hash: ${doc.newAdminPassword.length} caracteres`);
    }
});

// =============================================================================
// MÉTODOS ESTÁTICOS PARA CONSULTAS COMUNES
// =============================================================================

// Encontrar solicitudes activas por admin
adminChangeRequestSchema.statics.findActiveByAdmin = function(adminId) {
    return this.find({
        currentAdminId: adminId,
        status: 'pending',
        tokenExpires: { $gt: new Date() }
    }).sort({ requestedAt: -1 });
};

// Encontrar solicitud por token
adminChangeRequestSchema.statics.findByToken = function(token) {
    return this.findOne({
        verificationToken: token,
        status: 'pending'
    });
};

// Limpiar solicitudes expiradas
adminChangeRequestSchema.statics.cleanupExpired = function() {
    const cutoffDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 días
    
    return this.updateMany(
        {
            $or: [
                { status: 'expired' },
                { 
                    status: 'pending', 
                    tokenExpires: { $lt: new Date() } 
                }
            ],
            updatedAt: { $lt: cutoffDate }
        },
        {
            $set: { status: 'expired' }
        }
    );
};

// =============================================================================
// VALIDACIONES VIRTUALES
// =============================================================================

// Tiempo restante en horas
adminChangeRequestSchema.virtual('remainingHours').get(function() {
    if (!this.tokenExpires) return 0;
    const now = new Date();
    const diff = this.tokenExpires - now;
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60)));
});

// ¿Es urgente? (menos de 2 horas)
adminChangeRequestSchema.virtual('isUrgent').get(function() {
    return this.remainingHours <= 2 && this.status === 'pending';
});

const AdminChangeRequest = mongoose.model('AdminChangeRequest', adminChangeRequestSchema);

export default AdminChangeRequest;