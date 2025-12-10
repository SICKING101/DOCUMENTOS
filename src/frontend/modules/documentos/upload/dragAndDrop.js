import { DOM } from '../../../dom.js';
import { showAlert } from '../../../utils.js';
import { CONFIG } from '../../../config.js';
import { handleFile } from './uploadSingle.js';
import { handleMultipleFiles } from './uploadMultiple.js';

/**
 * Configura el drag and drop para ambos modos de subida.
 * Llama a funciones específicas para cada contenedor.
 */
export function setupFileDragAndDrop() {
    console.log('🔧 Configurando drag and drop...');
    
    // Configurar para modo único
    if (DOM.fileUploadContainer) {
        setupDragAndDropForElement(DOM.fileUploadContainer, false);
    }
    
    // Configurar para modo múltiple
    if (DOM.multipleFileUploadContainer) {
        setupDragAndDropForElement(DOM.multipleFileUploadContainer, true);
    }
    
    console.log('✅ Drag and drop configurado');
}

/**
 * Configura eventos de drag and drop para un elemento específico.
 * Maneja drag over, drag leave y drop.
 * @param {HTMLElement} element - Elemento donde configurar drag and drop
 * @param {boolean} isMultiple - True si es para modo múltiple
 */
function setupDragAndDropForElement(element, isMultiple) {
    element.addEventListener('dragover', function(e) {
        e.preventDefault();
        e.stopPropagation();
        this.classList.add('upload__container--dragover');
    });
    
    element.addEventListener('dragleave', function() {
        this.classList.remove('upload__container--dragover');
    });
    
    element.addEventListener('drop', function(e) {
        e.preventDefault();
        e.stopPropagation();
        this.classList.remove('upload__container--dragover');
        
        if (e.dataTransfer.files.length) {
            console.log(`📁 ${e.dataTransfer.files.length} archivo(s) arrastrado(s)`);
            
            if (isMultiple) {
                handleMultipleFiles(Array.from(e.dataTransfer.files));
            } else {
                if (e.dataTransfer.files.length > 1) {
                    showAlert('Para subir múltiples archivos, cambia al modo "Subir Múltiple"', 'warning');
                    return;
                }
                handleFile(e.dataTransfer.files[0]);
            }
        }
    });
}