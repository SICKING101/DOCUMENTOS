// =============================================================================
// src/frontend/modules/reports.js
// =============================================================================

import { DOM } from '../dom.js';
import { CONFIG } from '../config.js';
import { setLoadingState, showAlert } from '../utils.js';
import { canView, canAction, showNoPermissionAlert } from '../permissions.js';

// Variables para seguimiento de estado
let reportGenerationInProgress = false;
let currentReportToken = null;

// =============================================================================
// 1. MANEJO DEL MODAL DE REPORTES (FUNCIONES MANTENIDAS)
// =============================================================================

/**
 * 1.1 Abrir modal de generación de reportes
 */
function generateReport() {
    console.group('📊 generateReport - Abriendo generador de reportes');
    
    try {
        if (!canView('reportes')) {
            showNoPermissionAlert('reportes');
            showAlert('No tienes permiso para ver reportes', 'error');
            return;
        }

        if (!window.appState || !window.appState.documents) {
            console.error('❌ appState no disponible o documentos no cargados');
            showAlert('Los datos del sistema no están disponibles. Intente recargar la página.', 'warning');
            return;
        }
        
        console.log('✅ Datos disponibles:', {
            documentos: window.appState.documents?.length || 0,
            personas: window.appState.persons?.length || 0,
            categorias: window.appState.categories?.length || 0
        });
        
        const reportType = DOM.reportType.value || 'general';
        updateReportFilters(reportType);
        
        // Mostrar la sección de reportes si está en un modal
        if (DOM.reportModal) {
            DOM.reportModal.style.display = 'flex';
            console.log('✅ Modal de reportes abierto');
            
            setTimeout(() => {
                DOM.reportType?.focus();
            }, 100);
        }
        
    } catch (error) {
        console.error('❌ Error abriendo modal de reportes:', error);
        showAlert('Error al abrir el generador de reportes: ' + error.message, 'error');
    } finally {
        console.groupEnd();
    }
}

/**
 * 1.2 Cerrar modal de reportes
 */
function closeReportModal() {
    console.log('❌ closeReportModal - Cerrando modal de reportes');
    
    try {
        reportGenerationInProgress = false;
        currentReportToken = null;
        
        if (DOM.reportPreviewContent) {
            DOM.reportPreviewContent.innerHTML = `
                <div class="reportes-preview-placeholder">
                    <i class="fas fa-chart-bar"></i>
                    <p>Seleccione un tipo de reporte para ver la vista previa</p>
                </div>
            `;
        }
        
        if (DOM.reportModal) {
            DOM.reportModal.style.display = 'none';
        }
        
        console.log('✅ Modal cerrado exitosamente');
        
    } catch (error) {
        console.error('❌ Error cerrando modal:', error);
    }
}

// =============================================================================
// 2. CONFIGURACIÓN DE FILTROS DE REPORTES (FUNCIONES MANTENIDAS)
// =============================================================================

/**
 * 2.1 Actualizar filtros específicos por tipo de reporte
 */
function updateReportFilters(reportType) {
    console.group(`📊 updateReportFilters - Actualizando para: ${reportType}`);
    
    try {
        if (!DOM.reportSpecificFilters) {
            console.error('❌ Elemento DOM.reportSpecificFilters no encontrado');
            return;
        }
        
        DOM.reportSpecificFilters.innerHTML = '';
        
        switch(reportType) {
            case 'byCategory':
                console.log('🔧 Configurando filtros por categoría');
                if (!window.appState.categories || window.appState.categories.length === 0) {
                    console.warn('⚠️ No hay categorías disponibles');
                    DOM.reportSpecificFilters.innerHTML = `
                        <div class="reportes-form__group">
                            <div class="reportes-alert reportes-alert--warning">
                                <i class="fas fa-exclamation-triangle"></i>
                                <span>No hay categorías disponibles en el sistema</span>
                            </div>
                        </div>
                    `;
                } else {
                    DOM.reportSpecificFilters.innerHTML = `
                        <div class="reportes-form__group">
                            <label for="reportCategory" class="reportes-form__label">
                                <i class="fas fa-folder"></i> Categoría
                            </label>
                            <div class="reportes-select__wrapper">
                                <select id="reportCategory" class="reportes-select">
                                    <option value="">Todas las categorías</option>
                                    ${window.appState.categories.map(cat => 
                                        `<option value="${cat.nombre}">${cat.nombre}</option>`
                                    ).join('')}
                                </select>
                                <i class="fas fa-chevron-down reportes-select__arrow"></i>
                            </div>
                            <small class="reportes-form__help">Seleccione una categoría específica o "Todas"</small>
                        </div>
                    `;
                    
                    setTimeout(() => {
                        const categorySelect = document.getElementById('reportCategory');
                        if (categorySelect) {
                            categorySelect.addEventListener('change', updateReportPreview);
                            console.log('✅ Event listener agregado a selector de categoría');
                        }
                    }, 100);
                }
                break;
                
            case 'byPerson':
                console.log('🔧 Configurando filtros por persona');
                if (!window.appState.persons || window.appState.persons.length === 0) {
                    console.warn('⚠️ No hay personas disponibles');
                    DOM.reportSpecificFilters.innerHTML = `
                        <div class="reportes-form__group">
                            <div class="reportes-alert reportes-alert--warning">
                                <i class="fas fa-exclamation-triangle"></i>
                                <span>No hay personas disponibles en el sistema</span>
                            </div>
                        </div>
                    `;
                } else {
                    DOM.reportSpecificFilters.innerHTML = `
                        <div class="reportes-form__group">
                            <label for="reportPerson" class="reportes-form__label">
                                <i class="fas fa-user"></i> Persona
                            </label>
                            <div class="reportes-select__wrapper">
                                <select id="reportPerson" class="reportes-select">
                                    <option value="">Todas las personas</option>
                                    ${window.appState.persons.map(person => 
                                        `<option value="${person._id}">${person.nombre} (${person.email || 'Sin email'})</option>`
                                    ).join('')}
                                </select>
                                <i class="fas fa-chevron-down reportes-select__arrow"></i>
                            </div>
                            <small class="reportes-form__help">Seleccione una persona específica o "Todas"</small>
                        </div>
                    `;
                    
                    setTimeout(() => {
                        const personSelect = document.getElementById('reportPerson');
                        if (personSelect) {
                            personSelect.addEventListener('change', updateReportPreview);
                            console.log('✅ Event listener agregado a selector de persona');
                        }
                    }, 100);
                }
                break;
                
            case 'expiring':
                console.log('🔧 Configurando filtros por vencimiento');
                DOM.reportSpecificFilters.innerHTML = `
                    <div class="reportes-form__group">
                        <label for="reportDays" class="reportes-form__label">
                            <i class="fas fa-calendar-alt"></i> Días hasta vencimiento
                        </label>
                        <input type="number" id="reportDays" class="reportes-input" 
                               value="30" min="1" max="365">
                        <small class="reportes-form__help">Documentos que vencen en los próximos N días</small>
                    </div>
                `;
                
                setTimeout(() => {
                    const daysInput = document.getElementById('reportDays');
                    if (daysInput) {
                        daysInput.addEventListener('input', updateReportPreview);
                        console.log('✅ Event listener agregado a input de días');
                    }
                }, 100);
                break;
                
            case 'expired':
                console.log('🔧 Configurando filtros para documentos vencidos');
                DOM.reportSpecificFilters.innerHTML = `
                    <div class="reportes-form__group">
                        <div class="reportes-alert reportes-alert--warning">
                            <i class="fas fa-exclamation-triangle"></i>
                            <span>Se incluirán todos los documentos vencidos</span>
                        </div>
                    </div>
                `;
                break;
                
            case 'general':
            default:
                console.log('🔧 Configurando filtros para reporte general');
                DOM.reportSpecificFilters.innerHTML = `
                    <div class="reportes-form__group">
                        <div class="reportes-alert reportes-alert--info">
                            <i class="fas fa-info-circle"></i>
                            <span>Reporte general del sistema - No se requieren filtros adicionales</span>
                        </div>
                    </div>
                `;
                break;
        }
        
        console.log('✅ Filtros actualizados exitosamente');
        updateReportPreview();
        
    } catch (error) {
        console.error('❌ Error actualizando filtros:', error);
    } finally {
        console.groupEnd();
    }
}

