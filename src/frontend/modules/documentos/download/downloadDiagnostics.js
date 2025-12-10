import { CONFIG } from '../../../config.js';
import { showAlert, formatFileSize } from '../../../utils.js';


import { downloadDocument } from './downloadManager.js';  

// Estas SÍ vienen de downloadMethods.js
import { downloadDocumentSimple, downloadDocumentAlternative } from './downloadMethods.js';

/**
 * Diagnóstico de descarga de documentos.
 * Muestra información detallada y probando métodos de descarga.
 * @param {string} id - ID del documento a diagnosticar
 */
export async function debugDocumentDownload(id) {
    console.group('🐛 DIAGNÓSTICO DE DESCARGA');
    
    try {
        const doc = window.appState.documents.find(d => d._id === id);
        if (!doc) {
            console.error('❌ Documento no encontrado');
            showAlert('Documento no encontrado', 'error');
            console.groupEnd();
            return;
        }
        
        const fileName = doc.nombre_original;
        const fileExtension = fileName.split('.').pop().toLowerCase();
        const cloudinaryUrl = doc.url_cloudinary || doc.cloudinary_url;
        
        console.log('📊 INFORMACIÓN DEL DOCUMENTO:');
        console.table({
            'ID': doc._id,
            'Nombre': fileName,
            'Tipo': doc.tipo_archivo,
            'Tamaño': `${doc.tamano_archivo} bytes (${formatFileSize(doc.tamano_archivo)})`,
            'URL Cloudinary': cloudinaryUrl || 'No disponible',
            'Fecha subida': new Date(doc.fecha_subida).toLocaleDateString(),
            'Categoría': doc.categoria,
            'Persona asignada': doc.persona_id?.nombre || 'No asignada'
        });
        
        // Probar diferentes métodos de descarga
        console.log('🧪 PROBANDO MÉTODOS DE DESCARGA DISPONIBLES:');
        
        const methods = {
            'Endpoint estándar': `${CONFIG.API_BASE_URL}/documents/${id}/download`,
            'Endpoint simple': `${CONFIG.API_BASE_URL}/documents/${id}/download?simple=true`,
            'Cloudinary directo': cloudinaryUrl
        };
        
        console.log('🔗 URLs disponibles:');
        for (const [name, url] of Object.entries(methods)) {
            if (url) {
                console.log(`  ${name}: ${url}`);
            }
        }
        
        // Verificar headers CORS
        console.log('🔍 Verificando headers CORS...');
        try {
            const corsTest = await fetch(`${CONFIG.API_BASE_URL}/documents/${id}/download`, {
                method: 'HEAD',
                mode: 'cors'
            });
            
            console.log('✅ Headers CORS:', {
                'Access-Control-Allow-Origin': corsTest.headers.get('Access-Control-Allow-Origin'),
                'Content-Type': corsTest.headers.get('Content-Type'),
                'Content-Disposition': corsTest.headers.get('Content-Disposition'),
                'Status': corsTest.status
            });
        } catch (corsError) {
            console.warn('⚠️ Error en verificación CORS:', corsError.message);
        }
        
        // Recomendaciones específicas por tipo de archivo
        console.log('💡 RECOMENDACIONES POR TIPO DE ARCHIVO:');
        
        const recommendations = {
            'pdf': 'Usar endpoint del servidor. Los PDFs pueden tener protección contra descarga directa.',
            'png': 'Cloudinary directo para imágenes.',
            'jpg': 'Cloudinary directo para imágenes.',
            'jpeg': 'Cloudinary directo para imágenes.',
            'gif': 'Cloudinary directo para imágenes.',
            'doc': 'Endpoint del servidor. Office puede requerir autenticación.',
            'docx': 'Endpoint del servidor. Office puede requerir autenticación.',
            'xlsx': 'Endpoint del servidor. Excel puede requerir autenticación.',
            'txt': 'Endpoint del servidor para texto plano.'
        };
        
        if (recommendations[fileExtension]) {
            console.log(`   • ${recommendations[fileExtension]}`);
        }
        
        // Métodos de prueba disponibles
        console.log('🛠️ MÉTODOS DE PRUEBA DISPONIBLES EN ESTE SISTEMA:');
        console.log('   1. downloadDocument() - Método principal');
        console.log('   2. downloadDocumentSimple() - Método simple');
        console.log('   3. downloadDocumentAlternative() - Método alternativo');
        
        // Mostrar resultados del diagnóstico
        const diagnosisResult = await performDownloadDiagnosis(id, doc);
        console.log('📈 RESULTADO DEL DIAGNÓSTICO:', diagnosisResult);
        
        showAlert(
            `Diagnóstico completado para: ${fileName}\n` +
            `Tipo: ${fileExtension.toUpperCase()}, Tamaño: ${formatFileSize(doc.tamano_archivo)}\n` +
            `Revisa la consola para detalles.`,
            'info'
        );
        
    } catch (error) {
        console.error('❌ Error en diagnóstico:', error);
        showAlert(`Error en diagnóstico: ${error.message}`, 'error');
    } finally {
        console.groupEnd();
    }
}

