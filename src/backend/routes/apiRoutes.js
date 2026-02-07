import express from 'express';
const router = express.Router();

// ============================================================================
// SECCIÓN: RUTAS PRINCIPALES DE LA API
// ============================================================================
// Este archivo centraliza y configura todas las rutas del sistema API.
// Organiza endpoints por módulo funcional (Dashboard, Personas, Documentos, etc.)
// y aplica middlewares de autenticación, autorización y subida de archivos
// según corresponda. También incluye rutas condicionales para desarrollo.
// ============================================================================

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
import { protegerRuta } from '../middleware/auth.js';

// Importar middleware de Multer
import upload from '../config/multerConfig.js';

// ********************************************************************
// MÓDULO 1: RUTAS DE SALUD Y DIAGNÓSTICO DEL SISTEMA
// ********************************************************************
// Descripción: Endpoints públicos o de bajo nivel para verificar el
// estado del servidor, diagnóstico básico y monitoreo de disponibilidad.
// ********************************************************************

// ----------------------------------------------------------------
// BLOQUE 1.1: Verificación de salud de la API
// ----------------------------------------------------------------
// Endpoint simple para comprobar que el servidor está funcionando
// y responder a solicitudes básicas. No requiere autenticación.
// Retorna estado HTTP 200 con información de timestamp cuando todo está bien.
router.get('/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'API funcionando correctamente',
    timestamp: new Date().toISOString()
  });
});

// ********************************************************************
// MÓDULO 2: DASHBOARD Y ESTADÍSTICAS
// ********************************************************************
// Descripción: Rutas para obtener métricas agregadas, resúmenes y
// datos estadísticos para alimentar paneles de control y dashboards.
// ********************************************************************

// ----------------------------------------------------------------
// BLOQUE 2.1: Obtener estadísticas del dashboard
// ----------------------------------------------------------------
// Proporciona datos consolidados de todos los módulos del sistema
// para mostrar en la pantalla principal de administración.
router.get('/dashboard', protegerRuta, DashboardController.getDashboardStats);

// ********************************************************************
// MÓDULO 3: GESTIÓN DE PERSONAS (CONTACTOS/EMPLEADOS)
// ********************************************************************
// Descripción: CRUD completo para gestión de personas en el sistema,
// incluyendo eliminación permanente (hard delete) y gestión de estado.
// ********************************************************************

// ----------------------------------------------------------------
// BLOQUE 3.1: Operaciones CRUD básicas para personas
// ----------------------------------------------------------------
router.get('/persons', protegerRuta, PersonController.getAll);
router.post('/persons', protegerRuta, PersonController.create);
router.put('/persons/:id', protegerRuta, PersonController.update);

// ----------------------------------------------------------------
// BLOQUE 3.2: Eliminación permanente de personas
// ----------------------------------------------------------------
// Elimina físicamente el registro de la base de datos (hard delete).
// Diferente del soft delete, esta operación es irreversible y elimina
// todos los datos asociados permanentemente.
router.delete('/persons/:id', protegerRuta, PersonController.delete);

// ----------------------------------------------------------------
// BLOQUE 3.3: Gestión de estado de personas (opcional)
// ----------------------------------------------------------------
// Endpoints alternativos para desactivar/reactivar personas sin
// eliminarlas permanentemente. Mantiene el registro pero cambia su
// estado de actividad.
router.patch('/persons/:id/deactivate', protegerRuta, PersonController.deactivate);
router.patch('/persons/:id/reactivate', protegerRuta, PersonController.reactivate);
router.get('/persons/inactive', protegerRuta, PersonController.getInactive);

// ********************************************************************
// MÓDULO 4: GESTIÓN DE CATEGORÍAS
// ********************************************************************
// Descripción: CRUD completo para categorías utilizadas para clasificar
// documentos, tickets y otros recursos del sistema.
// ********************************************************************

// ----------------------------------------------------------------
// BLOQUE 4.1: Operaciones CRUD para categorías
// ----------------------------------------------------------------
router.get('/categories', protegerRuta, CategoryController.getAll);
router.post('/categories', protegerRuta, CategoryController.create);
router.put('/categories/:id', protegerRuta, CategoryController.update);
router.delete('/categories/:id', protegerRuta, CategoryController.delete);

// ********************************************************************
// MÓDULO 5: GESTIÓN DE DEPARTAMENTOS
// ********************************************************************
// Descripción: CRUD completo para departamentos organizacionales
// que agrupan personas y recursos por área funcional.
// ********************************************************************

