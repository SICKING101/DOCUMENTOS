// src/backend/routes/superAdminRoutes.js
// Rutas exclusivas del Super Administrador.
// SOLO para operaciones que requieren privilegios de superadmin.

import express from 'express';
import jwt from 'jsonwebtoken';
import {
  loginSuperAdmin,
  protegerSuperAdmin,
  setSuperAdminCookie,
} from '../middleware/superAdminAuth.js';
import {
  createVersion,
  updateVersion,
  deleteVersion,
  setCurrentVersion,
} from '../controllers/versionController.js';
import {
  closeSystem,
  openSystem,
  getSuperAdminSystemStatus,
} from '../controllers/systemStateController.js';
import {
  createInvitation,
  validateInvitationToken,
  registerWithInvitation,
  getInvitations,
  revokeInvitation,
  resendInvitation,
} from '../controllers/invitationController.js';
import SystemState from '../models/SystemState.js';

const router = express.Router();

// =============================================================================
// LOGIN DEL SUPERADMIN (PÚBLICO)
// =============================================================================
router.post('/login', (req, res) => {
  try {
    const { usuario, password } = req.body;

    if (!usuario || !password) {
      return res.status(400).json({
        success: false,
        message: 'Usuario y contraseña son requeridos.',
      });
    }

    const resultado = loginSuperAdmin(usuario, password);

    if (!resultado.success) {
      // Delay deliberado para dificultar fuerza bruta
      return setTimeout(() => {
        res.status(401).json({
          success: false,
          message: 'Credenciales inválidas.',
        });
      }, 800);
    }

    setSuperAdminCookie(res, resultado.token);

    return res.json({
      success: true,
      message: 'Autenticación exitosa.',
      token: resultado.token,
      user: {
        usuario,
        rol: 'superadmin',
        isSuperAdmin: true,
      },
    });
  } catch (err) {
    console.error('❌ [SuperAdmin] Error en login:', err.message);
    res.status(500).json({ success: false, message: 'Error del servidor.' });
  }
});

// =============================================================================
// LOGOUT DEL SUPERADMIN
// =============================================================================
router.post('/logout', (req, res) => {
  res.cookie('superadmin_token', 'none', {
    httpOnly: true,
    expires: new Date(Date.now() + 5000),
    path: '/',
  });
  res.cookie('token', 'none', {
    httpOnly: true,
    expires: new Date(Date.now() + 5000),
    path: '/',
  });
  console.log('🛡️ Superadmin sesión cerrada');
  res.json({ success: true, message: 'Sesión cerrada.' });
});

// =============================================================================
// REFRESH TOKEN - Mantener sesión activa
// =============================================================================
router.post('/refresh', protegerSuperAdmin, (req, res) => {
  try {
    const secret = process.env.SUPER_ADMIN_JWT_SECRET || (process.env.JWT_SECRET + '_SUPER');
    const newToken = jwt.sign(
      {
        rol: 'superadmin',
        usuario: req.superAdmin.usuario,
        email: req.superAdmin.email,
        isSuperAdmin: true,
        type: 'superadmin',
      },
      secret,
      { expiresIn: '8h' }
    );
    setSuperAdminCookie(res, newToken);
    res.json({
      success: true,
      token: newToken,
      expiresIn: 8 * 60 * 60 * 1000,
    });
  } catch (err) {
    console.error('❌ Error refrescando token:', err);
    res.status(500).json({ success: false, message: 'Error al refrescar token' });
  }
});

// =============================================================================
// VERIFICAR SESIÓN ACTIVA
// =============================================================================
router.get('/verify', protegerSuperAdmin, (req, res) => {
  res.json({
    success: true,
    usuario: req.superAdmin.usuario,
    rol: 'superadmin',
  });
});

// =============================================================================
// CRUD DE VERSIONES — Solo superadmin
// =============================================================================
router.post('/versions', protegerSuperAdmin, createVersion);
router.put('/versions/:id', protegerSuperAdmin, updateVersion);
router.delete('/versions/:id', protegerSuperAdmin, deleteVersion);
router.patch('/versions/:id/set-current', protegerSuperAdmin, setCurrentVersion);

// =============================================================================
// INVITACIONES
// =============================================================================

// ── Rutas protegidas (superadmin) ──────────────────────────────────────────
router.post('/invitations', protegerSuperAdmin, createInvitation);
router.get('/invitations', protegerSuperAdmin, getInvitations);
router.delete('/invitations/:id', protegerSuperAdmin, revokeInvitation);
router.post('/invitations/:id/resend', protegerSuperAdmin, resendInvitation);

// ── Rutas PÚBLICAS de invitación (no requieren auth) ──────────────────────
// Validar token: el usuario lo introduce en la página de login
router.get('/invitations/validate/:token', validateInvitationToken);

// Registrar con token validado
router.post('/invitations/register', registerWithInvitation);

// =============================================================================
// CIERRE DEL SISTEMA — Solo superadmin
// =============================================================================
router.post('/system/shutdown', protegerSuperAdmin, closeSystem);
router.post('/system/open', protegerSuperAdmin, openSystem);
router.get('/system/status', protegerSuperAdmin, getSuperAdminSystemStatus);

router.get('/system/history', protegerSuperAdmin, async (req, res) => {
  try {
    const instance = await SystemState.getInstance();
    res.json({
      success: true,
      history: instance.history,
      total: instance.history.length,
    });
  } catch (err) {
    console.error('❌ Error obteniendo historial:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;