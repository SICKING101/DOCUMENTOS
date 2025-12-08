// =============================================================================
// SCRIPT DE PRUEBA - SISTEMA DE PAPELERA
// =============================================================================
// Este script permite probar todas las funcionalidades de la papelera
// desde la consola del navegador.

console.log('🗑️ Script de prueba de papelera cargado');
console.log('Usa los siguientes comandos para probar:');
console.log('');
console.log('1. testGetTrash() - Ver documentos en papelera');
console.log('2. testRestoreDocument(id) - Restaurar un documento');
console.log('3. testDeleteDocument(id) - Eliminar permanentemente');
console.log('4. testEmptyTrash() - Vaciar papelera completa');
console.log('5. testAutoCleanup() - Ejecutar limpieza automática');
console.log('');

// Función auxiliar para hacer llamadas API
async function apiCall(url, method = 'GET', body = null) {
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json'
        }
    };

    if (body) {
        options.body = JSON.stringify(body);
    }

    try {
        const response = await fetch(url, options);
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error en API call:', error);
        return { success: false, error: error.message };
    }
}

// =============================================================================
// FUNCIONES DE PRUEBA
// =============================================================================

/**
 * 1. Obtener todos los documentos en la papelera
 */
window.testGetTrash = async function() {
    console.log('📋 Obteniendo documentos de la papelera...');
    
    const result = await apiCall('/api/trash');
    
    if (result.success) {
        console.log(`✅ ${result.documents.length} documento(s) en papelera:`);
        result.documents.forEach((doc, index) => {
            console.log(`\n${index + 1}. ${doc.nombre_original}`);
            console.log(`   ID: ${doc._id}`);
            console.log(`   Eliminado: ${new Date(doc.deletedAt).toLocaleDateString()}`);
            console.log(`   Días restantes: ${doc.daysRemaining}`);
            console.log(`   Categoría: ${doc.categoria || 'Sin categoría'}`);
            console.log(`   Tamaño: ${(doc.tamano_archivo / 1024).toFixed(2)} KB`);
        });
        
        if (result.documents.length > 0) {
            console.log('\n💡 Para restaurar, usa: testRestoreDocument("ID_AQUI")');
            console.log('💡 Para eliminar, usa: testDeleteDocument("ID_AQUI")');
        }
    } else {
        console.error('❌ Error:', result.message);
    }
    
    return result;
};

/**
 * 2. Restaurar un documento específico
 */
window.testRestoreDocument = async function(docId) {
    if (!docId) {
        console.error('❌ Debes proporcionar un ID de documento');
        console.log('💡 Ejemplo: testRestoreDocument("507f1f77bcf86cd799439011")');
        return;
    }
    
    console.log(`♻️ Restaurando documento ${docId}...`);
    
    const result = await apiCall(`/api/trash/${docId}/restore`, 'POST');
    
    if (result.success) {
        console.log('✅ Documento restaurado exitosamente');
        console.log('📄 Documento:', result.document?.nombre_original);
    } else {
        console.error('❌ Error:', result.message);
    }
    
    return result;
};

/**
 * 3. Eliminar permanentemente un documento
 */
window.testDeleteDocument = async function(docId) {
    if (!docId) {
        console.error('❌ Debes proporcionar un ID de documento');
        console.log('💡 Ejemplo: testDeleteDocument("507f1f77bcf86cd799439011")');
        return;
    }
    
    console.warn('⚠️ ADVERTENCIA: Esta acción eliminará el documento permanentemente');
    console.log(`🗑️ Eliminando documento ${docId}...`);
    
    const result = await apiCall(`/api/trash/${docId}`, 'DELETE');
    
    if (result.success) {
        console.log('✅ Documento eliminado permanentemente');
        console.log('📄 Mensaje:', result.message);
    } else {
        console.error('❌ Error:', result.message);
    }
    
    return result;
};

/**
 * 4. Vaciar completamente la papelera
 */
window.testEmptyTrash = async function() {
    console.warn('⚠️⚠️⚠️ ADVERTENCIA CRÍTICA ⚠️⚠️⚠️');
    console.warn('Esta acción eliminará TODOS los documentos de la papelera');
    console.warn('Esta operación es IRREVERSIBLE');
    
    const confirm = window.confirm(
        'Esta acción eliminará PERMANENTEMENTE todos los documentos de la papelera.\n\n' +
        '¿Estás COMPLETAMENTE SEGURO?'
    );
    
    if (!confirm) {
        console.log('❌ Operación cancelada');
        return;
    }
    
    console.log('🗑️ Vaciando papelera...');
    
    const result = await apiCall('/api/trash/empty-all', 'DELETE');
    
    if (result.success) {
        console.log('✅ Papelera vaciada exitosamente');
        console.log(`📊 Documentos eliminados: ${result.deletedCount}`);
        if (result.errorCount > 0) {
            console.warn(`⚠️ Errores: ${result.errorCount}`);
        }
    } else {
        console.error('❌ Error:', result.message);
    }
    
    return result;
};

