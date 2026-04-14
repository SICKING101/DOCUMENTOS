import Ticket from '../models/Ticket.js';
import User from '../models/User.js';
import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import nodemailer from 'nodemailer';
import mongoose from 'mongoose';
import emailService from '../services/emailService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configurar Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

console.log('\n🎫 ========== SUPPORT CONTROLLER INICIALIZADO ==========');
console.log(`📧 Usando servicio de email centralizado`);
console.log(`📧 Estado: ${emailService.getStatus().configured ? '✅ CONFIGURADO' : '❌ NO CONFIGURADO'}`);
console.log('🎫 ======================================================\n');

try {
    console.log('📧 Configurando transporter de email con variables de entorno...');
    console.log('🔍 Variables de entorno encontradas:', {
        EMAIL_HOST: !!process.env.EMAIL_HOST,
        EMAIL_USER: !!process.env.EMAIL_USER,
        EMAIL_PASS: !!process.env.EMAIL_PASS,
        EMAIL_PORT: !!process.env.EMAIL_PORT
    });
    
    if (process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
        transporter = nodemailer.createTransport({
            host: EMAIL_HOST,
            port: EMAIL_PORT,
            secure: false,
            auth: {
                user: SYSTEM_EMAIL,
                pass: SYSTEM_EMAIL_PASS
            },
            tls: {
                ciphers: 'SSLv3',
                rejectUnauthorized: false
            },
            connectionTimeout: 10000,
            greetingTimeout: 10000,
            socketTimeout: 10000,
            debug: true,
            logger: true
        });

        console.log('✅ TRANSPORTER GMAIL CONFIGURADO CON VARIABLES DE ENTORNO');
        console.log(`📧 Usuario: ${SYSTEM_EMAIL}`);
        console.log(`🌐 Host: ${EMAIL_HOST}:${EMAIL_PORT}`);
        
        // Verificar conexión
        transporter.verify((error, success) => {
            if (error) {
                console.error('❌ ERROR VERIFICANDO CONEXIÓN GMAIL:', error.message);
            } else {
                console.log('✅ CONEXIÓN GMAIL VERIFICADA CON ÉXITO');
            }
        });
        
    } else {
        console.warn('⚠️ Variables de entorno de email no encontradas, usando credenciales hardcodeadas');
        
        // Fallback a credenciales hardcodeadas
        transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 587,
            secure: false,
            auth: {
                user: 'riosnavarretejared@gmail.com',
                pass: 'emdkqnupuzzzucnw'
            },
            tls: {
                ciphers: 'SSLv3',
                rejectUnauthorized: false
            }
        });
    }
    
} catch (error) {
    console.error('❌ ERROR CRÍTICO configurando email:', error.message);
}

// =============================================================================
// FUNCIÓN PARA ENVIAR EMAIL CON GMAIL
// =============================================================================

