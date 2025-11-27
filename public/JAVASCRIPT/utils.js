import { CONFIG } from './config.js';

// =============================================================================
// FUNCIONES UTILITARIAS
// =============================================================================

function getFileIcon(fileType) {
    const iconMap = {
        'pdf': 'pdf',
        'doc': 'word',
        'docx': 'word',
        'xls': 'excel',
        'xlsx': 'excel',
        'txt': 'alt',
        'jpg': 'image',
        'jpeg': 'image',
        'png': 'image'
    };
    
    return iconMap[fileType.toLowerCase()] || 'file';
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

export { 
    getFileIcon, 
    getIconName, 
    formatFileSize, 
    formatDate, 
    isValidEmail, 
    setLoadingState, 
    showAlert, 
    setupModalBackdropClose 
};