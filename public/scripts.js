// =============================================================================
// CONFIGURACIÓN DE LA APLICACIÓN
// =============================================================================
const CONFIG = {
    API_BASE_URL: 'http://localhost:4000/api',
    CLOUDINARY_CLOUD_NAME: 'dn9ts84q6',
    CLOUDINARY_API_KEY: '797652563747974',
    CLOUDINARY_UPLOAD_PRESET: 'DOCUMENTOS',
    MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
    ALLOWED_FILE_TYPES: ['pdf', 'doc', 'docx', 'txt', 'jpg', 'jpeg', 'png']
};

// =============================================================================
// ESTADO DE LA APLICACIÓN
// =============================================================================
class AppState {
    constructor() {
        this.persons = [];
        this.documents = [];
        this.categories = [];
        this.dashboardStats = {
            totalPersonas: 0,
            totalDocumentos: 0,
            proximosVencer: 0,
            totalCategorias: 0
        };
        this.currentTab = 'dashboard';
        this.selectedFile = null;
        this.isLoading = false;
        this.filters = {
            category: '',
            type: '',
            date: ''
        };
    }

    logState() {
        console.group('App State');
        console.log('Persons:', this.persons);
        console.log('Documents:', this.documents);
        console.log('Dashboard Stats:', this.dashboardStats);
        console.log('Current Tab:', this.currentTab);
        console.log('Selected File:', this.selectedFile);
        console.log('Filters:', this.filters);
        console.groupEnd();
    }
}

// =============================================================================
// ELEMENTOS DOM
// =============================================================================
const DOM = {
    // Header
    headerTitle: document.querySelector('.header__title'),
    
    // Navigation
    navLinks: document.querySelectorAll('.header__nav-link'),
    
    // Main Content
    tabContents: document.querySelectorAll('.tab-content'),
    
    // Dashboard Elements
    statsCards: {
        totalPersonas: document.getElementById('totalPersonas'),
        totalDocumentos: document.getElementById('totalDocumentos'),
        proximosVencer: document.getElementById('proximosVencer'),
        totalCategorias: document.getElementById('totalCategorias')
    },
    refreshDashboard: document.getElementById('refreshDashboard'),
    recentDocuments: document.getElementById('recentDocuments'),
    addFirstDocument: document.getElementById('addFirstDocument'),
    
    // Quick Actions
    quickActions: document.querySelectorAll('.action-card'),
    
    // Personas Elements
    personasTableBody: document.getElementById('personasTableBody'),
    addPersonBtn: document.getElementById('addPersonBtn'),
    
    // Documentos Elements
    documentosTableBody: document.getElementById('documentosTableBody'),
    addDocumentBtn: document.getElementById('addDocumentBtn'),
    
    // Filter Elements
    filterCategory: document.getElementById('filterCategory'),
    filterType: document.getElementById('filterType'),
    filterDate: document.getElementById('filterDate'),
    
    // Modal Elements
    personModal: document.getElementById('personModal'),
    documentModal: document.getElementById('documentModal'),
    
    // Form Elements - Personas
    personForm: document.getElementById('personForm'),
    personId: document.getElementById('personId'),
    personName: document.getElementById('personName'),
    personEmail: document.getElementById('personEmail'),
    personPhone: document.getElementById('personPhone'),
    personDepartment: document.getElementById('personDepartment'),
    personPosition: document.getElementById('personPosition'),
    savePersonBtn: document.getElementById('savePersonBtn'),
    cancelPersonBtn: document.getElementById('cancelPersonBtn'),
    personModalTitle: document.getElementById('personModalTitle'),
    
    // Form Elements - Documentos
    documentForm: document.getElementById('documentForm'),
    fileUploadContainer: document.getElementById('fileUploadContainer'),
    browseFilesBtn: document.getElementById('browseFilesBtn'),
    fileInput: document.getElementById('fileInput'),
    fileInfo: document.getElementById('fileInfo'),
    fileName: document.getElementById('fileName'),
    fileSize: document.getElementById('fileSize'),
    documentDescription: document.getElementById('documentDescription'),
    documentCategory: document.getElementById('documentCategory'),
    documentExpiration: document.getElementById('documentExpiration'),
    documentPerson: document.getElementById('documentPerson'),
    uploadDocumentBtn: document.getElementById('uploadDocumentBtn'),
    cancelDocumentBtn: document.getElementById('cancelDocumentBtn'),
    
    // Alert Container
    alertContainer: document.getElementById('alertContainer'),
    
    // Modal Close Buttons
    modalCloseButtons: document.querySelectorAll('.modal__close')
};