/**
 * 2.2 Actualizar vista previa del reporte
 */
function updateReportPreview() {
    console.group('📋 updateReportPreview - Actualizando vista previa');
    
    try {
        if (!DOM.reportPreviewContent) {
            console.error('❌ Elemento DOM.reportPreviewContent no encontrado');
            return;
        }
        
        const reportType = DOM.reportType?.value || 'general';
        const documents = window.appState?.documents || [];
        const persons = window.appState?.persons || [];
        const categories = window.appState?.categories || [];
        
        console.log('📊 Datos para vista previa:', {
            tipoReporte: reportType,
            totalDocumentos: documents.length,
            totalPersonas: persons.length,
            totalCategorias: categories.length
        });
        
        let previewContent = '';
        let estimatedRecords = 0;
        
        switch(reportType) {
            case 'general':
                console.log('📋 Generando vista previa para reporte general');
                estimatedRecords = documents.length;
                previewContent = `
                    <div class="reportes-preview__stats">
                        <div class="reportes-stat">
                            <span class="reportes-stat__label">Total Documentos</span>
                            <span class="reportes-stat__value">${documents.length}</span>
                        </div>
                        <div class="reportes-stat">
                            <span class="reportes-stat__label">Total Personas</span>
                            <span class="reportes-stat__value">${persons.length}</span>
                        </div>
                        <div class="reportes-stat">
                            <span class="reportes-stat__label">Total Categorías</span>
                            <span class="reportes-stat__value">${categories.length}</span>
                        </div>
                        <div class="reportes-stat">
                            <span class="reportes-stat__label">Por Vencer (30 días)</span>
                            <span class="reportes-stat__value">${documents.filter(doc => {
                                if (!doc.fecha_vencimiento) return false;
                                const fechaVencimiento = new Date(doc.fecha_vencimiento);
                                const hoy = new Date();
                                const diferenciaDias = Math.ceil((fechaVencimiento - hoy) / (1000 * 60 * 60 * 24));
                                return diferenciaDias <= 30 && diferenciaDias > 0;
                            }).length}</span>
                        </div>
                    </div>
                    <div class="reportes-preview__details">
                        <h5><i class="fas fa-info-circle"></i> Información del Reporte</h5>
                        <p style="color: var(--text-secondary); font-size: 0.875rem; line-height: 1.5;">
                            Este reporte incluirá un resumen completo del sistema con todos los documentos registrados, 
                            categorías disponibles y personas asignadas. El archivo contendrá información detallada 
                            de cada documento incluyendo fechas de vencimiento y estados actuales.
                        </p>
                    </div>
                    <div class="reportes-preview__note reportes-preview__note--info">
                        <i class="fas fa-info-circle"></i>
                        <span>Este reporte incluirá un resumen completo del sistema</span>
                    </div>
                `;
                break;
                
            case 'byCategory':
                const selectedCategory = document.getElementById('reportCategory')?.value || '';
                console.log('📋 Generando vista previa para reporte por categoría:', selectedCategory);
                
                if (selectedCategory) {
                    const categoryDocs = documents.filter(doc => doc.categoria === selectedCategory);
                    estimatedRecords = categoryDocs.length;
                    const category = window.appState.categories?.find(cat => cat.nombre === selectedCategory);
                    
                    previewContent = `
                        <div class="reportes-preview__stats">
                            <div class="reportes-stat">
                                <span class="reportes-stat__label">Documentos en categoría</span>
                                <span class="reportes-stat__value">${categoryDocs.length}</span>
                            </div>
                            <div class="reportes-stat">
                                <span class="reportes-stat__label">Última actualización</span>
                                <span class="reportes-stat__value">${categoryDocs.length > 0 
                                    ? new Date(Math.max(...categoryDocs.map(d => new Date(d.updatedAt || d.createdAt).getTime())))
                                        .toLocaleDateString('es-MX')
                                    : 'N/A'}</span>
                            </div>
                        </div>
                        <div class="reportes-preview__details">
                            <h5><i class="fas fa-folder"></i> Detalles de la categoría: ${selectedCategory}</h5>
                            <ul class="reportes-list">
                                <li>
                                    <strong>Tipos de archivo:</strong> 
                                    <span>${[...new Set(categoryDocs.map(doc => doc.tipo_archivo || 'Desconocido'))].join(', ') || 'Ninguno'}</span>
                                </li>
                                <li>
                                    <strong>Tamaño total:</strong> 
                                    <span>${(categoryDocs.reduce((sum, doc) => sum + (doc.size || 0), 0) / (1024*1024)).toFixed(2)} MB</span>
                                </li>
                                <li>
                                    <strong>Documentos vencidos:</strong> 
                                    <span>${categoryDocs.filter(doc => {
                                        if (!doc.fecha_vencimiento) return false;
                                        return new Date(doc.fecha_vencimiento) < new Date();
                                    }).length}</span>
                                </li>
                                ${category?.descripcion ? `
                                <li>
                                    <strong>Descripción:</strong> 
                                    <span>${category.descripcion}</span>
                                </li>` : ''}
                            </ul>
                        </div>
                    `;
                } else {
                    estimatedRecords = documents.length;
                    const categoryDistribution = categories.map(cat => {
                        const catDocs = documents.filter(doc => doc.categoria === cat.nombre);
                        return { name: cat.nombre, count: catDocs.length };
                    }).sort((a, b) => b.count - a.count);
                    
                    previewContent = `
                        <div class="reportes-preview__stats">
                            <div class="reportes-stat">
                                <span class="reportes-stat__label">Total Documentos</span>
                                <span class="reportes-stat__value">${documents.length}</span>
                            </div>
                            <div class="reportes-stat">
                                <span class="reportes-stat__label">Total Categorías</span>
                                <span class="reportes-stat__value">${categories.length}</span>
                            </div>
                        </div>
                        <div class="reportes-preview__details">
                            <h5><i class="fas fa-chart-pie"></i> Distribución por categoría</h5>
                            <ul class="reportes-list">
                                ${categoryDistribution.map(cat => 
                                    `<li>
                                        <strong>${cat.name}:</strong> 
                                        <span>${cat.count} documentos</span>
                                    </li>`
                                ).join('')}
                            </ul>
                        </div>
                        <div class="reportes-preview__note reportes-preview__note--info">
                            <i class="fas fa-info-circle"></i>
                            <span>Incluye todas las categorías del sistema</span>
                        </div>
                    `;
                }
                break;
                
            case 'byPerson':
                const selectedPersonId = document.getElementById('reportPerson')?.value || '';
                console.log('📋 Generando vista previa para reporte por persona:', selectedPersonId);
                
                if (selectedPersonId) {
                    const person = persons.find(p => p._id === selectedPersonId);
                    const personDocs = documents.filter(doc => doc.persona_id && doc.persona_id._id === selectedPersonId);
                    estimatedRecords = personDocs.length;
                    
                    previewContent = `
                        <div class="reportes-preview__stats">
                            <div class="reportes-stat">
                                <span class="reportes-stat__label">Documentos asignados</span>
                                <span class="reportes-stat__value">${personDocs.length}</span>
                            </div>
                            <div class="reportes-stat">
                                <span class="reportes-stat__label">Última actualización</span>
                                <span class="reportes-stat__value">${personDocs.length > 0 
                                    ? new Date(Math.max(...personDocs.map(d => new Date(d.updatedAt || d.createdAt).getTime())))
                                        .toLocaleDateString('es-MX')
                                    : 'N/A'}</span>
                            </div>
                        </div>
                        <div class="reportes-preview__details">
                            <h5><i class="fas fa-user"></i> Detalles de: ${person ? person.nombre : 'Persona no encontrada'}</h5>
                            <ul class="reportes-list">
                                <li>
                                    <strong>Email:</strong> 
                                    <span>${person?.email || 'No disponible'}</span>
                                </li>
                                <li>
                                    <strong>Categorías asignadas:</strong> 
                                    <span>${[...new Set(personDocs.map(doc => doc.categoria))].join(', ') || 'Ninguna'}</span>
                                </li>
                                <li>
                                    <strong>Documentos vencidos:</strong> 
                                    <span>${personDocs.filter(doc => {
                                        if (!doc.fecha_vencimiento) return false;
                                        return new Date(doc.fecha_vencimiento) < new Date();
                                    }).length}</span>
                                </li>
                                <li>
                                    <strong>Departamento:</strong> 
                                    <span>${person?.departamento || 'No especificado'}</span>
                                </li>
                            </ul>
                        </div>
                    `;
                } else {
                    const personsWithDocs = persons.filter(person => 
                        documents.some(doc => doc.persona_id && doc.persona_id._id === person._id)
                    );
                    estimatedRecords = documents.filter(doc => doc.persona_id).length;
                    
                    previewContent = `
                        <div class="reportes-preview__stats">
                            <div class="reportes-stat">
                                <span class="reportes-stat__label">Personas con documentos</span>
                                <span class="reportes-stat__value">${personsWithDocs.length}</span>
                            </div>
                            <div class="reportes-stat">
                                <span class="reportes-stat__label">Documentos asignados</span>
                                <span class="reportes-stat__value">${estimatedRecords}</span>
                            </div>
                        </div>
                        <div class="reportes-preview__details">
                            <h5><i class="fas fa-users"></i> Distribución por persona</h5>
                            <ul class="reportes-list">
                                ${personsWithDocs.map(person => {
                                    const personDocs = documents.filter(doc => doc.persona_id && doc.persona_id._id === person._id);
                                    if (personDocs.length === 0) return '';
                                    return `<li>
                                        <strong>${person.nombre}:</strong> 
                                        <span>${personDocs.length} documentos</span>
                                    </li>`;
                                }).filter(Boolean).join('') || '<li style="text-align: center; padding: 1rem; color: var(--text-tertiary);">No hay documentos asignados a personas</li>'}
                            </ul>
                        </div>
                    `;
                }
                break;
                
            case 'expiring':
                const days = parseInt(document.getElementById('reportDays')?.value) || 30;
                console.log('📋 Generando vista previa para documentos que vencen en:', days, 'días');
                
                const expiringDocs = documents.filter(doc => {
                    if (!doc.fecha_vencimiento) return false;
                    const fechaVencimiento = new Date(doc.fecha_vencimiento);
                    const hoy = new Date();
                    const diferenciaDias = Math.ceil((fechaVencimiento - hoy) / (1000 * 60 * 60 * 24));
                    return diferenciaDias <= days && diferenciaDias > 0;
                });
                estimatedRecords = expiringDocs.length;
                
                const categoryDist = {};
                expiringDocs.forEach(doc => {
                    categoryDist[doc.categoria] = (categoryDist[doc.categoria] || 0) + 1;
                });
                
                previewContent = `
                    <div class="reportes-preview__stats">
                        <div class="reportes-stat">
                            <span class="reportes-stat__label">Documentos por vencer</span>
                            <span class="reportes-stat__value">${expiringDocs.length}</span>
                        </div>
                        <div class="reportes-stat">
                            <span class="reportes-stat__label">Próximo a vencer</span>
                            <span class="reportes-stat__value">${expiringDocs.length > 0 
                                ? new Date(Math.min(...expiringDocs.map(d => new Date(d.fecha_vencimiento).getTime())))
                                    .toLocaleDateString('es-MX')
                                : 'N/A'}</span>
                        </div>
                    </div>
                    <div class="reportes-preview__details">
                        <h5><i class="fas fa-calendar-alt"></i> Distribución por categoría (próximos ${days} días)</h5>
                        <ul class="reportes-list">
                            ${Object.entries(categoryDist).map(([categoria, count]) => 
                                `<li>
                                    <strong>${categoria}:</strong> 
                                    <span>${count} documentos</span>
                                </li>`
                            ).join('') || '<li style="text-align: center; padding: 1rem; color: var(--text-tertiary);">No hay documentos por vencer</li>'}
                        </ul>
                    </div>
                    <div class="reportes-preview__note reportes-preview__note--danger">
                        <i class="fas fa-exclamation-triangle"></i>
                        <span>¡ATENCIÓN! Estos ${expiringDocs.length} documentos requieren atención prioritaria</span>
                    </div>
                `;
                break;
                
            case 'expired':
                console.log('📋 Generando vista previa para documentos vencidos');
                const expiredDocs = documents.filter(doc => {
                    if (!doc.fecha_vencimiento) return false;
                    return new Date(doc.fecha_vencimiento) < new Date();
                });
                estimatedRecords = expiredDocs.length;
                
                const expiredCategoryDist = {};
                expiredDocs.forEach(doc => {
                    expiredCategoryDist[doc.categoria] = (expiredCategoryDist[doc.categoria] || 0) + 1;
                });
                
                previewContent = `
                    <div class="reportes-preview__stats">
                        <div class="reportes-stat reportes-stat--danger">
                            <span class="reportes-stat__label">Documentos vencidos</span>
                            <span class="reportes-stat__value">${expiredDocs.length}</span>
                        </div>
                        <div class="reportes-stat">
                            <span class="reportes-stat__label">Más antiguo</span>
                            <span class="reportes-stat__value">${expiredDocs.length > 0 
                                ? new Date(Math.min(...expiredDocs.map(d => new Date(d.fecha_vencimiento).getTime())))
                                    .toLocaleDateString('es-MX')
                                : 'N/A'}</span>
                        </div>
                    </div>
                    <div class="reportes-preview__details">
                        <h5><i class="fas fa-exclamation-circle"></i> Distribución por categoría</h5>
                        <ul class="reportes-list">
                            ${Object.entries(expiredCategoryDist).map(([categoria, count]) => 
                                `<li>
                                    <strong>${categoria}:</strong> 
                                    <span>${count} documentos</span>
                                </li>`
                            ).join('') || '<li style="text-align: center; padding: 1rem; color: var(--text-tertiary);">No hay documentos vencidos</li>'}
                        </ul>
                    </div>
                    <div class="reportes-preview__note reportes-preview__note--danger">
                        <i class="fas fa-exclamation-circle"></i>
                        <span>¡URGENTE! ${expiredDocs.length} documentos vencidos requieren acción inmediata</span>
                    </div>
                `;
                break;
                
            default:
                console.warn('⚠️ Tipo de reporte no reconocido:', reportType);
                previewContent = `
                    <div class="reportes-preview-placeholder">
                        <i class="fas fa-exclamation-triangle"></i>
                        <p>Tipo de reporte no reconocido: ${reportType}</p>
                    </div>
                `;
                break;
        }
        
        DOM.reportPreviewContent.innerHTML = previewContent;
        
        if (DOM.generateReportBtn) {
            const format = DOM.reportFormat?.value || 'excel';
            
            let buttonText = `Generar Reporte ${format.toUpperCase()} (${estimatedRecords} registros)`;
            
            DOM.generateReportBtn.innerHTML = `
                <i class="fas fa-file-${format === 'excel' ? 'excel' : 'csv'}"></i>
                <span>${buttonText}</span>
            `;
            
            DOM.generateReportBtn.title = `Generar reporte ${format.toUpperCase()} con ${estimatedRecords} registros`;
        }
        
        console.log('✅ Vista previa actualizada:', {
            tipoReporte: reportType,
            registrosEstimados: estimatedRecords
        });
        
    } catch (error) {
        console.error('❌ Error actualizando vista previa:', error);
        if (DOM.reportPreviewContent) {
            DOM.reportPreviewContent.innerHTML = `
                <div class="reportes-preview-error">
                    <i class="fas fa-exclamation-circle"></i>
                    <p>Error al generar vista previa: ${error.message}</p>
                </div>
            `;
        }
    } finally {
        console.groupEnd();
    }
}

