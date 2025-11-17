const fs = require('fs');
const path = require('path');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
require('dotenv').config();

// -----------------------------
// Config y constantes
// -----------------------------
const app = express();
const PORT = Number(process.env.PORT) || 4000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/CBTIS051';

// Cloudinary config
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dn9ts84q6',
  api_key: process.env.CLOUDINARY_API_KEY || '797652563747974',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'raOkraliwEKlBFTRL7Cr9kEyHOA'
});

// -----------------------------
// Debug / Logger (detallado)
// -----------------------------
const isProd = process.env.NODE_ENV === 'production';

function prettyTime(date = new Date()) {
  return date.toISOString();
}

function short(obj, maxLen = 800) {
  try {
    const s = JSON.stringify(obj);
    if (s.length > maxLen) return s.slice(0, maxLen) + '...';
    return s;
  } catch (e) {
    return String(obj);
  }
}

// Logger middleware: registra method, url, status, tiempo, ip, body (truncado)
app.use((req, res, next) => {
  const start = Date.now();
  const { method, url } = req;
  const ip = req.ip || req.connection?.remoteAddress || 'unknown';
  // Clonar body para no interferir
  const bodyCopy = req.body ? short(req.body, 500) : null;
  res.on('finish', () => {
    const elapsed = Date.now() - start;
    const logParts = [
      `[${prettyTime()}]`,
      `${method} ${url}`,
      `status=${res.statusCode}`,
      `time=${elapsed}ms`,
      `ip=${ip}`
    ];
    if (bodyCopy) logParts.push(`body=${bodyCopy}`);
    console.log(logParts.join(' | '));
  });
  next();
});

// Middleware para medir tiempo total por ruta (opcional)
app.use((req, res, next) => {
  req._reqStartTime = Date.now();
  next();
});

// -----------------------------
// Middlewares estandar
// -----------------------------
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// -----------------------------
// Conexion a MongoDB
// -----------------------------
mongoose.connect(MONGODB_URI)
  .then(() => console.log(`${prettyTime()} | ✅ Conectado a MongoDB -> ${MONGODB_URI}`))
  .catch(err => {
    console.error(`${prettyTime()} | ❌ Error conectando a MongoDB:`, err);
    // No terminar aqui; el manejador global de errores se encargara si es necesario.
  });

// Manejo de eventos de mongoose (debug)
mongoose.connection.on('connected', () => console.log(`${prettyTime()} | mongoose connected`));
mongoose.connection.on('error', (err) => console.error(`${prettyTime()} | mongoose error:`, err));
mongoose.connection.on('disconnected', () => console.warn(`${prettyTime()} | mongoose disconnected`));

// -----------------------------
// Esquemas y modelos
// -----------------------------
const personSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  telefono: String,
  departamento: String,
  puesto: String,
  activo: { type: Boolean, default: true },
  fecha_creacion: { type: Date, default: Date.now }
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
const Document = mongoose.model('Document', documentSchema);

// -----------------------------
// Multer: almacenamiento temporal
// -----------------------------
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Limites y filtro de archivos
const ALLOWED_EXT = ['pdf', 'doc', 'docx', 'txt', 'jpg', 'jpeg', 'png'];
const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10MB

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const safeName = Date.now() + '-' + file.originalname.replace(/\s+/g, '_');
    cb(null, safeName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_BYTES },
  fileFilter: (req, file, cb) => {
    const ext = (file.originalname.split('.').pop() || '').toLowerCase();
    if (ALLOWED_EXT.includes(ext)) return cb(null, true);
    const err = new Error('Tipo de archivo no permitido. Solo se permiten: ' + ALLOWED_EXT.join(', '));
    err.code = 'FILE_TYPE_NOT_ALLOWED';
    return cb(err, false);
  }
});

// -----------------------------
// Rutas publicas y utilidades
// -----------------------------
app.get('/api/test', (req, res) => {
  res.json({
    success: true,
    message: 'API funcionando correctamente',
    server_time: new Date().toISOString(),
    database: 'MongoDB',
    cloudinary: cloudinary.config().cloud_name || 'no-config'
  });
});

// Test cloudinary: sube un archivo temporal en base64 y lo elimina
app.get('/api/test-cloudinary', async (req, res) => {
  try {
    const testContent = "archivo prueba cbtis051 " + Date.now();
    const b64 = `data:text/plain;base64,${Buffer.from(testContent).toString('base64')}`;
    const uploadResult = await cloudinary.uploader.upload(b64, {
      folder: 'documentos/cbtis051',
      public_id: `test_${Date.now()}`,
      resource_type: 'raw'
    });

    // destruir inmediatamente (limpieza)
    await cloudinary.uploader.destroy(uploadResult.public_id, { resource_type: 'raw' });

    return res.json({
      success: true,
      message: 'Conexión con Cloudinary correcta',
      cloudinary_response: {
        public_id: uploadResult.public_id,
        secure_url: uploadResult.secure_url,
        resource_type: uploadResult.resource_type
      }
    });
  } catch (err) {
    console.error(`${prettyTime()} | Error test-cloudinary:`, err);
    return res.status(500).json({ success: false, message: 'Error al conectar con Cloudinary: ' + (err.message || err) });
  }
});

