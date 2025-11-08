// Configuración global
const API_URL = '../PHP/api.php';
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// Estado de la aplicación
let appState = {
    currentSection: 'dashboard',
    persons: [],
    documents: [],
    categories: [],
    currentPersonId: null
};

// Inicialización de la aplicación
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

// Función principal de inicialización
function initializeApp() {
    setupEventListeners();
    loadDashboardData();
    switchSection('dashboard');
}

// Configurar event listeners
function setupEventListeners() {
    // Navegación entre secciones
    document.querySelectorAll('.header__button').forEach(button => {
        button.addEventListener('click', (e) => {
            const section = e.target.dataset.section;
            switchSection(section);
        });
    });

    // Botones de acción
    document.getElementById('add-person-btn').addEventListener('click', openPersonModal);
    document.getElementById('add-document-btn').addEventListener('click', openDocumentModal);
    document.getElementById('download-all-btn').addEventListener('click', downloadAllDocuments);

    // Formularios
    document.getElementById('person-form').addEventListener('submit', handlePersonSubmit);
    document.getElementById('document-form').addEventListener('submit', handleDocumentSubmit);

    // Búsquedas y filtros
    document.getElementById('search-person').addEventListener('input', debounce(searchPersons, 300));
    document.getElementById('filter-category').addEventListener('change', filterDocuments);
    document.getElementById('filter-person').addEventListener('change', filterDocuments);
}

// Navegación entre secciones
function switchSection(sectionName) {
    // Actualizar botones de navegación
    document.querySelectorAll('.header__button').forEach(button => {
        button.classList.toggle('header__button--active', button.dataset.section === sectionName);
    });

    // Mostrar sección activa
    document.querySelectorAll('.section').forEach(section => {
        section.classList.toggle('section--active', section.id === sectionName);
    });

    appState.currentSection = sectionName;

    // Cargar datos específicos de la sección
    switch(sectionName) {
        case 'dashboard':
            loadDashboardData();
            break;
        case 'personas':
            loadPersons();
            break;
        case 'documentos':
            loadDocuments();
            loadFilters();
            break;
    }
}

// Cargar datos del dashboard
async function loadDashboardData() {
    try {
        const response = await fetch(`${API_URL}?action=getDashboardStats`);
        const data = await response.json();

        if (data.success) {
            document.getElementById('total-personas').textContent = data.stats.total_personas;
            document.getElementById('total-documentos').textContent = data.stats.total_documentos;
            document.getElementById('proximos-vencer').textContent = data.stats.proximos_vencer;
            
            displayRecentDocuments(data.recent_documents);
        }
    } catch (error) {
        showNotification('Error al cargar el dashboard', 'error');
        logError('loadDashboardData', error);
    }
}

// Cargar lista de personas
async function loadPersons() {
    try {
        const response = await fetch(`${API_URL}?action=getPersons`);
        const data = await response.json();

        if (data.success) {
            appState.persons = data.persons;
            displayPersons(data.persons);
            updatePersonSelect();
        }
    } catch (error) {
        showNotification('Error al cargar las personas', 'error');
        logError('loadPersons', error);
    }
}

// Cargar lista de documentos
async function loadDocuments() {
    try {
        const response = await fetch(`${API_URL}?action=getDocuments`);
        const data = await response.json();

        if (data.success) {
            appState.documents = data.documents;
            appState.categories = [...new Set(data.documents.map(doc => doc.categoria).filter(Boolean))];
            displayDocuments(data.documents);
        }
    } catch (error) {
        showNotification('Error al cargar los documentos', 'error');
        logError('loadDocuments', error);
    }
}

// Cargar filtros
function loadFilters() {
    const categorySelect = document.getElementById('filter-category');
    const personSelect = document.getElementById('filter-person');

    // Limpiar opciones existentes
    categorySelect.innerHTML = '<option value="">Todas las categorías</option>';
    personSelect.innerHTML = '<option value="">Todas las personas</option>';

    // Agregar categorías
    appState.categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        categorySelect.appendChild(option);
    });

    // Agregar personas
    appState.persons.forEach(person => {
        const option = document.createElement('option');
        option.value = person.id;
        option.textContent = person.nombre;
        personSelect.appendChild(option);
    });
}

