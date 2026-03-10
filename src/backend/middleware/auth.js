// src/backend/middleware/auth.js

import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { hasPermission, PERMISSIONS } from '../config/permissions.js';
import AuditService from '../services/auditService.js'; // ✅ IMPORTACIÓN DEL SERVICIO DE AUDITORÍA
import Role from '../models/Role.js';

// =============================================================================
// PERMISOS PARA ROLES DINÁMICOS (por sección)
//
// Los roles dinámicos solo tienen 2 niveles por sección: canView / canAction.
// Para no romper el sistema legacy (roles fijos con permisos finos),
// interpretamos los permisos del backend (PERMISSIONS.*) en términos de
// { section, level } cuando el rol existe como Role dinámico en Mongo.
// =============================================================================

const DYNAMIC_PERMISSION_MAP = Object.freeze({
    // Documentos
    [PERMISSIONS.VIEW_DOCUMENTS]:     { section: 'documentos', level: 'view' },
    [PERMISSIONS.DOWNLOAD_DOCUMENTS]: { section: 'documentos', level: 'view' },
    [PERMISSIONS.UPLOAD_DOCUMENTS]:   { section: 'documentos', level: 'action' },
    [PERMISSIONS.EDIT_DOCUMENTS]:     { section: 'documentos', level: 'action' },
    [PERMISSIONS.DELETE_DOCUMENTS]:   { section: 'documentos', level: 'action' },
    [PERMISSIONS.APPROVE_DOCUMENTS]:  { section: 'documentos', level: 'action' },

    // Personas
    [PERMISSIONS.VIEW_PERSONS]:   { section: 'personas', level: 'view' },
    [PERMISSIONS.CREATE_PERSON]:  { section: 'personas', level: 'action' },
    [PERMISSIONS.EDIT_PERSON]:    { section: 'personas', level: 'action' },
    [PERMISSIONS.DELETE_PERSON]:  { section: 'personas', level: 'action' },

    // Categorías
    [PERMISSIONS.VIEW_CATEGORIES]:  { section: 'categorias', level: 'view' },
    [PERMISSIONS.CREATE_CATEGORY]:  { section: 'categorias', level: 'action' },
    [PERMISSIONS.EDIT_CATEGORY]:    { section: 'categorias', level: 'action' },
    [PERMISSIONS.DELETE_CATEGORY]:  { section: 'categorias', level: 'action' },

    // Departamentos
    [PERMISSIONS.VIEW_DEPARTMENTS]:   { section: 'departamentos', level: 'view' },
    [PERMISSIONS.CREATE_DEPARTMENT]: { section: 'departamentos', level: 'action' },
    [PERMISSIONS.EDIT_DEPARTMENT]:   { section: 'departamentos', level: 'action' },
    [PERMISSIONS.DELETE_DEPARTMENT]: { section: 'departamentos', level: 'action' },

    // Tareas
    [PERMISSIONS.VIEW_TASKS]:     { section: 'tareas', level: 'view' },
    [PERMISSIONS.CREATE_TASK]:   { section: 'tareas', level: 'action' },
    [PERMISSIONS.EDIT_TASK]:     { section: 'tareas', level: 'action' },
    [PERMISSIONS.DELETE_TASK]:   { section: 'tareas', level: 'action' },
    [PERMISSIONS.COMPLETE_TASK]: { section: 'tareas', level: 'action' },

    // Reportes
    [PERMISSIONS.VIEW_REPORTS]:      { section: 'reportes', level: 'view' },
    [PERMISSIONS.GENERATE_REPORTS]:  { section: 'reportes', level: 'action' },
    [PERMISSIONS.EXPORT_REPORTS]:    { section: 'reportes', level: 'action' },

    // Papelera
    [PERMISSIONS.VIEW_TRASH]:          { section: 'papelera', level: 'view' },
    [PERMISSIONS.RESTORE_FROM_TRASH]: { section: 'papelera', level: 'action' },
    [PERMISSIONS.EMPTY_TRASH]:        { section: 'papelera', level: 'action' },

    // Calendario
    [PERMISSIONS.VIEW_CALENDAR]:  { section: 'calendario', level: 'view' },
    [PERMISSIONS.CREATE_EVENT]:   { section: 'calendario', level: 'action' },
    [PERMISSIONS.EDIT_EVENT]:     { section: 'calendario', level: 'action' },
    [PERMISSIONS.DELETE_EVENT]:   { section: 'calendario', level: 'action' },

    // Historial
    [PERMISSIONS.VIEW_HISTORY]:   { section: 'historial', level: 'view' },
    [PERMISSIONS.EXPORT_HISTORY]: { section: 'historial', level: 'action' },
    [PERMISSIONS.CLEAR_HISTORY]:  { section: 'historial', level: 'action' },

    // Soporte
    [PERMISSIONS.VIEW_SUPPORT]:       { section: 'soporte', level: 'view' },
    [PERMISSIONS.CREATE_TICKET]:      { section: 'soporte', level: 'action' },
    [PERMISSIONS.VIEW_ALL_TICKETS]:   { section: 'soporte', level: 'view' },
    [PERMISSIONS.RESPOND_TICKET]:     { section: 'soporte', level: 'action' },
    [PERMISSIONS.CLOSE_TICKET]:       { section: 'soporte', level: 'action' },

    // Notificaciones (en backend vive como System Settings)
    [PERMISSIONS.VIEW_SYSTEM_SETTINGS]: { section: 'notificaciones', level: 'view' },
    [PERMISSIONS.EDIT_SYSTEM_SETTINGS]: { section: 'notificaciones', level: 'action' },
});

