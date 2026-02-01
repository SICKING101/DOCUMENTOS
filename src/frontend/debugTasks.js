/**
 * Debugging avanzado para tareas
 */

// Verificar si ya está cargado para evitar declaraciones duplicadas
if (typeof window.TaskDebugger === 'undefined') {

class TaskDebugger {
    constructor() {
        this.api = window.api || null;
        this.appState = window.appState || null;
        console.log('🔧 TaskDebugger inicializado');
        console.log('📡 API disponible:', !!this.api);
        console.log('📦 AppState disponible:', !!this.appState);
    }

    /**
     * Verificar todas las tareas en el sistema
     */
    async debugAllTasks() {
        console.group('🔍 DEBUG COMPLETO DE TAREAS');
        
        try {
            // Verificar que api esté disponible
            if (!this.api) {
                console.error('❌ API no disponible. Cargando manualmente...');
                this.api = await this.loadAPI();
                if (!this.api) {
                    console.error('❌ No se pudo cargar la API');
                    console.groupEnd();
                    return;
                }
            }
            
            // 1. Obtener todas las tareas desde la API
            console.log('📡 Obteniendo todas las tareas...');
            const response = await this.api.getTasks();
            
            if (response.success) {
                console.log(`✅ Total tareas: ${response.tasks.length}`);
                
                // 2. Análisis por prioridad
                const byPriority = this.groupByPriority(response.tasks);
                console.log('📊 Distribución por prioridad:');
                Object.keys(byPriority).forEach(priority => {
                    console.log(`  ${priority}: ${byPriority[priority].length} tareas`);
                });
                
                // 3. Análisis por estado
                const byStatus = this.groupByStatus(response.tasks);
                console.log('📊 Distribución por estado:');
                Object.keys(byStatus).forEach(status => {
                    console.log(`  ${status}: ${byStatus[status].length} tareas`);
                });
                
                // 4. Tareas de alta prioridad
                console.log('🔴 TAREAS DE ALTA PRIORIDAD:');
                const highPriority = response.tasks.filter(t => 
                    t.prioridad === 'alta' || t.prioridad === 'critica'
                );
                
                if (highPriority.length > 0) {
                    highPriority.forEach((task, index) => {
                        console.log(`  ${index + 1}. ${task.titulo}`);
                        console.log(`     ID: ${task._id}`);
                        console.log(`     Estado: ${task.estado}`);
                        console.log(`     Fecha límite: ${task.fecha_limite}`);
                        console.log(`     Activo: ${task.activo}`);
                    });
                } else {
                    console.log('  ℹ️ No hay tareas de alta prioridad');
                }
                
                // 5. Tareas para hoy
                console.log('📅 TAREAS PARA HOY:');
                const hoy = new Date();
                hoy.setHours(0, 0, 0, 0);
                const manana = new Date(hoy);
                manana.setDate(manana.getDate() + 1);
                
                const todayTasks = response.tasks.filter(t => {
                    if (!t.fecha_limite) return false;
                    const taskDate = new Date(t.fecha_limite);
                    return taskDate >= hoy && taskDate < manana && t.estado !== 'completada';
                });
                
                if (todayTasks.length > 0) {
                    todayTasks.forEach((task, index) => {
                        console.log(`  ${index + 1}. ${task.titulo}`);
                        console.log(`     Prioridad: ${task.prioridad}`);
                        console.log(`     Estado: ${task.estado}`);
                        console.log(`     Fecha: ${task.fecha_limite}`);
                    });
                } else {
                    console.log('  ℹ️ No hay tareas para hoy');
                }
                
                // 6. Verificar endpoints específicos
                console.log('🔌 PROBANDO ENDPOINTS ESPECÍFICOS:');
                
                // Endpoint de alta prioridad
                try {
                    const highPriorityResponse = await this.api.getHighPriorityTasks();
                    console.log(`  /tasks/high-priority: ${highPriorityResponse.tasks?.length || 0} tareas`);
                    if (highPriorityResponse.tasks && highPriorityResponse.tasks.length > 0) {
                        highPriorityResponse.tasks.forEach((task, i) => {
                            console.log(`    ${i + 1}. ${task.titulo} (${task.prioridad})`);
                        });
                    }
                } catch (error) {
                    console.error(`  ❌ /tasks/high-priority: ${error.message}`);
                }
                
                // Endpoint de hoy
                try {
                    const todayResponse = await this.api.getTodayTasks();
                    console.log(`  /tasks/today: ${todayResponse.tasks?.length || 0} tareas`);
                    if (todayResponse.tasks && todayResponse.tasks.length > 0) {
                        todayResponse.tasks.forEach((task, i) => {
                            console.log(`    ${i + 1}. ${task.titulo} (${task.prioridad})`);
                        });
                    }
                } catch (error) {
                    console.error(`  ❌ /tasks/today: ${error.message}`);
                }
                
                // 7. Comparar resultados
                console.log('🔁 COMPARACIÓN DE RESULTADOS:');
                console.log(`  Filtro manual alta prioridad: ${highPriority.length}`);
                console.log(`  Filtro manual hoy: ${todayTasks.length}`);
                
            } else {
                console.error('❌ Error obteniendo tareas:', response.message);
            }
            
        } catch (error) {
            console.error('❌ Error en debug:', error);
            console.error('📋 Detalles:', {
                message: error.message,
                stack: error.stack
            });
        }
        
        console.groupEnd();
    }

    /**
     * Verificar una tarea específica
     */
    async debugTask(taskId) {
        console.group(`🔍 DEBUG TAREA: ${taskId}`);
        
        try {
            // Verificar que api esté disponible
            if (!this.api) {
                this.api = await this.loadAPI();
            }
            
            // Obtener todas las tareas
            const response = await this.api.getTasks();
            
            if (response.success) {
                const task = response.tasks.find(t => t._id === taskId);
                
                if (task) {
                    console.log('📋 INFORMACIÓN DE LA TAREA:');
                    console.log(`  Título: ${task.titulo}`);
                    console.log(`  Prioridad: ${task.prioridad}`);
                    console.log(`  Estado: ${task.estado}`);
                    console.log(`  Fecha límite: ${task.fecha_limite}`);
                    console.log(`  Activo: ${task.activo}`);
                    
                    // Verificar si debería aparecer en alta prioridad
                    const isHighPriority = task.prioridad === 'alta' || task.prioridad === 'critica';
                    const isCompleted = task.estado === 'completada';
                    console.log(`\n🔍 VERIFICACIÓN DE FILTROS:`);
                    console.log(`  ¿Prioridad alta/crítica?: ${isHighPriority ? '✅ SÍ' : '❌ NO'}`);
                    console.log(`  ¿Estado completada?: ${isCompleted ? '✅ SÍ' : '❌ NO'}`);
                    console.log(`  ¿Activo?: ${task.activo ? '✅ SÍ' : '❌ NO'}`);
                    console.log(`  ¿Aparece en /high-priority?: ${isHighPriority && !isCompleted && task.activo ? '✅ DEBERÍA' : '❌ NO DEBERÍA'}`);
                    
                    // Verificar si es para hoy
                    if (task.fecha_limite) {
                        const hoy = new Date();
                        hoy.setHours(0, 0, 0, 0);
                        const manana = new Date(hoy);
                        manana.setDate(manana.getDate() + 1);
                        
                        const taskDate = new Date(task.fecha_limite);
                        const isToday = taskDate >= hoy && taskDate < manana;
                        
                        console.log(`\n📅 VERIFICACIÓN PARA HOY:`);
                        console.log(`  Fecha tarea: ${task.fecha_limite}`);
                        console.log(`  Hoy (inicio): ${hoy.toISOString()}`);
                        console.log(`  Mañana (fin): ${manana.toISOString()}`);
                        console.log(`  ¿Es hoy?: ${isToday ? '✅ SÍ' : '❌ NO'}`);
                        console.log(`  ¿Aparece en /today?: ${isToday && !isCompleted && task.activo ? '✅ DEBERÍA' : '❌ NO DEBERÍA'}`);
                    }
                } else {
                    console.error(`❌ Tarea ${taskId} no encontrada`);
                    
                    // Mostrar todas las tareas disponibles
                    console.log('📋 Tareas disponibles:');
                    response.tasks.forEach((t, i) => {
                        console.log(`  ${i + 1}. ${t._id} - ${t.titulo}`);
                    });
                }
            }
        } catch (error) {
            console.error('❌ Error:', error);
        }
        
        console.groupEnd();
    }

    /**
     * Crear una tarea de prueba
     */
    async createTestTask() {
        console.group('🧪 CREANDO TAREA DE PRUEBA');
        
        const testTask = {
            titulo: `TAREA DE PRUEBA - ${new Date().toLocaleTimeString()}`,
            descripcion: 'Esta es una tarea de prueba para debugging',
            prioridad: 'alta',
            estado: 'pendiente',
            categoria: 'Prueba',
            fecha_limite: new Date().toISOString(), // Fecha de hoy
            hora_limite: '23:59',
            recordatorio: false
        };
        
        console.log('📋 Datos de prueba:', testTask);
        
        try {
            // Verificar que api esté disponible
            if (!this.api) {
                this.api = await this.loadAPI();
            }
            
            const response = await this.api.createTask(testTask);
            console.log('✅ Respuesta creación:', response);
            
            if (response.success) {
                console.log(`🎯 Tarea creada con ID: ${response.task._id}`);
                
                // Esperar un momento y verificar
                setTimeout(async () => {
                    await this.debugTask(response.task._id);
                    await this.debugAllTasks();
                }, 1000);
            }
        } catch (error) {
            console.error('❌ Error creando tarea:', error);
        }
        
        console.groupEnd();
    }

    /**
     * Cargar API manualmente
     */
    async loadAPI() {
        console.log('🔄 Intentando cargar API manualmente...');
        try {
            // Buscar api en el objeto global
            if (window.api) {
                console.log('✅ API encontrada en window.api');
                return window.api;
            }
            
            // Intentar importar dinámicamente
            const { api } = await import('./services/api.js');
            if (api) {
                console.log('✅ API cargada dinámicamente');
                return api;
            }
        } catch (error) {
            console.error('❌ No se pudo cargar la API:', error);
        }
        return null;
    }

    /**
     * Utilidades de agrupación
     */
    groupByPriority(tasks) {
        const groups = {};
        tasks.forEach(task => {
            const priority = task.prioridad || 'sin-prioridad';
            if (!groups[priority]) groups[priority] = [];
            groups[priority].push(task);
        });
        return groups;
    }

    groupByStatus(tasks) {
        const groups = {};
        tasks.forEach(task => {
            const status = task.estado || 'sin-estado';
            if (!groups[status]) groups[status] = [];
            groups[status].push(task);
        });
        return groups;
    }
}

// Hacer disponible globalmente solo si no existe
if (!window.TaskDebugger) {
    window.TaskDebugger = TaskDebugger;
}

if (!window.taskDebugger) {
    window.taskDebugger = new TaskDebugger();
}

console.log('🔧 TaskDebugger cargado. Usa:');
console.log('  • taskDebugger.debugAllTasks() - Para ver todas las tareas');
console.log('  • taskDebugger.debugTask("id") - Para debuggear una tarea específica');
console.log('  • taskDebugger.createTestTask() - Para crear tarea de prueba');

} else {
    console.log('ℹ️ TaskDebugger ya está cargado, usando instancia existente');
}