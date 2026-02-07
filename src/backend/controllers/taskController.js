import mongoose from 'mongoose';
import Task from '../models/Task.js';

// ============================================================================
// SECCIÓN: CONTROLADOR DE TAREAS
// ============================================================================
// Este archivo maneja todas las operaciones relacionadas con la gestión de tareas.
// Incluye funcionalidades CRUD completas, cambio de estados, estadísticas
// y consultas especializadas para dashboards y reportes.
// ============================================================================

class TaskController {
  
  // ********************************************************************
  // MÓDULO 1: OBTENCIÓN DE TODAS LAS TAREAS ACTIVAS
  // ********************************************************************
  // Descripción: Obtiene la lista completa de tareas activas ordenadas
  // por fecha de creación descendente (más recientes primero). Usa lean()
  // para mejorar el rendimiento al devolver objetos JavaScript simples.
  // ********************************************************************
  static async getAll(req, res) {
    try {
      // ----------------------------------------------------------------
      // BLOQUE 1.1: Consulta de tareas activas ordenadas
      // ----------------------------------------------------------------
      // Busca todas las tareas con activo=true y las ordena por
      // fecha_creacion en orden descendente (-1) para mostrar primero
      // las más recientes. Lean() devuelve objetos planos en lugar de
      // documentos Mongoose, lo que mejora el rendimiento.
      const tasks = await Task.find({ activo: true })
        .sort({ fecha_creacion: -1 })
        .lean();

      // ----------------------------------------------------------------
      // BLOQUE 1.2: Respuesta con estructura simple
      // ----------------------------------------------------------------
      res.json({ 
        success: true, 
        tasks 
      });
      
    } catch (error) {
      console.error('Error obteniendo tareas:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error al obtener tareas' 
      });
    }
  }

  // ********************************************************************
  // MÓDULO 2: CREACIÓN DE NUEVA TAREA
  // ********************************************************************
  // Descripción: Crea una nueva tarea en el sistema con validación de
  // campo obligatorio (título) y valores por defecto para campos opcionales.
  // Permite configurar prioridad, estado, categorías, recordatorios y fechas.
  // ********************************************************************
  static async create(req, res) {
    try {
      const { 
        titulo, 
        descripcion, 
        prioridad, 
        estado, 
        categoria, 
        recordatorio, 
        fecha_limite, 
        hora_limite 
      } = req.body;

      // ----------------------------------------------------------------
      // BLOQUE 2.1: Validación de título obligatorio
      // ----------------------------------------------------------------
      // Verifica que el campo mínimo necesario (título) esté presente.
      // Sin título, la tarea no tendría identificación clara.
      if (!titulo) {
        return res.status(400).json({ 
          success: false, 
          message: 'El título es obligatorio' 
        });
      }

      // ----------------------------------------------------------------
      // BLOQUE 2.2: Construcción con valores por defecto
      // ----------------------------------------------------------------
      // Crea la nueva tarea asignando valores por defecto inteligentes
      // cuando los campos opcionales no se proporcionan:
      // - Descripción: cadena vacía en lugar de null
      // - Prioridad: 'media' como valor intermedio razonable
      // - Estado: 'pendiente' como estado inicial lógico
      // - Recordatorio: false para no molestar por defecto
      const nuevaTarea = new Task({
        titulo,
        descripcion: descripcion || '',
        prioridad: prioridad || 'media',
        estado: estado || 'pendiente',
        categoria: categoria || '',
        recordatorio: recordatorio || false,
        fecha_limite: fecha_limite || null,
        hora_limite: hora_limite || null
      });

      // ----------------------------------------------------------------
      // BLOQUE 2.3: Persistencia en base de datos
      // ----------------------------------------------------------------
      // Guarda la nueva tarea. El modelo Task automáticamente agregará
      // campos como _id, fecha_creacion y fecha_actualizacion.
      await nuevaTarea.save();

      // ----------------------------------------------------------------
      // BLOQUE 2.4: Respuesta con datos completos
      // ----------------------------------------------------------------
      res.json({ 
        success: true, 
        message: 'Tarea creada correctamente',
        task: nuevaTarea 
      });
      
    } catch (error) {
      console.error('Error creando tarea:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error al crear tarea' 
      });
    }
  }

  // ********************************************************************
  // MÓDULO 3: ACTUALIZACIÓN DE TAREA EXISTENTE
  // ********************************************************************
  // Descripción: Actualiza completamente una tarea existente identificada
  // por su ID. Incluye validación de ID, título obligatorio y actualización
  // automática de la fecha de modificación.
  // ********************************************************************
  static async update(req, res) {
    try {
      const { id } = req.params;
      const { 
        titulo, 
        descripcion, 
        prioridad, 
        estado, 
        categoria, 
        recordatorio, 
        fecha_limite, 
        hora_limite 
      } = req.body;

      // ----------------------------------------------------------------
      // BLOQUE 3.1: Validación de formato de ID
      // ----------------------------------------------------------------
      // Verifica que el ID sea un ObjectId válido de MongoDB antes de
      // realizar cualquier operación en la base de datos.
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ 
          success: false, 
          message: 'ID inválido' 
        });
      }

      // ----------------------------------------------------------------
      // BLOQUE 3.2: Validación de título obligatorio
      // ----------------------------------------------------------------
      // Incluso en actualizaciones, el título sigue siendo obligatorio
      // para mantener la consistencia de datos.
      if (!titulo) {
        return res.status(400).json({ 
          success: false, 
          message: 'El título es obligatorio' 
        });
      }

      // ----------------------------------------------------------------
      // BLOQUE 3.3: Actualización con timestamp de modificación
      // ----------------------------------------------------------------
      // Actualiza todos los campos proporcionados y establece
      // automáticamente fecha_actualizacion a la fecha/hora actual.
      const tareaActualizada = await Task.findByIdAndUpdate(
        id,
        {
          titulo,
          descripcion,
          prioridad,
          estado,
          categoria,
          recordatorio,
          fecha_limite,
          hora_limite,
          fecha_actualizacion: new Date()
        },
        { new: true, runValidators: true }
      );

      // ----------------------------------------------------------------
      // BLOQUE 3.4: Verificación de existencia
      // ----------------------------------------------------------------
      // Si no se encuentra la tarea, responde con error 404 en lugar
      // de crear una nueva tarea con ese ID.
      if (!tareaActualizada) {
        return res.status(404).json({ 
          success: false, 
          message: 'Tarea no encontrada' 
        });
      }

      // ----------------------------------------------------------------
      // BLOQUE 3.5: Respuesta con datos actualizados
      // ----------------------------------------------------------------
      res.json({ 
        success: true, 
        message: 'Tarea actualizada correctamente',
        task: tareaActualizada 
      });
      
    } catch (error) {
      console.error('Error actualizando tarea:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error al actualizar tarea' 
      });
    }
  }

  // ********************************************************************
  // MÓDULO 4: ELIMINACIÓN LÓGICA DE TAREA
  // ********************************************************************
  // Descripción: Realiza una eliminación lógica (soft delete) de una tarea
  // cambiando su campo 'activo' a false. La tarea permanece en la base de
  // datos pero no aparece en consultas normales (solo en auditorías).
  // ********************************************************************
  static async delete(req, res) {
    try {
      const { id } = req.params;

      // ----------------------------------------------------------------
      // BLOQUE 4.1: Validación de formato de ID
      // ----------------------------------------------------------------
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ 
          success: false, 
          message: 'ID inválido' 
        });
      }

      // ----------------------------------------------------------------
      // BLOQUE 4.2: Desactivación en lugar de eliminación física
      // ----------------------------------------------------------------
      // Cambia activo=false en lugar de eliminar físicamente el documento.
      // Esto permite mantener el historial y la posibilidad de recuperación.
      const tareaEliminada = await Task.findByIdAndUpdate(
        id,
        { activo: false },
        { new: true }
      );

      // ----------------------------------------------------------------
      // BLOQUE 4.3: Verificación de existencia
      // ----------------------------------------------------------------
      if (!tareaEliminada) {
        return res.status(404).json({ 
          success: false, 
          message: 'Tarea no encontrada' 
        });
      }

      // ----------------------------------------------------------------
      // BLOQUE 4.4: Confirmación de eliminación lógica
      // ----------------------------------------------------------------
      res.json({ 
        success: true, 
        message: 'Tarea eliminada correctamente' 
      });
      
    } catch (error) {
      console.error('Error eliminando tarea:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error al eliminar tarea' 
      });
    }
  }

  // ********************************************************************
  // MÓDULO 5: ACTUALIZACIÓN DE ESTADO DE TAREA
  // ********************************************************************
  // Descripción: Cambia específicamente el estado de una tarea entre
  // los valores permitidos: 'pendiente', 'en-progreso', 'completada'.
  // Incluye validación estricta de estados permitidos y actualización
  // automática del timestamp.
  // ********************************************************************
  static async updateStatus(req, res) {
    try {
      const { id } = req.params;
      const { estado } = req.body;

      // ----------------------------------------------------------------
      // BLOQUE 5.1: Validación de formato de ID
      // ----------------------------------------------------------------
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ 
          success: false, 
          message: 'ID inválido' 
        });
      }

      // ----------------------------------------------------------------
      // BLOQUE 5.2: Validación de estado permitido
      // ----------------------------------------------------------------
      // Define explícitamente los únicos estados válidos para evitar
      // que se establezcan estados incorrectos o mal formados.
      const estadosPermitidos = ['pendiente', 'en-progreso', 'completada'];
      if (!estadosPermitidos.includes(estado)) {
        return res.status(400).json({ 
          success: false, 
          message: 'Estado no válido' 
        });
      }

      // ----------------------------------------------------------------
      // BLOQUE 5.3: Actualización específica de estado
      // ----------------------------------------------------------------
      // Cambia solo el campo estado y actualiza la fecha de modificación.
      // No se modifican otros campos para mantener integridad de datos.
      const tareaActualizada = await Task.findByIdAndUpdate(
        id,
        { 
          estado,
          fecha_actualizacion: new Date()
        },
        { new: true }
      );

      // ----------------------------------------------------------------
      // BLOQUE 5.4: Verificación de existencia
      // ----------------------------------------------------------------
      if (!tareaActualizada) {
        return res.status(404).json({ 
          success: false, 
          message: 'Tarea no encontrada' 
        });
      }

      // ----------------------------------------------------------------
      // BLOQUE 5.5: Respuesta contextual al estado
      // ----------------------------------------------------------------
      // El mensaje se adapta al estado establecido para dar retroalimentación
      // más clara al usuario (ej: "Tarea marcada como completada").
      res.json({ 
        success: true, 
        message: `Tarea marcada como ${estado}`,
        task: tareaActualizada 
      });
      
    } catch (error) {
      console.error('Error cambiando estado de tarea:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error al cambiar estado de tarea' 
      });
    }
  }

  // ********************************************************************
  // MÓDULO 6: OBTENCIÓN DE ESTADÍSTICAS DE TAREAS
  // ********************************************************************
  // Descripción: Calcula y devuelve métricas agregadas sobre las tareas
  // activas: conteos por estado, totales y tareas próximas a vencer.
  // Esencial para dashboards y paneles de control de productividad.
  // ********************************************************************
  static async getStats(req, res) {
    try {
      // ----------------------------------------------------------------
      // BLOQUE 6.1: Conteo de tareas por estado
      // ----------------------------------------------------------------
      // Realiza múltiples conteos en paralelo para obtener estadísticas
      // completas sobre distribución de estados.
      const totalTareas = await Task.countDocuments({ activo: true });
      const tareasPendientes = await Task.countDocuments({ 
        activo: true, 
        estado: 'pendiente' 
      });
      const tareasEnProgreso = await Task.countDocuments({ 
        activo: true, 
        estado: 'en-progreso' 
      });
      const tareasCompletadas = await Task.countDocuments({ 
        activo: true, 
        estado: 'completada' 
      });

      // ----------------------------------------------------------------
      // BLOQUE 6.2: Cálculo de tareas próximas a vencer
      // ----------------------------------------------------------------
      // Define una ventana de 7 días a partir de hoy para identificar
      // tareas que están por vencer y aún no están completadas.
      const fechaLimite = new Date();
      fechaLimite.setDate(fechaLimite.getDate() + 7);
      const tareasPorVencer = await Task.countDocuments({
        activo: true,
        estado: { $ne: 'completada' },
        fecha_limite: { 
          $gte: new Date(), 
          $lte: fechaLimite 
        }
      });

      // ----------------------------------------------------------------
      // BLOQUE 6.3: Estructuración de respuesta estadística
      // ----------------------------------------------------------------
      // Organiza las estadísticas en un objeto estructurado para facilitar
      // el consumo por frontends, gráficos o reportes.
      res.json({
        success: true,
        stats: {
          total: totalTareas,
          pendientes: tareasPendientes,
          enProgreso: tareasEnProgreso,
          completadas: tareasCompletadas,
          porVencer: tareasPorVencer
        }
      });
      
    } catch (error) {
      console.error('Error obteniendo estadísticas de tareas:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error al obtener estadísticas' 
      });
    }
  }

  // ********************************************************************
  // MÓDULO 7: OBTENCIÓN DE TAREAS DE ALTA PRIORIDAD
  // ********************************************************************
  // Descripción: Obtiene las tareas más urgentes del sistema: aquellas
  // con prioridad 'alta' o 'critica' que aún no están completadas.
  // Incluye extensivo logging para depuración y monitoreo.
  // ********************************************************************
  static async getHighPriority(req, res) {
    try {
      console.group('🔍 DEBUG: TaskController.getHighPriority');
      
      // ----------------------------------------------------------------
      // BLOQUE 7.1: Definición de query para alta prioridad
      // ----------------------------------------------------------------
      // Busca tareas activas con prioridad alta o crítica que no estén
      // completadas. $in permite múltiples valores para prioridad.
      const query = { 
        activo: true,
        prioridad: { $in: ['alta', 'critica'] },
        estado: { $ne: 'completada' }
      };
      
      console.log('🔍 Query de MongoDB:', JSON.stringify(query, null, 2));
      
      // ----------------------------------------------------------------
      // BLOQUE 7.2: Ejecución de consulta con ordenamiento
      // ----------------------------------------------------------------
      // Ordena primero por prioridad descendente (las críticas primero)
      // y luego por fecha límite ascendente (las que vencen primero).
      // Limita a 5 resultados para no sobrecargar dashboards.
      const tasks = await Task.find(query)
      .sort({ prioridad: -1, fecha_limite: 1 })
      .limit(5)
      .lean();

      console.log('✅ Tareas encontradas:', tasks.length);
      
      // ----------------------------------------------------------------
      // BLOQUE 7.3: Logging detallado de resultados
      // ----------------------------------------------------------------
      // Si se encuentran tareas, registra cada una con sus atributos clave.
      // Si no hay resultados, realiza una consulta de diagnóstico para
      // entender por qué no hay coincidencias.
      if (tasks.length > 0) {
        console.log('📋 Lista de tareas:');
        tasks.forEach((task, index) => {
          console.log(`  ${index + 1}. ${task.titulo} (${task.prioridad}) - ${task.estado}`);
          console.log(`     ID: ${task._id}`);
          console.log(`     Fecha límite: ${task.fecha_limite}`);
          console.log(`     Activo: ${task.activo}`);
        });
      } else {
        console.log('ℹ️ No se encontraron tareas con la query');
        
        // DEBUG: Consulta de diagnóstico
        const allTasks = await Task.find({ activo: true }).lean();
        console.log('📊 Todas las tareas activas:', allTasks.length);
        allTasks.forEach((task, index) => {
          console.log(`  ${index + 1}. ${task.titulo} (${task.prioridad}) - ${task.estado}`);
        });
      }
      
      console.groupEnd();

      // ----------------------------------------------------------------
      // BLOQUE 7.4: Respuesta con tareas críticas
      // ----------------------------------------------------------------
      res.json({ 
        success: true, 
        tasks 
      });
      
    } catch (error) {
      console.error('❌ Error obteniendo tareas de alta prioridad:', error);
      console.error('📋 Stack trace:', error.stack);
      res.status(500).json({ 
        success: false, 
        message: 'Error al obtener tareas de alta prioridad' 
      });
    }
  }

  // ********************************************************************
  // MÓDULO 8: OBTENCIÓN DE TAREAS PARA HOY
  // ********************************************************************
  // Descripción: Obtiene las tareas cuya fecha límite es el día actual
  // y que aún no están completadas. Incluye cálculo preciso de rango de
  // fechas y logging extensivo para verificar el filtrado temporal.
  // ********************************************************************
  static async getTodayTasks(req, res) {
    try {
      console.group('🔍 DEBUG: TaskController.getTodayTasks');
      
      // ----------------------------------------------------------------
      // BLOQUE 8.1: Cálculo preciso de rango de "hoy"
      // ----------------------------------------------------------------
      // Crea una fecha para hoy a las 00:00:00 y otra para mañana a las 00:00:00
      // para definir el rango exacto de 24 horas del día actual.
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      
      const manana = new Date(hoy);
      manana.setDate(manana.getDate() + 1);

      console.log('📅 Rango de fechas para hoy:');
      console.log(`  Desde: ${hoy.toISOString()}`);
      console.log(`  Hasta: ${manana.toISOString()}`);
      
      // ----------------------------------------------------------------
      // BLOQUE 8.2: Definición de query para tareas de hoy
      // ----------------------------------------------------------------
      // Busca tareas activas no completadas con fecha_limite dentro del
      // rango de hoy. $gte (greater than or equal) y $lt (less than)
      // definen el rango inclusivo-exclusivo estándar.
      const query = { 
        activo: true,
        estado: { $ne: 'completada' },
        fecha_limite: { 
          $gte: hoy, 
          $lt: manana 
        }
      };
      
      console.log('🔍 Query de MongoDB:', JSON.stringify(query, null, 2));

      // ----------------------------------------------------------------
      // BLOQUE 8.3: Ejecución con ordenamiento por urgencia
      // ----------------------------------------------------------------
      // Ordena primero por prioridad descendente y luego por hora límite
      // ascendente para mostrar primero las más urgentes del día.
      const tasks = await Task.find(query)
      .sort({ prioridad: -1, hora_limite: 1 })
      .limit(5)
      .lean();

      console.log('✅ Tareas encontradas para hoy:', tasks.length);
      
      // ----------------------------------------------------------------
      // BLOQUE 8.4: Logging detallado y diagnóstico
      // ----------------------------------------------------------------
      // Si no hay resultados, realiza consulta de diagnóstico para
      // verificar todas las tareas con fechas límite y su correspondencia
      // con el día actual.
      if (tasks.length > 0) {
        console.log('📋 Lista de tareas para hoy:');
        tasks.forEach((task, index) => {
          console.log(`  ${index + 1}. ${task.titulo} (${task.prioridad})`);
          console.log(`     Fecha límite: ${task.fecha_limite}`);
          console.log(`     Estado: ${task.estado}`);
        });
      } else {
        console.log('ℹ️ No se encontraron tareas para hoy');
        
        // DEBUG: Verificación de todas las tareas con fechas
        const tasksWithDates = await Task.find({ 
          activo: true,
          fecha_limite: { $exists: true, $ne: null }
        }).lean();
        
        console.log('📊 Tareas con fecha límite:', tasksWithDates.length);
        tasksWithDates.forEach((task, index) => {
          const taskDate = new Date(task.fecha_limite);
          const isToday = taskDate >= hoy && taskDate < manana;
          console.log(`  ${index + 1}. ${task.titulo}`);
          console.log(`     Fecha: ${task.fecha_limite} (${isToday ? '✅ HOY' : 'OTRO DÍA'})`);
          console.log(`     Estado: ${task.estado}`);
        });
      }
      
      console.groupEnd();

      // ----------------------------------------------------------------
      // BLOQUE 8.5: Respuesta con tareas del día
      // ----------------------------------------------------------------
      res.json({ 
        success: true, 
        tasks 
      });
      
    } catch (error) {
      console.error('❌ Error obteniendo tareas para hoy:', error);
      console.error('📋 Stack trace:', error.stack);
      res.status(500).json({ 
        success: false, 
        message: 'Error al obtener tareas para hoy' 
      });
    }
  }
}

export default TaskController;