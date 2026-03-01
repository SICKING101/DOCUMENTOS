import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { hasPermission } from '../config/permissions.js';
import AuditService from '../services/auditService.js'; // ✅ IMPORTACIÓN DEL SERVICIO DE AUDITORÍA

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
 */
export const requirePermission = (permission) => (req, res, next) => {
    const role = req.user?.rol;

    if (!role) {
        return res.status(401).json({
            success: false,
            message: 'No autenticado'
        });
    }

    if (!hasPermission(role, permission)) {
        return res.status(403).json({
            success: false,
            message: 'No tienes permisos para realizar esta acción.'
        });
    }

    return next();
};