/**
 * 5. Ejecutar limpieza automática
 */
window.testAutoCleanup = async function() {
    console.log('🔄 Ejecutando limpieza automática...');
    console.log('ℹ️ Esto eliminará documentos con más de 30 días en papelera');
    
    const result = await apiCall('/api/trash/auto-cleanup', 'POST');
    
    if (result.success) {
        console.log('✅ Limpieza automática completada');
        console.log(`📊 Documentos eliminados: ${result.deletedCount}`);
        if (result.errorCount > 0) {
            console.warn(`⚠️ Errores: ${result.errorCount}`);
        }
        
        if (result.deletedCount === 0) {
            console.log('ℹ️ No había documentos para eliminar (ninguno con más de 30 días)');
        }
    } else {
        console.error('❌ Error:', result.message);
    }
    
    return result;
};

/**
 * 6. Ver estadísticas de la papelera
 */
window.testTrashStats = async function() {
    console.log('📊 Obteniendo estadísticas de la papelera...');
    
    const result = await apiCall('/api/trash');
    
    if (result.success) {
        const docs = result.documents;
        const totalSize = docs.reduce((sum, doc) => sum + doc.tamano_archivo, 0);
        const expiringSoon = docs.filter(doc => doc.daysRemaining <= 7).length;
        
        console.log('\n📈 ESTADÍSTICAS DE LA PAPELERA');
        console.log('═══════════════════════════════');
        console.log(`📄 Total de documentos: ${docs.length}`);
        console.log(`💾 Espacio utilizado: ${(totalSize / (1024 * 1024)).toFixed(2)} MB`);
        console.log(`⚠️ Por expirar (<7 días): ${expiringSoon}`);
        
        if (docs.length > 0) {
            const avgDaysRemaining = docs.reduce((sum, doc) => sum + doc.daysRemaining, 0) / docs.length;
            console.log(`📅 Promedio días restantes: ${avgDaysRemaining.toFixed(1)}`);
            
            // Documentos más antiguos
            const oldest = docs.sort((a, b) => a.daysRemaining - b.daysRemaining).slice(0, 3);
            console.log('\n🕐 Documentos más próximos a expirar:');
            oldest.forEach((doc, i) => {
                console.log(`   ${i + 1}. ${doc.nombre_original} (${doc.daysRemaining} días)`);
            });
        }
        
        console.log('═══════════════════════════════\n');
    } else {
        console.error('❌ Error:', result.message);
    }
    
    return result;
};

/**
 * 7. Simular flujo completo
 */
window.testFullFlow = async function() {
    console.log('🚀 Iniciando prueba de flujo completo...\n');
    
    // 1. Ver estado inicial
    console.log('1️⃣ Estado inicial de la papelera:');
    await testTrashStats();
    
    // 2. Ver todos los documentos
    console.log('\n2️⃣ Listado de documentos:');
    const trash = await testGetTrash();
    
    if (trash.documents && trash.documents.length > 0) {
        const firstDocId = trash.documents[0]._id;
        
        // 3. Restaurar primer documento
        console.log('\n3️⃣ Restaurando primer documento...');
        await testRestoreDocument(firstDocId);
        
        // 4. Ver estado después de restaurar
        console.log('\n4️⃣ Estado después de restaurar:');
        await testTrashStats();
    } else {
        console.log('\n⚠️ No hay documentos en la papelera para probar');
    }
    
    // 5. Ejecutar limpieza automática
    console.log('\n5️⃣ Ejecutando limpieza automática:');
    await testAutoCleanup();
    
    console.log('\n✅ Prueba de flujo completo terminada');
};

// =============================================================================
// INFORMACIÓN ADICIONAL
// =============================================================================

console.log('════════════════════════════════════════════════════════');
console.log('🗑️ SISTEMA DE PAPELERA - FUNCIONES DISPONIBLES');
console.log('════════════════════════════════════════════════════════');
console.log('');
console.log('📋 testGetTrash()           - Listar documentos en papelera');
console.log('♻️  testRestoreDocument(id)  - Restaurar un documento');
console.log('🗑️ testDeleteDocument(id)   - Eliminar permanentemente');
console.log('💥 testEmptyTrash()          - Vaciar toda la papelera');
console.log('🔄 testAutoCleanup()         - Limpieza automática (>30 días)');
console.log('📊 testTrashStats()          - Ver estadísticas');
console.log('🚀 testFullFlow()            - Probar todo el flujo');
console.log('');
console.log('════════════════════════════════════════════════════════');
console.log('💡 Tip: Abre DevTools (F12) y pega este archivo completo');
console.log('');
