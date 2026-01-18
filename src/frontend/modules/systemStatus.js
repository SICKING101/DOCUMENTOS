import { api } from '../services/api.js';

class SystemStatusModule {
    constructor() {
        console.log('🔧 SystemStatusModule: Constructor inicializado - MODO REAL');
        this.systemStatus = null;
        this.updateInterval = null;
        this.updateFrequency = 30000; // 30 segundos
        this.errorCount = 0;
        this.maxRetries = 3;
        this.retryDelay = 5000; // 5 segundos entre reintentos
        
        this.init();
    }

    async init() {
        console.log('🔧 SystemStatusModule: Inicializando módulo REAL');
        this.setupEventListeners();
        await this.loadSystemStatus();
        this.startAutoUpdate();
        console.log('✅ SystemStatusModule: Módulo REAL inicializado correctamente');
    }

    setupEventListeners() {
        console.log('🔧 SystemStatusModule: Configurando event listeners REALES');
        
        // Botón de actualización manual
        const refreshBtn = document.querySelector('.system-status-refresh');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                console.log('🔄 Actualizando estado del sistema manualmente');
                this.loadSystemStatus();
                this.showToast('Estado del sistema actualizado', 'info');
            });
        }
        
        // Configurar para mostrar detalles al hacer clic en un servicio
        document.addEventListener('click', (e) => {
            if (e.target.closest('.status-item')) {
                const item = e.target.closest('.status-item');
                const serviceName = item.querySelector('.status-label')?.textContent;
                if (serviceName && this.systemStatus?.services) {
                    const service = Object.values(this.systemStatus.services).find(
                        s => s.name === serviceName
                    );
                    if (service) {
                        this.showServiceDetails(service);
                    }
                }
            }
        });
        
        // ESC para cerrar detalles
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeServiceDetails();
            }
        });
    }

    async loadSystemStatus(retryCount = 0) {
        try {
            console.log(`🔄 Cargando estado REAL del sistema... (intento ${retryCount + 1})`);
            
            this.showLoadingState();
            
            // ✅ CORRECCIÓN: Usar la función correcta de la API
            const response = await api.getSystemStatus();
            
            if (response && (response.success || response.overallStatus)) {
                this.systemStatus = response;
                this.errorCount = 0;
                
                // Validar estructura de la respuesta
                this.validateResponseStructure(response);
                
                // Renderizar el estado
                this.renderSystemStatus(response);
                
                // Validar consistencia
                this.validateStatusConsistency(response);
                
                console.log('✅ Estado REAL del sistema cargado correctamente');
                
                // Actualizar badge de error si existe
                this.updateErrorBadge();
                
                return response;
            } else {
                throw new Error('Respuesta inválida del servidor');
            }
            
        } catch (error) {
            console.error('❌ Error cargando estado del sistema:', error);
            
            // Reintentar si no hemos alcanzado el máximo de reintentos
            if (retryCount < this.maxRetries) {
                console.log(`🔄 Reintentando en ${this.retryDelay/1000} segundos...`);
                
                this.showToast(`Error, reintentando... (${retryCount + 1}/${this.maxRetries})`, 'warning');
                
                setTimeout(() => {
                    this.loadSystemStatus(retryCount + 1);
                }, this.retryDelay);
                
                return;
            }
            
            // Si fallan todos los reintentos, mostrar estado de error
            this.errorCount++;
            this.showErrorState(error);
            this.updateErrorBadge();
            
            // Si hay demasiados errores consecutivos, aumentar el intervalo
            if (this.errorCount >= 5) {
                console.warn('⚠️ Muchos errores consecutivos, aumentando intervalo de actualización');
                this.updateFrequency = 60000; // 1 minuto
                this.startAutoUpdate();
            }
        }
    }

    validateResponseStructure(response) {
        console.log('🔍 Validando estructura de respuesta...');
        
        const requiredFields = ['timestamp', 'overallStatus', 'services'];
        const missingFields = requiredFields.filter(field => !response[field]);
        
        if (missingFields.length > 0) {
            console.warn('⚠️ Respuesta incompleta. Campos faltantes:', missingFields);
        }
        
        // Validar estructura de servicios
        if (response.services) {
            const requiredServices = ['database', 'system', 'cloudStorage', 'emailService'];
            const missingServices = requiredServices.filter(service => !response.services[service]);
            
            if (missingServices.length > 0) {
                console.warn('⚠️ Servicios faltantes en respuesta:', missingServices);
            }
            
            // Validar cada servicio
            Object.entries(response.services).forEach(([key, service]) => {
                if (!service.name || !service.status || !service.message) {
                    console.warn(`⚠️ Servicio ${key} incompleto:`, service);
                }
            });
        }
    }

    validateStatusConsistency(data) {
        console.log('🔍 Validando consistencia del estado del sistema...');
        
        const services = data.services || {};
        const inconsistencies = [];
        const warnings = [];
        
        // Validar que los timestamps sean válidos
        Object.entries(services).forEach(([serviceName, service]) => {
            try {
                const serviceTime = new Date(service.timestamp);
                if (isNaN(serviceTime.getTime())) {
                    inconsistencies.push(`${serviceName}: Timestamp inválido`);
                } else {
                    const now = new Date();
                    const timeDiff = now - serviceTime;
                    
                    if (timeDiff < 0) {
                        warnings.push(`${serviceName}: Timestamp en el futuro`);
                    } else if (timeDiff > 120000) { // 2 minutos
                        warnings.push(`${serviceName}: Datos desactualizados (${Math.round(timeDiff/1000)}s)`);
                    }
                }
                
                // Validar coherencia entre estado y mensaje
                if (service.status === 'operational' && 
                    service.message.toLowerCase().includes('error')) {
                    warnings.push(`${serviceName}: Estado operacional pero mensaje sugiere error`);
                }
                
                if (service.status === 'error' && 
                    service.message.toLowerCase().includes('operacional')) {
                    warnings.push(`${serviceName}: Estado error pero mensaje sugiere operacional`);
                }
                
            } catch (error) {
                inconsistencies.push(`${serviceName}: Error en validación - ${error.message}`);
            }
        });
        
        // Validar estado general vs servicios individuales
        const errorCount = Object.values(services).filter(s => s.status === 'error').length;
        const warningCount = Object.values(services).filter(s => s.status === 'warning').length;
        
        let calculatedStatus = 'healthy';
        if (errorCount > 0) {
            calculatedStatus = 'degraded';
        } else if (warningCount > 0) {
            calculatedStatus = 'warning';
        }
        
        if (data.overallStatus !== calculatedStatus) {
            warnings.push(`Estado general inconsistente: Servidor="${data.overallStatus}", Cálculo="${calculatedStatus}"`);
        }
        
        // Mostrar advertencias si existen
        if (warnings.length > 0) {
            console.warn('⚠️ Advertencias de consistencia:', warnings);
        }
        
        if (inconsistencies.length > 0) {
            console.error('❌ Inconsistencias críticas:', inconsistencies);
            
            // Si hay inconsistencias críticas, forzar recarga
            setTimeout(() => {
                console.log('🔄 Forzando recarga debido a inconsistencias...');
                this.loadSystemStatus();
            }, 10000);
        } else {
            console.log('✅ Todos los estados son coherentes');
        }
        
        return { warnings, inconsistencies };
    }

    updateErrorBadge() {
        const errorBadge = document.querySelector('.system-error-badge');
        if (!errorBadge) return;
        
        if (this.errorCount > 0) {
            errorBadge.textContent = this.errorCount;
            errorBadge.style.display = 'inline-block';
            errorBadge.classList.add('has-errors');
        } else {
            errorBadge.style.display = 'none';
            errorBadge.classList.remove('has-errors');
        }
    }

    showLoadingState() {
        const statusItems = document.querySelectorAll('.status-item');
        
        statusItems.forEach(item => {
            const statusValue = item.querySelector('.status-value');
            const icon = item.querySelector('i');
            
            if (statusValue) {
                statusValue.textContent = 'Verificando...';
            }
            
            if (icon) {
                icon.className = 'fas fa-spinner fa-spin';
                icon.style.color = '#6b7280';
            }
            
            item.className = 'status-item status-item--loading';
        });
        
        const updateTime = document.querySelector('.status-update-time');
        if (updateTime) {
            updateTime.textContent = 'Actualizando...';
            updateTime.style.color = '#f59e0b';
        }
        
        // Actualizar contador de tiempo
        this.startUpdateTimer();
    }

    startUpdateTimer() {
        const startTime = Date.now();
        const timerElement = document.querySelector('.update-timer');
        
        if (!timerElement) return;
        
        const timerInterval = setInterval(() => {
            const elapsed = Date.now() - startTime;
            timerElement.textContent = `${Math.floor(elapsed / 1000)}s`;
            
            if (elapsed > 30000) { // 30 segundos
                timerElement.style.color = '#ef4444';
            } else if (elapsed > 10000) { // 10 segundos
                timerElement.style.color = '#f59e0b';
            }
        }, 1000);
        
        // Limpiar intervalo después de 60 segundos
        setTimeout(() => clearInterval(timerInterval), 60000);
    }

    showErrorState(error) {
        const statusItems = document.querySelectorAll('.status-item');
        
        statusItems.forEach(item => {
            const statusValue = item.querySelector('.status-value');
            const icon = item.querySelector('i');
            
            if (statusValue) {
                statusValue.textContent = 'Error de conexión';
            }
            
            item.className = 'status-item status-item--error';
            
            if (icon) {
                icon.className = 'fas fa-exclamation-triangle';
                icon.style.color = '#ef4444';
            }
            
            // Agregar tooltip con el error
            item.title = `Error: ${error.message || 'No se pudo conectar al servidor'}`;
            item.style.cursor = 'help';
        });
        
        // Solo mostrar toast si es el primer error o cada 5 errores
        if (this.errorCount === 1 || this.errorCount % 5 === 0) {
            this.showToast(`Error de verificación: ${error.message || 'Servidor no disponible'}`, 'error');
        }
        
        const updateTime = document.querySelector('.status-update-time');
        if (updateTime) {
            const now = new Date();
            updateTime.textContent = `Error: ${now.toLocaleTimeString()}`;
            updateTime.style.color = '#ef4444';
            updateTime.title = `Último error: ${error.message}`;
        }
        
        // Actualizar estado general
        const statusHeader = document.querySelector('.support-panel__header');
        if (statusHeader) {
            let statusIndicator = statusHeader.querySelector('.overall-status-indicator');
            if (!statusIndicator) {
                statusIndicator = document.createElement('span');
                statusIndicator.className = 'overall-status-indicator';
                statusHeader.appendChild(statusIndicator);
            }
            
            statusIndicator.innerHTML = '<i class="fas fa-times-circle"></i> Sistema no disponible';
            statusIndicator.className = 'overall-status-indicator overall-status--error';
            statusIndicator.title = `Error: ${error.message || 'No se pudo conectar al servidor'}`;
        }
    }

    renderSystemStatus(data) {
        console.log('🎨 Renderizando estado REAL del sistema:', {
            overall: data.overallStatus,
            servicesCount: Object.keys(data.services || {}).length
        });
        
        // Renderizar cada servicio
        if (data.services) {
            this.updateServiceStatus('Sistema Principal', data.services.system);
            this.updateServiceStatus('Base de Datos', data.services.database);
            this.updateServiceStatus('Almacenamiento Cloud', data.services.cloudStorage);
            this.updateServiceStatus('Servicio de Email', data.services.emailService);
        }
        
        this.updateTimestamp(data.timestamp);
        this.updateOverallStatus(data.overallStatus, data.services || {});
        
        // Guardar en variable global para depuración
        window.lastSystemStatus = {
            data,
            timestamp: new Date().toISOString(),
            renderedAt: Date.now()
        };
        
        console.log('📊 Estado final renderizado:', {
            overall: data.overallStatus,
            database: data.services?.database?.status,
            system: data.services?.system?.status,
            cloud: data.services?.cloudStorage?.status,
            email: data.services?.emailService?.status
        });
    }

    updateServiceStatus(label, serviceData) {
        if (!serviceData) {
            console.warn(`⚠️ No hay datos para el servicio: ${label}`);
            return;
        }
        
        const statusItems = document.querySelectorAll('.status-item');
        
        statusItems.forEach(item => {
            const statusLabel = item.querySelector('.status-label');
            if (statusLabel && statusLabel.textContent === label) {
                const statusValue = item.querySelector('.status-value');
                const icon = item.querySelector('i');
                
                // Actualizar texto del estado
                if (statusValue) {
                    statusValue.textContent = serviceData.message || 'Estado desconocido';
                }
                
                // Limpiar clases existentes
                item.className = 'status-item';
                
                // Determinar clase CSS, icono y color según estado
                let statusClass = '';
                let statusIcon = '';
                let statusColor = '';
                
                switch (serviceData.status) {
                    case 'operational':
                        statusClass = 'status-item--operational';
                        statusIcon = 'fa-check-circle';
                        statusColor = '#10b981';
                        break;
                    case 'warning':
                        statusClass = 'status-item--warning';
                        statusIcon = 'fa-exclamation-circle';
                        statusColor = '#f59e0b';
                        break;
                    case 'error':
                        statusClass = 'status-item--error';
                        statusIcon = 'fa-exclamation-triangle';
                        statusColor = '#ef4444';
                        break;
                    case 'maintenance':
                        statusClass = 'status-item--maintenance';
                        statusIcon = 'fa-tools';
                        statusColor = '#8b5cf6';
                        break;
                    default:
                        statusClass = 'status-item--unknown';
                        statusIcon = 'fa-question-circle';
                        statusColor = '#6b7280';
                }
                
                // Aplicar clases
                item.classList.add(statusClass);
                
                // Actualizar icono
                if (icon) {
                    icon.className = `fas ${statusIcon}`;
                    icon.style.color = statusColor;
                }
                
                // Configurar tooltip con detalles
                let tooltipText = `${label}\nEstado: ${serviceData.status}\n\n${serviceData.message}`;
                
                if (serviceData.details) {
                    if (typeof serviceData.details === 'object') {
                        tooltipText += '\n\nDetalles:\n';
                        Object.entries(serviceData.details).forEach(([key, value]) => {
                            if (typeof value === 'object') {
                                tooltipText += `${key}: ${JSON.stringify(value)}\n`;
                            } else {
                                tooltipText += `${key}: ${value}\n`;
                            }
                        });
                    } else {
                        tooltipText += `\n\nDetalles: ${serviceData.details}`;
                    }
                }
                
                item.title = tooltipText;
                item.style.cursor = 'pointer';
                
                // Configurar evento para mostrar detalles completos
                item.addEventListener('click', (e) => {
                    if (e.target.tagName !== 'BUTTON' && !e.target.closest('button')) {
                        this.showServiceDetails(serviceData);
                    }
                });
            }
        });
    }

