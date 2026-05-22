// src/backend/controllers/authController.js
// Agregar esta función de login COMPLETA al archivo

import User from '../models/User.js';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import AuditService from '../services/auditService.js';
import emailService from '../services/emailService.js';
import SystemState from '../models/SystemState.js'; // <-- NUEVO IMPORT

// =============================================================================
// FUNCIONES AUXILIARES
// =============================================================================

const generarCodigoVerificacion = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

// =============================================================================
// LOGIN DE USUARIO (COMPLETO - CON VERIFICACIÓN DE SISTEMA CERRADO)
// =============================================================================
export const login = async (req, res) => {
    try {
        console.log('\n🔐 ========== INTENTO DE LOGIN ==========');
        
        const { usuarioOCorreo, password } = req.body;

        if (!usuarioOCorreo || !password) {
            console.log('⚠️ Campos incompletos');
            return res.status(400).json({
                success: false,
                message: 'Usuario/correo y contraseña son requeridos.'
            });
        }

        console.log(`👤 Intento de login: ${usuarioOCorreo}`);

        // Buscar usuario por correo o nombre de usuario
        const user = await User.findOne({
            $or: [
                { correo: usuarioOCorreo.toLowerCase() },
                { usuario: usuarioOCorreo }
            ],
            activo: true
        }).select('+password');

        if (!user) {
            console.log('❌ Usuario no encontrado');
            
            await AuditService.log(req, {
                action: 'LOGIN_ATTEMPT',
                actionType: 'READ',
                actionCategory: 'AUTH',
                targetId: null,
                targetModel: 'User',
                description: `Intento de login fallido - Usuario no encontrado: ${usuarioOCorreo}`,
                severity: 'WARNING',
                status: 'FAILED',
                metadata: { usuarioOCorreo, motivo: 'user_not_found' }
            }).catch(err => console.error('❌ Error en auditoría:', err.message));
            
            return res.status(401).json({
                success: false,
                message: 'Credenciales inválidas.'
            });
        }

        // Verificar contraseña
        const passwordValido = await user.compararPassword(password);
        
        if (!passwordValido) {
            console.log('❌ Contraseña incorrecta');
            
            await AuditService.log(req, {
                action: 'LOGIN_ATTEMPT',
                actionType: 'READ',
                actionCategory: 'AUTH',
                targetId: user._id,
                targetModel: 'User',
                targetName: user.usuario,
                description: `Intento de login fallido - Contraseña incorrecta`,
                severity: 'WARNING',
                status: 'FAILED',
                metadata: { usuarioOCorreo, motivo: 'wrong_password' }
            }).catch(err => console.error('❌ Error en auditoría:', err.message));
            
            return res.status(401).json({
                success: false,
                message: 'Credenciales inválidas.'
            });
        }

// ═══════════════════════════════════════════════════════════════
// VERIFICAR SI EL SISTEMA ESTÁ CERRADO (SOLO PARA NO-SUPERADMINS)
// ═══════════════════════════════════════════════════════════════
if (user.rol !== 'superadmin') {
    const systemState = await SystemState.getInstance();

    // 1. Verificar cierre global (BLOQUEA A TODOS)
    if (systemState.currentState.isClosed) {
        return res.status(503).json({
            success: false,
            accessDenied: true,
            type: 'system_closed',
            message: 'El sistema está temporalmente cerrado.',
            reason: systemState.currentState.reason || 'Mantenimiento programado',
        });
    }

    // 2. Verificar cierre por escuela (BLOQUEA A ADMIN Y USUARIOS)
    if (user.schoolId) {
        const schoolClosure = systemState.currentState.closedSchools.find(
            s => s.schoolId === user.schoolId
        );

        if (schoolClosure) {
            return res.status(503).json({
                success: false,
                accessDenied: true,
                type: 'school_closed',
                message: 'El acceso para tu escuela está temporalmente suspendido.',
                reason: schoolClosure.reason || 'Sin motivo especificado',
                schoolId: user.schoolId,
            });
        }
    }
}
        // ═══════════════════════════════════════════════════════════════

        // Actualizar último acceso
        user.ultimoAcceso = new Date();
        await user.save({ validateBeforeSave: false });

        // Generar JWT
        const token = jwt.sign(
            {
                id: user._id,
                usuario: user.usuario,
                correo: user.correo,
                rol: user.rol,
                schoolId: user.schoolId,
                isSuperAdmin: user.rol === 'superadmin'
            },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        console.log(`✅ Login exitoso: ${user.usuario} (${user.rol})`);

        await AuditService.log(req, {
            action: 'LOGIN_SUCCESS',
            actionType: 'READ',
            actionCategory: 'AUTH',
            targetId: user._id,
            targetModel: 'User',
            targetName: user.usuario,
            description: `Login exitoso`,
            severity: 'INFO',
            status: 'SUCCESS',
            metadata: { 
                rol: user.rol,
                schoolId: user.schoolId,
                isSuperAdmin: user.rol === 'superadmin'
            }
        }).catch(err => console.error('❌ Error en auditoría:', err.message));

        // Respuesta exitosa
        res.json({
            success: true,
            message: 'Inicio de sesión exitoso',
            token,
            user: {
                id: user._id,
                usuario: user.usuario,
                correo: user.correo,
                rol: user.rol,
                nombre: user.nombre || user.usuario,
                schoolId: user.schoolId,
                isSuperAdmin: user.rol === 'superadmin'
            }
        });

    } catch (error) {
        console.error('🔥 ERROR en login:', error);
        res.status(500).json({
            success: false,
            message: 'Error del servidor al iniciar sesión.'
        });
    }
};

// =============================================================================
// SOLICITAR CÓDIGO DE RECUPERACIÓN
// =============================================================================
export const solicitarCodigoRecuperacion = async (req, res) => {
    try {
        console.log('\n📧 ========== SOLICITUD DE RECUPERACIÓN ==========');
        
        const { correo } = req.body;

        if (!correo) {
            return res.status(400).json({
                success: false,
                message: 'Por favor proporciona tu correo electrónico'
            });
        }

        const user = await User.findOne({ correo });

        if (!user) {
            console.log('⚠️ Correo no registrado');
            await AuditService.log(req, {
                action: 'PASSWORD_RESET_REQUEST',
                actionType: 'CREATE',
                actionCategory: 'AUTH',
                targetId: null,
                targetModel: 'User',
                description: `Intento de recuperación para correo no registrado: ${correo}`,
                severity: 'INFO',
                status: 'FAILED',
                metadata: { correo, reason: 'user_not_found' }
            }).catch(err => console.error('❌ Error en auditoría:', err.message));
            
            return res.json({
                success: true,
                message: 'Si el correo existe, recibirás un código de verificación'
            });
        }

        // Generar código y hash
        const codigo = generarCodigoVerificacion();
        const hash = crypto.createHash('sha256').update(codigo).digest('hex');

        // Guardar en BD
        user.resetPasswordToken = hash;
        user.resetPasswordExpires = Date.now() + 15 * 60 * 1000;
        await user.save({ validateBeforeSave: false });

        console.log(`✅ Código generado para: ${user.usuario}`);

        // ========== ENVIAR EMAIL USANDO SERVICIO CENTRALIZADO (BREVO) ==========
        try {
            await emailService.sendPasswordResetCode(user.correo, codigo, user.usuario);
            console.log('✅ Email enviado exitosamente vía Brevo');
            
            await AuditService.log(req, {
                action: 'PASSWORD_RESET_REQUEST',
                actionType: 'CREATE',
                actionCategory: 'AUTH',
                targetId: user._id,
                targetModel: 'User',
                targetName: user.usuario,
                description: `Solicitud de recuperación de contraseña`,
                severity: 'INFO',
                status: 'SUCCESS',
                metadata: { emailEnviado: true }
            }).catch(err => console.error('❌ Error en auditoría:', err.message));
            
            res.json({
                success: true,
                message: '✅ Código de verificación enviado a tu correo',
                correo: user.correo,
                userId: user._id
            });
            
        } catch (emailError) {
            console.error('❌ Error enviando email:', emailError.message);
            
            // Mostrar código en consola como respaldo
            emailService.showCodeInConsole(user.correo, codigo);
            
            await AuditService.log(req, {
                action: 'PASSWORD_RESET_REQUEST',
                actionType: 'CREATE',
                actionCategory: 'AUTH',
                targetId: user._id,
                targetModel: 'User',
                targetName: user.usuario,
                description: `Solicitud de recuperación - Error al enviar email`,
                severity: 'WARNING',
                status: 'PARTIAL',
                metadata: { emailEnviado: false, error: emailError.message }
            }).catch(err => console.error('❌ Error en auditoría:', err.message));
            
            res.json({
                success: true,
                message: '⚠️ Error al enviar email. Usa el código de la consola del servidor.',
                codigo: codigo,
                correo: user.correo,
                userId: user._id
            });
        }
        
    } catch (error) {
        console.error('🔥 ERROR en solicitarCodigoRecuperacion:', error);
        res.status(500).json({
            success: false,
            message: 'Error del servidor al procesar solicitud'
        });
    }
};

// =============================================================================
// VERIFICAR CÓDIGO DE RECUPERACIÓN
// =============================================================================
export const verificarCodigoRecuperacion = async (req, res) => {
    try {
        console.log('');
        console.log('🔐 ========== VERIFICACIÓN DE CÓDIGO ==========');
        
        const { correo, codigo } = req.body;

        if (!correo || !codigo) {
            return res.status(400).json({
                success: false,
                message: 'Correo y código son requeridos'
            });
        }

        const resetPasswordToken = crypto
            .createHash('sha256')
            .update(codigo)
            .digest('hex');

        const user = await User.findOne({
            correo,
            resetPasswordToken,
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!user) {
            await AuditService.log(req, {
                action: 'PASSWORD_RESET_VERIFY',
                actionType: 'READ',
                actionCategory: 'AUTH',
                targetId: null,
                targetModel: 'User',
                targetName: 'Desconocido',
                description: `Intento fallido de verificación`,
                severity: 'WARNING',
                status: 'FAILED',
                metadata: { correo }
            }).catch(err => console.error('❌ Error en auditoría:', err.message));
            
            return res.status(400).json({
                success: false,
                message: 'Código inválido o expirado'
            });
        }

        // Generar token temporal para cambiar contraseña
        const tokenTemporal = crypto.randomBytes(32).toString('hex');
        const changePasswordToken = crypto
            .createHash('sha256')
            .update(tokenTemporal)
            .digest('hex');
        
        user.changePasswordToken = changePasswordToken;
        user.changePasswordExpires = Date.now() + 30 * 60 * 1000;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        
        await user.save({ validateBeforeSave: false });

        await AuditService.log(req, {
            action: 'PASSWORD_RESET_VERIFY',
            actionType: 'READ',
            actionCategory: 'AUTH',
            targetId: user._id,
            targetModel: 'User',
            targetName: user.usuario,
            description: `Código verificado correctamente`,
            severity: 'INFO',
            status: 'SUCCESS'
        }).catch(err => console.error('❌ Error en auditoría:', err.message));

        res.json({
            success: true,
            message: '✅ Código verificado correctamente',
            token: tokenTemporal,
            userId: user._id,
            usuario: user.usuario
        });
        
    } catch (error) {
        console.error('🔥 ERROR en verificarCodigoRecuperacion:', error);
        res.status(500).json({
            success: false,
            message: 'Error del servidor al verificar código'
        });
    }
};

// =============================================================================
// CAMBIAR CONTRASEÑA
// =============================================================================
export const cambiarContraseña = async (req, res) => {
    try {
        const { token, password } = req.body;

        if (!token || !password) {
            return res.status(400).json({
                success: false,
                message: 'Token y nueva contraseña son requeridos'
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'La contraseña debe tener al menos 6 caracteres'
            });
        }

        const changePasswordToken = crypto.createHash('sha256').update(token).digest('hex');

        const user = await User.findOne({
            changePasswordToken,
            changePasswordExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'Token inválido o expirado'
            });
        }

        user.password = password;
        user.changePasswordToken = undefined;
        user.changePasswordExpires = undefined;
        user.ultimoAcceso = Date.now();
        await user.save();

        // Enviar email de confirmación vía Brevo
        try {
            await emailService.sendPasswordChangeConfirmation(user.correo, user.usuario, {
                ip: req.ip || req.connection?.remoteAddress
            });
        } catch (emailError) {
            console.error('⚠️ Error enviando email de confirmación:', emailError.message);
        }

        await AuditService.log(req, {
            action: 'PASSWORD_CHANGE',
            actionType: 'UPDATE',
            actionCategory: 'AUTH',
            targetId: user._id,
            targetModel: 'User',
            targetName: user.usuario,
            description: `Contraseña cambiada exitosamente`,
            severity: 'WARNING',
            status: 'SUCCESS'
        }).catch(err => console.error('❌ Error en auditoría:', err.message));

        res.json({
            success: true,
            message: '✅ Contraseña cambiada exitosamente',
            usuario: user.usuario
        });

    } catch (error) {
        console.error('🔥 ERROR en cambiarContraseña:', error);
        res.status(500).json({
            success: false,
            message: 'Error del servidor al cambiar contraseña'
        });
    }
};

// =============================================================================
// VERIFICAR CONTRASEÑA ACTUAL
// =============================================================================
export const verifyPassword = async (req, res) => {
    try {
        const { password } = req.body;
        const userId = req.user.id;

        if (!password) {
            return res.status(400).json({
                success: false,
                message: 'La contraseña es requerida'
            });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }

        const isValid = await user.compararPassword(password);

        if (!isValid) {
            await AuditService.log(req, {
                action: 'PASSWORD_VERIFY',
                actionType: 'READ',
                actionCategory: 'AUTH',
                targetId: user._id,
                targetModel: 'User',
                targetName: user.usuario,
                description: `Intento fallido de verificación`,
                severity: 'WARNING',
                status: 'FAILED'
            }).catch(err => console.error('❌ Error en auditoría:', err.message));

            return res.status(400).json({
                success: false,
                message: 'Contraseña actual incorrecta'
            });
        }

        await AuditService.log(req, {
            action: 'PASSWORD_VERIFY',
            actionType: 'READ',
            actionCategory: 'AUTH',
            targetId: user._id,
            targetModel: 'User',
            targetName: user.usuario,
            description: `Verificación exitosa`,
            severity: 'INFO',
            status: 'SUCCESS'
        }).catch(err => console.error('❌ Error en auditoría:', err.message));

        res.json({
            success: true,
            message: 'Contraseña verificada correctamente',
            usuario: user.usuario
        });

    } catch (error) {
        console.error('🔥 ERROR en verifyPassword:', error);
        res.status(500).json({
            success: false,
            message: 'Error del servidor al verificar contraseña'
        });
    }
};

// =============================================================================
// VERIFICAR TOKEN DE CAMBIO
// =============================================================================
export const verificarTokenCambio = async (req, res) => {
    try {
        const { token } = req.params;

        if (!token) {
            return res.status(400).json({
                success: false,
                message: 'Token requerido'
            });
        }

        const changePasswordToken = crypto
            .createHash('sha256')
            .update(token)
            .digest('hex');

        const user = await User.findOne({
            changePasswordToken,
            changePasswordExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'Token inválido o expirado'
            });
        }

        res.json({
            success: true,
            message: 'Token válido',
            userId: user._id,
            usuario: user.usuario,
            correo: user.correo
        });

    } catch (error) {
        console.error('🔥 ERROR en verificarTokenCambio:', error);
        res.status(500).json({
            success: false,
            message: 'Error del servidor al verificar token'
        });
    }
};

