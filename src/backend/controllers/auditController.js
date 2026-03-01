import User from '../models/User.js';
import mongoose from 'mongoose';
import AuditLog from '../models/AuditLog.js';
import AuditService from '../services/auditService.js';

/**
 * Controlador para el módulo de Auditoría
 * Proporciona endpoints para consultar y gestionar logs de auditoría
 */
class AuditController {
    // =========================================================================
    // OBTENER LOGS CON FILTROS
    // =========================================================================
    static async getLogs(req, res) {
        try {
            const {
                page = 1,
                limit = 50,
                username,
                action,
                actionCategory,
                severity,
                status,
                targetModel,
                startDate,
                endDate,
                search
            } = req.query;

            console.log('\n🔍 ========== CONSULTANDO LOGS DE AUDITORÍA ==========');
            console.log('📋 Filtros aplicados:', {
                page, limit, username, action, actionCategory, severity, status, targetModel, startDate, endDate, search
            });

            const filters = {
                username,
                action,
                actionCategory,
                severity,
                status,
                targetModel,
                startDate,
                endDate,
                search
            };

            // Limpiar filtros undefined
            Object.keys(filters).forEach(key => 
                filters[key] === undefined && delete filters[key]
            );

            const result = await AuditLog.getFilteredLogs(
                filters,
                parseInt(page),
                parseInt(limit)
            );

            console.log(`✅ Logs encontrados: ${result.logs.length} de ${result.total}`);
            
            // Registrar consulta en auditoría (solo para administradores)
            if (req.user?.rol === 'administrador') {
                await AuditService.logAuditView(req, filters).catch(err => 
                    console.error('❌ Error registrando AUDIT_VIEW:', err.message)
                );
            }

            res.json({
                success: true,
                ...result
            });
        } catch (error) {
            console.error('❌ Error obteniendo logs:', error);
            res.status(500).json({
                success: false,
                message: 'Error al obtener logs de auditoría',
                error: error.message
            });
        }
    }

    // =========================================================================
    // OBTENER LOG POR ID
    // =========================================================================
    static async getLogById(req, res) {
        try {
            const { id } = req.params;

            const log = await AuditLog.findById(id)
                .populate('userId', 'usuario correo rol')
                .lean();

            if (!log) {
                return res.status(404).json({
                    success: false,
                    message: 'Log no encontrado'
                });
            }

            // Verificar permisos (solo admin o propio usuario)
            if (req.user.rol !== 'administrador' && log.userId?._id?.toString() !== req.user._id?.toString()) {
                return res.status(403).json({
                    success: false,
                    message: 'No tienes permisos para ver este log'
                });
            }

            res.json({
                success: true,
                log
            });
        } catch (error) {
            console.error('❌ Error obteniendo log:', error);
            res.status(500).json({
                success: false,
                message: 'Error al obtener log',
                error: error.message
            });
        }
    }

    // =========================================================================
    // OBTENER ESTADÍSTICAS
    // =========================================================================
    static async getStats(req, res) {
        try {
            const { days = 30 } = req.query;

            const stats = await AuditLog.getStats(parseInt(days));

            res.json({
                success: true,
                days: parseInt(days),
                ...stats
            });
        } catch (error) {
            console.error('❌ Error obteniendo estadísticas:', error);
            res.status(500).json({
                success: false,
                message: 'Error al obtener estadísticas',
                error: error.message
            });
        }
    }

