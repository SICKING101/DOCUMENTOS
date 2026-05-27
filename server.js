// server.js - Servidor principal de la aplicación de gestión de documentos

import './src/backend/config/env.js';

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import multer from 'multer';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import dotenv from 'dotenv';

import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { s3Client, SPACES_CONFIG } from './src/backend/config/cloudinaryConfig.js';

// ===== CONFIGURACIÓN CRÍTICA DE DOTENV - DEBE SER LO PRIMERO =====
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cargar .env desde la raíz del proyecto
const envPath = path.join(__dirname, '.env');
console.log('🔍 Buscando .env en:', envPath);

if (fs.existsSync(envPath)) {
  const result = dotenv.config({ path: envPath });
  if (result.error) {
    console.error('❌ Error cargando .env:', result.error);
  } else {
    console.log('✅ .env cargado correctamente');
  }
} else {
  console.warn('⚠️ Archivo .env no encontrado en:', envPath);
}

// DEBUG: Verificar variables cargadas
// DEBUG COMPLETO DE BREVO_API_KEY
const rawKey = process.env.BREVO_API_KEY;
console.log('🔑 DEBUG BREVO_API_KEY:');
console.log('  - ¿Existe?:', !!rawKey);
console.log('  - Longitud:', rawKey?.length);
console.log('  - Empieza con xkeysib:', rawKey?.startsWith('xkeysib'));
console.log('  - Termina con Wy:', rawKey?.endsWith('Wy'));
console.log('  - Contiene saltos de línea:', rawKey?.includes('\n') || rawKey?.includes('\r'));
console.log('  - Valor exacto entre comillas:', JSON.stringify(rawKey));
console.log('📧 EMAIL_FROM:', process.env.EMAIL_FROM || 'No configurado');
// ===== FIN CONFIGURACIÓN DOTENV =====

// AHORA SÍ - Importar emailService DESPUÉS de cargar .env
import emailService from './src/backend/services/emailService.js';

// Luego el resto de imports
import SupportController from './src/backend/controllers/supportController.js';
import { validarConfigSuperAdmin } from './src/backend/middleware/superAdminAuth.js';
import authRoutes from './src/backend/routes/authRoutes.js';
import apiRoutes from './src/backend/routes/apiRoutes.js';
import calendarRoutes from './src/backend/routes/calendarRoutes.js';
import superAdminRoutes from './src/backend/routes/superAdminRoutes.js';
import Document from './src/backend/models/Document.js';
import Ticket from './src/backend/models/Ticket.js';
import Person from './src/backend/models/Person.js';
import Category from './src/backend/models/Category.js';
import Department from './src/backend/models/Department.js';
import adminRoutes from './src/backend/routes/adminRoutes.js';
import Notification from './src/backend/models/Notification.js';
import ReminderService from './src/backend/services/reminderService.js';
import NotificationService from './src/backend/services/notificationService.js';
import { verificarAccesoSistema } from './src/backend/middleware/systemAccess.js';
import { protegerRuta, inyectarSchoolId } from './src/backend/middleware/auth.js';

validarConfigSuperAdmin();

const UPLOADS_DIR = path.join(__dirname, 'uploads');

// -----------------------------
// Configuración
// -----------------------------
const app = express();
const PORT = process.env.PORT || 4000;
const MONGO_URI = process.env.MONGO_URI;

// -----------------------------
// Middlewares
// -----------------------------
const allowedOrigins = [
  'http://localhost:4000',
  'https://documentos-kj6t.onrender.com',
  "http://127.0.0.1:4000",
  "http://gestacks.com",
  "https://gestacks.com",
  "http://www.gestacks.com",
  "https://www.gestacks.com"
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS bloqueado para: ' + origin));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));

// 👇 MUY IMPORTANTE para preflight
app.options('*', cors());

app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/src', express.static(path.join(__dirname, 'src')));

// Rutas de autenticación
app.use('/api/auth', authRoutes);

app.use('/api/admin', adminRoutes);

// Rutas principales de la API
app.use('/api', apiRoutes);
console.log('✅ API Routes montadas correctamente en /api');
console.log('- Rutas de tareas disponibles:');
console.log('  • GET /api/tasks');
console.log('  • GET /api/tasks/high-priority');
console.log('  • GET /api/tasks/today');
console.log('  • GET /api/tasks/stats');

app.use('/api/calendar', calendarRoutes);
console.log('📅 Calendar Routes montadas en /api/calendar');

app.use('/api/superadmin', superAdminRoutes);
console.log('🛡️  Super Admin Routes montadas en /api/superadmin');

console.log("MONGO URI:", process.env.MONGO_URI);

// -----------------------------
// Configuración de Multer
// -----------------------------
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Verificar y crear directorio en cada upload por seguridad
    if (!fs.existsSync(UPLOADS_DIR)) {
      fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    }
    cb(null, UPLOADS_DIR);
  },
  filename: function (req, file, cb) {
    // Limpiar nombre de archivo y mantener extensión
    const originalName = file.originalname;
    const ext = path.extname(originalName);
    const name = path.basename(originalName, ext);

    // Crear nombre seguro (reemplazar caracteres especiales y espacios)
    const safeName = name
      .replace(/[^a-zA-Z0-9]/g, '_')
      .substring(0, 100); // Limitar longitud

    const finalName = `${Date.now()}-${Math.round(Math.random() * 1E9)}-${safeName}${ext}`;
    cb(null, finalName);
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
mongoose.connect(MONGO_URI)
  .then(async () => {
    console.log('✅ Conectado a MongoDB');
    // Crear notificación de sistema iniciado
    try {
      await NotificationService.sistemaIniciado();
    } catch (error) {
      console.error('⚠️ Error creando notificación de inicio:', error.message);
    }
    // 🆕 Iniciar servicio de recordatorios
    ReminderService.start();
  })
  .catch(err => {
    console.error('❌ Error conectando a MongoDB:', err);
  });

// -----------------------------
// Rutas de la API
// -----------------------------

app.get('/landing', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'Landing', 'index.html'));
});

// Ruta de prueba
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'API funcionando correctamente',
    timestamp: new Date().toISOString()
  });
});

app.get('/superadmin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'superadmin.html'));
});

