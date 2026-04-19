// settings.js - Módulo completo para la gestión de ajustes con Auto-Logout Funcional
import { showAlert, showConfirmModal, showConfirmation } from '../utils.js';

class SettingsManager {
    constructor() {
        this.settings = {
            appearance: {
                theme: 'auto',
                interfaceDensity: 'comfortable',
                autoDarkTime: '18:00',
                autoLightTime: '06:00',
                currentTheme: null
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
                cookieConsent: false,
                autoLogoutTimer: null,
                lastActivity: Date.now()
            }
        };
        
        this.debugMode = true;
        this.isUserActive = true;
        this.inactivityTimeout = null;
        this.warningTimeout = null;
        this.log('🔧 Constructor SettingsManager inicializado');
        
        this.initialize();
    }

    log(message, data = null) {
        if (this.debugMode) {
            const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
            console.log(`[${timestamp}] 🔧 SettingsManager: ${message}`);
            if (data) console.log('📊 Data:', data);
        }
    }

    initialize() {
        this.log('Inicializando SettingsManager...');
        this.loadSettings();
        // ELIMINADO: this.calculateAndSetTheme(); - No sobrescribir el tema guardado
        this.setupEventListeners();
        this.applySettings();
        this.updateForm();
        this.startThemeChecker();
        this.log('✅ SettingsManager inicializado correctamente');
        this.startInactivityMonitor();
    }

    loadSettings() {
        const savedSettings = localStorage.getItem('cbtis051_settings');
        if (savedSettings) {
            try {
                const parsedSettings = JSON.parse(savedSettings);
                this.settings = this.mergeSettings(this.settings, parsedSettings);
                
                // Restaurar el tema guardado como prioritario
                const savedTheme = localStorage.getItem('cbtis051_current_theme');
                if (savedTheme && (savedTheme === 'light' || savedTheme === 'dark')) {
                    this.settings.appearance.currentTheme = savedTheme;
                    if (this.settings.appearance.theme === 'auto') {
                        this.settings.appearance.theme = savedTheme;
                    }
                }
                
                this.validateSettings();
                this.log('📂 Ajustes cargados desde localStorage');
            } catch (error) {
                this.log('❌ Error cargando ajustes:', error);
                this.saveSettings();
            }
        } else {
            this.saveSettings();
            this.log('📝 Configuración por defecto guardada');
        }
    }

    mergeSettings(defaultSettings, savedSettings) {
        const merged = { ...defaultSettings };
        
        Object.keys(savedSettings).forEach(key => {
            if (merged[key] && typeof merged[key] === 'object' && !Array.isArray(merged[key])) {
                merged[key] = { ...merged[key], ...savedSettings[key] };
            } else {
                merged[key] = savedSettings[key];
            }
        });
        
        return merged;
    }

    validateSettings() {
        const validFontSizes = [14, 16, 18];
        if (!validFontSizes.includes(this.settings.accessibility.fontSize)) {
            this.log('⚠️ Tamaño de fuente inválido, ajustando a 16');
            this.settings.accessibility.fontSize = 16;
        }

        const validLogoutTimes = [2, 5, 15, 30, 60];
        if (!validLogoutTimes.includes(this.settings.privacy.autoLogoutTime)) {
            this.log('⚠️ Tiempo de auto-logout inválido, ajustando a 30');
            this.settings.privacy.autoLogoutTime = 30;
        }

        const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
        if (!timeRegex.test(this.settings.appearance.autoDarkTime)) {
            this.settings.appearance.autoDarkTime = '18:00';
        }
        if (!timeRegex.test(this.settings.appearance.autoLightTime)) {
            this.settings.appearance.autoLightTime = '06:00';
        }
        
        if (this.settings.appearance.currentTheme && 
            !['light', 'dark'].includes(this.settings.appearance.currentTheme)) {
            delete this.settings.appearance.currentTheme;
        }
    }

    saveSettings() {
        try {
            // ELIMINADO: el bloque que llamaba a calculateAndSetTheme()
            // ya no sobrescribe el tema guardado
            
            this.validateSettings();
            
            localStorage.setItem('cbtis051_settings', JSON.stringify(this.settings));
            this.log('💾 Ajustes guardados');
            
            if (this.settings.appearance.currentTheme) {
                localStorage.setItem('cbtis051_current_theme', this.settings.appearance.currentTheme);
            }
            
            window.dispatchEvent(new CustomEvent('settingsChanged', { 
                detail: { settings: this.settings }
            }));
            
            return true;
        } catch (error) {
            this.log('❌ Error guardando ajustes:', error);
            showAlert('Error al guardar ajustes', 'error');
            return false;
        }
    }

