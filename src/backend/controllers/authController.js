import User from '../models/User.js';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import AuditService from '../services/auditService.js'; // ✅ IMPORTACIÓN DEL SERVICIO DE AUDITORÍA
import emailService from '../services/emailService.js';

// =============================================================================
// CONFIGURACIÓN DEL TRANSPORTE DE EMAIL - VERSIÓN GMAIL REAL
// =============================================================================

let transporter = null;

// Configuración GMAIL FIJA - SIN ETHEREAL
const emailUser = 'riosnavarretejared@gmail.com';
const emailPass = 'emdkqnupuzzzucnw'; // Tu contraseña de aplicación
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

  transporter.verify(async (error, success) => {
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
// SOLICITAR CÓDIGO DE RECUPERACIÓN - MODIFICADO
// =============================================================================
export const solicitarCodigoRecuperacion = async (req, res) => {
    try {
        console.log('\n📧 ========== SOLICITUD DE RECUPERACIÓN ==========');
        
        const { correo } = req.body;

        if (!correo) {
            return res.status(400).json({
                success: false,
                message: 'Por favor proporciona tu correo electrónico'
            });
        }

        const user = await User.findOne({ correo });

        if (!user) {
            console.log('⚠️ Correo no registrado');
            await AuditService.log(req, {
                action: 'PASSWORD_RESET_REQUEST',
                actionType: 'CREATE',
                actionCategory: 'AUTH',
                targetId: null,
                targetModel: 'User',
                description: `Intento de recuperación para correo no registrado: ${correo}`,
                severity: 'INFO',
                status: 'FAILED',
                metadata: { correo, reason: 'user_not_found' }
            }).catch(err => console.error('❌ Error en auditoría:', err.message));
            
            return res.json({
                success: true,
                message: 'Si el correo existe, recibirás un código de verificación'
            });
        }

        // Generar código y hash
        const codigo = generarCodigoVerificacion();
        const hash = crypto.createHash('sha256').update(codigo).digest('hex');

        // Guardar en BD
        user.resetPasswordToken = hash;
        user.resetPasswordExpires = Date.now() + 15 * 60 * 1000;
        await user.save({ validateBeforeSave: false });

        console.log(`✅ Código generado para: ${user.usuario}`);

        // ========== ENVIAR EMAIL USANDO SERVICIO CENTRALIZADO ==========
        try {
            await emailService.sendPasswordResetCode(user.correo, codigo, user.usuario);
            console.log('✅ Email enviado exitosamente');
            
            await AuditService.log(req, {
                action: 'PASSWORD_RESET_REQUEST',
                actionType: 'CREATE',
                actionCategory: 'AUTH',
                targetId: user._id,
                targetModel: 'User',
                targetName: user.usuario,
                description: `Solicitud de recuperación de contraseña`,
                severity: 'INFO',
                status: 'SUCCESS',
                metadata: { emailEnviado: true }
            }).catch(err => console.error('❌ Error en auditoría:', err.message));
            
            res.json({
                success: true,
                message: '✅ Código de verificación enviado a tu correo',
                correo: user.correo,
                userId: user._id
            });
            
        } catch (emailError) {
            console.error('❌ Error enviando email:', emailError.message);
            
            // Mostrar código en consola como respaldo
            emailService.showCodeInConsole(user.correo, codigo);
            
            await AuditService.log(req, {
                action: 'PASSWORD_RESET_REQUEST',
                actionType: 'CREATE',
                actionCategory: 'AUTH',
                targetId: user._id,
                targetModel: 'User',
                targetName: user.usuario,
                description: `Solicitud de recuperación - Error al enviar email`,
                severity: 'WARNING',
                status: 'PARTIAL',
                metadata: { emailEnviado: false, error: emailError.message }
            }).catch(err => console.error('❌ Error en auditoría:', err.message));
            
            res.json({
                success: true,
                message: '⚠️ Error al enviar email. Usa el código de la consola del servidor.',
                codigo: codigo,
                correo: user.correo,
                userId: user._id
            });
        }
        
    } catch (error) {
        console.error('🔥 ERROR en solicitarCodigoRecuperacion:', error);
        res.status(500).json({
            success: false,
            message: 'Error del servidor al procesar solicitud'
        });
    }
};

// =============================================================================
// VERIFICAR CÓDIGO DE RECUPERACIÓN - VERSIÓN CORREGIDA CON DEBUG
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

    // ===== GENERAR HASH EXACTAMENTE IGUAL QUE EN SOLICITUD =====
    const resetPasswordToken = crypto
      .createHash('sha256')
      .update(codigo)
      .digest('hex');

    console.log(`🔐 Hash calculado: ${resetPasswordToken}`);
    console.log(`🔐 Hash (primeros 20): ${resetPasswordToken.substring(0, 20)}...`);

    // ===== PRIMERO: Buscar usuario SOLO por correo para debug =====
    const userExists = await User.findOne({ correo }).select('+resetPasswordToken +resetPasswordExpires');
    
    if (!userExists) {
      console.log('❌ El correo no existe en la base de datos');
      
      await AuditService.log(req, {
        action: 'PASSWORD_RESET_VERIFY',
        actionType: 'READ',
        actionCategory: 'AUTH',
        targetId: null,
        targetModel: 'User',
        targetName: 'Desconocido',
        description: `Intento fallido de verificación - correo no existe: ${correo}`,
        severity: 'WARNING',
        status: 'FAILED',
        metadata: {
          correo,
          reason: 'user_not_found',
          codigoIngresado: codigo
        }
      }).catch(err => console.error('❌ Error registrando auditoría:', err.message));
      
      return res.status(400).json({
        success: false,
        message: 'Código inválido o expirado'
      });
    }

    console.log('\n🔍 DEBUG - Usuario encontrado por correo:');
    console.log(`   ID: ${userExists._id}`);
    console.log(`   Usuario: ${userExists.usuario}`);
    console.log(`   Correo: ${userExists.correo}`);
    console.log(`   Token en DB: ${userExists.resetPasswordToken ? 'SÍ' : 'NO'}`);
    
    if (userExists.resetPasswordToken) {
      console.log(`   Token DB completo: ${userExists.resetPasswordToken}`);
      console.log(`   Token DB (primeros 20): ${userExists.resetPasswordToken.substring(0, 20)}`);
      console.log(`   Token buscado (primeros 20): ${resetPasswordToken.substring(0, 20)}`);
      console.log(`   ¿Coinciden exactamente? ${userExists.resetPasswordToken === resetPasswordToken ? 'SÍ' : 'NO'}`);
      
      // Comparación carácter por carácter para debug
      if (userExists.resetPasswordToken !== resetPasswordToken) {
        console.log('\n🔍 COMPARACIÓN DETALLADA:');
        for (let i = 0; i < Math.min(userExists.resetPasswordToken.length, resetPasswordToken.length); i++) {
          if (userExists.resetPasswordToken[i] !== resetPasswordToken[i]) {
            console.log(`   Diferencia en posición ${i}: DB='${userExists.resetPasswordToken[i]}' vs Calculado='${resetPasswordToken[i]}'`);
            break;
          }
        }
      }
    }
    
    console.log(`   Expira en DB: ${userExists.resetPasswordExpires}`);
    console.log(`   Expira formato: ${new Date(userExists.resetPasswordExpires).toLocaleString()}`);
    console.log(`   Ahora: ${new Date().toLocaleString()}`);
    console.log(`   Timestamp ahora: ${Date.now()}`);
    console.log(`   ¿No expirado? ${userExists.resetPasswordExpires > Date.now() ? 'SÍ' : 'NO'}`);
    console.log(`   Diferencia: ${userExists.resetPasswordExpires ? (userExists.resetPasswordExpires - Date.now()) / 1000 / 60 : 'N/A'} minutos`);

    // ===== SEGUNDO: Buscar usuario con TODOS los criterios =====
    const user = await User.findOne({
      _id: userExists._id,  // Usar ID explícitamente
      resetPasswordToken: resetPasswordToken,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      console.log('\n❌ Código inválido o expirado (búsqueda por ID+token falló)');
      
      // Determinar razón específica
      let reason = 'unknown';
      if (!userExists.resetPasswordToken) {
        reason = 'no_token_in_db';
      } else if (userExists.resetPasswordToken !== resetPasswordToken) {
        reason = 'token_mismatch';
      } else if (userExists.resetPasswordExpires <= Date.now()) {
        reason = 'expired';
      }
      
      console.log(`   Razón: ${reason}`);
      
      await AuditService.log(req, {
        action: 'PASSWORD_RESET_VERIFY',
        actionType: 'READ',
        actionCategory: 'AUTH',
        targetId: userExists._id,
        targetModel: 'User',
        targetName: userExists.usuario,
        description: `Intento fallido de verificación de código para: ${correo}`,
        severity: 'WARNING',
        status: 'FAILED',
        metadata: {
          correo,
          usuario: userExists.usuario,
          reason: reason,
          codigoIngresado: codigo,
          debug: {
            tokenInDB: !!userExists.resetPasswordToken,
            tokenMatch: userExists.resetPasswordToken === resetPasswordToken,
            expired: userExists.resetPasswordExpires ? userExists.resetPasswordExpires <= Date.now() : null
          }
        }
      }).catch(err => console.error('❌ Error registrando auditoría:', err.message));
      
      return res.status(400).json({
        success: false,
        message: 'Código inválido o expirado'
      });
    }

    console.log('\n✅ CÓDIGO VERIFICADO CORRECTAMENTE');
    console.log(`   Usuario: ${user.usuario}`);
    console.log(`   ID: ${user._id}`);

    // Generar token temporal para cambiar contraseña
    const tokenTemporal = crypto.randomBytes(32).toString('hex');
    const changePasswordToken = crypto
      .createHash('sha256')
      .update(tokenTemporal)
      .digest('hex');
    
    user.changePasswordToken = changePasswordToken;
    user.changePasswordExpires = Date.now() + 30 * 60 * 1000; // 30 minutos
    
    // Limpiar el código de recuperación
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    
    await user.save({ validateBeforeSave: false });

    console.log(`\n✅ Token temporal generado`);
    console.log(`   Token (inicio): ${tokenTemporal.substring(0, 10)}...`);
    console.log(`   Hash guardado: ${changePasswordToken.substring(0, 20)}...`);
    console.log(`   Expira: ${new Date(user.changePasswordExpires).toLocaleTimeString()}`);

    await AuditService.log(req, {
      action: 'PASSWORD_RESET_VERIFY',
      actionType: 'READ',
      actionCategory: 'AUTH',
      targetId: user._id,
      targetModel: 'User',
      targetName: user.usuario,
      description: `Código de recuperación verificado correctamente para: ${user.usuario}`,
      severity: 'INFO',
      status: 'SUCCESS',
      metadata: {
        usuario: user.usuario,
        correo: user.correo,
        tokenExpira: user.changePasswordExpires
      }
    }).catch(err => console.error('❌ Error registrando auditoría:', err.message));

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
    console.error('🔧 Stack:', error.stack);
    
    await AuditService.log(req, {
      action: 'PASSWORD_RESET_VERIFY',
      actionType: 'READ',
      actionCategory: 'AUTH',
      targetId: null,
      targetModel: 'User',
      targetName: 'Error',
      description: `Error en verificación de código: ${error.message}`,
      severity: 'ERROR',
      status: 'FAILED',
      metadata: {
        error: error.message,
        correo: req.body?.correo
      }
    }).catch(err => console.error('❌ Error registrando auditoría:', err.message));
    
    res.status(500).json({
      success: false,
      message: 'Error del servidor al verificar código',
      timestamp: new Date().toISOString()
    });
  }
};

// =============================================================================
// CAMBIAR CONTRASEÑA - MODIFICADO para usar emailService
// =============================================================================
export const cambiarContraseña = async (req, res) => {
    try {
        console.log('\n🔑 ========== CAMBIO DE CONTRASEÑA ==========');

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

        const changePasswordToken = crypto.createHash('sha256').update(token).digest('hex');

        const user = await User.findOne({
            changePasswordToken,
            changePasswordExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'Token inválido o expirado'
            });
        }

        // Actualizar contraseña
        user.password = password;
        user.changePasswordToken = undefined;
        user.changePasswordExpires = undefined;
        user.ultimoAcceso = Date.now();
        await user.save();

        console.log(`✅ Contraseña cambiada para: ${user.usuario}`);

        // ========== ENVIAR EMAIL DE CONFIRMACIÓN ==========
        try {
            await emailService.sendPasswordChangeConfirmation(user.correo, user.usuario, {
                ip: req.ip || req.connection?.remoteAddress
            });
            console.log('✅ Email de confirmación enviado');
        } catch (emailError) {
            console.error('⚠️ Error enviando email de confirmación:', emailError.message);
        }

        await AuditService.log(req, {
            action: 'PASSWORD_CHANGE',
            actionType: 'UPDATE',
            actionCategory: 'AUTH',
            targetId: user._id,
            targetModel: 'User',
            targetName: user.usuario,
            description: `Contraseña cambiada exitosamente`,
            severity: 'WARNING',
            status: 'SUCCESS'
        }).catch(err => console.error('❌ Error en auditoría:', err.message));

        res.json({
            success: true,
            message: '✅ Contraseña cambiada exitosamente',
            usuario: user.usuario
        });

    } catch (error) {
        console.error('🔥 ERROR en cambiarContraseña:', error);
        res.status(500).json({
            success: false,
            message: 'Error del servidor al cambiar contraseña'
        });
    }
};