// -----------------------------
// DASHBOARD (AISLADO POR ESCUELA)
// -----------------------------
app.get('/api/dashboard', protegerRuta, inyectarSchoolId, async (req, res) => {
  try {
    // 🆕 Filtro base por escuela
    const docFilter = {
      $or: [
        { isDeleted: false },
        { isDeleted: { $exists: false } }
      ]
    };
    if (req.schoolId) docFilter.schoolId = req.schoolId;

    const personFilter = { activo: true };
    if (req.schoolId) personFilter.schoolId = req.schoolId;

    const categoryFilter = { activo: true };
    // Las categorías pueden ser compartidas o no, según tu decisión
    // Si quieres aislarlas también: if (req.schoolId) categoryFilter.schoolId = req.schoolId;

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

// =============================================================================
// 🆕 SINCRONIZACIÓN DE EVENTOS DEL CALENDARIO (localStorage → MongoDB)
// =============================================================================
app.post('/api/calendar/sync', protegerRuta, inyectarSchoolId, async (req, res) => {
  try {
    const { eventos } = req.body;

    if (!eventos || !Array.isArray(eventos)) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere un array de eventos'
      });
    }

    const CalendarEvent = (await import('./src/backend/models/CalendarEvent.js')).default;

    // Obtener los localId de los eventos enviados
    const localIdsEnviados = eventos.map(ev => ev.id || ev._id).filter(Boolean);

    let creados = 0;
    let actualizados = 0;
    let eliminados = 0;

    // 🆕 Marcar como inactivos los eventos que ya NO están en localStorage
    const schoolId = req.schoolId || 'superadmin';
    const resultadoEliminacion = await CalendarEvent.updateMany(
      {
        schoolId: schoolId,
        activo: true,
        localId: { $nin: localIdsEnviados }
      },
      { $set: { activo: false } }
    );
    eliminados = resultadoEliminacion.modifiedCount;

    // Crear o actualizar los eventos enviados
    for (const ev of eventos) {
      const localId = ev.id || ev._id;
      if (!localId) continue;

      const eventData = {
        localId: localId,
        titulo: ev.title || ev.titulo || 'Evento sin título',
        tipo: ev.type || ev.tipo || 'academic',
        prioridad: ev.priority || ev.prioridad || 'normal',
        color: ev.color || '#6366f1',
        fecha: ev.startDate ? new Date(ev.startDate + 'T12:00:00.000Z') : new Date(),
        fechaFin: ev.endDate ? new Date(ev.endDate + 'T12:00:00.000Z') : null,
        horaInicio: ev.startTime || null,
        horaFin: ev.endTime || null,
        ubicacion: ev.location || ev.ubicacion || '',
        descripcion: ev.description || ev.descripcion || '',
        recurrencia: ev.recurrence || ev.recurrencia || 'none',
        recordatorio: ev.reminder || ev.recordatorio || '',
        recordatorio_enviado: false,
        creadoPor: req.user?.usuario || 'sistema',
        schoolId: schoolId,
        activo: true
      };

      const existente = await CalendarEvent.findOne({ localId: eventData.localId });

      if (existente) {
        await CalendarEvent.updateOne({ localId: eventData.localId }, eventData);
        actualizados++;
      } else {
        await CalendarEvent.create(eventData);
        creados++;
      }
    }

    console.log(`📅 Sync: ${creados} creados, ${actualizados} actualizados, ${eliminados} eliminados`);

    // 🆕 Si se crearon o actualizaron eventos, verificar recordatorios inmediatamente
    if (creados > 0 || actualizados > 0) {
      try {
        await ReminderService.runChecks();
        console.log('⏰ Recordatorios verificados tras sync');
      } catch (e) {
        console.warn('⚠️ Error verificando recordatorios tras sync:', e.message);
      }
    }

    res.json({
      success: true,
      creados,
      actualizados,
      eliminados
    });

  } catch (error) {
    console.error('❌ Error sync calendario:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Endpoint de debug para ver el estado del evento
app.get('/api/debug/calendar-check', async (req, res) => {
  const CalendarEvent = (await import('./src/backend/models/CalendarEvent.js')).default;
  const ahora = new Date();

  const evento = await CalendarEvent.findOne({ activo: true }).lean();

  if (!evento) return res.json({ error: 'No hay eventos' });

  const fechaEvento = new Date(evento.fecha);
  const horasRestantes = Math.round((fechaEvento - ahora) / (1000 * 60 * 60));

  res.json({
    evento: {
      titulo: evento.titulo,
      fecha: evento.fecha,
      recordatorio: evento.recordatorio,
      recordatorio_enviado: evento.recordatorio_enviado
    },
    ahora: ahora.toISOString(),
    horasRestantes,
    ventana1d: {
      min: new Date(ahora.getTime() + 23 * 60 * 60 * 1000).toISOString(),
      max: new Date(ahora.getTime() + 25 * 60 * 60 * 1000).toISOString()
    },
    deberiaNotificar: horasRestantes >= 23 && horasRestantes <= 25 && evento.recordatorio === '1d' && !evento.recordatorio_enviado
  });
});

// -----------------------------
// PERSONAS (AISLADO POR ESCUELA)
// -----------------------------

// GET /api/persons
app.get('/api/persons', protegerRuta, inyectarSchoolId, async (req, res) => {
  try {
    const filter = { activo: true };
    // 🆕 Filtro por escuela
    if (req.schoolId) filter.schoolId = req.schoolId;

    const persons = await Person.find(filter).sort({ nombre: 1 });
    res.json({ success: true, persons });
  } catch (error) {
    console.error('Error obteniendo personas:', error);
    res.status(500).json({ success: false, message: 'Error al obtener personas' });
  }
});

// POST /api/persons
app.post('/api/persons', protegerRuta, inyectarSchoolId, async (req, res) => {
  try {
    const { nombre, email, telefono, departamento, puesto } = req.body;

    if (!nombre || !email) {
      return res.status(400).json({
        success: false,
        message: 'Nombre y email son obligatorios'
      });
    }

    // 🆕 Verificar duplicados SOLO dentro de la misma escuela
    const emailFilter = {
      email: { $regex: new RegExp(`^${email}$`, 'i') }
    };
    if (req.schoolId) emailFilter.schoolId = req.schoolId;

    const personaExistente = await Person.findOne(emailFilter);

    if (personaExistente) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe una persona con ese email en tu escuela'
      });
    }

    const nuevaPersona = new Person({
      nombre,
      email,
      telefono,
      departamento,
      puesto,
      schoolId: req.schoolId || 'superadmin'  // 🆕 Asignar schoolId
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

// PUT /api/persons/:id - También aislado
app.put('/api/persons/:id', protegerRuta, inyectarSchoolId, async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, email, telefono, departamento, puesto } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'ID inválido' });
    }

    // 🆕 Buscar solo dentro de la escuela del admin
    const filter = { _id: id };
    if (req.schoolId) filter.schoolId = req.schoolId;

    const personaActualizada = await Person.findOneAndUpdate(
      filter,
      { nombre, email, telefono, departamento, puesto },
      { new: true, runValidators: true }
    );

    if (!personaActualizada) {
      return res.status(404).json({
        success: false,
        message: 'Persona no encontrada o no pertenece a tu escuela'
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

// DELETE /api/persons/:id - También aislado
app.delete('/api/persons/:id', protegerRuta, inyectarSchoolId, async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'ID inválido' });
    }

    // 🆕 Buscar solo dentro de la escuela
    const filter = { _id: id };
    if (req.schoolId) filter.schoolId = req.schoolId;

    const personaExistente = await Person.findOne(filter);
    if (!personaExistente) {
      return res.status(404).json({
        success: false,
        message: 'Persona no encontrada o no pertenece a tu escuela'
      });
    }

    const nombrePersona = personaExistente.nombre;

    // Verificar documentos asociados (también filtrados)
    const docFilter = {
      persona_id: id,
      $or: [
        { isDeleted: false },
        { isDeleted: { $exists: false } }
      ]
    };
    if (req.schoolId) docFilter.schoolId = req.schoolId;

    const documentosAsociados = await Document.countDocuments(docFilter);

    if (documentosAsociados > 0) {
      return res.status(400).json({
        success: false,
        message: 'No se puede eliminar la persona porque tiene documentos asociados'
      });
    }

    await Person.findByIdAndDelete(id);

    try {
      await NotificationService.personaEliminada(nombrePersona);
    } catch (notifError) {
      console.error('⚠️ Error creando notificación:', notifError.message);
    }

    res.json({
      success: true,
      message: 'Persona eliminada permanentemente del sistema'
    });
  } catch (error) {
    console.error('Error eliminando persona:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar persona'
    });
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

    // Verificar si ya existe una persona con el mismo email
    const personaExistente = await Person.findOne({
      email: { $regex: new RegExp(`^${email}$`, 'i') }
    });

    if (personaExistente) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe una persona con ese email'
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

// ELIMINACIÓN PERMANENTE DE LA BASE DE DATOS
app.delete('/api/persons/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'ID inválido'
      });
    }

    // Verificar si la persona existe
    const personaExistente = await Person.findById(id);
    if (!personaExistente) {
      return res.status(404).json({
        success: false,
        message: 'Persona no encontrada'
      });
    }

    // Guardar el nombre para la notificación
    const nombrePersona = personaExistente.nombre;

    // Verificar si la persona tiene documentos asociados
    const documentosAsociados = await Document.countDocuments({
      persona_id: id,
      $or: [
        { isDeleted: false },
        { isDeleted: { $exists: false } }
      ]
    });

    if (documentosAsociados > 0) {
      return res.status(400).json({
        success: false,
        message: 'No se puede eliminar la persona porque tiene documentos asociados. Elimina o reasigna primero los documentos.'
      });
    }

    // ELIMINACIÓN PERMANENTE DE LA BASE DE DATOS
    await Person.findByIdAndDelete(id);

    // Crear notificación de persona eliminada
    try {
      await NotificationService.personaEliminada(nombrePersona);
    } catch (notifError) {
      console.error('⚠️ Error creando notificación:', notifError.message);
    }

    res.json({
      success: true,
      message: 'Persona eliminada permanentemente del sistema'
    });
  } catch (error) {
    console.error('Error eliminando persona:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar persona'
    });
  }
});

// Rutas adicionales para gestión de estado (opcional)
app.patch('/api/persons/:id/deactivate', async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'ID inválido'
      });
    }

    const personaDesactivada = await Person.findByIdAndUpdate(
      id,
      { activo: false },
      { new: true }
    );

    if (!personaDesactivada) {
      return res.status(404).json({
        success: false,
        message: 'Persona no encontrada'
      });
    }

    res.json({
      success: true,
      message: 'Persona desactivada correctamente',
      person: personaDesactivada
    });
  } catch (error) {
    console.error('Error desactivando persona:', error);
    res.status(500).json({
      success: false,
      message: 'Error al desactivar persona'
    });
  }
});

app.patch('/api/persons/:id/reactivate', async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'ID inválido'
      });
    }

    const personaReactivada = await Person.findByIdAndUpdate(
      id,
      { activo: true },
      { new: true }
    );

    if (!personaReactivada) {
      return res.status(404).json({
        success: false,
        message: 'Persona no encontrada'
      });
    }

    res.json({
      success: true,
      message: 'Persona reactivada correctamente',
      person: personaReactivada
    });
  } catch (error) {
    console.error('Error reactivando persona:', error);
    res.status(500).json({
      success: false,
      message: 'Error al reactivar persona'
    });
  }
});