// =============================================================================
// INICIALIZACIÓN DE LA APLICACIÓN
// =============================================================================
const appState = new AppState();

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Inicializando Sistema de Gestión de Documentos - CBTIS051');
    console.log('📡 URL de la API:', CONFIG.API_BASE_URL);
    
    initializeApp();
    setupEventListeners();
    loadInitialData();
});

// =============================================================================
// FUNCIONES DE INICIALIZACIÓN
// =============================================================================
function initializeApp() {
    // Verificar que todos los elementos DOM estén disponibles
    const missingElements = Object.keys(DOM).filter(key => {
        if (Array.isArray(DOM[key])) {
            return DOM[key].length === 0;
        }
        return DOM[key] === null;
    });
    
    if (missingElements.length > 0) {
        console.warn('⚠️ Elementos DOM faltantes:', missingElements);
    }
    
    // Mostrar estado inicial
    appState.logState();
}

function setupEventListeners() {
    console.log('🔧 Configurando event listeners...');
    
    // Navegación entre pestañas
    DOM.navLinks.forEach(link => {
        link.addEventListener('click', handleTabNavigation);
    });
    
    // Dashboard
    DOM.refreshDashboard?.addEventListener('click', handleRefreshDashboard);
    DOM.addFirstDocument?.addEventListener('click', () => openDocumentModal());
    
    // Quick Actions
    DOM.quickActions.forEach(action => {
        action.addEventListener('click', handleQuickAction);
    });
    
    // Personas
    DOM.addPersonBtn?.addEventListener('click', () => openPersonModal());
    DOM.savePersonBtn?.addEventListener('click', handleSavePerson);
    DOM.cancelPersonBtn?.addEventListener('click', () => closePersonModal());
    
    // Documentos
    DOM.addDocumentBtn?.addEventListener('click', () => openDocumentModal());
    DOM.browseFilesBtn?.addEventListener('click', () => DOM.fileInput?.click());
    DOM.fileInput?.addEventListener('change', handleFileSelect);
    DOM.uploadDocumentBtn?.addEventListener('click', handleUploadDocument);
    DOM.cancelDocumentBtn?.addEventListener('click', () => closeDocumentModal());
    
    // Filtros
    DOM.filterCategory?.addEventListener('change', handleFilterChange);
    DOM.filterType?.addEventListener('change', handleFilterChange);
    DOM.filterDate?.addEventListener('change', handleFilterChange);
    
    // Drag and Drop
    setupFileDragAndDrop();
    
    // Modal Close Buttons
    DOM.modalCloseButtons.forEach(btn => {
        btn.addEventListener('click', handleModalClose);
    });
    
    // Cerrar modales al hacer clic fuera
    setupModalBackdropClose();
    
    console.log('✅ Event listeners configurados correctamente');
}

// =============================================================================
// MANEJADORES DE EVENTOS PRINCIPALES
// =============================================================================
function handleTabNavigation(e) {
    e.preventDefault();
    const tabId = this.getAttribute('data-tab');
    console.log(`📂 Cambiando a pestaña: ${tabId}`);
    switchTab(tabId);
}

function handleRefreshDashboard() {
    console.log('🔄 Actualizando dashboard...');
    loadDashboardData();
}

function handleQuickAction(e) {
    const action = this.querySelector('.action-card__title')?.textContent;
    console.log(`⚡ Acción rápida: ${action}`);
    
    switch(action) {
        case 'Subir Documento':
            openDocumentModal();
            break;
        case 'Agregar Persona':
            openPersonModal();
            break;
        case 'Generar Reporte':
            generateReport();
            break;
        case 'Búsqueda Avanzada':
            showAdvancedSearch();
            break;
        default:
            console.warn('Acción no reconocida:', action);
    }
}

function handleSavePerson() {
    console.log('💾 Guardando persona...');
    savePerson();
}

function handleUploadDocument() {
    console.log('📤 Subiendo documento...');
    uploadDocument();
}

function handleFileSelect(e) {
    console.log('📁 Archivo seleccionado:', e.target.files[0]?.name);
    handleFile(e.target.files[0]);
}

function handleFilterChange() {
    const filterType = this.id.replace('filter', '').toLowerCase();
    const value = this.value;
    
    console.log(`🔍 Filtro ${filterType} cambiado a: ${value}`);
    appState.filters[filterType] = value;
    applyFilters();
}

function handleModalClose() {
    const modal = this.closest('.modal');
    if (modal) {
        if (modal.id === 'personModal') {
            closePersonModal();
        } else if (modal.id === 'documentModal') {
            closeDocumentModal();
        }
    }
}

