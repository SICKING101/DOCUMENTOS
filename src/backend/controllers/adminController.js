import crypto from 'crypto';
import User from '../models/User.js';
import AdminChangeRequest from '../models/AdminChangeRequest.js';
import { transporter } from './authController.js';

// =============================================================================
// CONFIGURACIÓN
// =============================================================================
const emailFrom = 'riosnavarretejared@gmail.com';

console.log('\n🔐 ========== ADMIN CONTROLLER INICIALIZADO ==========');
console.log(`📧 Transporter: ${transporter ? '✅ CONFIGURADO' : '❌ NO CONFIGURADO'}`);
console.log('🔐 ====================================================\n');

// =============================================================================
// FUNCIONES AUXILIARES
// =============================================================================

const generateSecureToken = () => {
    return crypto.randomBytes(32).toString('hex');
};

const buildVerificationUrl = (token) => {
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:4000';
    return `${baseUrl}/verify-admin-change.html?token=${token}`;
};

const formatDateForEmail = (date) => {
    return new Date(date).toLocaleString('es-MX', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

const enviarEmailConReintentos = async (mailOptions, intentos = 3) => {
    if (!transporter) throw new Error('Transporter no disponible');

    for (let i = 0; i < intentos; i++) {
        try {
            console.log(`📤 Intento ${i + 1} enviando email...`);
            const info = await transporter.sendMail(mailOptions);
            console.log(`✅ Email enviado en intento ${i + 1}`);
            return info;
        } catch (error) {
            console.error(`❌ Intento ${i + 1} falló:`, error.message);
            if (i === intentos - 1) throw error;
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }
};

// =============================================================================
// 1. SOLICITAR CAMBIO DE ADMINISTRADOR (CORREGIDO)
// =============================================================================

export const requestAdminChange = async (req, res) => {
    console.log('🔐 ========== SOLICITUD CAMBIO ADMINISTRADOR ==========');
    
    try {
        const { 
            nuevoUsuario, 
            nuevoCorreo, 
            nuevaPassword,
            confirmarPassword 
        } = req.body;

        // Validaciones
        if (!nuevoUsuario || !nuevoCorreo || !nuevaPassword || !confirmarPassword) {
            return res.status(400).json({
                success: false,
                message: 'Todos los campos son requeridos'
            });
        }

        if (nuevaPassword !== confirmarPassword) {
            return res.status(400).json({
                success: false,
                message: 'Las contraseñas no coinciden'
            });
        }

        if (nuevaPassword.length < 8) {
            return res.status(400).json({
                success: false,
                message: 'La contraseña debe tener al menos 8 caracteres'
            });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(nuevoCorreo)) {
            return res.status(400).json({
                success: false,
                message: 'Correo electrónico inválido'
            });
        }

        // Obtener administrador actual
        const currentAdminId = req.user.id;
        const currentAdmin = await User.findById(currentAdminId);

        if (!currentAdmin) {
            return res.status(404).json({
                success: false,
                message: 'Administrador actual no encontrado'
            });
        }

        console.log(`👤 Administrador actual: ${currentAdmin.usuario}`);

        // Verificar que el nuevo correo no esté ya registrado
        const existingUser = await User.findOne({ correo: nuevoCorreo });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'Este correo ya está registrado en el sistema'
            });
        }

        // Verificar que el nuevo usuario no exista
        const existingUsername = await User.findOne({ usuario: nuevoUsuario });
        if (existingUsername) {
            return res.status(400).json({
                success: false,
                message: 'Este nombre de usuario ya está en uso'
            });
        }

        // Generar token de verificación
        const verificationToken = generateSecureToken();
        
        // Crear solicitud de cambio
        const adminChangeRequest = new AdminChangeRequest({
            currentAdminId: currentAdmin._id,
            currentAdminEmail: currentAdmin.correo,
            currentAdminName: currentAdmin.usuario,
            newAdminUser: nuevoUsuario,
            newAdminEmail: nuevoCorreo,
            newAdminPassword: nuevaPassword,
            verificationToken,
            tokenExpires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 horas
            status: 'pending',
            ipAddress: req.ip,
            userAgent: req.headers['user-agent']
        });

        // Encriptar contraseña del nuevo admin
        const bcrypt = await import('bcryptjs');
        const salt = await bcrypt.genSalt(10);
        adminChangeRequest.newAdminPassword = await bcrypt.hash(nuevaPassword, salt);

        await adminChangeRequest.save();

        console.log('✅ Solicitud de cambio creada:', {
            id: adminChangeRequest._id,
            currentAdmin: currentAdmin.correo,
            newAdmin: nuevoCorreo,
            expires: adminChangeRequest.tokenExpires
        });

        // =========================================================================
        // ENVIAR EMAIL DE CONFIRMACIÓN AL ADMIN ACTUAL (NO al nuevo admin)
        // =========================================================================
        
        if (!transporter) {
            console.error('❌ Transporter no disponible');
            adminChangeRequest.status = 'pending_no_email';
            await adminChangeRequest.save();
            
            return res.status(500).json({
                success: false,
                message: 'Error del sistema: servicio de email no disponible',
                requestId: adminChangeRequest._id,
                note: 'Contacta al administrador del sistema para continuar'
            });
        }

        const verificationUrl = buildVerificationUrl(verificationToken);

        const currentAdminEmailOptions = {
            from: `"Sistema CBTIS051 - Administración" <${emailFrom}>`,
            to: currentAdmin.correo,
            subject: '⚠️ Confirmación de Cambio de Administrador - CBTIS051',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8f9fa;">
                    <div style="background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); padding: 40px; text-align: center; border-radius: 15px 15px 0 0;">
                        <h1 style="color: white; margin: 0; font-size: 32px; font-weight: 700;">CONFIRMACIÓN REQUERIDA</h1>
                        <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0; font-size: 18px;">Cambio de Administrador - CBTIS051</p>
                    </div>
                    
                    <div style="padding: 40px; background: white; border-radius: 0 0 15px 15px; box-shadow: 0 10px 40px rgba(0,0,0,0.1);">
                        <div style="text-align: center; margin-bottom: 30px;">
                            <div style="display: inline-block; background: #fef3c7; padding: 20px; border-radius: 50%; margin-bottom: 20px;">
                                <i class="fas fa-user-shield" style="font-size: 48px; color: #d97706;"></i>
                            </div>
                            <h2 style="color: #1f2937; margin: 0 0 15px; font-size: 28px; font-weight: 700;">Confirma la Transferencia</h2>
                            <p style="color: #6b7280; font-size: 16px; line-height: 1.6;">
                                Has solicitado transferir la administración a otra persona. Confirma esta acción para completar el proceso.
                            </p>
                        </div>
                        
                        <div style="background: #f9fafb; padding: 25px; border-radius: 12px; margin-bottom: 30px; border-left: 5px solid #8b5cf6;">
                            <h3 style="color: #374151; margin: 0 0 15px; font-size: 20px;">📋 Detalles de la solicitud:</h3>
                            <table style="width: 100%; border-collapse: collapse;">
                                <tr>
                                    <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280;">👤 Nuevo administrador:</td>
                                    <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; color: #111827; font-weight: 600;">${nuevoUsuario}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280;">📧 Correo nuevo:</td>
                                    <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; color: #111827; font-weight: 600;">${nuevoCorreo}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280;">👨‍💼 Solicitado por:</td>
                                    <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; color: #111827; font-weight: 600;">${currentAdmin.usuario} (${currentAdmin.correo})</td>
                                </tr>
                                <tr>
                                    <td style="padding: 10px 0; color: #6b7280;">⏰ Expira en:</td>
                                    <td style="padding: 10px 0; color: #dc2626; font-weight: 600;">24 horas</td>
                                </tr>
                            </table>
                        </div>
                        
                        <div style="background: #fef3c7; padding: 20px; border-radius: 10px; margin-bottom: 30px; border: 2px solid #fbbf24;">
                            <h4 style="color: #92400e; margin: 0 0 10px; font-size: 18px; display: flex; align-items: center; gap: 10px;">
                                <i class="fas fa-exclamation-triangle"></i> ACCIÓN IRREVERSIBLE
                            </h4>
                            <p style="color: #92400e; margin: 0; font-size: 15px; line-height: 1.5;">
                                Al confirmar, tu cuenta será desactivada y ${nuevoUsuario} obtendrá control total del sistema. 
                                Esta acción <strong>NO SE PUEDE DESHACER</strong> automáticamente.
                            </p>
                        </div>
                        
                        <div style="text-align: center; margin: 40px 0;">
                            <a href="${verificationUrl}" 
                               style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); 
                                      color: white; padding: 18px 40px; text-decoration: none; border-radius: 12px; 
                                      font-weight: 700; font-size: 18px; transition: all 0.3s; box-shadow: 0 8px 25px rgba(16, 185, 129, 0.3);"
                               onmouseover="this.style.transform='translateY(-3px)'; this.style.boxShadow='0 12px 30px rgba(16, 185, 129, 0.4)';"
                               onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 8px 25px rgba(16, 185, 129, 0.3)';">
                                <i class="fas fa-shield-check"></i> CONFIRMAR TRANSFERENCIA
                            </a>
                            <p style="color: #9ca3af; margin-top: 15px; font-size: 14px;">
                                Este enlace expira en 24 horas | ID: ${adminChangeRequest._id}
                            </p>
                        </div>
                        
                        <div style="background: #f0f9ff; padding: 15px; border-radius: 8px; margin-top: 20px; border: 1px solid #dbeafe;">
                            <p style="color: #3b82f6; margin: 0; font-size: 14px; text-align: center;">
                                <i class="fas fa-info-circle"></i> Si no reconoces esta solicitud, simplemente ignora este correo.<br>
                                La solicitud expirará automáticamente en 24 horas.
                            </p>
                        </div>
                    </div>
                </div>
            `,
            text: `CONFIRMACIÓN DE CAMBIO DE ADMINISTRADOR - CBTIS051\n\nHas solicitado transferir la administración a otra persona.\n\n📋 DETALLES:\n- Nuevo administrador: ${nuevoUsuario}\n- Correo nuevo: ${nuevoCorreo}\n- Solicitado por: ${currentAdmin.usuario} (${currentAdmin.correo})\n- Expira en: 24 horas\n- ID de solicitud: ${adminChangeRequest._id}\n\n⚠️ ACCIÓN IRREVERSIBLE: Al confirmar, tu cuenta será desactivada y ${nuevoUsuario} obtendrá control total del sistema.\n\n🔗 CONFIRMAR: ${verificationUrl}\n\nSi no reconoces esta solicitud, ignora este correo. La solicitud expirará automáticamente.\n\n© ${new Date().getFullYear()} CBTIS051`
        };

        try {
            await enviarEmailConReintentos(currentAdminEmailOptions);
            console.log('✅ Email de confirmación enviado al admin actual');
            
            adminChangeRequest.notificationSent = true;
            await adminChangeRequest.save();
            
        } catch (emailError) {
            console.error('❌ Error enviando email:', emailError.message);
            
            adminChangeRequest.notificationSent = false;
            adminChangeRequest.emailError = emailError.message;
            await adminChangeRequest.save();
            
            // Modo desarrollo: mostrar el enlace en consola
            console.log('🔗 ENLACE PARA CONFIRMAR MANUALMENTE:', verificationUrl);
            
            return res.json({
                success: true,
                message: 'Solicitud creada (modo desarrollo - email falló)',
                requestId: adminChangeRequest._id,
                debugInfo: process.env.NODE_ENV === 'development' ? {
                    token: verificationToken,
                    url: verificationUrl,
                    error: emailError.message
                } : undefined,
                note: 'En producción, se requiere email funcionando'
            });
        }

        console.log('✅✅✅ SOLICITUD PROCESADA ✅✅✅');
        
        res.json({
            success: true,
            message: '✅ Solicitud de cambio enviada. Revisa tu correo para confirmar la transferencia.',
            requestId: adminChangeRequest._id,
            expiresAt: adminChangeRequest.tokenExpires,
            note: 'La solicitud expirará en 24 horas si no se confirma.'
        });

    } catch (error) {
        console.error('🔥 ERROR en requestAdminChange:', error);
        res.status(500).json({
            success: false,
            message: 'Error del servidor al procesar solicitud',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined,
            timestamp: new Date().toISOString()
        });
    }
};

// =============================================================================
// 2. VERIFICAR TOKEN DE CAMBIO (para el admin actual desde email)
// =============================================================================

export const verifyAdminChangeToken = async (req, res) => {
    console.log('🔐 ========== VERIFICACIÓN DE TOKEN ==========');
    
    try {
        const { token } = req.params;

        if (!token) {
            return res.status(400).json({
                success: false,
                message: 'Token requerido'
            });
        }

        console.log(`🔑 Token recibido: ${token.substring(0, 10)}...`);

        const changeRequest = await AdminChangeRequest.findOne({
            verificationToken: token,
            status: 'pending'
        });

        if (!changeRequest) {
            console.log('❌ Token no encontrado o ya procesado');
            return res.status(404).json({
                success: false,
                message: 'Token inválido o solicitud ya procesada'
            });
        }

        if (!changeRequest.isTokenValid()) {
            console.log('❌ Token expirado');
            changeRequest.status = 'expired';
            await changeRequest.save();
            
            return res.status(400).json({
                success: false,
                message: 'Token expirado o inválido'
            });
        }

        console.log('✅ Token válido encontrado');

        res.json({
            success: true,
            message: 'Token válido',
            requestData: {
                id: changeRequest._id,
                currentAdmin: {
                    name: changeRequest.currentAdminName,
                    email: changeRequest.currentAdminEmail
                },
                newAdmin: {
                    name: changeRequest.newAdminUser,
                    email: changeRequest.newAdminEmail
                },
                requestedAt: changeRequest.requestedAt,
                expiresAt: changeRequest.tokenExpires,
                remainingHours: Math.ceil((changeRequest.tokenExpires - new Date()) / (1000 * 60 * 60))
            },
            warning: '⚠️ Esta acción desactivará tu cuenta y transferirá la administración.'
        });

    } catch (error) {
        console.error('🔥 ERROR en verifyAdminChangeToken:', error);
        res.status(500).json({
            success: false,
            message: 'Error del servidor al verificar token',
            timestamp: new Date().toISOString()
        });
    }
};

// =============================================================================
// 3. CONFIRMAR CAMBIO DE ADMINISTRADOR (admin actual confirma)
// =============================================================================

export const confirmAdminChange = async (req, res) => {
    console.log('🔐 ========== CONFIRMACIÓN DE CAMBIO ==========');
    
    try {
        const { token, passwordConfirmation } = req.body;

        if (!token || !passwordConfirmation) {
            return res.status(400).json({
                success: false,
                message: 'Token y confirmación requeridos'
            });
        }

        console.log(`🔑 Token recibido: ${token.substring(0, 10)}...`);

        // Buscar solicitud
        const changeRequest = await AdminChangeRequest.findOne({
            verificationToken: token,
            status: 'pending'
        });

        if (!changeRequest) {
            console.log('❌ Solicitud no encontrada');
            return res.status(404).json({
                success: false,
                message: 'Solicitud no encontrada o ya procesada'
            });
        }

        if (!changeRequest.isTokenValid()) {
            console.log('❌ Token inválido o expirado');
            return res.status(400).json({
                success: false,
                message: 'Token inválido o expirado'
            });
        }

        console.log('✅ Token válido, procediendo con el cambio...');

        // =========================================================================
        // PASO 1: DESACTIVAR ADMINISTRADOR ACTUAL
        // =========================================================================
        const currentAdmin = await User.findById(changeRequest.currentAdminId);
        
        if (currentAdmin) {
            // Guardar datos de respaldo
            const backupData = {
                originalEmail: currentAdmin.correo,
                originalUsername: currentAdmin.usuario,
                deactivatedAt: new Date()
            };

            // Desactivar cuenta actual
            currentAdmin.correo = `old_${Date.now()}_${currentAdmin.correo}`;
            currentAdmin.usuario = `old_${Date.now()}_${currentAdmin.usuario}`;
            currentAdmin.activo = false;
            currentAdmin.rol = 'desactivado';
            
            currentAdmin.deactivationBackup = backupData;
            currentAdmin.deactivatedAt = new Date();
            
            await currentAdmin.save();
            console.log('✅ Administrador actual desactivado:', currentAdmin._id);
            
            changeRequest.oldAdminDeactivated = true;
        }

        // =========================================================================
        // PASO 2: CREAR NUEVO ADMINISTRADOR
        // =========================================================================
        const newAdmin = new User({
            usuario: changeRequest.newAdminUser,
            correo: changeRequest.newAdminEmail,
            password: changeRequest.newAdminPassword, // Ya encriptada
            rol: 'administrador',
            activo: true,
            ultimoAcceso: new Date()
        });

        await newAdmin.save();
        console.log('✅ Nuevo administrador creado:', newAdmin._id);
        
        changeRequest.newAdminCreated = true;
        changeRequest.newAdminId = newAdmin._id;

        // =========================================================================
        // PASO 3: MARCAR SOLICITUD COMO APROBADA
        // =========================================================================
        changeRequest.status = 'approved';
        changeRequest.approvedAt = new Date();
        await changeRequest.save();
        
        console.log('✅ Solicitud marcada como aprobada');

        // =========================================================================
        // PASO 4: ENVIAR EMAIL AL NUEVO ADMINISTRADOR (ahora sí)
        // =========================================================================
        if (transporter) {
            try {
                const newAdminEmailOptions = {
                    from: `"Sistema CBTIS051 - Administración" <${emailFrom}>`,
                    to: changeRequest.newAdminEmail,
                    subject: '✅ ¡Eres el nuevo Administrador! - CBTIS051',
                    html: `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8f9fa;">
                            <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px; text-align: center; border-radius: 15px 15px 0 0;">
                                <h1 style="color: white; margin: 0; font-size: 32px; font-weight: 700;">¡BIENVENIDO!</h1>
                                <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0; font-size: 18px;">Nuevo Administrador - CBTIS051</p>
                            </div>
                            
                            <div style="padding: 40px; background: white; border-radius: 0 0 15px 15px; box-shadow: 0 10px 40px rgba(0,0,0,0.1);">
                                <div style="text-align: center; margin-bottom: 30px;">
                                    <div style="display: inline-block; background: #d1fae5; padding: 25px; border-radius: 50%; margin-bottom: 20px;">
                                        <i class="fas fa-user-shield" style="font-size: 56px; color: #059669;"></i>
                                    </div>
                                    <h2 style="color: #1f2937; margin: 0 0 15px; font-size: 28px; font-weight: 700;">Administración Transferida</h2>
                                    <p style="color: #6b7280; font-size: 16px; line-height: 1.6;">
                                        ${changeRequest.currentAdminName} ha transferido la administración del sistema a tu cuenta.
                                    </p>
                                </div>
                                
                                <div style="background: #f0f9ff; padding: 25px; border-radius: 12px; margin-bottom: 30px; border-left: 5px solid #3b82f6;">
                                    <h3 style="color: #374151; margin: 0 0 15px; font-size: 20px;">📋 Tus credenciales:</h3>
                                    <table style="width: 100%; border-collapse: collapse;">
                                        <tr>
                                            <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280;">👤 Usuario:</td>
                                            <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; color: #111827; font-weight: 600;">${changeRequest.newAdminUser}</td>
                                        </tr>
                                        <tr>
                                            <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280;">📧 Correo:</td>
                                            <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; color: #111827; font-weight: 600;">${changeRequest.newAdminEmail}</td>
                                        </tr>
                                        <tr>
                                            <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280;">🔑 Contraseña:</td>
                                            <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; color: #111827; font-weight: 600;">La que estableciste en la solicitud</td>
                                        </tr>
                                    </table>
                                </div>
                                
                                <div style="background: #fef3c7; padding: 20px; border-radius: 10px; margin-bottom: 30px; border: 2px solid #fbbf24;">
                                    <h4 style="color: #92400e; margin: 0 0 10px; font-size: 18px; display: flex; align-items: center; gap: 10px;">
                                        <i class="fas fa-exclamation-triangle"></i> SEGURIDAD IMPORTANTE
                                    </h4>
                                    <p style="color: #92400e; margin: 0; font-size: 15px; line-height: 1.5;">
                                        <strong>Por seguridad, cambia tu contraseña inmediatamente después de iniciar sesión.</strong>
                                    </p>
                                </div>
                                
                                <div style="text-align: center; margin: 40px 0;">
                                    <a href="${process.env.FRONTEND_URL || 'http://localhost:4000'}/login.html" 
                                       style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); 
                                              color: white; padding: 18px 40px; text-decoration: none; border-radius: 12px; 
                                              font-weight: 700; font-size: 18px; transition: all 0.3s; box-shadow: 0 8px 25px rgba(59, 130, 246, 0.3);"
                                       onmouseover="this.style.transform='translateY(-3px)'; this.style.boxShadow='0 12px 30px rgba(59, 130, 246, 0.4)';"
                                       onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 8px 25px rgba(59, 130, 246, 0.3)';">
                                        <i class="fas fa-sign-in-alt"></i> INICIAR SESIÓN AHORA
                                    </a>
                                </div>
                            </div>
                        </div>
                    `,
                    text: `¡BIENVENIDO COMO NUEVO ADMINISTRADOR!\n\n${changeRequest.currentAdminName} ha transferido la administración del sistema CBTIS051 a tu cuenta.\n\nTUS CREDENCIALES:\n- Usuario: ${changeRequest.newAdminUser}\n- Correo: ${changeRequest.newAdminEmail}\n\n🔒 POR SEGURIDAD: Cambia tu contraseña inmediatamente después de iniciar sesión.\n\n🔗 INICIAR SESIÓN: ${process.env.FRONTEND_URL || 'http://localhost:4000'}/login.html\n\n© ${new Date().getFullYear()} CBTIS051`
                };
                
                await enviarEmailConReintentos(newAdminEmailOptions);
                console.log('✅ Email enviado al nuevo administrador');
                
            } catch (emailError) {
                console.warn('⚠️ No se pudo enviar email al nuevo admin:', emailError.message);
            }
        }

        console.log('✅✅✅ CAMBIO COMPLETADO EXITOSAMENTE ✅✅✅');

        res.json({
            success: true,
            message: '✅ Cambio de administrador completado exitosamente. El nuevo administrador ha sido notificado.',
            newAdmin: {
                usuario: changeRequest.newAdminUser,
                correo: changeRequest.newAdminEmail
            },
            oldAdminDeactivated: true,
            loginUrl: `${process.env.FRONTEND_URL || 'http://localhost:4000'}/login.html`,
            securityNote: 'El nuevo administrador debe cambiar su contraseña inmediatamente.'
        });

    } catch (error) {
        console.error('🔥 ERROR CRÍTICO en confirmAdminChange:', error);
        console.error('📌 Mensaje:', error.message);
        console.error('📌 Error completo:', error);
        
        res.status(500).json({
            success: false,
            message: 'Error crítico al procesar cambio de administrador',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined,
            timestamp: new Date().toISOString()
        });
    }
};

// =============================================================================
// 4. RECHAZAR CAMBIO (opcional - si el admin actual quiere cancelar)
// =============================================================================

export const rejectAdminChange = async (req, res) => {
    console.log('🔐 ========== RECHAZO DE CAMBIO ==========');
    
    try {
        const { token } = req.body;

        if (!token) {
            return res.status(400).json({
                success: false,
                message: 'Token requerido'
            });
        }

        const changeRequest = await AdminChangeRequest.findOne({
            verificationToken: token,
            status: 'pending'
        });

        if (!changeRequest) {
            return res.status(404).json({
                success: false,
                message: 'Solicitud no encontrada o ya procesada'
            });
        }

        // Marcar como rechazada
        changeRequest.status = 'rejected';
        changeRequest.rejectedAt = new Date();
        await changeRequest.save();

        console.log('✅ Solicitud rechazada:', changeRequest._id);

        res.json({
            success: true,
            message: '✅ Solicitud de cambio rechazada exitosamente.',
            requestId: changeRequest._id
        });

    } catch (error) {
        console.error('🔥 ERROR en rejectAdminChange:', error);
        res.status(500).json({
            success: false,
            message: 'Error al rechazar solicitud',
            timestamp: new Date().toISOString()
        });
    }
};

// =============================================================================
// 5. OBTENER SOLICITUDES PENDIENTES DEL ADMIN ACTUAL
// =============================================================================

export const getPendingRequests = async (req, res) => {
    console.log('🔐 ========== OBTENIENDO SOLICITUDES PENDIENTES ==========');
    
    try {
        const currentAdminId = req.user.id;

        const pendingRequests = await AdminChangeRequest.find({
            currentAdminId,
            status: 'pending'
        }).sort({ requestedAt: -1 });

        console.log(`📋 ${pendingRequests.length} solicitudes pendientes`);

        res.json({
            success: true,
            requests: pendingRequests.map(request => ({
                id: request._id,
                newAdmin: {
                    user: request.newAdminUser,
                    email: request.newAdminEmail
                },
                requestedAt: request.requestedAt,
                expiresAt: request.tokenExpires,
                remainingHours: Math.ceil((request.tokenExpires - new Date()) / (1000 * 60 * 60))
            })),
            total: pendingRequests.length
        });

    } catch (error) {
        console.error('🔥 ERROR en getPendingRequests:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener solicitudes',
            timestamp: new Date().toISOString()
        });
    }
};

// =============================================================================
// 6. VERIFICAR ESTADO DE SOLICITUD
// =============================================================================

export const getRequestStatus = async (req, res) => {
    console.log('🔐 ========== VERIFICANDO ESTADO ==========');
    
    try {
        const { requestId } = req.params;

        if (!requestId) {
            return res.status(400).json({
                success: false,
                message: 'ID de solicitud requerido'
            });
        }

        const changeRequest = await AdminChangeRequest.findById(requestId);

        if (!changeRequest) {
            return res.status(404).json({
                success: false,
                message: 'Solicitud no encontrada'
            });
        }

        res.json({
            success: true,
            request: {
                id: changeRequest._id,
                status: changeRequest.status,
                currentAdmin: {
                    user: changeRequest.currentAdminName,
                    email: changeRequest.currentAdminEmail
                },
                newAdmin: {
                    user: changeRequest.newAdminUser,
                    email: changeRequest.newAdminEmail
                },
                timeline: {
                    requestedAt: changeRequest.requestedAt,
                    expiresAt: changeRequest.tokenExpires,
                    approvedAt: changeRequest.approvedAt,
                    rejectedAt: changeRequest.rejectedAt
                }
            }
        });

    } catch (error) {
        console.error('🔥 ERROR en getRequestStatus:', error);
        res.status(500).json({
            success: false,
            message: 'Error al verificar estado',
            timestamp: new Date().toISOString()
        });
    }
};

// =============================================================================
// 7. ENDPOINT DE PRUEBA
// =============================================================================

export const testAdminChange = async (req, res) => {
    console.log('🧪 ========== PRUEBA DE CAMBIO ==========');
    
    try {
        await transporter.verify();
        console.log('✅ Email configurado');

        const adminCount = await User.countDocuments({ rol: 'administrador', activo: true });
        console.log(`✅ ${adminCount} administrador(es) activo(s)`);

        const pendingRequests = await AdminChangeRequest.countDocuments({ status: 'pending' });
        console.log(`✅ ${pendingRequests} solicitud(es) pendiente(s)`);

        res.json({
            success: true,
            status: 'Sistema listo',
            diagnostics: {
                email: '✅ Configurado',
                database: '✅ Conectado',
                adminCount,
                pendingRequests,
                frontendUrl: process.env.FRONTEND_URL || 'http://localhost:4000'
            }
        });

    } catch (error) {
        console.error('❌ ERROR en testAdminChange:', error);
        res.status(500).json({
            success: false,
            message: 'Error en diagnóstico',
            error: error.message
        });
    }
};