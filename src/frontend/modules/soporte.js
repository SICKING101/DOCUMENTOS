import { api } from '../services/api.js';
import { showAlert, formatDate } from '../utils.js';
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
                title: 'Dashboard - Panel de Control Principal',
                icon: 'tachometer-alt',
                description: 'El dashboard es el centro de control desde donde puedes monitorear todas las actividades del sistema.',
                overview: 'Desde aquí puedes ver estadísticas en tiempo real, accesos rápidos a las funciones más utilizadas, y un resumen completo de la actividad del sistema.',
                steps: [
                    {
                        title: 'Widgets Personalizables',
                        description: 'Arrastra y suelta los widgets para organizar tu dashboard según tus necesidades.'
                    },
                    {
                        title: 'Estadísticas en Tiempo Real',
                        description: 'Monitorea métricas clave como usuarios activos, documentos subidos, tareas pendientes, etc.'
                    },
                    {
                        title: 'Accesos Rápidos',
                        description: 'Accede rápidamente a las funciones más utilizadas con los botones de acceso directo.'
                    },
                    {
                        title: 'Gráficos Interactivos',
                        description: 'Visualiza datos importantes a través de gráficos que puedes filtrar por fecha y categoría.'
                    }
                ],
                tips: [
                    'Puedes personalizar qué widgets ver en el dashboard desde la configuración.',
                    'Haz clic en cualquier gráfico para ver detalles más específicos.',
                    'Usa el botón de actualización para obtener datos en tiempo real.'
                ],
                features: [
                    { title: 'Resumen General', desc: 'Vista completa del estado del sistema' },
                    { title: 'Actividad Reciente', desc: 'Últimas acciones realizadas' },
                    { title: 'Métricas Clave', desc: 'KPIs importantes del negocio' },
                    { title: 'Notificaciones', desc: 'Alertas y recordatorios importantes' }
                ],
                videoUrl: null,
                imageUrl: '/assets/images/guides/dashboard-guide.png'
            },
            personas: {
                title: 'Gestión de Personas',
                icon: 'users',
                description: 'Administra usuarios, roles, permisos y toda la información del personal.',
                overview: 'Este módulo te permite gestionar todos los aspectos relacionados con las personas en el sistema, desde creación de usuarios hasta asignación de roles y permisos.',
                steps: [
                    {
                        title: 'Crear Nuevo Usuario',
                        description: 'Agrega nuevos usuarios al sistema completando el formulario de registro.'
                    },
                    {
                        title: 'Asignar Roles y Permisos',
                        description: 'Define qué puede hacer cada usuario asignando roles específicos.'
                    },
                    {
                        title: 'Gestionar Departamentos',
                        description: 'Organiza a los usuarios en departamentos para mejor administración.'
                    },
                    {
                        title: 'Historial de Accesos',
                        description: 'Revisa quién ha accedido al sistema y cuándo.'
                    }
                ],
                tips: [
                    'Usa la función de importación masiva para agregar múltiples usuarios a la vez.',
                    'Asigna permisos granulares para control exacto de las funcionalidades.',
                    'Configura notificaciones automáticas para nuevos usuarios.'
                ],
                features: [
                    { title: 'Gestión de Usuarios', desc: 'CRUD completo de usuarios' },
                    { title: 'Control de Roles', desc: 'Sistema de roles y permisos' },
                    { title: 'Perfiles Completos', desc: 'Información detallada de cada persona' },
                    { title: 'Importación Masiva', desc: 'Carga múltiples usuarios desde Excel' }
                ],
                videoUrl: null,
                imageUrl: '/assets/images/guides/users-guide.png'
            },
            documentos: {
                title: 'Gestión Documental',
                icon: 'folder-open',
                description: 'Sistema completo para subir, organizar y compartir documentos.',
                overview: 'Centraliza toda la documentación de tu organización en un solo lugar. Sube, categoriza, comparte y controla versiones de documentos importantes.',
                steps: [
                    {
                        title: 'Subir Documentos',
                        description: 'Arrastra y suelta archivos o usa el botón de subida para agregar documentos.'
                    },
                    {
                        title: 'Organizar en Carpetas',
                        description: 'Crea estructuras de carpetas para mantener los documentos organizados.'
                    },
                    {
                        title: 'Compartir con Usuarios',
                        description: 'Comparte documentos específicos con usuarios o departamentos.'
                    },
                    {
                        title: 'Control de Versiones',
                        description: 'Mantén un historial de cambios en cada documento.'
                    }
                ],
                tips: [
                    'Usa etiquetas para facilitar la búsqueda de documentos.',
                    'Configura permisos de carpeta para controlar el acceso.',
                    'Habilita notificaciones para cambios importantes en documentos.'
                ],
                features: [
                    { title: 'Subida Múltiple', desc: 'Sube varios archivos a la vez' },
                    { title: 'Búsqueda Avanzada', desc: 'Encuentra documentos por nombre, contenido o etiquetas' },
                    { title: 'Compartir Seguro', desc: 'Comparte con permisos específicos' },
                    { title: 'Historial de Cambios', desc: 'Seguimiento completo de modificaciones' }
                ],
                videoUrl: null,
                imageUrl: '/assets/images/guides/documents-guide.png'
            },
            tareas: {
                title: '',
                icon: '',
                description: '',
                overview: '',
                steps: [],
                tips: [],
                features: [],
                videoUrl: null,
                imageUrl: ''
            },
            historial: {
                title: '',
                icon: '',
                description: '',
                overview: '',
                steps: [],
                tips: [],
                features: [],
                videoUrl: null,
                imageUrl: ''
            },
            calendario: {
                title: '',
                icon: '',
                description: '',
                overview: '',
                steps: [],
                tips: [],
                features: [],
                videoUrl: null,
                imageUrl: ''
            },
            ajustes: {
                title: '',
                icon: '',
                description: '',
                overview: '',
                steps: [],
                tips: [],
                features: [],
                videoUrl: null,
                imageUrl: ''
            },
            reportes: {
                title: '',
                icon: '',
                description: '',
                overview: '',
                steps: [],
                tips: [],
                features: [],
                videoUrl: null,
                imageUrl: ''
            },
            admin: {
                title: '',
                icon: '',
                description: '',
                overview: '',
                steps: [],
                tips: [],
                features: [],
                videoUrl: null,
                imageUrl: ''
            },
            'modo-oscuro': {
                title: '',
                icon: '',
                description: '',
                overview: '',
                steps: [],
                tips: [],
                features: [],
                videoUrl: null,
                imageUrl: ''
            },
            papelera: {
                title: '',
                icon: '',
                description: '',
                overview: '',
                steps: [],
                tips: [],
                features: [],
                videoUrl: null,
                imageUrl: ''
            },
            notificaciones: {
                title: '',
                icon: '',
                description: '',
                overview: '',
                steps: [],
                tips: [],
                features: [],
                videoUrl: null,
                imageUrl: ''
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
    
    // AQUÍ ESTÁ EL CAMBIO PRINCIPAL:
    // 1. Cerrar modal con el botón de la X (×)
    if (DOM.closeTicketModal) {
        DOM.closeTicketModal.addEventListener('click', () => this.closeTicketModal());
    }
    
    // 2. Cerrar modal con el botón "Cancelar"
    if (DOM.cancelTicketBtn) {
        DOM.cancelTicketBtn.addEventListener('click', () => this.closeTicketModal());
    }
    
    if (DOM.submitTicketBtn) {
        DOM.submitTicketBtn.addEventListener('click', () => this.submitTicket());
    }
    
    // 3. Cerrar modal de DETALLES del ticket (este es diferente)
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
        DOM.closeTicketBtn.addEventListener('click', () => this.closeTicket());
    }
    
    if (DOM.reopenTicketBtn) {
        DOM.reopenTicketBtn.addEventListener('click', () => this.reopenTicket());
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
                
                this.renderTicketDetails(response.ticket);
                
                DOM.ticketDetailModal.style.display = 'flex';
                setTimeout(() => {
                    DOM.ticketDetailModal.style.opacity = '1';
                    DOM.ticketDetailModal.style.visibility = 'visible';
                }, 10);
                
                document.body.classList.add('modal-open');
            }
        } catch (error) {
            console.error('❌ Error cargando detalles del ticket:', error);
            showAlert('Error al cargar detalles del ticket', 'error');
        }
    }

    renderTicketDetails(ticket) {
        DOM.detailTicketSubject.textContent = ticket.subject;
        DOM.detailTicketId.textContent = ticket.ticketNumber;
        DOM.detailTicketDate.textContent = formatDate(ticket.createdAt);
        
        DOM.detailTicketStatus.textContent = this.getStatusName(ticket.status);
        DOM.detailTicketStatus.className = `status-badge status-${ticket.status}`;
        DOM.detailTicketPriority.textContent = ticket.priority.toUpperCase();
        DOM.detailTicketPriority.className = `priority-badge priority-${ticket.priority}`;
        
        DOM.detailTicketDescription.textContent = ticket.description;
        
        this.renderTicketAttachments(ticket.attachments);
        
        this.renderTicketUpdates(ticket.updates);
        
        if (ticket.dueDate) {
            const dueDateElement = document.createElement('div');
            dueDateElement.className = 'ticket-due-date';
            dueDateElement.innerHTML = `
                <i class="fas fa-calendar-day"></i>
                <span>Vence: ${formatDate(ticket.dueDate)}</span>
            `;
            DOM.detailTicketStatus.parentNode.appendChild(dueDateElement);
        }
        
        if (ticket.status === 'cerrado') {
            DOM.closeTicketBtn.style.display = 'none';
            DOM.reopenTicketBtn.style.display = 'inline-block';
            DOM.ticketResponseSection.style.display = 'none';
        } else {
            DOM.closeTicketBtn.style.display = 'inline-block';
            DOM.reopenTicketBtn.style.display = 'none';
            DOM.ticketResponseSection.style.display = 'block';
        }
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
        DOM.ticketDetailModal.style.opacity = '0';
        DOM.ticketDetailModal.style.visibility = 'hidden';
        setTimeout(() => {
            DOM.ticketDetailModal.style.display = 'none';
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

    async closeTicket() {
        if (!confirm('¿Estás seguro de que quieres cerrar este ticket?')) return;
        
        try {
            const response = await api.changeTicketStatus(
                this.currentTicket._id, 
                'cerrado', 
                'Ticket cerrado por el usuario'
            );
            
            if (response.success) {
                showAlert('Ticket cerrado exitosamente', 'success');
                this.closeTicketDetailModal();
                await this.loadTickets();
            }
            
        } catch (error) {
            console.error('❌ Error cerrando ticket:', error);
            showAlert('Error al cerrar ticket: ' + error.message, 'error');
        }
    }

    async reopenTicket() {
        try {
            const response = await api.changeTicketStatus(
                this.currentTicket._id, 
                'abierto', 
                'Ticket reabierto por el usuario'
            );
            
            if (response.success) {
                showAlert('Ticket reabierto exitosamente', 'success');
                this.closeTicketDetailModal();
                await this.loadTickets();
            }
            
        } catch (error) {
            console.error('❌ Error reabriendo ticket:', error);
            showAlert('Error al reabrir ticket: ' + error.message, 'error');
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