// =============================================================================
// FUNCIONES DE NAVEGACIÓN Y UI
// =============================================================================
function switchTab(tabId) {
    // Validar tabId
    const validTabs = ['dashboard', 'personas', 'documentos', 'categorias'];
    if (!validTabs.includes(tabId)) {
        console.error('❌ Pestaña no válida:', tabId);
        return;
    }
    
    // Actualizar navegación
    DOM.navLinks.forEach(link => {
        const isActive = link.getAttribute('data-tab') === tabId;
        link.classList.toggle('header__nav-link--active', isActive);
    });
    
    // Mostrar contenido de pestaña seleccionada
    DOM.tabContents.forEach(tab => {
        const isActive = tab.id === tabId;
        tab.classList.toggle('tab-content--active', isActive);
    });
    
    appState.currentTab = tabId;
    console.log(`✅ Pestaña cambiada a: ${tabId}`);
    
    // Cargar datos específicos de la pestaña
    loadTabSpecificData(tabId);
}

function loadTabSpecificData(tabId) {
    switch(tabId) {
        case 'personas':
            loadPersons();
            break;
        case 'documentos':
            loadDocuments();
            break;
        case 'categorias':
            loadCategories();
            break;
        case 'dashboard':
            // El dashboard ya se carga por defecto
            break;
    }
}

// =============================================================================
// FUNCIONES DE CARGA DE DATOS
// =============================================================================
async function loadInitialData() {
    console.log('📥 Cargando datos iniciales...');
    
    try {
        await Promise.all([
            loadDashboardData(),
            loadPersons(),
            loadDocuments()
        ]);
        
        console.log('✅ Datos iniciales cargados correctamente');
        showAlert('Sistema cargado correctamente', 'success');
    } catch (error) {
        console.error('❌ Error cargando datos iniciales:', error);
        showAlert('Error al cargar datos iniciales', 'error');
    }
}

async function loadDashboardData() {
    if (appState.isLoading) return;
    
    try {
        setLoadingState(true);
        console.log('📊 Cargando datos del dashboard...');
        
        const data = await apiCall('/dashboard');
        
        if (data.success) {
            appState.dashboardStats = data.stats;
            updateDashboardStats();
            loadRecentDocuments(data.recent_documents || []);
            console.log('✅ Dashboard actualizado correctamente');
            showAlert('Dashboard actualizado', 'success');
        } else {
            throw new Error(data.message);
        }
        
    } catch (error) {
        console.error('❌ Error cargando dashboard:', error);
        showAlert('Error al cargar el dashboard: ' + error.message, 'error');
    } finally {
        setLoadingState(false);
    }
}

async function loadPersons() {
    try {
        console.log('👥 Cargando personas...');
        
        const data = await apiCall('/persons');
        
        if (data.success) {
            appState.persons = data.persons || [];
            renderPersonsTable();
            populatePersonSelect();
            console.log(`✅ ${appState.persons.length} personas cargadas`);
        } else {
            throw new Error(data.message);
        }
        
    } catch (error) {
        console.error('❌ Error cargando personas:', error);
        showAlert('Error al cargar personas: ' + error.message, 'error');
    }
}

async function loadDocuments() {
    try {
        console.log('📄 Cargando documentos...');
        
        const data = await apiCall('/documents');
        
        if (data.success) {
            appState.documents = data.documents || [];
            renderDocumentsTable();
            console.log(`✅ ${appState.documents.length} documentos cargados`);
        } else {
            throw new Error(data.message);
        }
        
    } catch (error) {
        console.error('❌ Error cargando documentos:', error);
        showAlert('Error al cargar documentos: ' + error.message, 'error');
    }
}

async function loadCategories() {
    try {
        console.log('🏷️ Cargando categorías...');
        
        const data = await apiCall('/categories');
        
        if (data.success) {
            appState.categories = data.categories || [];
            renderCategories();
            console.log(`✅ ${appState.categories.length} categorías cargadas`);
        } else {
            throw new Error(data.message);
        }
        
    } catch (error) {
        console.error('❌ Error cargando categorías:', error);
        // No mostrar alerta para evitar spam en pestaña no utilizada
    }
}

// =============================================================================
// FUNCIONES DE RENDERIZADO
// =============================================================================
function updateDashboardStats() {
    DOM.statsCards.totalPersonas.textContent = appState.dashboardStats.totalPersonas;
    DOM.statsCards.totalDocumentos.textContent = appState.dashboardStats.totalDocumentos;
    DOM.statsCards.proximosVencer.textContent = appState.dashboardStats.proximosVencer;
    DOM.statsCards.totalCategorias.textContent = appState.dashboardStats.totalCategorias;
}

