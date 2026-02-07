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

const router = express.Router();

// ============================================================================
// SECCIÓN: RUTAS DE AUTENTICACIÓN Y AUTORIZACIÓN
// ============================================================================
// Este archivo define todas las rutas relacionadas con autenticación de
// usuarios, gestión de sesiones, recuperación de contraseñas y administración
// de cuentas. Incluye flujos completos para registro, login, logout, y
// transferencia de privilegios administrativos.
// ============================================================================

// ********************************************************************
// MÓDULO 1: VERIFICACIÓN DE ESTADO DEL SISTEMA
// ********************************************************************
// Descripción: Endpoints para diagnosticar y verificar el estado inicial
// del sistema, particularmente la existencia de administradores registrados
// que determina si se permite el registro inicial o no.
// ********************************************************************

// ----------------------------------------------------------------
// BLOQUE 1.1: Verificar existencia de administrador en el sistema
// ----------------------------------------------------------------
// Determina si ya existe al menos un usuario con rol de administrador.
// Utilizado por el frontend para decidir mostrar formulario de registro
// inicial o de login normal.
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

// ********************************************************************
// MÓDULO 2: REGISTRO INICIAL DE ADMINISTRADOR
// ********************************************************************
// Descripción: Endpoint exclusivo para registrar el primer administrador
// del sistema. Solo disponible cuando no existen usuarios en la base de datos.
// Este endpoint se bloquea automáticamente después del primer registro.
// ********************************************************************

