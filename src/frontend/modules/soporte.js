import { api } from '../services/api.js';
import { showAlert, formatDate, showConfirmModal } from '../utils.js';
import { DOM } from '../dom.js';
import SystemStatusModule from './systemStatus.js';

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

initSystemStatus() {
    if (document.querySelector('.system-status')) {
        console.log('🔧 Inicializando módulo de estado del sistema REAL');
        
        // Esperar un momento para asegurar que el DOM esté completamente listo
        setTimeout(() => {
            try {
                this.systemStatusModule = new SystemStatusModule();
                
                // Configurar validación automática cada 2 minutos
                setInterval(() => {
                    if (this.systemStatusModule && this.systemStatusModule.systemStatus) {
                        this.systemStatusModule.validateStatusConsistency(
                            this.systemStatusModule.systemStatus
                        );
                    }
                }, 120000); // 2 minutos
                
                console.log('✅ Módulo de estado REAL inicializado correctamente');
            } catch (error) {
                console.error('❌ Error inicializando módulo de estado REAL:', error);
                
                // Mostrar error en la interfaz
                const statusContainer = document.querySelector('.system-status');
                if (statusContainer) {
                    statusContainer.innerHTML = `
                        <div class="status-error">
                            <i class="fas fa-exclamation-triangle"></i>
                            <div class="error-message">
                                <strong>Error inicializando estado del sistema</strong>
                                <small>${error.message}</small>
                            </div>
                        </div>
                    `;
                }
            }
        }, 100);
    }
}

    async init() {
        console.log('🔧 SupportModule: Inicializando módulo');
        this.setupEventListeners();
        await this.loadFAQ();
        this.setupGuideListeners();
        this.initSystemStatus();
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
                showAlert('✅ Ticket creado exitosamente. Recibirás una confirmación por email.', 'success');
                this.closeTicketModal();
                
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

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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