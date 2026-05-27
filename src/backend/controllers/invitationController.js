// src/backend/controllers/invitationController.js
// Controlador para el flujo completo de invitaciones:
//   1. SuperAdmin crea invitación → se envía token por email
//   2. Usuario valida token en login → se redirige a registro
//   3. Usuario completa registro con token validado → se crea admin con schoolId

import Invitation from '../models/Invitation.js';
import User from '../models/User.js';
import emailService from '../services/emailService.js';
import AuditService from '../services/auditService.js';

const DEBUG = true;
function ilog(...args) { if (DEBUG) console.log('📨 [Invitation]', ...args); }
function ierr(...args) { console.error('❌ [Invitation]', ...args); }

// =============================================================================
// 1. SUPERADMIN: Crear y enviar invitación
// =============================================================================

export const createInvitation = async (req, res) => {
  ilog('=== createInvitation ===');
  ilog('Body:', req.body);

  try {
    const { email, schoolName } = req.body;

    // ── Validaciones básicas ──────────────────────────────────────────────────
    if (!email || !schoolName) {
      return res.status(400).json({
        success: false,
        message: 'Email y nombre de la escuela son requeridos',
      });
    }

    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Formato de email inválido',
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanSchoolName = schoolName.trim();

    // ── Verificar que no exista invitación pendiente para este email ──────────
    const existingByEmail = await Invitation.findOne({ email: cleanEmail, status: 'pending' });
    if (existingByEmail) {
      ilog('Ya existe invitación pendiente para:', cleanEmail);
      return res.status(400).json({
        success: false,
        message: 'Ya existe una invitación pendiente para este email',
        expiresAt: existingByEmail.expiresAt,
      });
    }

    // ── Verificar que no exista usuario con ese email ─────────────────────────
    const existingUser = await User.findOne({ correo: cleanEmail });
    if (existingUser) {
      ilog('Usuario ya existe con email:', cleanEmail);
      return res.status(400).json({
        success: false,
        message: 'Ya existe un usuario registrado con ese email',
      });
    }

    // ── Generar token corto (8 chars) y schoolId único ────────────────────────
    let token;
    let tokenExists = true;
    let attempts = 0;

    // Garantizar unicidad del token
    while (tokenExists && attempts < 10) {
      token = Invitation.generateShortToken();
      tokenExists = !!(await Invitation.findOne({ token }));
      attempts++;
    }

    if (tokenExists) {
      ierr('No se pudo generar token único después de 10 intentos');
      return res.status(500).json({
        success: false,
        message: 'Error interno generando token único',
      });
    }

    // Generar schoolId único
    let schoolId = Invitation.generateSchoolId(cleanSchoolName);
    // Verificar que el schoolId no exista
    const existingSchool = await Invitation.findOne({ schoolId });
    if (existingSchool) {
      schoolId = Invitation.generateSchoolId(cleanSchoolName + '-' + Date.now());
    }

    ilog(`Token generado: ${token} | SchoolId: ${schoolId}`);

    // ── Crear invitación en BD ────────────────────────────────────────────────
    const invitation = await Invitation.create({
      email: cleanEmail,
      schoolId,
      schoolName: cleanSchoolName,
      token,
      expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48 horas
      createdBy: 'superadmin',
    });

    ilog('Invitación creada:', invitation._id);

    // ── Enviar email ──────────────────────────────────────────────────────────
    let emailSent = false;
    let emailError = null;

    try {
      await emailService.sendAdminInvitation(cleanEmail, {
        schoolName: cleanSchoolName,
        token,
        schoolId,
        expiresIn: '48 horas',
        frontendUrl: process.env.FRONTEND_URL || 'http://localhost:4000',
      });
      emailSent = true;
      ilog('Email enviado correctamente a:', cleanEmail);
    } catch (err) {
      emailError = err.message;
      ierr('Error enviando email:', err.message);
      // No fallar — el token sigue disponible para mostrarlo en consola
      emailService.showCodeInConsole?.(cleanEmail, token);
    }

    // ── Auditoría ─────────────────────────────────────────────────────────────
    await AuditService.log(req, {
      action: 'INVITATION_CREATED',
      actionType: 'CREATE',
      actionCategory: 'SUPERADMIN',
      targetId: invitation._id,
      targetModel: 'Invitation',
      targetName: cleanSchoolName,
      description: `Invitación creada para ${cleanEmail} - Escuela: ${cleanSchoolName}`,
      severity: 'INFO',
      status: 'SUCCESS',
      metadata: { email: cleanEmail, schoolId, schoolName: cleanSchoolName, emailSent },
    }).catch((err) => ierr('Error en auditoría:', err.message));

    return res.status(201).json({
      success: true,
      message: emailSent
        ? `✅ Invitación enviada a ${cleanEmail}`
        : `⚠️ Invitación creada pero el email falló. Token: ${token}`,
      invitation: {
        id: invitation._id,
        email: cleanEmail,
        schoolName: cleanSchoolName,
        schoolId,
        token: process.env.NODE_ENV === 'development' ? token : '********', // Solo en dev
        expiresAt: invitation.expiresAt,
        status: invitation.status,
        emailSent,
      },
      // En desarrollo mostramos el token por si el email falla
      ...(process.env.NODE_ENV === 'development' && { debugToken: token }),
    });

  } catch (error) {
    ierr('Error en createInvitation:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al crear invitación',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// =============================================================================
// 2. PÚBLICO: Validar token de invitación (paso 1 del registro)
// =============================================================================

export const validateInvitationToken = async (req, res) => {
  ilog('=== validateInvitationToken ===');

  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Token requerido',
      });
    }

    const cleanToken = token.trim().toUpperCase();
    ilog('Token a validar:', cleanToken);

    // ── Buscar invitación ──────────────────────────────────────────────────────
    const invitation = await Invitation.findOne({ token: cleanToken });

    if (!invitation) {
      ilog('Token no encontrado:', cleanToken);
      return res.status(404).json({
        success: false,
        message: 'Token inválido. Verifica que lo hayas copiado correctamente.',
        code: 'TOKEN_NOT_FOUND',
      });
    }

    // ── Verificar estado ──────────────────────────────────────────────────────
    if (invitation.status === 'used') {
      return res.status(400).json({
        success: false,
        message: 'Este token ya fue utilizado para registrar una cuenta.',
        code: 'TOKEN_USED',
      });
    }

    if (invitation.status === 'revoked') {
      return res.status(400).json({
        success: false,
        message: 'Este token ha sido revocado. Solicita una nueva invitación.',
        code: 'TOKEN_REVOKED',
      });
    }

    if (invitation.status === 'expired' || invitation.expiresAt < new Date()) {
      // Marcar como expirado si no lo estaba
      if (invitation.status !== 'expired') {
        invitation.status = 'expired';
        await invitation.save();
      }
      return res.status(400).json({
        success: false,
        message: 'Este token ha expirado. Solicita una nueva invitación.',
        code: 'TOKEN_EXPIRED',
      });
    }

    if (invitation.attempts >= 5) {
      return res.status(429).json({
        success: false,
        message: 'Demasiados intentos fallidos. Token revocado por seguridad.',
        code: 'TOO_MANY_ATTEMPTS',
      });
    }

    ilog('Token válido para escuela:', invitation.schoolName);

    // ── Respuesta exitosa — devolver datos necesarios para el registro ─────────
    return res.json({
      success: true,
      message: '✅ Token válido. Procede a crear tu cuenta de administrador.',
      data: {
        email: invitation.email,
        schoolId: invitation.schoolId,
        schoolName: invitation.schoolName,
        expiresAt: invitation.expiresAt,
        hoursRemaining: invitation.hoursRemaining,
      },
    });

  } catch (error) {
    ierr('Error en validateInvitationToken:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al validar token',
    });
  }
};

