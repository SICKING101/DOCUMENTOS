// src/backend/routes/calendarRoutes.js
import express from 'express';
import CalendarController from '../controllers/calendarController.js';
import { protegerRuta, inyectarSchoolId } from '../middleware/auth.js';

const router = express.Router();

// Todos los endpoints de calendario requieren autenticación
router.use(protegerRuta);
router.use(inyectarSchoolId);

// GET  /api/calendar/events          — Obtener todos los eventos
router.get('/events', CalendarController.getAll);

// POST /api/calendar/events          — Crear/upsert evento
router.post('/events', CalendarController.create);

// PUT  /api/calendar/events/series/:seriesId — Actualizar serie completa
// ⚠️  DEBE IR ANTES de /:localId para evitar conflicto de rutas
router.put('/events/series/:seriesId', CalendarController.updateSeries);

// DELETE /api/calendar/events/series/:seriesId — Eliminar serie completa
router.delete('/events/series/:seriesId', CalendarController.deleteSeries);

// PUT    /api/calendar/events/:localId — Actualizar evento individual
router.put('/events/:localId', CalendarController.update);

// DELETE /api/calendar/events/:localId — Eliminar evento individual
router.delete('/events/:localId', CalendarController.delete);

// POST /api/calendar/reminders/force  — Forzar revisión de recordatorios (debug)
router.post('/reminders/force', CalendarController.forceReminders);

export default router;