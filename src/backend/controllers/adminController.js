import crypto from 'crypto';
import mongoose from 'mongoose';
import User from '../models/User.js';
import AdminChangeRequest from '../models/AdminChangeRequest.js';
import { transporter } from './authController.js';
import NotificationService from '../services/notificationService.js';
import AuditService from '../services/auditService.js'; // ✅ IMPORTACIÓN DEL SERVICIO DE AUDITORÍA

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
// DEBUGGING INTENSIVO - FUNCIÓN PARA LOGGEO DETALLADO
// =============================================================================

const debugAdminChange = {
    start: (operation) => {
        console.log(`\n🔍 ========== DEBUG ${operation.toUpperCase()} ==========`);
        console.log(`🕒 Iniciado: ${new Date().toISOString()}`);
    },
    
    logRequestData: (req) => {
        console.log('📋 DATOS DE LA SOLICITUD:');
        console.log('Body completo:', JSON.stringify(req.body, null, 2));
        console.log('Headers:', {
            'content-type': req.headers['content-type'],
            'content-length': req.headers['content-length']
        });
        console.log('User ID:', req.user?.id);
        console.log('IP:', req.ip);
    },
    
    logDatabaseState: async () => {
        try {
            const adminCount = await User.countDocuments({ rol: 'administrador', activo: true });
            const pendingRequests = await AdminChangeRequest.countDocuments({ status: 'pending' });
            
            console.log('🗃️ ESTADO DE LA BASE DE DATOS:');
            console.log(`- Administradores activos: ${adminCount}`);
            console.log(`- Solicitudes pendientes: ${pendingRequests}`);
        } catch (error) {
            console.error('❌ Error obteniendo estado de DB:', error.message);
        }
    },
    
    logPasswordProcessing: (plainPassword, hashedPassword = null) => {
        console.log('🔑 PROCESAMIENTO DE CONTRASEÑA:');
        console.log(`- Contraseña recibida: "${plainPassword ? plainPassword.substring(0, 3) + '...' : 'NULL'}"`);
        console.log(`- Longitud: ${plainPassword ? plainPassword.length : 0}`);
        console.log(`- Contraseña hasheada: ${hashedPassword ? hashedPassword.substring(0, 20) + '...' : 'NO PROCESADA'}`);
    },
    
    end: (operation, success = true) => {
        console.log(`✅ ${success ? 'COMPLETADO' : 'FALLADO'}: ${operation.toUpperCase()}`);
        console.log(`🕒 Finalizado: ${new Date().toISOString()}`);
        console.log('🔍 ============================================\n');
    }
};

// =============================================================================
// 1. SOLICITAR CAMBIO DE ADMINISTRADOR (CORREGIDO CON DEBUGGING Y AUDITORÍA)
// =============================================================================

