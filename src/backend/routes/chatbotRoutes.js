// ============================================================
// chatbotRoutes.js — Rutas del chatbot ARIA v3.0
// Usa ES Modules (import/export) — consistente con el proyecto
// ============================================================

import express from 'express';
import { protegerRuta } from '../middleware/auth.js';
import ChatbotController from '../controllers/chatbotController.js';

const router = express.Router();

// ─── Todas las rutas requieren autenticación ──────────────────
router.use(protegerRuta);

// ─── Procesar mensaje ─────────────────────────────────────────
// POST /api/chatbot/message
// Body: { message: string }
router.post('/message', (req, res) => ChatbotController.processMessage(req, res));

// ─── Estadísticas del sistema ─────────────────────────────────
// GET /api/chatbot/stats
router.get('/stats', (req, res) => ChatbotController.getSystemStats(req, res));

// ─── Historial de conversación ────────────────────────────────
// GET /api/chatbot/history?limit=20
router.get('/history', (req, res) => ChatbotController.getHistory(req, res));

// ─── Borrar historial ─────────────────────────────────────────
// DELETE /api/chatbot/history
router.delete('/history', (req, res) => ChatbotController.clearHistory(req, res));

// ─── Feedback de utilidad ─────────────────────────────────────
// PATCH /api/chatbot/feedback
// Body: { conversationId: string, util: boolean }
router.patch('/feedback', (req, res) => ChatbotController.submitFeedback(req, res));

export default router;