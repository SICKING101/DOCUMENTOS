// =============================================================================
// src/frontend/modules/documentos/modals/documentModal.js (MODIFICADO)
// =============================================================================

import { DOM } from '../../../dom.js';
import { showAlert } from '../../../utils.js';
import { requirePermission, PERMISSIONS } from '../../../permissions.js';
import { handleUploadDocument } from '../upload/uploadSingle.js';
import { handleUploadMultipleDocuments, getMultipleUploadState } from '../upload/uploadMultiple.js';
import { CONFIG } from '../../../config.js';
import {
    initSingleCategoryChips,
    initMultipleCategoryChips,
    initSinglePersonAutocomplete,
    initMultiplePersonAutocomplete,
    singleCategoryChips,
    multipleCategoryChips
} from './modalHelpers.js';
import { SizeValidator } from './sizeValidator.js';

// Variables globales del módulo
let eventListenersInitialized = false;
let sizeValidator = null;

// ═══════════════════════════════════════════════════════════
// APERTURA DEL MODAL
// ═══════════════════════════════════════════════════════════

/**
 * Abre el modal de documentos con la configuración inicial
 * @param {string} mode - 'single' para subida única, 'multiple' para múltiple
 */
export async function openDocumentModal(mode = 'single', presetCategory = '') {
    console.group(`📂 Abriendo modal de documentos - Modo: ${mode}`);

    try {
        if (!requirePermission(PERMISSIONS.UPLOAD_DOCUMENTS, {
            onDenied: (msg) => showAlert(msg, 'error')
        })) {
            return;
        }

        DOM.documentModal.style.display = 'flex';
        document.body.classList.add('modal-open');

        initializeComponents();

        // ✅ Detectar categoría actual si no se pasó una
        let categoryToPreselect = presetCategory;
        if (!categoryToPreselect) {
            categoryToPreselect = getCurrentCategoryName();
        }
        console.log('🏷️ Categoría a preseleccionar:', categoryToPreselect || '(ninguna)');

        // ✅ Preseleccionar en ambos modos
        if (categoryToPreselect) {
            setTimeout(() => {
                if (singleCategoryChips) {
                    singleCategoryChips.setCategory(categoryToPreselect);
                }
                if (multipleCategoryChips) {
                    multipleCategoryChips.setCategory(categoryToPreselect);
                }
            }, 400);
        }

        switchUploadMode(mode);

        if (!eventListenersInitialized) {
            setupEventListeners();
            eventListenersInitialized = true;
        }

        console.log('✅ Modal abierto exitosamente');

    } catch (error) {
        console.error('❌ Error abriendo modal:', error);
        showAlert('Error al abrir el formulario de documentos', 'error');
    } finally {
        console.groupEnd();
    }
}

/**
 * ✅ Obtiene la categoría actual desde el navegador de categorías
 */
function getCurrentCategoryName() {
    // Opción 1: Desde categoryNavState (navegación por carpetas)
    if (window.categoryNavState && window.categoryNavState.stack && window.categoryNavState.stack.length > 0) {
        const current = window.categoryNavState.stack[window.categoryNavState.stack.length - 1];
        if (current && current.nombre) {
            console.log('🏷️ Categoría detectada (navState):', current.nombre);
            return current.nombre;
        }
    }

    // Opción 2: Desde appState.filters.category
    if (window.appState?.filters?.category) {
        console.log('🏷️ Categoría detectada (filters):', window.appState.filters.category);
        return window.appState.filters.category;
    }

    // Opción 3: Desde el select de filtro
    const filterCategory = document.getElementById('filterCategory');
    if (filterCategory && filterCategory.value) {
        console.log('🏷️ Categoría detectada (select):', filterCategory.value);
        return filterCategory.value;
    }

    return '';
}

/**
 * Inicializa todos los componentes del modal
 */
