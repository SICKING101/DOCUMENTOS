// src/backend/controllers/adminController.js

import crypto from 'crypto';
import mongoose from 'mongoose';
import User from '../models/User.js';
import AdminChangeRequest from '../models/AdminChangeRequest.js';
import emailService from '../services/emailService.js';
import NotificationService from '../services/notificationService.js';
import AuditService from '../services/auditService.js'; // ✅ IMPORTACIÓN DEL SERVICIO DE AUDITORÍA

console.log('\n🔐 ========== ADMIN CONTROLLER INICIALIZADO ==========');
console.log(`📧 Usando servicio de email centralizado`);
console.log(`📧 Estado: ${emailService.getStatus().configured ? '✅ CONFIGURADO' : '❌ NO CONFIGURADO'}`);
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
// SOLICITAR CAMBIO DE ADMINISTRADOR - MODIFICADO
// =============================================================================

export const requestAdminChange = async (req, res) => {
    try {
        const { nuevoUsuario, nuevoCorreo, nuevaPassword, confirmarPassword } = req.body;

        // Validaciones (se mantienen igual)
        if (!nuevoUsuario || !nuevoCorreo || !nuevaPassword || !confirmarPassword) {
            return res.status(400).json({ success: false, message: 'Todos los campos son requeridos' });
        }

        if (nuevaPassword !== confirmarPassword) {
            return res.status(400).json({ success: false, message: 'Las contraseñas no coinciden' });
        }

        const currentAdmin = await User.findById(req.user.id);
        if (!currentAdmin) {
            return res.status(404).json({ success: false, message: 'Administrador actual no encontrado' });
        }

        // Verificar unicidad
        const existingUser = await User.findOne({ correo: nuevoCorreo });
        if (existingUser) {
            return res.status(400).json({ success: false, message: 'Este correo ya está registrado' });
        }

        const existingUsername = await User.findOne({ usuario: nuevoUsuario });
        if (existingUsername) {
            return res.status(400).json({ success: false, message: 'Este nombre de usuario ya está en uso' });
        }

        // Hashear contraseña
        const bcrypt = await import('bcryptjs');
        const hashedPassword = await bcrypt.hash(nuevaPassword, 10);

        // Crear solicitud
        const verificationToken = generateSecureToken();
        
        const adminChangeRequest = new AdminChangeRequest({
            currentAdminId: currentAdmin._id,
            currentAdminEmail: currentAdmin.correo,
            currentAdminName: currentAdmin.usuario,
            newAdminUser: nuevoUsuario,
            newAdminEmail: nuevoCorreo,
            newAdminPassword: hashedPassword,
            verificationToken,
            tokenExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
            status: 'pending',
            ipAddress: req.ip,
            userAgent: req.headers['user-agent']
        });

        await adminChangeRequest.save();
        console.log('✅ Solicitud de cambio creada:', adminChangeRequest._id);

        const verificationUrl = buildVerificationUrl(verificationToken);

        // ========== ENVIAR EMAIL USANDO SERVICIO CENTRALIZADO ==========
        try {
            await emailService.sendAdminChangeVerification(currentAdmin.correo, {
                currentAdminName: currentAdmin.usuario,
                newAdminUser: nuevoUsuario,
                newAdminEmail: nuevoCorreo,
                verificationUrl,
                requestId: adminChangeRequest._id
            });
            
            adminChangeRequest.notificationSent = true;
            await adminChangeRequest.save();
            console.log('✅ Email de verificación enviado');
            
        } catch (emailError) {
            console.error('❌ Error enviando email:', emailError.message);
            adminChangeRequest.notificationSent = false;
            adminChangeRequest.emailError = emailError.message;
            await adminChangeRequest.save();
        }

        await AuditService.log(req, {
            action: 'ADMIN_CHANGE_REQUEST',
            actionType: 'CREATE',
            actionCategory: 'ADMIN',
            targetId: adminChangeRequest._id,
            targetModel: 'AdminChangeRequest',
            targetName: `Cambio a ${nuevoUsuario}`,
            description: `Solicitud de cambio de administrador creada`,
            severity: 'WARNING',
            status: 'PENDING',
            metadata: {
                requestId: adminChangeRequest._id,
                currentAdmin: currentAdmin.usuario,
                newAdmin: nuevoUsuario,
                newAdminEmail: nuevoCorreo,
                notificationSent: adminChangeRequest.notificationSent
            }
        }).catch(err => console.error('❌ Error en auditoría:', err.message));

        res.json({
            success: true,
            message: '✅ Solicitud de cambio enviada. Revisa tu correo para confirmar.',
            requestId: adminChangeRequest._id,
            expiresAt: adminChangeRequest.tokenExpires
        });

    } catch (error) {
        console.error('🔥 ERROR en requestAdminChange:', error);
        res.status(500).json({
            success: false,
            message: 'Error del servidor al procesar solicitud'
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
// CONFIRMAR CAMBIO DE ADMINISTRADOR - MODIFICADO
// =============================================================================

export const confirmAdminChange = async (req, res) => {
    try {
        const { token } = req.body;

        if (!token) {
            return res.status(400).json({ success: false, message: 'Token requerido' });
        }

        const changeRequest = await AdminChangeRequest.findOne({
            verificationToken: token,
            status: 'pending'
        });

        if (!changeRequest) {
            return res.status(404).json({ success: false, message: 'Solicitud no encontrada' });
        }

        if (!changeRequest.isTokenValid()) {
            return res.status(400).json({ success: false, message: 'Token inválido o expirado' });
        }

        if (!changeRequest.newAdminPassword) {
            return res.status(500).json({ success: false, message: 'Error interno: contraseña no almacenada' });
        }

        // Desactivar admin actual
        const currentAdmin = await User.findById(changeRequest.currentAdminId);
        if (currentAdmin) {
            currentAdmin.correo = `old_${Date.now()}_${currentAdmin.correo}`;
            currentAdmin.usuario = `old_${Date.now()}_${currentAdmin.usuario}`;
            currentAdmin.activo = false;
            currentAdmin.rol = 'desactivado';
            await currentAdmin.save();
            changeRequest.oldAdminDeactivated = true;
        }

        // Crear nuevo admin
        const newAdmin = await User.create([{
            usuario: changeRequest.newAdminUser,
            correo: changeRequest.newAdminEmail,
            password: changeRequest.newAdminPassword,
            rol: 'administrador',
            activo: true
        }], { saveMiddleware: false });

        changeRequest.newAdminCreated = true;
        changeRequest.newAdminId = newAdmin._id;
        changeRequest.status = 'approved';
        changeRequest.approvedAt = new Date();
        await changeRequest.save();

        console.log('✅ Nuevo administrador creado:', newAdmin.usuario);

        const loginUrl = `${process.env.FRONTEND_URL || 'http://localhost:4000'}/login.html`;

        // ========== ENVIAR EMAIL DE BIENVENIDA ==========
        try {
            await emailService.sendNewAdminWelcome(changeRequest.newAdminEmail, {
                newAdminUser: changeRequest.newAdminUser,
                newAdminEmail: changeRequest.newAdminEmail,
                currentAdminName: changeRequest.currentAdminName,
                loginUrl
            });
            changeRequest.notificationSentNewAdmin = true;
            await changeRequest.save();
            console.log('✅ Email de bienvenida enviado');
        } catch (emailError) {
            console.error('⚠️ Error enviando email de bienvenida:', emailError.message);
        }

        await AuditService.log(req, {
            action: 'ADMIN_CHANGE_CONFIRM',
            actionType: 'UPDATE',
            actionCategory: 'ADMIN',
            targetId: changeRequest._id,
            targetModel: 'AdminChangeRequest',
            targetName: `Cambio a ${changeRequest.newAdminUser}`,
            description: `Cambio de administrador completado`,
            severity: 'CRITICAL',
            status: 'SUCCESS',
            metadata: {
                oldAdmin: changeRequest.currentAdminName,
                newAdmin: changeRequest.newAdminUser
            }
        }).catch(err => console.error('❌ Error en auditoría:', err.message));

        res.json({
            success: true,
            message: '✅ Cambio de administrador completado exitosamente.',
            newAdmin: {
                usuario: changeRequest.newAdminUser,
                correo: changeRequest.newAdminEmail
            },
            loginUrl
        });

    } catch (error) {
        console.error('🔥 ERROR en confirmAdminChange:', error);
        res.status(500).json({
            success: false,
            message: 'Error crítico al procesar cambio de administrador'
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
// DIAGNÓSTICO COMPLETO - MODIFICADO
// =============================================================================

export const testAdminChange = async (req, res) => {
    try {
        const emailStatus = emailService.getStatus();
        const verification = await emailService.verifyConnection();
        
        const adminCount = await User.countDocuments({ rol: 'administrador', activo: true });
        const pendingRequests = await AdminChangeRequest.countDocuments({ status: 'pending' });

        res.json({
            success: true,
            status: 'Sistema listo',
            diagnostics: {
                email: {
                    ...emailStatus,
                    conexion: verification.success ? '✅ Funcionando' : `❌ ${verification.message}`
                },
                database: '✅ Conectado',
                adminCount,
                pendingRequests,
                frontendUrl: process.env.FRONTEND_URL || 'http://localhost:4000'
            }
        });

    } catch (error) {
        res.status(500).json({ success: false, message: 'Error en diagnóstico', error: error.message });
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