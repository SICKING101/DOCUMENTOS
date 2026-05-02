import express from 'express';
import AuditController from '../controllers/auditController.js';
import { protegerRuta, soloAdministrador, inyectarSchoolId } from '../middleware/auth.js';
import { auditMiddleware } from '../middleware/auditMiddleware.js';

const router = express.Router();

router.use(protegerRuta);
router.use(auditMiddleware);

// Estas rutas ven SOLO los logs de su escuela
router.get('/logs', inyectarSchoolId, AuditController.getLogs);
router.get('/logs/:id', AuditController.getLogById);
router.get('/actions', AuditController.getActions);
router.get('/stats', inyectarSchoolId, soloAdministrador, AuditController.getStats);
router.get('/export', inyectarSchoolId, soloAdministrador, AuditController.exportLogs);
router.post('/cleanup', soloAdministrador, AuditController.cleanupLogs);

export default router;