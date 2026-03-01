import AuditService from '../services/auditService.js';

/**
 * Middleware de auditoría universal
 * Captura información de la request y la pasa al controlador
 */
export const auditMiddleware = (req, res, next) => {
    // Agregar metadata de auditoría a la request
    req.audit = {
        ipAddress: req.ip || req.connection?.remoteAddress || '0.0.0.0',
        userAgent: req.headers['user-agent'] || 'Desconocido',
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
 * Decorador para funciones de controlador que registra automáticamente la acción
 * USO: @audit({ action: 'DOCUMENT_UPLOAD', targetModel: 'Document' })
 */
export const audit = (config) => {
    return (target, propertyKey, descriptor) => {
        const originalMethod = descriptor.value;

        descriptor.value = async function(req, res, ...args) {
            const startTime = Date.now();

            try {
                // Ejecutar el método original
                const result = await originalMethod.apply(this, [req, res, ...args]);

                // Registrar auditoría si fue exitosa y hay usuario
                if (req.user && !res.headersSent) {
                    const duration = Date.now() - startTime;
                    
                    // Determinar targetName si hay función para obtenerlo
                    let targetName = config.targetName;
                    if (config.getTargetName && result) {
                        targetName = config.getTargetName(result);
                    } else if (result?.document?.nombre_original) {
                        targetName = result.document.nombre_original;
                    } else if (result?.person?.nombre) {
                        targetName = result.person.nombre;
                    }

                    await AuditService.log(req, {
                        action: config.action,
                        actionType: config.actionType,
                        actionCategory: config.actionCategory,
                        targetId: config.targetId || req.params.id,
                        targetModel: config.targetModel,
                        targetName,
                        description: config.getDescription 
                            ? config.getDescription(req, result)
                            : `Acción ${config.action} realizada`,
                        severity: config.severity || 'INFO',
                        status: 'SUCCESS',
                        metadata: {
                            duration,
                            ...(config.metadata ? config.metadata(req, result) : {})
                        }
                    });
                }

                return result;
            } catch (error) {
                // Registrar error en auditoría
                if (req.user) {
                    const duration = Date.now() - startTime;
                    
                    await AuditService.log(req, {
                        action: config.action,
                        actionType: config.actionType,
                        actionCategory: config.actionCategory,
                        targetId: req.params.id,
                        targetModel: config.targetModel,
                        description: config.getErrorDescription 
                            ? config.getErrorDescription(req, error)
                            : `Error en ${config.action}: ${error.message}`,
                        severity: 'ERROR',
                        status: 'FAILED',
                        metadata: {
                            duration,
                            errorMessage: error.message,
                            errorCode: error.code
                        }
                    });
                }

                throw error;
            }
        };

        return descriptor;
    };
};

// Exportar también el servicio directamente para facilitar su uso
export { AuditService };