function loadRecentDocuments(recentDocuments = []) {
    const docsToShow = recentDocuments.length > 0 ? recentDocuments : appState.documents.slice(0, 5);
    
    DOM.recentDocuments.innerHTML = '';
    
    if (docsToShow.length === 0) {
        DOM.recentDocuments.innerHTML = `
            <article class="empty-state">
                <i class="fas fa-file-alt empty-state__icon"></i>
                <h3 class="empty-state__title">No hay documentos recientes</h3>
                <p class="empty-state__description">Sube tu primer documento para comenzar</p>
                <button class="btn btn--primary" id="addFirstDocument">
                    <i class="fas fa-plus"></i> Subir Documento
                </button>
            </article>
        `;
        // Re-attach event listener
        document.getElementById('addFirstDocument')?.addEventListener('click', () => openDocumentModal());
        return;
    }
    
    docsToShow.forEach(doc => {
        const person = doc.persona_id ? doc.persona_id : { nombre: 'No asignado' };
        
        const documentItem = document.createElement('article');
        documentItem.className = 'documents__item';
        
        documentItem.innerHTML = `
            <div class="documents__info">
                <div class="documents__icon">
                    <i class="fas fa-file-${getFileIcon(doc.tipo_archivo)}"></i>
                </div>
                <div class="documents__details">
                    <h4 class="documents__details-name">${doc.nombre_original}</h4>
                    <p class="documents__details-meta">Subido por: ${person.nombre} • ${formatDate(doc.fecha_subida)}</p>
                    ${doc.descripcion ? `<p class="documents__details-description">${doc.descripcion}</p>` : ''}
                </div>
            </div>
            <div class="documents__actions">
                <button class="btn btn--sm btn--outline" onclick="downloadDocument('${doc._id}')" title="Descargar">
                    <i class="fas fa-download"></i>
                </button>
                <button class="btn btn--sm btn--outline" onclick="previewDocument('${doc._id}')" title="Vista previa">
                    <i class="fas fa-eye"></i>
                </button>
            </div>
        `;
        
        DOM.recentDocuments.appendChild(documentItem);
    });
}

function renderPersonsTable() {
    DOM.personasTableBody.innerHTML = '';
    
    if (appState.persons.length === 0) {
        DOM.personasTableBody.innerHTML = `
            <tr>
                <td colspan="6" class="empty-state">
                    <i class="fas fa-users empty-state__icon"></i>
                    <h3 class="empty-state__title">No hay personas registradas</h3>
                    <p class="empty-state__description">Agrega la primera persona para comenzar</p>
                </td>
            </tr>
        `;
        return;
    }
    
    appState.persons.forEach(person => {
        const row = document.createElement('tr');
        row.className = 'table__row';
        
        row.innerHTML = `
            <td class="table__cell">${person.nombre}</td>
            <td class="table__cell">${person.email}</td>
            <td class="table__cell">${person.telefono || '-'}</td>
            <td class="table__cell">${person.departamento || '-'}</td>
            <td class="table__cell">${person.puesto || '-'}</td>
            <td class="table__cell">
                <button class="btn btn--sm btn--outline" onclick="editPerson('${person._id}')" title="Editar">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn--sm btn--danger" onclick="deletePerson('${person._id}')" title="Eliminar">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        
        DOM.personasTableBody.appendChild(row);
    });
}

function renderDocumentsTable() {
    DOM.documentosTableBody.innerHTML = '';
    
    let documentsToShow = appState.documents;
    
    // Aplicar filtros
    if (appState.filters.category) {
        documentsToShow = documentsToShow.filter(doc => doc.categoria === appState.filters.category);
    }
    
    if (appState.filters.type) {
        documentsToShow = documentsToShow.filter(doc => doc.tipo_archivo.toLowerCase() === appState.filters.type.toLowerCase());
    }
    
    if (appState.filters.date) {
        const now = new Date();
        let startDate;
        
        switch(appState.filters.date) {
            case 'today':
                startDate = new Date(now.setHours(0, 0, 0, 0));
                break;
            case 'week':
                startDate = new Date(now.setDate(now.getDate() - 7));
                break;
            case 'month':
                startDate = new Date(now.setMonth(now.getMonth() - 1));
                break;
        }
        
        documentsToShow = documentsToShow.filter(doc => {
            const docDate = new Date(doc.fecha_subida);
            return docDate >= startDate;
        });
    }
    
    if (documentsToShow.length === 0) {
        DOM.documentosTableBody.innerHTML = `
            <tr>
                <td colspan="8" class="empty-state">
                    <i class="fas fa-file-alt empty-state__icon"></i>
                    <h3 class="empty-state__title">No hay documentos</h3>
                    <p class="empty-state__description">${appState.filters.category || appState.filters.type || appState.filters.date ? 'No hay documentos que coincidan con los filtros aplicados' : 'Sube tu primer documento para comenzar'}</p>
                </td>
            </tr>
        `;
        return;
    }
    
    documentsToShow.forEach(doc => {
        const person = doc.persona_id ? doc.persona_id : { nombre: 'No asignado' };
        const fileSize = formatFileSize(doc.tamano_archivo);
        const uploadDate = formatDate(doc.fecha_subida);
        
        // Determinar estado de vencimiento
        let vencimientoClass = '';
        let vencimientoText = '';
        let statusIndicator = '';
        
        if (doc.fecha_vencimiento) {
            const fechaVencimiento = new Date(doc.fecha_vencimiento);
            const hoy = new Date();
            const diferenciaDias = Math.ceil((fechaVencimiento - hoy) / (1000 * 60 * 60 * 24));
            
            if (diferenciaDias <= 0) {
                vencimientoClass = 'badge--danger';
                vencimientoText = 'Vencido';
                statusIndicator = '<span class="status-indicator status-indicator--danger"></span>';
            } else if (diferenciaDias <= 7) {
                vencimientoClass = 'badge--warning';
                vencimientoText = `Vence en ${diferenciaDias} días`;
                statusIndicator = '<span class="status-indicator status-indicator--warning"></span>';
            } else if (diferenciaDias <= 30) {
                vencimientoClass = 'badge--info';
                vencimientoText = `Vence en ${diferenciaDias} días`;
                statusIndicator = '<span class="status-indicator status-indicator--success"></span>';
            } else {
                vencimientoText = formatDate(doc.fecha_vencimiento);
                statusIndicator = '<span class="status-indicator status-indicator--success"></span>';
            }
        }
        
        const row = document.createElement('tr');
        row.className = 'table__row';
        
        row.innerHTML = `
            <td class="table__cell">
                <div class="documents__info documents__info--inline">
                    <div class="documents__icon documents__icon--sm">
                        <i class="fas fa-file-${getFileIcon(doc.tipo_archivo)}"></i>
                    </div>
                    <div>
                        <div class="documents__details-name">${doc.nombre_original}</div>
                        ${doc.descripcion ? `<div class="documents__details-description">${doc.descripcion}</div>` : ''}
                    </div>
                </div>
            </td>
            <td class="table__cell"><span class="badge badge--info">${doc.tipo_archivo.toUpperCase()}</span></td>
            <td class="table__cell">${fileSize}</td>
            <td class="table__cell">${person.nombre}</td>
            <td class="table__cell"><span class="badge badge--info">${doc.categoria}</span></td>
            <td class="table__cell">${uploadDate}</td>
            <td class="table__cell">
                ${statusIndicator}
                ${vencimientoText ? `<span class="badge ${vencimientoClass}">${vencimientoText}</span>` : 'Sin vencimiento'}
            </td>
            <td class="table__cell">
                <button class="btn btn--sm btn--outline" onclick="downloadDocument('${doc._id}')" title="Descargar">
                    <i class="fas fa-download"></i>
                </button>
                <button class="btn btn--sm btn--outline" onclick="previewDocument('${doc._id}')" title="Vista previa">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="btn btn--sm btn--danger" onclick="deleteDocument('${doc._id}')" title="Eliminar">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        
        DOM.documentosTableBody.appendChild(row);
    });
}

