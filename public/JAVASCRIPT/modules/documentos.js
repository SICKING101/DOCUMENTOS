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
                <button class="btn btn--sm btn--outline" onclick="window.downloadDocument('${doc._id}')" title="Descargar">
                    <i class="fas fa-download"></i>
                </button>
                <button class="btn btn--sm btn--outline" onclick="window.previewDocument('${doc._id}')" title="Vista previa">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="btn btn--sm btn--danger" onclick="window.deleteDocument('${doc._id}')" title="Eliminar">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        
        DOM.documentosTableBody.appendChild(row);
    });
}

// En documentos.js, reemplaza la función downloadDocument con esta versión ULTRA SIMPLE:

async function downloadDocument(id) {
    console.group('🚀 DESCARGAR DOCUMENTO - VERSIÓN SIMPLE');
    
    try {
        // Verificar que estamos en un navegador
        if (typeof window === 'undefined' || typeof document === 'undefined') {
            throw new Error('Este método solo funciona en el navegador');
        }
        
        // Buscar documento
        const doc = window.appState.documents.find(d => d._id === id);
        if (!doc) {
            throw new Error('Documento no encontrado');
        }
        
        const fileName = doc.nombre_original;
        
        console.log('📄 Descargando:', {
            id: id,
            nombre: fileName,
            tipo: doc.tipo_archivo
        });
        
        showAlert(`Iniciando descarga: ${fileName}`, 'info');
        
        // URL del endpoint
        const endpoint = `${CONFIG.API_BASE_URL}/documents/${id}/download`;
        
        // Agregar parámetros para evitar caché
        const url = new URL(endpoint);
        url.searchParams.append('t', Date.now());
        url.searchParams.append('filename', fileName);
        
        const finalUrl = url.toString();
        console.log('🔗 URL final:', finalUrl);
        
        // MÉTODO 1: Enlace temporal (el más confiable)
        const link = document.createElement('a');
        link.href = finalUrl;
        link.download = fileName;
        
        // Para documentos no-imagen, abrir en nueva pestaña
        const fileExtension = fileName.split('.').pop().toLowerCase();
        const isImage = ['png', 'jpg', 'jpeg', 'gif'].includes(fileExtension);
        
        if (!isImage) {
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
        }
        
        link.style.display = 'none';
        document.body.appendChild(link);
        
        // Hacer clic
        link.click();
        
        // Limpiar después de 3 segundos
        setTimeout(() => {
            if (link.parentNode) {
                document.body.removeChild(link);
            }
        }, 3000);
        
        console.log('✅ Descarga iniciada');
        showAlert(`Descarga iniciada: ${fileName}`, 'success');
        
        // También abrir en nueva pestaña como respaldo
        setTimeout(() => {
            window.open(finalUrl, '_blank');
        }, 100);
        
        console.groupEnd();
        return true;
        
    } catch (error) {
        console.error('❌ Error en descarga:', error);
        
        // Mostrar error específico
        let errorMessage = `Error: ${error.message}`;
        
        if (error.message.includes('document is not defined')) {
            errorMessage = 'Error del navegador. Intenta recargar la página.';
        } else if (error.message.includes('fetch') || error.message.includes('network')) {
            errorMessage = 'Error de red. Verifica tu conexión a internet.';
        }
        
        showAlert(errorMessage, 'error');
        console.groupEnd();
        return false;
    }
}

// Función de diagnóstico rápido
async function diagnosticDownload(id) {
    const doc = window.appState.documents.find(d => d._id === id);
    if (!doc) {
        showAlert('Documento no encontrado', 'error');
        return;
    }
    
    console.group('🔍 DIAGNÓSTICO RÁPIDO');
    console.log('📄 Documento:', {
        nombre: doc.nombre_original,
        tipo: doc.tipo_archivo,
        tamaño: doc.tamano_archivo,
        tieneCloudinaryUrl: !!(doc.cloudinary_url || doc.url_cloudinary)
    });
    
    // Probar diferentes métodos
    const methods = [
        {
            name: 'Endpoint directo',
            url: `${CONFIG.API_BASE_URL}/documents/${id}/download?t=${Date.now()}`
        },
        {
            name: 'Endpoint con filename',
            url: `${CONFIG.API_BASE_URL}/documents/${id}/download?t=${Date.now()}&filename=${encodeURIComponent(doc.nombre_original)}`
        }
    ];
    
    if (doc.cloudinary_url || doc.url_cloudinary) {
        const cloudinaryUrl = doc.cloudinary_url || doc.url_cloudinary;
        methods.push({
            name: 'Cloudinary directo',
            url: cloudinaryUrl
        });
    }
    
    console.table(methods);
    
    // Abrir todos los métodos en pestañas diferentes
    methods.forEach((method, index) => {
        setTimeout(() => {
            console.log(`🔄 Probando método ${index + 1}: ${method.name}`);
            window.open(method.url, '_blank');
        }, index * 1000);
    });
    
    showAlert(`Probando ${methods.length} métodos de descarga...`, 'info');
    console.groupEnd();
}