app.get('/api/persons/inactive', async (req, res) => {
  try {
    const persons = await Person.find({ activo: false }).sort({ nombre: 1 });
    res.json({ success: true, persons });
  } catch (error) {
    console.error('Error obteniendo personas inactivas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener personas inactivas'
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
// DEPARTAMENTOS
// -----------------------------
app.get('/api/departments', async (req, res) => {
  try {
    const departments = await Department.find({ activo: true }).sort({ nombre: 1 });

    // Contar personas por departamento
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

    res.json({ success: true, departments: departmentsWithCounts });
  } catch (error) {
    console.error('Error obteniendo departamentos:', error);
    res.status(500).json({ success: false, message: 'Error al obtener departamentos' });
  }
});

app.post('/api/departments', async (req, res) => {
  try {
    const { nombre, descripcion, color, icon } = req.body;

    if (!nombre) {
      return res.status(400).json({
        success: false,
        message: 'El nombre es obligatorio'
      });
    }

    // Verificar si ya existe un departamento con el mismo nombre
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

    const nuevoDepartamento = new Department({
      nombre,
      descripcion,
      color: color || '#3b82f6',
      icon: icon || 'building'
    });

    await nuevoDepartamento.save();

    res.json({
      success: true,
      message: 'Departamento creado correctamente',
      department: nuevoDepartamento
    });
  } catch (error) {
    console.error('Error creando departamento:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear departamento'
    });
  }
});

app.put('/api/departments/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, descripcion, color, icon } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'ID inválido'
      });
    }

    const departamentoActualizado = await Department.findByIdAndUpdate(
      id,
      { nombre, descripcion, color, icon },
      { new: true, runValidators: true }
    );

    if (!departamentoActualizado) {
      return res.status(404).json({
        success: false,
        message: 'Departamento no encontrado'
      });
    }

    res.json({
      success: true,
      message: 'Departamento actualizado correctamente',
      department: departamentoActualizado
    });
  } catch (error) {
    console.error('Error actualizando departamento:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar departamento'
    });
  }
});

app.delete('/api/departments/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'ID inválido'
      });
    }

    const departamento = await Department.findById(id);
    if (!departamento) {
      return res.status(404).json({
        success: false,
        message: 'Departamento no encontrado'
      });
    }

    // Verificar si hay personas en este departamento
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

    await Department.findByIdAndUpdate(id, { activo: false });

    res.json({
      success: true,
      message: 'Departamento eliminado correctamente'
    });
  } catch (error) {
    console.error('Error eliminando departamento:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar departamento'
    });
  }
});

// -----------------------------
// DOCUMENTOS (AISLADO POR ESCUELA)
// -----------------------------
app.get('/api/documents', protegerRuta, inyectarSchoolId, async (req, res) => {
  try {
    console.log('📊 ========== OBTENIENDO DOCUMENTOS ==========');

    // 🆕 Filtro base por escuela
    const filter = {
      $or: [
        { isDeleted: false },
        { isDeleted: { $exists: false } }
      ]
    };
    if (req.schoolId) filter.schoolId = req.schoolId;

    // Estadísticas para debugging
    const totalDocs = await Document.countDocuments(filter);
    console.log(`📊 Documentos encontrados (filtrados por escuela): ${totalDocs}`);

    const documents = await Document.find(filter)
      .populate('persona_id', 'nombre email departamento puesto')
      .sort({ fecha_subida: -1 })
      .lean();

    console.log(`📊 Documentos después de populate: ${documents.length}`);

    // Transformar documentos para asegurar consistencia
    const documentosTransformados = documents.map(doc => {
      const documentoLimpio = {
        _id: doc._id,
        nombre_original: doc.nombre_original,
        tipo_archivo: doc.tipo_archivo,
        tamano_archivo: doc.tamano_archivo,
        descripcion: doc.descripcion || '',
        categoria: doc.categoria || 'General',
        fecha_subida: doc.fecha_subida,
        fecha_vencimiento: doc.fecha_vencimiento || null,
        persona_id: doc.persona_id || null,
        cloudinary_url: doc.cloudinary_url,
        public_id: doc.public_id,
        resource_type: doc.resource_type,
        activo: doc.activo !== false,
        isDeleted: doc.isDeleted || false,
        schoolId: doc.schoolId, // 🆕 Incluir en respuesta
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt
      };

      // Estado virtual basado en fecha_vencimiento
      if (doc.fecha_vencimiento) {
        const hoy = new Date();
        const fechaVencimiento = new Date(doc.fecha_vencimiento);
        const diasRestantes = Math.ceil((fechaVencimiento - hoy) / (1000 * 60 * 60 * 24));

        if (diasRestantes < 0) {
          documentoLimpio.estadoVirtual = 'vencido';
        } else if (diasRestantes <= 7) {
          documentoLimpio.estadoVirtual = 'por_vencer';
        } else {
          documentoLimpio.estadoVirtual = 'activo';
        }
      } else {
        documentoLimpio.estadoVirtual = 'sin_fecha';
      }

      return documentoLimpio;
    });

    console.log(`✅ ${documentosTransformados.length} documentos transformados y listos`);
    console.log('📊 ========== FIN OBTENCIÓN DOCUMENTOS ==========');

    res.json({
      success: true,
      documents: documentosTransformados,
      metadata: {
        total: totalDocs,
        schoolId: req.schoolId || 'superadmin' // 🆕 Indicar escuela
      }
    });

  } catch (error) {
    console.error('❌ ERROR obteniendo documentos:', error);
    console.error('Stack trace:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Error al obtener documentos: ' + error.message
    });
  }
});

app.post('/api/documents', protegerRuta, inyectarSchoolId, upload.single('file'), async (req, res) => {
  try {
    console.log('📥 ========== CREACIÓN DE DOCUMENTO ==========');

    if (!req.file) {
      console.error('❌ No se recibió archivo en la solicitud');
      return res.status(400).json({
        success: false,
        message: 'No se ha subido ningún archivo'
      });
    }

    console.log('✅ Archivo recibido:', req.file.originalname);
    console.log('📊 Tamaño:', req.file.size, 'bytes');

    const {
      descripcion,
      categoria,
      fecha_vencimiento,
      persona_id,
      estado,
      notificar_persona,
      notificar_vencimiento
    } = req.body;

    // Validar categoría
    if (!categoria || categoria.trim() === '') {
      console.error('❌ ERROR: Categoría es obligatoria');
      return res.status(400).json({
        success: false,
        message: 'La categoría es obligatoria. Selecciona una categoría.'
      });
    }

    // Procesar persona_id
    let personaIdProcesado = null;
    if (persona_id && persona_id !== '' && persona_id !== 'null' && persona_id !== 'undefined') {
      if (mongoose.Types.ObjectId.isValid(persona_id)) {
        personaIdProcesado = persona_id;
        console.log('✅ persona_id válido:', persona_id);
      }
    }

    // Procesar fecha_vencimiento
    let fechaVencimientoProcesada = null;
    if (fecha_vencimiento && fecha_vencimiento !== '' && fecha_vencimiento !== 'null' && fecha_vencimiento !== 'undefined') {
      try {
        const fecha = new Date(fecha_vencimiento);
        if (!isNaN(fecha.getTime())) {
          fechaVencimientoProcesada = fecha;
          console.log('✅ fecha_vencimiento válida:', fecha.toISOString());
        }
      } catch (error) {
        console.warn('⚠️ Error parseando fecha_vencimiento:', error);
      }
    }

    console.log('📤 Subiendo archivo a DigitalOcean Spaces...');

    const fileContent = fs.readFileSync(req.file.path);
    const safeFileName = req.file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    const fileKey = `documentos/${Date.now()}-${safeFileName}`;

    let spacesResult;
    try {
      const uploadToSpaces = new Upload({
        client: s3Client,
        params: {
          Bucket: SPACES_CONFIG.bucket,
          Key: fileKey,
          Body: fileContent,
          ContentType: req.file.mimetype,
          ACL: 'public-read',
        },
      });

      spacesResult = await uploadToSpaces.done();
      console.log('✅ Archivo subido a Spaces:', spacesResult.Location);
    } catch (spacesError) {
      console.error('❌ Error subiendo a Spaces:', spacesError);
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(500).json({
        success: false,
        message: 'Error al subir el archivo: ' + spacesError.message
      });
    }

    console.log('💾 Guardando documento en la base de datos...');

    const nuevoDocumento = new Document({
      nombre_original: req.file.originalname,
      tipo_archivo: req.file.originalname.split('.').pop().toLowerCase(),
      tamano_archivo: req.file.size,
      descripcion: descripcion || '',
      categoria: categoria,
      fecha_vencimiento: fechaVencimientoProcesada,
      persona_id: personaIdProcesado,
      cloudinary_url: spacesResult.Location,
      public_id: fileKey,
      resource_type: req.file.mimetype,
      activo: true,
      schoolId: req.schoolId || 'superadmin',
      uploadedBy: req.user?._id || null
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
      .populate('persona_id', 'nombre email departamento puesto');

    console.log('📊 DOCUMENTO CREADO EXITOSAMENTE:', {
      _id: documentoConPersona._id,
      nombre_original: documentoConPersona.nombre_original,
      categoria: documentoConPersona.categoria,
      url: documentoConPersona.cloudinary_url
    });

    // Crear notificación si corresponde
    if (personaIdProcesado) {
      try {
        const shouldNotify = notificar_persona === 'true' || notificar_persona === true;
        if (shouldNotify) {
          await NotificationService.documentoSubido(documentoConPersona, documentoConPersona.persona_id);
          console.log('🔔 Notificación creada para la persona asignada');
        }
      } catch (notifError) {
        console.error('⚠️ Error creando notificación:', notifError.message);
      }
    }

    console.log('✅ ========== UPLOAD COMPLETADO EXITOSAMENTE ==========');

    res.json({
      success: true,
      message: 'Documento subido correctamente',
      document: {
        _id: documentoConPersona._id,
        nombre_original: documentoConPersona.nombre_original,
        tipo_archivo: documentoConPersona.tipo_archivo,
        tamano_archivo: documentoConPersona.tamano_archivo,
        descripcion: documentoConPersona.descripcion,
        categoria: documentoConPersona.categoria,
        fecha_subida: documentoConPersona.fecha_subida,
        fecha_vencimiento: documentoConPersona.fecha_vencimiento,
        persona_id: documentoConPersona.persona_id,
        cloudinary_url: documentoConPersona.cloudinary_url,
        public_id: documentoConPersona.public_id,
        activo: documentoConPersona.activo
      }
    });

  } catch (error) {
    console.error('❌❌❌ ERROR GENERAL SUBIENDO DOCUMENTO ❌❌❌');
    console.error('Mensaje:', error.message);

    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Error de validación: ' + Object.values(error.errors).map(e => e.message).join(', ')
      });
    }

    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'ID inválido: ' + error.message
      });
    }

    if (req.file && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (fsError) {
        console.error('Error limpiando archivo temporal:', fsError);
      }
    }

    res.status(500).json({
      success: false,
      message: 'Error interno al subir documento: ' + error.message
    });
  }
});

