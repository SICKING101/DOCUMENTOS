import express from 'express';
import { 
    requestAdminChange,
    verifyAdminChangeToken,
    confirmAdminChange,
    rejectAdminChange,
    getPendingRequests,
    getRequestStatus,
    testAdminChange,
    debugPasswordStorage  // NUEVO
} from '../controllers/adminController.js';
import { protegerRuta, soloAdministrador } from '../middleware/auth.js';

const router = express.Router();

// =============================================================================
// RUTAS PROTEGIDAS
// =============================================================================

router.post('/request-change', protegerRuta, soloAdministrador, requestAdminChange);
router.get('/pending-requests', protegerRuta, soloAdministrador, getPendingRequests);

// =============================================================================
// RUTAS PÚBLICAS
// =============================================================================

router.get('/verify-token/:token', verifyAdminChangeToken);
router.post('/confirm-change', confirmAdminChange);
router.post('/reject-change', rejectAdminChange);

// =============================================================================
// RUTAS DE DIAGNÓSTICO Y DEBUG
// =============================================================================

router.get('/request-status/:requestId', getRequestStatus);
router.get('/test', testAdminChange);
router.get('/debug/:requestId', debugPasswordStorage);  // NUEVO

export default router;