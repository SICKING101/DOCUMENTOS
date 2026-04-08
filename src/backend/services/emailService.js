// src/backend/services/emailService.js

import nodemailer from 'nodemailer';
import AuditService from './auditService.js';

/**
 * Servicio centralizado de envío de correos electrónicos
 * Maneja toda la configuración de email del sistema
 */
class EmailService {
    constructor() {
        this.transporter = null;
        this.config = this.loadConfig();
        this.initializeTransporter();
    }

    /**
     * Carga la configuración desde variables de entorno o valores por defecto
     */
    loadConfig() {
        const config = {
            user: process.env.EMAIL_USER || 'riosnavarretejared@gmail.com',
            pass: process.env.EMAIL_PASS || 'emdkqnupuzzzucnw',
            host: process.env.EMAIL_HOST || 'smtp.gmail.com',
            port: parseInt(process.env.EMAIL_PORT) || 587,
            from: process.env.EMAIL_FROM || 'riosnavarretejared@gmail.com',
            frontendUrl: process.env.FRONTEND_URL || 'http://localhost:4000'
        };

        console.log('\n📧 ========== SERVICIO DE EMAIL INICIALIZADO ==========');
        console.log(`📧 Usuario: ${config.user}`);
        console.log(`🌐 Host: ${config.host}:${config.port}`);
        console.log(`🔗 Frontend: ${config.frontendUrl}`);
        console.log('📧 ====================================================\n');

        return config;
    }

    /**
     * Inicializa el transporter de nodemailer
     */
    initializeTransporter() {
        try {
            this.transporter = nodemailer.createTransport({
                host: this.config.host,
                port: this.config.port,
                secure: false,
                auth: {
                    user: this.config.user,
                    pass: this.config.pass
                },
                tls: {
                    ciphers: 'SSLv3',
                    rejectUnauthorized: false
                },
                connectionTimeout: 10000,
                greetingTimeout: 10000,
                socketTimeout: 10000,
                debug: process.env.NODE_ENV === 'development',
                logger: process.env.NODE_ENV === 'development'
            });

            // Verificar conexión en segundo plano
            this.transporter.verify((error, success) => {
                if (error) {
                    console.error('❌ Error verificando conexión de email:', error.message);
                } else {
                    console.log('✅ Conexión de email verificada correctamente');
                }
            });

        } catch (error) {
            console.error('❌ Error crítico inicializando email:', error.message);
            this.transporter = null;
        }
    }

