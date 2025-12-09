import Department from '../models/Department.js';
import Person from '../models/Person.js';

class DepartmentController {
  // Obtener todos los departamentos
  static async getAll(req, res) {
    try {
      const departments = await Department.find({ activo: true }).sort({ nombre: 1 });
      
      // Contar personas por departamento
      const departmentsWithCounts = await Promise.all(
        departments.map(async (department) => {
          const personCount = await Person.countDocuments({ 
            departamento: department.nombre,
            activo: true 
          });
          return {
            ...department.toObject(),
            personCount
          };
        })
      );

      res.json({ success: true, departments: departmentsWithCounts });
    } catch (error) {
      console.error('Error obteniendo departamentos:', error);
      res.status(500).json({ success: false, message: 'Error al obtener departamentos' });
    }
  }

  // Crear departamento
  static async create(req, res) {
    try {
      const { nombre, descripcion, color, icon } = req.body;
      
      if (!nombre) {
        return res.status(400).json({ 
          success: false, 
          message: 'El nombre es obligatorio' 
        });
      }

      // Verificar si ya existe
      const departamentoExistente = await Department.findOne({ 
        nombre: { $regex: new RegExp(`^${nombre}$`, 'i') },
        activo: true 
      });

      if (departamentoExistente) {
        return res.status(400).json({ 
          success: false, 
          message: 'Ya existe un departamento con ese nombre' 
        });
      }

      const nuevoDepartamento = new Department({
        nombre,
        descripcion,
        color: color || '#3b82f6',
        icon: icon || 'building'
      });

      await nuevoDepartamento.save();
      
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

  // Actualizar departamento
  static async update(req, res) {
    try {
      const { id } = req.params;
      const { nombre, descripcion, color, icon } = req.body;

      const departamentoActualizado = await Department.findByIdAndUpdate(
        id,
        { nombre, descripcion, color, icon },
        { new: true, runValidators: true }
      );

      if (!departamentoActualizado) {
        return res.status(404).json({ 
          success: false, 
          message: 'Departamento no encontrado' 
        });
      }

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

  // Eliminar departamento
  static async delete(req, res) {
    try {
      const { id } = req.params;

      const departamento = await Department.findById(id);
      if (!departamento) {
        return res.status(404).json({ 
          success: false, 
          message: 'Departamento no encontrado' 
        });
      }

      // Verificar si hay personas en este departamento
      const personasEnDepartamento = await Person.countDocuments({ 
        departamento: departamento.nombre,
        activo: true 
      });

      if (personasEnDepartamento > 0) {
        return res.status(400).json({ 
          success: false, 
          message: 'No se puede eliminar el departamento porque tiene personas asociadas' 
        });
      }

      await Department.findByIdAndUpdate(id, { activo: false });

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
