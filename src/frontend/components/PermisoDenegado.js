// ============================================================================
// src/frontend/components/PermisoDenegado.js
// ============================================================================
// COMPONENTE PARA MOSTRAR PERMISO DENEGADO DE FORMA AMIGABLE
// ============================================================================

class PermisoDenegado {
    constructor() {
        this.container = null;
        this.init();
    }

    init() {
        // Crear contenedor si no existe
        if (!document.getElementById('permiso-denegado-container')) {
            this.container = document.createElement('div');
            this.container.id = 'permiso-denegado-container';
            this.container.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                pointer-events: none;
                z-index: 10000;
                display: flex;
                justify-content: center;
                align-items: flex-start;
                padding-top: 80px;
            `;
            document.body.appendChild(this.container);
        } else {
            this.container = document.getElementById('permiso-denegado-container');
        }
    }

    mostrar(opciones = {}) {
        const {
            titulo = 'Acceso restringido',
            mensaje = 'No tienes permisos para realizar esta acción',
            icono = '🔒',
            duracion = 5000,
            accion = null
        } = opciones;

        const notification = document.createElement('div');
        notification.style.cssText = `
            background: white;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            padding: 16px 20px;
            max-width: 400px;
            width: 90%;
            pointer-events: auto;
            animation: slideDown 0.3s ease;
            border-left: 4px solid #f59e0b;
            margin-bottom: 10px;
        `;

        notification.innerHTML = `
            <div style="display: flex; align-items: center; gap: 12px;">
                <div style="font-size: 24px;">${icono}</div>
                <div style="flex: 1;">
                    <div style="font-weight: 600; color: #1f2937; margin-bottom: 4px;">${titulo}</div>
                    <div style="color: #6b7280; font-size: 14px;">${mensaje}</div>
                    ${accion ? `
                        <button class="permiso-accion-btn" style="
                            margin-top: 10px;
                            padding: 6px 12px;
                            background: #f59e0b;
                            color: white;
                            border: none;
                            border-radius: 4px;
                            cursor: pointer;
                            font-size: 13px;
                        ">${accion.texto}</button>
                    ` : ''}
                </div>
                <button class="permiso-cerrar" style="
                    background: none;
                    border: none;
                    color: #9ca3af;
                    cursor: pointer;
                    font-size: 18px;
                    padding: 4px;
                ">×</button>
            </div>
        `;

        this.container.appendChild(notification);

        // Botón cerrar
        notification.querySelector('.permiso-cerrar').addEventListener('click', () => {
            notification.remove();
        });

        // Acción personalizada
        if (accion && accion.handler) {
            notification.querySelector('.permiso-accion-btn').addEventListener('click', () => {
                accion.handler();
                notification.remove();
            });
        }

        // Auto-cerrar
        if (duracion > 0) {
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, duracion);
        }

        // Animación
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideDown {
                from { transform: translateY(-20px); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
            }
        `;
        document.head.appendChild(style);
    }
}

export default new PermisoDenegado();