// Mostrar personas en la lista
function displayPersons(persons) {
    const container = document.getElementById('persons-list');
    
    if (persons.length === 0) {
        container.innerHTML = '<p class="no-data">No se encontraron personas</p>';
        return;
    }

    container.innerHTML = persons.map(person => `
        <article class="person-card">
            <div class="person-card__info">
                <h3 class="person-card__name">${escapeHtml(person.nombre)}</h3>
                <div class="person-card__details">
                    <p><strong>Email:</strong> ${escapeHtml(person.email)}</p>
                    <p><strong>Departamento:</strong> ${escapeHtml(person.departamento || 'N/A')}</p>
                    <p><strong>Puesto:</strong> ${escapeHtml(person.puesto || 'N/A')}</p>
                    <p><strong>Teléfono:</strong> ${escapeHtml(person.telefono || 'N/A')}</p>
                </div>
            </div>
            <div class="person-card__actions">
                <button class="button button--files" onclick="managePersonFiles(${person.id})">Archivos</button>
                <button class="button button--edit" onclick="editPerson(${person.id})">Editar</button>
                <button class="button button--delete" onclick="deletePerson(${person.id})">Eliminar</button>
            </div>
        </article>
    `).join('');
}

// Mostrar documentos en la lista
function displayDocuments(documents) {
    const container = document.getElementById('documents-list');
    
    if (documents.length === 0) {
        container.innerHTML = '<p class="no-data">No se encontraron documentos</p>';
        return;
    }

    container.innerHTML = documents.map(doc => `
        <article class="document-card">
            <div class="document-card__info">
                <h3 class="document-card__name">${escapeHtml(doc.nombre_original)}</h3>
                <div class="document-card__details">
                    <p><strong>Persona:</strong> ${escapeHtml(doc.persona_nombre || 'N/A')}</p>
                    <p><strong>Categoría:</strong> ${escapeHtml(doc.categoria || 'N/A')}</p>
                    <p><strong>Tamaño:</strong> ${formatFileSize(doc.tamano_archivo)}</p>
                    <p><strong>Subido:</strong> ${formatDate(doc.fecha_subida)}</p>
                    ${doc.fecha_vencimiento ? `<p><strong>Vence:</strong> ${formatDate(doc.fecha_vencimiento)}</p>` : ''}
                    ${doc.descripcion ? `<p><strong>Descripción:</strong> ${escapeHtml(doc.descripcion)}</p>` : ''}
                </div>
            </div>
            <div class="document-card__actions">
                <button class="button button--download" onclick="downloadDocument(${doc.id})">Descargar</button>
                <button class="button button--delete" onclick="deleteDocument(${doc.id})">Eliminar</button>
            </div>
        </article>
    `).join('');
}

// Mostrar documentos recientes
function displayRecentDocuments(documents) {
    const container = document.getElementById('recent-documents');
    
    if (documents.length === 0) {
        container.innerHTML = '<p class="no-data">No hay documentos recientes</p>';
        return;
    }

    container.innerHTML = documents.map(doc => `
        <article class="document-card">
            <div class="document-card__info">
                <h3 class="document-card__name">${escapeHtml(doc.nombre_original)}</h3>
                <div class="document-card__details">
                    <p><strong>Persona:</strong> ${escapeHtml(doc.persona_nombre)}</p>
                    <p><strong>Subido:</strong> ${formatDate(doc.fecha_subida)}</p>
                </div>
            </div>
            <div class="document-card__actions">
                <button class="button button--download" onclick="downloadDocument(${doc.id})">Descargar</button>
            </div>
        </article>
    `).join('');
}

// Modal de persona
function openPersonModal(personId = null) {
    const modal = document.getElementById('person-modal');
    const title = document.getElementById('person-modal-title');
    const form = document.getElementById('person-form');

    if (personId) {
        title.textContent = 'Editar Persona';
        loadPersonData(personId);
    } else {
        title.textContent = 'Agregar Persona';
        form.reset();
        document.getElementById('person-id').value = '';
    }

    modal.showModal();
}

function closePersonModal() {
    document.getElementById('person-modal').close();
}

async function loadPersonData(personId) {
    try {
        const response = await fetch(`${API_URL}?action=getPerson&id=${personId}`);
        const data = await response.json();

        if (data.success) {
            const person = data.person;
            document.getElementById('person-id').value = person.id;
            document.getElementById('person-name').value = person.nombre;
            document.getElementById('person-email').value = person.email;
            document.getElementById('person-phone').value = person.telefono;
            document.getElementById('person-department').value = person.departamento;
            document.getElementById('person-position').value = person.puesto;
        }
    } catch (error) {
        showNotification('Error al cargar datos de la persona', 'error');
        logError('loadPersonData', error);
    }
}