// =============================================================================
// ACTUALIZAR DOCUMENTO (CORREGIDO COMPLETAMENTE) - SOLO ESTA RUTA
// =============================================================================

app.put('/api/documents/:id', upload.single('file'), async (req, res) => {
    try {
        console.log('📝 ========== ACTUALIZACIÓN DOCUMENTO ==========');
        const { id } = req.params;

        // Validar ID
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'ID de documento inválido'
            });
        }

        // Buscar documento existente
        const documentoExistente = await Document.findOne({
            _id: id,
            $or: [
                { isDeleted: false },
                { isDeleted: { $exists: false } }
            ]
        });

        if (!documentoExistente) {
            return res.status(404).json({
                success: false,
                message: 'Documento no encontrado'
            });
        }

        console.log('📄 Documento encontrado:', {
            nombre: documentoExistente.nombre_original,
            categoria: documentoExistente.categoria
        });

        // Preparar datos para actualizar
        const updateData = {};

        const { descripcion, categoria, fecha_vencimiento, persona_id } = req.body;

        // Validar categoría
        if (categoria !== undefined) {
            if (!categoria || categoria.trim() === '') {
                return res.status(400).json({
                    success: false,
                    message: 'La categoría es obligatoria'
                });
            }
            updateData.categoria = categoria;
        }

        // Procesar descripción
        if (descripcion !== undefined) {
            updateData.descripcion = descripcion;
        }

        // Procesar fecha de vencimiento
        if (fecha_vencimiento !== undefined) {
            if (fecha_vencimiento === '' || fecha_vencimiento === 'null' || fecha_vencimiento === 'undefined') {
                updateData.fecha_vencimiento = null;
            } else {
                try {
                    const fecha = new Date(fecha_vencimiento);
                    if (!isNaN(fecha.getTime())) {
                        updateData.fecha_vencimiento = fecha;
                    } else {
                        updateData.fecha_vencimiento = null;
                    }
                } catch (error) {
                    updateData.fecha_vencimiento = null;
                }
            }
        }

        // Procesar persona_id
        if (persona_id !== undefined) {
            if (persona_id === '' || persona_id === 'null' || persona_id === 'undefined') {
                updateData.persona_id = null;
            } else if (mongoose.Types.ObjectId.isValid(persona_id)) {
                updateData.persona_id = persona_id;
            } else {
                updateData.persona_id = null;
            }
        }

        let public_id_antiguo = null;

        // =========================================================================
        // SI HAY ARCHIVO NUEVO (REEMPLAZAR)
        // =========================================================================
        if (req.file) {
            console.log('🔄 Reemplazando archivo en Spaces...');
            console.log('📁 Archivo nuevo:', req.file.originalname);
            console.log('📊 Tamaño:', req.file.size, 'bytes');

            // Guardar info del archivo antiguo
            public_id_antiguo = documentoExistente.public_id;

            try {
                // Subir nuevo archivo a DigitalOcean Spaces
                const fileContent = fs.readFileSync(req.file.path);
                const safeFileName = req.file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
                const fileKey = `documentos/${Date.now()}-${safeFileName}`;

                const uploadToSpaces = new Upload({
                    client: s3Client,
                    params: {
                        Bucket: SPACES_CONFIG.bucket,
                        Key: fileKey,
                        Body: fileContent,
                        ContentType: req.file.mimetype,
                        ACL: 'public-read',
                    },
                });

                const spacesResult = await uploadToSpaces.done();

                console.log('✅ Nuevo archivo subido a Spaces:', spacesResult.Location);

                // Actualizar datos con nuevo archivo
                updateData.nombre_original = req.file.originalname;
                updateData.tipo_archivo = req.file.originalname.split('.').pop().toLowerCase();
                updateData.tamano_archivo = req.file.size;
                updateData.cloudinary_url = spacesResult.Location;
                updateData.public_id = fileKey;
                updateData.resource_type = req.file.mimetype;

            } catch (spacesError) {
                console.error('❌ Error subiendo archivo nuevo:', spacesError);
                if (fs.existsSync(req.file.path)) {
                    fs.unlinkSync(req.file.path);
                }
                return res.status(500).json({
                    success: false,
                    message: 'Error al subir nuevo archivo: ' + spacesError.message
                });
            }
        }

        console.log('📋 Campos finales a actualizar:', updateData);

        // Actualizar en base de datos
        console.log('💾 Actualizando en base de datos...');

        const documentoActualizado = await Document.findByIdAndUpdate(
            id,
            updateData,
            { new: true, runValidators: true }
        ).populate('persona_id', 'nombre email departamento');

        if (!documentoActualizado) {
            return res.status(500).json({
                success: false,
                message: 'Error al actualizar en base de datos'
            });
        }

        console.log('✅ Documento actualizado en BD:', documentoActualizado.nombre_original);

        // Limpiar archivo temporal si existe
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
            console.log('🧹 Archivo temporal eliminado');
        }

        // Eliminar archivo antiguo de Spaces si se reemplazó
        if (req.file && public_id_antiguo) {
            try {
                await s3Client.send(new DeleteObjectCommand({
                    Bucket: SPACES_CONFIG.bucket,
                    Key: public_id_antiguo,
                }));
                console.log('🗑️ Archivo antiguo eliminado de Spaces');
            } catch (deleteError) {
                console.warn('⚠️ No se pudo eliminar archivo antiguo:', deleteError.message);
            }
        }

        // Crear notificación
        try {
            await NotificationService.documentoActualizado(
                documentoActualizado,
                documentoActualizado.persona_id
            );
            console.log('✅ Notificación creada');
        } catch (notifError) {
            console.error('⚠️ Error creando notificación:', notifError.message);
        }

        console.log('📝 ========== FIN ACTUALIZACIÓN ==========');

        res.json({
            success: true,
            message: req.file ? 'Documento y archivo actualizados' : 'Documento actualizado',
            document: documentoActualizado
        });

    } catch (error) {
        console.error('❌ Error general actualizando documento:', error);

        if (error.name === 'ValidationError') {
            return res.status(400).json({
                success: false,
                message: 'Error de validación: ' + Object.values(error.errors).map(e => e.message).join(', ')
            });
        }

        if (error.name === 'CastError') {
            return res.status(400).json({
                success: false,
                message: 'ID inválido: ' + error.message
            });
        }

        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }

        res.status(500).json({
            success: false,
            message: 'Error al actualizar documento: ' + error.message
        });
    }
});

