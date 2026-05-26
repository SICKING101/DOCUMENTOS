// src/backend/services/emailService.js
// Servicio centralizado de email usando Brevo API.
// Todos los tipos de email del sistema pasan por aquí.

import fetch from 'node-fetch';
import AuditService from './auditService.js';

class EmailService {
  constructor() {
    this.config = this.loadConfig();
    this.apiKey = process.env.BREVO_API_KEY || '';
    this.apiUrl = 'https://api.brevo.com/v3/smtp/email';
    this.initialized = this.validateConfig();
  }

  loadConfig() {
    const config = {
      from: process.env.EMAIL_FROM || 'noreply@cbtis051.edu.mx',
      fromName: process.env.EMAIL_FROM_NAME || 'Sistema Gestacks',
      frontendUrl: process.env.FRONTEND_URL || 'https://gestacks.com',
      brevoApiKey: process.env.BREVO_API_KEY || '',
    };

    console.log('\n📧 ========== SERVICIO DE EMAIL INICIALIZADO (BREVO) ==========');
    console.log(`📧 Remitente: ${config.fromName} <${config.from}>`);
    console.log(`🔗 Frontend: ${config.frontendUrl}`);
    console.log(`🔑 API Key configurada: ${config.brevoApiKey ? '✅ Sí' : '❌ No'}`);
    console.log('📧 ============================================================\n');

    return config;
  }

  validateConfig() {
    if (!this.apiKey) {
      console.warn('⚠️ ADVERTENCIA: BREVO_API_KEY no configurada. Los emails se mostrarán en consola.');
      return false;
    }
    return true;
  }

  // ===========================================================================
  // ENVÍO CON REINTENTOS
  // ===========================================================================

