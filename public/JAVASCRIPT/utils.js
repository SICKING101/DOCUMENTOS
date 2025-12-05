import { CONFIG } from './config.js';

// =============================================================================
// FUNCIONES UTILITARIAS - COMPLETO
// =============================================================================

function getFileIcon(fileType) {
    const type = fileType.toLowerCase();
    
    if (type === 'pdf') return 'pdf';
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'].includes(type)) return 'image';
    if (['doc', 'docx'].includes(type)) return 'word';
    if (['xls', 'xlsx', 'csv'].includes(type)) return 'excel';
    if (['ppt', 'pptx'].includes(type)) return 'powerpoint';
    if (['txt', 'md', 'json', 'xml', 'html', 'css', 'js'].includes(type)) return 'alt';
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(type)) return 'archive';
    if (['mp3', 'wav', 'ogg', 'flac'].includes(type)) return 'audio';
    if (['mp4', 'avi', 'mov', 'wmv', 'mkv'].includes(type)) return 'video';
    
    return 'file'; // default
}

function getIconName(iconValue) {
    const iconNames = {
        'folder': 'Carpeta',
        'file-contract': 'Contrato',
        'id-card': 'Identificación',
        'certificate': 'Certificado',
        'chart-line': 'Reporte',
        'file-invoice': 'Factura',
        'file-medical': 'Médico',
        'graduation-cap': 'Académico',
        'briefcase': 'Laboral',
        'home': 'Personal'
    };
    
    return iconNames[iconValue] || 'Carpeta';
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatDate(dateString) {
    try {
        const date = new Date(dateString);
        const options = { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric'
        };
        return date.toLocaleDateString('es-ES', options);
    } catch (error) {
        console.warn('Error formateando fecha:', error);
        return 'Fecha inválida';
    }
}

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function setLoadingState(loading, element = null) {
    if (element) {
        if (loading) {
            const originalText = element.innerHTML;
            element.innerHTML = '<div class="spinner"></div> Procesando...';
            element.disabled = true;
            element.dataset.originalText = originalText;
        } else {
            if (element.dataset.originalText) {
                element.innerHTML = element.dataset.originalText;
                element.disabled = false;
            }
        }
    }
    
    // Añadir/remover clase de loading al body
    document.body.classList.toggle('loading', loading);
}

function showAlert(message, type = 'info') {
    console.log(`🔔 Alert [${type}]: ${message}`);
    
    const alert = document.createElement('div');
    alert.className = `alert alert--${type}`;
    
    const icons = {
        success: 'check-circle',
        error: 'exclamation-circle',
        warning: 'exclamation-triangle',
        info: 'info-circle'
    };
    
    alert.innerHTML = `
        <i class="fas fa-${icons[type] || 'info-circle'}"></i>
        <span>${message}</span>
    `;
    
    // Asegurarse de que el contenedor existe
    const alertContainer = document.getElementById('alertContainer');
    if (alertContainer) {
        alertContainer.appendChild(alert);
        
        // Auto-eliminar después de 5 segundos
        setTimeout(() => {
            if (alert.parentNode) {
                alert.parentNode.removeChild(alert);
            }
        }, 5000);
    }
}

function setupModalBackdropClose(modals) {
    window.addEventListener('click', function(e) {
        Object.keys(modals).forEach(modalKey => {
            if (modals[modalKey] && e.target === modals[modalKey]) {
                const closeFunctionName = `close${modalKey.charAt(0).toUpperCase() + modalKey.slice(1)}`;
                if (typeof window[closeFunctionName] === 'function') {
                    window[closeFunctionName]();
                }
            }
        });
    });
}

// =============================================================================
// FUNCIONES DE DESCARGA MEJORADAS - COMPLETO
// =============================================================================

/**
 * Función mejorada para descargar cualquier tipo de archivo
 * @param {string} url - URL del archivo
 * @param {string} fileName - Nombre del archivo
 * @param {Object} options - Opciones adicionales
 */
async function downloadFileImproved(url, fileName, options = {}) {
    console.group('📥 DESCARGA MEJORADA - INICIO');
    console.log('📋 Parámetros:', { url, fileName, options });
    
    try {
        // Opciones por defecto
        const defaultOptions = {
            method: 'GET',
            mode: 'cors',
            cache: 'no-cache',
            headers: {
                'Accept': '*/*'
            },
            timeout: CONFIG.DOWNLOAD_TIMEOUT,
            maxRetries: CONFIG.DOWNLOAD_RETRY_ATTEMPTS || 3
        };
        
        const finalOptions = { ...defaultOptions, ...options };
        
        let lastError = null;
        
        // Intentar con reintentos
        for (let attempt = 1; attempt <= finalOptions.maxRetries; attempt++) {
            console.log(`🔄 Intento ${attempt}/${finalOptions.maxRetries}`);
            
            try {
                // Crear controlador de aborto para timeout
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), finalOptions.timeout);
                
                // Hacer la petición
                const response = await fetch(url, {
                    ...finalOptions,
                    signal: controller.signal
                });
                
                clearTimeout(timeoutId);
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                // Obtener el blob
                const blob = await response.blob();
                
                if (blob.size === 0) {
                    throw new Error('Archivo vacío recibido');
                }
                
                console.log(`✅ Blob recibido: ${formatFileSize(blob.size)}, tipo: ${blob.type}`);
                
                // Crear URL para el blob
                const blobUrl = window.URL.createObjectURL(blob);
                
                // Crear elemento de descarga
                const link = document.createElement('a');
                link.href = blobUrl;
                link.download = fileName;
                
                // Agregar atributo type si está disponible
                if (blob.type) {
                    link.setAttribute('type', blob.type);
                }
                
                link.style.display = 'none';
                
                // Agregar al DOM
                document.body.appendChild(link);
                
                // Hacer clic programáticamente
                const clickEvent = new MouseEvent('click', {
                    view: window,
                    bubbles: true,
                    cancelable: true
                });
                
                link.dispatchEvent(clickEvent);
                
                // Limpiar
                setTimeout(() => {
                    if (link.parentNode) {
                        link.parentNode.removeChild(link);
                    }
                    window.URL.revokeObjectURL(blobUrl);
                }, 100);
                
                console.log('✅ Descarga completada exitosamente');
                console.groupEnd();
                return true;
                
            } catch (attemptError) {
                lastError = attemptError;
                console.error(`❌ Intento ${attempt} fallado:`, attemptError.message);
                
                // Si no es el último intento, esperar antes de reintentar
                if (attempt < finalOptions.maxRetries) {
                    const delay = 1000 * attempt; // 1s, 2s, 3s...
                    console.log(`⏳ Esperando ${delay}ms antes del siguiente intento...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }
        
        // Si todos los intentos fallaron
        throw lastError || new Error('Descarga falló después de todos los intentos');
        
    } catch (error) {
        console.error('❌ ERROR en descarga mejorada:', error);
        console.groupEnd();
        throw error;
    }
}

/**
 * Función para descargar desde Cloudinary con parámetros optimizados
 * @param {string} cloudinaryUrl - URL de Cloudinary
 * @param {string} fileName - Nombre del archivo
 * @param {string} fileType - Tipo de archivo (extensión)
 */
function downloadFromCloudinaryOptimized(cloudinaryUrl, fileName, fileType) {
    console.group('☁️ DESCARGA CLOUDINARY OPTIMIZADA');
    console.log('📋 Parámetros:', { cloudinaryUrl, fileName, fileType });
    
    try {
        let optimizedUrl = cloudinaryUrl;
        
        // Si es Cloudinary, optimizar la URL para descarga
        if (cloudinaryUrl.includes('cloudinary.com')) {
            const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(fileType.toLowerCase());
            
            if (isImage) {
                // Para imágenes: forzar descarga con fl_attachment
                optimizedUrl = cloudinaryUrl.replace(/\/upload\//, '/upload/fl_attachment/');
            } else {
                // Para documentos: asegurar tipo raw
                optimizedUrl = cloudinaryUrl.replace(/\/upload\//, '/upload/fl_attachment/');
                
                // Si no tiene extensión, agregarla
                if (!optimizedUrl.includes(`.${fileType}`)) {
                    optimizedUrl += `.${fileType}`;
                }
            }
        }
        
        console.log('🔗 URL optimizada:', optimizedUrl);
        
        // Crear enlace de descarga
        const link = document.createElement('a');
        link.href = optimizedUrl;
        link.download = fileName;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.style.display = 'none';
        
        // Agregar evento para limpiar
        link.addEventListener('click', function() {
            setTimeout(() => {
                if (link.parentNode) {
                    link.parentNode.removeChild(link);
                }
            }, 1000);
        });
        
        document.body.appendChild(link);
        link.click();
        
        console.log('✅ Descarga Cloudinary iniciada');
        console.groupEnd();
        
        return true;
        
    } catch (error) {
        console.error('❌ ERROR en descarga Cloudinary:', error);
        console.groupEnd();
        throw error;
    }
}

/**
 * Obtener tipo MIME según extensión
 */
function getMimeTypeFromExtension(filename) {
    if (!filename) return 'application/octet-stream';
    
    const extension = filename.split('.').pop().toLowerCase();
    return CONFIG.FILE_HEADERS[extension] || 'application/octet-stream';
}

/**
 * Validar integridad del blob descargado
 */
function validateBlob(blob, expectedSize = null) {
    if (!blob || !(blob instanceof Blob)) {
        throw new Error('Blob inválido');
    }
    
    if (blob.size === 0) {
        throw new Error('Blob vacío');
    }
    
    if (expectedSize && blob.size !== expectedSize) {
        console.warn(`⚠️ Tamaño diferente: Esperado ${expectedSize}, Obtenido ${blob.size}`);
    }
    
    // Verificar tipo MIME básico
    if (blob.type === 'text/html' && blob.size < 100) {
        // Podría ser una página de error HTML
        throw new Error('Posible error HTML recibido en lugar del archivo');
    }
    
    return true;
}

/**
 * Función de descarga universal que prueba múltiples estrategias
 */
async function universalDownload(fileData) {
    console.group('🌍 DESCARGA UNIVERSAL');
    console.log('📋 Datos del archivo:', fileData);
    
    const { id, fileName, fileType, cloudinaryUrl } = fileData;
    const strategies = [];
    
    // Estrategia 1: Endpoint del servidor
    strategies.push({
        name: 'Server Endpoint',
        execute: async () => {
            const endpoint = `${CONFIG.API_BASE_URL}/documents/${id}/download`;
            console.log('🔗 Probando endpoint:', endpoint);
            
            // Verificar si el endpoint existe
            try {
                const headResponse = await fetch(endpoint, { method: 'HEAD' });
                if (!headResponse.ok) {
                    throw new Error(`Endpoint no disponible (${headResponse.status})`);
                }
                
                // Descargar usando nuestra función mejorada
                return await downloadFileImproved(endpoint, fileName);
            } catch (error) {
                console.log('⚠️ Estrategia servidor falló:', error.message);
                throw error;
            }
        }
    });
    
    // Estrategia 2: Cloudinary optimizado
    if (cloudinaryUrl) {
        strategies.push({
            name: 'Cloudinary Optimized',
            execute: async () => {
                try {
                    return downloadFromCloudinaryOptimized(cloudinaryUrl, fileName, fileType);
                } catch (error) {
                    console.log('⚠️ Estrategia Cloudinary falló:', error.message);
                    throw error;
                }
            }
        });
    }
    
    // Estrategia 3: Cloudinary directo
    if (cloudinaryUrl) {
        strategies.push({
            name: 'Cloudinary Direct',
            execute: async () => {
                try {
                    const link = document.createElement('a');
                    link.href = cloudinaryUrl;
                    link.download = fileName;
                    link.target = '_blank';
                    link.style.display = 'none';
                    document.body.appendChild(link);
                    link.click();
                    
                    setTimeout(() => {
                        if (link.parentNode) {
                            link.parentNode.removeChild(link);
                        }
                    }, 100);
                    
                    return true;
                } catch (error) {
                    console.log('⚠️ Estrategia directa falló:', error.message);
                    throw error;
                }
            }
        });
    }
    
    // Probar cada estrategia en orden
    let lastError = null;
    
    for (const strategy of strategies) {
        console.log(`🔄 Probando estrategia: ${strategy.name}`);
        
        try {
            const result = await strategy.execute();
            if (result) {
                console.log(`✅ Estrategia exitosa: ${strategy.name}`);
                console.groupEnd();
                return true;
            }
        } catch (error) {
            lastError = error;
            console.log(`❌ Estrategia fallida: ${strategy.name} - ${error.message}`);
            
            // Esperar un poco antes de la siguiente estrategia
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    }
    
    // Si todas las estrategias fallaron
    console.error('❌ Todas las estrategias fallaron');
    console.groupEnd();
    
    throw lastError || new Error('No se pudo descargar el archivo con ninguna estrategia');
}

/**
 * Formatea el tiempo en segundos a un string legible
 */
function formatTime(seconds) {
    if (seconds < 60) {
        return `${seconds} segundos`;
    } else if (seconds < 3600) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}m ${remainingSeconds}s`;
    } else {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        return `${hours}h ${minutes}m`;
    }
}

/**
 * Calcula la velocidad de subida
 */
function calculateUploadSpeed(bytesUploaded, timeInSeconds) {
    if (timeInSeconds === 0) return '0 B/s';
    
    const bytesPerSecond = bytesUploaded / timeInSeconds;
    return formatFileSize(bytesPerSecond) + '/s';
}

/**
 * Valida si un conjunto de archivos puede ser subido
 */
function validateFilesForUpload(files, maxFiles, maxIndividualSize, maxTotalSize) {
    const errors = [];
    
    if (files.length > maxFiles) {
        errors.push(`Máximo ${maxFiles} archivos permitidos. Seleccionados: ${files.length}`);
    }
    
    let totalSize = 0;
    files.forEach((file, index) => {
        if (file.size > maxIndividualSize) {
            errors.push(`"${file.name}" excede el tamaño máximo por archivo (${formatFileSize(maxIndividualSize)})`);
        }
        totalSize += file.size;
    });
    
    if (totalSize > maxTotalSize) {
        errors.push(`Tamaño total excedido: ${formatFileSize(totalSize)} > ${formatFileSize(maxTotalSize)}`);
    }
    
    return {
        isValid: errors.length === 0,
        errors: errors,
        totalSize: totalSize
    };
}

/**
 * Extrae el nombre sin extensión de un archivo
 */
function getFileNameWithoutExtension(filename) {
    return filename.replace(/\.[^/.]+$/, "");
}

/**
 * Genera una descripción automática basada en el nombre del archivo
 */
function generateAutoDescription(filename) {
    const nameWithoutExt = getFileNameWithoutExtension(filename);
    
    // Reemplazar guiones bajos y guiones por espacios
    let description = nameWithoutExt.replace(/[_-]/g, ' ');
    
    // Capitalizar primera letra de cada palabra
    description = description.replace(/\b\w/g, char => char.toUpperCase());
    
    // Remover números al inicio
    description = description.replace(/^\d+\s*/, '');
    
    return description || 'Documento subido';
}

// =============================================================================
// EXPORTACIONES
// =============================================================================
export { 
    getFileIcon, 
    getIconName, 
    formatFileSize, 
    formatDate, 
    isValidEmail, 
    setLoadingState, 
    showAlert, 
    setupModalBackdropClose,
    downloadFileImproved,
    downloadFromCloudinaryOptimized,
    getMimeTypeFromExtension,
    validateBlob,
     formatTime,
    calculateUploadSpeed,
    validateFilesForUpload,
    getFileNameWithoutExtension,
    generateAutoDescription,
    universalDownload
};