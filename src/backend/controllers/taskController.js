// src/backend/controllers/taskController.js

import mongoose from 'mongoose';
import Task from '../models/Task.js';
import Person from '../models/Person.js';

class TaskController {
  
  // ========== MÉTODOS ORIGINALES ==========
  
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
        hora_limite: hora_limite || null,
        creador: req.user?.id,
        asignadoA: req.body.asignadoA || req.user?.id
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
      
      console.log('🔍 Query:', JSON.stringify(query, null, 2));
      
      const tasks = await Task.find(query)
        .sort({ prioridad: -1, fecha_limite: 1 })
        .limit(5)
        .lean();

      console.log(`✅ Tareas encontradas: ${tasks.length}`);
      console.groupEnd();

      res.json({ 
        success: true, 
        tasks 
      });
    } catch (error) {
      console.error('❌ Error obteniendo tareas de alta prioridad:', error);
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

      console.log('📅 Rango:', hoy.toISOString(), 'a', manana.toISOString());
      
      const query = { 
        activo: true,
        estado: { $ne: 'completada' },
        fecha_limite: { 
          $gte: hoy, 
          $lt: manana 
        }
      };
      
      const tasks = await Task.find(query)
        .sort({ prioridad: -1, hora_limite: 1 })
        .limit(5)
        .lean();

      console.log(`✅ Tareas para hoy: ${tasks.length}`);
      console.groupEnd();

      res.json({ 
        success: true, 
        tasks 
      });
    } catch (error) {
      console.error('❌ Error obteniendo tareas para hoy:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error al obtener tareas para hoy' 
      });
    }
  }

  // ========== NUEVOS MÉTODOS PARA LAS RUTAS ==========

  /**
   * Obtener usuarios asignables para tareas
   * GET /api/tasks/assignable-users
   */
  static async getAssignableUsers(req, res) {
    try {
      console.log('👥 [TaskController] Obteniendo usuarios asignables...');
      
      const users = await Person.find({ activo: true })
        .select('nombre email departamento puesto')
        .sort({ nombre: 1 })
        .limit(50)
        .lean();
      
      console.log(`✅ Encontrados ${users.length} usuarios asignables`);
      
      res.json({ 
        success: true, 
        data: users 
      });
    } catch (error) {
      console.error('❌ Error obteniendo usuarios asignables:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error al obtener usuarios asignables' 
      });
    }
  }

  /**
   * Obtener tareas del usuario actual
   * GET /api/tasks
   */
  static async getUserTasks(req, res) {
    try {
      const userId = req.user?.id;
      console.log(`📋 [TaskController] Obteniendo tareas para usuario: ${userId}`);
      
      const tasks = await Task.find({ 
        activo: true,
        $or: [
          { creador: userId },
          { asignadoA: userId }
        ]
      })
      .sort({ prioridad: -1, fecha_limite: 1 })
      .lean();
      
      console.log(`✅ Encontradas ${tasks.length} tareas`);
      
      res.json({ 
        success: true, 
        tasks 
      });
    } catch (error) {
      console.error('❌ Error obteniendo tareas del usuario:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error al obtener tareas' 
      });
    }
  }

  /**
   * Obtener estadísticas del usuario
   * GET /api/tasks/stats
   */
  static async getUserStats(req, res) {
    try {
      const userId = req.user?.id;
      console.log(`📊 [TaskController] Obteniendo estadísticas para usuario: ${userId}`);
      
      const [pendientes, enProgreso, completadas, vencidas] = await Promise.all([
        Task.countDocuments({ activo: true, estado: 'pendiente', $or: [{ creador: userId }, { asignadoA: userId }] }),
        Task.countDocuments({ activo: true, estado: 'en-progreso', $or: [{ creador: userId }, { asignadoA: userId }] }),
        Task.countDocuments({ activo: true, estado: 'completada', $or: [{ creador: userId }, { asignadoA: userId }] }),
        Task.countDocuments({ 
          activo: true, 
          estado: { $in: ['pendiente', 'en-progreso'] },
          fecha_limite: { $lt: new Date() },
          $or: [{ creador: userId }, { asignadoA: userId }]
        })
      ]);
      
      const stats = {
        pendientes,
        enProgreso,
        completadas,
        vencidas,
        total: pendientes + enProgreso + completadas
      };
      
      console.log('✅ Estadísticas:', stats);
      
      res.json({ 
        success: true, 
        stats 
      });
    } catch (error) {
      console.error('❌ Error obteniendo estadísticas:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error al obtener estadísticas' 
      });
    }
  }

  /**
   * Obtener tarea por ID
   * GET /api/tasks/:id
   */
  static async getById(req, res) {
    try {
      const { id } = req.params;
      
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ 
          success: false, 
          message: 'ID inválido' 
        });
      }
      
      const task = await Task.findById(id).lean();
      
      if (!task) {
        return res.status(404).json({ 
          success: false, 
          message: 'Tarea no encontrada' 
        });
      }
      
      res.json({ 
        success: true, 
        task 
      });
    } catch (error) {
      console.error('❌ Error obteniendo tarea por ID:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error al obtener tarea' 
      });
    }
  }

  /**
   * Completar tarea (marcar como completada)
   * PATCH /api/tasks/:id/complete
   */
  static async complete(req, res) {
    try {
      const { id } = req.params;
      
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ 
          success: false, 
          message: 'ID inválido' 
        });
      }
      
      const task = await Task.findByIdAndUpdate(
        id,
        { 
          estado: 'completada',
          fecha_completada: new Date(),
          fecha_actualizacion: new Date()
        },
        { new: true }
      );
      
      if (!task) {
        return res.status(404).json({ 
          success: false, 
          message: 'Tarea no encontrada' 
        });
      }
      
      res.json({ 
        success: true, 
        message: 'Tarea completada',
        task 
      });
    } catch (error) {
      console.error('❌ Error completando tarea:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error al completar tarea' 
      });
    }
  }
}

export default TaskController;