// =============================================================================
// 3. PÚBLICO: Registrar administrador con token validado (paso 2 del registro)
// =============================================================================

export const registerWithInvitation = async (req, res) => {
  ilog('=== registerWithInvitation ===');
  ilog('Body (sin password):', { ...req.body, password: req.body.password ? '***' : 'MISSING' });

  try {
    const { token, usuario, password, confirmPassword } = req.body;

    // ── Validaciones de input ─────────────────────────────────────────────────
    if (!token || !usuario || !password) {
      return res.status(400).json({
        success: false,
        message: 'Token, usuario y contraseña son requeridos',
      });
    }

    const cleanToken = token.trim().toUpperCase();
    const cleanUsuario = usuario.trim();

    if (cleanUsuario.length < 3 || cleanUsuario.length > 30) {
      return res.status(400).json({
        success: false,
        message: 'El nombre de usuario debe tener entre 3 y 30 caracteres',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'La contraseña debe tener al menos 6 caracteres',
      });
    }

    if (confirmPassword && password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Las contraseñas no coinciden',
      });
    }

    // ── Re-validar token (seguridad: no confiar solo en el frontend) ──────────
    const invitation = await Invitation.findOne({ token: cleanToken });

    if (!invitation) {
      return res.status(404).json({
        success: false,
        message: 'Token inválido',
        code: 'TOKEN_NOT_FOUND',
      });
    }

    if (!invitation.isValid()) {
      return res.status(400).json({
        success: false,
        message: invitation.status === 'used'
          ? 'Este token ya fue utilizado'
          : invitation.status === 'expired' || invitation.expiresAt < new Date()
            ? 'Este token ha expirado'
            : 'Token inválido o revocado',
        code: `TOKEN_${invitation.status.toUpperCase()}`,
      });
    }

    // ── Verificar unicidad de usuario ─────────────────────────────────────────