async function _hasDynamicRoleSectionPermission(roleName, permission) {
    const mapping = DYNAMIC_PERMISSION_MAP[permission];
    if (!mapping) return null; // "no aplica" → caer a legacy

    const roleDoc = await Role.findOne({ name: roleName }).select('name permissions systemKey').lean(false);
    if (!roleDoc) return null; // no existe como rol dinámico → legacy

    // El modelo ya maneja administrador por systemKey, pero por seguridad:
    if (roleDoc.systemKey === 'administrador' || roleName === 'administrador') return true;

    if (mapping.level === 'view') {
        return Boolean(roleDoc.canViewSection?.(mapping.section));
    }

    return Boolean(roleDoc.canActionSection?.(mapping.section));
}

/**
 * Middleware para proteger rutas que requieren autenticación
 */
export const protegerRuta = async (req, res, next) => {
    try {
        let token;

        // Verificar si hay token en las cookies o en el header
        if (req.cookies && req.cookies.token) {
            token = req.cookies.token;
        } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'No estás autenticado. Por favor inicia sesión.'
            });
        }

        try {
            // Verificar token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // Buscar usuario
            const user = await User.findById(decoded.id).select('-password');

            if (!user) {
                return res.status(401).json({
                    success: false,
                    message: 'El usuario ya no existe'
                });
            }

            if (!user.activo) {
                return res.status(401).json({
                    success: false,
                    message: 'Usuario desactivado'
                });
            }

            // Actualizar último acceso
            user.ultimoAcceso = Date.now();
            await user.save();

            // Agregar usuario a la request
            req.user = user;
            next();
        } catch (error) {
            if (error.name === 'TokenExpiredError') {
                return res.status(401).json({
                    success: false,
                    message: 'Tu sesión ha expirado. Por favor inicia sesión nuevamente.',
                    expired: true
                });
            }

            return res.status(401).json({
                success: false,
                message: 'Token inválido'
            });
        }
    } catch (error) {
        console.error('Error en middleware de autenticación:', error);
        return res.status(500).json({
            success: false,
            message: 'Error del servidor'
        });
    }
};

/**
 * Middleware para verificar que el usuario es administrador
 */
export const soloAdministrador = (req, res, next) => {
    if (req.user && req.user.rol === 'administrador') {
        next();
    } else {
        return res.status(403).json({
            success: false,
            message: 'Acceso denegado. Solo administradores.'
        });
    }
};

/**
 * Middleware para verificar que el usuario es administrador O es el creador del ticket
 */
export const adminOPropietarioTicket = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: 'No autenticado'
        });
    }

    // Si es administrador, permitir siempre
    if (req.user.rol === 'administrador') {
        return next();
    }

    // Si el usuario es el creador del ticket, también permitir
    const ticketId = req.params.id || req.body.ticketId;
    
    // Verificar si el usuario es el creador del ticket
    // (esto se verifica en el controlador específico)
    // Por ahora, permitir a todos los usuarios autenticados
    if (req.user._id) {
        return next();
    }

    // Si no cumple ninguna condición
    return res.status(403).json({
        success: false,
        message: 'No tienes permisos para realizar esta acción'
    });
};

/**
 * Middleware para tickets: administrador O usuario que creó el ticket
 */