// =============================================================================
// FUNCIÓN DE VISTA PREVIA MEJORADA
// =============================================================================
function previewDocument(id) {
    console.group('👁️ VISTA PREVIA MEJORADA');
    
    try {
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
            extension: fileExtension,
            url: cloudinaryUrl
        });
        
        // Determinar estrategia según tipo
        const previewableImages = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp'];
        const previewablePDF = ['pdf'];
        const officeDocuments = ['doc', 'docx', 'xls', 'xlsx'];
        
        if (previewableImages.includes(fileExtension)) {
            // Imágenes: abrir directamente
            console.log('🖼️ Vista previa de imagen');
            if (cloudinaryUrl) {
                window.open(cloudinaryUrl, '_blank');
                showAlert('Abriendo imagen en nueva pestaña...', 'info');
            }
            
        } else if (previewablePDF.includes(fileExtension)) {
            // PDF: usar endpoint de preview del servidor
            console.log('📄 Vista previa de PDF');
            const previewUrl = `${CONFIG.API_BASE_URL}/documents/${id}/preview`;
            window.open(previewUrl, '_blank');
            showAlert('Abriendo PDF en nueva pestaña...', 'info');
            
        } else if (officeDocuments.includes(fileExtension)) {
            // Documentos Office: forzar descarga
            console.log('📝 Documento Office, forzando descarga');
            downloadDocument(id);
            
        } else {
            // Otros tipos: intentar abrir directamente
            console.log('❓ Tipo desconocido, intentando abrir');
            if (cloudinaryUrl) {
                window.open(cloudinaryUrl, '_blank');
                showAlert('Abriendo documento en nueva pestaña...', 'info');
            } else {
                showAlert('No se puede previsualizar este tipo de archivo', 'warning');
            }
        }
        
    } catch (error) {
        console.error('❌ Error en vista previa:', error);
        showAlert(`Error: ${error.message}`, 'error');
    } finally {
        console.groupEnd();
    }
}

// =============================================================================
// FUNCIÓN PARA ELIMINAR DOCUMENTO
// =============================================================================
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

// =============================================================================
// FUNCIONES AUXILIARES
// =============================================================================
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

// =============================================================================
// FUNCIÓN DE DESCARGAS MÚLTIPLES Y EMERGENCIA
// =============================================================================
async function downloadDocumentSimple(id) {
    const doc = window.appState.documents.find(d => d._id === id);
    if (!doc) {
        showAlert('Documento no encontrado', 'error');
        return;
    }
    
    console.log('⚡ Descarga simple para:', doc.nombre_original);
    
    const url = `${CONFIG.API_BASE_URL}/documents/${id}/download?simple=true&t=${Date.now()}`;
    
    // Método ultra simple: abrir URL
    window.open(url, '_blank');
    
    showAlert(`Descargando: ${doc.nombre_original}`, 'info');
}

async function downloadDocumentAlternative(id) {
    console.group('🔄 DESCARGAR DOCUMENTO - MÉTODO ALTERNATIVO');
    
    try {
        const doc = window.appState.documents.find(d => d._id === id);
        if (!doc) {
            throw new Error('Documento no encontrado');
        }
        
        const fileName = doc.nombre_original;
        const endpoint = `${CONFIG.API_BASE_URL}/documents/${id}/download`;
        
        console.log('📄 Usando método alternativo para:', fileName);
        showAlert(`Descargando: ${fileName}...`, 'info');
        
        // Crear formulario oculto
        const form = document.createElement('form');
        form.method = 'GET';
        form.action = endpoint;
        form.target = '_blank';
        form.style.display = 'none';
        
        // Agregar parámetros
        const timestampInput = document.createElement('input');
        timestampInput.type = 'hidden';
        timestampInput.name = 't';
        timestampInput.value = Date.now();
        form.appendChild(timestampInput);
        
        // Agregar al body y enviar
        document.body.appendChild(form);
        form.submit();
        
        // Limpiar
        setTimeout(() => {
            if (form.parentNode) {
                document.body.removeChild(form);
            }
        }, 3000);
        
        console.log('✅ Formulario enviado para descarga');
        console.groupEnd();
        return true;
        
    } catch (error) {
        console.error('❌ Error en método alternativo:', error);
        showAlert(`Error: ${error.message}`, 'error');
        console.groupEnd();
        return false;
    }
}

