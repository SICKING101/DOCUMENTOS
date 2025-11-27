import { DOM } from '../dom.js';
import { CONFIG } from '../config.js';
import { apiCall } from '../api.js';
import { setLoadingState, showAlert, formatFileSize, getFileIcon, formatDate } from '../utils.js';

// =============================================================================
// FUNCIONES DE DOCUMENTOS (CRUD)
// =============================================================================
function openDocumentModal() {
    console.log('📄 Abriendo modal de documento');
    
    DOM.documentForm.reset();
    DOM.fileInfo.style.display = 'none';
    DOM.uploadDocumentBtn.disabled = true;
    window.appState.selectedFile = null;
    DOM.fileUploadContainer.classList.remove('upload__container--dragover');
    
    populateDocumentCategorySelect();
    if (typeof window.populatePersonSelect === 'function') {
        window.populatePersonSelect();
    }
    
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
    
    window.appState.selectedFile = file;
    
    // Mostrar información del archivo
    DOM.fileName.textContent = file.name;
    DOM.fileSize.textContent = formatFileSize(file.size);
    DOM.fileInfo.style.display = 'block';
    DOM.uploadDocumentBtn.disabled = false;
    
    console.log('✅ Archivo validado correctamente');
}

async function handleUploadDocument() {
    if (!window.appState.selectedFile) {
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
        console.log('📋 Archivo seleccionado:', window.appState.selectedFile.name);
        console.log('📋 Tamaño:', formatFileSize(window.appState.selectedFile.size));
        console.log('📋 Tipo:', window.appState.selectedFile.type);
        
        const formData = new FormData();
        formData.append('file', window.appState.selectedFile);
        formData.append('descripcion', DOM.documentDescription.value);
        formData.append('categoria', DOM.documentCategory.value);
        formData.append('fecha_vencimiento', DOM.documentExpiration.value);
        formData.append('persona_id', DOM.documentPerson.value);

        console.log('📤 Enviando archivo al servidor...');

        const response = await fetch(`${CONFIG.API_BASE_URL}/documents`, {
            method: 'POST',
            body: formData
        });

        console.log('📥 Respuesta recibida:', response.status, response.statusText);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Error del servidor:', errorText);
            throw new Error(`Error del servidor (${response.status}): ${errorText}`);
        }

        const data = await response.json();
        console.log('📦 Datos de respuesta:', data);

        if (data.success) {
            showAlert(data.message, 'success');
            await loadDocuments();
            closeDocumentModal();
            
            if (window.appState.currentTab === 'dashboard') {
                await window.loadDashboardData();
            }
        } else {
            throw new Error(data.message || 'Error desconocido al subir el archivo');
        }
        
    } catch (error) {
        console.error('❌ Error subiendo documento:', error);
        console.error('❌ Stack trace:', error.stack);
        showAlert('Error al subir documento: ' + error.message, 'error');
    } finally {
        setLoadingState(false, DOM.uploadDocumentBtn);
    }
}

async function loadDocuments() {
    try {
        console.log('📄 Cargando documentos...');
        
        const data = await apiCall('/documents');
        
        if (data.success) {
            window.appState.documents = data.documents || [];
            renderDocumentsTable();
            console.log(`✅ ${window.appState.documents.length} documentos cargados`);
        } else {
            throw new Error(data.message);
        }
        
    } catch (error) {
        console.error('❌ Error cargando documentos:', error);
        showAlert('Error al cargar documentos: ' + error.message, 'error');
    }
}

