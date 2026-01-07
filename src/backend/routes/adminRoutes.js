import express from 'express';
import { 
    requestAdminChange,
    verifyAdminChangeToken,
    confirmAdminChange,
    rejectAdminChange,        // ← NUEVO (reemplaza cancelAdminChange)
    getPendingRequests,
    getRequestStatus,
    testAdminChange
} from '../controllers/adminController.js';
import { protegerRuta, soloAdministrador } from '../middleware/auth.js';

const router = express.Router();

// =============================================================================
// RUTAS PROTEGIDAS (requieren autenticación y ser administrador)
// =============================================================================

// Solicitar cambio de administrador
router.post('/request-change', protegerRuta, soloAdministrador, requestAdminChange);

// Obtener solicitudes pendientes del administrador actual
router.get('/pending-requests', protegerRuta, soloAdministrador, getPendingRequests);

// =============================================================================
// RUTAS PÚBLICAS (accesibles desde emails)
// =============================================================================

// Verificar token de cambio (para el admin actual desde el email)
router.get('/verify-token/:token', verifyAdminChangeToken);

// Confirmar cambio de administrador (acción del admin actual)
router.post('/confirm-change', confirmAdminChange);

// Rechazar cambio de administrador (acción del admin actual)
router.post('/reject-change', rejectAdminChange);

// =============================================================================
// RUTAS DE DIAGNÓSTICO Y VERIFICACIÓN
// =============================================================================

// Verificar estado de solicitud
router.get('/request-status/:requestId', getRequestStatus);

// Endpoint de prueba
router.get('/test', testAdminChange);

export default router;