function initializeComponents() {
    // Inicializar validador de tamaño
    if (!sizeValidator) {
        sizeValidator = new SizeValidator({
            sizeBarFillId: 'sizeBarFill',
            sizeUsedId: 'sizeUsed',
            sizeBadgeId: 'fileSizeBadge',
            sizeErrorId: 'sizeError',
            previewContainerId: 'filePreview'
        });
    }

    // Inicializar selectores de categorías (chips)
    initSingleCategoryChips();
    initMultipleCategoryChips();

    // Inicializar autocompletados de personas
    initSinglePersonAutocomplete();
    initMultiplePersonAutocomplete();

    // Actualizar fecha mínima de vencimiento
    if (DOM.documentExpiration) {
        const today = new Date().toISOString().split('T')[0];
        DOM.documentExpiration.min = today;
    }
}

// ═══════════════════════════════════════════════════════════
// CIERRE DEL MODAL
// ═══════════════════════════════════════════════════════════

/**
 * Cierra el modal de documentos
 */
export function closeDocumentModal() {
    console.log('❌ Cerrando modal de documentos');

    // ✅ SUPRIMIR NOTIFICACIONES DURANTE EL CIERRE
    window.__SUPPRESS_NOTIFICATIONS = true;

    // Ocultar modal
    DOM.documentModal.style.display = 'none';
    document.body.classList.remove('modal-open');

    // Resetear formulario
    if (DOM.documentForm) {
        DOM.documentForm.reset();
    }

    // Resetear inputs de archivo
    if (DOM.fileInput) DOM.fileInput.value = '';
    if (DOM.multipleFileInput) DOM.multipleFileInput.value = '';

    // Resetear validador
    if (sizeValidator) sizeValidator.reset();

    // Ocultar preview
    const filePreview = document.getElementById('filePreview');
    if (filePreview) filePreview.style.display = 'none';

    // Limpiar selecciones
    if (singleCategoryChips) singleCategoryChips.clearSelection();
    if (multipleCategoryChips) multipleCategoryChips.clearSelection();

    // Resetear estado global
    if (window.appState) {
        window.appState.selectedFile = null;
    }

    // Resetear estado de subida múltiple
    const multipleState = getMultipleUploadState();
    if (multipleState && multipleState.files.length > 0) {
        // No resetear si hay archivos en progreso
    }

    // ✅ RESTAURAR NOTIFICACIONES DESPUÉS DE UN BREVE DELAY
    setTimeout(() => {
        window.__SUPPRESS_NOTIFICATIONS = false;
    }, 500);

    console.log('✅ Modal cerrado');
}

// ═══════════════════════════════════════════════════════════
// CAMBIO DE MODO (ÚNICO / MÚLTIPLE)
// ═══════════════════════════════════════════════════════════

/**
 * Cambia entre modo de subida único y múltiple
 */
export function switchUploadMode(mode) {
    console.log(`🔄 Cambiando a modo: ${mode}`);

    // Actualizar tabs
    const tabs = document.querySelectorAll('.upload-tab');
    tabs.forEach(tab => {
        if (tab.dataset.mode === mode) {
            tab.classList.add('upload-tab--active');
        } else {
            tab.classList.remove('upload-tab--active');
        }
    });

    // Mostrar/ocultar contenedores
    const singleContainer = document.getElementById('singleUploadContainer');
    const multipleContainer = document.getElementById('multipleUploadContainer');

    if (mode === 'single') {
        if (singleContainer) singleContainer.classList.add('upload-container--active');
        if (multipleContainer) multipleContainer.classList.remove('upload-container--active');

        if (DOM.uploadDocumentBtn) DOM.uploadDocumentBtn.style.display = 'flex';
        if (DOM.uploadMultipleDocumentsBtn) DOM.uploadMultipleDocumentsBtn.style.display = 'none';
    } else {
        if (singleContainer) singleContainer.classList.remove('upload-container--active');
        if (multipleContainer) multipleContainer.classList.add('upload-container--active');

        if (DOM.uploadDocumentBtn) DOM.uploadDocumentBtn.style.display = 'none';
        if (DOM.uploadMultipleDocumentsBtn) DOM.uploadMultipleDocumentsBtn.style.display = 'flex';

        // Actualizar contador de archivos
        updateMultipleFileCount();
    }
}

