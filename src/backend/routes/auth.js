import express from 'express';
import User from '../models/User.js';
import { protegerRuta, enviarTokenRespuesta } from '../middleware/auth.js';
import { enviarCorreoRecuperacion, enviarCorreoCambioAdmin, enviarCorreoBienvenida } from '../services/emailService.js';
import crypto from 'crypto';

const router = express.Router();

// =============================================================================
// VERIFICAR SI EXISTE ADMINISTRADOR
// =============================================================================
router.get('/check-admin', async (req, res) => {
    try {
        const adminExists = await User.countDocuments() > 0;
        
        res.json({
            success: true,
            adminExists,
            message: adminExists ? 'Ya existe un administrador' : 'No hay administrador registrado'
        });
    } catch (error) {
        console.error('Error al verificar admin:', error);
        res.status(500).json({
            success: false,
            message: 'Error del servidor'
        });
    }
});

// =============================================================================
// REGISTRAR PRIMER ADMINISTRADOR
// =============================================================================
router.post('/register', async (req, res) => {
    try {
        const { usuario, correo, password } = req.body;

        // Verificar que no exista ya un administrador
        const existeAdmin = await User.countDocuments();
        if (existeAdmin > 0) {
            return res.status(400).json({
                success: false,
                message: 'Ya existe un administrador registrado'
            });
        }

        // Validar datos
        if (!usuario || !correo || !password) {
            return res.status(400).json({
                success: false,
                message: 'Por favor proporciona todos los campos requeridos'
            });
        }

        // Crear usuario
        const user = await User.create({
            usuario,
            correo,
            password,
            rol: 'administrador'
        });

        console.log('✅ Administrador registrado:', usuario);

        // Enviar correo de bienvenida (sin esperar)
        enviarCorreoBienvenida(correo, usuario).catch(err => 
            console.error('Error al enviar correo de bienvenida:', err)
        );

        // Enviar token
        enviarTokenRespuesta(user, 201, res, 'Administrador registrado exitosamente');
    } catch (error) {
        console.error('Error al registrar admin:', error);

        if (error.code === 11000) {
            const campo = Object.keys(error.keyPattern)[0];
            return res.status(400).json({
                success: false,
                message: `El ${campo} ya está en uso`
            });
        }

        res.status(500).json({
            success: false,
            message: 'Error al registrar administrador',
            error: error.message
        });
    }
});

// =============================================================================
// INICIAR SESIÓN
// =============================================================================
router.post('/login', async (req, res) => {
    try {
        const { usuarioOCorreo, password } = req.body;

        // Validar datos
        if (!usuarioOCorreo || !password) {
            return res.status(400).json({
                success: false,
                message: 'Por favor proporciona usuario/correo y contraseña'
            });
        }

        // Buscar usuario por usuario o correo
        const user = await User.findOne({
            $or: [
                { usuario: usuarioOCorreo },
                { correo: usuarioOCorreo }
            ]
        }).select('+password');

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Credenciales inválidas'
            });
        }

        // Verificar contraseña
        const esPasswordValida = await user.compararPassword(password);

        if (!esPasswordValida) {
            return res.status(401).json({
                success: false,
                message: 'Credenciales inválidas'
            });
        }

        // Verificar que esté activo
        if (!user.activo) {
            return res.status(401).json({
                success: false,
                message: 'Usuario desactivado'
            });
        }

        console.log('✅ Login exitoso:', user.usuario);

        // Enviar token
        enviarTokenRespuesta(user, 200, res, 'Inicio de sesión exitoso');
    } catch (error) {
        console.error('Error al iniciar sesión:', error);
        res.status(500).json({
            success: false,
            message: 'Error al iniciar sesión'
        });
    }
});

// =============================================================================
// CERRAR SESIÓN
// =============================================================================
router.post('/logout', (req, res) => {
    res.cookie('token', 'none', {
        expires: new Date(Date.now() + 10 * 1000),
        httpOnly: true
    });

    res.json({
        success: true,
        message: 'Sesión cerrada exitosamente'
    });
});

// =============================================================================
// OBTENER USUARIO ACTUAL
// =============================================================================
router.get('/me', protegerRuta, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);

        res.json({
            success: true,
            user: {
                id: user._id,
                usuario: user.usuario,
                correo: user.correo,
                rol: user.rol,
                ultimoAcceso: user.ultimoAcceso
            }
        });
    } catch (error) {
        console.error('Error al obtener usuario:', error);
        res.status(500).json({
            success: false,
            message: 'Error del servidor'
        });
    }
});

