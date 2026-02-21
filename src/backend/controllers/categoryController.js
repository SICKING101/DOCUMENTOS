import mongoose from 'mongoose';
import Category from '../models/Category.js';
import Document from '../models/Document.js';
import NotificationService from '../services/notificationService.js';

class CategoryController {
  // Obtener todas las categorías con conteo de documentos
  static async getAll(req, res) {
    try {
      const categories = await Category.find({ activo: true }).sort({ nombre: 1 });
      
      // Contar documentos por categoría
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

      res.json({ success: true, categories: categoriesWithCounts });
    } catch (error) {
      console.error('Error obteniendo categorías:', error);
      res.status(500).json({ success: false, message: 'Error al obtener categorías' });
    }
  }

  // Crear nueva categoría
  static async create(req, res) {
    try {
      const { nombre, descripcion, color, icon } = req.body;
      
      if (!nombre) {
        return res.status(400).json({ 
          success: false, 
          message: 'El nombre es obligatorio' 
        });
      }

      // Verificar si ya existe una categoría con el mismo nombre
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

      const nuevaCategoria = new Category({
        nombre,
        descripcion,
        color: color || '#4f46e5',
        icon: icon || 'folder'
      });

      await nuevaCategoria.save();
      
      // Crear notificación de categoría agregada
      try {
        await NotificationService.categoriaAgregada(nuevaCategoria);
      } catch (notifError) {
        console.error('⚠️ Error creando notificación:', notifError.message);
      }
      
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

  // Actualizar categoría
  static async update(req, res) {
    try {
      const { id } = req.params;
      const { nombre, descripcion, color, icon } = req.body;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ 
          success: false, 
          message: 'ID inválido' 
        });
      }

      const categoriaActualizada = await Category.findByIdAndUpdate(
        id,
        { nombre, descripcion, color, icon },
        { new: true, runValidators: true }
      );

      if (!categoriaActualizada) {
        return res.status(404).json({ 
          success: false, 
          message: 'Categoría no encontrada' 
        });
      }

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

  // Eliminar categoría
  static async delete(req, res) {
    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ 
          success: false, 
          message: 'ID inválido' 
        });
      }

      const categoria = await Category.findById(id);
      if (!categoria) {
        return res.status(404).json({ 
          success: false, 
          message: 'Categoría no encontrada' 
        });
      }

      // Verificar si hay documentos en esta categoría
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

      await Category.findByIdAndUpdate(id, { activo: false });

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