import express from 'express';
const router = express.Router();

// Importar controladores
import DashboardController from '../controllers/dashboardController.js';
import PersonController from '../controllers/personController.js';
import CategoryController from '../controllers/categoryController.js';
import DocumentController from '../controllers/documentController.js';
import TaskController from '../controllers/taskController.js';
import NotificationController from '../controllers/notificationController.js';
import ReportController from '../controllers/reportController.js';

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
router.get('/dashboard', DashboardController.getDashboardStats);

// -----------------------------
// PERSONAS
// -----------------------------
router.get('/persons', PersonController.getAll);
router.post('/persons', PersonController.create);
router.put('/persons/:id', PersonController.update);
router.delete('/persons/:id', PersonController.delete);

// -----------------------------
// CATEGORÍAS
// -----------------------------
router.get('/categories', CategoryController.getAll);
router.post('/categories', CategoryController.create);
router.put('/categories/:id', CategoryController.update);
router.delete('/categories/:id', CategoryController.delete);

// -----------------------------
// DOCUMENTOS
// -----------------------------
router.get('/documents', DocumentController.getAll);
router.post('/documents', upload.single('file'), DocumentController.create);
router.get('/documents/:id/preview', DocumentController.preview);
router.get('/documents/:id/download', DocumentController.download);
router.get('/documents/:id/content', DocumentController.getContent);
router.get('/documents/:id/info', DocumentController.getInfo);
router.delete('/documents/:id', DocumentController.delete);

// -----------------------------
// TAREAS
// -----------------------------
router.get('/tasks', TaskController.getAll);
router.post('/tasks', TaskController.create);
router.put('/tasks/:id', TaskController.update);
router.delete('/tasks/:id', TaskController.delete);
router.patch('/tasks/:id/status', TaskController.updateStatus);
router.get('/tasks/stats', TaskController.getStats);

// -----------------------------
// REPORTES
// -----------------------------
router.post('/reports/excel', ReportController.generateExcel);
router.post('/reports/pdf', ReportController.generatePDF);
router.post('/reports/csv', ReportController.generateCSV);

// -----------------------------
// NOTIFICACIONES
// -----------------------------
router.get('/notifications', NotificationController.getAll);
router.get('/notifications/unread', NotificationController.getUnread);
router.get('/notifications/stats', NotificationController.getStats);
router.patch('/notifications/:id/read', NotificationController.markAsRead);
router.patch('/notifications/read-all', NotificationController.markAllAsRead);
router.delete('/notifications/:id', NotificationController.delete);
router.post('/notifications/cleanup', NotificationController.cleanup);

// CORREGIR ESTA LÍNEA:
export default router;  // CAMBIAR CategoryController por router