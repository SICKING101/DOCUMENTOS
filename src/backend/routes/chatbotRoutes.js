// ============================================================
// chatbotRoutes.js — Rutas del chatbot ARIA v4.0
// CBTIS051 — Incluye endpoint de diagnóstico para debug
// ============================================================

import express from 'express';
import { protegerRuta } from '../middleware/auth.js';
import ChatbotController from '../controllers/chatbotController.js';

const router = express.Router();

// ─── Autenticación requerida en todas las rutas ───────────────
router.use(protegerRuta);

// ─── Procesar mensaje (motor IA principal) ────────────────────
// POST /api/chatbot/message
// Body: { message: string }
router.post('/message', (req, res) => ChatbotController.processMessage(req, res));

// ─── Estadísticas del sistema ─────────────────────────────────
// GET /api/chatbot/stats
router.get('/stats', (req, res) => ChatbotController.getSystemStats(req, res));

// ─── Historial de conversación ────────────────────────────────
// GET /api/chatbot/history?limit=20
router.get('/history', (req, res) => ChatbotController.getHistory(req, res));

// ─── Borrar historial del usuario ────────────────────────────
// DELETE /api/chatbot/history
router.delete('/history', (req, res) => ChatbotController.clearHistory(req, res));

// 🆕 Cambiar tema (sincronizado con backend)
router.post('/theme', (req, res) => ChatbotController.setTheme(req, res));

// ─── Feedback de utilidad (👍 / 👎) ─────────────────────────
// PATCH /api/chatbot/feedback
// Body: { conversationId: string, util: boolean }
router.patch('/feedback', (req, res) => ChatbotController.submitFeedback(req, res));

// ─── Diagnóstico (solo desarrollo) ───────────────────────────
// GET /api/chatbot/diagnostics
// Revela schema de Task detectado, stats de BD, etc.
if (process.env.NODE_ENV === 'development') {
    router.get('/diagnostics', (req, res) => ChatbotController.getDiagnostics(req, res));
    console.log('🧪 [ARIA] Ruta /api/chatbot/diagnostics habilitada (desarrollo)');
}

export default router;