// ═══════════════════════════════════════════════════════════
// EVENT LISTENERS
// ═══════════════════════════════════════════════════════════

/**
 * Configura todos los event listeners del modal
 */
/**
 * Configura todos los event listeners del modal
 * ✅ CORREGIDO: Usa document.getElementById() en lugar de DOM
 */
function setupEventListeners() {
    console.log('🔧 Configurando event listeners del modal');

    // Tabs de modo
    const tabs = document.querySelectorAll('.upload-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const mode = tab.dataset.mode;
            switchUploadMode(mode);
        });
    });

    // Botón de cancelar
    const cancelBtn = document.getElementById('cancelDocumentBtn');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', closeDocumentModal);
    }

    // Cerrar con X
    const closeBtn = document.querySelector('.modal__close--circle');
    if (closeBtn) {
        closeBtn.addEventListener('click', closeDocumentModal);
    }

    // Cerrar con Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && DOM.documentModal.style.display === 'flex') {
            closeDocumentModal();
        }
    });

    // Cerrar clickeando fuera del modal
    DOM.documentModal.addEventListener('click', (e) => {
        if (e.target === DOM.documentModal) {
            closeDocumentModal();
        }
    });

    // ═══ MODO ÚNICO ═══

    // Botón de explorar archivos
    const browseFilesBtn = document.getElementById('browseFilesBtn');
    const fileInput = document.getElementById('fileInput');
    if (browseFilesBtn && fileInput) {
        browseFilesBtn.addEventListener('click', () => {
            fileInput.click();
        });
        console.log('✅ Listener: browseFilesBtn → fileInput');
    }

    // Input de archivo único
    if (fileInput) {
        fileInput.addEventListener('change', handleSingleFileSelect);
        console.log('✅ Listener: fileInput change');
    }

    // Botón de quitar archivo
    const removeFileBtn = document.getElementById('removeFileBtn');
    if (removeFileBtn) {
        removeFileBtn.addEventListener('click', removeSingleFile);
        console.log('✅ Listener: removeFileBtn');
    }

    // Botón de subir documento único
    const uploadDocumentBtn = document.getElementById('uploadDocumentBtn');
    if (uploadDocumentBtn) {
        uploadDocumentBtn.addEventListener('click', (e) => {
            e.preventDefault();
            handleUploadDocumentClick();
        });
        console.log('✅ Listener: uploadDocumentBtn');
    }

    // ═══ MODO MÚLTIPLE ═══

    // Botón de explorar archivos múltiples
    const browseMultipleFilesBtn = document.getElementById('browseMultipleFilesBtn');
    const multipleFileInput = document.getElementById('multipleFileInput');
    if (browseMultipleFilesBtn && multipleFileInput) {
        browseMultipleFilesBtn.addEventListener('click', () => {
            multipleFileInput.click();
        });
        console.log('✅ Listener: browseMultipleFilesBtn → multipleFileInput');
    }

    // Input de archivos múltiples
    if (multipleFileInput) {
        multipleFileInput.addEventListener('change', handleMultipleFileSelect);
        console.log('✅ Listener: multipleFileInput change');
    }

    // Botón de subir múltiples
    const uploadMultipleDocumentsBtn = document.getElementById('uploadMultipleDocumentsBtn');
    if (uploadMultipleDocumentsBtn) {
        uploadMultipleDocumentsBtn.addEventListener('click', (e) => {
            e.preventDefault();
            handleUploadMultipleClick();
        });
        console.log('✅ Listener: uploadMultipleDocumentsBtn');
    }

    // Toggle opciones avanzadas
    const toggleAdvanced = document.getElementById('toggleAdvancedOptions');
    const advancedOptions = document.getElementById('advancedOptions');
    if (toggleAdvanced && advancedOptions) {
        toggleAdvanced.addEventListener('click', () => {
            const isOpen = advancedOptions.style.display !== 'none';
            advancedOptions.style.display = isOpen ? 'none' : 'block';
            toggleAdvanced.classList.toggle('multiple-advanced__toggle--open', !isOpen);
        });
        console.log('✅ Listener: toggleAdvancedOptions');
    }

    // ═══ DRAG & DROP ═══
    setupDragAndDrop();

    console.log('✅ Todos los event listeners configurados');
}