showServiceDetails(service) {
    console.log('🔍 Mostrando detalles del servicio:', service.name);
    
    // Eliminar modal existente si hay
    const existingModal = document.getElementById('serviceDetailsModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Crear nuevo modal usando tus clases CSS
    const detailsModal = document.createElement('div');
    detailsModal.id = 'serviceDetailsModal';
    detailsModal.className = 'modal';
    
    // 🔥 CORRECCIÓN: NO agregar el listener de click aquí todavía
    
    // Determinar clase según estado
    let statusClass = '';
    let statusIcon = '';
    let statusColor = '';
    
    switch (service.status) {
        case 'operational':
            statusClass = 'operational';
            statusIcon = 'fa-check-circle';
            statusColor = '#10b981';
            break;
        case 'warning':
            statusClass = 'warning';
            statusIcon = 'fa-exclamation-circle';
            statusColor = '#f59e0b';
            break;
        case 'error':
            statusClass = 'error';
            statusIcon = 'fa-exclamation-triangle';
            statusColor = '#ef4444';
            break;
        case 'maintenance':
            statusClass = 'maintenance';
            statusIcon = 'fa-tools';
            statusColor = '#8b5cf6';
            break;
        default:
            statusClass = 'unknown';
            statusIcon = 'fa-question-circle';
            statusColor = '#6b7280';
    }
    
    // Formatear detalles para tablas
    let detailsHTML = '';
    if (service.details && typeof service.details === 'object') {
        detailsHTML = Object.entries(service.details)
            .filter(([key, value]) => value !== null && value !== undefined && value !== '')
            .map(([key, value]) => {
                const formattedKey = key
                    .replace(/([A-Z])/g, ' $1')
                    .replace(/^./, str => str.toUpperCase())
                    .replace(/_/g, ' ');
                
                let valueCell = '';
                
                if (typeof value === 'object' && value !== null) {
                    // Para objetos anidados
                    valueCell = `<pre style="margin: 0; padding: 8px; background: var(--bg-tertiary); border-radius: 4px; font-size: 12px; max-height: 200px; overflow-y: auto;">${JSON.stringify(value, null, 2)}</pre>`;
                } else if (typeof value === 'boolean') {
                    // Para booleanos
                    valueCell = value 
                        ? '<span style="color: #10b981;"><i class="fas fa-check-circle"></i> Sí</span>' 
                        : '<span style="color: #ef4444;"><i class="fas fa-times-circle"></i> No</span>';
                } else if (key.toLowerCase().includes('url') || key.toLowerCase().includes('link')) {
                    // Para URLs
                    valueCell = `<a href="${value}" target="_blank" rel="noopener noreferrer" style="color: #3b82f6; text-decoration: none; word-break: break-all;">
                        <i class="fas fa-external-link-alt"></i> ${value}
                    </a>`;
                } else if (typeof value === 'string' && value.length > 100) {
                    // Texto largo
                    valueCell = `<div style="max-height: 100px; overflow-y: auto; padding: 4px;">${value}</div>`;
                } else {
                    // Valor normal
                    valueCell = value;
                }
                
                return `
                <tr>
                    <td style="padding: 12px 16px; border-bottom: 1px solid var(--border); font-weight: 600; color: var(--text-secondary); background: var(--bg-tertiary); vertical-align: top; min-width: 150px;">
                        ${formattedKey}
                    </td>
                    <td style="padding: 12px 16px; border-bottom: 1px solid var(--border); color: var(--text-primary); word-break: break-word;">
                        ${valueCell}
                    </td>
                </tr>`;
            })
            .join('');
    } else if (service.details) {
        detailsHTML = `
        <tr>
            <td colspan="2" style="padding: 12px 16px; border-bottom: 1px solid var(--border);">
                ${service.details}
            </td>
        </tr>`;
    }
    
    // Plantilla del modal
    detailsModal.innerHTML = `
        <div class="modal__content">
            <div class="modal__header">
                <h2 class="modal__title">
                    <i class="fas ${statusIcon}" style="color: ${statusColor}; margin-right: 10px;"></i>
                    ${service.name}
                </h2>
                <button class="modal__close" aria-label="Cerrar detalles" id="closeModalBtn">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            
            <div class="modal__body">
                <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 20px; padding: 15px; background: var(--bg-tertiary); border-radius: 8px;">
                    <div class="service-status-badge status-${service.status}" style="display: inline-block; padding: 8px 16px; border-radius: 20px; font-size: 14px; font-weight: 600; background: ${statusColor}20; color: ${statusColor}; border: 1px solid ${statusColor}40;">
                        ${service.status.toUpperCase()}
                    </div>
                    
                    <div style="flex: 1;">
                        <p style="margin: 0; color: var(--text-primary); font-size: 15px; line-height: 1.5;">
                            ${service.message}
                        </p>
                        
                        ${service.timestamp ? `
                        <div style="margin-top: 8px; font-size: 13px; color: var(--text-secondary); display: flex; align-items: center; gap: 6px;">
                            <i class="far fa-clock"></i>
                            Actualizado: ${new Date(service.timestamp).toLocaleString()}
                        </div>
                        ` : ''}
                    </div>
                </div>
                
                ${detailsHTML ? `
                <div style="margin-top: 25px;">
                    <h3 style="margin: 0 0 15px 0; color: var(--text-primary); font-size: 16px; font-weight: 600; display: flex; align-items: center; gap: 10px;">
                        <i class="fas fa-info-circle"></i>
                        Detalles Técnicos
                    </h3>
                    
                    <div style="background: var(--bg-primary); border-radius: 8px; border: 1px solid var(--border); overflow: hidden;">
                        <table style="width: 100%; border-collapse: collapse;">
                            <tbody>${detailsHTML}</tbody>
                        </table>
                    </div>
                </div>
                ` : ''}
                
                ${service.recommendations ? `
                <div style="margin-top: 25px; padding: 20px; background: ${statusColor}10; border-radius: 8px; border-left: 4px solid ${statusColor};">
                    <h3 style="margin: 0 0 12px 0; color: ${statusColor}; font-size: 16px; font-weight: 600; display: flex; align-items: center; gap: 10px;">
                        <i class="fas fa-lightbulb"></i>
                        Recomendaciones
                    </h3>
                    
                    <ul style="margin: 0; padding-left: 20px; color: var(--text-primary);">
                        ${Array.isArray(service.recommendations) 
                            ? service.recommendations.map(rec => `<li style="margin-bottom: 8px; line-height: 1.5;">${rec}</li>`).join('')
                            : `<li style="margin-bottom: 8px; line-height: 1.5;">${service.recommendations}</li>`}
                    </ul>
                </div>
                ` : ''}
            </div>
            
            <div class="modal__footer">
                <button class="btn btn--sm btn--outline" id="refreshServiceBtn" style="display: flex; align-items: center; gap: 8px;">
                    <i class="fas fa-sync-alt"></i>
                    Actualizar Estado
                </button>
                <button class="btn btn--sm" id="closeModalBtn2" style="background: ${statusColor}; color: white;">
                    Cerrar
                </button>
            </div>
        </div>
    `;
    
    // Agregar al DOM
    document.body.appendChild(detailsModal);
    
    // 🔥 CORRECCIÓN: Ahora agregar el listener, PERO con setTimeout
    setTimeout(() => {
        detailsModal.setAttribute('open', '');
        detailsModal.style.display = 'flex';
        
        // Ahora sí agregar el listener de click en el overlay
        detailsModal.addEventListener('click', (e) => {
            if (e.target === detailsModal) {
                this.closeServiceDetails();
            }
        });
        
        // Agregar clase al body
        document.body.classList.add('details-modal-open');
        document.body.style.overflow = 'hidden';
    }, 10);
    
    // Event listeners para botones
    const closeModalBtn = detailsModal.querySelector('#closeModalBtn');
    const closeModalBtn2 = detailsModal.querySelector('#closeModalBtn2');
    const refreshServiceBtn = detailsModal.querySelector('#refreshServiceBtn');
    
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // 🔥 Importante: prevenir propagación
            this.closeServiceDetails();
        });
    }
    
    if (closeModalBtn2) {
        closeModalBtn2.addEventListener('click', (e) => {
            e.stopPropagation(); // 🔥 Importante: prevenir propagación
            this.closeServiceDetails();
        });
    }
    
    if (refreshServiceBtn) {
        refreshServiceBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // 🔥 Importante: prevenir propagación
            this.loadSystemStatus();
            this.closeServiceDetails();
            this.showToast('Actualizando estado del sistema...', 'info');
        });
    }
    
    // ESC para cerrar
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && detailsModal.style.display === 'flex') {
            this.closeServiceDetails();
        }
    });
    
    // Foco en el botón de cerrar
    setTimeout(() => {
        if (closeModalBtn) {
            closeModalBtn.focus();
        }
    }, 100);
    
    console.log('✅ Modal de detalles mostrado correctamente');
}

    closeServiceDetails() {
        const detailsModal = document.getElementById('serviceDetailsModal');
        if (!detailsModal) return;
        
        detailsModal.style.opacity = '0';
        
        setTimeout(() => {
            detailsModal.style.display = 'none';
            document.body.classList.remove('details-modal-open');
        }, 300);
    }

    updateTimestamp(timestamp) {
        const updateTime = document.querySelector('.status-update-time');
        if (!updateTime) return;
        
        try {
            const date = new Date(timestamp);
            
            if (isNaN(date.getTime())) {
                throw new Error('Timestamp inválido');
            }
            
            const now = new Date();
            const diffMs = now - date;
            const diffSec = Math.floor(diffMs / 1000);
            
            let timeText = `Actualizado: ${date.toLocaleTimeString()}`;
            let timeColor = '#6b7280';
            
            if (diffSec < 30) {
                timeColor = '#10b981';
                timeText += ' (reciente)';
            } else if (diffSec < 60) {
                timeColor = '#f59e0b';
                timeText += ` (hace ${diffSec}s)`;
            } else if (diffSec < 300) { // 5 minutos
                timeColor = '#f59e0b';
                const diffMin = Math.floor(diffSec / 60);
                timeText += ` (hace ${diffMin}min)`;
            } else {
                timeColor = '#ef4444';
                const diffMin = Math.floor(diffSec / 60);
                timeText += ` (hace ${diffMin}min)`;
            }
            
            updateTime.textContent = timeText;
            updateTime.style.color = timeColor;
            
            // Tooltip con fecha completa
            updateTime.title = `Fecha completa: ${date.toLocaleString()}`;
            
        } catch (error) {
            updateTime.textContent = 'Actualizado: --';
            updateTime.style.color = '#ef4444';
            updateTime.title = 'Error en timestamp';
        }
    }

