// src/backend/controllers/taskController.js
// =============================================================================
// TASK CONTROLLER VERSION 2.0 - CORREGIDO
// =============================================================================

import mongoose from 'mongoose';
import Task from '../models/Task.js';
import User from '../models/User.js';
import ReminderService from '../services/reminderService.js';

const DEBUG = true;
function clog(...args) { if (DEBUG) console.log('🎯 [TaskController]', ...args); }

// =============================================================================
// FUNCIONES AUXILIARES DE PERMISOS
// =============================================================================

function canCompleteTask(task, userId) {
    if (!task || !userId) return false;
    if (task.estado === 'completada') return false;
    
    const userIdStr = userId.toString();
    const creadoPorStr = task.creado_por?._id?.toString() || task.creado_por?.toString();
    const asignadosStr = (task.asignado_a || []).map(a => a._id?.toString() || a.toString());
    
    // El creador siempre puede completar
    if (creadoPorStr === userIdStr) return true;
    
    // Usuarios asignados pueden completar según el tipo
    if (task.tipo === 'asignada' || task.tipo === 'grupal' || task.tipo === 'clase') {
        return asignadosStr.includes(userIdStr);
    }
    
    return false;
}

function canEditTask(task, userId) {
    if (!task || !userId) return false;
    const userIdStr = userId.toString();
    const creadoPorStr = task.creado_por?._id?.toString() || task.creado_por?.toString();
    return creadoPorStr === userIdStr;
}

function canDeleteTask(task, userId) {
    if (!task || !userId) return false;
    const userIdStr = userId.toString();
    const creadoPorStr = task.creado_por?._id?.toString() || task.creado_por?.toString();
    return creadoPorStr === userIdStr;
}

// =============================================================================
// CLASE PRINCIPAL
// =============================================================================

class TaskController {
  
  // ===========================================================================
  // 1. OBTENER TAREAS DEL USUARIO ACTUAL - CORREGIDO
  // ===========================================================================
  static async getUserTasks(req, res) {
    try {
      console.log('🔍 [getUserTasks] Iniciando...');
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ success: false, message: 'Usuario no autenticado' });
      
      const { estado, prioridad, tipo, search } = req.query;
      
      const query = {
        activo: true,
        $or: [
          { creado_por: new mongoose.Types.ObjectId(userId) },
          { asignado_a: new mongoose.Types.ObjectId(userId) }
        ]
      };
      
      // ✅ Filtro por escuela
      if (req.schoolId) query.schoolId = req.schoolId;
      
      if (estado && estado !== 'all') query.estado = estado;
      if (prioridad && prioridad !== 'all') query.prioridad = prioridad;
      if (tipo && tipo !== 'all') query.tipo = tipo;
      if (search && search.trim()) {
        query.$or = [
          { titulo: { $regex: search, $options: 'i' } },
          { descripcion: { $regex: search, $options: 'i' } }
        ];
      }
      
      const tasks = await Task.find(query)
        .sort({ fecha_limite: 1, prioridad: -1 })
        .populate('asignado_a', 'usuario correo')
        .populate('creado_por', 'usuario correo')
        .lean();
      
      const userIdStr = userId.toString();
      const enrichedTasks = tasks.map(task => ({
        ...task,
        permisos: {
          puedeCompletar: canCompleteTask(task, userIdStr),
          puedeEditar: canEditTask(task, userIdStr),
          puedeEliminar: canDeleteTask(task, userIdStr)
        }
      }));
      
      res.json({ success: true, tasks: enrichedTasks, count: enrichedTasks.length });
    } catch (error) {
      console.error('❌ [getUserTasks] Error:', error);
      res.status(500).json({ success: false, message: 'Error al obtener tareas', error: error.message });
    }
  }
  
  // ===========================================================================
  // 2. OBTENER ESTADÍSTICAS DEL USUARIO
  // ===========================================================================
  static async getUserStats(req, res) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ success: false, message: 'Usuario no autenticado' });
      
      const query = {
        activo: true,
        $or: [
          { creado_por: new mongoose.Types.ObjectId(userId) },
          { asignado_a: new mongoose.Types.ObjectId(userId) }
        ]
      };
      
      // ✅ Filtro por escuela
      if (req.schoolId) query.schoolId = req.schoolId;
      
      const [total, pendientes, enProgreso, completadas] = await Promise.all([
        Task.countDocuments(query),
        Task.countDocuments({ ...query, estado: 'pendiente' }),
        Task.countDocuments({ ...query, estado: 'en-progreso' }),
        Task.countDocuments({ ...query, estado: 'completada' })
      ]);
      
      res.json({ success: true, stats: { total, pendientes, enProgreso, completadas } });
    } catch (error) {
      console.error('❌ [getUserStats] Error:', error);
      res.status(500).json({ success: false, message: 'Error al obtener estadísticas', error: error.message });
    }
  }
  
