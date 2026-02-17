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

// Importar middlewares
import { protegerRuta } from '../middleware/auth.js';
import { requierePermiso, requiereCualquierPermiso, verificarPropietario } from '../middleware/permisos.js';

// Importar middleware de Multer
import upload from '../config/multerConfig.js';
import adminRoutes from './adminRoutes.js';

// Rutas de administración
router.use('/admin', protegerRuta, requierePermiso('ver_administracion'), adminRoutes);

// ********************************************************************
// MÓDULO 1: RUTAS DE SALUD Y DIAGNÓSTICO
// ********************************************************************
router.get('/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'API funcionando correctamente',
    timestamp: new Date().toISOString()
  });
});

// ********************************************************************
// MÓDULO 2: DASHBOARD
// ********************************************************************
router.get('/dashboard', 
  protegerRuta, 
  requierePermiso('ver_dashboard'), 
  DashboardController.getDashboardStats
);

// ********************************************************************
// MÓDULO 3: GESTIÓN DE PERSONAS - CORREGIDO
// ********************************************************************
router.get('/persons', 
  protegerRuta, 
  requierePermiso('ver_personas'), 
  PersonController.getAll
);

router.post('/persons', 
  protegerRuta, 
  requierePermiso('acciones_personas'), 
  PersonController.create
);

router.put('/persons/:id', 
  protegerRuta, 
  requiereCualquierPermiso(['acciones_personas', 'editar_cualquier_persona']),
  verificarPropietario('Person', 'id'),
  PersonController.update
);

router.delete('/persons/:id', 
  protegerRuta, 
  requierePermiso('acciones_personas'),
  verificarPropietario('Person', 'id'),
  PersonController.delete
);

router.patch('/persons/:id/deactivate', 
  protegerRuta, 
  requierePermiso('acciones_personas'),
  PersonController.deactivate
);

router.patch('/persons/:id/reactivate', 
  protegerRuta, 
  requierePermiso('acciones_personas'),
  PersonController.reactivate
);

router.get('/persons/inactive', 
  protegerRuta, 
  requierePermiso('ver_personas'), 
  PersonController.getInactive
);

// ********************************************************************
// MÓDULO 4: GESTIÓN DE CATEGORÍAS - CORREGIDO
// ********************************************************************
router.get('/categories', 
  protegerRuta, 
  requierePermiso('ver_categorias'), 
  CategoryController.getAll
);

router.post('/categories', 
  protegerRuta, 
  requierePermiso('acciones_categorias'), 
  CategoryController.create
);

router.put('/categories/:id', 
  protegerRuta, 
  requierePermiso('acciones_categorias'), 
  CategoryController.update
);

router.delete('/categories/:id', 
  protegerRuta, 
  requierePermiso('acciones_categorias'), 
  CategoryController.delete
);

// ********************************************************************
// MÓDULO 5: GESTIÓN DE DEPARTAMENTOS - CORREGIDO
// ********************************************************************
router.get('/departments', 
  protegerRuta, 
  requierePermiso('ver_departamentos'), 
  DepartmentController.getAll
);

router.post('/departments', 
  protegerRuta, 
  requierePermiso('acciones_departamentos'), 
  DepartmentController.create
);

router.put('/departments/:id', 
  protegerRuta, 
  requierePermiso('acciones_departamentos'), 
  DepartmentController.update
);

router.delete('/departments/:id', 
  protegerRuta, 
  requierePermiso('acciones_departamentos'), 
  DepartmentController.delete
);

// ********************************************************************
// MÓDULO 6: GESTIÓN DE DOCUMENTOS - CORREGIDO
// ********************************************************************
router.get('/documents', 
  protegerRuta, 
  requierePermiso('ver_documentos'), 
  DocumentController.getAll
);

router.post('/documents', 
  protegerRuta, 
  requierePermiso('acciones_documentos'), 
  upload.single('file'), 
  DocumentController.create
);

router.put('/documents/:id', 
  protegerRuta, 
  requiereCualquierPermiso(['acciones_documentos', 'editar_cualquier_documento']),
  verificarPropietario('Document', 'id'),
  upload.single('file'), 
  DocumentController.update
);

router.delete('/documents/:id', 
  protegerRuta, 
  requierePermiso('acciones_documentos'),
  verificarPropietario('Document', 'id'),
  DocumentController.delete
);

router.get('/documents/:id/preview', 
  protegerRuta, 
  requierePermiso('ver_documentos'), 
  DocumentController.preview
);

router.get('/documents/:id/download', 
  protegerRuta, 
  requierePermiso('ver_documentos'), 
  DocumentController.download
);

router.get('/documents/:id/content', 
  protegerRuta, 
  requierePermiso('ver_documentos'), 
  DocumentController.getContent
);

router.get('/documents/:id/info', 
  protegerRuta, 
  requierePermiso('ver_documentos'), 
  DocumentController.getInfo
);

// ********************************************************************
// MÓDULO 7: GESTIÓN DE TAREAS - CORREGIDO
// ********************************************************************
router.get('/tasks', 
  protegerRuta, 
  requierePermiso('ver_tareas'), 
  TaskController.getAll
);

router.post('/tasks', 
  protegerRuta, 
  requierePermiso('acciones_tareas'), 
  TaskController.create
);

router.put('/tasks/:id', 
  protegerRuta, 
  requiereCualquierPermiso(['acciones_tareas', 'editar_cualquier_tarea']),
  verificarPropietario('Task', 'id'),
  TaskController.update
);

router.delete('/tasks/:id', 
  protegerRuta, 
  requierePermiso('acciones_tareas'),
  verificarPropietario('Task', 'id'),
  TaskController.delete
);

