import jwt from 'jsonwebtoken';
import User from '../models/User.js';

// ============================================================================
// SECCIÓN: MIDDLEWARES DE AUTENTICACIÓN Y AUTORIZACIÓN
// ============================================================================
// Este archivo contiene middlewares para proteger rutas mediante JWT tokens,
// verificar roles de usuario y gestionar permisos específicos para tickets.
// Proporciona control de acceso granular basado en roles y propiedad de recursos.
// ============================================================================

// ********************************************************************
// MÓDULO 1: PROTECCIÓN DE RUTAS CON JWT
// ********************************************************************
// Descripción: Middleware principal que valida tokens JWT para proteger rutas
// que requieren autenticación. Extrae el token de cookies o headers,
// verifica su validez, obtiene el usuario asociado y actualiza su último acceso.
// ********************************************************************
export const protegerRuta = async (req, res, next) => {
    try {
        let token;

        // ----------------------------------------------------------------
        // BLOQUE 1.1: Extracción del token desde múltiples fuentes
        // ----------------------------------------------------------------
        // Busca el token JWT primero en las cookies (para navegadores web)
        // y luego en el header Authorization (para API clients como Postman).
        // Prioriza cookies ya que es el método principal para aplicaciones web.
        if (req.cookies && req.cookies.token) {
            token = req.cookies.token;
        } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }

        // ----------------------------------------------------------------
        // BLOQUE 1.2: Validación de presencia del token
        // ----------------------------------------------------------------
        // Si no se encuentra ningún token, responde inmediatamente con error 401.
        // Esto evita consultas innecesarias a la base de datos.
        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'No estás autenticado. Por favor inicia sesión.'
            });
        }

        try {
            // ----------------------------------------------------------------
            // BLOQUE 1.3: Verificación y decodificación del token JWT
            // ----------------------------------------------------------------
            // Verifica la firma del token usando el secreto configurado en variables
            // de entorno. Si el token es válido, extrae el payload con el ID del usuario.
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // ----------------------------------------------------------------
            // BLOQUE 1.4: Búsqueda y validación del usuario en base de datos
            // ----------------------------------------------------------------
            // Busca al usuario por ID excluyendo el campo de contraseña por seguridad.
            // Verifica que el usuario exista y esté activo en el sistema.
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

            // ----------------------------------------------------------------
            // BLOQUE 1.5: Actualización del último acceso y preparación de request
            // ----------------------------------------------------------------
            // Actualiza la marca de tiempo del último acceso del usuario para
            // mantener registro de actividad y luego guarda los cambios.
            user.ultimoAcceso = Date.now();
            await user.save();

            // Adjunta el objeto completo del usuario a la request para que
            // esté disponible en los siguientes middlewares y controladores.
            req.user = user;
            next();
        } catch (error) {
            // ----------------------------------------------------------------
            // BLOQUE 1.6: Manejo especializado de errores de token
            // ----------------------------------------------------------------
            // Distingue entre token expirado y token inválido para dar mensajes
            // de error más específicos y útiles al cliente.
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

// ********************************************************************
// MÓDULO 2: RESTRICCIÓN A USUARIOS ADMINISTRADORES
// ********************************************************************
// Descripción: Middleware que verifica que el usuario autenticado tenga
// rol de 'administrador'. Si no cumple con este requisito, se deniega
// el acceso con un error 403.
// ********************************************************************
export const soloAdministrador = (req, res, next) => {
    // ----------------------------------------------------------------
    // BLOQUE 2.1: Verificación directa de rol
    // ----------------------------------------------------------------
    // Accede al objeto user adjuntado por el middleware protegerRuta
    // y compara su rol con el valor 'administrador'.
    if (req.user && req.user.rol === 'administrador') {
        next();
    } else {
        return res.status(403).json({
            success: false,
            message: 'Acceso denegado. Solo administradores.'
        });
    }
};

// Agregar después de soloAdministrador (línea ~90)

// Middleware para verificar permisos específicos
export const verificarPermiso = (permiso) => {
    return (req, res, next) => {
        // Admin tiene todos los permisos automáticamente
        if (req.user.rol === 'administrador') {
            return next();
        }
        
        // Verificar si el usuario tiene el permiso específico
        if (req.user.permisos && req.user.permisos.includes(permiso)) {
            return next();
        }
        
        return res.status(403).json({
            success: false,
            message: `No tienes permiso para: ${permiso}`
        });
    };
};

// Middleware para verificar múltiples permisos (al menos uno)
export const verificarCualquierPermiso = (permisos) => {
    return (req, res, next) => {
        if (req.user.rol === 'administrador') {
            return next();
        }
        
        const tienePermiso = permisos.some(p => 
            req.user.permisos && req.user.permisos.includes(p)
        );
        
        if (tienePermiso) {
            return next();
        }
        
        return res.status(403).json({
            success: false,
            message: 'No tienes los permisos necesarios'
        });
    };
};

// Middleware para verificar que solo haya un admin
export const verificarUnicoAdmin = async (req, res, next) => {
    try {
        if (req.user.rol === 'administrador') {
            const adminCount = await User.countDocuments({ 
                rol: 'administrador',
                activo: true 
            });
            
            // Si es admin y hay más de uno, pero este no es el único admin
            if (adminCount > 1 && !req.user.esAdminUnico) {
                // Desactivar permisos de admin para este usuario
                req.user.rol = 'usuario';
                await req.user.save();
                
                return res.status(403).json({
                    success: false,
                    message: 'Ya existe un administrador único. Contacta al administrador actual.'
                });
            }
        }
        next();
    } catch (error) {
        console.error('Error en verificarUnicoAdmin:', error);
        next(error);
    }
};

// ********************************************************************
// MÓDULO 3: PERMISOS HÍBRIDOS PARA TICKETS
// ********************************************************************
// Descripción: Permite acceso a administradores o al usuario que creó
// un ticket. Este middleware realiza una validación inicial simple
// antes de delegar la verificación detallada al controlador.
// ********************************************************************
export const adminOPropietarioTicket = (req, res, next) => {
    // ----------------------------------------------------------------
    // BLOQUE 3.1: Verificación básica de autenticación
    // ----------------------------------------------------------------
    // Primero asegura que haya un usuario autenticado adjunto a la request.
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: 'No autenticado'
        });
    }

    // ----------------------------------------------------------------
    // BLOQUE 3.2: Acceso automático para administradores
    // ----------------------------------------------------------------
    // Si el usuario es administrador, permite el acceso inmediatamente
    // sin necesidad de verificar propiedad del recurso.
    if (req.user.rol === 'administrador') {
        return next();
    }

    // ----------------------------------------------------------------
    // BLOQUE 3.3: Permiso base para usuarios autenticados
    // ----------------------------------------------------------------
    // Para usuarios no administradores, permite el acceso básico.
    // La verificación detallada de propiedad del ticket se delegará
    // al controlador específico que maneja la operación.
    if (req.user._id) {
        return next();
    }

    // ----------------------------------------------------------------
    // BLOQUE 3.4: Respuesta para permisos insuficientes
    // ----------------------------------------------------------------
    // Solo se ejecuta si ninguna condición anterior se cumplió.
    return res.status(403).json({
        success: false,
        message: 'No tienes permisos para realizar esta acción'
    });
};

