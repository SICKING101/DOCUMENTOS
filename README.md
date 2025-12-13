📁 Sistema Avanzado de Gestión Documental y Expedientes Electrónicos para Control Administrativo del Personal Laboral - CBTIS051

Sistema completo para la gestion y control de documentos laborales, construido con Node.js + Express, MongoDB, y un frontend modular ES Modules.

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
│   │   ├── 🎨 main.css                 # Archivo maestro global
│   │   ├── 📁 base/                    # Configuracion base
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
│   │   │   ├── empty-states.css
│   │   │   └── preloader.css
│   │   ├── 📁 sections/                # Estilos por modulo/pagina
│   │   │   ├── dashboard.css
│   │   │   ├── tasks.css
│   │   │   ├── documents.css
│   │   │   ├── categories.css
│   │   │   ├── upload.css
│   │   │   ├── historial.css
│   │   │   ├── notifications.css
│   │   │   └── trash.css
│   │   ├── 📁 themes/                  # Temas (light/dark)
│   │   │   ├── light.css
│   │   │   └── dark.css
│   │   └── 📁 responsive/              # Breakpoints
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
│   │   ├── 📁 modules/                 # Modulos por funcion
│   │   │   ├── categorias.js
│   │   │   ├── dashboard.js
│   │   │   ├── documentos.js
│   │   │   ├── historial.js
│   │   │   ├── notificaciones.js
│   │   │   ├── personas.js
│   │   │   ├── reports.js
│   │   │   ├── search.js
│   │   │   └── 📁 documentos/
│   │   │       ├── core/
│   │   │       │   ├── constants.js
│   │   │       │   ├── MultipleUploadState.js
│   │   │       ├── download/
│   │   │       │   ├── downloadDiagnostics.js
│   │   │       │   ├── downloadManager.js
│   │   │       │   ├── downloadMethods.js
│   │   │       ├── modals/
│   │   │       │   ├── documentModal.js
│   │   │       │   ├── modalHelpers.js
│   │   │       ├── preview/
│   │   │       │   ├── officePreview.js
│   │   │       │   ├── previewManager.js
│   │   │       │   ├── previewModals.js
│   │   │       │   ├── textPreview.js
│   │   │       ├── table/
│   │   │       │   ├── tableRenderer.js
│   │   │       │   ├── tableFilters.js
│   │   │       ├── upload/
│   │   │       │   ├── dragAndDrop.js
│   │   │       │   ├── progressManager.js
│   │   │       │   ├── uploadMultiple.js
│   │   │       │   ├── uploadSingle.js
│   │   │       ├── index.js
│   │   │       ├── compatibility.js
│   │   ├── 🔧 services/
│   │   │   └── api.js                  # Cliente API
│   │   ├── 🚀 app.js                   # Inicializacion global
│   │   ├── 🔐 auth.js                  # Auth general
│   │   ├── 🔐 authGuard.js             # Proteccion de rutas
│   │   ├── ⚙️ config.js                # Config del frontend
│   │   ├── 🧩 dom.js                   # Selectores DOM
│   │   ├── 🧭 navigation.js            # SPA Router
│   │   ├── 📊 state.js                 # Estado global
│   │   ├── 📌 task.js                  # Manejo de tareas
│   │   ├── 🎛️ ui.js                   # Render de UI
│   │   ├── 🛠️ userMenu.js              # Menu usuario
│   │   └── 🛠️ utils.js                # Funciones utiles
│   │
│   ├── 🛠️ backend/
│   │   ├── ⚙️ config/
│   │   │   ├── cloudinaryConfig.js
│   │   │   └── multerConfig.js
│   │   ├── 🎯 controllers/             # Controladores REST
│   │   │   ├── categoryController.js
│   │   │   ├── dashboardController.js
│   │   │   ├── documentController.js
│   │   │   ├── notificationController.js
│   │   │   ├── personController.js
│   │   │   ├── reportController.js
│   │   │   └── taskController.js
│   │   ├── 🧵 middleware/
│   │   ├── 🧬 models/                  # Modelos MongoDB
│   │   │   ├── Category.js
│   │   │   ├── Document.js
│   │   │   ├── Person.js
│   │   │   ├── Notification.js
│   │   │   └── Task.js
│   │   ├── 🛎️ services/
│   │   │   ├── fileService.js
│   │   │   └── notificationService.js
│   │   └── 🚦 routes/
│   │       └── apiRoutes.js
│
├── 🚀 server.js                        # Punto de entrada del servidor
├── 📦 package.json
├── 📦 package-lock.json
├── 🔐 .env
└── 📝 README.md

