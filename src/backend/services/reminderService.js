// src/backend/services/reminderService.js
// =============================================================================
// SERVICIO DE RECORDATORIOS — Verifica tareas y eventos cada hora
// =============================================================================

import Task from '../models/Task.js';
import CalendarEvent from '../models/CalendarEvent.js';
import NotificationService from './notificationService.js';

const DEBUG = true;
function rlog(...args) { if (DEBUG) console.log('⏰ [ReminderService]', ...args); }

class ReminderService {

  static _interval = null;
  static CHECK_INTERVAL_MS = 60 * 60 * 1000; // cada hora
  static _isRunning = false;

  // ===========================================================================
  // INICIO Y PARADA DEL SERVICIO
  // ===========================================================================

  static start() {
    if (this._interval) {
      rlog('Ya está corriendo, ignorando start()');
      return;
    }
    rlog('🚀 Iniciando servicio de recordatorios (intervalo: 1 hora)');

    // Ejecutar inmediatamente al iniciar
    this.runChecks();

    // Luego cada hora
    this._interval = setInterval(() => {
      this.runChecks();
    }, this.CHECK_INTERVAL_MS);

    rlog('✅ Servicio iniciado correctamente');
  }

  static stop() {
    if (this._interval) {
      clearInterval(this._interval);
      this._interval = null;
      rlog('🛑 Servicio detenido');
    }
  }

  // ===========================================================================
  // EJECUCIÓN PRINCIPAL
  // ===========================================================================

  static async runChecks() {
    if (this._isRunning) {
      rlog('⚠️ Ya hay una verificación en progreso, saltando...');
      return;
    }
    this._isRunning = true;
    rlog(`📋 Iniciando verificación de recordatorios [${new Date().toLocaleString('es-MX')}]`);

    try {
      const [tareasResult, calendarioResult] = await Promise.allSettled([
        this.checkTaskReminders(),
        this.checkCalendarReminders()
      ]);

      if (tareasResult.status === 'rejected') {
        console.error('❌ [ReminderService] Error en tareas:', tareasResult.reason);
      }
      if (calendarioResult.status === 'rejected') {
        console.error('❌ [ReminderService] Error en calendario:', calendarioResult.reason);
      }

      rlog('✅ Verificación completada');
    } catch (err) {
      console.error('❌ [ReminderService] Error general:', err);
    } finally {
      this._isRunning = false;
    }
  }

  // ===========================================================================
  // VERIFICACIÓN DE TAREAS
  // ===========================================================================

  /**
   * Busca tareas con recordatorio=true que venzan en las próximas 25 horas
   * y cuyo recordatorio no haya sido enviado aún.
   */
  static async checkTaskReminders() {
    const ahora = new Date();
    // Ventana: desde ahora hasta dentro de 25 horas (1h de tolerancia para el intervalo)
    const limite = new Date(ahora.getTime() + 25 * 60 * 60 * 1000);

    rlog(`🔍 Buscando tareas pendientes entre ${ahora.toISOString()} y ${limite.toISOString()}`);

    const tareasPendientes = await Task.find({
      activo: true,
      recordatorio: true,
      recordatorio_enviado: false,
      estado: { $nin: ['completada', 'cancelada'] },
      fecha_limite: {
        $gte: ahora,
        $lte: limite
      }
    }).lean();

    rlog(`📌 Tareas encontradas con recordatorio pendiente: ${tareasPendientes.length}`);

    let enviados = 0;
    let errores = 0;

    for (const tarea of tareasPendientes) {
      try {
        // Crear notificación
        await NotificationService.tareaRecordatorio(tarea);

        // Marcar como enviado para no volver a notificar
        await Task.findByIdAndUpdate(tarea._id, { recordatorio_enviado: true });

        rlog(`✅ Recordatorio enviado para tarea: "${tarea.titulo}" (ID: ${tarea._id})`);
        enviados++;
      } catch (err) {
        console.error(`❌ [ReminderService] Error procesando tarea ${tarea._id}:`, err.message);
        errores++;
      }
    }

    rlog(`📊 Recordatorios de tareas: ${enviados} enviados, ${errores} errores`);
    return { enviados, errores };
  }

  // ===========================================================================
  // VERIFICACIÓN DE CALENDARIO (CORREGIDO - DÍAS NATURALES)
  // ===========================================================================

