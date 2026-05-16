import mongoose from 'mongoose';
import Category from '../models/Category.js';
import Document from '../models/Document.js';
import NotificationService from '../services/notificationService.js';

class CategoryController {
  // Obtener todas las categorías con conteo de documentos
  static async getAll(req, res) {
    try {
      console.log('📋 CategoryController.getAll - Iniciando');
      console.log('🏫 req.schoolId:', req.schoolId || 'superadmin (sin filtro)');
      
      const filter = { activo: true };
      if (req.schoolId) {
        filter.schoolId = req.schoolId;
      }
      
      const categories = await Category.find(filter).sort({ nombre: 1 });
      
      const categoriesWithCounts = await Promise.all(
        categories.map(async (category) => {
          const docFilter = { 
            categoria: category.nombre,
            activo: true,
            $or: [
              { isDeleted: false },
              { isDeleted: { $exists: false } }
            ]
          };
          
          if (req.schoolId) {
            docFilter.schoolId = req.schoolId;
          }
          
          const documentCount = await Document.countDocuments(docFilter);
          
          return {
            ...category.toObject(),
            documentCount
          };
        })
      );

      console.log(`✅ ${categories.length} categorías encontradas`);
      res.json({ success: true, categories: categoriesWithCounts });
    } catch (error) {
      console.error('Error obteniendo categorías:', error);
      res.status(500).json({ success: false, message: 'Error al obtener categorías' });
    }
  }

  // Crear nueva categoría
  static async create(req, res) {
    console.log('🔍 BODY COMPLETO:', JSON.stringify(req.body, null, 2));
    try {
      const { nombre, descripcion, color, icon, parent_id } = req.body;
      
      if (!nombre) {
        return res.status(400).json({ 
          success: false, 
          message: 'El nombre es obligatorio' 
        });
      }

      const duplicadoFilter = { 
        nombre: { $regex: new RegExp(`^${nombre}$`, 'i') },
        activo: true 
      };
      if (req.schoolId) {
        duplicadoFilter.schoolId = req.schoolId;
      }

      const categoriaExistente = await Category.findOne(duplicadoFilter);

      if (categoriaExistente) {
        return res.status(400).json({ 
          success: false, 
          message: 'Ya existe una categoría con ese nombre en tu escuela' 
        });
      }

      const nuevaCategoria = new Category({
        nombre,
        descripcion,
        color: color || '#4f46e5',
        icon: icon || 'folder',
        parent_id: parent_id || null,
        schoolId: req.schoolId || 'superadmin'
      });

      await nuevaCategoria.save();
      console.log('✅ Categoría creada:', nuevaCategoria.nombre, '| parent_id:', nuevaCategoria.parent_id || 'raíz', '| schoolId:', nuevaCategoria.schoolId);
      
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
        message: 'Error al crear categoría: ' + error.message 
      });
    }
  }

  // Actualizar categoría
  static async update(req, res) {
    try {
      const { id } = req.params;
      const { nombre, descripcion, color, icon, parent_id } = req.body;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ 
          success: false, 
          message: 'ID inválido' 
        });
      }

      // Buscar la categoría actual
      const categoriaActual = await Category.findById(id);
      if (!categoriaActual) {
        return res.status(404).json({ 
          success: false, 
          message: 'Categoría no encontrada' 
        });
      }

      // Validar nombre duplicado al editar (excluyendo la misma categoría)
      if (nombre && nombre !== categoriaActual.nombre) {
        const duplicadoFilter = { 
          nombre: { $regex: new RegExp(`^${nombre}$`, 'i') },
          activo: true,
          _id: { $ne: id }
        };
        if (req.schoolId) {
          duplicadoFilter.schoolId = req.schoolId;
        }

        const categoriaExistente = await Category.findOne(duplicadoFilter);
        if (categoriaExistente) {
          return res.status(400).json({ 
            success: false, 
            message: 'Ya existe una categoría con ese nombre en tu escuela' 
          });
        }
      }

      const updateData = { nombre, descripcion, color, icon };
      if (parent_id !== undefined) {
        updateData.parent_id = parent_id || null;
      }

      const categoriaActualizada = await Category.findByIdAndUpdate(
        id,
        updateData,
        { new: true, runValidators: true }
      );

      if (!categoriaActualizada) {
        return res.status(404).json({ 
          success: false, 
          message: 'Categoría no encontrada' 
        });
      }

      // Si cambió el nombre, actualizar todos los documentos de esta categoría
      if (nombre && categoriaActual.nombre !== nombre) {
        const oldName = categoriaActual.nombre;
        const docFilter = { 
          categoria: oldName,
          activo: true
        };
        if (req.schoolId) {
          docFilter.schoolId = req.schoolId;
        }

        const updateResult = await Document.updateMany(
          docFilter,
          { $set: { categoria: nombre } }
        );
        console.log(`✅ ${updateResult.modifiedCount} documentos actualizados de "${oldName}" a "${nombre}"`);
      }

      console.log('✅ Categoría actualizada:', categoriaActualizada.nombre);

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

      const docFilter = { 
        categoria: categoria.nombre,
        activo: true,
        $or: [
          { isDeleted: false },
          { isDeleted: { $exists: false } }
        ]
      };
      
      if (req.schoolId) {
        docFilter.schoolId = req.schoolId;
      }

      const documentosEnCategoria = await Document.countDocuments(docFilter);

      if (documentosEnCategoria > 0) {
        return res.status(400).json({ 
          success: false, 
          message: `No se puede eliminar la categoría porque tiene ${documentosEnCategoria} documentos asociados en tu escuela` 
        });
      }

      await Category.findByIdAndUpdate(id, { activo: false });

      console.log('✅ Categoría eliminada (soft delete):', categoria.nombre);

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

export default CategoryController;