function renderCategories() {
    const container = document.getElementById('categoriesStats');
    
    if (!container || appState.categories.length === 0) return;
    
    container.innerHTML = appState.categories.map(category => `
        <article class="stats__card">
            <div class="stats__icon" style="background: linear-gradient(135deg, ${category.color || '#4f46e5'}, #4338ca);">
                <i class="fas ${category.icon || 'fa-folder'}"></i>
            </div>
            <div class="stats__info">
                <h3 class="stats__info-value">${category.documentCount || 0}</h3>
                <p class="stats__info-label">${category.nombre}</p>
            </div>
        </article>
    `).join('');
}

// =============================================================================
// FUNCIONES DE PERSONAS (CRUD)
// =============================================================================
function openPersonModal(personId = null) {
    console.log(`👤 Abriendo modal de persona: ${personId || 'Nueva'}`);
    
    if (personId) {
        DOM.personModalTitle.textContent = 'Editar Persona';
        const person = appState.persons.find(p => p._id === personId);
        if (person) {
            DOM.personId.value = person._id;
            DOM.personName.value = person.nombre;
            DOM.personEmail.value = person.email;
            DOM.personPhone.value = person.telefono || '';
            DOM.personDepartment.value = person.departamento || '';
            DOM.personPosition.value = person.puesto || '';
        }
    } else {
        DOM.personModalTitle.textContent = 'Agregar Persona';
        DOM.personForm.reset();
        DOM.personId.value = '';
    }
    
    DOM.personModal.style.display = 'flex';
}

function closePersonModal() {
    console.log('❌ Cerrando modal de persona');
    DOM.personModal.style.display = 'none';
}

