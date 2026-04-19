// src/backend/routes/avisoRoutes.js
import express from 'express';
import avisoController from '../controllers/avisoController.js';
import { protegerRuta } from '../middleware/auth.js';
import { protegerSuperAdmin } from '../middleware/superAdminAuth.js';

const router = express.Router();

// ========== CLIENTE (usuarios normales) ==========
router.get('/vigentes', protegerRuta, avisoController.getAvisosVigentes);
router.get('/todos', protegerRuta, avisoController.getTodosVigentes);  // 🔥 CAMBIADO: protegerRuta en lugar de protegerSuperAdmin
router.patch('/:id/visto', protegerRuta, avisoController.marcarVisto);
router.patch('/visto/todos', protegerRuta, avisoController.marcarTodosVistos);

// ========== SUPER ADMIN ==========
router.get('/', protegerSuperAdmin, avisoController.getAllAvisos);
router.get('/:id', protegerSuperAdmin, avisoController.getAvisoById);
router.post('/', protegerSuperAdmin, avisoController.createAviso);
router.put('/:id', protegerSuperAdmin, avisoController.updateAviso);
router.delete('/:id', protegerSuperAdmin, avisoController.deleteAviso);

export default router;