import { api } from '../services/api.js';
import { showAlert, formatDate, showConfirmModal } from '../utils.js';
import { DOM } from '../dom.js';

class SupportModule {
    constructor() {
        console.log('🔧 SupportModule: Constructor inicializado');
        this.currentTickets = [];
        this.currentTicket = null;
        this.selectedFiles = [];
        this.currentGuideSection = 'dashboard';
        this.isGuideModalOpen = false;
        this.guideSections = [
            'dashboard', 'personas', 'documentos', 'tareas', 'historial',
            'calendario', 'ajustes', 'reportes', 'admin', 'modo-oscuro',
            'papelera', 'notificaciones'
        ];
        
        this.guideData = {
            dashboard: {
                title: 'Dashboard',
                icon: 'tachometer-alt',
                description: 'El dashboard es el centro de control desde donde puedes monitorear las dos actividades principales del sistema.',
                overview: 'Desde aquí puedes ver estadísticas en tiempo real, accesos rápidos a las funciones más utilizadas, y los 5 archivos mas recientes.',
                steps: [
                    {
                        title: 'Estadisticas',
                        description: 'Observa las 4 estadisticas clave del sistema en la parte superior.'
                    },
                    {
                        title: 'Accesos Rápidos',
                        description: 'Accede rápidamente a las funciones más utilizadas con los botones de acceso directo.'
                    },
                    {
                        title: 'Archivos recientes',
                        description: 'Revisa los archivos más recientes subidos al sistema.'
                    }
                ],
                tips: [
                    'Puedes picarle al boton de actualizar para refrescar los datos del dashboard.',
                    'Haz clic en cualquier opcion de archivos recientes para realizar la accion.',
                    'Observa las 4 estadisticas clave, te serviran para monitorear el sistema.'
                ],
                features: [
                    { title: 'Resumen General', desc: 'Vista completa del estado del sistema' },
                    { title: 'Actividad Reciente', desc: 'Últimas acciones realizadas' },
                    { title: 'Acciones rapidas', desc: 'Apartado de documentos y personas al primer vistazo' },
                    { title: 'Notificaciones', desc: 'Notificaciones importantes' }
                ],
                videoUrl: null,
                imageUrl: '/assets/images/guides/dashboard-guide.png'
            },
            personas: {
                title: 'Gestión de Personas',
                icon: 'users',
                description: 'Administra personas, departamentos, puestos y toda la información de las personas.',
                overview: 'Este módulo te permite gestionar todos los aspectos relacionados con las personas en el sistema, desde creación de personas hasta asignación de puestos e informacion.',
                steps: [
                    {
                        title: 'Agregar persona',
                        description: 'Agrega nuevas personas al sistema completando el formulario de registro.'
                    },
                    {
                        title: 'Asignar puesto y departamentos',
                        description: 'Define qué puede hacer cada persona asignando puestos y departamentos específicos.'
                    },
                    {
                        title: 'Gestionar Departamentos',
                        description: 'Organiza a las personas en departamentos para mejor administración.'
                    },
                    {
                        title: 'Acciones de personas',
                        description: 'Si te equivocaste de alguna persona, puedes eliminarla o editarla, lo mismo para los departamentos.'
                    }
                ],
                tips: [
                    'Usa los filtros para buscar personas de manera mas exacta.',
                    'Usa la funcion de busqueda para buscar personas por nombre, puesto, departamento, etc.'
                ],
                features: [
                    { title: 'Gestión de personas', desc: 'CRUD completo de personas' },
                    { title: 'Control de puestos', desc: 'Sistema de puestos y departamentos' },
                    { title: 'Perfiles Completos', desc: 'Información detallada de cada persona registrada' },
                    { title: 'Gestion de departamentos', desc: 'Organiza a las personas en departamentos' },
                ],
                videoUrl: null,
                imageUrl: '/assets/images/guides/person-guide.png'
            },
            documentos: {
                title: 'Gestión Documental',
                icon: 'folder-open',
                description: 'Sistema completo para subir, organizar, eliminar, buscar y hacer acciones sobre documentos.',
                overview: 'Centraliza toda la documentación de tu organización en un solo lugar. Sube, categoriza, controla y accede a versiones de documentos importantes.',
                steps: [
                    {
                        title: 'Subir Documentos',
                        description: 'Arrastra y suelta archivos o usa el botón de subida para agregar documentos teniendo la opcion de subir un solo archivo o múltiples.'
                    },
                    {
                        title: 'Organizar en categorias',
                        description: 'Crea estructuras de documentos para mantener los documentos organizados.'
                    },
                    {
                        title: 'Relacionar con personas',
                        description: 'Relaciona documentos específicos con personas.'
                    },
                    {
                        title: 'Control de acciones',
                        description: 'Si te equivocaste de algun documento, puedes eliminarlo o editarlo, ademas de descargarlo o visualizarlo.'
                    }
                ],
                tips: [
                    'Usa etiquetas (filtros) para facilitar la búsqueda de documentos.',
                    'Si se te complica con los filtros, cambia a la busqueda avanzada.',
                    'Usa las acciones de documentos para realizar acciones sobre los documentos o comprobar.'
                ],
                features: [
                    { title: 'Subida Múltiple', desc: 'Sube varios archivos a la vez' },
                    { title: 'Búsqueda Avanzada', desc: 'Encuentra documentos por nombre, contenido o etiquetas y mas' },
                    { title: 'Categorias', desc: 'Organiza los documentos en categorias' }
                ],
                videoUrl: null,
                imageUrl: '/assets/images/guides/documents-guide.png'
            },
            tareas: {
                title: 'Gestión de Tareas',
                icon: 'tasks',
                description: 'Sistema de gestión de tareas con tablero para organizar y seguir el progreso de las actividades.',
                overview: 'Organiza y gestiona tus tareas de manera eficiente con nuestro sistema de gestión de tareas basado en tablas como tablero.',
                steps: [
                    {
                        title: 'Crear Tareas',
                        description: 'Crea nuevas tareas con un simple click.'
                    },
                    {
                        title: 'Organizar Tareas',
                        description: 'Organiza tus tareas en columnas para mantener un registro de progreso.'
                    },
                    {
                        title: 'Seguir Tareas',
                        description: 'Seguir el progreso de las tareas con un tablero para ver el estado de cada tarea.'
                    }
                ],
                tips: [
                    'Usa etiquetas para categorizar tus tareas.',
                    'Asigna prioridades para gestionar mejor tu tiempo.',
                    'Revisa regularmente las tareas próximas a vencer.'
                ],
                features: [
                    { title: 'Tablero Kanban', desc: 'Visualiza tareas en columnas por estado' },
                    { title: 'Priorización', desc: 'Asigna niveles de prioridad a cada tarea' },
                    { title: 'Seguimiento', desc: 'Monitorea el progreso en tiempo real' }
                ],
                videoUrl: null,
                imageUrl: '/assets/images/guides/tasks-guide.png'
            },
            historial: {
                title: 'Historial del Sistema',
                icon: 'history',
                description: 'Registro completo de todas las actividades y eventos del sistema.',
                overview: 'Mantén un registro detallado de todas las acciones realizadas en el sistema, con filtros avanzados para auditoría y seguimiento.',
                steps: [
                    {
                        title: 'Ver registro completo',
                        description: 'Accede al historial completo de actividades del sistema.'
                    },
                    {
                        title: 'Filtrar actividades',
                        description: 'Usa los filtros avanzados para encontrar actividades específicas.'
                    },
                    {
                        title: 'Exportar historial',
                        description: 'Exporta el historial en diferentes formatos para análisis externo.'
                    },
                    {
                        title: 'Limpiar historial',
                        description: 'Gestiona el espacio eliminando registros antiguos cuando sea necesario.'
                    }
                ],
                tips: [
                    'Usa los filtros por fecha para encontrar actividades específicas.',
                    'Exporta regularmente el historial para mantener copias de seguridad.',
                    'Revisa el historial para detectar actividades inusuales.'
                ],
                features: [
                    { title: 'Registro Completo', desc: 'Todas las actividades del sistema registradas' },
                    { title: 'Filtros Avanzados', desc: 'Búsqueda por tipo, fecha, prioridad y estado' },
                    { title: 'Exportación', desc: 'Exporta datos en múltiples formatos' },
                    { title: 'Estadísticas', desc: 'Métricas y análisis de actividades' }
                ],
                videoUrl: null,
                imageUrl: '/assets/images/guides/history-guide.png'
            },
            calendario: {
                title: 'Calendario de Eventos',
                icon: 'calendar-alt',
                description: 'Sistema completo de calendario para gestionar eventos, reuniones y plazos importantes.',
                overview: 'Organiza y programa todos los eventos importantes de la organización en un calendario intuitivo con recordatorios y categorización.',
                steps: [
                    {
                        title: 'Ver calendario mensual',
                        description: 'Navega por los meses para ver todos los eventos programados.'
                    },
                    {
                        title: 'Crear nuevos eventos',
                        description: 'Agrega eventos académicos, reuniones, plazos y días festivos.'
                    },
                    {
                        title: 'Filtrar por categoría',
                        description: 'Usa los filtros para ver solo ciertos tipos de eventos.'
                    },
                    {
                        title: 'Configurar recordatorios',
                        description: 'Establece alertas para no olvidar eventos importantes.'
                    }
                ],
                tips: [
                    'Usa colores diferentes para cada tipo de evento.',
                    'Configura recordatorios con suficiente antelación.',
                    'Comparte eventos importantes con otros usuarios.'
                ],
                features: [
                    { title: 'Vista Mensual', desc: 'Calendario completo con vista mensual' },
                    { title: 'Múltiples Categorías', desc: 'Eventos académicos, reuniones, plazos y festivos' },
                    { title: 'Recordatorios', desc: 'Alertas personalizables por evento' },
                    { title: 'Mini Calendario', desc: 'Vista rápida de eventos próximos' }
                ],
                videoUrl: null,
                imageUrl: '/assets/images/guides/calendar-guide.png'
            },
            ajustes: {
                title: 'Configuración del Sistema',
                icon: 'cog',
                description: 'Personaliza y configura todos los aspectos del sistema según tus necesidades.',
                overview: 'Ajusta las preferencias del sistema, configura parámetros generales y personaliza la experiencia de usuario.',
                steps: [
                    {
                        title: 'Configuración general',
                        description: 'Ajusta los parámetros básicos del sistema.'
                    },
                    {
                        title: 'Preferencias de usuario',
                        description: 'Personaliza tu experiencia de usuario.'
                    },
                    {
                        title: 'Configuración de notificaciones',
                        description: 'Controla cómo y cuándo recibir notificaciones.'
                    },
                    {
                        title: 'Configuración de seguridad',
                        description: 'Gestiona permisos y políticas de seguridad.'
                    }
                ],
                tips: [
                    'Revisa regularmente la configuración de seguridad.',
                    'Personaliza las notificaciones para evitar distracciones.',
                    'Guarda copias de seguridad de la configuración.'
                ],
                features: [
                    { title: 'Personalización', desc: 'Ajusta la apariencia y comportamiento' },
                    { title: 'Seguridad', desc: 'Configura permisos y políticas de acceso' },
                    { title: 'Notificaciones', desc: 'Control total sobre alertas y recordatorios' },
                    { title: 'Copias de Seguridad', desc: 'Gestión de respaldos de configuración' }
                ],
                videoUrl: null,
                imageUrl: '/assets/images/guides/settings-guide.png'
            },
            reportes: {
                title: 'Reportes y Análisis',
                icon: 'chart-bar',
                description: 'Genera reportes detallados y análisis estadísticos del sistema.',
                overview: 'Crea reportes personalizados sobre documentos, personas, actividades y métricas del sistema para toma de decisiones informadas.',
                steps: [
                    {
                        title: 'Seleccionar tipo de reporte',
                        description: 'Elige entre reportes generales, por categoría, por persona o de documentos.'
                    },
                    {
                        title: 'Configurar filtros',
                        description: 'Aplica filtros específicos para obtener datos precisos.'
                    },
                    {
                        title: 'Seleccionar formato',
                        description: 'Elige entre Excel o CSV para la exportación.'
                    },
                    {
                        title: 'Generar y descargar',
                        description: 'Genera el reporte y descárgalo en el formato seleccionado.'
                    }
                ],
                tips: [
                    'Usa filtros específicos para reportes más relevantes.',
                    'Programa reportes recurrentes para análisis periódicos.',
                    'Compara reportes de diferentes periodos para identificar tendencias.'
                ],
                features: [
                    { title: 'Reportes Personalizados', desc: 'Crea reportes con criterios específicos' },
                    { title: 'Múltiples Formatos', desc: 'Exporta en Excel, CSV y otros formatos' },
                    { title: 'Vista Previa', desc: 'Visualiza el reporte antes de descargarlo' },
                    { title: 'Programación', desc: 'Configura reportes automáticos recurrentes' }
                ],
                videoUrl: null,
                imageUrl: '/assets/images/guides/reports-guide.png'
            },
            admin: {
                title: 'Panel Administrativo',
                icon: 'user-shield',
                description: 'Herramientas avanzadas de administración y control del sistema.',
                overview: 'Accede a funciones administrativas avanzadas para gestionar usuarios, permisos, auditorías y configuración del sistema.',
                steps: [
                    {
                        title: 'Gestión de usuarios',
                        description: 'Administra cuentas de usuario y permisos.'
                    },
                    {
                        title: 'Configuración del sistema',
                        description: 'Ajusta parámetros avanzados del sistema.'
                    },
                    {
                        title: 'Auditoría y logs',
                        description: 'Revisa logs del sistema y actividades de usuarios.'
                    },
                    {
                        title: 'Cambiar administrador',
                        description: 'Transfiere privilegios administrativos a otro usuario.'
                    }
                ],
                tips: [
                    'Realiza auditorías regulares de actividades.',
                    'Mantén copias de seguridad de la configuración.',
                    'Revisa logs del sistema periódicamente.'
                ],
                features: [
                    { title: 'Control de Usuarios', desc: 'Gestión completa de cuentas y permisos' },
                    { title: 'Configuración Avanzada', desc: 'Ajustes detallados del sistema' },
                    { title: 'Auditoría', desc: 'Registro completo de actividades' },
                    { title: 'Seguridad', desc: 'Herramientas de seguridad avanzadas' }
                ],
                videoUrl: null,
                imageUrl: '/assets/images/guides/admin-guide.png'
            },
            'modo-oscuro': {
                title: 'Modo Oscuro',
                icon: 'moon',
                description: 'Alternativa visual para reducir fatiga ocular en condiciones de poca luz.',
                overview: 'Activa el modo oscuro para una experiencia visual más cómoda durante la noche o en ambientes con poca iluminación.',
                steps: [
                    {
                        title: 'Activar modo oscuro',
                        description: 'Haz clic en el botón de cambio de tema en la barra lateral.'
                    },
                    {
                        title: 'Ajustar brillo',
                        description: 'Configura el nivel de brillo según tus preferencias.'
                    },
                    {
                        title: 'Programar cambios',
                        description: 'Configura cambios automáticos según la hora del día.'
                    }
                ],
                tips: [
                    'Usa el modo oscuro en ambientes con poca luz.',
                    'Ajusta el brillo de tu pantalla para mayor comodidad.',
                    'Programa cambios automáticos al atardecer.'
                ],
                features: [
                    { title: 'Reducción de Fatiga', desc: 'Menos estrés visual en condiciones de poca luz' },
                    { title: 'Ahorro de Energía', desc: 'Consume menos energía en pantallas OLED/AMOLED' },
                    { title: 'Programación', desc: 'Cambios automáticos según horario' },
                    { title: 'Personalización', desc: 'Ajusta colores y contrastes' }
                ],
                videoUrl: null,
                imageUrl: '/assets/images/guides/dark-mode-guide.png'
            },
            papelera: {
                title: 'Papelera de Reciclaje',
                icon: 'trash-restore',
                description: 'Sistema de recuperación de documentos y elementos eliminados.',
                overview: 'Recupera documentos eliminados accidentalmente. Los elementos permanecen en la papelera por 30 días antes de ser eliminados permanentemente.',
                steps: [
                    {
                        title: 'Ver elementos eliminados',
                        description: 'Revisa todos los documentos en la papelera.'
                    },
                    {
                        title: 'Restaurar elementos',
                        description: 'Recupera documentos eliminados accidentalmente.'
                    },
                    {
                        title: 'Eliminar permanentemente',
                        description: 'Borra elementos de la papelera antes de los 30 días.'
                    },
                    {
                        title: 'Vaciar papelera',
                        description: 'Elimina todos los elementos de la papelera.'
                    }
                ],
                tips: [
                    'Revisa la papelera antes de eliminaciones permanentes.',
                    'Los documentos se eliminan automáticamente después de 30 días.',
                    'Usa la búsqueda para encontrar documentos específicos.'
                ],
                features: [
                    { title: 'Recuperación', desc: 'Restaura documentos eliminados' },
                    { title: 'Tiempo Limitado', desc: '30 días para recuperar elementos' },
                    { title: 'Búsqueda', desc: 'Encuentra documentos específicos' },
                    { title: 'Gestión Masiva', desc: 'Restaura o elimina múltiples documentos' }
                ],
                videoUrl: null,
                imageUrl: '/assets/images/guides/trash-guide.png'
            },
            notificaciones: {
                title: 'Sistema de Notificaciones',
                icon: 'bell',
                description: 'Sistema completo de alertas y recordatorios para mantenerte informado.',
                overview: 'Recibe notificaciones importantes sobre documentos próximos a vencer, actividades del sistema, actualizaciones y eventos programados.',
                steps: [
                    {
                        title: 'Ver notificaciones',
                        description: 'Accede al panel de notificaciones desde la barra superior.'
                    },
                    {
                        title: 'Configurar preferencias',
                        description: 'Define qué notificaciones quieres recibir y cómo.'
                    },
                    {
                        title: 'Marcar como leídas',
                        description: 'Gestiona el estado de tus notificaciones.'
                    },
                    {
                        title: 'Configurar alertas',
                        description: 'Establece alertas para eventos importantes.'
                    }
                ],
                tips: [
                    'Revisa regularmente tus notificaciones.',
                    'Configura alertas para documentos próximos a vencer.',
                    'Desactiva notificaciones no esenciales para reducir distracciones.'
                ],
                features: [
                    { title: 'Notificaciones en Tiempo Real', desc: 'Alertas inmediatas de actividades importantes' },
                    { title: 'Personalización', desc: 'Control total sobre tipos de notificaciones' },
                    { title: 'Historial', desc: 'Registro completo de notificaciones' },
                    { title: 'Alertas Múltiples', desc: 'Notificaciones en sistema, email y push' }
                ],
                videoUrl: null,
                imageUrl: '/assets/images/guides/notifications-guide.png'
            }
        };
        
        this.init();
    }

