// ============================================================
// apiRoutes.js — Rutas principales de la API
// Incluye chatbot con todos sus endpoints
// ============================================================

import express from 'express';
const router = express.Router();

// ── Controladores ────────────────────────────────────────────
import DashboardController from '../controllers/dashboardController.js';
import PersonController from '../controllers/personController.js';
import CategoryController from '../controllers/categoryController.js';
import DepartmentController from '../controllers/departmentController.js';
import DocumentController from '../controllers/documentController.js';
import TaskController from '../controllers/taskController.js';
import NotificationController from '../controllers/notificationController.js';
import ReportController from '../controllers/reportController.js';
import TrashController from '../controllers/trashController.js';
import SupportController from '../controllers/supportController.js';
import AuditController from '../controllers/auditController.js';
import ChatbotController from '../controllers/chatbotController.js';
import {
  getAllVersions,
  getCurrentVersion,
  getVersionById,
} from '../controllers/versionController.js';
import { getSystemStatus, getSystemHistory } from '../controllers/systemStateController.js';

// ── Modelos ────────────────────────────────────────────────────
import User from '../models/User.js';

// ── Middlewares ───────────────────────────────────────────────
import { protegerRuta, requirePermission, inyectarSchoolId } from '../middleware/auth.js';
import { PERMISSIONS } from '../config/permissions.js';
import upload from '../config/multerConfig.js';

// ═══════════════════════════════════════════════════════════════
// NUEVO: Middleware de verificación de sistema cerrado
// ═══════════════════════════════════════════════════════════════
import verificarAccesoSistema from '../middleware/systemAccess.js';

// ── Sub-rutas ─────────────────────────────────────────────────
import auditRoutes from './auditRoutes.js';
import roleRoutes from './roleRoutes.js';
import suggestionRoutes from './suggestionRoutes.js';
import settingsRoutes from './settingsRoutes.js';

// ─── AVISOS ──────────────────────────────────────────────────
import avisoRoutes from './avisoRoutes.js';

// ═══════════════════════════════════════════════════════════════
// MIDDLEWARE GLOBAL: Aplicar verificación de sistema a TODAS
// las rutas que requieren autenticación
// Esto bloquea a admin y usuarios si el sistema está cerrado
// El superadmin NO se ve afectado
// ═══════════════════════════════════════════════════════════════

// Aplicar a todas las rutas que usan protegerRuta
// Lo hacemos por secciones para mayor claridad

// ─── Health check (SIN protección) ─────────────────────────────
router.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'API funcionando correctamente',
        timestamp: new Date().toISOString(),
    });
});

// ─── Estado del sistema (con verificación) ─────────────────────
router.get('/system/status', protegerRuta, verificarAccesoSistema, getSystemStatus);
router.get('/system/history', protegerRuta, verificarAccesoSistema, getSystemHistory);

// ─── AUDITORÍA ────────────────────────────────────────────────
router.post('/frontend-log', AuditController.frontendLog);
router.use('/audit', protegerRuta, verificarAccesoSistema, auditRoutes);

// ─── ROLES DINÁMICOS ──────────────────────────────────────────
router.use('/roles', protegerRuta, verificarAccesoSistema, roleRoutes);

// ─── AVISOS ──────────────────────────────────────────────────
router.use('/avisos', protegerRuta, verificarAccesoSistema, avisoRoutes);

// ─── DASHBOARD ────────────────────────────────────────────────
router.get('/dashboard', protegerRuta, verificarAccesoSistema, inyectarSchoolId, DashboardController.getDashboardStats);

// ─── CHATBOT ──────────────────────────────────────────────────
router.post('/chatbot/message', protegerRuta, verificarAccesoSistema, inyectarSchoolId, (req, res) => ChatbotController.processMessage(req, res));
router.get('/chatbot/stats', protegerRuta, verificarAccesoSistema, inyectarSchoolId, (req, res) => ChatbotController.getSystemStats(req, res));
router.get('/chatbot/history', protegerRuta, verificarAccesoSistema, (req, res) => ChatbotController.getHistory(req, res));
router.delete('/chatbot/history', protegerRuta, verificarAccesoSistema, (req, res) => ChatbotController.clearHistory(req, res));
router.patch('/chatbot/feedback', protegerRuta, verificarAccesoSistema, (req, res) => ChatbotController.submitFeedback(req, res));