// ===========================================================================
// 3. CREAR TAREA
// ===========================================================================
static async create(req, res) {
    try {
      const userId = req.user?.id;
      const userName = req.user?.usuario;
      if (!userId) return res.status(401).json({ success: false, message: 'Usuario no autenticado' });
      
      const { titulo, descripcion, prioridad, estado, categoria, fecha_limite, hora_limite, recordatorio, tipo, asignado_a } = req.body;
      
      if (!titulo || !titulo.trim()) return res.status(400).json({ success: false, message: 'El título es obligatorio' });
      
      let usuariosAsignados = [];
      if (asignado_a && asignado_a.length > 0) {
        const userFilter = { _id: { $in: asignado_a }, activo: true, rol: { $ne: 'desactivado' } };
        if (req.schoolId) userFilter.schoolId = req.schoolId;
        const usuarios = await User.find(userFilter).select('_id');
        usuariosAsignados = usuarios.map(u => u._id);
      }
      
      const nuevaTarea = new Task({
        titulo: titulo.trim(),
        descripcion: descripcion || '',
        prioridad: prioridad || 'media',
        estado: estado || 'pendiente',
        categoria: categoria || '',
        fecha_limite: fecha_limite ? new Date(fecha_limite) : null,
        hora_limite: hora_limite || null,
        recordatorio: recordatorio || false,
        tipo: tipo || (asignado_a?.length > 0 ? 'asignada' : 'personal'),
        asignado_a: usuariosAsignados,
        creado_por: userId,
        creado_por_nombre: userName || 'Usuario',
        schoolId: req.schoolId || 'superadmin'
      });
      
      await nuevaTarea.save();
      
      // 🆕 Verificar recordatorios inmediatamente si la tarea tiene recordatorio activo
      if (nuevaTarea.recordatorio && nuevaTarea.fecha_limite) {
        try {
          await ReminderService.runChecks();
          console.log('⏰ Recordatorios verificados tras crear tarea');
        } catch (e) {
          console.warn('⚠️ Error verificando recordatorios:', e.message);
        }
      }
      
      const tareaConDatos = await Task.findById(nuevaTarea._id)
        .populate('asignado_a', 'usuario correo')
        .populate('creado_por', 'usuario correo')
        .lean();
      
      res.json({ success: true, message: 'Tarea creada correctamente', task: tareaConDatos });
    } catch (error) {
      console.error('❌ [create] Error:', error);
      res.status(500).json({ success: false, message: 'Error al crear tarea', error: error.message });
    }
  }
  
