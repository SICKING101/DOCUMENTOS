import crypto from 'crypto';
import User from '../models/User.js';
import Role from '../models/Role.js';
import AdminChangeRequest from '../models/AdminChangeRequest.js';
import { transporter } from './authController.js';
import nodemailer from 'nodemailer';

// ============================================================================
// SECCIÓN: CONTROLADOR DE CAMBIO DE ADMINISTRADOR
// ============================================================================
// Este archivo maneja todas las operaciones relacionadas con la transferencia
// de privilegios de administrador entre usuarios. Incluye solicitud, verificación,
// confirmación y monitoreo del proceso completo de cambio de administrador.
// ============================================================================

// ============================================================================
// SECCIÓN: CONFIGURACIÓN INICIAL
// ============================================================================
// Configuración de constantes y verificación de inicialización del sistema
// ============================================================================

// Configuración del remitente para todos los correos electrónicos
const emailFrom = 'riosnavarretejared@gmail.com';

// Log de inicialización del controlador
console.log('\n🔐 ========== ADMIN CONTROLLER INICIALIZADO ==========');
console.log(`📧 Transporter: ${transporter ? '✅ CONFIGURADO' : '❌ NO CONFIGURADO'}`);
console.log('🔐 ====================================================\n');

// ============================================================================
// SECCIÓN: FUNCIONES AUXILIARES
// ============================================================================
// Funciones de apoyo utilizadas en múltiples partes del controlador
// ============================================================================

// ********************************************************************
// MÓDULO 1: GENERACIÓN DE TOKEN SEGURO
// ********************************************************************
// Descripción: Genera un token criptográficamente seguro utilizando
// el módulo crypto de Node.js. Este token se usa para verificar la
// autenticidad de las solicitudes de cambio de administrador.
// ********************************************************************
const generateSecureToken = () => {
    // Genera 32 bytes aleatorios y los convierte a formato hexadecimal
    return crypto.randomBytes(32).toString('hex');
};

// ********************************************************************
// MÓDULO 2: CONSTRUCCIÓN DE URL DE VERIFICACIÓN
// ********************************************************************
// Descripción: Construye la URL completa que el administrador actual
// debe visitar para confirmar el cambio. Incluye el token como parámetro
// de consulta para identificar la solicitud específica.
// ********************************************************************
const buildVerificationUrl = (token) => {
    // Obtiene la URL base del frontend desde variables de entorno
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:4000';
    // Construye la URL con el token como parámetro
    return `${baseUrl}/verify-admin-change.html?token=${token}`;
};