async function savePerson() {
    // Validaciones
    if (!DOM.personName.value.trim() || !DOM.personEmail.value.trim()) {
        showAlert('Nombre y email son obligatorios', 'error');
        return;
    }
    
    if (!isValidEmail(DOM.personEmail.value)) {
        showAlert('Por favor ingresa un email válido', 'error');
        return;
    }
    
    try {
        setLoadingState(true, DOM.savePersonBtn);
        
        const personData = {
            nombre: DOM.personName.value.trim(),
            email: DOM.personEmail.value.trim(),
            telefono: DOM.personPhone.value.trim(),
            departamento: DOM.personDepartment.value.trim(),
            puesto: DOM.personPosition.value.trim()
        };
        
        console.log('💾 Guardando persona:', personData);
        
        let data;
        if (DOM.personId.value) {
            // Actualizar persona existente
            data = await apiCall(`/persons/${DOM.personId.value}`, {
                method: 'PUT',
                body: JSON.stringify(personData)
            });
        } else {
            // Crear nueva persona
            data = await apiCall('/persons', {
                method: 'POST',
                body: JSON.stringify(personData)
            });
        }
        
        if (data.success) {
            showAlert(data.message, 'success');
            await loadPersons();
            closePersonModal();
            
            // Actualizar dashboard si está visible
            if (appState.currentTab === 'dashboard') {
                await loadDashboardData();
            }
        } else {
            throw new Error(data.message);
        }
        
    } catch (error) {
        console.error('❌ Error guardando persona:', error);
        showAlert('Error al guardar persona: ' + error.message, 'error');
    } finally {
        setLoadingState(false, DOM.savePersonBtn);
    }
}

function editPerson(id) {
    console.log('✏️ Editando persona:', id);
    openPersonModal(id);
}

async function deletePerson(id) {
    if (!confirm('¿Estás seguro de que deseas eliminar esta persona?')) {
        return;
    }
    
    try {
        console.log('🗑️ Eliminando persona:', id);
        
        const data = await apiCall(`/persons/${id}`, {
            method: 'DELETE'
        });
        
        if (data.success) {
            showAlert(data.message, 'success');
            await loadPersons();
            
            // Actualizar dashboard si está visible
            if (appState.currentTab === 'dashboard') {
                await loadDashboardData();
            }
        } else {
            throw new Error(data.message);
        }
        
    } catch (error) {
        console.error('❌ Error eliminando persona:', error);
        showAlert('Error al eliminar persona: ' + error.message, 'error');
    }
}

// =============================================================================
// FUNCIONES DE DOCUMENTOS (CRUD)
// =============================================================================
function openDocumentModal() {
    console.log('📄 Abriendo modal de documento');
    
    DOM.documentForm.reset();
    DOM.fileInfo.style.display = 'none';
    DOM.uploadDocumentBtn.disabled = true;
    appState.selectedFile = null;
    DOM.fileUploadContainer.classList.remove('upload__container--dragover');
    
    // Poblar select de personas
    populatePersonSelect();
    
    DOM.documentModal.style.display = 'flex';
}

function closeDocumentModal() {
    console.log('❌ Cerrando modal de documento');
    DOM.documentModal.style.display = 'none';
}

function setupFileDragAndDrop() {
    if (!DOM.fileUploadContainer) return;
    
    DOM.fileUploadContainer.addEventListener('dragover', function(e) {
        e.preventDefault();
        this.classList.add('upload__container--dragover');
    });
    
    DOM.fileUploadContainer.addEventListener('dragleave', function() {
        this.classList.remove('upload__container--dragover');
    });
    
    DOM.fileUploadContainer.addEventListener('drop', function(e) {
        e.preventDefault();
        this.classList.remove('upload__container--dragover');
        
        if (e.dataTransfer.files.length) {
            console.log('📁 Archivo arrastrado:', e.dataTransfer.files[0].name);
            handleFile(e.dataTransfer.files[0]);
        }
    });
}

function handleFile(file) {
    if (!file) {
        console.warn('⚠️ No se proporcionó archivo');
        return;
    }
    
    console.log('📋 Procesando archivo:', file.name);
    
    // Validar tipo de archivo
    const fileExtension = file.name.split('.').pop().toLowerCase();
    if (!CONFIG.ALLOWED_FILE_TYPES.includes(fileExtension)) {
        showAlert(`Tipo de archivo no permitido. Formatos aceptados: ${CONFIG.ALLOWED_FILE_TYPES.join(', ').toUpperCase()}`, 'error');
        return;
    }
    
    // Validar tamaño
    if (file.size > CONFIG.MAX_FILE_SIZE) {
        showAlert(`El archivo excede el tamaño máximo permitido (${formatFileSize(CONFIG.MAX_FILE_SIZE)})`, 'error');
        return;
    }
    
    appState.selectedFile = file;
    
    // Mostrar información del archivo
    DOM.fileName.textContent = file.name;
    DOM.fileSize.textContent = formatFileSize(file.size);
    DOM.fileInfo.style.display = 'block';
    DOM.uploadDocumentBtn.disabled = false;
    
    console.log('✅ Archivo validado correctamente');
}

