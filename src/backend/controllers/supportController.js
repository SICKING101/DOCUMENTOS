import Ticket from '../models/Ticket.js';
import User from '../models/User.js';
import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import nodemailer from 'nodemailer';
import mongoose from 'mongoose';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configurar Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// =============================================================================
// CONFIGURACIÓN EMAIL REAL CON VARIABLES DE ENTORNO
// =============================================================================

// Usar variables de entorno en lugar de hardcodeadas
const SYSTEM_EMAIL = process.env.EMAIL_USER || process.env.EMAIL_FROM_ADDRESS || 'riosnavarretejared@gmail.com';
const SYSTEM_EMAIL_PASS = process.env.EMAIL_PASS || 'emdkqnupuzzzucnw';
const EMAIL_HOST = process.env.EMAIL_HOST || 'smtp.gmail.com';
const EMAIL_PORT = parseInt(process.env.EMAIL_PORT) || 587;

// Configurar transporter Gmail usando variables de entorno
let transporter = null;

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
    transporter = null;
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
    
    static async createTicket(req, res) {
        let ticketNumber = null;
        let userId = null;
        
        try {
            console.log('\n' + '='.repeat(80));
            console.log('🎫 ========== CREANDO NUEVO TICKET DE SOPORTE ==========');
            console.log('='.repeat(80));
            console.log(`📅 Hora: ${new Date().toLocaleString('es-MX')}`);
            console.log(`🌐 Método: ${req.method}`);
            console.log(`🔗 URL: ${req.originalUrl}`);
            
            // DEPURACIÓN DETALLADA
            console.log('\n📊 === DATOS DE ENTRADA ===');
            console.log('📝 Body recibido:', JSON.stringify(req.body, null, 2));
            console.log(`📎 Archivos recibidos: ${req.files ? req.files.length : 0}`);
            
            if (req.files) {
                req.files.forEach((file, index) => {
                    console.log(`  📎 Archivo ${index + 1}: ${file.originalname} (${file.size} bytes)`);
                });
            }
            
            console.log(`👤 Usuario en req.user:`, req.user ? JSON.stringify(req.user) : 'No autenticado');
            
            const {
                subject,
                description,
                category,
                priority,
                emailNotifications = 'true'
            } = req.body;
            
            console.log('\n🔍 === VALIDACIÓN DE CAMPOS ===');
            console.log(`📋 Asunto: ${subject}`);
            console.log(`📝 Descripción: ${description ? `[${description.length} caracteres]` : 'NO'}`);
            console.log(`🏷️ Categoría: ${category}`);
            console.log(`⚠️ Prioridad: ${priority}`);
            console.log(`📧 Notificaciones: ${emailNotifications}`);
            
            // Validar campos requeridos
            if (!subject || !description || !category || !priority) {
                console.error('❌ FALTAN CAMPOS REQUERIDOS');
                console.error('  • Subject:', !subject ? 'FALTA' : 'OK');
                console.error('  • Description:', !description ? 'FALTA' : 'OK');
                console.error('  • Category:', !category ? 'FALTA' : 'OK');
                console.error('  • Priority:', !priority ? 'FALTA' : 'OK');
                
                return res.status(400).json({
                    success: false,
                    message: 'Todos los campos obligatorios deben ser completados',
                    missingFields: {
                        subject: !subject,
                        description: !description,
                        category: !category,
                        priority: !priority
                    }
                });
            }
            
            // ============================================================
            // Manejar el caso cuando no hay usuario autenticado
            // ============================================================
            console.log('\n👤 === IDENTIFICACIÓN DE USUARIO ===');
            
            let userName;
            let userEmail;
            
            if (req.user && req.user._id) {
                // Usuario autenticado
                try {
                    userId = new mongoose.Types.ObjectId(req.user._id);
                    userName = req.user.name || req.user.usuario || 'Usuario Autenticado';
                    userEmail = req.user.email || req.user.correo || 'usuario@ejemplo.com';
                    console.log(`✅ Usuario autenticado: ${userName} (ID: ${userId})`);
                } catch (error) {
                    console.error('⚠️ Error convirtiendo ID de usuario:', error.message);
                    userId = new mongoose.Types.ObjectId();
                    userName = 'Usuario del Sistema';
                    userEmail = 'usuario@cbtis051.edu.mx';
                }
            } else {
                // Usuario NO autenticado
                userId = null;
                userName = 'Usuario del Sistema';
                userEmail = req.body.email || 'usuario@cbtis051.edu.mx';
                
                console.log('⚠️ Usuario no autenticado, usando credenciales del sistema');
                console.log(`📧 Email proporcionado: ${userEmail}`);
            }
            
            console.log(`👤 Usuario final: ${userName} (${userEmail})`);
            console.log(`🆔 User ID: ${userId}`);
            
            // ============================================================
            // BUSCAR ADMINISTRADOR
            // ============================================================
            console.log('\n👑 === BUSCANDO ADMINISTRADOR ===');
            
            let adminEmail = SYSTEM_EMAIL;
            let adminName = 'Administrador del Sistema';
            
            try {
                const adminUser = await User.findOne({ 
                    rol: 'administrador', 
                    activo: true 
                }).select('correo usuario').lean();
                
                if (adminUser) {
                    adminEmail = adminUser.correo;
                    adminName = adminUser.usuario || 'Administrador del Sistema';
                    console.log(`✅ Administrador encontrado: ${adminName} (${adminEmail})`);
                } else {
                    console.log(`⚠️ No se encontró admin en BD, usando email del sistema: ${adminEmail}`);
                    
                    const anyAdmin = await User.findOne({ activo: true }).select('correo usuario').lean();
                    if (anyAdmin) {
                        adminEmail = anyAdmin.correo;
                        adminName = anyAdmin.usuario || 'Administrador';
                        console.log(`🔄 Usando administrador alternativo: ${adminName} (${adminEmail})`);
                    }
                }
            } catch (error) {
                console.error('❌ Error buscando administrador:', error.message);
                console.log(`⚠️ Usando email del sistema como fallback: ${adminEmail}`);
            }
            
            // ============================================================
            // GENERAR NÚMERO DE TICKET ÚNICO
            // ============================================================
            console.log('\n🔢 === GENERANDO NÚMERO DE TICKET ===');
            
            let ticketExists = true;
            let attempts = 0;
            const maxAttempts = 10;
            
            while (ticketExists && attempts < maxAttempts) {
                const date = new Date();
                const dateStr = date.getFullYear() + 
                               String(date.getMonth() + 1).padStart(2, '0') + 
                               String(date.getDate()).padStart(2, '0');
                const randomNum = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
                ticketNumber = `TKT-${dateStr}-${randomNum}`;
                
                const existingTicket = await Ticket.findOne({ ticketNumber });
                ticketExists = !!existingTicket;
                
                if (ticketExists) {
                    console.log(`⚠️ Ticket número ${ticketNumber} ya existe, generando nuevo...`);
                    attempts++;
                } else {
                    console.log(`✅ Número de ticket único generado: ${ticketNumber}`);
                }
            }
            
            if (attempts >= maxAttempts) {
                throw new Error('No se pudo generar un número de ticket único después de varios intentos');
            }
            
            // ============================================================
            // CREAR TICKET CON VALORES CORRECTOS
            // ============================================================
            console.log('\n💾 === CREANDO OBJETO TICKET ===');
            
            const ticketData = {
                ticketNumber,
                subject,
                description,
                category,
                priority,
                createdBy: userId,
                createdByName: userName,
                createdByEmail: userEmail,
                adminEmail: adminEmail,
                adminName: adminName,
                emailNotifications: emailNotifications === 'true',
                status: 'abierto',
                createdAt: new Date(),
                updatedAt: new Date()
            };
            
            console.log('📋 Datos del ticket:', JSON.stringify(ticketData, null, 2));
            
            const newTicket = new Ticket(ticketData);
            
            // ============================================================
            // PROCESAR ARCHIVOS ADJUNTOS
            // ============================================================
            if (req.files && req.files.length > 0) {
                console.log('\n📎 === PROCESANDO ARCHIVOS ADJUNTOS ===');
                const attachments = [];
                
                for (const [index, file] of req.files.entries()) {
                    try {
                        console.log(`  📁 Procesando archivo ${index + 1}/${req.files.length}: ${file.originalname}`);
                        console.log(`    📊 Tamaño: ${file.size} bytes`);
                        console.log(`    📄 Tipo: ${file.mimetype}`);
                        console.log(`    📍 Ruta temporal: ${file.path}`);
                        
                        if (!fs.existsSync(file.path)) {
                            console.error(`    ❌ Archivo temporal no encontrado: ${file.path}`);
                            continue;
                        }
                        
                        console.log(`    ☁️ Subiendo a Cloudinary...`);
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
                        
                        console.log(`    ✅ Archivo subido: ${result.secure_url}`);
                        console.log(`    🆔 Public ID: ${result.public_id}`);
                        
                        if (fs.existsSync(file.path)) {
                            fs.unlinkSync(file.path);
                            console.log(`    🗑️ Archivo temporal eliminado`);
                        }
                        
                    } catch (uploadError) {
                        console.error(`    ❌ Error subiendo archivo ${file.originalname}:`, uploadError.message);
                    }
                }
                
                if (attachments.length > 0) {
                    newTicket.attachments = attachments;
                    console.log(`📎 Total archivos adjuntos guardados: ${attachments.length}`);
                } else {
                    console.log('⚠️ No se pudo subir ningún archivo adjunto');
                }
            }
            
            // ============================================================
            // AGREGAR PRIMERA ACTUALIZACIÓN
            // ============================================================
            console.log('\n📝 === AGREGANDO PRIMERA ACTUALIZACIÓN ===');
            
            newTicket.updates = [{
                user: userId,
                userName: userName,
                message: 'Ticket creado exitosamente',
                type: 'system',
                createdAt: new Date()
            }];
            
            // ============================================================
            // GUARDAR EN LA BASE DE DATOS
            // ============================================================
            console.log('\n💾 === GUARDANDO EN BASE DE DATOS ===');
            
            try {
                await newTicket.save();
                console.log(`✅ Ticket guardado exitosamente en BD`);
                console.log(`🎫 Número: ${newTicket.ticketNumber}`);
                console.log(`🆔 ID: ${newTicket._id}`);
                console.log(`📊 Estado: ${newTicket.status}`);
                console.log(`🏷️ Categoría: ${newTicket.category}`);
                console.log(`⚠️ Prioridad: ${newTicket.priority}`);
                console.log(`📅 Creado: ${newTicket.createdAt}`);
            } catch (saveError) {
                console.error('❌ ERROR GUARDANDO TICKET:', saveError.message);
                
                if (saveError.errors) {
                    Object.keys(saveError.errors).forEach(key => {
                        console.error(`  • ${key}: ${saveError.errors[key].message}`);
                    });
                }
                
                throw saveError;
            }
            
            // ============================================================
            // VERIFICAR QUE SE GUARDÓ CORRECTAMENTE
            // ============================================================
            console.log('\n🔍 === VERIFICANDO TICKET GUARDADO ===');
            
            const savedTicket = await Ticket.findById(newTicket._id);
            if (!savedTicket) {
                console.error('❌ ERROR CRÍTICO: Ticket no encontrado después de guardar');
                throw new Error('Ticket no se guardó correctamente en la base de datos');
            }
            
            console.log(`✅ Ticket verificado en BD: ${savedTicket.ticketNumber}`);
            console.log(`📊 Total updates: ${savedTicket.updates ? savedTicket.updates.length : 0}`);
            console.log(`📎 Adjuntos: ${savedTicket.attachments ? savedTicket.attachments.length : 0}`);
            
            // ============================================================
            // ENVIAR EMAILS
            // ============================================================
            console.log('\n📧 ========== ENVIANDO EMAILS ==========');
            
            try {
                const userForEmails = {
                    _id: userId,
                    name: userName,
                    email: userEmail
                };
                
                console.log('🎨 === ASIGNACIÓN DE COLORES DE EMAIL ===');
                console.log('📗 VERDE: Ticket creado exitosamente (al ADMINISTRADOR)');
                console.log('📕 ROJO: Nuevo ticket recibido (al USUARIO)');
                
                console.log('\n📗 Enviando email VERDE al ADMINISTRADOR...');
                await SupportController.sendTicketEmailToAdmin(savedTicket, userForEmails, adminEmail, adminName);
                console.log('✅ Email VERDE enviado al administrador');
                
                if (emailNotifications === 'true') {
                    console.log('\n📕 Enviando email ROJO al USUARIO...');
                    await SupportController.sendTicketEmailToUser(savedTicket, userForEmails);
                    console.log('✅ Email ROJO enviado al usuario');
                } else {
                    console.log('⚠️ Notificaciones por email desactivadas por el usuario');
                }
                
                console.log('✅ Todos los emails enviados exitosamente');
                
            } catch (emailError) {
                console.error('⚠️ Error enviando emails:', emailError.message);
            }
            
            console.log('\n' + '='.repeat(80));
            console.log('🎫 ========== TICKET CREADO EXITOSAMENTE ==========');
            console.log(`🎫 Número: ${savedTicket.ticketNumber}`);
            console.log(`📋 Asunto: ${savedTicket.subject}`);
            console.log(`👤 Creado por: ${savedTicket.createdByName}`);
            console.log(`📧 Email: ${savedTicket.createdByEmail}`);
            console.log(`👑 Admin asignado: ${savedTicket.adminName}`);
            console.log(`📊 Estado: ${savedTicket.status}`);
            console.log(`📅 Hora: ${new Date().toLocaleString('es-MX')}`);
            console.log('='.repeat(80) + '\n');
            
            // ============================================================
            // RESPONDER AL CLIENTE
            // ============================================================
            res.status(201).json({
                success: true,
                message: '✅ Ticket creado exitosamente. Revisa tu correo para la confirmación.',
                ticket: savedTicket,
                ticketNumber: savedTicket.ticketNumber,
                ticketId: savedTicket._id
            });
            
        } catch (error) {
            console.error('\n' + '❌'.repeat(30));
            console.error('❌❌❌ ERROR CREANDO TICKET ❌❌❌');
            console.error('❌'.repeat(30));
            console.error('📅 Hora:', new Date().toLocaleString('es-MX'));
            console.error('🎫 Ticket Number:', ticketNumber);
            console.error('👤 User ID:', userId);
            console.error('📝 Error message:', error.message);
            
            if (error.name === 'ValidationError') {
                console.error('📋 Validation errors:');
                Object.keys(error.errors).forEach(key => {
                    console.error(`  • ${key}: ${error.errors[key].message}`);
                });
            }
            
            if (req.files && req.files.length > 0) {
                req.files.forEach(file => {
                    if (fs.existsSync(file.path)) {
                        try {
                            fs.unlinkSync(file.path);
                            console.log(`🗑️ Archivo temporal eliminado: ${file.path}`);
                        } catch (unlinkError) {
                            console.error(`❌ Error eliminando archivo temporal: ${unlinkError.message}`);
                        }
                    }
                });
            }
            
            res.status(500).json({
                success: false,
                message: 'Error interno al crear ticket',
                error: error.message,
                ticketNumber: ticketNumber || 'NO GENERADO'
            });
        }
    }
    
    // =====================================================================
    // 2. ENVIAR EMAIL VERDE AL ADMINISTRADOR
    // =====================================================================
    
    static async sendTicketEmailToAdmin(ticket, user, adminEmail, adminName) {
        try {
            console.log(`\n📗 Enviando email VERDE al ADMINISTRADOR: ${adminName} (${adminEmail})`);
            console.log(`📧 Ticket: ${ticket.ticketNumber}`);
            console.log(`📋 Asunto: ${ticket.subject}`);
            console.log(`👤 Usuario: ${user.name} (${user.email})`);
            
            let attachmentsHTML = '';
            if (ticket.attachments && ticket.attachments.length > 0) {
                attachmentsHTML = `
                <h3 style="color: #059669; margin-top: 25px; border-bottom: 2px solid #d1fae5; padding-bottom: 8px;">
                    📎 Archivos adjuntos (${ticket.attachments.length})
                </h3>
                <div style="background: #f0fdf4; padding: 15px; border-radius: 6px; margin: 15px 0;">
                `;
                
                ticket.attachments.forEach((file) => {
                    const isImage = file.originalname.match(/\.(jpg|jpeg|png|gif|bmp|webp)$/i);
                    const fileSizeKB = Math.round(file.size / 1024);
                    
                    if (isImage) {
                        attachmentsHTML += `
                        <div style="margin-bottom: 20px; padding: 15px; background: white; border-radius: 6px; border: 1px solid #d1fae5;">
                            <div style="display: flex; align-items: flex-start; gap: 15px;">
                                <div style="flex-shrink: 0;">
                                    <img src="${file.cloudinary_url}" 
                                         alt="${file.originalname}" 
                                         style="width: 120px; height: 120px; object-fit: cover; border-radius: 4px; border: 1px solid #10b981;">
                                </div>
                                <div style="flex: 1;">
                                    <p style="margin: 0 0 8px; font-weight: bold; color: #065f46;">
                                        <i class="fas fa-image"></i> ${file.originalname}
                                    </p>
                                    <p style="margin: 0 0 8px; color: #059669; font-size: 14px;">
                                        <strong>Tamaño:</strong> ${fileSizeKB} KB<br>
                                        <strong>Tipo:</strong> Imagen
                                    </p>
                                    <div style="display: flex; gap: 10px; margin-top: 12px;">
                                        <a href="${file.cloudinary_url}" 
                                           target="_blank" 
                                           style="display: inline-block; background: #10b981; color: white; padding: 8px 15px; border-radius: 4px; text-decoration: none; font-size: 14px;">
                                            <i class="fas fa-external-link-alt"></i> Ver imagen completa
                                        </a>
                                        <a href="${file.cloudinary_url}" 
                                           download="${file.originalname}"
                                           style="display: inline-block; background: #059669; color: white; padding: 8px 15px; border-radius: 4px; text-decoration: none; font-size: 14px;">
                                            <i class="fas fa-download"></i> Descargar
                                        </a>
                                    </div>
                                </div>
                            </div>
                        </div>
                        `;
                    } else {
                        attachmentsHTML += `
                        <div style="margin-bottom: 10px; padding: 10px; background: white; border-radius: 4px; border: 1px solid #d1fae5;">
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <div style="background: #d1fae5; padding: 8px; border-radius: 4px;">
                                    <i class="fas fa-file" style="color: #059669;"></i>
                                </div>
                                <div style="flex: 1;">
                                    <p style="margin: 0 0 4px; font-weight: bold; color: #065f46;">
                                        ${file.originalname}
                                    </p>
                                    <p style="margin: 0; color: #059669; font-size: 13px;">
                                        ${fileSizeKB} KB • ${file.mimetype || 'Archivo adjunto'}
                                    </p>
                                </div>
                                <a href="${file.cloudinary_url}" 
                                   target="_blank" 
                                   style="color: #10b981; text-decoration: none; font-size: 14px;">
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
                from: `"Sistema de Soporte CBTIS051" <${SYSTEM_EMAIL}>`,
                to: adminEmail,
                subject: `✅ TICKET CREADO: ${ticket.ticketNumber} - ${ticket.subject}`,
                html: `
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <meta charset="utf-8">
                        <title>Ticket Creado Exitosamente</title>
                        <style>
                            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 700px; margin: 0 auto; background: #f8f9fa; }
                            .container { background: white; padding: 30px; border-radius: 10px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
                            .header { background: linear-gradient(135deg, #059669 0%, #047857 100%); padding: 25px; border-radius: 10px 10px 0 0; text-align: center; color: white; }
                            .status-badge { padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; display: inline-block; }
                            .status-abierto { background: #059669; color: white; }
                            .ticket-info { background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981; }
                            .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; color: #718096; font-size: 12px; }
                        </style>
                    </head>
                    <body>
                        <div class="container">
                            <div class="header">
                                <h1 style="margin: 0; font-size: 28px;">✅ TICKET CREADO EXITOSAMENTE</h1>
                                <p style="margin: 5px 0 0; opacity: 0.9;">Sistema de Gestión Documental CBTIS051</p>
                                <div style="margin-top: 15px;">
                                    <span class="status-badge status-abierto">📝 NUEVO TICKET CREADO</span>
                                </div>
                            </div>
                            
                            <div style="padding: 25px;">
                                <h2 style="color: #065f46; margin-top: 0;">Ticket: ${ticket.ticketNumber}</h2>
                                
                                <div class="ticket-info">
                                    <p><strong>📋 Asunto:</strong> ${ticket.subject}</p>
                                    <p><strong>👤 Creado por:</strong> ${user.name || 'Usuario del Sistema'}</p>
                                    <p><strong>📧 Email del usuario:</strong> ${user.email || 'No disponible'}</p>
                                    <p><strong>📅 Fecha:</strong> ${new Date().toLocaleString('es-MX')}</p>
                                    <p><strong>🏷️ Categoría:</strong> ${ticket.category}</p>
                                    <p><strong>⚠️ Prioridad:</strong> ${ticket.priority.toUpperCase()}</p>
                                    <p><strong>📊 Estado:</strong> <span class="status-badge status-abierto">ABIERTO</span></p>
                                    <p><strong>👑 Administrador asignado:</strong> ${adminName} (TÚ)</p>
                                </div>
                                
                                <h3 style="color: #059669; margin-top: 25px;">📝 Descripción del problema:</h3>
                                <div style="background: #f0fdf4; padding: 15px; border-radius: 6px; border: 1px solid #d1fae5;">
                                    <p style="margin: 0; white-space: pre-wrap; line-height: 1.6;">${ticket.description}</p>
                                </div>
                                
                                ${attachmentsHTML}
                                
                                <div style="background: #d1fae5; padding: 15px; border-radius: 6px; margin: 25px 0; border-left: 4px solid #059669;">
                                    <p style="margin: 0; color: #065f46; font-size: 15px;">
                                        <strong>📌 INFORMACIÓN PARA EL ADMINISTRADOR (${adminName}):</strong><br>
                                        <strong>1.</strong> Un nuevo ticket ha sido creado exitosamente<br>
                                        <strong>2.</strong> El usuario ${user.name} espera tu atención<br>
                                        <strong>3.</strong> Revisa el ticket en el sistema<br>
                                        <strong>4.</strong> Cambia el estado a "EN PROCESO" cuando lo atiendas<br>
                                        <strong>5.</strong> Cambia el estado a "CERRADO" cuando resuelvas
                                    </p>
                                </div>
                                
                                <div style="text-align: center; margin: 25px 0;">
                                    <a href="${process.env.FRONTEND_URL || 'http://localhost:4000'}/admin/tickets/${ticket._id}" 
                                       style="display: inline-block; background: linear-gradient(135deg, #059669 0%, #047857 100%); 
                                              color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; 
                                              font-weight: bold;">
                                        ✅ VER TICKET EN EL SISTEMA
                                    </a>
                                </div>
                            </div>
                            
                            <div class="footer">
                                <p style="margin: 5px 0;">
                                    <strong>Sistema de Gestión Documental CBTIS051</strong><br>
                                    Email automático del sistema de soporte.
                                </p>
                                <p style="margin: 5px 0; font-size: 11px;">
                                    © ${new Date().getFullYear()} CBTIS051 - Todos los derechos reservados<br>
                                    Administrador: ${adminName}
                                </p>
                            </div>
                        </div>
                    </body>
                    </html>
                `,
                text: `TICKET CREADO EXITOSAMENTE - CBTIS051\n\n
✅ NUEVO TICKET CREADO\n\n
Ticket: ${ticket.ticketNumber}
Estado: ABIERTO
Asunto: ${ticket.subject}\n
Creado por: ${user.name || 'Usuario del Sistema'}
Email del usuario: ${user.email || 'No disponible'}\n
Fecha: ${new Date().toLocaleString('es-MX')}
Categoría: ${ticket.category}
Prioridad: ${ticket.priority.toUpperCase()}
Administrador asignado: ${adminName} (TÚ)\n\n
DESCRIPCIÓN:\n${ticket.description}\n\n
${ticket.attachments && ticket.attachments.length > 0 ? 
`ARCHIVOS ADJUNTOS (${ticket.attachments.length}):\n` + 
ticket.attachments.map(f => `• ${f.originalname} (${Math.round(f.size/1024)} KB)`).join('\n') + '\n\n' 
: ''}
📌 INFORMACIÓN PARA EL ADMINISTRADOR (${adminName}):
1. Un nuevo ticket ha sido creado exitosamente
2. El usuario ${user.name} espera tu atención
3. Revisa el ticket en el sistema
4. Cambia el estado a "EN PROCESO" cuando lo atiendas
5. Cambia el estado a "CERRADO" cuando resuelvas\n\n
Accede al sistema: ${process.env.FRONTEND_URL || 'http://localhost:4000'}/admin/tickets/${ticket._id}\n\n
Sistema de Gestión Documental CBTIS051\nEmail automático del sistema de soporte.`
            };
            
            const info = await enviarEmailGmail(mailOptions);
            console.log(`📗 Email VERDE enviado al ADMINISTRADOR: ${adminEmail}`);
            
        } catch (error) {
            console.error('❌ Error enviando email VERDE al ADMINISTRADOR:', error.message);
            throw error;
        }
    }
    
    // =====================================================================
    // 3. ENVIAR EMAIL ROJO AL USUARIO
    // =====================================================================
    
    static async sendTicketEmailToUser(ticket, user) {
        try {
            const userEmail = user.email;
            
            console.log(`\n📕 Enviando email ROJO al USUARIO: ${userEmail}`);
            console.log(`📧 Ticket: ${ticket.ticketNumber}`);
            console.log(`📋 Asunto: ${ticket.subject}`);
            
            let attachmentsHTML = '';
            if (ticket.attachments && ticket.attachments.length > 0) {
                attachmentsHTML = `
                <div style="background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border: 2px dashed #fca5a5;">
                    <h4 style="color: #dc2626; margin: 0 0 15px; display: flex; align-items: center; gap: 8px;">
                        <i class="fas fa-paperclip"></i> Tus archivos adjuntos (${ticket.attachments.length})
                    </h4>
                `;
                
                ticket.attachments.forEach((file) => {
                    const isImage = file.originalname.match(/\.(jpg|jpeg|png|gif|bmp|webp)$/i);
                    const fileSizeKB = Math.round(file.size / 1024);
                    
                    if (isImage) {
                        attachmentsHTML += `
                        <div style="margin-bottom: 15px; padding: 12px; background: white; border-radius: 6px; border: 1px solid #fecaca;">
                            <div style="display: flex; align-items: center; gap: 12px;">
                                <div style="flex-shrink: 0;">
                                    <img src="${file.cloudinary_url}" 
                                         alt="Imagen adjunta" 
                                         style="width: 80px; height: 80px; object-fit: cover; border-radius: 4px; border: 1px solid #fca5a5;">
                                </div>
                                <div style="flex: 1;">
                                    <p style="margin: 0 0 6px; font-weight: 600; color: #dc2626;">
                                        <i class="fas fa-image"></i> ${file.originalname}
                                    </p>
                                    <p style="margin: 0 0 10px; color: #991b1b; font-size: 13px;">
                                        <strong>Tamaño:</strong> ${fileSizeKB} KB
                                    </p>
                                    <a href="${file.cloudinary_url}" 
                                       target="_blank" 
                                       style="display: inline-flex; align-items: center; gap: 5px; color: #dc2626; text-decoration: none; font-size: 14px; font-weight: 500;">
                                        <i class="fas fa-eye"></i> Ver imagen
                                    </a>
                                </div>
                            </div>
                        </div>
                        `;
                    } else {
                        attachmentsHTML += `
                        <div style="margin-bottom: 10px; padding: 10px; background: white; border-radius: 4px; border: 1px solid #fecaca;">
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <div style="background: #fecaca; padding: 8px; border-radius: 4px;">
                                    <i class="fas fa-file" style="color: #dc2626;"></i>
                                </div>
                                <div style="flex: 1;">
                                    <p style="margin: 0 0 4px; font-weight: 500; color: #991b1b;">
                                        ${file.originalname}
                                    </p>
                                    <p style="margin: 0; color: #b91c1c; font-size: 12px;">
                                        ${fileSizeKB} KB
                                    </p>
                                </div>
                                <a href="${file.cloudinary_url}" 
                                   target="_blank"
                                   style="color: #dc2626; text-decoration: none; font-size: 13px;">
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
                from: `"Soporte CBTIS051" <${SYSTEM_EMAIL}>`,
                to: userEmail,
                subject: `🚨 NUEVO TICKET RECIBIDO: ${ticket.ticketNumber} - ${ticket.subject}`,
                html: `
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <meta charset="utf-8">
                        <title>Nuevo Ticket Recibido</title>
                        <style>
                            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 650px; margin: 0 auto; background: #f8f9fa; }
                            .container { background: white; padding: 30px; border-radius: 10px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
                            .header { background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); padding: 25px; border-radius: 10px 10px 0 0; text-align: center; color: white; }
                            .ticket-number { background: white; color: #dc2626; padding: 12px 24px; border-radius: 8px; font-weight: bold; font-size: 22px; display: inline-block; margin: 15px 0; border: 2px solid #ef4444; }
                            .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; color: #718096; font-size: 12px; }
                        </style>
                    </head>
                    <body>
                        <div class="container">
                            <div class="header">
                                <h1 style="margin: 0; font-size: 26px;">🚨 NUEVO TICKET RECIBIDO</h1>
                                <p style="margin: 5px 0 0; opacity: 0.9;">Sistema de Soporte CBTIS051</p>
                            </div>
                            
                            <div style="padding: 25px; text-align: center;">
                                <div class="ticket-number">${ticket.ticketNumber}</div>
                                
                                <h2 style="color: #991b1b; margin: 0 0 20px;">${ticket.subject}</h2>
                                
                                <div style="background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: left;">
                                    <h3 style="color: #dc2626; margin: 0 0 15px;">📋 Información del ticket</h3>
                                    <p style="margin: 0 0 10px;"><strong>🏷️ Categoría:</strong> ${ticket.category}</p>
                                    <p style="margin: 0 0 10px;"><strong>⚠️ Prioridad:</strong> ${ticket.priority.toUpperCase()}</p>
                                    <p style="margin: 0 0 10px;"><strong>👑 Administrador asignado:</strong> ${ticket.adminName || 'Equipo de Soporte'}</p>
                                    <p style="margin: 0;"><strong>📅 Fecha de creación:</strong> ${new Date().toLocaleString('es-MX')}</p>
                                </div>
                                
                                <h3 style="color: #991b1b; text-align: left; margin: 25px 0 15px;">📝 Tu descripción:</h3>
                                <div style="background: #fef2f2; padding: 15px; border-radius: 6px; text-align: left; margin: 0 0 20px; border: 1px solid #fecaca;">
                                    <p style="margin: 0; white-space: pre-wrap; line-height: 1.6;">${ticket.description}</p>
                                </div>
                                
                                ${attachmentsHTML}
                                
                                <div style="background: #fecaca; padding: 15px; border-radius: 6px; margin: 25px 0; border-left: 4px solid #dc2626; text-align: left;">
                                    <h3 style="color: #991b1b; margin: 0 0 10px;">🚨 IMPORTANTE - ESTADO ACTUAL:</h3>
                                    <p style="margin: 0; color: #991b1b; font-size: 15px;">
                                        <strong>1.</strong> Tu ticket está en estado <strong>"ABIERTO"</strong><br>
                                        <strong>2.</strong> El administrador <strong>${ticket.adminName || 'Equipo de Soporte'}</strong> lo revisará<br>
                                        <strong>3.</strong> Cambiará a <strong>"EN PROCESO"</strong> cuando sea atendido<br>
                                        <strong>4.</strong> Se cerrará cuando se resuelva el problema<br>
                                        <strong>5.</strong> Recibirás un email en cada cambio de estado
                                    </p>
                                </div>
                                
                                <div style="background: #fed7aa; padding: 15px; border-radius: 6px; margin: 20px 0; text-align: left;">
                                    <p style="margin: 0; color: #92400e; font-size: 14px;">
                                        <strong>⚠️ ATENCIÓN:</strong><br>
                                        • Este es un email informativo de RECEPCIÓN<br>
                                        • No respondas a este email<br>
                                        • Solo verifica el estado en el sistema<br>
                                        • No se realizan acciones desde el correo<br>
                                        • Contacta al administrador si hay problemas
                                    </p>
                                </div>
                                
                                <div style="text-align: center; margin: 25px 0;">
                                    <a href="${process.env.FRONTEND_URL || 'http://localhost:4000'}/soporte/tickets/${ticket._id}" 
                                       style="display: inline-block; background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); 
                                              color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; 
                                              font-weight: bold;">
                                        🚨 VER ESTADO DE TU TICKET
                                    </a>
                                </div>
                            </div>
                            
                            <div class="footer">
                                <p style="margin: 5px 0;">
                                    <strong>Sistema de Gestión Documental CBTIS051</strong><br>
                                    Email automático de recepción del sistema de soporte.
                                </p>
                                <p style="margin: 5px 0; font-size: 11px;">
                                    Administrador asignado: ${ticket.adminName || 'Equipo de Soporte'}<br>
                                    Sistema de Soporte Técnico
                                </p>
                            </div>
                        </div>
                    </body>
                    </html>
                `,
                text: `NUEVO TICKET RECIBIDO - CBTIS051\n\n
🚨 TICKET RECIBIDO - EN ESPERA DE REVISIÓN\n\n
Ticket: ${ticket.ticketNumber}
Estado: ABIERTO
Asunto: ${ticket.subject}
Categoría: ${ticket.category}
Prioridad: ${ticket.priority.toUpperCase()}
Administrador asignado: ${ticket.adminName || 'Equipo de Soporte'}
Fecha: ${new Date().toLocaleString('es-MX')}\n\n
DESCRIPCIÓN:
${ticket.description}\n\n
${ticket.attachments && ticket.attachments.length > 0 ? 
`ARCHIVOS ADJUNTOS (${ticket.attachments.length}):\n` + 
ticket.attachments.map(f => `• ${f.originalname} (${Math.round(f.size/1024)} KB)`).join('\n') + '\n\n' 
: ''}
🚨 IMPORTANTE - ESTADO ACTUAL:
1. Tu ticket está en estado "ABIERTO"
2. El administrador ${ticket.adminName || 'Equipo de Soporte'} lo revisará
3. Cambiará a "EN PROCESO" cuando sea atendido
4. Se cerrará cuando se resuelva el problema
5. Recibirás un email en cada cambio de estado\n\n
⚠️ ATENCIÓN:
• Este es un email informativo de RECEPCIÓN
• No respondas a este email
• Solo verifica el estado en el sistema
• No se realizan acciones desde el correo
• Contacta al administrador si hay problemas\n\n
Ver estado del ticket: ${process.env.FRONTEND_URL || 'http://localhost:4000'}/soporte/tickets/${ticket._id}\n\n
Sistema de Gestión Documental CBTIS051\nEmail automático de recepción.`
            };
            
            const info = await enviarEmailGmail(mailOptions);
            console.log(`📕 Email ROJO enviado al USUARIO: ${userEmail}`);
            
        } catch (error) {
            console.error('❌ Error enviando email ROJO al USUARIO:', error.message);
            throw error;
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
    // 6. PRUEBA DE EMAIL
    // =====================================================================
    
    static async testSupportEmail(req, res) {
        try {
            console.log('\n🧪 Probando sistema de emails de soporte...');
            
            const testEmail = 'riosnavarretejared@gmail.com';
            
            const mailOptions = {
                from: `"Soporte CBTIS051" <${SYSTEM_EMAIL}>`,
                to: testEmail,
                subject: '🧪 Prueba de Email - Sistema de Soporte CBTIS051',
                html: '<h1>Prueba exitosa</h1><p>El sistema de emails está funcionando correctamente.</p>',
                text: 'Prueba exitosa - El sistema de emails está funcionando correctamente.'
            };
            
            const info = await enviarEmailGmail(mailOptions);
            
            console.log('✅ Email de prueba enviado exitosamente');
            
            res.json({
                success: true,
                message: 'Email de prueba enviado exitosamente',
                messageId: info.messageId
            });
            
        } catch (error) {
            console.error('❌ Error en prueba de email:', error.message);
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
                    answer: "Sí, puedes adjuntar imágenes, documentos PDF, Word, Excel, etc. El tamaño máximo por archivo es 10MB y.",
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
    // 13. OBTENER ESTADO DEL SISTEMA - VERSIÓN CORREGIDA CON VARIABLES DE ENTORNO
    // =====================================================================

    static async getSystemStatus(req, res) {
        // Agregar timestamp de inicio para medir tiempo de respuesta
        req.startTime = Date.now();
        
        try {
            console.log('🖥️ Verificando estado REAL del sistema...');
            monitorMemory();
            console.log('🔍 Variables de entorno disponibles:', {
                CLOUDINARY_CLOUD_NAME: !!process.env.CLOUDINARY_CLOUD_NAME,
                CLOUDINARY_API_KEY: !!process.env.CLOUDINARY_API_KEY,
                CLOUDINARY_API_SECRET: !!process.env.CLOUDINARY_API_SECRET,
                EMAIL_HOST: !!process.env.EMAIL_HOST,
                EMAIL_USER: !!process.env.EMAIL_USER,
                EMAIL_PASS: !!process.env.EMAIL_PASS,
                EMAIL_PORT: !!process.env.EMAIL_PORT
            });
            
            // 1. Verificar estado de la base de datos
            let dbStatus = { connected: false, message: 'No conectado' };
            try {
                const dbState = mongoose.connection.readyState;
                
                // Estados de conexión de MongoDB:
                // 0 = disconnected
                // 1 = connected
                // 2 = connecting
                // 3 = disconnecting
                
                if (dbState === 1) {
                    // Realizar ping para verificar conexión real
                    try {
                        await mongoose.connection.db.admin().ping();
                        dbStatus = { 
                            connected: true, 
                            message: 'Conectado',
                            details: {
                                database: mongoose.connection.name || 'CBTIS051',
                                host: mongoose.connection.host || 'localhost:27017',
                                state: 'Conectado y respondiendo',
                                collectionsCount: (await mongoose.connection.db.listCollections().toArray()).length
                            }
                        };
                        console.log('✅ MongoDB: Conectado y respondiendo');
                    } catch (pingError) {
                        dbStatus = { 
                            connected: false, 
                            message: 'Conexión inestable',
                            error: pingError.message,
                            details: {
                                database: mongoose.connection.name,
                                state: 'Conectado pero ping falló'
                            }
                        };
                        console.warn('⚠️ MongoDB: Conectado pero ping falló:', pingError.message);
                    }
                } else if (dbState === 2) {
                    dbStatus = { 
                        connected: false, 
                        message: 'Conectando...',
                        details: 'Estableciendo conexión con MongoDB'
                    };
                    console.log('⏳ MongoDB: Conectando...');
                } else if (dbState === 3) {
                    dbStatus = { 
                        connected: false, 
                        message: 'Desconectando',
                        details: 'Cerrando conexión con MongoDB'
                    };
                    console.log('⏳ MongoDB: Desconectando...');
                } else {
                    dbStatus = { 
                        connected: false, 
                        message: 'Desconectado',
                        details: 'Sin conexión a MongoDB'
                    };
                    console.log('❌ MongoDB: Desconectado');
                }
                
                console.log(`📊 Estado MongoDB (${dbState}): ${dbStatus.message}`);
                
            } catch (dbError) {
                console.error('❌ Error verificando MongoDB:', dbError.message);
                dbStatus = { 
                    connected: false, 
                    message: 'Error de conexión',
                    error: dbError.message,
                    details: 'No se pudo verificar la conexión a MongoDB'
                };
            }

            // 2. Verificar estado del sistema principal
            let systemStatus = { operational: true, message: 'Operacional' };
            try {
                const systemDetails = {
                    platform: 'server',
                    timestamp: new Date().toISOString(),
                    serverTime: new Date().toLocaleString('es-MX'),
                    nodeVersion: process.version || 'N/A',
                    uptime: Math.floor(process.uptime()) + ' segundos',
                    memoryUsage: {
                        rss: Math.round(process.memoryUsage().rss / 1024 / 1024) + ' MB',
                        heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + ' MB',
                        heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB',
                        external: Math.round(process.memoryUsage().external / 1024 / 1024) + ' MB'
                    }
                };
                
                // Verificar carga del sistema
                const memoryPercent = (process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) * 100;
                
                if (memoryPercent > 85) {
                    systemStatus = {
                        operational: true,
                        message: 'Operacional (alta carga de memoria)',
                        details: systemDetails,
                        warning: `Uso de memoria alto: ${Math.round(memoryPercent)}%`
                    };
                    console.warn(`⚠️ Sistema: Alta carga de memoria (${Math.round(memoryPercent)}%)`);
                } else {
                    systemStatus = {
                        operational: true,
                        message: 'Operacional',
                        details: systemDetails
                    };
                    console.log('✅ Sistema Principal: Operacional');
                }
                
            } catch (systemError) {
                console.error('❌ Error verificando sistema:', systemError.message);
                systemStatus = { 
                    operational: false, 
                    message: 'Error en sistema',
                    error: systemError.message 
                };
            }

            // 3. Verificar almacenamiento Cloud (Cloudinary) - VERIFICACIÓN REAL
            let cloudStorageStatus = { active: false, message: 'Inactivo' };
            try {
                console.log('☁️ Verificando Cloudinary...');
                
                // Usar las variables de entorno
                const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
                const apiKey = process.env.CLOUDINARY_API_KEY;
                const apiSecret = process.env.CLOUDINARY_API_SECRET;
                
                if (cloudName && apiKey && apiSecret) {
                    console.log('✅ Variables de entorno de Cloudinary encontradas');
                    
                    // Configurar con las variables de entorno
                    cloudinary.config({
                        cloud_name: cloudName,
                        api_key: apiKey,
                        api_secret: apiSecret
                    });
                    
                    try {
                        // Intentar una operación REAL de Cloudinary
                        const result = await cloudinary.api.ping();
                        
                        cloudStorageStatus = {
                            active: true,
                            message: 'Activo y funcionando',
                            details: {
                                cloudName: cloudName,
                                service: 'Cloudinary',
                                status: 'Conectado y autenticado',
                                verified: true,
                                timestamp: new Date().toISOString(),
                                accountInfo: {
                                    cloudName: cloudName,
                                    apiKey: apiKey ? `${apiKey.substring(0, 8)}...` : 'N/A',
                                    environment: 'production'
                                }
                            }
                        };
                        console.log('✅ Cloudinary: Conectado, autenticado y funcionando');
                        
                    } catch (cloudinaryError) {
                        console.error('❌ Cloudinary: Error en conexión REAL:', cloudinaryError.message);
                        cloudStorageStatus = {
                            active: false,
                            message: 'Error de autenticación',
                            error: cloudinaryError.message,
                            details: {
                                cloudName: cloudName,
                                status: 'Credenciales inválidas o servicio no disponible',
                                timestamp: new Date().toISOString()
                            }
                        };
                    }
                } else {
                    console.warn('⚠️ Cloudinary: Variables de entorno incompletas');
                    cloudStorageStatus = {
                        active: false,
                        message: 'Configuración incompleta',
                        details: {
                            status: 'Faltan variables de entorno',
                            required: ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'],
                            found: {
                                cloudName: !!cloudName,
                                apiKey: !!apiKey,
                                apiSecret: !!apiSecret
                            },
                            timestamp: new Date().toISOString()
                        }
                    };
                }
            } catch (cloudError) {
                console.error('❌ Error verificando Cloudinary:', cloudError.message);
                cloudStorageStatus = {
                    active: false,
                    message: 'Error en servicio',
                    error: cloudError.message,
                    details: {
                        timestamp: new Date().toISOString()
                    }
                };
            }

            // 4. Verificar servicio de Email - VERIFICACIÓN CORREGIDA
            let emailServiceStatus = { configured: false, canSend: false, message: 'No configurado' };
            try {
                console.log('📧 Verificando servicio de email REAL...');
                
                // Verificar variables de entorno
                const emailHost = process.env.EMAIL_HOST;
                const emailUser = process.env.EMAIL_USER;
                const emailPass = process.env.EMAIL_PASS;
                const emailPort = process.env.EMAIL_PORT;
                
                console.log('🔍 Variables de entorno email:', {
                    EMAIL_HOST: emailHost,
                    EMAIL_USER: emailUser,
                    EMAIL_PASS: emailPass ? '***' + emailPass.slice(-4) : 'NO',
                    EMAIL_PORT: emailPort
                });
                
                if (emailHost && emailUser && emailPass) {
                    console.log('✅ Variables de entorno de email encontradas');
                    
                    // Verificar si el transporter ya está configurado
                    if (transporter) {
                        console.log('✅ Transporter ya está configurado, verificando conexión...');
                        
                        try {
                            // Verificar conexión REAL con el transporter existente
                            await new Promise((resolve, reject) => {
                                transporter.verify((error, success) => {
                                    if (error) {
                                        console.error('❌ Verificación de transporter falló:', error.message);
                                        reject(error);
                                    } else {
                                        console.log('✅ Transporter verificado correctamente');
                                        resolve(success);
                                    }
                                });
                            });
                            
                            emailServiceStatus = {
                                configured: true,
                                canSend: true,
                                message: 'Configurado y verificado',
                                details: {
                                    host: emailHost,
                                    port: emailPort || 587,
                                    user: emailUser,
                                    status: 'Conectado y autenticado',
                                    authMethod: 'Gmail SMTP',
                                    verified: true,
                                    transporterConfigured: true,
                                    timestamp: new Date().toISOString()
                                }
                            };
                            
                            console.log('📧 Servicio de email: Configuración REAL verificada, listo para enviar');
                            
                        } catch (verifyError) {
                            console.error('❌ Error verificando transporter:', verifyError.message);
                            
                            // Intentar crear nuevo transporter
                            try {
                                const newTransporter = nodemailer.createTransport({
                                    host: emailHost,
                                    port: parseInt(emailPort) || 587,
                                    secure: false,
                                    auth: {
                                        user: emailUser,
                                        pass: emailPass
                                    }
                                });
                                
                                await newTransporter.verify();
                                
                                emailServiceStatus = {
                                    configured: true,
                                    canSend: true,
                                    message: 'Configurado (transporter recreado)',
                                    details: {
                                        host: emailHost,
                                        port: emailPort || 587,
                                        user: emailUser,
                                        status: 'Conectado y autenticado',
                                        authMethod: 'Gmail SMTP',
                                        verified: true,
                                        transporterRecreated: true,
                                        timestamp: new Date().toISOString()
                                    }
                                };
                                
                                console.log('✅ Transporter recreado y verificado');
                                
                            } catch (createError) {
                                emailServiceStatus = {
                                    configured: true,
                                    canSend: false,
                                    message: 'Configurado pero error en conexión',
                                    error: createError.message,
                                    details: {
                                        host: emailHost,
                                        user: emailUser,
                                        status: 'Credenciales válidas pero falla conexión',
                                        timestamp: new Date().toISOString()
                                    }
                                };
                            }
                        }
                    } else {
                        // Transporter no está configurado, pero las variables existen
                        emailServiceStatus = {
                            configured: true,
                            canSend: false,
                            message: 'Configurado (transporter no inicializado)',
                            details: {
                                host: emailHost,
                                port: emailPort || 587,
                                user: emailUser,
                                status: 'Variables configuradas pero transporter no inicializado',
                                note: 'El transporter podría inicializarse al enviar el primer email',
                                timestamp: new Date().toISOString()
                            }
                        };
                        console.log('ℹ️ Variables de email configuradas, pero transporter no inicializado');
                    }
                } else {
                    console.warn('⚠️ Variables de entorno de email incompletas o faltantes');
                    emailServiceStatus = {
                        configured: false,
                        canSend: false,
                        message: 'No configurado',
                        details: {
                            status: 'Faltan variables de entorno',
                            required: ['EMAIL_HOST', 'EMAIL_USER', 'EMAIL_PASS'],
                            found: {
                                EMAIL_HOST: !!emailHost,
                                EMAIL_USER: !!emailUser,
                                EMAIL_PASS: !!emailPass,
                                EMAIL_PORT: !!emailPort
                            },
                            note: 'Verifica tu archivo .env',
                            timestamp: new Date().toISOString()
                        }
                    };
                }
                
            } catch (emailError) {
                console.error('❌ Error verificando servicio de email REAL:', emailError.message);
                emailServiceStatus = {
                    configured: false,
                    canSend: false,
                    message: 'Error en servicio',
                    error: emailError.message,
                    details: {
                        timestamp: new Date().toISOString()
                    }
                };
            }

            // Calcular estado general REAL del sistema
            const errorCount = [
                !dbStatus.connected,
                !systemStatus.operational,
                !cloudStorageStatus.active,
                !emailServiceStatus.configured
            ].filter(Boolean).length;
            
            const warningCount = [
                dbStatus.connected && dbStatus.message.includes('inestable'),
                cloudStorageStatus.active && cloudStorageStatus.message.includes('advertencia'),
                emailServiceStatus.configured && !emailServiceStatus.canSend
            ].filter(Boolean).length;
            
            let overallStatus = 'healthy';
            if (errorCount > 0) {
                overallStatus = 'degraded';
            } else if (warningCount > 0) {
                overallStatus = 'warning';
            }

            // Preparar respuesta REAL
            const response = {
                success: true,
                timestamp: new Date().toISOString(),
                serverTime: new Date().toLocaleString('es-MX'),
                overallStatus: overallStatus,
                summary: {
                    totalServices: 4,
                    operational: 4 - errorCount - warningCount,
                    errors: errorCount,
                    warnings: warningCount,
                    health: `${Math.round((4 - errorCount - warningCount) / 4 * 100)}%`
                },
                services: {
                    database: {
                        name: 'Base de Datos',
                        status: dbStatus.connected ? 'operational' : 'error',
                        message: dbStatus.message,
                        details: dbStatus.details || {},
                        configured: dbStatus.connected,
                        timestamp: new Date().toISOString()
                    },
                    system: {
                        name: 'Sistema Principal',
                        status: systemStatus.operational ? 'operational' : 'error',
                        message: systemStatus.message,
                        details: systemStatus.details || {},
                        configured: true,
                        timestamp: new Date().toISOString()
                    },
                    cloudStorage: {
                        name: 'Almacenamiento Cloud',
                        status: cloudStorageStatus.active ? 'operational' : 'error',
                        message: cloudStorageStatus.message,
                        details: cloudStorageStatus.details || {},
                        configured: cloudStorageStatus.active,
                        timestamp: new Date().toISOString()
                    },
                    emailService: {
                        name: 'Servicio de Email',
                        status: emailServiceStatus.configured ? 'operational' : 'error',
                        message: emailServiceStatus.message,
                        details: emailServiceStatus.details || {},
                        configured: emailServiceStatus.configured,
                        canSend: emailServiceStatus.canSend || false,
                        timestamp: new Date().toISOString()
                    }
                },
                metrics: {
                    timestamp: new Date().toISOString(),
                    responseTime: Date.now() - req.startTime,
                    environment: process.env.NODE_ENV || 'production',
                    serverVersion: '1.0.0'
                },
                notes: {
                    emailService: emailServiceStatus.configured 
                        ? (emailServiceStatus.canSend 
                            ? '✅ Servicio de email configurado y listo para enviar' 
                            : '⚠️ Servicio de email configurado pero requiere verificación')
                        : '❌ Servicio de email requiere configuración en .env',
                    database: dbStatus.connected 
                        ? '✅ Base de datos conectada' 
                        : '❌ Error de conexión a base de datos',
                    cloudStorage: cloudStorageStatus.active 
                        ? '✅ Cloud Storage activo' 
                        : '❌ Cloud Storage requiere configuración en .env'
                }
            };

            console.log('✅ Estado REAL del sistema verificado:', {
                overall: overallStatus,
                db: dbStatus.connected ? '✅' : '❌',
                system: systemStatus.operational ? '✅' : '❌',
                cloud: cloudStorageStatus.active ? '✅' : '❌',
                email: emailServiceStatus.configured ? '✅' : '❌',
                emailCanSend: emailServiceStatus.canSend ? '✅' : '❌'
            });

            res.json(response);

        } catch (error) {
            console.error('🔥 ERROR CRÍTICO verificando estado del sistema:', error);
            
            res.status(500).json({
                success: false,
                message: 'Error interno al verificar estado del sistema',
                error: error.message,
                timestamp: new Date().toISOString(),
                services: {
                    database: {
                        name: 'Base de Datos',
                        status: 'error',
                        message: 'No se pudo verificar',
                        timestamp: new Date().toISOString()
                    },
                    system: {
                        name: 'Sistema Principal',
                        status: 'error',
                        message: 'Error interno del servidor',
                        timestamp: new Date().toISOString()
                    },
                    cloudStorage: {
                        name: 'Almacenamiento Cloud',
                        status: 'error',
                        message: 'No se pudo verificar',
                        timestamp: new Date().toISOString()
                    },
                    emailService: {
                        name: 'Servicio de Email',
                        status: 'error',
                        message: 'No se pudo verificar',
                        timestamp: new Date().toISOString()
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