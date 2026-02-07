import Department from '../models/Department.js';
import Person from '../models/Person.js';

// ============================================================================
// SECCIÓN: CONTROLADOR DE DEPARTAMENTOS
// ============================================================================
// Este archivo maneja todas las operaciones CRUD relacionadas con departamentos.
// Incluye obtención, creación, actualización y eliminación lógica de departamentos.
// ============================================================================

class DepartmentController {
  
  // ********************************************************************
  // MÓDULO 1: OBTENCIÓN DE TODOS LOS DEPARTAMENTOS
  // ********************************************************************
  // Descripción: Obtiene la lista completa de departamentos activos, 
  // contando además la cantidad de personas activas en cada uno.
  // ********************************************************************
  static async getAll(req, res) {
    try {
      // ----------------------------------------------------------------
      // BLOQUE 1.1: Consulta de departamentos activos
      // ----------------------------------------------------------------
      // Busca todos los departamentos con estado activo y los ordena
      // alfabéticamente por nombre.
      const departments = await Department.find({ activo: true }).sort({ nombre: 1 });
      
      // ----------------------------------------------------------------
      // BLOQUE 1.2: Conteo de personas por departamento
      // ----------------------------------------------------------------
      // Para cada departamento, cuenta cuántas personas activas están 
      // asignadas a él. Se usa Promise.all para realizar las consultas
      // en paralelo y mejorar el rendimiento.
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

      // ----------------------------------------------------------------
      // BLOQUE 1.3: Envío de respuesta exitosa
      // ----------------------------------------------------------------
      // Devuelve la lista de departamentos con su respectivo conteo de personas.
      res.json({ success: true, departments: departmentsWithCounts });
    } catch (error) {
      // ----------------------------------------------------------------
      // BLOQUE 1.4: Manejo de errores en la obtención
      // ----------------------------------------------------------------
      // Registra el error en consola y responde con un estado 500 y un
      // mensaje genérico para no exponer detalles internos al cliente.
      console.error('Error obteniendo departamentos:', error);
      res.status(500).json({ success: false, message: 'Error al obtener departamentos' });
    }
  }