async function handleUploadDocument() {
    if (!appState.selectedFile) {
        showAlert('Por favor selecciona un archivo', 'error');
        return;
    }
    
    // Validar campos obligatorios
    if (!DOM.documentCategory.value) {
        showAlert('Por favor selecciona una categoría', 'error');
        return;
    }
    
    try {
        setLoadingState(true, DOM.uploadDocumentBtn);
        
        console.log('📤 Iniciando upload del documento...');
        
        // MANTENIENDO CLOUDINARY INTACTO - Tu configuración original
        const formData = new FormData();
        formData.append('file', appState.selectedFile);
        formData.append('descripcion', DOM.documentDescription.value);
        formData.append('categoria', DOM.documentCategory.value);
        formData.append('fecha_vencimiento', DOM.documentExpiration.value);
        formData.append('persona_id', DOM.documentPerson.value);

        const response = await fetch(`${CONFIG.API_BASE_URL}/documents`, {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (data.success) {
            showAlert(data.message, 'success');
            await loadDocuments();
            closeDocumentModal();
            
            if (appState.currentTab === 'dashboard') {
                await loadDashboardData();
            }
        } else {
            throw new Error(data.message);
        }
        
    } catch (error) {
        console.error('❌ Error subiendo documento:', error);
        showAlert('Error al subir documento: ' + error.message, 'error');
    } finally {
        setLoadingState(false, DOM.uploadDocumentBtn);
    }
}

function populatePersonSelect() {
    if (!DOM.documentPerson) return;
    
    DOM.documentPerson.innerHTML = '<option value="">Seleccionar persona</option>';
    
    appState.persons.forEach(person => {
        const option = document.createElement('option');
        option.value = person._id;
        option.textContent = person.nombre;
        DOM.documentPerson.appendChild(option);
    });
}

async function downloadDocument(id) {
    try {
        console.log('📥 Descargando documento:', id);
        
        showAlert('Iniciando descarga del documento...', 'info');
        
        // Redirigir a la ruta de descarga
        window.open(`${CONFIG.API_BASE_URL}/documents/${id}/download`, '_blank');
        
    } catch (error) {
        console.error('❌ Error descargando documento:', error);
        showAlert('Error al descargar documento: ' + error.message, 'error');
    }
}

function previewDocument(id) {
    console.log('👁️ Vista previa del documento:', id);
    showAlert('Función de vista previa en desarrollo', 'info');
}

async function deleteDocument(id) {
    if (!confirm('¿Estás seguro de que deseas eliminar este documento?')) {
        return;
    }
    
    try {
        console.log('🗑️ Eliminando documento:', id);
        
        const data = await apiCall(`/documents/${id}`, {
            method: 'DELETE'
        });
        
        if (data.success) {
            showAlert(data.message, 'success');
            await loadDocuments();
            
            if (appState.currentTab === 'dashboard') {
                await loadDashboardData();
            }
        } else {
            throw new Error(data.message);
        }
        
    } catch (error) {
        console.error('❌ Error eliminando documento:', error);
        showAlert('Error al eliminar documento: ' + error.message, 'error');
    }
}

// =============================================================================
// FUNCIONES UTILITARIAS
// =============================================================================
function setLoadingState(loading, element = null) {
    appState.isLoading = loading;
    
    if (element) {
        if (loading) {
            const originalText = element.innerHTML;
            element.innerHTML = '<div class="spinner"></div> Procesando...';
            element.disabled = true;
            element.dataset.originalText = originalText;
        } else {
            if (element.dataset.originalText) {
                element.innerHTML = element.dataset.originalText;
                element.disabled = false;
            }
        }
    }
    
    // Añadir/remover clase de loading al body
    document.body.classList.toggle('loading', loading);
}

function showAlert(message, type = 'info') {
    console.log(`🔔 Alert [${type}]: ${message}`);
    
    const alert = document.createElement('div');
    alert.className = `alert alert--${type}`;
    
    const icons = {
        success: 'check-circle',
        error: 'exclamation-circle',
        warning: 'exclamation-triangle',
        info: 'info-circle'
    };
    
    alert.innerHTML = `
        <i class="fas fa-${icons[type] || 'info-circle'}"></i>
        <span>${message}</span>
    `;
    
    DOM.alertContainer.appendChild(alert);
    
    // Auto-eliminar después de 5 segundos
    setTimeout(() => {
        if (alert.parentNode) {
            alert.parentNode.removeChild(alert);
        }
    }, 5000);
}

function setupModalBackdropClose() {
    window.addEventListener('click', function(e) {
        if (e.target === DOM.personModal) {
            closePersonModal();
        }
        if (e.target === DOM.documentModal) {
            closeDocumentModal();
        }
    });
}

function applyFilters() {
    console.log('🔍 Aplicando filtros...', appState.filters);
    renderDocumentsTable();
}

function generateReport() {
    console.log('📊 Generando reporte...');
    showAlert('Generando reporte... Esta función estará disponible pronto.', 'info');
}

function showAdvancedSearch() {
    console.log('🔎 Mostrando búsqueda avanzada...');
    showAlert('Búsqueda avanzada en desarrollo. Estará disponible en la próxima actualización.', 'info');
}

function showAllDocuments() {
    console.log('📋 Mostrando todos los documentos');
    switchTab('documentos');
}

// =============================================================================
// FUNCIONES DE FORMATO Y VALIDACIÓN
// =============================================================================
function getFileIcon(fileType) {
    const iconMap = {
        'pdf': 'pdf',
        'doc': 'word',
        'docx': 'word',
        'txt': 'alt',
        'jpg': 'image',
        'jpeg': 'image',
        'png': 'image'
    };
    
    return iconMap[fileType.toLowerCase()] || 'file';
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatDate(dateString) {
    try {
        const date = new Date(dateString);
        const options = { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric'
        };
        return date.toLocaleDateString('es-ES', options);
    } catch (error) {
        console.warn('Error formateando fecha:', error);
        return 'Fecha inválida';
    }
}

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// =============================================================================
// FUNCIÓN AUXILIAR PARA LLAMADAS A LA API
// =============================================================================
async function apiCall(endpoint, options = {}) {
    try {
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            }
        };

        const finalOptions = { ...defaultOptions, ...options };
        
        if (finalOptions.body && typeof finalOptions.body === 'object' && !(finalOptions.body instanceof FormData)) {
            finalOptions.body = JSON.stringify(finalOptions.body);
        }

        const response = await fetch(`${CONFIG.API_BASE_URL}${endpoint}`, finalOptions);

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Error HTTP ${response.status}: ${errorText}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error en API call:', error);
        throw error;
    }
}

// =============================================================================
// FUNCIONES GLOBALES PARA DEBUG Y TEST
// =============================================================================
function debugAppState() {
    console.group('🔧 Debug App State');
    appState.logState();
    console.groupEnd();
}

function testAPIConnection() {
    console.log('🧪 Probando conexión API...');
    showAlert('Probando conexión con el servidor...', 'info');
    
    fetch(`${CONFIG.API_BASE_URL}/health`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showAlert('Conexión con el servidor establecida correctamente', 'success');
            } else {
                throw new Error(data.message);
            }
        })
        .catch(error => {
            console.error('❌ Error conectando con el servidor:', error);
            showAlert('Error al conectar con el servidor: ' + error.message, 'error');
        });
}