// =============================================================================
// PRUEBA DE EMAIL
// =============================================================================
export const pruebaEmail = async (req, res) => {
    try {
        let emailDestino = req.body.email;
        let nombreAdmin = 'Administrador';

        if (!emailDestino) {
            const adminActual = await User.findOne({ rol: 'administrador', activo: true });
            if (adminActual) {
                emailDestino = adminActual.correo;
                nombreAdmin = adminActual.usuario;
            } else {
                emailDestino = emailService.config.from;
            }
        }

        const info = await emailService.sendTestEmail(emailDestino, nombreAdmin);
        
        await AuditService.log(req, {
            action: 'EMAIL_TEST',
            actionType: 'CREATE',
            actionCategory: 'SYSTEM',
            targetId: null,
            targetModel: 'System',
            description: `Prueba de email - Destino: ${emailDestino}`,
            severity: 'INFO',
            status: 'SUCCESS'
        }).catch(err => console.error('❌ Error en auditoría:', err.message));

        res.json({
            success: true,
            message: '✅ Email de prueba enviado exitosamente vía Brevo',
            destinatario: { email: emailDestino, nombre: nombreAdmin },
            info: info.simulated ? { simulated: true } : { messageId: info.messageId, provider: 'Brevo' }
        });
        
    } catch (error) {
        console.error('❌ ERROR en prueba de email:', error);
        res.status(500).json({
            success: false,
            message: '❌ Error al enviar email de prueba',
            error: error.message
        });
    }
};

