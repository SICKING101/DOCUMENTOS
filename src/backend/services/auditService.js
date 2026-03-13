import mongoose from 'mongoose';
import AuditLog from '../models/AuditLog.js';

/**
 * Servicio de Auditoría - Centraliza toda la lógica de registro de auditoría
 * Este servicio debe ser usado por todos los controladores que necesiten auditar acciones
 */
class AuditService {
    // =========================================================================
    // CONFIGURACIÓN DE ACCIONES
    // =========================================================================
    
    static ACTION_CONFIG = {
        // Autenticación
        LOGIN_SUCCESS: { type: 'LOGIN', category: 'AUTH', severity: 'INFO' },
        LOGIN_FAILED: { type: 'LOGIN', category: 'AUTH', severity: 'WARNING' },
        LOGOUT: { type: 'LOGOUT', category: 'AUTH', severity: 'INFO' },
        PASSWORD_CHANGE: { type: 'UPDATE', category: 'AUTH', severity: 'WARNING' },
        
        // Documentos
        DOCUMENT_UPLOAD: { type: 'CREATE', category: 'DOCUMENTS', severity: 'INFO' },
        DOCUMENT_UPDATE: { type: 'UPDATE', category: 'DOCUMENTS', severity: 'INFO' },
        DOCUMENT_DELETE: { type: 'DELETE', category: 'DOCUMENTS', severity: 'WARNING' },
        DOCUMENT_RESTORE: { type: 'UPDATE', category: 'DOCUMENTS', severity: 'INFO' },
        DOCUMENT_APPROVE: { type: 'APPROVE', category: 'DOCUMENTS', severity: 'INFO' },
        DOCUMENT_REJECT: { type: 'REJECT', category: 'DOCUMENTS', severity: 'WARNING' },
        DOCUMENT_DOWNLOAD: { type: 'DOWNLOAD', category: 'DOCUMENTS', severity: 'INFO' },
        DOCUMENT_VIEW: { type: 'VIEW', category: 'DOCUMENTS', severity: 'INFO' },
        
        // Personas
        PERSON_CREATE: { type: 'CREATE', category: 'PERSONS', severity: 'INFO' },
        PERSON_UPDATE: { type: 'UPDATE', category: 'PERSONS', severity: 'INFO' },
        PERSON_DELETE: { type: 'DELETE', category: 'PERSONS', severity: 'WARNING' },
        PERSON_DEACTIVATE: { type: 'UPDATE', category: 'PERSONS', severity: 'WARNING' },
        PERSON_REACTIVATE: { type: 'UPDATE', category: 'PERSONS', severity: 'INFO' },
        
        // Papelera
        TRASH_VIEW: { type: 'VIEW', category: 'TRASH', severity: 'INFO' },
        TRASH_EMPTY: { type: 'DELETE', category: 'TRASH', severity: 'CRITICAL' },
        TRASH_AUTO_CLEANUP: { type: 'DELETE', category: 'TRASH', severity: 'INFO' },
        
        // Soporte
        SUPPORT_TICKET_CREATE: { type: 'CREATE', category: 'SUPPORT', severity: 'INFO' },
        
        // Auditoría
        AUDIT_VIEW: { type: 'VIEW', category: 'AUDIT', severity: 'INFO' },
        AUDIT_EXPORT: { type: 'EXPORT', category: 'AUDIT', severity: 'INFO' },
        AUDIT_CLEANUP: { type: 'DELETE', category: 'AUDIT', severity: 'WARNING' }
    };

    // =========================================================================
    // MÉTODO PRINCIPAL DE REGISTRO
    // =========================================================================
    
    /**
     * Registrar una acción de auditoría
     * @param {Object} req - Objeto de request (opcional, para extraer IP/UserAgent)
     * @param {Object} data - Datos de la acción
     */
    static async log(req, data) {
        try {
            // Validar datos mínimos
            if (!data.action || !data.description) {
                console.error('❌ Auditoría: Faltan datos requeridos (action, description)');
                return null;
            }

            // Obtener configuración de la acción
            const actionConfig = this.ACTION_CONFIG[data.action] || {
                type: 'READ',
                category: 'SYSTEM',
                severity: 'INFO'
            };

            // Preparar metadata
            const metadata = {
                ...data.metadata,
                ipAddress: req?.ip || req?.connection?.remoteAddress || data.ipAddress || '0.0.0.0',
                userAgent: req?.headers?.['user-agent'] || data.userAgent || 'Desconocido',
                timestamp: new Date().toISOString()
            };

            // Preparar datos de auditoría
            const auditData = {
                // Usuario
                userId: data.userId || req?.user?._id,
                username: data.username || req?.user?.usuario || 'sistema',
                userRole: data.userRole || req?.user?.rol || 'sistema',
                userEmail: data.userEmail || req?.user?.correo || 'sistema@local',
                
                // Acción
                action: data.action,
                actionType: data.actionType || actionConfig.type,
                actionCategory: data.actionCategory || actionConfig.category,
                
                // Entidad afectada
                targetId: data.targetId,
                targetModel: data.targetModel,
                targetName: data.targetName,
                
                // Detalles
                description: data.description,
                changes: data.changes,
                
                // Metadata
                metadata,
                
                // Severidad y estado
                severity: data.severity || actionConfig.severity || 'INFO',
                status: data.status || 'SUCCESS'
            };

            // Validar que tenemos userId
            if (!auditData.userId) {
                console.warn('⚠️ Auditoría sin userId, usando ID por defecto');
                auditData.userId = new mongoose.Types.ObjectId();
            }

            // Registrar
            return await AuditLog.log(auditData);

        } catch (error) {
            console.error('❌ Error en AuditService.log:', error);
            return null;
        }
    }