  /**
   * Busca eventos de calendario con recordatorio '1d' o '3d'
   * usando DÍAS NATURALES (sin importar la hora exacta).
   * 
   * Recordatorio 1d: el evento es MAÑANA (cualquier hora de mañana)
   * Recordatorio 3d: el evento es en 3 DÍAS (cualquier hora de ese día)
   */
  static async checkCalendarReminders() {
    const ahora = new Date();
    rlog(`🔍 Buscando eventos de calendario con recordatorio pendiente`);
    rlog(`   Fecha actual: ${ahora.toISOString()}`);

    // ─── DÍA NATURAL: mañana (00:00 a 23:59) ───
    const mananaInicio = new Date(ahora);
    mananaInicio.setDate(mananaInicio.getDate() + 1);
    mananaInicio.setHours(0, 0, 0, 0);
    
    const mananaFin = new Date(mananaInicio);
    mananaFin.setHours(23, 59, 59, 999);

    // ─── DÍA NATURAL: en 3 días (00:00 a 23:59) ───
    const en3DiasInicio = new Date(ahora);
    en3DiasInicio.setDate(en3DiasInicio.getDate() + 3);
    en3DiasInicio.setHours(0, 0, 0, 0);
    
    const en3DiasFin = new Date(en3DiasInicio);
    en3DiasFin.setHours(23, 59, 59, 999);

    rlog(`   Ventana 1d: ${mananaInicio.toISOString()} → ${mananaFin.toISOString()}`);
    rlog(`   Ventana 3d: ${en3DiasInicio.toISOString()} → ${en3DiasFin.toISOString()}`);

    const [eventos1d, eventos3d] = await Promise.all([
      CalendarEvent.find({
        activo: true,
        recordatorio: '1d',
        recordatorio_enviado: false,
        fecha: { $gte: mananaInicio, $lte: mananaFin }
      }).lean(),
      CalendarEvent.find({
        activo: true,
        recordatorio: '3d',
        recordatorio_enviado: false,
        fecha: { $gte: en3DiasInicio, $lte: en3DiasFin }
      }).lean()
    ]);

    rlog(`📅 Eventos con recordatorio 1d (mañana): ${eventos1d.length}`);
    if (eventos1d.length > 0) {
      eventos1d.forEach(e => rlog(`   - "${e.titulo}" | fecha: ${e.fecha} | recordatorio: ${e.recordatorio}`));
    }
    
    rlog(`📅 Eventos con recordatorio 3d (en 3 días): ${eventos3d.length}`);
    if (eventos3d.length > 0) {
      eventos3d.forEach(e => rlog(`   - "${e.titulo}" | fecha: ${e.fecha} | recordatorio: ${e.recordatorio}`));
    }

    let enviados = 0;
    let errores = 0;

    // Procesar recordatorios de 1 día
    for (const evento of eventos1d) {
      try {
        await NotificationService.calendarioRecordatorio(evento, 1);
        await CalendarEvent.findByIdAndUpdate(evento._id, { recordatorio_enviado: true });
        rlog(`✅ Recordatorio 1d enviado para evento: "${evento.titulo}"`);
        enviados++;
      } catch (err) {
        console.error(`❌ [ReminderService] Error en evento 1d ${evento._id}:`, err.message);
        errores++;
      }
    }

    // Procesar recordatorios de 3 días
    for (const evento of eventos3d) {
      try {
        await NotificationService.calendarioRecordatorio(evento, 3);
        await CalendarEvent.findByIdAndUpdate(evento._id, { recordatorio_enviado: true });
        rlog(`✅ Recordatorio 3d enviado para evento: "${evento.titulo}"`);
        enviados++;
      } catch (err) {
        console.error(`❌ [ReminderService] Error en evento 3d ${evento._id}:`, err.message);
        errores++;
      }
    }

    rlog(`📊 Recordatorios de calendario: ${enviados} enviados, ${errores} errores`);
    return { enviados, errores };
  }

  // ===========================================================================
  // EJECUCIÓN MANUAL (para debugging y endpoint de fuerza)
  // ===========================================================================

  static async forceCheck() {
    rlog('🔧 Verificación forzada iniciada');
    return await this.runChecks();
  }
}

export default ReminderService;