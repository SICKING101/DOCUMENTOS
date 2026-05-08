/**
 * Debugging simple de tareas - Se carga automáticamente
 */

(function() {
    console.log('🔍 Simple Task Debug cargado');
    
    // Función simple para debuggear tareas
    window.simpleTaskDebug = async function() {
        console.group('🔍 DEBUG SIMPLE DE TAREAS');
        
        try {
            // Verificar que api esté disponible
            let api = window.api;
            if (!api && typeof api !== 'undefined') {
                api = api;
            }
            
            if (!api) {
                console.error('❌ API no disponible');
                console.groupEnd();
                return;
            }
            
            console.log('📡 Obteniendo tareas...');
            const response = await api.getTasks();
            
            if (response.success) {
                console.log(`📊 Total: ${response.tasks.length} tareas`);
                
                // Contar por prioridad
                const counts = {
                    alta: 0,
                    critica: 0,
                    media: 0,
                    baja: 0
                };
                
                response.tasks.forEach(task => {
                    counts[task.prioridad] = (counts[task.prioridad] || 0) + 1;
                });
                
                console.log('📈 Distribución:');
                console.log(`  Alta: ${counts.alta || 0}`);
                console.log(`  Crítica: ${counts.critica || 0}`);
                console.log(`  Media: ${counts.media || 0}`);
                console.log(`  Baja: ${counts.baja || 0}`);
                
                // Mostrar tareas de alta prioridad
                const alta = response.tasks.filter(t => 
                    t.prioridad === 'alta' || t.prioridad === 'critica'
                );
                console.log(`\n🔴 Alta prioridad (${alta.length}):`);
                alta.forEach((t, i) => {
                    console.log(`  ${i + 1}. ${t.titulo} - ${t.estado}`);
                });
                
                // Mostrar tareas para hoy
                const hoy = new Date();
                hoy.setHours(0, 0, 0, 0);
                const manana = new Date(hoy);
                manana.setDate(manana.getDate() + 1);
                
                const hoyTasks = response.tasks.filter(t => {
                    if (!t.fecha_limite) return false;
                    const fecha = new Date(t.fecha_limite);
                    return fecha >= hoy && fecha < manana && t.estado !== 'completada';
                });
                
                console.log(`\n📅 Para hoy (${hoyTasks.length}):`);
                hoyTasks.forEach((t, i) => {
                    console.log(`  ${i + 1}. ${t.titulo} - ${t.prioridad}`);
                });
            }
        } catch (error) {
            console.error('❌ Error:', error);
        }
        
        console.groupEnd();
    };
    
    console.log('✅ Simple debug disponible. Usa: simpleTaskDebug()');
})();