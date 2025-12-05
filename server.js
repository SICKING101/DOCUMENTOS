const fs = require('fs');
const path = require('path');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
require('dotenv').config();

// -----------------------------
// Configuración
// -----------------------------
const app = express();
const PORT = Number(process.env.PORT) || 4000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/documentos_cbtis051';

// Configuración de Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dn9ts84q6',
  api_key: process.env.CLOUDINARY_API_KEY || '797652563747974',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'raOkraliwEKlBFTRL7Cr9kEyHOA'
});

// -----------------------------
// Middlewares
// -----------------------------
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// -----------------------------
// Esquemas y Modelos
// -----------------------------
const personSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  email: { type: String, required: true },
  telefono: String,
  departamento: String,
  puesto: String,
  activo: { type: Boolean, default: true },
  fecha_creacion: { type: Date, default: Date.now }
}, { timestamps: true });

const categorySchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  descripcion: String,
  color: { type: String, default: '#4f46e5' },
  icon: { type: String, default: 'folder' },
  activo: { type: Boolean, default: true }
}, { timestamps: true });

const documentSchema = new mongoose.Schema({
  nombre_original: { type: String, required: true },
  tipo_archivo: { type: String, required: true },
  tamano_archivo: { type: Number, required: true },
  descripcion: String,
  categoria: String,
  fecha_subida: { type: Date, default: Date.now },
  fecha_vencimiento: Date,
  persona_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Person' },
  cloudinary_url: { type: String, required: true },
  public_id: { type: String, required: true },
  resource_type: { type: String, required: true },
  activo: { type: Boolean, default: true }
}, { timestamps: true });

const taskSchema = new mongoose.Schema({
    titulo: { type: String, required: true },
    descripcion: String,
    prioridad: { 
        type: String, 
        enum: ['baja', 'media', 'alta'], 
        default: 'media' 
    },
    estado: { 
        type: String, 
        enum: ['pendiente', 'en-progreso', 'completada'], 
        default: 'pendiente' 
    },
    categoria: String,
    recordatorio: { type: Boolean, default: false },
    fecha_limite: Date,
    hora_limite: String,
    fecha_creacion: { type: Date, default: Date.now },
    fecha_actualizacion: { type: Date, default: Date.now },
    activo: { type: Boolean, default: true }
}, { timestamps: true });

const Person = mongoose.model('Person', personSchema);
const Category = mongoose.model('Category', categorySchema);
const Document = mongoose.model('Document', documentSchema);
const Task = mongoose.model('Task', taskSchema);

// Importar modelo y servicio de notificaciones
const Notification = require('./public/JAVASCRIPT/modules/Notification');
const NotificationService = require('./public/JAVASCRIPT/modules/notificationService');

// -----------------------------
// Configuración de Multer
// -----------------------------
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const safeName = Date.now() + '-' + Math.round(Math.random() * 1E9) + '-' + file.originalname;
    cb(null, safeName);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'txt', 'jpg', 'jpeg', 'png'];
    const fileExtension = file.originalname.split('.').pop().toLowerCase();
    
    if (allowedTypes.includes(fileExtension)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de archivo no permitido'), false);
    }
  }
});

// -----------------------------
// Conexión a MongoDB
// -----------------------------
mongoose.connect(MONGODB_URI)
  .then(async () => {
    console.log('✅ Conectado a MongoDB');
    // Crear notificación de sistema iniciado
    try {
      await NotificationService.sistemaIniciado();
    } catch (error) {
      console.error('⚠️ Error creando notificación de inicio:', error.message);
    }
  })
  .catch(err => {
    console.error('❌ Error conectando a MongoDB:', err);
    process.exit(1);
  });

// -----------------------------
// Rutas de la API
// -----------------------------

// Ruta de prueba
app.get('/api/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'API funcionando correctamente',
    timestamp: new Date().toISOString()
  });
});

// -----------------------------
// DASHBOARD
// -----------------------------
app.get('/api/dashboard', async (req, res) => {
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
});

// -----------------------------
// PERSONAS
// -----------------------------
app.get('/api/persons', async (req, res) => {
  try {
    const persons = await Person.find({ activo: true }).sort({ nombre: 1 });
    res.json({ success: true, persons });
  } catch (error) {
    console.error('Error obteniendo personas:', error);
    res.status(500).json({ success: false, message: 'Error al obtener personas' });
  }
});

app.post('/api/persons', async (req, res) => {
  try {
    const { nombre, email, telefono, departamento, puesto } = req.body;
    
    if (!nombre || !email) {
      return res.status(400).json({ 
        success: false, 
        message: 'Nombre y email son obligatorios' 
      });
    }

    const nuevaPersona = new Person({
      nombre,
      email,
      telefono,
      departamento,
      puesto
    });

    await nuevaPersona.save();
    
    // Crear notificación de persona agregada
    try {
      await NotificationService.personaAgregada(nuevaPersona);
    } catch (notifError) {
      console.error('⚠️ Error creando notificación:', notifError.message);
    }
    
    res.json({ 
      success: true, 
      message: 'Persona agregada correctamente',
      person: nuevaPersona 
    });
  } catch (error) {
    console.error('Error creando persona:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al crear persona' 
    });
  }
});

app.put('/api/persons/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, email, telefono, departamento, puesto } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ 
        success: false, 
        message: 'ID inválido' 
      });
    }

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

    res.json({ 
      success: true, 
      message: 'Persona actualizada correctamente',
      person: personaActualizada 
    });
  } catch (error) {
    console.error('Error actualizando persona:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al actualizar persona' 
    });
  }
});

app.delete('/api/persons/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ 
        success: false, 
        message: 'ID inválido' 
      });
    }

    // Verificar si la persona tiene documentos asociados
    const documentosAsociados = await Document.countDocuments({ 
      persona_id: id, 
      activo: true 
    });

    if (documentosAsociados > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'No se puede eliminar la persona porque tiene documentos asociados' 
      });
    }

    const personaEliminada = await Person.findByIdAndUpdate(
      id,
      { activo: false },
      { new: true }
    );

    if (!personaEliminada) {
      return res.status(404).json({ 
        success: false, 
        message: 'Persona no encontrada' 
      });
    }

    // Crear notificación de persona eliminada
    try {
      await NotificationService.personaEliminada(personaEliminada.nombre);
    } catch (notifError) {
      console.error('⚠️ Error creando notificación:', notifError.message);
    }

    res.json({ 
      success: true, 
      message: 'Persona eliminada correctamente' 
    });
  } catch (error) {
    console.error('Error eliminando persona:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al eliminar persona' 
    });
  }
});

