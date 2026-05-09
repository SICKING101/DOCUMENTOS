// src/backend/controllers/personController.js

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
      console.log('🏫 req.schoolId:', req.schoolId || 'superadmin (sin filtro)');
      
      const filter = { activo: true };
      
      // ✅ Filtrar por escuela si no es superadmin
      if (req.schoolId) {
        filter.schoolId = req.schoolId;
      }
      
      const persons = await Person.find(filter).sort({ nombre: 1 });
      
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
    console.log('🏫 School ID:', req.schoolId);
    console.log('👤 Usuario autenticado:', req.user ? {
      id: req.user._id,
      usuario: req.user.usuario,
      rol: req.user.rol,
      email: req.user.correo
    } : '❌ NO HAY USUARIO');

    try {
      const { nombre, email, telefono, departamento, puesto } = req.body;
      
      if (!nombre || !email) {
        console.log('❌ Validación falló: nombre y email requeridos');
        return res.status(400).json({ 
          success: false, 
          message: 'Nombre y email son obligatorios' 
        });
      }

      // ✅ Verificar si el email existe en CUALQUIER escuela
      const emailExistente = await Person.findOne({ 
        email: { $regex: new RegExp(`^${email}$`, 'i') }
      });

      if (emailExistente) {
        // Si existe en la MISMA escuela
        if (emailExistente.schoolId === req.schoolId) {
          console.log('❌ Email duplicado en la misma escuela:', email);
          return res.status(400).json({ 
            success: false, 
            message: 'Ya existe una persona con ese email en tu escuela' 
          });
        }
        
        // Si existe en OTRA escuela
        console.log('❌ Email registrado en otra escuela:', email, '| schoolId:', emailExistente.schoolId);
        return res.status(400).json({ 
          success: false, 
          message: 'Este email ya está registrado en otra escuela. Debe darse de baja primero en esa escuela antes de poder registrarlo aquí.' 
        });
      }

      const nuevaPersona = new Person({
        nombre,
        email,
        telefono,
        departamento,
        puesto,
        schoolId: req.schoolId || 'superadmin'
      });

      await nuevaPersona.save();
      console.log('✅ Persona guardada en BD con ID:', nuevaPersona._id);
      console.log('🏫 School ID asignado:', nuevaPersona.schoolId);
      
      try {
        await AuditService.logPersonCreate(req, nuevaPersona);
        console.log('✅✅✅ AUDITORÍA REGISTRADA EXITOSAMENTE');
      } catch (auditError) {
        console.error('❌ ERROR REGISTRANDO AUDITORÍA:', auditError.message);
      }
      
      try {
        await NotificationService.personaAgregada(nuevaPersona, req.schoolId);
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
    console.log('🏫 School ID:', req.schoolId);
    
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

      // ✅ Buscar solo dentro de la escuela del admin
      const filter = { _id: id };
      if (req.schoolId) {
        filter.schoolId = req.schoolId;
      }

      const personaOriginal = await Person.findOne(filter);
      
      if (!personaOriginal) {
        console.log('❌ Persona no encontrada o no pertenece a tu escuela:', id);
        return res.status(404).json({ 
          success: false, 
          message: 'Persona no encontrada o no pertenece a tu escuela' 
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
      const personaActualizada = await Person.findOneAndUpdate(
        filter,
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
    console.log('🏫 School ID:', req.schoolId);

    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        console.log('❌ ID inválido:', id);
        return res.status(400).json({ 
          success: false, 
          message: 'ID inválido' 
        });
      }

      const filter = { _id: id };
      if (req.schoolId) {
        filter.schoolId = req.schoolId;
      }

      const personaExistente = await Person.findOne(filter);
      
      if (!personaExistente) {
        console.log('❌ Persona no encontrada o no pertenece a tu escuela:', id);
        return res.status(404).json({ 
          success: false, 
          message: 'Persona no encontrada o no pertenece a tu escuela' 
        });
      }

      console.log('📋 Persona a eliminar:', {
        nombre: personaExistente.nombre,
        email: personaExistente.email
      });

      const docFilter = { 
        persona_id: id, 
        $or: [
          { isDeleted: false },
          { isDeleted: { $exists: false } }
        ]
      };
      if (req.schoolId) {
        docFilter.schoolId = req.schoolId;
      }

      const documentosAsociados = await Document.countDocuments(docFilter);

      if (documentosAsociados > 0) {
        console.log(`❌ Persona tiene ${documentosAsociados} documentos asociados`);
        
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

      await Person.findByIdAndDelete(id);
      console.log('✅ Persona eliminada de BD');

      try {
        await AuditService.logPersonDelete(req, personaExistente, false);
        console.log('✅✅✅ ELIMINACIÓN REGISTRADA EN AUDITORÍA');
      } catch (auditError) {
        console.error('❌ Error registrando eliminación:', auditError.message);
      }

      // ✅ Notificación con schoolId
      try {
        await NotificationService.personaEliminada(personaExistente.nombre, req.schoolId);
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
      const filter = { activo: false };
      
      // ✅ Filtrar por escuela si no es superadmin
      if (req.schoolId) {
        filter.schoolId = req.schoolId;
      }
      
      const persons = await Person.find(filter).sort({ nombre: 1 });
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