app.delete('/documents/bulk-delete', async (req, res) => {
  try {
    const { document_ids } = req.body;

    console.log(`🗑️ Solicitud de eliminación masiva para ${document_ids?.length || 0} documentos`);

    // Validar entrada
    if (!document_ids || !Array.isArray(document_ids) || document_ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Debe proporcionar una lista de IDs de documentos'
      });
    }

    // Validar que no exceda el límite (opcional)
    if (document_ids.length > 100) {
      return res.status(400).json({
        success: false,
        message: 'No se pueden eliminar más de 100 documentos a la vez'
      });
    }

    // Mover documentos a la papelera
    const results = [];

    for (const documentId of document_ids) {
      try {
        // Buscar documento
        const document = await Document.findByPk(documentId);

        if (!document) {
          results.push({
            id: documentId,
            success: false,
            message: 'Documento no encontrado'
          });
          continue;
        }

        // Verificar que no esté ya en la papelera
        if (document.deleted_at) {
          results.push({
            id: documentId,
            success: false,
            message: 'El documento ya está en la papelera'
          });
          continue;
        }

        // Mover a papelera (soft delete)
        document.deleted_at = new Date();
        await document.save();

        results.push({
          id: documentId,
          success: true,
          message: 'Documento movido a la papelera'
        });

      } catch (error) {
        results.push({
          id: documentId,
          success: false,
          message: error.message
        });
      }
    }

    // Calcular estadísticas
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    return res.json({
      success: true,
      message: `${successful} documentos movidos a la papelera${failed > 0 ? `, ${failed} fallaron` : ''}`,
      total: document_ids.length,
      successful,
      failed,
      results
    });

  } catch (error) {
    console.error('Error en eliminación masiva:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// =============================================================================
// ENDPOINT PATCH PARA ACTUALIZACIONES PARCIALES (PARA FRONTEND)
// =============================================================================

app.patch('/api/documents/:id', async (req, res) => {
  try {
    console.log('🔄 PATCH - Actualización parcial de documento');
    const { id } = req.params;

    console.log('📋 ID del documento:', id);
    console.log('📋 Body recibido:', req.body);

    // Validar ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'ID de documento inválido'
      });
    }

    // Buscar documento existente
    const documentoExistente = await Document.findOne({
      _id: id,
      $or: [
        { isDeleted: false },
        { isDeleted: { $exists: false } }
      ]
    });

    if (!documentoExistente) {
      return res.status(404).json({
        success: false,
        message: 'Documento no encontrado'
      });
    }

    console.log('📄 Documento encontrado para PATCH:', documentoExistente.nombre_original);

    // Extraer datos del cuerpo
    const {
      descripcion,
      categoria,
      fecha_vencimiento,
      persona_id
    } = req.body;

    // Preparar datos para actualizar
    const updateData = {};

    if (descripcion !== undefined) updateData.descripcion = descripcion;
    if (categoria !== undefined) updateData.categoria = categoria;
    if (fecha_vencimiento !== undefined) updateData.fecha_vencimiento = fecha_vencimiento;
    if (persona_id !== undefined) updateData.persona_id = persona_id;

    console.log('📋 Campos a actualizar en PATCH:', updateData);

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No se proporcionaron datos para actualizar'
      });
    }

    // Actualizar en base de datos
    const documentoActualizado = await Document.findByIdAndUpdate(
      id,
      updateData,
      {
        new: true,
        runValidators: true
      }
    ).populate('persona_id', 'nombre');

    if (!documentoActualizado) {
      return res.status(500).json({
        success: false,
        message: 'Error al actualizar en base de datos'
      });
    }

    console.log('✅ Documento actualizado vía PATCH');

    // Crear notificación
    try {
      await NotificationService.documentoActualizado(
        documentoActualizado,
        documentoActualizado.persona_id
      );
    } catch (notifError) {
      console.error('⚠️ Error creando notificación:', notifError.message);
    }

    res.json({
      success: true,
      message: 'Documento actualizado correctamente',
      document: documentoActualizado
    });

  } catch (error) {
    console.error('❌ Error en PATCH:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar documento: ' + error.message
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

    console.log('🗑️ ========== ELIMINACIÓN SOFT DELETE ==========');

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'ID inválido'
      });
    }

    const documento = await Document.findOne({
      _id: id,
      $or: [
        { isDeleted: false },
        { isDeleted: { $exists: false } }
      ]
    });

    if (!documento) {
      return res.status(404).json({
        success: false,
        message: 'Documento no encontrado'
      });
    }

    const nombreDocumento = documento.nombre_original;
    const categoriaDocumento = documento.categoria;

    // Mover a papelera (eliminación suave)
    const updateResult = await Document.findByIdAndUpdate(id, {
      isDeleted: true,
      deletedAt: new Date(),
      deletedBy: 'Administrador'
    }, { new: true });

    console.log('✅ Documento movido a papelera:', nombreDocumento);

    try {
      await NotificationService.documentoEliminado(nombreDocumento, categoriaDocumento);
    } catch (notifError) {
      console.error('⚠️ Error creando notificación:', notifError.message);
    }

    res.json({
      success: true,
      message: 'Documento movido a la papelera'
    });

  } catch (error) {
    console.error('Error moviendo documento a papelera:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar documento'
    });
  }
});

// -----------------------------
// PAPELERA (TRASH BIN)
// -----------------------------

// Obtener todos los documentos en la papelera
app.get('/api/trash', async (req, res) => {
  try {
    console.log('🗑️ ========== OBTENIENDO PAPELERA ==========');

    const trashedDocs = await Document.find({
      activo: true,
      isDeleted: true
    })
      .populate('persona_id', 'nombre email departamento')
      .sort({ deletedAt: -1 });

    console.log('📊 Documentos en papelera encontrados:', trashedDocs.length);
    trashedDocs.forEach((doc, index) => {
      console.log(`  ${index + 1}. ${doc.nombre_original} - Eliminado: ${doc.deletedAt}`);
    });

    // Calcular días restantes para cada documento
    const docsWithDaysRemaining = trashedDocs.map(doc => {
      const deletedDate = new Date(doc.deletedAt);
      const expirationDate = new Date(deletedDate);
      expirationDate.setDate(expirationDate.getDate() + 30);

      const now = new Date();
      const daysRemaining = Math.ceil((expirationDate - now) / (1000 * 60 * 60 * 24));

      return {
        ...doc.toObject(),
        daysRemaining: Math.max(0, daysRemaining),
        expirationDate: expirationDate
      };
    });

    console.log('🗑️ ========== FIN OBTENER PAPELERA ==========');

    res.json({
      success: true,
      documents: docsWithDaysRemaining
    });

  } catch (error) {
    console.error('Error obteniendo documentos de papelera:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener documentos de la papelera'
    });
  }
});

app.delete('/api/trash/empty-all', async (req, res) => {
  try {
    console.log('🗑️ ========== VACIANDO PAPELERA ==========');
    const trashedDocs = await Document.find({
      activo: true,
      isDeleted: true
    });

    console.log('📊 Documentos a eliminar:', trashedDocs.length);
    let deletedCount = 0;
    let errorCount = 0;

    for (const doc of trashedDocs) {
      try {
        // Eliminar de DigitalOcean Spaces
        await s3Client.send(new DeleteObjectCommand({
          Bucket: SPACES_CONFIG.bucket,
          Key: doc.public_id,
        }));

        // Eliminar de la base de datos
        await Document.findByIdAndUpdate(doc._id, { activo: false });
        deletedCount++;
        console.log(`  ✅ ${doc.nombre_original}`);
      } catch (error) {
        console.error(`❌ Error eliminando ${doc.nombre_original}:`, error);
        errorCount++;
      }
    }

    console.log('🗑️ ========== FIN VACIADO ==========');
    res.json({
      success: true,
      message: `Papelera vaciada: ${deletedCount} documentos eliminados`,
      deletedCount,
      errorCount
    });

  } catch (error) {
    console.error('Error vaciando papelera:', error);
    res.status(500).json({
      success: false,
      message: 'Error al vaciar papelera'
    });
  }
});

// Vaciar papelera (eliminar todos los documentos permanentemente) - DEBE IR ANTES DE /:id
app.delete('/api/trash/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'ID inválido'
      });
    }

    const documento = await Document.findOne({ _id: id, activo: true, isDeleted: true });

    if (!documento) {
      return res.status(404).json({
        success: false,
        message: 'Documento no encontrado en la papelera'
      });
    }

    const nombreDocumento = documento.nombre_original;

    // Eliminar de DigitalOcean Spaces
    try {
      await s3Client.send(new DeleteObjectCommand({
        Bucket: SPACES_CONFIG.bucket,
        Key: documento.public_id,
      }));
      console.log('✅ Archivo eliminado de Spaces');
    } catch (spacesError) {
      console.warn('⚠️ No se pudo eliminar de Spaces:', spacesError);
    }

    // Eliminar permanentemente de la base de datos
    await Document.findByIdAndUpdate(id, { activo: false });

    res.json({
      success: true,
      message: `"${nombreDocumento}" eliminado permanentemente`
    });

  } catch (error) {
    console.error('Error eliminando documento permanentemente:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar documento permanentemente'
    });
  }
});