// -----------------------------
// CATEGORÍAS
// -----------------------------
app.get('/api/categories', async (req, res) => {
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
});

app.post('/api/categories', async (req, res) => {
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
});

app.put('/api/categories/:id', async (req, res) => {
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
});

app.delete('/api/categories/:id', async (req, res) => {
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
});

// -----------------------------
// DOCUMENTOS
// -----------------------------
app.get('/api/documents', async (req, res) => {
  try {
    const documents = await Document.find({ activo: true })
      .populate('persona_id', 'nombre email departamento puesto')
      .sort({ fecha_subida: -1 });

    res.json({ success: true, documents });
  } catch (error) {
    console.error('Error obteniendo documentos:', error);
    res.status(500).json({ success: false, message: 'Error al obtener documentos' });
  }
});

app.post('/api/documents', upload.single('file'), async (req, res) => {
  try {
    console.log('📥 Recibiendo solicitud de upload de documento...');
    console.log('📋 Headers:', req.headers);
    console.log('📋 Body:', req.body);
    console.log('📋 File:', req.file);

    if (!req.file) {
      console.error('❌ No se recibió archivo en la solicitud');
      return res.status(400).json({ 
        success: false, 
        message: 'No se ha subido ningún archivo' 
      });
    }

    console.log('✅ Archivo recibido:', req.file.originalname);
    console.log('📊 Tamaño:', req.file.size);
    console.log('📝 Tipo MIME:', req.file.mimetype);

    const { descripcion, categoria, fecha_vencimiento, persona_id } = req.body;

    console.log('📤 Subiendo a Cloudinary...');

    // Subir a Cloudinary
    let cloudinaryResult;
    try {
      cloudinaryResult = await cloudinary.uploader.upload(req.file.path, {
        folder: 'documentos_cbtis051',
        resource_type: 'auto'
      });
      console.log('✅ Archivo subido a Cloudinary:', cloudinaryResult.secure_url);
    } catch (cloudinaryError) {
      console.error('❌ Error subiendo a Cloudinary:', cloudinaryError);
      console.error('❌ Error detallado:', JSON.stringify(cloudinaryError, null, 2));
      // Limpiar archivo temporal
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(500).json({ 
        success: false, 
        message: 'Error al subir el archivo a la nube: ' + cloudinaryError.message 
      });
    }

    console.log('💾 Guardando documento en la base de datos...');

    // Crear documento en la base de datos
    const nuevoDocumento = new Document({
      nombre_original: req.file.originalname,
      tipo_archivo: req.file.originalname.split('.').pop().toLowerCase(),
      tamano_archivo: req.file.size,
      descripcion: descripcion || '',
      categoria: categoria || 'General',
      fecha_vencimiento: fecha_vencimiento || null,
      persona_id: persona_id || null,
      cloudinary_url: cloudinaryResult.secure_url,
      public_id: cloudinaryResult.public_id,
      resource_type: cloudinaryResult.resource_type
    });

    await nuevoDocumento.save();
    console.log('✅ Documento guardado en BD con ID:', nuevoDocumento._id);

    // Limpiar archivo temporal
    if (fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
      console.log('🧹 Archivo temporal eliminado');
    }

    // Obtener documento con datos de persona
    const documentoConPersona = await Document.findById(nuevoDocumento._id)
      .populate('persona_id', 'nombre');

    // Crear notificación de documento subido
    try {
      await NotificationService.documentoSubido(
        documentoConPersona,
        documentoConPersona.persona_id
      );
    } catch (notifError) {
      console.error('⚠️ Error creando notificación:', notifError.message);
    }

    console.log('✅ Upload completado exitosamente');

    res.json({
      success: true,
      message: 'Documento subido correctamente',
      document: documentoConPersona
    });

  } catch (error) {
    console.error('❌ Error general subiendo documento:', error);
    console.error('❌ Stack trace:', error.stack);
    // Limpiar archivo temporal si existe
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ 
      success: false, 
      message: 'Error al subir documento: ' + error.message 
    });
  }
});

// ENDPOINT DE VISTA PREVIA
app.get('/api/documents/:id/preview', async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ 
        success: false, 
        message: 'ID inválido' 
      });
    }

    const documento = await Document.findOne({ _id: id, activo: true });

    if (!documento) {
      return res.status(404).json({ 
        success: false, 
        message: 'Documento no encontrado' 
      });
    }

    if (!documento.cloudinary_url) {
      return res.status(500).json({ 
        success: false, 
        message: 'URL del documento no disponible' 
      });
    }

    console.log('👁️ Vista previa para:', documento.nombre_original);

    // PARA PDF: Cloudinary puede mostrar vista previa
    // PARA IMÁGENES: Redirigir directamente
    res.redirect(documento.cloudinary_url);

  } catch (error) {
    console.error('❌ Error en vista previa:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al cargar vista previa' 
    });
  }
});

app.delete('/api/documents/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ 
        success: false, 
        message: 'ID inválido' 
      });
    }

    const documento = await Document.findOne({ _id: id, activo: true });

    if (!documento) {
      return res.status(404).json({ 
        success: false, 
        message: 'Documento no encontrado' 
      });
    }

    // Guardar datos para la notificación antes de eliminar
    const nombreDocumento = documento.nombre_original;
    const categoriaDocumento = documento.categoria;

    // Eliminar de Cloudinary
    try {
      await cloudinary.uploader.destroy(documento.public_id, {
        resource_type: documento.resource_type
      });
    } catch (cloudinaryError) {
      console.warn('No se pudo eliminar de Cloudinary:', cloudinaryError);
    }

    // Eliminar lógicamente de la base de datos
    await Document.findByIdAndUpdate(id, { activo: false });

    // Crear notificación de documento eliminado
    try {
      await NotificationService.documentoEliminado(nombreDocumento, categoriaDocumento);
    } catch (notifError) {
      console.error('⚠️ Error creando notificación:', notifError.message);
    }

    res.json({ 
      success: true, 
      message: 'Documento eliminado correctamente' 
    });

  } catch (error) {
    console.error('Error eliminando documento:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al eliminar documento' 
    });
  }
});

