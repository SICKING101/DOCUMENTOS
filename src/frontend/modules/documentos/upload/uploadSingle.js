import { DOM } from '../../../dom.js';
import { CONFIG } from '../../../config.js';
import { setLoadingState, showAlert, formatFileSize } from '../../../utils.js';

/**
 * Maneja la selección de un archivo individual.
 * Valida el archivo y lo almacena en el estado global.
 * @param {File} file - Archivo seleccionado
 */
export function handleFile(file) {
    if (!file) {
        console.warn('⚠️ No se proporcionó archivo');
        return;
    }
    
    console.group(`📋 Procesando archivo individual: ${file.name}`);
    
    // Validar archivo
    const fileExtension = file.name.split('.').pop().toLowerCase();
    if (!CONFIG.ALLOWED_FILE_TYPES.includes(fileExtension)) {
        showAlert(`Tipo de archivo no permitido. Formatos aceptados: ${CONFIG.ALLOWED_FILE_TYPES.join(', ').toUpperCase()}`, 'error');
        console.groupEnd();
        return;
    }
    
    if (file.size > CONFIG.MAX_FILE_SIZE) {
        showAlert(`El archivo excede el tamaño máximo permitido (${formatFileSize(CONFIG.MAX_FILE_SIZE)})`, 'error');
        console.groupEnd();
        return;
    }
    
    // Guardar archivo en estado
    window.appState.selectedFile = file;
    
    // Mostrar información
    DOM.fileName.textContent = file.name;
    DOM.fileSize.textContent = formatFileSize(file.size);
    DOM.fileInfo.style.display = 'block';
    DOM.uploadDocumentBtn.disabled = false;
    
    console.log('✅ Archivo individual validado correctamente');
    console.groupEnd();
}

/**
 * Handler para el input de archivo individual.
 * @param {Event} e - Evento del input file
 */
export function handleFileSelect(e) {
    console.log('📁 Archivo individual seleccionado:', e.target.files[0]?.name);
    handleFile(e.target.files[0]);
}

/**
 * Maneja la subida de un documento individual.
 * Valida, prepara FormData y envía al servidor.
 */
export async function handleUploadDocument() {
    console.group('📤 Subiendo documento individual');
    
    if (!window.appState.selectedFile) {
        showAlert('Por favor selecciona un archivo', 'error');
        console.groupEnd();
        return;
    }
    
    if (!DOM.documentCategory.value) {
        showAlert('Por favor selecciona una categoría', 'error');
        console.groupEnd();
        return;
    }
    
    try {
        setLoadingState(true, DOM.uploadDocumentBtn);
        
        console.log('📋 Iniciando upload del documento...');
        console.log('📋 Archivo:', window.appState.selectedFile.name);
        console.log('📋 Tamaño:', formatFileSize(window.appState.selectedFile.size));
        
        const formData = new FormData();
        formData.append('file', window.appState.selectedFile);
        formData.append('descripcion', DOM.documentDescription.value);
        formData.append('categoria', DOM.documentCategory.value);
        formData.append('fecha_vencimiento', DOM.documentExpiration.value);
        formData.append('persona_id', DOM.documentPerson.value);

        console.log('📤 Enviando al servidor...');

        const response = await fetch(`${CONFIG.API_BASE_URL}/documents`, {
            method: 'POST',
            body: formData
        });

        console.log('📥 Respuesta:', response.status);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Error del servidor:', errorText);
            throw new Error(`Error del servidor (${response.status}): ${errorText}`);
        }

        const data = await response.json();
        console.log('📦 Datos de respuesta:', data);

        if (data.success) {
            showAlert(data.message, 'success');
            
            // Cargar documentos actualizados
            if (window.loadDocuments) {
                await window.loadDocuments();
            }
            
            // Cerrar modal
            if (window.closeDocumentModal) {
                window.closeDocumentModal();
            }
            
            // Recargar dashboard si es necesario
            if (window.appState.currentTab === 'dashboard' && window.loadDashboardData) {
                await window.loadDashboardData();
            }
        } else {
            throw new Error(data.message || 'Error desconocido');
        }
        
    } catch (error) {
        console.error('❌ Error subiendo documento:', error);
        showAlert('Error al subir documento: ' + error.message, 'error');
    } finally {
        setLoadingState(false, DOM.uploadDocumentBtn);
        console.groupEnd();
    }
}