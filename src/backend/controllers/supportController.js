import Ticket from '../models/Ticket.js';
import User from '../models/User.js';
import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import nodemailer from 'nodemailer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configurar Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// =============================================================================
// CONFIGURACIÓN GMAIL REAL
// =============================================================================

// Configuración GMAIL FIJA
const emailUser = 'riosnavarretejared@gmail.com';
const emailPass = 'emdkqnupuzzzucnw';
const emailHost = 'smtp.gmail.com';
const emailPort = 587;
const emailFrom = 'riosnavarretejared@gmail.com';

// Configurar transporter Gmail
let transporter = null;

// Inicializar transporter
try {
    transporter = nodemailer.createTransport({
        host: emailHost,
        port: parseInt(emailPort),
        secure: false,
        auth: {
            user: emailUser,
            pass: emailPass
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

    console.log('✅ TRANSPORTER GMAIL CONFIGURADO PARA SOPORTE');
    
    // Verificar conexión
    transporter.verify((error, success) => {
        if (error) {
            console.error('❌ ERROR CONFIGURANDO GMAIL PARA SOPORTE:', error.message);
            console.log('📧 Los tickets se guardarán pero NO se enviarán emails');
        } else {
            console.log('✅ CONEXIÓN GMAIL VERIFICADA PARA SOPORTE');
        }
    });
    
} catch (error) {
    console.error('❌ ERROR CRÍTICO configurando Gmail:', error.message);
    transporter = null;
}

// =============================================================================
// FUNCIÓN PARA ENVIAR EMAIL CON GMAIL
// =============================================================================

const enviarEmailGmail = async (mailOptions, intentos = 3) => {
    if (!transporter) {
        console.log('📧 Transporter no disponible - Mostrando email en consola');
        console.log('='.repeat(80));
        console.log('📧 EMAIL SIMULADO PARA SOPORTE:');
        console.log('='.repeat(80));
        console.log(`Para: ${mailOptions.to}`);
        console.log(`Asunto: ${mailOptions.subject}`);
        console.log(`Contenido HTML: ${mailOptions.html ? 'Sí' : 'No'}`);
        console.log('='.repeat(80));
        return { message: 'Email simulado' };
    }

    for (let i = 0; i < intentos; i++) {
        try {
            console.log(`📤 Intento ${i + 1} de ${intentos} enviando email de soporte...`);
            const info = await transporter.sendMail(mailOptions);
            console.log(`✅ Email de soporte enviado en intento ${i + 1}`);
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

class SupportController {
    // =====================================================================
    // 1. CREAR NUEVO TICKET 
    // =====================================================================
    
    static async createTicket(req, res) {
        try {
            console.log('');
            console.log('🎫 ========== CREANDO NUEVO TICKET DE SOPORTE ==========');
            console.log(`📅 Hora: ${new Date().toLocaleString('es-MX')}`);
            
            const {
                subject,
                description,
                category,
                priority,
                emailNotifications = 'true'
            } = req.body;
            
            console.log('📋 Campos recibidos:', {
                subject,
                category,
                priority,
                emailNotifications,
                descLength: description?.length || 0
            });
            console.log('📁 Archivos recibidos:', req.files ? req.files.length : 0);
            
            // Validar campos requeridos
            if (!subject || !description || !category || !priority) {
                return res.status(400).json({
                    success: false,
                    message: 'Todos los campos obligatorios deben ser completados'
                });
            }
            
            // Obtener información del usuario
            const user = req.user || {
                _id: 'system',
                name: 'Usuario del Sistema',
                email: 'riosnavarretejared@gmail.com'
            };
            
            console.log(`👤 Usuario que crea: ${user.name} (${user.email})`);
            
            // Crear nuevo ticket con estados simplificados
            const newTicket = new Ticket({
                subject,
                description,
                category,
                priority,
                createdBy: user._id,
                createdByName: user.name || 'Usuario del Sistema',
                createdByEmail: user.email || 'riosnavarretejared@gmail.com',
                emailNotifications: emailNotifications === 'true',
                status: 'abierto' // Estado inicial siempre será "abierto"
            });
            
            // Procesar archivos adjuntos si existen
            if (req.files && req.files.length > 0) {
                const attachments = [];
                
                for (const file of req.files) {
                    try {
                        console.log(`📎 Procesando archivo: ${file.originalname}`);
                        
                        // Subir a Cloudinary
                        const result = await cloudinary.uploader.upload(file.path, {
                            folder: 'tickets_soporte',
                            resource_type: 'auto',
                            timeout: 30000
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
                        
                        console.log(`✅ Archivo subido: ${result.secure_url}`);
                        
                        // Eliminar archivo temporal
                        if (fs.existsSync(file.path)) {
                            fs.unlinkSync(file.path);
                        }
                        
                    } catch (uploadError) {
                        console.error('❌ Error subiendo archivo:', uploadError.message);
                    }
                }
                
                if (attachments.length > 0) {
                    newTicket.attachments = attachments;
                    console.log(`📎 ${attachments.length} archivo(s) adjunto(s)`);
                }
            }
            
            // Agregar primera actualización
            newTicket.updates = [{
                user: user._id,
                userName: user.name || 'Sistema',
                message: 'Ticket creado exitosamente',
                type: 'system',
                createdAt: new Date()
            }];
            
            // Guardar en la base de datos
            await newTicket.save();
            
            console.log(`✅ Ticket creado en BD: ${newTicket.ticketNumber}`);
            console.log(`📊 ID: ${newTicket._id}`);
            console.log(`📋 Categoría: ${category}`);
            console.log(`⚠️ Prioridad: ${priority}`);
            console.log(`📊 Estado: abierto`);
            
            // ENVIAR EMAIL DE CONFIRMACIÓN POR GMAIL REAL
            console.log('\n📧 ========== ENVIANDO EMAILS ==========');
            
            try {
                // 1. Email al ADMINISTRADOR (tú) - CONFIRMACIÓN DE RECEPCIÓN
                await SupportController.sendTicketEmailToAdmin(newTicket, user);
                
                // 2. Email al USUARIO (si habilitó notificaciones)
                if (emailNotifications === 'true') {
                    await SupportController.sendTicketEmailToUser(newTicket, user);
                }
                
                console.log('✅ Emails enviados exitosamente');
                
            } catch (emailError) {
                console.error('⚠️ Error enviando emails:', emailError.message);
                console.log('📌 El ticket se guardó, pero los emails fallaron');
            }
            
            console.log('🎫 ========== TICKET COMPLETADO ==========\n');
            
            res.status(201).json({
                success: true,
                message: '✅ Ticket creado exitosamente. Revisa tu correo para la confirmación.',
                ticket: newTicket
            });
            
        } catch (error) {
            console.error('\n❌❌❌ ERROR CREANDO TICKET ❌❌❌');
            console.error('Mensaje:', error.message);
            console.error('Stack:', error.stack);
            
            res.status(500).json({
                success: false,
                message: 'Error interno al crear ticket',
                error: error.message
            });
        }
    }
    
    // =====================================================================
    // 2. ENVIAR EMAIL AL ADMINISTRADOR - TICKET NUEVO 
    // =====================================================================
    
    static async sendTicketEmailToAdmin(ticket, user) {
        try {
            const adminEmail = 'riosnavarretejared@gmail.com';
            
            console.log(`📤 Enviando email de notificación al ADMIN: ${adminEmail}`);
            console.log(`📎 Archivos adjuntos: ${ticket.attachments?.length || 0}`);
            
            // Construir sección de archivos adjuntos
            let attachmentsHTML = '';
            if (ticket.attachments && ticket.attachments.length > 0) {
                attachmentsHTML = `
                <h3 style="color: #4a5568; margin-top: 25px; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px;">
                    📎 Archivos adjuntos (${ticket.attachments.length})
                </h3>
                <div style="background: #f8f9fa; padding: 15px; border-radius: 6px; margin: 15px 0;">
                `;
                
                ticket.attachments.forEach((file) => {
                    const isImage = file.originalname.match(/\.(jpg|jpeg|png|gif|bmp|webp)$/i);
                    const fileSizeKB = Math.round(file.size / 1024);
                    
                    if (isImage) {
                        attachmentsHTML += `
                        <div style="margin-bottom: 20px; padding: 15px; background: white; border-radius: 6px; border: 1px solid #e2e8f0;">
                            <div style="display: flex; align-items: flex-start; gap: 15px;">
                                <div style="flex-shrink: 0;">
                                    <img src="${file.cloudinary_url}" 
                                         alt="${file.originalname}" 
                                         style="width: 120px; height: 120px; object-fit: cover; border-radius: 4px; border: 1px solid #ddd;">
                                </div>
                                <div style="flex: 1;">
                                    <p style="margin: 0 0 8px; font-weight: bold; color: #2d3748;">
                                        <i class="fas fa-image"></i> ${file.originalname}
                                    </p>
                                    <p style="margin: 0 0 8px; color: #718096; font-size: 14px;">
                                        <strong>Tamaño:</strong> ${fileSizeKB} KB<br>
                                        <strong>Tipo:</strong> Imagen
                                    </p>
                                    <div style="display: flex; gap: 10px; margin-top: 12px;">
                                        <a href="${file.cloudinary_url}" 
                                           target="_blank" 
                                           style="display: inline-block; background: #4299e1; color: white; padding: 8px 15px; border-radius: 4px; text-decoration: none; font-size: 14px;">
                                            <i class="fas fa-external-link-alt"></i> Ver imagen completa
                                        </a>
                                        <a href="${file.cloudinary_url}" 
                                           download="${file.originalname}"
                                           style="display: inline-block; background: #48bb78; color: white; padding: 8px 15px; border-radius: 4px; text-decoration: none; font-size: 14px;">
                                            <i class="fas fa-download"></i> Descargar
                                        </a>
                                    </div>
                                </div>
                            </div>
                        </div>
                        `;
                    } else {
                        attachmentsHTML += `
                        <div style="margin-bottom: 10px; padding: 10px; background: white; border-radius: 4px; border: 1px solid #e2e8f0;">
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <div style="background: #edf2f7; padding: 8px; border-radius: 4px;">
                                    <i class="fas fa-file" style="color: #4a5568;"></i>
                                </div>
                                <div style="flex: 1;">
                                    <p style="margin: 0 0 4px; font-weight: bold; color: #2d3748;">
                                        ${file.originalname}
                                    </p>
                                    <p style="margin: 0; color: #718096; font-size: 13px;">
                                        ${fileSizeKB} KB • ${file.mimetype || 'Archivo adjunto'}
                                    </p>
                                </div>
                                <a href="${file.cloudinary_url}" 
                                   target="_blank" 
                                   style="color: #4299e1; text-decoration: none; font-size: 14px;">
                                    <i class="fas fa-external-link-alt"></i> Abrir
                                </a>
                            </div>
                        </div>
                        `;
                    }
                });
                
                attachmentsHTML += `</div>`;
            }
            
            const mailOptions = {
                from: `"Soporte CBTIS051" <${emailFrom}>`,
                to: adminEmail,
                subject: `🚨 NUEVO TICKET: ${ticket.ticketNumber} - ${ticket.subject}`,
                html: `
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <meta charset="utf-8">
                        <title>Nuevo Ticket de Soporte</title>
                        <style>
                            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 700px; margin: 0 auto; background: #f8f9fa; }
                            .container { background: white; padding: 30px; border-radius: 10px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
                            .header { background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); padding: 25px; border-radius: 10px 10px 0 0; text-align: center; color: white; }
                            .status-badge { padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; display: inline-block; }
                            .status-abierto { background: #dc2626; color: white; }
                            .ticket-info { background: #f7fafc; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #4299e1; }
                            .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; color: #718096; font-size: 12px; }
                        </style>
                    </head>
                    <body>
                        <div class="container">
                            <div class="header">
                                <h1 style="margin: 0; font-size: 28px;">🚨 NUEVO TICKET RECIBIDO</h1>
                                <p style="margin: 5px 0 0; opacity: 0.9;">Sistema de Gestión Documental CBTIS051</p>
                                <div style="margin-top: 15px;">
                                    <span class="status-badge status-abierto">📝 TICKET ABIERTO</span>
                                </div>
                            </div>
                            
                            <div style="padding: 25px;">
                                <h2 style="color: #2d3748; margin-top: 0;">Ticket: ${ticket.ticketNumber}</h2>
                                
                                <div class="ticket-info">
                                    <p><strong>📋 Asunto:</strong> ${ticket.subject}</p>
                                    <p><strong>👤 Creado por:</strong> ${user.name || 'Usuario del Sistema'}</p>
                                    <p><strong>📧 Email:</strong> ${user.email || 'No disponible'}</p>
                                    <p><strong>📅 Fecha:</strong> ${new Date().toLocaleString('es-MX')}</p>
                                    <p><strong>🏷️ Categoría:</strong> ${ticket.category}</p>
                                    <p><strong>⚠️ Prioridad:</strong> ${ticket.priority.toUpperCase()}</p>
                                    <p><strong>📊 Estado:</strong> <span class="status-badge status-abierto">ABIERTO</span></p>
                                </div>
                                
                                <h3 style="color: #4a5568; margin-top: 25px;">📝 Descripción del problema:</h3>
                                <div style="background: #f8f9fa; padding: 15px; border-radius: 6px; border: 1px solid #e2e8f0;">
                                    <p style="margin: 0; white-space: pre-wrap; line-height: 1.6;">${ticket.description}</p>
                                </div>
                                
                                ${attachmentsHTML}
                                
                                <div style="background: #fef2f2; padding: 15px; border-radius: 6px; margin: 25px 0; border-left: 4px solid #dc2626;">
                                    <p style="margin: 0; color: #991b1b; font-size: 15px;">
                                        <strong>📌 ACCIÓN REQUERIDA:</strong><br>
                                        <strong>1.</strong> Revisa el ticket en el sistema<br>
                                        <strong>2.</strong> Cambia el estado a "EN PROCESO" cuando lo atiendas<br>
                                        <strong>3.</strong> Cambia el estado a "CERRADO" cuando resuelvas<br>
                                        <strong>4.</strong> El usuario será notificado en cada cambio
                                    </p>
                                </div>
                            </div>
                            
                            <div class="footer">
                                <p style="margin: 5px 0;">
                                    <strong>Sistema de Gestión Documental CBTIS051</strong><br>
                                    Este es un mensaje automático del sistema de soporte.
                                </p>
                                <p style="margin: 5px 0; font-size: 11px;">
                                    © ${new Date().getFullYear()} CBTIS051 - Todos los derechos reservados<br>
                                </p>
                            </div>
                        </div>
                    </body>
                    </html>
                `,
                text: `NUEVO TICKET DE SOPORTE - CBTIS051\n\n
Ticket: ${ticket.ticketNumber}
Estado: ABIERTO
Asunto: ${ticket.subject}
Creado por: ${user.name || 'Usuario del Sistema'}
Email: ${user.email || 'No disponible'}
Fecha: ${new Date().toLocaleString('es-MX')}
Categoría: ${ticket.category}
Prioridad: ${ticket.priority.toUpperCase()}\n\n
DESCRIPCIÓN:\n${ticket.description}\n\n
${ticket.attachments && ticket.attachments.length > 0 ? 
`ARCHIVOS ADJUNTOS (${ticket.attachments.length}):\n` + 
ticket.attachments.map(f => `• ${f.originalname} (${Math.round(f.size/1024)} KB)`).join('\n') + '\n\n' 
: ''}
ACCIÓN REQUERIDA:
1. Revisa el ticket en el sistema
2. Cambia el estado a "EN PROCESO" cuando lo atiendas
3. Cambia el estado a "CERRADO" cuando resuelvas
4. El usuario será notificado en cada cambio\n\n
Accede al sistema: ${process.env.FRONTEND_URL || 'http://localhost:4000'}/admin/tickets/${ticket._id}\n\n
Sistema de Gestión Documental CBTIS051`
            };
            
            const info = await enviarEmailGmail(mailOptions);
            console.log(`✅ Email enviado al ADMIN: ${adminEmail}`);
            console.log(`📧 Message ID: ${info.messageId}`);
            
        } catch (error) {
            console.error('❌ Error enviando email al ADMIN:', error.message);
            throw error;
        }
    }
    
    // =====================================================================
    // 3. ENVIAR EMAIL DE CONFIRMACIÓN AL USUARIO 
    // =====================================================================
    
    static async sendTicketEmailToUser(ticket, user) {
        try {
            const userEmail = user.email || 'riosnavarretejared@gmail.com';
            
            console.log(`📤 Enviando email de confirmación al USUARIO: ${userEmail}`);
            
            // Construir sección de archivos adjuntos
            let attachmentsHTML = '';
            if (ticket.attachments && ticket.attachments.length > 0) {
                attachmentsHTML = `
                <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0; border: 2px dashed #93c5fd;">
                    <h4 style="color: #1e40af; margin: 0 0 15px; display: flex; align-items: center; gap: 8px;">
                        <i class="fas fa-paperclip"></i> Tus archivos adjuntos (${ticket.attachments.length})
                    </h4>
                `;
                
                ticket.attachments.forEach((file) => {
                    const isImage = file.originalname.match(/\.(jpg|jpeg|png|gif|bmp|webp)$/i);
                    const fileSizeKB = Math.round(file.size / 1024);
                    
                    if (isImage) {
                        attachmentsHTML += `
                        <div style="margin-bottom: 15px; padding: 12px; background: white; border-radius: 6px; border: 1px solid #dbeafe;">
                            <div style="display: flex; align-items: center; gap: 12px;">
                                <div style="flex-shrink: 0;">
                                    <img src="${file.cloudinary_url}" 
                                         alt="Imagen adjunta" 
                                         style="width: 80px; height: 80px; object-fit: cover; border-radius: 4px; border: 1px solid #bfdbfe;">
                                </div>
                                <div style="flex: 1;">
                                    <p style="margin: 0 0 6px; font-weight: 600; color: #1e40af;">
                                        <i class="fas fa-image"></i> ${file.originalname}
                                    </p>
                                    <p style="margin: 0 0 10px; color: #4b5563; font-size: 13px;">
                                        <strong>Tamaño:</strong> ${fileSizeKB} KB
                                    </p>
                                    <a href="${file.cloudinary_url}" 
                                       target="_blank" 
                                       style="display: inline-flex; align-items: center; gap: 5px; color: #3b82f6; text-decoration: none; font-size: 14px; font-weight: 500;">
                                        <i class="fas fa-eye"></i> Ver imagen
                                    </a>
                                </div>
                            </div>
                        </div>
                        `;
                    } else {
                        attachmentsHTML += `
                        <div style="margin-bottom: 10px; padding: 10px; background: white; border-radius: 4px; border: 1px solid #dbeafe;">
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <div style="background: #eff6ff; padding: 8px; border-radius: 4px;">
                                    <i class="fas fa-file" style="color: #3b82f6;"></i>
                                </div>
                                <div style="flex: 1;">
                                    <p style="margin: 0 0 4px; font-weight: 500; color: #1f2937;">
                                        ${file.originalname}
                                    </p>
                                    <p style="margin: 0; color: #6b7280; font-size: 12px;">
                                        ${fileSizeKB} KB
                                    </p>
                                </div>
                                <a href="${file.cloudinary_url}" 
                                   target="_blank"
                                   style="color: #3b82f6; text-decoration: none; font-size: 13px;">
                                    <i class="fas fa-external-link-alt"></i>
                                </a>
                            </div>
                        </div>
                        `;
                    }
                });
                
                attachmentsHTML += `</div>`;
            }
            
            const mailOptions = {
                from: `"Soporte CBTIS051" <${emailFrom}>`,
                to: userEmail,
                subject: `✅ Ticket ${ticket.ticketNumber} creado - ${ticket.subject}`,
                html: `
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <meta charset="utf-8">
                        <title>Confirmación de Ticket</title>
                        <style>
                            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 650px; margin: 0 auto; background: #f8f9fa; }
                            .container { background: white; padding: 30px; border-radius: 10px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
                            .header { background: linear-gradient(135deg, #059669 0%, #047857 100%); padding: 25px; border-radius: 10px 10px 0 0; text-align: center; color: white; }
                            .ticket-number { background: white; color: #059669; padding: 12px 24px; border-radius: 8px; font-weight: bold; font-size: 22px; display: inline-block; margin: 15px 0; border: 2px solid #10b981; }
                            .status-timeline { display: flex; justify-content: space-between; margin: 30px 0; position: relative; }
                            .status-step { text-align: center; flex: 1; position: relative; z-index: 1; }
                            .status-circle { width: 40px; height: 40px; border-radius: 50%; background: #d1fae5; color: #065f46; display: flex; align-items: center; justify-content: center; margin: 0 auto 10px; font-weight: bold; border: 3px solid #10b981; }
                            .status-circle.active { background: #10b981; color: white; }
                            .status-line { position: absolute; top: 20px; left: 20%; right: 20%; height: 3px; background: #d1fae5; z-index: 0; }
                            .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; color: #718096; font-size: 12px; }
                        </style>
                    </head>
                    <body>
                        <div class="container">
                            <div class="header">
                                <h1 style="margin: 0; font-size: 26px;">✅ TICKET CREADO EXITOSAMENTE</h1>
                                <p style="margin: 5px 0 0; opacity: 0.9;">Sistema de Soporte CBTIS051</p>
                            </div>
                            
                            <div style="padding: 25px; text-align: center;">
                                <div class="ticket-number">${ticket.ticketNumber}</div>
                                
                                <h2 style="color: #2d3748; margin: 0 0 20px;">${ticket.subject}</h2>
                                
                                <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: left;">
                                    <h3 style="color: #065f46; margin: 0 0 15px;">📋 Información del ticket</h3>
                                    <p style="margin: 0 0 10px;"><strong>🏷️ Categoría:</strong> ${ticket.category}</p>
                                    <p style="margin: 0 0 10px;"><strong>⚠️ Prioridad:</strong> ${ticket.priority.toUpperCase()}</p>
                                    <p style="margin: 0;"><strong>📅 Fecha de creación:</strong> ${new Date().toLocaleString('es-MX')}</p>
                                </div>
                                
                                <h3 style="color: #4a5568; text-align: left; margin: 25px 0 15px;">📝 Tu descripción:</h3>
                                <div style="background: #f8f9fa; padding: 15px; border-radius: 6px; text-align: left; margin: 0 0 20px; border: 1px solid #e2e8f0;">
                                    <p style="margin: 0; white-space: pre-wrap; line-height: 1.6;">${ticket.description}</p>
                                </div>
                                
                                ${attachmentsHTML}
                                
                                <div style="background: #dbeafe; padding: 15px; border-radius: 6px; margin: 25px 0; border-left: 4px solid #3b82f6; text-align: left;">
                                    <h3 style="color: #1e40af; margin: 0 0 10px;">📌 ¿Qué sigue?</h3>
                                    <p style="margin: 0; color: #1e40af; font-size: 15px;">
                                        <strong>1.</strong> Tu ticket está en estado <strong>"ABIERTO"</strong><br>
                                        <strong>2.</strong> El equipo de soporte lo revisará próximamente<br>
                                        <strong>3.</strong> Cambiará a <strong>"EN PROCESO"</strong> cuando sea atendido<br>
                                        <strong>4.</strong> Se cerrará cuando se resuelva el problema<br>
                                        <strong>5.</strong> Recibirás un email en cada cambio de estado
                                    </p>
                                </div>
                                
                                <div style="background: #fef3c7; padding: 15px; border-radius: 6px; margin: 20px 0; text-align: left;">
                                    <p style="margin: 0; color: #92400e; font-size: 14px;">
                                        <strong>ℹ️ Información importante:</strong><br>
                                        • No respondas a este email<br>
                                        • Solo verifica el estado en el sistema<br>
                                        • No se realizan acciones desde el correo<br>
                                        • Contacta al administrador si hay problemas
                                    </p>
                                </div>
                            </div>
                            
                            <div class="footer">
                                <p style="margin: 5px 0;">
                                    <strong>Sistema de Gestión Documental CBTIS051</strong><br>
                                    Este es un mensaje automático de confirmación.
                                </p>
                            </div>
                        </div>
                    </body>
                    </html>
                `,
                text: `CONFIRMACIÓN DE TICKET - CBTIS051\n\n
✅ TICKET CREADO EXITOSAMENTE\n\n
Ticket: ${ticket.ticketNumber}
Estado: ABIERTO
Asunto: ${ticket.subject}
Categoría: ${ticket.category}
Prioridad: ${ticket.priority.toUpperCase()}
Fecha: ${new Date().toLocaleString('es-MX')}\n\n
DESCRIPCIÓN:
${ticket.description}\n\n
${ticket.attachments && ticket.attachments.length > 0 ? 
`ARCHIVOS ADJUNTOS (${ticket.attachments.length}):\n` + 
ticket.attachments.map(f => `• ${f.originalname} (${Math.round(f.size/1024)} KB)`).join('\n') + '\n\n' 
: ''}
📌 ¿QUÉ SIGUE?
1. Tu ticket está en estado "ABIERTO"
2. El equipo de soporte lo revisará próximamente
3. Cambiará a "EN PROCESO" cuando sea atendido
4. Se cerrará cuando se resuelva el problema
5. Recibirás un email en cada cambio de estado\n\n
⚠️ IMPORTANTE:
• No respondas a este email
• Solo verifica el estado en el sistema
• No se realizan acciones desde el correo
• Contacta al administrador si hay problemas\n\n
Ver estado del ticket: ${process.env.FRONTEND_URL || 'http://localhost:4000'}/soporte/tickets/${ticket._id}\n\n
Sistema de Gestión Documental CBTIS051`
            };
            
            const info = await enviarEmailGmail(mailOptions);
            console.log(`✅ Email enviado al USUARIO: ${userEmail}`);
            console.log(`📧 Message ID: ${info.messageId}`);
            
        } catch (error) {
            console.error('❌ Error enviando email al USUARIO:', error.message);
            throw error;
        }
    }
    
    // =====================================================================
    // 4. OBTENER TICKETS DEL USUARIO (CON NUEVOS ESTADOS)
    // =====================================================================
    
    static async getUserTickets(req, res) {
        try {
            const user = req.user || { _id: 'system' };
            const { status, priority, category, limit = 50, page = 1 } = req.query;
            
            console.log(`📥 Obteniendo tickets para usuario: ${user._id}`);
            
            const filter = {
                createdBy: user._id,
                isDeleted: false
            };
            
            // Aplicar filtros
            if (status && status !== 'all') filter.status = status;
            if (priority && priority !== 'all') filter.priority = priority;
            if (category && category !== 'all') filter.category = category;
            
            const skip = (parseInt(page) - 1) * parseInt(limit);
            
            const tickets = await Ticket.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit))
                .lean();
            
            const total = await Ticket.countDocuments(filter);
            
            console.log(`✅ ${tickets.length} tickets encontrados`);
            
            res.json({
                success: true,
                tickets,
                pagination: {
                    total,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    pages: Math.ceil(total / parseInt(limit))
                }
            });
            
        } catch (error) {
            console.error('❌ Error obteniendo tickets:', error);
            res.status(500).json({
                success: false,
                message: 'Error obteniendo tickets'
            });
        }
    }
    
    // =====================================================================
    // 5. OBTENER DETALLES DEL TICKET
    // =====================================================================
    
    static async getTicketDetails(req, res) {
        try {
            const { id } = req.params;
            const user = req.user || { _id: 'system' };
            
            console.log(`🔍 Obteniendo detalles del ticket: ${id}`);
            
            const ticket = await Ticket.findOne({
                _id: id,
                isDeleted: false
            }).lean();
            
            if (!ticket) {
                console.log(`❌ Ticket no encontrado: ${id}`);
                return res.status(404).json({
                    success: false,
                    message: 'Ticket no encontrado'
                });
            }
            
            console.log(`✅ Ticket encontrado: ${ticket.ticketNumber}`);
            
            // Verificar permisos
            if (ticket.createdBy.toString() !== user._id.toString() && user.role !== 'admin') {
                console.log(`⛔ Usuario ${user._id} no tiene permisos para ver ticket ${id}`);
                return res.status(403).json({
                    success: false,
                    message: 'No tienes permiso para ver este ticket'
                });
            }
            
            res.json({
                success: true,
                ticket
            });
            
        } catch (error) {
            console.error('❌ Error obteniendo detalles del ticket:', error);
            res.status(500).json({
                success: false,
                message: 'Error obteniendo detalles del ticket'
            });
        }
    }
    
    // =====================================================================
    // 6. AGREGAR RESPUESTA/ACTUALIZACIÓN AL TICKET (SOLO ADMIN)
    // =====================================================================
    
    static async addTicketUpdate(req, res) {
        try {
            const { id } = req.params;
            const { message } = req.body;
            const user = req.user || { 
                _id: 'system', 
                name: 'Administrador del Sistema',
                email: 'riosnavarretejared@gmail.com'
            };
            
            console.log('');
            console.log('💬 ========== AGREGANDO ACTUALIZACIÓN AL TICKET ==========');
            console.log(`Ticket ID: ${id}`);
            console.log(`Usuario: ${user.name}`);
            console.log(`Mensaje: ${message ? message.substring(0, 100) + '...' : 'No message'}`);
            
            if (!message) {
                return res.status(400).json({
                    success: false,
                    message: 'El mensaje es requerido'
                });
            }
            
            const ticket = await Ticket.findById(id);
            
            if (!ticket) {
                console.log(`❌ Ticket no encontrado: ${id}`);
                return res.status(404).json({
                    success: false,
                    message: 'Ticket no encontrado'
                });
            }
            
            console.log(`✅ Ticket encontrado: ${ticket.ticketNumber}`);
            
            // Solo el administrador puede agregar actualizaciones
            if (user.role !== 'admin') {
                console.log(`⛔ Usuario no es administrador`);
                return res.status(403).json({
                    success: false,
                    message: 'Solo el administrador puede agregar actualizaciones'
                });
            }
            
            // Agregar actualización
            const update = {
                user: user._id,
                userName: user.name || 'Administrador',
                message: message,
                type: 'admin_update',
                createdAt: new Date()
            };
            
            if (!ticket.updates) {
                ticket.updates = [];
            }
            
            ticket.updates.push(update);
            ticket.updatedAt = new Date();
            await ticket.save();
            
            console.log(`✅ Actualización agregada al ticket ${ticket.ticketNumber}`);
            
            // ENVIAR EMAIL DE ACTUALIZACIÓN AL USUARIO
            if (ticket.emailNotifications) {
                try {
                    await this.sendUpdateEmail(ticket, user, message);
                    console.log(`📧 Email de actualización enviado al usuario`);
                } catch (emailError) {
                    console.error('⚠️ Error enviando email:', emailError.message);
                }
            }
            
            console.log('💬 ========== ACTUALIZACIÓN COMPLETADA ==========\n');
            
            res.json({
                success: true,
                message: 'Actualización agregada exitosamente',
                ticket
            });
            
        } catch (error) {
            console.error('❌ Error agregando actualización:', error);
            res.status(500).json({
                success: false,
                message: 'Error agregando actualización al ticket'
            });
        }
    }
    
    // =====================================================================
    // 7. ENVIAR EMAIL DE ACTUALIZACIÓN (CUANDO CAMBIA EL ESTADO)
    // =====================================================================
    
    static async sendUpdateEmail(ticket, user, message) {
        try {
            const userEmail = ticket.createdByEmail;
            const statusText = {
                'abierto': 'ABIERTO',
                'en_proceso': 'EN PROCESO',
                'cerrado': 'CERRADO'
            };
            
            console.log(`📤 Enviando email de actualización a: ${userEmail}`);
            console.log(`📊 Estado actual: ${ticket.status}`);
            
            const mailOptions = {
                from: `"Soporte CBTIS051" <${emailFrom}>`,
                to: userEmail,
                subject: `🔄 ${statusText[ticket.status] || 'ACTUALIZACIÓN'} - Ticket ${ticket.ticketNumber}`,
                html: `
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <meta charset="utf-8">
                        <title>Actualización de Ticket</title>
                        <style>
                            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; background: #f8f9fa; }
                            .container { background: white; padding: 30px; border-radius: 10px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
                            .header { background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); padding: 25px; border-radius: 10px 10px 0 0; text-align: center; color: white; }
                            .status-badge { padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; display: inline-block; }
                            .status-abierto { background: #dc2626; color: white; }
                            .status-en_proceso { background: #f59e0b; color: white; }
                            .status-cerrado { background: #10b981; color: white; }
                            .update-box { background: #eff6ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3b82f6; }
                            .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; color: #718096; font-size: 12px; }
                        </style>
                    </head>
                    <body>
                        <div class="container">
                            <div class="header">
                                <h1 style="margin: 0; font-size: 24px;">🔄 ACTUALIZACIÓN DE TICKET</h1>
                                <p style="margin: 5px 0 0; opacity: 0.9;">${ticket.ticketNumber}</p>
                                <div style="margin-top: 15px;">
                                    <span class="status-badge status-${ticket.status}">${statusText[ticket.status] || ticket.status.toUpperCase()}</span>
                                </div>
                            </div>
                            
                            <div style="padding: 25px;">
                                <h2 style="color: #2d3748; margin-top: 0;">${ticket.subject}</h2>
                                
                                <div style="background: #f7fafc; padding: 15px; border-radius: 6px; margin-bottom: 20px;">
                                    <p style="margin: 0 0 10px;"><strong>👤 Actualizado por:</strong> ${user.name || 'Equipo de Soporte'}</p>
                                    <p style="margin: 0 0 10px;"><strong>📅 Fecha:</strong> ${new Date().toLocaleString('es-MX')}</p>
                                    <p style="margin: 0;"><strong>📊 Estado actual:</strong> <span class="status-badge status-${ticket.status}">${statusText[ticket.status] || ticket.status.toUpperCase()}</span></p>
                                </div>
                                
                                <div class="update-box">
                                    <h3 style="color: #1e40af; margin-top: 0;">Actualización del equipo:</h3>
                                    <p style="white-space: pre-wrap; background: white; padding: 15px; border-radius: 6px; margin: 0;">${message}</p>
                                </div>
                                
                                <div style="background: #fef3c7; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #f59e0b;">
                                    <p style="margin: 0; color: #92400e; font-size: 14px;">
                                        <strong>📌 Nota importante:</strong><br>
                                        Este es un email informativo. <strong>No respondas a este correo</strong>.<br>
                                        Solo revisa el estado de tu ticket en el sistema.
                                    </p>
                                </div>
                                
                                <div style="text-align: center; margin: 25px 0;">
                                    <a href="${process.env.FRONTEND_URL || 'http://localhost:4000'}/soporte/tickets/${ticket._id}" 
                                       style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); 
                                              color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; 
                                              font-weight: bold;">
                                        👁️ VER TICKET EN EL SISTEMA
                                    </a>
                                </div>
                            </div>
                            
                            <div class="footer">
                                <p style="margin: 5px 0;">
                                    Sistema de Gestión Documental CBTIS051<br>
                                    Email informativo - No responder
                                </p>
                            </div>
                        </div>
                    </body>
                    </html>
                `,
                text: `ACTUALIZACIÓN DE TICKET - CBTIS051\n\n
Ticket: ${ticket.ticketNumber}
Asunto: ${ticket.subject}
Estado: ${statusText[ticket.status] || ticket.status.toUpperCase()}\n\n
ACTUALIZACIÓN DEL EQUIPO:
Actualizado por: ${user.name || 'Equipo de Soporte'}
Fecha: ${new Date().toLocaleString('es-MX')}\n\n
MENSAJE:
${message}\n\n
📌 NOTA IMPORTANTE:
Este es un email informativo. NO RESPONDAS A ESTE CORREO.
Solo revisa el estado de tu ticket en el sistema.\n\n
Ver ticket: ${process.env.FRONTEND_URL || 'http://localhost:4000'}/soporte/tickets/${ticket._id}\n\n
Sistema de Gestión Documental CBTIS051`
            };
            
            await enviarEmailGmail(mailOptions);
            console.log(`✅ Email de actualización enviado`);
            
        } catch (error) {
            console.error('❌ Error enviando email de actualización:', error.message);
            throw error;
        }
    }
    
    // =====================================================================
    // 8. OBTENER ESTADÍSTICAS DE TICKETS (CON NUEVOS ESTADOS)
    // =====================================================================
    
    static async getTicketStats(req, res) {
        try {
            const user = req.user || { _id: 'system' };
            
            console.log('📊 Obteniendo estadísticas de tickets');
            
            const filter = {
                createdBy: user._id,
                isDeleted: false
            };
            
            const [
                total,
                abierto,
                en_proceso,
                cerrado
            ] = await Promise.all([
                Ticket.countDocuments(filter),
                Ticket.countDocuments({ ...filter, status: 'abierto' }),
                Ticket.countDocuments({ ...filter, status: 'en_proceso' }),
                Ticket.countDocuments({ ...filter, status: 'cerrado' })
            ]);
            
            // Tickets por categoría
            const byCategory = await Ticket.aggregate([
                { $match: filter },
                { $group: { _id: '$category', count: { $sum: 1 } } },
                { $sort: { count: -1 } }
            ]);
            
            // Tickets por prioridad
            const byPriority = await Ticket.aggregate([
                { $match: filter },
                { $group: { _id: '$priority', count: { $sum: 1 } } },
                { $sort: { count: -1 } }
            ]);
            
            console.log(`✅ Estadísticas obtenidas: ${total} tickets totales`);
            
            res.json({
                success: true,
                stats: {
                    total,
                    byStatus: {
                        abierto,
                        en_proceso,
                        cerrado
                    },
                    byCategory,
                    byPriority
                }
            });
            
        } catch (error) {
            console.error('❌ Error obteniendo estadísticas:', error);
            res.status(500).json({
                success: false,
                message: 'Error obteniendo estadísticas de tickets'
            });
        }
    }
    
    // =====================================================================
    // 9. OBTENER FAQ
    // =====================================================================
    
    static async getFAQ(req, res) {
        try {
            console.log('❓ Obteniendo FAQ');
            
            const faq = [
                {
                    question: "¿Cómo funciona el sistema de tickets?",
                    answer: "El sistema funciona en 3 estados: 1) ABIERTO: Ticket recibido, 2) EN PROCESO: Equipo trabajando en solución, 3) CERRADO: Problema resuelto. Recibirás emails en cada cambio de estado.",
                    category: "general",
                    priority: "alta"
                },
                {
                    question: "¿Puedo responder a los emails del sistema?",
                    answer: "NO. Los emails son solo informativos. No respondas a los correos. Si necesitas comunicarte, crea un nuevo ticket o contacta al administrador directamente.",
                    category: "comunicación",
                    priority: "alta"
                },
                {
                    question: "¿Cuánto tiempo tarda en atenderse mi ticket?",
                    answer: "Depende de la prioridad: ALTA (24h), MEDIA (48h), BAJA (72h). Recibirás notificación cuando el ticket cambie a 'EN PROCESO'.",
                    category: "tiempos",
                    priority: "media"
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
    // 10. PRUEBA DE EMAIL DE SOPORTE
    // =====================================================================
    
    static async testSupportEmail(req, res) {
        try {
            console.log('');
            console.log('🧪 ========== PRUEBA DE EMAIL DE SOPORTE ==========');
            
            const testEmail = 'riosnavarretejared@gmail.com';
            
            console.log(`📧 Enviando prueba a: ${testEmail}`);
            
            const mailOptions = {
                from: `"Soporte CBTIS051" <${emailFrom}>`,
                to: testEmail,
                subject: '🧪 Prueba de Email - Sistema de Soporte CBTIS051',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8f9fa;">
                        <div style="background: linear-gradient(135deg, #059669 0%, #047857 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                            <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0; font-size: 16px;">Sistema de Soporte CBTIS051</p>
                        </div>
                        
                        <div style="padding: 40px; border-radius: 0 0 10px 10px; background: white;">
                            <h2 style="color: #2d3748; margin: 0 0 20px; font-size: 24px; font-weight: 600;">El sistema de emails de soporte está funcionando</h2>
                            
                            <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; border-left: 4px solid #059669;">
                                <p style="margin: 0; color: #065f46; font-size: 15px;">
                                    <strong>📅 Fecha:</strong> ${new Date().toLocaleString('es-MX')}<br>
                                    <strong>🏢 Sistema:</strong> Soporte CBTIS051<br>
                                    <strong>✅ Estado:</strong> Configuración correcta<br>
                                    <strong>📧 Servidor:</strong> ${emailHost}:${emailPort}<br>
                                    <strong>👤 Usuario:</strong> ${emailUser}<br>
                                    <strong>🎯 Destino:</strong> ${testEmail}
                                </p>
                            </div>
                        </div>
                    </div>
                `,
                text: `PRUEBA DE EMAIL DE SOPORTE - CBTIS051\n\n
Sistema de soporte activo:\n
• Emails solo para verificación\n
• No se realizan acciones desde el correo\n
• Estados: Abierto → En proceso → Cerrado\n\n
Fecha: ${new Date().toLocaleString('es-MX')}\n
Servidor: ${emailHost}:${emailPort}\n
Usuario: ${emailUser}\n
Destino: ${testEmail}\n\n
✅ Configuración correcta`
            };
            
            const info = await enviarEmailGmail(mailOptions);
            
            console.log('\n✅✅✅ PRUEBA DE SOPORTE EXITOSA ✅✅✅');
            console.log(`   📨 Para: ${testEmail}`);
            console.log(`   📧 Message ID: ${info.messageId}`);
            console.log('   • Emails solo para verificación');
            console.log('   • No acciones desde el correo');
            console.log('   • Estados: Abierto → En proceso → Cerrado');
            
            console.log('\n🧪 ========== FIN PRUEBA ==========\n');
            
            res.json({
                success: true,
                message: '✅ Email de prueba enviado exitosamente',
                messageId: info.messageId,
                to: testEmail,
            });
            
        } catch (error) {
            console.error('❌ Error en prueba de email:', error.message);
            res.status(500).json({
                success: false,
                message: '❌ Error al enviar email de prueba',
                error: error.message
            });
        }
    }

    // =====================================================================
    // 11. OBTENER GUÍA DEL SISTEMA
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
    // 12. CAMBIAR ESTADO DEL TICKET 
    // =====================================================================
    
    static async changeTicketStatus(req, res) {
        try {
            const { id } = req.params;
            const { status } = req.body;
            const user = req.user || { 
                _id: 'system', 
                name: 'Administrador del Sistema'
            };
            
            console.log('');
            console.log('🔄 ========== CAMBIANDO ESTADO DE TICKET ==========');
            console.log(`Ticket ID: ${id}`);
            console.log(`Nuevo estado: ${status}`);
            console.log(`Usuario: ${user.name}`);
            
            // Validar estado permitido
            const allowedStatuses = ['abierto', 'en_proceso', 'cerrado'];
            if (!allowedStatuses.includes(status)) {
                return res.status(400).json({
                    success: false,
                    message: 'Estado no válido. Usar: abierto, en_proceso o cerrado'
                });
            }
            
            const ticket = await Ticket.findById(id);
            
            if (!ticket) {
                console.log(`❌ Ticket no encontrado: ${id}`);
                return res.status(404).json({
                    success: false,
                    message: 'Ticket no encontrado'
                });
            }
            
            console.log(`✅ Ticket encontrado: ${ticket.ticketNumber}`);
            console.log(`📊 Estado actual: ${ticket.status}`);
            
            // Solo el administrador puede cambiar estados
            if (user.role !== 'admin') {
                console.log(`⛔ Usuario no es administrador`);
                return res.status(403).json({
                    success: false,
                    message: 'Solo el administrador puede cambiar el estado de los tickets'
                });
            }
            
            const oldStatus = ticket.status;
            
            // Validar transición de estado (solo permitir progresión lógica)
            const statusOrder = ['abierto', 'en_proceso', 'cerrado'];
            const oldIndex = statusOrder.indexOf(oldStatus);
            const newIndex = statusOrder.indexOf(status);
            
            if (newIndex < oldIndex && status !== 'abierto') {
                console.log(`⛔ No se puede retroceder estado: ${oldStatus} → ${status}`);
                return res.status(400).json({
                    success: false,
                    message: `No se puede cambiar de "${oldStatus}" a "${status}". Progresión permitida: abierto → en_proceso → cerrado`
                });
            }
            
            ticket.status = status;
            
            // Actualizar fechas según estado
            if (status === 'en_proceso') {
                ticket.assignedAt = new Date();
                console.log(`📅 Fecha de asignación actualizada`);
            } else if (status === 'cerrado') {
                ticket.closedAt = new Date();
                console.log(`📅 Fecha de cierre actualizada`);
            }
            
            // Mensaje automático según estado
            let statusMessage = '';
            switch(status) {
                case 'abierto':
                    statusMessage = 'Ticket reabierto por el administrador';
                    break;
                case 'en_proceso':
                    statusMessage = 'El equipo de soporte está trabajando en la solución de este ticket';
                    break;
                case 'cerrado':
                    statusMessage = 'Ticket marcado como CERRADO. El problema ha sido resuelto';
                    break;
            }
            
            // Agregar actualización
            const update = {
                user: user._id,
                userName: user.name || 'Administrador',
                message: statusMessage,
                type: 'status_change',
                statusChange: {
                    from: oldStatus,
                    to: status
                },
                createdAt: new Date()
            };
            
            if (!ticket.updates) {
                ticket.updates = [];
            }
            
            ticket.updates.push(update);
            ticket.updatedAt = new Date();
            await ticket.save();
            
            console.log(`✅ Estado cambiado: ${oldStatus} → ${status}`);
            
            // ENVIAR EMAIL DE ACTUALIZACIÓN AL USUARIO
            if (ticket.emailNotifications) {
                try {
                    await this.sendUpdateEmail(ticket, user, statusMessage);
                    console.log(`📧 Email de cambio de estado enviado al usuario`);
                } catch (emailError) {
                    console.error('⚠️ Error enviando email:', emailError.message);
                }
            }
            
            console.log('🔄 ========== ESTADO CAMBIADO ==========\n');
            
            res.json({
                success: true,
                message: `Estado del ticket actualizado a: ${status.toUpperCase()}`,
                ticket
            });
            
        } catch (error) {
            console.error('❌ Error cambiando estado del ticket:', error);
            res.status(500).json({
                success: false,
                message: 'Error cambiando estado del ticket'
            });
        }
    }
    
    // =====================================================================
    // 13. OBTENER TODOS LOS TICKETS (PARA ADMIN)
    // =====================================================================
    
    static async getAllTickets(req, res) {
        try {
            const user = req.user || { _id: 'system' };
            const { status, priority, category, limit = 100, page = 1 } = req.query;
            
            console.log(`📥 Admin obteniendo TODOS los tickets`);
            
            // Solo administradores pueden ver todos los tickets
            if (user.role !== 'admin') {
                return res.status(403).json({
                    success: false,
                    message: 'Solo administradores pueden ver todos los tickets'
                });
            }
            
            const filter = {
                isDeleted: false
            };
            
            // Aplicar filtros
            if (status && status !== 'all') filter.status = status;
            if (priority && priority !== 'all') filter.priority = priority;
            if (category && category !== 'all') filter.category = category;
            
            const skip = (parseInt(page) - 1) * parseInt(limit);
            
            const tickets = await Ticket.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit))
                .lean();
            
            const total = await Ticket.countDocuments(filter);
            
            console.log(`✅ ${tickets.length} tickets encontrados (admin view)`);
            
            res.json({
                success: true,
                tickets,
                pagination: {
                    total,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    pages: Math.ceil(total / parseInt(limit))
                }
            });
            
        } catch (error) {
            console.error('❌ Error obteniendo todos los tickets:', error);
            res.status(500).json({
                success: false,
                message: 'Error obteniendo tickets'
            });
        }
    }
}

export default SupportController;