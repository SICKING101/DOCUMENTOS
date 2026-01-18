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

// Importar middleware
import { protegerRuta, permisoTicket, permisoCambiarEstado } from '../middleware/auth.js';

// Importar middleware de Multer
import upload from '../config/multerConfig.js';

// Ruta de prueba
router.get('/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'API funcionando correctamente',
    timestamp: new Date().toISOString()
  });
});

// -----------------------------
// DASHBOARD
// -----------------------------
router.get('/dashboard', protegerRuta, DashboardController.getDashboardStats);

// -----------------------------
// PERSONAS
// -----------------------------
router.get('/persons', protegerRuta, PersonController.getAll);
router.post('/persons', protegerRuta, PersonController.create);
router.put('/persons/:id', protegerRuta, PersonController.update);
router.delete('/persons/:id', protegerRuta, PersonController.delete);

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
router.get('/documents', protegerRuta, DocumentController.getAll);
router.post('/documents', protegerRuta, upload.single('file'), DocumentController.create);
router.put('/documents/:id', protegerRuta, upload.single('file'), DocumentController.update);
router.get('/documents/:id/preview', protegerRuta, DocumentController.preview);
router.get('/documents/:id/download', protegerRuta, DocumentController.download);
router.get('/documents/:id/content', protegerRuta, DocumentController.getContent);
router.get('/documents/:id/info', protegerRuta, DocumentController.getInfo);
router.delete('/documents/:id', protegerRuta, DocumentController.delete);

// -----------------------------
// TAREAS
// -----------------------------
router.get('/tasks', protegerRuta, TaskController.getAll);
router.post('/tasks', protegerRuta, TaskController.create);
router.put('/tasks/:id', protegerRuta, TaskController.update);
router.delete('/tasks/:id', protegerRuta, TaskController.delete);
router.patch('/tasks/:id/status', protegerRuta, TaskController.updateStatus);
router.get('/tasks/stats', protegerRuta, TaskController.getStats);

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
router.get('/trash', protegerRuta, TrashController.getTrashDocuments);
router.post('/trash/empty-all', protegerRuta, TrashController.emptyTrash);
router.post('/trash/auto-cleanup', protegerRuta, TrashController.autoCleanup);
router.post('/trash/:id/restore', protegerRuta, TrashController.restoreDocument);
router.delete('/trash/:id', protegerRuta, TrashController.deletePermanently);

// -----------------------------
// SOPORTE Y TICKETS - RUTAS CORREGIDAS Y COMPLETAS
// -----------------------------
router.post('/tickets', protegerRuta, upload.array('files', 10), SupportController.createTicket);

// ✅ RUTAS PARA ESTADO DEL SISTEMA - CORREGIDAS Y COMPLETAS
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