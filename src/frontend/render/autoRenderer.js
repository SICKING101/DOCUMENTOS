/**
 * ═══════════════════════════════════════════════════════════════════════════
 * AUTO RENDERER — Sistema automatizado de renderizado reactivo
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Intercepta todos los eventos de cambio de datos y automáticamente
 * renderiza los componentes afectados sin necesidad de botones de actualización.
 * 
 * Registra todos los renderers y los ejecuta cuando sus datos cambian.
 */

import { eventBus, APP_EVENTS } from '/src/frontend/events/eventBus.js';
import { reactiveState } from '/src/frontend/state/reactiveState.js';

class AutoRenderer {
  constructor() {
    this._renderers = new Map();
    this._renderQueues = new Map();
    this._isRendering = false;
    this._batchDelay = 100; // Agrupar cambios en 100ms
    this._batchTimeout = null;
  }

  /**
   * Registra una función de renderizado para un componente
   * @param {string} componentName - Nombre del componente
   * @param {function} renderFn - Función que renderiza
   * @param {string[]} dependencies - Array de eventos que disparan renderizado
   */
  register(componentName, renderFn, dependencies = []) {
    if (!this._renderers.has(componentName)) {
      this._renderers.set(componentName, {
        render: renderFn,
        dependencies: dependencies,
        lastRender: null,
        isRendering: false,
      });

      console.log(`✅ Renderer registrado: ${componentName}`, dependencies);

      // Escuchar eventos de sus dependencias
      dependencies.forEach((eventName) => {
        eventBus.on(eventName, () => {
          this._queueRender(componentName);
        });
      });
    }
  }

  /**
   * Encola un renderizado para evitar renderizados múltiples
   * @private
   */
  _queueRender(componentName) {
    if (!this._renderQueues.has(componentName)) {
      this._renderQueues.set(componentName, true);

      // Ejecutar después del delay
      clearTimeout(this._batchTimeout);
      this._batchTimeout = setTimeout(() => {
        this._processQueue();
      }, this._batchDelay);
    }
  }

  /**
   * Procesa la cola de renderizados
   * @private
   */
  async _processQueue() {
    for (const [componentName] of this._renderQueues) {
      try {
        await this.render(componentName);
      } catch (err) {
        console.error(`❌ Error renderizando ${componentName}:`, err);
      }
    }
    this._renderQueues.clear();
  }

  /**
   * Ejecuta el renderizado de un componente
   * @param {string} componentName - Nombre del componente
   */
  async render(componentName) {
    const renderer = this._renderers.get(componentName);
    if (!renderer) {
      console.warn(`⚠️ Renderer no encontrado: ${componentName}`);
      return;
    }

    if (renderer.isRendering) {
      console.log(`⏳ ${componentName} ya está renderizando...`);
      return;
    }

    try {
      renderer.isRendering = true;
      console.log(`🎨 Renderizando: ${componentName}`);

      const startTime = performance.now();
      await renderer.render();
      const duration = performance.now() - startTime;

      renderer.lastRender = Date.now();
      console.log(`✅ Renderizado completado: ${componentName} (${duration.toFixed(2)}ms)`);
    } catch (err) {
      console.error(`❌ Error en renderer ${componentName}:`, err);
    } finally {
      renderer.isRendering = false;
    }
  }

  /**
   * Renderiza múltiples componentes a la vez
   * @param {string[]} componentNames
   */
  async renderMultiple(componentNames) {
    await Promise.all(
      componentNames.map((name) => this.render(name))
    );
  }

  /**
   * Renderiza todos los componentes registrados
   */
  async renderAll() {
    const components = Array.from(this._renderers.keys());
    console.log(`🔄 Renderizando ${components.length} componentes...`);
    await this.renderMultiple(components);
  }

  /**
   * Obtiene información de los renderers registrados
   */
  getInfo() {
    return {
      total: this._renderers.size,
      renderers: Array.from(this._renderers.entries()).map(([name, renderer]) => ({
        name,
        dependencies: renderer.dependencies,
        lastRender: renderer.lastRender ? new Date(renderer.lastRender) : null,
        isRendering: renderer.isRendering,
      })),
    };
  }

  /**
   * Limpia todos los renderers
   */
  clear() {
    this._renderers.clear();
    this._renderQueues.clear();
    clearTimeout(this._batchTimeout);
    console.log('🧹 AutoRenderer limpiado');
  }
}

// Instancia global
export const autoRenderer = new AutoRenderer();

/**
 * Setup automático de renderers basado en el estado
 * Se ejecuta cuando se inicializa la app
 */
export function setupAutoRenderingSystem() {
  console.log('🚀 Inicializando sistema de renderizado automático...');

  // Escuchar cambios de estado y renderizar automáticamente
  reactiveState.subscribe('persons', () => {
    autoRenderer.render('personsList');
  });

  reactiveState.subscribe('documents', () => {
    autoRenderer.render('documentsList');
    autoRenderer.render('dashboard');
  });

  reactiveState.subscribe('categories', () => {
    autoRenderer.render('categoriesList');
  });

  reactiveState.subscribe('departments', () => {
    autoRenderer.render('departmentsList');
  });

  reactiveState.subscribe('dashboardStats', () => {
    autoRenderer.render('dashboardStats');
    autoRenderer.render('dashboard');
  });

  // Eventos del bus también disparan renderizado
  eventBus.on(APP_EVENTS.DASHBOARD_REFRESHED, () => {
    autoRenderer.render('dashboard');
  });

  console.log('✅ Sistema de renderizado automático listo');
}

export default autoRenderer;
