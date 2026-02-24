import AuditLog from '../models/AuditLog.js';

/**
 * Middleware de auditoría universal
 * Captura información de la request y la pasa al controlador
 */
export const auditMiddleware = (req, res, next) => {
    // Agregar metadata de auditoría a la request
    req.audit = {
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.headers['user-agent'],
        timestamp: new Date().toISOString(),
        method: req.method,
        path: req.path,
        body: req.method !== 'GET' ? { ...req.body } : undefined
    };

    // Si hay archivos, registrar información básica (no el contenido)
    if (req.files || req.file) {
        req.audit.hasFiles = true;
        req.audit.fileCount = req.files ? req.files.length : 1;
        
        if (req.file) {
            req.audit.fileInfo = {
                originalname: req.file.originalname,
                size: req.file.size,
                mimetype: req.file.mimetype
            };
        } else if (req.files) {
            req.audit.filesInfo = req.files.map(f => ({
                originalname: f.originalname,
                size: f.size,
                mimetype: f.mimetype
            }));
        }
    }

    // Interceptar la respuesta para capturar el resultado
    const originalJson = res.json;
    res.json = function(data) {
        // Guardar el resultado para auditoría
        req.audit.responseStatus = res.statusCode;
        req.audit.responseSuccess = data?.success || false;
        
        // Si hay error, registrar el mensaje
        if (!data?.success && data?.message) {
            req.audit.errorMessage = data.message;
        }

        // Llamar al método original
        return originalJson.call(this, data);
    };

    next();
};

/**
 * Registrar acción de auditoría desde el controlador
 */
export const logAudit = async (req, actionData) => {
    try {
        if (!req.user) {
            console.warn('⚠️ Intento de auditoría sin usuario autenticado');
            return null;
        }

        const auditData = {
            userId: req.user._id,
            username: req.user.usuario,
            userRole: req.user.rol,
            userEmail: req.user.correo,
            ipAddress: req.audit?.ipAddress || req.ip,
            userAgent: req.audit?.userAgent || req.headers['user-agent'],
            ...actionData
        };

        return await AuditLog.log(auditData);
    } catch (error) {
        console.error('❌ Error en logAudit:', error);
        return null;
    }
};

/**
 * Auditoría específica para autenticación (sin req.user)
 */
export const logAuthAudit = async (data) => {
    try {
        return await AuditLog.log({
            userId: data.userId || null,
            username: data.username || 'Desconocido',
            userRole: data.userRole || 'visitante',
            userEmail: data.userEmail || '',
            ipAddress: data.ipAddress,
            userAgent: data.userAgent,
            ...data.actionData
        });
    } catch (error) {
        console.error('❌ Error en logAuthAudit:', error);
        return null;
    }
};

/**
 * Decorador para funciones de controlador que registra automáticamente la acción
 */
export const audit = (actionConfig) => {
    return (target, propertyKey, descriptor) => {
        const originalMethod = descriptor.value;

        descriptor.value = async function(req, res, ...args) {
            const startTime = Date.now();

            try {
                // Ejecutar el método original
                const result = await originalMethod.apply(this, [req, res, ...args]);

                // Registrar auditoría si fue exitosa
                if (req.user && !res.headersSent) {
                    const duration = Date.now() - startTime;
                    
                    await logAudit(req, {
                        action: actionConfig.action,
                        actionType: actionConfig.actionType,
                        actionCategory: actionConfig.actionCategory,
                        targetId: actionConfig.getTargetId ? actionConfig.getTargetId(req) : req.params.id,
                        targetModel: actionConfig.targetModel,
                        targetName: actionConfig.getTargetName ? actionConfig.getTargetName(req, result) : undefined,
                        description: actionConfig.getDescription(req, result),
                        severity: actionConfig.severity || 'INFO',
                        status: 'SUCCESS',
                        metadata: {
                            duration,
                            ...(actionConfig.metadata ? actionConfig.metadata(req, result) : {})
                        }
                    });
                }

                return result;
            } catch (error) {
                // Registrar error en auditoría
                if (req.user) {
                    const duration = Date.now() - startTime;
                    
                    await logAudit(req, {
                        action: actionConfig.action,
                        actionType: actionConfig.actionType,
                        actionCategory: actionConfig.actionCategory,
                        targetId: req.params.id,
                        targetModel: actionConfig.targetModel,
                        description: actionConfig.getErrorDescription 
                            ? actionConfig.getErrorDescription(req, error)
                            : `Error: ${error.message}`,
                        severity: 'ERROR',
                        status: 'FAILED',
                        metadata: {
                            duration,
                            errorMessage: error.message,
                            errorCode: error.code,
                            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
                        }
                    });
                }

                throw error;
            }
        };

        return descriptor;
    };
};