// Proceso automático para eliminar documentos con más de 30 días en papelera - DEBE IR ANTES DE /:id
app.post('/api/trash/auto-cleanup', async (req, res) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const expiredDocs = await Document.find({
      activo: true,
      isDeleted: true,
      deletedAt: { $lte: thirtyDaysAgo }
    });

    let deletedCount = 0;
    let errorCount = 0;

    for (const doc of expiredDocs) {
      try {
        // Eliminar de DigitalOcean Spaces
        await s3Client.send(new DeleteObjectCommand({
          Bucket: SPACES_CONFIG.bucket,
          Key: doc.public_id,
        }));

        // Eliminar de la base de datos
        await Document.findByIdAndUpdate(doc._id, { activo: false });
        deletedCount++;
        console.log(`🗑️ Auto-eliminado: ${doc.nombre_original}`);
      } catch (error) {
        console.error(`Error auto-eliminando ${doc.nombre_original}:`, error);
        errorCount++;
      }
    }

    res.json({
      success: true,
      message: `Limpieza automática completada: ${deletedCount} documentos eliminados`,
      deletedCount,
      errorCount
    });

  } catch (error) {
    console.error('Error en limpieza automática:', error);
    res.status(500).json({
      success: false,
      message: 'Error en limpieza automática'
    });
  }
});

// Restaurar documento de la papelera
app.post('/api/trash/:id/restore', async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'ID inválido'
      });
    }

    const documento = await Document.findOne({ _id: id, activo: true, isDeleted: true });

    if (!documento) {
      return res.status(404).json({
        success: false,
        message: 'Documento no encontrado en la papelera'
      });
    }

    // Guardar datos para notificación
    const nombreDocumento = documento.nombre_original;
    const categoriaDocumento = documento.categoria;

    // Restaurar documento
    await Document.findByIdAndUpdate(id, {
      isDeleted: false,
      deletedAt: null,
      deletedBy: null
    });

    // Crear notificación de documento restaurado
    try {
      await NotificationService.documentoRestaurado(nombreDocumento, categoriaDocumento, 'Administrador');
    } catch (notifError) {
      console.error('⚠️ Error creando notificación:', notifError.message);
    }

    res.json({
      success: true,
      message: 'Documento restaurado exitosamente',
      document: documento
    });

  } catch (error) {
    console.error('Error restaurando documento:', error);
    res.status(500).json({
      success: false,
      message: 'Error al restaurar documento'
    });
  }
});

// Eliminar documento permanentemente de la papelera
app.delete('/api/trash/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'ID inválido'
      });
    }

    const documento = await Document.findOne({ _id: id, activo: true, isDeleted: true });

    if (!documento) {
      return res.status(404).json({
        success: false,
        message: 'Documento no encontrado en la papelera'
      });
    }

    const nombreDocumento = documento.nombre_original;

    // Eliminar de Cloudinary
    try {
      await cloudinary.uploader.destroy(documento.public_id, {
        resource_type: documento.resource_type
      });
      console.log('✅ Archivo eliminado de Cloudinary');
    } catch (cloudinaryError) {
      console.warn('⚠️ No se pudo eliminar de Cloudinary:', cloudinaryError);
    }

    // Eliminar permanentemente de la base de datos
    await Document.findByIdAndUpdate(id, { activo: false });

    res.json({
      success: true,
      message: `"${nombreDocumento}" eliminado permanentemente`
    });

  } catch (error) {
    console.error('Error eliminando documento permanentemente:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar documento permanentemente'
    });
  }
});

// =============================================================================
// ENDPOINT PARA OBTENER INFORMACIÓN DEL DOCUMENTO
// =============================================================================

app.get('/api/documents/:id/info', async (req, res) => {
  try {
    const { id } = req.params;

    console.log('📄 Obteniendo información del documento:', id);

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'ID inválido'
      });
    }

    const documento = await Document.findOne({
      _id: id,
      $or: [
        { isDeleted: false },
        { isDeleted: { $exists: false } }
      ]
    }).populate('persona_id', 'nombre email departamento puesto');

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
    let documents = await Document.find({ activo: true, isDeleted: false })
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

// =============================================================================
// REPORTES - ENDPOINT PDF (CORREGIDO)
// =============================================================================

