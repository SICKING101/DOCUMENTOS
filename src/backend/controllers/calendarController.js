// src/backend/controllers/calendarController.js
// =============================================================================
// CONTROLADOR DE EVENTOS DE CALENDARIO
// =============================================================================

import CalendarEvent from '../models/CalendarEvent.js';

const DEBUG = true;
function clog(...args) { if (DEBUG) console.log('📅 [CalendarController]', ...args); }

class CalendarController {

  // ===========================================================================
  // 1. OBTENER TODOS LOS EVENTOS DEL USUARIO/ESCUELA
  // ===========================================================================

  static async getAll(req, res) {
    try {
      clog('GET /calendar/events - Obteniendo eventos...');
      const { desde, hasta } = req.query;

      const query = { activo: true };

      // Filtrar por escuela
      if (req.schoolId) {
        query.schoolId = req.schoolId;
      }

      // Filtro de rango de fechas (opcional)
      if (desde || hasta) {
        query.fecha = {};
        if (desde) query.fecha.$gte = new Date(desde);
        if (hasta) query.fecha.$lte = new Date(hasta);
      }

      const eventos = await CalendarEvent.find(query)
        .sort({ fecha: 1 })
        .lean();

      clog(`✅ ${eventos.length} eventos obtenidos`);

      res.json({
        success: true,
        events: eventos,
        count: eventos.length
      });
    } catch (error) {
      console.error('❌ [CalendarController] getAll:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener eventos',
        error: error.message
      });
    }
  }

  // ===========================================================================
  // 2. CREAR EVENTO (upsert por localId para evitar duplicados)
  // ===========================================================================

  static async create(req, res) {
    try {
      clog('POST /calendar/events - Creando evento...');

      const {
        localId,
        seriesId,
        titulo,
        tipo,
        prioridad,
        color,
        fecha,
        fechaFin,
        horaInicio,
        horaFin,
        ubicacion,
        descripcion,
        recurrencia,
        recordatorio
      } = req.body;

      if (!localId) {
        return res.status(400).json({ success: false, message: 'localId es obligatorio' });
      }
      if (!titulo || !titulo.trim()) {
        return res.status(400).json({ success: false, message: 'El título es obligatorio' });
      }
      if (!fecha) {
        return res.status(400).json({ success: false, message: 'La fecha es obligatoria' });
      }

      const schoolId = req.schoolId || null;
      const creadoPor = req.user?.usuario || req.user?.id || 'sistema';

      // Upsert: si ya existe con ese localId en esa escuela, actualizar; si no, crear
      const evento = await CalendarEvent.findOneAndUpdate(
        { localId, schoolId },
        {
          $set: {
            localId,
            seriesId: seriesId || localId,
            titulo: titulo.trim(),
            tipo: tipo || 'academic',
            prioridad: prioridad || 'normal',
            color: color || '#6366f1',
            fecha: new Date(fecha),
            fechaFin: fechaFin ? new Date(fechaFin) : null,
            horaInicio: horaInicio || null,
            horaFin: horaFin || null,
            ubicacion: ubicacion || '',
            descripcion: descripcion || '',
            recurrencia: recurrencia || 'none',
            recordatorio: recordatorio || '',
            recordatorio_enviado: false, // Reset al crear/actualizar
            creadoPor,
            schoolId,
            activo: true
          }
        },
        { upsert: true, new: true, runValidators: true }
      );

      clog(`✅ Evento guardado: "${evento.titulo}" (ID: ${evento._id})`);

      res.json({
        success: true,
        message: 'Evento guardado correctamente',
        event: evento
      });
    } catch (error) {
      console.error('❌ [CalendarController] create:', error);
      if (error.name === 'ValidationError') {
        return res.status(400).json({
          success: false,
          message: 'Error de validación: ' + Object.values(error.errors).map(e => e.message).join(', ')
        });
      }
      res.status(500).json({
        success: false,
        message: 'Error al crear evento',
        error: error.message
      });
    }
  }

  // ===========================================================================
  // 3. ACTUALIZAR EVENTO POR localId
  // ===========================================================================

  static async update(req, res) {
    try {
      const { localId } = req.params;
      clog(`PUT /calendar/events/${localId} - Actualizando...`);

      const schoolId = req.schoolId || null;
      const query = { localId };
      if (schoolId) query.schoolId = schoolId;

      const {
        titulo,
        tipo,
        prioridad,
        color,
        fecha,
        fechaFin,
        horaInicio,
        horaFin,
        ubicacion,
        descripcion,
        recurrencia,
        recordatorio,
        seriesId
      } = req.body;

      const updateData = {};
      if (titulo !== undefined)       updateData.titulo = titulo.trim();
      if (tipo !== undefined)         updateData.tipo = tipo;
      if (prioridad !== undefined)    updateData.prioridad = prioridad;
      if (color !== undefined)        updateData.color = color;
      if (fecha !== undefined)        updateData.fecha = new Date(fecha);
      if (fechaFin !== undefined)     updateData.fechaFin = fechaFin ? new Date(fechaFin) : null;
      if (horaInicio !== undefined)   updateData.horaInicio = horaInicio;
      if (horaFin !== undefined)      updateData.horaFin = horaFin;
      if (ubicacion !== undefined)    updateData.ubicacion = ubicacion;
      if (descripcion !== undefined)  updateData.descripcion = descripcion;
      if (recurrencia !== undefined)  updateData.recurrencia = recurrencia;
      if (seriesId !== undefined)     updateData.seriesId = seriesId;

      // Si cambia el recordatorio, reset del flag de enviado
      if (recordatorio !== undefined) {
        updateData.recordatorio = recordatorio;
        updateData.recordatorio_enviado = false;
      }

      const evento = await CalendarEvent.findOneAndUpdate(
        query,
        { $set: updateData },
        { new: true, runValidators: true }
      );

      if (!evento) {
        return res.status(404).json({ success: false, message: 'Evento no encontrado' });
      }

      clog(`✅ Evento actualizado: "${evento.titulo}"`);
      res.json({ success: true, message: 'Evento actualizado', event: evento });
    } catch (error) {
      console.error('❌ [CalendarController] update:', error);
      res.status(500).json({
        success: false,
        message: 'Error al actualizar evento',
        error: error.message
      });
    }
  }

  // ===========================================================================
  // 4. ELIMINAR EVENTO POR localId
  // ===========================================================================

  static async delete(req, res) {
    try {
      const { localId } = req.params;
      clog(`DELETE /calendar/events/${localId}`);

      const schoolId = req.schoolId || null;
      const query = { localId };
      if (schoolId) query.schoolId = schoolId;

      const evento = await CalendarEvent.findOneAndUpdate(
        query,
        { $set: { activo: false } },
        { new: true }
      );

      if (!evento) {
        // No es error crítico si no existe (puede ser que nunca se sincronizó)
        clog(`⚠️ Evento ${localId} no encontrado para eliminar (posiblemente no sincronizado)`);
        return res.json({ success: true, message: 'Evento no encontrado, ignorado' });
      }

      clog(`✅ Evento eliminado: "${evento.titulo}"`);
      res.json({ success: true, message: 'Evento eliminado' });
    } catch (error) {
      console.error('❌ [CalendarController] delete:', error);
      res.status(500).json({
        success: false,
        message: 'Error al eliminar evento',
        error: error.message
      });
    }
  }

  // ===========================================================================
  // 5. ELIMINAR SERIE COMPLETA POR seriesId
  // ===========================================================================

  static async deleteSeries(req, res) {
    try {
      const { seriesId } = req.params;
      clog(`DELETE /calendar/events/series/${seriesId}`);

      const schoolId = req.schoolId || null;
      const query = { seriesId };
      if (schoolId) query.schoolId = schoolId;

      const resultado = await CalendarEvent.updateMany(query, { $set: { activo: false } });

      clog(`✅ Serie eliminada: ${resultado.modifiedCount} eventos`);
      res.json({
        success: true,
        message: `Serie eliminada: ${resultado.modifiedCount} eventos`,
        count: resultado.modifiedCount
      });
    } catch (error) {
      console.error('❌ [CalendarController] deleteSeries:', error);
      res.status(500).json({
        success: false,
        message: 'Error al eliminar serie',
        error: error.message
      });
    }
  }

  // ===========================================================================
  // 6. ACTUALIZAR SERIE COMPLETA POR seriesId
  // ===========================================================================

  static async updateSeries(req, res) {
    try {
      const { seriesId } = req.params;
      clog(`PUT /calendar/events/series/${seriesId}`);

      const schoolId = req.schoolId || null;
      const query = { seriesId, activo: true };
      if (schoolId) query.schoolId = schoolId;

      const {
        titulo,
        tipo,
        prioridad,
        color,
        horaInicio,
        horaFin,
        ubicacion,
        descripcion,
        recordatorio
      } = req.body;

      const updateData = {};
      if (titulo !== undefined)       updateData.titulo = titulo.trim();
      if (tipo !== undefined)         updateData.tipo = tipo;
      if (prioridad !== undefined)    updateData.prioridad = prioridad;
      if (color !== undefined)        updateData.color = color;
      if (horaInicio !== undefined)   updateData.horaInicio = horaInicio;
      if (horaFin !== undefined)      updateData.horaFin = horaFin;
      if (ubicacion !== undefined)    updateData.ubicacion = ubicacion;
      if (descripcion !== undefined)  updateData.descripcion = descripcion;
      if (recordatorio !== undefined) {
        updateData.recordatorio = recordatorio;
        updateData.recordatorio_enviado = false;
      }

      const resultado = await CalendarEvent.updateMany(query, { $set: updateData });

      clog(`✅ Serie actualizada: ${resultado.modifiedCount} eventos`);
      res.json({
        success: true,
        message: `Serie actualizada: ${resultado.modifiedCount} eventos`,
        count: resultado.modifiedCount
      });
    } catch (error) {
      console.error('❌ [CalendarController] updateSeries:', error);
      res.status(500).json({
        success: false,
        message: 'Error al actualizar serie',
        error: error.message
      });
    }
  }

  // ===========================================================================
  // 7. FORZAR VERIFICACIÓN DE RECORDATORIOS (Debug)
  // ===========================================================================

  static async forceReminders(req, res) {
    try {
      clog('🔧 Verificación forzada de recordatorios solicitada');
      const ReminderService = (await import('../services/reminderService.js')).default;
      await ReminderService.forceCheck();
      res.json({ success: true, message: 'Verificación completada' });
    } catch (error) {
      console.error('❌ [CalendarController] forceReminders:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
}

export default CalendarController;