// ----------------------------------------------------------------
// BLOQUE 2.1: Registro del primer administrador del sistema
// ----------------------------------------------------------------
// Crea la cuenta inicial de administrador con privilegios completos.
// Solo funciona cuando la base de datos está vacía (User.countDocuments() == 0).
router.post('/register', async (req, res) => {
    try {
        const { usuario, correo, password } = req.body;

        // ------------------------------------------------------------
        // SUB-BLOQUE 2.1.1: Validación de sistema vacío
        // ------------------------------------------------------------
        // Verifica que no existan usuarios previos para prevenir
        // registro múltiple de administradores iniciales.
        const existeAdmin = await User.countDocuments();
        if (existeAdmin > 0) {
            return res.status(400).json({
                success: false,
                message: 'Ya existe un administrador registrado'
            });
        }

        // ------------------------------------------------------------
        // SUB-BLOQUE 2.1.2: Validación de campos requeridos
        // ------------------------------------------------------------
        if (!usuario || !correo || !password) {
            return res.status(400).json({
                success: false,
                message: 'Por favor proporciona todos los campos requeridos'
            });
        }

        // ------------------------------------------------------------
        // SUB-BLOQUE 2.1.3: Creación del usuario administrador
        // ------------------------------------------------------------
        // Crea el usuario con rol 'administrador' por defecto
        // (definido en el esquema pero explícito aquí para claridad).
        const user = await User.create({
            usuario,
            correo,
            password,
            rol: 'administrador'
        });

        console.log('✅ Administrador registrado:', usuario);

        // ------------------------------------------------------------
        // SUB-BLOQUE 2.1.4: Respuesta con autenticación automática
        // ------------------------------------------------------------
        // Envía token JWT y cookie de sesión automáticamente después
        // del registro exitoso para iniciar sesión inmediatamente.
        enviarTokenRespuesta(user, 201, res, 'Administrador registrado exitosamente');
    } catch (error) {
        console.error('Error al registrar admin:', error);

        // ------------------------------------------------------------
        // SUB-BLOQUE 2.1.5: Manejo de errores específicos
        // ------------------------------------------------------------
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

// ********************************************************************
// MÓDULO 3: AUTENTICACIÓN DE SESIÓN
// ********************************************************************
// Descripción: Endpoints para inicio y cierre de sesión, autenticación
// con credenciales y mantenimiento de estado de sesión mediante JWT.
// ********************************************************************

// ----------------------------------------------------------------
// BLOQUE 3.1: Inicio de sesión con usuario o correo
// ----------------------------------------------------------------
// Permite autenticarse usando tanto nombre de usuario como dirección
// de correo electrónico, proporcionando flexibilidad al usuario.
router.post('/login', async (req, res) => {
    try {
        const { usuarioOCorreo, password } = req.body;

        // ------------------------------------------------------------
        // SUB-BLOQUE 3.1.1: Validación básica de credenciales
        // ------------------------------------------------------------
        if (!usuarioOCorreo || !password) {
            return res.status(400).json({
                success: false,
                message: 'Por favor proporciona usuario/correo y contraseña'
            });
        }

        // ------------------------------------------------------------
        // SUB-BLOQUE 3.1.2: Búsqueda flexible por usuario o correo
        // ------------------------------------------------------------
        // Busca usuario que coincida con cualquiera de los dos campos
        // y selecciona explícitamente el campo password (normalmente excluido).
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

        // ------------------------------------------------------------
        // SUB-BLOQUE 3.1.3: Verificación de contraseña encriptada
        // ------------------------------------------------------------
        const esPasswordValida = await user.compararPassword(password);

        if (!esPasswordValida) {
            return res.status(401).json({
                success: false,
                message: 'Credenciales inválidas'
            });
        }

        // ------------------------------------------------------------
        // SUB-BLOQUE 3.1.4: Validación de estado de cuenta activa
        // ------------------------------------------------------------
        if (!user.activo) {
            return res.status(401).json({
                success: false,
                message: 'Usuario desactivado'
            });
        }

        console.log('✅ Login exitoso:', user.usuario);

        // ------------------------------------------------------------
        // SUB-BLOQUE 3.1.5: Respuesta con token de sesión
        // ------------------------------------------------------------
        enviarTokenRespuesta(user, 200, res, 'Inicio de sesión exitoso');
    } catch (error) {
        console.error('Error al iniciar sesión:', error);
        res.status(500).json({
            success: false,
            message: 'Error al iniciar sesión'
        });
    }
});

// ----------------------------------------------------------------
// BLOQUE 3.2: Cierre de sesión con invalidación de cookie
// ----------------------------------------------------------------
// Invalida la cookie de sesión estableciendo una fecha de expiración
// pasada y un valor vacío, forzando al cliente a reautenticarse.
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

// ----------------------------------------------------------------
// BLOQUE 3.3: Obtención de información del usuario autenticado
// ----------------------------------------------------------------
// Retorna información del usuario actualmente autenticado basado en
// el token JWT presente en la cookie o header de autorización.
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

// ********************************************************************
// MÓDULO 4: RECUPERACIÓN DE CONTRASEÑA (FLUJO DE 3 PASOS)
// ********************************************************************
// Descripción: Flujo completo de recuperación de contraseña que utiliza
// código de 6 dígitos por email + token seguro para cambio final.
// Este diseño mejora la seguridad sobre los sistemas tradicionales.
// ********************************************************************

// ----------------------------------------------------------------
// BLOQUE 4.1: Paso 1 - Solicitar código de recuperación por email
// ----------------------------------------------------------------
// Genera y envía un código numérico de 6 dígitos al email del usuario
// para verificación inicial de identidad.
router.post('/forgot-password', solicitarCodigoRecuperacion);

// ----------------------------------------------------------------
// BLOQUE 4.2: Paso 2 - Verificar código de 6 dígitos recibido
// ----------------------------------------------------------------
// Valida el código ingresado por el usuario y, si es correcto,
// genera un token seguro para el cambio de contraseña real.
router.post('/verify-code', verificarCodigoRecuperacion);

// ----------------------------------------------------------------
// BLOQUE 4.3: Paso 2b - Verificar token de cambio (para frontend)
// ----------------------------------------------------------------
// Permite al frontend validar que un token de cambio sigue siendo
// válido antes de mostrar el formulario de nueva contraseña.
router.get('/verify-change-token/:token', verificarTokenCambio);

// ----------------------------------------------------------------
// BLOQUE 4.4: Paso 3 - Cambiar contraseña usando token válido
// ----------------------------------------------------------------
// Realiza el cambio real de contraseña usando el token seguro
// generado después de la verificación exitosa del código.
router.post('/reset-password', cambiarContraseña);

// ********************************************************************
// MÓDULO 5: PRUEBAS Y DIAGNÓSTICO DEL SISTEMA DE EMAIL
// ********************************************************************
// Descripción: Endpoints para probar, diagnosticar y monitorear el
// sistema de envío de emails (Gmail) usado para notificaciones y
// recuperación de contraseñas.
// ********************************************************************

// ----------------------------------------------------------------
// BLOQUE 5.1: Prueba de envío de email Gmail real
// ----------------------------------------------------------------
// Envía un email de prueba a una dirección especificada para verificar
// que la configuración de Gmail funciona correctamente.
router.post('/test-email', pruebaEmail);

// ----------------------------------------------------------------
// BLOQUE 5.2: Estado del sistema de email Gmail
// ----------------------------------------------------------------
// Proporciona información detallada sobre la configuración actual
// del sistema de email y su estado operativo.
router.get('/email-status', estadoEmail);

// ----------------------------------------------------------------
// BLOQUE 5.3: Diagnóstico completo del sistema de autenticación
// ----------------------------------------------------------------
// Endpoint de diagnóstico que revisa todos los componentes del
// sistema de autenticación: servidor, email, base de datos y endpoints.
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

// ----------------------------------------------------------------
// BLOQUE 5.4: Reinicio de configuración Gmail
// ----------------------------------------------------------------
// Restablece la configuración del sistema de email a valores por
// defecto o reintenta la conexión con Gmail.
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

// ********************************************************************
// MÓDULO 6: TRANSFERENCIA DE PRIVILEGIOS ADMINISTRATIVOS
// ********************************************************************
// Descripción: Flujo para transferir privilegios de administrador de
// un usuario a otro, incluyendo solicitud, confirmación por email y
// ejecución de la transferencia con validaciones de seguridad.
// ********************************************************************

// ----------------------------------------------------------------
// BLOQUE 6.1: Solicitud de cambio de administrador
// ----------------------------------------------------------------
// Inicia el proceso de transferencia generando un token seguro y
// enviando un email de confirmación al administrador actual.
router.post('/request-admin-change', protegerRuta, async (req, res) => {
    try {
        const { solicitante } = req.body;
        const adminActual = req.user;

        // ------------------------------------------------------------
        // SUB-BLOQUE 6.1.1: Generación de token de transferencia
        // ------------------------------------------------------------
        const changeToken = adminActual.generarTokenCambioAdmin();
        await adminActual.save({ validateBeforeSave: false });

        // ------------------------------------------------------------
        // SUB-BLOQUE 6.1.2: Envío de email de confirmación
        // ------------------------------------------------------------
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
            // --------------------------------------------------------
            // SUB-BLOQUE 6.1.3: Rollback en caso de error de email
            // --------------------------------------------------------
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

// ----------------------------------------------------------------
// BLOQUE 6.2: Confirmación o rechazo de cambio de administrador
// ----------------------------------------------------------------
// Procesa la respuesta del administrador actual (confirmar o rechazar)
// mediante un token seguro enviado por email.
router.get('/confirm-admin-change/:token', async (req, res) => {
    try {
        const { action } = req.query;

        // ------------------------------------------------------------
        // SUB-BLOQUE 6.2.1: Hash del token para comparación segura
        // ------------------------------------------------------------
        const changeAdminToken = crypto
            .createHash('sha256')
            .update(req.params.token)
            .digest('hex');

        // ------------------------------------------------------------
        // SUB-BLOQUE 6.2.2: Búsqueda de usuario con token válido
        // ------------------------------------------------------------
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

        // ------------------------------------------------------------
        // SUB-BLOQUE 6.2.3: Procesamiento de rechazo (action=deny)
        // ------------------------------------------------------------
        if (action === 'deny') {
            user.changeAdminToken = undefined;
            user.changeAdminExpires = undefined;
            await user.save({ validateBeforeSave: false });

            return res.json({
                success: true,
                message: 'Solicitud de cambio rechazada'
            });
        }

        // ------------------------------------------------------------
        // SUB-BLOQUE 6.2.4: Procesamiento de confirmación (action=confirm)
        // ------------------------------------------------------------
        if (action === 'confirm') {
            // Eliminación del administrador actual
            await User.deleteOne({ _id: user._id });

            console.log('✅ Cambio de administrador confirmado y ejecutado');

            return res.json({
                success: false,
                message: 'Cambio de administrador autorizado. Ahora puedes registrar un nuevo administrador.',
                redirect: '/register'
            });
        }

        // ------------------------------------------------------------
        // SUB-BLOQUE 6.2.5: Respuesta para acción inválida
        // ------------------------------------------------------------
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

// ********************************************************************
// MÓDULO 7: VERIFICACIÓN ADICIONAL DE SEGURIDAD
// ********************************************************************
// Descripción: Endpoints para verificaciones de seguridad adicionales,
// como confirmación de contraseña actual antes de operaciones sensibles.
// ********************************************************************

// ----------------------------------------------------------------
// BLOQUE 7.1: Verificación de contraseña actual
// ----------------------------------------------------------------
// Valida que el usuario conozca su contraseña actual antes de permitir
// operaciones sensibles como cambio de email o eliminación de cuenta.
router.post('/verify-password', protegerRuta, verifyPassword);

// ********************************************************************
// MÓDULO 8: EXPORTACIÓN DEL ROUTER
// ********************************************************************
// Descripción: Exporta el router configurado con todas las rutas de
// autenticación para su montaje en la aplicación principal de Express.
// ********************************************************************
export default router;