export const permisoTicket = async (req, res, next) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'No autenticado'
            });
        }

        // Si es administrador, permitir siempre
        if (req.user.rol === 'administrador') {
            return next();
        }

        // Si no es administrador, verificar si es el creador del ticket
        const ticketId = req.params.id;
        if (!ticketId) {
            return next(); // Permitir si no hay ID (para listados)
        }

        // Importar Ticket aquí para evitar dependencia circular
        const Ticket = (await import('../models/Ticket.js')).default;
        
        const ticket = await Ticket.findById(ticketId).select('createdBy');
        
        if (!ticket) {
            return res.status(404).json({
                success: false,
                message: 'Ticket no encontrado'
            });
        }

        // Verificar si el usuario actual es el creador del ticket
        const createdById = typeof ticket.createdBy === 'object' 
            ? ticket.createdBy.toString() 
            : ticket.createdBy;
        
        const userId = req.user._id.toString();
        
        if (createdById === userId) {
            return next();
        }

        // Si no es ni administrador ni creador
        return res.status(403).json({
            success: false,
            message: 'No tienes permisos para acceder a este ticket'
        });

    } catch (error) {
        console.error('Error en permisoTicket middleware:', error);
        return res.status(500).json({
            success: false,
            message: 'Error del servidor'
        });
    }
};

/**
 * Middleware para cambiar estado de ticket: Solo administrador puede cambiar a cerrado
 */
export const permisoCambiarEstado = async (req, res, next) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'No autenticado'
            });
        }

        const { status } = req.body;
        const ticketId = req.params.id;

        // Si el usuario es administrador, permitir cualquier cambio
        if (req.user.rol === 'administrador') {
            return next();
        }

        // Si no es administrador, solo permitir cambiar a "cerrado" si es el creador
        if (status === 'cerrado') {
            // Importar Ticket aquí para evitar dependencia circular
            const Ticket = (await import('../models/Ticket.js')).default;
            
            const ticket = await Ticket.findById(ticketId).select('createdBy');
            
            if (!ticket) {
                return res.status(404).json({
                    success: false,
                    message: 'Ticket no encontrado'
                });
            }

            // Verificar si el usuario actual es el creador del ticket
            const createdById = typeof ticket.createdBy === 'object' 
                ? ticket.createdBy.toString() 
                : ticket.createdBy;
            
            const userId = req.user._id.toString();
            
            if (createdById === userId) {
                return next();
            }

            return res.status(403).json({
                success: false,
                message: 'Solo el creador del ticket o el administrador pueden cerrarlo'
            });
        }

        // Para otros estados, solo permitir al creador
        return permisoTicket(req, res, next);

    } catch (error) {
        console.error('Error en permisoCambiarEstado middleware:', error);
        return res.status(500).json({
            success: false,
            message: 'Error del servidor'
        });
    }
};

/**
 * Generar JWT Token
 */
export const generarToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRE || '7d' // 7 días por defecto
    });
};

/**
 * Configurar cookie con el token - AHORA CON AUDITORÍA DE LOGIN
 */
export const enviarTokenRespuesta = async (user, statusCode, res, message = 'Autenticación exitosa', req = null) => {
    try {
        // Crear token
        const token = generarToken(user._id);

        // Opciones de cookie
        const options = {
            expires: new Date(
                Date.now() + (process.env.JWT_COOKIE_EXPIRE || 7) * 24 * 60 * 60 * 1000
            ),
            httpOnly: true, // Prevenir ataques XSS
            secure: process.env.NODE_ENV === 'production', // Solo HTTPS en producción
            sameSite: 'strict' // Prevenir CSRF
        };

        // =======================================================================
        // REGISTRAR LOGIN EXITOSO EN AUDITORÍA (si tenemos req)
        // =======================================================================
        if (req) {
            // Registrar login exitoso de forma asíncrona (no bloqueante)
            AuditService.log(req, {
                action: 'LOGIN_SUCCESS',
                actionType: 'LOGIN',
                actionCategory: 'AUTH',
                targetId: user._id,
                targetModel: 'User',
                targetName: user.usuario,
                description: `Inicio de sesión exitoso: ${user.usuario} (${user.correo})`,
                severity: 'INFO',
                status: 'SUCCESS',
                metadata: {
                    usuario: user.usuario,
                    correo: user.correo,
                    rol: user.rol,
                    timestamp: new Date().toISOString()
                }
            }).catch(err => console.error('❌ Error registrando LOGIN_SUCCESS:', err.message));

            console.log(`✅ Login exitoso registrado en auditoría: ${user.usuario}`);
        }

        res.status(statusCode)
            .cookie('token', token, options)
            .json({
                success: true,
                message,
                token,
                user: {
                    id: user._id,
                    usuario: user.usuario,
                    correo: user.correo,
                    rol: user.rol
                }
            });

    } catch (error) {
        console.error('🔥 Error en enviarTokenRespuesta:', error);
        
        // Si falla la auditoría, aún así responder con éxito (el login fue exitoso)
        res.status(statusCode)
            .cookie('token', generarToken(user._id), {
                expires: new Date(
                    Date.now() + (process.env.JWT_COOKIE_EXPIRE || 7) * 24 * 60 * 60 * 1000
                ),
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict'
            })
            .json({
                success: true,
                message,
                token: generarToken(user._id),
                user: {
                    id: user._id,
                    usuario: user.usuario,
                    correo: user.correo,
                    rol: user.rol
                }
            });
    }
};