    /**
     * Envía un email con reintentos automáticos
     * @param {Object} mailOptions - Opciones del email (from, to, subject, html, text)
     * @param {number} retries - Número de intentos (default: 3)
     * @returns {Promise<Object>} - Información del envío
     */
    async sendWithRetry(mailOptions, retries = 3) {
        if (!this.transporter) {
            console.log('📧 Transporter no disponible - Email simulado en consola');
            this.logEmailToConsole(mailOptions);
            return { simulated: true, message: 'Email simulado (transporter no disponible)' };
        }

        for (let i = 0; i < retries; i++) {
            try {
                console.log(`📤 Intento ${i + 1}/${retries} enviando email a: ${mailOptions.to}`);
                const info = await this.transporter.sendMail(mailOptions);
                console.log(`✅ Email enviado exitosamente en intento ${i + 1}`);
                return info;
            } catch (error) {
                console.error(`❌ Intento ${i + 1} falló:`, error.message);
                
                if (i === retries - 1) {
                    console.error('🔥 Todos los intentos de envío fallaron');
                    this.logEmailToConsole(mailOptions);
                    throw error;
                }
                
                console.log(`⏳ Esperando 2 segundos antes de reintentar...`);
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }
    }

    /**
     * Muestra el contenido del email en consola (modo desarrollo/fallback)
     */
    logEmailToConsole(mailOptions) {
        console.log('\n' + '='.repeat(80));
        console.log('📧 EMAIL (SIMULADO EN CONSOLA)');
        console.log('='.repeat(80));
        console.log(`📨 De: ${mailOptions.from}`);
        console.log(`📨 Para: ${mailOptions.to}`);
        console.log(`📧 Asunto: ${mailOptions.subject}`);
        console.log('='.repeat(80));
        if (mailOptions.text) {
            console.log('📝 Texto plano:');
            console.log(mailOptions.text.substring(0, 500) + '...');
        }
        console.log('='.repeat(80) + '\n');
    }

    /**
     * Muestra un código de verificación en consola (para desarrollo)
     */
    showCodeInConsole(email, code, expiresInMinutes = 15) {
        console.log('\n' + '═'.repeat(60));
        console.log('🔑 CÓDIGO DE VERIFICACIÓN (BACKUP)');
        console.log('═'.repeat(60));
        console.log(`📨 Para: ${email}`);
        console.log(`🔑 Código: ${code}`);
        console.log(`⏰ Expira: ${new Date(Date.now() + expiresInMinutes * 60 * 1000).toLocaleTimeString()}`);
        console.log('═'.repeat(60) + '\n');
    }

    // =========================================================================
    // MÉTODOS ESPECÍFICOS PARA CADA TIPO DE EMAIL
    // =========================================================================

    /**
     * Envía código de recuperación de contraseña
     */
    async sendPasswordResetCode(email, code, userName) {
        const mailOptions = {
            from: `"Sistema CBTIS051" <${this.config.from}>`,
            to: email,
            subject: '🔐 Código de recuperación - CBTIS051',
            html: this.getPasswordResetTemplate(code, userName),
            text: `CBTIS051 - Código de recuperación\n\nHola ${userName},\n\nTu código de verificación es: ${code}\n\nEste código expira en 15 minutos.\n\nSi no solicitaste este cambio, ignora este mensaje.`
        };

        return this.sendWithRetry(mailOptions);
    }

    /**
     * Envía confirmación de cambio de contraseña
     */
    async sendPasswordChangeConfirmation(email, userName, metadata = {}) {
        const mailOptions = {
            from: `"Sistema CBTIS051" <${this.config.from}>`,
            to: email,
            subject: '✅ Contraseña cambiada exitosamente - CBTIS051',
            html: this.getPasswordChangeTemplate(userName, metadata),
            text: `CONTRASEÑA CAMBIADA - CBTIS051\n\nHola ${userName},\n\nTu contraseña ha sido cambiada exitosamente.\n\nFecha: ${new Date().toLocaleString('es-MX')}\n\nSi no realizaste este cambio, contacta al administrador inmediatamente.`
        };

        return this.sendWithRetry(mailOptions);
    }

    /**
     * Envía email de verificación para cambio de administrador
     */
    async sendAdminChangeVerification(email, data) {
        const { currentAdminName, newAdminUser, newAdminEmail, verificationUrl, requestId } = data;
        
        const mailOptions = {
            from: `"Sistema CBTIS051 - Administración" <${this.config.from}>`,
            to: email,
            subject: '⚠️ Confirmación de Cambio de Administrador - CBTIS051',
            html: this.getAdminChangeVerificationTemplate(data),
            text: `CONFIRMACIÓN DE CAMBIO DE ADMINISTRADOR - CBTIS051\n\nHas solicitado transferir la administración a ${newAdminUser}.\n\nDETALLES:\n- Nuevo administrador: ${newAdminUser}\n- Correo nuevo: ${newAdminEmail}\n- Solicitado por: ${currentAdminName}\n- ID de solicitud: ${requestId}\n\nCONFIRMAR: ${verificationUrl}`
        };

        return this.sendWithRetry(mailOptions);
    }

    /**
     * Envía email de bienvenida al nuevo administrador
     */
    async sendNewAdminWelcome(email, data) {
        const { newAdminUser, newAdminEmail, currentAdminName, loginUrl } = data;
        
        const mailOptions = {
            from: `"Sistema CBTIS051 - Administración" <${this.config.from}>`,
            to: email,
            subject: '✅ ¡Eres el nuevo Administrador! - CBTIS051',
            html: this.getNewAdminWelcomeTemplate(data),
            text: `¡BIENVENIDO NUEVO ADMINISTRADOR!\n\n${currentAdminName} ha transferido la administración a tu cuenta.\n\nCREDENCIALES:\n- Usuario: ${newAdminUser}\n- Correo: ${newAdminEmail}\n- Contraseña: La que estableciste\n\nINICIAR SESIÓN: ${loginUrl}`
        };

        return this.sendWithRetry(mailOptions);
    }

    /**
     * Envía email al administrador cuando se crea un ticket (VERDE)
     */
    async sendTicketCreatedToAdmin(email, data) {
        const { ticket, user, adminName } = data;
        
        const mailOptions = {
            from: `"Sistema de Soporte CBTIS051" <${this.config.from}>`,
            to: email,
            subject: `✅ TICKET CREADO: ${ticket.ticketNumber} - ${ticket.subject}`,
            html: this.getTicketAdminTemplate(ticket, user, adminName),
            text: this.getTicketAdminText(ticket, user, adminName)
        };

        return this.sendWithRetry(mailOptions);
    }

    /**
     * Envía email al usuario cuando se crea un ticket (ROJO)
     */
    async sendTicketCreatedToUser(email, data) {
        const { ticket, user } = data;
        
        const mailOptions = {
            from: `"Soporte CBTIS051" <${this.config.from}>`,
            to: email,
            subject: `🚨 NUEVO TICKET RECIBIDO: ${ticket.ticketNumber} - ${ticket.subject}`,
            html: this.getTicketUserTemplate(ticket, user),
            text: this.getTicketUserText(ticket, user)
        };

        return this.sendWithRetry(mailOptions);
    }

    /**
     * Envía email de prueba
     */
    async sendTestEmail(email, adminName = 'Administrador') {
        const mailOptions = {
            from: `"Sistema CBTIS051" <${this.config.from}>`,
            to: email,
            subject: '🧪 Prueba de Email - CBTIS051',
            html: this.getTestEmailTemplate(email, adminName),
            text: `PRUEBA DE EMAIL - CBTIS051\n\nHola ${adminName},\n\nEste email prueba que el sistema está configurado correctamente.\n\nFecha: ${new Date().toLocaleString('es-MX')}\nServidor: ${this.config.host}:${this.config.port}\n\n✅ Configuración correcta`
        };

        return this.sendWithRetry(mailOptions);
    }

    // =========================================================================
    // PLANTILLAS HTML
    // =========================================================================

    getPasswordResetTemplate(code, userName) {
        return `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8f9fa;">
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                    <h1 style="color: white; margin: 0; font-size: 28px;">CBTIS051</h1>
                    <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0; font-size: 16px;">Sistema de Gestión Documental</p>
                </div>
                <div style="padding: 40px; border-radius: 0 0 10px 10px; background: white;">
                    <h2 style="color: #2d3748; margin: 0 0 20px;">Recuperación de Contraseña</h2>
                    <p style="color: #4a5568; line-height: 1.6;">Hola <strong>${userName}</strong>, utiliza el siguiente código:</p>
                    <div style="text-align: center; margin: 35px 0; padding: 25px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px;">
                        <div style="color: white; font-size: 36px; font-weight: bold; letter-spacing: 8px; font-family: 'Courier New', monospace;">${code}</div>
                    </div>
                    <p style="color: #718096;">⚠️ Este código expira en 15 minutos.</p>
                </div>
            </div>
        `;
    }

    getPasswordChangeTemplate(userName, metadata) {
        return `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                    <h1 style="color: white; margin: 0;">✅ Contraseña Actualizada</h1>
                </div>
                <div style="padding: 40px; background: white; border-radius: 0 0 10px 10px;">
                    <h2>Hola ${userName},</h2>
                    <p>Tu contraseña ha sido cambiada exitosamente.</p>
                    <div style="margin: 30px 0; padding: 20px; background: #f0fdf4; border-radius: 8px;">
                        <p><strong>📅 Fecha:</strong> ${new Date().toLocaleString('es-MX')}</p>
                        ${metadata.ip ? `<p><strong>🖥️ IP:</strong> ${metadata.ip}</p>` : ''}
                    </div>
                    <div style="text-align: center;">
                        <a href="${this.config.frontendUrl}/login" style="display: inline-block; background: #667eea; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px;">Iniciar Sesión</a>
                    </div>
                </div>
            </div>
        `;
    }

    getAdminChangeVerificationTemplate(data) {
        const { currentAdminName, newAdminUser, newAdminEmail, verificationUrl, requestId } = data;
        return `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); padding: 40px; text-align: center; border-radius: 15px 15px 0 0;">
                    <h1 style="color: white; margin: 0;">CONFIRMACIÓN REQUERIDA</h1>
                    <p style="color: rgba(255,255,255,0.9);">Cambio de Administrador</p>
                </div>
                <div style="padding: 40px; background: white; border-radius: 0 0 15px 15px;">
                    <h2>Confirma la Transferencia</h2>
                    <p>Has solicitado transferir la administración a ${newAdminUser}.</p>
                    <div style="background: #f9fafb; padding: 25px; border-radius: 12px; margin: 20px 0;">
                        <p><strong>👤 Nuevo administrador:</strong> ${newAdminUser}</p>
                        <p><strong>📧 Correo:</strong> ${newAdminEmail}</p>
                        <p><strong>⏰ Expira en:</strong> 24 horas</p>
                    </div>
                    <div style="text-align: center;">
                        <a href="${verificationUrl}" style="display: inline-block; background: #10b981; color: white; padding: 18px 40px; text-decoration: none; border-radius: 12px; font-weight: bold;">CONFIRMAR TRANSFERENCIA</a>
                        <p style="color: #9ca3af; margin-top: 15px;">ID: ${requestId}</p>
                    </div>
                </div>
            </div>
        `;
    }

    getNewAdminWelcomeTemplate(data) {
        const { newAdminUser, newAdminEmail, currentAdminName, loginUrl } = data;
        return `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px; text-align: center; border-radius: 15px 15px 0 0;">
                    <h1 style="color: white; margin: 0;">¡BIENVENIDO!</h1>
                    <p style="color: rgba(255,255,255,0.9);">Nuevo Administrador</p>
                </div>
                <div style="padding: 40px; background: white; border-radius: 0 0 15px 15px;">
                    <h2>Administración Transferida</h2>
                    <p>${currentAdminName} ha transferido la administración a tu cuenta.</p>
                    <div style="background: #f0f9ff; padding: 25px; border-radius: 12px; margin: 20px 0;">
                        <p><strong>👤 Usuario:</strong> ${newAdminUser}</p>
                        <p><strong>📧 Correo:</strong> ${newAdminEmail}</p>
                        <p><strong>🔐 Contraseña:</strong> La que estableciste</p>
                    </div>
                    <div style="text-align: center;">
                        <a href="${loginUrl}" style="display: inline-block; background: #3b82f6; color: white; padding: 18px 40px; text-decoration: none; border-radius: 12px; font-weight: bold;">INICIAR SESIÓN</a>
                    </div>
                </div>
            </div>
        `;
    }

    getTicketAdminTemplate(ticket, user, adminName) {
        // Plantilla VERDE para administrador
        let attachmentsHTML = this.generateAttachmentsHTML(ticket.attachments, 'admin');
        
        return `
            <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #059669 0%, #047857 100%); padding: 25px; text-align: center; border-radius: 10px 10px 0 0; color: white;">
                    <h1 style="margin: 0;">✅ TICKET CREADO EXITOSAMENTE</h1>
                    <p style="margin: 5px 0 0;">Sistema de Soporte CBTIS051</p>
                    <div style="margin-top: 15px;">
                        <span style="background: #059669; color: white; padding: 6px 12px; border-radius: 20px;">📝 NUEVO TICKET</span>
                    </div>
                </div>
                <div style="padding: 25px; background: white; border-radius: 0 0 10px 10px;">
                    <h2 style="color: #065f46;">Ticket: ${ticket.ticketNumber}</h2>
                    <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <p><strong>📋 Asunto:</strong> ${ticket.subject}</p>
                        <p><strong>👤 Creado por:</strong> ${user.name || 'Usuario'}</p>
                        <p><strong>📧 Email usuario:</strong> ${user.email}</p>
                        <p><strong>📅 Fecha:</strong> ${new Date().toLocaleString('es-MX')}</p>
                        <p><strong>🏷️ Categoría:</strong> ${ticket.category}</p>
                        <p><strong>⚠️ Prioridad:</strong> ${ticket.priority?.toUpperCase()}</p>
                        <p><strong>👑 Administrador:</strong> ${adminName} (TÚ)</p>
                    </div>
                    <h3 style="color: #059669;">📝 Descripción:</h3>
                    <div style="background: #f0fdf4; padding: 15px; border-radius: 6px;">${ticket.description}</div>
                    ${attachmentsHTML}
                    <div style="text-align: center; margin: 25px 0;">
                        <a href="${this.config.frontendUrl}/admin/tickets/${ticket._id}" style="display: inline-block; background: #059669; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px;">VER TICKET</a>
                    </div>
                </div>
            </div>
        `;
    }

    getTicketUserTemplate(ticket, user) {
        // Plantilla ROJA para usuario
        let attachmentsHTML = this.generateAttachmentsHTML(ticket.attachments, 'user');
        
        return `
            <div style="font-family: Arial, sans-serif; max-width: 650px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); padding: 25px; text-align: center; border-radius: 10px 10px 0 0; color: white;">
                    <h1 style="margin: 0;">🚨 NUEVO TICKET RECIBIDO</h1>
                    <p style="margin: 5px 0 0;">Sistema de Soporte CBTIS051</p>
                </div>
                <div style="padding: 25px; background: white; border-radius: 0 0 10px 10px;">
                    <div style="text-align: center;">
                        <div style="background: white; color: #dc2626; padding: 12px 24px; border-radius: 8px; font-weight: bold; font-size: 22px; display: inline-block; border: 2px solid #ef4444;">${ticket.ticketNumber}</div>
                    </div>
                    <h2 style="color: #991b1b; text-align: center;">${ticket.subject}</h2>
                    <div style="background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <p><strong>🏷️ Categoría:</strong> ${ticket.category}</p>
                        <p><strong>⚠️ Prioridad:</strong> ${ticket.priority?.toUpperCase()}</p>
                        <p><strong>👑 Administrador:</strong> ${ticket.adminName || 'Equipo de Soporte'}</p>
                        <p><strong>📅 Fecha:</strong> ${new Date().toLocaleString('es-MX')}</p>
                    </div>
                    <h3 style="color: #991b1b;">📝 Tu descripción:</h3>
                    <div style="background: #fef2f2; padding: 15px; border-radius: 6px;">${ticket.description}</div>
                    ${attachmentsHTML}
                    <div style="text-align: center; margin: 25px 0;">
                        <a href="${this.config.frontendUrl}/soporte/tickets/${ticket._id}" style="display: inline-block; background: #dc2626; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px;">VER ESTADO</a>
                    </div>
                </div>
            </div>
        `;
    }

    getTestEmailTemplate(email, adminName) {
        return `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                    <h1 style="color: white; margin: 0;">🧪 Prueba de Email</h1>
                </div>
                <div style="padding: 40px; background: white; border-radius: 0 0 10px 10px;">
                    <h2>✅ Email de Prueba Exitoso</h2>
                    <p>Hola <strong>${adminName}</strong>, el sistema de email está funcionando correctamente.</p>
                    <div style="background: #f5f3ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <p><strong>📅 Fecha:</strong> ${new Date().toLocaleString('es-MX')}</p>
                        <p><strong>📧 Servidor:</strong> ${this.config.host}:${this.config.port}</p>
                        <p><strong>👤 Cuenta:</strong> ${this.config.user}</p>
                        <p><strong>📨 Destino:</strong> ${email}</p>
                    </div>
                </div>
            </div>
        `;
    }

    generateAttachmentsHTML(attachments, type = 'admin') {
        if (!attachments || attachments.length === 0) return '';
        
        const colors = type === 'admin' 
            ? { bg: '#f0fdf4', border: '#d1fae5', text: '#065f46', accent: '#10b981' }
            : { bg: '#fef2f2', border: '#fecaca', text: '#991b1b', accent: '#dc2626' };
        
        let html = `
            <h3 style="color: ${colors.text}; margin-top: 25px;">📎 Archivos adjuntos (${attachments.length})</h3>
            <div style="background: ${colors.bg}; padding: 15px; border-radius: 6px;">
        `;
        
        attachments.forEach(file => {
            const fileSizeKB = Math.round(file.size / 1024);
            const isImage = file.originalname?.match(/\.(jpg|jpeg|png|gif|bmp|webp)$/i);
            
            if (isImage && type === 'admin') {
                html += `
                    <div style="margin-bottom: 20px; padding: 15px; background: white; border-radius: 6px; border: 1px solid ${colors.border};">
                        <div style="display: flex; gap: 15px;">
                            <img src="${file.cloudinary_url}" style="width: 120px; height: 120px; object-fit: cover; border-radius: 4px;">
                            <div>
                                <p><strong>${file.originalname}</strong></p>
                                <p>${fileSizeKB} KB</p>
                                <a href="${file.cloudinary_url}" target="_blank" style="color: ${colors.accent};">Ver imagen</a>
                            </div>
                        </div>
                    </div>
                `;
            } else {
                html += `
                    <div style="margin-bottom: 10px; padding: 10px; background: white; border-radius: 4px;">
                        <span>📄 ${file.originalname} (${fileSizeKB} KB)</span>
                        <a href="${file.cloudinary_url}" target="_blank" style="margin-left: 10px; color: ${colors.accent};">Abrir</a>
                    </div>
                `;
            }
        });
        
        html += `</div>`;
        return html;
    }

    getTicketAdminText(ticket, user, adminName) {
        return `TICKET CREADO - CBTIS051\n\n✅ NUEVO TICKET\n\nTicket: ${ticket.ticketNumber}\nAsunto: ${ticket.subject}\nCreado por: ${user.name}\nEmail: ${user.email}\nCategoría: ${ticket.category}\nPrioridad: ${ticket.priority}\nAdministrador: ${adminName}\n\nDescripción:\n${ticket.description}`;
    }

    getTicketUserText(ticket, user) {
        return `NUEVO TICKET RECIBIDO - CBTIS051\n\n🚨 TICKET RECIBIDO\n\nTicket: ${ticket.ticketNumber}\nAsunto: ${ticket.subject}\nCategoría: ${ticket.category}\nPrioridad: ${ticket.priority}\nAdministrador: ${ticket.adminName || 'Equipo de Soporte'}\n\nDescripción:\n${ticket.description}\n\nVer estado: ${this.config.frontendUrl}/soporte/tickets/${ticket._id}`;
    }

    // =========================================================================
    // MÉTODOS DE UTILIDAD
    // =========================================================================

    /**
     * Obtiene el estado actual del servicio de email
     */
    getStatus() {
        return {
            configured: !!this.transporter,
            config: {
                user: this.config.user,
                host: this.config.host,
                port: this.config.port,
                frontendUrl: this.config.frontendUrl
            },
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Verifica la conexión con el servidor de email
     */
    async verifyConnection() {
        if (!this.transporter) {
            return { success: false, message: 'Transporter no configurado' };
        }
        
        try {
            await this.transporter.verify();
            return { success: true, message: 'Conexión verificada' };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }

    /**
     * Reinicia la configuración del transporter
     */
    resetTransporter() {
        this.initializeTransporter();
        return !!this.transporter;
    }
}

// Exportar una única instancia del servicio
const emailService = new EmailService();
export default emailService;

// También exportar la clase para testing
export { EmailService };