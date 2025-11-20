const fs = require('fs');
const path = require('path');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
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
    const allowedTypes = ['pdf', 'doc', 'docx', 'txt', 'jpg', 'jpeg', 'png'];
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
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        message: 'No se ha subido ningún archivo' 
      });
    }

    const { descripcion, categoria, fecha_vencimiento, persona_id } = req.body;

    // Subir a Cloudinary
    let cloudinaryResult;
    try {
      cloudinaryResult = await cloudinary.uploader.upload(req.file.path, {
        folder: 'documentos_cbtis051',
        resource_type: 'auto'
      });
    } catch (cloudinaryError) {
      console.error('Error subiendo a Cloudinary:', cloudinaryError);
      // Limpiar archivo temporal
      fs.unlinkSync(req.file.path);
      return res.status(500).json({ 
        success: false, 
        message: 'Error al subir el archivo a la nube' 
      });
    }

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

    // Limpiar archivo temporal
    fs.unlinkSync(req.file.path);

    // Obtener documento con datos de persona
    const documentoConPersona = await Document.findById(nuevoDocumento._id)
      .populate('persona_id', 'nombre');

    res.json({
      success: true,
      message: 'Documento subido correctamente',
      document: documentoConPersona
    });

  } catch (error) {
    console.error('Error subiendo documento:', error);
    // Limpiar archivo temporal si existe
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ 
      success: false, 
      message: 'Error al subir documento' 
    });
  }
});

app.get('/api/documents/:id/download', async (req, res) => {
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

    // Redirigir a la URL de Cloudinary para descarga
    res.redirect(documento.cloudinary_url);

  } catch (error) {
    console.error('Error descargando documento:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al descargar documento' 
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