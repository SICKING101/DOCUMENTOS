import express from 'express';
import AuditController from '../controllers/auditController.js';
import { protegerRuta, soloAdministrador } from '../middleware/auth.js';
import { auditMiddleware } from '../middleware/auditMiddleware.js';

const router = express.Router();

// =============================================================================
// TODAS LAS RUTAS REQUIEREN AUTENTICACIÓN
// =============================================================================
router.use(protegerRuta);
router.use(auditMiddleware);

// =============================================================================
// RUTAS PÚBLICAS (PARA USUARIOS AUTENTICADOS)
// =============================================================================

// Obtener logs con filtros (todos pueden ver sus propios logs)
router.get('/logs', AuditController.getLogs);

// Obtener log específico
router.get('/logs/:id', AuditController.getLogById);

// Obtener acciones disponibles para filtros
router.get('/actions', AuditController.getActions);

// =============================================================================
// RUTAS DE ADMINISTRADOR
// =============================================================================

// Obtener estadísticas (solo admin)
router.get('/stats', soloAdministrador, AuditController.getStats);

// Exportar logs (solo admin)
router.get('/export', soloAdministrador, AuditController.exportLogs);

// Limpiar logs antiguos (solo admin)
router.post('/cleanup', soloAdministrador, AuditController.cleanupLogs);

export default router;