    // =========================================================================
    // EXPORTAR LOGS (CSV/JSON)
    // =========================================================================
    static async exportLogs(req, res) {
        try {
            const { format = 'json', ...filters } = req.query;
            const { startDate, endDate, actionCategory, severity } = filters;

            // Construir query
            const query = {};
            if (startDate || endDate) {
                query.createdAt = {};
                if (startDate) query.createdAt.$gte = new Date(startDate);
                if (endDate) query.createdAt.$lte = new Date(endDate);
            }
            if (actionCategory) query.actionCategory = actionCategory;
            if (severity) query.severity = severity;

            // Límite razonable para exportación
            const logs = await AuditLog.find(query)
                .sort({ createdAt: -1 })
                .limit(10000)
                .populate('userId', 'usuario correo rol')
                .lean();

            console.log(`📤 Exportando ${logs.length} logs en formato ${format}`);

            // Registrar exportación
            await AuditService.logAuditExport(req, format, logs.length, filters);

            if (format === 'csv') {
                // Generar CSV
                const headers = ['Fecha', 'Usuario', 'Rol', 'Acción', 'Categoría', 'Descripción', 'Severidad', 'IP'];
                const csvRows = [headers.join(',')];

                logs.forEach(log => {
                    const row = [
                        new Date(log.createdAt).toLocaleString('es-MX'),
                        `"${log.username}"`,
                        `"${log.userRole}"`,
                        `"${log.action}"`,
                        `"${log.actionCategory}"`,
                        `"${log.description.replace(/"/g, '""')}"`,
                        log.severity,
                        log.metadata?.ipAddress || ''
                    ];
                    csvRows.push(row.join(','));
                });

                res.setHeader('Content-Type', 'text/csv');
                res.setHeader('Content-Disposition', `attachment; filename=audit-logs-${Date.now()}.csv`);
                res.send(csvRows.join('\n'));
            } else {
                // JSON
                res.setHeader('Content-Type', 'application/json');
                res.setHeader('Content-Disposition', `attachment; filename=audit-logs-${Date.now()}.json`);
                res.send(JSON.stringify(logs, null, 2));
            }
        } catch (error) {
            console.error('❌ Error exportando logs:', error);
            res.status(500).json({
                success: false,
                message: 'Error al exportar logs',
                error: error.message
            });
        }
    }

    // =========================================================================
    // LIMPIAR LOGS ANTIGUOS (SOLO ADMIN)
    // =========================================================================
    static async cleanupLogs(req, res) {
        try {
            const { daysToKeep = 90 } = req.body;

            if (daysToKeep < 30) {
                return res.status(400).json({
                    success: false,
                    message: 'El mínimo de días a mantener es 30'
                });
            }

            const result = await AuditLog.cleanupOldLogs(daysToKeep);

            // Registrar limpieza
            await AuditService.logAuditCleanup(req, result.deletedCount, daysToKeep);

            res.json({
                success: true,
                message: `Se eliminaron ${result.deletedCount} logs antiguos`,
                deletedCount: result.deletedCount
            });
        } catch (error) {
            console.error('❌ Error limpiando logs:', error);
            res.status(500).json({
                success: false,
                message: 'Error al limpiar logs',
                error: error.message
            });
        }
    }

