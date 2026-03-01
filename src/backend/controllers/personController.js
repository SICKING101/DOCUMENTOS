import mongoose from 'mongoose';
import Person from '../models/Person.js';
import Document from '../models/Document.js';
import NotificationService from '../services/notificationService.js';
import AuditService from '../services/auditService.js';

class PersonController {
  // ===========================================================================
  // OBTENER TODAS LAS PERSONAS
  // ===========================================================================
  static async getAll(req, res) {
    try {
      console.log('📋 PersonController.getAll - Iniciando');
      
      const persons = await Person.find({ activo: true }).sort({ nombre: 1 });
      
      console.log(`✅ ${persons.length} personas encontradas`);
      
      res.json({ success: true, persons });
    } catch (error) {
      console.error('❌ Error obteniendo personas:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error al obtener personas' 
      });
    }
  }

  // ===========================================================================
  // CREAR NUEVA PERSONA
  // ===========================================================================
  static async create(req, res) {
    console.log('\n🔍 ========== CREANDO NUEVA PERSONA ==========');
    console.log('📝 Body recibido:', req.body);
    console.log('👤 Usuario autenticado:', req.user ? {
      id: req.user._id,
      usuario: req.user.usuario,
      rol: req.user.rol,
      email: req.user.correo
    } : '❌ NO HAY USUARIO');

    try {
      const { nombre, email, telefono, departamento, puesto } = req.body;
      
      // Validaciones básicas
      if (!nombre || !email) {
        console.log('❌ Validación falló: nombre y email requeridos');
        return res.status(400).json({ 
          success: false, 
          message: 'Nombre y email son obligatorios' 
        });
      }

      // Verificar email duplicado
      const personaExistente = await Person.findOne({ 
        email: { $regex: new RegExp(`^${email}$`, 'i') }
      });

      if (personaExistente) {
        console.log('❌ Email duplicado:', email);
        return res.status(400).json({ 
          success: false, 
          message: 'Ya existe una persona con ese email' 
        });
      }

      // Crear y guardar la persona
      const nuevaPersona = new Person({
        nombre,
        email,
        telefono,
        departamento,
        puesto
      });

      await nuevaPersona.save();
      console.log('✅ Persona guardada en BD con ID:', nuevaPersona._id);
      
      // =======================================================================
      // REGISTRAR EN AUDITORÍA
      // =======================================================================
      
      console.log('📝 Intentando registrar en auditoría...');
      
      try {
        await AuditService.logPersonCreate(req, nuevaPersona);
        console.log('✅✅✅ AUDITORÍA REGISTRADA EXITOSAMENTE');
      } catch (auditError) {
        console.error('❌ ERROR REGISTRANDO AUDITORÍA:', auditError.message);
        // No interrumpimos el flujo principal si falla la auditoría
      }
      
      // Crear notificación
      try {
        await NotificationService.personaAgregada(nuevaPersona);
        console.log('✅ Notificación creada');
      } catch (notifError) {
        console.error('⚠️ Error creando notificación:', notifError.message);
      }
      
      console.log('✅✅✅ PROCESO COMPLETADO EXITOSAMENTE');
      console.log('🔍 ========== FIN ==========\n');
      
      res.json({ 
        success: true, 
        message: 'Persona agregada correctamente',
        person: nuevaPersona 
      });
      
    } catch (error) {
      console.error('🔥 ERROR CRÍTICO en create:');
      console.error('📌 Mensaje:', error.message);
      console.error('📌 Stack:', error.stack);
      
      res.status(500).json({ 
        success: false, 
        message: 'Error al crear persona: ' + error.message 
      });
    }
  }

  // ===========================================================================
  // ACTUALIZAR PERSONA
  // ===========================================================================
  static async update(req, res) {
    console.log('\n🔍 ========== ACTUALIZANDO PERSONA ==========');
    console.log('📝 ID:', req.params.id);
    console.log('📝 Body:', req.body);
    
    try {
      const { id } = req.params;
      const { nombre, email, telefono, departamento, puesto } = req.body;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        console.log('❌ ID inválido:', id);
        return res.status(400).json({ 
          success: false, 
          message: 'ID inválido' 
        });
      }

      // Obtener la persona ANTES de actualizar
      const personaOriginal = await Person.findById(id);
      
      if (!personaOriginal) {
        console.log('❌ Persona no encontrada:', id);
        return res.status(404).json({ 
          success: false, 
          message: 'Persona no encontrada' 
        });
      }

      console.log('📋 Persona original:', {
        nombre: personaOriginal.nombre,
        email: personaOriginal.email,
        telefono: personaOriginal.telefono,
        departamento: personaOriginal.departamento,
        puesto: personaOriginal.puesto
      });

      // Guardar estado anterior
      const beforeState = {
        nombre: personaOriginal.nombre,
        email: personaOriginal.email,
        telefono: personaOriginal.telefono,
        departamento: personaOriginal.departamento,
        puesto: personaOriginal.puesto
      };

      // Actualizar
      const personaActualizada = await Person.findByIdAndUpdate(
        id,
        { 
          nombre: nombre || personaOriginal.nombre,
          email: email || personaOriginal.email,
          telefono: telefono || personaOriginal.telefono,
          departamento: departamento || personaOriginal.departamento,
          puesto: puesto || personaOriginal.puesto
        },
        { new: true, runValidators: true }
      );

      if (!personaActualizada) {
        return res.status(404).json({ 
          success: false, 
          message: 'Persona no encontrada' 
        });
      }

      console.log('✅ Persona actualizada:', personaActualizada.nombre);

      // Estado después
      const afterState = {
        nombre: personaActualizada.nombre,
        email: personaActualizada.email,
        telefono: personaActualizada.telefono,
        departamento: personaActualizada.departamento,
        puesto: personaActualizada.puesto
      };

      // Calcular qué campos cambiaron
      const camposModificados = [];
      for (const key in beforeState) {
        if (JSON.stringify(beforeState[key]) !== JSON.stringify(afterState[key])) {
          camposModificados.push(key);
        }
      }

      // =======================================================================
      // REGISTRAR EN AUDITORÍA
      // =======================================================================
      
      console.log('📝 Intentando registrar en auditoría...');
      
      try {
        await AuditService.logPersonUpdate(req, personaActualizada, beforeState, afterState, camposModificados);
        console.log('✅✅✅ AUDITORÍA REGISTRADA EXITOSAMENTE');
      } catch (auditError) {
        console.error('❌ ERROR REGISTRANDO AUDITORÍA:', auditError.message);
        // No interrumpimos el flujo principal si falla la auditoría
      }

      console.log('✅✅✅ ACTUALIZACIÓN COMPLETADA');
      console.log('🔍 ========== FIN ==========\n');

      res.json({ 
        success: true, 
        message: 'Persona actualizada correctamente',
        person: personaActualizada 
      });
      
    } catch (error) {
      console.error('🔥 Error en update:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error al actualizar persona: ' + error.message 
      });
    }
  }

  // ===========================================================================
  // ELIMINAR PERSONA PERMANENTEMENTE
  // ===========================================================================
  static async delete(req, res) {
    console.log('\n🔍 ========== ELIMINANDO PERSONA ==========');
    console.log('📝 ID:', req.params.id);

    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        console.log('❌ ID inválido:', id);
        return res.status(400).json({ 
          success: false, 
          message: 'ID inválido' 
        });
      }

      // Obtener datos antes de eliminar
      const personaExistente = await Person.findById(id);
      
      if (!personaExistente) {
        console.log('❌ Persona no encontrada:', id);
        return res.status(404).json({ 
          success: false, 
          message: 'Persona no encontrada' 
        });
      }

      console.log('📋 Persona a eliminar:', {
        nombre: personaExistente.nombre,
        email: personaExistente.email
      });

      // Verificar documentos asociados
      const documentosAsociados = await Document.countDocuments({ 
        persona_id: id, 
        $or: [
          { isDeleted: false },
          { isDeleted: { $exists: false } }
        ]
      });

      if (documentosAsociados > 0) {
        console.log(`❌ Persona tiene ${documentosAsociados} documentos asociados`);
        
        // =======================================================================
        // REGISTRAR INTENTO FALLIDO EN AUDITORÍA
        // =======================================================================
        
        try {
          await AuditService.log(req, {
            action: 'PERSON_DELETE',
            actionType: 'DELETE',
            actionCategory: 'PERSONS',
            targetId: id,
            targetModel: 'Person',
            targetName: personaExistente.nombre,
            description: `Intento fallido - Persona con ${documentosAsociados} documentos asociados`,
            severity: 'WARNING',
            status: 'FAILED',
            metadata: {
              documentosAsociados,
              reason: 'Tiene documentos asociados'
            }
          });
          console.log('✅ Intento fallido registrado en auditoría');
        } catch (auditError) {
          console.error('❌ Error registrando intento fallido:', auditError.message);
        }

        return res.status(400).json({ 
          success: false, 
          message: 'No se puede eliminar la persona porque tiene documentos asociados. Elimina o reasigna primero los documentos.' 
        });
      }

      // ELIMINACIÓN PERMANENTE
      await Person.findByIdAndDelete(id);
      console.log('✅ Persona eliminada de BD');

      // =======================================================================
      // REGISTRAR ELIMINACIÓN EN AUDITORÍA
      // =======================================================================
      
      try {
        await AuditService.logPersonDelete(req, personaExistente, false);
        console.log('✅✅✅ ELIMINACIÓN REGISTRADA EN AUDITORÍA');
      } catch (auditError) {
        console.error('❌ Error registrando eliminación:', auditError.message);
      }

      // Crear notificación
      try {
        await NotificationService.personaEliminada(personaExistente.nombre);
        console.log('✅ Notificación creada');
      } catch (notifError) {
        console.error('⚠️ Error creando notificación:', notifError.message);
      }

      console.log('✅✅✅ ELIMINACIÓN COMPLETADA');
      console.log('🔍 ========== FIN ==========\n');

      res.json({ 
        success: true, 
        message: 'Persona eliminada permanentemente del sistema' 
      });
      
    } catch (error) {
      console.error('🔥 Error en delete:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error al eliminar persona: ' + error.message 
      });
    }
  }

  // ===========================================================================
  // OBTENER PERSONAS INACTIVAS
  // ===========================================================================
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

  // ===========================================================================
  // DESACTIVAR PERSONA
  // ===========================================================================
  static async deactivate(req, res) {
    console.log('\n🔍 ========== DESACTIVANDO PERSONA ==========');
    console.log('📝 ID:', req.params.id);

    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        console.log('❌ ID inválido:', id);
        return res.status(400).json({ 
          success: false, 
          message: 'ID inválido' 
        });
      }

      const personaOriginal = await Person.findById(id);
      
      if (!personaOriginal) {
        console.log('❌ Persona no encontrada:', id);
        return res.status(404).json({ 
          success: false, 
          message: 'Persona no encontrada' 
        });
      }

      const personaDesactivada = await Person.findByIdAndUpdate(
        id,
        { activo: false },
        { new: true }
      );

      // =======================================================================
      // REGISTRAR DESACTIVACIÓN
      // =======================================================================
      
      try {
        await AuditService.logPersonDeactivate(req, personaDesactivada);
        console.log('✅✅✅ DESACTIVACIÓN REGISTRADA');
      } catch (auditError) {
        console.error('❌ Error registrando desactivación:', auditError.message);
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
        message: 'Error al desactivar persona: ' + error.message 
      });
    }
  }

  // ===========================================================================
  // REACTIVAR PERSONA
  // ===========================================================================
  static async reactivate(req, res) {
    console.log('\n🔍 ========== REACTIVANDO PERSONA ==========');
    console.log('📝 ID:', req.params.id);

    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        console.log('❌ ID inválido:', id);
        return res.status(400).json({ 
          success: false, 
          message: 'ID inválido' 
        });
      }

      const personaOriginal = await Person.findById(id);
      
      if (!personaOriginal) {
        console.log('❌ Persona no encontrada:', id);
        return res.status(404).json({ 
          success: false, 
          message: 'Persona no encontrada' 
        });
      }

      const personaReactivada = await Person.findByIdAndUpdate(
        id,
        { activo: true },
        { new: true }
      );

      // =======================================================================
      // REGISTRAR REACTIVACIÓN
      // =======================================================================
      
      try {
        await AuditService.logPersonReactivate(req, personaReactivada);
        console.log('✅✅✅ REACTIVACIÓN REGISTRADA');
      } catch (auditError) {
        console.error('❌ Error registrando reactivación:', auditError.message);
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
        message: 'Error al reactivar persona: ' + error.message 
      });
    }
  }
}

export default PersonController;