  async sendWithRetry(mailOptions, retries = 3) {
    if (!this.initialized) {
      console.log('📧 API Key no configurada - Email simulado en consola');
      this.logEmailToConsole(mailOptions);
      return { simulated: true, message: 'Email simulado (BREVO_API_KEY no configurada)' };
    }

    for (let i = 0; i < retries; i++) {
      try {
        console.log(`📤 Intento ${i + 1}/${retries} enviando email vía Brevo a: ${mailOptions.to}`);
        const payload = this.buildBrevoPayload(mailOptions);
        const response = await fetch(this.apiUrl, {
          method: 'POST',
          headers: {
            accept: 'application/json',
            'api-key': this.apiKey,
            'content-type': 'application/json',
          },
          body: JSON.stringify(payload),
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.message || `Error ${response.status}: ${response.statusText}`);
        }
        console.log(`✅ Email enviado exitosamente vía Brevo en intento ${i + 1}`);
        console.log(`   Message ID: ${data.messageId}`);
        return { success: true, messageId: data.messageId, provider: 'brevo' };
      } catch (error) {
        console.error(`❌ Intento ${i + 1} falló:`, error.message);
        if (i === retries - 1) {
          console.error('🔥 Todos los intentos de envío fallaron');
          this.logEmailToConsole(mailOptions);
          throw error;
        }
        console.log(`⏳ Esperando 2 segundos antes de reintentar...`);
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }
  }

  buildBrevoPayload(mailOptions) {
    const payload = {
      sender: { name: this.config.fromName, email: this.config.from },
      to: [{ email: mailOptions.to, name: mailOptions.toName || mailOptions.to }],
      subject: mailOptions.subject,
      htmlContent: mailOptions.html,
    };
    if (mailOptions.text) payload.textContent = mailOptions.text;
    return payload;
  }

  logEmailToConsole(mailOptions) {
    console.log('\n' + '='.repeat(80));
    console.log('📧 EMAIL (SIMULADO EN CONSOLA - Configura BREVO_API_KEY para enviar)');
    console.log('='.repeat(80));
    console.log(`📨 De: ${this.config.fromName} <${this.config.from}>`);
    console.log(`📨 Para: ${mailOptions.to}`);
    console.log(`📧 Asunto: ${mailOptions.subject}`);
    console.log('='.repeat(80));
    if (mailOptions.text) {
      console.log('📝 Texto plano:');
      console.log(mailOptions.text.substring(0, 500) + (mailOptions.text.length > 500 ? '...' : ''));
    }
    console.log('='.repeat(80) + '\n');
  }

  showCodeInConsole(email, code, label = 'TOKEN') {
    console.log('\n' + '═'.repeat(60));
    console.log(`🔑 ${label} DE INVITACIÓN (BACKUP - No se pudo enviar email)`);
    console.log('═'.repeat(60));
    console.log(`📨 Para: ${email}`);
    console.log(`🔑 Token: ${code}`);
    console.log(`📋 Instrucciones: El usuario debe ingresar este token en`);
    console.log(`   la página de login → "¿Tienes una invitación? Validar token"`);
    console.log('═'.repeat(60) + '\n');
  }

  // ===========================================================================
  // EMAILS ESPECÍFICOS
  // ===========================================================================

  /**
   * Envía invitación con token corto de 8 caracteres.
   */
  async sendAdminInvitation(email, data) {
    const { schoolName, token, schoolId, expiresIn, frontendUrl } = data;
    const loginUrl = `${frontendUrl || this.config.frontendUrl}/login.html`;

    const mailOptions = {
      to: email,
      subject: `🏫 Invitación para administrar ${schoolName} - Gestacks`,
      html: this.getAdminInvitationTemplate({ schoolName, token, schoolId, expiresIn, loginUrl, email }),
      text: this.getAdminInvitationText({ schoolName, token, schoolId, expiresIn, loginUrl, email }),
    };
    return this.sendWithRetry(mailOptions);
  }

  /**
   * Código de recuperación de contraseña.
   */
  async sendPasswordResetCode(email, code, userName) {
    const mailOptions = {
      to: email,
      toName: userName,
      subject: '🔐 Código de recuperación - Gestacks',
      html: this.getPasswordResetTemplate(code, userName),
      text: `Gestacks - Código de recuperación\n\nHola ${userName},\n\nTu código de verificación es: ${code}\n\nEste código expira en 15 minutos.\n\nSi no solicitaste este cambio, ignora este mensaje.`,
    };
    return this.sendWithRetry(mailOptions);
  }

  /**
   * Confirmación de cambio de contraseña.
   */
  async sendPasswordChangeConfirmation(email, userName, metadata = {}) {
    const mailOptions = {
      to: email,
      toName: userName,
      subject: '✅ Contraseña cambiada exitosamente - Gestacks',
      html: this.getPasswordChangeTemplate(userName, metadata),
      text: `CONTRASEÑA CAMBIADA - Gestacks\n\nHola ${userName},\n\nTu contraseña ha sido cambiada exitosamente.\n\nFecha: ${new Date().toLocaleString('es-MX')}\n\nSi no realizaste este cambio, contacta al administrador inmediatamente.`,
    };
    return this.sendWithRetry(mailOptions);
  }

  /**
   * Verificación de cambio de administrador.
   */
  async sendAdminChangeVerification(email, data) {
    const { currentAdminName, newAdminUser, newAdminEmail, verificationUrl, requestId } = data;
    const mailOptions = {
      to: email,
      toName: currentAdminName,
      subject: '⚠️ Confirmación de Cambio de Administrador - Gestacks',
      html: this.getAdminChangeVerificationTemplate(data),
      text: `CONFIRMACIÓN DE CAMBIO DE ADMINISTRADOR - Gestacks\n\nHas solicitado transferir la administración a ${newAdminUser}.\n\nDETALLES:\n- Nuevo administrador: ${newAdminUser}\n- Correo nuevo: ${newAdminEmail}\n- Solicitado por: ${currentAdminName}\n- ID de solicitud: ${requestId}\n\nCONFIRMAR: ${verificationUrl}`,
    };
    return this.sendWithRetry(mailOptions);
  }

  /**
   * Bienvenida al nuevo administrador (post-cambio de admin).
   */
  async sendNewAdminWelcome(email, data) {
    const { newAdminUser, newAdminEmail, currentAdminName, loginUrl } = data;
    const mailOptions = {
      to: email,
      toName: newAdminUser,
      subject: '✅ ¡Eres el nuevo Administrador! - Gestacks',
      html: this.getNewAdminWelcomeTemplate(data),
      text: `¡BIENVENIDO NUEVO ADMINISTRADOR!\n\n${currentAdminName} ha transferido la administración a tu cuenta.\n\nCREDENCIALES:\n- Usuario: ${newAdminUser}\n- Correo: ${newAdminEmail}\n- Contraseña: La que estableciste\n\nINICIAR SESIÓN: ${loginUrl}`,
    };
    return this.sendWithRetry(mailOptions);
  }

  /**
   * Bienvenida post-registro por invitación.
   */
  async sendInvitationWelcome(email, data) {
    const { userName, schoolName, loginUrl } = data;
    const mailOptions = {
      to: email,
      subject: `✅ ¡Bienvenido! Eres el administrador de ${schoolName} - Gestacks`,
      html: this.getInvitationWelcomeTemplate({ userName, schoolName, loginUrl }),
      text: `¡BIENVENIDO ${userName}!\n\nAhora eres el administrador de ${schoolName}.\n\nInicia sesión en: ${loginUrl}`,
    };
    return this.sendWithRetry(mailOptions);
  }

  /**
   * Email al admin cuando se crea un ticket.
   */
  async sendTicketCreatedToAdmin(email, data) {
    const { ticket, user, adminName } = data;
    const mailOptions = {
      to: email,
      toName: adminName,
      subject: `✅ TICKET CREADO: ${ticket.ticketNumber} - ${ticket.subject}`,
      html: this.getTicketAdminTemplate(ticket, user, adminName),
      text: this.getTicketAdminText(ticket, user, adminName),
    };
    return this.sendWithRetry(mailOptions);
  }

  /**
   * Email al usuario cuando se crea un ticket.
   */
  async sendTicketCreatedToUser(email, data) {
    const { ticket, user } = data;
    const mailOptions = {
      to: email,
      toName: user.name || user.email,
      subject: `🚨 NUEVO TICKET RECIBIDO: ${ticket.ticketNumber} - ${ticket.subject}`,
      html: this.getTicketUserTemplate(ticket, user),
      text: this.getTicketUserText(ticket, user),
    };
    return this.sendWithRetry(mailOptions);
  }

  /**
   * Email de prueba.
   */
  async sendTestEmail(email, adminName = 'Administrador') {
    const mailOptions = {
      to: email,
      toName: adminName,
      subject: '🧪 Prueba de Email - Gestacks (Brevo)',
      html: this.getTestEmailTemplate(email, adminName),
      text: `PRUEBA DE EMAIL - Gestacks\n\nHola ${adminName},\n\nEste email prueba que el sistema está configurado correctamente con Brevo.\n\nFecha: ${new Date().toLocaleString('es-MX')}\nProveedor: Brevo API\n\n✅ Configuración correcta`,
    };
    return this.sendWithRetry(mailOptions);
  }

  // ===========================================================================
  // PLANTILLAS HTML
  // ===========================================================================

  /**
   * Plantilla de invitación con token corto visible y destacado.
   */
  getAdminInvitationTemplate({ schoolName, token, schoolId, expiresIn, loginUrl, email }) {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8f9fa;">
        <div style="background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); padding: 40px; text-align: center; border-radius: 15px 15px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Gestacks</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0; font-size: 16px;">Sistema de Gestión Documental</p>
        </div>
        <div style="padding: 40px; background: white; border-radius: 0 0 15px 15px;">
          <h2 style="color: #2d3748; margin: 0 0 10px;">🏫 Invitación de Administración</h2>
          <p style="color: #4a5568; line-height: 1.6;">Has sido invitado a administrar la siguiente institución:</p>
          
          <div style="background: #F5F3FF; padding: 20px; border-radius: 12px; margin: 20px 0; text-align: center;">
            <h2 style="color: #4F46E5; margin: 0;">${schoolName}</h2>
            <p style="color: #6B7280; font-size: 0.85rem; margin: 5px 0 0;">ID: ${schoolId}</p>
          </div>

          <p style="color: #4a5568; line-height: 1.6; margin-bottom: 5px;">
            Tu token de acceso es:
          </p>
          
          <!-- TOKEN DESTACADO -->
          <div style="text-align: center; margin: 25px 0; padding: 30px; background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); border-radius: 12px;">
            <p style="color: rgba(255,255,255,0.8); font-size: 14px; margin: 0 0 10px;">Tu código de acceso</p>
            <div style="color: white; font-size: 42px; font-weight: bold; letter-spacing: 10px; font-family: 'Courier New', monospace; background: rgba(255,255,255,0.15); padding: 15px 25px; border-radius: 8px; display: inline-block;">
              ${token}
            </div>
            <p style="color: rgba(255,255,255,0.8); font-size: 13px; margin: 15px 0 0;">⏰ Válido por ${expiresIn}</p>
          </div>

          <div style="background: #FEF3C7; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #F59E0B;">
            <p style="margin: 0; color: #92400E; font-size: 0.9rem;">
              <strong>📋 ¿Cómo usar este token?</strong><br>
              1. Ve a la página de inicio de sesión (http://gestacks.com/login.html)<br>
              2. Haz clic en <strong>"¿Tienes una invitación? Validar token"</strong><br>
              3. Ingresa el código: <strong>${token}</strong><br>
              4. Completa tu registro como administrador
            </p>
          </div>

          <p style="color: #9ca3af; font-size: 0.8rem; text-align: center;">
            Este correo fue enviado a: ${email}<br>
            Si no solicitaste este acceso, ignora este mensaje.
          </p>
        </div>
      </div>
    `;
  }

  getAdminInvitationText({ schoolName, token, expiresIn, loginUrl, email }) {
    return `INVITACIÓN DE ADMINISTRACIÓN - Gestacks

Has sido invitado a administrar: ${schoolName}

Tu token de acceso: ${token}

INSTRUCCIONES:
1. Ve al login: ${loginUrl}
2. Clic en "¿Tienes una invitación? Validar token"
3. Ingresa el código: ${token}
4. Completa tu registro como administrador

Válido por: ${expiresIn}

Este email fue enviado a: ${email}`;
  }

  getInvitationWelcomeTemplate({ userName, schoolName, loginUrl }) {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #10B981 0%, #059669 100%); padding: 40px; text-align: center; border-radius: 15px 15px 0 0;">
          <h1 style="color: white; margin: 0;">✅ REGISTRO COMPLETADO</h1>
        </div>
        <div style="padding: 40px; background: white; border-radius: 0 0 15px 15px;">
          <h2>¡Bienvenido ${userName}!</h2>
          <p>Ahora eres el administrador de:</p>
          <div style="background: #ECFDF5; padding: 25px; border-radius: 12px; margin: 20px 0; text-align: center;">
            <h1 style="color: #059669; margin: 0;">${schoolName}</h1>
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${loginUrl}" style="display: inline-block; background: #059669; color: white; padding: 18px 40px; text-decoration: none; border-radius: 12px; font-weight: bold;">INICIAR SESIÓN</a>
          </div>
        </div>
      </div>
    `;
  }

  getPasswordResetTemplate(code, userName) {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8f9fa;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Gestacks</h1>
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
            <a href="${this.config.frontendUrl}/login.html" style="display: inline-block; background: #667eea; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px;">Iniciar Sesión</a>
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
    let attachmentsHTML = this.generateAttachmentsHTML(ticket.attachments, 'admin');
    return `
      <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #059669 0%, #047857 100%); padding: 25px; text-align: center; border-radius: 10px 10px 0 0; color: white;">
          <h1 style="margin: 0;">✅ TICKET CREADO EXITOSAMENTE</h1>
          <p style="margin: 5px 0 0;">Sistema de Soporte Gestacks</p>
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
          </div>
          <h3 style="color: #059669;">📝 Descripción:</h3>
          <div style="background: #f0fdf4; padding: 15px; border-radius: 6px;">${ticket.description}</div>
          ${attachmentsHTML}
        </div>
      </div>
    `;
  }

  getTicketUserTemplate(ticket, user) {
    let attachmentsHTML = this.generateAttachmentsHTML(ticket.attachments, 'user');
    return `
      <div style="font-family: Arial, sans-serif; max-width: 650px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); padding: 25px; text-align: center; border-radius: 10px 10px 0 0; color: white;">
          <h1 style="margin: 0;">🚨 NUEVO TICKET RECIBIDO</h1>
          <p style="margin: 5px 0 0;">Sistema de Soporte Gestacks</p>
        </div>
        <div style="padding: 25px; background: white; border-radius: 0 0 10px 10px;">
          <div style="text-align: center;">
            <div style="background: white; color: #dc2626; padding: 12px 24px; border-radius: 8px; font-weight: bold; font-size: 22px; display: inline-block; border: 2px solid #ef4444;">${ticket.ticketNumber}</div>
          </div>
          <h2 style="color: #991b1b; text-align: center;">${ticket.subject}</h2>
          <div style="background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>🏷️ Categoría:</strong> ${ticket.category}</p>
            <p><strong>⚠️ Prioridad:</strong> ${ticket.priority?.toUpperCase()}</p>
            <p><strong>📅 Fecha:</strong> ${new Date().toLocaleString('es-MX')}</p>
          </div>
          <h3 style="color: #991b1b;">📝 Tu descripción:</h3>
          <div style="background: #fef2f2; padding: 15px; border-radius: 6px;">${ticket.description}</div>
          ${attachmentsHTML}
        </div>
      </div>
    `;
  }

  getTestEmailTemplate(email, adminName) {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0;">🧪 Prueba de Email (Brevo)</h1>
        </div>
        <div style="padding: 40px; background: white; border-radius: 0 0 10px 10px;">
          <h2>✅ Email de Prueba Exitoso</h2>
          <p>Hola <strong>${adminName}</strong>, el sistema de email está funcionando correctamente con Brevo.</p>
          <div style="background: #f5f3ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>📅 Fecha:</strong> ${new Date().toLocaleString('es-MX')}</p>
            <p><strong>☁️ Proveedor:</strong> Brevo API</p>
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
    let html = `<h3 style="color: ${colors.text}; margin-top: 25px;">📎 Archivos adjuntos (${attachments.length})</h3><div style="background: ${colors.bg}; padding: 15px; border-radius: 6px;">`;
    attachments.forEach((file) => {
      const fileSizeKB = Math.round(file.size / 1024);
      html += `<div style="margin-bottom: 10px; padding: 10px; background: white; border-radius: 4px;"><span>📄 ${file.originalname} (${fileSizeKB} KB)</span><a href="${file.cloudinary_url}" target="_blank" style="margin-left: 10px; color: ${colors.accent};">Abrir</a></div>`;
    });
    html += '</div>';
    return html;
  }

  getTicketAdminText(ticket, user, adminName) {
    return `TICKET CREADO - Gestacks\n\n✅ NUEVO TICKET\n\nTicket: ${ticket.ticketNumber}\nAsunto: ${ticket.subject}\nCreado por: ${user.name}\nEmail: ${user.email}\nCategoría: ${ticket.category}\nPrioridad: ${ticket.priority}\n\nDescripción:\n${ticket.description}`;
  }

  getTicketUserText(ticket, user) {
    return `NUEVO TICKET RECIBIDO - Gestacks\n\n🚨 TICKET RECIBIDO\n\nTicket: ${ticket.ticketNumber}\nAsunto: ${ticket.subject}\nCategoría: ${ticket.category}\nPrioridad: ${ticket.priority}\n\nDescripción:\n${ticket.description}\n\nVer estado: ${this.config.frontendUrl}/soporte/tickets/${ticket._id}`;
  }

  // ===========================================================================
  // UTILIDADES
  // ===========================================================================

  getStatus() {
    return {
      provider: 'brevo',
      configured: this.initialized,
      config: {
        from: this.config.from,
        fromName: this.config.fromName,
        frontendUrl: this.config.frontendUrl,
        hasApiKey: !!this.apiKey,
      },
      timestamp: new Date().toISOString(),
    };
  }

  async verifyConnection() {
    if (!this.initialized) {
      return { success: false, message: 'BREVO_API_KEY no configurada' };
    }
    try {
      const response = await fetch('https://api.brevo.com/v3/account', {
        method: 'GET',
        headers: { accept: 'application/json', 'api-key': this.apiKey },
      });
      if (response.ok) {
        const data = await response.json();
        return { success: true, message: `Conectado a Brevo - Cuenta: ${data.email}`, account: data.email };
      } else {
        return { success: false, message: 'API Key inválida' };
      }
    } catch (error) {
      return { success: false, message: error.message };
    }
  }
}

const emailService = new EmailService();
export default emailService;
export { EmailService };