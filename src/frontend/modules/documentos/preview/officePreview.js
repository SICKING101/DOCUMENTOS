import { showAlert } from '../../../utils.js';
import { downloadDocument } from '../download/downloadManager.js';

/**
 * Muestra modal de vista previa para documentos Office usando Google Docs Viewer.
 * @param {string} viewerUrl - URL de Google Docs Viewer
 * @param {string} fileName - Nombre del archivo
 */
export function showOfficePreviewModal(viewerUrl, fileName) {
    // Buscar el documento para obtener su ID
    const doc = window.appState.documents.find(d => d.nombre_original === fileName);
    const documentId = doc ? doc._id : null;
    
    const modal = document.createElement('div');
    modal.className = 'preview-modal preview-modal--office';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.9);
        z-index: 9999;
        display: flex;
        justify-content: center;
        align-items: center;
        flex-direction: column;
    `;
    
    modal.innerHTML = `
        <div class="preview-modal__header" style="
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            padding: 1rem;
            background: rgba(0,0,0,0.7);
            color: white;
            display: flex;
            justify-content: space-between;
            align-items: center;
            z-index: 10000;
        ">
            <div>
                <h3 style="margin: 0; font-size: 1.1rem;">${fileName} <span style="font-size: 0.9rem; opacity: 0.8;">(Vista previa online)</span></h3>
                <div style="font-size: 0.8rem; margin-top: 0.25rem; opacity: 0.8;">
                    <i class="fas fa-info-circle"></i> Vista previa proporcionada por Google Docs Viewer
                </div>
            </div>
            <button class="close-preview" style="
                background: none;
                border: none;
                color: white;
                font-size: 1.5rem;
                cursor: pointer;
                padding: 0.5rem;
                line-height: 1;
            ">&times;</button>
        </div>
        
        <div class="preview-modal__content" style="
            width: 90%;
            height: 80%;
            overflow: hidden;
            background: white;
            border-radius: 4px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        ">
            <iframe 
                src="${viewerUrl}" 
                style="
                    width: 100%;
                    height: 100%;
                    border: none;
                "
                title="Vista previa de ${fileName}"
                allow="autoplay"
                sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
            ></iframe>
        </div>
        
        <div class="preview-modal__footer" style="
            position: absolute;
            bottom: 0;
            left: 0;
            width: 100%;
            padding: 1rem;
            background: rgba(0,0,0,0.7);
            color: white;
            text-align: center;
            display: flex;
            flex-direction: column;
            gap: 0.75rem;
        ">
            <div style="
                padding: 0.75rem;
                background: rgba(59, 130, 246, 0.1);
                border-radius: 6px;
                border-left: 4px solid #3b82f6;
                text-align: left;
            ">
                <div style="display: flex; align-items: flex-start; gap: 0.5rem;">
                    <i class="fas fa-info-circle" style="color: #3b82f6; margin-top: 0.1rem;"></i>
                    <div>
                        <strong style="display: block; font-size: 0.9rem;">Nota sobre la vista previa</strong>
                        <p style="margin: 0; font-size: 0.85rem; opacity: 0.9;">
                            Esta vista previa es proporcionada por Google Docs Viewer y puede no mostrar 
                            exactamente el mismo formato que la aplicación original. 
                            Para ver el documento con formato exacto, descarga el archivo.
                        </p>
                    </div>
                </div>
            </div>
            
            <div style="display: flex; gap: 0.75rem; justify-content: center; flex-wrap: wrap;">
                ${documentId ? `
                    <button onclick="downloadOfficePreview('${documentId}')" style="
                        background: linear-gradient(135deg, #4f46e5 0%, #3730a3 100%);
                        color: white;
                        border: none;
                        padding: 0.75rem 1.5rem;
                        border-radius: 6px;
                        cursor: pointer;
                        font-weight: 500;
                        font-size: 0.9rem;
                        display: flex;
                        align-items: center;
                        gap: 0.5rem;
                        transition: all 0.2s;
                        min-width: 200px;
                    ">
                        <i class="fas fa-download"></i> Descargar documento original
                    </button>
                ` : ''}
                
                <button onclick="openInNewTab('${viewerUrl}')" style="
                    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                    color: white;
                    border: none;
                    padding: 0.75rem 1.5rem;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 0.9rem;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    transition: all 0.2s;
                ">
                    <i class="fas fa-external-link-alt"></i> Abrir en pestaña nueva
                </button>
                
                <button onclick="closeOfficePreview()" style="
                    background: transparent;
                    color: white;
                    border: 1px solid #4b5563;
                    padding: 0.75rem 1.5rem;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 0.9rem;
                    transition: all 0.2s;
                ">
                    Cerrar vista previa
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Función global para descargar
    window.downloadOfficePreview = function(id) {
        downloadDocument(id);
    };
    
    // Función global para abrir en nueva pestaña
    window.openInNewTab = function(url) {
        window.open(url, '_blank', 'noopener,noreferrer');
    };
    
    // Función global para cerrar
    window.closeOfficePreview = function() {
        if (modal.parentNode) {
            document.body.removeChild(modal);
        }
        cleanupOfficePreviewGlobals();
    };
    
    // Función para limpiar funciones globales
    function cleanupOfficePreviewGlobals() {
        delete window.downloadOfficePreview;
        delete window.openInNewTab;
        delete window.closeOfficePreview;
        document.removeEventListener('keydown', handleEscKey);
    }
    
    // Event listeners
    const closeBtn = modal.querySelector('.close-preview');
    closeBtn.addEventListener('click', () => {
        document.body.removeChild(modal);
        cleanupOfficePreviewGlobals();
    });
    
    // Cerrar con ESC
    const handleEscKey = (e) => {
        if (e.key === 'Escape') {
            document.body.removeChild(modal);
            cleanupOfficePreviewGlobals();
        }
    };
    
    document.addEventListener('keydown', handleEscKey);
    
    // Cerrar haciendo clic fuera del contenido
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            document.body.removeChild(modal);
            cleanupOfficePreviewGlobals();
        }
    });
    
    // Mostrar información sobre limitaciones
    showOfficePreviewInfo(fileName);
}

