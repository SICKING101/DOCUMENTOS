import mongoose from 'mongoose';
import Task from '../models/Task.js';

class TaskController {
  // Obtener todas las tareas
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

  // Crear nueva tarea
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

  // Actualizar tarea
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

  // Eliminar tarea (eliminación lógica)
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

  // Cambiar estado de tarea
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

  // Obtener estadísticas de tareas
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

      // Tareas próximas a vencer (en los próximos 7 días)
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
}

export default TaskController;