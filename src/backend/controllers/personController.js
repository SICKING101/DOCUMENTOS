import mongoose from 'mongoose';
import Person from '../models/Person.js';
import Document from '../models/Document.js';
import NotificationService from '../services/notificationService.js';
import AuditLog from '../models/AuditLog.js'; // ✅ IMPORTACIÓN DIRECTA DEL MODELO

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
      res.status(500).json({ success: false, message: 'Error al obtener personas' });
    }
  }

  // ===========================================================================
  // CREAR NUEVA PERSONA - CON AUDITORÍA
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
      // REGISTRAR EN AUDITORÍA - VERSIÓN DIRECTA Y ROBUSTA
      // =======================================================================
      
      console.log('📝 Intentando registrar en auditoría...');
      
      try {
        // Preparar datos para auditoría
        const auditData = {
          userId: req.user?._id || new mongoose.Types.ObjectId(),
          username: req.user?.usuario || 'sistema',
          userRole: req.user?.rol || 'sistema',
          userEmail: req.user?.correo || 'sistema@local',
          action: 'PERSON_CREATE',
          actionType: 'CREATE',
          actionCategory: 'PERSONS',
          targetId: nuevaPersona._id,
          targetModel: 'Person',
          targetName: nuevaPersona.nombre,
          description: `Persona creada: ${nuevaPersona.nombre} (${nuevaPersona.email})`,
          severity: 'INFO',
          status: 'SUCCESS',
          metadata: {
            ipAddress: req.ip || req.connection?.remoteAddress || '0.0.0.0',
            userAgent: req.headers['user-agent'] || 'Desconocido',
            email: nuevaPersona.email,
            telefono: nuevaPersona.telefono || 'No especificado',
            departamento: nuevaPersona.departamento || 'No especificado',
            puesto: nuevaPersona.puesto || 'No especificado',
            timestamp: new Date().toISOString()
          }
        };

        console.log('📊 Datos de auditoría preparados:', JSON.stringify({
          ...auditData,
          userId: auditData.userId.toString()
        }, null, 2));

        // Guardar en auditoría
        const auditLog = new AuditLog(auditData);
        await auditLog.save();
        
        console.log('✅✅✅ AUDITORÍA REGISTRADA EXITOSAMENTE');
        console.log('📌 ID del registro:', auditLog._id);
        
        // Verificar que se guardó
        const verificado = await AuditLog.findById(auditLog._id);
        if (verificado) {
          console.log('✅ Verificación: registro existe en BD');
        } else {
          console.log('❌ Verificación: registro NO encontrado después de guardar');
        }

      } catch (auditError) {
        console.error('❌ ERROR REGISTRANDO AUDITORÍA:');
        console.error('📌 Mensaje:', auditError.message);
        console.error('📌 Stack:', auditError.stack);
        
        // NO interrumpimos el flujo principal si falla la auditoría
      }
      
      // Crear notificación (opcional, no crítica)
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
        message: 'Error al crear persona' 
      });
    }
  }

  // ===========================================================================
  // ACTUALIZAR PERSONA - CON AUDITORÍA
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
        { nombre, email, telefono, departamento, puesto },
        { new: true, runValidators: true }
      );

      if (!personaActualizada) {
        return res.status(404).json({ 
          success: false, 
          message: 'Persona no encontrada' 
        });
      }

      console.log('✅ Persona actualizada:', personaActualizada.nombre);

      // =======================================================================
      // REGISTRAR EN AUDITORÍA
      // =======================================================================
      
      try {
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

        const auditData = {
          userId: req.user?._id || new mongoose.Types.ObjectId(),
          username: req.user?.usuario || 'sistema',
          userRole: req.user?.rol || 'sistema',
          userEmail: req.user?.correo || 'sistema@local',
          action: 'PERSON_UPDATE',
          actionType: 'UPDATE',
          actionCategory: 'PERSONS',
          targetId: personaActualizada._id,
          targetModel: 'Person',
          targetName: personaActualizada.nombre,
          description: `Persona actualizada: ${personaActualizada.nombre} - Campos: ${camposModificados.join(', ')}`,
          severity: 'INFO',
          status: 'SUCCESS',
          changes: {
            before: beforeState,
            after: afterState
          },
          metadata: {
            ipAddress: req.ip || req.connection?.remoteAddress || '0.0.0.0',
            userAgent: req.headers['user-agent'] || 'Desconocido',
            camposModificados,
            timestamp: new Date().toISOString()
          }
        };

        const auditLog = new AuditLog(auditData);
        await auditLog.save();
        console.log('✅✅✅ AUDITORÍA REGISTRADA - ID:', auditLog._id);

      } catch (auditError) {
        console.error('❌ Error registrando auditoría:', auditError.message);
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
        message: 'Error al actualizar persona' 
      });
    }
  }

  // ===========================================================================
  // ELIMINAR PERSONA PERMANENTEMENTE - CON AUDITORÍA
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

      // Guardar datos para auditoría
      const personaData = {
        id: personaExistente._id,
        nombre: personaExistente.nombre,
        email: personaExistente.email,
        telefono: personaExistente.telefono,
        departamento: personaExistente.departamento,
        puesto: personaExistente.puesto
      };

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
        
        // Registrar intento fallido
        try {
          const auditData = {
            userId: req.user?._id || new mongoose.Types.ObjectId(),
            username: req.user?.usuario || 'sistema',
            userRole: req.user?.rol || 'sistema',
            userEmail: req.user?.correo || 'sistema@local',
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
              ipAddress: req.ip || '0.0.0.0',
              documentosAsociados,
              reason: 'Tiene documentos asociados'
            }
          };
          
          await AuditLog.create(auditData);
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
        const auditData = {
          userId: req.user?._id || new mongoose.Types.ObjectId(),
          username: req.user?.usuario || 'sistema',
          userRole: req.user?.rol || 'sistema',
          userEmail: req.user?.correo || 'sistema@local',
          action: 'PERSON_DELETE',
          actionType: 'DELETE',
          actionCategory: 'PERSONS',
          targetId: id,
          targetModel: 'Person',
          targetName: personaData.nombre,
          description: `Persona eliminada permanentemente: ${personaData.nombre} (${personaData.email})`,
          severity: 'WARNING',
          status: 'SUCCESS',
          metadata: {
            ipAddress: req.ip || req.connection?.remoteAddress || '0.0.0.0',
            userAgent: req.headers['user-agent'] || 'Desconocido',
            personaEliminada: personaData,
            eliminacionPermanente: true,
            timestamp: new Date().toISOString()
          }
        };

        const auditLog = new AuditLog(auditData);
        await auditLog.save();
        console.log('✅✅✅ ELIMINACIÓN REGISTRADA EN AUDITORÍA - ID:', auditLog._id);

      } catch (auditError) {
        console.error('❌ Error registrando eliminación:', auditError.message);
      }

      // Crear notificación
      try {
        await NotificationService.personaEliminada(personaData.nombre);
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
        message: 'Error al eliminar persona' 
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
  // DESACTIVAR PERSONA - CON AUDITORÍA
  // ===========================================================================
  static async deactivate(req, res) {
    console.log('\n🔍 ========== DESACTIVANDO PERSONA ==========');
    console.log('📝 ID:', req.params.id);

    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ 
          success: false, 
          message: 'ID inválido' 
        });
      }

      const personaOriginal = await Person.findById(id);
      
      if (!personaOriginal) {
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
        const auditData = {
          userId: req.user?._id || new mongoose.Types.ObjectId(),
          username: req.user?.usuario || 'sistema',
          userRole: req.user?.rol || 'sistema',
          userEmail: req.user?.correo || 'sistema@local',
          action: 'PERSON_DEACTIVATE',
          actionType: 'UPDATE',
          actionCategory: 'PERSONS',
          targetId: personaDesactivada._id,
          targetModel: 'Person',
          targetName: personaDesactivada.nombre,
          description: `Persona desactivada: ${personaDesactivada.nombre}`,
          severity: 'WARNING',
          status: 'SUCCESS',
          changes: {
            before: { activo: true },
            after: { activo: false }
          },
          metadata: {
            ipAddress: req.ip || '0.0.0.0',
            userAgent: req.headers['user-agent'] || 'Desconocido'
          }
        };

        await AuditLog.create(auditData);
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
        message: 'Error al desactivar persona' 
      });
    }
  }

  // ===========================================================================
  // REACTIVAR PERSONA - CON AUDITORÍA
  // ===========================================================================
  static async reactivate(req, res) {
    console.log('\n🔍 ========== REACTIVANDO PERSONA ==========');
    console.log('📝 ID:', req.params.id);

    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ 
          success: false, 
          message: 'ID inválido' 
        });
      }

      const personaOriginal = await Person.findById(id);
      
      if (!personaOriginal) {
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
        const auditData = {
          userId: req.user?._id || new mongoose.Types.ObjectId(),
          username: req.user?.usuario || 'sistema',
          userRole: req.user?.rol || 'sistema',
          userEmail: req.user?.correo || 'sistema@local',
          action: 'PERSON_REACTIVATE',
          actionType: 'UPDATE',
          actionCategory: 'PERSONS',
          targetId: personaReactivada._id,
          targetModel: 'Person',
          targetName: personaReactivada.nombre,
          description: `Persona reactivada: ${personaReactivada.nombre}`,
          severity: 'INFO',
          status: 'SUCCESS',
          changes: {
            before: { activo: false },
            after: { activo: true }
          },
          metadata: {
            ipAddress: req.ip || '0.0.0.0',
            userAgent: req.headers['user-agent'] || 'Desconocido'
          }
        };

        await AuditLog.create(auditData);
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
        message: 'Error al reactivar persona' 
      });
    }
  }
}

export default PersonController;