// =============================================================================
// 3. GENERACIÓN Y DESCARGA DE REPORTES (MEJORADO CON PRELOADER VISIBLE)
// =============================================================================

/**
 * 3.1 Handler para iniciar generación de reporte - MEJORADO
 */
async function handleGenerateReport() {
    console.group('📄 handleGenerateReport - Iniciando generación de reporte');
    
    try {
        if (!canAction('reportes')) {
            showNoPermissionAlert('reportes');
            showAlert('No tienes permiso para generar reportes', 'error');
            return;
        }

        if (reportGenerationInProgress) {
            showAlert('Ya hay una generación en curso. Espere por favor.', 'warning');
            return;
        }
        
        if (!window.appState || !window.appState.documents) {
            showAlert('Los datos no están disponibles. Recargue la página.', 'error');
            return;
        }
        
        const documentsCount = window.appState.documents.length;
        if (documentsCount === 0) {
            showAlert('No hay documentos para generar reporte.', 'warning');
            return;
        }
        
        // Generar token único
        currentReportToken = `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        reportGenerationInProgress = true;
        
        // Mostrar preloader con animación mejorada
        showReportPreloader();
        
        // Pequeño retraso para que se vea el preloader
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Llamar directamente a la función de generación
        await generateReportDownload();
        
    } catch (error) {
        console.error('❌ Error en handleGenerateReport:', error);
        showAlert('Error al iniciar reporte: ' + error.message, 'error');
        reportGenerationInProgress = false;
        currentReportToken = null;
        hideReportPreloader();
    } finally {
        console.groupEnd();
    }
}

/**
 * Mostrar preloader de reporte mejorado
 */
function showReportPreloader() {
    const preloader = document.createElement('div');
    preloader.id = 'reportPreloader';
    preloader.className = 'reportes-preloader';
    preloader.innerHTML = `
        <div class="reportes-preloader__overlay"></div>
        <div class="reportes-preloader__content">
            <div class="reportes-preloader__spinner">
                <div class="reportes-preloader__spinner-inner"></div>
            </div>
            <div class="reportes-preloader__text">
                <h4>Generando Reporte</h4>
                <p>Por favor espere mientras procesamos su solicitud...</p>
                <div class="reportes-preloader__details">
                    <div class="reportes-preloader__detail">
                        <i class="fas fa-database"></i>
                        <span>Preparando datos...</span>
                    </div>
                    <div class="reportes-preloader__detail">
                        <i class="fas fa-file-excel"></i>
                        <span>Generando archivo...</span>
                    </div>
                    <div class="reportes-preloader__detail">
                        <i class="fas fa-download"></i>
                        <span>Preparando descarga...</span>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(preloader);
    
    // Animar los detalles secuencialmente
    setTimeout(() => {
        const details = preloader.querySelectorAll('.reportes-preloader__detail');
        details.forEach((detail, index) => {
            setTimeout(() => {
                detail.classList.add('reportes-preloader__detail--active');
            }, index * 500);
        });
    }, 300);
}

/**
 * Ocultar preloader de reporte
 */
function hideReportPreloader() {
    const preloader = document.getElementById('reportPreloader');
    if (preloader) {
        // Animar salida
        preloader.style.opacity = '0';
        preloader.style.transform = 'translateY(20px)';
        
        setTimeout(() => {
            if (preloader.parentNode) {
                preloader.parentNode.removeChild(preloader);
            }
        }, 300);
    }
}

/**
 * 3.2 Generar y descargar reporte - MEJORADO CON ETAPAS VISIBLES
 */
async function generateReportDownload() {
    console.group('📊 GENERACIÓN DE REPORTE - PROCESO COMPLETO');
    
    const generationToken = currentReportToken;
    let progressInterval;
    
    try {
        if (!canAction('reportes')) {
            showNoPermissionAlert('reportes');
            showAlert('No tienes permiso para generar reportes', 'error');
            return;
        }

        // OBTENER VALORES DESDE LOS ELEMENTOS DOM
        const reportType = DOM.reportType ? DOM.reportType.value : 'general';
        const format = DOM.reportFormat ? DOM.reportFormat.value : 'excel';
        const documents = window.appState?.documents || [];

        console.log('📋 Configuración inicial:', {
            tipo: reportType,
            formato: format,
            token: generationToken,
            totalDocumentos: documents.length
        });

        // Actualizar preloader con información específica
        updatePreloaderStage(1, `Preparando ${documents.length} documentos...`);

        // Validar formato (solo Excel y CSV)
        const validFormats = ['excel', 'csv'];
        if (!validFormats.includes(format)) {
            console.error('❌ Formato no válido:', format);
            showAlert(`Formato de reporte no válido. Formatos permitidos: ${validFormats.join(', ')}`, 'error');
            return;
        }

        console.log('✅ Formato validado correctamente');
        console.time('⏱️ Tiempo total de generación');
        
        // Preparar datos del reporte
        const reportData = {
            reportType: reportType,
            category: '',
            person: '',
            days: 30,
            token: generationToken,
            timestamp: new Date().toISOString()
        };

        console.log('🔧 Datos base del reporte:', reportData);

        // Obtener valores específicos
        if (reportType === 'byCategory') {
            const categorySelect = document.getElementById('reportCategory');
            if (categorySelect) {
                reportData.category = categorySelect.value || '';
                console.log('🏷️ Categoría seleccionada:', reportData.category || '(Todas)');
            }
        }

        if (reportType === 'byPerson') {
            const personSelect = document.getElementById('reportPerson');
            if (personSelect) {
                reportData.person = personSelect.value || '';
                console.log('👤 Persona seleccionada:', reportData.person || '(Todas)');
            }
        }

        if (reportType === 'expiring') {
            const daysInput = document.getElementById('reportDays');
            if (daysInput) {
                const daysValue = parseInt(daysInput.value);
                if (daysValue && daysValue > 0 && daysValue <= 365) {
                    reportData.days = daysValue;
                    console.log('📅 Días hasta vencimiento:', reportData.days);
                }
            }
        }

        console.log('📦 Datos finales del reporte:', reportData);

        // Actualizar preloader para etapa 2
        updatePreloaderStage(2, 'Enviando solicitud al servidor...');
        await new Promise(resolve => setTimeout(resolve, 800));

        // Determinar endpoint según formato
        let endpoint = '';
        if (format === 'excel') {
            endpoint = '/reports/excel';
        } else if (format === 'csv') {
            endpoint = '/reports/csv';
        }

        const fullUrl = `${CONFIG.API_BASE_URL}${endpoint}`;
        console.log('🌐 URL del endpoint:', fullUrl);
        console.log('📤 Método: POST');

        // Hacer la solicitud con timeout
        console.log('🚀 Enviando solicitud al servidor...');
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minutos
        
        // Iniciar animación de progreso
        startProgressAnimation();
        
        try {
            updatePreloaderStage(3, 'Procesando datos en el servidor...');
            
            const response = await fetch(fullUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Report-Token': generationToken,
                    'Accept': format === 'excel' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 
                              'text/csv'
                },
                body: JSON.stringify(reportData),
                signal: controller.signal
            });

            clearTimeout(timeoutId);
            stopProgressAnimation();

            console.log('📥 Respuesta recibida:', {
                status: response.status,
                statusText: response.statusText,
                ok: response.ok
            });

            if (!response.ok) {
                let errorMessage = `Error del servidor (${response.status}): ${response.statusText}`;
                
                // Leer el error del servidor
                const errorText = await response.text();
                console.error('❌ Error texto del servidor:', errorText.substring(0, 500));
                
                // Intentar parsear como JSON si parece JSON
                if (errorText.trim().startsWith('{') || errorText.trim().startsWith('[')) {
                    try {
                        const errorData = JSON.parse(errorText);
                        console.error('❌ Error JSON del servidor:', errorData);
                        errorMessage = errorData.message || errorData.error || errorMessage;
                    } catch (jsonError) {
                        // No es JSON válido, usar el texto como está
                        errorMessage = `Error: ${errorText.substring(0, 200)}`;
                    }
                } else {
                    errorMessage = `Error: ${errorText.substring(0, 200)}`;
                }
                
                throw new Error(errorMessage);
            }

            console.log('✅ Respuesta OK, obteniendo blob...');
            
            updatePreloaderStage(4, 'Descargando archivo...');
            
            // Obtener el blob de la respuesta
            const blob = await response.blob();
            console.log('📦 Blob recibido:', {
                size: blob.size,
                type: blob.type,
                sizeFormatted: formatBytes(blob.size)
            });
            
            if (blob.size === 0) {
                throw new Error('El archivo generado está vacío (0 bytes). Verifique que hay datos para el reporte.');
            }
            
            // Crear URL temporal para descarga
            console.log('🔗 Creando URL temporal...');
            const url = window.URL.createObjectURL(blob);
            console.log('✅ URL creada exitosamente');
            
            const a = document.createElement('a');
            a.href = url;
            
            // Determinar nombre y extensión del archivo
            let fileName = `reporte_${reportType}_${new Date().toISOString().split('T')[0]}_${Date.now()}`;
            let extension = format === 'excel' ? 'xlsx' : 'csv';
            const fullFileName = `${fileName}.${extension}`;
            a.download = fullFileName;
            
            console.log('📄 Nombre del archivo:', fullFileName);
            
            // Pequeño retraso para que se vea la última etapa
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Descargar archivo
            console.log('➕ Agregando enlace al DOM...');
            document.body.appendChild(a);
            
            console.log('🖱️ Ejecutando click para descarga...');
            a.click();
            
            console.log('➖ Removiendo enlace del DOM...');
            document.body.removeChild(a);
            
            // Limpiar
            console.log('🧹 Revocando URL temporal...');
            window.URL.revokeObjectURL(url);

            console.timeEnd('⏱️ Tiempo total de generación');
            console.log('✅ Reporte descargado exitosamente');
            
            // Actualizar preloader para éxito
            updatePreloaderSuccess(`Reporte ${format.toUpperCase()} generado exitosamente (${formatBytes(blob.size)})`);
            
            // Esperar un momento para mostrar el mensaje de éxito
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Mostrar mensaje de éxito
            const successMessage = format === 'excel'
                ? `✅ Reporte Excel generado exitosamente (${formatBytes(blob.size)})`
                : `✅ Reporte CSV generado exitosamente (${formatBytes(blob.size)})`;
            
            showAlert(successMessage, 'success');
            
            // Opcional: cerrar modal si existe
            if (DOM.reportModal && DOM.reportModal.style.display === 'flex') {
                console.log('🚪 Cerrando modal...');
                closeReportModal();
            }

        } catch (fetchError) {
            clearTimeout(timeoutId);
            stopProgressAnimation();
            
            if (fetchError.name === 'AbortError') {
                console.error('❌ Timeout en la generación del reporte (2 minutos)');
                throw new Error('La generación del reporte tomó demasiado tiempo. Intente con menos datos o contacte al administrador.');
            } else {
                throw fetchError;
            }
        }

    } catch (error) {
        console.error('❌ ERROR en generateReportDownload:');
        console.error('📋 Detalles del error:', {
            message: error.message,
            name: error.name,
            token: generationToken,
            timestamp: new Date().toISOString()
        });
        
        updatePreloaderError(`Error: ${error.message}`);
        
        // Esperar para mostrar el error en el preloader
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        showAlert(`Error al generar reporte: ${error.message}`, 'error');
        
    } finally {
        // Solo resetear si es la misma generación
        if (currentReportToken === generationToken) {
            reportGenerationInProgress = false;
            currentReportToken = null;
        }
        
        // Ocultar preloader con retraso
        setTimeout(() => {
            hideReportPreloader();
        }, 1000);
        
        console.groupEnd();
    }
}