// ********************************************************************
// MÓDULO 4: VERIFICACIÓN DETALLADA DE PERMISOS PARA TICKETS
// ********************************************************************
// Descripción: Middleware completo que verifica permisos sobre tickets
// específicos. Administradores pueden acceder a todos, usuarios normales
// solo a los tickets que ellos crearon.
// ********************************************************************
export const permisoTicket = async (req, res, next) => {
    try {
        // ----------------------------------------------------------------
        // BLOQUE 4.1: Verificación inicial de autenticación
        // ----------------------------------------------------------------
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'No autenticado'
            });
        }

        // ----------------------------------------------------------------
        // BLOQUE 4.2: Acceso total para administradores
        // ----------------------------------------------------------------
        // Los administradores tienen permiso para ver y modificar cualquier
        // ticket del sistema sin restricciones.
        if (req.user.rol === 'administrador') {
            return next();
        }

        // ----------------------------------------------------------------
        // BLOQUE 4.3: Manejo de casos sin ID específico
        // ----------------------------------------------------------------
        // Si no hay ID en los parámetros (por ejemplo, al listar todos los tickets),
        // permite el acceso para que el controlador filtre según corresponda.
        const ticketId = req.params.id;
        if (!ticketId) {
            return next();
        }

        // ----------------------------------------------------------------
        // BLOQUE 4.4: Importación dinámica del modelo Ticket
        // ----------------------------------------------------------------
        // Importa el modelo solo cuando es necesario para evitar problemas
        // de dependencias circulares en la arquitectura del proyecto.
        const Ticket = (await import('../models/Ticket.js')).default;
        
        // ----------------------------------------------------------------
        // BLOQUE 4.5: Búsqueda del ticket y su creador
        // ----------------------------------------------------------------
        // Obtiene solo el campo createdBy del ticket para verificar propiedad,
        // evitando traer datos innecesarios que consuman memoria.
        const ticket = await Ticket.findById(ticketId).select('createdBy');
        
        if (!ticket) {
            return res.status(404).json({
                success: false,
                message: 'Ticket no encontrado'
            });
        }

        // ----------------------------------------------------------------
        // BLOQUE 4.6: Normalización y comparación de IDs
        // ----------------------------------------------------------------
        // Convierte ambos IDs a strings para comparación segura, manejando
        // tanto referencias de objetos como IDs en formato string.
        const createdById = typeof ticket.createdBy === 'object' 
            ? ticket.createdBy.toString() 
            : ticket.createdBy;
        
        const userId = req.user._id.toString();
        
        // ----------------------------------------------------------------
        // BLOQUE 4.7: Verificación de propiedad del ticket
        // ----------------------------------------------------------------
        // Si el ID del usuario autenticado coincide con el creador del ticket,
        // se concede acceso al recurso.
        if (createdById === userId) {
            return next();
        }

        // ----------------------------------------------------------------
        // BLOQUE 4.8: Denegación de acceso por falta de permisos
        // ----------------------------------------------------------------
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

