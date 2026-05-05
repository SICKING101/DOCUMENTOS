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

// ── Sub-rutas ─────────────────────────────────────────────────
import auditRoutes from './auditRoutes.js';
import roleRoutes from './roleRoutes.js';
import suggestionRoutes from './suggestionRoutes.js';

// ─── AVISOS ──────────────────────────────────────────────────
import avisoRoutes from './avisoRoutes.js';

// ─── Health check ─────────────────────────────────────────────
router.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'API funcionando correctamente',
        timestamp: new Date().toISOString(),
    });
});

// Obtener estado actual del sistema (si está cerrado o abierto)
router.get('/system/status', protegerRuta, getSystemStatus);

// Obtener historial de cierres/reaperturas
router.get('/system/history', protegerRuta, getSystemHistory);

// ─── AUDITORÍA ────────────────────────────────────────────────
router.post('/frontend-log', AuditController.frontendLog);
router.use('/audit', auditRoutes);

// ─── ROLES DINÁMICOS ──────────────────────────────────────────
router.use('/roles', roleRoutes);

// ─── AVISOS ──────────────────────────────────────────────────
router.use('/avisos', avisoRoutes);

// ─── DASHBOARD ────────────────────────────────────────────────
router.get('/dashboard', protegerRuta, inyectarSchoolId, DashboardController.getDashboardStats);

// ─── CHATBOT ──────────────────────────────────────────────────
// Motor IA principal — procesar mensajes
router.post('/chatbot/message', protegerRuta, (req, res) => ChatbotController.processMessage(req, res));

// Estadísticas del sistema para el widget de bienvenida
router.get('/chatbot/stats', protegerRuta, (req, res) => ChatbotController.getSystemStats(req, res));

// Historial de conversación persistido en BD
router.get('/chatbot/history', protegerRuta, (req, res) => ChatbotController.getHistory(req, res));

// Borrar historial del usuario
router.delete('/chatbot/history', protegerRuta, (req, res) => ChatbotController.clearHistory(req, res));

// Feedback de utilidad (👍 / 👎)
router.patch('/chatbot/feedback', protegerRuta, (req, res) => ChatbotController.submitFeedback(req, res));

// ─── PERSONAS ─────────────────────────────────────────────────
router.get('/persons', protegerRuta, inyectarSchoolId, requirePermission(PERMISSIONS.VIEW_PERSONS), PersonController.getAll);
router.post('/persons', protegerRuta, inyectarSchoolId, requirePermission(PERMISSIONS.CREATE_PERSON), PersonController.create);
router.put('/persons/:id', protegerRuta, inyectarSchoolId, requirePermission(PERMISSIONS.EDIT_PERSON), PersonController.update);
router.delete('/persons/:id', protegerRuta, inyectarSchoolId, requirePermission(PERMISSIONS.DELETE_PERSON), PersonController.delete);
router.patch('/persons/:id/deactivate', protegerRuta, inyectarSchoolId, requirePermission(PERMISSIONS.EDIT_PERSON), PersonController.deactivate);
router.patch('/persons/:id/reactivate', protegerRuta, inyectarSchoolId, requirePermission(PERMISSIONS.EDIT_PERSON), PersonController.reactivate);

// ─── CATEGORÍAS (AISLADAS POR ESCUELA) ────────────────────────
router.get('/categories', protegerRuta, inyectarSchoolId, requirePermission(PERMISSIONS.VIEW_CATEGORIES), CategoryController.getAll);
router.post('/categories', protegerRuta, inyectarSchoolId, requirePermission(PERMISSIONS.CREATE_CATEGORY), CategoryController.create);
router.put('/categories/:id', protegerRuta, inyectarSchoolId, requirePermission(PERMISSIONS.EDIT_CATEGORY), CategoryController.update);
router.delete('/categories/:id', protegerRuta, inyectarSchoolId, requirePermission(PERMISSIONS.DELETE_CATEGORY), CategoryController.delete);

// ─── DEPARTAMENTOS (AISLADOS POR ESCUELA) ─────────────────────
router.get('/departments', protegerRuta, inyectarSchoolId, requirePermission(PERMISSIONS.VIEW_DEPARTMENTS), DepartmentController.getAll);
router.post('/departments', protegerRuta, inyectarSchoolId, requirePermission(PERMISSIONS.CREATE_DEPARTMENT), DepartmentController.create);
router.put('/departments/:id', protegerRuta, inyectarSchoolId, requirePermission(PERMISSIONS.EDIT_DEPARTMENT), DepartmentController.update);
router.delete('/departments/:id', protegerRuta, inyectarSchoolId, requirePermission(PERMISSIONS.DELETE_DEPARTMENT), DepartmentController.delete);