const existingByUsername = await User.findOne({ usuario: cleanUsuario });
if (existingByUsername) {
  return res.status(400).json({
    success: false,
    message: 'El nombre de usuario ya está en uso',
    field: 'usuario',
  });
}

// Verificar si el email ya está registrado como admin de ESCUELA
const existingByEmail = await User.findOne({ 
  correo: invitation.email,
  schoolId: { $ne: null } // Solo admins de escuela, no superadmin
});
if (existingByEmail) {
  return res.status(400).json({
    success: false,
    message: 'Ya existe un administrador registrado con este email para otra escuela',
    field: 'correo',
  });
}

    // ── Crear el nuevo administrador ──────────────────────────────────────────
    ilog(`Creando admin: ${cleanUsuario} | email: ${invitation.email} | schoolId: ${invitation.schoolId}`);

    const newAdmin = await User.create({
      usuario: cleanUsuario,
      correo: invitation.email,
      password, // El middleware pre-save hará el hash
      rol: 'administrador',
      activo: true,
      schoolId: invitation.schoolId,
      ultimoAcceso: new Date(),
    });

    ilog('Admin creado con ID:', newAdmin._id);

    // ── Marcar invitación como usada ──────────────────────────────────────────
    invitation.status = 'used';
    invitation.usedAt = new Date();
    invitation.createdUserId = newAdmin._id;
    await invitation.save();

    ilog('Invitación marcada como usada');

    const loginUrl = `${process.env.FRONTEND_URL || 'http://localhost:4000'}/login.html`;

    // ── Email de bienvenida ───────────────────────────────────────────────────
    try {
      await emailService.sendInvitationWelcome(invitation.email, {
        userName: cleanUsuario,
        schoolName: invitation.schoolName,
        loginUrl,
      });
      ilog('Email de bienvenida enviado');
    } catch (emailErr) {
      ierr('Error enviando email de bienvenida (no crítico):', emailErr.message);
    }

    // ── Auditoría ─────────────────────────────────────────────────────────────
    await AuditService.log(req, {
      action: 'ADMIN_REGISTERED_VIA_INVITATION',
      actionType: 'CREATE',
      actionCategory: 'AUTH',
      targetId: newAdmin._id,
      targetModel: 'User',
      targetName: cleanUsuario,
      description: `Nuevo administrador registrado via invitación: ${cleanUsuario} (${invitation.email}) - Escuela: ${invitation.schoolName}`,
      severity: 'INFO',
      status: 'SUCCESS',
      metadata: {
        schoolId: invitation.schoolId,
        schoolName: invitation.schoolName,
        invitationId: invitation._id,
      },
    }).catch((err) => ierr('Error en auditoría:', err.message));

    return res.status(201).json({
      success: true,
      message: '✅ Cuenta de administrador creada exitosamente',
      user: {
        id: newAdmin._id,
        usuario: newAdmin.usuario,
        correo: newAdmin.correo,
        rol: newAdmin.rol,
        schoolId: newAdmin.schoolId,
        schoolName: invitation.schoolName,
      },
      loginUrl,
    });

  } catch (error) {
    ierr('Error en registerWithInvitation:', error);

    // Error de clave duplicada de MongoDB
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern || {})[0];
      return res.status(400).json({
        success: false,
        message: field === 'usuario'
          ? 'El nombre de usuario ya está en uso'
          : field === 'correo'
            ? 'El email ya está registrado'
            : 'Ya existe un registro con esos datos',
        field,
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Error al registrar administrador',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// =============================================================================
// 4. SUPERADMIN: Listar invitaciones
// =============================================================================

export const getInvitations = async (req, res) => {
  ilog('=== getInvitations ===');
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Invitation.countDocuments(filter);
    const invitations = await Invitation.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('createdUserId', 'usuario correo')
      .lean();

    return res.json({
      success: true,
      invitations,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    ierr('Error en getInvitations:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al listar invitaciones',
    });
  }
};

// =============================================================================
// 5. SUPERADMIN: Revocar invitación
// =============================================================================

export const revokeInvitation = async (req, res) => {
  ilog('=== revokeInvitation ===', req.params.id);
  try {
    const { id } = req.params;

    const invitation = await Invitation.findById(id);
    if (!invitation) {
      return res.status(404).json({
        success: false,
        message: 'Invitación no encontrada',
      });
    }

    if (invitation.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Solo se pueden revocar invitaciones pendientes. Estado actual: ${invitation.status}`,
      });
    }

    invitation.status = 'revoked';
    await invitation.save();

    ilog('Invitación revocada:', invitation.token);

    await AuditService.log(req, {
      action: 'INVITATION_REVOKED',
      actionType: 'UPDATE',
      actionCategory: 'SUPERADMIN',
      targetId: invitation._id,
      targetModel: 'Invitation',
      targetName: invitation.schoolName,
      description: `Invitación revocada para ${invitation.email}`,
      severity: 'WARNING',
      status: 'SUCCESS',
    }).catch((err) => ierr('Error en auditoría:', err.message));

    return res.json({
      success: true,
      message: 'Invitación revocada exitosamente',
    });
  } catch (error) {
    ierr('Error en revokeInvitation:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al revocar invitación',
    });
  }
};

// =============================================================================
// 6. SUPERADMIN: Reenviar invitación
// =============================================================================

export const resendInvitation = async (req, res) => {
  ilog('=== resendInvitation ===', req.params.id);
  try {
    const { id } = req.params;

    const invitation = await Invitation.findById(id);
    if (!invitation) {
      return res.status(404).json({
        success: false,
        message: 'Invitación no encontrada',
      });
    }

    if (invitation.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Solo se pueden reenviar invitaciones pendientes',
      });
    }

    // Extender la expiración 48h desde ahora
    invitation.expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
    invitation.attempts = 0; // Resetear intentos
    await invitation.save();

    // Reenviar email
    try {
      await emailService.sendAdminInvitation(invitation.email, {
        schoolName: invitation.schoolName,
        token: invitation.token,
        schoolId: invitation.schoolId,
        expiresIn: '48 horas',
        frontendUrl: process.env.FRONTEND_URL || 'http://localhost:4000',
      });
      ilog('Email reenviado a:', invitation.email);
    } catch (emailErr) {
      ierr('Error reenviando email:', emailErr.message);
      emailService.showCodeInConsole?.(invitation.email, invitation.token);
    }

    return res.json({
      success: true,
      message: `Invitación reenviada a ${invitation.email}`,
      expiresAt: invitation.expiresAt,
    });

  } catch (error) {
    ierr('Error en resendInvitation:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al reenviar invitación',
    });
  }
};