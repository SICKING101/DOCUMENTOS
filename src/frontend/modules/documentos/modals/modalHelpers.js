// =============================================================================
// src/frontend/modules/documentos/modals/modalHelpers.js (CORREGIDO)
// =============================================================================

import { DOM } from '../../../dom.js';
import { CONFIG } from '../../../config.js';
import { showAlert } from '../../../utils.js';
import { CategoriesChipsSelector } from './categoriesChips.js';
import { PersonAutocomplete } from './personAutocomplete.js';

// Instancias globales de los selectores
let singleCategoryChips = null;
let multipleCategoryChips = null;
let singlePersonAutocomplete = null;
let multiplePersonAutocomplete = null;

/**
 * Inicializa el selector de categorías con chips para modo único
 */
export function initSingleCategoryChips() {
    if (singleCategoryChips) return singleCategoryChips;

    singleCategoryChips = new CategoriesChipsSelector({
        containerId: 'singleCategorySelector',
        searchInputId: 'singleCategorySearch',
        chipsContainerId: 'singleCategoriesChips',
        hiddenInputId: 'documentCategory',
        noResultsId: 'singleCategoriesNoResults',
        placeholder: 'Buscar o seleccionar categoría...'
    });

    singleCategoryChips.onChange((category) => {
        console.log(`📂 Categoría única seleccionada: "${category}"`);
        if (DOM.uploadDocumentBtn) {
            validateSingleUploadForm();
        }
    });

    return singleCategoryChips;
}

/**
 * Inicializa el selector de categorías con chips para modo múltiple
 */
export function initMultipleCategoryChips() {
    if (multipleCategoryChips) return multipleCategoryChips;

    multipleCategoryChips = new CategoriesChipsSelector({
        containerId: 'multipleCategorySelector',
        searchInputId: 'multipleCategorySearch',
        chipsContainerId: 'multipleCategoriesChips',
        hiddenInputId: 'multipleDocumentCategory',
        noResultsId: 'multipleCategoriesNoResults',
        placeholder: 'Buscar o seleccionar categoría...'
    });

    multipleCategoryChips.onChange((category) => {
        console.log(`📂 Categoría múltiple seleccionada: "${category}"`);
        handleMultipleCategoryChange(category);
    });

    return multipleCategoryChips;
}

/**
 * Inicializa el autocompletado de personas para modo único
 */
export function initSinglePersonAutocomplete() {
    if (singlePersonAutocomplete) return singlePersonAutocomplete;

    singlePersonAutocomplete = new PersonAutocomplete({
        containerId: 'singlePersonSelector',
        searchInputId: 'singlePersonSearch',
        dropdownId: 'singlePersonDropdown',
        selectedContainerId: 'singlePersonSelected',
        clearBtnId: 'singlePersonClear',
        hiddenInputId: 'documentPerson'
    });

    singlePersonAutocomplete.onChange((person) => {
        console.log(`👤 Persona única:`, person?.nombre || 'ninguna');
        // ✅ Actualizar botón de subida
        const uploadBtn = document.getElementById('uploadDocumentBtn');
        if (uploadBtn) {
            const hasFile = window.appState?.selectedFile;
            const hasCategory = singleCategoryChips?.getSelectedCategory();
            const hasPerson = person && person.id;
            uploadBtn.disabled = !(hasFile && hasCategory && hasPerson);
        }
    });

    return singlePersonAutocomplete;
}

/**
 * Inicializa el autocompletado de personas para modo múltiple
 */
export function initMultiplePersonAutocomplete() {
    if (multiplePersonAutocomplete) return multiplePersonAutocomplete;

    multiplePersonAutocomplete = new PersonAutocomplete({
        containerId: 'multiplePersonSelector',
        searchInputId: 'multiplePersonSearch',
        dropdownId: 'multiplePersonDropdown',
        selectedContainerId: 'multiplePersonSelected',
        clearBtnId: 'multiplePersonClear',
        hiddenInputId: 'multipleDocumentPerson'
    });

    multiplePersonAutocomplete.onChange((person) => {
        console.log(`👤 Persona múltiple:`, person?.nombre || 'ninguna');
        
        // ✅ Disparar evento change en el input hidden
        const hiddenPerson = document.getElementById('multipleDocumentPerson');
        if (hiddenPerson && person) {
            hiddenPerson.value = person.id;
            hiddenPerson.dispatchEvent(new Event('change', { bubbles: true }));
        }
        
        // ✅ Intentar llamar a la función global si existe
        if (typeof window.updateMultipleControlsState === 'function') {
            window.updateMultipleControlsState();
        }
    });

    multiplePersonAutocomplete.setEnabled(false);
    return multiplePersonAutocomplete;
}

