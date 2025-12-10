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
├── 🖥️ public/                          # Frontend estatico
│   ├── 📄 index.html
│   ├── 📁 css/
│   │   ├── 🎨 main.css                 # Archivo maestro que importa todo
│   │   ├── 📁 base/                    # Bases y configuraciones globales
│   │   │   ├── reset.css
│   │   │   ├── variables.css
│   │   │   └── utilities.css
│   │   ├── 📁 components/              # Componentes reutilizables
│   │   │   ├── layout.css
│   │   │   ├── buttons.css
│   │   │   ├── cards.css
│   │   │   ├── forms.css
│   │   │   ├── tables.css
│   │   │   ├── modals.css
│   │   │   ├── alerts.css
│   │   │   ├── badges.css
│   │   │   ├── filters.css
│   │   │   ├── tabs.css
│   │   │   └── empty-states.css
│   │   ├── 📁 sections/                # Estilos por pagina o modulo
│   │   │   ├── dashboard.css
│   │   │   ├── tasks.css
│   │   │   ├── documents.css
│   │   │   ├── categories.css
│   │   │   ├── upload.css
│   │   │   ├── historial.css
│   │   │   ├── notifications.css
│   │   │   └── trash.css
│   │   ├── 📁 themes/                  # Temas globales
│   │   │   ├── light.css
│   │   │   └── dark.css
│   │   └── 📁 responsive/              # Breakpoints responsivos
│   │       ├── mobile.css
│   │       ├── tablet.css
│   │       └── desktop.css
│   │
│   └── 📁 assets/                      # Recursos estaticos
│       ├── 🖼️ images/
│       ├── 🔤 fonts/
│       └── 🧩 favicon.ico
│
├── 📁 src/
│   ├── 🌐 frontend/                    # Logica del cliente
│   │   ├── 📁 modules/                 # Modulos independientes
│   │   │   ├── categorias.js
│   │   │   ├── dashboard.js
│   │   │   ├── documentos.js
│   │   │   ├── historial.js
│   │   │   ├── notificaciones.js
│   │   │   ├── personas.js
│   │   │   ├── reports.js
│   │   │   └── search.js
│   │   ├── 🔧 services/
│   │   │   └── api.js                  # Cliente fetch para backend
│   │   ├── 🚀 app.js                   # Inicializacion general
│   │   ├── ⚙️ config.js                # Config del frontend
│   │   ├── 🧩 dom.js                   # Selectores y manip DOM
│   │   ├── 🧭 navigation.js            # Navegacion SPA
│   │   ├── 📊 state.js                 # Estado global
│   │   ├── 📌 task.js                  # Manejo de tareas
│   │   ├── 🎛️ ui.js                   # Render de UI
│   │   └── 🛠️ utils.js                # Utilidades generales
│   │
│   ├── 🛠️ backend/                    # Servidor Express
│   │   ├── ⚙️ config/
│   │   │   ├── cloudinaryConfig.js
│   │   │   └── multerConfig.js
│   │   ├── 🎯 controllers/             # Controladores por entidad
│   │   │   ├── categoryController.js
│   │   │   ├── dashboardController.js
│   │   │   ├── documentController.js
│   │   │   ├── notificationController.js
│   │   │   ├── personController.js
│   │   │   ├── reportController.js
│   │   │   └── taskController.js
│   │   ├── 🧵 middleware/              # Pendiente
│   │   ├── 🧬 models/                  # Modelos de MongoDB
│   │   │   ├── Category.js
│   │   │   ├── Document.js
│   │   │   ├── Person.js
│   │   │   ├── Notification.js
│   │   │   └── Task.js
│   │   ├── 🛎️ services/               # Servicios internos
│   │   │   ├── fileService.js
│   │   │   └── notificationService.js
│   │   └── 🚦 routes/
│   │       └── apiRoutes.js
│
├── 🚀 server.js                        # Entrada del servidor
├── 📦 package.json
├── 📦 package-lock.json
├── 🔐 .env
└── 📝 README.md