// ─── PERSONAS ─────────────────────────────────────────────────
router.get('/persons', protegerRuta, verificarAccesoSistema, inyectarSchoolId, requirePermission(PERMISSIONS.VIEW_PERSONS), PersonController.getAll);
router.post('/persons', protegerRuta, verificarAccesoSistema, inyectarSchoolId, requirePermission(PERMISSIONS.CREATE_PERSON), PersonController.create);
router.put('/persons/:id', protegerRuta, verificarAccesoSistema, inyectarSchoolId, requirePermission(PERMISSIONS.EDIT_PERSON), PersonController.update);
router.delete('/persons/:id', protegerRuta, verificarAccesoSistema, inyectarSchoolId, requirePermission(PERMISSIONS.DELETE_PERSON), PersonController.delete);
router.patch('/persons/:id/deactivate', protegerRuta, verificarAccesoSistema, inyectarSchoolId, requirePermission(PERMISSIONS.EDIT_PERSON), PersonController.deactivate);
router.patch('/persons/:id/reactivate', protegerRuta, verificarAccesoSistema, inyectarSchoolId, requirePermission(PERMISSIONS.EDIT_PERSON), PersonController.reactivate);

// ─── CATEGORÍAS ────────────────────────────────────────────────
router.get('/categories', protegerRuta, verificarAccesoSistema, inyectarSchoolId, requirePermission(PERMISSIONS.VIEW_CATEGORIES), CategoryController.getAll);
router.post('/categories', protegerRuta, verificarAccesoSistema, inyectarSchoolId, requirePermission(PERMISSIONS.CREATE_CATEGORY), CategoryController.create);
router.put('/categories/:id', protegerRuta, verificarAccesoSistema, inyectarSchoolId, requirePermission(PERMISSIONS.EDIT_CATEGORY), CategoryController.update);
router.delete('/categories/:id', protegerRuta, verificarAccesoSistema, inyectarSchoolId, requirePermission(PERMISSIONS.DELETE_CATEGORY), CategoryController.delete);

// ─── DEPARTAMENTOS ─────────────────────────────────────────────
router.get('/departments', protegerRuta, verificarAccesoSistema, inyectarSchoolId, requirePermission(PERMISSIONS.VIEW_DEPARTMENTS), DepartmentController.getAll);
router.post('/departments', protegerRuta, verificarAccesoSistema, inyectarSchoolId, requirePermission(PERMISSIONS.CREATE_DEPARTMENT), DepartmentController.create);
router.put('/departments/:id', protegerRuta, verificarAccesoSistema, inyectarSchoolId, requirePermission(PERMISSIONS.EDIT_DEPARTMENT), DepartmentController.update);
router.delete('/departments/:id', protegerRuta, verificarAccesoSistema, inyectarSchoolId, requirePermission(PERMISSIONS.DELETE_DEPARTMENT), DepartmentController.delete);

// ─── DOCUMENTOS ───────────────────────────────────────────────
router.get('/documents', protegerRuta, verificarAccesoSistema, inyectarSchoolId, requirePermission(PERMISSIONS.VIEW_DOCUMENTS), DocumentController.getAll);
router.post('/documents', protegerRuta, verificarAccesoSistema, inyectarSchoolId, requirePermission(PERMISSIONS.UPLOAD_DOCUMENTS), upload.single('file'), DocumentController.create);
router.delete('/documents/bulk-delete', protegerRuta, verificarAccesoSistema, inyectarSchoolId, requirePermission(PERMISSIONS.DELETE_DOCUMENTS), DocumentController.bulkDelete);
router.put('/documents/:id', protegerRuta, verificarAccesoSistema, inyectarSchoolId, requirePermission(PERMISSIONS.EDIT_DOCUMENTS), upload.single('file'), DocumentController.update);
router.get('/documents/:id/preview', protegerRuta, verificarAccesoSistema, inyectarSchoolId, requirePermission(PERMISSIONS.VIEW_DOCUMENTS), DocumentController.preview);
router.get('/documents/:id/download', protegerRuta, verificarAccesoSistema, inyectarSchoolId, requirePermission(PERMISSIONS.DOWNLOAD_DOCUMENTS), DocumentController.download);
router.get('/documents/:id/content', protegerRuta, verificarAccesoSistema, inyectarSchoolId, requirePermission(PERMISSIONS.VIEW_DOCUMENTS), DocumentController.getContent);
router.get('/documents/:id/info', protegerRuta, verificarAccesoSistema, inyectarSchoolId, requirePermission(PERMISSIONS.VIEW_DOCUMENTS), DocumentController.getInfo);
router.delete('/documents/:id', protegerRuta, verificarAccesoSistema, inyectarSchoolId, requirePermission(PERMISSIONS.DELETE_DOCUMENTS), DocumentController.delete);
router.patch('/documents/:id/approve', protegerRuta, verificarAccesoSistema, inyectarSchoolId, requirePermission(PERMISSIONS.APPROVE_DOCUMENTS), DocumentController.approve);
router.patch('/documents/:id/reject', protegerRuta, verificarAccesoSistema, inyectarSchoolId, requirePermission(PERMISSIONS.APPROVE_DOCUMENTS), DocumentController.reject);