    // =========================================================================
    // OBTENER ACCIONES DISPONIBLES PARA FILTROS
    // =========================================================================
    static async getActions(req, res) {
        try {
            const actions = await AuditLog.distinct('action');
            const categories = await AuditLog.distinct('actionCategory');
            const severities = await AuditLog.distinct('severity');

            res.json({
                success: true,
                actions: actions.sort(),
                categories: categories.sort(),
                severities: severities.sort()
            });
        } catch (error) {
            console.error('❌ Error obteniendo acciones:', error);
            res.status(500).json({
                success: false,
                message: 'Error al obtener acciones',
                error: error.message
            });
        }
    }

// =============================================================================
// RECIBIR LOGS DEL FRONTEND (AUTH) - VERSIÓN CORREGIDA
// =============================================================================
static async frontendLog(req, res) {
    try {
        const { eventType, timestamp, usuario, correo, motivo } = req.body;
        
        console.log('\n📱 ===== LOG DESDE FRONTEND =====');
        console.log(`🔹 Evento: ${eventType}`);
        console.log(`👤 Usuario: ${usuario || correo || 'anónimo'}`);
        console.log(`📋 Motivo: ${motivo || 'N/A'}`);

        // Validar datos mínimos
        if (!eventType) {
            return res.status(400).json({ 
                success: false, 
                error: 'eventType es requerido' 
            });
        }

        // Mapear eventType a acción de auditoría con descripciones AMIGABLES
        let action = '';
        let severity = 'INFO';
        let status = 'SUCCESS';
        let friendlyDescription = '';
        
        switch(eventType) {
            case 'login_attempt':
                action = 'FRONTEND_LOGIN_ATTEMPT';
                severity = 'INFO';
                status = 'PENDING';
                friendlyDescription = 'Intento de acceso al sistema';
                break;
            case 'login_success':
                action = 'FRONTEND_LOGIN_SUCCESS';
                severity = 'INFO';
                status = 'SUCCESS';
                friendlyDescription = 'Acceso al sistema';  // ← Cambiado
                break;
            case 'login_failed':
                action = 'FRONTEND_LOGIN_FAILED';
                severity = 'WARNING';
                status = 'FAILED';
                friendlyDescription = 'Intento fallido de acceso';
                break;
            case 'register_attempt':
                action = 'FRONTEND_REGISTER_ATTEMPT';
                severity = 'INFO';
                status = 'PENDING';
                friendlyDescription = 'Intento de registro';
                break;
            case 'register_success':
                action = 'FRONTEND_REGISTER_SUCCESS';
                severity = 'INFO';
                status = 'SUCCESS';
                friendlyDescription = 'Registro de nuevo usuario';
                break;
            case 'register_failed':
                action = 'FRONTEND_REGISTER_FAILED';
                severity = 'WARNING';
                status = 'FAILED';
                friendlyDescription = 'Registro fallido';
                break;
            case 'test':
                action = 'FRONTEND_TEST';
                severity = 'INFO';
                status = 'SUCCESS';
                friendlyDescription = 'Prueba de auditoría';
                break;
            default:
                action = 'FRONTEND_' + (eventType || 'UNKNOWN').toUpperCase();
                friendlyDescription = `Evento: ${eventType}`;
        }

        // Buscar usuario si existe
        let userId = null;
        let username = usuario || correo || 'visitante';
        let userRole = 'visitante';
        let userEmail = correo || '';

        // Solo buscar usuario si tenemos identificador
        if (usuario || correo) {
            try {
                const User = (await import('../models/User.js')).default;
                const user = await User.findOne({ 
                    $or: [
                        { usuario: usuario },
                        { correo: correo }
                    ]
                }).select('_id usuario rol correo').lean();
                
                if (user) {
                    userId = user._id;
                    username = user.usuario;
                    userRole = user.rol;
                    userEmail = user.correo;
                }
            } catch (userError) {
                console.warn('⚠️ No se pudo buscar usuario:', userError.message);
            }
        }

        // Crear descripción AMIGABLE
        let description = '';
        if (eventType === 'login_success') {
            description = `El usuario ${username} accedió al sistema`;  // ← Formato específico
        } else if (eventType === 'login_attempt') {
            description = `Intento de acceso - Usuario: ${username}`;
        } else if (eventType === 'login_failed') {
            description = `Intento fallido de acceso - Usuario: ${username} - Motivo: ${motivo || 'Credenciales incorrectas'}`;
        } else if (eventType === 'register_success') {
            description = `Nuevo usuario registrado: ${username}`;
        } else {
            description = `${friendlyDescription} - Usuario: ${username}`;
            if (motivo) description += ` - Motivo: ${motivo}`;
        }

        // Crear objeto de auditoría
        const auditData = {
            userId: userId || new mongoose.Types.ObjectId(),
            username: username,
            userRole: userRole,
            userEmail: userEmail,
            action: action,
            actionType: 'EVENT',
            actionCategory: 'AUTH',
            targetId: userId,
            targetModel: userId ? 'User' : null,
            targetName: username,
            description: description,  // ← Usamos la descripción amigable
            severity: severity,
            status: status,
            metadata: {
                eventType,
                usuario: usuario || null,
                correo: correo || null,
                motivo: motivo || null,
                frontendTimestamp: timestamp,
                ipAddress: req.ip || req.connection?.remoteAddress || '0.0.0.0',
                userAgent: req.headers['user-agent'] || 'Desconocido'
            }
        };

        // Guardar en auditoría
        const AuditLog = (await import('../models/AuditLog.js')).default;
        const auditLog = new AuditLog(auditData);
        await auditLog.save();
        
        console.log(`✅ Log guardado ID: ${auditLog._id}`);
        console.log(`📝 Descripción: ${description}`);
        console.log('📱 ============================\n');
        
        res.json({ success: true, id: auditLog._id });
        
    } catch (error) {
        console.error('❌ Error en frontendLog:', error);
        console.error('📌 Stack:', error.stack);
        
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
}

}

export default AuditController;