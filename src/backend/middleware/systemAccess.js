// src/backend/middleware/systemAccess.js

import SystemState from '../models/SystemState.js';

/**
 * Middleware para verificar si el sistema está abierto para clientes
 * Los superadmins y administradores SIEMPRE pueden acceder
 * Los clientes (roles normales) NO pueden acceder si el sistema está cerrado
 */
export async function verificarAccesoSistema(req, res, next) {
  try {
    // Si es superadmin, siempre permitir acceso
    if (req.superAdmin?.isSuperAdmin === true || req.user?.isSuperAdmin === true) {
      return next();
    }
    
    // Si es administrador, siempre permitir acceso
    if (req.user?.rol === 'administrador') {
      return next();
    }
    
    // Para otros roles, verificar si el sistema está cerrado
    const instance = await SystemState.getInstance();
    
    if (instance.currentState.isClosed === true) {
      return res.status(503).json({
        success: false,
        message: 'El sistema se encuentra en mantenimiento. Por favor, intenta más tarde.',
        code: 'SYSTEM_CLOSED',
        reason: instance.currentState.reason,
        closedAt: instance.currentState.closedAt,
      });
    }
    
    next();
  } catch (error) {
    console.error('❌ Error en verificarAccesoSistema:', error);
    // En caso de error, permitir acceso por seguridad
    next();
  }
}