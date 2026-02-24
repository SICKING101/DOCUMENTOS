import AuditLog from '../models/AuditLog.js';
import { logAudit } from '../middleware/auditMiddleware.js';

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
                userId,
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

            const filters = {
                userId,
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

            // Registrar consulta en auditoría (solo para administradores)
            if (req.user.rol === 'administrador') {
                await logAudit(req, {
                    action: 'AUDIT_VIEW',
                    actionType: 'READ',
                    actionCategory: 'SYSTEM',
                    description: `Consultó logs de auditoría (página ${page})`,
                    metadata: { filters }
                });
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

            // Registrar exportación
            await logAudit(req, {
                action: 'AUDIT_EXPORT',
                actionType: 'EXPORT',
                actionCategory: 'SYSTEM',
                description: `Exportó ${logs.length} logs en formato ${format}`,
                metadata: { format, count: logs.length, filters }
            });

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
            await logAudit(req, {
                action: 'AUDIT_CLEANUP',
                actionType: 'DELETE',
                actionCategory: 'SYSTEM',
                description: `Limpió logs anteriores a ${daysToKeep} días`,
                metadata: { daysToKeep, deletedCount: result.deletedCount }
            });

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
}

export default AuditController;