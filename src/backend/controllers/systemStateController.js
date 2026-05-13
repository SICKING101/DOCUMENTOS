// src/backend/controllers/systemStateController.js
// Controlador para el Cierre del Sistema
// Operaciones de escritura → solo superadmin
// Operaciones de lectura → cualquier usuario autenticado
// Soporta cierre global y cierre por escuela

import SystemState from '../models/SystemState.js';

// =============================================================================
// LECTURA — Disponible para todos los usuarios autenticados
// =============================================================================

/**
 * GET /api/system/status
 * Obtener el estado actual del sistema (abierto/cerrado)
 * Ahora incluye lista de escuelas cerradas
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
        closedSchools: instance.currentState.closedSchools.map(s => ({
          schoolId: s.schoolId,
          reason: s.reason,
          closedAt: s.closedAt,
        })),
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
      history: instance.history.slice(-50).reverse(),
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
 * Cerrar el sistema GLOBALMENTE para todos los usuarios
 * El superadmin NO se ve afectado
 * Los administradores PUEDEN ser afectados si el sistema está cerrado globalmente
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
        message: 'El sistema ya se encuentra cerrado globalmente.',
      });
    }

    await instance.closeSystem(reason.trim());

    console.log('🔒🌍 [SuperAdmin] Sistema cerrado GLOBALMENTE');

    res.json({
      success: true,
      message: 'Sistema cerrado globalmente. Todos los usuarios y admins serán bloqueados.',
      status: {
        isClosed: true,
        reason: reason.trim(),
        closedAt: instance.currentState.closedAt,
        closedSchools: instance.currentState.closedSchools.map(s => s.schoolId),
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
 * Reabrir el sistema GLOBALMENTE
 */
export async function openSystem(req, res) {
  try {
    const instance = await SystemState.getInstance();

    if (!instance.currentState.isClosed) {
      return res.status(400).json({
        success: false,
        message: 'El sistema ya se encuentra abierto globalmente.',
      });
    }

    await instance.openSystem();

    console.log('🔓🌍 [SuperAdmin] Sistema reabierto GLOBALMENTE');

    res.json({
      success: true,
      message: 'Sistema reabierto globalmente. Todos los usuarios ya pueden acceder.',
      status: {
        isClosed: false,
        reason: null,
        closedAt: null,
        closedSchools: instance.currentState.closedSchools.map(s => s.schoolId),
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
 * POST /api/superadmin/system/school/shutdown
 * Cerrar el sistema para UNA ESCUELA ESPECÍFICA
 * Bloquea al admin y todos los usuarios de esa escuela
 */
export async function closeSchool(req, res) {
  try {
    const { schoolId, reason } = req.body;

    if (!schoolId) {
      return res.status(400).json({
        success: false,
        message: 'El ID de la escuela es requerido.',
      });
    }

    if (!reason || reason.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Debes proporcionar un motivo para el cierre.',
      });
    }

    const instance = await SystemState.getInstance();
    await instance.closeSchool(schoolId, reason.trim());

    console.log(`🔒🏫 [SuperAdmin] Escuela ${schoolId} cerrada`);

    res.json({
      success: true,
      message: `Sistema cerrado para la escuela ${schoolId}.`,
      status: {
        closedSchools: instance.currentState.closedSchools.map(s => ({
          schoolId: s.schoolId,
          reason: s.reason,
          closedAt: s.closedAt,
          closedBy: s.closedBy,
        })),
      },
    });
  } catch (err) {
    console.error('❌ [SystemState] Error cerrando escuela:', err.message);
    res.status(500).json({
      success: false,
      message: 'Error al cerrar el sistema para la escuela.',
    });
  }
}

/**
 * POST /api/superadmin/system/school/open
 * Reabrir el sistema para UNA ESCUELA ESPECÍFICA
 */
export async function openSchool(req, res) {
  try {
    const { schoolId } = req.body;

    if (!schoolId) {
      return res.status(400).json({
        success: false,
        message: 'El ID de la escuela es requerido.',
      });
    }

    const instance = await SystemState.getInstance();
    await instance.openSchool(schoolId);

    console.log(`🔓🏫 [SuperAdmin] Escuela ${schoolId} reabierta`);

    res.json({
      success: true,
      message: `Sistema reabierto para la escuela ${schoolId}.`,
      status: {
        closedSchools: instance.currentState.closedSchools.map(s => ({
          schoolId: s.schoolId,
          reason: s.reason,
          closedAt: s.closedAt,
        })),
      },
    });
  } catch (err) {
    console.error('❌ [SystemState] Error abriendo escuela:', err.message);
    res.status(500).json({
      success: false,
      message: 'Error al reabrir el sistema para la escuela.',
    });
  }
}

/**
 * GET /api/superadmin/system/status (versión completa para superadmin)
 * Obtener estado completo con historial Y lista de escuelas cerradas
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
        closedSchools: instance.currentState.closedSchools.map(s => ({
          schoolId: s.schoolId,
          reason: s.reason,
          closedAt: s.closedAt,
          closedBy: s.closedBy,
        })),
      },
      history: instance.history.slice(-20).reverse(),
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

/**
 * POST /api/system/check-access (PÚBLICO)
 * Verificar si un usuario específico puede acceder
 * Útil para el frontend antes de mostrar el login
 */
export async function checkUserAccess(req, res) {
  try {
    const { schoolId, rol } = req.body;

    if (!schoolId && rol !== 'superadmin') {
      return res.status(400).json({
        success: false,
        message: 'Se requiere schoolId o rol de superadmin.',
      });
    }

    const instance = await SystemState.getInstance();
    const result = instance.checkAccess({ schoolId, rol });

    res.json({
      success: true,
      ...result,
    });
  } catch (err) {
    console.error('❌ [SystemState] Error verificando acceso:', err.message);
    res.status(500).json({
      success: false,
      message: 'Error al verificar acceso.',
    });
  }
}