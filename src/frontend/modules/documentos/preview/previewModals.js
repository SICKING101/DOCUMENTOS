import { downloadDocument } from '../download/downloadManager.js';

/**
 * Muestra modal de vista previa para imágenes.
 * @param {string} imageUrl - URL de la imagen
 * @param {string} fileName - Nombre del archivo
 */
export function showImagePreviewModal(imageUrl, fileName) {
    // Buscar el documento para obtener su ID
    const doc = window.appState.documents.find(d => d.nombre_original === fileName);
    const documentId = doc ? doc._id : null;
    
    // Crear modal para imagen
    const modal = document.createElement('div');
    modal.className = 'preview-modal preview-modal--image';
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
            <h3 style="margin: 0; font-size: 1.1rem;">${fileName}</h3>
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
            max-width: 90%;
            max-height: 80%;
            overflow: auto;
            display: flex;
            justify-content: center;
            align-items: center;
        ">
            <img src="${imageUrl}" alt="${fileName}" style="
                max-width: 100%;
                max-height: 100%;
                object-fit: contain;
            ">
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
            gap: 0.5rem;
            justify-content: center;
        ">
            ${documentId ? `
                <button onclick="downloadFromPreview('${documentId}')" style="
                    background: #4f46e5;
                    color: white;
                    border: none;
                    padding: 0.5rem 1rem;
                    border-radius: 4px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                ">
                    <i class="fas fa-download"></i> Descargar
                </button>
            ` : ''}
            <a href="${imageUrl}" target="_blank" style="
                background: #10b981;
                color: white;
                border: none;
                padding: 0.5rem 1rem;
                border-radius: 4px;
                cursor: pointer;
                text-decoration: none;
                display: inline-flex;
                align-items: center;
                gap: 0.5rem;
            ">
                <i class="fas fa-external-link-alt"></i> Abrir en nueva pestaña
            </a>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Función global para descargar
    window.downloadFromPreview = function(id) {
        downloadDocument(id);
    };
    
    // Event listeners
    const closeBtn = modal.querySelector('.close-preview');
    closeBtn.addEventListener('click', () => {
        document.body.removeChild(modal);
        delete window.downloadFromPreview;
    });
    
    // Cerrar con ESC
    document.addEventListener('keydown', function closeOnEsc(e) {
        if (e.key === 'Escape') {
            document.body.removeChild(modal);
            document.removeEventListener('keydown', closeOnEsc);
            delete window.downloadFromPreview;
        }
    });
    
    // Cerrar haciendo clic fuera de la imagen
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            document.body.removeChild(modal);
            document.removeEventListener('keydown', closeOnEsc);
            delete window.downloadFromPreview;
        }
    });
}

/**
 * Muestra modal de vista previa para PDFs.
 * @param {string} pdfUrl - URL del PDF
 * @param {string} fileName - Nombre del archivo
 */
export function showPDFPreviewModal(pdfUrl, fileName) {
    // Buscar el documento para obtener su ID
    const doc = window.appState.documents.find(d => d.nombre_original === fileName);
    const documentId = doc ? doc._id : null;
    
    const modal = document.createElement('div');
    modal.className = 'preview-modal preview-modal--pdf';
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
            <h3 style="margin: 0; font-size: 1.1rem;">${fileName}</h3>
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
        ">
            <embed src="${pdfUrl}" type="application/pdf" style="
                width: 100%;
                height: 100%;
            ">
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
            gap: 0.5rem;
            justify-content: center;
        ">
            ${documentId ? `
                <button onclick="downloadFromPreview('${documentId}')" style="
                    background: #4f46e5;
                    color: white;
                    border: none;
                    padding: 0.5rem 1rem;
                    border-radius: 4px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                ">
                    <i class="fas fa-download"></i> Descargar
                </button>
            ` : ''}
            <a href="${pdfUrl}" target="_blank" style="
                background: #10b981;
                color: white;
                border: none;
                padding: 0.5rem 1rem;
                border-radius: 4px;
                cursor: pointer;
                text-decoration: none;
                display: inline-flex;
                align-items: center;
                gap: 0.5rem;
            ">
                <i class="fas fa-external-link-alt"></i> Abrir en nueva pestaña
            </a>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Función global para descargar
    window.downloadFromPreview = function(id) {
        downloadDocument(id);
    };
    
    // Event listeners
    const closeBtn = modal.querySelector('.close-preview');
    closeBtn.addEventListener('click', () => {
        document.body.removeChild(modal);
        delete window.downloadFromPreview;
    });
    
    // Cerrar con ESC
    document.addEventListener('keydown', function closeOnEsc(e) {
        if (e.key === 'Escape') {
            document.body.removeChild(modal);
            document.removeEventListener('keydown', closeOnEsc);
            delete window.downloadFromPreview;
        }
    });
    
    // Cerrar haciendo clic fuera del contenido
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            document.body.removeChild(modal);
            document.removeEventListener('keydown', closeOnEsc);
            delete window.downloadFromPreview;
        }
    });
}