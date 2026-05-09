import express from 'express';
import { protegerRuta } from '../middleware/auth.js';
import * as settingsController from '../controllers/settingsController.js';

const router = express.Router();

// GET - Obtener ajustes del usuario
router.get('/', protegerRuta, settingsController.getSettings);

// PUT - Guardar/actualizar ajustes completos
router.put('/', protegerRuta, settingsController.updateSettings);

// PATCH - Actualizar un ajuste específico
router.patch('/:key', protegerRuta, settingsController.updateSetting);

export default router;