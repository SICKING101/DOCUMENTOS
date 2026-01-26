// i18n.js - Sistema simple de internacionalización (Agregar en el futuro)
class I18n {
    constructor() {
        this.currentLang = 'es';
        this.translations = {};
        this.init();
    }

    async init() {
        // Cargar idioma guardado o detectar del navegador
        const savedLang = localStorage.getItem('cbtis051_language');
        const browserLang = navigator.language.split('-')[0];
        
        this.currentLang = savedLang || (browserLang === 'es' ? 'es' : 'en');
        
        // Cargar traducciones
        await this.loadTranslations(this.currentLang);
        
        // Aplicar traducciones inmediatamente
        this.applyTranslations();
        
        // Escuchar cambios de idioma
        this.setupLanguageSwitcher();
    }

    async loadTranslations(lang) {
        try {
            const response = await fetch(`/locales/${lang}.json`);
            if (!response.ok) {
                throw new Error(`No se pudo cargar el idioma ${lang}`);
            }
            this.translations = await response.json();
            console.log(`🌐 Idioma cargado: ${lang}`);
        } catch (error) {
            console.error('Error cargando traducciones:', error);
            // Cargar español como fallback
            if (lang !== 'es') {
                await this.loadTranslations('es');
            }
        }
    }

    t(key, params = {}) {
        const keys = key.split('.');
        let value = this.translations;
        
        for (const k of keys) {
            if (value && value[k] !== undefined) {
                value = value[k];
            } else {
                console.warn(`⚠️ Clave de traducción no encontrada: ${key}`);
                return key;
            }
        }
        
        // Reemplazar parámetros si existen
        if (typeof value === 'string' && params) {
            Object.keys(params).forEach(param => {
                value = value.replace(`{${param}}`, params[param]);
            });
        }
        
        return value;
    }

    getCurrentLanguage() {
        return this.currentLang;
    }

    async setLanguage(lang) {
        if (lang === this.currentLang) return;
        
        this.currentLang = lang;
        localStorage.setItem('cbtis051_language', lang);
        
        await this.loadTranslations(lang);
        this.applyTranslations();
        
        // Disparar evento para que otros módulos se actualicen
        window.dispatchEvent(new CustomEvent('languageChanged', { 
            detail: { language: lang } 
        }));
        
        // Actualizar el select en ajustes si existe
        const languageSelect = document.getElementById('language');
        if (languageSelect) {
            languageSelect.value = lang;
        }
        
        console.log(`🌐 Idioma cambiado a: ${lang}`);
    }

    applyTranslations() {
        // Traducir elementos con data-i18n
        document.querySelectorAll('[data-i18n]').forEach(element => {
            const key = element.getAttribute('data-i18n');
            const translation = this.t(key);
            
            if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
                element.placeholder = translation;
            } else if (element.tagName === 'OPTION') {
                element.textContent = translation;
            } else {
                element.textContent = translation;
            }
        });
        
        // Traducir elementos con data-i18n-title para atributos title
        document.querySelectorAll('[data-i18n-title]').forEach(element => {
            const key = element.getAttribute('data-i18n-title');
            element.setAttribute('title', this.t(key));
        });
        
        // Traducir elementos con data-i18n-placeholder
        document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
            const key = element.getAttribute('data-i18n-placeholder');
            element.setAttribute('placeholder', this.t(key));
        });
        
        // Traducir elementos con data-i18n-aria-label
        document.querySelectorAll('[data-i18n-aria-label]').forEach(element => {
            const key = element.getAttribute('data-i18n-aria-label');
            element.setAttribute('aria-label', this.t(key));
        });
        
        // Actualizar el título de la página
        const titleElement = document.querySelector('title[data-i18n]');
        if (titleElement) {
            const titleKey = titleElement.getAttribute('data-i18n');
            document.title = this.t(titleKey);
        } else if (document.querySelector('title')) {
            // Actualizar título estándar
            document.title = this.t('app.title');
        }
        
        // Actualizar contenido dinámico que no tiene data-i18n
        this.updateDynamicContent();
    }

    updateDynamicContent() {
        // Aquí puedes agregar lógica para actualizar contenido dinámico
        // que se genera mediante JavaScript
        const currentLang = this.currentLang;
        
        // Ejemplo: Actualizar formato de fechas
        if (window.updateDatesForLanguage) {
            window.updateDatesForLanguage(currentLang);
        }
        
        // Ejemplo: Actualizar nombres de meses/días
        if (window.updateCalendarLanguage && currentLang === 'en') {
            window.updateCalendarLanguage();
        }
    }

    setupLanguageSwitcher() {
        // Detectar cambios en el select de idioma en ajustes
        const languageSelect = document.getElementById('language');
        if (languageSelect) {
            languageSelect.value = this.currentLang;
            languageSelect.addEventListener('change', (e) => {
                this.setLanguage(e.target.value);
            });
        }
    }

    // Método auxiliar para traducir directamente
    translate(key, params = {}) {
        return this.t(key, params);
    }

    // Método para obtener todas las traducciones (útil para debug)
    getAllTranslations() {
        return this.translations;
    }
}

// Crear instancia global
const i18n = new I18n();

// Exportar para uso global
window.i18n = i18n;
window.t = (key, params) => i18n.t(key, params);

export default i18n;