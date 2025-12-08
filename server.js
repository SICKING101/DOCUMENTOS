import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import multer from 'multer';
import cloudinary from 'cloudinary';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { config as dotenvConfig } from 'dotenv';

// Para obtener __dirname en ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configurar dotenv
dotenvConfig();

// Configurar Cloudinary v2
cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dn9ts84q6',
  api_key: process.env.CLOUDINARY_API_KEY || '797652563747974',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'raOkraliwEKlBFTRL7Cr9kEyHOA'
});

// -----------------------------
// Configuración
// -----------------------------
const app = express();
const PORT = Number(process.env.PORT) || 4000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/documentos_cbtis051';

// -----------------------------
// Middlewares Globales (ORDEN CRÍTICO)
// -----------------------------

// 1. Middlewares básicos
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// 2. Middleware para archivos JavaScript
app.use((req, res, next) => {
    if (req.url.endsWith('.js')) {
        res.setHeader('Content-Type', 'application/javascript');
    }
    next();
});

// 3. Archivos estáticos
app.use(express.static(path.join(__dirname, 'public')));
app.use('/src/frontend', express.static(path.join(__dirname, 'src/frontend')));

// -----------------------------
// Conexión a MongoDB
// -----------------------------
mongoose.connect(MONGODB_URI)
  .then(async () => {
    console.log('✅ Conectado a MongoDB');
    
    // Importar NotificationService dinámicamente
    const NotificationService = await import('./src/backend/services/notificationService.js');
    
    try {
      await NotificationService.default.sistemaIniciado();
    } catch (error) {
      console.error('⚠️ Error creando notificación de inicio:', error.message);
    }
  })
  .catch(err => {
    console.error('❌ Error conectando a MongoDB:', err);
    process.exit(1);
  });

// Importar rutas
import apiRoutes from './src/backend/routes/apiRoutes.js';

// 4. Rutas API
app.use('/api', apiRoutes);

// 5. Ruta de prueba de API
app.get('/api/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'API funcionando correctamente',
    timestamp: new Date().toISOString()
  });
});

// 6. Ruta de debug para archivos JS
app.get('/debug/js/:file', (req, res) => {
    const file = req.params.file;
    const filePath = path.join(__dirname, 'src/frontend', file);
    
    console.log('🔍 Debug route - Archivo:', filePath);
    
    if (fs.existsSync(filePath)) {
        res.setHeader('Content-Type', 'application/javascript');
        res.sendFile(filePath);
    } else {
        res.status(404).json({ 
            error: 'Archivo no encontrado',
            path: filePath 
        });
    }
});

// 7. Ruta comodín para SPA (DEBE IR AL FINAL)
app.get('*', (req, res) => {
  // Solo servir index.html para rutas de la aplicación
  // No servir para rutas de API, archivos estáticos, o archivos con extensión
  if (!req.url.startsWith('/api/') && 
      !req.url.startsWith('/src/') && 
      !req.url.includes('.') &&
      req.url !== '/debug/js/app.js') {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  } else {
    // Para rutas no encontradas
    res.status(404).send('Not Found');
  }
});

// -----------------------------
// Manejo de errores global
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

// -----------------------------
// Iniciar servidor
// -----------------------------
app.listen(PORT, () => {
  console.log(`🚀 Servidor ejecutándose en http://localhost:${PORT}`);
  console.log(`📊 Sistema de Gestión de Documentos - CBTIS051`);
  console.log(`🗄️ Base de datos: ${MONGODB_URI}`);
  console.log(`☁️ Cloudinary: ${cloudinary.v2.config().cloud_name}`);
  console.log('📂 Rutas configuradas en este orden:');
  console.log('   1. Archivos estáticos (public/, src/frontend/)');
  console.log('   2. API routes (/api/*)');
  console.log('   3. Debug route (/debug/js/:file)');
  console.log('   4. SPA route (*) - SOLO al final');
});