/**
 * Muestra información sobre las limitaciones de la vista previa de Office.
 * @param {string} fileName - Nombre del archivo
 */
function showOfficePreviewInfo(fileName) {
    console.group('📋 INFORMACIÓN VISTA PREVIA OFFICE');
    
    const fileExtension = fileName.split('.').pop().toLowerCase();
    const limitations = {
        'doc': 'Documento Word 97-2003: Puede haber pérdida de formato avanzado',
        'docx': 'Documento Word moderno: Compatibilidad generalmente buena',
        'xls': 'Excel 97-2003: Fórmulas y macros pueden no mostrarse',
        'xlsx': 'Excel moderno: Compatibilidad generalmente buena',
        'ppt': 'PowerPoint 97-2003: Animaciones pueden perderse',
        'pptx': 'PowerPoint moderno: Compatibilidad generalmente buena'
    };
    
    if (limitations[fileExtension]) {
        console.log(`ℹ️ Limitaciones para ${fileExtension.toUpperCase()}: ${limitations[fileExtension]}`);
    }
    
    console.log('🔧 Configuración recomendada:');
    console.log('   • Tamaño de ventana: Mínimo 800x600 para mejor visualización');
    console.log('   • Conexión: Requiere internet para cargar Google Docs Viewer');
    console.log('   • Privacidad: Google puede registrar la solicitud de vista previa');
    
    console.groupEnd();
}

/**
 * Verifica si un documento de Office puede ser previsualizado.
 * @param {string} fileExtension - Extensión del archivo
 * @returns {object} - Información sobre capacidad de previsualización
 */
export function canPreviewOfficeDocument(fileExtension) {
    const officeExtensions = ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'];
    const isOfficeFile = officeExtensions.includes(fileExtension.toLowerCase());
    
    return {
        canPreview: isOfficeFile,
        requiresInternet: true,
        previewProvider: 'Google Docs Viewer',
        limitations: [
            'Requiere conexión a internet',
            'Google puede registrar la solicitud',
            'Puede haber pérdida de formato avanzado',
            'No muestra macros o scripts activos'
        ],
        maxFileSize: '10MB', // Límite práctico para Google Docs Viewer
        supportedFormats: officeExtensions.map(ext => ext.toUpperCase()).join(', ')
    };
}

/**
 * Obtiene información detallada sobre la previsualización de Office.
 * @param {string} fileName - Nombre del archivo
 * @returns {object} - Información detallada
 */
export function getOfficePreviewInfo(fileName) {
    const fileExtension = fileName.split('.').pop().toLowerCase();
    const canPreview = canPreviewOfficeDocument(fileExtension);
    
    const typeInfo = {
        'doc': { type: 'Word Document (97-2003)', icon: 'fa-file-word' },
        'docx': { type: 'Word Document', icon: 'fa-file-word' },
        'xls': { type: 'Excel Spreadsheet (97-2003)', icon: 'fa-file-excel' },
        'xlsx': { type: 'Excel Spreadsheet', icon: 'fa-file-excel' },
        'ppt': { type: 'PowerPoint Presentation (97-2003)', icon: 'fa-file-powerpoint' },
        'pptx': { type: 'PowerPoint Presentation', icon: 'fa-file-powerpoint' }
    };
    
    return {
        fileName,
        fileExtension,
        canPreview: canPreview.canPreview,
        previewMethod: canPreview.previewProvider,
        documentType: typeInfo[fileExtension]?.type || 'Documento Office',
        icon: typeInfo[fileExtension]?.icon || 'fa-file',
        limitations: canPreview.limitations,
        requiresInternet: canPreview.requiresInternet,
        maxFileSize: canPreview.maxFileSize,
        recommendation: canPreview.canPreview ? 
            'Recomendado usar vista previa online' : 
            'No se puede previsualizar online, descarga requerida'
    };
}