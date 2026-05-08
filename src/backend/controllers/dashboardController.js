import Person from '../models/Person.js';
import Category from '../models/Category.js';
import Document from '../models/Document.js';

class DashboardController {
  static async getDashboardStats(req, res) {
    try {
      console.log('📊 DashboardController - Iniciando');
      console.log('🏫 req.schoolId:', req.schoolId || 'superadmin (sin filtro)');
      
      // ✅ Filtro base para documentos
      const docFilter = {
        activo: true,
        $or: [
          { isDeleted: false },
          { isDeleted: { $exists: false } }
        ]
      };
      if (req.schoolId) docFilter.schoolId = req.schoolId;
      
      // ✅ Filtro para personas
      const personFilter = { activo: true };
      if (req.schoolId) personFilter.schoolId = req.schoolId;
      
      // ✅ Filtro para categorías
      const categoryFilter = { activo: true };
      if (req.schoolId) categoryFilter.schoolId = req.schoolId;
      
      const totalPersonas = await Person.countDocuments(personFilter);
      const totalDocumentos = await Document.countDocuments(docFilter);
      const totalCategorias = await Category.countDocuments(categoryFilter);

      // Documentos próximos a vencer (en los próximos 30 días)
      const fechaLimite = new Date();
      fechaLimite.setDate(fechaLimite.getDate() + 30);
      
      const proximosVencerFilter = { ...docFilter };
      proximosVencerFilter.fecha_vencimiento = { 
        $gte: new Date(), 
        $lte: fechaLimite 
      };
      
      const proximosVencer = await Document.countDocuments(proximosVencerFilter);

      // Documentos recientes
      const recentDocuments = await Document.find(docFilter)
        .populate('persona_id', 'nombre')
        .sort({ fecha_subida: -1 })
        .limit(5)
        .lean();

      console.log('✅ Stats:', { totalPersonas, totalDocumentos, proximosVencer, totalCategorias });

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