    // =========================================================================
    // MÉTODOS ESPECÍFICOS PARA CADA MÓDULO
    // =========================================================================
    
    // -------------------------------------------------------------------------
    // DOCUMENTOS
    // -------------------------------------------------------------------------
    
    static async logDocumentUpload(req, document, personaData = null) {
        return this.log(req, {
            action: 'DOCUMENT_UPLOAD',
            targetId: document._id,
            targetModel: 'Document',
            targetName: document.nombre_original,
            description: `Documento subido: ${document.nombre_original} (${(document.tamano_archivo / 1024).toFixed(2)} KB)`,
            metadata: {
                fileName: document.nombre_original,
                fileType: document.tipo_archivo,
                fileSize: document.tamano_archivo,
                categoria: document.categoria,
                personaId: document.persona_id?.toString(),
                personaNombre: personaData?.nombre,
                cloudinaryUrl: document.cloudinary_url,
                publicId: document.public_id,
                status: document.status
            }
        });
    }

    static async logDocumentUpdate(req, document, beforeState, afterState, camposModificados) {
        return this.log(req, {
            action: 'DOCUMENT_UPDATE',
            targetId: document._id,
            targetModel: 'Document',
            targetName: document.nombre_original,
            description: `Documento actualizado: ${document.nombre_original} - Campos: ${camposModificados.join(', ')}`,
            changes: { before: beforeState, after: afterState },
            metadata: {
                camposModificados,
                archivoReemplazado: camposModificados.includes('archivo')
            }
        });
    }

    static async logDocumentDelete(req, document, softDelete = true) {
        return this.log(req, {
            action: 'DOCUMENT_DELETE',
            targetId: document._id,
            targetModel: 'Document',
            targetName: document.nombre_original,
            description: `Documento eliminado${softDelete ? ' (movido a papelera)' : ' permanentemente'}: ${document.nombre_original}`,
            severity: 'WARNING',
            metadata: {
                fileName: document.nombre_original,
                fileType: document.tipo_archivo,
                fileSize: document.tamano_archivo,
                categoria: document.categoria,
                softDelete,
                deletedAt: document.deletedAt,
                deletedBy: document.deletedBy
            }
        });
    }

    static async logDocumentRestore(req, document, beforeState, afterState) {
        return this.log(req, {
            action: 'DOCUMENT_RESTORE',
            targetId: document._id,
            targetModel: 'Document',
            targetName: document.nombre_original,
            description: `Documento restaurado desde papelera: ${document.nombre_original}`,
            changes: { before: beforeState, after: afterState },
            metadata: {
                fileName: document.nombre_original,
                fileType: document.tipo_archivo,
                categoria: document.categoria
            }
        });
    }

    static async logDocumentApprove(req, document, comment = '') {
        return this.log(req, {
            action: 'DOCUMENT_APPROVE',
            targetId: document._id,
            targetModel: 'Document',
            targetName: document.nombre_original,
            description: `Documento aprobado: ${document.nombre_original}`,
            metadata: { comment }
        });
    }

    static async logDocumentReject(req, document, comment = '') {
        return this.log(req, {
            action: 'DOCUMENT_REJECT',
            targetId: document._id,
            targetModel: 'Document',
            targetName: document.nombre_original,
            description: `Documento rechazado: ${document.nombre_original} - Motivo: ${comment || 'No especificado'}`,
            severity: 'WARNING',
            metadata: { comment }
        });
    }

    static async logDocumentDownload(req, document) {
        return this.log(req, {
            action: 'DOCUMENT_DOWNLOAD',
            targetId: document._id,
            targetModel: 'Document',
            targetName: document.nombre_original,
            description: `Documento descargado: ${document.nombre_original}`,
            metadata: {
                fileName: document.nombre_original,
                fileType: document.tipo_archivo,
                fileSize: document.tamano_archivo
            }
        });
    }

    // -------------------------------------------------------------------------
    // PERSONAS
    // -------------------------------------------------------------------------
    
    static async logPersonCreate(req, person) {
        return this.log(req, {
            action: 'PERSON_CREATE',
            targetId: person._id,
            targetModel: 'Person',
            targetName: person.nombre,
            description: `Persona creada: ${person.nombre} (${person.email})`,
            metadata: {
                email: person.email,
                telefono: person.telefono,
                departamento: person.departamento,
                puesto: person.puesto
            }
        });
    }