// ─── TAREAS ──────────────────────────────────────────────────
router.get('/tasks/assignable-users', protegerRuta, verificarAccesoSistema, inyectarSchoolId, TaskController.getAssignableUsers);
router.get('/tasks', protegerRuta, verificarAccesoSistema, inyectarSchoolId, TaskController.getUserTasks);
router.get('/tasks/stats', protegerRuta, verificarAccesoSistema, inyectarSchoolId, TaskController.getUserStats);
router.get('/tasks/high-priority', protegerRuta, verificarAccesoSistema, inyectarSchoolId, TaskController.getHighPriority);
router.get('/tasks/today', protegerRuta, verificarAccesoSistema, inyectarSchoolId, TaskController.getTodayTasks);
router.get('/tasks/:id', protegerRuta, verificarAccesoSistema, TaskController.getById);
router.post('/tasks', protegerRuta, verificarAccesoSistema, inyectarSchoolId, TaskController.create);
router.put('/tasks/:id', protegerRuta, verificarAccesoSistema, TaskController.update);
router.patch('/tasks/:id/complete', protegerRuta, verificarAccesoSistema, TaskController.complete);
router.delete('/tasks/:id', protegerRuta, verificarAccesoSistema, TaskController.delete);

// ─── REPORTES ──────────────────────────────────────────────────
router.post('/reports/excel', protegerRuta, verificarAccesoSistema, inyectarSchoolId, requirePermission(PERMISSIONS.GENERATE_REPORTS), ReportController.generateExcel);
router.post('/reports/pdf', protegerRuta, verificarAccesoSistema, inyectarSchoolId, requirePermission(PERMISSIONS.GENERATE_REPORTS), ReportController.generatePDF);
router.post('/reports/csv', protegerRuta, verificarAccesoSistema, inyectarSchoolId, requirePermission(PERMISSIONS.GENERATE_REPORTS), ReportController.generateCSV);
router.get('/reports/chart-data', protegerRuta, verificarAccesoSistema, inyectarSchoolId, requirePermission(PERMISSIONS.GENERATE_REPORTS), (req, res) => ReportController.getChartData(req, res));
router.get('/reports/time-series', protegerRuta, verificarAccesoSistema, inyectarSchoolId, requirePermission(PERMISSIONS.GENERATE_REPORTS), (req, res) => ReportController.getTimeSeriesData(req, res));
router.get('/reports/comparison', protegerRuta, verificarAccesoSistema, inyectarSchoolId, requirePermission(PERMISSIONS.GENERATE_REPORTS), (req, res) => ReportController.getComparisonData(req, res));
router.get('/reports/summary', protegerRuta, verificarAccesoSistema, inyectarSchoolId, requirePermission(PERMISSIONS.GENERATE_REPORTS), (req, res) => ReportController.getReportsSummary(req, res));
router.post('/reports/excel-with-chart', protegerRuta, verificarAccesoSistema, inyectarSchoolId, requirePermission(PERMISSIONS.GENERATE_REPORTS), (req, res) => ReportController.generateExcelWithChart(req, res));

// ─── NOTIFICACIONES ───────────────────────────────────────────
router.get('/notifications', protegerRuta, verificarAccesoSistema, inyectarSchoolId, NotificationController.getAll);
router.get('/notifications/unread', protegerRuta, verificarAccesoSistema, inyectarSchoolId, NotificationController.getUnread);
router.get('/notifications/stats', protegerRuta, verificarAccesoSistema, inyectarSchoolId, NotificationController.getStats);
router.patch('/notifications/:id/read', protegerRuta, verificarAccesoSistema, NotificationController.markAsRead);
router.patch('/notifications/read-all', protegerRuta, verificarAccesoSistema, inyectarSchoolId, NotificationController.markAllAsRead);
router.delete('/notifications/:id', protegerRuta, verificarAccesoSistema, requirePermission(PERMISSIONS.CLEAR_HISTORY), NotificationController.delete);
router.post('/notifications/cleanup', protegerRuta, verificarAccesoSistema, requirePermission(PERMISSIONS.CLEAR_HISTORY), NotificationController.cleanup);

// ─── PAPELERA ─────────────────────────────────────────────────
router.get('/trash', protegerRuta, verificarAccesoSistema, inyectarSchoolId, requirePermission(PERMISSIONS.VIEW_TRASH), TrashController.getTrashDocuments);
router.post('/trash/empty-all', protegerRuta, verificarAccesoSistema, inyectarSchoolId, requirePermission(PERMISSIONS.EMPTY_TRASH), TrashController.emptyTrash);
router.post('/trash/auto-cleanup', protegerRuta, verificarAccesoSistema, inyectarSchoolId, requirePermission(PERMISSIONS.EMPTY_TRASH), TrashController.autoCleanup);
router.post('/trash/:id/restore', protegerRuta, verificarAccesoSistema, inyectarSchoolId, requirePermission(PERMISSIONS.RESTORE_FROM_TRASH), TrashController.restoreDocument);
router.delete('/trash/:id', protegerRuta, verificarAccesoSistema, inyectarSchoolId, requirePermission(PERMISSIONS.EMPTY_TRASH), TrashController.deletePermanently);

