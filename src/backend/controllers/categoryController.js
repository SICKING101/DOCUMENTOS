import mongoose from 'mongoose';
import Category from '../models/Category.js';
import Document from '../models/Document.js';
import NotificationService from '../services/notificationService.js';

// ============================================================================
// SECCIÓN: CONTROLADOR DE CATEGORÍAS
// ============================================================================
// Este archivo maneja todas las operaciones CRUD relacionadas con categorías.
// Permite gestionar las categorías utilizadas para clasificar documentos,
// incluyendo validaciones de integridad referencial y conteo de documentos asociados.
// ============================================================================

class CategoryController {
  
  // ********************************************************************
  // MÓDULO 1: OBTENCIÓN DE TODAS LAS CATEGORÍAS CON CONTEO
  // ********************************************************************
  // Descripción: Obtiene la lista completa de categorías activas junto con
  // el número de documentos asociados a cada una. Esto proporciona una vista
  // enriquecida que muestra no solo las categorías sino también su uso actual.
  // ********************************************************************
  static async getAll(req, res) {
    try {
      // ----------------------------------------------------------------
      // BLOQUE 1.1: Consulta de categorías activas
      // ----------------------------------------------------------------
      // Recupera todas las categorías con estado activo y las ordena
      // alfabéticamente por nombre para consistencia en la interfaz.
      const categories = await Category.find({ activo: true }).sort({ nombre: 1 });
      
      // ----------------------------------------------------------------
      // BLOQUE 1.2: Conteo de documentos por categoría
      // ----------------------------------------------------------------
      // Para cada categoría, cuenta cuántos documentos activos están
      // clasificados bajo esa categoría. Se usa Promise.all para ejecutar
      // todas las consultas de conteo en paralelo y mejorar el rendimiento.
      const categoriesWithCounts = await Promise.all(
        categories.map(async (category) => {
          const documentCount = await Document.countDocuments({ 
            categoria: category.nombre,
            activo: true 
          });
          return {
            ...category.toObject(),
            documentCount
          };
        })
      );

      // ----------------------------------------------------------------
      // BLOQUE 1.3: Respuesta con datos enriquecidos
      // ----------------------------------------------------------------
      // Devuelve el array de categorías que ahora incluye el campo adicional
      // documentCount para cada categoría.
      res.json({ success: true, categories: categoriesWithCounts });
      
    } catch (error) {
      console.error('Error obteniendo categorías:', error);
      res.status(500).json({ success: false, message: 'Error al obtener categorías' });
    }
  }