/**
 * Configura drag & drop para los dropzones
 */
function setupDragAndDrop() {
    const dropzones = document.querySelectorAll('.dropzone');

    dropzones.forEach(dropzone => {
        // Prevenir comportamiento por defecto
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropzone.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
            });
        });

        // Efectos visuales al arrastrar
        ['dragenter', 'dragover'].forEach(eventName => {
            dropzone.addEventListener(eventName, () => {
                dropzone.classList.add('dropzone--active');
            });
        });

        ['dragleave', 'drop'].forEach(eventName => {
            dropzone.addEventListener(eventName, () => {
                dropzone.classList.remove('dropzone--active');
            });
        });

        // Manejar soltar archivos
        dropzone.addEventListener('drop', (e) => {
            const files = e.dataTransfer.files;
            if (files.length === 0) return;

            // Determinar si es modo único o múltiple
            const isMultiple = dropzone.classList.contains('dropzone--multiple');

            if (isMultiple) {
                // Verificar que la categoría esté seleccionada
                const category = multipleCategoryChips ? multipleCategoryChips.getSelectedCategory() : '';
                if (!category) {
                    showAlert('⚠️ Selecciona una categoría primero', 'warning');
                    return;
                }
                handleMultipleFilesDrop(files);
            } else {
                // Modo único: solo el primer archivo
                handleSingleFileDrop(files[0]);
            }
        });
    });
}

// ═══════════════════════════════════════════════════════════
// MANEJO DE ARCHIVOS - MODO ÚNICO
// ═══════════════════════════════════════════════════════════

/**
 * Maneja la selección de un archivo único
 */
function handleSingleFileSelect(e) {
    console.log('📁 Evento change disparado en fileInput');
    const file = e.target.files[0];
    if (!file) {
        console.warn('⚠️ No se seleccionó archivo');
        return;
    }
    processSingleFile(file);
}

/**
 * Maneja el drop de un archivo único
 */
function handleSingleFileDrop(file) {
    if (!file) return;

    // Simular selección en el input
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    DOM.fileInput.files = dataTransfer.files;

    processSingleFile(file);
}

/**
 * Procesa un archivo único: valida y muestra preview
 */
function processSingleFile(file) {
    console.log(`📁 Procesando archivo: ${file.name}`);
    console.log('📏 Tamaño:', file.size, 'bytes');

    const fileExtension = file.name.split('.').pop().toLowerCase();
    console.log('📎 Extensión:', fileExtension);
    console.log('✅ Extensiones permitidas:', CONFIG.ALLOWED_FILE_TYPES);

    if (!CONFIG.ALLOWED_FILE_TYPES.includes(fileExtension)) {
        showAlert(`Tipo de archivo no permitido: .${fileExtension}`, 'error');
        DOM.fileInput.value = '';
        return;
    }

    // Validar tamaño
    console.log('🔍 Validando tamaño con sizeValidator...');
    const validation = sizeValidator.validateFile(file);
    console.log('📊 Resultado validación:', validation);

    if (!validation.isValid) {
        showAlert(validation.message, 'error');
        showFilePreview(file, validation);
        DOM.fileInput.value = '';
        return;
    }

    // ✅ Guardar en estado global
    console.log('💾 Guardando archivo en window.appState...');
    window.appState.selectedFile = file;
    console.log('✅ selectedFile guardado:', window.appState.selectedFile?.name);

    // Mostrar preview
    showFilePreview(file, validation);
    updateUploadButton();

    console.log(`✅ Archivo válido: ${file.name} (${validation.formattedSize})`);
}