// =============================================================================
// VERIFICAR CONTRASEÑA ACTUAL - CON AUDITORÍA
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

      // =======================================================================
      // REGISTRAR INTENTO FALLIDO EN AUDITORÍA
      // =======================================================================
      await AuditService.log(req, {
        action: 'PASSWORD_VERIFY',
        actionType: 'READ',
        actionCategory: 'AUTH',
        targetId: user._id,
        targetModel: 'User',
        targetName: user.usuario,
        description: `Intento fallido de verificación de contraseña actual`,
        severity: 'WARNING',
        status: 'FAILED',
        metadata: {
          usuario: user.usuario,
          reason: 'incorrect_password'
        }
      }).catch(err => console.error('❌ Error registrando auditoría:', err.message));

      return res.status(400).json({
        success: false,
        message: 'Contraseña actual incorrecta'
      });
    }

    console.log('✅ Contraseña verificada correctamente');

    // =======================================================================
    // REGISTRAR VERIFICACIÓN EXITOSA EN AUDITORÍA
    // =======================================================================
    await AuditService.log(req, {
      action: 'PASSWORD_VERIFY',
      actionType: 'READ',
      actionCategory: 'AUTH',
      targetId: user._id,
      targetModel: 'User',
      targetName: user.usuario,
      description: `Verificación de contraseña actual exitosa`,
      severity: 'INFO',
      status: 'SUCCESS',
      metadata: {
        usuario: user.usuario
      }
    }).catch(err => console.error('❌ Error registrando auditoría:', err.message));

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

    // =======================================================================
    // REGISTRAR ERROR EN AUDITORÍA
    // =======================================================================
    await AuditService.log(req, {
      action: 'PASSWORD_VERIFY',
      actionType: 'READ',
      actionCategory: 'AUTH',
      targetId: req.user?.id || null,
      targetModel: 'User',
      targetName: 'Error',
      description: `Error al verificar contraseña: ${error.message}`,
      severity: 'ERROR',
      status: 'FAILED',
      metadata: {
        error: error.message
      }
    }).catch(err => console.error('❌ Error registrando auditoría:', err.message));

    res.status(500).json({
      success: false,
      message: 'Error del servidor al verificar contraseña',
      timestamp: new Date().toISOString()
    });
  }
};

