import { DOM } from '../dom.js';
import { CONFIG } from '../config.js';
import { setLoadingState, showAlert } from '../utils.js';

// =============================================================================
// FUNCIONES DE REPORTES
// =============================================================================
function generateReport() {
    console.log('📊 Abriendo generador de reportes...');
    
    // Actualizar filtros específicos según el tipo de reporte
    updateReportFilters(DOM.reportType.value);
    
    DOM.reportModal.style.display = 'flex';
}

function closeReportModal() {
    console.log('❌ Cerrando modal de reportes');
    DOM.reportModal.style.display = 'none';
}

function updateReportFilters(reportType) {
    console.log(`📊 Actualizando filtros para reporte: ${reportType}`);
    
    DOM.reportSpecificFilters.innerHTML = '';
    
    switch(reportType) {
        case 'byCategory':
            DOM.reportSpecificFilters.innerHTML = `
                <div class="form__group">
                    <label for="reportCategory" class="form__label">Categoría</label>
                    <select id="reportCategory" class="form__select">
                        <option value="">Todas las categorías</option>
                        ${window.appState.categories.map(cat => `<option value="${cat.nombre}">${cat.nombre}</option>`).join('')}
                    </select>
                </div>
            `;
            // Agregar event listener para actualizar vista previa
            setTimeout(() => {
                document.getElementById('reportCategory')?.addEventListener('change', updateReportPreview);
            }, 100);
            break;
            
        case 'byPerson':
            DOM.reportSpecificFilters.innerHTML = `
                <div class="form__group">
                    <label for="reportPerson" class="form__label">Persona</label>
                    <select id="reportPerson" class="form__select">
                        <option value="">Todas las personas</option>
                        ${window.appState.persons.map(person => `<option value="${person._id}">${person.nombre}</option>`).join('')}
                    </select>
                </div>
            `;
            // Agregar event listener para actualizar vista previa
            setTimeout(() => {
                document.getElementById('reportPerson')?.addEventListener('change', updateReportPreview);
            }, 100);
            break;
            
        case 'expiring':
            DOM.reportSpecificFilters.innerHTML = `
                <div class="form__group">
                    <label for="reportDays" class="form__label">Días hasta vencimiento</label>
                    <input type="number" id="reportDays" class="form__input" value="30" min="1">
                </div>
            `;
            // Agregar event listener para actualizar vista previa
            setTimeout(() => {
                document.getElementById('reportDays')?.addEventListener('input', updateReportPreview);
            }, 100);
            break;
            
        default:
            // No se necesitan filtros adicionales para reporte general o vencidos
            break;
    }
    
    // Actualizar vista previa
    updateReportPreview();
}

