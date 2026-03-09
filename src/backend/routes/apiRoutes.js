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
// Importar auditController
import AuditController from '../controllers/auditController.js';

// Importar middleware
import { protegerRuta, requirePermission } from '../middleware/auth.js';

// Permisos (roles)
import { PERMISSIONS } from '../config/permissions.js';

// Importar middleware de Multer
import { uploadDocuments, uploadSmallFiles } from '../config/multerConfig.js';
// Importar rutas de auditoría
import auditRoutes from './auditRoutes.js';

// Ruta de prueba
router.get('/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'API funcionando correctamente',
    timestamp: new Date().toISOString()
  });
});

// -----------------------------
// AUDITORÍA
// -----------------------------

// Ruta pública para logs del frontend (NO requiere autenticación)
router.post('/frontend-log', AuditController.frontendLog);
router.use('/audit', auditRoutes);

// -----------------------------
// DASHBOARD
// -----------------------------
router.get('/dashboard', protegerRuta, DashboardController.getDashboardStats);

// -----------------------------
// PERSONAS - RUTAS ACTUALIZADAS PARA ELIMINACIÓN PERMANENTE
// -----------------------------
router.get('/persons', protegerRuta, PersonController.getAll);
router.post('/persons', protegerRuta, PersonController.create);
router.put('/persons/:id', protegerRuta, PersonController.update);

// ELIMINACIÓN PERMANENTE (HARD DELETE) - QUITAR DE LA BASE DE DATOS
router.delete('/persons/:id', protegerRuta, PersonController.delete);

// RUTAS OPCIONALES PARA GESTIÓN DE ESTADO (si quieres mantener ambas funcionalidades)
router.patch('/persons/:id/deactivate', protegerRuta, PersonController.deactivate);
router.patch('/persons/:id/reactivate', protegerRuta, PersonController.reactivate);
router.get('/persons/inactive', protegerRuta, PersonController.getInactive);

// -----------------------------
// CATEGORÍAS
// -----------------------------
router.get('/categories', protegerRuta, CategoryController.getAll);
router.post('/categories', protegerRuta, CategoryController.create);
router.put('/categories/:id', protegerRuta, CategoryController.update);
router.delete('/categories/:id', protegerRuta, CategoryController.delete);

// -----------------------------
// DEPARTAMENTOS
// -----------------------------
router.get('/departments', protegerRuta, DepartmentController.getAll);
router.post('/departments', protegerRuta, DepartmentController.create);
router.put('/departments/:id', protegerRuta, DepartmentController.update);
router.delete('/departments/:id', protegerRuta, DepartmentController.delete);

// -----------------------------
// DOCUMENTOS
// -----------------------------
router.get('/documents', protegerRuta, requirePermission(PERMISSIONS.VIEW_DOCUMENTS), DocumentController.getAll);
router.post('/documents', protegerRuta, requirePermission(PERMISSIONS.UPLOAD_DOCUMENTS), uploadDocuments.single('file'), DocumentController.create);
router.put('/documents/:id', protegerRuta, requirePermission(PERMISSIONS.EDIT_DOCUMENTS), uploadDocuments.single('file'), DocumentController.update);
router.get('/documents/:id/preview', protegerRuta, requirePermission(PERMISSIONS.VIEW_DOCUMENTS), DocumentController.preview);
router.get('/documents/:id/download', protegerRuta, requirePermission(PERMISSIONS.DOWNLOAD_DOCUMENTS), DocumentController.download);
router.get('/documents/:id/content', protegerRuta, requirePermission(PERMISSIONS.VIEW_DOCUMENTS), DocumentController.getContent);
router.get('/documents/:id/info', protegerRuta, requirePermission(PERMISSIONS.VIEW_DOCUMENTS), DocumentController.getInfo);
router.delete('/documents/:id', protegerRuta, requirePermission(PERMISSIONS.DELETE_DOCUMENTS), DocumentController.delete);