// Modal de documento
function openDocumentModal() {
    const modal = document.getElementById('document-modal');
    const form = document.getElementById('document-form');
    
    form.reset();
    updatePersonSelect();
    modal.showModal();
}

function closeDocumentModal() {
    document.getElementById('document-modal').close();
}

function updatePersonSelect() {
    const select = document.getElementById('document-person');
    select.innerHTML = '<option value="">Seleccionar persona...</option>';
    
    appState.persons.forEach(person => {
        const option = document.createElement('option');
        option.value = person.id;
        option.textContent = person.nombre;
        select.appendChild(option);
    });
}

// Modal de gestión de archivos por persona
async function managePersonFiles(personId) {
    appState.currentPersonId = personId;
    
    try {
        // Cargar datos de la persona
        const personResponse = await fetch(`${API_URL}?action=getPerson&id=${personId}`);
        const personData = await personResponse.json();

        if (!personData.success) {
            showNotification('Error al cargar datos de la persona', 'error');
            return;
        }

        const person = personData.person;

        // Actualizar título y información de la persona
        document.getElementById('person-files-title').textContent = `Archivos de ${person.nombre}`;
        
        const personInfo = document.getElementById('person-info');
        personInfo.innerHTML = `
            <div class="person-info__name">${escapeHtml(person.nombre)}</div>
            <div class="person-info__details">
                <p><strong>Email:</strong> ${escapeHtml(person.email)}</p>
                <p><strong>Departamento:</strong> ${escapeHtml(person.departamento || 'N/A')}</p>
                <p><strong>Puesto:</strong> ${escapeHtml(person.puesto || 'N/A')}</p>
            </div>
        `;

        // Cargar archivos de la persona
        await loadPersonFiles(personId);

        // Mostrar modal
        document.getElementById('person-files-modal').showModal();
        
    } catch (error) {
        showNotification('Error al abrir gestión de archivos', 'error');
        logError('managePersonFiles', error);
    }
}

function closePersonFilesModal() {
    document.getElementById('person-files-modal').close();
    appState.currentPersonId = null;
}

// Cargar archivos de una persona específica
async function loadPersonFiles(personId) {
    try {
        const response = await fetch(`${API_URL}?action=getPersonDocuments&persona_id=${personId}`);
        const data = await response.json();

        const container = document.getElementById('person-files-list');
        
        if (data.success && data.documents.length > 0) {
            container.innerHTML = data.documents.map(doc => `
                <article class="file-card">
                    <div class="file-card__info">
                        <h4 class="file-card__name">${escapeHtml(doc.nombre_original)}</h4>
                        <div class="file-card__details">
                            <p><strong>Tamaño:</strong> ${formatFileSize(doc.tamano_archivo)}</p>
                            <p><strong>Subido:</strong> ${formatDate(doc.fecha_subida)}</p>
                            ${doc.categoria ? `<p><strong>Categoría:</strong> ${escapeHtml(doc.categoria)}</p>` : ''}
                            ${doc.descripcion ? `<p><strong>Descripción:</strong> ${escapeHtml(doc.descripcion)}</p>` : ''}
                        </div>
                    </div>
                    <div class="file-card__actions">
                        <button class="file-card__button file-card__button--download" onclick="downloadDocument(${doc.id})">Descargar</button>
                        <button class="file-card__button file-card__button--delete" onclick="deletePersonDocument(${doc.id})">Eliminar</button>
                    </div>
                </article>
            `).join('');
        } else {
            container.innerHTML = '<p class="no-data">No hay archivos para esta persona</p>';
        }
    } catch (error) {
        showNotification('Error al cargar archivos de la persona', 'error');
        logError('loadPersonFiles', error);
    }
}