function updateReportPreview() {
    const reportType = DOM.reportType.value;
    let previewContent = '';
    
    switch(reportType) {
        case 'general':
            previewContent = `
                <p><strong>Resumen General del Sistema</strong></p>
                <ul>
                    <li>Total de personas: ${window.appState.persons.length}</li>
                    <li>Total de documentos: ${window.appState.documents.length}</li>
                    <li>Total de categorías: ${window.appState.categories.length}</li>
                    <li>Documentos próximos a vencer: ${window.appState.dashboardStats.proximosVencer}</li>
                </ul>
            `;
            break;
            
        case 'byCategory':
            const selectedCategory = document.getElementById('reportCategory')?.value;
            if (selectedCategory) {
                const categoryDocs = window.appState.documents.filter(doc => doc.categoria === selectedCategory);
                previewContent = `
                    <p><strong>Reporte por Categoría: ${selectedCategory}</strong></p>
                    <ul>
                        <li>Total de documentos: ${categoryDocs.length}</li>
                        <li>Tipos de archivo: ${[...new Set(categoryDocs.map(doc => doc.tipo_archivo))].join(', ')}</li>
                    </ul>
                `;
            } else {
                previewContent = `
                    <p><strong>Reporte por Categorías</strong></p>
                    <ul>
                        ${window.appState.categories.map(cat => `
                            <li>${cat.nombre}: ${window.appState.documents.filter(doc => doc.categoria === cat.nombre).length} documentos</li>
                        `).join('')}
                    </ul>
                `;
            }
            break;
            
        case 'byPerson':
            const selectedPerson = document.getElementById('reportPerson')?.value;
            if (selectedPerson) {
                const person = window.appState.persons.find(p => p._id === selectedPerson);
                const personDocs = window.appState.documents.filter(doc => doc.persona_id && doc.persona_id._id === selectedPerson);
                previewContent = `
                    <p><strong>Reporte por Persona: ${person ? person.nombre : 'No encontrada'}</strong></p>
                    <ul>
                        <li>Total de documentos: ${personDocs.length}</li>
                        <li>Categorías: ${[...new Set(personDocs.map(doc => doc.categoria))].join(', ')}</li>
                    </ul>
                `;
            } else {
                previewContent = `
                    <p><strong>Reporte por Personas</strong></p>
                    <ul>
                        ${window.appState.persons.map(person => `
                            <li>${person.nombre}: ${window.appState.documents.filter(doc => doc.persona_id && doc.persona_id._id === person._id).length} documentos</li>
                        `).join('')}
                    </ul>
                `;
            }
            break;
            
        case 'expiring':
            const days = document.getElementById('reportDays')?.value || 30;
            const expiringDocs = window.appState.documents.filter(doc => {
                if (!doc.fecha_vencimiento) return false;
                const fechaVencimiento = new Date(doc.fecha_vencimiento);
                const hoy = new Date();
                const diferenciaDias = Math.ceil((fechaVencimiento - hoy) / (1000 * 60 * 60 * 24));
                return diferenciaDias <= days && diferenciaDias > 0;
            });
            previewContent = `
                <p><strong>Documentos que vencen en los próximos ${days} días</strong></p>
                <ul>
                    <li>Total de documentos: ${expiringDocs.length}</li>
                    <li>Por categorías: ${[...new Set(expiringDocs.map(doc => doc.categoria))].join(', ')}</li>
                </ul>
            `;
            break;
            
        case 'expired':
            const expiredDocs = window.appState.documents.filter(doc => {
                if (!doc.fecha_vencimiento) return false;
                const fechaVencimiento = new Date(doc.fecha_vencimiento);
                const hoy = new Date();
                return fechaVencimiento < hoy;
            });
            previewContent = `
                <p><strong>Documentos Vencidos</strong></p>
                <ul>
                    <li>Total de documentos: ${expiredDocs.length}</li>
                    <li>Por categorías: ${[...new Set(expiredDocs.map(doc => doc.categoria))].join(', ')}</li>
                <li>Necesitan atención inmediata</li>
                </ul>
            `;
            break;
    }
    
    DOM.reportPreviewContent.innerHTML = previewContent;
}

function handleGenerateReport() {
    console.log('📄 Generando reporte...');
    generateReportDownload();
}

