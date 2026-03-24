// src/backend/routes/suggestionRoutes.js
import express from 'express';
import {
    createSuggestion,
    getMySuggestions,
    getSuggestionStats
} from '../controllers/suggestionController.js';
import { protegerRuta } from '../middleware/auth.js';

const router = express.Router();

// =============================================================================
// RUTAS PÚBLICAS
// =============================================================================

// Estadísticas públicas
router.get('/stats', getSuggestionStats);

// =============================================================================
// RUTAS PROTEGIDAS (requieren autenticación)
// =============================================================================

// Aplicar middleware de autenticación
router.use(protegerRuta);

// Crear sugerencia
router.post('/', createSuggestion);

// Ver mis sugerencias
router.get('/my', getMySuggestions);

export default router;