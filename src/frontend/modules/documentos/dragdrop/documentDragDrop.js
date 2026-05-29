// =============================================================================
// src/frontend/modules/documentos/dragdrop/documentDragDrop.js
// Drag & Drop functionality to move documents between folders
// =============================================================================

/**
 * Initialize drag & drop for documents
 * Makes document rows draggable and folders drop targets
 */
export function initializeDocumentDragDrop() {
    console.log('🎯 Initializing document drag & drop');
    
    // Usar requestAnimationFrame para asegurar que el DOM está listo
    requestAnimationFrame(() => {
        // Make existing document rows draggable
        makeDocumentsDraggable();
        
        // Make folder cards drop targets
        makeFoldersDropTargets();
        
        // Make breadcrumb items drop targets
        makeBreadcrumbDropTargets();
        
        console.log('✅ Document drag & drop initialized');
    });
}

/**
 * Makes all document rows in the table draggable
 */
function makeDocumentsDraggable() {
    const documentRows = document.querySelectorAll('[data-document-id]:not([data-dragdrop-doc-init])');
    
    console.log(`📋 Found ${documentRows.length} document rows to make draggable`);
    
    documentRows.forEach(row => {
        // Marcar como inicializado para evitar duplicados
        row.setAttribute('data-dragdrop-doc-init', 'true');
        row.setAttribute('draggable', 'true');
        row.classList.add('document-draggable');
        
        // Remover listeners anteriores si existen
        const cleanRow = row.cloneNode(true);
        if (row.parentNode) {
            row.parentNode.replaceChild(cleanRow, row);
        }
        
        // Agregar nuevos listeners
        cleanRow.addEventListener('dragstart', handleDocumentDragStart);
        cleanRow.addEventListener('dragend', handleDocumentDragEnd);
    });
}

/**
 * Makes all folder cards drop targets
 */
function makeFoldersDropTargets() {
    const folderCards = document.querySelectorAll('[data-category-id]:not([data-dragdrop-folder-init])');
    
    console.log(`📁 Found ${folderCards.length} folder cards as drop targets`);
    
    folderCards.forEach(card => {
        card.setAttribute('data-dragdrop-folder-init', 'true');
        
        // Drag over
        card.addEventListener('dragover', handleFolderDragOver);
        
        // Drag leave
        card.addEventListener('dragleave', handleFolderDragLeave);
        
        // Drop
        card.addEventListener('drop', handleFolderDrop);
    });
}

/**
 * Makes all breadcrumb items (except active and root) drop targets for documents
 */
function makeBreadcrumbDropTargets() {
    const breadcrumbItems = document.querySelectorAll('[data-level]:not(.category--breadcrumb-item--active):not([data-dragdrop-breadcrumb-init])');
    
    breadcrumbItems.forEach(item => {
        const level = parseInt(item.getAttribute('data-level'), 10);
        
        // Skip root level (DOCUMENTOS)
        if (level === 0) {
            return;
        }
        
        item.setAttribute('data-dragdrop-breadcrumb-init', 'true');
        
        // Drag over
        item.addEventListener('dragover', handleBreadcrumbDragOver);
        
        // Drag leave
        item.addEventListener('dragleave', handleBreadcrumbDragLeave);
        
        // Drop
        item.addEventListener('drop', handleBreadcrumbDrop);
    });
    
    if (breadcrumbItems.length > 0) {
        console.log(`🍞 Made ${breadcrumbItems.length} breadcrumb items drop targets (excluding root)`);
    }
}

/**
 * Handle drag start on document row
 * @param {DragEvent} e 
 */
function handleDocumentDragStart(e) {
    const documentId = e.currentTarget.getAttribute('data-document-id');
    const documentNameElement = e.currentTarget.querySelector('.category--doc-name');
    const documentName = documentNameElement ? documentNameElement.textContent : 'Document';
    
    console.log(`🚀 Dragging document: ${documentId} (${documentName})`);
    
    // Store the document ID in the dataTransfer
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', documentId);
    e.dataTransfer.setData('application/json', JSON.stringify({
        documentId: documentId,
        documentName: documentName
    }));
    
    // Create a custom drag image
    const dragImage = document.createElement('div');
    dragImage.className = 'drag-preview';
    dragImage.textContent = `📄 ${documentName}`;
    dragImage.style.cssText = `
        position: absolute;
        left: -9999px;
        background-color: var(--primary-color, #3b82f6);
        color: white;
        padding: 8px 16px;
        border-radius: 6px;
        font-size: 13px;
        font-weight: 500;
        z-index: 10000;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        white-space: nowrap;
    `;
    document.body.appendChild(dragImage);
    
    try {
        e.dataTransfer.setDragImage(dragImage, 0, 0);
    } catch (error) {
        console.warn('Could not set custom drag image:', error);
    }
    
    // Remove the drag image after setting
    setTimeout(() => {
        if (dragImage.parentNode) {
            dragImage.parentNode.removeChild(dragImage);
        }
    }, 0);
    
    // Add dragging class for visual feedback
    e.currentTarget.classList.add('document--dragging');
    
    // Dispatch custom event
    window.dispatchEvent(new CustomEvent('document:dragstart', {
        detail: {
            documentId: documentId,
            documentName: documentName
        }
    }));
}