function testCloudinaryConnection() {
    console.log('☁️ Probando Cloudinary...');
    showAlert('Probando conexión con Cloudinary...', 'info');
    
    // Tu funcionalidad de Cloudinary intacta
    console.log('Cloudinary Config:', {
        cloudName: CONFIG.CLOUDINARY_CLOUD_NAME,
        apiKey: CONFIG.CLOUDINARY_API_KEY,
        uploadPreset: CONFIG.CLOUDINARY_UPLOAD_PRESET
    });
    
    showAlert('Configuración de Cloudinary verificada correctamente', 'success');
}

function resetApp() {
    if (confirm('¿Estás seguro de que deseas resetear la aplicación? Se perderán los datos no guardados.')) {
        localStorage.clear();
        location.reload();
    }
}

// =============================================================================
// EXPORTAR FUNCIONES GLOBALES
// =============================================================================
window.downloadDocument = downloadDocument;
window.previewDocument = previewDocument;
window.deleteDocument = deleteDocument;
window.editPerson = editPerson;
window.deletePerson = deletePerson;
window.openDocumentModal = openDocumentModal;
window.openPersonModal = openPersonModal;
window.showAllDocuments = showAllDocuments;
window.debugAppState = debugAppState;
window.testAPIConnection = testAPIConnection;
window.testCloudinaryConnection = testCloudinaryConnection;
window.resetApp = resetApp;

// =============================================================================
// MANEJO DE ERRORES GLOBALES
// =============================================================================
window.addEventListener('error', function(e) {
    console.error('🚨 Error global capturado:', e.error);
    showAlert('Ha ocurrido un error inesperado. Revisa la consola para más detalles.', 'error');
});

window.addEventListener('unhandledrejection', function(e) {
    console.error('🚨 Promise rechazada no manejada:', e.reason);
    showAlert('Error en operación asíncrona. Revisa la consola para más detalles.', 'error');
});

console.log('✅ Script de aplicación cargado correctamente');