    setupEventListeners() {
        this.log('🔌 Configurando event listeners...');
        
        const settingsForm = document.getElementById('settings-form');
        if (settingsForm) {
            settingsForm.addEventListener('submit', (e) => this.handleSave(e));
        }

        const resetBtn = document.getElementById('reset-btn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => this.handleReset());
        }

        const densityBtns = document.querySelectorAll('.density-btn');
        densityBtns.forEach(btn => {
            btn.addEventListener('click', (e) => this.handleDensityChange(e));
        });

        const decreaseBtn = document.querySelector('.font-size-btn.decrease');
        const increaseBtn = document.querySelector('.font-size-btn.increase');
        const fontPresets = document.querySelectorAll('.font-size-preset');
        
        if (decreaseBtn && increaseBtn) {
            decreaseBtn.addEventListener('click', () => this.changeFontSize(-2));
            increaseBtn.addEventListener('click', () => this.changeFontSize(2));
        }
        
        if (fontPresets.length > 0) {
            fontPresets.forEach(preset => {
                preset.addEventListener('click', (e) => {
                    const size = parseInt(e.currentTarget.dataset.size);
                    this.setFontSize(size);
                });
            });
        }

        const exportBtn = document.getElementById('export-data');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.handleExportData());
        }

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

        const themeInputs = document.querySelectorAll('input[name="theme"]');
        themeInputs.forEach(input => {
            input.addEventListener('change', (e) => {
                this.toggleAutoThemeSettings(e.target.value === 'auto');
            });
        });

        this.setupRealTimeListeners();
        this.setupActivityListeners();
        
        window.addEventListener('load', () => {
            this.log('📄 Página completamente cargada, aplicando tema persistente');
            this.applyTheme();
        });
        
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                this.log('👁️ Página visible nuevamente, verificando tema');
                this.checkAndApplyAutoTheme(true);
            }
        });
        
        this.log('✅ Event listeners configurados');
    }

    setupActivityListeners() {
        const activityEvents = [
            'mousedown', 'mousemove', 'mouseup',
            'keydown', 'keyup', 'keypress',
            'scroll', 'touchstart', 'touchend',
            'click', 'dblclick', 'input',
            'focus', 'blur', 'resize'
        ];
        
        activityEvents.forEach(event => {
            document.addEventListener(event, () => {
                this.resetInactivityTimer();
            });
        });
        
        this.log('👤 Listeners de actividad configurados');
    }

    setupRealTimeListeners() {
        this.log('🎯 Configurando listeners en tiempo real...');
        
        const form = document.getElementById('settings-form');
        if (!form) {
            this.log('❌ Formulario no encontrado');
            return;
        }

        const themeInputs = form.querySelectorAll('input[name="theme"]');
        themeInputs.forEach(input => {
            input.addEventListener('change', (e) => {
                this.settings.appearance.theme = e.target.value;
                this.log('🎨 Tema cambiado a:', e.target.value);
                
                if (e.target.value === 'auto') {
                    this.calculateAndSetTheme();
                } else {
                    this.settings.appearance.currentTheme = e.target.value;
                    this.saveSettings();
                }
                
                this.applyTheme();
            });
        });

        const darkTimeInput = document.getElementById('auto-dark-time');
        const lightTimeInput = document.getElementById('auto-light-time');
        
        if (darkTimeInput) {
            darkTimeInput.addEventListener('change', (e) => {
                this.settings.appearance.autoDarkTime = e.target.value;
                this.log('🌙 Hora oscuro actualizada:', e.target.value);
                
                if (this.settings.appearance.theme === 'auto') {
                    this.calculateAndSetTheme();
                    this.saveSettings();
                    this.applyTheme();
                }
                
                this.startThemeChecker();
            });
        }
        
        if (lightTimeInput) {
            lightTimeInput.addEventListener('change', (e) => {
                this.settings.appearance.autoLightTime = e.target.value;
                this.log('☀️ Hora claro actualizada:', e.target.value);
                
                if (this.settings.appearance.theme === 'auto') {
                    this.calculateAndSetTheme();
                    this.saveSettings();
                    this.applyTheme();
                }
                
                this.startThemeChecker();
            });
        }

        const switches = form.querySelectorAll('input[type="checkbox"]');
        switches.forEach(switchEl => {
            switchEl.addEventListener('change', (e) => {
                const name = e.target.name;
                const value = e.target.checked;
                this.log(`🔘 Switch ${name}: ${value}`);
                
                this.updateSettingFromSwitch(name, value);
            });
        });

        const selects = form.querySelectorAll('select');
        selects.forEach(select => {
            select.addEventListener('change', (e) => {
                const name = e.target.name;
                const value = e.target.value;
                this.log(`📋 Select ${name}: ${value}`);
                
                this.updateSettingFromSelect(name, value);
            });
        });
        
        this.log('✅ Listeners en tiempo real configurados');
    }

    updateSettingFromSwitch(name, value) {
        switch(name) {
            case 'highContrast':
            case 'largeFont':
            case 'reducedMotion':
                this.settings.accessibility[name] = value;
                this.applyAccessibility();
                break;
            case 'autoLogout':
                this.settings.privacy[name] = value;
                if (value) {
                    this.setupAutoLogout(this.settings.privacy.autoLogoutTime);
                } else {
                    this.clearAutoLogout();
                }
                this.log(`🔒 Auto-logout ${value ? 'activado' : 'desactivado'}`);
                break;
            case 'emailNotifications':
            case 'pushNotifications':
            case 'taskReminders':
            case 'documentAlerts':
                this.settings.notifications[name] = value;
                break;
        }
    }

    updateSettingFromSelect(name, value) {
        switch(name) {
            case 'language':
                this.settings.preferences.language = value;
                break;
            case 'autoLogoutTime':
                const timeValue = parseInt(value);
                this.settings.privacy[name] = timeValue;
                if (this.settings.privacy.autoLogout) {
                    this.setupAutoLogout(timeValue);
                }
                this.log(`⏱️ Tiempo de auto-logout actualizado a: ${timeValue} minutos`);
                break;
        }
    }

    toggleAutoThemeSettings(show) {
        const autoThemeSettings = document.getElementById('auto-theme-settings');
        if (autoThemeSettings) {
            autoThemeSettings.style.display = show ? 'block' : 'none';
            this.log(show ? '🕐 Mostrando configuración de horario automático' : '👁️ Ocultando configuración de horario automático');
        }
    }

    calculateAndSetTheme() {
        if (this.settings.appearance.theme !== 'auto') {
            this.settings.appearance.currentTheme = this.settings.appearance.theme;
            return this.settings.appearance.theme;
        }
        
        const now = new Date();
        const currentTime = now.getHours() * 60 + now.getMinutes();
        
        const darkTime = this.timeToMinutes(this.settings.appearance.autoDarkTime);
        const lightTime = this.timeToMinutes(this.settings.appearance.autoLightTime);
        
        let calculatedTheme = 'light';
        
        if (darkTime > lightTime) {
            calculatedTheme = (currentTime >= darkTime || currentTime < lightTime) ? 'dark' : 'light';
        } else {
            calculatedTheme = (currentTime >= darkTime && currentTime < lightTime) ? 'dark' : 'light';
        }
        
        this.settings.appearance.currentTheme = calculatedTheme;
        
        this.log(`🧮 Tema calculado: ${calculatedTheme} (Hora actual: ${currentTime}min, Oscuro: ${darkTime}min, Claro: ${lightTime}min)`);
        
        return calculatedTheme;
    }

    startThemeChecker() {
        if (this.themeCheckInterval) {
            clearInterval(this.themeCheckInterval);
        }

        if (this.settings.appearance.theme === 'auto') {
            this.log('⏰ Iniciando verificador de tema automático');
            
            this.checkAndApplyAutoTheme();
            
            this.themeCheckInterval = setInterval(() => {
                this.checkAndApplyAutoTheme();
            }, 60000);
        }
    }

    checkAndApplyAutoTheme(forceRecalculation = false) {
        if (this.settings.appearance.theme !== 'auto') return;

        const now = new Date();
        const currentTime = now.getHours() * 60 + now.getMinutes();
        
        const darkTime = this.timeToMinutes(this.settings.appearance.autoDarkTime);
        const lightTime = this.timeToMinutes(this.settings.appearance.autoLightTime);
        
        let shouldBeDark = false;
        
        if (darkTime > lightTime) {
            shouldBeDark = currentTime >= darkTime || currentTime < lightTime;
        } else {
            shouldBeDark = currentTime >= darkTime && currentTime < lightTime;
        }
        
        const calculatedTheme = shouldBeDark ? 'dark' : 'light';
        const currentStoredTheme = this.settings.appearance.currentTheme;
        const body = document.body;
        const currentAppliedTheme = body.classList.contains('dark-theme') ? 'dark' : 'light';
        
        this.log(`⏱️ Verificación tema: Calculado=${calculatedTheme}, Guardado=${currentStoredTheme}, Aplicado=${currentAppliedTheme}`);
        
        if (forceRecalculation || currentStoredTheme !== calculatedTheme) {
            this.log(`🔄 Actualizando tema guardado de ${currentStoredTheme} a ${calculatedTheme}`);
            this.settings.appearance.currentTheme = calculatedTheme;
            this.saveSettings();
        }
        
        if (calculatedTheme !== currentAppliedTheme) {
            this.log(`🎨 Aplicando cambio de tema: ${currentAppliedTheme} → ${calculatedTheme}`);
            body.classList.toggle('dark-theme', shouldBeDark);
            body.classList.toggle('light-theme', !shouldBeDark);
        }
    }

    timeToMinutes(timeString) {
        if (!timeString) return 0;
        const [hours, minutes] = timeString.split(':').map(Number);
        return hours * 60 + minutes;
    }

    async handleSave(e) {
        e.preventDefault();
        this.log('💾 Iniciando guardado de ajustes...');
        
        const saveBtn = document.getElementById('save-btn');
        const originalText = saveBtn.innerHTML;
        saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
        saveBtn.disabled = true;

        try {
            this.collectFormData();
            
            // Forzar que el tema actual se guarde correctamente
            if (this.settings.appearance.theme !== 'auto') {
                this.settings.appearance.currentTheme = this.settings.appearance.theme;
            } else {
                this.calculateAndSetTheme();
            }

            const success = this.saveSettings();

            if (success) {
                this.applySettings();
                
                setTimeout(() => {
                    this.showModal();
                    saveBtn.innerHTML = originalText;
                    saveBtn.disabled = false;
                    this.log('✅ Ajustes guardados exitosamente');
                }, 500);
            } else {
                saveBtn.innerHTML = originalText;
                saveBtn.disabled = false;
            }
        } catch (error) {
            this.log('❌ Error en handleSave:', error);
            saveBtn.innerHTML = originalText;
            saveBtn.disabled = false;
            showAlert('Error al guardar ajustes', 'error');
        }
    }

    collectFormData() {
        const form = document.getElementById('settings-form');
        if (!form) {
            this.log('⚠️ Formulario no encontrado en collectFormData');
            return;
        }

        const formData = new FormData(form);
        
        const theme = formData.get('theme');
        if (theme) {
            this.settings.appearance.theme = theme;
            if (theme !== 'auto') {
                this.settings.appearance.currentTheme = theme;
            }
        }

        const darkTimeInput = document.getElementById('auto-dark-time');
        const lightTimeInput = document.getElementById('auto-light-time');
        const autoDarkTime = darkTimeInput ? darkTimeInput.value : '18:00';
        const autoLightTime = lightTimeInput ? lightTimeInput.value : '06:00';
        
        this.settings.appearance.autoDarkTime = autoDarkTime;
        this.settings.appearance.autoLightTime = autoLightTime;

        const densitySelect = document.getElementById('interface-density');
        if (densitySelect) {
            this.settings.appearance.interfaceDensity = densitySelect.value;
        }

        const language = formData.get('language');
        if (language) {
            this.settings.preferences.language = language;
        }

        this.settings.accessibility.highContrast = formData.get('highContrast') === 'on';
        this.settings.accessibility.largeFont = formData.get('largeFont') === 'on';
        this.settings.accessibility.reducedMotion = formData.get('reducedMotion') === 'on';
        
        const fontSizeInput = document.getElementById('font-size');
        if (fontSizeInput) {
            this.settings.accessibility.fontSize = parseInt(fontSizeInput.value) || 16;
        }

        this.settings.privacy.autoLogout = formData.get('autoLogout') === 'on';
        
        const autoLogoutTime = formData.get('autoLogoutTime');
        if (autoLogoutTime) {
            this.settings.privacy.autoLogoutTime = parseInt(autoLogoutTime) || 30;
        }
        
        this.log('📋 Datos recopilados del formulario', {
            theme: this.settings.appearance.theme,
            currentTheme: this.settings.appearance.currentTheme,
            autoDarkTime: this.settings.appearance.autoDarkTime,
            autoLightTime: this.settings.appearance.autoLightTime,
            fontSize: this.settings.accessibility.fontSize,
            autoLogout: this.settings.privacy.autoLogout,
            autoLogoutTime: this.settings.privacy.autoLogoutTime
        });
    }

    applySettings() {
        this.log('⚙️ Aplicando ajustes...');
        this.applyTheme();
        this.applyDensity();
        this.applyAccessibility();
        this.applyPrivacy();
        this.updateForm();
        this.startThemeChecker();
        
        if (this.settings.privacy.autoLogout) {
            this.setupAutoLogout(this.settings.privacy.autoLogoutTime);
        } else {
            this.clearAutoLogout();
        }
        
        this.log('✅ Ajustes aplicados');
    }

    applyTheme() {
        const { theme, currentTheme } = this.settings.appearance;
        const body = document.body;
        
        this.log(`🎨 Aplicando tema: Config=${theme}, Actual=${currentTheme}`);
        
        body.classList.remove('light-theme', 'dark-theme');
        
        // Usar el tema guardado
        const themeToApply = currentTheme || (theme !== 'auto' ? theme : 'light');
        
        body.classList.add(`${themeToApply}-theme`);
        body.setAttribute('data-theme', themeToApply);
        
        this.log(`✅ Tema aplicado: ${themeToApply}`);
        
        this.saveThemeInMultiplePlaces();
    }

    saveThemeInMultiplePlaces() {
        const themeToSave = this.settings.appearance.currentTheme || 
                           (this.settings.appearance.theme !== 'auto' ? 
                            this.settings.appearance.theme : 'light');
        
        if (!themeToSave) return;
        
        localStorage.setItem('cbtis051_current_theme', themeToSave);
        
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + 30);
        document.cookie = `cbtis051_theme=${themeToSave}; expires=${expiryDate.toUTCString()}; path=/`;
        
        sessionStorage.setItem('current_theme', themeToSave);
        document.body.setAttribute('data-theme', themeToSave);
        
        this.log(`🔐 Tema guardado en múltiples lugares: ${themeToSave}`);
    }

    applyDensity() {
        const { interfaceDensity } = this.settings.appearance;
        const body = document.body;
        
        this.log(`📏 Aplicando densidad: ${interfaceDensity}`);
        
        body.classList.remove('density-compact', 'density-comfortable', 'density-spacious');
        body.classList.add(`density-${interfaceDensity}`);
        
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

    applyAccessibility() {
        const { highContrast, largeFont, reducedMotion, fontSize } = this.settings.accessibility;
        const body = document.body;
        
        this.log(`♿ Aplicando accesibilidad`, { highContrast, largeFont, reducedMotion, fontSize });
        
        body.classList.toggle('high-contrast', highContrast);
        body.classList.toggle('large-font', largeFont);
        body.classList.toggle('reduced-motion', reducedMotion);
        
        const validSizes = [14, 16, 18];
        const finalSize = validSizes.includes(fontSize) ? fontSize : 16;
        document.documentElement.style.fontSize = `${finalSize}px`;
    }

    applyPrivacy() {
        const { autoLogout, autoLogoutTime } = this.settings.privacy;
        
        this.log(`🔒 Aplicando privacidad`, { autoLogout, autoLogoutTime });
        
        if (autoLogout && autoLogoutTime > 0) {
            this.setupAutoLogout(autoLogoutTime);
            this.startInactivityMonitor();
        } else {
            this.clearAutoLogout();
        }
    }

    startInactivityMonitor() {
        this.log('👀 Iniciando monitor de inactividad');
        
        this.settings.privacy.lastActivity = Date.now();
        
        this.checkInactivityInterval = setInterval(() => {
            this.checkInactivity();
        }, 30000);
        
        this.checkInactivity();
    }

    checkInactivity() {
        const { autoLogout, autoLogoutTime, lastActivity } = this.settings.privacy;
        
        if (!autoLogout || !autoLogoutTime) {
            return;
        }
        
        const now = Date.now();
        const inactiveTime = now - lastActivity;
        const maxInactiveTime = autoLogoutTime * 60 * 1000;
        
        if (this.debugMode) {
            const remainingMinutes = Math.max(0, (maxInactiveTime - inactiveTime) / 60000);
            this.log(`⏰ Inactividad: ${Math.floor(inactiveTime/1000)}s / ${maxInactiveTime/1000}s (Restante: ${remainingMinutes.toFixed(1)} min)`);
        }
        
        if (inactiveTime >= maxInactiveTime) {
            this.log('🚪 Usuario inactivo por tiempo configurado, ejecutando logout');
            this.executeLogout();
        } else if (inactiveTime >= maxInactiveTime - 30000) {
            const remainingSeconds = Math.ceil((maxInactiveTime - inactiveTime) / 1000);
            if (remainingSeconds > 0 && !this.warningShown) {
                this.showLogoutWarning(remainingSeconds);
                this.warningShown = true;
            }
        }
    }

    showLogoutWarning(secondsRemaining) {
        this.log(`⚠️ Mostrando advertencia de logout: ${secondsRemaining} segundos restantes`);
        
        showAlert(`La sesión se cerrará en ${secondsRemaining} segundos por inactividad. Mueve el mouse o presiona una tecla para continuar.`, 'warning');
        
        this.warningTimeout = setTimeout(() => {
            this.warningShown = false;
            if (secondsRemaining > 10) {
                this.showLogoutWarning(Math.max(0, secondsRemaining - 30));
            }
        }, 30000);
    }

    resetInactivityTimer() {
        if (this.settings.privacy.autoLogout) {
            this.settings.privacy.lastActivity = Date.now();
            
            if (this.warningTimeout) {
                clearTimeout(this.warningTimeout);
                this.warningTimeout = null;
                this.warningShown = false;
            }
            
            if (this.debugMode) {
                const now = new Date();
                const timeString = now.toLocaleTimeString('es-MX', { 
                    hour: '2-digit', 
                    minute: '2-digit', 
                    second: '2-digit' 
                });
                this.log(`👆 Actividad detectada a las ${timeString}`);
            }
        }
    }

    setupAutoLogout(minutes) {
        this.log(`⏳ Configurando auto-logout: ${minutes} minutos`);
        
        this.clearAutoLogout();
        
        const token = localStorage.getItem('token');
        if (!token) {
            this.log('⚠️ Usuario no autenticado, omitiendo auto-logout');
            return;
        }
        
        const logoutTime = minutes * 60 * 1000;
        let timeout;
        
        const logout = () => {
            this.log('🚪 Ejecutando auto-logout por inactividad');
            this.executeLogout();
        };
        
        const resetTimer = () => {
            clearTimeout(timeout);
            timeout = setTimeout(logout, logoutTime);
            this.log(`🔄 Timer de logout reiniciado (${minutes} minutos)`);
        };
        
        resetTimer();
        
        this.settings.privacy.autoLogoutTimer = {
            timeout: timeout,
            resetTimer: resetTimer,
            logoutTime: logoutTime
        };
        
        showAlert(`Auto-logout activado. La sesión se cerrará después de ${minutes} minutos de inactividad.`, 'info');
    }

    async executeLogout() {
        try {
            this.log('🚪 INICIANDO LOGOUT AUTOMÁTICO...');
            
            showAlert('Sesión expirada por inactividad. Redirigiendo...', 'warning');
            
            try {
                const token = localStorage.getItem('token');
                if (token) {
                    await fetch('/api/auth/logout', {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        }
                    });
                }
            } catch (error) {
                this.log('⚠️ Error en logout backend:', error);
            }
            
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            sessionStorage.clear();
            
            document.cookie.split(";").forEach(cookie => {
                const name = cookie.split("=")[0].trim();
                if (name.includes('token') || name.includes('session')) {
                    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
                }
            });
            
            this.clearAutoLogout();
            if (this.checkInactivityInterval) {
                clearInterval(this.checkInactivityInterval);
            }
            
            setTimeout(() => {
                this.log('🔀 Redirigiendo a página de login...');
                
                const currentTheme = this.getCurrentTheme();
                localStorage.setItem('cbtis051_theme_before_logout', currentTheme);
                
                window.location.href = '/login.html';
            }, 2000);
            
        } catch (error) {
            this.log('❌ Error en executeLogout:', error);
            window.location.href = '/login.html';
        }
    }

    clearAutoLogout() {
        if (this.settings.privacy.autoLogoutTimer) {
            const { timeout, resetTimer } = this.settings.privacy.autoLogoutTimer;
            
            if (timeout) clearTimeout(timeout);
            
            const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'mousemove'];
            events.forEach(event => {
                document.removeEventListener(event, resetTimer);
            });
            
            this.settings.privacy.autoLogoutTimer = null;
            this.log('🔄 Auto-logout limpiado');
        }
        
        if (this.warningTimeout) {
            clearTimeout(this.warningTimeout);
            this.warningTimeout = null;
        }
    }

    updateForm() {
        const form = document.getElementById('settings-form');
        if (!form) {
            this.log('❌ Formulario no encontrado para actualizar');
            return;
        }

        this.log('📝 Actualizando formulario con valores actuales');

        const themeInput = form.querySelector(`input[name="theme"][value="${this.settings.appearance.theme}"]`);
        if (themeInput) {
            themeInput.checked = true;
            this.toggleAutoThemeSettings(this.settings.appearance.theme === 'auto');
        }

        const darkTimeInput = document.getElementById('auto-dark-time');
        const lightTimeInput = document.getElementById('auto-light-time');
        if (darkTimeInput) darkTimeInput.value = this.settings.appearance.autoDarkTime || '18:00';
        if (lightTimeInput) lightTimeInput.value = this.settings.appearance.autoLightTime || '06:00';

        const densitySelect = document.getElementById('interface-density');
        if (densitySelect) {
            densitySelect.value = this.settings.appearance.interfaceDensity;
            
            const densityBtns = document.querySelectorAll('.density-btn');
            densityBtns.forEach(btn => {
                btn.classList.remove('active');
                if (btn.dataset.density === this.settings.appearance.interfaceDensity) {
                    btn.classList.add('active');
                }
            });
        }

        const languageSelect = form.querySelector('select[name="language"]');
        if (languageSelect) {
            languageSelect.value = this.settings.preferences.language;
        }

        const highContrastInput = form.querySelector('input[name="highContrast"]');
        const largeFontInput = form.querySelector('input[name="largeFont"]');
        const reducedMotionInput = form.querySelector('input[name="reducedMotion"]');
        
        if (highContrastInput) highContrastInput.checked = this.settings.accessibility.highContrast;
        if (largeFontInput) largeFontInput.checked = this.settings.accessibility.largeFont;
        if (reducedMotionInput) reducedMotionInput.checked = this.settings.accessibility.reducedMotion;
        
        const fontSizeInput = document.getElementById('font-size');
        const fontSizeDisplay = document.querySelector('.current-size');
        const fontPresets = document.querySelectorAll('.font-size-preset');
        
        if (fontSizeInput) {
            fontSizeInput.value = this.settings.accessibility.fontSize || 16;
            
            if (fontSizeDisplay) {
                fontSizeDisplay.textContent = `${this.settings.accessibility.fontSize || 16}px`;
            }
            
            fontPresets.forEach(preset => {
                preset.classList.remove('active');
                if (parseInt(preset.dataset.size) === this.settings.accessibility.fontSize) {
                    preset.classList.add('active');
                }
            });
        }

        const autoLogoutCheckbox = form.querySelector('input[name="autoLogout"]');
        if (autoLogoutCheckbox) {
            autoLogoutCheckbox.checked = this.settings.privacy.autoLogout;
        }
        
        const autoLogoutSelect = form.querySelector('select[name="autoLogoutTime"]');
        if (autoLogoutSelect) {
            const has2MinOption = Array.from(autoLogoutSelect.options).some(
                option => option.value === '2'
            );
            
            if (!has2MinOption) {
                const option2min = document.createElement('option');
                option2min.value = '2';
                option2min.textContent = '2 minutos (para pruebas)';
                autoLogoutSelect.appendChild(option2min);
            }
            
            autoLogoutSelect.value = this.settings.privacy.autoLogoutTime || 30;
        }
        
        this.log('✅ Formulario actualizado');
    }

    handleDensityChange(e) {
        const density = e.currentTarget.dataset.density;
        this.log(`📏 Cambiando densidad a: ${density}`);
        
        document.querySelectorAll('.density-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        e.currentTarget.classList.add('active');
        
        document.getElementById('interface-density').value = density;
        this.settings.appearance.interfaceDensity = density;
        this.applyDensity();
    }

    changeFontSize(change) {
        let newSize = this.settings.accessibility.fontSize + change;
        
        const validSizes = [14, 16, 18];
        newSize = validSizes.reduce((prev, curr) => {
            return Math.abs(curr - newSize) < Math.abs(prev - newSize) ? curr : prev;
        });
        
        this.setFontSize(newSize);
    }

    setFontSize(size) {
        const validSizes = [14, 16, 18];
        
        if (!validSizes.includes(size)) {
            this.log(`⚠️ Tamaño de fuente inválido: ${size}, usando 16`);
            size = 16;
        }
        
        this.log(`🔠 Cambiando tamaño de fuente a: ${size}px`);
        this.settings.accessibility.fontSize = size;
        
        const fontSizeInput = document.getElementById('font-size');
        const fontSizeDisplay = document.querySelector('.current-size');
        const fontPresets = document.querySelectorAll('.font-size-preset');
        
        if (fontSizeInput && fontSizeDisplay) {
            fontSizeInput.value = size;
            fontSizeDisplay.textContent = `${size}px`;
            
            fontPresets.forEach(preset => {
                preset.classList.remove('active');
                if (parseInt(preset.dataset.size) === size) {
                    preset.classList.add('active');
                }
            });
        }
        
        this.applyAccessibility();
    }

    async handleReset() {
        const confirmed = await showConfirmModal({
            title: 'Restablecer ajustes',
            message: '¿Estás seguro de que quieres restablecer todos los ajustes a sus valores por defecto?',
            type: 'warning',
            confirmText: 'Restablecer',
            cancelText: 'Cancelar'
        });
        
        if (confirmed) {
            this.log('🔄 Restableciendo ajustes a valores por defecto');
            
            this.settings = {
                appearance: {
                    theme: 'auto',
                    interfaceDensity: 'comfortable',
                    autoDarkTime: '18:00',
                    autoLightTime: '06:00',
                    currentTheme: null
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
                    cookieConsent: false,
                    autoLogoutTimer: null,
                    lastActivity: Date.now()
                }
            };
            
            this.calculateAndSetTheme();
            this.saveSettings();
            this.applySettings();
            this.updateForm();
            
            showAlert('Ajustes restablecidos correctamente', 'success');
            this.log('✅ Ajustes restablecidos');
        }
    }

    async handleExportData() {
        try {
            this.log('📤 Iniciando exportación de datos...');
            
            if (this.settings.appearance.theme === 'auto' && !this.settings.appearance.currentTheme) {
                this.calculateAndSetTheme();
            }
            
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
            
            const jsonData = JSON.stringify(exportData, null, 2);
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
            this.log('✅ Datos exportados correctamente');
        } catch (error) {
            this.log('❌ Error exportando datos:', error);
            showAlert('Error al exportar datos', 'error');
        }
    }

    showModal() {
        const modal = document.getElementById('confirmation-modal');
        if (modal) {
            modal.classList.add('active');
            this.log('📋 Mostrando modal de confirmación');
        }
    }

    hideModal() {
        const modal = document.getElementById('confirmation-modal');
        if (modal) {
            modal.classList.remove('active');
            this.log('📋 Ocultando modal de confirmación');
        }
    }

    getSettings() {
        return this.settings;
    }

    getCurrentTheme() {
        const body = document.body;
        if (body.classList.contains('dark-theme')) return 'dark';
        if (body.classList.contains('light-theme')) return 'light';
        
        return this.settings.appearance.currentTheme || 
               (this.settings.appearance.theme !== 'auto' ? 
                this.settings.appearance.theme : 'light');
    }

    updateSetting(category, key, value) {
        if (this.settings[category] && this.settings[category][key] !== undefined) {
            this.settings[category][key] = value;
            
            if (category === 'appearance' && 
                (key === 'theme' || key === 'autoDarkTime' || key === 'autoLightTime')) {
                if (key === 'theme' && value === 'auto') {
                    this.calculateAndSetTheme();
                } else if (this.settings.appearance.theme === 'auto') {
                    this.calculateAndSetTheme();
                }
            }
            
            this.saveSettings();
            this.applySettings();
            this.log(`⚙️ Ajuste actualizado: ${category}.${key} = ${value}`);
            return true;
        }
        this.log(`⚠️ No se pudo actualizar ajuste: ${category}.${key}`);
        return false;
    }

    exportSettings() {
        if (this.settings.appearance.theme === 'auto' && !this.settings.appearance.currentTheme) {
            this.calculateAndSetTheme();
        }
        return JSON.parse(JSON.stringify(this.settings));
    }

    importSettings(settings) {
        try {
            this.settings = this.mergeSettings(this.settings, settings);
            
            if (this.settings.appearance.theme === 'auto') {
                this.calculateAndSetTheme();
            }
            
            this.saveSettings();
            this.applySettings();
            this.updateForm();
            this.log('📥 Ajustes importados correctamente');
            return true;
        } catch (error) {
            this.log('❌ Error importando ajustes:', error);
            return false;
        }
    }

    checkThemePersistence() {
        const storedTheme = localStorage.getItem('cbtis051_current_theme');
        const calculatedTheme = this.calculateAndSetTheme();
        const appliedTheme = this.getCurrentTheme();
        
        this.log('🔍 Verificando persistencia del tema:', {
            stored: storedTheme,
            calculated: calculatedTheme,
            applied: appliedTheme,
            config: this.settings.appearance.theme
        });
        
        return {
            stored: storedTheme,
            calculated: calculatedTheme,
            applied: appliedTheme,
            consistent: storedTheme === appliedTheme
        };
    }

    destroy() {
        if (this.themeCheckInterval) {
            clearInterval(this.themeCheckInterval);
        }
        
        if (this.checkInactivityInterval) {
            clearInterval(this.checkInactivityInterval);
        }
        
        this.clearAutoLogout();
        
        if (this.systemThemeListener) {
            window.matchMedia('(prefers-color-scheme: dark)')
                .removeEventListener('change', this.systemThemeListener);
        }
        
        this.log('🧹 SettingsManager destruido');
    }
}

