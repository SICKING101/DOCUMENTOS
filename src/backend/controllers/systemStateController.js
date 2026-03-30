// src/backend/controllers/systemStateController.js
// Controlador para el Cierre del Sistema
// Operaciones de escritura → solo superadmin
// Operaciones de lectura → cualquier usuario autenticado

import SystemState from '../models/SystemState.js';

// =============================================================================
// LECTURA — Disponible para todos los usuarios autenticados
// =============================================================================

/**
 * GET /api/system/status
 * Obtener el estado actual del sistema (abierto/cerrado)
 * Útil para el frontend de clientes (saber si pueden acceder)
 */
export async function getSystemStatus(req, res) {
  try {
    const instance = await SystemState.getInstance();
    
    res.json({
      success: true,
      status: {
        isClosed: instance.currentState.isClosed,
        reason: instance.currentState.reason,
        closedAt: instance.currentState.closedAt,
        lastModifiedBy: instance.currentState.lastModifiedBy,
      },
    });
  } catch (err) {
    console.error('❌ [SystemState] Error obteniendo estado:', err.message);
    res.status(500).json({
      success: false,
      message: 'Error al obtener el estado del sistema.',
    });
  }
}

/**
 * GET /api/system/history
 * Obtener historial de cierres y reaperturas
 */
export async function getSystemHistory(req, res) {
  try {
    const instance = await SystemState.getInstance();
    
    res.json({
      success: true,
      history: instance.history,
      total: instance.history.length,
    });
  } catch (err) {
    console.error('❌ [SystemState] Error obteniendo historial:', err.message);
    res.status(500).json({
      success: false,
      message: 'Error al obtener el historial del sistema.',
    });
  }
}

// =============================================================================
// ESCRITURA — Solo superadmin (protegerSuperAdmin middleware)
// =============================================================================

/**
 * POST /api/superadmin/system/shutdown
 * Cerrar el sistema para todos los clientes
 * El superadmin y administradores siguen teniendo acceso
 */
export async function closeSystem(req, res) {
  try {
    const { reason } = req.body;
    
    if (!reason || reason.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Debes proporcionar un motivo para el cierre del sistema.',
      });
    }
    
    const instance = await SystemState.getInstance();
    
    if (instance.currentState.isClosed) {
      return res.status(400).json({
        success: false,
        message: 'El sistema ya se encuentra cerrado para clientes.',
      });
    }
    
    await instance.closeSystem(reason.trim());
    
    console.log('🔒 [SuperAdmin] Sistema cerrado para clientes');
    
    res.json({
      success: true,
      message: 'Sistema cerrado exitosamente. Los clientes no podrán acceder.',
      status: {
        isClosed: true,
        reason: reason.trim(),
        closedAt: instance.currentState.closedAt,
      },
    });
  } catch (err) {
    console.error('❌ [SystemState] Error cerrando sistema:', err.message);
    res.status(500).json({
      success: false,
      message: 'Error al cerrar el sistema: ' + err.message,
    });
  }
}

/**
 * POST /api/superadmin/system/open
 * Reabrir el sistema para todos los clientes
 */
export async function openSystem(req, res) {
  try {
    const instance = await SystemState.getInstance();
    
    if (!instance.currentState.isClosed) {
      return res.status(400).json({
        success: false,
        message: 'El sistema ya se encuentra abierto para clientes.',
      });
    }
    
    await instance.openSystem();
    
    console.log('🔓 [SuperAdmin] Sistema reabierto para clientes');
    
    res.json({
      success: true,
      message: 'Sistema reabierto exitosamente. Los clientes ya pueden acceder.',
      status: {
        isClosed: false,
        reason: null,
        closedAt: null,
      },
    });
  } catch (err) {
    console.error('❌ [SystemState] Error abriendo sistema:', err.message);
    res.status(500).json({
      success: false,
      message: 'Error al abrir el sistema: ' + err.message,
    });
  }
}

/**
 * GET /api/superadmin/system/status (versión completa para superadmin)
 * Obtener estado completo con historial
 */
export async function getSuperAdminSystemStatus(req, res) {
  try {
    const instance = await SystemState.getInstance();
    
    res.json({
      success: true,
      status: {
        isClosed: instance.currentState.isClosed,
        reason: instance.currentState.reason,
        closedAt: instance.currentState.closedAt,
        lastModifiedBy: instance.currentState.lastModifiedBy,
        lastModifiedAt: instance.updatedAt,
      },
      history: instance.history.slice(-10), // últimos 10 eventos
      totalHistory: instance.history.length,
    });
  } catch (err) {
    console.error('❌ [SystemState] Error:', err.message);
    res.status(500).json({
      success: false,
      message: 'Error al obtener estado del sistema.',
    });
  }
}