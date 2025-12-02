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
            // CORRECCIÓN: Asegurar que todos los documentos tengan url_cloudinary
            window.appState.documents = (data.documents || []).map(doc => ({
                ...doc,
                // Si no tiene url_cloudinary pero sí cloudinary_url, usar ese
                url_cloudinary: doc.url_cloudinary || doc.cloudinary_url
            }));
            
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

// FUNCIÓN DEFINITIVA CORREGIDA PARA TODOS LOS TIPOS DE ARCHIVO
async function downloadDocument(id) {
    console.group('📥 DESCARGA UNIVERSAL - INICIO');
    console.log('🆔 ID del documento:', id);
    
    try {
        // Buscar el documento en el estado
        const docData = window.appState.documents.find(doc => doc._id === id);
        
        if (!docData) {
            throw new Error('Documento no encontrado');
        }
        
        const fileName = docData.nombre_original;
        const fileType = docData.tipo_archivo;
        const cloudinaryUrl = docData.url_cloudinary || docData.cloudinary_url;
        
        console.log('✅ Documento encontrado:', {
            nombre: fileName,
            tipo: fileType,
            url: cloudinaryUrl
        });

        showAlert(`Preparando descarga: ${fileName}`, 'info');

        // DETECTAR TIPO DE ARCHIVO Y APLICAR ESTRATEGIA CORRECTA
        const fileExtension = fileName.split('.').pop().toLowerCase();
        const isImage = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp'].includes(fileExtension);
        const isPDF = fileExtension === 'pdf';
        const isDocument = ['doc', 'docx', 'txt', 'rtf'].includes(fileExtension);
        const isSpreadsheet = ['xls', 'xlsx', 'csv'].includes(fileExtension);

        console.log('🔍 Análisis de tipo de archivo:', {
            extension: fileExtension,
            esImagen: isImage,
            esPDF: isPDF,
            esDocumento: isDocument,
            esHojaCalculo: isSpreadsheet
        });

        // ESTRATEGIA 1: PARA ARCHIVOS DE IMAGEN (funcionan directo)
        if (isImage) {
            console.log('🖼️ Estrategia para imagen: Descarga directa');
            await downloadImageFile(cloudinaryUrl, fileName);
            return;
        }

        // ESTRATEGIA 2: PARA PDF Y OTROS DOCUMENTOS (requieren endpoint del servidor)
        console.log('📄 Estrategia para PDF/Documentos: Usar endpoint del servidor');
        
        const serverDownloadUrl = `${CONFIG.API_BASE_URL}/documents/${id}/download`;
        console.log('🔗 Endpoint del servidor:', serverDownloadUrl);
        
        // Verificar que el endpoint existe
        const response = await fetch(serverDownloadUrl, { method: 'HEAD' });
        
        if (response.ok) {
            console.log('✅ Endpoint de descarga disponible');
            
            // Descargar usando el endpoint del servidor
            const downloadResponse = await fetch(serverDownloadUrl);
            
            if (!downloadResponse.ok) {
                throw new Error(`Error del servidor: ${downloadResponse.status}`);
            }
            
            const blob = await downloadResponse.blob();
            
            if (blob.size === 0) {
                throw new Error('Archivo vacío recibido');
            }
            
            // Crear descarga con blob
            const blobUrl = URL.createObjectURL(blob);
            const downloadLink = document.createElement('a');
            downloadLink.href = blobUrl;
            downloadLink.download = fileName;
            downloadLink.style.display = 'none';
            
            document.body.appendChild(downloadLink);
            downloadLink.click();
            
            // Limpiar
            setTimeout(() => {
                document.body.removeChild(downloadLink);
                URL.revokeObjectURL(blobUrl);
            }, 1000);
            
            console.log('✅ Descarga de PDF/documento completada');
            showAlert(`Descarga completada: ${fileName}`, 'success');
            
        } else {
            throw new Error('Endpoint de descarga no disponible');
        }
        
    } catch (error) {
        console.error('❌ ERROR en descarga:', error);
        
        // ESTRATEGIA DE EMERGENCIA: Enlace directo
        console.log('🆘 Estrategia de emergencia: Enlace directo');
        try {
            const docData = window.appState.documents.find(doc => doc._id === id);
            if (docData) {
                const cloudinaryUrl = docData.url_cloudinary || docData.cloudinary_url;
                if (cloudinaryUrl) {
                    window.open(cloudinaryUrl, '_blank');
                    showAlert('Abriendo documento en nueva pestaña', 'info');
                }
            }
        } catch (finalError) {
            console.error('💥 ERROR crítico:', finalError);
            showAlert(`Error al descargar: ${error.message}`, 'error');
        }
    } finally {
        console.groupEnd();
    }
}

