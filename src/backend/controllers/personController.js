import mongoose from 'mongoose';
import Person from '../models/Person.js';
import Document from '../models/Document.js';
import NotificationService from '../services/notificationService.js';

class PersonController {
  // Obtener todas las personas
  static async getAll(req, res) {
    try {
      const persons = await Person.find({ activo: true }).sort({ nombre: 1 });
      res.json({ success: true, persons });
    } catch (error) {
      console.error('Error obteniendo personas:', error);
      res.status(500).json({ success: false, message: 'Error al obtener personas' });
    }
  }

  // Crear nueva persona
  static async create(req, res) {
    try {
      const { nombre, email, telefono, departamento, puesto } = req.body;
      
      if (!nombre || !email) {
        return res.status(400).json({ 
          success: false, 
          message: 'Nombre y email son obligatorios' 
        });
      }

      // Verificar si ya existe una persona con el mismo email
      const personaExistente = await Person.findOne({ 
        email: { $regex: new RegExp(`^${email}$`, 'i') }
      });

      if (personaExistente) {
        return res.status(400).json({ 
          success: false, 
          message: 'Ya existe una persona con ese email' 
        });
      }

      const nuevaPersona = new Person({
        nombre,
        email,
        telefono,
        departamento,
        puesto
      });

      await nuevaPersona.save();
      
      // Crear notificación de persona agregada
      try {
        await NotificationService.personaAgregada(nuevaPersona);
      } catch (notifError) {
        console.error('⚠️ Error creando notificación:', notifError.message);
      }
      
      res.json({ 
        success: true, 
        message: 'Persona agregada correctamente',
        person: nuevaPersona 
      });
    } catch (error) {
      console.error('Error creando persona:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error al crear persona' 
      });
    }
  }

  // Actualizar persona
  static async update(req, res) {
    try {
      const { id } = req.params;
      const { nombre, email, telefono, departamento, puesto } = req.body;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ 
          success: false, 
          message: 'ID inválido' 
        });
      }

      const personaActualizada = await Person.findByIdAndUpdate(
        id,
        { nombre, email, telefono, departamento, puesto },
        { new: true, runValidators: true }
      );

      if (!personaActualizada) {
        return res.status(404).json({ 
          success: false, 
          message: 'Persona no encontrada' 
        });
      }

      res.json({ 
        success: true, 
        message: 'Persona actualizada correctamente',
        person: personaActualizada 
      });
    } catch (error) {
      console.error('Error actualizando persona:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error al actualizar persona' 
      });
    }
  }

  // ELIMINAR PERSONA PERMANENTEMENTE DE LA BASE DE DATOS
  static async delete(req, res) {
    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ 
          success: false, 
          message: 'ID inválido' 
        });
      }

      // Verificar si la persona existe
      const personaExistente = await Person.findById(id);
      if (!personaExistente) {
        return res.status(404).json({ 
          success: false, 
          message: 'Persona no encontrada' 
        });
      }

      // Guardar el nombre para la notificación antes de eliminar
      const nombrePersona = personaExistente.nombre;

      // Verificar si la persona tiene documentos asociados
      const documentosAsociados = await Document.countDocuments({ 
        persona_id: id, 
        $or: [
          { isDeleted: false },
          { isDeleted: { $exists: false } }
        ]
      });

      if (documentosAsociados > 0) {
        return res.status(400).json({ 
          success: false, 
          message: 'No se puede eliminar la persona porque tiene documentos asociados. Elimina o reasigna primero los documentos.' 
        });
      }

      // ELIMINACIÓN PERMANENTE (HARD DELETE) - QUITAR COMPLETAMENTE DE LA BD
      await Person.findByIdAndDelete(id);

      // Crear notificación de persona eliminada
      try {
        await NotificationService.personaEliminada(nombrePersona);
      } catch (notifError) {
        console.error('⚠️ Error creando notificación:', notifError.message);
      }

      res.json({ 
        success: true, 
        message: 'Persona eliminada permanentemente del sistema' 
      });
    } catch (error) {
      console.error('Error eliminando persona:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error al eliminar persona' 
      });
    }
  }

  // Obtener personas inactivas (para manejo alternativo si decides tener papelera)
  static async getInactive(req, res) {
    try {
      const persons = await Person.find({ activo: false }).sort({ nombre: 1 });
      res.json({ success: true, persons });
    } catch (error) {
      console.error('Error obteniendo personas inactivas:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error al obtener personas inactivas' 
      });
    }
  }

  // Desactivar persona (eliminación lógica - por si quieres mantener ambas opciones)
  static async deactivate(req, res) {
    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ 
          success: false, 
          message: 'ID inválido' 
        });
      }

      const personaDesactivada = await Person.findByIdAndUpdate(
        id,
        { activo: false },
        { new: true }
      );

      if (!personaDesactivada) {
        return res.status(404).json({ 
          success: false, 
          message: 'Persona no encontrada' 
        });
      }

      res.json({ 
        success: true, 
        message: 'Persona desactivada correctamente',
        person: personaDesactivada 
      });
    } catch (error) {
      console.error('Error desactivando persona:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error al desactivar persona' 
      });
    }
  }

  // Reactivar persona
  static async reactivate(req, res) {
    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ 
          success: false, 
          message: 'ID inválido' 
        });
      }

      const personaReactivada = await Person.findByIdAndUpdate(
        id,
        { activo: true },
        { new: true }
      );

      if (!personaReactivada) {
        return res.status(404).json({ 
          success: false, 
          message: 'Persona no encontrada' 
        });
      }

      res.json({ 
        success: true, 
        message: 'Persona reactivada correctamente',
        person: personaReactivada 
      });
    } catch (error) {
      console.error('Error reactivando persona:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error al reactivar persona' 
      });
    }
  }
}

export default PersonController;