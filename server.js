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

const Person = mongoose.model('Person', personSchema);
const Category = mongoose.model('Category', categorySchema);
const Document = mongoose.model('Document', documentSchema);

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
  .then(() => console.log('✅ Conectado a MongoDB'))
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

app.get('/api/documents/:id/download', async (req, res) => {
  try {
    console.log('📥 Solicitud de descarga de documento:', req.params.id);
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      console.error('❌ ID inválido:', id);
      return res.status(400).json({ 
        success: false, 
        message: 'ID inválido' 
      });
    }

    const documento = await Document.findOne({ _id: id, activo: true });

    if (!documento) {
      console.error('❌ Documento no encontrado:', id);
      return res.status(404).json({ 
        success: false, 
        message: 'Documento no encontrado' 
      });
    }

    console.log('✅ Documento encontrado:', documento.nombre_original);
    console.log('📤 Cloudinary URL:', documento.cloudinary_url);

    // Modificar la URL de Cloudinary para forzar descarga
    // Agregar fl_attachment al final de la URL antes de la extensión
    let downloadUrl = documento.cloudinary_url;
    
    // Si es una imagen o archivo, agregar parámetro de descarga
    if (documento.resource_type === 'image' || documento.resource_type === 'raw') {
      // Insertar fl_attachment antes del nombre del archivo
      const urlParts = downloadUrl.split('/upload/');
      if (urlParts.length === 2) {
        downloadUrl = `${urlParts[0]}/upload/fl_attachment:${encodeURIComponent(documento.nombre_original)}/${urlParts[1]}`;
      }
    }

    console.log('🔗 URL de descarga:', downloadUrl);
    
    // Redirigir a la URL de Cloudinary con parámetros de descarga
    res.redirect(downloadUrl);

  } catch (error) {
    console.error('❌ Error descargando documento:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al descargar documento: ' + error.message 
    });
  }
});

app.get('/api/documents/:id/preview', async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ 
        success: false, 
        message: 'ID inválido' 
      });
    }

    const documento = await Document.findOne({ _id: id, activo: true })
      .populate('persona_id', 'nombre');

    if (!documento) {
      return res.status(404).json({ 
        success: false, 
        message: 'Documento no encontrado' 
      });
    }

    // Para PDFs y imágenes, podemos usar la URL de Cloudinary directamente
    // Para otros tipos, redirigir a la descarga
    if (documento.tipo_archivo === 'pdf' || 
        ['jpg', 'jpeg', 'png'].includes(documento.tipo_archivo)) {
      res.redirect(documento.cloudinary_url);
    } else {
      res.redirect(documento.cloudinary_url);
    }

  } catch (error) {
    console.error('Error en vista previa:', error);
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

    // Pie de página
    const pageCount = doc.bufferedPageRange().count;
    for (let i = 0; i < pageCount; i++) {
      doc.switchToPage(i);
      doc.fontSize(8)
         .fillColor('#6B7280')
         .text(
           `Página ${i + 1} de ${pageCount} - Sistema de Gestión de Documentos CBTIS051`,
           50,
           doc.page.height - 50,
           { align: 'center' }
         );
    }

    doc.end();

    console.log('✅ Reporte PDF generado exitosamente');

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

  } catch (error) {
    console.error('❌ Error generando reporte CSV:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al generar reporte CSV: ' + error.message 
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