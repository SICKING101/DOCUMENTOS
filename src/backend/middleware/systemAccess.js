// src/backend/middleware/systemAccess.js
// Middleware para verificar si el sistema está abierto
// Soporta cierre global y cierre por escuela
// El SUPERADMIN NUNCA es bloqueado
// Los ADMINISTRADORES y USUARIOS SÍ son bloqueados

import SystemState from '../models/SystemState.js';

export async function verificarAccesoSistema(req, res, next) {
  try {
    // ═══════════════════════════════════════════════════════════
    // SUPERADMIN: Siempre permitir, sin excepción
    // ═══════════════════════════════════════════════════════════
    const isSuperAdmin = 
      req.superAdmin?.isSuperAdmin === true || 
      req.user?.isSuperAdmin === true || 
      req.user?.rol === 'superadmin';

    if (isSuperAdmin) {
      console.log('🛡️ [SystemAccess] Superadmin - acceso permitido siempre');
      return next();
    }

    // Obtener instancia del estado del sistema
    const systemState = await SystemState.getInstance();

    console.log(`🔍 [SystemAccess] Verificando acceso para: ${req.user?.usuario || 'desconocido'} (rol: ${req.user?.rol}, schoolId: ${req.user?.schoolId})`);
    console.log(`📊 [SystemAccess] Estado - isClosed: ${systemState.currentState.isClosed}, closedSchools: ${systemState.currentState.closedSchools.length}`);

    // ═══════════════════════════════════════════════════════════
    // VERIFICAR CIERRE GLOBAL
    // ═══════════════════════════════════════════════════════════
    if (systemState.currentState.isClosed) {
      console.log(`🚫 [SystemAccess] BLOQUEADO - Sistema cerrado globalmente para ${req.user?.rol}`);
      return res.status(503).json({
        success: false,
        accessDenied: true,
        type: 'system_closed',
        message: 'El sistema está temporalmente cerrado.',
        reason: systemState.currentState.reason || 'Mantenimiento programado',
        closedAt: systemState.currentState.closedAt,
      });
    }

    // ═══════════════════════════════════════════════════════════
    // VERIFICAR CIERRE POR ESCUELA
    // ═══════════════════════════════════════════════════════════
    const userSchoolId = req.user?.schoolId;

    if (userSchoolId && systemState.currentState.closedSchools.length > 0) {
      const schoolClosure = systemState.currentState.closedSchools.find(
        s => s.schoolId === userSchoolId
      );

      if (schoolClosure) {
        console.log(`🚫 [SystemAccess] BLOQUEADO - Escuela ${userSchoolId} cerrada para ${req.user?.rol}`);
        return res.status(503).json({
          success: false,
          accessDenied: true,
          type: 'school_closed',
          message: 'El acceso para tu escuela está temporalmente suspendido.',
          reason: schoolClosure.reason || 'Sin motivo especificado',
          schoolId: userSchoolId,
        });
      }
    }

    // Acceso permitido
    console.log(`✅ [SystemAccess] Acceso permitido para ${req.user?.rol || 'usuario'}`);
    next();
  } catch (error) {
    console.error('❌ [SystemAccess] Error verificando acceso:', error.message);
    // En caso de error, permitir acceso por seguridad
    return next();
  }
}

export default verificarAccesoSistema;