// settings.js - Módulo completo para la gestión de ajustes
import { showAlert, showConfirmModal } from '../utils.js';

class SettingsManager {
    constructor() {
        this.settings = {
            appearance: {
                theme: 'auto', // 'light', 'dark', 'auto'
                interfaceDensity: 'comfortable', // 'compact', 'comfortable', 'spacious'
            },
            preferences: {
                language: 'es',
                timezone: 'America/Mexico_City',
                dateFormat: 'dd/mm/yyyy',
            },
            notifications: {
                emailNotifications: true,
                pushNotifications: true,
                taskReminders: true,
                documentAlerts: true,
            },
            accessibility: {
                highContrast: false,
                largeFont: false,
                reducedMotion: false,
                fontSize: 16,
            },
            privacy: {
                autoLogout: true,
                autoLogoutTime: 30, // minutos
                cookieConsent: true,
            }
        };
        
        this.initialize();
    }

    /**
     * Inicializar el gestor de ajustes
     */
    initialize() {
        console.log('🔧 Inicializando SettingsManager...');
        this.loadSettings();
        this.setupEventListeners();
        this.applySettings();
        this.updateForm();
        console.log('✅ SettingsManager inicializado correctamente');
    }

    /**
     * Cargar ajustes desde localStorage
     */
    loadSettings() {
        const savedSettings = localStorage.getItem('cbtis051_settings');
        if (savedSettings) {
            try {
                this.settings = JSON.parse(savedSettings);
                console.log('📂 Ajustes cargados desde localStorage');
            } catch (error) {
                console.error('❌ Error cargando ajustes:', error);
                this.saveSettings(); // Guardar configuración por defecto
            }
        } else {
            this.saveSettings(); // Guardar configuración por defecto
        }
    }

    /**
     * Guardar ajustes en localStorage
     */
    saveSettings() {
        try {
            localStorage.setItem('cbtis051_settings', JSON.stringify(this.settings));
            console.log('💾 Ajustes guardados:', this.settings);
            return true;
        } catch (error) {
            console.error('❌ Error guardando ajustes:', error);
            showAlert('Error al guardar ajustes', 'error');
            return false;
        }
    }