// Subir archivos para una persona
async function uploadPersonFiles() {
    const fileInput = document.getElementById('person-files');
    const files = fileInput.files;
    const category = document.getElementById('files-category').value;

    if (files.length === 0) {
        showNotification('Por favor seleccione al menos un archivo', 'warning');
        return;
    }

    // Validar tamaño de cada archivo
    for (let file of files) {
        if (file.size > MAX_FILE_SIZE) {
            showNotification(`El archivo "${file.name}" excede el tamaño máximo permitido (10MB)`, 'error');
            return;
        }
    }

    try {
        const uploadPromises = Array.from(files).map(file => {
            const formData = new FormData();
            formData.append('action', 'addDocument');
            formData.append('file', file);
            formData.append('categoria', category);
            formData.append('persona_id', appState.currentPersonId);

            return fetch(API_URL, {
                method: 'POST',
                body: formData
            }).then(response => response.json());
        });

        const results = await Promise.all(uploadPromises);
        const successfulUploads = results.filter(result => result.success).length;
        const failedUploads = results.length - successfulUploads;

        if (successfulUploads > 0) {
            showNotification(`${successfulUploads} archivo(s) subido(s) correctamente`, 'success');
        }
        if (failedUploads > 0) {
            showNotification(`${failedUploads} archivo(s) no se pudieron subir`, 'error');
        }

        // Recargar lista de archivos
        await loadPersonFiles(appState.currentPersonId);
        
        // Limpiar formulario
        fileInput.value = '';
        document.getElementById('files-category').value = '';

        // Actualizar dashboard si está activo
        if (appState.currentSection === 'dashboard') {
            loadDashboardData();
        }

    } catch (error) {
        showNotification('Error al subir archivos', 'error');
        logError('uploadPersonFiles', error);
    }
}

