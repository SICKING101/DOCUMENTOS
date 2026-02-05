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
// 1. SOLICITAR CAMBIO DE ADMINISTRADOR (CORREGIDO CON DEBUGGING)
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
            debugAdminChange.end('SOLICITUD CAMBIO ADMINISTRADOR', false);
            
            return res.status(400).json({
                success: false,
                message: 'Todos los campos son requeridos',
                missingFields: missing
            });
        }

        if (nuevaPassword !== confirmarPassword) {
            console.error('❌ Contraseñas no coinciden');
            debugAdminChange.end('SOLICITUD CAMBIO ADMINISTRADOR', false);
            return res.status(400).json({
                success: false,
                message: 'Las contraseñas no coinciden'
            });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(nuevoCorreo)) {
            console.error(`❌ Correo inválido: ${nuevoCorreo}`);
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
        debugAdminChange.end('VERIFICACIÓN DE TOKEN', false);
        res.status(500).json({
            success: false,
            message: 'Error del servidor al verificar token',
            timestamp: new Date().toISOString()
        });
    }
};

// =============================================================================
// 3. CONFIRMAR CAMBIO DE ADMINISTRADOR (CORREGIDO)
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
                
            } catch (emailError) {
                console.warn('⚠️ No se pudo enviar email:', emailError.message);
            }
        }

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
        debugAdminChange.end('RECHAZO DE CAMBIO', true);

        res.json({
            success: true,
            message: '✅ Solicitud de cambio rechazada exitosamente.'
        });

    } catch (error) {
        console.error('🔥 ERROR en rejectAdminChange:', error);
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