    /**
     * Configurar event listeners
     */
    setupEventListeners() {
        // Formulario de ajustes
        const settingsForm = document.getElementById('settings-form');
        if (settingsForm) {
            settingsForm.addEventListener('submit', (e) => this.handleSave(e));
        }

        // Botón de restablecer
        const resetBtn = document.getElementById('reset-btn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => this.handleReset());
        }

        // Selector de densidad
        const densityBtns = document.querySelectorAll('.density-btn');
        densityBtns.forEach(btn => {
            btn.addEventListener('click', (e) => this.handleDensityChange(e));
        });

        // Control de tamaño de fuente
        const decreaseBtn = document.querySelector('.font-size-btn.decrease');
        const increaseBtn = document.querySelector('.font-size-btn.increase');
        if (decreaseBtn && increaseBtn) {
            decreaseBtn.addEventListener('click', () => this.changeFontSize(-2));
            increaseBtn.addEventListener('click', () => this.changeFontSize(2));
        }

        // Botón exportar datos
        const exportBtn = document.getElementById('export-data');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.handleExportData());
        }

        // Botón borrar datos locales
        const clearBtn = document.getElementById('clear-data');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.handleClearData());
        }

        // Botones del modal
        const modalReload = document.getElementById('modal-reload');
        const modalLater = document.getElementById('modal-later');
        const modalClose = document.querySelector('.modal-close');
        
        if (modalReload) {
            modalReload.addEventListener('click', () => window.location.reload());
        }
        if (modalLater) {
            modalLater.addEventListener('click', () => this.hideModal());
        }
        if (modalClose) {
            modalClose.addEventListener('click', () => this.hideModal());
        }

        // Detectar cambios en tiempo real
        this.setupRealTimeListeners();
    }

    /**
     * Configurar listeners para cambios en tiempo real
     */
    setupRealTimeListeners() {
        // Escuchar cambios en los controles
        const form = document.getElementById('settings-form');
        if (form) {
            // Tema
            const themeInputs = form.querySelectorAll('input[name="theme"]');
            themeInputs.forEach(input => {
                input.addEventListener('change', (e) => {
                    this.settings.appearance.theme = e.target.value;
                    this.applyTheme();
                });
            });

            // Switches
            const switches = form.querySelectorAll('input[type="checkbox"]');
            switches.forEach(switchEl => {
                switchEl.addEventListener('change', (e) => {
                    const name = e.target.name;
                    const value = e.target.checked;
                    
                    // Mapear nombres a categorías
                    if (name.startsWith('email') || name.startsWith('push') || 
                        name.startsWith('task') || name.startsWith('document')) {
                        this.settings.notifications[name] = value;
                    } else if (name.startsWith('high') || name.startsWith('large') || 
                               name.startsWith('reduced')) {
                        this.settings.accessibility[name] = value;
                        if (name === 'highContrast') this.applyAccessibility();
                        if (name === 'largeFont') this.applyAccessibility();
                        if (name === 'reducedMotion') this.applyAccessibility();
                    } else if (name.startsWith('auto') || name.startsWith('cookie')) {
                        this.settings.privacy[name] = value;
                    }
                });
            });

            // Selects
            const selects = form.querySelectorAll('select');
            selects.forEach(select => {
                select.addEventListener('change', (e) => {
                    const name = e.target.name;
                    const value = e.target.value;
                    
                    if (name === 'language') {
                        this.settings.preferences.language = value;
                    } else if (name === 'timezone') {
                        this.settings.preferences.timezone = value;
                    } else if (name === 'autoLogoutTime') {
                        this.settings.privacy.autoLogoutTime = parseInt(value);
                    }
                });
            });

            // Radio buttons
            const radios = form.querySelectorAll('input[type="radio"]');
            radios.forEach(radio => {
                radio.addEventListener('change', (e) => {
                    if (e.target.name === 'dateFormat') {
                        this.settings.preferences.dateFormat = e.target.value;
                    }
                });
            });
        }
    }

    /**
     * Manejar el guardado de ajustes
     */
    handleSave(e) {
        e.preventDefault();
        
        // Mostrar indicador de carga
        const saveBtn = document.getElementById('save-btn');
        const originalText = saveBtn.innerHTML;
        saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
        saveBtn.disabled = true;

        // Recopilar datos del formulario
        this.collectFormData();

        // Guardar en localStorage
        const success = this.saveSettings();

        // Aplicar ajustes
        if (success) {
            this.applySettings();
            
            // Mostrar modal de confirmación
            setTimeout(() => {
                this.showModal();
                saveBtn.innerHTML = originalText;
                saveBtn.disabled = false;
            }, 500);
        } else {
            saveBtn.innerHTML = originalText;
            saveBtn.disabled = false;
        }
    }

    /**
     * Recopilar datos del formulario
     */
    collectFormData() {
        const form = document.getElementById('settings-form');
        if (!form) return;

        const formData = new FormData(form);
        
        // Tema
        const theme = formData.get('theme');
        if (theme) this.settings.appearance.theme = theme;

        // Densidad
        const density = document.getElementById('interface-density').value;
        this.settings.appearance.interfaceDensity = density;

        // Preferencias
        this.settings.preferences.language = formData.get('language');
        this.settings.preferences.timezone = formData.get('timezone');
        this.settings.preferences.dateFormat = formData.get('dateFormat');

        // Notificaciones
        this.settings.notifications.emailNotifications = formData.get('emailNotifications') === 'on';
        this.settings.notifications.pushNotifications = formData.get('pushNotifications') === 'on';
        this.settings.notifications.taskReminders = formData.get('taskReminders') === 'on';
        this.settings.notifications.documentAlerts = formData.get('documentAlerts') === 'on';

        // Accesibilidad
        this.settings.accessibility.highContrast = formData.get('highContrast') === 'on';
        this.settings.accessibility.largeFont = formData.get('largeFont') === 'on';
        this.settings.accessibility.reducedMotion = formData.get('reducedMotion') === 'on';
        this.settings.accessibility.fontSize = parseInt(document.getElementById('font-size').value);

        // Privacidad
        this.settings.privacy.autoLogout = formData.get('autoLogout') === 'on';
        this.settings.privacy.autoLogoutTime = parseInt(formData.get('autoLogoutTime'));
        this.settings.privacy.cookieConsent = formData.get('cookieConsent') === 'on';
    }

    /**
     * Aplicar todos los ajustes
     */
    applySettings() {
        this.applyTheme();
        this.applyDensity();
        this.applyAccessibility();
        this.applyPrivacy();
        this.updateForm();
    }

    /**
     * Aplicar tema seleccionado
     */
    applyTheme() {
        const { theme } = this.settings.appearance;
        const body = document.body;
        
        // Remover clases de tema existentes
        body.classList.remove('light-theme', 'dark-theme');
        
        if (theme === 'auto') {
            // Detectar preferencia del sistema
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            body.classList.toggle('dark-theme', prefersDark);
            body.classList.toggle('light-theme', !prefersDark);
            
            // Escuchar cambios en la preferencia del sistema
            window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
                body.classList.toggle('dark-theme', e.matches);
                body.classList.toggle('light-theme', !e.matches);
            });
        } else {
            body.classList.add(`${theme}-theme`);
        }
        
        // Guardar tema en cookie para consistencia entre sesiones
        document.cookie = `theme=${theme}; path=/; max-age=${60*60*24*30}`;
    }

    /**
     * Aplicar densidad de interfaz
     */
    applyDensity() {
        const { interfaceDensity } = this.settings.appearance;
        const body = document.body;
        
        // Remover clases de densidad existentes
        body.classList.remove('density-compact', 'density-comfortable', 'density-spacious');
        
        // Aplicar nueva densidad
        body.classList.add(`density-${interfaceDensity}`);
        
        // Ajustar variables CSS según densidad
        const root = document.documentElement;
        switch (interfaceDensity) {
            case 'compact':
                root.style.setProperty('--spacing-md', '0.5rem');
                root.style.setProperty('--spacing-lg', '1rem');
                root.style.setProperty('--spacing-xl', '1.5rem');
                break;
            case 'comfortable':
                root.style.setProperty('--spacing-md', '1rem');
                root.style.setProperty('--spacing-lg', '1.5rem');
                root.style.setProperty('--spacing-xl', '2rem');
                break;
            case 'spacious':
                root.style.setProperty('--spacing-md', '1.5rem');
                root.style.setProperty('--spacing-lg', '2rem');
                root.style.setProperty('--spacing-xl', '2.5rem');
                break;
        }
    }

    /**
     * Aplicar ajustes de accesibilidad
     */
    applyAccessibility() {
        const { highContrast, largeFont, reducedMotion, fontSize } = this.settings.accessibility;
        const body = document.body;
        
        // Alto contraste
        body.classList.toggle('high-contrast', highContrast);
        
        // Fuente grande
        body.classList.toggle('large-font', largeFont);
        
        // Reducir animaciones
        body.classList.toggle('reduced-motion', reducedMotion);
        
        // Tamaño de fuente
        document.documentElement.style.fontSize = `${fontSize}px`;
    }

    /**
     * Aplicar ajustes de privacidad
     */
    applyPrivacy() {
        const { autoLogout, autoLogoutTime, cookieConsent } = this.settings.privacy;
        
        // Configurar auto-cierre de sesión
        if (autoLogout && autoLogoutTime > 0) {
            this.setupAutoLogout(autoLogoutTime);
        }
        
        // Mostrar aviso de cookies si está habilitado
        if (cookieConsent && !localStorage.getItem('cookie_consent')) {
            setTimeout(() => this.showCookieConsent(), 1000);
        }
    }

    /**
     * Configurar auto-cierre de sesión
     */
    setupAutoLogout(minutes) {
        let timeout;
        
        const resetTimer = () => {
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                showAlert('Sesión expirada por inactividad', 'warning');
                // Aquí podrías redirigir al login o cerrar sesión
                // window.location.href = '/login.html';
            }, minutes * 60 * 1000);
        };
        
        // Resetear timer en actividad del usuario
        ['mousedown', 'keydown', 'scroll', 'touchstart'].forEach(event => {
            document.addEventListener(event, resetTimer);
        });
        
        resetTimer();
    }

    /**
     * Mostrar aviso de cookies
     */
    showCookieConsent() {
        const consentHTML = `
            <div class="cookie-consent">
                <div class="cookie-content">
                    <p>Utilizamos cookies para mejorar tu experiencia en el sitio.</p>
                    <div class="cookie-actions">
                        <button class="btn btn-sm btn-outline" id="cookie-reject">Rechazar</button>
                        <button class="btn btn-sm btn-primary" id="cookie-accept">Aceptar</button>
                    </div>
                </div>
            </div>
        `;
        
        const container = document.createElement('div');
        container.innerHTML = consentHTML;
        document.body.appendChild(container.firstElementChild);
        
        document.getElementById('cookie-accept').addEventListener('click', () => {
            localStorage.setItem('cookie_consent', 'accepted');
            document.querySelector('.cookie-consent').remove();
        });
        
        document.getElementById('cookie-reject').addEventListener('click', () => {
            localStorage.setItem('cookie_consent', 'rejected');
            document.querySelector('.cookie-consent').remove();
        });
    }

    /**
     * Actualizar formulario con valores actuales
     */
    updateForm() {
        const form = document.getElementById('settings-form');
        if (!form) return;

        // Tema
        const themeInput = form.querySelector(`input[name="theme"][value="${this.settings.appearance.theme}"]`);
        if (themeInput) themeInput.checked = true;

        // Densidad
        document.getElementById('interface-density').value = this.settings.appearance.interfaceDensity;
        const densityBtns = document.querySelectorAll('.density-btn');
        densityBtns.forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.density === this.settings.appearance.interfaceDensity) {
                btn.classList.add('active');
            }
        });

        // Preferencias
        form.querySelector('select[name="language"]').value = this.settings.preferences.language;
        form.querySelector('select[name="timezone"]').value = this.settings.preferences.timezone;
        
        const dateFormatInput = form.querySelector(`input[name="dateFormat"][value="${this.settings.preferences.dateFormat}"]`);
        if (dateFormatInput) dateFormatInput.checked = true;

        // Notificaciones
        form.querySelector('input[name="emailNotifications"]').checked = this.settings.notifications.emailNotifications;
        form.querySelector('input[name="pushNotifications"]').checked = this.settings.notifications.pushNotifications;
        form.querySelector('input[name="taskReminders"]').checked = this.settings.notifications.taskReminders;
        form.querySelector('input[name="documentAlerts"]').checked = this.settings.notifications.documentAlerts;

        // Accesibilidad
        form.querySelector('input[name="highContrast"]').checked = this.settings.accessibility.highContrast;
        form.querySelector('input[name="largeFont"]').checked = this.settings.accessibility.largeFont;
        form.querySelector('input[name="reducedMotion"]').checked = this.settings.accessibility.reducedMotion;
        
        const fontSizeInput = document.getElementById('font-size');
        const fontSizeDisplay = document.querySelector('.current-size');
        if (fontSizeInput && fontSizeDisplay) {
            fontSizeInput.value = this.settings.accessibility.fontSize;
            fontSizeDisplay.textContent = `${this.settings.accessibility.fontSize}px`;
        }

        // Privacidad
        form.querySelector('input[name="autoLogout"]').checked = this.settings.privacy.autoLogout;
        form.querySelector('select[name="autoLogoutTime"]').value = this.settings.privacy.autoLogoutTime;
        form.querySelector('input[name="cookieConsent"]').checked = this.settings.privacy.cookieConsent;
    }

    /**
     * Manejar cambio de densidad
     */
    handleDensityChange(e) {
        const density = e.currentTarget.dataset.density;
        
        // Actualizar botones activos
        document.querySelectorAll('.density-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        e.currentTarget.classList.add('active');
        
        // Actualizar input hidden
        document.getElementById('interface-density').value = density;
        
        // Actualizar ajustes y aplicar
        this.settings.appearance.interfaceDensity = density;
        this.applyDensity();
    }

    /**
     * Cambiar tamaño de fuente
     */
    changeFontSize(change) {
        let newSize = this.settings.accessibility.fontSize + change;
        
        // Limitar entre 12px y 24px
        newSize = Math.max(12, Math.min(24, newSize));
        
        // Actualizar ajustes
        this.settings.accessibility.fontSize = newSize;
        
        // Actualizar interfaz
        const fontSizeInput = document.getElementById('font-size');
        const fontSizeDisplay = document.querySelector('.current-size');
        if (fontSizeInput && fontSizeDisplay) {
            fontSizeInput.value = newSize;
            fontSizeDisplay.textContent = `${newSize}px`;
        }
        
        // Aplicar cambio
        this.applyAccessibility();
    }

    /**
     * Manejar restablecimiento de valores
     */
    async handleReset() {
        const confirmed = await showConfirmModal({
            title: 'Restablecer ajustes',
            message: '¿Estás seguro de que quieres restablecer todos los ajustes a sus valores por defecto?',
            type: 'warning',
            confirmText: 'Restablecer',
            cancelText: 'Cancelar'
        });
        
        if (confirmed) {
            // Restaurar valores por defecto
            this.settings = {
                appearance: {
                    theme: 'auto',
                    interfaceDensity: 'comfortable',
                },
                preferences: {
                    language: 'es',
                    timezone: 'America/Mexico_City',
                    dateFormat: 'dd/mm/yyyy',
                },
                notifications: {
                    emailNotifications: true,
                    pushNotifications: true,
                    taskReminders: true,
                    documentAlerts: true,
                },
                accessibility: {
                    highContrast: false,
                    largeFont: false,
                    reducedMotion: false,
                    fontSize: 16,
                },
                privacy: {
                    autoLogout: true,
                    autoLogoutTime: 30,
                    cookieConsent: true,
                }
            };
            
            // Guardar y aplicar
            this.saveSettings();
            this.applySettings();
            this.updateForm();
            
            showAlert('Ajustes restablecidos correctamente', 'success');
        }
    }

    /**
     * Manejar exportación de datos
     */
    async handleExportData() {
        try {
            // Recopilar todos los datos del usuario
            const exportData = {
                settings: this.settings,
                timestamp: new Date().toISOString(),
                system: {
                    userAgent: navigator.userAgent,
                    platform: navigator.platform,
                    language: navigator.language,
                    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
                }
            };
            
            // Convertir a JSON
            const jsonData = JSON.stringify(exportData, null, 2);
            
            // Crear blob y descargar
            const blob = new Blob([jsonData], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `cbtis051_settings_${Date.now()}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            showAlert('Datos exportados correctamente', 'success');
        } catch (error) {
            console.error('Error exportando datos:', error);
            showAlert('Error al exportar datos', 'error');
        }
    }

    /**
     * Manejar limpieza de datos locales
     */
    async handleClearData() {
        const confirmed = await showConfirmModal({
            title: 'Borrar datos locales',
            message: '¿Estás seguro de que quieres borrar todos los datos almacenados localmente? Esta acción no se puede deshacer.',
            type: 'danger',
            confirmText: 'Borrar todo',
            cancelText: 'Cancelar'
        });
        
        if (confirmed) {
            try {
                // Limpiar localStorage (excepto ajustes si se quiere mantener)
                const settingsBackup = localStorage.getItem('cbtis051_settings');
                localStorage.clear();
                
                // Restaurar ajustes si el usuario quiere mantenerlos
                if (settingsBackup) {
                    localStorage.setItem('cbtis051_settings', settingsBackup);
                }
                
                // Limpiar sessionStorage
                sessionStorage.clear();
                
                // Limpiar cookies relacionadas con la aplicación
                document.cookie.split(";").forEach(cookie => {
                    const name = cookie.split("=")[0].trim();
                    if (name.includes('cbtis') || name.includes('theme')) {
                        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
                    }
                });
                
                showAlert('Datos locales borrados correctamente', 'success');
                
                // Recargar la página para aplicar cambios
                setTimeout(() => window.location.reload(), 1500);
            } catch (error) {
                console.error('Error borrando datos:', error);
                showAlert('Error al borrar datos locales', 'error');
            }
        }
    }

    /**
     * Mostrar modal de confirmación
     */
    showModal() {
        const modal = document.getElementById('confirmation-modal');
        if (modal) {
            modal.classList.add('active');
        }
    }

    /**
     * Ocultar modal de confirmación
     */
    hideModal() {
        const modal = document.getElementById('confirmation-modal');
        if (modal) {
            modal.classList.remove('active');
        }
    }

    /**
     * Obtener ajustes actuales
     */
    getSettings() {
        return this.settings;
    }

    /**
     * Actualizar ajustes específicos
     */
    updateSetting(category, key, value) {
        if (this.settings[category] && this.settings[category][key] !== undefined) {
            this.settings[category][key] = value;
            this.saveSettings();
            this.applySettings();
            return true;
        }
        return false;
    }

    /**
     * Exportar ajustes como objeto
     */
    exportSettings() {
        return JSON.parse(JSON.stringify(this.settings));
    }

    /**
     * Importar ajustes desde objeto
     */
    importSettings(settings) {
        try {
            this.settings = settings;
            this.saveSettings();
            this.applySettings();
            this.updateForm();
            return true;
        } catch (error) {
            console.error('Error importando ajustes:', error);
            return false;
        }
    }
}

// Exportar singleton
const settingsManager = new SettingsManager();
export default settingsManager;