// =============================================================================
// FUNCIONES DE DIAGNÓSTICO
// =============================================================================
async function debugDocumentDownload(id) {
    console.group('🐛 DIAGNÓSTICO DE DESCARGA');
    
    try {
        const doc = window.appState.documents.find(d => d._id === id);
        if (!doc) {
            console.error('❌ Documento no encontrado');
            showAlert('Documento no encontrado', 'error');
            console.groupEnd();
            return;
        }
        
        console.log('📊 INFORMACIÓN DEL DOCUMENTO:');
        console.table({
            'ID': doc._id,
            'Nombre': doc.nombre_original,
            'Tipo': doc.tipo_archivo,
            'Tamaño': `${doc.tamano_archivo} bytes (${formatFileSize(doc.tamano_archivo)})`,
            'URL Cloudinary': doc.url_cloudinary || doc.cloudinary_url,
            'Fecha subida': formatDate(doc.fecha_subida)
        });
        
        // Probar diferentes métodos
        console.log('🧪 PROBANDO MÉTODOS DE DESCARGA:');
        
        // Método 1: Endpoint directo
        const endpoint = `${CONFIG.API_BASE_URL}/documents/${id}/download`;
        console.log('1️⃣ Endpoint:', endpoint);
        
        // Método 2: URL Cloudinary
        if (doc.url_cloudinary || doc.cloudinary_url) {
            console.log('2️⃣ Cloudinary URL:', doc.url_cloudinary || doc.cloudinary_url);
        }
        
        // Recomendaciones
        console.log('💡 RECOMENDACIONES:');
        const extension = doc.nombre_original.split('.').pop().toLowerCase();
        
        if (['png', 'jpg', 'jpeg', 'gif'].includes(extension)) {
            console.log('   • Usar endpoint del servidor o URL directa de Cloudinary');
        } else if (extension === 'pdf') {
            console.log('   • Usar endpoint del servidor (/download)');
        } else {
            console.log('   • Usar endpoint del servidor siempre');
        }
        
        showAlert(`Diagnóstico completado para: ${doc.nombre_original}`, 'info');
        
    } catch (error) {
        console.error('❌ Error en diagnóstico:', error);
        showAlert('Error en diagnóstico: ' + error.message, 'error');
    } finally {
        console.groupEnd();
    }
}

// =============================================================================
// FUNCIÓN DE TEST
// =============================================================================
async function testAllDownloads() {
    console.group('🧪 TEST COMPLETO DE DESCARGAS');
    
    if (!window.appState.documents || window.appState.documents.length === 0) {
        showAlert('No hay documentos para probar', 'warning');
        console.groupEnd();
        return;
    }
    
    const testDocuments = window.appState.documents.slice(0, 2); // Probar solo 2
    const results = [];
    
    showAlert(`Iniciando test de ${testDocuments.length} descargas...`, 'info');
    
    for (const doc of testDocuments) {
        console.log(`\n🔍 Probando: ${doc.nombre_original}`);
        
        try {
            const startTime = Date.now();
            await downloadDocument(doc._id);
            const endTime = Date.now();
            
            results.push({
                documento: doc.nombre_original,
                tipo: doc.tipo_archivo,
                tamaño: formatFileSize(doc.tamano_archivo),
                tiempo: `${endTime - startTime}ms`,
                estado: '✅ EXITOSO'
            });
            
            // Esperar entre descargas
            await new Promise(resolve => setTimeout(resolve, 2000));
            
        } catch (error) {
            results.push({
                documento: doc.nombre_original,
                tipo: doc.tipo_archivo,
                tamaño: formatFileSize(doc.tamano_archivo),
                tiempo: 'N/A',
                estado: `❌ FALLIDO: ${error.message}`
            });
        }
    }
    
    // Mostrar resultados
    console.table(results);
    
    const successful = results.filter(r => r.estado.includes('✅')).length;
    const total = results.length;
    
    console.log(`\n📊 RESULTADO: ${successful}/${total} descargas exitosas`);
    
    if (successful === total) {
        showAlert('✅ Todas las descargas funcionan correctamente', 'success');
    } else if (successful > 0) {
        showAlert(`⚠️ ${successful}/${total} descargas exitosas`, 'warning');
    } else {
        showAlert('❌ Todas las descargas fallaron', 'error');
    }
    
    console.groupEnd();
}

// =============================================================================
// EXPORTACIONES
// =============================================================================
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
    downloadDocumentSimple,
    downloadDocumentAlternative,
    testAllDownloads
};