// =============================================================================
// FUNCIONES AUXILIARES PARA EL PRELOADER MEJORADO
// =============================================================================

/**
 * Actualizar etapa del preloader
 */
function updatePreloaderStage(stage, message) {
    const preloader = document.getElementById('reportPreloader');
    if (!preloader) return;
    
    const details = preloader.querySelectorAll('.reportes-preloader__detail');
    
    // Actualizar todas las etapas
    details.forEach((detail, index) => {
        if (index < stage) {
            detail.classList.add('reportes-preloader__detail--active');
            detail.classList.remove('reportes-preloader__detail--current');
        } else if (index === stage) {
            detail.classList.add('reportes-preloader__detail--current');
            detail.classList.remove('reportes-preloader__detail--active');
        } else {
            detail.classList.remove('reportes-preloader__detail--active', 'reportes-preloader__detail--current');
        }
    });
    
    // Actualizar mensaje
    const textElement = preloader.querySelector('.reportes-preloader__text p');
    if (textElement) {
        textElement.textContent = message;
    }
}

/**
 * Mostrar éxito en el preloader
 */
function updatePreloaderSuccess(message) {
    const preloader = document.getElementById('reportPreloader');
    if (!preloader) return;
    
    const content = preloader.querySelector('.reportes-preloader__content');
    content.innerHTML = `
        <div class="reportes-preloader__success">
            <div class="reportes-preloader__success-icon">
                <i class="fas fa-check-circle"></i>
            </div>
            <div class="reportes-preloader__success-text">
                <h4>¡Reporte Generado!</h4>
                <p>${message}</p>
                <div class="reportes-preloader__success-details">
                    <i class="fas fa-check"></i>
                    <span>El archivo se ha descargado correctamente</span>
                </div>
            </div>
        </div>
    `;
    
    content.classList.add('reportes-preloader__content--success');
}

