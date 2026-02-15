// ============================================================================
// src/backend/models/AuditLog.js
// ============================================================================
// MODELO DE AUDITORÍA PARA REGISTRO DE ACTIVIDADES
// Registra todas las acciones importantes del sistema con IP, usuario y detalles
// ============================================================================

import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
    // Usuario que realizó la acción
    usuario: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    nombreUsuario: {
        type: String,
        required: true
    },
    correoUsuario: {
        type: String,
        required: true
    },
    
    // Acción realizada
    accion: {
        type: String,
        required: true,
        enum: [
            // Usuarios
            'CREAR_USUARIO',
            'VER_USUARIOS', 
            'ELIMINAR_PERMANENTE_USUARIO',
            'EDITAR_USUARIO',
            'ELIMINAR_USUARIO',
            'ACTIVAR_USUARIO',
            'DESACTIVAR_USUARIO',
            'CAMBIAR_ROL_USUARIO',
            'MODIFICAR_PERMISOS_USUARIO',
            
            // Roles
            'CREAR_ROL',
            'EDITAR_ROL',
            'ELIMINAR_ROL',
            
            // Autenticación
            'INICIO_SESION',
            'CIERRE_SESION',
            'INTENTO_FALLIDO',
            
            // Admin
            'CAMBIO_ADMIN_INICIADO',
            'CAMBIO_ADMIN_COMPLETADO',
            'CAMBIO_ADMIN_RECHAZADO'
        ]
    },
    
    // Detalles de la acción
    descripcion: {
        type: String,
        required: true
    },
    
    // Datos antes/después para cambios
    datosAnteriores: {
        type: mongoose.Schema.Types.Mixed
    },
    datosNuevos: {
        type: mongoose.Schema.Types.Mixed
    },
    
    // Metadatos
    ip: {
        type: String,
        required: true
    },
    userAgent: String,
    
    // Recurso afectado (opcional)
    recursoId: mongoose.Schema.Types.ObjectId,
    recursoTipo: {
        type: String,
        enum: ['User', 'Role', 'Document', 'Task', 'Person', 'Category', 'Department']
    },
    
    // Resultado
    resultado: {
        type: String,
        enum: ['exito', 'error', 'advertencia'],
        default: 'exito'
    },
    
    // Metadatos adicionales
    metadata: mongoose.Schema.Types.Mixed
    
}, {
    timestamps: true // createdAt = fecha del evento
});

// Índices para búsquedas rápidas
auditLogSchema.index({ usuario: 1, createdAt: -1 });
auditLogSchema.index({ accion: 1, createdAt: -1 });
auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ recursoId: 1, recursoTipo: 1 });

// Método estático para registrar acciones
auditLogSchema.statics.registrar = async function({
    usuario,
    accion,
    descripcion,
    ip = '0.0.0.0',
    userAgent = null,
    datosAnteriores = null,
    datosNuevos = null,
    recursoId = null,
    recursoTipo = null,
    resultado = 'exito',
    metadata = {}
}) {
    try {
        const log = new this({
            usuario: usuario._id || usuario,
            nombreUsuario: usuario.usuario || 'Sistema',
            correoUsuario: usuario.correo || 'sistema@cbtis051.edu.mx',
            accion,
            descripcion,
            ip,
            userAgent,
            datosAnteriores,
            datosNuevos,
            recursoId,
            recursoTipo,
            resultado,
            metadata
        });
        
        await log.save();
        
        // Mantener solo últimos 10000 registros para no saturar
        const count = await this.countDocuments();
        if (count > 10000) {
            const oldest = await this.findOne().sort({ createdAt: 1 });
            if (oldest) await oldest.deleteOne();
        }
        
        return log;
    } catch (error) {
        console.error('Error registrando auditoría:', error);
        // No lanzamos error para no interrumpir la operación principal
    }
};

// Método para obtener logs con filtros
auditLogSchema.statics.obtenerLogs = async function(filtros = {}) {
    const {
        usuario,
        accion,
        desde,
        hasta,
        limite = 100,
        pagina = 1
    } = filtros;
    
    const query = {};
    
    if (usuario) query.usuario = usuario;
    if (accion) query.accion = accion;
    if (desde || hasta) {
        query.createdAt = {};
        if (desde) query.createdAt.$gte = new Date(desde);
        if (hasta) query.createdAt.$lte = new Date(hasta);
    }
    
    const skip = (pagina - 1) * limite;
    
    const [logs, total] = await Promise.all([
        this.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limite)
            .populate('usuario', 'usuario correo'),
        this.countDocuments(query)
    ]);
    
    return {
        logs,
        total,
        pagina,
        totalPaginas: Math.ceil(total / limite)
    };
};

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

export default AuditLog;