// Crear y exportar instancia singleton
const settingsManager = new SettingsManager();

// Función auxiliar para verificar el tema al cargar la página
(function checkThemeOnLoad() {
    // PRIMERO: Intentar cargar el tema de settings
    const savedSettings = localStorage.getItem('cbtis051_settings');
    let themeToApply = null;
    
    if (savedSettings) {
        try {
            const parsed = JSON.parse(savedSettings);
            // Si el tema NO es 'auto', usar ese tema
            if (parsed.appearance?.theme && parsed.appearance.theme !== 'auto') {
                themeToApply = parsed.appearance.theme;
            }
            // Si hay currentTheme, usarlo
            else if (parsed.appearance?.currentTheme) {
                themeToApply = parsed.appearance.currentTheme;
            }
        } catch (e) {
            console.error('Error al leer tema guardado:', e);
        }
    }
    
    // SEGUNDO: Si no se encontró en settings, buscar el tema directo
    if (!themeToApply) {
        const directTheme = localStorage.getItem('cbtis051_current_theme');
        if (directTheme && (directTheme === 'light' || directTheme === 'dark')) {
            themeToApply = directTheme;
        }
    }
    
    // TERCERO: Si aún no hay tema, usar light por defecto
    if (!themeToApply) {
        themeToApply = 'light';
    }
    
    // APLICAR EL TEMA
    document.body.classList.add(`${themeToApply}-theme`);
    document.body.setAttribute('data-theme', themeToApply);
    console.log(`🎨 Tema aplicado al cargar: ${themeToApply}`);
})();

// Exportar para uso global
window.SettingsManager = SettingsManager;
window.settingsManager = settingsManager;

export default settingsManager;