/**
 * ✅ CORREGIDO: Maneja el cambio de categoría en modo múltiple
 * Ahora habilita correctamente el input de búsqueda de personas
 */
function handleMultipleCategoryChange(category) {
    const hasCategory = category && category.trim() !== '';

    console.log(`🔄 Categoría múltiple: "${category}" → habilitando controles: ${hasCategory}`);

    if (multiplePersonAutocomplete) {
        multiplePersonAutocomplete.setEnabled(hasCategory);
    }

    if (DOM.multiplePersonSearch) {
        DOM.multiplePersonSearch.disabled = !hasCategory;
        DOM.multiplePersonSearch.style.pointerEvents = hasCategory ? 'auto' : 'none';
        DOM.multiplePersonSearch.style.opacity = hasCategory ? '1' : '0.5';
        DOM.multiplePersonSearch.style.cursor = hasCategory ? 'text' : 'not-allowed';
        DOM.multiplePersonSearch.placeholder = hasCategory ?
            'Buscar persona por nombre...' :
            'Selecciona una categoría primero';
    }

    if (DOM.multipleExpirationDays) {
        DOM.multipleExpirationDays.disabled = !hasCategory;
        DOM.multipleExpirationDays.style.opacity = hasCategory ? '1' : '0.5';
        DOM.multipleExpirationDays.style.cursor = hasCategory ? 'text' : 'not-allowed';
    }

    if (DOM.multipleFileInput) {
        DOM.multipleFileInput.disabled = !hasCategory;
    }

    if (DOM.browseMultipleFilesBtn) {
        DOM.browseMultipleFilesBtn.disabled = !hasCategory;
        DOM.browseMultipleFilesBtn.style.opacity = hasCategory ? '1' : '0.5';
        DOM.browseMultipleFilesBtn.style.cursor = hasCategory ? 'pointer' : 'not-allowed';
    }

    const hint = document.getElementById('multipleDropzoneHint');
    if (hint) {
        if (hasCategory) {
            hint.innerHTML = '✅ Categoría seleccionada. Ya puedes agregar archivos.';
            hint.style.color = '#10b981';
        } else {
            hint.innerHTML = '⚠️ Primero selecciona una categoría para habilitar la subida';
            hint.style.color = '#94a3b8';
        }
    }

    if (DOM.multipleDocumentCategory) {
        const event = new Event('change', { bubbles: true });
        DOM.multipleDocumentCategory.dispatchEvent(event);
    }

    // ✅ Llamar a la función global
    if (typeof window.updateMultipleControlsState === 'function') {
        window.updateMultipleControlsState();
    }
}

/**
 * Valida el formulario de subida única
 */
function validateSingleUploadForm() {
    const hasFile = window.appState && window.appState.selectedFile;
    const hasCategory = singleCategoryChips && singleCategoryChips.getSelectedCategory();

    if (DOM.uploadDocumentBtn) {
        DOM.uploadDocumentBtn.disabled = !(hasFile && hasCategory);
    }
}

// ═══════════════════════════════════════════════════════════
// MÉTODOS DE COMPATIBILIDAD (mantener los antiguos)
// ═══════════════════════════════════════════════════════════

export function populateDocumentCategorySelect() {
    console.log('ℹ️ populateDocumentCategorySelect: usando sistema de chips');
}

export function populateMultipleCategorySelect() {
    console.log('ℹ️ populateMultipleCategorySelect: usando sistema de chips');
}

export async function populateAllPersonSelects() {
    console.log('ℹ️ populateAllPersonSelects: usando autocompletado');
    initSinglePersonAutocomplete();
    initMultiplePersonAutocomplete();
}

export async function populatePersonSelect(selectElement) {
    console.log('ℹ️ populatePersonSelect: usando autocompletado');
}

export function populateFileCategorySelect(selectElement) {
    console.log('ℹ️ populateFileCategorySelect: usando sistema de chips');
}

export {
    singleCategoryChips,
    multipleCategoryChips,
    singlePersonAutocomplete,
    multiplePersonAutocomplete
};