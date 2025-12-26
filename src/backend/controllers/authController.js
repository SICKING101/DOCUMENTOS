import User from '../models/User.js';
import crypto from 'crypto';
import nodemailer from 'nodemailer';

// =============================================================================
// CONFIGURACIÓN DEL TRANSPORTE DE EMAIL - VERSIÓN GMAIL REAL
// =============================================================================

let transporter = null;

// Configuración GMAIL FIJA - SIN ETHEREAL
const emailUser = 'riosnavarretejared@gmail.com';
const emailPass = 'srxjggcnztvspsob'; // Tu contraseña de aplicación
const emailHost = 'smtp.gmail.com';
const emailPort = 587;
const emailFrom = 'riosnavarretejared@gmail.com';

console.log('');
console.log('📧 ========== CONFIGURACIÓN GMAIL REAL ==========');
console.log(`✅ CONFIGURACIÓN FIJA PARA GMAIL:`);
console.log(`   👤 Usuario: ${emailUser}`);
console.log(`   🔑 Contraseña: ${emailPass.length} caracteres (App Password)`);
console.log(`   📧 Host: ${emailHost}:${emailPort}`);
console.log(`   📨 From: ${emailFrom}`);

// VALIDACIÓN DE CONTRASEÑA DE APLICACIÓN
console.log('\n🔍 Validando contraseña de aplicación...');
if (emailPass.length === 16 && !emailPass.includes(' ')) {
  console.log('✅ Contraseña de 16 caracteres - Formato App Password correcto');
} else if (emailPass.includes(' ')) {
  console.log('⚠️  La contraseña tiene espacios - probablemente es App Password');
} else {
  console.log(`⚠️  Contraseña de ${emailPass.length} caracteres - Verifica que sea App Password`);
}