/**
 * Handle drag end on document row
 * @param {DragEvent} e 
 */
function handleDocumentDragEnd(e) {
    console.log('🛑 Drag ended');
    
    // Remove dragging class
    e.currentTarget.classList.remove('document--dragging');
    
    // Remove drag-over class from all folders
    document.querySelectorAll('[data-category-id].folder--drag-over').forEach(folder => {
        folder.classList.remove('folder--drag-over');
    });
    
    // Remove drag-over class from all breadcrumbs
    document.querySelectorAll('[data-level].folder--drag-over').forEach(breadcrumb => {
        breadcrumb.classList.remove('folder--drag-over');
    });
    
    // Dispatch custom event
    window.dispatchEvent(new CustomEvent('document:dragend'));
}

/**
 * Handle drag over on folder card
 * @param {DragEvent} e 
 */
function handleFolderDragOver(e) {
    // Prevent default to allow drop
    e.preventDefault();
    e.stopPropagation();
    
    // Set the drop effect to "move"
    if (e.dataTransfer) {
        e.dataTransfer.dropEffect = 'move';
    }
    
    // Add visual feedback
    e.currentTarget.classList.add('folder--drag-over');
}

/**
 * Handle drag leave on folder card
 * @param {DragEvent} e 
 */
function handleFolderDragLeave(e) {
    // Only remove the class if we're leaving the card itself
    // This prevents flickering when hovering over child elements
    if (e.currentTarget === e.target || !e.currentTarget.contains(e.relatedTarget)) {
        e.currentTarget.classList.remove('folder--drag-over');
    }
}

/**
 * Handle drop on folder card
 * @param {DragEvent} e 
 */
function handleFolderDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    
    const documentId = e.dataTransfer.getData('text/plain');
    const folderId = e.currentTarget.getAttribute('data-category-id');
    const folderNameElement = e.currentTarget.querySelector('.category--card-name');
    const folderName = e.currentTarget.getAttribute('data-category-name') || 
                      (folderNameElement ? folderNameElement.textContent : 'Carpeta');
    
    console.log(`📥 Dropped document ${documentId} into folder ${folderId} (${folderName})`);
    
    // Remove visual feedback
    e.currentTarget.classList.remove('folder--drag-over');
    
    if (!documentId || !folderId) {
        console.error('❌ Missing documentId or folderId');
        window.showAlert?.('Error: Datos incompletos para mover el documento', 'error');
        return;
    }
    
    // Emit custom event that will be handled by the API module
    window.dispatchEvent(new CustomEvent('document:dropped', {
        detail: {
            documentId,
            folderId,
            folderName
        }
    }));
}

/**
 * Handle drag over on breadcrumb item
 * @param {DragEvent} e 
 */
function handleBreadcrumbDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.dataTransfer) {
        e.dataTransfer.dropEffect = 'move';
    }
    
    // Add visual feedback
    e.currentTarget.classList.add('folder--drag-over');
}

/**
 * Handle drag leave on breadcrumb item
 * @param {DragEvent} e 
 */
function handleBreadcrumbDragLeave(e) {
    // Only remove the class if we're leaving the item itself
    if (e.currentTarget === e.target || !e.currentTarget.contains(e.relatedTarget)) {
        e.currentTarget.classList.remove('folder--drag-over');
    }
}

/**
 * Handle drop on breadcrumb item
 * @param {DragEvent} e 
 */
function handleBreadcrumbDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    
    const documentId = e.dataTransfer.getData('text/plain');
    const level = parseInt(e.currentTarget.getAttribute('data-level'), 10);
    
    // Remove visual feedback
    e.currentTarget.classList.remove('folder--drag-over');
    
    if (!documentId) {
        console.error('❌ Missing documentId for breadcrumb drop');
        return;
    }
    
    // Get the category from the navigation state
    let targetCategory = null;
    
    if (level === 0) {
        // Root level - "Documentos" - typically no folder ID needed
        console.log(`🍞 Breadcrumb drop on root (level 0) - moving to root`);
        window.dispatchEvent(new CustomEvent('document:dropped', {
            detail: {
                documentId,
                folderId: null, // null means root
                folderName: 'Documentos'
            }
        }));
        return;
    } else {
        // Get from stack: level 1 = stack[0], level 2 = stack[1], etc.
        if (window.categoryNavState && window.categoryNavState.stack) {
            targetCategory = window.categoryNavState.stack[level - 1];
        }
    }
    
    if (!targetCategory || !targetCategory._id) {
        console.warn(`⚠️ Could not find target category at level ${level}`);
        window.showAlert?.('Error: No se pudo encontrar la carpeta destino', 'error');
        return;
    }
    
    const folderId = targetCategory._id;
    const folderName = targetCategory.nombre || `Folder (Level ${level})`;
    
    console.log(`📥 Dropped document ${documentId} into breadcrumb folder ${folderId} (${folderName})`);
    
    // Emit custom event that will be handled by the API module
    window.dispatchEvent(new CustomEvent('document:dropped', {
        detail: {
            documentId,
            folderId,
            folderName
        }
    }));
}

/**
 * Re-enable drag & drop for newly added/rendered documents
 * Call this after rendering new documents or folders
 */
export function reinitializeDragDrop() {
    console.log('🔄 Reinitializing drag & drop after render');
    
    // Limpiar atributos de inicialización para forzar re-bind
    document.querySelectorAll('[data-dragdrop-doc-init]').forEach(el => {
        el.removeAttribute('data-dragdrop-doc-init');
    });
    
    document.querySelectorAll('[data-dragdrop-folder-init]').forEach(el => {
        el.removeAttribute('data-dragdrop-folder-init');
    });
    
    document.querySelectorAll('[data-dragdrop-breadcrumb-init]').forEach(el => {
        el.removeAttribute('data-dragdrop-breadcrumb-init');
    });
    
    // Re-inicializar
    initializeDocumentDragDrop();
}

/**
 * Add CSS for drag & drop visual feedback
 * This should be called once during initialization
 */
export function injectDragDropStyles() {
    const styleId = 'document-dragdrop-styles';
    
    // Check if styles already injected
    if (document.getElementById(styleId)) {
        return;
    }
    
    const styles = `
        /* Document drag & drop styles */
        
        /* Make draggable documents show cursor */
        [data-document-id] {
            cursor: grab;
            transition: opacity 0.2s ease, background-color 0.2s ease;
        }
        
        [data-document-id]:active {
            cursor: grabbing;
        }
        
        /* Document being dragged */
        [data-document-id].document--dragging {
            opacity: 0.5;
            background-color: rgba(59, 130, 246, 0.1) !important;
            outline: 2px dashed var(--primary-color, #3b82f6);
            outline-offset: -2px;
            border-radius: 4px;
        }
        
        /* Folder as drop target - normal state */
        [data-category-id] {
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            position: relative;
        }
        
        /* Folder being hovered with document */
        [data-category-id].folder--drag-over {
            background-color: rgba(59, 130, 246, 0.15) !important;
            outline: 3px solid var(--primary-color, #3b82f6) !important;
            outline-offset: -3px;
            box-shadow: 0 0 20px rgba(59, 130, 246, 0.3), 
                        inset 0 0 20px rgba(59, 130, 246, 0.1) !important;
            transform: scale(1.03);
            border-radius: 12px;
        }
        
        /* Breadcrumb items as drop targets */
        [data-level] {
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            position: relative;
        }
        
        /* Breadcrumb being hovered with document */
        [data-level].folder--drag-over {
            background-color: rgba(59, 130, 246, 0.2) !important;
            border-radius: 8px;
            padding: 4px 12px !important;
            outline: 2px solid var(--primary-color, #3b82f6) !important;
            box-shadow: 0 0 12px rgba(59, 130, 246, 0.4) !important;
            transform: scale(1.05);
        }
        
        /* Drag preview styling */
        .drag-preview {
            font-weight: 500;
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
            user-select: none;
            pointer-events: none;
        }
        
        /* Dark theme adjustments */
        [data-theme="dark"] [data-category-id].folder--drag-over {
            background-color: rgba(59, 130, 246, 0.25) !important;
            box-shadow: 0 0 20px rgba(59, 130, 246, 0.4), 
                        inset 0 0 20px rgba(59, 130, 246, 0.15) !important;
        }
        
        [data-theme="dark"] [data-level].folder--drag-over {
            background-color: rgba(59, 130, 246, 0.3) !important;
        }
        
        [data-theme="dark"] [data-document-id].document--dragging {
            background-color: rgba(59, 130, 246, 0.2) !important;
        }
    `;
    
    const styleElement = document.createElement('style');
    styleElement.id = styleId;
    styleElement.textContent = styles;
    document.head.appendChild(styleElement);
    
    console.log('✅ Drag & drop styles injected');
}