    async init() {
        console.log('🔧 SupportModule: Inicializando módulo');
        this.setupEventListeners();
        await this.loadFAQ();
        await this.loadTickets();
        this.setupGuideListeners();
        console.log('✅ SupportModule: Módulo inicializado correctamente');
    }

    setupEventListeners() {
        console.log('🔧 SupportModule: Configurando event listeners');
        
        if (DOM.newTicketBtn) {
            DOM.newTicketBtn.addEventListener('click', () => this.openTicketModal());
        }
        
        if (DOM.createFirstTicket) {
            DOM.createFirstTicket.addEventListener('click', () => this.openTicketModal());
        }
        
        // Cerrar modal con el botón de la X (×)
        if (DOM.closeTicketModal) {
            DOM.closeTicketModal.addEventListener('click', () => this.closeTicketModal());
        }
        
        // Cerrar modal con el botón "Cancelar"
        if (DOM.cancelTicketBtn) {
            DOM.cancelTicketBtn.addEventListener('click', () => this.closeTicketModal());
        }
        
        if (DOM.submitTicketBtn) {
            DOM.submitTicketBtn.addEventListener('click', () => this.submitTicket());
        }
        
        // Cerrar modal de DETALLES del ticket (este es diferente)
        if (DOM.closeTicketDetailModal) {
            DOM.closeTicketDetailModal.addEventListener('click', () => this.closeTicketDetailModal());
        }
        
        if (DOM.closeDetailBtn) {
            DOM.closeDetailBtn.addEventListener('click', () => this.closeTicketDetailModal());
        }
        
        if (DOM.submitResponseBtn) {
            DOM.submitResponseBtn.addEventListener('click', () => this.submitResponse());
        }
        
        if (DOM.closeTicketBtn) {
            DOM.closeTicketBtn.addEventListener('click', () => this.closeTicketWithModal());
        }
        
        if (DOM.reopenTicketBtn) {
            DOM.reopenTicketBtn.addEventListener('click', () => this.reopenTicketWithModal());
        }
        
        if (DOM.ticketStatusFilter) {
            DOM.ticketStatusFilter.addEventListener('change', () => this.loadTickets());
        }
        
        if (DOM.ticketPriorityFilter) {
            DOM.ticketPriorityFilter.addEventListener('change', () => this.loadTickets());
        }
        
        // Configuración de arrastrar y soltar archivos
        if (DOM.ticketFileUpload && DOM.ticketFileInput) {
            DOM.ticketFileUpload.addEventListener('click', () => DOM.ticketFileInput.click());
            DOM.ticketFileUpload.addEventListener('dragover', (e) => {
                e.preventDefault();
                DOM.ticketFileUpload.classList.add('dragover');
            });
            DOM.ticketFileUpload.addEventListener('dragleave', () => {
                DOM.ticketFileUpload.classList.remove('dragover');
            });
            DOM.ticketFileUpload.addEventListener('drop', (e) => {
                e.preventDefault();
                DOM.ticketFileUpload.classList.remove('dragover');
                this.handleFileDrop(e.dataTransfer.files);
            });
            DOM.ticketFileInput.addEventListener('change', (e) => {
                this.handleFileSelect(e.target.files);
            });
        }
        
        // También agregar para cerrar haciendo clic fuera del modal
        if (DOM.ticketModal) {
            DOM.ticketModal.addEventListener('click', (e) => {
                if (e.target === DOM.ticketModal) {
                    this.closeTicketModal();
                }
            });
            
            // Cerrar con tecla Escape
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && DOM.ticketModal.style.display === 'flex') {
                    this.closeTicketModal();
                }
            });
        }
        
        console.log('✅ Event listeners configurados correctamente');
    }

    setupGuideListeners() {
        console.log('🔧 SupportModule: Configurando listeners de guía');
        
        document.querySelectorAll('.guide-view-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const section = e.currentTarget.dataset.section;
                console.log(`📍 Botón guía clickeado: ${section}`);
                this.openGuideModal(section);
            });
        });
        
        const closeGuideModal = document.getElementById('closeGuideModal');
        if (closeGuideModal) {
            closeGuideModal.addEventListener('click', () => {
                console.log('📍 Botón cerrar guía clickeado');
                this.closeGuideModal();
            });
        }
        
        document.querySelectorAll('.guide-nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const section = e.currentTarget.dataset.section;
                console.log(`📍 Navegación sidebar: ${section}`);
                this.loadGuideSection(section);
                
                document.querySelectorAll('.guide-nav-item').forEach(navItem => {
                    navItem.classList.remove('active');
                });
                e.currentTarget.classList.add('active');
            });
        });
        
        document.getElementById('guideModal')?.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                console.log('📍 Clic fuera del modal de guía');
                this.closeGuideModal();
            }
        });
        
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isGuideModalOpen) {
                console.log('📍 Tecla Escape presionada, cerrando guía');
                this.closeGuideModal();
            }
        });
        
        console.log('✅ Listeners de guía configurados');
    }

    openGuideModal(section = 'dashboard') {
        console.log(`🔧 SupportModule: Abriendo modal de guía (sección: ${section})`);
        
        const modal = document.getElementById('guideModal');
        if (!modal) {
            console.error('❌ Modal de guía no encontrado en el DOM');
            return;
        }
        
        this.isGuideModalOpen = true;
        modal.style.display = 'flex';
        
        modal.offsetHeight;
        
        setTimeout(() => {
            modal.style.opacity = '1';
            modal.style.visibility = 'visible';
            console.log(`✅ Modal de guía visible (opacidad: 1)`);
        }, 10);
        
        document.querySelectorAll('.guide-nav-item').forEach(item => {
            item.classList.remove('active');
            if (item.dataset.section === section) {
                item.classList.add('active');
            }
        });
        
        this.loadGuideSection(section);
        
        document.body.classList.add('modal-open');
    }

    closeGuideModal() {
        console.log('🔧 SupportModule: Cerrando modal de guía');
        
        const modal = document.getElementById('guideModal');
        if (!modal) return;
        
        this.isGuideModalOpen = false;
        modal.style.opacity = '0';
        modal.style.visibility = 'hidden';
        
        setTimeout(() => {
            modal.style.display = 'none';
            console.log('✅ Modal de guía oculto');
        }, 300);
        
        document.body.classList.remove('modal-open');
    }

    getImageCaption(section) {
        const captions = {
            'dashboard': 'Dashboard principal con widgets y estadísticas en tiempo real',
            'personas': 'Gestión de usuarios y personal del sistema',
            'documentos': 'Sistema de gestión documental completo',
            'tareas': 'Tablero Kanban para seguimiento de actividades',
            'historial': 'Registro completo de actividades del sistema',
            'calendario': 'Calendario de eventos y programaciones',
            'ajustes': 'Panel de configuración del sistema',
            'reportes': 'Generador de reportes y análisis de datos',
            'admin': 'Panel administrativo avanzado',
            'modo-oscuro': 'Interfaz en tema oscuro para mejor visibilidad',
            'papelera': 'Papelera de reciclaje para recuperar elementos',
            'notificaciones': 'Centro de notificaciones y alertas'
        };
        return captions[section] || 'Captura de pantalla ilustrativa';
    }

    async loadGuideSection(section) {
        console.log(`🔧 SupportModule: Cargando sección de guía: ${section}`);
        
        const content = document.getElementById('guideContent');
        if (!content) {
            console.error('🚨 ERROR: #guideContent no existe en el DOM');
            
            const guideMain = document.querySelector('.guide-main');
            if (guideMain) {
                console.log('⚠️ Creando #guideContent dinámicamente');
                const newContent = document.createElement('div');
                newContent.id = 'guideContent';
                guideMain.appendChild(newContent);
                return this.loadGuideSection(section);
            }
            return;
        }
        
        const guide = this.guideData[section];
        if (!guide) {
            console.error(`🚨 ERROR: No hay datos para la sección: ${section}`);
            return;
        }
        
        this.currentGuideSection = section;
        const sectionIndex = this.guideSections.indexOf(section);
        const progress = ((sectionIndex + 1) / this.guideSections.length) * 100;
        const imageCaption = this.getImageCaption(section);
        
        console.log(`📊 Datos de la guía para ${section}:`, {
            title: guide.title,
            hasImageUrl: !!guide.imageUrl,
            imageUrl: guide.imageUrl,
            stepsCount: guide.steps?.length || 0,
            featuresCount: guide.features?.length || 0
        });
        
        let sectionHTML = `
            <div class="guide-section-content" data-section="${section}">
                <div class="guide-header">
                    <h2 class="guide-section-title-large">
                        <i class="fas fa-${guide.icon}"></i>
                        ${guide.title}
                    </h2>
                    <div class="guide-description">${guide.description}</div>
                </div>
                
                <div class="guide-progress">
                    <div class="guide-progress-text">
                        Sección ${sectionIndex + 1} de ${this.guideSections.length}
                    </div>
                    <div class="guide-progress-bar">
                        <div class="guide-progress-fill" style="width: ${progress}%"></div>
                    </div>
                </div>
                
                <div class="guide-body">
        `;
        
        sectionHTML += `
                    <div class="guide-image-section">
                        <div class="guide-image-container">
                            <img 
                                src="${guide.imageUrl || '/assets/images/guides/placeholder.png'}" 
                                alt="${guide.title}" 
                                class="guide-image"
                                id="guideImage-${section}"
                                onerror="this.onerror=null; this.src='/assets/images/guides/placeholder.png'; console.log('❌ Imagen falló:', '${guide.imageUrl}')"
                            >
                            <div class="guide-image-overlay">
                                <div class="overlay-content">
                                    <i class="fas fa-search-plus"></i>
                                    <span>Ver en detalle</span>
                                </div>
                            </div>
                        </div>
                        <div class="guide-image-caption">
                            <i class="fas fa-info-circle"></i>
                            ${imageCaption}
                        </div>
                    </div>
        `;
        
        sectionHTML += `
                    <div class="guide-overview-section">
                        <h3 class="guide-subtitle">
                            <i class="fas fa-eye"></i>
                            Vista General
                        </h3>
                        <div class="guide-overview-content">
                            ${guide.overview}
                        </div>
                    </div>
        `;
        
        sectionHTML += `
                    <div class="guide-features-section">
                        <h3 class="guide-subtitle">
                            <i class="fas fa-star"></i>
                            Características Principales
                        </h3>
                        <div class="guide-features-grid">
        `;
        
        guide.features.forEach((feature, index) => {
            sectionHTML += `
                            <div class="guide-feature-card" data-feature="${index}">
                                <div class="feature-icon">
                                    <i class="fas fa-check-circle"></i>
                                </div>
                                <div class="feature-content">
                                    <h4 class="feature-title">${feature.title}</h4>
                                    <p class="feature-description">${feature.desc}</p>
                                </div>
                            </div>
            `;
        });
        
        sectionHTML += `
                        </div>
                    </div>
        `;
        
        sectionHTML += `
                    <div class="guide-steps-section">
                        <h3 class="guide-subtitle">
                            <i class="fas fa-list-ol"></i>
                            Cómo Usarlo Paso a Paso
                        </h3>
                        <div class="guide-steps-list">
        `;
        
        guide.steps.forEach((step, index) => {
            sectionHTML += `
                            <div class="guide-step-card">
                                <div class="step-number">${index + 1}</div>
                                <div class="step-content">
                                    <h4 class="step-title">${step.title}</h4>
                                    <p class="step-description">${step.description}</p>
                                </div>
                            </div>
            `;
        });
        
        sectionHTML += `
                        </div>
                    </div>
        `;
        
        if (guide.tips && guide.tips.length > 0) {
            sectionHTML += `
                    <div class="guide-tips-section">
                        <h3 class="guide-subtitle">
                            <i class="fas fa-lightbulb"></i>
                            Consejos Prácticos
                        </h3>
                        <div class="guide-tips-list">
            `;
            
            guide.tips.forEach((tip, index) => {
                sectionHTML += `
                            <div class="guide-tip-item">
                                <div class="tip-icon">
                                    <i class="fas fa-chevron-right"></i>
                                </div>
                                <div class="tip-content">${tip}</div>
                            </div>
                `;
            });
            
            sectionHTML += `
                        </div>
                    </div>
            `;
        }
        
        sectionHTML += `
                </div>
                
                <div class="guide-navigation">
                    ${sectionIndex > 0 ? `
                        <button class="guide-nav-btn guide-nav-btn--prev" 
                                data-section="${this.guideSections[sectionIndex - 1]}"
                                aria-label="Sección anterior: ${this.guideData[this.guideSections[sectionIndex - 1]].title}">
                            <i class="fas fa-chevron-left"></i>
                            <span class="nav-text">Anterior</span>
                            <span class="nav-section">${this.guideData[this.guideSections[sectionIndex - 1]].title}</span>
                        </button>
                    ` : '<div></div>'}
                    
                    ${sectionIndex < this.guideSections.length - 1 ? `
                        <button class="guide-nav-btn guide-nav-btn--next" 
                                data-section="${this.guideSections[sectionIndex + 1]}"
                                aria-label="Siguiente sección: ${this.guideData[this.guideSections[sectionIndex + 1]].title}">
                            <span class="nav-text">Siguiente</span>
                            <span class="nav-section">${this.guideData[this.guideSections[sectionIndex + 1]].title}</span>
                            <i class="fas fa-chevron-right"></i>
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
        
        console.log(`📋 HTML generado para ${section} (primeros 500 chars):`, sectionHTML.substring(0, 500));
        
        content.innerHTML = sectionHTML;
        
        console.log(`✅ HTML insertado en #guideContent`);
        console.log(`🔍 Buscando elementos después de inserción:`);
        console.log('- .guide-image encontrado?', content.querySelector('.guide-image') ? '✅ SÍ' : '❌ NO');
        console.log('- .guide-features-grid encontrado?', content.querySelector('.guide-features-grid') ? '✅ SÍ' : '❌ NO');
        console.log('- .guide-steps-list encontrado?', content.querySelector('.guide-steps-list') ? '✅ SÍ' : '❌ NO');
        
        this.setupGuideSectionEvents();
        
        this.preloadGuideImages();
    }

    setupGuideSectionEvents() {
        const content = document.getElementById('guideContent');
        if (!content) return;
        
        content.querySelectorAll('.guide-nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const nextSection = e.currentTarget.dataset.section;
                console.log(`📍 Botón navegación clickeado: ${nextSection}`);
                
                content.scrollTop = 0;
                
                this.loadGuideSection(nextSection);
                
                document.querySelectorAll('.guide-nav-item').forEach(navItem => {
                    navItem.classList.remove('active');
                    if (navItem.dataset.section === nextSection) {
                        navItem.classList.add('active');
                    }
                });
            });
        });
        
        content.querySelectorAll('.guide-image-container').forEach(container => {
            container.addEventListener('click', (e) => {
                const img = container.querySelector('.guide-image');
                if (img) {
                    this.openImageLightbox(img.src, img.alt);
                }
            });
        });
        
        document.addEventListener('keydown', (e) => {
            if (!this.isGuideModalOpen) return;
            
            const currentIndex = this.guideSections.indexOf(this.currentGuideSection);
            
            switch (e.key) {
                case 'ArrowLeft':
                    if (currentIndex > 0) {
                        e.preventDefault();
                        this.loadGuideSection(this.guideSections[currentIndex - 1]);
                    }
                    break;
                    
                case 'ArrowRight':
                    if (currentIndex < this.guideSections.length - 1) {
                        e.preventDefault();
                        this.loadGuideSection(this.guideSections[currentIndex + 1]);
                    }
                    break;
            }
        });
    }

    async preloadGuideImages() {
        console.log('🔧 SupportModule: Pre-cargando imágenes de guía');
        
        const currentGuide = this.guideData[this.currentGuideSection];
        if (!currentGuide || !currentGuide.imageUrl) return;
        
        const img = new Image();
        img.src = currentGuide.imageUrl;
        img.onload = () => {
            console.log(`✅ Imagen cargada: ${currentGuide.imageUrl}`);
            const guideImg = document.querySelector(`#guideImage-${this.currentGuideSection}`);
            if (guideImg) {
                guideImg.classList.add('loaded');
            }
        };
        img.onerror = () => {
            console.error(`❌ Error cargando imagen: ${currentGuide.imageUrl}`);
        };
    }

    openImageLightbox(src, alt) {
        console.log(`🔧 SupportModule: Abriendo lightbox para imagen: ${src}`);
        
        // Buscar el lightbox existente O crear uno nuevo
        let lightbox = document.getElementById('guideLightbox');
        
        if (!lightbox) {
            console.log('🆕 Lightbox no existe, creando uno nuevo');
            lightbox = document.createElement('div');
            lightbox.id = 'guideLightbox';
            lightbox.className = 'guide-lightbox';
            lightbox.innerHTML = `
                <div class="lightbox-overlay"></div>
                <div class="lightbox-content">
                    <button class="lightbox-close" aria-label="Cerrar vista de imagen">
                        <i class="fas fa-times"></i>
                    </button>
                    <div class="lightbox-image-container">
                        <img src="${src}" alt="${alt}" class="lightbox-image">
                    </div>
                    <div class="lightbox-caption">${alt}</div>
                </div>
            `;
            document.body.appendChild(lightbox);
            
            console.log('✅ Lightbox creado e insertado en el DOM');
            
            // Eventos del lightbox
            lightbox.querySelector('.lightbox-overlay').addEventListener('click', () => {
                this.closeImageLightbox();
            });
            
            lightbox.querySelector('.lightbox-close').addEventListener('click', () => {
                this.closeImageLightbox();
            });
            
            // Cerrar con tecla Escape
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && lightbox.style.display === 'flex') {
                    this.closeImageLightbox();
                }
            });
        } else {
            console.log('✅ Lightbox ya existe en el DOM');
        }
        
        // DEBUG: Verificar que los elementos existen antes de actualizar
        console.log('🔍 Verificando elementos del lightbox:');
        const lightboxImage = lightbox.querySelector('.lightbox-image');
        const lightboxCaption = lightbox.querySelector('.lightbox-caption');
        
        console.log('- .lightbox-image encontrado?', lightboxImage ? '✅ SÍ' : '❌ NO');
        console.log('- .lightbox-caption encontrado?', lightboxCaption ? '✅ SÍ' : '❌ NO');
        console.log('- Lightbox div encontrado?', lightbox ? '✅ SÍ' : '❌ NO');
        
        if (!lightboxImage) {
            console.error('🚨 ERROR: .lightbox-image no encontrado en el lightbox');
            console.log('📋 Contenido del lightbox:', lightbox.innerHTML);
            
            // Intentar recuperar la imagen
            const imageContainer = lightbox.querySelector('.lightbox-image-container');
            if (imageContainer) {
                console.log('🔧 Creando imagen dinámicamente');
                const img = document.createElement('img');
                img.src = src;
                img.alt = alt;
                img.className = 'lightbox-image';
                imageContainer.innerHTML = '';
                imageContainer.appendChild(img);
            }
        } else {
            // Actualizar imagen y mostrar - SOLO si existe
            lightboxImage.src = src;
            lightboxImage.alt = alt;
            if (lightboxCaption) {
                lightboxCaption.textContent = alt;
            }
        }
        
        // Mostrar el lightbox
        lightbox.style.display = 'flex';
        
        // Forzar reflow para la animación
        lightbox.offsetHeight;
        
        setTimeout(() => {
            lightbox.style.opacity = '1';
            console.log('✅ Lightbox visible (opacidad: 1)');
        }, 10);
        
        // Agregar clase al body
        document.body.classList.add('lightbox-open');
        
        // DEBUG final
        console.log('✅ Lightbox abierto exitosamente');
    }

    closeImageLightbox() {
        console.log('🔧 SupportModule: Cerrando lightbox');
        
        const lightbox = document.getElementById('guideLightbox');
        if (!lightbox) {
            console.warn('⚠️ Lightbox no encontrado al intentar cerrar');
            return;
        }
        
        console.log('✅ Lightbox encontrado, cerrando...');
        lightbox.style.opacity = '0';
        
        setTimeout(() => {
            lightbox.style.display = 'none';
            document.body.classList.remove('lightbox-open');
            console.log('✅ Lightbox oculto');
        }, 300);
    }

    async loadFAQ() {
        try {
            console.log('🔧 SupportModule: Cargando FAQ');
            const response = await api.getFAQ();
            
            if (response.success && DOM.faqList) {
                const faqHTML = response.faq.map(item => `
                    <div class="faq-item" data-category="${item.category}">
                        <div class="faq-question">
                            <h4>${item.question}</h4>
                            <span class="faq-category">${this.getCategoryName(item.category)}</span>
                        </div>
                        <div class="faq-answer">
                            <p>${item.answer}</p>
                            ${item.link ? `<a href="${item.link}" target="_blank" class="faq-link">Ver más información</a>` : ''}
                        </div>
                    </div>
                `).join('');
                
                DOM.faqList.innerHTML = faqHTML;
                
                document.querySelectorAll('.faq-question').forEach(question => {
                    question.addEventListener('click', () => {
                        const answer = question.nextElementSibling;
                        answer.classList.toggle('open');
                        question.classList.toggle('active');
                    });
                });
                
                console.log(`✅ FAQ cargadas: ${response.faq.length} preguntas`);
            }
        } catch (error) {
            console.error('❌ Error cargando FAQ:', error);
        }
    }

    async loadTickets() {
        try {
            const status = DOM.ticketStatusFilter?.value || 'all';
            const priority = DOM.ticketPriorityFilter?.value || 'all';
            
            console.log(`🔧 SupportModule: Cargando tickets (status: ${status}, priority: ${priority})`);
            
            const response = await api.getTickets({ status, priority });
            
            if (response.success) {
                this.currentTickets = response.tickets;
                this.renderTickets(response.tickets);
                console.log(`✅ Tickets cargados: ${response.tickets.length} tickets`);
            }
        } catch (error) {
            console.error('❌ Error cargando tickets:', error);
            this.renderTickets([]);
        }
    }

    renderTickets(tickets) {
        if (!DOM.ticketsList) return;
        
        if (tickets.length === 0) {
            DOM.ticketsList.innerHTML = `
                <div class="support-empty-state">
                    <div class="support-empty-state-icon">
                        <i class="fas fa-ticket-alt"></i>
                    </div>
                    <h3 class="support-empty-state-title">No tienes tickets de soporte</h3>
                    <p class="support-empty-state-description">Crea tu primer ticket para recibir ayuda</p>
                    <button class="btn btn--primary btn--lg margin" id="createFirstTicket">
                        <i class="fas fa-plus-circle"></i> Crear Primer Ticket
                    </button>
                </div>
            `;
            
            const createBtn = document.getElementById('createFirstTicket');
            if (createBtn) {
                createBtn.addEventListener('click', () => this.openTicketModal());
            }
            return;
        }
        
        const ticketsHTML = tickets.map(ticket => `
            <div class="ticket-card ${ticket.status}" data-id="${ticket._id}">
                <div class="ticket-card__header">
                    <div class="ticket-card__info">
                        <h4 class="ticket-card__subject">${ticket.subject}</h4>
                        <div class="ticket-card__meta">
                            <span class="ticket-card__number">${ticket.ticketNumber}</span>
                            <span class="ticket-card__date">${formatDate(ticket.createdAt)}</span>
                            <span class="ticket-card__category">${this.getCategoryName(ticket.category)}</span>
                        </div>
                    </div>
                    <div class="ticket-card__status">
                        <span class="status-badge status-${ticket.status}">${this.getStatusName(ticket.status)}</span>
                        <span class="priority-badge priority-${ticket.priority}">${ticket.priority.toUpperCase()}</span>
                    </div>
                </div>
                <div class="ticket-card__preview">
                    <p>${ticket.description.substring(0, 150)}${ticket.description.length > 150 ? '...' : ''}</p>
                </div>
                <div class="ticket-card__footer">
                    <div class="ticket-card__actions">
                        <button class="btn btn--outline btn--sm view-ticket-btn" data-id="${ticket._id}">
                            <i class="fas fa-eye"></i> Ver detalles
                        </button>
                        ${ticket.attachments && ticket.attachments.length > 0 ? 
                            `<span class="ticket-attachments">
                                <i class="fas fa-paperclip"></i> ${ticket.attachments.length}
                            </span>` : ''
                        }
                    </div>
                    <div class="ticket-card__updates">
                        <i class="fas fa-comments"></i> ${ticket.updates?.length || 1} actualizaciones
                        <span class="ticket-time">${this.getTimeAgo(ticket.updatedAt)}</span>
                    </div>
                </div>
            </div>
        `).join('');
        
        DOM.ticketsList.innerHTML = ticketsHTML;
        
        document.querySelectorAll('.view-ticket-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const ticketId = e.currentTarget.dataset.id;
                this.viewTicketDetails(ticketId);
            });
        });
    }

    openTicketModal() {
        console.log('🔧 SupportModule: Abriendo modal de ticket');
        
        DOM.ticketModal.style.display = 'flex';
        setTimeout(() => {
            DOM.ticketModal.style.opacity = '1';
            DOM.ticketModal.style.visibility = 'visible';
        }, 10);
        
        DOM.ticketForm.reset();
        DOM.ticketFileList.innerHTML = '';
        this.selectedFiles = [];
        
        const today = new Date().toISOString().split('T')[0];
        const dateInput = document.getElementById('ticketDueDate');
        if (dateInput) {
            dateInput.min = today;
        }
        
        document.body.classList.add('modal-open');
    }

    closeTicketModal() {
        DOM.ticketModal.style.opacity = '0';
        DOM.ticketModal.style.visibility = 'hidden';
        setTimeout(() => {
            DOM.ticketModal.style.display = 'none';
        }, 300);
        
        document.body.classList.remove('modal-open');
    }

    handleFileDrop(files) {
        this.handleFileSelect(files);
    }

    handleFileSelect(files) {
        if (!files || files.length === 0) return;
        
        if (!this.selectedFiles) {
            this.selectedFiles = [];
        }
        
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            
            if (file.size > 10 * 1024 * 1024) {
                showAlert(`El archivo "${file.name}" es demasiado grande (máximo 10MB)`, 'error');
                continue;
            }
            
            const allowedTypes = [
                'image/jpeg', 'image/png', 'image/gif', 'image/webp',
                'application/pdf', 
                'application/msword',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'application/vnd.ms-excel',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'text/plain',
                'application/zip',
                'application/x-rar-compressed'
            ];
            
            if (!allowedTypes.includes(file.type)) {
                showAlert(`Tipo de archivo no permitido: "${file.name}"`, 'error');
                continue;
            }
            
            this.selectedFiles.push(file);
            this.renderFileItem(file);
        }
        
        this.updateFileCounter();
        
        DOM.ticketFileInput.value = '';
    }

    renderFileItem(file) {
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item';
        fileItem.innerHTML = `
            <div class="file-info">
                <i class="${this.getFileIcon(file.type)}"></i>
                <div class="file-details">
                    <div class="file-name" title="${file.name}">${file.name}</div>
                    <div class="file-meta">
                        <span class="file-size">${this.formatFileSize(file.size)}</span>
                        <span class="file-type">${file.type.split('/').pop().toUpperCase()}</span>
                    </div>
                </div>
            </div>
            <button class="btn btn--text btn--sm remove-file" type="button" title="Eliminar archivo">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        fileItem.querySelector('.remove-file').addEventListener('click', () => {
            this.removeFile(file.name);
            fileItem.remove();
            this.updateFileCounter();
        });
        
        DOM.ticketFileList.appendChild(fileItem);
    }

    removeFile(filename) {
        this.selectedFiles = this.selectedFiles.filter(file => file.name !== filename);
    }

    updateFileCounter() {
        const counter = document.querySelector('.file-counter');
        if (counter) {
            counter.textContent = `${this.selectedFiles.length} archivos seleccionados`;
        }
    }

    getFileIcon(mimeType) {
        if (mimeType.startsWith('image/')) return 'fas fa-file-image';
        if (mimeType.includes('pdf')) return 'fas fa-file-pdf';
        if (mimeType.includes('word') || mimeType.includes('document')) return 'fas fa-file-word';
        if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'fas fa-file-excel';
        if (mimeType.includes('zip') || mimeType.includes('rar')) return 'fas fa-file-archive';
        if (mimeType.includes('text/')) return 'fas fa-file-alt';
        return 'fas fa-file';
    }

    async submitTicket() {
        try {
            const subject = DOM.ticketSubject.value.trim();
            const description = DOM.ticketDescription.value.trim();
            const category = DOM.ticketCategory.value;
            const priority = DOM.ticketPriority.value;
            const dueDate = DOM.ticketDueDate?.value || '';
            
            if (!subject || !description || !category || !priority) {
                showAlert('Por favor, completa todos los campos obligatorios', 'error');
                return;
            }
            
            if (subject.length < 5) {
                showAlert('El asunto debe tener al menos 5 caracteres', 'error');
                return;
            }
            
            if (description.length < 20) {
                showAlert('La descripción debe tener al menos 20 caracteres', 'error');
                return;
            }
            
            const ticketData = {
                subject,
                description,
                category,
                priority,
                dueDate: dueDate || null,
                emailNotifications: true
            };
            
            console.log('📤 Enviando ticket con datos:', ticketData);
            console.log(`📎 Archivos adjuntos: ${this.selectedFiles?.length || 0}`);
            
            const submitBtn = DOM.submitTicketBtn;
            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';
            submitBtn.disabled = true;

            const response = await api.createTicket(ticketData, this.selectedFiles);
            
            if (response.success) {
                showAlert('Ticket creado exitosamente. Recibirás una confirmación por email.', 'success');
                this.closeTicketModal();
                await this.loadTickets();
                
                this.sendTicketNotification(ticketData);
            } else {
                showAlert(response.message || 'Error al crear el ticket', 'error');
            }
            
        } catch (error) {
            console.error('❌ Error creando ticket:', error);
            showAlert('Error al crear el ticket: ' + error.message, 'error');
        } finally {
            const submitBtn = DOM.submitTicketBtn;
            submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Enviar Ticket';
            submitBtn.disabled = false;
        }
    }

    async viewTicketDetails(ticketId) {
        try {
            console.log(`🔍 Cargando detalles del ticket: ${ticketId}`);
            
            // Verificar que los elementos críticos del modal existan
            if (!DOM.ticketDetailModal) {
                console.error('❌ CRÍTICO: DOM.ticketDetailModal no encontrado');
                showAlert('Error: El modal de detalles no está disponible', 'error');
                return;
            }
            
            // Verificar otros elementos importantes
            const requiredElements = [
                'detailTicketSubject', 
                'detailTicketStatus', 
                'detailTicketDescription'
            ];
            
            const missingElements = requiredElements.filter(key => !DOM[key]);
            if (missingElements.length > 0) {
                console.error('❌ Elementos DOM faltantes:', missingElements);
                showAlert('Error: No se pueden mostrar los detalles del ticket', 'error');
                return;
            }
            
            // Cargar datos del ticket
            const response = await api.getTicketDetails(ticketId);
            
            if (response.success) {
                this.currentTicket = response.ticket;
                
                console.log('📋 ========== DEBUG DETALLES TICKET ==========');
                console.log('📋 Ticket ID:', response.ticket._id);
                console.log('📋 Ticket Number:', response.ticket.ticketNumber);
                console.log('📋 Estado:', response.ticket.status);
                console.log('📋 Prioridad:', response.ticket.priority);
                console.log('📎 Archivos adjuntos:', response.ticket.attachments?.length || 0);
                
                if (response.ticket.attachments && response.ticket.attachments.length > 0) {
                    response.ticket.attachments.forEach((att, index) => {
                        console.log(`\n📄 Archivo ${index + 1}:`);
                        console.log('   Nombre:', att.originalname);
                        console.log('   URL:', att.cloudinary_url);
                        console.log('   Tamaño:', att.size, 'bytes');
                        console.log('   Tipo:', att.mimetype);
                        console.log('   Es imagen:', /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(att.originalname));
                    });
                }
                console.log('===========================================\n');
                
                // Primero hacer visible el modal
                DOM.ticketDetailModal.style.display = 'flex';
                
                // Forzar reflow para asegurar la transición
                DOM.ticketDetailModal.offsetHeight;
                
                // Configurar transición de opacidad
                setTimeout(() => {
                    DOM.ticketDetailModal.style.opacity = '1';
                    DOM.ticketDetailModal.style.visibility = 'visible';
                    
                    // Luego renderizar los detalles
                    try {
                        this.renderTicketDetails(response.ticket);
                        console.log('✅ Detalles del ticket renderizados exitosamente');
                    } catch (renderError) {
                        console.error('❌ Error al renderizar detalles:', renderError);
                        showAlert('Error al mostrar los detalles del ticket', 'error');
                        this.closeTicketDetailModal();
                    }
                }, 10);
                
                document.body.classList.add('modal-open');
            } else {
                console.error('❌ Error en respuesta de API:', response);
                showAlert(response.message || 'Error al cargar detalles del ticket', 'error');
            }
            
        } catch (error) {
            console.error('❌ Error cargando detalles del ticket:', error);
            console.error('Stack trace:', error.stack);
            showAlert(`Error al cargar detalles del ticket: ${error.message}`, 'error');
        }
    }

    renderTicketDetails(ticket) {
        console.log('🔍 DEBUG renderTicketDetails - Iniciando renderización...');
        console.log('📋 Datos del ticket:', {
            id: ticket._id,
            subject: ticket.subject,
            status: ticket.status,
            priority: ticket.priority
        });
        
        // Verificar elementos críticos del DOM
        console.log('🔍 Verificando elementos DOM:');
        console.log('- DOM.detailTicketSubject:', DOM.detailTicketSubject);
        console.log('- DOM.detailTicketStatus:', DOM.detailTicketStatus);
        console.log('- DOM.closeTicketBtn:', DOM.closeTicketBtn);
        console.log('- DOM.ticketResponseSection:', DOM.ticketResponseSection);
        console.log('- DOM.ticketUpdatesList:', DOM.ticketUpdatesList);
        
        // Elemento 1: Asunto del ticket
        if (!DOM.detailTicketSubject) {
            console.error('❌ CRÍTICO: DOM.detailTicketSubject es null');
            throw new Error('Elemento DOM.detailTicketSubject no encontrado');
        }
        DOM.detailTicketSubject.textContent = ticket.subject || 'Sin asunto';
        
        // Elemento 2: ID del ticket
        if (DOM.detailTicketId) {
            DOM.detailTicketId.textContent = ticket.ticketNumber || `ID: ${ticket._id}`;
        } else {
            console.warn('⚠️ DOM.detailTicketId no encontrado');
        }
        
        // Elemento 3: Fecha del ticket
        if (DOM.detailTicketDate) {
            DOM.detailTicketDate.textContent = formatDate(ticket.createdAt) || 'Fecha no disponible';
        } else {
            console.warn('⚠️ DOM.detailTicketDate no encontrado');
        }
        
        // Elemento 4: Estado del ticket
        if (DOM.detailTicketStatus) {
            DOM.detailTicketStatus.textContent = this.getStatusName(ticket.status);
            DOM.detailTicketStatus.className = `status-badge status-${ticket.status}`;
            console.log(`✅ Estado configurado: ${ticket.status} -> ${this.getStatusName(ticket.status)}`);
        } else {
            console.error('❌ DOM.detailTicketStatus es null');
        }
        
        // Elemento 5: Prioridad del ticket
        if (DOM.detailTicketPriority) {
            DOM.detailTicketPriority.textContent = ticket.priority ? ticket.priority.toUpperCase() : 'NO ESPECIFICADA';
            DOM.detailTicketPriority.className = `priority-badge priority-${ticket.priority}`;
        } else {
            console.warn('⚠️ DOM.detailTicketPriority no encontrado');
        }
        
        // Elemento 6: Descripción del ticket
        if (DOM.detailTicketDescription) {
            DOM.detailTicketDescription.textContent = ticket.description || 'Sin descripción';
            
            // Escapar HTML si es necesario
            if (ticket.description && ticket.description.includes('<')) {
                const tempDiv = document.createElement('div');
                tempDiv.textContent = ticket.description;
                DOM.detailTicketDescription.textContent = tempDiv.textContent;
            }
        } else {
            console.error('❌ DOM.detailTicketDescription es null');
        }
        
        // Elemento 7: Renderizar archivos adjuntos
        console.log(`📎 Archivos adjuntos: ${ticket.attachments?.length || 0}`);
        this.renderTicketAttachments(ticket.attachments);
        
        // Elemento 8: Renderizar actualizaciones
        console.log(`🔄 Actualizaciones: ${ticket.updates?.length || 0}`);
        this.renderTicketUpdates(ticket.updates);
        
        // Elemento 9: Fecha de vencimiento (si existe)
        if (ticket.dueDate) {
            console.log(`📅 Fecha de vencimiento: ${ticket.dueDate}`);
            
            // Crear elemento de fecha de vencimiento
            const dueDateElement = document.createElement('div');
            dueDateElement.className = 'ticket-due-date';
            dueDateElement.innerHTML = `
                <i class="fas fa-calendar-day"></i>
                <span>Vence: ${formatDate(ticket.dueDate)}</span>
            `;
            
            // Insertar en un lugar seguro
            if (DOM.detailTicketStatus && DOM.detailTicketStatus.parentNode) {
                DOM.detailTicketStatus.parentNode.appendChild(dueDateElement);
            } else {
                // Alternativa: insertar en el encabezado del ticket
                const ticketHeader = document.querySelector('.ticket-detail-header');
                if (ticketHeader) {
                    ticketHeader.appendChild(dueDateElement);
                } else {
                    console.warn('⚠️ No se pudo encontrar lugar para insertar fecha de vencimiento');
                }
            }
        }
        
        // Elemento 10: Configurar botones según estado
        console.log(`🎚️ Configurando botones para estado: ${ticket.status}`);
        
        if (ticket.status === 'cerrado') {
            // Ticket cerrado
            if (DOM.closeTicketBtn) {
                DOM.closeTicketBtn.style.display = 'none';
                console.log('✅ Botón cerrar ticket ocultado');
            } else {
                console.warn('⚠️ DOM.closeTicketBtn no encontrado para ocultar');
            }
            
            if (DOM.reopenTicketBtn) {
                DOM.reopenTicketBtn.style.display = 'inline-block';
                console.log('✅ Botón reabrir ticket mostrado');
            } else {
                console.warn('⚠️ DOM.reopenTicketBtn no encontrado para mostrar');
            }
            
            if (DOM.ticketResponseSection) {
                DOM.ticketResponseSection.style.display = 'none';
                console.log('✅ Sección de respuesta ocultada');
            } else {
                console.warn('⚠️ DOM.ticketResponseSection no encontrado para ocultar');
            }
        } else {
            // Ticket abierto/en proceso
            if (DOM.closeTicketBtn) {
                DOM.closeTicketBtn.style.display = 'inline-block';
                console.log('✅ Botón cerrar ticket mostrado');
            } else {
                console.warn('⚠️ DOM.closeTicketBtn no encontrado para mostrar');
            }
            
            if (DOM.reopenTicketBtn) {
                DOM.reopenTicketBtn.style.display = 'none';
                console.log('✅ Botón reabrir ticket ocultado');
            } else {
                console.warn('⚠️ DOM.reopenTicketBtn no encontrado para ocultar');
            }
            
            if (DOM.ticketResponseSection) {
                DOM.ticketResponseSection.style.display = 'block';
                console.log('✅ Sección de respuesta mostrada');
            } else {
                console.warn('⚠️ DOM.ticketResponseSection no encontrado para mostrar');
            }
        }
        
        // Elemento 11: Configurar el botón de cancelar/cerrar
        if (DOM.closeDetailBtn) {
            DOM.closeDetailBtn.textContent = ticket.status === 'cerrado' ? 'Volver' : 'Cancelar';
        }
        
        // Elemento 12: Actualizar título de la página si es necesario
        if (ticket.subject) {
            document.title = `${ticket.subject} - Ticket de Soporte`;
        }
        
        console.log('✅ renderTicketDetails completado exitosamente');
    }

    renderTicketAttachments(attachments) {
        const container = document.querySelector('.attachments-list');
        if (!container) return;
        
        if (!attachments || attachments.length === 0) {
            container.innerHTML = `
                <div class="no-attachments">
                    <i class="fas fa-paperclip"></i>
                    <p>No hay archivos adjuntos en este ticket</p>
                </div>
            `;
            return;
        }
        
        let attachmentsHTML = '';
        
        const imageAttachments = attachments.filter(att => 
            att.mimetype?.startsWith('image/') || 
            /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(att.originalname)
        );
        
        const otherAttachments = attachments.filter(att => 
            !(att.mimetype?.startsWith('image/') || 
            /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(att.originalname))
        );
        
        if (imageAttachments.length > 0) {
            attachmentsHTML += `
                <div class="attachments-section attachments-section--images">
                    <h4 class="attachments-section-title">
                        <i class="fas fa-images"></i>
                        Imágenes (${imageAttachments.length})
                    </h4>
                    <div class="attachments-gallery">
            `;
            
            imageAttachments.forEach((att, index) => {
                attachmentsHTML += `
                        <div class="attachment-image-item" data-index="${index}">
                            <div class="image-preview">
                                <img src="${att.cloudinary_url || att.url}" 
                                     alt="${att.originalname}" 
                                     class="attachment-thumbnail"
                                     loading="lazy"
                                     onerror="this.onerror=null; this.src='/assets/images/file-placeholder.png'">
                                <div class="image-overlay">
                                    <div class="overlay-content">
                                        <i class="fas fa-search-plus"></i>
                                        <span>Ver imagen</span>
                                    </div>
                                </div>
                            </div>
                            <div class="image-info">
                                <div class="image-name" title="${att.originalname}">
                                    ${att.originalname}
                                </div>
                                <div class="image-actions">
                                    <a href="${att.cloudinary_url || att.url}" 
                                       target="_blank" 
                                       class="btn-icon" 
                                       title="Ver en tamaño completo">
                                        <i class="fas fa-expand"></i>
                                    </a>
                                    <a href="${att.cloudinary_url || att.url}" 
                                       download="${att.originalname}"
                                       class="btn-icon" 
                                       title="Descargar">
                                        <i class="fas fa-download"></i>
                                    </a>
                                </div>
                            </div>
                        </div>
                `;
            });
            
            attachmentsHTML += `
                    </div>
                </div>
            `;
        }
        
        if (otherAttachments.length > 0) {
            attachmentsHTML += `
                <div class="attachments-section attachments-section--files">
                    <h4 class="attachments-section-title">
                        <i class="fas fa-file-alt"></i>
                        Documentos (${otherAttachments.length})
                    </h4>
                    <div class="attachments-list-files">
            `;
            
            otherAttachments.forEach(att => {
                attachmentsHTML += `
                        <div class="attachment-file-item">
                            <div class="file-icon">
                                <i class="${this.getFileIcon(att.mimetype || 'application/octet-stream')}"></i>
                            </div>
                            <div class="file-details">
                                <div class="file-name" title="${att.originalname}">
                                    ${att.originalname}
                                </div>
                                <div class="file-meta">
                                    <span class="file-size">${this.formatFileSize(att.size)}</span>
                                    <span class="file-type">${(att.mimetype || '').split('/').pop().toUpperCase()}</span>
                                </div>
                            </div>
                            <div class="file-actions">
                                <a href="${att.cloudinary_url || att.url}" 
                                   target="_blank" 
                                   class="btn btn--outline btn--xs" 
                                   title="Ver archivo">
                                    <i class="fas fa-eye"></i>
                                </a>
                                <a href="${att.cloudinary_url || att.url}" 
                                   download="${att.originalname}"
                                   class="btn btn--outline btn--xs" 
                                   title="Descargar">
                                    <i class="fas fa-download"></i>
                                </a>
                            </div>
                        </div>
                `;
            });
            
            attachmentsHTML += `
                    </div>
                </div>
            `;
        }
        
        container.innerHTML = attachmentsHTML;
        
        if (imageAttachments.length > 0) {
            this.initImageGallery(imageAttachments);
        }
    }

    renderTicketUpdates(updates) {
        const container = DOM.ticketUpdatesList;
        if (!container) return;
        
        if (!updates || updates.length === 0) {
            container.innerHTML = `
                <div class="no-updates">
                    <i class="fas fa-comments"></i>
                    <p>No hay actualizaciones en este ticket</p>
                </div>
            `;
            return;
        }
        
        const updatesHTML = updates.map(update => `
            <div class="update-item ${update.internalNote ? 'internal-note' : ''} ${update.type || ''}">
                <div class="update-header">
                    <div class="update-user-info">
                        <div class="update-user">
                            <i class="fas fa-user-circle"></i>
                            <span class="user-name">${update.userName || 'Sistema'}</span>
                            ${update.userRole ? `<span class="user-role">${update.userRole}</span>` : ''}
                        </div>
                        <div class="update-type">
                            ${update.internalNote ? '<i class="fas fa-lock"></i> Interna' : ''}
                            ${update.type === 'system' ? '<i class="fas fa-robot"></i> Sistema' : ''}
                        </div>
                    </div>
                    <div class="update-meta">
                        <span class="update-date">${formatDate(update.createdAt)}</span>
                        <span class="update-time">${this.formatTime(update.createdAt)}</span>
                    </div>
                </div>
                <div class="update-content">
                    <div class="update-message">${update.message}</div>
                    ${update.statusChange ? `
                        <div class="update-status-change">
                            <i class="fas fa-exchange-alt"></i>
                            Estado cambiado de 
                            <span class="status-from">${this.getStatusName(update.statusChange.from)}</span>
                            a
                            <span class="status-to">${this.getStatusName(update.statusChange.to)}</span>
                        </div>
                    ` : ''}
                </div>
            </div>
        `).join('');
        
        container.innerHTML = updatesHTML;
        
        const updateItems = container.querySelectorAll('.update-item');
        const sortedItems = Array.from(updateItems).sort((a, b) => {
            const dateA = new Date(a.querySelector('.update-date').textContent);
            const dateB = new Date(b.querySelector('.update-date').textContent);
            return dateB - dateA;
        });
        
        container.innerHTML = '';
        sortedItems.forEach(item => container.appendChild(item));
    }

    closeTicketDetailModal() {
        console.log('🔧 SupportModule: Cerrando modal de detalles del ticket');
        
        if (!DOM.ticketDetailModal) {
            console.warn('⚠️ DOM.ticketDetailModal es null en closeTicketDetailModal');
            return;
        }
        
        DOM.ticketDetailModal.style.opacity = '0';
        DOM.ticketDetailModal.style.visibility = 'hidden';
        
        setTimeout(() => {
            DOM.ticketDetailModal.style.display = 'none';
            
            // Limpiar el ticket actual
            this.currentTicket = null;
            
            // Restaurar título de la página
            document.title = 'Soporte - Sistema de Gestión';
            
            console.log('✅ Modal de detalles cerrado');
        }, 300);
        
        document.body.classList.remove('modal-open');
    }

    async submitResponse() {
        try {
            const responseText = DOM.ticketResponseText.value.trim();
            
            if (!responseText) {
                showAlert('Por favor, escribe una respuesta', 'error');
                return;
            }
            
            if (responseText.length < 10) {
                showAlert('La respuesta debe tener al menos 10 caracteres', 'error');
                return;
            }
            
            const response = await api.addTicketResponse(this.currentTicket._id, responseText);
            
            if (response.success) {
                showAlert('Respuesta enviada exitosamente', 'success');
                DOM.ticketResponseText.value = '';
                await this.viewTicketDetails(this.currentTicket._id);
                await this.loadTickets();
            }
            
        } catch (error) {
            console.error('❌ Error enviando respuesta:', error);
            showAlert('Error al enviar respuesta: ' + error.message, 'error');
        }
    }

async closeTicketWithModal() {
    if (!this.currentTicket) {
        showAlert('No hay un ticket seleccionado', 'error');
        return;
    }
    
    console.log('🎫 ========== INICIANDO CIERRE DE TICKET ==========');
    console.log(`Ticket ID: ${this.currentTicket._id}`);
    console.log(`Ticket Number: ${this.currentTicket.ticketNumber}`);
    console.log(`Estado actual: ${this.currentTicket.status}`);
    
    // Confirmación simple
    if (!confirm('¿Estás seguro de que quieres cerrar este ticket?')) {
        console.log('❌ Usuario canceló el cierre');
        return;
    }
    
    // Pedir motivo opcional
    const closeNote = prompt('Motivo del cierre (opcional):\nDeja vacío para usar mensaje predeterminado:', 
                            'Ticket cerrado por el usuario');
    
    // Si presionó Cancel en el prompt, cancelar operación
    if (closeNote === null) {
        console.log('❌ Usuario canceló en el prompt de motivo');
        return;
    }
    
    try {
        console.log(`🔧 Llamando API para cerrar ticket...`);
        
        // Mostrar loading
        const closeBtn = DOM.closeTicketBtn;
        const originalText = closeBtn.innerHTML;
        closeBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Cerrando...';
        closeBtn.disabled = true;
        
        // Verificar URL base
        console.log('🔍 Verificando configuración:');
        console.log('- Token existe:', !!localStorage.getItem('token'));
        console.log('- UserData:', JSON.parse(localStorage.getItem('userData') || '{}'));
        
        // Llamar a la API
        const response = await api.changeTicketStatus(
            this.currentTicket._id, 
            'cerrado', 
            closeNote || 'Ticket cerrado por el usuario'
        );
        
        console.log('✅ Respuesta de la API:', response);
        
        if (response.success) {
            console.log('✅ Ticket cerrado exitosamente en el backend');
            showAlert('✅ Ticket cerrado exitosamente', 'success');
            
            // Actualizar UI inmediatamente
            this.currentTicket.status = 'cerrado';
            
            if (DOM.detailTicketStatus) {
                DOM.detailTicketStatus.textContent = this.getStatusName('cerrado');
                DOM.detailTicketStatus.className = `status-badge status-cerrado`;
            }
            
            // Actualizar botones
            if (DOM.closeTicketBtn) {
                DOM.closeTicketBtn.style.display = 'none';
            }
            if (DOM.reopenTicketBtn) {
                DOM.reopenTicketBtn.style.display = 'inline-block';
            }
            if (DOM.ticketResponseSection) {
                DOM.ticketResponseSection.style.display = 'none';
            }
            
            // Recargar lista
            await this.loadTickets();
            
            console.log('🎫 ========== TICKET CERRADO EXITOSAMENTE ==========');
            
        } else {
            console.error('❌ Error del backend:', response.message);
            showAlert(`Error del servidor: ${response.message}`, 'error');
        }
        
    } catch (error) {
        console.error('❌ Error cerrando ticket:', error);
        console.error('Stack:', error.stack);
        
        // Mostrar mensaje de error específico
        if (error.message.includes('404')) {
            showAlert('Error: El endpoint no existe. Contacta al administrador.', 'error');
        } else if (error.message.includes('403')) {
            showAlert('No tienes permisos para cerrar este ticket.', 'error');
        } else if (error.message.includes('401')) {
            showAlert('Tu sesión ha expirado. Por favor, inicia sesión nuevamente.', 'error');
            // Redirigir al login
            setTimeout(() => {
                window.location.href = '/login.html';
            }, 2000);
        } else {
            showAlert(`Error: ${error.message}`, 'error');
        }
        
    } finally {
        // Restaurar botón
        const closeBtn = DOM.closeTicketBtn;
        if (closeBtn) {
            closeBtn.innerHTML = '<i class="fas fa-lock"></i> Cerrar Ticket';
            closeBtn.disabled = false;
        }
    }
}

    async executeCloseTicket() {
        try {
            console.log(`🔧 Ejecutando cierre del ticket: ${this.currentTicket._id}`);
            
            // Mostrar modal de motivo
            this.showCloseTicketReasonModal();
            
        } catch (error) {
            console.error('❌ Error en proceso de cierre:', error);
            showAlert('Error al procesar el cierre del ticket', 'error');
        }
    }

    showCloseTicketReasonModal() {
        // Crear modal para motivo de cierre
        const modalHTML = `
            <div class="modal" id="closeReasonModal" style="display: flex;">
                <div class="modal__content modal__content--sm">
                    <div class="modal__header">
                        <h2 class="modal__title">
                            <i class="fas fa-comment-alt"></i>
                            Motivo del cierre
                        </h2>
                        <button class="modal__close" id="closeReasonModalBtn">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal__body">
                        <div class="form-group">
                            <label for="closeReason" class="form-label">
                                <i class="fas fa-pen"></i>
                                Explica por qué estás cerrando este ticket:
                            </label>
                            <textarea 
                                id="closeReason" 
                                class="form-control form-control--textarea" 
                                rows="4" 
                                placeholder="Ej: El problema ha sido resuelto, ya no necesito ayuda, etc..."
                                maxlength="500"
                            ></textarea>
                            <div class="form-help">
                                <span id="charCount">0/500 caracteres</span>
                            </div>
                        </div>
                        <div class="form-help">
                            <i class="fas fa-info-circle"></i>
                            Este comentario será visible en el historial del ticket.
                        </div>
                    </div>
                    <div class="modal__footer">
                        <button class="btn btn--outline" id="cancelCloseReasonBtn">
                            <i class="fas fa-times"></i> Cancelar
                        </button>
                        <button class="btn btn--primary" id="submitCloseReasonBtn">
                            <i class="fas fa-check"></i> Cerrar Ticket
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        // Agregar modal al DOM
        const modalContainer = document.createElement('div');
        modalContainer.innerHTML = modalHTML;
        document.body.appendChild(modalContainer.firstElementChild);
        
        const modal = document.getElementById('closeReasonModal');
        const closeReasonTextarea = document.getElementById('closeReason');
        const charCount = document.getElementById('charCount');
        const cancelBtn = document.getElementById('cancelCloseReasonBtn');
        const submitBtn = document.getElementById('submitCloseReasonBtn');
        const closeBtn = document.getElementById('closeReasonModalBtn');
        
        // Contador de caracteres
        closeReasonTextarea.addEventListener('input', () => {
            const length = closeReasonTextarea.value.length;
            charCount.textContent = `${length}/500 caracteres`;
            charCount.style.color = length >= 450 ? '#ff6b6b' : '#666';
        });
        
        // Event listeners
        cancelBtn.addEventListener('click', () => {
            this.removeCloseReasonModal();
        });
        
        closeBtn.addEventListener('click', () => {
            this.removeCloseReasonModal();
        });
        
        submitBtn.addEventListener('click', async () => {
            const reason = closeReasonTextarea.value.trim();
            
            if (!reason) {
                showAlert('Por favor, escribe el motivo del cierre', 'error');
                return;
            }
            
            if (reason.length < 10) {
                showAlert('El motivo debe tener al menos 10 caracteres', 'error');
                return;
            }
            
            // Deshabilitar botón y mostrar loading
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Cerrando...';
            submitBtn.disabled = true;
            
            try {
                // Llamar a la API
                const response = await api.changeTicketStatus(
                    this.currentTicket._id, 
                    'cerrado', 
                    reason || 'Ticket cerrado por el usuario'
                );
                
                if (response.success) {
                    showAlert('Ticket cerrado exitosamente', 'success');
                    
                    // Cerrar modal de motivo
                    this.removeCloseReasonModal();
                    
                    // Actualizar el ticket actual
                    this.currentTicket.status = 'cerrado';
                    
                    // Actualizar la interfaz inmediatamente
                    if (DOM.detailTicketStatus) {
                        DOM.detailTicketStatus.textContent = this.getStatusName('cerrado');
                        DOM.detailTicketStatus.className = `status-badge status-cerrado`;
                    }
                    
                    // Ocultar botón de cerrar y mostrar botón de reabrir
                    if (DOM.closeTicketBtn) {
                        DOM.closeTicketBtn.style.display = 'none';
                    }
                    if (DOM.reopenTicketBtn) {
                        DOM.reopenTicketBtn.style.display = 'inline-block';
                    }
                    if (DOM.ticketResponseSection) {
                        DOM.ticketResponseSection.style.display = 'none';
                    }
                    
                    // Recargar la lista de tickets
                    await this.loadTickets();
                    
                    // Cerrar modal de detalles si está abierto
                    setTimeout(() => {
                        this.closeTicketDetailModal();
                    }, 1000);
                    
                } else {
                    showAlert(response.message || 'Error al cerrar el ticket', 'error');
                    submitBtn.innerHTML = '<i class="fas fa-check"></i> Cerrar Ticket';
                    submitBtn.disabled = false;
                }
                
            } catch (error) {
                console.error('❌ Error cerrando ticket:', error);
                
                // Mensajes de error más específicos
                if (error.message.includes('403') || error.message.includes('Acceso denegado')) {
                    showAlert('No tienes permisos para cerrar este ticket. Contacta al administrador.', 'error');
                } else if (error.message.includes('401')) {
                    showAlert('Tu sesión ha expirado. Por favor, inicia sesión nuevamente.', 'error');
                    // Redirigir al login
                    setTimeout(() => {
                        window.location.href = '/login.html';
                    }, 2000);
                } else {
                    showAlert(`Error al cerrar ticket: ${error.message}`, 'error');
                }
                
                submitBtn.innerHTML = '<i class="fas fa-check"></i> Cerrar Ticket';
                submitBtn.disabled = false;
            }
        });
        
        // Cerrar al hacer clic fuera del modal
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.removeCloseReasonModal();
            }
        });
        
        // Cerrar con tecla Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal.style.display === 'flex') {
                this.removeCloseReasonModal();
            }
        });
        
        // Enfocar el textarea
        setTimeout(() => {
            closeReasonTextarea.focus();
        }, 100);
    }

    removeCloseReasonModal() {
        const modal = document.getElementById('closeReasonModal');
        if (modal) {
            modal.remove();
        }
    }

    async reopenTicketWithModal() {
    if (!this.currentTicket) {
        showAlert('No hay un ticket seleccionado', 'error');
        return;
    }
    
    // Confirmación simple
    if (!confirm('¿Estás seguro de que quieres reabrir este ticket?')) {
        return;
    }
    
    // Pedir motivo opcional
    const reopenNote = prompt('Motivo de reapertura (opcional):\nDeja vacío para usar mensaje predeterminado:', 
                             'Ticket reabierto por el usuario');
    
    // Si presionó Cancel en el prompt, cancelar operación
    if (reopenNote === null) {
        return;
    }
    
    try {
        console.log(`🔧 Reabriendo ticket: ${this.currentTicket._id}`);
        
        // Mostrar loading
        const reopenBtn = DOM.reopenTicketBtn;
        const originalText = reopenBtn.innerHTML;
        reopenBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Reabriendo...';
        reopenBtn.disabled = true;
        
        // Llamar a la API
        const response = await api.changeTicketStatus(
            this.currentTicket._id, 
            'abierto', 
            reopenNote || 'Ticket reabierto por el usuario'
        );
        
        console.log('📥 Respuesta de reapertura:', response);
        
        if (response.success) {
            showAlert('✅ Ticket reabierto exitosamente', 'success');
            
            // Actualizar UI inmediatamente
            this.currentTicket.status = 'abierto';
            
            if (DOM.detailTicketStatus) {
                DOM.detailTicketStatus.textContent = this.getStatusName('abierto');
                DOM.detailTicketStatus.className = `status-badge status-abierto`;
            }
            
            // Actualizar botones
            if (DOM.closeTicketBtn) {
                DOM.closeTicketBtn.style.display = 'inline-block';
            }
            if (DOM.reopenTicketBtn) {
                DOM.reopenTicketBtn.style.display = 'none';
            }
            if (DOM.ticketResponseSection) {
                DOM.ticketResponseSection.style.display = 'block';
            }
            
            // Recargar lista
            await this.loadTickets();
            
        } else {
            showAlert(response.message || 'Error al reabrir el ticket', 'error');
        }
        
    } catch (error) {
        console.error('❌ Error reabriendo ticket:', error);
        showAlert(`Error: ${error.message}`, 'error');
        
    } finally {
        // Restaurar botón
        const reopenBtn = DOM.reopenTicketBtn;
        if (reopenBtn) {
            reopenBtn.innerHTML = '<i class="fas fa-unlock"></i> Reabrir Ticket';
            reopenBtn.disabled = false;
        }
    }
}
    async executeReopenTicket() {
        try {
            console.log(`🔧 Ejecutando reapertura del ticket: ${this.currentTicket._id}`);
            
            // Mostrar modal de motivo
            this.showReopenTicketReasonModal();
            
        } catch (error) {
            console.error('❌ Error en proceso de reapertura:', error);
            showAlert('Error al procesar la reapertura del ticket', 'error');
        }
    }

    showReopenTicketReasonModal() {
        // Crear modal para motivo de reapertura
        const modalHTML = `
            <div class="modal" id="reopenReasonModal" style="display: flex;">
                <div class="modal__content modal__content--sm">
                    <div class="modal__header">
                        <h2 class="modal__title">
                            <i class="fas fa-redo"></i>
                            Motivo de reapertura
                        </h2>
                        <button class="modal__close" id="closeReopenReasonModalBtn">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal__body">
                        <div class="form-group">
                            <label for="reopenReason" class="form-label">
                                <i class="fas fa-pen"></i>
                                Explica por qué estás reabriendo este ticket:
                            </label>
                            <textarea 
                                id="reopenReason" 
                                class="form-control form-control--textarea" 
                                rows="4" 
                                placeholder="Ej: El problema no fue resuelto completamente, tengo una nueva pregunta relacionada, etc..."
                                maxlength="500"
                            ></textarea>
                            <div class="form-help">
                                <span id="reopenCharCount">0/500 caracteres</span>
                            </div>
                        </div>
                        <div class="form-help">
                            <i class="fas fa-info-circle"></i>
                            Este comentario será visible en el historial del ticket.
                        </div>
                    </div>
                    <div class="modal__footer">
                        <button class="btn btn--outline" id="cancelReopenReasonBtn">
                            <i class="fas fa-times"></i> Cancelar
                        </button>
                        <button class="btn btn--primary" id="submitReopenReasonBtn">
                            <i class="fas fa-redo"></i> Reabrir Ticket
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        // Agregar modal al DOM
        const modalContainer = document.createElement('div');
        modalContainer.innerHTML = modalHTML;
        document.body.appendChild(modalContainer.firstElementChild);
        
        const modal = document.getElementById('reopenReasonModal');
        const reopenReasonTextarea = document.getElementById('reopenReason');
        const charCount = document.getElementById('reopenCharCount');
        const cancelBtn = document.getElementById('cancelReopenReasonBtn');
        const submitBtn = document.getElementById('submitReopenReasonBtn');
        const closeBtn = document.getElementById('closeReopenReasonModalBtn');
        
        // Contador de caracteres
        reopenReasonTextarea.addEventListener('input', () => {
            const length = reopenReasonTextarea.value.length;
            charCount.textContent = `${length}/500 caracteres`;
            charCount.style.color = length >= 450 ? '#ff6b6b' : '#666';
        });
        
        // Event listeners
        cancelBtn.addEventListener('click', () => {
            this.removeReopenReasonModal();
        });
        
        closeBtn.addEventListener('click', () => {
            this.removeReopenReasonModal();
        });
        
        submitBtn.addEventListener('click', async () => {
            const reason = reopenReasonTextarea.value.trim();
            
            if (!reason) {
                showAlert('Por favor, escribe el motivo de la reapertura', 'error');
                return;
            }
            
            if (reason.length < 10) {
                showAlert('El motivo debe tener al menos 10 caracteres', 'error');
                return;
            }
            
            // Deshabilitar botón y mostrar loading
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Reabriendo...';
            submitBtn.disabled = true;
            
            try {
                // Llamar a la API
                const response = await api.changeTicketStatus(
                    this.currentTicket._id, 
                    'abierto', 
                    reason || 'Ticket reabierto por el usuario'
                );
                
                if (response.success) {
                    showAlert('Ticket reabierto exitosamente', 'success');
                    
                    // Cerrar modal de motivo
                    this.removeReopenReasonModal();
                    
                    // Actualizar el ticket actual
                    this.currentTicket.status = 'abierto';
                    
                    // Actualizar la interfaz inmediatamente
                    if (DOM.detailTicketStatus) {
                        DOM.detailTicketStatus.textContent = this.getStatusName('abierto');
                        DOM.detailTicketStatus.className = `status-badge status-abierto`;
                    }
                    
                    // Mostrar botón de cerrar y ocultar botón de reabrir
                    if (DOM.closeTicketBtn) {
                        DOM.closeTicketBtn.style.display = 'inline-block';
                    }
                    if (DOM.reopenTicketBtn) {
                        DOM.reopenTicketBtn.style.display = 'none';
                    }
                    if (DOM.ticketResponseSection) {
                        DOM.ticketResponseSection.style.display = 'block';
                    }
                    
                    // Recargar la lista de tickets
                    await this.loadTickets();
                    
                } else {
                    showAlert(response.message || 'Error al reabrir el ticket', 'error');
                    submitBtn.innerHTML = '<i class="fas fa-redo"></i> Reabrir Ticket';
                    submitBtn.disabled = false;
                }
                
            } catch (error) {
                console.error('❌ Error reabriendo ticket:', error);
                
                if (error.message.includes('403') || error.message.includes('Acceso denegado')) {
                    showAlert('No tienes permisos para reabrir este ticket. Contacta al administrador.', 'error');
                } else {
                    showAlert(`Error al reabrir ticket: ${error.message}`, 'error');
                }
                
                submitBtn.innerHTML = '<i class="fas fa-redo"></i> Reabrir Ticket';
                submitBtn.disabled = false;
            }
        });
        
        // Cerrar al hacer clic fuera del modal
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.removeReopenReasonModal();
            }
        });
        
        // Cerrar con tecla Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal.style.display === 'flex') {
                this.removeReopenReasonModal();
            }
        });
        
        // Enfocar el textarea
        setTimeout(() => {
            reopenReasonTextarea.focus();
        }, 100);
    }

    removeReopenReasonModal() {
        const modal = document.getElementById('reopenReasonModal');
        if (modal) {
            modal.remove();
        }
    }

    getCategoryName(category) {
        const categories = {
            'tecnico': 'Problema Técnico',
            'uso': 'Uso del Sistema',
            'documentos': 'Gestión de Documentos',
            'personas': 'Gestión de Personas',
            'reportes': 'Reportes',
            'seguridad': 'Seguridad',
            'otros': 'Otros',
            'soporte': 'Soporte',
            'bug': 'Reporte de Bug',
            'mejora': 'Sugerencia de Mejora'
        };
        return categories[category] || category;
    }

    getStatusName(status) {
        const statuses = {
            'abierto': 'Abierto',
            'en_proceso': 'En Proceso',
            'cerrado': 'Cerrado',
            'esperando_respuesta': 'Esperando Respuesta',
            'resuelto': 'Resuelto',
            'pendiente': 'Pendiente'
        };
        return statuses[status] || status;
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    getTimeAgo(date) {
        const now = new Date();
        const then = new Date(date);
        const diffMs = now - then;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);
        
        if (diffMins < 1) return 'ahora';
        if (diffMins < 60) return `hace ${diffMins} min`;
        if (diffHours < 24) return `hace ${diffHours} h`;
        if (diffDays < 7) return `hace ${diffDays} d`;
        return formatDate(date);
    }

    formatTime(date) {
        const d = new Date(date);
        return d.toLocaleTimeString('es-ES', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    }

    sendTicketNotification(ticketData) {
        console.log('📢 Notificación de ticket creado:', ticketData);
        
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('Ticket Creado', {
                body: `Ticket "${ticketData.subject}" creado exitosamente`,
                icon: '/assets/icons/notification.png'
            });
        }
    }

    initImageGallery(images) {
        console.log('🔧 Inicializando galería de imágenes:', images.length);
        
        document.querySelectorAll('.attachment-image-item').forEach((item, index) => {
            item.addEventListener('click', () => {
                this.openImageLightbox(
                    images[index].cloudinary_url || images[index].url,
                    images[index].originalname
                );
            });
        });
    }

    searchGuide(query) {
        if (!query.trim()) return;
        
        console.log(`🔍 Buscando en guía: "${query}"`);
        
        const results = [];
        
        Object.entries(this.guideData).forEach(([section, data]) => {
            const searchText = JSON.stringify(data).toLowerCase();
            const queryLower = query.toLowerCase();
            
            if (searchText.includes(queryLower)) {
                results.push({
                    section,
                    title: data.title,
                    description: data.description,
                    relevance: this.calculateRelevance(data, queryLower)
                });
            }
        });
        
        results.sort((a, b) => b.relevance - a.relevance);
        
        this.displaySearchResults(results, query);
    }

    calculateRelevance(guideData, query) {
        let relevance = 0;
        const text = JSON.stringify(guideData).toLowerCase();
        
        if (guideData.title.toLowerCase().includes(query)) relevance += 10;
        
        if (guideData.description.toLowerCase().includes(query)) relevance += 5;
        
        guideData.steps.forEach(step => {
            if (step.title.toLowerCase().includes(query)) relevance += 3;
            if (step.description.toLowerCase().includes(query)) relevance += 2;
        });
        
        guideData.features.forEach(feature => {
            if (feature.title.toLowerCase().includes(query)) relevance += 2;
            if (feature.desc.toLowerCase().includes(query)) relevance += 1;
        });
        
        guideData.tips?.forEach(tip => {
            if (tip.toLowerCase().includes(query)) relevance += 1;
        });
        
        return relevance;
    }

    displaySearchResults(results, query) {
        const modal = document.getElementById('guideSearchModal');
        if (!modal) return;
        
        if (results.length === 0) {
            this.showNoResultsModal(query);
            return;
        }
        
        const resultsHTML = results.map(result => `
            <div class="search-result-item" data-section="${result.section}">
                <div class="result-icon">
                    <i class="fas fa-${this.guideData[result.section].icon}"></i>
                </div>
                <div class="result-content">
                    <h4 class="result-title">${result.title}</h4>
                    <p class="result-description">${result.description}</p>
                    <div class="result-meta">
                        <span class="result-relevance">Relevancia: ${result.relevance}%</span>
                        <span class="result-section">${this.getCategoryName(result.section)}</span>
                    </div>
                </div>
                <button class="btn btn--outline btn--sm goto-section" 
                        data-section="${result.section}">
                    Ver
                </button>
            </div>
        `).join('');
        
        modal.querySelector('.search-results-list').innerHTML = resultsHTML;
        modal.style.display = 'flex';
        
        modal.querySelectorAll('.goto-section').forEach(btn => {
            btn.addEventListener('click', () => {
                const section = btn.dataset.section;
                this.closeGuideModal();
                this.openGuideModal(section);
                modal.style.display = 'none';
            });
        });
    }

    showNoResultsModal(query) {
        console.log(`🔍 No hay resultados para: "${query}"`);
        showAlert(`No se encontraron resultados para "${query}"`, 'info');
    }

    // Método para verificar permisos del usuario
    async checkUserPermissions() {
        try {
            const userData = JSON.parse(localStorage.getItem('userData') || '{}');
            const token = localStorage.getItem('token');
            
            if (!token || !userData._id) {
                return {
                    canCloseTickets: false,
                    canReopenTickets: false,
                    isAdmin: false,
                    isSupport: false
                };
            }
            
            // Verificar rol del usuario
            const isAdmin = userData.role === 'admin' || userData.role === 'administrador';
            const isSupport = userData.role === 'support' || userData.role === 'soporte';
            const isRegularUser = !isAdmin && !isSupport;
            
            // Lógica de permisos:
            // - Admins y soporte pueden cerrar/reabrir cualquier ticket
            // - Usuarios regulares solo pueden cerrar/reabrir sus propios tickets
            return {
                canCloseTickets: isAdmin || isSupport || isRegularUser, // Temporalmente todos pueden
                canReopenTickets: isAdmin || isSupport || isRegularUser, // Temporalmente todos pueden
                isAdmin,
                isSupport,
                isRegularUser,
                userId: userData._id
            };
            
        } catch (error) {
            console.error('❌ Error verificando permisos:', error);
            return {
                canCloseTickets: false,
                canReopenTickets: false,
                isAdmin: false,
                isSupport: false
            };
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 DOM cargado, inicializando SupportModule');
    
    const requiredElements = ['guideModal', 'ticketModal'];
    const missingElements = requiredElements.filter(id => !document.getElementById(id));
    
    if (missingElements.length > 0) {
        console.warn('⚠️ Elementos faltantes en el DOM:', missingElements);
    }
    
    window.supportModule = new SupportModule();
    console.log('✅ SupportModule listo');
    
    console.log('🔍 Verificando elementos del DOM:');
    console.log('- #guideModal:', document.getElementById('guideModal') ? '✅' : '❌');
    console.log('- #ticketModal:', document.getElementById('ticketModal') ? '✅' : '❌');
    console.log('- #guideContent:', document.getElementById('guideContent') ? '✅' : '❌');
    console.log('- .guide-nav-item:', document.querySelectorAll('.guide-nav-item').length);
    console.log('- .guide-view-btn:', document.querySelectorAll('.guide-view-btn').length);
});

export default SupportModule;