import express from 'express';

export function debugRoutes(app) {
    console.log('\n🔍 ========== DEBUG DE RUTAS REGISTRADAS ==========');
    
    // Función para extraer rutas registradas
    const extractRoutes = (layer) => {
        const routes = [];
        
        if (layer.route) {
            // Rutas directas
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
        } else if (layer.name === 'router') {
            // Rutas de router
            if (layer.handle.stack) {
                layer.handle.stack.forEach(sublayer => {
                    const subRoutes = extractRoutes(sublayer);
                    routes.push(...subRoutes);
                });
            }
        } else if (layer.regexp) {
            // Middleware
            routes.push({
                method: 'MIDDLEWARE',
                path: layer.regexp.toString(),
                source: layer.name || 'anonymous'
            });
        }
        
        return routes;
    };
    
    // Obtener todas las rutas
    const allRoutes = [];
    app._router.stack.forEach(layer => {
        const routes = extractRoutes(layer);
        allRoutes.push(...routes);
    });
    
    // Filtrar rutas de API
    const apiRoutes = allRoutes.filter(route => 
        route.path && 
        (typeof route.path === 'string' && route.path.includes('/api/'))
    );
    
    console.log(`📊 Total de rutas API encontradas: ${apiRoutes.length}`);
    
    // Mostrar rutas organizadas
    const groupedRoutes = {};
    apiRoutes.forEach(route => {
        const path = route.path;
        if (!groupedRoutes[path]) {
            groupedRoutes[path] = [];
        }
        groupedRoutes[path].push(route.method);
    });
    
    console.log('\n📋 RUTAS DE API DISPONIBLES:');
    Object.keys(groupedRoutes).sort().forEach(path => {
        const methods = groupedRoutes[path].sort();
        console.log(`  ${methods.join(', ').padEnd(15)} ${path}`);
    });
    
    // Verificar rutas específicas de tareas
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