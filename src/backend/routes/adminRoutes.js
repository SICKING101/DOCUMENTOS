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
import { protegerRuta, soloAdministrador } from '../middleware/auth.js';

const router = express.Router();

// =============================================================================
// RUTAS PROTEGIDAS
// =============================================================================

router.post('/request-change', protegerRuta, soloAdministrador, requestAdminChange);
router.get('/pending-requests', protegerRuta, soloAdministrador, getPendingRequests);

// Crear usuarios con rol - SOLO ADMIN
router.post('/users', protegerRuta, soloAdministrador, createUserWithRole);

// Listar usuarios - SOLO ADMIN
router.get('/users', protegerRuta, soloAdministrador, getUsers);

// ACTUALIZAR usuario - SOLO ADMIN
router.patch('/users/:id', protegerRuta, soloAdministrador, updateUser);

// PRIMERO LAS RUTAS ESPECÍFICAS (con sub-rutas)
// DESACTIVAR usuario - SOLO ADMIN
router.patch('/users/:id/deactivate', protegerRuta, soloAdministrador, deactivateUser);

// REACTIVAR usuario - SOLO ADMIN
router.patch('/users/:id/reactivate', protegerRuta, soloAdministrador, reactivateUser);

// LUEGO LA RUTA GENÉRICA DELETE
// ELIMINAR PERMANENTEMENTE usuario - SOLO ADMIN
router.delete('/users/:id', protegerRuta, soloAdministrador, deleteUserPermanently);

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
router.get('/debug/:requestId', debugPasswordStorage);

export default router;