export const requestAdminChange = async (req, res) => {
    debugAdminChange.start('SOLICITUD CAMBIO ADMINISTRADOR');
    debugAdminChange.logRequestData(req);
    
    try {
        const { 
            nuevoUsuario, 
            nuevoCorreo, 
            nuevaPassword,
            confirmarPassword 
        } = req.body;

        // =========================================================================
        // VALIDACIONES DETALLADAS
        // =========================================================================
        console.log('🔍 VALIDANDO DATOS:');
        console.log(`- nuevoUsuario: "${nuevoUsuario}" (${nuevoUsuario?.length || 0} chars)`);
        console.log(`- nuevoCorreo: "${nuevoCorreo}"`);
        console.log(`- nuevaPassword: "${nuevaPassword ? '***' + nuevaPassword.substring(nuevaPassword.length - 2) : 'NULL'}"`);
        console.log(`- confirmarPassword: "${confirmarPassword ? '***' + confirmarPassword.substring(confirmarPassword.length - 2) : 'NULL'}"`);

        if (!nuevoUsuario || !nuevoCorreo || !nuevaPassword || !confirmarPassword) {
            const missing = [];
            if (!nuevoUsuario) missing.push('nuevoUsuario');
            if (!nuevoCorreo) missing.push('nuevoCorreo');
            if (!nuevaPassword) missing.push('nuevaPassword');
            if (!confirmarPassword) missing.push('confirmarPassword');
            
            console.error(`❌ Campos faltantes: ${missing.join(', ')}`);
            
            // =======================================================================
            // REGISTRAR INTENTO FALLIDO EN AUDITORÍA
            // =======================================================================
            await AuditService.log(req, {
                action: 'ADMIN_CHANGE_REQUEST',
                actionType: 'CREATE',
                actionCategory: 'ADMIN',
                targetId: null,
                targetModel: 'AdminChangeRequest',
                targetName: nuevoUsuario || 'Desconocido',
                description: `Intento fallido - Campos faltantes: ${missing.join(', ')}`,
                severity: 'WARNING',
                status: 'FAILED',
                metadata: {
                    missingFields: missing,
                    nuevoUsuario,
                    nuevoCorreo
                }
            }).catch(err => console.error('❌ Error registrando auditoría:', err.message));
            
            debugAdminChange.end('SOLICITUD CAMBIO ADMINISTRADOR', false);
            
            return res.status(400).json({
                success: false,
                message: 'Todos los campos son requeridos',
                missingFields: missing
            });
        }

        if (nuevaPassword !== confirmarPassword) {
            console.error('❌ Contraseñas no coinciden');
            
            // =======================================================================
            // REGISTRAR INTENTO FALLIDO EN AUDITORÍA
            // =======================================================================
            await AuditService.log(req, {
                action: 'ADMIN_CHANGE_REQUEST',
                actionType: 'CREATE',
                actionCategory: 'ADMIN',
                targetId: null,
                targetModel: 'AdminChangeRequest',
                targetName: nuevoUsuario,
                description: `Intento fallido - Contraseñas no coinciden`,
                severity: 'WARNING',
                status: 'FAILED',
                metadata: {
                    nuevoUsuario,
                    nuevoCorreo,
                    reason: 'password_mismatch'
                }
            }).catch(err => console.error('❌ Error registrando auditoría:', err.message));
            
            debugAdminChange.end('SOLICITUD CAMBIO ADMINISTRADOR', false);
            return res.status(400).json({
                success: false,
                message: 'Las contraseñas no coinciden'
            });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(nuevoCorreo)) {
            console.error(`❌ Correo inválido: ${nuevoCorreo}`);
            
            // =======================================================================
            // REGISTRAR INTENTO FALLIDO EN AUDITORÍA
            // =======================================================================
            await AuditService.log(req, {
                action: 'ADMIN_CHANGE_REQUEST',
                actionType: 'CREATE',
                actionCategory: 'ADMIN',
                targetId: null,
                targetModel: 'AdminChangeRequest',
                targetName: nuevoUsuario,
                description: `Intento fallido - Correo inválido: ${nuevoCorreo}`,
                severity: 'WARNING',
                status: 'FAILED',
                metadata: {
                    nuevoUsuario,
                    nuevoCorreo,
                    reason: 'invalid_email'
                }
            }).catch(err => console.error('❌ Error registrando auditoría:', err.message));
            
            debugAdminChange.end('SOLICITUD CAMBIO ADMINISTRADOR', false);
            return res.status(400).json({
                success: false,
                message: 'Correo electrónico inválido'
            });
        }

        // =========================================================================
        // OBTENER ADMINISTRADOR ACTUAL
        // =========================================================================
        const currentAdminId = req.user.id;
        console.log(`👤 Buscando admin actual ID: ${currentAdminId}`);
        
        const currentAdmin = await User.findById(currentAdminId);

        if (!currentAdmin) {
            console.error(`❌ Admin no encontrado con ID: ${currentAdminId}`);
            
            // =======================================================================
            // REGISTRAR INTENTO FALLIDO EN AUDITORÍA
            // =======================================================================
            await AuditService.log(req, {
                action: 'ADMIN_CHANGE_REQUEST',
                actionType: 'CREATE',
                actionCategory: 'ADMIN',
                targetId: currentAdminId,
                targetModel: 'User',
                targetName: 'Admin actual',
                description: `Intento fallido - Admin actual no encontrado`,
                severity: 'ERROR',
                status: 'FAILED',
                metadata: {
                    adminId: currentAdminId
                }
            }).catch(err => console.error('❌ Error registrando auditoría:', err.message));
            
            debugAdminChange.end('SOLICITUD CAMBIO ADMINISTRADOR', false);
            return res.status(404).json({
                success: false,
                message: 'Administrador actual no encontrado'
            });
        }

        console.log(`✅ Admin actual encontrado: ${currentAdmin.usuario} (${currentAdmin.correo})`);

        // =========================================================================
        // VERIFICAR USUARIO Y CORREO ÚNICOS
        // =========================================================================
        console.log('🔍 Verificando unicidad de datos...');
        
        const existingUser = await User.findOne({ correo: nuevoCorreo });
        if (existingUser) {
            console.error(`❌ Correo ya registrado: ${nuevoCorreo}`);
            
            // =======================================================================
            // REGISTRAR INTENTO FALLIDO EN AUDITORÍA
            // =======================================================================
            await AuditService.log(req, {
                action: 'ADMIN_CHANGE_REQUEST',
                actionType: 'CREATE',
                actionCategory: 'ADMIN',
                targetId: null,
                targetModel: 'AdminChangeRequest',
                targetName: nuevoUsuario,
                description: `Intento fallido - Correo ya registrado: ${nuevoCorreo}`,
                severity: 'WARNING',
                status: 'FAILED',
                metadata: {
                    nuevoUsuario,
                    nuevoCorreo,
                    existingUser: existingUser.usuario,
                    reason: 'email_exists'
                }
            }).catch(err => console.error('❌ Error registrando auditoría:', err.message));
            
            debugAdminChange.end('SOLICITUD CAMBIO ADMINISTRADOR', false);
            return res.status(400).json({
                success: false,
                message: 'Este correo ya está registrado en el sistema',
                existingUser: existingUser.usuario
            });
        }

        const existingUsername = await User.findOne({ usuario: nuevoUsuario });
        if (existingUsername) {
            console.error(`❌ Usuario ya existe: ${nuevoUsuario}`);
            
            // =======================================================================
            // REGISTRAR INTENTO FALLIDO EN AUDITORÍA
            // =======================================================================
            await AuditService.log(req, {
                action: 'ADMIN_CHANGE_REQUEST',
                actionType: 'CREATE',
                actionCategory: 'ADMIN',
                targetId: null,
                targetModel: 'AdminChangeRequest',
                targetName: nuevoUsuario,
                description: `Intento fallido - Usuario ya existe: ${nuevoUsuario}`,
                severity: 'WARNING',
                status: 'FAILED',
                metadata: {
                    nuevoUsuario,
                    nuevoCorreo,
                    reason: 'username_exists'
                }
            }).catch(err => console.error('❌ Error registrando auditoría:', err.message));
            
            debugAdminChange.end('SOLICITUD CAMBIO ADMINISTRADOR', false);
            return res.status(400).json({
                success: false,
                message: 'Este nombre de usuario ya está en uso'
            });
        }

        console.log('✅ Usuario y correo disponibles');

        // =========================================================================
        // PROCESAR CONTRASEÑA CORRECTAMENTE
        // =========================================================================
        debugAdminChange.logPasswordProcessing(nuevaPassword);
        
        // IMPORTANTE: Encriptar la contraseña ANTES de guardarla en la solicitud
        const bcrypt = await import('bcryptjs');
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(nuevaPassword, salt);
        
        debugAdminChange.logPasswordProcessing(nuevaPassword, hashedPassword);

        // =========================================================================
        // CREAR SOLICITUD DE CAMBIO
        // =========================================================================
        const verificationToken = generateSecureToken();
        
        console.log('📝 Creando solicitud de cambio...');
        
        const adminChangeRequest = new AdminChangeRequest({
            currentAdminId: currentAdmin._id,
            currentAdminEmail: currentAdmin.correo,
            currentAdminName: currentAdmin.usuario,
            newAdminUser: nuevoUsuario,
            newAdminEmail: nuevoCorreo,
            newAdminPassword: hashedPassword, // ¡GUARDAR LA CONTRASEÑA HASHEADA!
            verificationToken,
            tokenExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
            status: 'pending',
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
            metadata: {
                passwordLength: nuevaPassword.length,
                requestTimestamp: new Date().toISOString(),
                clientInfo: {
                    ip: req.ip,
                    userAgent: req.headers['user-agent']
                }
            }
        });

        await adminChangeRequest.save();
        
        console.log('✅ Solicitud de cambio creada:', {
            id: adminChangeRequest._id,
            newAdminUser: nuevoUsuario,
            newAdminEmail: nuevoCorreo,
            passwordStored: !!adminChangeRequest.newAdminPassword,
            passwordLength: nuevaPassword.length,
            expires: adminChangeRequest.tokenExpires
        });

        // =========================================================================
        // VERIFICAR ESTADO DE LA SOLICITUD
        // =========================================================================
        await debugAdminChange.logDatabaseState();

        // =========================================================================
        // ENVIAR EMAIL DE CONFIRMACIÓN
        // =========================================================================
        if (!transporter) {
            console.error('❌ Transporter no disponible');
            adminChangeRequest.status = 'pending_no_email';
            await adminChangeRequest.save();
            
            const verificationUrl = buildVerificationUrl(verificationToken);
            console.log('🔗 ENLACE DE VERIFICACIÓN (modo desarrollo):', verificationUrl);
            
            // =======================================================================
            // REGISTRAR SOLICITUD CREADA (SIN EMAIL)
            // =======================================================================
            await AuditService.log(req, {
                action: 'ADMIN_CHANGE_REQUEST',
                actionType: 'CREATE',
                actionCategory: 'ADMIN',
                targetId: adminChangeRequest._id,
                targetModel: 'AdminChangeRequest',
                targetName: `Cambio a ${nuevoUsuario}`,
                description: `Solicitud de cambio de administrador creada (sin email) - Nuevo admin: ${nuevoUsuario}`,
                severity: 'WARNING',
                status: 'PENDING',
                metadata: {
                    requestId: adminChangeRequest._id,
                    currentAdmin: currentAdmin.usuario,
                    newAdmin: nuevoUsuario,
                    newAdminEmail: nuevoCorreo,
                    emailStatus: 'not_sent'
                }
            }).catch(err => console.error('❌ Error registrando auditoría:', err.message));
            
            debugAdminChange.end('SOLICITUD CAMBIO ADMINISTRADOR', false);
            
            return res.status(500).json({
                success: false,
                message: 'Error del sistema: servicio de email no disponible',
                requestId: adminChangeRequest._id,
                debugUrl: process.env.NODE_ENV === 'development' ? verificationUrl : undefined,
                note: 'Contacta al administrador del sistema para continuar'
            });
        }

        const verificationUrl = buildVerificationUrl(verificationToken);

        try {
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
                                    Has solicitado transferir la administración a ${nuevoUsuario}. Confirma esta acción para completar el proceso.
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
                                        <td style="padding: 10px 0; color: #6b7280;">⏰ Expira en:</td>
                                        <td style="padding: 10px 0; color: #dc2626; font-weight: 600;">24 horas</td>
                                    </tr>
                                </table>
                            </div>
                            
                            <div style="text-align: center; margin: 40px 0;">
                                <a href="${verificationUrl}" 
                                   style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); 
                                          color: white; padding: 18px 40px; text-decoration: none; border-radius: 12px; 
                                          font-weight: 700; font-size: 18px; transition: all 0.3s; box-shadow: 0 8px 25px rgba(16, 185, 129, 0.3);">
                                    <i class="fas fa-shield-check"></i> CONFIRMAR TRANSFERENCIA
                                </a>
                                <p style="color: #9ca3af; margin-top: 15px; font-size: 14px;">
                                    Este enlace expira en 24 horas | ID: ${adminChangeRequest._id}
                                </p>
                            </div>
                        </div>
                    </div>
                `,
                text: `CONFIRMACIÓN DE CAMBIO DE ADMINISTRADOR - CBTIS051\n\nHas solicitado transferir la administración a ${nuevoUsuario}.\n\n📋 DETALLES:\n- Nuevo administrador: ${nuevoUsuario}\n- Correo nuevo: ${nuevoCorreo}\n- Solicitado por: ${currentAdmin.usuario}\n- Expira en: 24 horas\n- ID de solicitud: ${adminChangeRequest._id}\n\n🔗 CONFIRMAR: ${verificationUrl}\n\nSi no reconoces esta solicitud, ignora este correo.`
            };
            
            await enviarEmailConReintentos(currentAdminEmailOptions);
            console.log('✅ Email de confirmación enviado');
            
            adminChangeRequest.notificationSent = true;
            await adminChangeRequest.save();

        } catch (emailError) {
            console.error('❌ Error enviando email:', emailError.message);
            
            adminChangeRequest.notificationSent = false;
            adminChangeRequest.emailError = emailError.message;
            await adminChangeRequest.save();
            
            console.log('🔗 ENLACE DE VERIFICACIÓN:', verificationUrl);
        }

        // =======================================================================
        // REGISTRAR SOLICITUD CREADA EN AUDITORÍA
        // =======================================================================
        await AuditService.log(req, {
            action: 'ADMIN_CHANGE_REQUEST',
            actionType: 'CREATE',
            actionCategory: 'ADMIN',
            targetId: adminChangeRequest._id,
            targetModel: 'AdminChangeRequest',
            targetName: `Cambio a ${nuevoUsuario}`,
            description: `Solicitud de cambio de administrador creada - Nuevo admin: ${nuevoUsuario}`,
            severity: 'WARNING',
            status: 'PENDING',
            metadata: {
                requestId: adminChangeRequest._id,
                currentAdmin: currentAdmin.usuario,
                newAdmin: nuevoUsuario,
                newAdminEmail: nuevoCorreo,
                expiresAt: adminChangeRequest.tokenExpires,
                notificationSent: adminChangeRequest.notificationSent,
                ipAddress: req.ip,
                userAgent: req.headers['user-agent']
            }
        }).catch(err => console.error('❌ Error registrando auditoría:', err.message));

        console.log('✅✅✅ SOLICITUD PROCESADA EXITOSAMENTE ✅✅✅');
        debugAdminChange.end('SOLICITUD CAMBIO ADMINISTRADOR', true);
        
        res.json({
            success: true,
            message: '✅ Solicitud de cambio enviada. Revisa tu correo para confirmar la transferencia.',
            requestId: adminChangeRequest._id,
            expiresAt: adminChangeRequest.tokenExpires,
            debug: process.env.NODE_ENV === 'development' ? {
                passwordProcessed: true,
                passwordHashLength: hashedPassword.length,
                token: verificationToken.substring(0, 10) + '...'
            } : undefined
        });

    } catch (error) {
        console.error('🔥 ERROR CRÍTICO en requestAdminChange:');
        console.error('📌 Mensaje:', error.message);
        console.error('📌 Stack:', error.stack);
        console.error('📌 Timestamp:', new Date().toISOString());
        
        // =======================================================================
        // REGISTRAR ERROR EN AUDITORÍA
        // =======================================================================
        await AuditService.log(req, {
            action: 'ADMIN_CHANGE_REQUEST',
            actionType: 'CREATE',
            actionCategory: 'ADMIN',
            targetId: null,
            targetModel: 'AdminChangeRequest',
            targetName: 'Error',
            description: `Error crítico en solicitud de cambio: ${error.message}`,
            severity: 'ERROR',
            status: 'FAILED',
            metadata: {
                error: error.message,
                stack: error.stack
            }
        }).catch(err => console.error('❌ Error registrando auditoría:', err.message));
        
        debugAdminChange.end('SOLICITUD CAMBIO ADMINISTRADOR', false);
        
        res.status(500).json({
            success: false,
            message: 'Error del servidor al procesar solicitud',
            error: process.env.NODE_ENV === 'development' ? {
                message: error.message,
                stack: error.stack
            } : undefined,
            timestamp: new Date().toISOString()
        });
    }
};

// =============================================================================
// 2. VERIFICAR TOKEN DE CAMBIO
// =============================================================================

export const verifyAdminChangeToken = async (req, res) => {
    debugAdminChange.start('VERIFICACIÓN DE TOKEN');
    
    try {
        const { token } = req.params;

        if (!token) {
            console.error('❌ Token no proporcionado');
            debugAdminChange.end('VERIFICACIÓN DE TOKEN', false);
            return res.status(400).json({
                success: false,
                message: 'Token requerido'
            });
        }

        console.log(`🔑 Token recibido: ${token.substring(0, 15)}...`);

        const changeRequest = await AdminChangeRequest.findOne({
            verificationToken: token,
            status: 'pending'
        });

        if (!changeRequest) {
            console.error('❌ Solicitud no encontrada');
            
            // =======================================================================
            // REGISTRAR INTENTO FALLIDO EN AUDITORÍA
            // =======================================================================
            await AuditService.log(req, {
                action: 'ADMIN_CHANGE_VERIFY',
                actionType: 'READ',
                actionCategory: 'ADMIN',
                targetId: null,
                targetModel: 'AdminChangeRequest',
                targetName: 'Token inválido',
                description: `Intento de verificación con token inválido o expirado`,
                severity: 'WARNING',
                status: 'FAILED',
                metadata: {
                    tokenPreview: token.substring(0, 15) + '...'
                }
            }).catch(err => console.error('❌ Error registrando auditoría:', err.message));
            
            debugAdminChange.end('VERIFICACIÓN DE TOKEN', false);
            return res.status(404).json({
                success: false,
                message: 'Token inválido o solicitud ya procesada'
            });
        }

        console.log('✅ Solicitud encontrada:', {
            id: changeRequest._id,
            newAdmin: changeRequest.newAdminUser,
            status: changeRequest.status
        });

        if (changeRequest.tokenExpires < new Date()) {
            console.error('❌ Token expirado');
            changeRequest.status = 'expired';
            await changeRequest.save();
            
            // =======================================================================
            // REGISTRAR EXPIRACIÓN EN AUDITORÍA
            // =======================================================================
            await AuditService.log(req, {
                action: 'ADMIN_CHANGE_VERIFY',
                actionType: 'READ',
                actionCategory: 'ADMIN',
                targetId: changeRequest._id,
                targetModel: 'AdminChangeRequest',
                targetName: `Cambio a ${changeRequest.newAdminUser}`,
                description: `Token expirado para solicitud de cambio`,
                severity: 'WARNING',
                status: 'FAILED',
                metadata: {
                    requestId: changeRequest._id,
                    expiresAt: changeRequest.tokenExpires
                }
            }).catch(err => console.error('❌ Error registrando auditoría:', err.message));
            
            debugAdminChange.end('VERIFICACIÓN DE TOKEN', false);
            return res.status(400).json({
                success: false,
                message: 'Token expirado'
            });
        }

        console.log('✅ Token válido y vigente');
        
        // DEBUG: Verificar que la contraseña esté almacenada
        console.log('🔍 Verificando contraseña almacenada:');
        console.log(`- Password stored: ${!!changeRequest.newAdminPassword}`);
        console.log(`- Password length in DB: ${changeRequest.newAdminPassword?.length || 0}`);

        // =======================================================================
        // REGISTRAR VERIFICACIÓN EXITOSA EN AUDITORÍA
        // =======================================================================
        await AuditService.log(req, {
            action: 'ADMIN_CHANGE_VERIFY',
            actionType: 'READ',
            actionCategory: 'ADMIN',
            targetId: changeRequest._id,
            targetModel: 'AdminChangeRequest',
            targetName: `Cambio a ${changeRequest.newAdminUser}`,
            description: `Token verificado exitosamente para cambio de administrador`,
            severity: 'INFO',
            status: 'SUCCESS',
            metadata: {
                requestId: changeRequest._id,
                newAdmin: changeRequest.newAdminUser,
                newAdminEmail: changeRequest.newAdminEmail
            }
        }).catch(err => console.error('❌ Error registrando auditoría:', err.message));

        debugAdminChange.end('VERIFICACIÓN DE TOKEN', true);
        
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
            }
        });

    } catch (error) {
        console.error('🔥 ERROR en verifyAdminChangeToken:', error);
        
        // =======================================================================
        // REGISTRAR ERROR EN AUDITORÍA
        // =======================================================================
        await AuditService.log(req, {
            action: 'ADMIN_CHANGE_VERIFY',
            actionType: 'READ',
            actionCategory: 'ADMIN',
            targetId: null,
            targetModel: 'AdminChangeRequest',
            targetName: 'Error',
            description: `Error en verificación de token: ${error.message}`,
            severity: 'ERROR',
            status: 'FAILED',
            metadata: {
                error: error.message
            }
        }).catch(err => console.error('❌ Error registrando auditoría:', err.message));
        
        debugAdminChange.end('VERIFICACIÓN DE TOKEN', false);
        res.status(500).json({
            success: false,
            message: 'Error del servidor al verificar token',
            timestamp: new Date().toISOString()
        });
    }
};

// =============================================================================
// 3. CONFIRMAR CAMBIO DE ADMINISTRADOR (CORREGIDO CON AUDITORÍA)
// =============================================================================

export const confirmAdminChange = async (req, res) => {
    debugAdminChange.start('CONFIRMACIÓN DE CAMBIO');
    
    try {
        const { token } = req.body;

        if (!token) {
            console.error('❌ Token no proporcionado');
            debugAdminChange.end('CONFIRMACIÓN DE CAMBIO', false);
            return res.status(400).json({
                success: false,
                message: 'Token requerido'
            });
        }

        console.log(`🔑 Token recibido: ${token.substring(0, 15)}...`);

        // Buscar solicitud
        const changeRequest = await AdminChangeRequest.findOne({
            verificationToken: token,
            status: 'pending'
        });

        if (!changeRequest) {
            console.error('❌ Solicitud no encontrada');
            
            // =======================================================================
            // REGISTRAR INTENTO FALLIDO EN AUDITORÍA
            // =======================================================================
            await AuditService.log(req, {
                action: 'ADMIN_CHANGE_CONFIRM',
                actionType: 'UPDATE',
                actionCategory: 'ADMIN',
                targetId: null,
                targetModel: 'AdminChangeRequest',
                targetName: 'Solicitud no encontrada',
                description: `Intento de confirmación con token inválido`,
                severity: 'WARNING',
                status: 'FAILED',
                metadata: {
                    tokenPreview: token.substring(0, 15) + '...'
                }
            }).catch(err => console.error('❌ Error registrando auditoría:', err.message));
            
            debugAdminChange.end('CONFIRMACIÓN DE CAMBIO', false);
            return res.status(404).json({
                success: false,
                message: 'Solicitud no encontrada o ya procesada'
            });
        }

        console.log('✅ Solicitud encontrada:', {
            id: changeRequest._id,
            newAdminUser: changeRequest.newAdminUser,
            newAdminEmail: changeRequest.newAdminEmail
        });

        if (!changeRequest.isTokenValid()) {
            console.error('❌ Token inválido o expirado');
            
            // =======================================================================
            // REGISTRAR INTENTO FALLIDO EN AUDITORÍA
            // =======================================================================
            await AuditService.log(req, {
                action: 'ADMIN_CHANGE_CONFIRM',
                actionType: 'UPDATE',
                actionCategory: 'ADMIN',
                targetId: changeRequest._id,
                targetModel: 'AdminChangeRequest',
                targetName: `Cambio a ${changeRequest.newAdminUser}`,
                description: `Intento de confirmación con token expirado`,
                severity: 'WARNING',
                status: 'FAILED',
                metadata: {
                    requestId: changeRequest._id,
                    expiresAt: changeRequest.tokenExpires
                }
            }).catch(err => console.error('❌ Error registrando auditoría:', err.message));
            
            debugAdminChange.end('CONFIRMACIÓN DE CAMBIO', false);
            return res.status(400).json({
                success: false,
                message: 'Token inválido o expirado'
            });
        }

        // DEBUG: Verificar la contraseña almacenada
        console.log('🔍 VERIFICANDO CONTRASEÑA ALMACENADA:');
        console.log(`- Contraseña en DB: ${changeRequest.newAdminPassword ? 'PRESENTE' : 'FALTANTE'}`);
        console.log(`- Longitud hash: ${changeRequest.newAdminPassword?.length || 0}`);
        
        if (!changeRequest.newAdminPassword) {
            console.error('❌ ERROR CRÍTICO: No hay contraseña almacenada en la solicitud');
            
            // =======================================================================
            // REGISTRAR ERROR EN AUDITORÍA
            // =======================================================================
            await AuditService.log(req, {
                action: 'ADMIN_CHANGE_CONFIRM',
                actionType: 'UPDATE',
                actionCategory: 'ADMIN',
                targetId: changeRequest._id,
                targetModel: 'AdminChangeRequest',
                targetName: `Cambio a ${changeRequest.newAdminUser}`,
                description: `Error crítico: Contraseña no almacenada en solicitud`,
                severity: 'ERROR',
                status: 'FAILED',
                metadata: {
                    requestId: changeRequest._id
                }
            }).catch(err => console.error('❌ Error registrando auditoría:', err.message));
            
            debugAdminChange.end('CONFIRMACIÓN DE CAMBIO', false);
            return res.status(500).json({
                success: false,
                message: 'Error interno: contraseña no almacenada en la solicitud'
            });
        }

        console.log('✅✅✅ INICIANDO PROCESO DE CAMBIO ✅✅✅');

        // =========================================================================
        // PASO 1: DESACTIVAR ADMINISTRADOR ACTUAL
        // =========================================================================
        const currentAdmin = await User.findById(changeRequest.currentAdminId);
        
        if (currentAdmin) {
            console.log(`👤 Desactivando admin actual: ${currentAdmin.usuario}`);
            
            const backupEmail = `old_${Date.now()}_${currentAdmin.correo}`;
            const backupUsername = `old_${Date.now()}_${currentAdmin.usuario}`;
            
            currentAdmin.correo = backupEmail;
            currentAdmin.usuario = backupUsername;
            currentAdmin.activo = false;
            currentAdmin.rol = 'desactivado';
            currentAdmin.deactivatedAt = new Date();
            
            await currentAdmin.save();
            console.log('✅ Administrador actual desactivado');
            
            changeRequest.oldAdminDeactivated = true;
        }

        // =========================================================================
        // PASO 2: CREAR NUEVO ADMINISTRADOR CON LA CONTRASEÑA YA HASHEADA
        // =========================================================================
        console.log('👤 Creando nuevo administrador...');
        console.log(`- Usuario: ${changeRequest.newAdminUser}`);
        console.log(`- Email: ${changeRequest.newAdminEmail}`);
        console.log(`- Password hash: ${changeRequest.newAdminPassword.substring(0, 20)}...`);

        // CREAR EL USUARIO PERO EVITAR QUE MONGOOSE LO HASHEE DE NUEVO
        const newAdminData = {
            usuario: changeRequest.newAdminUser,
            correo: changeRequest.newAdminEmail,
            password: changeRequest.newAdminPassword, // ¡USAR EL HASH YA ALMACENADO!
            rol: 'administrador',
            activo: true,
            ultimoAcceso: new Date(),
            metadata: {
                createdFromRequest: changeRequest._id,
                createdByAdmin: changeRequest.currentAdminId,
                createdAt: new Date()
            }
        };

        // SOLUCIÓN: Crear el usuario directamente con create() y deshabilitar middleware
        const newAdmin = await User.create([newAdminData], {
            // IMPORTANTE: Esto deshabilita el middleware pre('save')
            saveMiddleware: false
        });

        console.log('✅ Nuevo administrador creado:', {
            id: newAdmin._id,
            usuario: newAdmin.usuario,
            correo: newAdmin.correo,
            passwordStored: !!newAdmin.password,
            passwordLength: newAdmin.password?.length
        });

        // =========================================================================
        // PASO 3: VERIFICAR QUE EL USUARIO SE PUEDE AUTENTICAR
        // =========================================================================
        console.log('🔐 Probando autenticación del nuevo usuario...');
        
        try {
            const testPassword = 'test'; // Contraseña de prueba
            const bcrypt = await import('bcryptjs');
            
            // IMPORTANTE: Comparar una contraseña falsa para verificar que el hash funciona
            const isValidFormat = await bcrypt.compare(testPassword, newAdmin.password);
            console.log(`✅ Formato de hash válido: ${isValidFormat ? 'NO (esperado para contraseña incorrecta)' : 'SÍ, hash funciona'}`);
            
        } catch (authError) {
            console.error('⚠️ Advertencia en prueba de autenticación:', authError.message);
        }

        // =========================================================================
        // PASO 4: ACTUALIZAR ESTADO DE LA SOLICITUD
        // =========================================================================
        changeRequest.newAdminCreated = true;
        changeRequest.newAdminId = newAdmin._id;
        changeRequest.status = 'approved';
        changeRequest.approvedAt = new Date();
        await changeRequest.save();
        
        console.log('✅ Solicitud marcada como aprobada');

        // =========================================================================
        // PASO 5: ENVIAR EMAIL AL NUEVO ADMINISTRADOR
        // =========================================================================
        if (transporter) {
            try {
                const loginUrl = `${process.env.FRONTEND_URL || 'http://localhost:4000'}/login.html`;
                
                const newAdminEmailOptions = {
                    from: `"Sistema CBTIS051 - Administración" <${emailFrom}>`,
                    to: changeRequest.newAdminEmail,
                    subject: '✅ ¡Eres el nuevo Administrador! - CBTIS051',
                    html: `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                            <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px; text-align: center; border-radius: 15px 15px 0 0;">
                                <h1 style="color: white; margin: 0; font-size: 32px;">¡BIENVENIDO!</h1>
                                <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0; font-size: 18px;">Nuevo Administrador - CBTIS051</p>
                            </div>
                            
                            <div style="padding: 40px; background: white; border-radius: 0 0 15px 15px;">
                                <div style="text-align: center; margin-bottom: 30px;">
                                    <h2 style="color: #1f2937; margin: 0 0 15px; font-size: 28px;">Administración Transferida</h2>
                                    <p style="color: #6b7280; font-size: 16px;">
                                        ${changeRequest.currentAdminName} ha transferido la administración del sistema a tu cuenta.
                                    </p>
                                </div>
                                
                                <div style="background: #f0f9ff; padding: 25px; border-radius: 12px; margin-bottom: 30px;">
                                    <h3 style="color: #374151; margin: 0 0 15px; font-size: 20px;">📋 Tus credenciales:</h3>
                                    <p><strong>Usuario:</strong> ${changeRequest.newAdminUser}</p>
                                    <p><strong>Correo:</strong> ${changeRequest.newAdminEmail}</p>
                                    <p><strong>Contraseña:</strong> La que estableciste en la solicitud</p>
                                </div>
                                
                                <div style="text-align: center; margin: 40px 0;">
                                    <a href="${loginUrl}" 
                                       style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); 
                                              color: white; padding: 18px 40px; text-decoration: none; border-radius: 12px; 
                                              font-weight: 700; font-size: 18px;">
                                        <i class="fas fa-sign-in-alt"></i> INICIAR SESIÓN AHORA
                                    </a>
                                </div>
                                
                                <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin-top: 20px;">
                                    <p style="color: #92400e; margin: 0; font-size: 14px;">
                                        <i class="fas fa-exclamation-triangle"></i> 
                                        <strong>Por seguridad, cambia tu contraseña después de iniciar sesión.</strong>
                                    </p>
                                </div>
                            </div>
                        </div>
                    `
                };
                
                await enviarEmailConReintentos(newAdminEmailOptions);
                console.log('✅ Email enviado al nuevo administrador');
                
                changeRequest.notificationSentNewAdmin = true;
                await changeRequest.save();
                
            } catch (emailError) {
                console.warn('⚠️ No se pudo enviar email:', emailError.message);
                changeRequest.notificationSentNewAdmin = false;
                await changeRequest.save();
            }
        }

        // =======================================================================
        // REGISTRAR CONFIRMACIÓN DE CAMBIO EN AUDITORÍA
        // =======================================================================
        await AuditService.log(req, {
            action: 'ADMIN_CHANGE_CONFIRM',
            actionType: 'UPDATE',
            actionCategory: 'ADMIN',
            targetId: changeRequest._id,
            targetModel: 'AdminChangeRequest',
            targetName: `Cambio a ${changeRequest.newAdminUser}`,
            description: `Cambio de administrador confirmado y completado - Nuevo admin: ${changeRequest.newAdminUser}`,
            severity: 'CRITICAL',
            status: 'SUCCESS',
            metadata: {
                requestId: changeRequest._id,
                oldAdmin: {
                    id: changeRequest.currentAdminId,
                    name: changeRequest.currentAdminName,
                    email: changeRequest.currentAdminEmail
                },
                newAdmin: {
                    id: newAdmin._id,
                    name: changeRequest.newAdminUser,
                    email: changeRequest.newAdminEmail
                },
                approvedAt: changeRequest.approvedAt,
                oldAdminDeactivated: changeRequest.oldAdminDeactivated
            }
        }).catch(err => console.error('❌ Error registrando auditoría:', err.message));

        console.log('✅✅✅ CAMBIO COMPLETADO EXITOSAMENTE ✅✅✅');
        debugAdminChange.end('CONFIRMACIÓN DE CAMBIO', true);
        
        // DEBUG: Verificar estado final
        await debugAdminChange.logDatabaseState();

        res.json({
            success: true,
            message: '✅ Cambio de administrador completado exitosamente.',
            newAdmin: {
                usuario: changeRequest.newAdminUser,
                correo: changeRequest.newAdminEmail,
                id: newAdmin._id
            },
            debug: process.env.NODE_ENV === 'development' ? {
                passwordUsedFromRequest: true,
                requestId: changeRequest._id,
                oldAdminDeactivated: true
            } : undefined,
            loginUrl: `${process.env.FRONTEND_URL || 'http://localhost:4000'}/login.html`
        });

    } catch (error) {
        console.error('🔥 ERROR CRÍTICO en confirmAdminChange:');
        console.error('📌 Mensaje:', error.message);
        console.error('📌 Stack:', error.stack);
        
        // =======================================================================
        // REGISTRAR ERROR EN AUDITORÍA
        // =======================================================================
        await AuditService.log(req, {
            action: 'ADMIN_CHANGE_CONFIRM',
            actionType: 'UPDATE',
            actionCategory: 'ADMIN',
            targetId: req.body?.token ? 'token_provided' : null,
            targetModel: 'AdminChangeRequest',
            targetName: 'Error',
            description: `Error crítico en confirmación de cambio: ${error.message}`,
            severity: 'ERROR',
            status: 'FAILED',
            metadata: {
                error: error.message,
                stack: error.stack
            }
        }).catch(err => console.error('❌ Error registrando auditoría:', err.message));
        
        debugAdminChange.end('CONFIRMACIÓN DE CAMBIO', false);
        
        res.status(500).json({
            success: false,
            message: 'Error crítico al procesar cambio de administrador',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined,
            timestamp: new Date().toISOString()
        });
    }
};

// =============================================================================
// 4. RECHAZAR CAMBIO
// =============================================================================

export const rejectAdminChange = async (req, res) => {
    debugAdminChange.start('RECHAZO DE CAMBIO');
    
    try {
        const { token } = req.body;

        if (!token) {
            debugAdminChange.end('RECHAZO DE CAMBIO', false);
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
            
            // =======================================================================
            // REGISTRAR INTENTO FALLIDO EN AUDITORÍA
            // =======================================================================
            await AuditService.log(req, {
                action: 'ADMIN_CHANGE_REJECT',
                actionType: 'UPDATE',
                actionCategory: 'ADMIN',
                targetId: null,
                targetModel: 'AdminChangeRequest',
                targetName: 'Solicitud no encontrada',
                description: `Intento de rechazo con token inválido`,
                severity: 'WARNING',
                status: 'FAILED',
                metadata: {
                    tokenPreview: token.substring(0, 15) + '...'
                }
            }).catch(err => console.error('❌ Error registrando auditoría:', err.message));
            
            debugAdminChange.end('RECHAZO DE CAMBIO', false);
            return res.status(404).json({
                success: false,
                message: 'Solicitud no encontrada o ya procesada'
            });
        }

        changeRequest.status = 'rejected';
        changeRequest.rejectedAt = new Date();
        await changeRequest.save();

        console.log('✅ Solicitud rechazada:', changeRequest._id);

        // =======================================================================
        // REGISTRAR RECHAZO EN AUDITORÍA
        // =======================================================================
        await AuditService.log(req, {
            action: 'ADMIN_CHANGE_REJECT',
            actionType: 'UPDATE',
            actionCategory: 'ADMIN',
            targetId: changeRequest._id,
            targetModel: 'AdminChangeRequest',
            targetName: `Cambio a ${changeRequest.newAdminUser}`,
            description: `Solicitud de cambio de administrador rechazada`,
            severity: 'INFO',
            status: 'SUCCESS',
            metadata: {
                requestId: changeRequest._id,
                newAdmin: changeRequest.newAdminUser,
                newAdminEmail: changeRequest.newAdminEmail,
                rejectedAt: changeRequest.rejectedAt
            }
        }).catch(err => console.error('❌ Error registrando auditoría:', err.message));

        debugAdminChange.end('RECHAZO DE CAMBIO', true);

        res.json({
            success: true,
            message: '✅ Solicitud de cambio rechazada exitosamente.'
        });

    } catch (error) {
        console.error('🔥 ERROR en rejectAdminChange:', error);
        
        // =======================================================================
        // REGISTRAR ERROR EN AUDITORÍA
        // =======================================================================
        await AuditService.log(req, {
            action: 'ADMIN_CHANGE_REJECT',
            actionType: 'UPDATE',
            actionCategory: 'ADMIN',
            targetId: null,
            targetModel: 'AdminChangeRequest',
            targetName: 'Error',
            description: `Error al rechazar solicitud: ${error.message}`,
            severity: 'ERROR',
            status: 'FAILED',
            metadata: {
                error: error.message
            }
        }).catch(err => console.error('❌ Error registrando auditoría:', err.message));
        
        debugAdminChange.end('RECHAZO DE CAMBIO', false);
        res.status(500).json({
            success: false,
            message: 'Error al rechazar solicitud',
            timestamp: new Date().toISOString()
        });
    }
};

// =============================================================================
// 5. OBTENER SOLICITUDES PENDIENTES
// =============================================================================

export const getPendingRequests = async (req, res) => {
    debugAdminChange.start('OBTENIENDO SOLICITUDES PENDIENTES');
    
    try {
        const currentAdminId = req.user.id;

        const pendingRequests = await AdminChangeRequest.find({
            currentAdminId,
            status: 'pending'
        }).sort({ requestedAt: -1 });

        console.log(`📋 ${pendingRequests.length} solicitudes pendientes`);

        // =======================================================================
        // REGISTRAR CONSULTA EN AUDITORÍA
        // =======================================================================
        if (pendingRequests.length > 0) {
            await AuditService.log(req, {
                action: 'ADMIN_CHANGE_VIEW',
                actionType: 'READ',
                actionCategory: 'ADMIN',
                targetId: null,
                targetModel: 'AdminChangeRequest',
                targetName: 'Solicitudes pendientes',
                description: `Consultó solicitudes de cambio pendientes (${pendingRequests.length} encontradas)`,
                severity: 'INFO',
                status: 'SUCCESS',
                metadata: {
                    count: pendingRequests.length,
                    requestIds: pendingRequests.map(r => r._id)
                }
            }).catch(err => console.error('❌ Error registrando auditoría:', err.message));
        }

        debugAdminChange.end('OBTENIENDO SOLICITUDES PENDIENTES', true);

        res.json({
            success: true,
            requests: pendingRequests.map(request => ({
                id: request._id,
                newAdmin: {
                    user: request.newAdminUser,
                    email: request.newAdminEmail
                },
                requestedAt: request.requestedAt,
                expiresAt: request.tokenExpires
            }))
        });

    } catch (error) {
        console.error('🔥 ERROR en getPendingRequests:', error);
        debugAdminChange.end('OBTENIENDO SOLICITUDES PENDIENTES', false);
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
    debugAdminChange.start('VERIFICANDO ESTADO DE SOLICITUD');
    
    try {
        const { requestId } = req.params;

        if (!requestId) {
            debugAdminChange.end('VERIFICANDO ESTADO DE SOLICITUD', false);
            return res.status(400).json({
                success: false,
                message: 'ID de solicitud requerido'
            });
        }

        const changeRequest = await AdminChangeRequest.findById(requestId);

        if (!changeRequest) {
            debugAdminChange.end('VERIFICANDO ESTADO DE SOLICITUD', false);
            return res.status(404).json({
                success: false,
                message: 'Solicitud no encontrada'
            });
        }

        debugAdminChange.end('VERIFICANDO ESTADO DE SOLICITUD', true);

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
        debugAdminChange.end('VERIFICANDO ESTADO DE SOLICITUD', false);
        res.status(500).json({
            success: false,
            message: 'Error al verificar estado',
            timestamp: new Date().toISOString()
        });
    }
};

// =============================================================================
// 7. DIAGNÓSTICO COMPLETO DEL SISTEMA
// =============================================================================

export const testAdminChange = async (req, res) => {
    debugAdminChange.start('DIAGNÓSTICO COMPLETO DEL SISTEMA');
    
    try {
        // Verificar configuración de email
        let emailStatus = '❌ No configurado';
        if (transporter) {
            try {
                await transporter.verify();
                emailStatus = '✅ Configurado y funcionando';
            } catch (emailError) {
                emailStatus = `❌ Error: ${emailError.message}`;
            }
        }

        // Obtener estadísticas
        const adminCount = await User.countDocuments({ rol: 'administrador', activo: true });
        const deactivatedCount = await User.countDocuments({ rol: 'desactivado' });
        const pendingRequests = await AdminChangeRequest.countDocuments({ status: 'pending' });
        const approvedRequests = await AdminChangeRequest.countDocuments({ status: 'approved' });

        // Obtener solicitudes recientes
        const recentRequests = await AdminChangeRequest.find()
            .sort({ requestedAt: -1 })
            .limit(5)
            .select('newAdminUser newAdminEmail status requestedAt');

        console.log('📊 DIAGNÓSTICO COMPLETO:');
        console.log(`- Administradores activos: ${adminCount}`);
        console.log(`- Administradores desactivados: ${deactivatedCount}`);
        console.log(`- Solicitudes pendientes: ${pendingRequests}`);
        console.log(`- Solicitudes aprobadas: ${approvedRequests}`);
        console.log(`- Email: ${emailStatus}`);

        // =======================================================================
        // REGISTRAR DIAGNÓSTICO EN AUDITORÍA
        // =======================================================================
        await AuditService.log(req, {
            action: 'ADMIN_DIAGNOSTIC',
            actionType: 'READ',
            actionCategory: 'ADMIN',
            targetId: null,
            targetModel: 'System',
            targetName: 'Diagnóstico Admin',
            description: `Diagnóstico del sistema de administración ejecutado`,
            severity: 'INFO',
            status: 'SUCCESS',
            metadata: {
                adminCount,
                deactivatedCount,
                pendingRequests,
                approvedRequests,
                emailStatus
            }
        }).catch(err => console.error('❌ Error registrando auditoría:', err.message));

        debugAdminChange.end('DIAGNÓSTICO COMPLETO DEL SISTEMA', true);

        res.json({
            success: true,
            status: 'Sistema listo',
            diagnostics: {
                email: emailStatus,
                database: '✅ Conectado',
                adminCount,
                deactivatedCount,
                pendingRequests,
                approvedRequests,
                recentRequests,
                frontendUrl: process.env.FRONTEND_URL || 'http://localhost:4000',
                environment: process.env.NODE_ENV || 'development'
            }
        });

    } catch (error) {
        console.error('❌ ERROR en testAdminChange:', error);
        debugAdminChange.end('DIAGNÓSTICO COMPLETO DEL SISTEMA', false);
        res.status(500).json({
            success: false,
            message: 'Error en diagnóstico',
            error: error.message
        });
    }
};

// =============================================================================
// 8. ENDPOINT DE DEBUG - Ver contraseña almacenada (SOLO DESARROLLO)
// =============================================================================

export const debugPasswordStorage = async (req, res) => {
    if (process.env.NODE_ENV !== 'development') {
        return res.status(403).json({
            success: false,
            message: 'Solo disponible en modo desarrollo'
        });
    }

    try {
        const { requestId } = req.params;
        
        const changeRequest = await AdminChangeRequest.findById(requestId)
            .select('newAdminUser newAdminEmail newAdminPassword status requestedAt');
        
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
                newAdminUser: changeRequest.newAdminUser,
                newAdminEmail: changeRequest.newAdminEmail,
                status: changeRequest.status,
                requestedAt: changeRequest.requestedAt,
                password: {
                    stored: !!changeRequest.newAdminPassword,
                    length: changeRequest.newAdminPassword?.length || 0,
                    preview: changeRequest.newAdminPassword ? 
                        `${changeRequest.newAdminPassword.substring(0, 20)}...` : null,
                    hashAlgorithm: changeRequest.newAdminPassword?.startsWith('$2a$') ? 'bcrypt' : 'unknown'
                }
            }
        });

    } catch (error) {
        console.error('Error en debug:', error);
        res.status(500).json({
            success: false,
            message: 'Error en debug',
            error: error.message
        });
    }
};

// =============================================================================
// 9. REACTIVAR USUARIO - VERSIÓN CORREGIDA CON AUDITORÍA
// =============================================================================

export const reactivateUser = async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log('\n🔄 ===== REACTIVANDO USUARIO =====');
    console.log('ID:', id);
    
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    console.log('Usuario encontrado:', {
      usuario: user.usuario,
      rol: user.rol,
      activo: user.activo
    });

    // No permitir reactivar al administrador (no debería estar desactivado)
    if (user.rol === 'administrador') {
      return res.status(400).json({
        success: false,
        message: 'No se puede reactivar al administrador'
      });
    }

    // Guardar estado anterior para auditoría
    const beforeState = {
      activo: user.activo,
      rol: user.rol,
      deactivatedAt: user.deactivatedAt
    };

    // Reactivar el usuario
    user.activo = true;
    user.rol = 'lector'; // Por defecto reactivar como lector
    user.deactivatedAt = null;
    
    await user.save();

    console.log('✅ Usuario reactivado:', {
      usuario: user.usuario,
      nuevoRol: user.rol,
      activo: user.activo
    });

    // =======================================================================
    // REGISTRAR REACTIVACIÓN EN AUDITORÍA
    // =======================================================================
    const afterState = {
      activo: user.activo,
      rol: user.rol,
      deactivatedAt: user.deactivatedAt
    };

    await AuditService.log(req, {
      action: 'USER_REACTIVATE',
      actionType: 'UPDATE',
      actionCategory: 'USERS',
      targetId: user._id,
      targetModel: 'User',
      targetName: user.usuario,
      description: `Usuario reactivado: ${user.usuario} (rol asignado: lector)`,
      severity: 'INFO',
      changes: {
        before: beforeState,
        after: afterState
      },
      metadata: {
        usuario: user.usuario,
        correo: user.correo,
        nuevoRol: 'lector'
      }
    }).catch(err => console.error('❌ Error registrando auditoría:', err.message));

    res.json({
      success: true,
      message: 'Usuario reactivado correctamente',
      user: {
        _id: user._id,
        usuario: user.usuario,
        correo: user.correo,
        rol: user.rol,
        activo: user.activo
      }
    });
  } catch (error) {
    console.error('❌ Error reactivando usuario:', error);
    
    // =======================================================================
    // REGISTRAR ERROR EN AUDITORÍA
    // =======================================================================
    await AuditService.log(req, {
      action: 'USER_REACTIVATE',
      actionType: 'UPDATE',
      actionCategory: 'USERS',
      targetId: req.params.id,
      targetModel: 'User',
      targetName: 'Usuario',
      description: `Error al reactivar usuario: ${error.message}`,
      severity: 'ERROR',
      status: 'FAILED',
      metadata: {
        error: error.message
      }
    }).catch(err => console.error('❌ Error registrando auditoría:', err.message));
    
    res.status(500).json({
      success: false,
      message: 'Error al reactivar usuario: ' + error.message
    });
  }
};

// =============================================================================
// 10. ELIMINAR USUARIO PERMANENTEMENTE - VERSIÓN CON DEBUGGING EXTREMO Y AUDITORÍA
// =============================================================================

export const deleteUserPermanently = async (req, res) => {
  console.log('\n🔴 ========== ELIMINACIÓN PERMANENTE DE USUARIO ==========');
  console.log(`🕒 Timestamp: ${new Date().toISOString()}`);
  
  try {
    const { id } = req.params;
    const requestingUserId = req.user?._id?.toString() || req.user?.id;
    
    console.log('📋 DATOS DE LA SOLICITUD:');
    console.log(`- ID de usuario a eliminar: "${id}"`);
    console.log(`- ID del solicitante (admin): "${requestingUserId}"`);
    console.log(`- Tipo de ID: ${typeof id}`);
    console.log(`- Longitud del ID: ${id?.length || 0}`);

    // VALIDACIÓN 1: Verificar que el ID sea válido para MongoDB
    const isValidObjectId = (id) => {
      return id && id.match(/^[0-9a-fA-F]{24}$/);
    };

    if (!isValidObjectId(id)) {
      console.error('❌ ID de usuario no es un ObjectId válido de MongoDB');
      
      // =======================================================================
      // REGISTRAR INTENTO FALLIDO EN AUDITORÍA
      // =======================================================================
      await AuditService.log(req, {
        action: 'USER_DELETE',
        actionType: 'DELETE',
        actionCategory: 'USERS',
        targetId: id,
        targetModel: 'User',
        targetName: 'ID inválido',
        description: `Intento de eliminar usuario con ID inválido`,
        severity: 'WARNING',
        status: 'FAILED',
        metadata: {
          providedId: id,
          reason: 'invalid_object_id'
        }
      }).catch(err => console.error('❌ Error registrando auditoría:', err.message));
      
      return res.status(400).json({
        success: false,
        message: 'ID de usuario inválido',
        debug: { id, isValid: false }
      });
    }

    // VALIDACIÓN 2: Buscar el usuario ANTES de eliminarlo
    console.log('🔍 Buscando usuario en la base de datos...');
    const userToDelete = await User.findById(id).lean();
    
    if (!userToDelete) {
      console.error('❌ Usuario NO encontrado en la base de datos');
      
      // =======================================================================
      // REGISTRAR INTENTO FALLIDO EN AUDITORÍA
      // =======================================================================
      await AuditService.log(req, {
        action: 'USER_DELETE',
        actionType: 'DELETE',
        actionCategory: 'USERS',
        targetId: id,
        targetModel: 'User',
        targetName: 'Usuario no encontrado',
        description: `Intento de eliminar usuario inexistente`,
        severity: 'WARNING',
        status: 'FAILED',
        metadata: {
          providedId: id,
          reason: 'user_not_found'
        }
      }).catch(err => console.error('❌ Error registrando auditoría:', err.message));
      
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado en la base de datos'
      });
    }

    console.log('✅ Usuario ENCONTRADO:');
    console.log(`- Nombre: ${userToDelete.usuario}`);
    console.log(`- Email: ${userToDelete.correo}`);
    console.log(`- Rol actual: ${userToDelete.rol}`);
    console.log(`- Activo: ${userToDelete.activo}`);

    // VALIDACIÓN 3: No eliminar al administrador
    if (userToDelete.rol === 'administrador') {
      console.error('❌ Intento de eliminar al administrador');
      
      // =======================================================================
      // REGISTRAR INTENTO FALLIDO EN AUDITORÍA
      // =======================================================================
      await AuditService.log(req, {
        action: 'USER_DELETE',
        actionType: 'DELETE',
        actionCategory: 'USERS',
        targetId: id,
        targetModel: 'User',
        targetName: userToDelete.usuario,
        description: `Intento de eliminar al administrador del sistema`,
        severity: 'WARNING',
        status: 'FAILED',
        metadata: {
          usuario: userToDelete.usuario,
          correo: userToDelete.correo,
          reason: 'cannot_delete_admin'
        }
      }).catch(err => console.error('❌ Error registrando auditoría:', err.message));
      
      return res.status(400).json({
        success: false,
        message: 'No se puede eliminar al administrador del sistema'
      });
    }

    // VALIDACIÓN 4: No eliminarse a sí mismo
    if (id === requestingUserId) {
      console.error('❌ Intento de eliminarse a sí mismo');
      
      // =======================================================================
      // REGISTRAR INTENTO FALLIDO EN AUDITORÍA
      // =======================================================================
      await AuditService.log(req, {
        action: 'USER_DELETE',
        actionType: 'DELETE',
        actionCategory: 'USERS',
        targetId: id,
        targetModel: 'User',
        targetName: userToDelete.usuario,
        description: `Intento de eliminar su propio usuario`,
        severity: 'WARNING',
        status: 'FAILED',
        metadata: {
          usuario: userToDelete.usuario,
          reason: 'cannot_delete_self'
        }
      }).catch(err => console.error('❌ Error registrando auditoría:', err.message));
      
      return res.status(400).json({
        success: false,
        message: 'No puedes eliminar tu propio usuario'
      });
    }

    // VALIDACIÓN 5: Verificar que no sea el último administrador (por si acaso)
    if (userToDelete.rol === 'administrador') {
      const adminCount = await User.countDocuments({ rol: 'administrador', activo: true });
      if (adminCount <= 1) {
        console.error('❌ Intento de eliminar al último administrador');
        
        // =======================================================================
        // REGISTRAR INTENTO FALLIDO EN AUDITORÍA
        // =======================================================================
        await AuditService.log(req, {
          action: 'USER_DELETE',
          actionType: 'DELETE',
          actionCategory: 'USERS',
          targetId: id,
          targetModel: 'User',
          targetName: userToDelete.usuario,
          description: `Intento de eliminar al último administrador`,
          severity: 'WARNING',
          status: 'FAILED',
          metadata: {
            usuario: userToDelete.usuario,
            adminCount,
            reason: 'last_admin'
          }
        }).catch(err => console.error('❌ Error registrando auditoría:', err.message));
        
        return res.status(400).json({
          success: false,
          message: 'No se puede eliminar al último administrador del sistema'
        });
      }
    }

    // Guardar datos del usuario para auditoría
    const userData = {
      _id: userToDelete._id,
      usuario: userToDelete.usuario,
      correo: userToDelete.correo,
      rol: userToDelete.rol,
      activo: userToDelete.activo
    };

    // =========================================================================
    // EJECUTAR LA ELIMINACIÓN
    // =========================================================================
    console.log('\n🗑️ EJECUTANDO ELIMINACIÓN...');
    
    // Opción 1: Usar findByIdAndDelete
    const deleteResult = await User.findByIdAndDelete(id);
    
    console.log('📊 RESULTADO DE LA ELIMINACIÓN:');
    console.log(`- deleteResult: ${deleteResult ? 'DOCUMENTO ELIMINADO' : 'NO SE ELIMINÓ NADA'}`);
    
    if (deleteResult) {
      console.log(`- Usuario eliminado: ${deleteResult.usuario}`);
      console.log(`- ID eliminado: ${deleteResult._id}`);
    }

    // Verificar que realmente se eliminó
    const verifyDeletion = await User.findById(id);
    console.log(`- Verificación post-eliminación: ${verifyDeletion ? '❌ AÚN EXISTE' : '✅ ELIMINADO CORRECTAMENTE'}`);

    if (!verifyDeletion) {
      console.log('✅✅✅ ELIMINACIÓN EXITOSA ✅✅✅');
      
      // =======================================================================
      // REGISTRAR ELIMINACIÓN EN AUDITORÍA
      // =======================================================================
      await AuditService.log(req, {
        action: 'USER_DELETE',
        actionType: 'DELETE',
        actionCategory: 'USERS',
        targetId: id,
        targetModel: 'User',
        targetName: userData.usuario,
        description: `Usuario eliminado permanentemente: ${userData.usuario} (${userData.correo})`,
        severity: 'WARNING',
        status: 'SUCCESS',
        metadata: {
          usuario: userData.usuario,
          correo: userData.correo,
          rol: userData.rol,
          eliminacionPermanente: true,
          eliminadoPor: req.user?.usuario || 'admin'
        }
      }).catch(err => console.error('❌ Error registrando auditoría:', err.message));

      console.log('🔴 ========== ELIMINACIÓN COMPLETADA ==========\n');
      
      return res.json({
        success: true,
        message: 'Usuario eliminado permanentemente',
        debug: {
          deletedUser: userToDelete.usuario,
          deletedId: id,
          verified: true
        }
      });
    } else {
      console.error('❌❌❌ LA ELIMINACIÓN FALLÓ - EL USUARIO AÚN EXISTE ❌❌❌');
      
      // =======================================================================
      // REGISTRAR ERROR EN AUDITORÍA
      // =======================================================================
      await AuditService.log(req, {
        action: 'USER_DELETE',
        actionType: 'DELETE',
        actionCategory: 'USERS',
        targetId: id,
        targetModel: 'User',
        targetName: userData.usuario,
        description: `Error en eliminación: el usuario aún existe después del intento`,
        severity: 'ERROR',
        status: 'FAILED',
        metadata: {
          usuario: userData.usuario,
          error: 'user_still_exists_after_deletion'
        }
      }).catch(err => console.error('❌ Error registrando auditoría:', err.message));
      
      return res.status(500).json({
        success: false,
        message: 'Error en la eliminación: el usuario aún existe después del intento',
        debug: {
          userId: id,
          stillExists: true
        }
      });
    }

  } catch (error) {
    console.error('\n🔥 ERROR CRÍTICO EN ELIMINACIÓN:');
    console.error('📌 Mensaje:', error.message);
    console.error('📌 Stack:', error.stack);
    console.error('📌 Nombre del error:', error.name);
    
    // =======================================================================
    // REGISTRAR ERROR EN AUDITORÍA
    // =======================================================================
    await AuditService.log(req, {
      action: 'USER_DELETE',
      actionType: 'DELETE',
      actionCategory: 'USERS',
      targetId: req.params.id,
      targetModel: 'User',
      targetName: 'Usuario',
      description: `Error crítico al eliminar usuario: ${error.message}`,
      severity: 'ERROR',
      status: 'FAILED',
      metadata: {
        error: error.message,
        stack: error.stack,
        errorName: error.name
      }
    }).catch(err => console.error('❌ Error registrando auditoría:', err.message));
    
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'ID de usuario inválido',
        error: error.message
      });
    }
    
    return res.status(500).json({
      success: false,
      message: 'Error al eliminar usuario: ' + error.message,
      error: error.toString()
    });
  }
};

// =============================================================================
// 11. ASIGNAR ROL A OTRO USUARIO
// =============================================================================

export const assignRole = async (req, res) => {
    if (req.user.rol !== 'administrador') {
        return res.status(403).json({
            success: false,
            message: 'Solo los administradores pueden asignar roles.'
        });
    }

    const { userId, newRole } = req.body;

    if (!['administrador', 'editor', 'revisor', 'lector', 'moderador', 'usuario', 'desactivado'].includes(newRole)) {
        return res.status(400).json({
            success: false,
            message: 'Rol inválido.'
        });
    }

    try {
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado.'
            });
        }

        // Guardar estado anterior
        const beforeState = {
            rol: user.rol
        };

        user.rol = newRole;
        await user.save();

        // =======================================================================
        // REGISTRAR ASIGNACIÓN DE ROL EN AUDITORÍA
        // =======================================================================
        const afterState = {
            rol: user.rol
        };

        await AuditService.log(req, {
            action: 'ROLE_CHANGE',
            actionType: 'UPDATE',
            actionCategory: 'USERS',
            targetId: user._id,
            targetModel: 'User',
            targetName: user.usuario,
            description: `Rol de usuario cambiado de ${beforeState.rol} a ${newRole}`,
            severity: 'WARNING',
            changes: {
                before: beforeState,
                after: afterState
            },
            metadata: {
                usuario: user.usuario,
                correo: user.correo,
                rolAnterior: beforeState.rol,
                rolNuevo: newRole,
                asignadoPor: req.user?.usuario
            }
        }).catch(err => console.error('❌ Error registrando auditoría:', err.message));

        res.json({
            success: true,
            message: `Rol actualizado a ${newRole} para el usuario ${user.usuario}.`
        });
    } catch (error) {
        console.error('Error asignando rol:', error);
        
        // =======================================================================
        // REGISTRAR ERROR EN AUDITORÍA
        // =======================================================================
        await AuditService.log(req, {
            action: 'ROLE_CHANGE',
            actionType: 'UPDATE',
            actionCategory: 'USERS',
            targetId: userId,
            targetModel: 'User',
            targetName: 'Usuario',
            description: `Error al asignar rol: ${error.message}`,
            severity: 'ERROR',
            status: 'FAILED',
            metadata: {
                error: error.message,
                newRole
            }
        }).catch(err => console.error('❌ Error registrando auditoría:', err.message));
        
        res.status(500).json({
            success: false,
            message: 'Error del servidor al asignar rol.'
        });
    }
};

// =============================================================================
// 12. CREAR USUARIO CON ROL (SOLO ADMIN)
// =============================================================================

export const createUserWithRole = async (req, res) => {
    try {
        const { usuario, correo, password, rol } = req.body;

        console.log('\n📝 ===== CREANDO NUEVO USUARIO =====');
        console.log('Datos recibidos:', { 
            usuario, 
            correo, 
            rol, 
            password: password ? '***' : 'NO',
            timestamp: new Date().toISOString()
        });

        // =========================================================================
        // VALIDACIONES BÁSICAS
        // =========================================================================
        if (!usuario || !correo || !password || !rol) {
            const missing = [];
            if (!usuario) missing.push('usuario');
            if (!correo) missing.push('correo');
            if (!password) missing.push('password');
            if (!rol) missing.push('rol');
            
            console.log('❌ Campos faltantes:', missing.join(', '));
            
            // =======================================================================
            // REGISTRAR INTENTO FALLIDO EN AUDITORÍA
            // =======================================================================
            await AuditService.log(req, {
                action: 'USER_CREATE',
                actionType: 'CREATE',
                actionCategory: 'USERS',
                targetId: null,
                targetModel: 'User',
                targetName: usuario || 'Nuevo usuario',
                description: `Intento fallido - Campos faltantes: ${missing.join(', ')}`,
                severity: 'WARNING',
                status: 'FAILED',
                metadata: {
                    missingFields: missing,
                    usuario,
                    correo,
                    rol
                }
            }).catch(err => console.error('❌ Error registrando auditoría:', err.message));
            
            return res.status(400).json({
                success: false,
                message: 'Todos los campos son requeridos',
                missingFields: missing
            });
        }

        // Validar formato de correo
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(correo)) {
            console.log(`❌ Correo inválido: ${correo}`);
            
            await AuditService.log(req, {
                action: 'USER_CREATE',
                actionType: 'CREATE',
                actionCategory: 'USERS',
                targetId: null,
                targetModel: 'User',
                targetName: usuario,
                description: `Intento fallido - Correo inválido: ${correo}`,
                severity: 'WARNING',
                status: 'FAILED',
                metadata: {
                    usuario,
                    correo,
                    reason: 'invalid_email'
                }
            }).catch(err => console.error('❌ Error registrando auditoría:', err.message));
            
            return res.status(400).json({
                success: false,
                message: 'Formato de correo electrónico inválido'
            });
        }

        // Validar longitud de contraseña
        if (password.length < 6) {
            console.log('❌ Contraseña demasiado corta');
            
            await AuditService.log(req, {
                action: 'USER_CREATE',
                actionType: 'CREATE',
                actionCategory: 'USERS',
                targetId: null,
                targetModel: 'User',
                targetName: usuario,
                description: `Intento fallido - Contraseña demasiado corta`,
                severity: 'WARNING',
                status: 'FAILED',
                metadata: {
                    usuario,
                    correo,
                    passwordLength: password.length
                }
            }).catch(err => console.error('❌ Error registrando auditoría:', err.message));
            
            return res.status(400).json({
                success: false,
                message: 'La contraseña debe tener al menos 6 caracteres'
            });
        }

        // =========================================================================
        // VALIDACIÓN DINÁMICA DE ROLES
        // =========================================================================
        console.log('🔍 Validando rol:', rol);
        
        // Casos especiales: administrador y desactivado (siempre válidos)
        if (rol === 'administrador' || rol === 'desactivado') {
            console.log(`✅ Rol especial válido: ${rol}`);
        } else {
            // Verificar que el rol exista en la colección de roles dinámicos
            const Role = mongoose.model('Role');
            const roleExists = await Role.exists({ name: rol });
            
            if (!roleExists) {
                console.log(`❌ Rol inválido (no existe en BD): ${rol}`);
                
                // Obtener lista de roles válidos para el mensaje de error
                const allRoles = await Role.find().select('name -_id').lean();
                const validRoles = allRoles.map(r => r.name);
                validRoles.push('administrador', 'desactivado');
                
                // =======================================================================
                // REGISTRAR INTENTO FALLIDO EN AUDITORÍA
                // =======================================================================
                await AuditService.log(req, {
                    action: 'USER_CREATE',
                    actionType: 'CREATE',
                    actionCategory: 'USERS',
                    targetId: null,
                    targetModel: 'User',
                    targetName: usuario,
                    description: `Intento fallido - Rol inválido: ${rol}`,
                    severity: 'WARNING',
                    status: 'FAILED',
                    metadata: {
                        usuario,
                        correo,
                        rolInvalido: rol,
                        rolesValidos: validRoles
                    }
                }).catch(err => console.error('❌ Error registrando auditoría:', err.message));
                
                return res.status(400).json({
                    success: false,
                    message: `Rol inválido. Los roles disponibles son: ${validRoles.join(', ')}`
                });
            }
            console.log(`✅ Rol dinámico válido: ${rol}`);
        }

        // =========================================================================
        // VALIDACIONES DE UNICIDAD
        // =========================================================================
        
        // Verificar que no se intente crear otro administrador si ya existe uno activo
        if (rol === 'administrador') {
            const existingAdmin = await User.findOne({ 
                rol: 'administrador', 
                activo: true 
            });
            
            if (existingAdmin) {
                console.log('❌ Ya existe un administrador activo:', existingAdmin.usuario);
                
                await AuditService.log(req, {
                    action: 'USER_CREATE',
                    actionType: 'CREATE',
                    actionCategory: 'USERS',
                    targetId: null,
                    targetModel: 'User',
                    targetName: usuario,
                    description: `Intento fallido - Ya existe un administrador activo`,
                    severity: 'WARNING',
                    status: 'FAILED',
                    metadata: {
                        usuario,
                        correo,
                        existingAdmin: existingAdmin.usuario
                    }
                }).catch(err => console.error('❌ Error registrando auditoría:', err.message));
                
                return res.status(400).json({
                    success: false,
                    message: 'Ya existe un administrador activo en el sistema. No se puede crear otro.',
                    existingAdmin: existingAdmin.usuario
                });
            }
        }

        // Verificar email duplicado
        const trimmedCorreo = correo.toLowerCase().trim();
        const existingByEmail = await User.findOne({ correo: trimmedCorreo });
        
        if (existingByEmail) {
            console.log(`❌ Email ya existe: ${trimmedCorreo} (usuario: ${existingByEmail.usuario})`);
            
            await AuditService.log(req, {
                action: 'USER_CREATE',
                actionType: 'CREATE',
                actionCategory: 'USERS',
                targetId: null,
                targetModel: 'User',
                targetName: usuario,
                description: `Intento fallido - Correo ya registrado: ${trimmedCorreo}`,
                severity: 'WARNING',
                status: 'FAILED',
                metadata: {
                    usuario,
                    correo: trimmedCorreo,
                    existingUser: existingByEmail.usuario,
                    reason: 'email_exists'
                }
            }).catch(err => console.error('❌ Error registrando auditoría:', err.message));
            
            return res.status(400).json({
                success: false,
                message: 'Ya existe un usuario con ese correo electrónico',
                existingUser: existingByEmail.usuario
            });
        }

        // Verificar usuario duplicado
        const trimmedUsuario = usuario.trim();
        const existingByUser = await User.findOne({ usuario: trimmedUsuario });
        
        if (existingByUser) {
            console.log(`❌ Usuario ya existe: ${trimmedUsuario}`);
            
            await AuditService.log(req, {
                action: 'USER_CREATE',
                actionType: 'CREATE',
                actionCategory: 'USERS',
                targetId: null,
                targetModel: 'User',
                targetName: usuario,
                description: `Intento fallido - Usuario ya existe: ${trimmedUsuario}`,
                severity: 'WARNING',
                status: 'FAILED',
                metadata: {
                    usuario: trimmedUsuario,
                    correo: trimmedCorreo,
                    reason: 'username_exists'
                }
            }).catch(err => console.error('❌ Error registrando auditoría:', err.message));
            
            return res.status(400).json({
                success: false,
                message: 'Ya existe un usuario con ese nombre de usuario'
            });
        }

        console.log('✅ Validaciones pasadas - creando usuario...');

        // =========================================================================
        // CREAR USUARIO
        // =========================================================================
        const newUser = await User.create({
            usuario: trimmedUsuario,
            correo: trimmedCorreo,
            password,
            rol,
            activo: true,
            ultimoAcceso: new Date(),
            createdBy: req.user?._id || null,
            metadata: {
                createdFrom: 'admin_panel',
                createdAt: new Date().toISOString(),
                createdBy: req.user?.usuario || 'system'
            }
        });

        console.log('✅✅✅ USUARIO CREADO EXITOSAMENTE ✅✅✅');
        console.log('Detalles:', {
            id: newUser._id,
            usuario: newUser.usuario,
            correo: newUser.correo,
            rol: newUser.rol,
            activo: newUser.activo,
            timestamp: new Date().toISOString()
        });

        // =========================================================================
        // REGISTRAR CREACIÓN DE USUARIO EN AUDITORÍA
        // =========================================================================
        await AuditService.log(req, {
            action: 'USER_CREATE',
            actionType: 'CREATE',
            actionCategory: 'USERS',
            targetId: newUser._id,
            targetModel: 'User',
            targetName: newUser.usuario,
            description: `Usuario creado con rol ${rol}: ${newUser.usuario} (${newUser.correo})`,
            severity: 'INFO',
            status: 'SUCCESS',
            metadata: {
                userId: newUser._id,
                usuario: newUser.usuario,
                correo: newUser.correo,
                rol: newUser.rol,
                activo: newUser.activo,
                creadoPor: req.user?.usuario || 'system',
                creadoPorId: req.user?._id
            }
        }).catch(err => console.error('❌ Error registrando auditoría:', err.message));

        // =========================================================================
        // OPCIONAL: NOTIFICACIÓN AL NUEVO USUARIO
        // =========================================================================
        try {
            // Si tienes un servicio de notificaciones, puedes enviar un email
            // await sendWelcomeEmail(newUser.correo, newUser.usuario, password);
            console.log('📧 Notificación al nuevo usuario:', newUser.correo);
        } catch (notifyError) {
            console.warn('⚠️ No se pudo enviar notificación:', notifyError.message);
        }

        // =========================================================================
        // RESPUESTA EXITOSA
        // =========================================================================
        return res.status(201).json({
            success: true,
            message: `✅ Usuario creado exitosamente con rol "${rol}"`,
            user: {
                id: newUser._id,
                usuario: newUser.usuario,
                correo: newUser.correo,
                rol: newUser.rol,
                activo: newUser.activo,
                ultimoAcceso: newUser.ultimoAcceso,
                createdAt: newUser.createdAt
            },
            debug: process.env.NODE_ENV === 'development' ? {
                passwordLength: password.length,
                userId: newUser._id
            } : undefined
        });

    } catch (error) {
        console.error('\n🔥 ERROR CRÍTICO CREANDO USUARIO:');
        console.error('📌 Mensaje:', error.message);
        console.error('📌 Stack:', error.stack);
        console.error('📌 Nombre del error:', error.name);
        console.error('📌 Timestamp:', new Date().toISOString());

        // Manejar error de índice duplicado (MongoDB error 11000)
        if (error.code === 11000) {
            const field = Object.keys(error.keyPattern)[0];
            const value = error.keyValue[field];
            
            console.log(`❌ Error de duplicado: ${field} = ${value}`);
            
            let message = '';
            if (field === 'usuario') message = 'Ya existe un usuario con ese nombre';
            else if (field === 'correo') message = 'Ya existe un usuario con ese correo';
            else message = `El campo ${field} ya está en uso`;
            
            // =======================================================================
            // REGISTRAR ERROR DE DUPLICADO EN AUDITORÍA
            // =======================================================================
            await AuditService.log(req, {
                action: 'USER_CREATE',
                actionType: 'CREATE',
                actionCategory: 'USERS',
                targetId: null,
                targetModel: 'User',
                targetName: req.body?.usuario || 'Nuevo usuario',
                description: `Error de duplicado: ${field} = ${value}`,
                severity: 'WARNING',
                status: 'FAILED',
                metadata: {
                    error: 'duplicate_key',
                    field,
                    value,
                    requestBody: req.body
                }
            }).catch(err => console.error('❌ Error registrando auditoría:', err.message));
            
            return res.status(400).json({
                success: false,
                message,
                field,
                value
            });
        }

        // =======================================================================
        // REGISTRAR ERROR GENÉRICO EN AUDITORÍA
        // =======================================================================
        await AuditService.log(req, {
            action: 'USER_CREATE',
            actionType: 'CREATE',
            actionCategory: 'USERS',
            targetId: null,
            targetModel: 'User',
            targetName: req.body?.usuario || 'Nuevo usuario',
            description: `Error al crear usuario: ${error.message}`,
            severity: 'ERROR',
            status: 'FAILED',
            metadata: {
                error: error.message,
                stack: error.stack,
                requestBody: {
                    usuario: req.body?.usuario,
                    correo: req.body?.correo,
                    rol: req.body?.rol
                }
            }
        }).catch(err => console.error('❌ Error registrando auditoría:', err.message));
        
        return res.status(500).json({
            success: false,
            message: 'Error del servidor al crear usuario',
            error: process.env.NODE_ENV === 'development' ? {
                message: error.message,
                stack: error.stack
            } : undefined,
            timestamp: new Date().toISOString()
        });
    }
};

// =============================================================================
// 13. ACTUALIZAR USUARIO - VERSIÓN CORREGIDA CON AUDITORÍA
// =============================================================================

export const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { usuario, correo, rol, activo } = req.body || {};

        console.log('\n📝 ===== ACTUALIZANDO USUARIO =====');
        console.log('ID:', id);
        console.log('Datos:', { usuario, correo, rol, activo });

        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
        }

        // Guardar estado anterior para auditoría
        const beforeState = {
            usuario: user.usuario,
            correo: user.correo,
            rol: user.rol,
            activo: user.activo
        };

        // No permitir que el admin se modifique a sí mismo (excepto cosas básicas)
        const isSelf = String(req.user?.id) === String(user._id);
        if (isSelf) {
            if (rol && rol !== 'administrador') {
                return res.status(400).json({ success: false, message: 'No puedes cambiar tu propio rol.' });
            }
            if (activo === false) {
                return res.status(400).json({ success: false, message: 'No puedes desactivar tu propia cuenta.' });
            }
        }

        // =====================================================================
        // VALIDACIÓN DINÁMICA DE ROLES - CONSULTA A LA BASE DE DATOS
        // =====================================================================
        if (rol !== undefined && rol !== null) {
            
            // Casos especiales: administrador y desactivado (siempre válidos)
            if (rol === 'administrador' || rol === 'desactivado') {
                // Son válidos por defecto
                console.log(`✅ Rol especial válido: ${rol}`);
            } else {
                // Verificar que el rol exista en la colección de roles dinámicos
                const Role = mongoose.model('Role');
                const roleExists = await Role.exists({ name: rol });
                
                if (!roleExists) {
                    console.log(`❌ Rol inválido (no existe en BD): ${rol}`);
                    
                    // Obtener lista de roles válidos para el mensaje de error
                    const allRoles = await Role.find().select('name -_id').lean();
                    const validRoles = allRoles.map(r => r.name);
                    validRoles.push('administrador', 'desactivado');
                    
                    return res.status(400).json({ 
                        success: false, 
                        message: `Rol inválido. Los roles disponibles son: ${validRoles.join(', ')}` 
                    });
                }
                console.log(`✅ Rol dinámico válido: ${rol}`);
            }
            
            // Si se está asignando rol de administrador, verificar que no haya otro
            if (rol === 'administrador' && user.rol !== 'administrador') {
                const existingAdmin = await User.findOne({ 
                    rol: 'administrador', 
                    activo: true,
                    _id: { $ne: user._id }
                });
                if (existingAdmin) {
                    return res.status(400).json({ 
                        success: false, 
                        message: 'Ya existe un administrador activo. No se puede asignar este rol.' 
                    });
                }
            }
            
            user.rol = rol;
        }

        // Validar unicidad si se cambia usuario
        if (usuario !== undefined && usuario !== null) {
            const trimmedUsuario = usuario.trim();
            if (trimmedUsuario && trimmedUsuario !== user.usuario) {
                const existingByUser = await User.findOne({ 
                    usuario: trimmedUsuario, 
                    _id: { $ne: user._id } 
                });
                if (existingByUser) {
                    return res.status(400).json({ 
                        success: false, 
                        message: 'Ya existe un usuario con ese nombre de usuario' 
                    });
                }
                user.usuario = trimmedUsuario;
            }
        }

        // Validar unicidad si se cambia correo
        if (correo !== undefined && correo !== null) {
            const trimmedCorreo = correo.toLowerCase().trim();
            if (trimmedCorreo && trimmedCorreo !== user.correo) {
                const existingByEmail = await User.findOne({ 
                    correo: trimmedCorreo, 
                    _id: { $ne: user._id } 
                });
                if (existingByEmail) {
                    return res.status(400).json({ 
                        success: false, 
                        message: 'Ya existe un usuario con ese correo' 
                    });
                }
                user.correo = trimmedCorreo;
            }
        }

        // Actualizar estado activo
        if (activo !== undefined && activo !== null) {
            // Si se está desactivando y es administrador, verificar
            if (activo === false && user.rol === 'administrador') {
                const adminCount = await User.countDocuments({ 
                    rol: 'administrador', 
                    activo: true 
                });
                if (adminCount <= 1) {
                    return res.status(400).json({ 
                        success: false, 
                        message: 'No se puede desactivar al último administrador' 
                    });
                }
            }
            
            user.activo = activo;
            if (!activo) {
                user.deactivatedAt = new Date();
                // Si se desactiva, cambiar rol a desactivado
                user.rol = 'desactivado';
            } else {
                // Si se reactiva, asegurarse de que no sea desactivado
                user.deactivatedAt = null;
            }
        }

        await user.save();

        // Estado después para auditoría
        const afterState = {
            usuario: user.usuario,
            correo: user.correo,
            rol: user.rol,
            activo: user.activo
        };

        // Calcular campos modificados
        const camposModificados = [];
        for (const key in beforeState) {
            if (beforeState[key] !== afterState[key]) {
                camposModificados.push(key);
            }
        }

        console.log('✅ Usuario actualizado exitosamente:', {
            id: user._id,
            usuario: user.usuario,
            rol: user.rol,
            activo: user.activo
        });

        // =======================================================================
        // REGISTRAR ACTUALIZACIÓN EN AUDITORÍA
        // =======================================================================
        await AuditService.log(req, {
            action: 'USER_UPDATE',
            actionType: 'UPDATE',
            actionCategory: 'USERS',
            targetId: user._id,
            targetModel: 'User',
            targetName: user.usuario,
            description: `Usuario actualizado - Campos: ${camposModificados.join(', ')}`,
            severity: 'INFO',
            changes: {
                before: beforeState,
                after: afterState
            },
            metadata: {
                camposModificados,
                usuario: user.usuario,
                correo: user.correo,
                rol: user.rol,
                activo: user.activo,
                actualizadoPor: req.user?.usuario
            }
        }).catch(err => console.error('❌ Error registrando auditoría:', err.message));

        return res.json({
            success: true,
            message: 'Usuario actualizado correctamente',
            user: {
                id: user._id,
                usuario: user.usuario,
                correo: user.correo,
                rol: user.rol,
                activo: user.activo
            }
        });
    } catch (error) {
        console.error('❌ Error actualizando usuario:', error);
        
        // =======================================================================
        // REGISTRAR ERROR EN AUDITORÍA
        // =======================================================================
        await AuditService.log(req, {
            action: 'USER_UPDATE',
            actionType: 'UPDATE',
            actionCategory: 'USERS',
            targetId: req.params.id,
            targetModel: 'User',
            targetName: 'Usuario',
            description: `Error al actualizar usuario: ${error.message}`,
            severity: 'ERROR',
            status: 'FAILED',
            metadata: {
                error: error.message
            }
        }).catch(err => console.error('❌ Error registrando auditoría:', err.message));
        
        return res.status(500).json({
            success: false,
            message: 'Error del servidor al actualizar usuario: ' + error.message
        });
    }
};

// =============================================================================
// 14. LISTAR USUARIOS (SOLO ADMIN)
// =============================================================================

export const getUsers = async (req, res) => {
    try {
        const users = await User.find()
            .select('_id usuario correo rol activo createdAt updatedAt ultimoAcceso deactivatedAt')
            .sort({ createdAt: -1 });

        // =======================================================================
        // REGISTRAR CONSULTA EN AUDITORÍA (SOLO SI HAY MUCHOS USUARIOS)
        // =======================================================================
        if (users.length > 50) {
            AuditService.log(req, {
                action: 'USER_LIST_VIEW',
                actionType: 'READ',
                actionCategory: 'USERS',
                targetId: null,
                targetModel: 'User',
                targetName: 'Lista de usuarios',
                description: `Consultó lista de usuarios (${users.length} usuarios)`,
                severity: 'INFO',
                status: 'SUCCESS',
                metadata: {
                    userCount: users.length
                }
            }).catch(err => console.error('❌ Error registrando auditoría:', err.message));
        }

        return res.json({
            success: true,
            users
        });
    } catch (error) {
        console.error('Error listando usuarios:', error);
        return res.status(500).json({
            success: false,
            message: 'Error del servidor al obtener usuarios'
        });
    }
};

// =============================================================================
// 15. DESACTIVAR ("QUITAR") USUARIO (SOLO ADMIN) - CON AUDITORÍA
// =============================================================================

export const deactivateUser = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verificar que el usuario existe
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // No permitir desactivar al administrador
    if (user.rol === 'administrador') {
      return res.status(400).json({
        success: false,
        message: 'No se puede desactivar al administrador del sistema'
      });
    }

    // No permitir desactivarse a sí mismo
    if (id === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'No puedes desactivar tu propio usuario'
      });
    }

    // Guardar estado anterior para auditoría
    const beforeState = {
      activo: user.activo,
      rol: user.rol
    };

    // Desactivar SIN modificar el nombre de usuario
    user.activo = false;
    user.rol = 'desactivado';
    user.deactivatedAt = new Date();
    // IMPORTANTE: NO modificar user.usuario
    await user.save();

    console.log('✅ Usuario desactivado:', {
      usuario: user.usuario,
      rol: user.rol,
      activo: user.activo
    });

    // =======================================================================
    // REGISTRAR DESACTIVACIÓN EN AUDITORÍA
    // =======================================================================
    const afterState = {
      activo: user.activo,
      rol: user.rol
    };

    await AuditService.log(req, {
      action: 'USER_DEACTIVATE',
      actionType: 'UPDATE',
      actionCategory: 'USERS',
      targetId: user._id,
      targetModel: 'User',
      targetName: user.usuario,
      description: `Usuario desactivado: ${user.usuario}`,
      severity: 'WARNING',
      changes: {
        before: beforeState,
        after: afterState
      },
      metadata: {
        usuario: user.usuario,
        correo: user.correo,
        rolAnterior: beforeState.rol,
        rolNuevo: 'desactivado',
        desactivadoPor: req.user?.usuario
      }
    }).catch(err => console.error('❌ Error registrando auditoría:', err.message));

    res.json({
      success: true,
      message: 'Usuario desactivado correctamente',
      user: {
        _id: user._id,
        usuario: user.usuario, // Nombre original intacto
        correo: user.correo,
        rol: user.rol,
        activo: user.activo
      }
    });
  } catch (error) {
    console.error('Error desactivando usuario:', error);
    
    // =======================================================================
    // REGISTRAR ERROR EN AUDITORÍA
    // =======================================================================
    await AuditService.log(req, {
      action: 'USER_DEACTIVATE',
      actionType: 'UPDATE',
      actionCategory: 'USERS',
      targetId: req.params.id,
      targetModel: 'User',
      targetName: 'Usuario',
      description: `Error al desactivar usuario: ${error.message}`,
      severity: 'ERROR',
      status: 'FAILED',
      metadata: {
        error: error.message
      }
    }).catch(err => console.error('❌ Error registrando auditoría:', err.message));
    
    res.status(500).json({
      success: false,
      message: 'Error al desactivar usuario: ' + error.message
    });
  }
};