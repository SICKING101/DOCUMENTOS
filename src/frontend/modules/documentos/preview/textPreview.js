import { CONFIG } from '../../../config.js';
import { showAlert, formatFileSize } from '../../../utils.js';
import { downloadDocument } from '../download/downloadManager.js';
import { PREVIEW_CONFIG } from '../core/constants.js';

/**
 * Muestra modal de vista previa para archivos de texto.
 * @param {string} documentId - ID del documento
 * @param {string} fileName - Nombre del archivo
 */
export async function showTextPreviewModal(documentId, fileName) {
    console.group('📝 VISTA PREVIA DE TEXTO');
    
    try {
        console.log('📄 Obteniendo contenido para:', fileName);
        
        // Primero intentar con el endpoint de contenido específico
        console.log('🔄 Intentando endpoint /content...');
        
        try {
            const response = await fetch(`${CONFIG.API_BASE_URL}/documents/${documentId}/content?limit=50000`);
            
            if (response.ok) {
                console.log('✅ Endpoint /content funcionó');
                
                // Obtener metadatos de los headers
                const isTruncated = response.headers.get('X-Content-Truncated') === 'true';
                const originalSize = response.headers.get('X-Original-Length');
                const contentType = response.headers.get('Content-Type') || 'text/plain';
                
                const textContent = await response.text();
                console.log(`✅ Contenido obtenido: ${textContent.length} caracteres`);
                
                // Crear modal con metadatos
                createTextPreviewModal(documentId, fileName, textContent, {
                    isTruncated,
                    originalSize: originalSize ? parseInt(originalSize) : null,
                    contentType
                });
                
                console.groupEnd();
                return;
            }
        } catch (contentError) {
            console.warn('⚠️ Endpoint /content falló:', contentError.message);
        }
        
        // Si falla, intentar con el endpoint de descarga
        console.log('🔄 Intentando endpoint /download como fallback...');
        
        const downloadResponse = await fetch(`${CONFIG.API_BASE_URL}/documents/${documentId}/download`, {
            headers: {
                'Accept': 'text/plain'
            }
        });
        
        if (!downloadResponse.ok) {
            throw new Error(`Error ${downloadResponse.status}: No se pudo obtener el contenido`);
        }
        
        const textContent = await downloadResponse.text();
        console.log(`✅ Contenido obtenido via /download: ${textContent.length} caracteres`);
        
        // Verificar que no sea una página de error HTML
        if (textContent.includes('<!DOCTYPE html>') || 
            textContent.includes('<html') ||
            textContent.includes('Error al cargar')) {
            console.warn('⚠️ El contenido parece ser HTML de error');
            
            // Intentar obtener directamente desde Cloudinary
            const doc = window.appState.documents.find(d => d._id === documentId);
            if (doc && (doc.cloudinary_url || doc.url_cloudinary)) {
                console.log('🔄 Intentando desde Cloudinary directamente...');
                
                try {
                    const cloudinaryResponse = await fetch(doc.cloudinary_url || doc.url_cloudinary);
                    if (cloudinaryResponse.ok) {
                        const cloudinaryText = await cloudinaryResponse.text();
                        
                        // Verificar que no sea el mismo error
                        if (!cloudinaryText.includes('<!DOCTYPE html>')) {
                            createTextPreviewModal(documentId, fileName, cloudinaryText);
                            console.groupEnd();
                            return;
                        }
                    }
                } catch (cloudinaryError) {
                    console.warn('⚠️ Cloudinary también falló:', cloudinaryError.message);
                }
            }
            
            throw new Error('El servidor devolvió una página HTML en lugar del contenido de texto');
        }
        
        // Si todo está bien, crear el modal
        createTextPreviewModal(documentId, fileName, textContent);
        
    } catch (error) {
        console.error('❌ Error en vista previa de texto:', error);
        
        // Crear modal de error
        createTextPreviewErrorModal(documentId, fileName, error);
    } finally {
        console.groupEnd();
    }
}

/**
 * Crea el modal de vista previa de texto
 */
