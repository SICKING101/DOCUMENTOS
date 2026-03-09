// src/backend/controllers/taskController.js

import mongoose from 'mongoose';
import Task from '../models/Task.js';

class TaskController {
  static async getAll(req, res) {
    try {
      const tasks = await Task.find({ activo: true })
        .sort({ fecha_creacion: -1 })
        .lean();

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

      if (!titulo) {
        return res.status(400).json({ 
          success: false, 
          message: 'El título es obligatorio' 
        });
      }

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

      await nuevaTarea.save();

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

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ 
          success: false, 
          message: 'ID inválido' 
        });
      }

      if (!titulo) {
        return res.status(400).json({ 
          success: false, 
          message: 'El título es obligatorio' 
        });
      }

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

      if (!tareaActualizada) {
        return res.status(404).json({ 
          success: false, 
          message: 'Tarea no encontrada' 
        });
      }

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

  static async delete(req, res) {
    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ 
          success: false, 
          message: 'ID inválido' 
        });
      }

      const tareaEliminada = await Task.findByIdAndUpdate(
        id,
        { activo: false },
        { new: true }
      );

      if (!tareaEliminada) {
        return res.status(404).json({ 
          success: false, 
          message: 'Tarea no encontrada' 
        });
      }

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

  static async updateStatus(req, res) {
    try {
      const { id } = req.params;
      const { estado } = req.body;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ 
          success: false, 
          message: 'ID inválido' 
        });
      }

      const estadosPermitidos = ['pendiente', 'en-progreso', 'completada'];
      if (!estadosPermitidos.includes(estado)) {
        return res.status(400).json({ 
          success: false, 
          message: 'Estado no válido' 
        });
      }

      const tareaActualizada = await Task.findByIdAndUpdate(
        id,
        { 
          estado,
          fecha_actualizacion: new Date()
        },
        { new: true }
      );

      if (!tareaActualizada) {
        return res.status(404).json({ 
          success: false, 
          message: 'Tarea no encontrada' 
        });
      }

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

  static async getStats(req, res) {
    try {
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

  static async getHighPriority(req, res) {
    try {
      console.group('🔍 DEBUG: TaskController.getHighPriority');
      
      const query = { 
        activo: true,
        prioridad: { $in: ['alta', 'critica'] },
        estado: { $ne: 'completada' }
      };
      
      console.log('🔍 Query de MongoDB:', JSON.stringify(query, null, 2));
      
      const tasks = await Task.find(query)
      .sort({ prioridad: -1, fecha_limite: 1 })
      .limit(5)
      .lean();

      console.log('✅ Tareas encontradas:', tasks.length);
      
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
        
        // DEBUG: Verificar qué tareas hay en la base de datos
        const allTasks = await Task.find({ activo: true }).lean();
        console.log('📊 Todas las tareas activas:', allTasks.length);
        allTasks.forEach((task, index) => {
          console.log(`  ${index + 1}. ${task.titulo} (${task.prioridad}) - ${task.estado}`);
        });
      }
      
      console.groupEnd();

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

  static async getTodayTasks(req, res) {
    try {
      console.group('🔍 DEBUG: TaskController.getTodayTasks');
      
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      
      const manana = new Date(hoy);
      manana.setDate(manana.getDate() + 1);

      console.log('📅 Rango de fechas para hoy:');
      console.log(`  Desde: ${hoy.toISOString()}`);
      console.log(`  Hasta: ${manana.toISOString()}`);
      
      const query = { 
        activo: true,
        estado: { $ne: 'completada' },
        fecha_limite: { 
          $gte: hoy, 
          $lt: manana 
        }
      };
      
      console.log('🔍 Query de MongoDB:', JSON.stringify(query, null, 2));

      const tasks = await Task.find(query)
      .sort({ prioridad: -1, hora_limite: 1 })
      .limit(5)
      .lean();

      console.log('✅ Tareas encontradas para hoy:', tasks.length);
      
      if (tasks.length > 0) {
        console.log('📋 Lista de tareas para hoy:');
        tasks.forEach((task, index) => {
          console.log(`  ${index + 1}. ${task.titulo} (${task.prioridad})`);
          console.log(`     Fecha límite: ${task.fecha_limite}`);
          console.log(`     Estado: ${task.estado}`);
        });
      } else {
        console.log('ℹ️ No se encontraron tareas para hoy');
        
        // DEBUG: Verificar todas las tareas con fecha límite
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