// FUNCIÓN AUXILIAR PARA DESCARGAR IMÁGENES
async function downloadImageFile(url, fileName) {
    console.log('🖼️ Descargando imagen...');
    
    const response = await fetch(url);
    
    if (!response.ok) {
        throw new Error(`Error al descargar imagen: ${response.status}`);
    }
    
    const blob = await response.blob();
    
    if (blob.size === 0) {
        throw new Error('Imagen vacía recibida');
    }
    
    const blobUrl = URL.createObjectURL(blob);
    const downloadLink = document.createElement('a');
    downloadLink.href = blobUrl;
    downloadLink.download = fileName;
    downloadLink.style.display = 'none';
    
    document.body.appendChild(downloadLink);
    downloadLink.click();
    
    setTimeout(() => {
        document.body.removeChild(downloadLink);
        URL.revokeObjectURL(blobUrl);
    }, 1000);
    
    console.log('✅ Imagen descargada correctamente');
}

// FUNCIÓN MEJORADA PARA VISTA PREVIA
function previewDocument(id) {
    console.group('👁️ VISTA PREVIA UNIVERSAL - INICIO');
    
    const document = window.appState.documents.find(doc => doc._id === id);
    if (!document) {
        showAlert('Documento no encontrado', 'error');
        console.groupEnd();
        return;
    }
    
    const fileName = document.nombre_original;
    const fileExtension = fileName.split('.').pop().toLowerCase();
    const cloudinaryUrl = document.url_cloudinary || document.cloudinary_url;
    
    console.log('📋 Documento para vista previa:', {
        nombre: fileName,
        tipo: fileExtension,
        url: cloudinaryUrl
    });

    // ESTRATEGIAS DIFERENTES SEGÚN EL TIPO DE ARCHIVO
    const previewableImages = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp'];
    const previewablePDF = ['pdf'];
    const nonPreviewable = ['doc', 'docx', 'xls', 'xlsx', 'txt', 'csv'];

    if (previewableImages.includes(fileExtension)) {
        // Imágenes: abrir directamente
        console.log('🖼️ Vista previa de imagen');
        window.open(cloudinaryUrl, '_blank');
        showAlert('Abriendo imagen...', 'info');
        
    } else if (previewablePDF.includes(fileExtension)) {
        // PDF: usar el endpoint de vista previa del servidor
        console.log('📄 Vista previa de PDF');
        const previewUrl = `${CONFIG.API_BASE_URL}/documents/${id}/preview`;
        window.open(previewUrl, '_blank');
        showAlert('Abriendo PDF...', 'info');
        
    } else if (nonPreviewable.includes(fileExtension)) {
        // Documentos no previewable: forzar descarga
        console.log('📝 Archivo no previewable, iniciando descarga');
        downloadDocument(id);
        
    } else {
        // Tipo desconocido: intentar abrir directamente
        console.log('❓ Tipo desconocido, intentando abrir directamente');
        window.open(cloudinaryUrl, '_blank');
        showAlert('Abriendo documento...', 'info');
    }
    
    console.groupEnd();
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

// FUNCIÓN DE DIAGNÓSTICO MEJORADA
function debugDocumentDownload(id) {
    console.group('🐛 DIAGNÓSTICO UNIVERSAL DE DESCARGA');
    
    const doc = window.appState.documents.find(d => d._id === id);
    if (!doc) {
        console.error('❌ Documento no encontrado');
        console.groupEnd();
        return;
    }
    
    const fileExtension = doc.nombre_original.split('.').pop().toLowerCase();
    
    console.log('📊 INFORMACIÓN DEL DOCUMENTO:');
    console.table({
        'ID': doc._id,
        'Nombre': doc.nombre_original,
        'Tipo': doc.tipo_archivo,
        'Extensión': fileExtension,
        'Tamaño': `${doc.tamano_archivo} bytes`,
        'URL Cloudinary': doc.url_cloudinary || doc.cloudinary_url
    });
    
    console.log('🎯 ESTRATEGIA RECOMENDADA:');
    if (['png', 'jpg', 'jpeg', 'gif'].includes(fileExtension)) {
        console.log('💡 IMAGEN: Usar descarga directa desde Cloudinary');
    } else if (fileExtension === 'pdf') {
        console.log('💡 PDF: Usar endpoint del servidor (/download)');
    } else {
        console.log('💡 OTRO TIPO: Usar endpoint del servidor o enlace directo');
    }
    
    console.groupEnd();
}

// FUNCIÓN SIMPLIFICADA PARA PRUEBAS RÁPIDAS
function downloadDocumentSimple(id) {
    const doc = window.appState.documents.find(d => d._id === id);
    if (!doc) {
        showAlert('Documento no encontrado', 'error');
        return;
    }
    
    const fileExtension = doc.nombre_original.split('.').pop().toLowerCase();
    
    if (['png', 'jpg', 'jpeg', 'gif'].includes(fileExtension)) {
        // Imágenes: descarga directa
        const link = document.createElement('a');
        link.href = doc.url_cloudinary || doc.cloudinary_url;
        link.download = doc.nombre_original;
        link.click();
        showAlert(`Descargando imagen: ${doc.nombre_original}`, 'success');
    } else {
        // Otros archivos: usar endpoint
        window.open(`${CONFIG.API_BASE_URL}/documents/${id}/download`, '_blank');
        showAlert(`Descargando: ${doc.nombre_original}`, 'success');
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
    previewDocument, 
    deleteDocument, 
    handleFileSelect,
    populateDocumentCategorySelect,
    debugDocumentDownload,
    downloadDocumentSimple
};