function createTextPreviewModal(documentId, fileName, textContent, metadata = {}) {
    console.log('🖼️ Creando modal para:', fileName);
    
    // Renombrar la variable 'document' a 'docData' para evitar conflicto
    // con el objeto global 'document' del navegador
    const docData = window.appState.documents.find(d => d._id === documentId);
    
    // Desestructurar metadata con valores por defecto
    const {
        isTruncated = false,
        originalSize = null,
        contentType = 'text/plain'
    } = metadata;
    
    // Crear elemento modal
    const modal = document.createElement('div');  // Aquí usamos document GLOBAL del navegador
    modal.className = 'preview-modal preview-modal--text';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.95);
        z-index: 9999;
        display: flex;
        flex-direction: column;
    `;
    
    // Limitar longitud para mostrar (100KB máximo en modal)
    const maxLength = PREVIEW_CONFIG.MAX_TEXT_LENGTH;
    let displayContent = textContent;
    let isContentTruncated = false;
    
    if (textContent.length > maxLength) {
        displayContent = textContent.substring(0, maxLength);
        isContentTruncated = true;
    }
    
    // Si metadata indica truncado del servidor
    const finalIsTruncated = isTruncated || isContentTruncated;
    
    // Escapar HTML y manejar saltos de línea
    displayContent = escapeHtml(displayContent)
        .replace(/\n/g, '<br>')
        .replace(/\t/g, '&nbsp;&nbsp;&nbsp;&nbsp;')
        .replace(/  /g, '&nbsp;&nbsp;');
    
    // Preparar estadísticas
    const fileSize = docData ? formatFileSize(docData.tamano_archivo) : 'Desconocido';
    const lines = displayContent.split('<br>').length;
    const words = displayContent.split(/\s+/).filter(w => w.length > 0).length;
    const charCount = textContent.length;
    
    modal.innerHTML = `
        <!-- Header -->
        <div style="
            padding: 1rem 1.5rem;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            color: white;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid #2d3748;
            flex-shrink: 0;
        ">
            <div>
                <div style="display: flex; align-items: center; gap: 0.75rem;">
                    <i class="fas fa-file-alt" style="font-size: 1.25rem; color: #4f46e5;"></i>
                    <h3 style="margin: 0; font-size: 1.1rem; font-weight: 600;">${fileName}</h3>
                </div>
                <div style="margin-top: 0.25rem; font-size: 0.85rem; opacity: 0.8; display: flex; gap: 1rem;">
                    <span><i class="fas fa-hdd"></i> ${fileSize}</span>
                    <span><i class="fas fa-font"></i> ${charCount.toLocaleString()} caracteres</span>
                    ${finalIsTruncated ? '<span><i class="fas fa-exclamation-triangle" style="color: #f59e0b;"></i> Truncado</span>' : ''}
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
                border-radius: 4px;
                transition: background 0.2s;
            ">&times;</button>
        </div>
        
        <!-- Content -->
        <div style="
            flex: 1;
            overflow: auto;
            padding: 1.5rem;
            background: #0f172a;
            font-family: 'JetBrains Mono', 'Courier New', monospace;
            font-size: 14px;
            line-height: 1.6;
            color: #e2e8f0;
        ">
            <!-- Barra de herramientas -->
            <div style="
                background: #1e293b;
                padding: 0.75rem 1rem;
                border-radius: 6px;
                margin-bottom: 1rem;
                display: flex;
                justify-content: space-between;
                align-items: center;
                border: 1px solid #334155;
            ">
                <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                    <button class="copy-text-btn" style="
                        background: #374151;
                        color: #d1d5db;
                        border: 1px solid #4b5563;
                        padding: 0.5rem 1rem;
                        border-radius: 4px;
                        cursor: pointer;
                        font-size: 0.9rem;
                        display: flex;
                        align-items: center;
                        gap: 0.5rem;
                        transition: all 0.2s;
                    " title="Copiar texto completo">
                        <i class="fas fa-copy"></i> Copiar
                    </button>
                    <button class="download-btn" style="
                        background: #1d4ed8;
                        color: white;
                        border: none;
                        padding: 0.5rem 1rem;
                        border-radius: 4px;
                        cursor: pointer;
                        font-size: 0.9rem;
                        display: flex;
                        align-items: center;
                        gap: 0.5rem;
                        transition: all 0.2s;
                    " title="Descargar archivo completo">
                        <i class="fas fa-download"></i> Descargar
                    </button>
                </div>
                
                <div style="display: flex; gap: 0.5rem; align-items: center;">
                    <span style="font-size: 0.85rem; color: #9ca3af;">${contentType}</span>
                </div>
            </div>
            
            <!-- Contenido del texto -->
            <div id="textContentDisplay" style="
                background: #0f172a;
                padding: 1.5rem;
                border-radius: 6px;
                border: 1px solid #1e293b;
                white-space: pre-wrap;
                word-wrap: break-word;
                overflow-wrap: break-word;
                min-height: 200px;
            ">
                ${displayContent}
            </div>
            
            <!-- Advertencia de truncado -->
            ${finalIsTruncated ? `
                <div style="
                    margin-top: 1.5rem;
                    padding: 1rem;
                    background: rgba(245, 158, 11, 0.1);
                    border-left: 4px solid #f59e0b;
                    border-radius: 4px;
                    color: #fbbf24;
                ">
                    <div style="display: flex; align-items: flex-start; gap: 0.75rem;">
                        <i class="fas fa-exclamation-triangle" style="font-size: 1.1rem; margin-top: 0.1rem;"></i>
                        <div>
                            <strong style="display: block; margin-bottom: 0.25rem;">Contenido truncado</strong>
                            <p style="margin: 0; font-size: 0.9rem;">
                                ${originalSize ? `Solo se muestran los primeros ${maxLength.toLocaleString()} caracteres 
                                (${((maxLength / originalSize) * 100).toFixed(1)}% del archivo).` : 
                                `Solo se muestran los primeros ${maxLength.toLocaleString()} caracteres.`}
                                Descarga el archivo completo para ver todo el contenido.
                            </p>
                        </div>
                    </div>
                </div>
            ` : ''}
            
            <!-- Información del archivo -->
            <div style="
                margin-top: 1.5rem;
                padding: 1rem;
                background: #1e293b;
                border-radius: 6px;
                font-size: 0.9rem;
                color: #94a3b8;
            ">
                <strong style="display: block; margin-bottom: 0.5rem; color: #cbd5e1;">Información del archivo:</strong>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 0.75rem;">
                    <div><i class="far fa-file-alt"></i> <strong>Tamaño:</strong> ${charCount.toLocaleString()} caracteres</div>
                    <div><i class="fas fa-code"></i> <strong>Líneas:</strong> ${lines.toLocaleString()}</div>
                    <div><i class="fas fa-font"></i> <strong>Palabras:</strong> ${words.toLocaleString()}</div>
                    <div><i class="fas fa-database"></i> <strong>Bytes:</strong> ${new Blob([textContent]).size.toLocaleString()}</div>
                </div>
            </div>
        </div>
        
        <!-- Footer -->
        <div style="
            padding: 1rem 1.5rem;
            background: #1a1a2e;
            border-top: 1px solid #2d3748;
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-shrink: 0;
        ">
            <div style="font-size: 0.85rem; color: #9ca3af;">
                <i class="fas fa-info-circle"></i>
                <span>Usa Ctrl+F para buscar en el texto</span>
            </div>
            <div style="display: flex; gap: 0.5rem;">
                <button class="close-btn" style="
                    background: #374151;
                    color: white;
                    border: none;
                    padding: 0.5rem 1.25rem;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 0.9rem;
                ">
                    Cerrar
                </button>
            </div>
        </div>
    `;
    
    // Agregar al DOM
    document.body.appendChild(modal);
    
    // Event listeners
    const closeBtn = modal.querySelector('.close-preview');
    const closeMainBtn = modal.querySelector('.close-btn');
    const copyBtn = modal.querySelector('.copy-text-btn');
    const downloadBtn = modal.querySelector('.download-btn');
    
    // Función para cerrar el modal
    const closeModal = () => {
        if (modal.parentNode) {
            document.body.removeChild(modal);
        }
        // Limpiar event listeners globales
        document.removeEventListener('keydown', handleEscKey);
    };
    
    // Función para manejar tecla ESC
    const handleEscKey = (e) => {
        if (e.key === 'Escape') {
            closeModal();
        }
    };
    
    // Event listener para cerrar
    closeBtn.addEventListener('click', closeModal);
    closeMainBtn.addEventListener('click', closeModal);
    
    // Event listener para ESC
    document.addEventListener('keydown', handleEscKey);
    
    // Event listener para copiar texto
    copyBtn.addEventListener('click', async () => {
        try {
            await navigator.clipboard.writeText(textContent);
            showAlert('Texto copiado al portapapeles', 'success');
        } catch (err) {
            console.error('Error copiando texto:', err);
            // Método alternativo para navegadores antiguos
            const textArea = document.createElement('textarea');
            textArea.value = textContent;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            showAlert('Texto copiado al portapapeles', 'success');
        }
    });
    
    // Event listener para descargar
    downloadBtn.addEventListener('click', () => {
        downloadDocument(documentId);
    });
    
    // Buscar con Ctrl+F
    modal.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'f') {
            e.preventDefault();
            showSearchBar();
        }
    });
    
    // Función para mostrar barra de búsqueda
    function showSearchBar() {
        const existingSearchBar = document.getElementById('textSearchBar');
        if (existingSearchBar) return;
        
        const searchBar = document.createElement('div');
        searchBar.id = 'textSearchBar';
        searchBar.style.cssText = `
            position: fixed;
            top: 80px;
            left: 50%;
            transform: translateX(-50%);
            background: #1e293b;
            padding: 0.75rem 1rem;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 10000;
            display: flex;
            align-items: center;
            gap: 0.75rem;
            border: 1px solid #4b5563;
            min-width: 400px;
        `;
        
        searchBar.innerHTML = `
            <input type="text" id="textSearchInput" placeholder="Buscar en el texto..." style="
                flex: 1;
                background: #0f172a;
                border: 1px solid #4b5563;
                color: white;
                padding: 0.5rem 0.75rem;
                border-radius: 4px;
                font-family: inherit;
                font-size: 0.9rem;
            " autofocus>
            <span id="searchResults" style="font-size: 0.85rem; color: #9ca3af; min-width: 80px; text-align: center;">
                0/0
            </span>
            <button class="search-btn" style="
                background: #4f46e5;
                color: white;
                border: none;
                padding: 0.5rem 1rem;
                border-radius: 4px;
                cursor: pointer;
                font-size: 0.9rem;
            ">
                <i class="fas fa-search"></i>
            </button>
            <button class="close-search-btn" style="
                background: transparent;
                color: #9ca3af;
                border: none;
                padding: 0.5rem;
                cursor: pointer;
                font-size: 1rem;
            ">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        modal.appendChild(searchBar);
        
        // Funciones de búsqueda
        const performSearch = () => {
            const searchTerm = document.getElementById('textSearchInput').value;
            if (!searchTerm.trim()) return;
            
            const textElement = document.getElementById('textContentDisplay');
            const originalContent = textElement.innerHTML;
            const plainText = textElement.textContent || textElement.innerText;
            
            // Encontrar todas las ocurrencias
            const regex = new RegExp(`(${escapeRegExp(searchTerm)})`, 'gi');
            const matches = plainText.match(regex) || [];
            
            // Actualizar contador
            document.getElementById('searchResults').textContent = 
                `${matches.length} resultado(s)`;
            
            // Resaltar
            const highlighted = plainText.replace(
                regex,
                '<mark style="background: #f59e0b; color: #000; padding: 0 2px; border-radius: 2px; font-weight: bold;">$1</mark>'
            );
            
            // Convertir de vuelta a HTML con saltos de línea
            textElement.innerHTML = highlighted.replace(/\n/g, '<br>');
            
            // Desplazar a la primera coincidencia
            const firstMark = textElement.querySelector('mark');
            if (firstMark) {
                firstMark.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        };
        
        const closeSearch = () => {
            searchBar.remove();
            
            // Restaurar contenido original
            const textElement = document.getElementById('textContentDisplay');
            textElement.innerHTML = displayContent;
        };
        
        // Event listeners para búsqueda
        searchBar.querySelector('.search-btn').addEventListener('click', performSearch);
        searchBar.querySelector('.close-search-btn').addEventListener('click', closeSearch);
        
        // Buscar al presionar Enter
        searchBar.querySelector('#textSearchInput').addEventListener('keyup', (e) => {
            if (e.key === 'Enter') {
                performSearch();
            }
        });
        
        // Cerrar búsqueda al presionar ESC dentro del input
        searchBar.querySelector('#textSearchInput').addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                closeSearch();
            }
        });
    }
}