// Revisión/Aprobación
router.patch('/documents/:id/approve', protegerRuta, requirePermission(PERMISSIONS.APPROVE_DOCUMENTS), DocumentController.approve);
router.patch('/documents/:id/reject', protegerRuta, requirePermission(PERMISSIONS.APPROVE_DOCUMENTS), DocumentController.reject);

// -----------------------------
// TAREAS
// -----------------------------
router.get('/tasks', protegerRuta, TaskController.getAll);
router.post('/tasks', protegerRuta, TaskController.create);
router.put('/tasks/:id', protegerRuta, TaskController.update);
router.delete('/tasks/:id', protegerRuta, TaskController.delete);
router.patch('/tasks/:id/status', protegerRuta, TaskController.updateStatus);
router.get('/tasks/stats', protegerRuta, TaskController.getStats);
router.get('/tasks/high-priority', protegerRuta, TaskController.getHighPriority);
router.get('/tasks/today', protegerRuta, TaskController.getTodayTasks);

// -----------------------------
// REPORTES
// -----------------------------
router.post('/reports/excel', protegerRuta, ReportController.generateExcel);
router.post('/reports/pdf', protegerRuta, ReportController.generatePDF);
router.post('/reports/csv', protegerRuta, ReportController.generateCSV);

// -----------------------------
// NOTIFICACIONES
// -----------------------------
router.get('/notifications', protegerRuta, NotificationController.getAll);
router.get('/notifications/unread', protegerRuta, NotificationController.getUnread);
router.get('/notifications/stats', protegerRuta, NotificationController.getStats);
router.patch('/notifications/:id/read', protegerRuta, NotificationController.markAsRead);
router.patch('/notifications/read-all', protegerRuta, NotificationController.markAllAsRead);
router.delete('/notifications/:id', protegerRuta, NotificationController.delete);
router.post('/notifications/cleanup', protegerRuta, NotificationController.cleanup);

// -----------------------------
// PAPELERA
// -----------------------------
router.get('/trash', protegerRuta, requirePermission(PERMISSIONS.DELETE_DOCUMENTS), TrashController.getTrashDocuments);
router.post('/trash/empty-all', protegerRuta, requirePermission(PERMISSIONS.DELETE_DOCUMENTS), TrashController.emptyTrash);
router.post('/trash/auto-cleanup', protegerRuta, requirePermission(PERMISSIONS.DELETE_DOCUMENTS), TrashController.autoCleanup);
router.post('/trash/:id/restore', protegerRuta, requirePermission(PERMISSIONS.DELETE_DOCUMENTS), TrashController.restoreDocument);
router.delete('/trash/:id', protegerRuta, requirePermission(PERMISSIONS.DELETE_DOCUMENTS), TrashController.deletePermanently);

// -----------------------------
// SOPORTE Y TICKETS
// -----------------------------
router.post('/tickets', protegerRuta, uploadSmallFiles.array('files', 10), SupportController.createTicket);

// ✅ RUTAS PARA ESTADO DEL SISTEMA
router.get('/support/status', protegerRuta, SupportController.getSystemStatus);
router.get('/support/faq', protegerRuta, SupportController.getFAQ);
router.post('/support/test-email', protegerRuta, SupportController.testSupportEmail);

// ✅ RUTAS PARA DESARROLLO (SOLO SI ESTÁ EN MODO DESARROLLO)
if (process.env.NODE_ENV === 'development') {
  console.log('🧪 Modo desarrollo activado: Habilitando rutas de prueba');
  router.post('/support/activate-errors', protegerRuta, SupportController.activateRealErrors);
  router.post('/support/reset-errors', protegerRuta, SupportController.resetRealErrors);
  router.get('/support/validate-errors', protegerRuta, SupportController.validateSystemErrors);
  router.post('/support/simulate-error/:service', protegerRuta, SupportController.simulateRealError);
  router.post('/support/reset-all-errors', protegerRuta, SupportController.resetAllRealErrors);
} else {
  console.log('🚀 Modo producción: Rutas de prueba deshabilitadas');
}

export default router;