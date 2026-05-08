// src/frontend/services/avisoService.js
import { api } from './api.js';

class AvisoService {
    async getAvisosVigentes() {
        try { return await api.call('/avisos/vigentes'); }
        catch (e) { return { success: false, avisos: [], count: 0 }; }
    }
    async getTodosVigentes() {
        try {
            return await api.call('/avisos/todos');
        } catch (e) {
            console.error('Error:', e);
            return { success: false, avisos: [] };
        }
    }
    async marcarVisto(id) {
        try { return await api.call(`/avisos/${id}/visto`, { method: 'PATCH' }); }
        catch (e) { return { success: false }; }
    }
    async marcarTodosVistos() {
        try { return await api.call('/avisos/visto/todos', { method: 'PATCH' }); }
        catch (e) { return { success: false }; }
    }
    // Admin
    async getAllAvisos(page = 1, filters = {}) {
        const params = new URLSearchParams({ page, ...filters });
        return await api.call(`/avisos?${params}`);
    }
    async createAviso(data) { return await api.call('/avisos', { method: 'POST', body: data }); }
    async updateAviso(id, data) { return await api.call(`/avisos/${id}`, { method: 'PUT', body: data }); }
    async deleteAviso(id) { return await api.call(`/avisos/${id}`, { method: 'DELETE' }); }
}

export default new AvisoService();