  // ********************************************************************
  // MÓDULO 2: CREACIÓN DE UN NUEVO DEPARTAMENTO
  // ********************************************************************
  // Descripción: Crea un nuevo registro de departamento en la base de datos
  // después de validar que el nombre no exista y que los campos obligatorios
  // estén presentes.
  // ********************************************************************
  static async create(req, res) {
    try {
      const { nombre, descripcion, color, icon } = req.body;
      
      // ----------------------------------------------------------------
      // BLOQUE 2.1: Validación de campo obligatorio
      // ----------------------------------------------------------------
      // Verifica que el campo 'nombre' se haya proporcionado en la solicitud.
      if (!nombre) {
        return res.status(400).json({ 
          success: false, 
          message: 'El nombre es obligatorio' 
        });
      }

      // ----------------------------------------------------------------
      // BLOQUE 2.2: Verificación de duplicados
      // ----------------------------------------------------------------
      // Busca si ya existe un departamento activo con el mismo nombre,
      // usando una expresión regular insensible a mayúsculas/minúsculas.
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

      // ----------------------------------------------------------------
      // BLOQUE 2.3: Construcción del nuevo departamento
      // ----------------------------------------------------------------
      // Crea una nueva instancia del modelo Department con los datos recibidos.
      // Asigna valores por defecto para color e icono si no se proporcionaron.
      const nuevoDepartamento = new Department({
        nombre,
        descripcion,
        color: color || '#3b82f6',
        icon: icon || 'building'
      });

      // ----------------------------------------------------------------
      // BLOQUE 2.4: Persistencia en la base de datos
      // ----------------------------------------------------------------
      // Guarda el nuevo departamento en la colección correspondiente.
      await nuevoDepartamento.save();
      
      // ----------------------------------------------------------------
      // BLOQUE 2.5: Respuesta exitosa de creación
      // ----------------------------------------------------------------
      // Devuelve el departamento creado y un mensaje de confirmación.
      res.json({ 
        success: true, 
        message: 'Departamento creado correctamente',
        department: nuevoDepartamento 
      });
    } catch (error) {
      // ----------------------------------------------------------------
      // BLOQUE 2.6: Manejo de errores en la creación
      // ----------------------------------------------------------------
      // Registra el error en consola y responde con estado 500.
      console.error('Error creando departamento:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error al crear departamento' 
      });
    }
  }

  // ********************************************************************
  // MÓDULO 3: ACTUALIZACIÓN DE DEPARTAMENTO EXISTENTE
  // ********************************************************************
  // Descripción: Actualiza la información de un departamento específico
  // identificado por su ID. Valida que el departamento exista antes de
  // proceder con la actualización.
  // ********************************************************************
  static async update(req, res) {
    try {
      const { id } = req.params;
      const { nombre, descripcion, color, icon } = req.body;

      // ----------------------------------------------------------------
      // BLOQUE 3.1: Búsqueda y actualización en una operación
      // ----------------------------------------------------------------
      // Utiliza findByIdAndUpdate para buscar por ID y actualizar los campos
      // en una sola operación atómica. La opción {new: true} devuelve el
      // documento actualizado y {runValidators: true} aplica las validaciones
      // definidas en el esquema.
      const departamentoActualizado = await Department.findByIdAndUpdate(
        id,
        { nombre, descripcion, color, icon },
        { new: true, runValidators: true }
      );

      // ----------------------------------------------------------------
      // BLOQUE 3.2: Validación de existencia del departamento
      // ----------------------------------------------------------------
      // Si no se encontró un departamento con el ID proporcionado,
      // responde con un error 404.
      if (!departamentoActualizado) {
        return res.status(404).json({ 
          success: false, 
          message: 'Departamento no encontrado' 
        });
      }

      // ----------------------------------------------------------------
      // BLOQUE 3.3: Respuesta exitosa de actualización
      // ----------------------------------------------------------------
      // Devuelve el departamento con los datos actualizados.
      res.json({ 
        success: true, 
        message: 'Departamento actualizado correctamente',
        department: departamentoActualizado 
      });
    } catch (error) {
      // ----------------------------------------------------------------
      // BLOQUE 3.4: Manejo de errores en la actualización
      // ----------------------------------------------------------------
      console.error('Error actualizando departamento:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error al actualizar departamento' 
      });
    }
  }

  // ********************************************************************
  // MÓDULO 4: ELIMINACIÓN LÓGICA DE DEPARTAMENTO
  // ********************************************************************
  // Descripción: Realiza una eliminación lógica (soft delete) de un
  // departamento cambiando su estado 'activo' a false. Previene la
  // eliminación si existen personas activas asociadas al departamento.
  // ********************************************************************
  static async delete(req, res) {
    try {
      const { id } = req.params;

      // ----------------------------------------------------------------
      // BLOQUE 4.1: Búsqueda del departamento a eliminar
      // ----------------------------------------------------------------
      // Obtiene el departamento por ID para verificar su existencia
      // y acceder a su nombre (necesario para la validación siguiente).
      const departamento = await Department.findById(id);
      if (!departamento) {
        return res.status(404).json({ 
          success: false, 
          message: 'Departamento no encontrado' 
        });
      }

      // ----------------------------------------------------------------
      // BLOQUE 4.2: Validación de integridad referencial
      // ----------------------------------------------------------------
      // Cuenta cuántas personas activas tienen asignado este departamento.
      // Si hay al menos una, impide la eliminación para mantener la
      // consistencia de los datos.
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

      // ----------------------------------------------------------------
      // BLOQUE 4.3: Eliminación lógica (soft delete)
      // ----------------------------------------------------------------
      // En lugar de borrar físicamente el registro, se actualiza el campo
      // 'activo' a false. Esto permite mantener el historial y posibles
      // relaciones futuras.
      await Department.findByIdAndUpdate(id, { activo: false });

      // ----------------------------------------------------------------
      // BLOQUE 4.4: Respuesta exitosa de eliminación
      // ----------------------------------------------------------------
      res.json({ 
        success: true, 
        message: 'Departamento eliminado correctamente' 
      });
    } catch (error) {
      // ----------------------------------------------------------------
      // BLOQUE 4.5: Manejo de errores en la eliminación
      // ----------------------------------------------------------------
      console.error('Error eliminando departamento:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error al eliminar departamento' 
      });
    }
  }
}

export default DepartmentController;