/**
 * Mostrar error en el preloader
 */
function updatePreloaderError(message) {
    const preloader = document.getElementById('reportPreloader');
    if (!preloader) return;
    
    const content = preloader.querySelector('.reportes-preloader__content');
    content.innerHTML = `
        <div class="reportes-preloader__error">
            <div class="reportes-preloader__error-icon">
                <i class="fas fa-exclamation-circle"></i>
            </div>
            <div class="reportes-preloader__error-text">
                <h4>Error al Generar Reporte</h4>
                <p>${message}</p>
                <div class="reportes-preloader__error-details">
                    <i class="fas fa-redo"></i>
                    <span>Intente nuevamente o contacte al administrador</span>
                </div>
            </div>
        </div>
    `;
    
    content.classList.add('reportes-preloader__content--error');
}

/**
 * Iniciar animación de progreso
 */
function startProgressAnimation() {
    const preloader = document.getElementById('reportPreloader');
    if (!preloader) return;
    
    const progressBar = document.createElement('div');
    progressBar.className = 'reportes-preloader__progress';
    progressBar.innerHTML = '<div class="reportes-preloader__progress-bar"></div>';
    
    const content = preloader.querySelector('.reportes-preloader__content');
    content.appendChild(progressBar);
    
    // Animar la barra de progreso
    setTimeout(() => {
        const progressBarInner = progressBar.querySelector('.reportes-preloader__progress-bar');
        if (progressBarInner) {
            progressBarInner.style.width = '100%';
        }
    }, 100);
}

