// src/backend/routes/chatbotRoutes.js
const express = require('express');
const router = express.Router();
const chatbotController = require('../controllers/chatbotController');
const { authenticate } = require('../middleware/auth');

// Todas las rutas requieren autenticación
router.use(authenticate);

// Procesar mensaje del chatbot
router.post('/message', chatbotController.processMessage.bind(chatbotController));

// Obtener estadísticas del sistema
router.get('/stats', chatbotController.getSystemStats.bind(chatbotController));

// Búsqueda semántica
router.post('/search', chatbotController.semanticSearch.bind(chatbotController));

module.exports = router;