// =============================================================================
// SOLICITAR RECUPERACIÓN DE CONTRASEÑA
// =============================================================================
router.post('/forgot-password', async (req, res) => {
    try {
        const { correo } = req.body;

        if (!correo) {
            return res.status(400).json({
                success: false,
                message: 'Por favor proporciona un correo electrónico'
            });
        }

        const user = await User.findOne({ correo });

        if (!user) {
            // Por seguridad, no revelamos si el correo existe o no
            return res.json({
                success: true,
                message: 'Si el correo existe, recibirás instrucciones para recuperar tu contraseña'
            });
        }

        // Generar token
        const resetToken = user.generarTokenRecuperacion();
        await user.save({ validateBeforeSave: false });

        // Enviar correo
        const result = await enviarCorreoRecuperacion(user.correo, resetToken, user.usuario);

        const response = {
            success: true,
            message: result.emailSent === false 
                ? '⚠️ Email no configurado. Usa el link que aparece en la consola del servidor.' 
                : 'Correo de recuperación enviado'
        };

        // Si el email no se envió, incluir el link en la respuesta
        if (result.resetURL) {
            response.resetURL = result.resetURL;
            console.log('');
            console.log('═══════════════════════════════════════════════════════');
            console.log('🔑 LINK DE RECUPERACIÓN DE CONTRASEÑA:');
            console.log('📋 Copia y pega este link en tu navegador:');
            console.log('');
            console.log('   ' + result.resetURL);
            console.log('');
            console.log('═══════════════════════════════════════════════════════');
            console.log('');
        }

        res.json(response);
    } catch (error) {
        console.error('Error en forgot-password:', error);
        res.status(500).json({
            success: false,
            message: 'Error del servidor'
        });
    }
});

// =============================================================================
// RESTABLECER CONTRASEÑA
// =============================================================================
router.put('/reset-password/:token', async (req, res) => {
    try {
        const { password } = req.body;

        if (!password) {
            return res.status(400).json({
                success: false,
                message: 'Por favor proporciona una nueva contraseña'
            });
        }

        // Hash del token
        const resetPasswordToken = crypto
            .createHash('sha256')
            .update(req.params.token)
            .digest('hex');

        // Buscar usuario con token válido
        const user = await User.findOne({
            resetPasswordToken,
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'Token inválido o expirado'
            });
        }

        // Establecer nueva contraseña
        user.password = password;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();

        console.log('✅ Contraseña restablecida para:', user.usuario);

        // Enviar token de sesión
        enviarTokenRespuesta(user, 200, res, 'Contraseña restablecida exitosamente');
    } catch (error) {
        console.error('Error al restablecer contraseña:', error);
        res.status(500).json({
            success: false,
            message: 'Error al restablecer contraseña'
        });
    }
});

// =============================================================================
// SOLICITAR CAMBIO DE ADMINISTRADOR
// =============================================================================
router.post('/request-admin-change', protegerRuta, async (req, res) => {
    try {
        const { solicitante } = req.body;
        const adminActual = req.user;

        // Generar token
        const changeToken = adminActual.generarTokenCambioAdmin();
        await adminActual.save({ validateBeforeSave: false });

        // Enviar correo
        try {
            await enviarCorreoCambioAdmin(
                adminActual.correo,
                changeToken,
                adminActual.usuario,
                solicitante
            );

            res.json({
                success: true,
                message: 'Solicitud enviada. El administrador actual recibirá un correo de confirmación.'
            });
        } catch (error) {
            adminActual.changeAdminToken = undefined;
            adminActual.changeAdminExpires = undefined;
            await adminActual.save({ validateBeforeSave: false });

            return res.status(500).json({
                success: false,
                message: 'No se pudo enviar el correo de verificación'
            });
        }
    } catch (error) {
        console.error('Error al solicitar cambio de admin:', error);
        res.status(500).json({
            success: false,
            message: 'Error del servidor'
        });
    }
});

// =============================================================================
// CONFIRMAR CAMBIO DE ADMINISTRADOR
// =============================================================================
router.get('/confirm-admin-change/:token', async (req, res) => {
    try {
        const { action } = req.query;

        // Hash del token
        const changeAdminToken = crypto
            .createHash('sha256')
            .update(req.params.token)
            .digest('hex');

        // Buscar usuario con token válido
        const user = await User.findOne({
            changeAdminToken,
            changeAdminExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'Token inválido o expirado'
            });
        }

        if (action === 'deny') {
            // Rechazar solicitud
            user.changeAdminToken = undefined;
            user.changeAdminExpires = undefined;
            await user.save({ validateBeforeSave: false });

            return res.json({
                success: true,
                message: 'Solicitud de cambio rechazada'
            });
        }

        if (action === 'confirm') {
            // Confirmar y eliminar administrador actual
            await User.deleteOne({ _id: user._id });

            console.log('✅ Cambio de administrador confirmado y ejecutado');

            return res.json({
                success: true,
                message: 'Cambio de administrador autorizado. Ahora puedes registrar un nuevo administrador.',
                redirect: '/register'
            });
        }

        res.status(400).json({
            success: false,
            message: 'Acción no válida'
        });
    } catch (error) {
        console.error('Error al confirmar cambio de admin:', error);
        res.status(500).json({
            success: false,
            message: 'Error del servidor'
        });
    }
});

export default router;