/**
 * Muestra la preview del archivo seleccionado
 */
function showFilePreview(file, validation) {
    const preview = document.getElementById('filePreview');
    const fileName = document.getElementById('fileName');
    const fileSize = document.getElementById('fileSize');
    const fileTypeIcon = document.getElementById('fileTypeIcon');

    if (!preview) return;

    preview.style.display = 'block';

    if (fileName) fileName.textContent = file.name;
    if (fileSize) fileSize.textContent = validation.formattedSize;

    // Icono según tipo
    if (fileTypeIcon) {
        fileTypeIcon.className = 'fas';
        const ext = file.name.split('.').pop().toLowerCase();

        const iconMap = {
            'pdf': 'fa-file-pdf',
            'doc': 'fa-file-word',
            'docx': 'fa-file-word',
            'xls': 'fa-file-excel',
            'xlsx': 'fa-file-excel',
            'txt': 'fa-file-alt',
            'jpg': 'fa-file-image',
            'jpeg': 'fa-file-image',
            'png': 'fa-file-image'
        };

        fileTypeIcon.classList.add(iconMap[ext] || 'fa-file');
    }
}

/**
 * Quita el archivo seleccionado en modo único
 */
function removeSingleFile() {
    console.log('🗑️ Quitando archivo seleccionado');

    window.appState.selectedFile = null;
    DOM.fileInput.value = '';

    const preview = document.getElementById('filePreview');
    if (preview) preview.style.display = 'none';

    if (sizeValidator) sizeValidator.reset();

    updateUploadButton();
}

// ═══════════════════════════════════════════════════════════
// MANEJO DE ARCHIVOS - MODO MÚLTIPLE
// ═══════════════════════════════════════════════════════════

/**
 * Maneja la selección de archivos múltiples
 */
function handleMultipleFileSelect(e) {
    console.log('📁 Evento change disparado en multipleFileInput');
    const files = e.target.files;
    if (!files || files.length === 0) {
        console.warn('⚠️ No se seleccionaron archivos');
        return;
    }
    processMultipleFiles(files);
}

/**
 * Maneja el drop de archivos múltiples
 */
function handleMultipleFilesDrop(files) {
    processMultipleFiles(files);
}

/**
 * Procesa archivos múltiples: valida tamaños
 */
function processMultipleFiles(files) {
    console.log(`📁 Procesando ${files.length} archivos múltiples`);

    // Validar tamaños
    const validation = sizeValidator.validateMultipleFiles(Array.from(files));

    // Mostrar errores si hay archivos inválidos
    if (validation.invalidFiles.length > 0) {
        const errorMsg = sizeValidator.getMultipleFilesErrorMessage(validation.invalidFiles);
        showAlert(errorMsg, 'error');
    }

    // Si hay archivos válidos, pasarlos al estado de subida múltiple
    if (validation.validFiles.length > 0) {
        const state = getMultipleUploadState();
        const addedCount = state.addFiles(validation.validFiles);

        if (addedCount > 0) {
            showAlert(`✅ ${addedCount} archivo(s) agregado(s)`, 'success');
            updateMultipleFileCount();
            updateMultipleControlsState();
        }
    }

    // Limpiar input
    DOM.multipleFileInput.value = '';
}

/**
 * Actualiza el contador de archivos múltiples
 */
function updateMultipleFileCount() {
    const state = getMultipleUploadState();
    const count = state.files ? state.files.length : 0;

    const countEl = document.getElementById('selectedFilesCount');
    const uploadCountEl = document.getElementById('uploadCount');
    const totalFilesEl = document.getElementById('totalFiles');

    if (countEl) countEl.textContent = count;
    if (uploadCountEl) uploadCountEl.textContent = count;
    if (totalFilesEl) totalFilesEl.textContent = count;
}

