// src/backend/routes/apiRoutes.js
// Rutas principales de la API — incluye roles dinámicos

import express from 'express';
const router = express.Router();

// Importar controladores
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

// Importar middleware
import { protegerRuta, requirePermission } from '../middleware/auth.js';

// Permisos (roles)
import { PERMISSIONS } from '../config/permissions.js';

// Importar middleware de Multer
import upload from '../config/multerConfig.js';

// Importar rutas de auditoría y roles
import auditRoutes from './auditRoutes.js';
import roleRoutes from './roleRoutes.js';   // ← NUEVO: rutas de roles dinámicos

// ─── Health check ─────────────────────────────────────────────────────────────
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'API funcionando correctamente',
    timestamp: new Date().toISOString(),
  });
});

// ─── AUDITORÍA ────────────────────────────────────────────────────────────────
// Ruta pública para logs del frontend (NO requiere autenticación)
router.post('/frontend-log', AuditController.frontendLog);
router.use('/audit', auditRoutes);

// ─── ROLES DINÁMICOS ──────────────────────────────────────────────────────────
router.use('/roles', roleRoutes);   // ← NUEVO

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
router.get('/dashboard', protegerRuta, DashboardController.getDashboardStats);

// ─── PERSONAS ─────────────────────────────────────────────────────────────────
// GET /persons - Requiere permiso VIEW_PERSONS
router.get('/persons', protegerRuta, requirePermission(PERMISSIONS.VIEW_PERSONS), PersonController.getAll);

// GET /persons/inactive - También requiere VIEW_PERSONS (es una variante de vista)
router.get('/persons/inactive', protegerRuta, requirePermission(PERMISSIONS.VIEW_PERSONS), PersonController.getInactive);

// POST /persons - Requiere permiso CREATE_PERSON
router.post('/persons', protegerRuta, requirePermission(PERMISSIONS.CREATE_PERSON), PersonController.create);

// PUT /persons/:id - Requiere permiso EDIT_PERSON
router.put('/persons/:id', protegerRuta, requirePermission(PERMISSIONS.EDIT_PERSON), PersonController.update);

// DELETE /persons/:id - Requiere permiso DELETE_PERSON
router.delete('/persons/:id', protegerRuta, requirePermission(PERMISSIONS.DELETE_PERSON), PersonController.delete);

// PATCH /persons/:id/deactivate - Requiere permiso EDIT_PERSON (es una forma de edición)
router.patch('/persons/:id/deactivate', protegerRuta, requirePermission(PERMISSIONS.EDIT_PERSON), PersonController.deactivate);

// PATCH /persons/:id/reactivate - Requiere permiso EDIT_PERSON (es una forma de edición)
router.patch('/persons/:id/reactivate', protegerRuta, requirePermission(PERMISSIONS.EDIT_PERSON), PersonController.reactivate);

// ─── CATEGORÍAS ───────────────────────────────────────────────────────────────
router.get('/categories', protegerRuta, requirePermission(PERMISSIONS.VIEW_CATEGORIES), CategoryController.getAll);
router.post('/categories', protegerRuta, requirePermission(PERMISSIONS.CREATE_CATEGORY), CategoryController.create);
router.put('/categories/:id', protegerRuta, requirePermission(PERMISSIONS.EDIT_CATEGORY), CategoryController.update);
router.delete('/categories/:id', protegerRuta, requirePermission(PERMISSIONS.DELETE_CATEGORY), CategoryController.delete);

// ─── DEPARTAMENTOS ────────────────────────────────────────────────────────────
router.get('/departments', protegerRuta, requirePermission(PERMISSIONS.VIEW_DEPARTMENTS), DepartmentController.getAll);
router.post('/departments', protegerRuta, requirePermission(PERMISSIONS.CREATE_DEPARTMENT), DepartmentController.create);
router.put('/departments/:id', protegerRuta, requirePermission(PERMISSIONS.EDIT_DEPARTMENT), DepartmentController.update);
router.delete('/departments/:id', protegerRuta, requirePermission(PERMISSIONS.DELETE_DEPARTMENT), DepartmentController.delete);

// ─── DOCUMENTOS ───────────────────────────────────────────────────────────────
router.get('/documents', protegerRuta, requirePermission(PERMISSIONS.VIEW_DOCUMENTS), DocumentController.getAll);
router.post('/documents', protegerRuta, requirePermission(PERMISSIONS.UPLOAD_DOCUMENTS), upload.single('file'), DocumentController.create);
router.put('/documents/:id', protegerRuta, requirePermission(PERMISSIONS.EDIT_DOCUMENTS), upload.single('file'), DocumentController.update);
router.get('/documents/:id/preview', protegerRuta, requirePermission(PERMISSIONS.VIEW_DOCUMENTS), DocumentController.preview);
router.get('/documents/:id/download', protegerRuta, requirePermission(PERMISSIONS.DOWNLOAD_DOCUMENTS), DocumentController.download);
router.get('/documents/:id/content', protegerRuta, requirePermission(PERMISSIONS.VIEW_DOCUMENTS), DocumentController.getContent);
router.get('/documents/:id/info', protegerRuta, requirePermission(PERMISSIONS.VIEW_DOCUMENTS), DocumentController.getInfo);
router.delete('/documents/:id', protegerRuta, requirePermission(PERMISSIONS.DELETE_DOCUMENTS), DocumentController.delete);
router.patch('/documents/:id/approve', protegerRuta, requirePermission(PERMISSIONS.APPROVE_DOCUMENTS), DocumentController.approve);
router.patch('/documents/:id/reject', protegerRuta, requirePermission(PERMISSIONS.APPROVE_DOCUMENTS), DocumentController.reject);

