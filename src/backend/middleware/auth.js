import jwt from 'jsonwebtoken';
import User from '../models/User.js';

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
 * Generar JWT Token
 */
export const generarToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRE || '7d' // 7 días por defecto
    });
};

/**
 * Configurar cookie con el token
 */
export const enviarTokenRespuesta = (user, statusCode, res, message = 'Autenticación exitosa') => {
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
