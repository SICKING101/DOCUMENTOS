import { CONFIG } from '../../../config.js';
import { showAlert } from '../../../utils.js';
import { PREVIEWABLE_EXTENSIONS } from '../core/constants.js';

/**
 * Determina si un tipo de archivo puede ser previsualizado y cómo.
 * @param {string} fileType - Extensión del archivo
 * @returns {object} - Información sobre capacidad de previsualización
 */
export function canPreviewDocument(fileType) {
    // Verificar si es una imagen
    const isImage = PREVIEWABLE_EXTENSIONS.IMAGES.includes(fileType.toLowerCase());
    
    // Verificar si es texto plano
    const isText = PREVIEWABLE_EXTENSIONS.TEXT.includes(fileType.toLowerCase());
    
    // Verificar si es PDF
    const isPDF = PREVIEWABLE_EXTENSIONS.PDF.includes(fileType.toLowerCase());
    
    // Verificar si es Office (puede previsualizarse online)
    const isOffice = PREVIEWABLE_EXTENSIONS.OFFICE.includes(fileType.toLowerCase());
    
    // Unir todas las extensiones previsualizables
    const allPreviewable = [
        ...PREVIEWABLE_EXTENSIONS.IMAGES,
        ...PREVIEWABLE_EXTENSIONS.PDF,
        ...PREVIEWABLE_EXTENSIONS.TEXT,
        ...PREVIEWABLE_EXTENSIONS.OFFICE
    ];
    
    return {
        canPreview: allPreviewable.includes(fileType.toLowerCase()),
        isImage: isImage,
        isText: isText,
        isPDF: isPDF,
        isOffice: isOffice,
        isOnlinePreviewable: PREVIEWABLE_EXTENSIONS.OFFICE.includes(fileType.toLowerCase())
    };
}

/**
 * Muestra vista previa de un documento según su tipo.
 * Usa diferentes estrategias para imágenes, PDFs, Office y texto.
 * @param {string} id - ID del documento a previsualizar
 */
export function previewDocument(id) {
    console.group('👁️ VISTA PREVIA MEJORADA');
    
    try {
        const document = window.appState.documents.find(doc => doc._id === id);
        if (!document) {
            showAlert('Documento no encontrado', 'error');
            console.groupEnd();
            return;
        }
        
        const fileName = document.nombre_original;
        const fileExtension = fileName.split('.').pop().toLowerCase();
        const cloudinaryUrl = document.url_cloudinary || document.cloudinary_url;
        
        console.log('📋 Documento para vista previa:', {
            nombre: fileName,
            extension: fileExtension,
            url: cloudinaryUrl
        });
        
        // Determinar estrategia según tipo
        const previewInfo = canPreviewDocument(fileExtension);
        
        if (!previewInfo.canPreview) {
            showAlert('Este tipo de archivo no puede ser previsualizado directamente', 'warning');
            console.groupEnd();
            return;
        }
        
        if (previewInfo.isImage) {
            // Imágenes: abrir directamente
            console.log('🖼️ Vista previa de imagen');
            if (cloudinaryUrl) {
                // Importar dinámicamente para no cargar todo de una vez
                import('./previewModals.js')
                    .then(module => module.showImagePreviewModal(cloudinaryUrl, fileName))
                    .catch(error => {
                        console.error('Error cargando módulo de imagen:', error);
                        window.open(cloudinaryUrl, '_blank');
                    });
            } else {
                showAlert('No se puede acceder a la imagen', 'error');
            }
            
        } else if (previewInfo.isPDF) {
            // PDF: usar endpoint de preview del servidor
            console.log('📄 Vista previa de PDF');
            const previewUrl = `${CONFIG.API_BASE_URL}/documents/${id}/preview`;
            
            // Importar dinámicamente
            import('./previewModals.js')
                .then(module => module.showPDFPreviewModal(previewUrl, fileName))
                .catch(error => {
                    console.error('Error cargando módulo de PDF:', error);
                    window.open(previewUrl, '_blank');
                });
            
        } else if (previewInfo.isOffice && previewInfo.isOnlinePreviewable) {
            // Documentos Office: usar Google Docs Viewer
            console.log('📝 Vista previa de documento Office (Google Docs Viewer)');
            
            if (cloudinaryUrl) {
                const googleDocsViewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(cloudinaryUrl)}&embedded=true`;
                
                import('./officePreview.js')
                    .then(module => module.showOfficePreviewModal(googleDocsViewerUrl, fileName))
                    .catch(error => {
                        console.error('Error cargando módulo de Office:', error);
                        window.open(googleDocsViewerUrl, '_blank');
                    });
            } else {
                showAlert('No se puede acceder al documento para vista previa', 'error');
            }
            
        } else if (previewInfo.isText) {
            // Texto: cargar y mostrar en modal
            console.log('📝 Vista previa de texto');
            
            import('./textPreview.js')
                .then(module => module.showTextPreviewModal(id, fileName))
                .catch(error => {
                    console.error('Error cargando módulo de texto:', error);
                    showAlert('Error al cargar la vista previa de texto', 'error');
                });
            
        } else {
            // Otros tipos previsualizables: intentar abrir en nueva pestaña
            console.log('❓ Tipo previsualizable, abriendo en nueva pestaña');
            if (cloudinaryUrl) {
                window.open(cloudinaryUrl, '_blank');
                showAlert('Abriendo documento en nueva pestaña...', 'info');
            } else {
                showAlert('No se puede previsualizar este archivo', 'warning');
            }
        }
        
    } catch (error) {
        console.error('❌ Error en vista previa:', error);
        showAlert(`Error: ${error.message}`, 'error');
    } finally {
        console.groupEnd();
    }
}