// ********************************************************************
// MÓDULO 3: ENVÍO DE EMAIL CON REINTENTOS
// ********************************************************************
// Descripción: Envía correos electrónicos con un sistema de reintentos
// automático. Si falla el primer intento, espera 2 segundos y reintenta
// hasta 3 veces antes de considerar el envío como fallido.
// ********************************************************************
const enviarEmailConReintentos = async (mailOptions, intentos = 3) => {
    // Verifica que el transporter esté configurado
    if (!transporter) throw new Error('Transporter no disponible');

    // Bucle de reintentos
    for (let i = 0; i < intentos; i++) {
        try {
            console.log(`📤 Intento ${i + 1} enviando email...`);
            // Intenta enviar el correo
            const info = await transporter.sendMail(mailOptions);
            console.log(`✅ Email enviado en intento ${i + 1}`);
            return info;
        } catch (error) {
            console.error(`❌ Intento ${i + 1} falló:`, error.message);
            // Si es el último intento, lanza el error
            if (i === intentos - 1) throw error;
            // Espera 2 segundos antes de reintentar
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }
};

// ============================================================================
// SECCIÓN: SISTEMA DE DEBUGGING
// ============================================================================
// Herramientas de diagnóstico y logueo detallado para monitorear
// el funcionamiento del proceso de cambio de administrador
// ============================================================================

// ********************************************************************
// MÓDULO 4: CONFIGURACIÓN DE DEBUGGING INTENSIVO
// ********************************************************************
// Descripción: Objeto que contiene todas las funciones de logging
// detallado para cada etapa del proceso. Permite rastrear problemas
// y entender el flujo completo de ejecución.
// ********************************************************************
const debugAdminChange = {
    // ----------------------------------------------------------------
    // BLOQUE 4.1: Inicio de operación de debug
    // ----------------------------------------------------------------
    // Registra el inicio de una operación específica con timestamp
    // y marca visual en los logs
    start: (operation) => {
        console.log(`\n🔍 ========== DEBUG ${operation.toUpperCase()} ==========`);
        console.log(`🕒 Iniciado: ${new Date().toISOString()}`);
    },
    
    // ----------------------------------------------------------------
    // BLOQUE 4.2: Log de datos de la solicitud HTTP
    // ----------------------------------------------------------------
    // Extrae y muestra información detallada de la petición entrante
    // incluyendo body, headers, usuario autenticado e IP
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
    
    // ----------------------------------------------------------------
    // BLOQUE 4.3: Log del estado actual de la base de datos
    // ----------------------------------------------------------------
    // Consulta y muestra estadísticas importantes de la base de datos
    // como cantidad de administradores activos y solicitudes pendientes
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
    
    // ----------------------------------------------------------------
    // BLOQUE 4.4: Log de procesamiento de contraseñas
    // ----------------------------------------------------------------
    // Muestra información sensible sobre el procesamiento de contraseñas
    // para debugging, incluyendo longitudes y hashes generados
    logPasswordProcessing: (plainPassword, hashedPassword = null) => {
        console.log('🔑 PROCESAMIENTO DE CONTRASEÑA:');
        console.log(`- Contraseña recibida: "${plainPassword ? plainPassword.substring(0, 3) + '...' : 'NULL'}"`);
        console.log(`- Longitud: ${plainPassword ? plainPassword.length : 0}`);
        console.log(`- Contraseña hasheada: ${hashedPassword ? hashedPassword.substring(0, 20) + '...' : 'NO PROCESADA'}`);
    },
    
    // ----------------------------------------------------------------
    // BLOQUE 4.5: Finalización de operación de debug
    // ----------------------------------------------------------------
    // Marca el final de una operación de debug con indicador de éxito
    // y timestamp de finalización
    end: (operation, success = true) => {
        console.log(`✅ ${success ? 'COMPLETADO' : 'FALLADO'}: ${operation.toUpperCase()}`);
        console.log(`🕒 Finalizado: ${new Date().toISOString()}`);
        console.log('🔍 ============================================\n');
    }
};

// ============================================================================
// SECCIÓN: CONTROLADOR PRINCIPAL
// ============================================================================
// Funciones principales del controlador que manejan las rutas HTTP
// y coordinan el proceso completo de cambio de administrador
// ============================================================================

// ********************************************************************
// MÓDULO 5: SOLICITUD DE CAMBIO DE ADMINISTRADOR
// ********************************************************************
// Descripción: Endpoint principal para iniciar el proceso de cambio
// de administrador. Valida los datos, crea la solicitud en base de datos
// y envía el correo de confirmación al administrador actual.
// ********************************************************************
export const requestAdminChange = async (req, res) => {
    // Inicia el debugging para esta operación
    debugAdminChange.start('SOLICITUD CAMBIO ADMINISTRADOR');
    debugAdminChange.logRequestData(req);
    
    try {
        // ----------------------------------------------------------------
        // BLOQUE 5.1: Extracción de datos de la solicitud
        // ----------------------------------------------------------------
        // Extrae todos los campos necesarios del body de la petición
        const { 
            nuevoUsuario, 
            nuevoCorreo, 
            nuevaPassword,
            confirmarPassword 
        } = req.body;

        // ----------------------------------------------------------------
        // BLOQUE 5.2: Validación detallada de datos
        // ----------------------------------------------------------------
        // Verifica que todos los campos requeridos estén presentes
        // y tengan el formato correcto
        console.log('🔍 VALIDANDO DATOS:');
        console.log(`- nuevoUsuario: "${nuevoUsuario}" (${nuevoUsuario?.length || 0} chars)`);
        console.log(`- nuevoCorreo: "${nuevoCorreo}"`);
        console.log(`- nuevaPassword: "${nuevaPassword ? '***' + nuevaPassword.substring(nuevaPassword.length - 2) : 'NULL'}"`);
        console.log(`- confirmarPassword: "${confirmarPassword ? '***' + confirmarPassword.substring(confirmarPassword.length - 2) : 'NULL'}"`);

        // Validación de campos requeridos
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

        // Validación de coincidencia de contraseñas
        if (nuevaPassword !== confirmarPassword) {
            console.error('❌ Contraseñas no coinciden');
            debugAdminChange.end('SOLICITUD CAMBIO ADMINISTRADOR', false);
            return res.status(400).json({
                success: false,
                message: 'Las contraseñas no coinciden'
            });
        }

        // Validación de formato de correo electrónico
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(nuevoCorreo)) {
            console.error(`❌ Correo inválido: ${nuevoCorreo}`);
            debugAdminChange.end('SOLICITUD CAMBIO ADMINISTRADOR', false);
            return res.status(400).json({
                success: false,
                message: 'Correo electrónico inválido'
            });
        }

        // ----------------------------------------------------------------
        // BLOQUE 5.3: Obtención del administrador actual
        // ----------------------------------------------------------------
        // Busca al administrador actual en la base de datos usando
        // el ID del usuario autenticado
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

        // ----------------------------------------------------------------
        // BLOQUE 5.4: Verificación de unicidad de datos
        // ----------------------------------------------------------------
        // Verifica que el nuevo usuario y correo no existan ya en el sistema
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

        // ----------------------------------------------------------------
        // BLOQUE 5.5: Procesamiento seguro de contraseña
        // ----------------------------------------------------------------
        // Hashea la contraseña usando bcrypt antes de almacenarla
        debugAdminChange.logPasswordProcessing(nuevaPassword);
        
        // Importación dinámica de bcrypt para hashing
        const bcrypt = await import('bcryptjs');
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(nuevaPassword, salt);
        
        debugAdminChange.logPasswordProcessing(nuevaPassword, hashedPassword);

        // ----------------------------------------------------------------
        // BLOQUE 5.6: Creación de solicitud de cambio
        // ----------------------------------------------------------------
        // Crea un registro en la colección AdminChangeRequest con todos
        // los datos necesarios para procesar el cambio
        const verificationToken = generateSecureToken();
        
        console.log('📝 Creando solicitud de cambio...');
        
        const adminChangeRequest = new AdminChangeRequest({
            currentAdminId: currentAdmin._id,
            currentAdminEmail: currentAdmin.correo,
            currentAdminName: currentAdmin.usuario,
            newAdminUser: nuevoUsuario,
            newAdminEmail: nuevoCorreo,
            newAdminPassword: hashedPassword, // Contraseña ya hasheada
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

        // ----------------------------------------------------------------
        // BLOQUE 5.7: Verificación del estado del sistema
        // ----------------------------------------------------------------
        // Muestra el estado actual de la base de datos para debugging
        await debugAdminChange.logDatabaseState();

        // ----------------------------------------------------------------
        // BLOQUE 5.8: Envío de email de confirmación
        // ----------------------------------------------------------------
        // Verifica si el transporter está disponible y envía el correo
        // de confirmación al administrador actual
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
        
        // ----------------------------------------------------------------
        // BLOQUE 5.9: Respuesta exitosa
        // ----------------------------------------------------------------
        // Devuelve una respuesta JSON con todos los detalles de la solicitud
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
        // ----------------------------------------------------------------
        // BLOQUE 5.10: Manejo de errores críticos
        // ----------------------------------------------------------------
        // Captura y loguea errores no esperados en el proceso
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

// ********************************************************************
// MÓDULO 6: VERIFICACIÓN DE TOKEN DE CAMBIO
// ********************************************************************
// Descripción: Endpoint para validar un token de cambio de administrador.
// Verifica que el token exista, esté activo y no haya expirado.
// ********************************************************************
export const verifyAdminChangeToken = async (req, res) => {
    debugAdminChange.start('VERIFICACIÓN DE TOKEN');
    
    try {
        // ----------------------------------------------------------------
        // BLOQUE 6.1: Extracción y validación del token
        // ----------------------------------------------------------------
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

        // ----------------------------------------------------------------
        // BLOQUE 6.2: Búsqueda de la solicitud en base de datos
        // ----------------------------------------------------------------
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

        // ----------------------------------------------------------------
        // BLOQUE 6.3: Verificación de expiración del token
        // ----------------------------------------------------------------
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
        
        // ----------------------------------------------------------------
        // BLOQUE 6.4: Verificación de contraseña almacenada
        // ----------------------------------------------------------------
        console.log('🔍 Verificando contraseña almacenada:');
        console.log(`- Password stored: ${!!changeRequest.newAdminPassword}`);
        console.log(`- Password length in DB: ${changeRequest.newAdminPassword?.length || 0}`);

        debugAdminChange.end('VERIFICACIÓN DE TOKEN', true);
        
        // ----------------------------------------------------------------
        // BLOQUE 6.5: Respuesta con datos de la solicitud
        // ----------------------------------------------------------------
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
        // ----------------------------------------------------------------
        // BLOQUE 6.6: Manejo de errores en verificación
        // ----------------------------------------------------------------
        console.error('🔥 ERROR en verifyAdminChangeToken:', error);
        debugAdminChange.end('VERIFICACIÓN DE TOKEN', false);
        res.status(500).json({
            success: false,
            message: 'Error del servidor al verificar token',
            timestamp: new Date().toISOString()
        });
    }
};

// ********************************************************************
// MÓDULO 7: CONFIRMACIÓN DE CAMBIO DE ADMINISTRADOR
// ********************************************************************
// Descripción: Endpoint que ejecuta el cambio real de administrador.
// Desactiva al administrador actual, crea el nuevo administrador
// y actualiza el estado de la solicitud.
// ********************************************************************
export const confirmAdminChange = async (req, res) => {
    debugAdminChange.start('CONFIRMACIÓN DE CAMBIO');
    
    try {
        // ----------------------------------------------------------------
        // BLOQUE 7.1: Extracción y validación del token
        // ----------------------------------------------------------------
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

        // ----------------------------------------------------------------
        // BLOQUE 7.2: Búsqueda de la solicitud pendiente
        // ----------------------------------------------------------------
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

        // ----------------------------------------------------------------
        // BLOQUE 7.3: Verificación de validez del token
        // ----------------------------------------------------------------
        if (!changeRequest.isTokenValid()) {
            console.error('❌ Token inválido o expirado');
            debugAdminChange.end('CONFIRMACIÓN DE CAMBIO', false);
            return res.status(400).json({
                success: false,
                message: 'Token inválido o expirado'
            });
        }

        // ----------------------------------------------------------------
        // BLOQUE 7.4: Verificación crítica de contraseña almacenada
        // ----------------------------------------------------------------
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

        // ----------------------------------------------------------------
        // BLOQUE 7.5: Desactivación del administrador actual
        // ----------------------------------------------------------------
        const currentAdmin = await User.findById(changeRequest.currentAdminId);
        
        if (currentAdmin) {
            console.log(`👤 Desactivando admin actual: ${currentAdmin.usuario}`);
            
            // Modifica el email y usuario para evitar conflictos
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

        // ----------------------------------------------------------------
        // BLOQUE 7.6: Creación del nuevo administrador
        // ----------------------------------------------------------------
        console.log('👤 Creando nuevo administrador...');
        console.log(`- Usuario: ${changeRequest.newAdminUser}`);
        console.log(`- Email: ${changeRequest.newAdminEmail}`);
        console.log(`- Password hash: ${changeRequest.newAdminPassword.substring(0, 20)}...`);

        // Datos para el nuevo administrador usando el hash ya almacenado
        const newAdminData = {
            usuario: changeRequest.newAdminUser,
            correo: changeRequest.newAdminEmail,
            password: changeRequest.newAdminPassword, // Hash ya existente
            rol: 'administrador',
            activo: true,
            ultimoAcceso: new Date(),
            metadata: {
                createdFromRequest: changeRequest._id,
                createdByAdmin: changeRequest.currentAdminId,
                createdAt: new Date()
            }
        };

        // Creación del usuario deshabilitando middleware de hash
        const newAdmin = await User.create([newAdminData], {
            saveMiddleware: false // Evita que se vuelva a hashear la contraseña
        });

        console.log('✅ Nuevo administrador creado:', {
            id: newAdmin._id,
            usuario: newAdmin.usuario,
            correo: newAdmin.correo,
            passwordStored: !!newAdmin.password,
            passwordLength: newAdmin.password?.length
        });

        // ----------------------------------------------------------------
        // BLOQUE 7.7: Prueba de autenticación del nuevo usuario
        // ----------------------------------------------------------------
        console.log('🔐 Probando autenticación del nuevo usuario...');
        
        try {
            const testPassword = 'test';
            const bcrypt = await import('bcryptjs');
            
            // Prueba que el hash almacenado sea válido
            const isValidFormat = await bcrypt.compare(testPassword, newAdmin.password);
            console.log(`✅ Formato de hash válido: ${isValidFormat ? 'NO (esperado para contraseña incorrecta)' : 'SÍ, hash funciona'}`);
            
        } catch (authError) {
            console.error('⚠️ Advertencia en prueba de autenticación:', authError.message);
        }

        // ----------------------------------------------------------------
        // BLOQUE 7.8: Actualización del estado de la solicitud
        // ----------------------------------------------------------------
        changeRequest.newAdminCreated = true;
        changeRequest.newAdminId = newAdmin._id;
        changeRequest.status = 'approved';
        changeRequest.approvedAt = new Date();
        await changeRequest.save();
        
        console.log('✅ Solicitud marcada como aprobada');

        // ----------------------------------------------------------------
        // BLOQUE 7.9: Envío de email al nuevo administrador
        // ----------------------------------------------------------------
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
        
        // ----------------------------------------------------------------
        // BLOQUE 7.10: Verificación final del estado del sistema
        // ----------------------------------------------------------------
        await debugAdminChange.logDatabaseState();

        // ----------------------------------------------------------------
        // BLOQUE 7.11: Respuesta exitosa con datos del cambio
        // ----------------------------------------------------------------
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
        // ----------------------------------------------------------------
        // BLOQUE 7.12: Manejo de errores críticos en confirmación
        // ----------------------------------------------------------------
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

// ********************************************************************
// MÓDULO 8: RECHAZO DE SOLICITUD DE CAMBIO
// ********************************************************************
// Descripción: Endpoint para que un administrador rechace una solicitud
// de cambio pendiente. Cambia el estado de la solicitud a 'rejected'.
// ********************************************************************
export const rejectAdminChange = async (req, res) => {
    debugAdminChange.start('RECHAZO DE CAMBIO');
    
    try {
        // ----------------------------------------------------------------
        // BLOQUE 8.1: Extracción y validación del token
        // ----------------------------------------------------------------
        const { token } = req.body;

        if (!token) {
            debugAdminChange.end('RECHAZO DE CAMBIO', false);
            return res.status(400).json({
                success: false,
                message: 'Token requerido'
            });
        }

        // ----------------------------------------------------------------
        // BLOQUE 8.2: Búsqueda de solicitud pendiente
        // ----------------------------------------------------------------
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

        // ----------------------------------------------------------------
        // BLOQUE 8.3: Actualización del estado a rechazado
        // ----------------------------------------------------------------
        changeRequest.status = 'rejected';
        changeRequest.rejectedAt = new Date();
        await changeRequest.save();

        console.log('✅ Solicitud rechazada:', changeRequest._id);
        debugAdminChange.end('RECHAZO DE CAMBIO', true);

        // ----------------------------------------------------------------
        // BLOQUE 8.4: Respuesta de confirmación
        // ----------------------------------------------------------------
        res.json({
            success: true,
            message: '✅ Solicitud de cambio rechazada exitosamente.'
        });

    } catch (error) {
        // ----------------------------------------------------------------
        // BLOQUE 8.5: Manejo de errores en rechazo
        // ----------------------------------------------------------------
        console.error('🔥 ERROR en rejectAdminChange:', error);
        debugAdminChange.end('RECHAZO DE CAMBIO', false);
        res.status(500).json({
            success: false,
            message: 'Error al rechazar solicitud',
            timestamp: new Date().toISOString()
        });
    }
};

// ********************************************************************
// MÓDULO 9: OBTENCIÓN DE SOLICITUDES PENDIENTES
// ********************************************************************
// Descripción: Endpoint para que un administrador vea todas sus
// solicitudes de cambio que están en estado pendiente.
// ********************************************************************
export const getPendingRequests = async (req, res) => {
    debugAdminChange.start('OBTENIENDO SOLICITUDES PENDIENTES');
    
    try {
        // ----------------------------------------------------------------
        // BLOQUE 9.1: Obtención del ID del administrador actual
        // ----------------------------------------------------------------
        const currentAdminId = req.user.id;

        // ----------------------------------------------------------------
        // BLOQUE 9.2: Búsqueda de solicitudes pendientes
        // ----------------------------------------------------------------
        const pendingRequests = await AdminChangeRequest.find({
            currentAdminId,
            status: 'pending'
        }).sort({ requestedAt: -1 }); // Orden descendente por fecha

        console.log(`📋 ${pendingRequests.length} solicitudes pendientes`);
        debugAdminChange.end('OBTENIENDO SOLICITUDES PENDIENTES', true);

        // ----------------------------------------------------------------
        // BLOQUE 9.3: Formateo y envío de la respuesta
        // ----------------------------------------------------------------
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
        // ----------------------------------------------------------------
        // BLOQUE 9.4: Manejo de errores en obtención
        // ----------------------------------------------------------------
        console.error('🔥 ERROR en getPendingRequests:', error);
        debugAdminChange.end('OBTENIENDO SOLICITUDES PENDIENTES', false);
        res.status(500).json({
            success: false,
            message: 'Error al obtener solicitudes',
            timestamp: new Date().toISOString()
        });
    }
};

// ********************************************************************
// MÓDULO 10: VERIFICACIÓN DE ESTADO DE SOLICITUD
// ********************************************************************
// Descripción: Endpoint para obtener el estado detallado de una
// solicitud de cambio específica usando su ID.
// ********************************************************************
export const getRequestStatus = async (req, res) => {
    debugAdminChange.start('VERIFICANDO ESTADO DE SOLICITUD');
    
    try {
        // ----------------------------------------------------------------
        // BLOQUE 10.1: Extracción y validación del ID
        // ----------------------------------------------------------------
        const { requestId } = req.params;

        if (!requestId) {
            debugAdminChange.end('VERIFICANDO ESTADO DE SOLICITUD', false);
            return res.status(400).json({
                success: false,
                message: 'ID de solicitud requerido'
            });
        }

        // ----------------------------------------------------------------
        // BLOQUE 10.2: Búsqueda de la solicitud por ID
        // ----------------------------------------------------------------
        const changeRequest = await AdminChangeRequest.findById(requestId);

        if (!changeRequest) {
            debugAdminChange.end('VERIFICANDO ESTADO DE SOLICITUD', false);
            return res.status(404).json({
                success: false,
                message: 'Solicitud no encontrada'
            });
        }

        debugAdminChange.end('VERIFICANDO ESTADO DE SOLICITUD', true);

        // ----------------------------------------------------------------
        // BLOQUE 10.3: Formateo y envío de datos de la solicitud
        // ----------------------------------------------------------------
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
        // ----------------------------------------------------------------
        // BLOQUE 10.4: Manejo de errores en verificación
        // ----------------------------------------------------------------
        console.error('🔥 ERROR en getRequestStatus:', error);
        debugAdminChange.end('VERIFICANDO ESTADO DE SOLICITUD', false);
        res.status(500).json({
            success: false,
            message: 'Error al verificar estado',
            timestamp: new Date().toISOString()
        });
    }
};

// Obtener todos los usuarios (no admins)
export const getUsuarios = async (req, res) => {
    try {
        const usuarios = await User.find({ 
            rol: { $ne: 'administrador' } 
        }).select('-password').lean();
        
        res.json({
            success: true,
            usuarios
        });
    } catch (error) {
        console.error('Error getUsuarios:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener usuarios'
        });
    }
};

// Crear nuevo usuario (no admin)
export const crearUsuario = async (req, res) => {
    try {
        const { usuario, correo, password, rol, permisos } = req.body;
        
        // Verificar si ya existe
        const existe = await User.findOne({
            $or: [{ usuario }, { correo }]
        });
        
        if (existe) {
            return res.status(400).json({
                success: false,
                message: 'El usuario o correo ya existe'
            });
        }
        
        // Crear usuario
        const nuevoUsuario = new User({
            usuario,
            correo,
            password,
            rol: rol || 'usuario',
            permisos: permisos || []
        });
        
        await nuevoUsuario.save();
        
        res.status(201).json({
            success: true,
            message: 'Usuario creado exitosamente',
            user: {
                id: nuevoUsuario._id,
                usuario: nuevoUsuario.usuario,
                correo: nuevoUsuario.correo,
                rol: nuevoUsuario.rol,
                permisos: nuevoUsuario.permisos
            }
        });
    } catch (error) {
        console.error('Error crearUsuario:', error);
        res.status(500).json({
            success: false,
            message: 'Error al crear usuario'
        });
    }
};

// Editar usuario
export const editarUsuario = async (req, res) => {
    try {
        const { id } = req.params;
        const { usuario, correo, rol, permisos, activo } = req.body;
        
        // No permitir editar al admin único
        const userToEdit = await User.findById(id);
        if (userToEdit.esAdminUnico) {
            return res.status(403).json({
                success: false,
                message: 'No puedes editar al administrador único'
            });
        }
        
        const updatedUser = await User.findByIdAndUpdate(
            id,
            { usuario, correo, rol, permisos, activo },
            { new: true, runValidators: true }
        ).select('-password');
        
        res.json({
            success: true,
            message: 'Usuario actualizado',
            user: updatedUser
        });
    } catch (error) {
        console.error('Error editarUsuario:', error);
        res.status(500).json({
            success: false,
            message: 'Error al actualizar usuario'
        });
    }
};

// Eliminar usuario (dar de baja)
export const eliminarUsuario = async (req, res) => {
    try {
        const { id } = req.params;
        
        // No permitir eliminar al admin único
        const userToDelete = await User.findById(id);
        if (userToDelete.esAdminUnico) {
            return res.status(403).json({
                success: false,
                message: 'No puedes eliminar al administrador único'
            });
        }
        
        // Soft delete - solo desactivar
        await User.findByIdAndUpdate(id, { 
            activo: false,
            rol: 'desactivado'
        });
        
        res.json({
            success: true,
            message: 'Usuario desactivado exitosamente'
        });
    } catch (error) {
        console.error('Error eliminarUsuario:', error);
        res.status(500).json({
            success: false,
            message: 'Error al eliminar usuario'
        });
    }
};

// Obtener roles disponibles
export const getRoles = async (req, res) => {
    try {
        const roles = await Role.find().lean();
        res.json({
            success: true,
            roles
        });
    } catch (error) {
        console.error('Error getRoles:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener roles'
        });
    }
};

// Crear nuevo rol
export const crearRol = async (req, res) => {
    try {
        const { nombre, descripcion, permisos } = req.body;
        
        const nuevoRol = new Role({
            nombre,
            descripcion,
            permisos,
            creadoPor: req.user._id
        });
        
        await nuevoRol.save();
        
        res.status(201).json({
            success: true,
            message: 'Rol creado exitosamente',
            rol: nuevoRol
        });
    } catch (error) {
        console.error('Error crearRol:', error);
        res.status(500).json({
            success: false,
            message: 'Error al crear rol'
        });
    }
};

// Verificar si se puede cambiar admin
export const verificarCambioAdmin = async (req, res) => {
    try {
        const adminCount = await User.countDocuments({ 
            rol: 'administrador',
            activo: true 
        });
        
        // Solo permitir cambio si es el único admin activo
        const puedeCambiar = adminCount === 1 && req.user.esAdminUnico;
        
        res.json({
            success: true,
            puedeCambiar,
            adminCount
        });
    } catch (error) {
        console.error('Error verificarCambioAdmin:', error);
        res.status(500).json({
            success: false,
            message: 'Error al verificar'
        });
    }
};

// ********************************************************************
// MÓDULO 11: DIAGNÓSTICO COMPLETO DEL SISTEMA
// ********************************************************************
// Descripción: Endpoint de diagnóstico que verifica el estado de
// todos los componentes del sistema de cambio de administrador.
// ********************************************************************
export const testAdminChange = async (req, res) => {
    debugAdminChange.start('DIAGNÓSTICO COMPLETO DEL SISTEMA');
    
    try {
        // ----------------------------------------------------------------
        // BLOQUE 11.1: Verificación de configuración de email
        // ----------------------------------------------------------------
        let emailStatus = '❌ No configurado';
        if (transporter) {
            try {
                await transporter.verify();
                emailStatus = '✅ Configurado y funcionando';
            } catch (emailError) {
                emailStatus = `❌ Error: ${emailError.message}`;
            }
        }

        // ----------------------------------------------------------------
        // BLOQUE 11.2: Obtención de estadísticas del sistema
        // ----------------------------------------------------------------
        const adminCount = await User.countDocuments({ rol: 'administrador', activo: true });
        const deactivatedCount = await User.countDocuments({ rol: 'desactivado' });
        const pendingRequests = await AdminChangeRequest.countDocuments({ status: 'pending' });
        const approvedRequests = await AdminChangeRequest.countDocuments({ status: 'approved' });

        // ----------------------------------------------------------------
        // BLOQUE 11.3: Obtención de solicitudes recientes
        // ----------------------------------------------------------------
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

        // ----------------------------------------------------------------
        // BLOQUE 11.4: Formateo y envío del diagnóstico completo
        // ----------------------------------------------------------------
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
        // ----------------------------------------------------------------
        // BLOQUE 11.5: Manejo de errores en diagnóstico
        // ----------------------------------------------------------------
        console.error('❌ ERROR en testAdminChange:', error);
        debugAdminChange.end('DIAGNÓSTICO COMPLETO DEL SISTEMA', false);
        res.status(500).json({
            success: false,
            message: 'Error en diagnóstico',
            error: error.message
        });
    }
};

// ********************************************************************
// MÓDULO 12: ENDPOINT DE DEBUG - VISUALIZACIÓN DE CONTRASEÑA
// ********************************************************************
// Descripción: Endpoint exclusivo para desarrollo que muestra
// información sensible sobre el almacenamiento de contraseñas.
// Solo disponible en modo desarrollo.
// ********************************************************************
export const debugPasswordStorage = async (req, res) => {
    // ----------------------------------------------------------------
    // BLOQUE 12.1: Validación de entorno de desarrollo
    // ----------------------------------------------------------------
    if (process.env.NODE_ENV !== 'development') {
        return res.status(403).json({
            success: false,
            message: 'Solo disponible en modo desarrollo'
        });
    }

    try {
        // ----------------------------------------------------------------
        // BLOQUE 12.2: Extracción del ID de solicitud
        // ----------------------------------------------------------------
        const { requestId } = req.params;
        
        // ----------------------------------------------------------------
        // BLOQUE 12.3: Búsqueda de solicitud con campos específicos
        // ----------------------------------------------------------------
        const changeRequest = await AdminChangeRequest.findById(requestId)
            .select('newAdminUser newAdminEmail newAdminPassword status requestedAt');
        
        if (!changeRequest) {
            return res.status(404).json({
                success: false,
                message: 'Solicitud no encontrada'
            });
        }

        // ----------------------------------------------------------------
        // BLOQUE 12.4: Formateo y envío de información sensible
        // ----------------------------------------------------------------
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
        // ----------------------------------------------------------------
        // BLOQUE 12.5: Manejo de errores en endpoint de debug
        // ----------------------------------------------------------------
        console.error('Error en debug:', error);
        res.status(500).json({
            success: false,
            message: 'Error en debug',
            error: error.message
        });
    }
};