/**
 * Crea modal de error para vista previa
 */
function createTextPreviewErrorModal(documentId, fileName, error) {
    const modal = document.createElement('div');
    modal.className = 'preview-modal preview-modal--error';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.95);
        z-index: 9999;
        display: flex;
        justify-content: center;
        align-items: center;
    `;
    
    modal.innerHTML = `
        <div style="
            background: #1e293b;
            padding: 2rem;
            border-radius: 12px;
            max-width: 500px;
            width: 90%;
            color: white;
            border: 1px solid #374151;
            box-shadow: 0 10px 25px rgba(0,0,0,0.3);
        ">
            <div style="text-align: center; margin-bottom: 1.5rem;">
                <div style="
                    width: 60px;
                    height: 60px;
                    background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin: 0 auto 1rem;
                ">
                    <i class="fas fa-exclamation-triangle" style="font-size: 1.75rem;"></i>
                </div>
                <h3 style="margin: 0 0 0.5rem 0; font-size: 1.25rem; color: #fca5a5;">No se puede previsualizar</h3>
                <p style="margin: 0; opacity: 0.8; font-size: 0.95rem;">${fileName}</p>
            </div>
            
            <div style="
                background: rgba(239, 68, 68, 0.1);
                padding: 1rem;
                border-radius: 8px;
                margin-bottom: 1.5rem;
                border-left: 4px solid #ef4444;
            ">
                <p style="margin: 0; font-size: 0.9rem;">
                    <strong>Error:</strong> ${error.message || 'Error desconocido'}
                </p>
            </div>
            
            <div style="margin-bottom: 1.5rem;">
                <p style="margin: 0 0 0.75rem 0; font-size: 0.95rem; color: #cbd5e1;">
                    <strong>Posibles causas:</strong>
                </p>
                <ul style="margin: 0; padding-left: 1.25rem; font-size: 0.9rem; color: #9ca3af; line-height: 1.5;">
                    <li>El archivo está vacío o dañado</li>
                    <li>El tipo de archivo no es texto plano válido</li>
                    <li>El servidor no puede acceder al contenido</li>
                    <li>Problemas de permisos o conexión</li>
                </ul>
            </div>
            
            <div style="display: flex; gap: 0.75rem; justify-content: center; flex-wrap: wrap;">
                <button onclick="window.downloadDocument('${documentId}')" style="
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
                ">
                    <i class="fas fa-download"></i> Descargar archivo
                </button>
                
                <button onclick="closeErrorModal()" style="
                    background: transparent;
                    color: white;
                    border: 1px solid #4b5563;
                    padding: 0.75rem 1.5rem;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 0.9rem;
                    transition: all 0.2s;
                ">
                    Cerrar
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    window.closeErrorModal = function() {
        if (modal.parentNode) {
            document.body.removeChild(modal);
        }
        delete window.closeErrorModal;
    };
    
    // Cerrar con ESC
    document.addEventListener('keydown', function closeOnEsc(e) {
        if (e.key === 'Escape') {
            window.closeErrorModal();
            document.removeEventListener('keydown', closeOnEsc);
        }
    });
    
    // Cerrar al hacer clic fuera
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            window.closeErrorModal();
        }
    });
}

/**
 * Función auxiliar para escapar HTML y prevenir XSS.
 * @param {string} text - Texto a escapar
 * @returns {string} - Texto escapado
 */
function escapeHtml(unsafe) {
    if (typeof unsafe !== 'string') return unsafe;
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

/**
 * Función auxiliar para escapar caracteres especiales en expresiones regulares
 */
function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}