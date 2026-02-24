import mongoose from 'mongoose';

/**
 * Modelo de Auditoría para registrar todas las acciones críticas del sistema
 * Almacena información detallada de cada operación para fines de seguridad y trazabilidad
 */
const auditLogSchema = new mongoose.Schema({
    // =========================================================================
    // INFORMACIÓN DEL USUARIO
    // =========================================================================
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    username: {
        type: String,
        required: true,
        trim: true,
        index: true
    },
    userRole: {
        type: String,
        required: true,
        enum: [
            'administrador', 
            'gerente', 
            'supervisor', 
            'editor', 
            'revisor', 
            'lector', 
            'moderador', 
            'desactivado', 
            'usuario'
        ],
        index: true
    },
    userEmail: {
        type: String,
        required: true,
        lowercase: true,
        trim: true
    },

    // =========================================================================
    // ACCIÓN REALIZADA
    // =========================================================================
    action: {
        type: String,
        required: true,
        enum: [
            // Autenticación
            'LOGIN_SUCCESS', 'LOGIN_FAILED', 'LOGOUT', 'PASSWORD_CHANGE', 'PASSWORD_RESET_REQUEST',
            
            // Documentos
            'DOCUMENT_UPLOAD', 'DOCUMENT_UPDATE', 'DOCUMENT_DELETE', 'DOCUMENT_RESTORE',
            'DOCUMENT_APPROVE', 'DOCUMENT_REJECT', 'DOCUMENT_DOWNLOAD', 'DOCUMENT_VIEW',
            'DOCUMENT_BULK_DELETE', 'DOCUMENT_BULK_RESTORE',
            
            // Usuarios y Roles
            'USER_CREATE', 'USER_UPDATE', 'USER_DELETE', 'USER_DEACTIVATE', 'USER_REACTIVATE',
            'ROLE_CHANGE', 'PERMISSION_CHANGE',
            
            // Administración
            'ADMIN_CHANGE_REQUEST', 'ADMIN_CHANGE_CONFIRM', 'ADMIN_CHANGE_REJECT',
            
            // Categorías y Departamentos
            'CATEGORY_CREATE', 'CATEGORY_UPDATE', 'CATEGORY_DELETE',
            'DEPARTMENT_CREATE', 'DEPARTMENT_UPDATE', 'DEPARTMENT_DELETE',
            
            // Personas
            'PERSON_CREATE', 'PERSON_UPDATE', 'PERSON_DELETE',
            
            // Tareas
            'TASK_CREATE', 'TASK_UPDATE', 'TASK_DELETE', 'TASK_COMPLETE',
            
            // Sistema
            'SYSTEM_CONFIG_CHANGE', 'SYSTEM_ERROR', 'EXPORT_DATA', 'IMPORT_DATA'
        ],
        index: true
    },
    
    actionType: {
        type: String,
        enum: ['CREATE', 'READ', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'DOWNLOAD', 'VIEW', 'EXPORT', 'CONFIG'],
        required: true,
        index: true
    },

    actionCategory: {
        type: String,
        enum: ['AUTH', 'DOCUMENTS', 'USERS', 'ADMIN', 'CATEGORIES', 'DEPARTMENTS', 'PERSONS', 'TASKS', 'SYSTEM'],
        required: true,
        index: true
    },

    // =========================================================================
    // ENTIDAD AFECTADA
    // =========================================================================
    targetId: {
        type: mongoose.Schema.Types.ObjectId,
        refPath: 'targetModel',
        index: true
    },
    
    targetModel: {
        type: String,
        enum: ['User', 'Document', 'Category', 'Department', 'Person', 'Task', 'AdminChangeRequest', 'Notification'],
        index: true
    },

    targetName: {
        type: String,
        trim: true,
        index: true
    },

    // =========================================================================
    // DETALLES DE LA ACCIÓN
    // =========================================================================
    description: {
        type: String,
        required: true,
        trim: true
    },

    // Cambios antes/después para acciones UPDATE
    changes: {
        before: mongoose.Schema.Types.Mixed,
        after: mongoose.Schema.Types.Mixed
    },

    // Metadatos adicionales específicos de la acción
    metadata: {
        ipAddress: String,
        userAgent: String,
        timestamp: { type: Date, default: Date.now },
        
        // Documentos
        fileSize: Number,
        fileType: String,
        fileName: String,
        fileUrl: String,
        
        // Usuarios
        targetUserRole: String,
        targetUserEmail: String,
        
        // Errores
        errorCode: String,
        errorMessage: String,
        
        // Bulk operations
        bulkCount: Number,
        bulkIds: [mongoose.Schema.Types.ObjectId],
        
        // Valores personalizados
        customData: mongoose.Schema.Types.Mixed
    },

    // =========================================================================
    // SEVERIDAD Y ESTADO
    // =========================================================================
    severity: {
        type: String,
        enum: ['INFO', 'WARNING', 'ERROR', 'CRITICAL'],
        default: 'INFO',
        index: true
    },

    status: {
        type: String,
        enum: ['SUCCESS', 'FAILED', 'PENDING'],
        default: 'SUCCESS',
        index: true
    },

    // =========================================================================
    // TIMESTAMPS
    // =========================================================================
    createdAt: {
        type: Date,
        default: Date.now,
        index: true
    },

    expiresAt: {
        type: Date,
        default: () => new Date(+new Date() + 90*24*60*60*1000) // 90 días por defecto
    }
}, {
    timestamps: true,
    collection: 'audit_logs'
});