// -----------------------------
// DASHBOARD
// -----------------------------
app.get('/api/dashboard', async (req, res) => {
  try {
    const totalPersonas = await Person.countDocuments({ activo: true });
    const totalDocumentos = await Document.countDocuments({ activo: true });

    const treinta = new Date();
    treinta.setDate(treinta.getDate() + 30);

    const proximosVencer = await Document.countDocuments({
      activo: true,
      fecha_vencimiento: { $gte: new Date(), $lte: treinta }
    });

    const recentDocuments = await Document.find({ activo: true })
      .populate('persona_id', 'nombre')
      .sort({ fecha_subida: -1 })
      .limit(5);

    res.json({
      success: true,
      stats: { totalPersonas, totalDocumentos, proximosVencer },
      recent_documents: recentDocuments
    });
  } catch (err) {
    console.error(`${prettyTime()} | Error dashboard:`, err);
    res.status(500).json({ success: false, message: 'Error al cargar datos del dashboard: ' + (err.message || err) });
  }
});

// -----------------------------
// PERSONAS
// -----------------------------
app.get('/api/persons', async (req, res) => {
  try {
    const persons = await Person.find({ activo: true }).sort({ nombre: 1 });
    res.json({ success: true, persons });
  } catch (err) {
    console.error(`${prettyTime()} | Error get persons:`, err);
    res.status(500).json({ success: false, message: 'Error al obtener personas: ' + (err.message || err) });
  }
});

app.get('/api/persons/:id', async (req, res) => {
  try {
    const id = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ success: false, message: 'ID de persona no valido' });
    const person = await Person.findOne({ _id: id, activo: true });
    if (!person) return res.status(404).json({ success: false, message: 'Persona no encontrada' });
    res.json({ success: true, person });
  } catch (err) {
    console.error(`${prettyTime()} | Error get person by id:`, err);
    res.status(500).json({ success: false, message: 'Error al obtener persona: ' + (err.message || err) });
  }
});

app.post('/api/persons', async (req, res) => {
  try {
    const { nombre, email, telefono, departamento, puesto } = req.body;
    if (!nombre || !email) return res.status(400).json({ success: false, message: 'Nombre y email son obligatorios' });

    const existing = await Person.findOne({ email, activo: true });
    if (existing) return res.status(400).json({ success: false, message: 'El email ya esta registrado' });

    const newP = new Person({ nombre, email, telefono, departamento, puesto });
    await newP.save();
    res.json({ success: true, message: 'Persona agregada correctamente', person: newP });
  } catch (err) {
    console.error(`${prettyTime()} | Error create person:`, err);
    if (err.code === 11000) return res.status(400).json({ success: false, message: 'El email ya esta registrado' });
    res.status(500).json({ success: false, message: 'Error al agregar persona: ' + (err.message || err) });
  }
});

app.put('/api/persons/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const { nombre, email, telefono, departamento, puesto } = req.body;
    if (!nombre || !email) return res.status(400).json({ success: false, message: 'Nombre y email son obligatorios' });
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ success: false, message: 'ID de persona no valido' });

    const existing = await Person.findOne({ email, _id: { $ne: id }, activo: true });
    if (existing) return res.status(400).json({ success: false, message: 'El email ya esta registrado' });

    const updated = await Person.findByIdAndUpdate(id, { nombre, email, telefono, departamento, puesto }, { new: true, runValidators: true });
    if (!updated) return res.status(404).json({ success: false, message: 'Persona no encontrada' });
    res.json({ success: true, message: 'Persona actualizada correctamente', person: updated });
  } catch (err) {
    console.error(`${prettyTime()} | Error update person:`, err);
    if (err.code === 11000) return res.status(400).json({ success: false, message: 'El email ya esta registrado' });
    res.status(500).json({ success: false, message: 'Error al actualizar persona: ' + (err.message || err) });
  }
});

app.delete('/api/persons/:id', async (req, res) => {
  try {
    const id = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ success: false, message: 'ID de persona no valido' });

    const documentCount = await Document.countDocuments({ persona_id: id, activo: true });
    if (documentCount > 0) return res.status(400).json({ success: false, message: 'No se puede eliminar la persona porque tiene documentos asociados' });

    const deleted = await Person.findByIdAndUpdate(id, { activo: false }, { new: true });
    if (!deleted) return res.status(404).json({ success: false, message: 'Persona no encontrada' });
    res.json({ success: true, message: 'Persona eliminada correctamente' });
  } catch (err) {
    console.error(`${prettyTime()} | Error delete person:`, err);
    res.status(500).json({ success: false, message: 'Error al eliminar persona: ' + (err.message || err) });
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
  } catch (err) {
    console.error(`${prettyTime()} | Error get documents:`, err);
    res.status(500).json({ success: false, message: 'Error al obtener documentos: ' + (err.message || err) });
  }
});

