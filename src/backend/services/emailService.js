import nodemailer from 'nodemailer';

// Debug: Verificar credenciales de email
console.log('📧 Configuración de Email:');
console.log('   HOST:', process.env.EMAIL_HOST || 'smtp.gmail.com');
console.log('   PORT:', process.env.EMAIL_PORT || 587);
console.log('   USER:', process.env.EMAIL_USER || '❌ NO CONFIGURADO');
console.log('   PASS:', process.env.EMAIL_PASS ? '✅ Configurado (' + process.env.EMAIL_PASS.length + ' caracteres)' : '❌ NO CONFIGURADO');

// Configuración del transporter de Nodemailer
const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: process.env.EMAIL_PORT || 587,
    secure: false, // true para 465, false para otros puertos
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

/**
 * Enviar correo de recuperación de contraseña
 */
export const enviarCorreoRecuperacion = async (correo, token, nombreUsuario) => {
    const resetURL = `${process.env.FRONTEND_URL}/reset-password/${token}`;
    
    const mailOptions = {
        from: `"Sistema CBTIS051" <${process.env.EMAIL_USER}>`,
        to: correo,
        subject: 'Recuperación de Contraseña - CBTIS051',
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                    .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                    .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
                    .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>🔒 Recuperación de Contraseña</h1>
                    </div>
                    <div class="content">
                        <p>Hola <strong>${nombreUsuario}</strong>,</p>
                        <p>Hemos recibido una solicitud para restablecer la contraseña de tu cuenta en el Sistema de Gestión de Documentos CBTIS051.</p>
                        <p>Si realizaste esta solicitud, haz clic en el siguiente botón para crear una nueva contraseña:</p>
                        <center>
                            <a href="${resetURL}" class="button">Restablecer Contraseña</a>
                        </center>
                        <p>O copia y pega este enlace en tu navegador:</p>
                        <p style="background: #fff; padding: 10px; border-radius: 5px; word-break: break-all;">${resetURL}</p>
                        <div class="warning">
                            <strong>⚠️ Importante:</strong> Este enlace expirará en 1 hora por razones de seguridad.
                        </div>
                        <p>Si no solicitaste este cambio, ignora este correo y tu contraseña permanecerá sin cambios.</p>
                    </div>
                    <div class="footer">
                        <p>Este es un correo automático, por favor no respondas a este mensaje.</p>
                        <p>&copy; ${new Date().getFullYear()} CBTIS051 - Sistema de Gestión de Documentos</p>
                    </div>
                </div>
            </body>
            </html>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log('✅ Correo de recuperación enviado a:', correo);
        return { success: true };
    } catch (error) {
        console.error('❌ Error al enviar correo de recuperación:', error.message);
        console.log('🔗 URL de recuperación (copia este link):', resetURL);
        // Siempre devolver success con el resetURL para desarrollo
        return { success: true, resetURL, emailSent: false };
    }
};

/**
 * Enviar correo de verificación para cambio de administrador
 */
export const enviarCorreoCambioAdmin = async (correo, token, nombreUsuario, solicitante) => {
    const confirmURL = `${process.env.FRONTEND_URL}/confirm-admin-change/${token}`;
    
    const mailOptions = {
        from: `"Sistema CBTIS051" <${process.env.EMAIL_USER}>`,
        to: correo,
        subject: '⚠️ Solicitud de Cambio de Administrador - CBTIS051',
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                    .button { display: inline-block; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 10px; }
                    .button-confirm { background: #28a745; color: white; }
                    .button-deny { background: #dc3545; color: white; }
                    .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
                    .alert { background: #f8d7da; border-left: 4px solid #dc3545; padding: 15px; margin: 20px 0; color: #721c24; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>⚠️ Solicitud de Cambio de Administrador</h1>
                    </div>
                    <div class="content">
                        <p>Hola <strong>${nombreUsuario}</strong>,</p>
                        <div class="alert">
                            <strong>🚨 Alerta de Seguridad</strong><br>
                            Se ha solicitado un cambio de administrador en el Sistema de Gestión de Documentos CBTIS051.
                        </div>
                        <p><strong>Detalles de la solicitud:</strong></p>
                        <ul>
                            <li><strong>Solicitante:</strong> ${solicitante || 'No especificado'}</li>
                            <li><strong>Fecha:</strong> ${new Date().toLocaleString('es-MX')}</li>
                            <li><strong>Acción:</strong> Cambio de cuenta de administrador</li>
                        </ul>
                        <p><strong>¿Autorizas este cambio?</strong></p>
                        <p>Si autorizas este cambio, tu cuenta de administrador será eliminada y se permitirá el registro de un nuevo administrador.</p>
                        <center>
                            <a href="${confirmURL}?action=confirm" class="button button-confirm">✅ SÍ, AUTORIZAR CAMBIO</a>
                            <a href="${confirmURL}?action=deny" class="button button-deny">❌ NO, RECHAZAR SOLICITUD</a>
                        </center>
                        <p>O copia y pega este enlace en tu navegador para autorizar:</p>
                        <p style="background: #fff; padding: 10px; border-radius: 5px; word-break: break-all;">${confirmURL}</p>
                        <div class="alert">
                            <strong>⏰ Esta solicitud expirará en 24 horas.</strong><br>
                            Si no realizaste esta solicitud o no autorizas el cambio, simplemente ignora este correo o haz clic en "Rechazar".
                        </div>
                    </div>
                    <div class="footer">
                        <p>Este es un correo automático, por favor no respondas a este mensaje.</p>
                        <p>&copy; ${new Date().getFullYear()} CBTIS051 - Sistema de Gestión de Documentos</p>
                    </div>
                </div>
            </body>
            </html>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log('✅ Correo de cambio de admin enviado a:', correo);
        return { success: true };
    } catch (error) {
        console.error('❌ Error al enviar correo de cambio de admin:', error);
        throw new Error('No se pudo enviar el correo de verificación');
    }
};

/**
 * Enviar correo de bienvenida al nuevo administrador
 */
export const enviarCorreoBienvenida = async (correo, nombreUsuario) => {
    const mailOptions = {
        from: `"Sistema CBTIS051" <${process.env.EMAIL_USER}>`,
        to: correo,
        subject: '🎉 Bienvenido al Sistema CBTIS051',
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                    .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>🎉 ¡Bienvenido!</h1>
                    </div>
                    <div class="content">
                        <p>Hola <strong>${nombreUsuario}</strong>,</p>
                        <p>Tu cuenta de administrador ha sido creada exitosamente en el Sistema de Gestión de Documentos CBTIS051.</p>
                        <p>Ya puedes acceder al sistema con tus credenciales.</p>
                        <p><strong>Recuerda:</strong></p>
                        <ul>
                            <li>Mantén tu contraseña segura</li>
                            <li>No compartas tus credenciales</li>
                            <li>La sesión expirará automáticamente por seguridad</li>
                        </ul>
                    </div>
                    <div class="footer">
                        <p>&copy; ${new Date().getFullYear()} CBTIS051 - Sistema de Gestión de Documentos</p>
                    </div>
                </div>
            </body>
            </html>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log('✅ Correo de bienvenida enviado a:', correo);
    } catch (error) {
        console.error('❌ Error al enviar correo de bienvenida:', error);
    }
};

export default { enviarCorreoRecuperacion, enviarCorreoCambioAdmin, enviarCorreoBienvenida };