    static async logPersonUpdate(req, person, beforeState, afterState, camposModificados) {
        return this.log(req, {
            action: 'PERSON_UPDATE',
            targetId: person._id,
            targetModel: 'Person',
            targetName: person.nombre,
            description: `Persona actualizada: ${person.nombre} - Campos: ${camposModificados.join(', ')}`,
            changes: { before: beforeState, after: afterState },
            metadata: { camposModificados }
        });
    }

    static async logPersonDelete(req, person, tieneDocumentos = false) {
        return this.log(req, {
            action: 'PERSON_DELETE',
            targetId: person._id,
            targetModel: 'Person',
            targetName: person.nombre,
            description: `Persona eliminada permanentemente: ${person.nombre} (${person.email})`,
            severity: 'WARNING',
            metadata: {
                email: person.email,
                tieneDocumentos,
                personaEliminada: {
                    nombre: person.nombre,
                    email: person.email,
                    telefono: person.telefono,
                    departamento: person.departamento,
                    puesto: person.puesto
                }
            }
        });
    }

    static async logPersonDeactivate(req, person) {
        return this.log(req, {
            action: 'PERSON_DEACTIVATE',
            targetId: person._id,
            targetModel: 'Person',
            targetName: person.nombre,
            description: `Persona desactivada: ${person.nombre}`,
            severity: 'WARNING',
            changes: {
                before: { activo: true },
                after: { activo: false }
            }
        });
    }

    static async logPersonReactivate(req, person) {
        return this.log(req, {
            action: 'PERSON_REACTIVATE',
            targetId: person._id,
            targetModel: 'Person',
            targetName: person.nombre,
            description: `Persona reactivada: ${person.nombre}`,
            changes: {
                before: { activo: false },
                after: { activo: true }
            }
        });
    }

    // -------------------------------------------------------------------------
    // PAPELERA
    // -------------------------------------------------------------------------
    
    static async logTrashView(req, documentCount) {
        return this.log(req, {
            action: 'TRASH_VIEW',
            targetModel: 'Trash',
            targetName: 'Papelera',
            description: `Usuario visualizó la papelera (${documentCount} documentos)`,
            metadata: { documentCount }
        });
    }

    static async logTrashEmpty(req, deletedCount, deletedDocuments = []) {
        return this.log(req, {
            action: 'TRASH_EMPTY',
            targetModel: 'Trash',
            targetName: 'Papelera',
            description: `Papelera vaciada: ${deletedCount} documentos eliminados permanentemente`,
            severity: 'CRITICAL',
            metadata: {
                deletedCount,
                deletedDocuments: deletedDocuments.map(d => ({
                    id: d._id?.toString(),
                    nombre: d.nombre_original
                }))
            }
        });
    }

    static async logTrashAutoCleanup(req, deletedCount, daysThreshold = 30) {
        return this.log(req, {
            action: 'TRASH_AUTO_CLEANUP',
            targetModel: 'Trash',
            targetName: 'Papelera',
            description: `Limpieza automática: ${deletedCount} documentos con más de ${daysThreshold} días eliminados`,
            metadata: { deletedCount, daysThreshold }
        });
    }

    // -------------------------------------------------------------------------
    // SOPORTE
    // -------------------------------------------------------------------------
    
    static async logSupportTicketCreate(req, ticket) {
        return this.log(req, {
            action: 'SUPPORT_TICKET_CREATE',
            targetId: ticket._id,
            targetModel: 'Ticket',
            targetName: `Ticket #${ticket._id}`,
            description: `Ticket de soporte creado: ${ticket.asunto || ticket.titulo || 'Sin asunto'}`,
            metadata: {
                asunto: ticket.asunto || ticket.titulo,
                prioridad: ticket.prioridad,
                categoria: ticket.categoria
            }
        });
    }

    // -------------------------------------------------------------------------
    // AUDITORÍA (AUDIT_VIEW, AUDIT_EXPORT, AUDIT_CLEANUP)
    // -------------------------------------------------------------------------
    
    static async logAuditView(req, filters = {}) {
        return this.log(req, {
            action: 'AUDIT_VIEW',
            targetModel: 'Audit',
            targetName: 'Módulo de Auditoría',
            description: `Consultó logs de auditoría`,
            metadata: { filters }
        });
    }

    static async logAuditExport(req, format, count, filters = {}) {
        return this.log(req, {
            action: 'AUDIT_EXPORT',
            targetModel: 'Audit',
            targetName: 'Módulo de Auditoría',
            description: `Exportó ${count} logs en formato ${format}`,
            metadata: { format, count, filters }
        });
    }

    static async logAuditCleanup(req, deletedCount, daysToKeep) {
        return this.log(req, {
            action: 'AUDIT_CLEANUP',
            targetModel: 'Audit',
            targetName: 'Módulo de Auditoría',
            description: `Limpió logs anteriores a ${daysToKeep} días (${deletedCount} eliminados)`,
            severity: 'WARNING',
            metadata: { deletedCount, daysToKeep }
        });
    }
}

export default AuditService;