// =============================================================================
// ESTADO DEL SISTEMA DE EMAIL
// =============================================================================
export const estadoEmail = async (req, res) => {
    try {
        const status = emailService.getStatus();
        const verification = await emailService.verifyConnection();
        
        res.json({
            success: true,
            estado: {
                provider: 'Brevo',
                ...status,
                conexion: verification.success ? '✅ CONECTADO' : `❌ ERROR: ${verification.message}`
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al obtener estado',
            error: error.message
        });
    }
};

// =============================================================================
// VERIFICAR SI EXISTE ADMIN (para primer registro)
// =============================================================================
export const checkAdminExists = async (req, res) => {
    try {
        const adminCount = await User.countDocuments({ 
            rol: 'administrador', 
            activo: true 
        });
        
        res.json({
            success: true,
            adminExists: adminCount > 0
        });
    } catch (error) {
        console.error('🔥 ERROR en checkAdminExists:', error);
        res.status(500).json({
            success: false,
            message: 'Error al verificar administrador'
        });
    }
};

// =============================================================================
// REGISTRO DEL PRIMER ADMINISTRADOR
// =============================================================================
export const registerFirstAdmin = async (req, res) => {
    try {
        const { usuario, correo, password } = req.body;

        // Verificar si ya existe un admin
        const adminExists = await User.countDocuments({ 
            rol: 'administrador', 
            activo: true 
        });

        if (adminExists > 0) {
            return res.status(400).json({
                success: false,
                message: 'Ya existe un administrador registrado.'
            });
        }

        // Validaciones básicas
        if (!usuario || !correo || !password) {
            return res.status(400).json({
                success: false,
                message: 'Todos los campos son requeridos.'
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'La contraseña debe tener al menos 6 caracteres.'
            });
        }

        // Verificar si el correo ya existe
        const existingEmail = await User.findOne({ correo: correo.toLowerCase() });
        if (existingEmail) {
            return res.status(400).json({
                success: false,
                message: 'El correo ya está registrado.'
            });
        }

        // Verificar si el usuario ya existe
        const existingUser = await User.findOne({ usuario });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'El nombre de usuario ya está en uso.'
            });
        }

        // Crear el administrador
        const newAdmin = new User({
            usuario,
            correo: correo.toLowerCase(),
            password,
            rol: 'administrador',
            activo: true,
            primerInicio: false
        });

        await newAdmin.save();

        // Generar token
        const token = jwt.sign(
            {
                id: newAdmin._id,
                usuario: newAdmin.usuario,
                correo: newAdmin.correo,
                rol: newAdmin.rol,
                isSuperAdmin: false
            },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        console.log(`✅ Primer administrador creado: ${usuario}`);

        await AuditService.log(req, {
            action: 'FIRST_ADMIN_REGISTER',
            actionType: 'CREATE',
            actionCategory: 'AUTH',
            targetId: newAdmin._id,
            targetModel: 'User',
            targetName: newAdmin.usuario,
            description: `Primer administrador registrado`,
            severity: 'INFO',
            status: 'SUCCESS'
        }).catch(err => console.error('❌ Error en auditoría:', err.message));

        res.status(201).json({
            success: true,
            message: 'Administrador registrado exitosamente',
            token,
            user: {
                id: newAdmin._id,
                usuario: newAdmin.usuario,
                correo: newAdmin.correo,
                rol: newAdmin.rol,
                isSuperAdmin: false
            }
        });

    } catch (error) {
        console.error('🔥 ERROR en registerFirstAdmin:', error);
        
        // Manejar error de duplicado
        if (error.code === 11000) {
            const field = Object.keys(error.keyPattern)[0];
            const messages = {
                correo: 'El correo ya está registrado.',
                usuario: 'El nombre de usuario ya está en uso.'
            };
            return res.status(400).json({
                success: false,
                message: messages[field] || 'Dato duplicado.'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Error del servidor al registrar administrador.'
        });
    }
};

// =============================================================================
// INICIALIZACIÓN FINAL
// =============================================================================
console.log('\n🚀 ========== SISTEMA CBTIS051 INICIADO ==========');
console.log(`📅 ${new Date().toLocaleString('es-MX')}`);

// Mostrar estado del email
try {
    const status = emailService.getStatus();
    console.log(`📧 Sistema de email: ${status.configured ? 'BREVO API ✅' : '⚠️ NO CONFIGURADO'}`);
    if (status.configured) {
        console.log(`   📨 Remitente: ${status.config.fromName} <${status.config.from}>`);
    } else {
        console.log(`   ⚠️ Configura BREVO_API_KEY en .env`);
    }
} catch (e) {
    console.log(`📧 Sistema de email: ❌ Error verificando`);
}

console.log('🚀 ==============================================\n');