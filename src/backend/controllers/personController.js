import mongoose from 'mongoose';
import Person from '../models/Person.js';
import Document from '../models/Document.js';
import NotificationService from '../services/notificationService.js';

// ============================================================================
// SECCIÓN: CONTROLADOR DE PERSONAS
// ============================================================================
// Este archivo maneja todas las operaciones CRUD relacionadas con personas.
// Incluye gestión completa del ciclo de vida: creación, actualización,
// eliminación permanente, desactivación lógica y reactivación.
// ============================================================================

class PersonController {
  
  // ********************************************************************
  // MÓDULO 1: OBTENCIÓN DE TODAS LAS PERSONAS ACTIVAS
  // ********************************************************************
  // Descripción: Obtiene la lista completa de personas con estado activo.
  // Útil para mostrar en listados, dropdowns o cualquier interfaz que
  // requiera seleccionar o visualizar personas disponibles en el sistema.
  // ********************************************************************
  static async getAll(req, res) {
    try {
      // ----------------------------------------------------------------
      // BLOQUE 1.1: Consulta de personas activas
      // ----------------------------------------------------------------
      // Busca todas las personas con el campo 'activo' en true y las
      // ordena alfabéticamente por nombre para consistencia en la UI.
      const persons = await Person.find({ activo: true }).sort({ nombre: 1 });
      
      // ----------------------------------------------------------------
      // BLOQUE 1.2: Respuesta con datos limpios
      // ----------------------------------------------------------------
      // Devuelve directamente el array de personas sin transformaciones
      // adicionales, ya que es una consulta simple de lectura.
      res.json({ success: true, persons });
      
    } catch (error) {
      // ----------------------------------------------------------------
      // BLOQUE 1.3: Manejo de errores en obtención
      // ----------------------------------------------------------------
      console.error('Error obteniendo personas:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error al obtener personas' 
      });
    }
  }

  // ********************************************************************
  // MÓDULO 2: CREACIÓN DE NUEVA PERSONA
  // ********************************************************************
  // Descripción: Crea un nuevo registro de persona en la base de datos
  // con validaciones de campos obligatorios y unicidad de email. Además,
  // genera una notificación automática para informar sobre el nuevo registro.
  // ********************************************************************
  static async create(req, res) {
    try {
      const { nombre, email, telefono, departamento, puesto } = req.body;
      
      // ----------------------------------------------------------------
      // BLOQUE 2.1: Validación de campos obligatorios
      // ----------------------------------------------------------------
      // Verifica que los campos mínimos necesarios para una persona
      // (nombre y email) estén presentes en la solicitud.
      if (!nombre || !email) {
        return res.status(400).json({ 
          success: false, 
          message: 'Nombre y email son obligatorios' 
        });
      }

      // ----------------------------------------------------------------
      // BLOQUE 2.2: Verificación de unicidad de email
      // ----------------------------------------------------------------
      // Busca si ya existe una persona con el mismo email, usando
      // expresión regular insensible a mayúsculas/minúsculas para
      // evitar duplicados con variaciones de capitalización.
      const personaExistente = await Person.findOne({ 
        email: { $regex: new RegExp(`^${email}$`, 'i') }
      });

      if (personaExistente) {
        return res.status(400).json({ 
          success: false, 
          message: 'Ya existe una persona con ese email' 
        });
      }

      // ----------------------------------------------------------------
      // BLOQUE 2.3: Construcción del nuevo registro
      // ----------------------------------------------------------------
      // Crea una nueva instancia del modelo Person con los datos
      // recibidos del formulario o API.
      const nuevaPersona = new Person({
        nombre,
        email,
        telefono,
        departamento,
        puesto
      });

      // ----------------------------------------------------------------
      // BLOQUE 2.4: Persistencia en base de datos
      // ----------------------------------------------------------------
      // Guarda el nuevo documento en la colección de personas.
      await nuevaPersona.save();
      
      // ----------------------------------------------------------------
      // BLOQUE 2.5: Notificación de creación (opcional)
      // ----------------------------------------------------------------
      // Intenta crear una notificación sobre la nueva persona.
      // Si falla, solo se registra el error pero no interrumpe el flujo
      // principal, ya que la persona ya fue creada exitosamente.
      try {
        await NotificationService.personaAgregada(nuevaPersona);
      } catch (notifError) {
        console.error('⚠️ Error creando notificación:', notifError.message);
      }
      
      // ----------------------------------------------------------------
      // BLOQUE 2.6: Respuesta exitosa con datos completos
      // ----------------------------------------------------------------
      // Devuelve la persona recién creada incluyendo su ID generado
      // por MongoDB, para que el cliente pueda usarlo inmediatamente.
      res.json({ 
        success: true, 
        message: 'Persona agregada correctamente',
        person: nuevaPersona 
      });
      
    } catch (error) {
      // ----------------------------------------------------------------
      // BLOQUE 2.7: Manejo de errores en creación
      // ----------------------------------------------------------------
      console.error('Error creando persona:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error al crear persona' 
      });
    }
  }

  // ********************************************************************
  // MÓDULO 3: ACTUALIZACIÓN DE PERSONA EXISTENTE
  // ********************************************************************
  // Descripción: Actualiza la información de una persona específica
  // identificada por su ID. Incluye validación de formato de ID y
  // verificación de existencia del registro antes de actualizar.
  // ********************************************************************
  static async update(req, res) {
    try {
      const { id } = req.params;
      const { nombre, email, telefono, departamento, puesto } = req.body;

      // ----------------------------------------------------------------
      // BLOQUE 3.1: Validación de formato de ID
      // ----------------------------------------------------------------
      // Verifica que el ID proporcionado tenga un formato válido de
      // ObjectId de MongoDB antes de realizar cualquier operación.
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ 
          success: false, 
          message: 'ID inválido' 
        });
      }

      // ----------------------------------------------------------------
      // BLOQUE 3.2: Actualización atómica con validación
      // ----------------------------------------------------------------
      // Usa findByIdAndUpdate para buscar y actualizar en una sola
      // operación. {new: true} devuelve el documento actualizado y
      // {runValidators: true} aplica las validaciones del esquema.
      const personaActualizada = await Person.findByIdAndUpdate(
        id,
        { nombre, email, telefono, departamento, puesto },
        { new: true, runValidators: true }
      );

      // ----------------------------------------------------------------
      // BLOQUE 3.3: Verificación de existencia
      // ----------------------------------------------------------------
      // Si no se encuentra la persona con el ID dado, responde con
      // error 404 en lugar de crear un nuevo registro.
      if (!personaActualizada) {
        return res.status(404).json({ 
          success: false, 
          message: 'Persona no encontrada' 
        });
      }

      // ----------------------------------------------------------------
      // BLOQUE 3.4: Respuesta con datos actualizados
      // ----------------------------------------------------------------
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

  // ********************************************************************
  // MÓDULO 4: ELIMINACIÓN PERMANENTE DE PERSONA
  // ********************************************************************
  // Descripción: Elimina físicamente una persona de la base de datos
  // después de realizar varias validaciones críticas. Este es un HARD DELETE
  // irreversible, por lo que incluye verificaciones de seguridad extra.
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
      // BLOQUE 4.2: Verificación de existencia previa
      // ----------------------------------------------------------------
      // Obtiene la persona completa para validar que existe y para
      // guardar su nombre (necesario para la notificación posterior).
      const personaExistente = await Person.findById(id);
      if (!personaExistente) {
        return res.status(404).json({ 
          success: false, 
          message: 'Persona no encontrada' 
        });
      }

      // Guarda el nombre antes de la eliminación para usarlo en la notificación
      const nombrePersona = personaExistente.nombre;

      // ----------------------------------------------------------------
      // BLOQUE 4.3: Verificación de integridad referencial
      // ----------------------------------------------------------------
      // Cuenta cuántos documentos están asociados a esta persona.
      // Considera documentos que no estén marcados como eliminados
      // (campo isDeleted en false o inexistente).
      const documentosAsociados = await Document.countDocuments({ 
        persona_id: id, 
        $or: [
          { isDeleted: false },
          { isDeleted: { $exists: false } }
        ]
      });

      // ----------------------------------------------------------------
      // BLOQUE 4.4: Prevención de eliminación con dependencias
      // ----------------------------------------------------------------
      // Si hay documentos asociados, bloquea la eliminación y sugiere
      // al usuario que primero elimine o reasigne esos documentos.
      if (documentosAsociados > 0) {
        return res.status(400).json({ 
          success: false, 
          message: 'No se puede eliminar la persona porque tiene documentos asociados. Elimina o reasigna primero los documentos.' 
        });
      }

      // ----------------------------------------------------------------
      // BLOQUE 4.5: Eliminación física permanente
      // ----------------------------------------------------------------
      // Usa findByIdAndDelete para remover completamente el documento
      // de la colección. Esta operación NO SE PUEDE DESHACER.
      await Person.findByIdAndDelete(id);

      // ----------------------------------------------------------------
      // BLOQUE 4.6: Notificación de eliminación (opcional)
      // ----------------------------------------------------------------
      // Intenta crear una notificación sobre la eliminación.
      // Usa el nombre guardado previamente ya que la persona ya no existe.
      try {
        await NotificationService.personaEliminada(nombrePersona);
      } catch (notifError) {
        console.error('⚠️ Error creando notificación:', notifError.message);
      }

      // ----------------------------------------------------------------
      // BLOQUE 4.7: Confirmación de eliminación permanente
      // ----------------------------------------------------------------
      // El mensaje deja claro que la eliminación fue permanente y
      // no hay posibilidad de recuperación (a menos que haya backup).
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

  // ********************************************************************
  // MÓDULO 5: OBTENCIÓN DE PERSONAS INACTIVAS
  // ********************************************************************
  // Descripción: Obtiene la lista de personas marcadas como inactivas.
  // Este endpoint es útil para implementar una "papelera de reciclaje"
  // o para procesos de auditoría y recuperación de datos.
  // ********************************************************************
  static async getInactive(req, res) {
    try {
      // ----------------------------------------------------------------
      // BLOQUE 5.1: Consulta de personas inactivas
      // ----------------------------------------------------------------
      // Busca personas con activo=false, mostrando aquellas que han
      // sido desactivadas (eliminación lógica) pero no eliminadas físicamente.
      const persons = await Person.find({ activo: false }).sort({ nombre: 1 });
      
      // ----------------------------------------------------------------
      // BLOQUE 5.2: Respuesta con datos de inactivos
      // ----------------------------------------------------------------
      res.json({ success: true, persons });
      
    } catch (error) {
      console.error('Error obteniendo personas inactivas:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error al obtener personas inactivas' 
      });
    }
  }

  // ********************************************************************
  // MÓDULO 6: DESACTIVACIÓN DE PERSONA (ELIMINACIÓN LÓGICA)
  // ********************************************************************
  // Descripción: Realiza una eliminación lógica (soft delete) de una
  // persona cambiando su estado 'activo' a false. La persona permanece
  // en la base de datos pero no aparece en consultas normales.
  // ********************************************************************
  static async deactivate(req, res) {
    try {
      const { id } = req.params;

      // ----------------------------------------------------------------
      // BLOQUE 6.1: Validación de formato de ID
      // ----------------------------------------------------------------
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ 
          success: false, 
          message: 'ID inválido' 
        });
      }

      // ----------------------------------------------------------------
      // BLOQUE 6.2: Actualización a estado inactivo
      // ----------------------------------------------------------------
      // Cambia únicamente el campo 'activo' a false manteniendo
      // todos los demás datos intactos.
      const personaDesactivada = await Person.findByIdAndUpdate(
        id,
        { activo: false },
        { new: true }
      );

      // ----------------------------------------------------------------
      // BLOQUE 6.3: Verificación de existencia
      // ----------------------------------------------------------------
      if (!personaDesactivada) {
        return res.status(404).json({ 
          success: false, 
          message: 'Persona no encontrada' 
        });
      }

      // ----------------------------------------------------------------
      // BLOQUE 6.4: Respuesta con estado actualizado
      // ----------------------------------------------------------------
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

  // ********************************************************************
  // MÓDULO 7: REACTIVACIÓN DE PERSONA
  // ********************************************************************
  // Descripción: Restaura una persona previamente desactivada cambiando
  // su estado 'activo' de nuevo a true. Esto permite recuperar personas
  // que fueron eliminadas lógicamente sin necesidad de recrearlas.
  // ********************************************************************
  static async reactivate(req, res) {
    try {
      const { id } = req.params;

      // ----------------------------------------------------------------
      // BLOQUE 7.1: Validación de formato de ID
      // ----------------------------------------------------------------
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ 
          success: false, 
          message: 'ID inválido' 
        });
      }

      // ----------------------------------------------------------------
      // BLOQUE 7.2: Actualización a estado activo
      // ----------------------------------------------------------------
      // Cambia el campo 'activo' a true, restaurando la visibilidad
      // de la persona en todas las consultas normales.
      const personaReactivada = await Person.findByIdAndUpdate(
        id,
        { activo: true },
        { new: true }
      );

      // ----------------------------------------------------------------
      // BLOQUE 7.3: Verificación de existencia
      // ----------------------------------------------------------------
      if (!personaReactivada) {
        return res.status(404).json({ 
          success: false, 
          message: 'Persona no encontrada' 
        });
      }

      // ----------------------------------------------------------------
      // BLOQUE 7.4: Respuesta de reactivación exitosa
      // ----------------------------------------------------------------
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