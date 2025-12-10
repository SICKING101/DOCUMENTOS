import { DOM } from '../../../dom.js';
import { CONFIG } from '../../../config.js';

/**
 * Pobla el select de categorías para el modo individual.
 * Usa las categorías del estado global.
 */
export function populateDocumentCategorySelect() {
    if (!DOM.documentCategory) return;
    
    DOM.documentCategory.innerHTML = '<option value="">Seleccionar categoría</option>';
    
    if (window.appState && window.appState.categories) {
        window.appState.categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.nombre;
            option.textContent = category.nombre;
            DOM.documentCategory.appendChild(option);
        });
    }
}

/**
 * Pobla el select de categorías para el modo múltiple.
 * Usa las categorías del estado global.
 */
export function populateMultipleCategorySelect() {
    if (!DOM.multipleDocumentCategory) return;
    
    DOM.multipleDocumentCategory.innerHTML = '<option value="">Seleccionar categoría</option>';
    
    if (window.appState && window.appState.categories) {
        window.appState.categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.nombre;
            option.textContent = category.nombre;
            DOM.multipleDocumentCategory.appendChild(option);
        });
    }
}

/**
 * Pobla un select de categorías específico para archivos individuales en modo múltiple.
 * @param {HTMLSelectElement} selectElement - Elemento select a poblar
 */
export function populateFileCategorySelect(selectElement) {
    if (!selectElement) return;
    
    selectElement.innerHTML = '<option value="">Usar categoría común</option>';
    
    if (window.appState && window.appState.categories) {
        window.appState.categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.nombre;
            option.textContent = category.nombre;
            selectElement.appendChild(option);
        });
    }
}

/**
 * Pobla el select de personas desde la API o estado global.
 * Se usa en ambos modos de subida (individual y múltiple).
 * @param {HTMLSelectElement} selectElement - Elemento select a poblar
 */
export async function populatePersonSelect(selectElement) {
    if (!selectElement) return;
    
    try {
        console.log('👥 Cargando personas para select...');
        
        // Limpiar select
        selectElement.innerHTML = '<option value="">Seleccionar persona</option>';
        
        // Cargar personas si no están en el estado
        if (!window.appState.persons || window.appState.persons.length === 0) {
            const response = await fetch(`${CONFIG.API_BASE_URL}/persons`);
            
            if (response.ok) {
                const data = await response.json();
                if (data.success && data.persons) {
                    window.appState.persons = data.persons;
                }
            }
        }
        
        // Poblar opciones
        if (window.appState.persons && window.appState.persons.length > 0) {
            window.appState.persons.forEach(person => {
                const option = document.createElement('option');
                option.value = person._id;
                option.textContent = person.nombre || person.name || `Persona ${person._id}`;
                selectElement.appendChild(option);
            });
            
            console.log(`✅ ${window.appState.persons.length} personas cargadas en select`);
        } else {
            console.log('ℹ️ No hay personas disponibles');
        }
        
    } catch (error) {
        console.error('❌ Error cargando personas:', error);
        // showAlert está importado en utils.js, no está disponible aquí directamente
        console.error('Error al cargar la lista de personas:', error);
    }
}