// ----------------------------------------------------------------
// BLOQUE 5.1: Operaciones CRUD para departamentos
// ----------------------------------------------------------------
router.get('/departments', protegerRuta, DepartmentController.getAll);
router.post('/departments', protegerRuta, DepartmentController.create);
router.put('/departments/:id', protegerRuta, DepartmentController.update);
router.delete('/departments/:id', protegerRuta, DepartmentController.delete);

// ********************************************************************
// MÓDULO 6: GESTIÓN DE DOCUMENTOS
// ********************************************************************
// Descripción: CRUD completo para documentos con funcionalidades
// especiales de subida de archivos, previsualización y descarga.
// ********************************************************************

// ----------------------------------------------------------------
// BLOQUE 6.1: Operaciones básicas de documentos
// ----------------------------------------------------------------
router.get('/documents', protegerRuta, DocumentController.getAll);
router.delete('/documents/:id', protegerRuta, DocumentController.delete);

// ----------------------------------------------------------------
// BLOQUE 6.2: Creación y actualización con subida de archivos
// ----------------------------------------------------------------
// Utiliza middleware Multer para manejar la subida de archivos
// junto con los metadatos del documento en una sola operación.
router.post('/documents', protegerRuta, upload.single('file'), DocumentController.create);
router.put('/documents/:id', protegerRuta, upload.single('file'), DocumentController.update);

// ----------------------------------------------------------------
// BLOQUE 6.3: Visualización y acceso a documentos
// ----------------------------------------------------------------
router.get('/documents/:id/preview', protegerRuta, DocumentController.preview);
router.get('/documents/:id/download', protegerRuta, DocumentController.download);
router.get('/documents/:id/content', protegerRuta, DocumentController.getContent);
router.get('/documents/:id/info', protegerRuta, DocumentController.getInfo);

// ********************************************************************
// MÓDULO 7: GESTIÓN DE TAREAS
// ********************************************************************
// Descripción: CRUD completo para tareas con endpoints especializados
// para gestión de estado, prioridades y consultas específicas.
// ********************************************************************

// ----------------------------------------------------------------
// BLOQUE 7.1: Operaciones CRUD básicas para tareas
// ----------------------------------------------------------------
router.get('/tasks', protegerRuta, TaskController.getAll);
router.post('/tasks', protegerRuta, TaskController.create);
router.put('/tasks/:id', protegerRuta, TaskController.update);
router.delete('/tasks/:id', protegerRuta, TaskController.delete);

// ----------------------------------------------------------------
// BLOQUE 7.2: Gestión especializada de estado de tareas
// ----------------------------------------------------------------
router.patch('/tasks/:id/status', protegerRuta, TaskController.updateStatus);

// ----------------------------------------------------------------
// BLOQUE 7.3: Consultas específicas y estadísticas de tareas
// ----------------------------------------------------------------
router.get('/tasks/stats', protegerRuta, TaskController.getStats);
router.get('/tasks/high-priority', protegerRuta, TaskController.getHighPriority);
router.get('/tasks/today', protegerRuta, TaskController.getTodayTasks);

// ********************************************************************
// MÓDULO 8: GENERACIÓN DE REPORTES
// ********************************************************************
// Descripción: Endpoints para exportar datos en diferentes formatos
// (Excel, PDF, CSV) para análisis externo o compartir información.
// ********************************************************************

// ----------------------------------------------------------------
// BLOQUE 8.1: Exportación de datos en múltiples formatos
// ----------------------------------------------------------------
router.post('/reports/excel', protegerRuta, ReportController.generateExcel);
router.post('/reports/pdf', protegerRuta, ReportController.generatePDF);
router.post('/reports/csv', protegerRuta, ReportController.generateCSV);

// ********************************************************************
// MÓDULO 9: GESTIÓN DE NOTIFICACIONES
// ********************************************************************
// Descripción: Endpoints para gestionar notificaciones del sistema,
// incluyendo marcado como leído, eliminación y estadísticas.
// ********************************************************************

// ----------------------------------------------------------------
// BLOQUE 9.1: Consulta y obtención de notificaciones
// ----------------------------------------------------------------
router.get('/notifications', protegerRuta, NotificationController.getAll);
router.get('/notifications/unread', protegerRuta, NotificationController.getUnread);
router.get('/notifications/stats', protegerRuta, NotificationController.getStats);

