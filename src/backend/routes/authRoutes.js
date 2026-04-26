// authRoutes.js - Rutas de autenticación y gestión de usuarios

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
import crypto from 'crypto';
import { loginSuperAdmin, setSuperAdminCookie } from '../middleware/superAdminAuth.js';

const router = express.Router();

// =============================================================================
// NOTA: loginSuperAdmin y setSuperAdminCookie YA ESTÁN IMPORTADOS arriba (línea 24)
// NO los vuelvas a importar dentro del archivo
// =============================================================================

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
// INICIAR SESIÓN - AHORA CON SOPORTE PARA SUPERADMIN
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

        // =============================================================
        // PASO 1: Verificar si es SUPERADMIN (credenciales del .env)
        // =============================================================
        const superAdminResult = loginSuperAdmin(usuarioOCorreo, password);
        
        if (superAdminResult.success) {
            console.log('🛡️ SUPERADMIN login exitoso:', usuarioOCorreo);
            
            // Configurar cookie especial para superadmin
            setSuperAdminCookie(res, superAdminResult.token);
            
            // No guardar en auditoría de usuarios normales
            console.log('✅ Superadmin autenticado - No se registra en auditoría de usuarios');
            
            return res.json({
                success: true,
                message: 'Acceso de Super Administrador',
                token: superAdminResult.token,
                user: {
                    id: 'superadmin',
                    usuario: usuarioOCorreo,
                    correo: process.env.SUPER_ADMIN_EMAIL || 'superadmin@system.com',
                    rol: 'superadmin',
                    isSuperAdmin: true
                }
            });
        }

        // =============================================================
        // PASO 2: Si no es superadmin, buscar en BD (usuario normal)
        // =============================================================
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

        console.log('✅ Login exitoso (usuario normal):', user.usuario);

        // Enviar token normal
        enviarTokenRespuesta(user, 200, res, 'Inicio de sesión exitoso', req);
        
    } catch (error) {
        console.error('Error al iniciar sesión:', error);
        res.status(500).json({
            success: false,
            message: 'Error al iniciar sesión'
        });
    }
});

// =============================================================================
// CERRAR SESIÓN (limpia ambas cookies)
// =============================================================================
router.post('/logout', (req, res) => {
    // Limpiar cookie normal
    res.cookie('token', 'none', {
        expires: new Date(Date.now() + 10 * 1000),
        httpOnly: true,
        path: '/'
    });
    
    // Limpiar cookie de superadmin
    res.cookie('superadmin_token', 'none', {
        expires: new Date(Date.now() + 10 * 1000),
        httpOnly: true,
        path: '/'
    });

    console.log('🔓 Sesión cerrada - Cookies limpiadas');
    
    res.json({
        success: true,
        message: 'Sesión cerrada exitosamente'
    });
});

// =============================================================================
// OBTENER USUARIO ACTUAL (maneja tanto superadmin como usuarios normales)
// =============================================================================
router.get('/me', protegerRuta, async (req, res) => {
    try {
        if (req.user?.isSuperAdmin) {
            return res.json({
                success: true,
                user: {
                    id: 'superadmin',
                    usuario: req.user.usuario,
                    correo: req.user.correo,
                    rol: 'superadmin',
                    schoolId: null,  // 🆕
                    isSuperAdmin: true
                }
            });
        }
        
        const user = await User.findById(req.user.id);
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }

        res.json({
            success: true,
            user: {
                id: user._id,
                usuario: user.usuario,
                correo: user.correo,
                rol: user.rol,
                schoolId: user.schoolId,  // 🆕
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
                connected: true,
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
// CAMBIO DE ADMINISTRADOR
// =============================================================================
router.post('/request-admin-change', protegerRuta, async (req, res) => {
    try {
        // Si es superadmin, no permitir cambio
        if (req.user?.isSuperAdmin) {
            return res.status(403).json({
                success: false,
                message: 'El Super Administrador no puede ser cambiado'
            });
        }
        
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

        const changeAdminToken = crypto
            .createHash('sha256')
            .update(req.params.token)
            .digest('hex');

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
            user.changeAdminToken = undefined;
            user.changeAdminExpires = undefined;
            await user.save({ validateBeforeSave: false });

            return res.json({
                success: true,
                message: 'Solicitud de cambio rechazada'
            });
        }

        if (action === 'confirm') {
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