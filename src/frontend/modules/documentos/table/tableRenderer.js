import { DOM } from '../../../dom.js';
import { formatFileSize, formatDate, getFileIcon } from '../../../utils.js';
import { canPreviewDocument } from '../preview/previewManager.js';
import { downloadDocument } from '../download/downloadManager.js';

/**
 * Renderiza la tabla de documentos con filtros y búsqueda aplicados.
 * Muestra estado, acciones y formatos los datos apropiadamente.
 */
export function renderDocumentsTable() {
    if (!DOM.documentosTableBody) return;
    
    DOM.documentosTableBody.innerHTML = '';
    
    let documentsToShow = window.appState.documents;
    
    // Aplicar búsqueda si existe
    if (window.appState.currentSearchQuery) {
        const query = window.appState.currentSearchQuery.toLowerCase();
        documentsToShow = documentsToShow.filter(doc => 
            doc.nombre_original.toLowerCase().includes(query) ||
            (doc.descripcion && doc.descripcion.toLowerCase().includes(query)) ||
            doc.categoria.toLowerCase().includes(query)
        );
    }
    
    // Aplicar filtros
    if (window.appState.filters.category) {
        documentsToShow = documentsToShow.filter(doc => doc.categoria === window.appState.filters.category);
    }
    
    if (window.appState.filters.type) {
        documentsToShow = documentsToShow.filter(doc => doc.tipo_archivo.toLowerCase() === window.appState.filters.type.toLowerCase());
    }
    
    if (window.appState.filters.status) {
        const now = new Date();
        documentsToShow = documentsToShow.filter(doc => {
            if (!doc.fecha_vencimiento) return window.appState.filters.status === 'active';
            
            const fechaVencimiento = new Date(doc.fecha_vencimiento);
            const diferenciaDias = Math.ceil((fechaVencimiento - now) / (1000 * 60 * 60 * 24));
            
            switch(window.appState.filters.status) {
                case 'active':
                    return diferenciaDias > 7;
                case 'expiring':
                    return diferenciaDias <= 7 && diferenciaDias > 0;
                case 'expired':
                    return diferenciaDias <= 0;
                default:
                    return true;
            }
        });
    }
    
    if (documentsToShow.length === 0) {
        DOM.documentosTableBody.innerHTML = `
            <tr>
                <td colspan="6" class="empty-state">
                    <i class="fas fa-file-alt empty-state__icon"></i>
                    <h3 class="empty-state__title">No hay documentos</h3>
                    <p class="empty-state__description">${window.appState.currentSearchQuery || window.appState.filters.category || window.appState.filters.type || window.appState.filters.status ? 'No hay documentos que coincidan con la búsqueda o filtros aplicados' : 'Sube tu primer documento para comenzar'}</p>
                </td>
            </tr>
        `;
        return;
    }
    
    documentsToShow.forEach(doc => {
        const person = doc.persona_id ? doc.persona_id : { nombre: 'No asignado' };
        
        // Determinar estado de vencimiento
        let vencimientoClass = '';
        let vencimientoText = '';
        let statusBadgeClass = 'badge--info';
        
        if (doc.fecha_vencimiento) {
            const fechaVencimiento = new Date(doc.fecha_vencimiento);
            const hoy = new Date();
            const diferenciaDias = Math.ceil((fechaVencimiento - hoy) / (1000 * 60 * 60 * 24));
            
            if (diferenciaDias <= 0) {
                vencimientoClass = 'vencido';
                vencimientoText = 'Vencido';
                statusBadgeClass = 'badge--danger';
            } else if (diferenciaDias <= 7) {
                vencimientoClass = 'por-vencer';
                vencimientoText = `Vence en ${diferenciaDias} días`;
                statusBadgeClass = 'badge--warning';
            } else if (diferenciaDias <= 30) {
                vencimientoClass = 'activo';
                vencimientoText = `Vence en ${diferenciaDias} días`;
                statusBadgeClass = 'badge--info';
            } else {
                vencimientoClass = 'activo';
                vencimientoText = 'Activo';
                statusBadgeClass = 'badge--info';
            }
        } else {
            vencimientoClass = 'sin-vencimiento';
            vencimientoText = 'Sin vencimiento';
            statusBadgeClass = 'badge--info';
        }
        
        // Determinar si se puede previsualizar
        const fileExtension = doc.nombre_original.split('.').pop().toLowerCase();
        const previewInfo = canPreviewDocument(fileExtension);
        const fileIcon = getFileIcon(doc.tipo_archivo);
        
        // Crear botones de acciones con clases específicas
        let actionButtons = `
            <button class="btn btn--sm btn--outline btn--download" onclick="window.downloadDocument('${doc._id}')" title="Descargar">
                <i class="fas fa-download"></i>
            </button>
        `;
        
        // Solo agregar botón de vista previa si se puede previsualizar
        if (previewInfo.canPreview) {
            actionButtons += `
                <button class="btn btn--sm btn--outline btn--view" onclick="window.previewDocument('${doc._id}')" title="Vista previa">
                    <i class="fas fa-eye"></i>
                </button>
            `;
        }

        // Agregar botón de editar
        actionButtons += `
            <button class="btn btn--sm btn--outline btn--edit" onclick="window.editDocument('${doc._id}')" title="Editar documento">
                <i class="fas fa-edit"></i>
            </button>
        `;
        
        // Siempre agregar botón de eliminar
        actionButtons += `
            <button class="btn btn--sm btn--outline btn--delete" onclick="window.deleteDocument('${doc._id}')" title="Eliminar">
                <i class="fas fa-trash"></i>
            </button>
        `;
        
        const row = document.createElement('tr');
        row.className = 'table__row';
        
        // Crear tooltips para nombres y descripciones largas
        const nameTooltip = doc.nombre_original.length > 40 ? `title="${doc.nombre_original}"` : '';
        const descTooltip = doc.descripcion && doc.descripcion.length > 40 ? `title="${doc.descripcion}"` : '';
        const statusTooltip = vencimientoText.length > 15 ? `title="${vencimientoText}"` : '';
        const personTooltip = person.nombre.length > 20 ? `title="${person.nombre}"` : '';
        const categoryTooltip = doc.categoria.length > 15 ? `title="${doc.categoria}"` : '';
        
        row.innerHTML = `
            <td class="table__cell">
                <div class="documents__info documents__info--inline">
                    <div class="documents__icon documents__icon--sm">
                        <i class="fas fa-file-${fileIcon}"></i>
                    </div>
                    <div>
                        <div class="documents__details-name" ${nameTooltip}>
                            ${doc.nombre_original}
                        </div>
                        ${doc.descripcion ? `<div class="documents__details-description" ${descTooltip}>${doc.descripcion}</div>` : ''}
                    </div>
                </div>
            </td>
            <td class="table__cell">
                <span class="badge badge--info">${doc.tipo_archivo.toUpperCase()}</span>
            </td>
            <td class="table__cell" ${personTooltip}>
                ${person.nombre}
            </td>
            <td class="table__cell">
                <span class="badge badge--info" ${categoryTooltip}>${doc.categoria}</span>
            </td>
            <td class="table__cell">
                <span class="badge ${statusBadgeClass} document-status ${vencimientoClass}" ${statusTooltip}>
                    ${vencimientoText}
                </span>
            </td>
            <td class="table__cell">
                <div class="action-buttons">
                    ${actionButtons}
                </div>
            </td>
        `;
        
        DOM.documentosTableBody.appendChild(row);
    });
}