app.get('/api/documents/person/:personId', async (req, res) => {
  try {
    const personId = req.params.personId;
    if (!mongoose.Types.ObjectId.isValid(personId)) return res.status(400).json({ success: false, message: 'ID de persona no valido' });
    const documents = await Document.find({ persona_id: personId, activo: true })
      .populate('persona_id', 'nombre')
      .sort({ fecha_subida: -1 });
    res.json({ success: true, documents });
  } catch (err) {
    console.error(`${prettyTime()} | Error get documents by person:`, err);
    res.status(500).json({ success: false, message: 'Error al obtener documentos: ' + (err.message || err) });
  }
});

app.get('/api/documents/:id', async (req, res) => {
  try {
    const id = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ success: false, message: 'ID de documento no valido' });
    const doc = await Document.findOne({ _id: id, activo: true }).populate('persona_id', 'nombre email');
    if (!doc) return res.status(404).json({ success: false, message: 'Documento no encontrado' });
    res.json({ success: true, document: doc });
  } catch (err) {
    console.error(`${prettyTime()} | Error get document by id:`, err);
    res.status(500).json({ success: false, message: 'Error al obtener documento: ' + (err.message || err) });
  }
});

// Subir nuevo documento
app.post('/api/documents', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No se ha subido ningun archivo' });

    const { descripcion, categoria, fecha_vencimiento, persona_id } = req.body;

    // validar persona_id si se proporciona
    if (persona_id && !mongoose.Types.ObjectId.isValid(persona_id)) {
      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(400).json({ success: false, message: 'ID de persona no valido' });
    }

    if (persona_id) {
      const personExists = await Person.findOne({ _id: persona_id, activo: true });
      if (!personExists) {
        if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        return res.status(404).json({ success: false, message: 'Persona no encontrada' });
      }
    }

    // subir a cloudinary
    let cloudinaryResult;
    try {
      cloudinaryResult = await cloudinary.uploader.upload(req.file.path, {
        folder: 'documentos/cbtis051',
        resource_type: 'auto',
        use_filename: true,
        unique_filename: true
      });
    } catch (cloudErr) {
      console.error(`${prettyTime()} | Error subir a cloudinary:`, cloudErr);
      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(500).json({ success: false, message: 'Error al subir a Cloudinary: ' + (cloudErr.message || cloudErr) });
    }

    // guardar en BD
    const newDoc = new Document({
      nombre_original: req.file.originalname,
      tipo_archivo: (req.file.originalname.split('.').pop() || '').toLowerCase(),
      tamano_archivo: req.file.size,
      descripcion: descripcion || '',
      categoria: categoria || 'General',
      fecha_vencimiento: fecha_vencimiento || null,
      persona_id: persona_id || null,
      cloudinary_url: cloudinaryResult.secure_url,
      public_id: cloudinaryResult.public_id,
      resource_type: cloudinaryResult.resource_type
    });

    await newDoc.save();

    // limpiar archivo local
    if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);

    const docWithPerson = await Document.findById(newDoc._id).populate('persona_id', 'nombre');

    res.json({
      success: true,
      message: 'Documento subido correctamente a la nube',
      document: docWithPerson,
      url: cloudinaryResult.secure_url,
      public_id: cloudinaryResult.public_id
    });
  } catch (err) {
    console.error(`${prettyTime()} | Error post document:`, err);
    // limpiar archivo si existe
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      try { fs.unlinkSync(req.file.path); } catch (e) { /* ignore */ }
    }
    res.status(500).json({ success: false, message: 'Error al subir documento: ' + (err.message || err) });
  }
});

// Actualizar documento (solo campos)
app.put('/api/documents/:id', async (req, res) => {
  try {
    const id = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ success: false, message: 'ID de documento no valido' });

    const { descripcion, categoria, fecha_vencimiento, persona_id } = req.body;

    if (persona_id && !mongoose.Types.ObjectId.isValid(persona_id)) return res.status(400).json({ success: false, message: 'ID de persona no valido' });
    if (persona_id) {
      const personExists = await Person.findOne({ _id: persona_id, activo: true });
      if (!personExists) return res.status(404).json({ success: false, message: 'Persona no encontrada' });
    }

    const updated = await Document.findByIdAndUpdate(id, {
      descripcion,
      categoria,
      fecha_vencimiento: fecha_vencimiento || null,
      persona_id: persona_id || null
    }, { new: true }).populate('persona_id', 'nombre');

    if (!updated) return res.status(404).json({ success: false, message: 'Documento no encontrado' });
    res.json({ success: true, message: 'Documento actualizado correctamente', document: updated });
  } catch (err) {
    console.error(`${prettyTime()} | Error update document:`, err);
    res.status(500).json({ success: false, message: 'Error al actualizar documento: ' + (err.message || err) });
  }
});

