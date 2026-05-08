import Department from '../models/Department.js';
import Person from '../models/Person.js';

class DepartmentController {
  // ===========================================================================
  // OBTENER TODOS LOS DEPARTAMENTOS (AISLADOS POR ESCUELA)
  // ===========================================================================
  static async getAll(req, res) {
    try {
      console.log('📋 DepartmentController.getAll - Iniciando');
      console.log('🏫 req.schoolId:', req.schoolId || 'superadmin (sin filtro)');
      
      // ✅ Filtro por escuela
      const filter = { activo: true };
      if (req.schoolId) {
        filter.schoolId = req.schoolId;
      }
      
      const departments = await Department.find(filter).sort({ nombre: 1 });
      
      // Contar personas por departamento (también filtradas por escuela)
      const departmentsWithCounts = await Promise.all(
        departments.map(async (department) => {
          const personFilter = { 
            departamento: department.nombre,
            activo: true 
          };
          if (req.schoolId) {
            personFilter.schoolId = req.schoolId;
          }
          
          const personCount = await Person.countDocuments(personFilter);
          
          return {
            ...department.toObject(),
            personCount
          };
        })
      );

      console.log(`✅ ${departments.length} departamentos encontrados`);
      res.json({ success: true, departments: departmentsWithCounts });
    } catch (error) {
      console.error('Error obteniendo departamentos:', error);
      res.status(500).json({ success: false, message: 'Error al obtener departamentos' });
    }
  }

  // ===========================================================================
  // CREAR DEPARTAMENTO (ASIGNADO A LA ESCUELA DEL ADMIN)
  // ===========================================================================
  static async create(req, res) {
    try {
      const { nombre, descripcion, color, icon } = req.body;
      
      if (!nombre) {
        return res.status(400).json({ 
          success: false, 
          message: 'El nombre es obligatorio' 
        });
      }

      // ✅ Verificar duplicado SOLO dentro de la misma escuela
      const duplicadoFilter = { 
        nombre: { $regex: new RegExp(`^${nombre}$`, 'i') },
        activo: true 
      };
      if (req.schoolId) {
        duplicadoFilter.schoolId = req.schoolId;
      }

      const departamentoExistente = await Department.findOne(duplicadoFilter);

      if (departamentoExistente) {
        return res.status(400).json({ 
          success: false, 
          message: 'Ya existe un departamento con ese nombre en tu escuela' 
        });
      }

      const nuevoDepartamento = new Department({
        nombre,
        descripcion,
        color: color || '#3b82f6',
        icon: icon || 'building',
        schoolId: req.schoolId || 'superadmin'  // ✅ Asignar schoolId
      });

      await nuevoDepartamento.save();
      console.log('✅ Departamento creado:', nuevoDepartamento.nombre, '| schoolId:', nuevoDepartamento.schoolId);
      
      res.json({ 
        success: true, 
        message: 'Departamento creado correctamente',
        department: nuevoDepartamento 
      });
    } catch (error) {
      console.error('Error creando departamento:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error al crear departamento' 
      });
    }
  }

  // ===========================================================================
  // ACTUALIZAR DEPARTAMENTO (SOLO DE SU ESCUELA)
  // ===========================================================================
  static async update(req, res) {
    try {
      const { id } = req.params;
      const { nombre, descripcion, color, icon } = req.body;

      // ✅ Buscar solo dentro de la escuela del admin
      const filter = { _id: id };
      if (req.schoolId) {
        filter.schoolId = req.schoolId;
      }

      const departamentoActualizado = await Department.findOneAndUpdate(
        filter,
        { nombre, descripcion, color, icon },
        { new: true, runValidators: true }
      );

      if (!departamentoActualizado) {
        return res.status(404).json({ 
          success: false, 
          message: 'Departamento no encontrado o no pertenece a tu escuela' 
        });
      }

      console.log('✅ Departamento actualizado:', departamentoActualizado.nombre);

      res.json({ 
        success: true, 
        message: 'Departamento actualizado correctamente',
        department: departamentoActualizado 
      });
    } catch (error) {
      console.error('Error actualizando departamento:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error al actualizar departamento' 
      });
    }
  }

  // ===========================================================================
  // ELIMINAR DEPARTAMENTO (SOLO DE SU ESCUELA)
  // ===========================================================================
  static async delete(req, res) {
    try {
      const { id } = req.params;

      // ✅ Buscar solo dentro de la escuela
      const filter = { _id: id };
      if (req.schoolId) {
        filter.schoolId = req.schoolId;
      }

      const departamento = await Department.findOne(filter);
      if (!departamento) {
        return res.status(404).json({ 
          success: false, 
          message: 'Departamento no encontrado o no pertenece a tu escuela' 
        });
      }

      // ✅ Verificar personas en este departamento (filtradas por escuela)
      const personFilter = { 
        departamento: departamento.nombre,
        activo: true 
      };
      if (req.schoolId) {
        personFilter.schoolId = req.schoolId;
      }

      const personasEnDepartamento = await Person.countDocuments(personFilter);

      if (personasEnDepartamento > 0) {
        return res.status(400).json({ 
          success: false, 
          message: `No se puede eliminar el departamento porque tiene ${personasEnDepartamento} personas asociadas en tu escuela` 
        });
      }

      await Department.findOneAndUpdate(filter, { activo: false });

      console.log('✅ Departamento eliminado (soft delete):', departamento.nombre);

      res.json({ 
        success: true, 
        message: 'Departamento eliminado correctamente' 
      });
    } catch (error) {
      console.error('Error eliminando departamento:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error al eliminar departamento' 
      });
    }
  }
}

export default DepartmentController;