// ----------------------------------------------------------------
// BLOQUE 9.2: Gestión de estado de lectura de notificaciones
// ----------------------------------------------------------------
router.patch('/notifications/:id/read', protegerRuta, NotificationController.markAsRead);
router.patch('/notifications/read-all', protegerRuta, NotificationController.markAllAsRead);

// ----------------------------------------------------------------
// BLOQUE 9.3: Eliminación y mantenimiento de notificaciones
// ----------------------------------------------------------------
router.delete('/notifications/:id', protegerRuta, NotificationController.delete);
router.post('/notifications/cleanup', protegerRuta, NotificationController.cleanup);

// ********************************************************************
// MÓDULO 10: GESTIÓN DE PAPELERA (SOFT DELETE)
// ********************************************************************
// Descripción: Endpoints para manejar documentos en la papelera,
// incluyendo restauración, eliminación permanente y limpieza automática.
// ********************************************************************

// ----------------------------------------------------------------
// BLOQUE 10.1: Consulta y gestión de documentos en papelera
// ----------------------------------------------------------------
router.get('/trash', protegerRuta, TrashController.getTrashDocuments);
router.post('/trash/:id/restore', protegerRuta, TrashController.restoreDocument);
router.delete('/trash/:id', protegerRuta, TrashController.deletePermanently);

// ----------------------------------------------------------------
// BLOQUE 10.2: Operaciones masivas de papelera
// ----------------------------------------------------------------
router.post('/trash/empty-all', protegerRuta, TrashController.emptyTrash);
router.post('/trash/auto-cleanup', protegerRuta, TrashController.autoCleanup);

// ********************************************************************
// MÓDULO 11: SISTEMA DE SOPORTE Y TICKETS
// ********************************************************************
// Descripción: Endpoints para gestión de tickets de soporte,
// incluyendo creación con archivos adjuntos y diagnóstico del sistema.
// ********************************************************************

// ----------------------------------------------------------------
// BLOQUE 11.1: Creación de tickets con múltiples archivos adjuntos
// ----------------------------------------------------------------
// Permite hasta 10 archivos adjuntos por ticket usando Multer array.
router.post('/tickets', protegerRuta, upload.array('files', 10), SupportController.createTicket);

// ----------------------------------------------------------------
// BLOQUE 11.2: Diagnóstico y estado del sistema de soporte
// ----------------------------------------------------------------
router.get('/support/status', protegerRuta, SupportController.getSystemStatus);
router.get('/support/faq', protegerRuta, SupportController.getFAQ);
router.post('/support/test-email', protegerRuta, SupportController.testSupportEmail);

// ********************************************************************
// MÓDULO 12: RUTAS DE DESARROLLO (SOLO EN MODO DEV)
// ********************************************************************
// Descripción: Endpoints exclusivos para entorno de desarrollo que
// permiten probar y diagnosticar funcionalidades específicas del
// sistema de soporte y manejo de errores.
// ********************************************************************

// ----------------------------------------------------------------
// BLOQUE 12.1: Condicional para entorno de desarrollo
// ----------------------------------------------------------------
if (process.env.NODE_ENV === 'development') {
  console.log('🧪 Modo desarrollo activado: Habilitando rutas de prueba');
  
  // ----------------------------------------------------------------
  // SUB-BLOQUE 12.1.1: Activación y gestión de errores reales
  // ----------------------------------------------------------------
  router.post('/support/activate-errors', protegerRuta, SupportController.activateRealErrors);
  router.post('/support/reset-errors', protegerRuta, SupportController.resetRealErrors);
  router.post('/support/reset-all-errors', protegerRuta, SupportController.resetAllRealErrors);
  
  // ----------------------------------------------------------------
  // SUB-BLOQUE 12.1.2: Validación y simulación de errores
  // ----------------------------------------------------------------
  router.get('/support/validate-errors', protegerRuta, SupportController.validateSystemErrors);
  router.post('/support/simulate-error/:service', protegerRuta, SupportController.simulateRealError);
  
} else {
  console.log('🚀 Modo producción: Rutas de prueba deshabilitadas');
}

// ********************************************************************
// MÓDULO 13: EXPORTACIÓN DEL ROUTER
// ********************************************************************
// Descripción: Exporta el router configurado con todas las rutas
// para su montaje en la aplicación principal de Express.
// ********************************************************************
export default router;