/**
 * Actualiza el estado de los controles múltiples
 */
function updateMultipleControlsState() {
    const category = multipleCategoryChips ? multipleCategoryChips.getSelectedCategory() : '';
    const state = getMultipleUploadState();
    const fileCount = state.files ? state.files.length : 0;
    const hiddenPerson = document.getElementById('multipleDocumentPerson');
    const hasPerson = hiddenPerson && hiddenPerson.value && hiddenPerson.value.trim() !== '';

    const hasCategory = category && category.trim() !== '';
    const hasFiles = fileCount > 0;

    // Actualizar botón de subida (requiere categoría + persona + archivos)
    const uploadBtn = document.getElementById('uploadMultipleDocumentsBtn');
    if (uploadBtn) {
        uploadBtn.disabled = !(hasCategory && hasPerson && hasFiles);
        uploadBtn.style.opacity = (hasCategory && hasPerson && hasFiles) ? '1' : '0.5';
    }

    // Actualizar botón de explorar
    const browseBtn = document.getElementById('browseMultipleFilesBtn');
    if (browseBtn) {
        browseBtn.disabled = !hasCategory;
        browseBtn.style.opacity = hasCategory ? '1' : '0.5';
    }

    // Actualizar input de archivos
    const multipleInput = document.getElementById('multipleFileInput');
    if (multipleInput) {
        multipleInput.disabled = !hasCategory;
    }
}

// ✅ Exponer globalmente
window.updateMultipleControlsState = updateMultipleControlsState;

// ═══════════════════════════════════════════════════════════
// SUBIDA DE DOCUMENTOS
// ═══════════════════════════════════════════════════════════

/**
 * Actualiza el botón de subida única
 */
function updateUploadButton() {
    const hasFile = window.appState && window.appState.selectedFile;
    const hasCategory = singleCategoryChips && singleCategoryChips.getSelectedCategory();
    const hiddenPerson = document.getElementById('documentPerson');
    const hasPerson = hiddenPerson && hiddenPerson.value && hiddenPerson.value.trim() !== '';

    const uploadBtn = document.getElementById('uploadDocumentBtn');
    if (uploadBtn) {
        uploadBtn.disabled = !(hasFile && hasCategory && hasPerson);
    }
}

/**
 * Maneja el click en subir documento único
 */
function handleUploadDocumentClick() {
    console.log('📤 Iniciando subida de documento único');

    // Validar archivo
    if (!window.appState || !window.appState.selectedFile) {
        showAlert('Selecciona un archivo primero', 'warning');
        return;
    }

    // Validar categoría
    const category = singleCategoryChips ? singleCategoryChips.getSelectedCategory() : '';
    if (!category || category.trim() === '') {
        showAlert('Selecciona una categoría', 'warning');
        return;
    }

    // ✅ Validar persona (OBLIGATORIA - ÚNICA VEZ)
    const hiddenPerson = document.getElementById('documentPerson');
    const personId = hiddenPerson ? hiddenPerson.value : '';
    if (!personId || personId.trim() === '') {
        showAlert('Debes asignar el documento a una persona', 'warning');
        // Enfocar el input de búsqueda de persona
        const personSearch = document.getElementById('singlePersonSearch');
        if (personSearch) {
            personSearch.focus();
            // Resaltar campo en rojo temporalmente
            personSearch.style.borderColor = '#ef4444';
            personSearch.style.boxShadow = '0 0 0 3px rgba(239, 68, 68, 0.1)';
            setTimeout(() => {
                personSearch.style.borderColor = '';
                personSearch.style.boxShadow = '';
            }, 2000);
        }
        return;
    }

    // Forzar categoría en input hidden
    const hiddenCategory = document.getElementById('documentCategory');
    if (hiddenCategory) {
        hiddenCategory.value = category;
    }

    // Validar fecha de vencimiento
    const expirationInput = document.getElementById('documentExpiration');
    if (expirationInput && expirationInput.value) {
        const selectedDate = new Date(expirationInput.value + 'T00:00:00');
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (selectedDate <= today) {
            showAlert('La fecha de vencimiento debe ser posterior a hoy', 'error');
            return;
        }
    }

    // Llamar a la función de subida individual
    handleUploadDocument();
}