async function generateReportDownload() {
    console.group('📊 GENERACIÓN DE REPORTE');
    
    try {
        const reportType = DOM.reportType.value;
        const reportFormat = DOM.reportFormat.value;

        console.log('📋 Configuración inicial:', {
            tipo: reportType,
            formato: reportFormat
        });

        // Validar formato
        if (!['pdf', 'excel', 'csv'].includes(reportFormat)) {
            console.error('❌ Formato no válido:', reportFormat);
            console.error('✅ Formatos válidos: pdf, excel, csv');
            showAlert('Formato de reporte no válido', 'error');
            return;
        }

        console.log('✅ Formato validado correctamente');
        setLoadingState(true, DOM.generateReportBtn);
        console.time('⏱️ Tiempo de generación');
        
        // Preparar datos del reporte
        const reportData = {
            reportType: reportType,
            category: '',
            person: '',
            days: 30,
            dateFrom: '',
            dateTo: ''
        };

        console.log('🔧 Datos base del reporte:', reportData);

        // Obtener valores específicos según el tipo de reporte
        if (reportType === 'byCategory') {
            const categorySelect = document.getElementById('reportCategory');
            if (categorySelect) {
                reportData.category = categorySelect.value;
                console.log('🏷️ Categoría seleccionada:', reportData.category || 'Todas');
            } else {
                console.warn('⚠️ No se encontró el selector de categoría');
            }
        }

        if (reportType === 'byPerson') {
            const personSelect = document.getElementById('reportPerson');
            if (personSelect) {
                reportData.person = personSelect.value;
                console.log('👤 Persona seleccionada:', reportData.person || 'Todas');
            } else {
                console.warn('⚠️ No se encontró el selector de persona');
            }
        }

        if (reportType === 'expiring') {
            const daysInput = document.getElementById('reportDays');
            if (daysInput) {
                reportData.days = daysInput.value;
                console.log('📅 Días hasta vencimiento:', reportData.days);
            } else {
                console.warn('⚠️ No se encontró el input de días');
            }
        }

        console.log('📦 Datos finales del reporte:', reportData);

        // Determinar endpoint según formato
        let endpoint = '';
        if (reportFormat === 'pdf') {
            endpoint = '/reports/pdf';
        } else if (reportFormat === 'excel') {
            endpoint = '/reports/excel';
        } else if (reportFormat === 'csv') {
            endpoint = '/reports/csv';
        }

        const fullUrl = `${CONFIG.API_BASE_URL}${endpoint}`;
        console.log('🌐 URL del endpoint:', fullUrl);
        console.log('📤 Método: POST');
        console.log('📋 Headers:', { 'Content-Type': 'application/json' });

        // Hacer la solicitud
        console.log('🚀 Enviando solicitud al servidor...');
        const response = await fetch(fullUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(reportData)
        });

        console.log('📥 Respuesta recibida:', {
            status: response.status,
            statusText: response.statusText,
            ok: response.ok,
            headers: {
                contentType: response.headers.get('content-type'),
                contentDisposition: response.headers.get('content-disposition')
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Error del servidor:', {
                status: response.status,
                statusText: response.statusText,
                errorText: errorText
            });
            throw new Error(`Error del servidor (${response.status}): ${errorText}`);
        }

        console.log('✅ Respuesta OK, obteniendo blob...');
        // Obtener el blob de la respuesta
        const blob = await response.blob();
        console.log('📦 Blob recibido:', {
            size: blob.size,
            type: blob.type,
            sizeFormatted: (blob.size / 1024).toFixed(2) + ' KB'
        });
        
        // Crear URL temporal para descarga
        console.log('🔗 Creando URL temporal...');
        const url = window.URL.createObjectURL(blob);
        console.log('✅ URL creada:', url.substring(0, 50) + '...');
        
        const a = document.createElement('a');
        a.href = url;
        
        // Determinar nombre y extensión del archivo
        let fileName = `reporte_documentos_${Date.now()}`;
        let extension = reportFormat;
        if (reportFormat === 'excel') {
            extension = 'xlsx';
        }
        const fullFileName = `${fileName}.${extension}`;
        a.download = fullFileName;
        
        console.log('📄 Nombre del archivo:', fullFileName);
        console.log('🔧 Atributos del enlace:', {
            href: a.href.substring(0, 50) + '...',
            download: a.download
        });
        
        // Descargar archivo
        console.log('➕ Agregando enlace al DOM...');
        document.body.appendChild(a);
        
        console.log('🖱️ Ejecutando click...');
        a.click();
        
        console.log('➖ Removiendo enlace del DOM...');
        document.body.removeChild(a);
        
        // Limpiar
        console.log('🧹 Revocando URL temporal...');
        window.URL.revokeObjectURL(url);

        console.timeEnd('⏱️ Tiempo de generación');
        console.log('✅ Reporte descargado exitosamente');
        showAlert(`Reporte generado y descargado en formato ${reportFormat.toUpperCase()}`, 'success');
        
        console.log('🚪 Cerrando modal...');
        closeReportModal();

    } catch (error) {
        console.error('❌ ERROR CRÍTICO en generateReportDownload:');
        console.error('📋 Detalles del error:', {
            message: error.message,
            stack: error.stack,
            name: error.name,
            tipo: DOM.reportType?.value,
            formato: DOM.reportFormat?.value
        });
        showAlert('Error al generar reporte: ' + error.message, 'error');
    } finally {
        setLoadingState(false, DOM.generateReportBtn);
        console.groupEnd();
    }
}

function handleReportTypeChange() {
    const reportType = this.value;
    console.log(`📊 Cambiando tipo de reporte a: ${reportType}`);
    updateReportFilters(reportType);
}

export { 
    generateReport, 
    closeReportModal, 
    updateReportFilters, 
    updateReportPreview, 
    handleGenerateReport, 
    generateReportDownload, 
    handleReportTypeChange 
};