// CONFIGURAR TRANSPORTER GMAIL CON OPCIONES OPTIMIZADAS
try {
  transporter = nodemailer.createTransport({
    host: emailHost,
    port: parseInt(emailPort),
    secure: false, // false para TLS en puerto 587
    auth: {
      user: emailUser,
      pass: emailPass
    },
    // Configuración optimizada para Gmail
    tls: {
      ciphers: 'SSLv3',
      rejectUnauthorized: false
    },
    // Timeouts aumentados
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 10000,
    // Debugging completo
    debug: true,
    logger: true
  });

  console.log('\n✅ TRANSPORTER GMAIL CONFIGURADO');
  console.log('🔧 Opciones:');
  console.log(`   Host: ${transporter.options.host}`);
  console.log(`   Port: ${transporter.options.port}`);
  console.log(`   Secure: ${transporter.options.secure}`);
  console.log(`   TLS: ${transporter.options.tls ? 'Activado' : 'Desactivado'}`);
  
  // VERIFICAR CONEXIÓN CON GMAIL
  console.log('\n🔄 Verificando conexión con Gmail...');
  
  transporter.verify((error, success) => {
    if (error) {
      console.error('❌ ERROR DE CONEXIÓN GMAIL:', error.message);
      console.error(`🔧 Código: ${error.code}`);
      console.error(`🔧 Comando: ${error.command}`);
      
      if (error.response) {
        console.error(`🔧 Respuesta SMTP: ${error.response}`);
      }
      
      // DIAGNÓSTICO ESPECÍFICO GMAIL
      console.error('\n🔍 DIAGNÓSTICO GMAIL:');
      if (error.code === 'EAUTH') {
        console.error('⚠️  ERROR DE AUTENTICACIÓN');
        console.error('   Razones comunes:');
        console.error('   1. Contraseña incorrecta');
        console.error('   2. No es una "Contraseña de aplicación"');
        console.error('   3. Verificación en 2 pasos no activada');
        console.error('   4. "Acceso de apps menos seguras" desactivado');
        console.error('\n   🛠️  SOLUCIÓN:');
        console.error('   1. Ve a: https://myaccount.google.com/security');
        console.error('   2. Activa "Verificación en 2 pasos" (si no está)');
        console.error('   3. Ve a: https://myaccount.google.com/apppasswords');
        console.error('   4. Genera una App Password de 16 caracteres');
        console.error('   5. Úsala en emailPass (línea 12 de este archivo)');
      } else if (error.code === 'ECONNECTION') {
        console.error('⚠️  ERROR DE CONEXIÓN');
        console.error('   Verifica:');
        console.error('   1. Conexión a internet');
        console.error('   2. Puerto 587 no bloqueado por firewall');
        console.error('   3. DNS funcionando correctamente');
      }
      
      console.error('\n📧 El sistema NO enviará emails reales');
      console.error('📧 Los códigos aparecerán solo en consola');
    } else {
      console.log('✅ CONEXIÓN GMAIL VERIFICADA CORRECTAMENTE');
      console.log('✅ Los emails llegarán a Gmail real');
      console.log('✅ Usuario:', emailUser);
      
      // ENVIAR EMAIL DE PRUEBA AUTOMÁTICO
      console.log('\n🧪 Enviando email de prueba automático...');
      
      const testMailOptions = {
        from: `"Sistema CBTIS051" <${emailFrom}>`,
        to: emailUser,
        subject: '✅ Sistema CBTIS051 - Configuración Gmail Correcta',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 10px;">
            <div style="background: white; padding: 30px; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
              <h2 style="color: #2d3748; text-align: center; margin-bottom: 20px;">✅ CONFIGURACIÓN EXITOSA</h2>
              <p style="color: #4a5568; font-size: 16px; line-height: 1.6;">
                El sistema de gestión documental <strong>CBTIS051</strong> ha sido configurado correctamente con Gmail.
              </p>
              <div style="background: #f7fafc; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #4299e1;">
                <p style="margin: 0; color: #2d3748;">
                  <strong>📅 Fecha:</strong> ${new Date().toLocaleString('es-MX')}<br>
                  <strong>📧 Servidor:</strong> smtp.gmail.com:587<br>
                  <strong>✅ Estado:</strong> Operativo
                </p>
              </div>
              <p style="color: #718096; font-size: 14px; text-align: center;">
                Los correos de recuperación de contraseña ahora llegarán a tu bandeja de entrada de Gmail.
              </p>
            </div>
          </div>
        `,
        text: `CONFIGURACIÓN EXITOSA CBTIS051\n\nEl sistema ha sido configurado correctamente con Gmail.\nFecha: ${new Date().toLocaleString('es-MX')}\n\nLos correos de recuperación llegarán a tu bandeja de entrada.`
      };
      
      transporter.sendMail(testMailOptions)
        .then(info => {
          console.log('✅ EMAIL DE PRUEBA ENVIADO A TU GMAIL');
          console.log(`   📨 Para: ${emailUser}`);
          console.log(`   📧 Message ID: ${info.messageId}`);
          console.log(`   📤 Respuesta: ${info.response}`);
          console.log('\n📌 Revisa tu bandeja de entrada de Gmail');
          console.log('📌 También revisa la carpeta de Spam si no lo ves');
        })
        .catch(testError => {
          console.error('⚠️  Error al enviar email de prueba:', testError.message);
        });
    }
  });
  
} catch (error) {
  console.error('❌ ERROR CRÍTICO al configurar Gmail:', error.message);
  console.error('🔧 Stack:', error.stack);
  transporter = null;
}

console.log('\n📧 ===========================================');
console.log('');

// =============================================================================
// FUNCIONES AUXILIARES
// =============================================================================

const generarCodigoVerificacion = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const mostrarCodigoEnConsola = (correo, codigo) => {
  console.log('');
  console.log('═══════════════════════════════════════════════════════');
  console.log('🔑 CÓDIGO DE VERIFICACIÓN (BACKUP - Email falló):');
  console.log(`   📨 Para: ${correo}`);
  console.log(`   🔑 Código: ${codigo}`);
  console.log(`   ⏰ Expira: ${new Date(Date.now() + 15 * 60 * 1000).toLocaleTimeString()}`);
  console.log('═══════════════════════════════════════════════════════');
  console.log('');
};

// =============================================================================
// FUNCIÓN MEJORADA PARA ENVIAR EMAIL CON GMAIL
// =============================================================================
const enviarEmailGmail = async (mailOptions, intentos = 3) => {
  if (!transporter) {
    throw new Error('Gmail no configurado. Transporter no disponible.');
  }

  for (let i = 0; i < intentos; i++) {
    try {
      console.log(`📤 Intento ${i + 1} de ${intentos} enviando a Gmail...`);
      const info = await transporter.sendMail(mailOptions);
      console.log(`✅ Email enviado a Gmail en intento ${i + 1}`);
      return info;
    } catch (error) {
      console.error(`❌ Intento ${i + 1} falló:`, error.message);
      
      // Si es el último intento, lanza el error
      if (i === intentos - 1) {
        console.error('🔥 TODOS los intentos fallaron');
        throw error;
      }
      
      // Esperar 2 segundos antes de reintentar
      console.log(`⏳ Esperando 2 segundos antes de reintentar...`);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
};

// =============================================================================
// SOLICITAR CÓDIGO DE RECUPERACIÓN - VERSIÓN GMAIL REAL
// =============================================================================
export const solicitarCodigoRecuperacion = async (req, res) => {
  try {
    console.log('');
    console.log('📧 ========== SOLICITUD DE RECUPERACIÓN ==========');
    console.log(`📅 Hora: ${new Date().toLocaleString('es-MX')}`);
    console.log(`🔧 Usando: ${emailHost} (Gmail Real)`);
    
    const { correo } = req.body;

    if (!correo) {
      return res.status(400).json({
        success: false,
        message: 'Por favor proporciona tu correo electrónico'
      });
    }

    console.log(`📨 Correo solicitado: ${correo}`);

    // Buscar usuario
    const user = await User.findOne({ correo });

    // Por seguridad, siempre devolvemos éxito aunque el correo no exista
    if (!user) {
      console.log('⚠️  Correo no registrado en el sistema');
      console.log('📧 Se devuelve éxito por seguridad (sin enviar email)');
      return res.json({
        success: true,
        message: 'Si el correo existe, recibirás un código de verificación'
      });
    }

    console.log(`✅ Usuario encontrado: ${user.usuario}`);
    console.log(`🆔 ID: ${user._id}`);

    // Generar código de 6 dígitos
    const codigo = generarCodigoVerificacion();
    
    console.log(`🔑 Código generado: ${codigo}`);

    // Guardar código hasheado y fecha de expiración
    user.resetPasswordToken = crypto
      .createHash('sha256')
      .update(codigo)
      .digest('hex');
    
    user.resetPasswordExpires = Date.now() + 15 * 60 * 1000; // 15 minutos
    await user.save({ validateBeforeSave: false });

    console.log(`💾 Código guardado en base de datos`);
    console.log(`⏰ Expira a las: ${new Date(user.resetPasswordExpires).toLocaleTimeString()}`);

    // PREPARAR EMAIL PARA GMAIL
    const mailOptions = {
      from: `"Sistema CBTIS051" <${emailFrom}>`,
      to: user.correo,
      subject: 'Código de recuperación - Sistema CBTIS051',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8f9fa;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">CBTIS051</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0; font-size: 16px;">Sistema de Gestión Documental</p>
          </div>
          
          <div style="padding: 40px; border-radius: 0 0 10px 10px; background: white;">
            <h2 style="color: #2d3748; margin: 0 0 20px; font-size: 24px; font-weight: 600;">Recuperación de Contraseña</h2>
            <p style="color: #4a5568; line-height: 1.6; margin: 0 0 25px; font-size: 16px;">
              Hola <strong style="color: #2d3748;">${user.usuario}</strong>,<br>
              Hemos recibido una solicitud para restablecer tu contraseña en el sistema.
              Utiliza el siguiente código de verificación:
            </p>
            
            <div style="text-align: center; margin: 35px 0; padding: 25px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; box-shadow: 0 8px 25px rgba(102, 126, 234, 0.3);">
              <div style="color: white; font-size: 36px; font-weight: bold; letter-spacing: 8px; padding: 10px; font-family: 'Courier New', monospace;">
                ${codigo}
              </div>
              <p style="color: rgba(255,255,255,0.9); margin: 15px 0 0; font-size: 14px;">Código de verificación</p>
            </div>
            
            <p style="color: #718096; line-height: 1.6; margin: 25px 0; font-size: 15px; padding: 15px; background: #f7fafc; border-radius: 8px; border-left: 4px solid #e53e3e;">
              <strong>⚠️ Importante:</strong> Este código expirará en <strong>15 minutos</strong>.<br>
              Si no solicitaste este cambio, puedes ignorar este correo.
            </p>
            
            <div style="margin-top: 40px; padding-top: 25px; border-top: 1px solid #e2e8f0; text-align: center;">
              <p style="color: #a0aec0; font-size: 13px; margin: 5px 0;">
                Este es un mensaje automático, por favor no respondas a este correo.
              </p>
              <p style="color: #a0aec0; font-size: 13px; margin: 5px 0;">
                © ${new Date().getFullYear()} CBTIS051 - Sistema de Gestión Documental
              </p>
            </div>
          </div>
        </div>
      `,
      text: `CBTIS051 - Código de recuperación\n\nHola ${user.usuario},\n\nTu código de verificación es: ${codigo}\n\nEste código expira en 15 minutos.\n\nSi no solicitaste este cambio, ignora este mensaje.\n\nSistema de Gestión Documental CBTIS051`
    };

    // INTENTAR ENVIAR EL CORREO CON GMAIL
    console.log('\n📤 ENVIANDO A GMAIL REAL...');
    console.log(`   📨 De: ${mailOptions.from}`);
    console.log(`   📨 Para: ${mailOptions.to}`);
    console.log(`   📧 Asunto: ${mailOptions.subject}`);
    console.log(`   🔑 Código: ${codigo} (no se muestra al usuario)`);

    try {
      const info = await enviarEmailGmail(mailOptions);
      
      console.log('\n✅✅✅ EMAIL ENVIADO A GMAIL REAL ✅✅✅');
      console.log(`   📨 Destinatario: ${user.correo}`);
      console.log(`   📧 Message ID: ${info.messageId}`);
      console.log(`   📤 Respuesta SMTP: ${info.response}`);
      console.log(`   ✅ Aceptado por: ${info.accepted}`);
      console.log(`   📍 Rechazado: ${info.rejected.length > 0 ? info.rejected : 'Ninguno'}`);
      
      console.log('\n📌 INSTRUCCIONES PARA EL USUARIO:');
      console.log('   1. Revisa tu bandeja de entrada de Gmail');
      console.log('   2. Busca el asunto: "Código de recuperación - Sistema CBTIS051"');
      console.log('   3. Si no está en principal, revisa SPAM/Promociones');
      console.log('   4. El código es de 6 dígitos numéricos');
      console.log('   5. Expira en 15 minutos');
      
      res.json({
        success: true,
        message: '✅ Código de verificación enviado a tu correo Gmail',
        correo: user.correo,
        userId: user._id,
        timestamp: new Date().toISOString()
      });
      
    } catch (emailError) {
      console.error('\n❌❌❌ ERROR AL ENVIAR A GMAIL ❌❌❌');
      console.error(`   📨 Para: ${user.correo}`);
      console.error(`   📧 Error: ${emailError.message}`);
      console.error(`   🔧 Código: ${emailError.code}`);
      
      if (emailError.response) {
        console.error(`   🔧 Respuesta: ${emailError.response}`);
      }
      
      // MOSTRAR CÓDIGO EN CONSOLA COMO BACKUP
      mostrarCodigoEnConsola(user.correo, codigo);
      
      console.log('\n📌 USANDO MODO DE EMERGENCIA:');
      console.log('   El código se muestra arriba ↑↑↑');
      console.log('   El usuario debe usar ese código');
      
      res.json({
        success: true,
        message: '⚠️ Error temporal al enviar email. Usa el código de la consola del servidor.',
        codigo: codigo, // Enviamos el código directamente (solo para desarrollo)
        correo: user.correo,
        userId: user._id,
        debug: process.env.NODE_ENV === 'development' ? emailError.message : undefined,
        timestamp: new Date().toISOString()
      });
    }
    
    console.log('\n📧 ========== FIN SOLICITUD ==========');
    console.log('');
    
  } catch (error) {
    console.error('🔥 ERROR en solicitarCodigoRecuperacion:', error.message);
    console.error('🔧 Stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Error del servidor al procesar solicitud',
      timestamp: new Date().toISOString()
    });
  }
};

// =============================================================================
// VERIFICAR CÓDIGO DE RECUPERACIÓN
// =============================================================================
export const verificarCodigoRecuperacion = async (req, res) => {
  try {
    console.log('');
    console.log('🔐 ========== VERIFICACIÓN DE CÓDIGO ==========');
    console.log(`📅 Hora: ${new Date().toLocaleString('es-MX')}`);
    
    const { correo, codigo } = req.body;

    if (!correo || !codigo) {
      return res.status(400).json({
        success: false,
        message: 'Correo y código son requeridos'
      });
    }

    console.log(`📨 Verificando para: ${correo}`);
    console.log(`🔑 Código recibido: ${codigo}`);

    // Hash del código ingresado
    const resetPasswordToken = crypto
      .createHash('sha256')
      .update(codigo)
      .digest('hex');

    console.log(`🔐 Hash calculado: ${resetPasswordToken.substring(0, 20)}...`);

    // Buscar usuario con código válido y no expirado
    const user = await User.findOne({
      correo,
      resetPasswordToken,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      console.log('❌ Código inválido o expirado');
      
      // Debug adicional
      const userExiste = await User.findOne({ correo });
      if (!userExiste) {
        console.log('🔍 El correo no existe en la base de datos');
      } else {
        console.log(`🔍 Usuario existe: ${userExiste.usuario}`);
        console.log(`🔍 Token en DB: ${userExiste.resetPasswordToken ? 'Sí' : 'No'}`);
        if (userExiste.resetPasswordExpires) {
          console.log(`🔍 Expira: ${new Date(userExiste.resetPasswordExpires).toLocaleString()}`);
          console.log(`🔍 Ahora: ${new Date().toLocaleString()}`);
          console.log(`🔍 Válido: ${userExiste.resetPasswordExpires > Date.now() ? 'Sí' : 'No (expirado)'}`);
        }
      }
      
      return res.status(400).json({
        success: false,
        message: 'Código inválido o expirado'
      });
    }

    console.log('✅ Código verificado correctamente');
    console.log(`👤 Usuario: ${user.usuario}`);

    // Generar token temporal para cambiar contraseña
    const tokenTemporal = crypto.randomBytes(32).toString('hex');
    user.changePasswordToken = crypto
      .createHash('sha256')
      .update(tokenTemporal)
      .digest('hex');
    
    user.changePasswordExpires = Date.now() + 30 * 60 * 1000; // 30 minutos
    
    // Limpiar el código de recuperación
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    
    await user.save({ validateBeforeSave: false });

    console.log(`✅ Token temporal generado`);
    console.log(`🔐 Token (inicio): ${tokenTemporal.substring(0, 10)}...`);
    console.log(`⏰ Expira a las: ${new Date(user.changePasswordExpires).toLocaleTimeString()}`);

    res.json({
      success: true,
      message: '✅ Código verificado correctamente',
      token: tokenTemporal,
      userId: user._id,
      usuario: user.usuario,
      timestamp: new Date().toISOString()
    });
    
    console.log('\n🔐 ========== FIN VERIFICACIÓN ==========');
    console.log('');
    
  } catch (error) {
    console.error('🔥 ERROR en verificarCodigoRecuperacion:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error del servidor al verificar código',
      timestamp: new Date().toISOString()
    });
  }
};

// =============================================================================
// CAMBIAR CONTRASEÑA
// =============================================================================
export const cambiarContraseña = async (req, res) => {
  try {
    console.log('');
    console.log('🔑 ========== CAMBIO DE CONTRASEÑA ==========');
    console.log(`📅 Hora: ${new Date().toLocaleString('es-MX')}`);
    
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({
        success: false,
        message: 'Token y nueva contraseña son requeridos'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'La contraseña debe tener al menos 6 caracteres'
      });
    }

    console.log(`🔑 Token recibido: ${token.substring(0, 10)}...`);
    console.log(`🔐 Nueva contraseña: ${'*'.repeat(password.length)} (${password.length} chars)`);

    // Hash del token
    const changePasswordToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    console.log(`🔐 Hash del token: ${changePasswordToken.substring(0, 20)}...`);

    // Buscar usuario con token válido
    const user = await User.findOne({
      changePasswordToken,
      changePasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      console.log('❌ Token inválido o expirado');
      return res.status(400).json({
        success: false,
        message: 'Token inválido o expirado'
      });
    }

    console.log(`✅ Usuario encontrado: ${user.usuario}`);
    console.log(`📧 Correo: ${user.correo}`);

    // Actualizar contraseña
    user.password = password;
    user.changePasswordToken = undefined;
    user.changePasswordExpires = undefined;
    user.ultimoAcceso = Date.now();
    
    await user.save();

    console.log(`✅ Contraseña cambiada exitosamente`);

    // ENVIAR CORREO DE CONFIRMACIÓN POR GMAIL
    if (transporter) {
      try {
        const mailOptions = {
          from: `"Sistema CBTIS051" <${emailFrom}>`,
          to: user.correo,
          subject: '✅ Contraseña cambiada exitosamente - CBTIS051',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8f9fa;">
              <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                <h1 style="color: white; margin: 0; font-size: 28px;">✅ Contraseña Actualizada</h1>
                <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0; font-size: 16px;">Sistema de Gestión Documental</p>
              </div>
              
              <div style="padding: 40px; border-radius: 0 0 10px 10px; background: white;">
                <h2 style="color: #2d3748; margin: 0 0 20px; font-size: 24px; font-weight: 600;">Hola ${user.usuario},</h2>
                <p style="color: #4a5568; line-height: 1.6; margin: 0 0 25px; font-size: 16px;">
                  Tu contraseña ha sido cambiada exitosamente en el sistema de gestión documental CBTIS051.<br>
                  Si no realizaste este cambio, por favor contacta al administrador del sistema inmediatamente.
                </p>
                
                <div style="margin: 30px 0; padding: 20px; background: #f0fdf4; border-radius: 8px; border-left: 4px solid #10b981;">
                  <p style="margin: 0; color: #065f46; font-size: 15px;">
                    <strong>📅 Fecha del cambio:</strong> ${new Date().toLocaleString('es-MX')}<br>
                    <strong>👤 Usuario:</strong> ${user.usuario}<br>
                    <strong>📧 Correo:</strong> ${user.correo}<br>
                    <strong>🖥️ IP aproximada:</strong> ${req.ip || 'No disponible'}
                  </p>
                </div>
                
                <div style="text-align: center; margin-top: 30px;">
                  <a href="${process.env.FRONTEND_URL || 'http://localhost:4000'}/login" 
                     style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                            color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; 
                            font-weight: 600; font-size: 16px; transition: all 0.3s;"
                     onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 10px 25px rgba(102, 126, 234, 0.4)';"
                     onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none';">
                    🚀 Iniciar Sesión
                  </a>
                </div>
                
                <div style="margin-top: 30px; padding: 15px; background: #fefce8; border-radius: 6px; border-left: 4px solid #f59e0b;">
                  <p style="margin: 0; color: #92400e; font-size: 14px;">
                    <strong>🔒 Seguridad:</strong> Si no reconoces este cambio, contacta inmediatamente al administrador.
                  </p>
                </div>
              </div>
            </div>
          `,
          text: `CONTRASEÑA CAMBIADA - CBTIS051\n\nHola ${user.usuario},\n\nTu contraseña ha sido cambiada exitosamente.\n\nFecha: ${new Date().toLocaleString('es-MX')}\nUsuario: ${user.usuario}\nCorreo: ${user.correo}\n\nSi no realizaste este cambio, contacta al administrador inmediatamente.\n\nAccede al sistema: ${process.env.FRONTEND_URL || 'http://localhost:4000'}/login`
        };

        await enviarEmailGmail(mailOptions);
        console.log(`📧 Email de confirmación enviado a Gmail: ${user.correo}`);
      } catch (emailError) {
        console.error('⚠️  Error al enviar email de confirmación:', emailError.message);
        console.log('📌 El cambio de contraseña fue exitoso, pero no se pudo notificar por email');
      }
    } else {
      console.log('📧 Transporter no disponible - No se envía email de confirmación');
    }

    res.json({
      success: true,
      message: '✅ Contraseña cambiada exitosamente',
      usuario: user.usuario,
      timestamp: new Date().toISOString()
    });
    
    console.log('\n🔑 ========== FIN CAMBIO ==========');
    console.log('');
    
  } catch (error) {
    console.error('🔥 ERROR en cambiarContraseña:', error.message);
    console.error('🔧 Stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Error del servidor al cambiar contraseña',
      timestamp: new Date().toISOString()
    });
  }
};

// =============================================================================
// VERIFICAR CONTRASEÑA ACTUAL
// =============================================================================

export const verifyPassword = async (req, res) => {
    try {
        console.log('🔐 ========== VERIFICACIÓN DE CONTRASEÑA ==========');
        console.log('📅 Hora:', new Date().toLocaleString('es-MX'));
        
        const { password } = req.body;
        const userId = req.user.id;
        
        console.log('👤 Usuario ID:', userId);
        console.log('🔑 Contraseña recibida:', password ? '***' + password.slice(-2) : 'No proporcionada');

        if (!password) {
            console.log('❌ No se proporcionó contraseña');
            return res.status(400).json({
                success: false,
                message: 'La contraseña es requerida'
            });
        }

        // Buscar usuario
        const user = await User.findById(userId);
        
        if (!user) {
            console.log('❌ Usuario no encontrado');
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }
        
        console.log('✅ Usuario encontrado:', user.usuario);
        
        // Verificar contraseña
        const isValid = await user.compararPassword(password);
        
        if (!isValid) {
            console.log('❌ Contraseña incorrecta');
            return res.status(400).json({
                success: false,
                message: 'Contraseña actual incorrecta'
            });
        }
        
        console.log('✅ Contraseña verificada correctamente');
        console.log('🔐 ========== FIN VERIFICACIÓN ==========\n');
        
        res.json({
            success: true,
            message: 'Contraseña verificada correctamente',
            usuario: user.usuario,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('🔥 ERROR en verifyPassword:', error.message);
        console.error('🔧 Stack:', error.stack);
        res.status(500).json({
            success: false,
            message: 'Error del servidor al verificar contraseña',
            timestamp: new Date().toISOString()
        });
    }
};

// =============================================================================
// VERIFICAR TOKEN DE CAMBIO
// =============================================================================
export const verificarTokenCambio = async (req, res) => {
  try {
    console.log('');
    console.log('🔐 ========== VERIFICACIÓN DE TOKEN ==========');
    console.log(`📅 Hora: ${new Date().toLocaleString('es-MX')}`);
    
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Token requerido'
      });
    }

    console.log(`🔑 Token recibido: ${token.substring(0, 10)}...`);

    // Hash del token
    const changePasswordToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    console.log(`🔐 Hash calculado: ${changePasswordToken.substring(0, 20)}...`);

    // Buscar usuario con token válido
    const user = await User.findOne({
      changePasswordToken,
      changePasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      console.log('❌ Token inválido o expirado');
      return res.status(400).json({
        success: false,
        message: 'Token inválido o expirado'
      });
    }

    console.log('✅ Token válido');
    console.log(`👤 Usuario: ${user.usuario}`);
    console.log(`📧 Correo: ${user.correo}`);
    console.log(`⏰ Expira a las: ${new Date(user.changePasswordExpires).toLocaleTimeString()}`);

    res.json({
      success: true,
      message: 'Token válido',
      userId: user._id,
      usuario: user.usuario,
      correo: user.correo,
      expira: user.changePasswordExpires,
      timestamp: new Date().toISOString()
    });
    
    console.log('\n🔐 ========== FIN VERIFICACIÓN ==========');
    console.log('');
    
  } catch (error) {
    console.error('🔥 ERROR en verificarTokenCambio:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error del servidor al verificar token',
      timestamp: new Date().toISOString()
    });
  }
};

// =============================================================================
// ENDPOINT DE PRUEBA DE EMAIL - GMAIL REAL
// =============================================================================
export const pruebaEmail = async (req, res) => {
  try {
    console.log('');
    console.log('🧪 ========== PRUEBA GMAIL REAL ==========');
    console.log(`📅 Hora: ${new Date().toLocaleString('es-MX')}`);
    
    if (!transporter) {
      console.log('❌ Transporter Gmail no configurado');
      return res.status(400).json({
        success: false,
        message: 'Gmail no configurado',
        config: {
          emailUser: emailUser,
          emailHost: emailHost,
          emailPort: emailPort,
          transporter: !!transporter
        }
      });
    }

    const testEmail = req.body.email || emailUser;
    
    console.log(`📧 Enviando prueba a: ${testEmail}`);
    console.log(`🔧 Desde: ${emailFrom}`);
    console.log(`🔧 Usando: ${emailHost}:${emailPort}`);
    
    const mailOptions = {
      from: `"Sistema CBTIS051" <${emailFrom}>`,
      to: testEmail,
      subject: '🧪 Prueba de Email Gmail Real - CBTIS051',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8f9fa;">
          <div style="background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">CBTIS051</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0; font-size: 16px;">🧪 Prueba de Sistema de Email REAL</p>
          </div>
          
          <div style="padding: 40px; border-radius: 0 0 10px 10px; background: white;">
            <h2 style="color: #2d3748; margin: 0 0 20px; font-size: 24px; font-weight: 600;">✅ Email de Prueba Exitoso</h2>
            <p style="color: #4a5568; line-height: 1.6; margin: 0 0 25px; font-size: 16px;">
              Si estás recibiendo este email, significa que la configuración del sistema de correo electrónico <strong>GMAIL REAL</strong> está funcionando correctamente.
            </p>
            
            <div style="margin: 30px 0; padding: 20px; background: #f5f3ff; border-radius: 8px; border-left: 4px solid #8b5cf6;">
              <p style="margin: 0; color: #5b21b6; font-size: 15px;">
                <strong>📅 Fecha:</strong> ${new Date().toLocaleString('es-MX')}<br>
                <strong>🏢 Sistema:</strong> Gestión Documental CBTIS051<br>
                <strong>✅ Estado:</strong> Configuración correcta<br>
                <strong>📧 Servidor:</strong> ${emailHost}:${emailPort}<br>
                <strong>👤 Usuario:</strong> ${emailUser}<br>
                <strong>🎯 Destino:</strong> ${testEmail}
              </p>
            </div>
            
            <div style="background: #dbeafe; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #3b82f6;">
              <p style="margin: 0; color: #1e40af; font-size: 14px;">
                <strong>📌 Nota:</strong> Este email fue enviado usando Gmail real, no Ethereal.<br>
                Los correos de recuperación de contraseña llegarán a tu bandeja de entrada real.
              </p>
            </div>
          </div>
        </div>
      `,
      text: `PRUEBA GMAIL REAL - CBTIS051\n\nEste email prueba que el sistema está configurado con Gmail real.\n\nFecha: ${new Date().toLocaleString('es-MX')}\nServidor: ${emailHost}:${emailPort}\nUsuario: ${emailUser}\nDestino: ${testEmail}\n\n✅ Configuración correcta - Los correos de recuperación funcionarán.`
    };

    console.log('\n📤 Enviando email de prueba por Gmail...');
    const info = await transporter.sendMail(mailOptions);
    
    console.log('\n✅✅✅ PRUEBA GMAIL EXITOSA ✅✅✅');
    console.log(`   📨 Para: ${testEmail}`);
    console.log(`   📧 Message ID: ${info.messageId}`);
    console.log(`   📤 Respuesta: ${info.response}`);
    console.log(`   ✅ Aceptado: ${info.accepted}`);
    console.log(`   📍 Rechazado: ${info.rejected.length > 0 ? info.rejected : 'Ninguno'}`);
    
    console.log('\n📌 INSTRUCCIONES:');
    console.log('   1. Revisa tu bandeja de entrada de Gmail');
    console.log('   2. Busca el asunto: "🧪 Prueba de Email Gmail Real - CBTIS051"');
    console.log('   3. Si no lo ves, revisa SPAM o Promociones');
    console.log('   4. El sistema está listo para enviar correos reales');
    
    console.log('\n🧪 ========== FIN PRUEBA ==========');
    console.log('');

    res.json({
      success: true,
      message: '✅ Email de prueba enviado exitosamente por Gmail real',
      messageId: info.messageId,
      to: testEmail,
      response: info.response,
      accepted: info.accepted,
      timestamp: new Date().toISOString(),
      note: 'Revisa tu bandeja de entrada de Gmail. Si no lo ves, revisa SPAM.'
    });
  } catch (error) {
    console.error('\n❌ ERROR en prueba de Gmail:');
    console.error(`   📧 Para: ${testEmail}`);
    console.error(`   🔧 Error: ${error.message}`);
    console.error(`   🔧 Código: ${error.code}`);
    console.error(`   🔧 Respuesta: ${error.response}`);
    
    res.status(500).json({
      success: false,
      message: '❌ Error al enviar email de prueba por Gmail',
      error: error.message,
      code: error.code,
      response: error.response,
      timestamp: new Date().toISOString()
    });
  }
};

// =============================================================================
// FUNCIÓN PARA REINICIAR CONFIGURACIÓN GMAIL
// =============================================================================
export const reiniciarConfiguracionGmail = async () => {
  console.log('\n🔄 ========== REINICIANDO CONFIGURACIÓN GMAIL ==========');
  
  try {
    // Crear nuevo transporter
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
      debug: true,
      logger: true
    });
    
    // Verificar
    await transporter.verify();
    console.log('✅ Configuración Gmail reiniciada correctamente');
    return true;
  } catch (error) {
    console.error('❌ Error al reiniciar Gmail:', error.message);
    return false;
  }
};

// =============================================================================
// ESTADO DEL SISTEMA DE EMAIL
// =============================================================================
export const estadoEmail = async (req, res) => {
  try {
    console.log('');
    console.log('📊 ========== ESTADO GMAIL ==========');
    
    const estado = {
      configuracion: {
        emailUser: emailUser,
        emailHost: emailHost,
        emailPort: emailPort,
        emailFrom: emailFrom,
        passLength: emailPass.length,
        passType: emailPass.length === 16 ? 'App Password (probable)' : 'Otro formato'
      },
      transporter: {
        configurado: !!transporter,
        host: transporter ? transporter.options.host : null,
        port: transporter ? transporter.options.port : null,
        secure: transporter ? transporter.options.secure : null
      },
      sistema: {
        hora: new Date().toLocaleString('es-MX'),
        nodeEnv: process.env.NODE_ENV || 'development',
        timestamp: Date.now()
      }
    };
    
    console.log('📊 Estado actual:');
    console.log(`   ✅ Configurado: ${estado.transporter.configurado ? 'Sí' : 'No'}`);
    console.log(`   📧 Usuario: ${estado.configuracion.emailUser}`);
    console.log(`   🔑 Contraseña: ${estado.configuracion.passLength} caracteres`);
    console.log(`   🖥️  Host: ${estado.configuracion.emailHost}:${estado.configuracion.emailPort}`);
    
    // Intentar verificar conexión si hay transporter
    if (transporter) {
      try {
        await transporter.verify();
        estado.conexion = '✅ CONECTADO A GMAIL';
        console.log('   🔗 Conexión: ✅ CONECTADO A GMAIL');
      } catch (error) {
        estado.conexion = `❌ ERROR: ${error.message}`;
        console.log(`   🔗 Conexión: ❌ ERROR: ${error.message}`);
      }
    } else {
      estado.conexion = '❌ TRANSPORTER NO CONFIGURADO';
      console.log('   🔗 Conexión: ❌ NO CONFIGURADO');
    }
    
    console.log('\n📊 ====================================');
    console.log('');
    
    res.json({
      success: true,
      estado,
      mensaje: 'Estado del sistema de email Gmail',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ ERROR en estadoEmail:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener estado',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

export { transporter };

console.log('✅ Transporter exportado para uso en otros controladores');

// =============================================================================
// INICIALIZACIÓN FINAL
// =============================================================================
console.log('\n🚀 ========== SISTEMA CBTIS051 INICIADO ==========');
console.log(`📅 ${new Date().toLocaleString('es-MX')}`);
console.log(`📧 Sistema de email: GMAIL REAL`);
console.log(`👤 Usuario: ${emailUser}`);
console.log(`✅ Listo para enviar correos reales`);
console.log('🚀 ==============================================\n');