import Person from '../models/Person.js';
import Category from '../models/Category.js';
import Document from '../models/Document.js';

class DashboardController {
  static async getDashboardStats(req, res) {
    try {
      const totalPersonas = await Person.countDocuments({ activo: true });
      const totalDocumentos = await Document.countDocuments({ activo: true });
      const totalCategorias = await Category.countDocuments({ activo: true });

      // Documentos próximos a vencer (en los próximos 30 días)
      const fechaLimite = new Date();
      fechaLimite.setDate(fechaLimite.getDate() + 30);
      const proximosVencer = await Document.countDocuments({
        activo: true,
        fecha_vencimiento: { 
          $gte: new Date(), 
          $lte: fechaLimite 
        }
      });

      // Documentos recientes
      const recentDocuments = await Document.find({ activo: true })
        .populate('persona_id', 'nombre')
        .sort({ fecha_subida: -1 })
        .limit(5)
        .lean();

      res.json({
        success: true,
        stats: {
          totalPersonas,
          totalDocumentos,
          proximosVencer,
          totalCategorias
        },
        recent_documents: recentDocuments
      });
    } catch (error) {
      console.error('Error en dashboard:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error al cargar el dashboard' 
      });
    }
  }
}

export default DashboardController;