// ─── DOCUMENTOS ───────────────────────────────────────────────
router.get('/documents', protegerRuta, inyectarSchoolId, requirePermission(PERMISSIONS.VIEW_DOCUMENTS), DocumentController.getAll);
router.post('/documents', protegerRuta, inyectarSchoolId, requirePermission(PERMISSIONS.UPLOAD_DOCUMENTS), upload.single('file'), DocumentController.create);
router.delete('/documents/bulk-delete', protegerRuta, inyectarSchoolId, requirePermission(PERMISSIONS.DELETE_DOCUMENTS), DocumentController.bulkDelete);
router.put('/documents/:id', protegerRuta, inyectarSchoolId, requirePermission(PERMISSIONS.EDIT_DOCUMENTS), upload.single('file'), DocumentController.update);
router.get('/documents/:id/preview', protegerRuta, inyectarSchoolId, requirePermission(PERMISSIONS.VIEW_DOCUMENTS), DocumentController.preview);
router.get('/documents/:id/download', protegerRuta, inyectarSchoolId, requirePermission(PERMISSIONS.DOWNLOAD_DOCUMENTS), DocumentController.download);
router.get('/documents/:id/content', protegerRuta, inyectarSchoolId, requirePermission(PERMISSIONS.VIEW_DOCUMENTS), DocumentController.getContent);
router.get('/documents/:id/info', protegerRuta, inyectarSchoolId, requirePermission(PERMISSIONS.VIEW_DOCUMENTS), DocumentController.getInfo);
router.delete('/documents/:id', protegerRuta, inyectarSchoolId, requirePermission(PERMISSIONS.DELETE_DOCUMENTS), DocumentController.delete);
router.patch('/documents/:id/approve', protegerRuta, inyectarSchoolId, requirePermission(PERMISSIONS.APPROVE_DOCUMENTS), DocumentController.approve);
router.patch('/documents/:id/reject', protegerRuta, inyectarSchoolId, requirePermission(PERMISSIONS.APPROVE_DOCUMENTS), DocumentController.reject);

// ─── TAREAS ───────────────────────────────────────────────────
router.get('/tasks/assignable-users', protegerRuta, TaskController.getAssignableUsers);
router.get('/tasks', protegerRuta, TaskController.getUserTasks);
router.get('/tasks/stats', protegerRuta, TaskController.getUserStats);
router.get('/tasks/high-priority', protegerRuta, TaskController.getHighPriority);
router.get('/tasks/today', protegerRuta, TaskController.getTodayTasks);
router.get('/tasks/:id', protegerRuta, TaskController.getById);
router.post('/tasks', protegerRuta, TaskController.create);
router.put('/tasks/:id', protegerRuta, TaskController.update);
router.patch('/tasks/:id/complete', protegerRuta, TaskController.complete);
router.delete('/tasks/:id', protegerRuta, TaskController.delete);

// ─── REPORTES (AISLADOS POR ESCUELA) ────────────────────────────
router.post('/reports/excel', protegerRuta, inyectarSchoolId, requirePermission(PERMISSIONS.GENERATE_REPORTS), ReportController.generateExcel);
router.post('/reports/pdf', protegerRuta, inyectarSchoolId, requirePermission(PERMISSIONS.GENERATE_REPORTS), ReportController.generatePDF);
router.post('/reports/csv', protegerRuta, inyectarSchoolId, requirePermission(PERMISSIONS.GENERATE_REPORTS), ReportController.generateCSV);

// ─── NOTIFICACIONES (AISLADAS POR ESCUELA) ─────────────────────
router.get('/notifications', protegerRuta, inyectarSchoolId, NotificationController.getAll);
router.get('/notifications/unread', protegerRuta, inyectarSchoolId, NotificationController.getUnread);
router.get('/notifications/stats', protegerRuta, inyectarSchoolId, NotificationController.getStats);
router.patch('/notifications/:id/read', protegerRuta, NotificationController.markAsRead);
router.patch('/notifications/read-all', protegerRuta, inyectarSchoolId, NotificationController.markAllAsRead);
router.delete('/notifications/:id', protegerRuta, requirePermission(PERMISSIONS.CLEAR_HISTORY), NotificationController.delete);
router.post('/notifications/cleanup', protegerRuta, requirePermission(PERMISSIONS.CLEAR_HISTORY), NotificationController.cleanup);