// -----------------------------
// REPORTES
// -----------------------------

// Función auxiliar para formatear fechas
function formatDate(date) {
  if (!date) return '-';
  const d = new Date(date);
  return d.toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
}

// Función auxiliar para formatear tamaño de archivo
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Generar reporte en Excel
app.post('/api/reports/excel', async (req, res) => {
  try {
    console.log('📊 Generando reporte en Excel...');
    const { reportType, category, person, days, dateFrom, dateTo } = req.body;

    // Obtener datos según el tipo de reporte
    let documents = await Document.find({ activo: true })
      .populate('persona_id', 'nombre email departamento puesto')
      .sort({ fecha_subida: -1 });

    // Aplicar filtros según el tipo de reporte
    if (reportType === 'byCategory' && category) {
      documents = documents.filter(doc => doc.categoria === category);
    }

    if (reportType === 'byPerson' && person) {
      documents = documents.filter(doc => doc.persona_id && doc.persona_id._id.toString() === person);
    }

    if (reportType === 'expiring' && days) {
      const now = new Date();
      const limitDate = new Date();
      limitDate.setDate(limitDate.getDate() + parseInt(days));
      documents = documents.filter(doc => {
        if (!doc.fecha_vencimiento) return false;
        const vencimiento = new Date(doc.fecha_vencimiento);
        return vencimiento >= now && vencimiento <= limitDate;
      });
    }

    if (reportType === 'expired') {
      const now = new Date();
      documents = documents.filter(doc => {
        if (!doc.fecha_vencimiento) return false;
        return new Date(doc.fecha_vencimiento) < now;
      });
    }

    if (dateFrom || dateTo) {
      const from = dateFrom ? new Date(dateFrom) : null;
      const to = dateTo ? new Date(dateTo) : null;
      documents = documents.filter(doc => {
        const docDate = new Date(doc.fecha_subida);
        if (from && docDate < from) return false;
        if (to && docDate > to) return false;
        return true;
      });
    }

    // Crear libro de Excel
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'CBTIS051';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet('Documentos');

    // Estilos para el encabezado
    const headerStyle = {
      font: { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } },
      alignment: { vertical: 'middle', horizontal: 'center' },
      border: {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      }
    };

    // Título del reporte
    worksheet.mergeCells('A1:H1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = `Reporte de Documentos - CBTIS051`;
    titleCell.font = { bold: true, size: 16, color: { argb: 'FF4F46E5' } };
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };

    worksheet.mergeCells('A2:H2');
    const subtitleCell = worksheet.getCell('A2');
    subtitleCell.value = `Generado el ${formatDate(new Date())}`;
    subtitleCell.font = { size: 11, italic: true };
    subtitleCell.alignment = { vertical: 'middle', horizontal: 'center' };

    worksheet.addRow([]);

    // Encabezados de columnas
    const headers = ['Nombre del Documento', 'Tipo', 'Tamaño', 'Categoría', 'Persona Asignada', 'Fecha de Subida', 'Fecha de Vencimiento', 'Estado'];
    const headerRow = worksheet.addRow(headers);
    headerRow.height = 25;
    headerRow.eachCell((cell) => {
      cell.style = headerStyle;
    });

    // Datos
    documents.forEach(doc => {
      const person = doc.persona_id ? doc.persona_id.nombre : 'No asignado';
      const vencimiento = doc.fecha_vencimiento ? formatDate(doc.fecha_vencimiento) : 'Sin vencimiento';
      
      let estado = 'Activo';
      if (doc.fecha_vencimiento) {
        const now = new Date();
        const vencimientoDate = new Date(doc.fecha_vencimiento);
        const diff = Math.ceil((vencimientoDate - now) / (1000 * 60 * 60 * 24));
        if (diff <= 0) estado = 'Vencido';
        else if (diff <= 7) estado = 'Por vencer';
      }

      const row = worksheet.addRow([
        doc.nombre_original,
        doc.tipo_archivo.toUpperCase(),
        formatFileSize(doc.tamano_archivo),
        doc.categoria,
        person,
        formatDate(doc.fecha_subida),
        vencimiento,
        estado
      ]);

      // Colorear filas según estado
      if (estado === 'Vencido') {
        row.eachCell((cell) => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFECACA' } };
        });
      } else if (estado === 'Por vencer') {
        row.eachCell((cell) => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } };
        });
      }

      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });
    });

    // Ajustar ancho de columnas
    worksheet.columns = [
      { width: 40 },
      { width: 10 },
      { width: 12 },
      { width: 20 },
      { width: 25 },
      { width: 20 },
      { width: 20 },
      { width: 15 }
    ];

    // Agregar estadísticas al final
    worksheet.addRow([]);
    const statsRow = worksheet.addRow(['Total de documentos:', documents.length]);
    statsRow.getCell(1).font = { bold: true };
    statsRow.getCell(1).alignment = { horizontal: 'right' };

    // Enviar archivo
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=reporte_documentos_${Date.now()}.xlsx`);

    await workbook.xlsx.write(res);
    res.end();

    console.log('✅ Reporte Excel generado exitosamente');

    // Crear notificación de reporte generado
    try {
      await NotificationService.reporteGenerado(reportType, 'excel', documents.length);
    } catch (notifError) {
      console.error('⚠️ Error creando notificación:', notifError.message);
    }

  } catch (error) {
    console.error('❌ Error generando reporte Excel:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al generar reporte Excel: ' + error.message 
    });
  }
});

// Generar reporte en PDF
app.post('/api/reports/pdf', async (req, res) => {
  try {
    console.log('📊 Generando reporte en PDF...');
    const { reportType, category, person, days, dateFrom, dateTo } = req.body;

    // Obtener datos según el tipo de reporte
    let documents = await Document.find({ activo: true })
      .populate('persona_id', 'nombre email departamento puesto')
      .sort({ fecha_subida: -1 });

    // Aplicar filtros (mismo código que Excel)
    if (reportType === 'byCategory' && category) {
      documents = documents.filter(doc => doc.categoria === category);
    }

    if (reportType === 'byPerson' && person) {
      documents = documents.filter(doc => doc.persona_id && doc.persona_id._id.toString() === person);
    }

    if (reportType === 'expiring' && days) {
      const now = new Date();
      const limitDate = new Date();
      limitDate.setDate(limitDate.getDate() + parseInt(days));
      documents = documents.filter(doc => {
        if (!doc.fecha_vencimiento) return false;
        const vencimiento = new Date(doc.fecha_vencimiento);
        return vencimiento >= now && vencimiento <= limitDate;
      });
    }

    if (reportType === 'expired') {
      const now = new Date();
      documents = documents.filter(doc => {
        if (!doc.fecha_vencimiento) return false;
        return new Date(doc.fecha_vencimiento) < now;
      });
    }

    if (dateFrom || dateTo) {
      const from = dateFrom ? new Date(dateFrom) : null;
      const to = dateTo ? new Date(dateTo) : null;
      documents = documents.filter(doc => {
        const docDate = new Date(doc.fecha_subida);
        if (from && docDate < from) return false;
        if (to && docDate > to) return false;
        return true;
      });
    }

    // Crear documento PDF
    const doc = new PDFDocument({ margin: 50, size: 'A4' });

    // Headers para descarga
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=reporte_documentos_${Date.now()}.pdf`);

    doc.pipe(res);

    // Encabezado del reporte
    doc.fontSize(20)
       .fillColor('#4F46E5')
       .text('Sistema de Gestión de Documentos', { align: 'center' })
       .fontSize(16)
       .text('CBTIS051', { align: 'center' })
       .moveDown(0.5);

    doc.fontSize(12)
       .fillColor('#000000')
       .text(`Reporte generado el ${formatDate(new Date())}`, { align: 'center' })
       .moveDown(1);

    // Información del reporte
    let reportTitle = 'Reporte General';
    if (reportType === 'byCategory') reportTitle = `Reporte por Categoría${category ? ': ' + category : ''}`;
    if (reportType === 'byPerson') reportTitle = 'Reporte por Persona';
    if (reportType === 'expiring') reportTitle = `Documentos por Vencer (${days || 30} días)`;
    if (reportType === 'expired') reportTitle = 'Documentos Vencidos';

    doc.fontSize(14)
       .fillColor('#4F46E5')
       .text(reportTitle, { underline: true })
       .moveDown(1);

    // Estadísticas generales
    doc.fontSize(11)
       .fillColor('#000000')
       .text(`Total de documentos en este reporte: ${documents.length}`, { continued: false })
       .moveDown(0.5);

    // Línea separadora
    doc.moveTo(50, doc.y)
       .lineTo(545, doc.y)
       .stroke()
       .moveDown(1);

    // Lista de documentos
    documents.forEach((document, index) => {
      // Verificar si hay espacio suficiente, si no, agregar nueva página
      if (doc.y > 700) {
        doc.addPage();
      }

      const person = document.persona_id ? document.persona_id.nombre : 'No asignado';
      const vencimiento = document.fecha_vencimiento ? formatDate(document.fecha_vencimiento) : 'Sin vencimiento';
      
      let estado = 'Activo';
      let estadoColor = '#10B981';
      if (document.fecha_vencimiento) {
        const now = new Date();
        const vencimientoDate = new Date(document.fecha_vencimiento);
        const diff = Math.ceil((vencimientoDate - now) / (1000 * 60 * 60 * 24));
        if (diff <= 0) {
          estado = 'Vencido';
          estadoColor = '#EF4444';
        } else if (diff <= 7) {
          estado = 'Por vencer';
          estadoColor = '#F59E0B';
        }
      }

      // Número de documento
      doc.fontSize(10)
         .fillColor('#6B7280')
         .text(`${index + 1}.`, 50, doc.y, { continued: true })
         .fillColor('#000000')
         .fontSize(11)
         .text(` ${document.nombre_original}`, { bold: true });

      doc.fontSize(9)
         .fillColor('#6B7280')
         .text(`   Tipo: ${document.tipo_archivo.toUpperCase()} | Tamaño: ${formatFileSize(document.tamano_archivo)}`, { indent: 15 })
         .text(`   Categoría: ${document.categoria}`, { indent: 15 })
         .text(`   Asignado a: ${person}`, { indent: 15 })
         .text(`   Fecha de subida: ${formatDate(document.fecha_subida)}`, { indent: 15 })
         .text(`   Vencimiento: ${vencimiento}`, { indent: 15 })
         .fillColor(estadoColor)
         .text(`   Estado: ${estado}`, { indent: 15 })
         .fillColor('#000000')
         .moveDown(0.8);
    });

    // Obtener el rango de páginas
    const range = doc.bufferedPageRange();
    const pageCount = range.count;
    
    console.log(`📄 Total de páginas generadas: ${pageCount}`);

    // Agregar pie de página en cada página
    for (let i = 0; i < pageCount; i++) {
      doc.switchToPage(i);
      
      // Guardar posición actual
      const oldBottomMargin = doc.page.margins.bottom;
      
      // Posicionar en el footer
      doc.fontSize(8)
         .fillColor('#6B7280')
         .text(
           `Página ${i + 1} de ${pageCount} - Sistema de Gestión de Documentos CBTIS051`,
           50,
           doc.page.height - 50,
           { align: 'center', lineBreak: false }
         );
    }

    // Finalizar documento
    doc.end();

    console.log('✅ Reporte PDF generado exitosamente');

    // Crear notificación de reporte generado
    try {
      await NotificationService.reporteGenerado(reportType, 'pdf', documents.length);
    } catch (notifError) {
      console.error('⚠️ Error creando notificación:', notifError.message);
    }

  } catch (error) {
    console.error('❌ Error generando reporte PDF:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al generar reporte PDF: ' + error.message 
    });
  }
});