// ********************************************************************
// MÓDULO 5: CONTROL DE CAMBIOS DE ESTADO EN TICKETS
// ********************************************************************
// Descripción: Middleware especializado que gestiona quién puede cambiar
// el estado de un ticket. Administradores pueden cambiar cualquier estado,
// mientras que usuarios normales solo pueden cerrar tickets que ellos crearon.
// ********************************************************************
export const permisoCambiarEstado = async (req, res, next) => {
    try {
        // ----------------------------------------------------------------
        // BLOQUE 5.1: Verificación de autenticación inicial
        // ----------------------------------------------------------------
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'No autenticado'
            });
        }

        const { status } = req.body;
        const ticketId = req.params.id;

        // ----------------------------------------------------------------
        // BLOQUE 5.2: Permisos ilimitados para administradores
        // ----------------------------------------------------------------
        // Los administradores pueden cambiar el estado de cualquier ticket
        // a cualquier valor permitido por el sistema.
        if (req.user.rol === 'administrador') {
            return next();
        }

        // ----------------------------------------------------------------
        // BLOQUE 5.3: Restricción para usuarios normales al cerrar tickets
        // ----------------------------------------------------------------
        // Si el cambio de estado es a "cerrado", verifica que el usuario
        // sea el creador del ticket antes de permitir la operación.
        if (status === 'cerrado') {
            const Ticket = (await import('../models/Ticket.js')).default;
            
            const ticket = await Ticket.findById(ticketId).select('createdBy');
            
            if (!ticket) {
                return res.status(404).json({
                    success: false,
                    message: 'Ticket no encontrado'
                });
            }

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

        // ----------------------------------------------------------------
        // BLOQUE 5.4: Delegación para otros cambios de estado
        // ----------------------------------------------------------------
        // Para cambios de estado diferentes a "cerrado", delega la verificación
        // al middleware permisoTicket que maneja los permisos generales.
        return permisoTicket(req, res, next);

    } catch (error) {
        console.error('Error en permisoCambiarEstado middleware:', error);
        return res.status(500).json({
            success: false,
            message: 'Error del servidor'
        });
    }
};

// ********************************************************************
// MÓDULO 6: GENERACIÓN DE TOKENS JWT
// ********************************************************************
// Descripción: Función utilitaria que crea tokens JWT firmados para
// autenticar usuarios. Incluye el ID del usuario en el payload y
// establece un tiempo de expiración configurable.
// ********************************************************************
export const generarToken = (id) => {
    // ----------------------------------------------------------------
    // BLOQUE 6.1: Creación del token firmado
    // ----------------------------------------------------------------
    // Genera un token JWT que contiene el ID del usuario como payload,
    // firmado con el secreto definido en variables de entorno.
    // El tiempo de expiración es configurable (7 días por defecto).
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRE || '7d'
    });
};

// ********************************************************************
// MÓDULO 7: ENVÍO DE RESPUESTAS CON TOKEN EN COOKIE
// ********************************************************************
// Descripción: Función completa que envía respuesta de autenticación
// exitosa, incluyendo el token JWT tanto en una cookie HTTP-Only como
// en el cuerpo de la respuesta JSON para diferentes tipos de clientes.
// ********************************************************************
export const enviarTokenRespuesta = (user, statusCode, res, message = 'Autenticación exitosa') => {
    // ----------------------------------------------------------------
    // BLOQUE 7.1: Generación del token JWT
    // ----------------------------------------------------------------
    // Crea un nuevo token JWT usando la función utilitaria generarToken
    // con el ID del usuario que se autenticó exitosamente.
    const token = generarToken(user._id);

    // ----------------------------------------------------------------
    // BLOQUE 7.2: Configuración de opciones de la cookie
    // ----------------------------------------------------------------
    // Define propiedades de seguridad para la cookie que contendrá el token:
    // - HTTP-Only: Previene acceso desde JavaScript (protección XSS)
    // - Secure: Solo envía cookie sobre HTTPS en producción
    // - SameSite: Strict para prevenir ataques CSRF
    const options = {
        expires: new Date(
            Date.now() + (process.env.JWT_COOKIE_EXPIRE || 7) * 24 * 60 * 60 * 1000
        ),
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict'
    };

    // ----------------------------------------------------------------
    // BLOQUE 7.3: Envío de respuesta completa
    // ----------------------------------------------------------------
    // Establece la cookie con el token y envía una respuesta JSON con:
    // - Confirmación de éxito
    // - Mensaje descriptivo
    // - Token en el cuerpo (para clientes que no usan cookies)
    // - Información básica del usuario (sin datos sensibles)
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
};