router.patch('/tasks/:id/status', 
  protegerRuta, 
  requierePermiso('acciones_tareas'),
  verificarPropietario('Task', 'id'),
  TaskController.updateStatus
);

router.get('/tasks/stats', 
  protegerRuta, 
  requierePermiso('ver_tareas'), 
  TaskController.getStats
);

router.get('/tasks/high-priority', 
  protegerRuta, 
  requierePermiso('ver_tareas'), 
  TaskController.getHighPriority
);

router.get('/tasks/today', 
  protegerRuta, 
  requierePermiso('ver_tareas'), 
  TaskController.getTodayTasks
);

// ********************************************************************
// MÓDULO 7.5: VISUALIZACIÓN DE REPORTES - NUEVO
// ********************************************************************
router.get('/reports', 
  protegerRuta, 
  (req, res, next) => {
    // Todos los usuarios autenticados pueden VER la sección de reportes
    console.log('📊 Acceso a sección de reportes');
    next();
  },
  (req, res) => {
    res.json({ 
      success: true, 
      message: 'Sección de reportes',
      data: {
        titulo: 'Centro de Reportes',
        descripcion: 'Genera y exporta reportes del sistema',
        tipos: ['excel', 'pdf', 'csv']
      }
    });
  }
);

// ********************************************************************
// MÓDULO 8: GENERACIÓN DE REPORTES - CORREGIDO
// ********************************************************************
router.post('/reports/excel', 
  protegerRuta, 
  requierePermiso('acciones_reportes'), 
  ReportController.generateExcel
);

router.post('/reports/pdf', 
  protegerRuta, 
  requierePermiso('acciones_reportes'), 
  ReportController.generatePDF
);

router.post('/reports/csv', 
  protegerRuta, 
  requierePermiso('acciones_reportes'), 
  ReportController.generateCSV
);

// ********************************************************************
// MÓDULO 9: GESTIÓN DE NOTIFICACIONES - SECCIÓN PÚBLICA
// ********************************************************************
router.get('/notifications', 
  protegerRuta, 
  (req, res, next) => next(), // Sin permiso - público
  NotificationController.getAll
);

router.get('/notifications/unread', 
  protegerRuta, 
  (req, res, next) => next(), // Sin permiso - público
  NotificationController.getUnread
);

router.get('/notifications/stats', 
  protegerRuta, 
  (req, res, next) => next(), // Sin permiso - público
  NotificationController.getStats
);

router.patch('/notifications/:id/read', 
  protegerRuta, 
  (req, res, next) => next(), // Sin permiso - público
  NotificationController.markAsRead
);

router.patch('/notifications/read-all', 
  protegerRuta, 
  (req, res, next) => next(), // Sin permiso - público
  NotificationController.markAllAsRead
);

router.delete('/notifications/:id', 
  protegerRuta, 
  (req, res, next) => next(), // Sin permiso - público
  NotificationController.delete
);

router.post('/notifications/cleanup', 
  protegerRuta, 
  requierePermiso('acciones_administracion'), // Solo admins
  NotificationController.cleanup
);

// ********************************************************************
// MÓDULO 10: GESTIÓN DE PAPELERA - CORREGIDO
// ********************************************************************
router.get('/trash', 
  protegerRuta, 
  requierePermiso('ver_papelera'), 
  TrashController.getTrashDocuments
);

router.post('/trash/:id/restore', 
  protegerRuta, 
  requierePermiso('acciones_papelera'),
  TrashController.restoreDocument
);

router.delete('/trash/:id', 
  protegerRuta, 
  requierePermiso('acciones_papelera'),
  TrashController.deletePermanently
);

router.post('/trash/empty-all', 
  protegerRuta, 
  requierePermiso('acciones_papelera'),
  TrashController.emptyTrash
);

router.post('/trash/auto-cleanup', 
  protegerRuta, 
  requierePermiso('acciones_papelera'),
  TrashController.autoCleanup
);

// ********************************************************************
// MÓDULO 11: SISTEMA DE SOPORTE - CORREGIDO
// ********************************************************************
router.post('/tickets', 
  protegerRuta, 
  requierePermiso('acciones_soporte'), 
  upload.array('files', 10), 
  SupportController.createTicket
);

router.get('/support/status', 
  protegerRuta, 
  requierePermiso('ver_soporte'), 
  SupportController.getSystemStatus
);

router.get('/support/faq', 
  protegerRuta, 
  (req, res, next) => next(), // FAQ es público
  SupportController.getFAQ
);

router.post('/support/test-email', 
  protegerRuta, 
  requierePermiso('acciones_soporte'), 
  SupportController.testSupportEmail
);

// ********************************************************************
// MÓDULO 12: RUTAS DE DESARROLLO
// ********************************************************************
if (process.env.NODE_ENV === 'development') {
  console.log('🧪 Modo desarrollo activado: Habilitando rutas de prueba');
  
  router.post('/support/activate-errors', 
    protegerRuta, 
    requierePermiso('acciones_soporte'), 
    SupportController.activateRealErrors
  );
  
  router.post('/support/reset-errors', 
    protegerRuta, 
    requierePermiso('acciones_soporte'), 
    SupportController.resetRealErrors
  );
  
  router.post('/support/reset-all-errors', 
    protegerRuta, 
    requierePermiso('acciones_soporte'), 
    SupportController.resetAllRealErrors
  );
  
  router.get('/support/validate-errors', 
    protegerRuta, 
    requierePermiso('acciones_soporte'), 
    SupportController.validateSystemErrors
  );
  
  router.post('/support/simulate-error/:service', 
    protegerRuta, 
    requierePermiso('acciones_soporte'), 
    SupportController.simulateRealError
  );
} else {
  console.log('🚀 Modo producción: Rutas de prueba deshabilitadas');
}

export default router;