/**
 * Realiza un diagnóstico completo de la descarga.
 * @param {string} id - ID del documento
 * @param {object} doc - Documento completo
 * @returns {object} - Resultados del diagnóstico
 */
async function performDownloadDiagnosis(id, doc) {
    const results = {
        basicInfo: {
            fileName: doc.nombre_original,
            fileType: doc.tipo_archivo,
            fileSize: doc.tamano_archivo,
            hasCloudinaryUrl: !!(doc.url_cloudinary || doc.cloudinary_url)
        },
        methodTests: [],
        recommendations: []
    };
    
    // Test 1: Verificar accesibilidad del endpoint
    try {
        const testResponse = await fetch(`${CONFIG.API_BASE_URL}/documents/${id}/download`, {
            method: 'HEAD'
        });
        
        results.methodTests.push({
            method: 'HEAD Request',
            success: testResponse.ok,
            status: testResponse.status,
            contentType: testResponse.headers.get('Content-Type'),
            contentDisposition: testResponse.headers.get('Content-Disposition')
        });
    } catch (error) {
        results.methodTests.push({
            method: 'HEAD Request',
            success: false,
            error: error.message
        });
    }
    
    // Test 2: Verificar Cloudinary si está disponible
    if (doc.url_cloudinary || doc.cloudinary_url) {
        try {
            const cloudinaryUrl = doc.url_cloudinary || doc.cloudinary_url;
            const cloudinaryTest = await fetch(cloudinaryUrl, { method: 'HEAD' });
            
            results.methodTests.push({
                method: 'Cloudinary HEAD',
                success: cloudinaryTest.ok,
                status: cloudinaryTest.status,
                url: cloudinaryUrl
            });
        } catch (error) {
            results.methodTests.push({
                method: 'Cloudinary HEAD',
                success: false,
                error: error.message
            });
        }
    }
    
    // Generar recomendaciones
    const fileExtension = doc.nombre_original.split('.').pop().toLowerCase();
    
    if (fileExtension === 'pdf') {
        results.recommendations.push('PDF: Usar método principal (downloadDocument)');
        results.recommendations.push('Considerar vista previa embebida si es necesario');
    } else if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp'].includes(fileExtension)) {
        results.recommendations.push('Imagen: Cloudinary directo es más rápido');
        results.recommendations.push('Considerar compresión si la imagen es muy grande');
    } else if (['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(fileExtension)) {
        results.recommendations.push('Office: Endpoint del servidor obligatorio');
        results.recommendations.push('Considerar conversión a PDF para vista previa');
    } else if (['txt', 'csv', 'json', 'xml'].includes(fileExtension)) {
        results.recommendations.push('Texto: Endpoint del servidor para preservar formato');
        results.recommendations.push('Considerar truncar contenido muy grande');
    }
    
    // Recomendaciones generales
    if (doc.tamano_archivo > 10 * 1024 * 1024) { // > 10MB
        results.recommendations.push('Archivo grande (>10MB): Considerar compresión');
        results.recommendations.push('Notificar al usuario sobre tamaño');
    }
    
    if (!results.basicInfo.hasCloudinaryUrl) {
        results.recommendations.push('Sin URL Cloudinary: Solo endpoint del servidor disponible');
    }
    
    return results;
}

/**
 * Prueba todas las descargas disponibles.
 * Útil para validar que todas las descargas funcionan correctamente.
 */