// =============================================================================
// VERIFICAR TOKEN DE CAMBIO - CON AUDITORÍA
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

      // =======================================================================
      // REGISTRAR INTENTO FALLIDO EN AUDITORÍA
      // =======================================================================
      await AuditService.log(req, {
        action: 'PASSWORD_RESET_TOKEN_VERIFY',
        actionType: 'READ',
        actionCategory: 'AUTH',
        targetId: null,
        targetModel: 'User',
        targetName: 'Desconocido',
        description: `Intento de verificación de token inválido o expirado`,
        severity: 'WARNING',
        status: 'FAILED',
        metadata: {
          tokenPreview: token.substring(0, 10) + '...'
        }
      }).catch(err => console.error('❌ Error registrando auditoría:', err.message));

      return res.status(400).json({
        success: false,
        message: 'Token inválido o expirado'
      });
    }

    console.log('✅ Token válido');
    console.log(`👤 Usuario: ${user.usuario}`);
    console.log(`📧 Correo: ${user.correo}`);
    console.log(`⏰ Expira a las: ${new Date(user.changePasswordExpires).toLocaleTimeString()}`);

    // =======================================================================
    // REGISTRAR VERIFICACIÓN EXITOSA EN AUDITORÍA
    // =======================================================================
    await AuditService.log(req, {
      action: 'PASSWORD_RESET_TOKEN_VERIFY',
      actionType: 'READ',
      actionCategory: 'AUTH',
      targetId: user._id,
      targetModel: 'User',
      targetName: user.usuario,
      description: `Token de cambio de contraseña verificado correctamente`,
      severity: 'INFO',
      status: 'SUCCESS',
      metadata: {
        usuario: user.usuario,
        correo: user.correo,
        expira: user.changePasswordExpires
      }
    }).catch(err => console.error('❌ Error registrando auditoría:', err.message));

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

    // =======================================================================
    // REGISTRAR ERROR EN AUDITORÍA
    // =======================================================================
    await AuditService.log(req, {
      action: 'PASSWORD_RESET_TOKEN_VERIFY',
      actionType: 'READ',
      actionCategory: 'AUTH',
      targetId: null,
      targetModel: 'User',
      targetName: 'Error',
      description: `Error al verificar token: ${error.message}`,
      severity: 'ERROR',
      status: 'FAILED',
      metadata: {
        error: error.message,
        tokenPreview: req.params?.token?.substring(0, 10)
      }
    }).catch(err => console.error('❌ Error registrando auditoría:', err.message));

    res.status(500).json({
      success: false,
      message: 'Error del servidor al verificar token',
      timestamp: new Date().toISOString()
    });
  }
};