function renderDocumentsTable() {
    if (!DOM.documentosTableBody) return;
    
    DOM.documentosTableBody.innerHTML = '';
    
    let documentsToShow = window.appState.documents;
    
    // Aplicar búsqueda si existe
    if (window.appState.currentSearchQuery) {
        const query = window.appState.currentSearchQuery.toLowerCase();
        documentsToShow = documentsToShow.filter(doc => 
            doc.nombre_original.toLowerCase().includes(query) ||
            (doc.descripcion && doc.descripcion.toLowerCase().includes(query)) ||
            doc.categoria.toLowerCase().includes(query)
        );
    }
    
    // Aplicar filtros
    if (window.appState.filters.category) {
        documentsToShow = documentsToShow.filter(doc => doc.categoria === window.appState.filters.category);
    }
    
    if (window.appState.filters.type) {
        documentsToShow = documentsToShow.filter(doc => doc.tipo_archivo.toLowerCase() === window.appState.filters.type.toLowerCase());
    }
    
    if (window.appState.filters.date) {
        const now = new Date();
        let startDate;
        
        switch(window.appState.filters.date) {
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
    
    if (window.appState.filters.status) {
        const now = new Date();
        documentsToShow = documentsToShow.filter(doc => {
            if (!doc.fecha_vencimiento) return window.appState.filters.status === 'active';
            
            const fechaVencimiento = new Date(doc.fecha_vencimiento);
            const diferenciaDias = Math.ceil((fechaVencimiento - now) / (1000 * 60 * 60 * 24));
            
            switch(window.appState.filters.status) {
                case 'active':
                    return diferenciaDias > 7;
                case 'expiring':
                    return diferenciaDias <= 7 && diferenciaDias > 0;
                case 'expired':
                    return diferenciaDias <= 0;
                default:
                    return true;
            }
        });
    }
    
    if (documentsToShow.length === 0) {
        DOM.documentosTableBody.innerHTML = `
            <tr>
                <td colspan="8" class="empty-state">
                    <i class="fas fa-file-alt empty-state__icon"></i>
                    <h3 class="empty-state__title">No hay documentos</h3>
                    <p class="empty-state__description">${window.appState.currentSearchQuery || window.appState.filters.category || window.appState.filters.type || window.appState.filters.date || window.appState.filters.status ? 'No hay documentos que coincidan con la búsqueda o filtros aplicados' : 'Sube tu primer documento para comenzar'}</p>
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

// FUNCIÓN PARA DESCARGAR DOCUMENTOS
async function downloadDocument(id) {
    console.group('📥 DESCARGA DE DOCUMENTO');
    console.log('🆔 ID del documento:', id);
    
    try {
        // Buscar el documento en el estado para obtener su nombre
        console.log('🔍 Buscando documento en el estado...');
        const docData = window.appState.documents.find(doc => doc._id === id);
        
        if (!docData) {
            console.error('❌ Documento no encontrado en el estado con ID:', id);
            throw new Error('Documento no encontrado en el estado local');
        }
        
        const fileName = docData.nombre_original;
        console.log('✅ Documento encontrado:', {
            nombre: fileName,
            tipo: docData.tipo_archivo,
            tamaño: docData.tamano_archivo,
            categoria: docData.categoria
        });
        
        showAlert('Iniciando descarga del documento...', 'info');
        
        // Crear enlace temporal para descarga
        console.log('🔧 Creando elemento <a> para descarga...');
        const downloadLink = window.document.createElement('a');
        
        // Usar la ruta de descarga del servidor que ahora genera URLs correctas de Cloudinary
        downloadLink.href = `${CONFIG.API_BASE_URL}/documents/${id}/download`;
        downloadLink.target = '_blank';
        downloadLink.rel = 'noopener noreferrer';
        
        // Intentar forzar la descarga con el nombre correcto
        downloadLink.setAttribute('download', fileName);
        
        console.log('📎 Atributos del enlace:', {
            href: downloadLink.href,
            download: downloadLink.download,
            target: downloadLink.target
        });
        
        console.log('➕ Agregando enlace al DOM...');
        window.document.body.appendChild(downloadLink);
        
        console.log('🖱️ Ejecutando click programático...');
        downloadLink.click();
        
        console.log('➖ Removiendo enlace del DOM...');
        window.document.body.removeChild(downloadLink);

        console.log('✅ Descarga iniciada exitosamente');
        showAlert('Descarga iniciada correctamente', 'success');

    } catch (error) {
        console.error('❌ ERROR en downloadDocument:');
        console.error('📋 Detalles del error:', {
            message: error.message,
            stack: error.stack,
            name: error.name,
            documentId: id
        });
        showAlert('Error al descargar documento: ' + error.message, 'error');
    } finally {
        console.groupEnd();
    }
}

// FUNCIÓN ALTERNATIVA PARA DESCARGAR (MÉTODO DIRECTO)
async function downloadDocumentDirect(id) {
    try {
        const docData = window.appState.documents.find(doc => doc._id === id);
        if (!docData) {
            throw new Error('Documento no encontrado');
        }
        
        // Abrir en nueva pestaña con parámetros de descarga
        const downloadUrl = `${CONFIG.API_BASE_URL}/documents/${id}/download`;
        window.open(downloadUrl, '_blank');
        
        showAlert('Descarga iniciada en nueva pestaña', 'success');
    } catch (error) {
        console.error('Error en descarga directa:', error);
        showAlert('Error al descargar documento: ' + error.message, 'error');
    }
}

function previewDocument(id) {
    console.log('👁️ Vista previa del documento:', id);
    
    const document = window.appState.documents.find(doc => doc._id === id);
    if (!document) {
        showAlert('Documento no encontrado', 'error');
        return;
    }
    
    // Abrir el documento en una nueva pestaña
    window.open(`${CONFIG.API_BASE_URL}/documents/${id}/preview`, '_blank');
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
            
            if (window.appState.currentTab === 'dashboard') {
                await window.loadDashboardData();
            }
        } else {
            throw new Error(data.message);
        }
        
    } catch (error) {
        console.error('❌ Error eliminando documento:', error);
        showAlert('Error al eliminar documento: ' + error.message, 'error');
    }
}

function handleFileSelect(e) {
    console.log('📁 Archivo seleccionado:', e.target.files[0]?.name);
    handleFile(e.target.files[0]);
}

function populateDocumentCategorySelect() {
    if (!DOM.documentCategory) return;
    
    DOM.documentCategory.innerHTML = '<option value="">Seleccionar categoría</option>';
    
    if (window.appState && window.appState.categories) {
        window.appState.categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.nombre;
            option.textContent = category.nombre;
            DOM.documentCategory.appendChild(option);
        });
    } else {
        console.warn('⚠️ No hay categorías disponibles en el estado');
    }
}

export { 
    openDocumentModal, 
    closeDocumentModal, 
    setupFileDragAndDrop, 
    handleFile, 
    handleUploadDocument, 
    loadDocuments, 
    renderDocumentsTable, 
    downloadDocument, 
    downloadDocumentDirect, 
    previewDocument, 
    deleteDocument, 
    handleFileSelect 
};