import mongoose from 'mongoose';

// ============================================================================
// SECCIÓN: MODELO DE SOLICITUD DE CAMBIO DE ADMINISTRADOR
// ============================================================================
// Este archivo define el esquema de Mongoose para gestionar solicitudes de
// cambio de administrador en el sistema. Incluye validación, auditoría,
// métodos de utilidad y optimizaciones de rendimiento para manejar este
// proceso sensible de transferencia de privilegios administrativos.
// ============================================================================

// ********************************************************************
// MÓDULO 1: DEFINICIÓN DEL ESQUEMA PRINCIPAL
// ********************************************************************
// Descripción: Crea el esquema base con todos los campos necesarios para
// rastrear solicitudes de cambio de administrador, incluyendo información
// del administrador actual, nuevo administrador, tokens de verificación
// y metadatos de seguridad.
// ********************************************************************
const adminChangeRequestSchema = new mongoose.Schema({
    // =========================================================================
    // INFORMACIÓN DEL ADMINISTRADOR ACTUAL
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
    currentAdminName: {
        type: String,
        required: true,
        trim: true
    },
    
    // =========================================================================
    // INFORMACIÓN DEL NUEVO ADMINISTRADOR PROPUESTO
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
    newAdminPassword: {
        type: String,
        required: true
    },
    
    // =========================================================================
    // TOKEN DE VERIFICACIÓN Y SEGURIDAD TEMPORAL
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
    // ESTADO DEL FLUJO DE SOLICITUD
    // =========================================================================
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'expired', 'pending_no_email'],
        default: 'pending'
    },
    
    // =========================================================================
    // REFERENCIAS A USUARIOS Y ESTADOS DE IMPLEMENTACIÓN
    // =========================================================================
    newAdminId: {
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
    // ESTADO DE NOTIFICACIONES Y ERRORES
    // =========================================================================
    notificationSent: {
        type: Boolean,
        default: false
    },
    emailError: {
        type: String
    },
    
    // =========================================================================
    // METADATOS PARA AUDITORÍA Y DEPURACIÓN
    // =========================================================================
    metadata: {
        passwordLength: Number,
        requestTimestamp: Date,
        clientInfo: {
            ip: String,
            userAgent: String
        }
    },
    
    // =========================================================================
    // INFORMACIÓN DE AUDITORÍA DE LA SOLICITUD
    // =========================================================================
    ipAddress: String,
    userAgent: String,
    
    // =========================================================================
    // SEGUIMIENTO DE INTENTOS DE VERIFICACIÓN
    // =========================================================================
    verificationAttempts: {
        type: Number,
        default: 0
    },
    lastVerificationAttempt: Date,
    
    // =========================================================================
    // MARCAS DE TIEMPO PARA SEGUIMIENTO TEMPORAL
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

// ********************************************************************
// MÓDULO 2: CONFIGURACIÓN DE ÍNDICES PARA OPTIMIZACIÓN
// ********************************************************************
// Descripción: Define índices de base de datos para acelerar consultas
// frecuentes y mejorar el rendimiento en operaciones críticas de búsqueda
// y filtrado de solicitudes.
// ********************************************************************

// ----------------------------------------------------------------
// BLOQUE 2.1: Índice para búsqueda rápida por token de verificación
// ----------------------------------------------------------------
// Acelera la validación de tokens durante el proceso de confirmación
// de solicitudes, que es una operación crítica en tiempo real.
adminChangeRequestSchema.index({ verificationToken: 1 });

// ----------------------------------------------------------------
// BLOQUE 2.2: Índice para filtrado por estado
// ----------------------------------------------------------------
// Optimiza consultas que buscan solicitudes por estado (pendientes,
// aprobadas, rechazadas), frecuentes en paneles de administración.
adminChangeRequestSchema.index({ status: 1 });

// ----------------------------------------------------------------
// BLOQUE 2.3: Índice para limpieza automática de expirados
// ----------------------------------------------------------------
// Facilita la búsqueda de solicitudes cuyo token ha expirado para
// tareas de mantenimiento y limpieza programada.
adminChangeRequestSchema.index({ tokenExpires: 1 });

// ----------------------------------------------------------------
// BLOQUE 2.4: Índice para consultas por administrador actual
// ----------------------------------------------------------------
// Mejora rendimiento al buscar solicitudes asociadas a un
// administrador específico para auditoría o administración.
adminChangeRequestSchema.index({ currentAdminId: 1 });

// ----------------------------------------------------------------
// BLOQUE 2.5: Índice para búsqueda por correo del nuevo admin
// ----------------------------------------------------------------
// Optimiza verificación de duplicados y búsqueda de solicitudes
// por correo electrónico del nuevo administrador.
adminChangeRequestSchema.index({ newAdminEmail: 1 });

// ----------------------------------------------------------------
// BLOQUE 2.6: Índice para análisis temporal de solicitudes
// ----------------------------------------------------------------
// Permite consultas eficientes por fecha/hora de creación para
// reportes, estadísticas y análisis de tendencias.
adminChangeRequestSchema.index({ 'metadata.requestTimestamp': 1 });

// ********************************************************************
// MÓDULO 3: MÉTODOS DE INSTANCIA PARA VALIDACIÓN
// ********************************************************************
// Descripción: Métodos asociados a documentos individuales que realizan
// verificaciones de estado, manejo de intentos y otras operaciones
// específicas de cada solicitud.
// ********************************************************************

// ----------------------------------------------------------------
// BLOQUE 3.1: Validación de token activo y vigente
// ----------------------------------------------------------------
// Verifica si un token puede ser usado para aprobar una solicitud,
// considerando estado, fecha de expiración y límite de intentos.
adminChangeRequestSchema.methods.isTokenValid = function() {
    return this.status === 'pending' && 
           this.tokenExpires > new Date() && 
           this.verificationAttempts < 5;
};

// ----------------------------------------------------------------
// BLOQUE 3.2: Registro de intentos fallidos de verificación
// ----------------------------------------------------------------
// Incrementa el contador de intentos fallidos y actualiza la marca
// de tiempo. Si se superan 5 intentos, la solicitud se rechaza
// automáticamente por seguridad.
adminChangeRequestSchema.methods.incrementAttempts = function() {
    this.verificationAttempts += 1;
    this.lastVerificationAttempt = new Date();
    
    if (this.verificationAttempts >= 5) {
        this.status = 'rejected';
    }
    
    return this.save();
};

// ********************************************************************
// MÓDULO 4: MIDDLEWARE PRE/POST PARA AUTOMATIZACIÓN
// ********************************************************************
// Descripción: Funciones que se ejecutan automáticamente antes o después
// de operaciones de base de datos para mantener consistencia, realizar
// limpieza automática y registrar actividad.
// ********************************************************************

// ----------------------------------------------------------------
// BLOQUE 4.1: Validación automática de expiración antes de guardar
// ----------------------------------------------------------------
// Verifica si el token ha expirado cada vez que se guarda un documento
// y actualiza el estado a 'expired' si es necesario, manteniendo la
// base de datos consistente sin necesidad de jobs externos.
adminChangeRequestSchema.pre('save', function(next) {
    if (this.tokenExpires && this.tokenExpires < new Date() && this.status === 'pending') {
        this.status = 'expired';
        console.log(`🔄 Solicitud ${this._id} marcada como expirada automáticamente`);
    }
    next();
});

// ----------------------------------------------------------------
// BLOQUE 4.2: Registro de auditoría después de guardar
// ----------------------------------------------------------------
// Proporciona logging detallado después de cada operación de guardado
// para facilitar depuración y seguimiento de cambios en producción.
adminChangeRequestSchema.post('save', function(doc) {
    console.log(`📝 AdminChangeRequest guardado: ${doc._id}`);
    console.log(`   - Estado: ${doc.status}`);
    console.log(`   - Nuevo admin: ${doc.newAdminUser}`);
    console.log(`   - Contraseña almacenada: ${doc.newAdminPassword ? '✅ Sí' : '❌ No'}`);
    if (doc.newAdminPassword) {
        console.log(`   - Longitud hash: ${doc.newAdminPassword.length} caracteres`);
    }
});

// ********************************************************************
// MÓDULO 5: MÉTODOS ESTÁTICOS PARA CONSULTAS COMUNES
// ********************************************************************
// Descripción: Funciones a nivel de modelo que encapsulan consultas
// frecuentes para reutilización, consistencia y abstracción de la
// lógica de acceso a datos.
// ********************************************************************

// ----------------------------------------------------------------
// BLOQUE 5.1: Búsqueda de solicitudes activas por administrador
// ----------------------------------------------------------------
// Encuentra todas las solicitudes pendientes y vigentes asociadas a
// un administrador específico, ordenadas de más reciente a más antigua.
adminChangeRequestSchema.statics.findActiveByAdmin = function(adminId) {
    return this.find({
        currentAdminId: adminId,
        status: 'pending',
        tokenExpires: { $gt: new Date() }
    }).sort({ requestedAt: -1 });
};

// ----------------------------------------------------------------
// BLOQUE 5.2: Búsqueda de solicitud por token de verificación
// ----------------------------------------------------------------
// Encuentra una solicitud específica usando su token único, filtrando
// solo solicitudes pendientes (no aprobadas, rechazadas o expiradas).
adminChangeRequestSchema.statics.findByToken = function(token) {
    return this.findOne({
        verificationToken: token,
        status: 'pending'
    });
};

// ----------------------------------------------------------------
// BLOQUE 5.3: Limpieza masiva de solicitudes expiradas antiguas
// ----------------------------------------------------------------
// Actualiza solicitudes expiradas o pendientes vencidas hace más de
// 7 días, marcándolas como expiradas para mantenimiento del sistema.
adminChangeRequestSchema.statics.cleanupExpired = function() {
    const cutoffDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
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

// ********************************************************************
// MÓDULO 6: PROPIEDADES VIRTUALES PARA CONSULTA
// ********************************************************************
// Descripción: Propiedades calculadas dinámicamente que no se almacenan
// en la base de datos pero están disponibles en los documentos para
// facilitar el acceso a información derivada.
// ********************************************************************

// ----------------------------------------------------------------
// BLOQUE 6.1: Cálculo de horas restantes para expiración
// ----------------------------------------------------------------
// Calcula cuántas horas quedan hasta que el token expire, útil para
// mostrar cuenta regresiva en interfaces de usuario.
adminChangeRequestSchema.virtual('remainingHours').get(function() {
    if (!this.tokenExpires) return 0;
    const now = new Date();
    const diff = this.tokenExpires - now;
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60)));
});

// ----------------------------------------------------------------
// BLOQUE 6.2: Determinación de urgencia por tiempo restante
// ----------------------------------------------------------------
// Identifica solicitudes que requieren atención inmediata porque
// están a punto de expirar (menos de 2 horas restantes).
adminChangeRequestSchema.virtual('isUrgent').get(function() {
    return this.remainingHours <= 2 && this.status === 'pending';
});

// ********************************************************************
// MÓDULO 7: CREACIÓN Y EXPORTACIÓN DEL MODELO
// ********************************************************************
// Descripción: Instancia el modelo de Mongoose usando el esquema
// definido y lo exporta para su uso en controladores y servicios.
// ********************************************************************
const AdminChangeRequest = mongoose.model('AdminChangeRequest', adminChangeRequestSchema);

export default AdminChangeRequest;