// =============================================================================
// PRUEBA DE EMAIL - MODIFICADO
// =============================================================================
export const pruebaEmail = async (req, res) => {
    try {
        console.log('\n🧪 ========== PRUEBA DE EMAIL ==========');
        
        let emailDestino = req.body.email;
        let nombreAdmin = 'Administrador';

        // Buscar administrador actual si no se especificó email
        if (!emailDestino) {
            const adminActual = await User.findOne({ rol: 'administrador', activo: true });
            if (adminActual) {
                emailDestino = adminActual.correo;
                nombreAdmin = adminActual.usuario;
            } else {
                emailDestino = emailService.config.user;
            }
        }

        // Usar servicio centralizado
        const info = await emailService.sendTestEmail(emailDestino, nombreAdmin);
        
        await AuditService.log(req, {
            action: 'EMAIL_TEST',
            actionType: 'CREATE',
            actionCategory: 'SYSTEM',
            targetId: null,
            targetModel: 'System',
            description: `Prueba de email ejecutada - Destino: ${emailDestino}`,
            severity: 'INFO',
            status: 'SUCCESS'
        }).catch(err => console.error('❌ Error en auditoría:', err.message));

        res.json({
            success: true,
            message: '✅ Email de prueba enviado exitosamente',
            destinatario: { email: emailDestino, nombre: nombreAdmin },
            info: info.simulated ? { simulated: true } : { messageId: info.messageId }
        });
        
    } catch (error) {
        console.error('❌ ERROR en prueba de email:', error);
        res.status(500).json({
            success: false,
            message: '❌ Error al enviar email de prueba',
            error: error.message
        });
    }
};

// =============================================================================
// ESTADO DEL SISTEMA DE EMAIL - MODIFICADO
// =============================================================================
export const estadoEmail = async (req, res) => {
    try {
        const status = emailService.getStatus();
        const verification = await emailService.verifyConnection();
        
        res.json({
            success: true,
            estado: {
                ...status,
                conexion: verification.success ? '✅ CONECTADO' : `❌ ERROR: ${verification.message}`
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al obtener estado',
            error: error.message
        });
    }
};

// =============================================================================
// INICIALIZACIÓN FINAL
// =============================================================================
console.log('\n🚀 ========== SISTEMA CBTIS051 INICIADO ==========');
console.log(`📅 ${new Date().toLocaleString('es-MX')}`);
console.log(`📧 Sistema de email: GMAIL REAL`);
console.log(`👤 Usuario: ${emailUser}`);
console.log(`✅ Listo para enviar correos reales`);
console.log('🚀 ==============================================\n');