// Eliminar documento (borrado logico + intento de eliminar en cloudinary)
app.delete('/api/documents/:id', async (req, res) => {
  try {
    const id = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ success: false, message: 'ID de documento no valido' });

    const doc = await Document.findById(id);
    if (!doc) return res.status(404).json({ success: false, message: 'Documento no encontrado' });

    try {
      await cloudinary.uploader.destroy(doc.public_id, { resource_type: doc.resource_type });
    } catch (cloudErr) {
      console.warn(`${prettyTime()} | Warning: no se pudo eliminar de cloudinary:`, cloudErr && cloudErr.message ? cloudErr.message : cloudErr);
      // continuar con el borrado logico
    }

    await Document.findByIdAndUpdate(id, { activo: false });
    res.json({ success: true, message: 'Documento eliminado correctamente' });
  } catch (err) {
    console.error(`${prettyTime()} | Error delete document:`, err);
    res.status(500).json({ success: false, message: 'Error al eliminar documento: ' + (err.message || err) });
  }
});

// Descargar documento -> redirige a cloudinary
app.get('/api/documents/:id/download', async (req, res) => {
  try {
    const id = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ success: false, message: 'ID de documento no valido' });

    const doc = await Document.findOne({ _id: id, activo: true });
    if (!doc) return res.status(404).json({ success: false, message: 'Documento no encontrado' });

    return res.redirect(doc.cloudinary_url);
  } catch (err) {
    console.error(`${prettyTime()} | Error download document:`, err);
    res.status(500).json({ success: false, message: 'Error al descargar documento: ' + (err.message || err) });
  }
});

// Frontend SPA fallback
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

// -----------------------------
// Manejo de errores de multer y middleware final
// -----------------------------
app.use((err, req, res, next) => {
  // Multer errors
  if (err && err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ success: false, message: 'El archivo excede el tamano maximo permitido (10MB)' });
  }
  if (err && err.code === 'FILE_TYPE_NOT_ALLOWED') {
    return res.status(400).json({ success: false, message: err.message || 'Tipo de archivo no permitido' });
  }
  // Otros errores
  console.error(`${prettyTime()} | Error middleware global:`, err);
  return res.status(500).json({ success: false, message: 'Error interno del servidor: ' + (err.message || err) });
});

// -----------------------------
// Iniciar servidor con control de errores de puerto
// -----------------------------
const server = app.listen(PORT, () => {
  console.log(`${prettyTime()} | 🚀 Servidor ejecutandose en http://localhost:${PORT}`);
  console.log(`${prettyTime()} | 📊 Sistema de Gestion de Documentos - CBTIS051`);
  console.log(`${prettyTime()} | 🗄 Base de datos: ${MONGODB_URI}`);
  console.log(`${prettyTime()} | ☁ Cloudinary: ${cloudinary.config().cloud_name || 'no-config'}`);
});

// Manejar error de bind (EADDRINUSE, EACCES, etc)
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`${prettyTime()} | ERROR: Puerto ${PORT} en uso. Cambia el puerto o mata el proceso que lo usa.`);
  } else if (err.code === 'EACCES') {
    console.error(`${prettyTime()} | ERROR: Permisos insuficientes para usar el puerto ${PORT}.`);
  } else {
    console.error(`${prettyTime()} | ERROR servidor:`, err);
  }
  process.exit(1);
});

// -----------------------------
// Manejo de cierre limpio y errores globales
// -----------------------------
async function gracefulShutdown(signal) {
  try {
    console.log(`${prettyTime()} | Recibido ${signal}. Iniciando cierre limpio...`);
    // cerrar server
    await new Promise((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
    // desconectar mongoose
    await mongoose.disconnect();
    console.log(`${prettyTime()} | Cierre limpio completado. Saliendo.`);
    process.exit(0);
  } catch (err) {
    console.error(`${prettyTime()} | Error durante cierre limpio:`, err);
    process.exit(1);
  }
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

process.on('uncaughtException', (err) => {
  console.error(`${prettyTime()} | UNCAUGHT EXCEPTION:`, err);
  // intentar cerrar limpio antes de salir
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error(`${prettyTime()} | UNHANDLED REJECTION:`, reason);
  // opcional: loguear el promise
});

// -----------------------------
// Export (para tests o import)
module.exports = { app, server };
