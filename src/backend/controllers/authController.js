import User from '../models/User.js';
import crypto from 'crypto';
import AuditService from '../services/auditService.js';
import emailService from '../services/emailService.js';

// ELIMINADO TODO EL CÓDIGO DE NODEMAILER Y GMAIL
// ELIMINADA LA CONFIGURACIÓN DE TRANSPORTER
// ELIMINADA LA FUNCIÓN enviarEmailGmail

// =============================================================================
// FUNCIONES AUXILIARES
// =============================================================================

const generarCodigoVerificacion = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
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