  // ********************************************************************
  // MÓDULO 2: CREACIÓN DE NUEVA CATEGORÍA
  // ********************************************************************
  // Descripción: Crea una nueva categoría en el sistema con validación de
  // campos obligatorios y verificación de unicidad del nombre. Incluye
  // valores por defecto para color e ícono, y genera notificación opcional.
  // ********************************************************************
  static async create(req, res) {
    try {
      const { nombre, descripcion, color, icon } = req.body;
      
      // ----------------------------------------------------------------
      // BLOQUE 2.1: Validación de campo obligatorio
      // ----------------------------------------------------------------
      // Verifica que el nombre esté presente, ya que es el identificador
      // principal de la categoría y no puede estar vacío.
      if (!nombre) {
        return res.status(400).json({ 
          success: false, 
          message: 'El nombre es obligatorio' 
        });
      }

      // ----------------------------------------------------------------
      // BLOQUE 2.2: Verificación de unicidad del nombre
      // ----------------------------------------------------------------
      // Busca si ya existe una categoría activa con el mismo nombre,
      // usando expresión regular insensible a mayúsculas/minúsculas para
      // evitar duplicados con diferencias de capitalización.
      const categoriaExistente = await Category.findOne({ 
        nombre: { $regex: new RegExp(`^${nombre}$`, 'i') },
        activo: true 
      });

      if (categoriaExistente) {
        return res.status(400).json({ 
          success: false, 
          message: 'Ya existe una categoría con ese nombre' 
        });
      }

      // ----------------------------------------------------------------
      // BLOQUE 2.3: Construcción con valores por defecto
      // ----------------------------------------------------------------
      // Crea la nueva categoría asignando valores por defecto cuando
      // no se proporcionan específicamente:
      // - Color: morado (#4f46e5) como color corporativo predeterminado
      // - Ícono: 'folder' como ícono genérico para categorías
      const nuevaCategoria = new Category({
        nombre,
        descripcion,
        color: color || '#4f46e5',
        icon: icon || 'folder'
      });

      // ----------------------------------------------------------------
      // BLOQUE 2.4: Persistencia en base de datos
      // ----------------------------------------------------------------
      await nuevaCategoria.save();
      
      // ----------------------------------------------------------------
      // BLOQUE 2.5: Notificación de creación (opcional)
      // ----------------------------------------------------------------
      // Intenta crear una notificación sobre la nueva categoría.
      // Si falla, solo se registra el error sin afectar la operación principal.
      try {
        await NotificationService.categoriaAgregada(nuevaCategoria);
      } catch (notifError) {
        console.error('⚠️ Error creando notificación:', notifError.message);
      }
      
      // ----------------------------------------------------------------
      // BLOQUE 2.6: Respuesta exitosa con datos completos
      // ----------------------------------------------------------------
      res.json({ 
        success: true, 
        message: 'Categoría creada correctamente',
        category: nuevaCategoria 
      });
      
    } catch (error) {
      console.error('Error creando categoría:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error al crear categoría' 
      });
    }
  }

  // ********************************************************************
  // MÓDULO 3: ACTUALIZACIÓN DE CATEGORÍA EXISTENTE
  // ********************************************************************
  // Descripción: Actualiza la información de una categoría específica
  // identificada por su ID. Incluye validación de formato de ID y
  // verificación de existencia previa del registro.
  // ********************************************************************
  static async update(req, res) {
    try {
      const { id } = req.params;
      const { nombre, descripcion, color, icon } = req.body;

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
      // BLOQUE 3.2: Actualización atómica con validaciones
      // ----------------------------------------------------------------
      // Usa findByIdAndUpdate para buscar y actualizar en una sola operación.
      // {new: true} devuelve el documento actualizado y {runValidators: true}
      // aplica las validaciones definidas en el esquema del modelo.
      const categoriaActualizada = await Category.findByIdAndUpdate(
        id,
        { nombre, descripcion, color, icon },
        { new: true, runValidators: true }
      );

      // ----------------------------------------------------------------
      // BLOQUE 3.3: Verificación de existencia
      // ----------------------------------------------------------------
      // Si no se encuentra la categoría con el ID dado, responde con
      // error 404 en lugar de crear una nueva categoría.
      if (!categoriaActualizada) {
        return res.status(404).json({ 
          success: false, 
          message: 'Categoría no encontrada' 
        });
      }

      // ----------------------------------------------------------------
      // BLOQUE 3.4: Respuesta con datos actualizados
      // ----------------------------------------------------------------
      res.json({ 
        success: true, 
        message: 'Categoría actualizada correctamente',
        category: categoriaActualizada 
      });
      
    } catch (error) {
      console.error('Error actualizando categoría:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error al actualizar categoría' 
      });
    }
  }

  // ********************************************************************
  // MÓDULO 4: ELIMINACIÓN LÓGICA DE CATEGORÍA
  // ********************************************************************
  // Descripción: Realiza una eliminación lógica (soft delete) de una
  // categoría cambiando su campo 'activo' a false. Previene la eliminación
  // si hay documentos asociados a la categoría para mantener la integridad
  // referencial de los datos.
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
      // BLOQUE 4.2: Verificación de existencia de la categoría
      // ----------------------------------------------------------------
      // Obtiene la categoría completa para validar que existe y para
      // acceder a su nombre (necesario para la validación de documentos).
      const categoria = await Category.findById(id);
      if (!categoria) {
        return res.status(404).json({ 
          success: false, 
          message: 'Categoría no encontrada' 
        });
      }

      // ----------------------------------------------------------------
      // BLOQUE 4.3: Verificación de integridad referencial
      // ----------------------------------------------------------------
      // Cuenta cuántos documentos activos están clasificados bajo esta
      // categoría. Si hay al menos un documento, bloquea la eliminación
      // para evitar dejar documentos sin categoría válida.
      const documentosEnCategoria = await Document.countDocuments({ 
        categoria: categoria.nombre,
        activo: true 
      });

      if (documentosEnCategoria > 0) {
        return res.status(400).json({ 
          success: false, 
          message: 'No se puede eliminar la categoría porque tiene documentos asociados' 
        });
      }

      // ----------------------------------------------------------------
      // BLOQUE 4.4: Eliminación lógica (soft delete)
      // ----------------------------------------------------------------
      // Cambia el campo 'activo' a false en lugar de eliminar físicamente
      // el documento. Esto mantiene el registro histórico mientras oculta
      // la categoría de las consultas normales.
      await Category.findByIdAndUpdate(id, { activo: false });

      // ----------------------------------------------------------------
      // BLOQUE 4.5: Confirmación de eliminación
      // ----------------------------------------------------------------
      res.json({ 
        success: true, 
        message: 'Categoría eliminada correctamente' 
      });
      
    } catch (error) {
      console.error('Error eliminando categoría:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error al eliminar categoría' 
      });
    }
  }
}

// Exportar como default
export default CategoryController;