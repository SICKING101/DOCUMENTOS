import express from 'express';
import { 
    requestAdminChange,
    verifyAdminChangeToken,
    confirmAdminChange,
    rejectAdminChange,
    getPendingRequests,
    getRequestStatus,
    testAdminChange,
    debugPasswordStorage
} from '../controllers/adminController.js';
import { protegerRuta, soloAdministrador } from '../middleware/auth.js';

const router = express.Router();

// ============================================================================
// SECCIÓN: RUTAS DE CAMBIO DE ADMINISTRADOR
// ============================================================================
// Este archivo define las rutas Express para gestionar el proceso de
// transferencia de privilegios administrativos. Incluye rutas protegidas
// para administradores actuales, rutas públicas para verificación de tokens
// y rutas de diagnóstico para desarrollo y solución de problemas.
// ============================================================================

// ********************************************************************
// MÓDULO 1: RUTAS PROTEGIDAS - REQUIEREN AUTENTICACIÓN ADMIN
// ********************************************************************
// Descripción: Rutas accesibles únicamente por administradores autenticados
// que están actualmente en el sistema. Estas rutas inician el proceso de
// transferencia y permiten monitorear solicitudes pendientes.
// ********************************************************************

// ----------------------------------------------------------------
// BLOQUE 1.1: Solicitud de cambio de administrador
// ----------------------------------------------------------------
// Endpoint para que un administrador actual inicie el proceso formal de
// transferencia de sus privilegios a un nuevo administrador.
// Método: POST
// Autenticación: Requiere token JWT válido con rol 'administrador'
// Body: Contiene información del nuevo administrador y contraseña propuesta
router.post('/request-change', protegerRuta, soloAdministrador, requestAdminChange);

// ----------------------------------------------------------------
// BLOQUE 1.2: Listado de solicitudes pendientes
// ----------------------------------------------------------------
// Endpoint para obtener todas las solicitudes de cambio de administrador
// que están actualmente pendientes de confirmación.
// Método: GET
// Autenticación: Requiere token JWT válido con rol 'administrador'
// Respuesta: Array de solicitudes con detalles de estado y tiempos
router.get('/pending-requests', protegerRuta, soloAdministrador, getPendingRequests);

// ********************************************************************
// MÓDULO 2: RUTAS PÚBLICAS - ACCESO SIN AUTENTICACIÓN
// ********************************************************************
// Descripción: Rutas accesibles sin autenticación, diseñadas para ser
// utilizadas durante el proceso de verificación por el nuevo administrador
// a través de enlaces enviados por email.
// ********************************************************************

// ----------------------------------------------------------------
// BLOQUE 2.1: Verificación de token de transferencia
// ----------------------------------------------------------------
// Endpoint para validar si un token de transferencia es válido y obtener
// información básica de la solicitud antes de proceder con la confirmación.
// Método: GET
// Parámetros: Token único en la URL
// Respuesta: Estado del token, información de la solicitud o error si es inválido
router.get('/verify-token/:token', verifyAdminChangeToken);

// ----------------------------------------------------------------
// BLOQUE 2.2: Confirmación de cambio de administrador
// ----------------------------------------------------------------
// Endpoint para que el nuevo administrador confirme y complete la
// transferencia de privilegios después de verificar el token.
// Método: POST
// Body: Token de confirmación y posiblemente información adicional
// Acción: Crea la cuenta del nuevo admin y desactiva al admin anterior
router.post('/confirm-change', confirmAdminChange);

// ----------------------------------------------------------------
// BLOQUE 2.3: Rechazo de cambio de administrador
// ----------------------------------------------------------------
// Endpoint para que el nuevo administrador rechace explícitamente la
// transferencia de privilegios si no desea asumir el rol.
// Método: POST
// Body: Token de confirmación
// Acción: Marca la solicitud como rechazada sin realizar cambios
router.post('/reject-change', rejectAdminChange);

// ********************************************************************
// MÓDULO 3: RUTAS DE DIAGNÓSTICO Y DEBUG
// ********************************************************************
// Descripción: Rutas diseñadas para desarrollo, pruebas y solución de
// problemas. Deben estar deshabilitadas o protegidas en producción,
// ya que exponen información sensible del sistema para diagnóstico.
// ********************************************************************

// ----------------------------------------------------------------
// BLOQUE 3.1: Consulta de estado específico de solicitud
// ----------------------------------------------------------------
// Endpoint para obtener el estado detallado de una solicitud específica
// usando su ID. Útil para debugging cuando el proceso no funciona como
// se espera.
// Método: GET
// Parámetros: ID de la solicitud en la URL
// Respuesta: Información completa incluyendo campos internos y metadatos
router.get('/request-status/:requestId', getRequestStatus);

// ----------------------------------------------------------------
// BLOQUE 3.2: Endpoint de prueba para el flujo completo
// ----------------------------------------------------------------
// Endpoint que simula o prueba componentes del proceso de cambio de
// administrador sin afectar datos reales. Solo para desarrollo.
// Método: GET
// Respuesta: Información de prueba o simulación del proceso
router.get('/test', testAdminChange);

// ----------------------------------------------------------------
// BLOQUE 3.3: Debug de almacenamiento de contraseñas
// ----------------------------------------------------------------
// Endpoint específico para diagnosticar problemas relacionados con el
// almacenamiento y manejo de contraseñas durante transferencias.
// Expone información sensible - ¡USAR SOLO EN DESARROLLO!
// Método: GET
// Parámetros: ID de la solicitud en la URL
// Respuesta: Información detallada sobre cómo se almacenó la contraseña
router.get('/debug/:requestId', debugPasswordStorage);

// ********************************************************************
// MÓDULO 4: EXPORTACIÓN DEL ROUTER
// ********************************************************************
// Descripción: Exporta el router configurado para su uso en la
// aplicación principal de Express, montando todas las rutas definidas
// bajo el prefijo correspondiente en server.js.
// ********************************************************************
export default router;