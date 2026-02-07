import express from 'express';

// ============================================================================
// SECCIÓN: HERRAMIENTA DE DEBUG DE RUTAS
// ============================================================================
// Este archivo proporciona una función para diagnosticar y mostrar todas las
// rutas registradas en una aplicación Express. Es útil para desarrollo y
// depuración cuando se necesita verificar qué rutas están disponibles,
// especialmente después de cambios en la estructura de rutas o montaje de routers.
// ============================================================================

// ********************************************************************
// MÓDULO 1: FUNCIÓN PRINCIPAL DE DEBUG DE RUTAS
// ********************************************************************
// Descripción: Función principal que analiza la pila de middleware y
// routers de Express para extraer y mostrar todas las rutas registradas
// en la aplicación. Organiza la información por path y métodos HTTP.
// ********************************************************************
export function debugRoutes(app) {
    console.log('\n🔍 ========== DEBUG DE RUTAS REGISTRADAS ==========');
    
    // ----------------------------------------------------------------
    // BLOQUE 1.1: Función recursiva para extraer rutas de la pila Express
    // ----------------------------------------------------------------
    // Analiza recursivamente la estructura interna de Express para
    // descubrir todas las rutas registradas, incluyendo rutas directas,
    // routers montados y middleware.
    const extractRoutes = (layer) => {
        const routes = [];
        
        // ------------------------------------------------------------
        // SUB-BLOQUE 1.1.1: Detección de rutas directas (app.route)
        // ------------------------------------------------------------
        // Identifica rutas definidas directamente con app.route()
        // o router.METHOD(). Estas son las rutas HTTP estándar.
        if (layer.route) {
            const methods = Object.keys(layer.route.methods)
                .filter(method => layer.route.methods[method])
                .map(method => method.toUpperCase());
            
            methods.forEach(method => {
                routes.push({
                    method,
                    path: layer.route.path,
                    source: 'app.route'
                });
            });
        } 
        // ------------------------------------------------------------
        // SUB-BLOQUE 1.1.2: Detección de routers montados
        // ------------------------------------------------------------
        // Identifica routers montados con app.use('/prefix', router).
        // Recursivamente explora su pila interna para encontrar todas
        // sus rutas hijas.
        else if (layer.name === 'router') {
            if (layer.handle.stack) {
                layer.handle.stack.forEach(sublayer => {
                    const subRoutes = extractRoutes(sublayer);
                    routes.push(...subRoutes);
                });
            }
        } 
        // ------------------------------------------------------------
        // SUB-BLOQUE 1.1.3: Detección de middleware
        // ------------------------------------------------------------
        // Identifica middleware registrados (no rutas HTTP específicas)
        // para tener visibilidad completa de la pila de procesamiento.
        else if (layer.regexp) {
            routes.push({
                method: 'MIDDLEWARE',
                path: layer.regexp.toString(),
                source: layer.name || 'anonymous'
            });
        }
        
        return routes;
    };
    
    // ----------------------------------------------------------------
    // BLOQUE 1.2: Extracción de todas las rutas de la aplicación
    // ----------------------------------------------------------------
    // Recorre toda la pila de middleware de Express para construir
    // una lista completa de todas las rutas registradas en el sistema.
    const allRoutes = [];
    app._router.stack.forEach(layer => {
        const routes = extractRoutes(layer);
        allRoutes.push(...routes);
    });
    
    // ----------------------------------------------------------------
    // BLOQUE 1.3: Filtrado de rutas de API
    // ----------------------------------------------------------------
    // Filtra solo las rutas que pertenecen a la API (que contienen '/api/')
    // para enfocar el debugging en las rutas de negocio relevantes.
    const apiRoutes = allRoutes.filter(route => 
        route.path && 
        (typeof route.path === 'string' && route.path.includes('/api/'))
    );
    
    console.log(`📊 Total de rutas API encontradas: ${apiRoutes.length}`);
    
    // ----------------------------------------------------------------
    // BLOQUE 1.4: Agrupamiento de rutas por path para mejor visualización
    // ----------------------------------------------------------------
    // Organiza las rutas agrupando todos los métodos HTTP disponibles
    // para cada path, facilitando la identificación de rutas REST completas.
    const groupedRoutes = {};
    apiRoutes.forEach(route => {
        const path = route.path;
        if (!groupedRoutes[path]) {
            groupedRoutes[path] = [];
        }
        groupedRoutes[path].push(route.method);
    });
    
    // ********************************************************************
    // MÓDULO 2: PRESENTACIÓN DE RESULTADOS
    // ********************************************************************
    // Descripción: Muestra los resultados del análisis de rutas en consola
    // con formato organizado para fácil lectura y diagnóstico.
    // ********************************************************************
    
    console.log('\n📋 RUTAS DE API DISPONIBLES:');
    // ----------------------------------------------------------------
    // BLOQUE 2.1: Mostrar todas las rutas API ordenadas alfabéticamente
    // ----------------------------------------------------------------
    // Lista cada ruta API con sus métodos HTTP disponibles, mostrando
    // la relación completa entre paths y operaciones permitidas.
    Object.keys(groupedRoutes).sort().forEach(path => {
        const methods = groupedRoutes[path].sort();
        console.log(`  ${methods.join(', ').padEnd(15)} ${path}`);
    });
    
    // ----------------------------------------------------------------
    // BLOQUE 2.2: Verificación específica de rutas de tareas
    // ----------------------------------------------------------------
    // Búsqueda específica de rutas relacionadas con el módulo de tareas
    // para verificar que estén correctamente registradas después de
    // cambios en la configuración de rutas.
    console.log('\n🔎 VERIFICANDO RUTAS DE TAREAS:');
    const taskRoutes = apiRoutes.filter(route => 
        typeof route.path === 'string' && route.path.includes('/tasks')
    );
    
    if (taskRoutes.length === 0) {
        console.error('❌ NO HAY RUTAS DE TAREAS REGISTRADAS');
    } else {
        taskRoutes.forEach(route => {
            console.log(`  ✅ ${route.method.padEnd(10)} ${route.path}`);
        });
    }
    
    console.log('🔍 ==============================================\n');
}