// ─── SOPORTE ──────────────────────────────────────────────────
router.post('/tickets', protegerRuta, verificarAccesoSistema, requirePermission(PERMISSIONS.CREATE_TICKET), upload.array('files', 10), SupportController.createTicket);
router.get('/support/status', protegerRuta, verificarAccesoSistema, requirePermission(PERMISSIONS.VIEW_SUPPORT), SupportController.getSystemStatus);
router.get('/support/faq', protegerRuta, verificarAccesoSistema, requirePermission(PERMISSIONS.VIEW_SUPPORT), SupportController.getFAQ);
router.post('/support/test-email', protegerRuta, verificarAccesoSistema, requirePermission(PERMISSIONS.VIEW_SUPPORT), SupportController.testSupportEmail);

if (process.env.NODE_ENV === 'development') {
    console.log('🧪 Modo desarrollo: rutas de prueba habilitadas');
    router.post('/support/activate-errors', protegerRuta, verificarAccesoSistema, requirePermission(PERMISSIONS.VIEW_SUPPORT), SupportController.activateRealErrors);
    router.post('/support/reset-errors', protegerRuta, verificarAccesoSistema, requirePermission(PERMISSIONS.VIEW_SUPPORT), SupportController.resetRealErrors);
    router.get('/support/validate-errors', protegerRuta, verificarAccesoSistema, requirePermission(PERMISSIONS.VIEW_SUPPORT), SupportController.validateSystemErrors);
    router.post('/support/simulate-error/:service', protegerRuta, verificarAccesoSistema, requirePermission(PERMISSIONS.VIEW_SUPPORT), SupportController.simulateRealError);
    router.post('/support/reset-all-errors', protegerRuta, verificarAccesoSistema, requirePermission(PERMISSIONS.VIEW_SUPPORT), SupportController.resetAllRealErrors);
} else {
    console.log('🚀 Modo producción: rutas de prueba deshabilitadas');
}

// ─── VERSIONES DEL SISTEMA ─────────────────────────────────────
router.get('/versions',         protegerRuta, verificarAccesoSistema, getAllVersions);
router.get('/versions/current', protegerRuta, verificarAccesoSistema, getCurrentVersion);
router.get('/versions/:id',     protegerRuta, verificarAccesoSistema, getVersionById);

// ─── SUGERENCIAS ────────────────────────────────────────────────
router.use('/suggestions', protegerRuta, verificarAccesoSistema, suggestionRoutes);

// ─── AJUSTES DEL USUARIO ──────────────────────────────────────
router.use('/user/settings', protegerRuta, verificarAccesoSistema, settingsRoutes);

// ─── TEMA DEL USUARIO ──────────────────────────────────────────
router.get('/user/theme', protegerRuta, verificarAccesoSistema, async (req, res) => {
  try {
    console.log(`🎨 [THEME API] GET solicitud para usuario ${req.user.id}`);
    const user = await User.findById(req.user.id).select('theme');
    if (!user) {
      console.log(`❌ [THEME API] Usuario no encontrado: ${req.user.id}`);
      return res.status(404).json({ ok: false, message: 'Usuario no encontrado' });
    }
    const themeToReturn = user.theme || 'light';
    console.log(`✅ [THEME API] Tema devuelto para usuario ${req.user.id}:`, themeToReturn);
    res.json({ ok: true, theme: themeToReturn });
  } catch (error) {
    console.error('❌ [THEME API] Error obteniendo tema:', error);
    res.status(500).json({ ok: false, message: 'Error al obtener tema' });
  }
});

router.patch('/user/theme', protegerRuta, verificarAccesoSistema, async (req, res) => {
  try {
    const { theme } = req.body;
    
    if (!['light', 'dark', 'system'].includes(theme)) {
      return res.status(400).json({ ok: false, message: 'Tema inválido. Debe ser: light, dark o system' });
    }

    console.log(`🎨 [THEME API] PATCH recibido para usuario ${req.user.id}, tema: ${theme}`);

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { theme },
      { new: true, runValidators: true }
    ).select('theme');
    
    console.log(`🎨 [THEME API] Usuario actualizado, tema guardado en BD:`, user?.theme);
    
    res.json({ ok: true, theme: user.theme });
  } catch (error) {
    console.error('❌ [THEME API] Error actualizando tema:', error);
    res.status(500).json({ ok: false, message: 'Error al actualizar tema' });
  }
});

export default router;