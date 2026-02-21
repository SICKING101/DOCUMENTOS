// =============================================================================
// src/frontend/modules/reports.js
// =============================================================================

import { DOM } from '../dom.js';
import { CONFIG } from '../config.js';
import { setLoadingState, showAlert } from '../utils.js';

// Variables para seguimiento de estado
let reportGenerationInProgress = false;
let currentReportToken = null;

// =============================================================================
// 1. MANEJO DEL MODAL DE REPORTES
// =============================================================================

/**
 * 1.1 Abrir modal de generación de reportes
 */
function generateReport() {
    console.group('📊 generateReport - Abriendo generador de reportes');
    
    try {
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
        
        DOM.reportModal.style.display = 'flex';
        console.log('✅ Modal de reportes abierto');
        
        setTimeout(() => {
            DOM.reportType?.focus();
        }, 100);
        
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
                <div class="report-preview-placeholder">
                    <i class="fas fa-chart-bar"></i>
                    <p>Seleccione un tipo de reporte para ver la vista previa</p>
                </div>
            `;
        }
        
        DOM.reportModal.style.display = 'none';
        console.log('✅ Modal cerrado exitosamente');
        
    } catch (error) {
        console.error('❌ Error cerrando modal:', error);
    }
}

// =============================================================================
// 2. CONFIGURACIÓN DE FILTROS DE REPORTES
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
                        <div class="form__group">
                            <div class="alert alert--warning">
                                <i class="fas fa-exclamation-triangle"></i>
                                <span>No hay categorías disponibles en el sistema</span>
                            </div>
                        </div>
                    `;
                } else {
                    DOM.reportSpecificFilters.innerHTML = `
                        <div class="form__group">
                            <label for="reportCategory" class="form__label">
                                <i class="fas fa-folder"></i> Categoría
                            </label>
                            <div class="select-wrapper">
                                <select id="reportCategory" class="form__select">
                                    <option value="">Todas las categorías</option>
                                    ${window.appState.categories.map(cat => 
                                        `<option value="${cat.nombre}">${cat.nombre}</option>`
                                    ).join('')}
                                </select>
                                <i class="fas fa-chevron-down select-arrow"></i>
                            </div>
                            <small class="form-help">Seleccione una categoría específica o "Todas"</small>
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
                        <div class="form__group">
                            <div class="alert alert--warning">
                                <i class="fas fa-exclamation-triangle"></i>
                                <span>No hay personas disponibles en el sistema</span>
                            </div>
                        </div>
                    `;
                } else {
                    DOM.reportSpecificFilters.innerHTML = `
                        <div class="form__group">
                            <label for="reportPerson" class="form__label">
                                <i class="fas fa-user"></i> Persona
                            </label>
                            <div class="select-wrapper">
                                <select id="reportPerson" class="form__select">
                                    <option value="">Todas las personas</option>
                                    ${window.appState.persons.map(person => 
                                        `<option value="${person._id}">${person.nombre} (${person.email || 'Sin email'})</option>`
                                    ).join('')}
                                </select>
                                <i class="fas fa-chevron-down select-arrow"></i>
                            </div>
                            <small class="form-help">Seleccione una persona específica o "Todas"</small>
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
                    <div class="form__group">
                        <label for="reportDays" class="form__label">
                            <i class="fas fa-calendar-alt"></i> Días hasta vencimiento
                        </label>
                        <input type="number" id="reportDays" class="form__input" 
                               value="30" min="1" max="365">
                        <small class="form-help">Documentos que vencen en los próximos N días</small>
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
                    <div class="form__group">
                        <div class="alert alert--warning">
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
                    <div class="form__group">
                        <div class="alert alert--info">
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
                    <div class="report-preview">
                        <h4><i class="fas fa-chart-pie"></i> Vista Previa - Resumen General</h4>
                        <div class="preview-stats">
                            <div class="stat-item">
                                <span class="stat-label">Total Documentos</span>
                                <span class="stat-value">${documents.length}</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-label">Total Personas</span>
                                <span class="stat-value">${persons.length}</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-label">Total Categorías</span>
                                <span class="stat-value">${categories.length}</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-label">Por Vencer (30 días)</span>
                                <span class="stat-value">${documents.filter(doc => {
                                    if (!doc.fecha_vencimiento) return false;
                                    const fechaVencimiento = new Date(doc.fecha_vencimiento);
                                    const hoy = new Date();
                                    const diferenciaDias = Math.ceil((fechaVencimiento - hoy) / (1000 * 60 * 60 * 24));
                                    return diferenciaDias <= 30 && diferenciaDias > 0;
                                }).length}</span>
                            </div>
                        </div>
                        <div class="preview-note">
                            <i class="fas fa-info-circle"></i>
                            <span>Este reporte incluirá un resumen completo del sistema</span>
                        </div>
                    </div>
                `;
                break;
                
            case 'byCategory':
                const selectedCategory = document.getElementById('reportCategory')?.value || '';
                console.log('📋 Generando vista previa para reporte por categoría:', selectedCategory);
                
                if (selectedCategory) {
                    const categoryDocs = documents.filter(doc => doc.categoria === selectedCategory);
                    estimatedRecords = categoryDocs.length;
                    previewContent = `
                        <div class="report-preview">
                            <h4><i class="fas fa-folder"></i> Vista Previa - Categoría: ${selectedCategory}</h4>
                            <div class="preview-stats">
                                <div class="stat-item">
                                    <span class="stat-label">Documentos en categoría</span>
                                    <span class="stat-value">${categoryDocs.length}</span>
                                </div>
                                <div class="stat-item">
                                    <span class="stat-label">Última actualización</span>
                                    <span class="stat-value">${categoryDocs.length > 0 
                                        ? new Date(Math.max(...categoryDocs.map(d => new Date(d.updatedAt || d.createdAt).getTime())))
                                            .toLocaleDateString()
                                        : 'N/A'}</span>
                                </div>
                            </div>
                            <div class="preview-details">
                                <h5>Detalles de la categoría:</h5>
                                <ul>
                                    <li><strong>Tipos de archivo:</strong> ${[...new Set(categoryDocs.map(doc => doc.tipo_archivo || 'Desconocido'))].join(', ') || 'Ninguno'}</li>
                                    <li><strong>Tamaño total:</strong> ${(categoryDocs.reduce((sum, doc) => sum + (doc.size || 0), 0) / (1024*1024)).toFixed(2)} MB</li>
                                    <li><strong>Documentos vencidos:</strong> ${categoryDocs.filter(doc => {
                                        if (!doc.fecha_vencimiento) return false;
                                        return new Date(doc.fecha_vencimiento) < new Date();
                                    }).length}</li>
                                </ul>
                            </div>
                        </div>
                    `;
                } else {
                    estimatedRecords = documents.length;
                    previewContent = `
                        <div class="report-preview">
                            <h4><i class="fas fa-folder"></i> Vista Previa - Todas las Categorías</h4>
                            <div class="preview-stats">
                                <div class="stat-item">
                                    <span class="stat-label">Total Documentos</span>
                                    <span class="stat-value">${documents.length}</span>
                                </div>
                                <div class="stat-item">
                                    <span class="stat-label">Total Categorías</span>
                                    <span class="stat-value">${categories.length}</span>
                                </div>
                            </div>
                            <div class="preview-details">
                                <h5>Distribución por categoría:</h5>
                                <ul class="category-list">
                                    ${categories.map(cat => {
                                        const catDocs = documents.filter(doc => doc.categoria === cat.nombre);
                                        return `<li><strong>${cat.nombre}:</strong> ${catDocs.length} documentos</li>`;
                                    }).join('')}
                                </ul>
                            </div>
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
                        <div class="report-preview">
                            <h4><i class="fas fa-user"></i> Vista Previa - Persona: ${person ? person.nombre : 'No encontrada'}</h4>
                            <div class="preview-stats">
                                <div class="stat-item">
                                    <span class="stat-label">Documentos asignados</span>
                                    <span class="stat-value">${personDocs.length}</span>
                                </div>
                                <div class="stat-item">
                                    <span class="stat-label">Última actualización</span>
                                    <span class="stat-value">${personDocs.length > 0 
                                        ? new Date(Math.max(...personDocs.map(d => new Date(d.updatedAt || d.createdAt).getTime())))
                                            .toLocaleDateString()
                                        : 'N/A'}</span>
                                </div>
                            </div>
                            <div class="preview-details">
                                <h5>Detalles de la persona:</h5>
                                <ul>
                                    <li><strong>Email:</strong> ${person?.email || 'No disponible'}</li>
                                    <li><strong>Categorías:</strong> ${[...new Set(personDocs.map(doc => doc.categoria))].join(', ') || 'Ninguna'}</li>
                                    <li><strong>Documentos vencidos:</strong> ${personDocs.filter(doc => {
                                        if (!doc.fecha_vencimiento) return false;
                                        return new Date(doc.fecha_vencimiento) < new Date();
                                    }).length}</li>
                                </ul>
                            </div>
                        </div>
                    `;
                } else {
                    estimatedRecords = documents.filter(doc => doc.persona_id).length;
                    previewContent = `
                        <div class="report-preview">
                            <h4><i class="fas fa-user"></i> Vista Previa - Todas las Personas</h4>
                            <div class="preview-stats">
                                <div class="stat-item">
                                    <span class="stat-label">Personas con documentos</span>
                                    <span class="stat-value">${[...new Set(documents.filter(doc => doc.persona_id).map(doc => doc.persona_id?._id))].length}</span>
                                </div>
                                <div class="stat-item">
                                    <span class="stat-label">Documentos asignados</span>
                                    <span class="stat-value">${documents.filter(doc => doc.persona_id).length}</span>
                                </div>
                            </div>
                            <div class="preview-details">
                                <h5>Distribución por persona:</h5>
                                <ul class="person-list">
                                    ${persons.map(person => {
                                        const personDocs = documents.filter(doc => doc.persona_id && doc.persona_id._id === person._id);
                                        if (personDocs.length === 0) return '';
                                        return `<li><strong>${person.nombre}:</strong> ${personDocs.length} documentos</li>`;
                                    }).filter(Boolean).join('') || '<li>No hay documentos asignados a personas</li>'}
                                </ul>
                            </div>
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
                previewContent = `
                    <div class="report-preview">
                        <h4><i class="fas fa-calendar-alt"></i> Vista Previa - Vencen en ${days} días</h4>
                        <div class="preview-stats">
                            <div class="stat-item">
                                <span class="stat-label">Documentos por vencer</span>
                                <span class="stat-value">${expiringDocs.length}</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-label">Próximo a vencer</span>
                                <span class="stat-value">${expiringDocs.length > 0 
                                    ? new Date(Math.min(...expiringDocs.map(d => new Date(d.fecha_vencimiento).getTime())))
                                        .toLocaleDateString()
                                    : 'N/A'}</span>
                            </div>
                        </div>
                        <div class="preview-details">
                            <h5>Distribución por categoría:</h5>
                                <ul class="category-list">
                                    ${Object.entries(
                                        expiringDocs.reduce((acc, doc) => {
                                            acc[doc.categoria] = (acc[doc.categoria] || 0) + 1;
                                            return acc;
                                        }, {})
                                    ).map(([categoria, count]) => `<li><strong>${categoria}:</strong> ${count} documentos</li>`).join('') || '<li>No hay documentos por vencer</li>'}
                                </ul>
                            <div class="preview-note">
                                <i class="fas fa-exclamation-triangle"></i>
                                <span>Estos documentos requieren atención prioritaria</span>
                            </div>
                        </div>
                    </div>
                `;
                break;
                
            case 'expired':
                console.log('📋 Generando vista previa para documentos vencidos');
                const expiredDocs = documents.filter(doc => {
                    if (!doc.fecha_vencimiento) return false;
                    const fechaVencimiento = new Date(doc.fecha_vencimiento);
                    const hoy = new Date();
                    return fechaVencimiento < hoy;
                });
                estimatedRecords = expiredDocs.length;
                previewContent = `
                    <div class="report-preview">
                        <h4><i class="fas fa-exclamation-triangle"></i> Vista Previa - Documentos Vencidos</h4>
                        <div class="preview-stats">
                            <div class="stat-item stat-item--danger">
                                <span class="stat-label">Documentos vencidos</span>
                                <span class="stat-value">${expiredDocs.length}</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-label">Más antiguo</span>
                                <span class="stat-value">${expiredDocs.length > 0 
                                    ? new Date(Math.min(...expiredDocs.map(d => new Date(d.fecha_vencimiento).getTime())))
                                        .toLocaleDateString()
                                    : 'N/A'}</span>
                            </div>
                        </div>
                        <div class="preview-details">
                            <h5>Distribución por categoría:</h5>
                                <ul class="category-list">
                                    ${Object.entries(
                                        expiredDocs.reduce((acc, doc) => {
                                            acc[doc.categoria] = (acc[doc.categoria] || 0) + 1;
                                            return acc;
                                        }, {})
                                    ).map(([categoria, count]) => `<li><strong>${categoria}:</strong> ${count} documentos</li>`).join('') || '<li>No hay documentos vencidos</li>'}
                                </ul>
                            <div class="preview-note preview-note--danger">
                                <i class="fas fa-exclamation-circle"></i>
                                <span>¡ATENCIÓN! Estos documentos requieren acción inmediata</span>
                            </div>
                        </div>
                    </div>
                `;
                break;
                
            default:
                console.warn('⚠️ Tipo de reporte no reconocido:', reportType);
                previewContent = `
                    <div class="report-preview-placeholder">
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
                ${buttonText}
            `;
            
            DOM.generateReportBtn.classList.remove('btn--warning');
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
                <div class="report-preview-error">
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
// 3. GENERACIÓN Y DESCARGA DE REPORTES
// =============================================================================

/**
 * 3.1 Handler para iniciar generación de reporte
 */
async function handleGenerateReport() {
    console.group('📄 handleGenerateReport - Iniciando generación de reporte');
    
    try {
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
        
        // Llamar directamente a la función de generación
        await generateReportDownload();
        
    } catch (error) {
        console.error('❌ Error en handleGenerateReport:', error);
        showAlert('Error al iniciar reporte: ' + error.message, 'error');
        reportGenerationInProgress = false;
        currentReportToken = null;
    } finally {
        console.groupEnd();
    }
}

/**
 * 3.2 Generar y descargar reporte (solo Excel y CSV)
 */
async function generateReportDownload() {
    console.group('📊 GENERACIÓN DE REPORTE - PROCESO COMPLETO');
    
    const generationToken = currentReportToken;
    
    try {
        const reportType = DOM.reportType.value;
        const format = DOM.reportFormat.value;
        const documents = window.appState?.documents || [];

        console.log('📋 Configuración inicial:', {
            tipo: reportType,
            formato: format,
            token: generationToken,
            totalDocumentos: documents.length
        });

        // Validar formato (solo Excel y CSV)
        const validFormats = ['excel', 'csv'];
        if (!validFormats.includes(format)) {
            console.error('❌ Formato no válido:', format);
            showAlert(`Formato de reporte no válido. Formatos permitidos: ${validFormats.join(', ')}`, 'error');
            return;
        }

        console.log('✅ Formato validado correctamente');
        setLoadingState(true, DOM.generateReportBtn);
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
        
        try {
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
            
            // Mostrar mensaje de éxito
            const successMessage = format === 'excel'
                ? `✅ Reporte Excel generado exitosamente (${formatBytes(blob.size)})`
                : `✅ Reporte CSV generado exitosamente (${formatBytes(blob.size)})`;
            
            showAlert(successMessage, 'success');
            
            console.log('🚪 Cerrando modal...');
            closeReportModal();

        } catch (fetchError) {
            clearTimeout(timeoutId);
            
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
            tipo: reportType,
            formato: format,
            timestamp: new Date().toISOString()
        });
        
        showAlert(`Error al generar reporte: ${error.message}`, 'error');
        
    } finally {
        // Solo resetear si es la misma generación
        if (currentReportToken === generationToken) {
            reportGenerationInProgress = false;
            currentReportToken = null;
        }
        
        setLoadingState(false, DOM.generateReportBtn);
        console.groupEnd();
    }
}

// =============================================================================
// 4. UTILIDADES AUXILIARES
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
// 6. EXPORTACIONES
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