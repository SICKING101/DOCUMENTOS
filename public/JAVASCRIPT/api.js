import { CONFIG } from './config.js';

// =============================================================================
// FUNCIÓN AUXILIAR PARA LLAMADAS A LA API
// =============================================================================
async function apiCall(endpoint, options = {}) {
    try {
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            }
        };

        const finalOptions = { ...defaultOptions, ...options };
        
        if (finalOptions.body && typeof finalOptions.body === 'object' && !(finalOptions.body instanceof FormData)) {
            finalOptions.body = JSON.stringify(finalOptions.body);
        }

        const response = await fetch(`${CONFIG.API_BASE_URL}${endpoint}`, finalOptions);

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Error HTTP ${response.status}: ${errorText}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error en API call:', error);
        throw error;
    }
}

export { apiCall };