// Descargar todos los archivos de una persona
async function downloadAllPersonFiles() {
    if (!appState.currentPersonId) {
        showNotification('No hay persona seleccionada', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_URL}?action=downloadPersonDocuments&persona_id=${appState.currentPersonId}`);
        
        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `documentos_persona_${appState.currentPersonId}.zip`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        } else {
            showNotification('Error al descargar los archivos', 'error');
        }
    } catch (error) {
        showNotification('Error de conexión', 'error');
        logError('downloadAllPersonFiles', error);
    }
}

// Eliminar documento de una persona
async function deletePersonDocument(documentId) {
    if (!confirm('¿Está seguro de que desea eliminar este documento?')) {
        return;
    }

    try {
        const formData = new FormData();
        formData.append('action', 'deleteDocument');
        formData.append('id', documentId);

        const response = await fetch(API_URL, {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (data.success) {
            showNotification('Documento eliminado correctamente', 'success');
            // Recargar lista de archivos
            await loadPersonFiles(appState.currentPersonId);
            
            // Actualizar dashboard si está activo
            if (appState.currentSection === 'dashboard') {
                loadDashboardData();
            }
        } else {
            showNotification(data.message || 'Error al eliminar el documento', 'error');
        }
    } catch (error) {
        showNotification('Error de conexión', 'error');
        logError('deletePersonDocument', error);
    }
}

// Manejo de formularios
async function handlePersonSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData();
    const personId = document.getElementById('person-id').value;

    formData.append('action', personId ? 'updatePerson' : 'addPerson');
    formData.append('id', personId);
    formData.append('nombre', document.getElementById('person-name').value);
    formData.append('email', document.getElementById('person-email').value);
    formData.append('telefono', document.getElementById('person-phone').value);
    formData.append('departamento', document.getElementById('person-department').value);
    formData.append('puesto', document.getElementById('person-position').value);

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (data.success) {
            showNotification(personId ? 'Persona actualizada correctamente' : 'Persona agregada correctamente', 'success');
            closePersonModal();
            loadPersons();
            if (appState.currentSection === 'dashboard') {
                loadDashboardData();
            }
        } else {
            showNotification(data.message || 'Error al guardar la persona', 'error');
        }
    } catch (error) {
        showNotification('Error de conexión', 'error');
        logError('handlePersonSubmit', error);
    }
}

async function handleDocumentSubmit(e) {
    e.preventDefault();
    
    const fileInput = document.getElementById('document-file');
    const file = fileInput.files[0];

    if (!file) {
        showNotification('Por favor seleccione un archivo', 'warning');
        return;
    }

    if (file.size > MAX_FILE_SIZE) {
        showNotification('El archivo excede el tamaño máximo permitido (10MB)', 'error');
        return;
    }

    const formData = new FormData();
    formData.append('action', 'addDocument');
    formData.append('file', file);
    formData.append('descripcion', document.getElementById('document-description').value);
    formData.append('categoria', document.getElementById('document-category').value);
    formData.append('fecha_vencimiento', document.getElementById('document-expiration').value);
    formData.append('persona_id', document.getElementById('document-person').value);

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (data.success) {
            showNotification('Documento subido correctamente', 'success');
            closeDocumentModal();
            loadDocuments();
            if (appState.currentSection === 'dashboard') {
                loadDashboardData();
            }
        } else {
            showNotification(data.message || 'Error al subir el documento', 'error');
        }
    } catch (error) {
        showNotification('Error de conexión', 'error');
        logError('handleDocumentSubmit', error);
    }
}

// Operaciones CRUD
async function editPerson(personId) {
    openPersonModal(personId);
}

async function deletePerson(personId) {
    if (!confirm('¿Está seguro de que desea eliminar esta persona?')) {
        return;
    }

    try {
        const formData = new FormData();
        formData.append('action', 'deletePerson');
        formData.append('id', personId);

        const response = await fetch(API_URL, {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (data.success) {
            showNotification('Persona eliminada correctamente', 'success');
            loadPersons();
            if (appState.currentSection === 'dashboard') {
                loadDashboardData();
            }
        } else {
            showNotification(data.message || 'Error al eliminar la persona', 'error');
        }
    } catch (error) {
        showNotification('Error de conexión', 'error');
        logError('deletePerson', error);
    }
}

async function deleteDocument(documentId) {
    if (!confirm('¿Está seguro de que desea eliminar este documento?')) {
        return;
    }

    try {
        const formData = new FormData();
        formData.append('action', 'deleteDocument');
        formData.append('id', documentId);

        const response = await fetch(API_URL, {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (data.success) {
            showNotification('Documento eliminado correctamente', 'success');
            loadDocuments();
            if (appState.currentSection === 'dashboard') {
                loadDashboardData();
            }
        } else {
            showNotification(data.message || 'Error al eliminar el documento', 'error');
        }
    } catch (error) {
        showNotification('Error de conexión', 'error');
        logError('deleteDocument', error);
    }
}

// Descargas
async function downloadDocument(documentId) {
    try {
        const response = await fetch(`${API_URL}?action=downloadDocument&id=${documentId}`);
        
        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            
            // Obtener el nombre del archivo del header Content-Disposition
            const contentDisposition = response.headers.get('Content-Disposition');
            let filename = 'documento';
            if (contentDisposition) {
                const filenameMatch = contentDisposition.match(/filename="(.+)"/);
                if (filenameMatch) {
                    filename = filenameMatch[1];
                }
            }
            
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        } else {
            showNotification('Error al descargar el documento', 'error');
        }
    } catch (error) {
        showNotification('Error de conexión', 'error');
        logError('downloadDocument', error);
    }
}

async function downloadAllDocuments() {
    try {
        const response = await fetch(`${API_URL}?action=downloadAllDocuments`);
        
        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'documentos.zip';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        } else {
            showNotification('Error al descargar los documentos', 'error');
        }
    } catch (error) {
        showNotification('Error de conexión', 'error');
        logError('downloadAllDocuments', error);
    }
}

// Búsqueda y filtros
function searchPersons(e) {
    const searchTerm = e.target.value.toLowerCase();
    const filteredPersons = appState.persons.filter(person => 
        person.nombre.toLowerCase().includes(searchTerm) ||
        person.email.toLowerCase().includes(searchTerm) ||
        (person.departamento && person.departamento.toLowerCase().includes(searchTerm)) ||
        (person.puesto && person.puesto.toLowerCase().includes(searchTerm))
    );
    displayPersons(filteredPersons);
}

function filterDocuments() {
    const categoryFilter = document.getElementById('filter-category').value;
    const personFilter = document.getElementById('filter-person').value;

    const filteredDocuments = appState.documents.filter(doc => {
        const matchesCategory = !categoryFilter || doc.categoria === categoryFilter;
        const matchesPerson = !personFilter || doc.persona_id == personFilter;
        return matchesCategory && matchesPerson;
    });

    displayDocuments(filteredDocuments);
}

// Utilidades
function showNotification(message, type = 'info') {
    const notifications = document.getElementById('notifications');
    const notification = document.createElement('div');
    notification.className = `notification notification--${type}`;
    notification.textContent = message;

    notifications.appendChild(notification);

    setTimeout(() => {
        notification.remove();
    }, 5000);
}

function logError(context, error) {
    console.error(`Error en ${context}:`, error);
    // Aquí podrías enviar el error a un servicio de logging
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function escapeHtml(unsafe) {
    if (unsafe === null || unsafe === undefined) return '';
    return unsafe
        .toString()
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES');
}