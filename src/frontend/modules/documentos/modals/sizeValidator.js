// =============================================================================
// src/frontend/modules/documentos/modals/sizeValidator.js
// Validador de tamaño de archivo para el límite de 10MB de Cloudinary
// =============================================================================

import { CONFIG } from '../../../config.js';
import { formatFileSize } from '../../../utils.js';

/**
 * Clase que valida el tamaño de archivos y muestra feedback visual.
 * Límite: 10MB para Cloudinary free tier.
 */
export class SizeValidator {
    /**
     * @param {object} options - Configuración
     * @param {string} options.sizeBarFillId - ID de la barra de progreso
     * @param {string} options.sizeUsedId - ID del texto de tamaño usado
     * @param {string} options.sizeBadgeId - ID del badge de estado
     * @param {string} options.sizeErrorId - ID del mensaje de error
     * @param {string} options.previewContainerId - ID del contenedor de preview
     */
    constructor(options = {}) {
        this.sizeBarFill = document.getElementById(options.sizeBarFillId || 'sizeBarFill');
        this.sizeUsed = document.getElementById(options.sizeUsedId || 'sizeUsed');
        this.sizeBadge = document.getElementById(options.sizeBadgeId || 'fileSizeBadge');
        this.sizeError = document.getElementById(options.sizeErrorId || 'sizeError');
        this.previewContainer = document.getElementById(options.previewContainerId || 'filePreview');
        
        this.maxSize = CONFIG.MAX_FILE_SIZE || 10 * 1024 * 1024; // 10MB
        this.warningThreshold = 0.8; // 80% - advertencia
        this.currentFile = null;
    }

    /**
     * Valida un archivo y actualiza la UI
     * @param {File} file - Archivo a validar
     * @returns {object} - Resultado de la validación
     */
    validateFile(file) {
        if (!file) {
            this.reset();
            return { isValid: false, error: 'No se proporcionó archivo' };
        }

        this.currentFile = file;
        const size = file.size;
        const maxSize = this.maxSize;
        const percentUsed = (size / maxSize) * 100;
        
        const result = {
            isValid: size <= maxSize,
            size: size,
            maxSize: maxSize,
            percentUsed: percentUsed,
            formattedSize: formatFileSize(size),
            formattedMaxSize: formatFileSize(maxSize),
            status: this.getStatus(percentUsed),
            message: this.getMessage(percentUsed, size <= maxSize)
        };

        this.updateUI(result);
        return result;
    }

    /**
     * Determina el estado según el porcentaje usado
     */
    getStatus(percentUsed) {
        if (percentUsed > 100) return 'danger';
        if (percentUsed > this.warningThreshold * 100) return 'warning';
        return 'valid';
    }

    /**
     * Obtiene el mensaje según el estado
     */
    getMessage(percentUsed, isValid) {
        if (!isValid) {
            return `❌ El archivo excede el límite de ${formatFileSize(this.maxSize)}`;
        }
        if (percentUsed > this.warningThreshold * 100) {
            return `⚠️ El archivo está cerca del límite de ${formatFileSize(this.maxSize)}`;
        }
        return `✅ Tamaño válido`;
    }

    /**
     * Actualiza la interfaz visual
     */
    updateUI(result) {
        // Actualizar barra de progreso
        if (this.sizeBarFill) {
            const displayPercent = Math.min(result.percentUsed, 100);
            this.sizeBarFill.style.width = `${displayPercent}%`;
            
            // Clases según estado
            this.sizeBarFill.classList.remove('size-bar__fill--warning', 'size-bar__fill--danger');
            if (result.status === 'warning') {
                this.sizeBarFill.classList.add('size-bar__fill--warning');
            } else if (result.status === 'danger') {
                this.sizeBarFill.classList.add('size-bar__fill--danger');
            }
        }

        // Actualizar texto de tamaño
        if (this.sizeUsed) {
            this.sizeUsed.textContent = result.formattedSize;
        }

        // Actualizar badge
        if (this.sizeBadge) {
            this.sizeBadge.innerHTML = result.message;
            this.sizeBadge.className = 'file-preview-card__badge';
            
            if (result.status === 'valid') {
                this.sizeBadge.classList.add('file-preview-card__badge--valid');
            } else if (result.status === 'warning') {
                this.sizeBadge.classList.add('file-preview-card__badge--warning');
            } else if (result.status === 'danger') {
                this.sizeBadge.classList.add('file-preview-card__badge--invalid');
            }
        }

        // Mostrar/ocultar error
        if (this.sizeError) {
            if (result.status === 'danger') {
                this.sizeError.style.display = 'flex';
            } else {
                this.sizeError.style.display = 'none';
            }
        }
    }

    /**
     * Valida múltiples archivos y retorna los que exceden el límite
     * @param {File[]} files - Array de archivos
     * @returns {object} - Resultado con archivos válidos e inválidos
     */
    validateMultipleFiles(files) {
        const result = {
            validFiles: [],
            invalidFiles: [],
            totalSize: 0,
            maxSize: this.maxSize
        };

        files.forEach(file => {
            if (file.size <= this.maxSize) {
                result.validFiles.push(file);
                result.totalSize += file.size;
            } else {
                result.invalidFiles.push({
                    name: file.name,
                    size: file.size,
                    formattedSize: formatFileSize(file.size)
                });
            }
        });

        return result;
    }

    /**
     * Formatea el mensaje para archivos inválidos en subida múltiple
     */
    getMultipleFilesErrorMessage(invalidFiles) {
        if (invalidFiles.length === 0) return '';
        
        if (invalidFiles.length === 1) {
            return `"${invalidFiles[0].name}" excede el límite de ${formatFileSize(this.maxSize)} (${invalidFiles[0].formattedSize})`;
        }
        
        const names = invalidFiles.map(f => `"${f.name}"`).join(', ');
        return `${invalidFiles.length} archivos exceden el límite de ${formatFileSize(this.maxSize)}: ${names}`;
    }

    /**
     * Resetea el validador
     */
    reset() {
        this.currentFile = null;
        
        if (this.sizeBarFill) {
            this.sizeBarFill.style.width = '0%';
            this.sizeBarFill.classList.remove('size-bar__fill--warning', 'size-bar__fill--danger');
        }
        
        if (this.sizeUsed) {
            this.sizeUsed.textContent = '0 MB';
        }
        
        if (this.sizeBadge) {
            this.sizeBadge.innerHTML = '';
            this.sizeBadge.className = 'file-preview-card__badge';
        }
        
        if (this.sizeError) {
            this.sizeError.style.display = 'none';
        }
    }

    /**
     * Verifica si un tamaño es válido
     */
    isSizeValid(size) {
        return size <= this.maxSize;
    }

    /**
     * Obtiene el tamaño máximo formateado
     */
    getMaxSizeFormatted() {
        return formatFileSize(this.maxSize);
    }
}

export default SizeValidator;