import express from 'express';
import { 
    requestAdminChange,
    verifyAdminChangeToken,
    confirmAdminChange,
    rejectAdminChange,
    getPendingRequests,
    getRequestStatus,
    testAdminChange,
    debugPasswordStorage,
    createUserWithRole,
    getUsers,
    updateUser,
    reactivateUser, 
    deleteUserPermanently,
    deactivateUser
} from '../controllers/adminController.js';
import { protegerRuta, soloAdministrador, inyectarSchoolId } from '../middleware/auth.js';

// ═══════════════════════════════════════════════════════════════
// NUEVO: Importar middleware de verificación de sistema
// ═══════════════════════════════════════════════════════════════
import verificarAccesoSistema from '../middleware/systemAccess.js';

const router = express.Router();

// =============================================================================
// RUTAS PROTEGIDAS (con verificación de sistema cerrado)
// =============================================================================

// AGREGAR verificarAccesoSistema a TODAS las rutas protegidas
router.post('/request-change', protegerRuta, verificarAccesoSistema, soloAdministrador, requestAdminChange);
router.get('/pending-requests', protegerRuta, verificarAccesoSistema, soloAdministrador, getPendingRequests);

// Crear usuarios con rol - SOLO ADMIN
router.post('/users', protegerRuta, verificarAccesoSistema, inyectarSchoolId, soloAdministrador, createUserWithRole);

// Listar usuarios - SOLO ADMIN
router.get('/users', protegerRuta, verificarAccesoSistema, inyectarSchoolId, soloAdministrador, getUsers);

// ACTUALIZAR usuario - SOLO ADMIN
router.patch('/users/:id', protegerRuta, verificarAccesoSistema, inyectarSchoolId, soloAdministrador, updateUser);

// DESACTIVAR usuario - SOLO ADMIN
router.patch('/users/:id/deactivate', protegerRuta, verificarAccesoSistema, soloAdministrador, deactivateUser);

// REACTIVAR usuario - SOLO ADMIN
router.patch('/users/:id/reactivate', protegerRuta, verificarAccesoSistema, soloAdministrador, reactivateUser);

// ELIMINAR PERMANENTEMENTE usuario - SOLO ADMIN
router.delete('/users/:id', protegerRuta, verificarAccesoSistema, soloAdministrador, deleteUserPermanently);

// =============================================================================
// RUTAS PÚBLICAS (sin verificación de sistema - son para cambio de contraseña)
// =============================================================================

router.get('/verify-token/:token', verifyAdminChangeToken);
router.post('/confirm-change', confirmAdminChange);
router.post('/reject-change', rejectAdminChange);

// =============================================================================
// RUTAS DE DIAGNÓSTICO Y DEBUG (con verificación)
// =============================================================================

router.get('/request-status/:requestId', protegerRuta, verificarAccesoSistema, getRequestStatus);
router.get('/test', testAdminChange);
router.get('/debug/:requestId', protegerRuta, verificarAccesoSistema, debugPasswordStorage);

export default router;