// Generar reporte en CSV
app.post('/api/reports/csv', async (req, res) => {
  try {
    console.log('📊 Generando reporte en CSV...');
    const { reportType, category, person, days, dateFrom, dateTo } = req.body;

    // Obtener datos según el tipo de reporte
    let documents = await Document.find({ activo: true })
      .populate('persona_id', 'nombre email departamento puesto')
      .sort({ fecha_subida: -1 });

    // Aplicar filtros (mismo código)
    if (reportType === 'byCategory' && category) {
      documents = documents.filter(doc => doc.categoria === category);
    }

    if (reportType === 'byPerson' && person) {
      documents = documents.filter(doc => doc.persona_id && doc.persona_id._id.toString() === person);
    }

    if (reportType === 'expiring' && days) {
      const now = new Date();
      const limitDate = new Date();
      limitDate.setDate(limitDate.getDate() + parseInt(days));
      documents = documents.filter(doc => {
        if (!doc.fecha_vencimiento) return false;
        const vencimiento = new Date(doc.fecha_vencimiento);
        return vencimiento >= now && vencimiento <= limitDate;
      });
    }

    if (reportType === 'expired') {
      const now = new Date();
      documents = documents.filter(doc => {
        if (!doc.fecha_vencimiento) return false;
        return new Date(doc.fecha_vencimiento) < now;
      });
    }

    if (dateFrom || dateTo) {
      const from = dateFrom ? new Date(dateFrom) : null;
      const to = dateTo ? new Date(dateTo) : null;
      documents = documents.filter(doc => {
        const docDate = new Date(doc.fecha_subida);
        if (from && docDate < from) return false;
        if (to && docDate > to) return false;
        return true;
      });
    }

    // Crear CSV
    let csv = '\uFEFF'; // BOM para UTF-8
    csv += 'Nombre del Documento,Tipo,Tamaño,Categoría,Persona Asignada,Departamento,Puesto,Fecha de Subida,Fecha de Vencimiento,Estado\n';

    documents.forEach(doc => {
      const person = doc.persona_id ? doc.persona_id.nombre : 'No asignado';
      const departamento = doc.persona_id ? doc.persona_id.departamento || '-' : '-';
      const puesto = doc.persona_id ? doc.persona_id.puesto || '-' : '-';
      const vencimiento = doc.fecha_vencimiento ? formatDate(doc.fecha_vencimiento) : 'Sin vencimiento';
      
      let estado = 'Activo';
      if (doc.fecha_vencimiento) {
        const now = new Date();
        const vencimientoDate = new Date(doc.fecha_vencimiento);
        const diff = Math.ceil((vencimientoDate - now) / (1000 * 60 * 60 * 24));
        if (diff <= 0) estado = 'Vencido';
        else if (diff <= 7) estado = 'Por vencer';
      }

      // Escapar comillas y comas en los valores
      const escapeCSV = (value) => {
        if (value.includes(',') || value.includes('"') || value.includes('\n')) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      };

      csv += `${escapeCSV(doc.nombre_original)},${doc.tipo_archivo.toUpperCase()},${formatFileSize(doc.tamano_archivo)},${escapeCSV(doc.categoria)},${escapeCSV(person)},${escapeCSV(departamento)},${escapeCSV(puesto)},${formatDate(doc.fecha_subida)},${vencimiento},${estado}\n`;
    });

    // Enviar archivo
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=reporte_documentos_${Date.now()}.csv`);
    res.send(csv);

    console.log('✅ Reporte CSV generado exitosamente');

    // Crear notificación de reporte generado
    try {
      await NotificationService.reporteGenerado(reportType, 'csv', documents.length);
    } catch (notifError) {
      console.error('⚠️ Error creando notificación:', notifError.message);
    }

  } catch (error) {
    console.error('❌ Error generando reporte CSV:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al generar reporte CSV: ' + error.message 
    });
  }
});

// -----------------------------
// TAREAS
// -----------------------------

// Obtener todas las tareas
app.get('/api/tasks', async (req, res) => {
    try {
        const tasks = await Task.find({ activo: true })
            .sort({ fecha_creacion: -1 })
            .lean();

        res.json({ 
            success: true, 
            tasks 
        });
    } catch (error) {
        console.error('Error obteniendo tareas:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error al obtener tareas' 
        });
    }
});

// Crear nueva tarea
app.post('/api/tasks', async (req, res) => {
    try {
        const { 
            titulo, 
            descripcion, 
            prioridad, 
            estado, 
            categoria, 
            recordatorio, 
            fecha_limite, 
            hora_limite 
        } = req.body;

        if (!titulo) {
            return res.status(400).json({ 
                success: false, 
                message: 'El título es obligatorio' 
            });
        }

        const nuevaTarea = new Task({
            titulo,
            descripcion: descripcion || '',
            prioridad: prioridad || 'media',
            estado: estado || 'pendiente',
            categoria: categoria || '',
            recordatorio: recordatorio || false,
            fecha_limite: fecha_limite || null,
            hora_limite: hora_limite || null
        });

        await nuevaTarea.save();

        res.json({ 
            success: true, 
            message: 'Tarea creada correctamente',
            task: nuevaTarea 
        });
    } catch (error) {
        console.error('Error creando tarea:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error al crear tarea' 
        });
    }
});

// ============================================================================
// DESCARGA DE DOCUMENTOS (FUNCIONA PDF, IMÁGENES, OFFICE, TXT, TODO)
// ============================================================================

app.get('/api/documents/:id/download', async (req, res) => {
    console.log('📥 ====== INICIO ENDPOINT DESCARGA ======');

    try {
        const { id } = req.params;
        const { filename } = req.query;

        console.log('📋 Parámetros recibidos:', { id, filename });

        // 1. Validar ID
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'ID de documento invalido'
            });
        }

        // 2. Buscar en BD
        const documento = await Document.findOne({ 
            _id: id, 
            activo: true 
        }).populate('persona_id', 'nombre');

        if (!documento) {
            return res.status(404).json({
                success: false,
                message: 'Documento no encontrado'
            });
        }

        const fileName = filename || documento.nombre_original;
        const cloudinaryUrl = documento.cloudinary_url || documento.url_cloudinary;
        const fileExtension = fileName.split('.').pop().toLowerCase();

        console.log('📄 Documento encontrado:', {
            fileName,
            extension: fileExtension,
            url: cloudinaryUrl
        });

        if (!cloudinaryUrl) {
            return res.status(404).json({
                success: false,
                message: 'URL de archivo no disponible'
            });
        }

        // Tipos de archivo
        const isImage = ['png','jpg','jpeg','gif','webp','bmp'].includes(fileExtension);
        const isPDF = fileExtension === 'pdf';

        // =====================================================================
        // ESTRATEGIA 1: Redireccion directa para IMAGENES (funciona perfecto)
        // =====================================================================
        if (isImage) {
            console.log('🖼️ Imagen detectada → redireccion directa');

            let finalUrl = cloudinaryUrl.replace('/upload/', '/upload/fl_attachment/');

            return res.redirect(finalUrl);
        }

        // =====================================================================
        // ESTRATEGIA 2: SERVIDOR PROXY PARA PDF, DOCX, XLSX, TXT, ETC
        // =====================================================================
        console.log('📄 Documento → usando servidor proxy');

        // Intento 1: URL original
        let response = await tryFetch(cloudinaryUrl);

        // Si fallo, intentamos con URL modificada
        if (!response.ok) {
            console.log('⚠️ Intento 1 fallo, probando URL mejorada para Cloudinary...');
            
            const modifiedUrl = buildCloudinaryDownloadURL(cloudinaryUrl, fileExtension);
            console.log('🔗 URL modificada final:', modifiedUrl);

            response = await tryFetch(modifiedUrl);

            if (!response.ok) {
                console.log('❌ Intento 2 tambien fallo. Haciendo redireccion como ultimo recurso.');
                
                res.setHeader('Content-Type', getContentType(fileExtension));
                res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
                return res.redirect(cloudinaryUrl);
            }
        }

        // Procesar archivo
        await processAndSendFile(response, res, fileName, fileExtension);

    } catch (error) {
        console.error('❌ ERROR CRITICO:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno en la descarga',
            error: error.message
        });
    } finally {
        console.log('📥 ====== FIN ENDPOINT DESCARGA ======');
    }
});


// ============================================================================
// FUNCION: Corregir URL para descarga desde Cloudinary (fix definitivo PDF)
// ============================================================================
function buildCloudinaryDownloadURL(url, extension) {
    if (!url.includes('/upload/')) return url;

    // Inserta fl_attachment incluso si existe /v123456/
    let newUrl = url.replace(/\/upload\/(?:v\d+\/)?/, match => {
        return match.replace('upload/', 'upload/fl_attachment/');
    });

    // Cloudinary requiere .pdf al final para PDFs
    if (extension === 'pdf' && !newUrl.endsWith('.pdf')) {
        if (newUrl.includes('.pdf')) {
            newUrl = newUrl.split('.pdf')[0] + '.pdf';
        } else {
            newUrl += '.pdf';
        }
    }

    return newUrl;
}


// ============================================================================
// FUNCION: Intento de fetch con headers correctos
// ============================================================================
async function tryFetch(url) {
    try {
        return await fetch(url, {
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0'
            },
            timeout: 30000
        });
    } catch (err) {
        console.error('❌ Error en fetch:', err);
        return { ok: false, status: 0 };
    }
}


// ============================================================================
// FUNCION: Procesar y enviar archivo
// ============================================================================
async function processAndSendFile(fetchResponse, res, fileName, fileExtension) {
    const buffer = await fetchResponse.arrayBuffer();
    const nodeBuffer = Buffer.from(buffer);

    if (nodeBuffer.length === 0) {
        throw new Error('Buffer vacio');
    }

    // Verificacion PDF
    if (fileExtension === 'pdf') {
        const firstBytes = nodeBuffer.slice(0, 5).toString();
        if (!firstBytes.includes('%PDF')) {
            console.log('⚠️ El archivo no empieza con %PDF, Cloudinary devolvio HTML');
            throw new Error('Respuesta invalida para PDF');
        }
    }

    // Headers
    const contentType = getContentType(fileExtension);
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', nodeBuffer.length);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);

    return res.end(nodeBuffer);
}


// ============================================================================
// MIME TYPES
// ============================================================================
function getContentType(ext) {
    const types = {
        'pdf': 'application/pdf',
        'doc': 'application/msword',
        'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'xls': 'application/vnd.ms-excel',
        'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'txt': 'text/plain',
        'csv': 'text/csv',
        'rtf': 'application/rtf',
        'png': 'image/png',
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'gif': 'image/gif',
        'webp': 'image/webp',
        'bmp': 'image/bmp'
    };

    return types[ext.toLowerCase()] || 'application/octet-stream';
}

// =============================================================================
// ENDPOINT PARA CONTENIDO DE TEXTO (VISTA PREVIA)
// =============================================================================

app.get('/api/documents/:id/content', async (req, res) => {
    console.log('📝 Obteniendo contenido para vista previa de texto');
    
    try {
        const { id } = req.params;
        const { limit = 50000 } = req.query; // Limitar a 50KB por defecto

        // Validar ID
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'ID de documento inválido'
            });
        }

        // Buscar documento
        const documento = await Document.findOne({ 
            _id: id, 
            activo: true 
        });

        if (!documento) {
            return res.status(404).json({
                success: false,
                message: 'Documento no encontrado'
            });
        }

        // Verificar que sea archivo de texto
        const extension = documento.nombre_original.split('.').pop().toLowerCase();
        const textExtensions = ['txt', 'csv', 'json', 'xml', 'html', 'htm', 'js', 'css', 'md'];
        
        if (!textExtensions.includes(extension)) {
            return res.status(400).json({
                success: false,
                message: 'Este tipo de archivo no puede ser previsualizado como texto'
            });
        }

        const cloudinaryUrl = documento.cloudinary_url;
        
        if (!cloudinaryUrl) {
            return res.status(500).json({
                success: false,
                message: 'URL del archivo no disponible'
            });
        }

        console.log('📥 Descargando contenido desde Cloudinary...');

        // IMPORTANTE: Para archivos .txt, Cloudinary los sirve como 'raw'
        // Necesitamos agregar parámetros para asegurar que sea texto
        let finalUrl = cloudinaryUrl;
        
        // Si es una URL de Cloudinary, forzar formato raw
        if (cloudinaryUrl.includes('cloudinary.com')) {
            if (!cloudinaryUrl.includes('/raw/')) {
                finalUrl = cloudinaryUrl.replace('/upload/', '/upload/fl_attachment/');
            }
        }

        // Descargar desde Cloudinary con fetch nativo de Node.js 18+
        const response = await fetch(finalUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0'
            }
        });

        if (!response.ok) {
            throw new Error(`Error al descargar desde Cloudinary: ${response.status}`);
        }

        // Leer el contenido
        const buffer = await response.arrayBuffer();
        
        if (buffer.byteLength === 0) {
            return res.status(500).json({
                success: false,
                message: 'El archivo está vacío'
            });
        }

        // Convertir a texto
        let textContent;
        try {
            // Intentar UTF-8 primero
            textContent = new TextDecoder('utf-8').decode(buffer);
        } catch (utf8Error) {
            // Si falla UTF-8, intentar Latin-1
            try {
                textContent = new TextDecoder('latin-1').decode(buffer);
            } catch (latinError) {
                return res.status(500).json({
                    success: false,
                    message: 'No se pudo decodificar el contenido del archivo'
                });
            }
        }

        // Limitar contenido si es muy grande
        const maxLength = parseInt(limit);
        let isTruncated = false;
        
        if (textContent.length > maxLength) {
            textContent = textContent.substring(0, maxLength);
            isTruncated = true;
        }

        // Determinar tipo de contenido
        let contentType = 'text/plain; charset=utf-8';
        if (extension === 'html' || extension === 'htm') contentType = 'text/html; charset=utf-8';
        if (extension === 'json') contentType = 'application/json; charset=utf-8';
        if (extension === 'xml') contentType = 'application/xml; charset=utf-8';
        if (extension === 'css') contentType = 'text/css; charset=utf-8';
        if (extension === 'js') contentType = 'application/javascript; charset=utf-8';
        if (extension === 'csv') contentType = 'text/csv; charset=utf-8';
        if (extension === 'md') contentType = 'text/markdown; charset=utf-8';

        // Configurar respuesta
        res.setHeader('Content-Type', contentType);
        res.setHeader('X-File-Name', encodeURIComponent(documento.nombre_original));
        res.setHeader('X-File-Size', buffer.byteLength);
        res.setHeader('X-Content-Length', textContent.length);
        if (isTruncated) {
            res.setHeader('X-Content-Truncated', 'true');
            res.setHeader('X-Original-Length', buffer.byteLength);
        }

        // Enviar contenido
        res.send(textContent);

        console.log(`✅ Contenido enviado: ${textContent.length} caracteres`);

    } catch (error) {
        console.error('❌ Error en endpoint de contenido:', error);
        
        // Enviar como JSON si es un error
        res.setHeader('Content-Type', 'application/json');
        res.status(500).json({
            success: false,
            message: 'Error al obtener contenido: ' + error.message
        });
    }
});

// =============================================================================
// ENDPOINT PARA OBTENER INFORMACIÓN DEL ARCHIVO (OPCIONAL)
// =============================================================================

app.get('/api/documents/:id/info', async (req, res) => {
    try {
        const { id } = req.params;
        
        const documento = await Document.findOne({ _id: id, activo: true })
            .populate('persona_id', 'nombre email departamento puesto');
        
        if (!documento) {
            return res.status(404).json({ 
                success: false, 
                message: 'Documento no encontrado' 
            });
        }
        
        res.json({
            success: true,
            document: {
                id: documento._id,
                nombre_original: documento.nombre_original,
                tipo_archivo: documento.tipo_archivo,
                tamano_archivo: documento.tamano_archivo,
                descripcion: documento.descripcion,
                categoria: documento.categoria,
                fecha_subida: documento.fecha_subida,
                fecha_vencimiento: documento.fecha_vencimiento,
                persona: documento.persona_id,
                cloudinary_url: documento.cloudinary_url,
                public_id: documento.public_id,
                resource_type: documento.resource_type
            }
        });
        
    } catch (error) {
        console.error('Error obteniendo info del documento:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error al obtener información del documento' 
        });
    }
});

// Actualizar tarea
app.put('/api/tasks/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { 
            titulo, 
            descripcion, 
            prioridad, 
            estado, 
            categoria, 
            recordatorio, 
            fecha_limite, 
            hora_limite 
        } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ 
                success: false, 
                message: 'ID inválido' 
            });
        }

        if (!titulo) {
            return res.status(400).json({ 
                success: false, 
                message: 'El título es obligatorio' 
            });
        }

        const tareaActualizada = await Task.findByIdAndUpdate(
            id,
            {
                titulo,
                descripcion,
                prioridad,
                estado,
                categoria,
                recordatorio,
                fecha_limite,
                hora_limite,
                fecha_actualizacion: new Date()
            },
            { new: true, runValidators: true }
        );

        if (!tareaActualizada) {
            return res.status(404).json({ 
                success: false, 
                message: 'Tarea no encontrada' 
            });
        }

        res.json({ 
            success: true, 
            message: 'Tarea actualizada correctamente',
            task: tareaActualizada 
        });
    } catch (error) {
        console.error('Error actualizando tarea:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error al actualizar tarea' 
        });
    }
});

// Eliminar tarea (eliminación lógica)
app.delete('/api/tasks/:id', async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ 
                success: false, 
                message: 'ID inválido' 
            });
        }

        const tareaEliminada = await Task.findByIdAndUpdate(
            id,
            { activo: false },
            { new: true }
        );

        if (!tareaEliminada) {
            return res.status(404).json({ 
                success: false, 
                message: 'Tarea no encontrada' 
            });
        }

        res.json({ 
            success: true, 
            message: 'Tarea eliminada correctamente' 
        });
    } catch (error) {
        console.error('Error eliminando tarea:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error al eliminar tarea' 
        });
    }
});

// Cambiar estado de tarea
app.patch('/api/tasks/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const { estado } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ 
                success: false, 
                message: 'ID inválido' 
            });
        }

        const estadosPermitidos = ['pendiente', 'en-progreso', 'completada'];
        if (!estadosPermitidos.includes(estado)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Estado no válido' 
            });
        }

        const tareaActualizada = await Task.findByIdAndUpdate(
            id,
            { 
                estado,
                fecha_actualizacion: new Date()
            },
            { new: true }
        );

        if (!tareaActualizada) {
            return res.status(404).json({ 
                success: false, 
                message: 'Tarea no encontrada' 
            });
        }

        res.json({ 
            success: true, 
            message: `Tarea marcada como ${estado}`,
            task: tareaActualizada 
        });
    } catch (error) {
        console.error('Error cambiando estado de tarea:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error al cambiar estado de tarea' 
        });
    }
});

// Obtener estadísticas de tareas
app.get('/api/tasks/stats', async (req, res) => {
    try {
        const totalTareas = await Task.countDocuments({ activo: true });
        const tareasPendientes = await Task.countDocuments({ 
            activo: true, 
            estado: 'pendiente' 
        });
        const tareasEnProgreso = await Task.countDocuments({ 
            activo: true, 
            estado: 'en-progreso' 
        });
        const tareasCompletadas = await Task.countDocuments({ 
            activo: true, 
            estado: 'completada' 
        });

        // Tareas próximas a vencer (en los próximos 7 días)
        const fechaLimite = new Date();
        fechaLimite.setDate(fechaLimite.getDate() + 7);
        const tareasPorVencer = await Task.countDocuments({
            activo: true,
            estado: { $ne: 'completada' },
            fecha_limite: { 
                $gte: new Date(), 
                $lte: fechaLimite 
            }
        });

        res.json({
            success: true,
            stats: {
                total: totalTareas,
                pendientes: tareasPendientes,
                enProgreso: tareasEnProgreso,
                completadas: tareasCompletadas,
                porVencer: tareasPorVencer
            }
        });
    } catch (error) {
        console.error('Error obteniendo estadísticas de tareas:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error al obtener estadísticas' 
        });
    }
});

// -----------------------------
// Manejo de errores
// -----------------------------
app.use((error, req, res, next) => {
  console.error('Error no manejado:', error);
  
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'El archivo es demasiado grande. Tamaño máximo: 10MB'
      });
    }
  }

  res.status(500).json({
    success: false,
    message: 'Error interno del servidor'
  });
});

// =============================================================================
// RUTAS DE NOTIFICACIONES
// =============================================================================

// Obtener todas las notificaciones con filtros
app.get('/api/notifications', async (req, res) => {
  try {
    console.log('📥 Obteniendo notificaciones con filtros:', req.query);
    
    const {
      leida,
      tipo,
      prioridad,
      desde,
      hasta,
      limite = 50,
      pagina = 1
    } = req.query;

    const filtros = {};
    if (leida !== undefined) filtros.leida = leida === 'true';
    if (tipo) filtros.tipo = tipo;
    if (prioridad) filtros.prioridad = prioridad;
    if (desde) filtros.desde = desde;
    if (hasta) filtros.hasta = hasta;

    const resultado = await NotificationService.obtener(filtros, {
      limite: parseInt(limite),
      pagina: parseInt(pagina)
    });

    console.log(`✅ ${resultado.notificaciones.length} notificaciones obtenidas`);

    res.json({
      success: true,
      data: resultado
    });

  } catch (error) {
    console.error('❌ Error obteniendo notificaciones:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener notificaciones: ' + error.message
    });
  }
});

// Obtener notificaciones no leídas
app.get('/api/notifications/unread', async (req, res) => {
  try {
    console.log('📥 Obteniendo notificaciones no leídas');
    
    const resultado = await NotificationService.obtener({ leida: false });
    
    console.log(`✅ ${resultado.notificaciones.length} notificaciones no leídas`);

    res.json({
      success: true,
      data: resultado
    });

  } catch (error) {
    console.error('❌ Error obteniendo notificaciones no leídas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener notificaciones: ' + error.message
    });
  }
});

// Obtener estadísticas de notificaciones
app.get('/api/notifications/stats', async (req, res) => {
  try {
    console.log('📊 Obteniendo estadísticas de notificaciones');
    
    const estadisticas = await NotificationService.obtenerEstadisticas();
    
    console.log('✅ Estadísticas obtenidas:', estadisticas);

    res.json({
      success: true,
      data: estadisticas
    });

  } catch (error) {
    console.error('❌ Error obteniendo estadísticas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener estadísticas: ' + error.message
    });
  }
});

// Marcar notificación como leída
app.patch('/api/notifications/:id/read', async (req, res) => {
  try {
    const { id } = req.params;
    console.log('✅ Marcando notificación como leída:', id);

    const notificacion = await NotificationService.marcarLeida(id);

    res.json({
      success: true,
      message: 'Notificación marcada como leída',
      data: notificacion
    });

  } catch (error) {
    console.error('❌ Error marcando notificación:', error);
    res.status(500).json({
      success: false,
      message: 'Error al marcar notificación: ' + error.message
    });
  }
});

// Marcar todas las notificaciones como leídas
app.patch('/api/notifications/read-all', async (req, res) => {
  try {
    console.log('✅ Marcando todas las notificaciones como leídas');

    const cantidad = await NotificationService.marcarTodasLeidas();

    res.json({
      success: true,
      message: `${cantidad} notificación(es) marcada(s) como leída(s)`,
      data: { cantidad }
    });

  } catch (error) {
    console.error('❌ Error marcando notificaciones:', error);
    res.status(500).json({
      success: false,
      message: 'Error al marcar notificaciones: ' + error.message
    });
  }
});

// Eliminar notificación
app.delete('/api/notifications/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log('🗑️ Eliminando notificación:', id);

    await NotificationService.eliminar(id);

    res.json({
      success: true,
      message: 'Notificación eliminada correctamente'
    });

  } catch (error) {
    console.error('❌ Error eliminando notificación:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar notificación: ' + error.message
    });
  }
});

// Limpiar notificaciones antiguas
app.post('/api/notifications/cleanup', async (req, res) => {
  try {
    const { dias = 30 } = req.body;
    console.log(`🧹 Limpiando notificaciones de más de ${dias} días`);

    const cantidad = await NotificationService.limpiarAntiguas(dias);

    res.json({
      success: true,
      message: `${cantidad} notificación(es) antigua(s) eliminada(s)`,
      data: { cantidad }
    });

  } catch (error) {
    console.error('❌ Error limpiando notificaciones:', error);
    res.status(500).json({
      success: false,
      message: 'Error al limpiar notificaciones: ' + error.message
    });
  }
});

// Ruta para SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// -----------------------------
// Iniciar servidor
// -----------------------------
app.listen(PORT, () => {
  console.log(`🚀 Servidor ejecutándose en http://localhost:${PORT}`);
  console.log(`📊 Sistema de Gestión de Documentos - CBTIS051`);
  console.log(`🗄️ Base de datos: ${MONGODB_URI}`);
  console.log(`☁️ Cloudinary: ${cloudinary.config().cloud_name}`);
});