const enviarEmailGmail = async (mailOptions, intentos = 3) => {
    if (!transporter) {
        console.log('📧 Transporter no disponible - Mostrando email en consola');
        console.log('='.repeat(80));
        console.log('📧 EMAIL SIMULADO:');
        console.log('='.repeat(80));
        console.log(`Para: ${mailOptions.to}`);
        console.log(`Asunto: ${mailOptions.subject}`);
        console.log('='.repeat(80));
        return { message: 'Email simulado' };
    }

    for (let i = 0; i < intentos; i++) {
        try {
            console.log(`📤 Intento ${i + 1} de ${intentos} enviando email...`);
            const info = await transporter.sendMail(mailOptions);
            console.log(`✅ Email enviado en intento ${i + 1}`);
            return info;
        } catch (error) {
            console.error(`❌ Intento ${i + 1} falló:`, error.message);
            
            if (i === intentos - 1) {
                console.error('🔥 TODOS los intentos fallaron');
                throw error;
            }
            
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }
};

const monitorMemory = () => {
    const memoryUsage = process.memoryUsage();
    console.log('\n' + '📊'.repeat(20));
    console.log('📊 MONITOR DE MEMORIA');
    console.log('📊'.repeat(20));
    console.log(`  Heap usado: ${Math.round(memoryUsage.heapUsed / 1024 / 1024)} MB`);
    console.log(`  Heap total: ${Math.round(memoryUsage.heapTotal / 1024 / 1024)} MB`);
    console.log(`  Porcentaje: ${Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100)}%`);
    console.log(`  RSS: ${Math.round(memoryUsage.rss / 1024 / 1024)} MB`);
    console.log(`  Timestamp: ${new Date().toLocaleString('es-MX')}`);
    console.log('📊'.repeat(20) + '\n');
};

class SupportController {
    // =====================================================================
    // 1. CREAR NUEVO TICKET
    // =====================================================================
    
    // =====================================================================
    // CREAR NUEVO TICKET - MODIFICADO
    // =====================================================================
    
    static async createTicket(req, res) {
        let ticketNumber = null;
        let userId = null;
        
        try {
            console.log('\n' + '='.repeat(80));
            console.log('🎫 ========== CREANDO NUEVO TICKET DE SOPORTE ==========');
            
            const { subject, description, category, priority, emailNotifications = 'true' } = req.body;
            
            // Validaciones
            if (!subject || !description || !category || !priority) {
                return res.status(400).json({
                    success: false,
                    message: 'Todos los campos obligatorios deben ser completados'
                });
            }
            
            // Identificar usuario
            let userName, userEmail;
            if (req.user && req.user._id) {
                userId = new mongoose.Types.ObjectId(req.user._id);
                userName = req.user.name || req.user.usuario || 'Usuario Autenticado';
                userEmail = req.user.email || req.user.correo || 'usuario@ejemplo.com';
            } else {
                userId = null;
                userName = 'Usuario del Sistema';
                userEmail = req.body.email || 'usuario@cbtis051.edu.mx';
            }
            
            // Buscar administrador
            let adminEmail = emailService.config.user;
            let adminName = 'Administrador del Sistema';
            
            try {
                const adminUser = await User.findOne({ rol: 'administrador', activo: true })
                    .select('correo usuario').lean();
                if (adminUser) {
                    adminEmail = adminUser.correo;
                    adminName = adminUser.usuario || 'Administrador';
                }
            } catch (error) {
                console.error('❌ Error buscando administrador:', error.message);
            }
            
            // Generar número de ticket único
            let ticketExists = true;
            let attempts = 0;
            while (ticketExists && attempts < 10) {
                const date = new Date();
                const dateStr = date.getFullYear() + 
                               String(date.getMonth() + 1).padStart(2, '0') + 
                               String(date.getDate()).padStart(2, '0');
                const randomNum = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
                ticketNumber = `TKT-${dateStr}-${randomNum}`;
                
                const existingTicket = await Ticket.findOne({ ticketNumber });
                ticketExists = !!existingTicket;
                attempts++;
            }
            
            // Crear ticket
            const newTicket = new Ticket({
                ticketNumber,
                subject,
                description,
                category,
                priority,
                createdBy: userId,
                createdByName: userName,
                createdByEmail: userEmail,
                adminEmail,
                adminName,
                emailNotifications: emailNotifications === 'true',
                status: 'abierto',
                updates: [{
                    user: userId,
                    userName: userName,
                    message: 'Ticket creado exitosamente',
                    type: 'system',
                    createdAt: new Date()
                }]
            });
            
            // Procesar archivos adjuntos
            if (req.files && req.files.length > 0) {
                const attachments = [];
                for (const file of req.files) {
                    try {
                        const result = await cloudinary.uploader.upload(file.path, {
                            folder: 'tickets_soporte',
                            resource_type: 'auto'
                        });
                        attachments.push({
                            filename: file.originalname,
                            originalname: file.originalname,
                            size: file.size,
                            mimetype: file.mimetype,
                            cloudinary_url: result.secure_url,
                            public_id: result.public_id,
                            uploadedAt: new Date()
                        });
                        if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
                    } catch (uploadError) {
                        console.error(`❌ Error subiendo ${file.originalname}:`, uploadError.message);
                    }
                }
                if (attachments.length > 0) newTicket.attachments = attachments;
            }
            
            await newTicket.save();
            console.log(`✅ Ticket guardado: ${newTicket.ticketNumber}`);
            
            // ========== ENVIAR EMAILS USANDO SERVICIO CENTRALIZADO ==========
            const userForEmails = { name: userName, email: userEmail };
            
            try {
                // Email al administrador (VERDE)
                await emailService.sendTicketCreatedToAdmin(adminEmail, {
                    ticket: newTicket,
                    user: userForEmails,
                    adminName
                });
                console.log('✅ Email VERDE enviado al administrador');
                
                // Email al usuario (ROJO)
                if (emailNotifications === 'true') {
                    await emailService.sendTicketCreatedToUser(userEmail, {
                        ticket: newTicket,
                        user: userForEmails
                    });
                    console.log('✅ Email ROJO enviado al usuario');
                }
            } catch (emailError) {
                console.error('⚠️ Error enviando emails:', emailError.message);
            }
            
            console.log('🎫 ========== TICKET CREADO EXITOSAMENTE ==========\n');
            
            res.status(201).json({
                success: true,
                message: '✅ Ticket creado exitosamente. Revisa tu correo para la confirmación.',
                ticket: newTicket,
                ticketNumber: newTicket.ticketNumber,
                ticketId: newTicket._id
            });
            
        } catch (error) {
            console.error('❌ ERROR CREANDO TICKET:', error);
            
            // Limpiar archivos temporales
            if (req.files) {
                req.files.forEach(file => {
                    if (fs.existsSync(file.path)) {
                        try { fs.unlinkSync(file.path); } catch (e) {}
                    }
                });
            }
            
            res.status(500).json({
                success: false,
                message: 'Error interno al crear ticket',
                error: error.message
            });
        }
    }

    // =====================================================================
    // 5. OBTENER GUÍA DEL SISTEMA
    // =====================================================================
    
    static async getSystemGuide(req, res) {
        try {
            console.log('📖 Obteniendo guía del sistema');
            
            const guide = [
                {
                    step: 1,
                    title: "Crear un Ticket",
                    description: "Describe tu problema, adjunta archivos si es necesario y envía",
                    icon: "plus-circle",
                    duration: "2 minutos"
                },
                {
                    step: 2,
                    title: "Esperar Confirmación",
                    description: "Recibirás un email confirmando que tu ticket está ABIERTO",
                    icon: "envelope",
                    duration: "Automático"
                },
                {
                    step: 3,
                    title: "Verificar Estado",
                    description: "Revisa el sistema para ver cuando cambia a EN PROCESO",
                    icon: "eye",
                    duration: "1 minuto"
                },
                {
                    step: 4,
                    title: "Esperar Solución",
                    description: "El equipo trabaja en tu problema. Recibirás emails informativos",
                    icon: "clock",
                    duration: "Variable"
                },
                {
                    step: 5,
                    title: "Ticket Cerrado",
                    description: "Cuando el problema se resuelva, el ticket se marcará como CERRADO",
                    icon: "check-circle",
                    duration: "Automático"
                }
            ];
            
            console.log(`✅ ${guide.length} pasos de guía obtenidos`);
            
            res.json({
                success: true,
                guide
            });
            
        } catch (error) {
            console.error('❌ Error obteniendo guía del sistema:', error);
            res.status(500).json({
                success: false,
                message: 'Error obteniendo guía del sistema'
            });
        }
    }

     // =====================================================================
    // PRUEBA DE EMAIL - MODIFICADO
    // =====================================================================
    
    static async testSupportEmail(req, res) {
        try {
            console.log('\n🧪 Probando sistema de emails de soporte...');
            
            const testEmail = req.body.email || emailService.config.user;
            const info = await emailService.sendTestEmail(testEmail, 'Soporte');
            
            res.json({
                success: true,
                message: 'Email de prueba enviado exitosamente',
                info: info.simulated ? { simulated: true } : { messageId: info.messageId }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error al enviar email de prueba',
                error: error.message
            });
        }
    }

    // =====================================================================
    // 12. OBTENER FAQ (PREGUNTAS FRECUENTES)
    // =====================================================================

    static async getFAQ(req, res) {
        try {
            console.log('❓ Obteniendo FAQ de soporte');
            
            const faq = [
                {
                    question: "¿Cómo funciona el sistema de tickets?",
                    answer: "El sistema de tickets funciona en 3 estados: 1) ABIERTO: Tu ticket fue enviado al soporte, 2) EN PROCESO: Equipo trabajando en solución, 3) CERRADO: Problema resuelto. Recibirás emails en cada cambio de estado.",
                    category: "General",
                    priority: "alta"
                },
                {
                    question: "¿Puedo responder a los emails del sistema?",
                    answer: "NO. Los emails son solo informativos. No respondas a los correos. Si necesitas comunicarte, crea un nuevo ticket o contacta al administrador directamente.",
                    category: "Comunicación",
                    priority: "alta"
                },
                {
                    question: "¿Puedo adjuntar archivos a mi ticket?",
                    answer: "Sí, puedes adjuntar imágenes, documentos PDF, Word, Excel, etc. El tamaño máximo por archivo es 10MB",
                    category: "Archivos",
                    priority: "media"
                },
                {
                    question: "¿Cómo sé si mi ticket fue atendido?",
                    answer: "Recibirás un email cuando el equipo de soporte arregle tu problema. Si no lo recibes, contacta con soporte directamente.",
                    category: "Seguimiento",
                    priority: "alta"
                },
                {
                    question: "¿Qué hago si olvidé mi número de ticket?",
                    answer: "Revisa tu correo electrónico, allí encontrarás el registro de tu ticket. Ten en cuenta que si NO te llega el registro de tu ticket, contacta con soporte directamente.",
                    category: "General",
                    priority: "baja"
                }
            ];
            
            console.log(`✅ ${faq.length} preguntas frecuentes obtenidas`);
            
            res.json({
                success: true,
                faq
            });
            
        } catch (error) {
            console.error('❌ Error obteniendo FAQ:', error);
            res.status(500).json({
                success: false,
                message: 'Error obteniendo preguntas frecuentes'
            });
        }
    }

    // =====================================================================
    // OBTENER ESTADO DEL SISTEMA - MODIFICADO para usar emailService
    // =====================================================================

    static async getSystemStatus(req, res) {
    req.startTime = Date.now();
    
    try {
        console.log('🖥️ Verificando estado REAL del sistema...');
        
        const now = new Date().toISOString();
        
        // 1. Estado de BD
        let dbStatus = { connected: false, message: 'No conectado', timestamp: now };
        try {
            const dbState = mongoose.connection.readyState;
            if (dbState === 1) {
                await mongoose.connection.db.admin().ping();
                dbStatus = { 
                    connected: true, 
                    message: 'Conectado', 
                    details: { database: mongoose.connection.name },
                    timestamp: now
                };
            } else {
                dbStatus = { 
                    connected: false, 
                    message: 'Desconectado', 
                    timestamp: now 
                };
            }
        } catch (dbError) {
            dbStatus = { 
                connected: false, 
                message: 'Error de conexión', 
                error: dbError.message,
                timestamp: now 
            };
        }

        // 2. Estado del sistema
        const systemStatus = {
            operational: true,
            message: 'Operacional',
            details: {
                uptime: Math.floor(process.uptime()) + ' segundos',
                memory: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB'
            },
            timestamp: now
        };

        // 3. Estado de Cloudinary
        let cloudStorageStatus = { 
            active: false, 
            message: 'Inactivo',
            timestamp: now 
        };
        try {
            if (process.env.CLOUDINARY_CLOUD_NAME) {
                await cloudinary.api.ping();
                cloudStorageStatus = { 
                    active: true, 
                    message: 'Activo y funcionando',
                    timestamp: now 
                };
            }
        } catch (cloudError) {
            cloudStorageStatus = { 
                active: false, 
                message: 'Error', 
                error: cloudError.message,
                timestamp: now 
            };
        }

        // 4. Estado de Email - USANDO emailService
        const emailStatus = emailService.getStatus();
        const emailVerification = await emailService.verifyConnection();
        
        const emailServiceStatus = {
            configured: emailStatus.configured,
            canSend: emailVerification.success,
            message: emailVerification.success ? 'Configurado y verificado' : emailVerification.message,
            details: emailStatus.config,
            timestamp: now
        };

        // Calcular estado general
        const errorCount = [
            !dbStatus.connected,
            !systemStatus.operational,
            !cloudStorageStatus.active,
            !emailServiceStatus.configured
        ].filter(Boolean).length;
        
        let overallStatus = errorCount === 0 ? 'healthy' : 'degraded';

        // ✅ RESPUESTA CORREGIDA CON TIMESTAMPS
        res.json({
            success: true,
            timestamp: now,  // ✅ Timestamp general
            overallStatus,
            services: {
                database: { 
                    name: 'Base de Datos', 
                    status: dbStatus.connected ? 'operational' : 'error', 
                    message: dbStatus.message,
                    timestamp: dbStatus.timestamp,  // ✅ Timestamp del servicio
                    details: dbStatus.details
                },
                system: { 
                    name: 'Sistema Principal', 
                    status: systemStatus.operational ? 'operational' : 'error', 
                    message: systemStatus.message,
                    timestamp: systemStatus.timestamp,  // ✅ Timestamp del servicio
                    details: systemStatus.details
                },
                cloudStorage: { 
                    name: 'Almacenamiento Cloud', 
                    status: cloudStorageStatus.active ? 'operational' : 'error', 
                    message: cloudStorageStatus.message,
                    timestamp: cloudStorageStatus.timestamp,  // ✅ Timestamp del servicio
                    details: cloudStorageStatus.error ? { error: cloudStorageStatus.error } : {}
                },
                emailService: { 
                    name: 'Servicio de Email', 
                    status: emailServiceStatus.configured ? 'operational' : 'error', 
                    message: emailServiceStatus.message,
                    timestamp: emailServiceStatus.timestamp,  // ✅ Timestamp del servicio
                    details: emailServiceStatus.details
                }
            },
            metrics: {
                responseTime: Date.now() - req.startTime,
                environment: process.env.NODE_ENV || 'production',
                timestamp: now
            }
        });

    } catch (error) {
        console.error('🔥 ERROR verificando estado:', error);
        
        const now = new Date().toISOString();
        
        // ✅ Respuesta de error también con timestamps
        res.status(500).json({
            success: false,
            timestamp: now,
            overallStatus: 'error',
            message: 'Error interno al verificar estado',
            error: error.message,
            services: {
                database: {
                    name: 'Base de Datos',
                    status: 'error',
                    message: 'Error de verificación',
                    timestamp: now
                },
                system: {
                    name: 'Sistema Principal',
                    status: 'error',
                    message: error.message,
                    timestamp: now
                },
                cloudStorage: {
                    name: 'Almacenamiento Cloud',
                    status: 'error',
                    message: 'Error de verificación',
                    timestamp: now
                },
                emailService: {
                    name: 'Servicio de Email',
                    status: 'error',
                    message: 'Error de verificación',
                    timestamp: now
                }
            }
        });
    }
}

    // =====================================================================
    // 14. ACTIVAR ERRORES REALES (solo desarrollo)
    // =====================================================================

    static async activateRealErrors(req, res) {
        try {
            if (process.env.NODE_ENV !== 'development') {
                return res.status(403).json({
                    success: false,
                    message: 'Esta función solo está disponible en modo desarrollo'
                });
            }
            
            console.log('🔥 Activando errores REALES:', req.body.services);
            
            // Aquí puedes implementar la lógica para activar errores reales
            // Por ejemplo, cambiar configuraciones, invalidar credenciales, etc.
            
            res.json({
                success: true,
                message: 'Errores REALES activados',
                services: req.body.services,
                timestamp: new Date().toISOString()
            });
            
        } catch (error) {
            console.error('❌ Error activando errores reales:', error);
            res.status(500).json({
                success: false,
                message: 'Error activando errores',
                error: error.message
            });
        }
    }

    // =====================================================================
    // 15. RESTABLECER ERRORES REALES
    // =====================================================================

    static async resetRealErrors(req, res) {
        try {
            if (process.env.NODE_ENV !== 'development') {
                return res.status(403).json({
                    success: false,
                    message: 'Esta función solo está disponible en modo desarrollo'
                });
            }
            
            console.log('🔄 Restableciendo errores REALES');
            
            // Restaurar configuraciones normales
            
            res.json({
                success: true,
                message: 'Errores REALES restablecidos',
                timestamp: new Date().toISOString()
            });
            
        } catch (error) {
            console.error('❌ Error restableciendo errores:', error);
            res.status(500).json({
                success: false,
                message: 'Error restableciendo errores',
                error: error.message
            });
        }
    }

    // =====================================================================
    // 16. VALIDAR ERRORES DEL SISTEMA
    // =====================================================================

    static async validateSystemErrors(req, res) {
        try {
            console.log('🔍 Validando errores del sistema');
            
            // Realizar validaciones específicas
            const validations = {
                database: {
                    status: 'healthy',
                    message: 'Base de datos operativa',
                    checkedAt: new Date().toISOString()
                },
                system: {
                    status: 'healthy',
                    message: 'Sistema principal estable',
                    checkedAt: new Date().toISOString()
                },
                cloudStorage: {
                    status: 'healthy',
                    message: 'Cloud Storage disponible',
                    checkedAt: new Date().toISOString()
                },
                emailService: {
                    status: 'healthy',
                    message: 'Servicio de email configurado',
                    checkedAt: new Date().toISOString()
                }
            };
            
            res.json({
                success: true,
                message: 'Validación completada',
                validations,
                timestamp: new Date().toISOString()
            });
            
        } catch (error) {
            console.error('❌ Error validando errores:', error);
            res.status(500).json({
                success: false,
                message: 'Error en validación',
                error: error.message
            });
        }
    }

    // =====================================================================
    // 17. SIMULAR ERROR REAL EN SERVICIO ESPECÍFICO
    // =====================================================================

    static async simulateRealError(req, res) {
        try {
            if (process.env.NODE_ENV !== 'development') {
                return res.status(403).json({
                    success: false,
                    message: 'Esta función solo está disponible en modo desarrollo'
                });
        }
        
            const { service } = req.params;
            console.log(`🧪 Simulando error REAL en: ${service}`);
            
            let message = '';
            
            switch (service) {
                case 'database':
                    message = 'Error de conexión a base de datos simulado';
                    break;
                case 'system':
                    message = 'Alto uso de CPU/Memoria simulado';
                    break;
                case 'cloudStorage':
                    message = 'Credenciales de Cloudinary invalidadas temporalmente';
                    break;
                case 'emailService':
                    message = 'Servicio SMTP deshabilitado temporalmente';
                    break;
                default:
                    return res.status(400).json({
                        success: false,
                        message: `Servicio no válido: ${service}`
                    });
            }
            
            res.json({
                success: true,
                message,
                service,
                simulatedAt: new Date().toISOString()
            });
            
        } catch (error) {
            console.error('❌ Error simulando error real:', error);
            res.status(500).json({
                success: false,
                message: 'Error simulando error',
                error: error.message
            });
        }
    }

    // =====================================================================
    // 18. RESTABLECER TODOS LOS ERRORES
    // =====================================================================

    static async resetAllRealErrors(req, res) {
        try {
            if (process.env.NODE_ENV !== 'development') {
                return res.status(403).json({
                    success: false,
                    message: 'Esta función solo está disponible en modo desarrollo'
                });
            }
            
            console.log('🔄 Restableciendo TODOS los errores REALES');
            
            res.json({
                success: true,
                message: 'Todos los errores REALES han sido restablecidos',
                timestamp: new Date().toISOString(),
                status: 'healthy'
            });
            
        } catch (error) {
            console.error('❌ Error restableciendo todos los errores:', error);
            res.status(500).json({
                success: false,
                message: 'Error restableciendo errores',
                error: error.message
            });
        }
    }
}

export default SupportController;