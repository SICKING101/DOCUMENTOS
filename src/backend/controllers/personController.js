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

  // Eliminar persona (lógicamente) - CON ELIMINACIÓN EN CASCADA
  static async delete(req, res) {
    try {
      const { id } = req.params;
      const { deleteDocuments } = req.query; // Nuevo parámetro

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ 
          success: false, 
          message: 'ID inválido' 
        });
      }

      // Buscar la persona
      const persona = await Person.findById(id);
      if (!persona) {
        return res.status(404).json({ 
          success: false, 
          message: 'Persona no encontrada' 
        });
      }

      // Verificar si la persona tiene documentos asociados
      const documentosAsociados = await Document.countDocuments({ 
        persona_id: id, 
        activo: true,
        $or: [
          { isDeleted: false },
          { isDeleted: { $exists: false } }
        ]
      });

      if (documentosAsociados > 0) {
        // Si NO se solicita eliminar documentos, retornar error
        if (deleteDocuments !== 'true') {
          return res.status(400).json({ 
            success: false, 
            message: 'No se puede eliminar la persona porque tiene documentos asociados' 
          });
        }
        
        // Si se solicita eliminar documentos, eliminarlos primero (soft delete)
        console.log(`🗑️ Eliminando ${documentosAsociados} documentos asociados a la persona ${persona.nombre}...`);
        
        await Document.updateMany(
          { persona_id: id, activo: true },
          { 
            isDeleted: true,
            deletedAt: new Date(),
            deletedBy: req.body.deletedBy || 'Sistema'
          }
        );
        
        console.log(`✅ ${documentosAsociados} documentos marcados como eliminados`);
      }

      // Eliminar la persona (soft delete)
      const personaEliminada = await Person.findByIdAndUpdate(
        id,
        { activo: false },
        { new: true }
      );

      if (!personaEliminada) {
        return res.status(404).json({ 
          success: false, 
          message: 'Persona no encontrada' 
        });
      }

      // Crear notificación de persona eliminada
      try {
        await NotificationService.personaEliminada(personaEliminada.nombre, documentosAsociados);
      } catch (notifError) {
        console.error('⚠️ Error creando notificación:', notifError.message);
      }

      res.json({ 
        success: true, 
        message: 'Persona eliminada correctamente',
        deletedDocuments: documentosAsociados
      });
    } catch (error) {
      console.error('Error eliminando persona:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error al eliminar persona: ' + error.message 
      });
    }
  }
}

export default PersonController;