// ─── TAREAS ───────────────────────────────────────────────────────────────────
router.get('/tasks', protegerRuta, requirePermission(PERMISSIONS.VIEW_TASKS), TaskController.getAll);
router.post('/tasks', protegerRuta, requirePermission(PERMISSIONS.CREATE_TASK), TaskController.create);
router.put('/tasks/:id', protegerRuta, requirePermission(PERMISSIONS.EDIT_TASK), TaskController.update);
router.delete('/tasks/:id', protegerRuta, requirePermission(PERMISSIONS.DELETE_TASK), TaskController.delete);
router.patch('/tasks/:id/status', protegerRuta, requirePermission(PERMISSIONS.COMPLETE_TASK), TaskController.updateStatus);
router.get('/tasks/stats', protegerRuta, requirePermission(PERMISSIONS.VIEW_TASKS), TaskController.getStats);
router.get('/tasks/high-priority', protegerRuta, requirePermission(PERMISSIONS.VIEW_TASKS), TaskController.getHighPriority);
router.get('/tasks/today', protegerRuta, requirePermission(PERMISSIONS.VIEW_TASKS), TaskController.getTodayTasks);

// ─── REPORTES ─────────────────────────────────────────────────────────────────
router.post('/reports/excel', protegerRuta, requirePermission(PERMISSIONS.GENERATE_REPORTS), ReportController.generateExcel);
router.post('/reports/pdf', protegerRuta, requirePermission(PERMISSIONS.GENERATE_REPORTS), ReportController.generatePDF);
router.post('/reports/csv', protegerRuta, requirePermission(PERMISSIONS.GENERATE_REPORTS), ReportController.generateCSV);

// ─── NOTIFICACIONES ───────────────────────────────────────────────────────────
// Vista pública para cualquier usuario autenticado (Historial/Notificaciones)
router.get('/notifications', protegerRuta, NotificationController.getAll);
router.get('/notifications/unread', protegerRuta, NotificationController.getUnread);
router.get('/notifications/stats', protegerRuta, NotificationController.getStats);
router.patch('/notifications/:id/read', protegerRuta, NotificationController.markAsRead);
router.patch('/notifications/read-all', protegerRuta, NotificationController.markAllAsRead);

// Acciones destructivas: restringidas (relacionadas a Historial)
router.delete('/notifications/:id', protegerRuta, requirePermission(PERMISSIONS.CLEAR_HISTORY), NotificationController.delete);
router.post('/notifications/cleanup', protegerRuta, requirePermission(PERMISSIONS.CLEAR_HISTORY), NotificationController.cleanup);

// ─── PAPELERA ─────────────────────────────────────────────────────────────────
router.get('/trash', protegerRuta, requirePermission(PERMISSIONS.VIEW_TRASH), TrashController.getTrashDocuments);
router.post('/trash/empty-all', protegerRuta, requirePermission(PERMISSIONS.EMPTY_TRASH), TrashController.emptyTrash);
router.post('/trash/auto-cleanup', protegerRuta, requirePermission(PERMISSIONS.EMPTY_TRASH), TrashController.autoCleanup);
router.post('/trash/:id/restore', protegerRuta, requirePermission(PERMISSIONS.RESTORE_FROM_TRASH), TrashController.restoreDocument);
router.delete('/trash/:id', protegerRuta, requirePermission(PERMISSIONS.EMPTY_TRASH), TrashController.deletePermanently);

// ─── SOPORTE Y TICKETS ────────────────────────────────────────────────────────
router.post('/tickets', protegerRuta, requirePermission(PERMISSIONS.CREATE_TICKET), upload.array('files', 10), SupportController.createTicket);
router.get('/support/status', protegerRuta, requirePermission(PERMISSIONS.VIEW_SUPPORT), SupportController.getSystemStatus);
router.get('/support/faq', protegerRuta, requirePermission(PERMISSIONS.VIEW_SUPPORT), SupportController.getFAQ);
router.post('/support/test-email', protegerRuta, requirePermission(PERMISSIONS.VIEW_SUPPORT), SupportController.testSupportEmail);

if (process.env.NODE_ENV === 'development') {
  console.log('🧪 Modo desarrollo activado: Habilitando rutas de prueba');
  router.post('/support/activate-errors', protegerRuta, requirePermission(PERMISSIONS.VIEW_SUPPORT), SupportController.activateRealErrors);
  router.post('/support/reset-errors', protegerRuta, requirePermission(PERMISSIONS.VIEW_SUPPORT), SupportController.resetRealErrors);
  router.get('/support/validate-errors', protegerRuta, requirePermission(PERMISSIONS.VIEW_SUPPORT), SupportController.validateSystemErrors);
  router.post('/support/simulate-error/:service', protegerRuta, requirePermission(PERMISSIONS.VIEW_SUPPORT), SupportController.simulateRealError);
  router.post('/support/reset-all-errors', protegerRuta, requirePermission(PERMISSIONS.VIEW_SUPPORT), SupportController.resetAllRealErrors);
} else {
  console.log('🚀 Modo producción: Rutas de prueba deshabilitadas');
}

export default router;