// ─── PAPELERA ─────────────────────────────────────────────────
router.get('/trash', protegerRuta, inyectarSchoolId, requirePermission(PERMISSIONS.VIEW_TRASH), TrashController.getTrashDocuments);
router.post('/trash/empty-all', protegerRuta, inyectarSchoolId, requirePermission(PERMISSIONS.EMPTY_TRASH), TrashController.emptyTrash);
router.post('/trash/auto-cleanup', protegerRuta, inyectarSchoolId, requirePermission(PERMISSIONS.EMPTY_TRASH), TrashController.autoCleanup);
router.post('/trash/:id/restore', protegerRuta, inyectarSchoolId, requirePermission(PERMISSIONS.RESTORE_FROM_TRASH), TrashController.restoreDocument);
router.delete('/trash/:id', protegerRuta, inyectarSchoolId, requirePermission(PERMISSIONS.EMPTY_TRASH), TrashController.deletePermanently);

// ─── SOPORTE ──────────────────────────────────────────────────
router.post('/tickets', protegerRuta, requirePermission(PERMISSIONS.CREATE_TICKET), upload.array('files', 10), SupportController.createTicket);
router.get('/support/status', protegerRuta, requirePermission(PERMISSIONS.VIEW_SUPPORT), SupportController.getSystemStatus);
router.get('/support/faq', protegerRuta, requirePermission(PERMISSIONS.VIEW_SUPPORT), SupportController.getFAQ);
router.post('/support/test-email', protegerRuta, requirePermission(PERMISSIONS.VIEW_SUPPORT), SupportController.testSupportEmail);

if (process.env.NODE_ENV === 'development') {
    console.log('🧪 Modo desarrollo: rutas de prueba habilitadas');
    router.post('/support/activate-errors', protegerRuta, requirePermission(PERMISSIONS.VIEW_SUPPORT), SupportController.activateRealErrors);
    router.post('/support/reset-errors', protegerRuta, requirePermission(PERMISSIONS.VIEW_SUPPORT), SupportController.resetRealErrors);
    router.get('/support/validate-errors', protegerRuta, requirePermission(PERMISSIONS.VIEW_SUPPORT), SupportController.validateSystemErrors);
    router.post('/support/simulate-error/:service', protegerRuta, requirePermission(PERMISSIONS.VIEW_SUPPORT), SupportController.simulateRealError);
    router.post('/support/reset-all-errors', protegerRuta, requirePermission(PERMISSIONS.VIEW_SUPPORT), SupportController.resetAllRealErrors);
} else {
    console.log('🚀 Modo producción: rutas de prueba deshabilitadas');
}

// ─── VERSIONES DEL SISTEMA (solo lectura para usuarios autenticados) ──────────
router.get('/versions',         protegerRuta, getAllVersions);
router.get('/versions/current', protegerRuta, getCurrentVersion);
router.get('/versions/:id',     protegerRuta, getVersionById);

// ─── SUGERENCIAS ────────────────────────────────────────────────
router.use('/suggestions', suggestionRoutes);

// ─── TEMA DEL USUARIO ──────────────────────────────────────────────
router.get('/user/theme', protegerRuta, async (req, res) => {
  try {
    console.log(`🎨 [THEME API] GET solicitud para usuario ${req.user.id}`);
    const user = await User.findById(req.user.id).select('theme');
    if (!user) {
      console.log(`❌ [THEME API] Usuario no encontrado: ${req.user.id}`);
      return res.status(404).json({ ok: false, message: 'Usuario no encontrado' });
    }
    const themeToReturn = user.theme || 'light';
    console.log(`✅ [THEME API] Tema devuelto para usuario ${req.user.id}:`, themeToReturn);
    console.log(`🎨 [THEME API] Usuario completo:`, user);
    res.json({ ok: true, theme: themeToReturn });
  } catch (error) {
    console.error('❌ [THEME API] Error obteniendo tema:', error);
    res.status(500).json({ ok: false, message: 'Error al obtener tema' });
  }
});

router.patch('/user/theme', protegerRuta, async (req, res) => {
  try {
    const { theme } = req.body;
    
    // Validar que el tema sea válido
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
    console.log(`🎨 [THEME API] Usuario completo después de actualizar:`, user);
    
    res.json({ ok: true, theme: user.theme });
  } catch (error) {
    console.error('❌ [THEME API] Error actualizando tema:', error);
    res.status(500).json({ ok: false, message: 'Error al actualizar tema' });
  }
});

export default router;