/**
 * Detener animación de progreso
 */
function stopProgressAnimation() {
    const preloader = document.getElementById('reportPreloader');
    if (!preloader) return;
    
    const progressBar = preloader.querySelector('.reportes-preloader__progress');
    if (progressBar) {
        progressBar.remove();
    }
}

// =============================================================================
// 4. UTILIDADES AUXILIARES (FUNCIONES MANTENIDAS)
// =============================================================================

/**
 * Formatear bytes a tamaño legible
 */
function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Handler para cambio de tipo de reporte
 */
function handleReportTypeChange() {
    const reportType = this.value;
    console.log(`📊 handleReportTypeChange - Cambiando a: ${reportType}`);
    updateReportFilters(reportType);
}

/**
 * Handler para cambio de formato de reporte
 */
function handleReportFormatChange() {
    const format = this.value;
    console.log(`📄 handleReportFormatChange - Cambiando formato a: ${format}`);
    
    // Actualizar vista previa
    updateReportPreview();
}

/**
 * Generar reporte CSV local como fallback
 */
function generateLocalCSV(reportData) {
    console.log('📝 Generando CSV local...');
    
    try {
        const documents = window.appState?.documents || [];
        let filteredDocs = [...documents];
        
        // Aplicar filtros según tipo de reporte
        switch(reportData.reportType) {
            case 'byCategory':
                if (reportData.category) {
                    filteredDocs = filteredDocs.filter(doc => doc.categoria === reportData.category);
                }
                break;
            case 'byPerson':
                if (reportData.person) {
                    filteredDocs = filteredDocs.filter(doc => doc.persona_id && doc.persona_id._id === reportData.person);
                }
                break;
            case 'expiring':
                filteredDocs = filteredDocs.filter(doc => {
                    if (!doc.fecha_vencimiento) return false;
                    const fechaVencimiento = new Date(doc.fecha_vencimiento);
                    const hoy = new Date();
                    const diferenciaDias = Math.ceil((fechaVencimiento - hoy) / (1000 * 60 * 60 * 24));
                    return diferenciaDias <= reportData.days && diferenciaDias > 0;
                });
                break;
            case 'expired':
                filteredDocs = filteredDocs.filter(doc => {
                    if (!doc.fecha_vencimiento) return false;
                    return new Date(doc.fecha_vencimiento) < new Date();
                });
                break;
        }
        
        if (filteredDocs.length === 0) {
            console.warn('⚠️ No hay documentos después de aplicar filtros');
            showAlert('No hay documentos que coincidan con los criterios seleccionados.', 'warning');
            return false;
        }
        
        // Crear contenido CSV
        const headers = [
            'ID',
            'Nombre del Archivo',
            'Descripción',
            'Categoría',
            'Persona Asignada',
            'Email Persona',
            'Fecha de Vencimiento',
            'Fecha de Creación',
            'Tamaño (bytes)',
            'Tipo de Archivo',
            'Estado',
            'Fecha Vencimiento ISO',
            'URL Archivo'
        ];
        
        const rows = filteredDocs.map(doc => {
            const fechaVencimiento = doc.fecha_vencimiento ? 
                new Date(doc.fecha_vencimiento).toLocaleDateString() : 'No especificada';
            
            const estado = doc.fecha_vencimiento ? 
                (new Date(doc.fecha_vencimiento) < new Date() ? 'VENCIDO' : 'VIGENTE') : 
                'SIN FECHA';
            
            return [
                doc._id || '',
                doc.nombre_archivo || '',
                doc.descripcion || '',
                doc.categoria || '',
                doc.persona_id?.nombre || 'No asignada',
                doc.persona_id?.email || '',
                fechaVencimiento,
                new Date(doc.createdAt || Date.now()).toLocaleDateString(),
                doc.size || 0,
                doc.tipo_archivo || 'Desconocido',
                estado,
                doc.fecha_vencimiento || '',
                doc.url_archivo || ''
            ].map(cell => {
                const cellStr = String(cell || '');
                if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n') || cellStr.includes('\r')) {
                    return `"${cellStr.replace(/"/g, '""')}"`;
                }
                return cellStr;
            }).join(',');
        });
        
        const csvContent = [headers.join(','), ...rows].join('\n');
        
        // Crear y descargar archivo
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `reporte_${reportData.reportType}_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        console.log(`✅ CSV local generado con ${filteredDocs.length} registros`);
        return true;
        
    } catch (error) {
        console.error('❌ Error generando CSV local:', error);
        showAlert('Error al generar CSV local: ' + error.message, 'error');
        return false;
    }
}

// =============================================================================
// 5. INICIALIZACIÓN
// =============================================================================

/**
 * Inicializar módulo de reportes
 */
export function initReportsModule() {
    console.group('🚀 initReportsModule - Inicializando módulo de reportes');
    
    try {
        if (!canView('reportes')) {
            console.log('⛔ Sin permiso de vista para reportes: omitiendo initReportsModule');
            return;
        }

        // Configurar event listeners
        if (DOM.reportType) {
            DOM.reportType.addEventListener('change', handleReportTypeChange);
            console.log('✅ Listener agregado a reportType');
        }
        
        if (DOM.reportFormat) {
            DOM.reportFormat.addEventListener('change', handleReportFormatChange);
            console.log('✅ Listener agregado a reportFormat');
        }
        
        if (DOM.generateReportBtn) {
            DOM.generateReportBtn.addEventListener('click', handleGenerateReport);
            console.log('✅ Listener agregado a generateReportBtn');
        }
        
        if (DOM.closeReportModalBtn) {
            DOM.closeReportModalBtn.addEventListener('click', closeReportModal);
            console.log('✅ Listener agregado a closeReportModalBtn');
        }
        
        // Establecer Excel como formato por defecto
        if (DOM.reportFormat) {
            DOM.reportFormat.value = 'excel';
            console.log('✅ Formato por defecto establecido a Excel');
        }
        
        // Inicializar vista previa por defecto
        setTimeout(() => {
            updateReportFilters('general');
        }, 500);
        
        console.log('✅ Módulo de reportes inicializado correctamente');
        
    } catch (error) {
        console.error('❌ Error inicializando módulo de reportes:', error);
    } finally {
        console.groupEnd();
    }
}

// =============================================================================
// 6. EXPORTACIONES (MANTENIDAS)
// =============================================================================

export { 
    generateReport, 
    closeReportModal, 
    updateReportFilters, 
    updateReportPreview, 
    handleGenerateReport, 
    generateReportDownload, 
    handleReportTypeChange,
    handleReportFormatChange,
    generateLocalCSV
};