/**
 * Maneja el click en subir múltiples documentos
 * CORREGIDO: Validación de persona solo aquí, no duplicada
 */
async function handleUploadMultipleClick() {
    console.log('📤 Iniciando subida de documentos múltiples');

    const state = getMultipleUploadState();
    const fileCount = state.files ? state.files.length : 0;

    // Validar que haya archivos
    if (fileCount === 0) {
        showAlert('No hay archivos para subir', 'warning');
        return;
    }

    // Validar categoría
    const category = multipleCategoryChips ? multipleCategoryChips.getSelectedCategory() : '';
    if (!category || category.trim() === '') {
        showAlert('Selecciona una categoría', 'warning');
        return;
    }

    // ✅ Validar persona (OBLIGATORIA - ÚNICA VEZ)
    const hiddenPerson = document.getElementById('multipleDocumentPerson');
    const personId = hiddenPerson ? hiddenPerson.value : '';
    if (!personId || personId.trim() === '') {
        showAlert('Debes asignar los documentos a una persona', 'warning');
        // Enfocar el input de búsqueda de persona
        const personSearch = document.getElementById('multiplePersonSearch');
        if (personSearch) {
            personSearch.focus();
            // Resaltar campo en rojo temporalmente
            personSearch.style.borderColor = '#ef4444';
            personSearch.style.boxShadow = '0 0 0 3px rgba(239, 68, 68, 0.1)';
            setTimeout(() => {
                personSearch.style.borderColor = '';
                personSearch.style.boxShadow = '';
            }, 2000);
        }
        return;
    }

    // Forzar valores en inputs hidden
    const hiddenCategory = document.getElementById('multipleDocumentCategory');
    if (hiddenCategory) {
        hiddenCategory.value = category;
    }

    // Establecer valores en el estado
    state.setCommonCategory(category);
    state.setCommonPersonId(personId);

    // Aplicar configuración a todos los archivos
    if (typeof window.applyCommonSettingsToAllFiles === 'function') {
        window.applyCommonSettingsToAllFiles(state, { silent: true });
    }

    // ✅ Llamar a la función de subida (uploadMultiple.js ya NO valida persona)
    handleUploadMultipleDocuments();
}

// ═══════════════════════════════════════════════════════════
// FUNCIONES DE COMPATIBILIDAD
// ═══════════════════════════════════════════════════════════

/**
 * Muestra alerta en el modal (compatibilidad)
 */
function showModalAlert(message, type = 'info') {
    showAlert(message, type);
}

/**
 * Valida la subida múltiple (compatibilidad)
 */
export function validateMultipleUpload() {
    const state = getMultipleUploadState();
    const fileCount = state.files ? state.files.length : 0;
    const category = multipleCategoryChips ? multipleCategoryChips.getSelectedCategory() : '';

    if (fileCount === 0) return false;
    if (!category) return false;

    return true;
}

// Debug global
if (typeof window !== 'undefined') {
    window.debugModalState = () => {
        console.group('🐛 DEBUG MODAL STATE');
        console.log('Categoría única:', singleCategoryChips?.getSelectedCategory());
        console.log('Categoría múltiple:', multipleCategoryChips?.getSelectedCategory());
        console.log('Archivo único:', window.appState?.selectedFile?.name);

        const state = getMultipleUploadState();
        console.log('Archivos múltiples:', state?.files?.length);
        state?.logState();
        console.groupEnd();
    };
}

console.log('✅ documentModal.js (rediseñado) cargado');