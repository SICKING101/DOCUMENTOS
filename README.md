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
├── node_modules/                  # Dependencias npm
│
├── public/                        # Frontend estatico
│   │
│   ├── index.html
│   ├── login.html
│   ├── forgot-password.html
│   ├── forgot-password-step1.html
│   ├── verify-admin-change.html
│   │
│   ├── css/
│   │   │
│   │   ├── main.css               # CSS maestro
│   │   │
│   │   ├── base/                  # Configuracion base
│   │   │   ├── reset.css
│   │   │   ├── variables.css
│   │   │   └── utilities.css
│   │   │
│   │   ├── components/            # Componentes reutilizables
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
│   │   │
│   │   ├── sections/              # Estilos por pagina/modulo
│   │   │   ├── dashboard.css
│   │   │   ├── tasks.css
│   │   │   ├── documents.css
│   │   │   ├── categories.css
│   │   │   ├── upload.css
│   │   │   ├── historial.css
│   │   │   ├── notifications.css
│   │   │   └── trash.css
│   │   │
│   │   ├── themes/                # Temas visuales
│   │   │   ├── light.css
│   │   │   └── dark.css
│   │   │
│   │   └── responsive/            # Breakpoints
│   │       ├── mobile.css
│   │       ├── tablet.css
│   │       └── desktop.css
│   │
│   └── assets/                    # Recursos estaticos
│       ├── images/
│       ├── fonts/
│       └── favicon.ico
│
├── src/
│   │
│   ├── frontend/                  # Logica del cliente (SPA)
│   │   │
│   │   ├── modules/               # Modulos por funcionalidad
│   │   │   ├── categorias.js
│   │   │   ├── dashboard.js
│   │   │   ├── documentos.js
│   │   │   ├── historial.js
│   │   │   ├── notificaciones.js
│   │   │   ├── personas.js
│   │   │   ├── reports.js
│   │   │   ├── search.js
│   │   │   │
│   │   │   ├── auth/              # Autenticacion
│   │   │   │   ├── forgot.js
│   │   │   │   ├── resetPassword.js
│   │   │   │   └── verification.js
│   │   │   │
|   │   │   ├── admin/             # Módulo de administración
│   │   │   │   ├── adminChange.js
│   │   │   │
│   │   │   └── documentos/        # Modulo documentos
│   │   │       │
│   │   │       ├── core/
│   │   │       │   ├── constants.js
│   │   │       │   └── MultipleUploadState.js
│   │   │       │
│   │   │       ├── download/
│   │   │       │   ├── downloadDiagnostics.js
│   │   │       │   ├── downloadManager.js
│   │   │       │   └── downloadMethods.js
│   │   │       │
│   │   │       ├── modals/
│   │   │       │   ├── documentModal.js
│   │   │       │   └── modalHelpers.js
│   │   │       │
│   │   │       ├── preview/
│   │   │       │   ├── officePreview.js
│   │   │       │   ├── previewManager.js
│   │   │       │   ├── previewModals.js
│   │   │       │   └── textPreview.js
│   │   │       │
│   │   │       ├── table/
│   │   │       │   ├── tableRenderer.js
│   │   │       │   └── tableFilters.js
│   │   │       │
│   │   │       ├── upload/
│   │   │       │   ├── dragAndDrop.js
│   │   │       │   ├── progressManager.js
│   │   │       │   ├── uploadMultiple.js
│   │   │       │   └── uploadSingle.js
│   │   │       │
│   │   │       ├── index.js
│   │   │       └── compatibility.js
│   │   │
│   │   ├── services/
│   │   │   └── api.js              # Cliente API
│   │   │
│   │   ├── app.js                  # Inicializacion global
│   │   ├── auth.js                 # Auth general
│   │   ├── authGuard.js            # Proteccion rutas
│   │   ├── config.js               # Config frontend
│   │   ├── dom.js                  # Selectores DOM
│   │   ├── navigation.js           # Router SPA
│   │   ├── state.js                # Estado global
│   │   ├── task.js                 # Manejo tareas
│   │   ├── ui.js                   # Render UI
│   │   ├── userMenu.js             # Menu usuario
│   │   └── utils.js                # Utilidades
│   │
│   └── backend/                    # Servidor / API
│       │
│       ├── config/
│       │   ├── cloudinaryConfig.js
│       │   └── multerConfig.js
│       │
│       ├── controllers/            # Controladores REST
│       │   ├── authController.js
|   │   │   ├── adminController.js
│       │   ├── categoryController.js
│       │   ├── dashboardController.js
│       │   ├── departmentController.js
│       │   ├── documentController.js
│       │   ├── notificationController.js
│       │   ├── personController.js
│       │   ├── reportController.js
│       │   ├── trashController.js
│       │   └── taskController.js
│       │
│       ├── middleware/
│       │   └── auth.js
│       │
│       ├── models/                 # Modelos MongoDB
│       │   ├── User.js
│       │   ├── Person.js
│       │   ├── Department.js
│       │   ├── Category.js
│       │   ├── Document.js
│       │   ├── AdminChangeRequest.js
│       │   └── Notification.js
│       │
│       ├── services/
│       │   ├── fileService.js
│       │   └── notificationService.js
│       │
│       └── routes/
│           ├── apiRoutes.js
│           ├── adminRoutes.js
│           └── authRoutes.js
│
├── server.js                       # Entry point servidor
├── package.json
├── package-lock.json
├── .env
└── README.md