/**
 * Middleware para verificar si el usuario tiene un rol permitido
 */
export const verificarRol = (rolesPermitidos) => (req, res, next) => {
    if (!req.user || !rolesPermitidos.includes(req.user.rol)) {
        return res.status(403).json({
            success: false,
            message: 'No tienes permisos para realizar esta acción.'
        });
    }
    next();
};

/**
 * Middleware reusable para verificar permisos por rol.
 * Uso: requirePermission(PERMISSIONS.UPLOAD_DOCUMENTS)
 * 
 * VERSIÓN MEJORADA: Registra intentos fallidos en auditoría
 */
export const requirePermission = (permission) => async (req, res, next) => {
    const role = req.user?.rol;

    if (!role) {
        return res.status(401).json({
            success: false,
            message: 'No autenticado'
        });
    }

    // CASO ESPECIAL: ADMINISTRADOR SIEMPRE TIENE ACCESO
    if (role === 'administrador') {
        return next();
    }

    // 1) Roles dinámicos (por sección)
    try {
        const dynamicAllowed = await _hasDynamicRoleSectionPermission(role, permission);
        if (dynamicAllowed === true) {
            return next();
        }
        if (dynamicAllowed === false) {
            // No permitido por rol dinámico → 403
            return res.status(403).json({
                success: false,
                message: 'No tienes permisos para realizar esta acción.',
                requiredPermission: permission
            });
        }
        // dynamicAllowed === null → continuar a legacy
    } catch (dynamicErr) {
        console.error('❌ Error verificando permisos de rol dinámico:', dynamicErr);
        // Si falla la consulta, NO conceder acceso; continuar a legacy para no romper.
    }

    // 2) Legacy: Verificar permiso usando el mapa central por rol fijo
    if (!hasPermission(role, permission)) {
        // =======================================================================
        // REGISTRAR INTENTO NO AUTORIZADO EN AUDITORÍA
        // =======================================================================
        try {
            const actionMap = {
                [PERMISSIONS.VIEW_PERSONS]: 'PERSON_VIEW_UNAUTHORIZED',
                [PERMISSIONS.CREATE_PERSON]: 'PERSON_CREATE_UNAUTHORIZED',
                [PERMISSIONS.EDIT_PERSON]: 'PERSON_EDIT_UNAUTHORIZED',
                [PERMISSIONS.DELETE_PERSON]: 'PERSON_DELETE_UNAUTHORIZED'
            };

            const action = actionMap[permission] || 'UNAUTHORIZED_ACCESS';

            await AuditService.log(req, {
                action,
                actionType: 'UNAUTHORIZED',
                actionCategory: 'SECURITY',
                targetId: null,
                targetModel: 'Person',
                targetName: 'N/A',
                description: `Intento de acceso no autorizado: ${permission} por usuario ${req.user?.usuario || 'desconocido'} (rol: ${role})`,
                severity: 'WARNING',
                status: 'DENIED',
                metadata: {
                    usuario: req.user?.usuario,
                    rol: role,
                    permisoRequerido: permission,
                    endpoint: req.originalUrl,
                    method: req.method
                }
            });
            console.log(`⚠️ Intento no autorizado registrado: ${permission}`);
        } catch (auditError) {
            console.error('❌ Error registrando intento no autorizado:', auditError.message);
        }

        return res.status(403).json({
            success: false,
            message: 'No tienes permisos para realizar esta acción.',
            requiredPermission: permission
        });
    }

    return next();
};