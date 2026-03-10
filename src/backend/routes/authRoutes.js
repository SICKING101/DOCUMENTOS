import express from 'express';
import User from '../models/User.js';
import { protegerRuta, enviarTokenRespuesta } from '../middleware/auth.js';
import {
  solicitarCodigoRecuperacion,
  verificarCodigoRecuperacion,
  cambiarContraseña,
  verificarTokenCambio,
  pruebaEmail,
  verifyPassword,
  estadoEmail
} from '../controllers/authController.js';
import crypto from 'crypto'; // AÑADIR ESTA IMPORTACIÓN

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
        const esPasswordValida = await user.comparePassword(password);

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
// RECUPERACIÓN DE CONTRASEÑA (Nuevo sistema con código de 6 dígitos)
// =============================================================================

// 1. Solicitar código de recuperación
router.post('/forgot-password', solicitarCodigoRecuperacion);

// 2. Verificar código de 6 dígitos
router.post('/verify-code', verificarCodigoRecuperacion);

// 3. Verificar token de cambio (para el frontend)
router.get('/verify-change-token/:token', verificarTokenCambio);

// 4. Cambiar contraseña con token
router.post('/reset-password', cambiarContraseña);

// =============================================================================
// PRUEBA DE EMAIL GMAIL REAL
// =============================================================================
router.post('/test-email', pruebaEmail);

// =============================================================================
// ESTADO DEL SISTEMA DE EMAIL GMAIL
// =============================================================================
router.get('/email-status', estadoEmail);

// =============================================================================
// ENDPOINT DE DIAGNÓSTICO COMPLETO
// =============================================================================
router.get('/diagnostic', async (req, res) => {
    try {
        const diagnostic = {
            server: {
                time: new Date().toISOString(),
                node_env: process.env.NODE_ENV,
                port: process.env.PORT
            },
            email: {
                EMAIL_USER: process.env.EMAIL_USER ? '✅ Definido' : '❌ No definido',
                EMAIL_PASS: process.env.EMAIL_PASS ? '✅ Definido' : '❌ No definido',
                EMAIL_HOST: process.env.EMAIL_HOST || 'No definido',
                EMAIL_PORT: process.env.EMAIL_PORT || 'No definido',
                EMAIL_FROM: process.env.EMAIL_FROM_ADDRESS || 'No definido'
            },
            database: {
                connected: true, // Asumiendo que MongoDB está conectado
                usersCount: await User.countDocuments()
            },
            endpoints: [
                { path: '/api/auth/forgot-password', method: 'POST', description: 'Solicitar código de recuperación' },
                { path: '/api/auth/verify-code', method: 'POST', description: 'Verificar código' },
                { path: '/api/auth/reset-password', method: 'POST', description: 'Cambiar contraseña' },
                { path: '/api/auth/test-email', method: 'POST', description: 'Probar email Gmail real' },
                { path: '/api/auth/email-status', method: 'GET', description: 'Estado del email Gmail' }
            ]
        };
        
        res.json({
            success: true,
            diagnostic,
            instructions: [
                '1. El sistema está configurado con Gmail real',
                '2. Usa /api/auth/test-email para probar el envío',
                '3. Revisa tu bandeja de entrada de Gmail',
                '4. Si no ves el email, revisa SPAM/Promociones',
                '5. Los códigos de recuperación llegarán a tu Gmail'
            ]
        });
    } catch (error) {
        console.error('Error en diagnóstico:', error);
        res.status(500).json({
            success: false,
            message: 'Error en diagnóstico',
            error: error.message
        });
    }
});

// =============================================================================
// NUEVO: REINICIAR CONFIGURACIÓN GMAIL
// =============================================================================
router.post('/restart-gmail', async (req, res) => {
    try {
        console.log('🔄 Solicitando reinicio de configuración Gmail...');
        
        // Importar dinámicamente para evitar circular dependencies
        const { reiniciarConfiguracionGmail } = await import('../controllers/authController.js');
        
        const resultado = await reiniciarConfiguracionGmail();
        
        if (resultado) {
            res.json({
                success: true,
                message: '✅ Configuración Gmail reiniciada exitosamente',
                note: 'Los próximos emails se enviarán por Gmail real'
            });
        } else {
            res.status(500).json({
                success: false,
                message: '❌ Error al reiniciar configuración Gmail'
            });
        }
    } catch (error) {
        console.error('Error reiniciando Gmail:', error);
        res.status(500).json({
            success: false,
            message: 'Error al reiniciar Gmail'
        });
    }
});

// =============================================================================
// CAMBIO DE ADMINISTRADOR (mantener existente)
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
                success: false,
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

router.post('/verify-password', protegerRuta, verifyPassword);

export default router;