// Generar reporte en PDF
app.post('/api/reports/pdf', async (req, res) => {
  console.group('📊 REPORTE PDF - Iniciando generación');

  try {
    const { reportType, category, person, days, dateFrom, dateTo } = req.body;

    console.log('📋 Datos recibidos:', {
      reportType,
      category: category || '(todas)',
      person: person || '(todas)',
      days: days || 30
    });

    // Obtener datos según el tipo de reporte
    let documents = [];
    let reportTitle = '';

    // CORREGIDO: Obtener documentos activos no eliminados
    const baseQuery = {
      activo: true,
      isDeleted: { $ne: true }
    };

    switch (reportType) {
      case 'general':
        reportTitle = 'Reporte General del Sistema';
        documents = await Document.find(baseQuery)
          .populate('persona_id', 'nombre email departamento puesto')
          .sort({ fecha_subida: -1 });
        break;

      case 'byCategory':
        if (category) {
          reportTitle = `Reporte por Categoría: ${category}`;
          documents = await Document.find({
            ...baseQuery,
            categoria: category
          })
            .populate('persona_id', 'nombre email departamento puesto')
            .sort({ fecha_subida: -1 });
        } else {
          reportTitle = 'Reporte por Todas las Categorías';
          documents = await Document.find(baseQuery)
            .populate('persona_id', 'nombre email departamento puesto')
            .sort({ categoria: 1, fecha_subida: -1 });
        }
        break;

      case 'byPerson':
        if (person) {
          const personaData = await Person.findById(person);
          reportTitle = `Reporte por Persona: ${personaData ? personaData.nombre : 'Desconocida'}`;
          documents = await Document.find({
            ...baseQuery,
            persona_id: person
          })
            .populate('persona_id', 'nombre email departamento puesto')
            .sort({ fecha_subida: -1 });
        } else {
          reportTitle = 'Reporte por Todas las Personas';
          documents = await Document.find(baseQuery)
            .populate('persona_id', 'nombre email departamento puesto')
            .sort({ 'persona_id.nombre': 1, fecha_subida: -1 });
        }
        break;

      case 'expiring':
        const daysToExpire = parseInt(days) || 30;
        reportTitle = `Documentos que Vencen en Próximos ${daysToExpire} Días`;

        const today = new Date();
        const futureDate = new Date();
        futureDate.setDate(today.getDate() + daysToExpire);

        documents = await Document.find({
          ...baseQuery,
          fecha_vencimiento: {
            $gte: today,
            $lte: futureDate
          }
        })
          .populate('persona_id', 'nombre email departamento puesto')
          .sort({ fecha_vencimiento: 1 });
        break;

      case 'expired':
        reportTitle = 'Documentos Vencidos';
        const now = new Date();

        documents = await Document.find({
          ...baseQuery,
          fecha_vencimiento: { $lt: now }
        })
          .populate('persona_id', 'nombre email departamento puesto')
          .sort({ fecha_vencimiento: 1 });
        break;

      default:
        console.error('❌ Tipo de reporte no válido:', reportType);
        return res.status(400).json({
          success: false,
          message: 'Tipo de reporte no válido'
        });
    }

    console.log(`📄 Documentos encontrados: ${documents.length}`);

    // Crear documento PDF
    const doc = new PDFDocument({
      margin: 50,
      size: 'A4',
      info: {
        Title: reportTitle,
        Author: 'Sistema de Gestión de Documentos CBTIS051',
        Subject: 'Reporte de Documentos',
        Keywords: 'documentos, reporte, sistema, CBTIS051',
        CreationDate: new Date()
      }
    });

    // Configurar headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="reporte_${reportType}_${Date.now()}.pdf"`);

    // Pipe el documento a la respuesta
    doc.pipe(res);

    // =====================================================================
    // ENCABEZADO
    // =====================================================================

    // Logo/Título
    doc.fontSize(20)
      .font('Helvetica-Bold')
      .fillColor('#4F46E5')
      .text('Sistema de Gestión de Documentos', { align: 'center' });

    doc.fontSize(16)
      .text('CBTIS051', { align: 'center' })
      .moveDown(0.5);

    doc.fontSize(14)
      .fillColor('#000000')
      .text(reportTitle, { align: 'center' })
      .moveDown(0.5);

    doc.fontSize(10)
      .fillColor('#6B7280')
      .text(`Generado el: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, { align: 'center' })
      .moveDown();

    // Línea separadora
    doc.moveTo(50, doc.y)
      .lineTo(550, doc.y)
      .stroke()
      .moveDown();

    // =====================================================================
    // RESUMEN ESTADÍSTICO
    // =====================================================================

    doc.fontSize(12)
      .font('Helvetica-Bold')
      .text('Resumen del Reporte:', { underline: true })
      .moveDown(0.5);

    doc.fontSize(10)
      .font('Helvetica')
      .text(`• Total de documentos: ${documents.length}`)
      .text(`• Fecha de generación: ${new Date().toLocaleDateString()}`)
      .text(`• Tipo de reporte: ${getReportTypeName(reportType)}`);

    // Estadísticas adicionales si hay documentos
    if (documents.length > 0) {
      const categories = [...new Set(documents.map(d => d.categoria))];
      const totalSizeMB = documents.reduce((sum, d) => sum + (d.tamano_archivo || 0), 0) / (1024 * 1024);
      const expiredCount = documents.filter(d => {
        if (!d.fecha_vencimiento) return false;
        return new Date(d.fecha_vencimiento) < new Date();
      }).length;

      doc.text(`• Categorías incluidas: ${categories.length}`);
      doc.text(`• Tamaño total: ${totalSizeMB.toFixed(2)} MB`);

      if (expiredCount > 0) {
        doc.fillColor('red')
          .text(`• Documentos vencidos: ${expiredCount}`)
          .fillColor('#000000');
      }
    }

    doc.moveDown();

    // =====================================================================
    // VERIFICAR SI HAY DOCUMENTOS
    // =====================================================================

    if (documents.length === 0) {
      doc.fontSize(14)
        .fillColor('#DC2626')
        .text('No hay documentos para mostrar', { align: 'center' })
        .moveDown();

      doc.fontSize(10)
        .fillColor('#6B7280')
        .text('No se encontraron documentos con los criterios seleccionados.', { align: 'center' })
        .moveDown(2);

      // Pie de página para documento vacío
      doc.fontSize(8)
        .fillColor('#9CA3AF')
        .text(`Sistema de Gestión de Documentos CBTIS051 - Página 1 de 1`,
          50,
          doc.page.height - 50,
          { align: 'center' });

      doc.end();
      console.log('✅ PDF vacío generado exitosamente');
      console.groupEnd();
      return;
    }

    // =====================================================================
    // TABLA DE DOCUMENTOS
    // =====================================================================

    // Verificar si necesitamos nueva página antes de la tabla
    if (doc.y > 650) {
      doc.addPage();
    }

    doc.fontSize(12)
      .font('Helvetica-Bold')
      .fillColor('#000000')
      .text('Detalle de Documentos:', { underline: true })
      .moveDown(0.5);

    // Definir posiciones y anchos de columnas
    const tableTop = doc.y;
    const columnWidths = [30, 200, 100, 100, 120]; // Ajustado
    const headers = ['#', 'Nombre', 'Categoría', 'Persona', 'Vencimiento'];

    // Encabezados de tabla
    doc.font('Helvetica-Bold')
      .fontSize(9);

    let x = 50;
    headers.forEach((header, i) => {
      doc.text(header, x, tableTop, {
        width: columnWidths[i],
        align: i === 0 ? 'center' : 'left'
      });
      x += columnWidths[i];
    });

    // Línea debajo de los encabezados
    doc.moveTo(50, tableTop + 15)
      .lineTo(550, tableTop + 15)
      .stroke();

    // Filas de datos
    let y = tableTop + 25;

    doc.font('Helvetica')
      .fontSize(8);

    documents.forEach((document, index) => {
      // Verificar si necesitamos nueva página
      if (y > 750) {
        doc.addPage();
        y = 50; // Reiniciar Y en nueva página

        // Volver a dibujar encabezados en nueva página
        doc.font('Helvetica-Bold')
          .fontSize(9);

        let newX = 50;
        headers.forEach((header, i) => {
          doc.text(header, newX, y, {
            width: columnWidths[i],
            align: i === 0 ? 'center' : 'left'
          });
          newX += columnWidths[i];
        });

        doc.moveTo(50, y + 15)
          .lineTo(550, y + 15)
          .stroke();

        y += 25;
        doc.font('Helvetica').fontSize(8);
      }

      // Datos de la fila
      const rowData = [
        (index + 1).toString(),
        truncateText(document.nombre_original, 35),
        truncateText(document.categoria || 'Sin categoría', 15),
        document.persona_id?.nombre || 'No asignado',
        document.fecha_vencimiento
          ? formatDate(document.fecha_vencimiento)
          : 'Sin fecha'
      ];

      // Determinar color según estado
      let rowColor = '#000000';
      if (document.fecha_vencimiento) {
        const fechaVencimiento = new Date(document.fecha_vencimiento);
        const hoy = new Date();
        if (fechaVencimiento < hoy) {
          rowColor = '#DC2626'; // Rojo para vencidos
        } else if ((fechaVencimiento - hoy) / (1000 * 60 * 60 * 24) <= 7) {
          rowColor = '#D97706'; // Naranja para por vencer
        }
      }

      // Dibujar fila
      doc.fillColor(rowColor);
      let cellX = 50;
      rowData.forEach((cell, i) => {
        doc.text(cell, cellX, y, {
          width: columnWidths[i],
          align: i === 0 ? 'center' : 'left',
          height: 15,
          ellipsis: true
        });
        cellX += columnWidths[i];
      });

      // Resetear color
      doc.fillColor('#000000');
      y += 15;

      // Línea separadora entre filas (opcional)
      if (index < documents.length - 1) {
        doc.moveTo(50, y - 2)
          .lineTo(550, y - 2)
          .strokeColor('#E5E7EB')
          .stroke();
      }
    });

    // =====================================================================
    // PIE DE PÁGINA CORREGIDO
    // =====================================================================

    // CORRECCIÓN CRÍTICA: Manejar correctamente las páginas
    // Obtener el rango de páginas
    const pageRange = doc.bufferedPageRange();
    console.log(`📄 Total de páginas generadas: ${pageRange.count}`);

    // IMPORTANTE: No usar switchToPage() si hay 0 páginas
    // En lugar de eso, agregar pie de página directamente en cada página
    for (let i = 0; i < pageRange.count; i++) {
      // En PDFKit, las páginas ya están en el buffer
      // Solo necesitamos agregar texto al pie de página

      // Acceder a la página usando el método correcto
      doc.switchToPage(i);

      // Agregar pie de página en posición fija
      doc.fontSize(8)
        .fillColor('#9CA3AF')
        .text(
          `Sistema de Gestión de Documentos CBTIS051 - Página ${i + 1} de ${pageRange.count}`,
          50,
          doc.page.height - 50,
          { align: 'center', width: 500 }
        );
    }

    // =====================================================================
    // FINALIZAR DOCUMENTO
    // =====================================================================

    doc.end();

    console.log(`✅ PDF generado exitosamente con ${documents.length} documentos`);
    console.groupEnd();

  } catch (error) {
    console.error('❌ ERROR generando reporte PDF:', error);
    console.error('📋 Stack trace:', error.stack);

    // IMPORTANTE: Verificar si los headers ya fueron enviados
    if (res.headersSent) {
      console.error('⚠️ Headers ya enviados, no se puede enviar error JSON');
      try {
        res.end();
      } catch (endError) {
        console.error('❌ Error finalizando respuesta:', endError);
      }
    } else {
      res.status(500).json({
        success: false,
        message: `Error al generar reporte PDF: ${error.message}`
      });
    }

    console.groupEnd();
  }
});

/**
 * Truncar texto si es muy largo
 */
function truncateText(text, maxLength) {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

/**
 * Obtener nombre legible del tipo de reporte
 */
function getReportTypeName(reportType) {
  const names = {
    'general': 'General',
    'byCategory': 'Por Categoría',
    'byPerson': 'Por Persona',
    'expiring': 'Por Vencer',
    'expired': 'Vencidos'
  };
  return names[reportType] || reportType;
}

// Generar reporte en CSV
app.post('/api/reports/csv', async (req, res) => {
  try {
    console.log('📊 Generando reporte en CSV...');
    const { reportType, category, person, days, dateFrom, dateTo } = req.body;

    // Obtener datos según el tipo de reporte
    let documents = await Document.find({ activo: true, isDeleted: false })
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
    const isImage = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp'].includes(fileExtension);
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
    const { leida, tipo, prioridad, desde, hasta, limite = 50, pagina = 1 } = req.query;

    const filtros = {};
    if (leida !== undefined) filtros.leida = leida === 'true';
    if (tipo) filtros.tipo = tipo;
    if (prioridad) filtros.prioridad = prioridad;
    if (desde) filtros.desde = desde;
    if (hasta) filtros.hasta = hasta;

    // 🆕 Pasar el userId para filtrar notificaciones de recordatorio
    filtros.userId = req.query.userId || null;

    const resultado = await NotificationService.obtener(filtros, {
      limite: parseInt(limite),
      pagina: parseInt(pagina)
    });

    res.json({ success: true, data: resultado });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener notificaciones: ' + error.message });
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
    const userId = req.query.userId || (req.user?.id || req.user?._id);
    console.log('✅ Marcando notificación como leída:', id, 'userId:', userId);

    const notificacion = await NotificationService.marcarLeida(id, userId);

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
    const schoolId = req.query.schoolId || null;
    const userId = req.query.userId || (req.user?.id || req.user?._id);
    console.log('✅ Marcando todas como leídas. userId:', userId);

    const cantidad = await NotificationService.marcarTodasLeidas(schoolId, userId);

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

// =============================================================================
// RUTAS DE SOPORTE - CON EMAIL GMAIL REAL (VERSIÓN CORREGIDA)
// =============================================================================

console.log('\n🔧 Cargando rutas de soporte...');

// IMPORTANTE: Configurar multer para tickets
const ticketUpload = multer({
  storage: multer.diskStorage({
    destination: function (req, file, cb) {
      const ticketDir = path.join(__dirname, 'uploads', 'tickets');
      if (!fs.existsSync(ticketDir)) {
        fs.mkdirSync(ticketDir, { recursive: true });
      }
      cb(null, ticketDir);
    },
    filename: function (req, file, cb) {
      const safeName = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
      cb(null, safeName);
    }
  }),
  limits: { fileSize: 5 * 1024 * 1024 }
});

app.post('/api/support/tickets', upload.array('files', 5), SupportController.createTicket);

// =============================================================================
// 3. OBTENER TICKETS (MANTENER EXISTENTE)
// =============================================================================

// Obtener tickets
app.get('/api/support/tickets', async (req, res) => {
  try {
    console.log('📥 Obteniendo tickets...');

    try {
      const ticketModule = await import('./src/backend/models/Ticket.js');
      const TicketModel = ticketModule.default;

      const tickets = await TicketModel.find({ isDeleted: false })
        .sort({ createdAt: -1 })
        .limit(50)
        .lean();

      res.json({
        success: true,
        tickets,
        pagination: { total: tickets.length, page: 1, limit: 50, pages: 1 }
      });

    } catch (error) {
      res.json({
        success: true,
        tickets: [],
        pagination: { total: 0, page: 1, limit: 50, pages: 0 }
      });
    }

  } catch (error) {
    console.error('Error obteniendo tickets:', error);
    res.status(500).json({ success: false, message: 'Error obteniendo tickets' });
  }
});

// FAQ y Guía
app.get('/api/support/faq', SupportController.getFAQ);
app.get('/api/support/guide', SupportController.getSystemGuide);

// Detalles de ticket
app.get('/api/support/tickets/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'ID de ticket no válido' });
    }

    const ticketModule = await import('./src/backend/models/Ticket.js');
    const TicketModel = ticketModule.default;

    const ticket = await TicketModel.findOne({ _id: id, isDeleted: false }).lean();

    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket no encontrado' });
    }

    res.json({ success: true, ticket });

  } catch (error) {
    console.error('Error obteniendo detalles:', error);
    res.status(500).json({ success: false, message: 'Error interno' });
  }
});

// Actualizar estado
app.patch('/api/support/tickets/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, message } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'ID no válido' });
    }

    const ticketModule = await import('./src/backend/models/Ticket.js');
    const TicketModel = ticketModule.default;

    const ticket = await TicketModel.findOneAndUpdate(
      { _id: id, isDeleted: false },
      {
        $set: { status, updatedAt: new Date() },
        $push: { updates: { user: 'system', userName: 'Sistema', message: message || `Estado: ${status}`, createdAt: new Date() } }
      },
      { new: true }
    ).lean();

    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket no encontrado' });
    }

    res.json({ success: true, message: `Estado actualizado a ${status}`, ticket });

  } catch (error) {
    console.error('Error actualizando estado:', error);
    res.status(500).json({ success: false, message: 'Error interno' });
  }
});

// Agregar respuesta
app.post('/api/support/tickets/:id/response', async (req, res) => {
  try {
    const { id } = req.params;
    const { message } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'ID no válido' });
    }

    const ticketModule = await import('./src/backend/models/Ticket.js');
    const TicketModel = ticketModule.default;

    const ticket = await TicketModel.findOneAndUpdate(
      { _id: id, isDeleted: false },
      {
        $set: { updatedAt: new Date() },
        $push: { updates: { user: 'system', userName: 'Sistema', message: message.trim(), createdAt: new Date() } }
      },
      { new: true }
    ).lean();

    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket no encontrado' });
    }

    res.json({ success: true, message: 'Respuesta agregada', ticket });

  } catch (error) {
    console.error('Error agregando respuesta:', error);
    res.status(500).json({ success: false, message: 'Error interno' });
  }
});

// Eliminar ticket
app.delete('/api/support/tickets/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'ID no válido' });
    }

    const ticketModule = await import('./src/backend/models/Ticket.js');
    const TicketModel = ticketModule.default;

    const ticket = await TicketModel.findOneAndUpdate(
      { _id: id, isDeleted: false },
      { $set: { isDeleted: true, deletedAt: new Date(), deletedBy: 'system' } },
      { new: true }
    ).lean();

    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket no encontrado' });
    }

    res.json({ success: true, message: 'Ticket eliminado' });

  } catch (error) {
    console.error('Error eliminando ticket:', error);
    res.status(500).json({ success: false, message: 'Error interno' });
  }
});

// Test de email con Brevo
app.post('/api/support/test-email', SupportController.testSupportEmail);
app.get('/api/support/system-status', SupportController.getSystemStatus);

console.log('✅ Rutas de soporte con Brevo configuradas');

// Verificar configuración de email al iniciar
console.log('');
console.log('🔍 ========== CONFIGURACIÓN DEL SISTEMA ==========');
console.log(`🚀 Puerto: ${process.env.PORT || 4000} (${PORT})`);
console.log(`🗄️ MongoDB: ${process.env.MONGO_URI ? '✅ Configurado' : '❌ No configurado'}`);

const emailStatus = await import('./src/backend/services/emailService.js').then(m => m.default.getStatus());
console.log(`📧 Email: ${emailStatus.configured ? '✅ Brevo API' : '❌ No configurado'}`);

console.log(`🌐 Frontend: ${process.env.FRONTEND_URL ? '✅ ' + process.env.FRONTEND_URL : '❌ No configurado'}`);
console.log(`🔌 API Routes: ✅ Cargadas desde apiRoutes.js`);  // ✅ NUEVO MENSAJE
console.log('🔍 ===============================================');
console.log('');

if (!process.env.BREVO_API_KEY) {
  console.log('');
  console.log('⚠️  IMPORTANTE: BREVO_API_KEY no configurada');
  console.log('   Los emails se mostrarán en la consola del servidor');
  console.log('   Para enviar emails reales, configura en .env:');
  console.log('   BREVO_API_KEY=xkeysib-tu-api-key');
  console.log('');
}

// -----------------------------
// Debug de rutas (solo desarrollo)
// -----------------------------
if (process.env.NODE_ENV === 'development') {
  import('./src/backend/debugRoutes.js').then(({ debugRoutes }) => {
    debugRoutes(app);
  }).catch(err => {
    console.log('⚠️ No se pudo cargar debug de rutas:', err.message);
  });
}

// -----------------------------
// Iniciar servidor
// -----------------------------
const serverPort = process.env.PORT || 4000;
const server = app.listen(serverPort, '0.0.0.0', () => {
  console.log(`🚀 Servidor ejecutándose en puerto ${serverPort}`);
  console.log(`📊 Sistema de Gestión de Documentos - CBTIS051`);
  console.log(`🗄️ Base de datos: ${MONGO_URI}`);
  console.log(`☁️ Spaces: ${SPACES_CONFIG.bucket}`);
  console.log(`🔌 API disponible en: https://documentos-kj6t.onrender.com/api`);
});

// Manejar errores del servidor
server.on('error', (error) => {
  console.error('❌ Error del servidor:', error.message);
  process.exit(1);
});

// Manejar errores no capturados
process.on('uncaughtException', (error) => {
  console.error('🔥 UNCAUGHT EXCEPTION:', error.message);
  console.error(error.stack);
  // NO llamar process.exit(1) - dejar que el servidor siga corriendo
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('🔥 UNHANDLED REJECTION:', reason);
  // NO llamar process.exit(1)
});

// Manejar señales de terminación gracefulmente
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM recibido - cerrando servidor gracefulmente');
  server.close(() => {
    console.log('✅ Servidor cerrado');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT recibido - cerrando servidor gracefulmente');
  server.close(() => {
    console.log('✅ Servidor cerrado');
    process.exit(0);
  });
});