// =============================================================================
// ÍNDICES PARA OPTIMIZACIÓN DE CONSULTAS
// =============================================================================

// Índices compuestos para búsquedas comunes
auditLogSchema.index({ createdAt: -1, actionCategory: 1 });
auditLogSchema.index({ userId: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ severity: 1, createdAt: -1 });
auditLogSchema.index({ targetId: 1, targetModel: 1 });

// Índice TTL para expiración automática (90 días)
auditLogSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// =============================================================================
// MÉTODOS ESTÁTICOS
// =============================================================================

/**
 * Registrar un evento de auditoría
 */
auditLogSchema.statics.log = async function(data) {
    try {
        const logEntry = new this({
            userId: data.userId,
            username: data.username,
            userRole: data.userRole,
            userEmail: data.userEmail,
            action: data.action,
            actionType: data.actionType,
            actionCategory: data.actionCategory,
            targetId: data.targetId,
            targetModel: data.targetModel,
            targetName: data.targetName,
            description: data.description,
            changes: data.changes,
            metadata: {
                ipAddress: data.ipAddress,
                userAgent: data.userAgent,
                ...data.metadata
            },
            severity: data.severity || 'INFO',
            status: data.status || 'SUCCESS'
        });

        await logEntry.save();
        return logEntry;
    } catch (error) {
        console.error('❌ Error registrando auditoría:', error);
        // No lanzar error para no interrumpir el flujo principal
        return null;
    }
};

/**
 * Obtener logs con filtros y paginación
 */
auditLogSchema.statics.getFilteredLogs = async function(filters = {}, page = 1, limit = 50) {
    const query = {};
    
    // Aplicar filtros
    if (filters.userId) query.userId = filters.userId;
    if (filters.username) query.username = new RegExp(filters.username, 'i');
    if (filters.action) query.action = filters.action;
    if (filters.actionCategory) query.actionCategory = filters.actionCategory;
    if (filters.severity) query.severity = filters.severity;
    if (filters.status) query.status = filters.status;
    if (filters.targetModel) query.targetModel = filters.targetModel;
    
    // Rango de fechas
    if (filters.startDate || filters.endDate) {
        query.createdAt = {};
        if (filters.startDate) query.createdAt.$gte = new Date(filters.startDate);
        if (filters.endDate) query.createdAt.$lte = new Date(filters.endDate);
    }
    
    // Búsqueda por texto en descripción
    if (filters.search) {
        query.$or = [
            { description: new RegExp(filters.search, 'i') },
            { targetName: new RegExp(filters.search, 'i') },
            { username: new RegExp(filters.search, 'i') }
        ];
    }

    const skip = (page - 1) * limit;
    
    const [logs, total] = await Promise.all([
        this.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate('userId', 'usuario correo rol')
            .lean(),
        this.countDocuments(query)
    ]);

    return { logs, total, page, limit, pages: Math.ceil(total / limit) };
};

/**
 * Obtener estadísticas de auditoría
 */
auditLogSchema.statics.getStats = async function(days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const stats = await this.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        {
            $facet: {
                byAction: [
                    { $group: { _id: '$action', count: { $sum: 1 } } },
                    { $sort: { count: -1 } },
                    { $limit: 20 }
                ],
                byCategory: [
                    { $group: { _id: '$actionCategory', count: { $sum: 1 } } },
                    { $sort: { count: -1 } }
                ],
                bySeverity: [
                    { $group: { _id: '$severity', count: { $sum: 1 } } }
                ],
                byUser: [
                    { $group: { _id: '$username', count: { $sum: 1 } } },
                    { $sort: { count: -1 } },
                    { $limit: 10 }
                ],
                dailyActivity: [
                    {
                        $group: {
                            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                            count: { $sum: 1 }
                        }
                    },
                    { $sort: { _id: 1 } },
                    { $limit: 30 }
                ],
                total: [
                    { $count: 'count' }
                ]
            }
        }
    ]);

    return stats[0] || {
        byAction: [],
        byCategory: [],
        bySeverity: [],
        byUser: [],
        dailyActivity: [],
        total: [{ count: 0 }]
    };
};

/**
 * Limpiar logs antiguos manualmente
 */
auditLogSchema.statics.cleanupOldLogs = async function(daysToKeep = 90) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await this.deleteMany({
        createdAt: { $lt: cutoffDate }
    });

    console.log(`🧹 Limpiados ${result.deletedCount} logs de auditoría anteriores a ${cutoffDate.toISOString()}`);
    return result;
};

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

export default AuditLog;