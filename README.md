📁 Sistema Avanzado de Gestión Documental y Expedientes Electrónicos para Control Administrativo del Personal Laboral - CBTIS051

Sistema completo para la gestion de documentos con backend en Node.js + Express, base de datos MongoDB y un frontend modular estructurado en carpetas.

🚀 Caracteristicas principales

1. Backend con Express y Mongoose

2. SPA frontend modular con ES Modules

3. API REST para la gestion de documentos, categorias, usuarios y notificaciones

4. Servido con rutas estaticas y soporte para modulos JavaScript

5. Base de datos MongoDB con modelos escalables

6. Middlewares globales para JSON, CORS y manejo de errores

7. Estructura basada en buenas practicas de arquitectura

🏗️ Estructura del proyecto:

DOCUMENTOS/
│
├── 📦 node_modules/
│
├── 🖥️ public/                     # Frontend estatico (HTML, CSS, imagenes)
│   ├── 📄 index.html
│   ├── 🎨 styles.css
│   └── 📁 assets/
│       ├── 🖼️ images/
│       ├── 🔤 fonts/
│       └── 🧩 favicon.ico
│
├── 📁 src/
│   ├── 🌐 frontend/               # Modulos del cliente
│   │   ├── 📂 modules/
│   │   │   ├── 📁 categorias.js
│   │   │   ├── 📁 dashboard.js
│   │   │   ├── 📁 documentos.js
│   │   │   ├── 📁 historial.js
│   │   │   ├── 📁 notificaciones.js
│   │   │   ├── 📁 personas.js
│   │   │   ├── 📁 reports.js
│   │   │   └── 📁 search.js
│   │   │
│   │   ├── 🔧 services/
│   │   │   └── api.js
│   │   │
│   │   ├── 🚀 app.js
│   │   ├── ⚙️ config.js
│   │   ├── 🧩 dom.js
│   │   ├── 🧭 navigation.js
│   │   ├── 📊 state.js
│   │   ├── 📌 task.js
│   │   ├── 🎛️ ui.js
│   │   └── 🛠️ utils.js
│   │
│   ├── 🛠️ backend/               # Servidor Express
│   │   ├── ⚙️ config/
│   │   │   ├── cloudinaryConfig.js
│   │   │   └── multerConfig.js
│   │   │
│   │   ├── 🎯 controllers/
│   │   │   ├── categoryController.js
│   │   │   ├── dashboardController.js
│   │   │   ├── documentController.js
│   │   │   ├── notificationController.js
│   │   │   ├── personController.js
│   │   │   ├── reportController.js
│   │   │   └── taskController.js
│   │   │
│   │   ├── 🧵 middleware/
│   │   │   (pendiente)
│   │   │
│   │   ├── 🧬 models/
│   │   │   ├── Category.js
│   │   │   ├── Document.js
│   │   │   ├── Person.js
│   │   │   ├── Notification.js
│   │   │   └── Task.js
│   │   │
│   │   ├── 🛎️ services/
│   │   │   ├── fileService.js
│   │   │   └── notificationService.js
│   │   │
│   │   └── 🚦 routes/
│   │       └── apiRoutes.js
│
├── 🚀 server.js                   # Punto de entrada del servidor Express
├── 📦 package.json
├── 📦 package-lock.json
├── 🔐 .env
└── 📝 README.md