// ===========================================================================
// 4. ACTUALIZAR TAREA
// ===========================================================================
static async update(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
      }
      
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: 'ID inválido'
        });
      }
      
      const tarea = await Task.findById(id);
      
      if (!tarea) {
        return res.status(404).json({
          success: false,
          message: 'Tarea no encontrada'
        });
      }
      
      if (!canEditTask(tarea, userId)) {
        return res.status(403).json({
          success: false,
          message: 'No tienes permiso para editar esta tarea'
        });
      }
      
      const {
        titulo, descripcion, prioridad, estado, categoria,
        fecha_limite, hora_limite, recordatorio, tipo, asignado_a
      } = req.body;
      
      if (titulo) tarea.titulo = titulo.trim();
      if (descripcion !== undefined) tarea.descripcion = descripcion;
      if (prioridad) tarea.prioridad = prioridad;
      if (estado && estado !== 'completada') tarea.estado = estado;
      if (categoria !== undefined) tarea.categoria = categoria;
      if (fecha_limite !== undefined) tarea.fecha_limite = fecha_limite ? new Date(fecha_limite) : null;
      if (hora_limite !== undefined) tarea.hora_limite = hora_limite;
      if (recordatorio !== undefined) tarea.recordatorio = recordatorio;
      if (tipo) tarea.tipo = tipo;
      
      if (fecha_limite !== undefined || recordatorio !== undefined) {
        tarea.recordatorio_enviado = false;
      }
      
      if (asignado_a !== undefined) {
        const nuevosAsignados = await User.find({
          _id: { $in: asignado_a },
          activo: true
        }).select('_id');
        tarea.asignado_a = nuevosAsignados.map(u => u._id);
      }
      
      await tarea.save();
      
      // 🆕 Verificar recordatorios inmediatamente si la tarea tiene recordatorio activo
      if (tarea.recordatorio && tarea.fecha_limite && tarea.estado !== 'completada') {
        try {
          await ReminderService.runChecks();
          console.log('⏰ Recordatorios verificados tras actualizar tarea');
        } catch (e) {
          console.warn('⚠️ Error verificando recordatorios:', e.message);
        }
      }
      
      const tareaActualizada = await Task.findById(id)
        .populate('asignado_a', 'usuario correo')
        .populate('creado_por', 'usuario correo')
        .lean();
      
      res.json({
        success: true,
        message: 'Tarea actualizada correctamente',
        task: tareaActualizada
      });
      
    } catch (error) {
      console.error('❌ [update] Error:', error);
      res.status(500).json({
        success: false,
        message: 'Error al actualizar tarea',
        error: error.message
      });
    }
  }
  
  // ===========================================================================
  // 5. COMPLETAR TAREA
  // ===========================================================================
  static async complete(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      const userName = req.user?.usuario;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
      }
      
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: 'ID inválido'
        });
      }
      
      const tarea = await Task.findById(id);
      
      if (!tarea) {
        return res.status(404).json({
          success: false,
          message: 'Tarea no encontrada'
        });
      }
      
      if (!canCompleteTask(tarea, userId)) {
        return res.status(403).json({
          success: false,
          message: 'No tienes permiso para completar esta tarea'
        });
      }
      
      if (tarea.estado === 'completada') {
        return res.status(400).json({
          success: false,
          message: 'La tarea ya está completada'
        });
      }
      
      tarea.estado = 'completada';
      tarea.completado_por = userId;
      tarea.fecha_completada = new Date();
      
      await tarea.save();
      
      console.log(`✅ [complete] Tarea "${tarea.titulo}" completada por ${userName}`);
      
      res.json({
        success: true,
        message: 'Tarea completada correctamente'
      });
      
    } catch (error) {
      console.error('❌ [complete] Error:', error);
      res.status(500).json({
        success: false,
        message: 'Error al completar tarea',
        error: error.message
      });
    }
  }
  
  // ===========================================================================
  // 6. ELIMINAR TAREA
  // ===========================================================================
  static async delete(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
      }
      
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: 'ID inválido'
        });
      }
      
      const tarea = await Task.findById(id);
      
      if (!tarea) {
        return res.status(404).json({
          success: false,
          message: 'Tarea no encontrada'
        });
      }
      
      if (!canDeleteTask(tarea, userId)) {
        return res.status(403).json({
          success: false,
          message: 'No tienes permiso para eliminar esta tarea'
        });
      }
      
      tarea.activo = false;
      await tarea.save();
      
      res.json({
        success: true,
        message: 'Tarea eliminada correctamente'
      });
      
    } catch (error) {
      console.error('❌ [delete] Error:', error);
      res.status(500).json({
        success: false,
        message: 'Error al eliminar tarea',
        error: error.message
      });
    }
  }
  
  // ===========================================================================
  // 7. OBTENER USUARIOS ASIGNABLES
  // ===========================================================================
  static async getAssignableUsers(req, res) {
    try {
      const filter = { activo: true, rol: { $ne: 'desactivado' } };
      // ✅ Solo usuarios de la misma escuela
      if (req.schoolId) filter.schoolId = req.schoolId;
      
      const users = await User.find(filter).select('usuario correo rol');
      
      res.json({ success: true, users: users.map(u => ({ id: u._id, usuario: u.usuario, correo: u.correo, rol: u.rol })) });
    } catch (error) {
      console.error('❌ [getAssignableUsers] Error:', error);
      res.status(500).json({ success: false, message: 'Error al obtener usuarios', error: error.message });
    }
  }
  
  // ===========================================================================
  // 8. TAREAS DE ALTA PRIORIDAD (Dashboard)
  // ===========================================================================
  static async getHighPriority(req, res) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ success: false, message: 'Usuario no autenticado' });
      
      const query = {
        activo: true,
        prioridad: { $in: ['alta', 'critica'] },
        estado: { $ne: 'completada' },
        $or: [
          { creado_por: new mongoose.Types.ObjectId(userId) },
          { asignado_a: new mongoose.Types.ObjectId(userId) }
        ]
      };
      
      // ✅ Filtro por escuela
      if (req.schoolId) query.schoolId = req.schoolId;
      
      const tasks = await Task.find(query)
        .sort({ prioridad: -1, fecha_limite: 1 })
        .limit(5)
        .populate('asignado_a', 'usuario')
        .populate('creado_por', 'usuario')
        .lean();
      
      const userIdStr = userId.toString();
      const enrichedTasks = tasks.map(task => ({ ...task, puedeCompletar: canCompleteTask(task, userIdStr) }));
      
      res.json({ success: true, tasks: enrichedTasks });
    } catch (error) {
      console.error('❌ [getHighPriority] Error:', error);
      res.status(500).json({ success: false, message: 'Error al obtener tareas', error: error.message });
    }
  }
  
  // ===========================================================================
  // 9. TAREAS PARA HOY (Dashboard)
  // ===========================================================================
  static async getTodayTasks(req, res) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ success: false, message: 'Usuario no autenticado' });
      
      const hoy = new Date(); hoy.setHours(0,0,0,0);
      const manana = new Date(hoy); manana.setDate(manana.getDate()+1);
      
      const query = {
        activo: true,
        estado: { $ne: 'completada' },
        fecha_limite: { $gte: hoy, $lt: manana },
        $or: [
          { creado_por: new mongoose.Types.ObjectId(userId) },
          { asignado_a: new mongoose.Types.ObjectId(userId) }
        ]
      };
      
      // ✅ Filtro por escuela
      if (req.schoolId) query.schoolId = req.schoolId;
      
      const tasks = await Task.find(query)
        .sort({ prioridad: -1, hora_limite: 1 })
        .limit(5)
        .populate('asignado_a', 'usuario')
        .populate('creado_por', 'usuario')
        .lean();
      
      const userIdStr = userId.toString();
      const enrichedTasks = tasks.map(task => ({ ...task, puedeCompletar: canCompleteTask(task, userIdStr) }));
      
      res.json({ success: true, tasks: enrichedTasks });
    } catch (error) {
      console.error('❌ [getTodayTasks] Error:', error);
      res.status(500).json({ success: false, message: 'Error al obtener tareas', error: error.message });
    }
  }
  
  // ===========================================================================
  // 10. OBTENER TAREA POR ID
  // ===========================================================================
  static async getById(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
      }
      
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: 'ID inválido'
        });
      }
      
      const tarea = await Task.findById(id)
        .populate('asignado_a', 'usuario correo')
        .populate('creado_por', 'usuario correo')
        .populate('completado_por', 'usuario correo')
        .lean();
      
      if (!tarea || !tarea.activo) {
        return res.status(404).json({
          success: false,
          message: 'Tarea no encontrada'
        });
      }
      
      const userIdStr = userId.toString();
      
      res.json({
        success: true,
        task: {
          ...tarea,
          permisos: {
            puedeCompletar: canCompleteTask(tarea, userIdStr),
            puedeEditar: canEditTask(tarea, userIdStr),
            puedeEliminar: canDeleteTask(tarea, userIdStr)
          }
        }
      });
      
    } catch (error) {
      console.error('❌ [getById] Error:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener tarea',
        error: error.message
      });
    }
  }
  
  // ===========================================================================
  // 11. AGREGAR COMENTARIO
  // ===========================================================================
  static async addComment(req, res) {
    try {
      const { id } = req.params;
      const { texto } = req.body;
      const userId = req.user?.id;
      const userName = req.user?.usuario;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
      }
      
      if (!texto || texto.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'El comentario no puede estar vacío'
        });
      }
      
      const tarea = await Task.findById(id);
      
      if (!tarea) {
        return res.status(404).json({
          success: false,
          message: 'Tarea no encontrada'
        });
      }
      
      tarea.comentarios.push({
        texto: texto.trim(),
        usuario: userId,
        usuarioNombre: userName || 'Usuario',
        fecha: new Date()
      });
      
      await tarea.save();
      
      res.json({
        success: true,
        message: 'Comentario agregado',
        comentarios: tarea.comentarios
      });
      
    } catch (error) {
      console.error('❌ [addComment] Error:', error);
      res.status(500).json({
        success: false,
        message: 'Error al agregar comentario',
        error: error.message
      });
    }
  }
}

export default TaskController;