export async function testAllDownloads() {
    console.group('🧪 TEST COMPLETO DE DESCARGAS');
    
    if (!window.appState.documents || window.appState.documents.length === 0) {
        showAlert('No hay documentos para probar', 'warning');
        console.groupEnd();
        return;
    }
    
    // Limitar a documentos pequeños para pruebas rápidas
    const testDocuments = window.appState.documents
        .filter(doc => doc.tamano_archivo < 5 * 1024 * 1024) // < 5MB
        .slice(0, 3); // Máximo 3 documentos
    
    if (testDocuments.length === 0) {
        showAlert('No hay documentos pequeños para probar', 'warning');
        console.groupEnd();
        return;
    }
    
    const results = [];
    
    showAlert(`Iniciando test de ${testDocuments.length} descargas...`, 'info');
    
    for (const [index, doc] of testDocuments.entries()) {
        console.log(`\n🔍 [${index + 1}/${testDocuments.length}] Probando: ${doc.nombre_original}`);
        
        try {
            const startTime = Date.now();
            const success = await downloadDocument(doc._id);
            const endTime = Date.now();
            
            if (success) {
                results.push({
                    documento: doc.nombre_original,
                    tipo: doc.tipo_archivo,
                    tamaño: formatFileSize(doc.tamano_archivo),
                    tiempo: `${endTime - startTime}ms`,
                    estado: '✅ EXITOSO'
                });
                
                console.log(`✅ Descarga exitosa en ${endTime - startTime}ms`);
            } else {
                results.push({
                    documento: doc.nombre_original,
                    tipo: doc.tipo_archivo,
                    tamaño: formatFileSize(doc.tamano_archivo),
                    tiempo: `${endTime - startTime}ms`,
                    estado: '❌ FALLIDO (método retornó false)'
                });
                
                console.warn('⚠️ Método de descarga retornó false');
                
                // Intentar método alternativo
                console.log('🔄 Intentando método alternativo...');
                try {
                    await downloadDocumentAlternative(doc._id);
                    console.log('✅ Método alternativo funcionó');
                } catch (altError) {
                    console.error('❌ Método alternativo también falló:', altError.message);
                }
            }
            
            // Esperar entre descargas para no sobrecargar
            if (index < testDocuments.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
            
        } catch (error) {
            console.error(`❌ Error en ${doc.nombre_original}:`, error);
            results.push({
                documento: doc.nombre_original,
                tipo: doc.tipo_archivo,
                tamaño: formatFileSize(doc.tamano_archivo),
                tiempo: 'N/A',
                estado: `❌ FALLIDO: ${error.message}`
            });
            
            // Registrar error detallado
            console.error('Stack trace:', error.stack);
        }
    }
    
    // Mostrar resultados
    console.log('\n📊 RESULTADOS DEL TEST:');
    console.table(results);
    
    const successful = results.filter(r => r.estado.includes('✅')).length;
    const total = results.length;
    const successRate = total > 0 ? Math.round((successful / total) * 100) : 0;
    
    console.log(`\n📈 ESTADÍSTICAS FINALES:`);
    console.log(`   Total descargas: ${total}`);
    console.log(`   Exitosas: ${successful}`);
    console.log(`   Fallidas: ${total - successful}`);
    console.log(`   Tasa de éxito: ${successRate}%`);
    
    // Mostrar tiempo promedio
    const successfulTimes = results
        .filter(r => r.estado.includes('✅') && r.tiempo !== 'N/A')
        .map(r => parseInt(r.tiempo.replace('ms', '')));
    
    if (successfulTimes.length > 0) {
        const avgTime = Math.round(successfulTimes.reduce((a, b) => a + b, 0) / successfulTimes.length);
        console.log(`   Tiempo promedio: ${avgTime}ms`);
    }
    
    // Mostrar alerta final
    if (successful === total) {
        showAlert(`✅ Todas las ${total} descargas funcionan correctamente`, 'success');
    } else if (successful > 0) {
        showAlert(
            `⚠️ ${successful}/${total} descargas exitosas (${successRate}%)\n` +
            `Revisa la consola para más detalles sobre las fallas.`,
            'warning'
        );
    } else {
        showAlert(
            `❌ Todas las ${total} descargas fallaron\n` +
            `Posible problema de red, servidor o configuración.`,
            'error'
        );
    }
    
    // Generar reporte detallado
    generateDownloadTestReport(results);
    
    console.groupEnd();
    return results;
}

/**
 * Genera un reporte detallado de las pruebas de descarga.
 * @param {Array} results - Resultados de las pruebas
 */
function generateDownloadTestReport(results) {
    console.log('\n📋 REPORTE DETALLADO DE PRUEBAS:');
    
    const report = {
        fecha: new Date().toISOString(),
        totalPruebas: results.length,
        exitosas: results.filter(r => r.estado.includes('✅')).length,
        fallidas: results.filter(r => r.estado.includes('❌')).length,
        documentos: results.map(r => ({
            nombre: r.documento,
            tipo: r.tipo,
            tamaño: r.tamaño,
            estado: r.estado,
            tiempo: r.tiempo
        })),
        problemasComunes: [],
        recomendaciones: []
    };
    
    // Identificar problemas comunes
    const failedDocs = results.filter(r => r.estado.includes('❌'));
    
    if (failedDocs.length > 0) {
        // Agrupar por tipo de error
        const errorTypes = {};
        failedDocs.forEach(doc => {
            const errorMatch = doc.estado.match(/❌ FALLIDO:\s*(.+)/);
            if (errorMatch) {
                const error = errorMatch[1];
                errorTypes[error] = (errorTypes[error] || 0) + 1;
            }
        });
        
        console.log('🔍 ERRORES IDENTIFICADOS:');
        for (const [error, count] of Object.entries(errorTypes)) {
            console.log(`   • ${error}: ${count} vez(es)`);
            report.problemasComunes.push({ error, count });
        }
    }
    
    // Generar recomendaciones basadas en los resultados
    if (failedDocs.length > 0) {
        report.recomendaciones.push('Revisar logs del servidor para errores 500');
        report.recomendaciones.push('Verificar configuración de CORS en el backend');
        report.recomendaciones.push('Comprobar que Cloudinary esté funcionando');
    }
    
    // Recomendaciones específicas por tipo de archivo
    const docTypes = results.map(r => r.tipo.toLowerCase());
    if (docTypes.includes('pdf')) {
        report.recomendaciones.push('PDFs: Considerar implementar vista previa embebida');
    }
    if (docTypes.some(t => t.includes('doc') || t.includes('xls') || t.includes('ppt'))) {
        report.recomendaciones.push('Office: Considerar conversión automática a PDF para descarga');
    }
    
    console.log('💡 RECOMENDACIONES:');
    report.recomendaciones.forEach(rec => console.log(`   • ${rec}`));
    
    // Guardar reporte en localStorage para referencia futura
    try {
        const reports = JSON.parse(localStorage.getItem('downloadTestReports') || '[]');
        reports.push(report);
        localStorage.setItem('downloadTestReports', JSON.stringify(reports.slice(-10))); // Guardar solo últimos 10
        console.log('📁 Reporte guardado en localStorage para análisis futuro');
    } catch (e) {
        console.warn('⚠️ No se pudo guardar el reporte en localStorage:', e.message);
    }
    
    return report;
}

/**
 * Prueba un método de descarga específico.
 * @param {string} method - Nombre del método a probar
 * @param {string} documentId - ID del documento
 * @returns {Promise<object>} - Resultado de la prueba
 */
export async function testDownloadMethod(method, documentId) {
    console.group(`🧪 TEST MÉTODO: ${method}`);
    
    const doc = window.appState.documents.find(d => d._id === documentId);
    if (!doc) {
        throw new Error('Documento no encontrado');
    }
    
    const result = {
        method,
        document: doc.nombre_original,
        startTime: Date.now(),
        success: false,
        error: null,
        duration: 0,
        details: {}
    };
    
    try {
        let success;
        
        switch(method) {
            case 'downloadDocument':
                success = await downloadDocument(documentId);
                break;
            case 'downloadDocumentSimple':
                await downloadDocumentSimple(documentId);
                success = true; // Asumir éxito si no hay error
                break;
            case 'downloadDocumentAlternative':
                success = await downloadDocumentAlternative(documentId);
                break;
            default:
                throw new Error(`Método desconocido: ${method}`);
        }
        
        result.success = success;
        result.duration = Date.now() - result.startTime;
        
        if (success) {
            console.log(`✅ ${method} - Éxito en ${result.duration}ms`);
        } else {
            console.warn(`⚠️ ${method} - Retornó false`);
        }
        
    } catch (error) {
        result.success = false;
        result.error = error.message;
        result.duration = Date.now() - result.startTime;
        console.error(`❌ ${method} - Error: ${error.message}`);
    }
    
    console.groupEnd();
    return result;
}