updateOverallStatus(overallStatus, services) {
    console.log('🎯 Actualizando estado general...');
    
    const statusHeader = document.querySelector('.support-panel__header');
    if (!statusHeader) {
        console.warn('❌ No se encontró el header del estado del sistema');
        return;
    }
    
    if (!services || typeof services !== 'object') {
        console.warn('⚠️ No hay servicios para calcular estado general');
        return;
    }
    
    // Calcular estado basado en servicios individuales
    const serviceArray = Object.values(services);
    const errorCount = serviceArray.filter(s => s.status === 'error').length;
    const warningCount = serviceArray.filter(s => s.status === 'warning').length;
    const maintenanceCount = serviceArray.filter(s => s.status === 'maintenance').length;
    
    // Determinar estado calculado
    let calculatedStatus = 'healthy';
    let calculatedStatusText = '';
    
    if (errorCount > 0) {
        calculatedStatus = 'degraded';
        calculatedStatusText = `${errorCount} error(es)`;
    } else if (warningCount > 0) {
        calculatedStatus = 'warning';
        calculatedStatusText = `${warningCount} advertencia(s)`;
    } else if (maintenanceCount > 0) {
        calculatedStatus = 'maintenance';
        calculatedStatusText = `${maintenanceCount} en mantenimiento`;
    } else {
        calculatedStatus = 'healthy';
        calculatedStatusText = 'Todos los sistemas operativos';
    }
    
    // Comparar con estado del servidor
    if (overallStatus !== calculatedStatus) {
        console.warn(`⚠️ Estado general: Servidor="${overallStatus}", Cálculo="${calculatedStatus}"`);
    }
    
    // Usar el estado calculado (más confiable)
    const finalStatus = calculatedStatus;
    const finalStatusText = calculatedStatusText;
    
    // 1. LIMPIAR cualquier indicador anterior en el header
    const existingHeaderIndicator = statusHeader.querySelector('.overall-status-indicator');
    if (existingHeaderIndicator) {
        existingHeaderIndicator.remove();
    }
    
    // 2. Crear el indicador para el contenedor en el header (botón pequeño)
    const overallStatusContainer = document.getElementById('overallStatusContainer');
    if (overallStatusContainer) {
        // Limpiar contenedor primero
        overallStatusContainer.innerHTML = '';
        
        const headerIndicator = document.createElement('div');
        headerIndicator.className = 'overall-status-indicator overall-status-indicator--compact';
        
        switch (finalStatus) {
            case 'healthy':
                headerIndicator.innerHTML = `<i class="fas fa-check-circle"></i>`;
                headerIndicator.className = 'overall-status-indicator overall-status-indicator--compact overall-status--healthy';
                headerIndicator.title = 'Todos los sistemas operativos';
                break;
            case 'warning':
                headerIndicator.innerHTML = `<i class="fas fa-exclamation-triangle"></i>`;
                headerIndicator.className = 'overall-status-indicator overall-status-indicator--compact overall-status--warning';
                headerIndicator.title = `Sistema con advertencias (${warningCount})`;
                break;
            case 'degraded':
                headerIndicator.innerHTML = `<i class="fas fa-times-circle"></i>`;
                headerIndicator.className = 'overall-status-indicator overall-status-indicator--compact overall-status--error';
                headerIndicator.title = `Sistema con problemas (${errorCount} errores)`;
                break;
            case 'maintenance':
                headerIndicator.innerHTML = `<i class="fas fa-tools"></i>`;
                headerIndicator.className = 'overall-status-indicator overall-status-indicator--compact overall-status--maintenance';
                headerIndicator.title = `En mantenimiento (${maintenanceCount} servicios)`;
                break;
            default:
                headerIndicator.innerHTML = `<i class="fas fa-question-circle"></i>`;
                headerIndicator.className = 'overall-status-indicator overall-status-indicator--compact overall-status--unknown';
                headerIndicator.title = 'Estado desconocido';
        }
        
        overallStatusContainer.appendChild(headerIndicator);
    }
    
    // 3. Actualizar la sección de resumen general (debajo de los servicios)
    const overallStatusSummary = document.getElementById('overallStatusSummary');
    if (overallStatusSummary) {
        overallStatusSummary.innerHTML = '';
        
        const summaryElement = document.createElement('div');
        summaryElement.className = `overall-status-summary__content overall-status-summary--${finalStatus}`;
        
        switch (finalStatus) {
            case 'healthy':
                summaryElement.innerHTML = `
                    <div class="overall-status-summary__icon">
                        <i class="fas fa-check-circle"></i>
                    </div>
                    <div class="overall-status-summary__text">
                        <strong>Todos los sistemas operativos</strong>
                        <small>Todos los servicios están funcionando correctamente</small>
                    </div>
                `;
                break;
            case 'warning':
                summaryElement.innerHTML = `
                    <div class="overall-status-summary__icon">
                        <i class="fas fa-exclamation-triangle"></i>
                    </div>
                    <div class="overall-status-summary__text">
                        <strong>Sistema con advertencias</strong>
                        <small>${warningCount} servicio(s) requieren atención</small>
                    </div>
                    <div class="overall-status-summary__badge">
                        ${warningCount}
                    </div>
                `;
                break;
            case 'degraded':
                summaryElement.innerHTML = `
                    <div class="overall-status-summary__icon">
                        <i class="fas fa-times-circle"></i>
                    </div>
                    <div class="overall-status-summary__text">
                        <strong>Sistema con problemas</strong>
                        <small>${errorCount} servicio(s) con errores críticos</small>
                    </div>
                    <div class="overall-status-summary__badge overall-status-summary__badge--error">
                        ${errorCount}
                    </div>
                `;
                break;
            case 'maintenance':
                summaryElement.innerHTML = `
                    <div class="overall-status-summary__icon">
                        <i class="fas fa-tools"></i>
                    </div>
                    <div class="overall-status-summary__text">
                        <strong>En mantenimiento</strong>
                        <small>${maintenanceCount} servicio(s) en mantenimiento programado</small>
                    </div>
                    <div class="overall-status-summary__badge overall-status-summary__badge--maintenance">
                        ${maintenanceCount}
                    </div>
                `;
                break;
            default:
                summaryElement.innerHTML = `
                    <div class="overall-status-summary__icon">
                        <i class="fas fa-question-circle"></i>
                    </div>
                    <div class="overall-status-summary__text">
                        <strong>Estado desconocido</strong>
                        <small>No se pudo determinar el estado del sistema</small>
                    </div>
                `;
        }
        
        overallStatusSummary.appendChild(summaryElement);
    }
    
    // 4. Actualizar contadores
    this.updateStatusCounters(errorCount, warningCount, maintenanceCount);
    
    console.log('✅ Estado general actualizado:', {
        status: finalStatus,
        text: finalStatusText,
        errors: errorCount,
        warnings: warningCount,
        maintenance: maintenanceCount
    });
}

    updateStatusCounters(errorCount, warningCount, maintenanceCount) {
        // Actualizar contadores en la interfaz si existen
        const errorCounter = document.querySelector('.error-counter');
        const warningCounter = document.querySelector('.warning-counter');
        const maintenanceCounter = document.querySelector('.maintenance-counter');
        
        if (errorCounter) {
            errorCounter.textContent = errorCount;
            errorCounter.style.display = errorCount > 0 ? 'inline-block' : 'none';
        }
        
        if (warningCounter) {
            warningCounter.textContent = warningCount;
            warningCounter.style.display = warningCount > 0 ? 'inline-block' : 'none';
        }
        
        if (maintenanceCounter) {
            maintenanceCounter.textContent = maintenanceCount;
            maintenanceCounter.style.display = maintenanceCount > 0 ? 'inline-block' : 'none';
        }
    }

    startAutoUpdate() {
        // Limpiar intervalo existente
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            console.log('⏹️ Auto-actualización anterior detenida');
        }
        
        console.log(`⏱️ Configurando auto-actualización REAL cada ${this.updateFrequency / 1000} segundos`);
        
        this.updateInterval = setInterval(() => {
            console.log('🔄 Auto-actualización iniciada');
            this.loadSystemStatus();
        }, this.updateFrequency);
        
        // También configurar para reiniciar el intervalo si hay inactividad
        this.setupInactivityReset();
    }

    setupInactivityReset() {
        // Reiniciar intervalo después de inactividad prolongada
        let inactivityTimer;
        const resetInactivity = () => {
            clearTimeout(inactivityTimer);
            inactivityTimer = setTimeout(() => {
                console.log('⏰ Reactivando después de inactividad');
                this.startAutoUpdate();
            }, 300000); // 5 minutos de inactividad
        };
        
        // Resetear en eventos de usuario
        ['mousemove', 'keypress', 'click', 'scroll'].forEach(event => {
            document.addEventListener(event, resetInactivity);
        });
        
        resetInactivity();
    }

    stopAutoUpdate() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
            console.log('⏹️ Auto-actualización detenida');
        }
    }

    adjustUpdateFrequency(frequency) {
        if (frequency >= 10000 && frequency <= 300000) { // 10 segundos a 5 minutos
            this.updateFrequency = frequency;
            this.startAutoUpdate();
            console.log(`📊 Frecuencia de actualización ajustada a ${frequency / 1000} segundos`);
            return true;
        }
        return false;
    }

    showToast(message, type = 'info') {
        // Crear contenedor si no existe
        let toastContainer = document.getElementById('system-status-toast');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.id = 'system-status-toast';
            toastContainer.className = 'toast-container';
            document.body.appendChild(toastContainer);
        }
        
        // Crear toast
        const toast = document.createElement('div');
        toast.className = `toast toast--${type}`;
        toast.innerHTML = `
            <div class="toast-content">
                <i class="fas fa-${this.getToastIcon(type)}"></i>
                <span>${message}</span>
            </div>
            <button class="toast-close" aria-label="Cerrar notificación">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        toastContainer.appendChild(toast);
        
        // Mostrar con animación
        setTimeout(() => {
            toast.classList.add('show');
        }, 10);
        
        // Auto-eliminar después de 5 segundos
        const removeToast = () => {
            toast.classList.remove('show');
            toast.classList.add('hide');
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.remove();
                }
            }, 300);
        };
        
        setTimeout(removeToast, 5000);
        
        // Cerrar manualmente
        toast.querySelector('.toast-close').addEventListener('click', removeToast);
        
        // También cerrar al hacer clic en el toast
        toast.addEventListener('click', (e) => {
            if (!e.target.closest('.toast-close')) {
                removeToast();
            }
        });
    }

    getToastIcon(type) {
        const icons = {
            'success': 'check-circle',
            'error': 'exclamation-circle',
            'warning': 'exclamation-triangle',
            'info': 'info-circle'
        };
        return icons[type] || 'info-circle';
    }

    // Métodos para diagnóstico
    async runDiagnostics() {
        console.group('🩺 DIAGNÓSTICO DEL SISTEMA');
        
        try {
            const status = await api.getSystemStatus(true); // Forzar refresh
            
            console.log('📊 Estado obtenido:', {
                success: status.success,
                overallStatus: status.overallStatus,
                services: Object.keys(status.services || {}).length
            });
            
            // Verificar cada servicio
            if (status.services) {
                Object.entries(status.services).forEach(([key, service]) => {
                    console.log(`🔍 ${key}:`, {
                        status: service.status,
                        message: service.message,
                        timestamp: service.timestamp
                    });
                });
            }
            
            // Verificar conectividad
            const connectivityTest = await this.testConnectivity();
            console.log('📡 Prueba de conectividad:', connectivityTest);
            
            // Verificar caché
            console.log('💾 Estado de caché:', {
                hasCache: !!api.systemStatusCache?.data,
                cacheAge: api.systemStatusCache?.timestamp 
                    ? Date.now() - api.systemStatusCache.timestamp 
                    : null
            });
            
            console.groupEnd();
            
            return {
                systemStatus: status,
                connectivity: connectivityTest,
                cache: {
                    hasData: !!api.systemStatusCache?.data,
                    age: api.systemStatusCache?.timestamp 
                        ? Math.floor((Date.now() - api.systemStatusCache.timestamp) / 1000) 
                        : null
                }
            };
            
        } catch (error) {
            console.error('❌ Error en diagnóstico:', error);
            console.groupEnd();
            throw error;
        }
    }

    async testConnectivity() {
        const tests = [];
        const baseURL = api.baseURL;
        
        // Test 1: Endpoint de health
        try {
            const start = Date.now();
            const response = await fetch(`${baseURL}/health`);
            const time = Date.now() - start;
            
            tests.push({
                endpoint: '/health',
                status: response.status,
                ok: response.ok,
                responseTime: time,
                success: response.ok
            });
        } catch (error) {
            tests.push({
                endpoint: '/health',
                error: error.message,
                success: false
            });
        }
        
        // Test 2: Endpoint de status
        try {
            const start = Date.now();
            const response = await fetch(`${baseURL}/support/status`);
            const time = Date.now() - start;
            
            tests.push({
                endpoint: '/support/status',
                status: response.status,
                ok: response.ok,
                responseTime: time,
                success: response.ok
            });
        } catch (error) {
            tests.push({
                endpoint: '/support/status',
                error: error.message,
                success: false
            });
        }
        
        // Calcular estadísticas
        const successfulTests = tests.filter(t => t.success);
        const successRate = tests.length > 0 ? (successfulTests.length / tests.length) * 100 : 0;
        const avgResponseTime = successfulTests.length > 0 
            ? successfulTests.reduce((sum, t) => sum + t.responseTime, 0) / successfulTests.length 
            : 0;
        
        return {
            tests,
            statistics: {
                totalTests: tests.length,
                successfulTests: successfulTests.length,
                failedTests: tests.length - successfulTests.length,
                successRate: Math.round(successRate),
                avgResponseTime: Math.round(avgResponseTime)
            },
            overall: successRate >= 50 ? 'healthy' : 'degraded'
        };
    }

    // Método para exportar datos de estado
    exportStatusData() {
        const data = {
            currentStatus: this.systemStatus,
            errorCount: this.errorCount,
            updateFrequency: this.updateFrequency,
            lastUpdate: this.systemStatus?.timestamp,
            diagnostics: {
                userAgent: navigator.userAgent,
                online: navigator.onLine,
                timestamp: new Date().toISOString()
            }
        };
        
        // Crear blob para descarga
        const blob = new Blob([JSON.stringify(data, null, 2)], { 
            type: 'application/json' 
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `system-status-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        console.log('📥 Datos de estado exportados');
        this.showToast('Datos de estado exportados', 'success');
    }

    // Método para reiniciar módulo
    restart() {
        console.log('🔄 Reiniciando módulo de estado del sistema');
        this.stopAutoUpdate();
        this.errorCount = 0;
        this.systemStatus = null;
        api.clearSystemStatusCache();
        this.init();
        this.showToast('Módulo reiniciado', 'info');
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 DOM cargado, inicializando SystemStatusModule REAL');
    
    // Verificar si estamos en la página correcta
    const hasStatusElement = document.querySelector('.system-status') || 
                            document.querySelector('.status-item') ||
                            document.querySelector('.support-panel__header');
    
    if (hasStatusElement) {
        console.log('✅ Elementos de estado encontrados, inicializando módulo');
        
        try {
            window.systemStatusModule = new SystemStatusModule();
            console.log('✅ SystemStatusModule REAL listo para uso');
            
            // Exponer métodos útiles para depuración
            window.systemStatus = {
                getStatus: () => window.systemStatusModule?.systemStatus,
                refresh: () => window.systemStatusModule?.loadSystemStatus(),
                diagnostics: () => window.systemStatusModule?.runDiagnostics(),
                exportData: () => window.systemStatusModule?.exportStatusData(),
                restart: () => window.systemStatusModule?.restart()
            };
            
            console.log('🔧 Métodos disponibles en window.systemStatus:');
            console.log('- systemStatus.getStatus() - Obtener estado actual');
            console.log('- systemStatus.refresh() - Forzar actualización');
            console.log('- systemStatus.diagnostics() - Ejecutar diagnóstico');
            console.log('- systemStatus.exportData() - Exportar datos');
            console.log('- systemStatus.restart() - Reiniciar módulo');
            
        } catch (error) {
            console.error('❌ Error inicializando SystemStatusModule REAL:', error);
            
            // Mostrar error en la interfaz
            const statusContainer = document.querySelector('.system-status');
            if (statusContainer) {
                statusContainer.innerHTML = `
                    <div class="status-error">
                        <i class="fas fa-exclamation-triangle"></i>
                        <div class="error-message">
                            <strong>Error inicializando módulo de estado</strong>
                            <small>${error.message}</small>
                        </div>
                        <button class="btn btn--sm btn--outline" onclick="location.reload()">
                            Reintentar
                        </button>
                    </div>
                `;
            }
        }
    } else {
        console.log('ℹ️ No se encontraron elementos de estado en esta página');
    }
});

export default SystemStatusModule;