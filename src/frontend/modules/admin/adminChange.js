// src/frontend/modules/admin/adminChange.js
// Módulo para manejar cambio de administrador - VERSIÓN CORREGIDA

import { api } from '../../services/api.js';
import { showAlert } from '../../utils.js';

// =============================================================================
// CLASE PARA GESTIONAR CAMBIO DE ADMINISTRADOR - CORREGIDA
// =============================================================================

class AdminChangeManager {
    constructor() {
        this.modal = null;
        this.form = null;
        this.currentPasswordInput = null;
        this.newAdminUserInput = null;
        this.newAdminEmailInput = null;
        this.newAdminPasswordInput = null;
        this.confirmAdminPasswordInput = null;
        this.submitBtn = null;
        this.cancelBtn = null;
        
        this.initialize();
    }
    
    // =========================================================================
    // INICIALIZACIÓN
    // =========================================================================
    
    initialize() {
        console.log('🔧 Inicializando AdminChangeManager...');
        
        this.modal = document.getElementById('changeAdminModal');
        this.form = document.getElementById('changeAdminForm');
        
        if (!this.modal || !this.form) {
            console.warn('❌ Modal o formulario de cambio de admin no encontrados');
            return;
        }
        
        // Obtener elementos del formulario
        this.currentPasswordInput = document.getElementById('currentPassword');
        this.newAdminUserInput = document.getElementById('newAdminUser');
        this.newAdminEmailInput = document.getElementById('newAdminEmail');
        this.newAdminPasswordInput = document.getElementById('newAdminPassword');
        this.confirmAdminPasswordInput = document.getElementById('confirmAdminPassword');
        
        // Obtener botones
        this.submitBtn = document.getElementById('confirmChangeAdmin');
        this.cancelBtn = document.getElementById('cancelChangeAdmin');
        
        // Configurar eventos
        this.setupEventListeners();
        
        // Agregar campo de contraseña actual si no existe
        this.addCurrentPasswordField();
        
        console.log('✅ AdminChangeManager inicializado');
    }
    
    // =========================================================================
    // AGREGAR CAMPO DE CONTRASEÑA ACTUAL
    // =========================================================================
    
    addCurrentPasswordField() {
        if (document.getElementById('currentPassword')) {
            return;
        }
        
        const currentPasswordGroup = document.createElement('div');
        currentPasswordGroup.className = 'form__group';
        currentPasswordGroup.innerHTML = `
            <label for="currentPassword" class="form__label">
                <i class="fas fa-lock"></i> Tu Contraseña Actual
            </label>
            <div class="form__password-wrapper">
                <input type="password" id="currentPassword" class="form__input" 
                       placeholder="Confirma tu identidad" required>
                <button type="button" class="form__password-toggle" 
                        onclick="window.togglePasswordVisibility('currentPassword')">
                    <i class="fas fa-eye"></i>
                </button>
            </div>
            <small class="form__hint">
                <i class="fas fa-info-circle"></i> Requerido por seguridad
            </small>
        `;
        
        const alert = this.form.querySelector('.alert');
        if (alert) {
            alert.parentNode.insertBefore(currentPasswordGroup, alert.nextSibling);
        } else {
            this.form.insertBefore(currentPasswordGroup, this.form.firstChild);
        }
        
        this.currentPasswordInput = document.getElementById('currentPassword');
    }
    
    // =========================================================================
    // CONFIGURAR EVENT LISTENERS
    // =========================================================================
    
    setupEventListeners() {
        this.submitBtn?.addEventListener('click', (e) => {
            e.preventDefault();
            this.handleSubmit();
        });
        
        this.cancelBtn?.addEventListener('click', () => {
            this.closeModal();
        });
        
        this.modal?.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeModal();
            }
        });
        
        this.setupRealTimeValidation();
    }
    
    // =========================================================================
    // VALIDACIÓN EN TIEMPO REAL
    // =========================================================================
    
    setupRealTimeValidation() {
        const inputs = [
            this.currentPasswordInput,
            this.newAdminUserInput,
            this.newAdminEmailInput,
            this.newAdminPasswordInput,
            this.confirmAdminPasswordInput
        ];
        
        inputs.forEach(input => {
            if (input) {
                input.addEventListener('input', () => this.validateForm());
                input.addEventListener('blur', () => this.validateField(input));
            }
        });
        
        if (this.newAdminPasswordInput && this.confirmAdminPasswordInput) {
            this.confirmAdminPasswordInput.addEventListener('input', () => {
                this.validatePasswordMatch();
            });
        }
    }
    
    // =========================================================================
    // VALIDACIONES
    // =========================================================================
    
    validateField(input) {
        const value = input.value.trim();
        let isValid = true;
        let errorMessage = '';
        
        switch(input.id) {
            case 'currentPassword':
                if (!value) {
                    isValid = false;
                    errorMessage = 'La contraseña actual es requerida';
                } else if (value.length < 6) {
                    isValid = false;
                    errorMessage = 'Mínimo 6 caracteres';
                }
                break;
                
            case 'newAdminUser':
                if (!value) {
                    isValid = false;
                    errorMessage = 'El nombre de usuario es requerido';
                } else if (value.length < 3) {
                    isValid = false;
                    errorMessage = 'Mínimo 3 caracteres';
                } else if (!/^[a-zA-Z0-9_]+$/.test(value)) {
                    isValid = false;
                    errorMessage = 'Solo letras, números y guiones bajos';
                }
                break;
                
            case 'newAdminEmail':
                if (!value) {
                    isValid = false;
                    errorMessage = 'El correo electrónico es requerido';
                } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
                    isValid = false;
                    errorMessage = 'Correo electrónico inválido';
                }
                break;
                
            case 'newAdminPassword':
                if (!value) {
                    isValid = false;
                    errorMessage = 'La contraseña es requerida';
                } else if (value.length < 8) {
                    isValid = false;
                    errorMessage = 'Mínimo 8 caracteres';
                } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(value)) {
                    isValid = false;
                    errorMessage = 'Debe tener mayúsculas, minúsculas y números';
                }
                break;
                
            case 'confirmAdminPassword':
                if (!value) {
                    isValid = false;
                    errorMessage = 'Confirma tu contraseña';
                } else if (this.newAdminPasswordInput && value !== this.newAdminPasswordInput.value) {
                    isValid = false;
                    errorMessage = 'Las contraseñas no coinciden';
                }
                break;
        }
        
        this.updateFieldStatus(input, isValid, errorMessage);
        return isValid;
    }
    
    validatePasswordMatch() {
        if (!this.newAdminPasswordInput || !this.confirmAdminPasswordInput) return;
        
        const password = this.newAdminPasswordInput.value;
        const confirm = this.confirmAdminPasswordInput.value;
        
        if (password && confirm && password !== confirm) {
            this.updateFieldStatus(this.confirmAdminPasswordInput, false, 'Las contraseñas no coinciden');
            return false;
        }
        
        return true;
    }
    
    validateForm() {
        const fields = [
            this.currentPasswordInput,
            this.newAdminUserInput,
            this.newAdminEmailInput,
            this.newAdminPasswordInput,
            this.confirmAdminPasswordInput
        ];
        
        let isValid = true;
        
        fields.forEach(field => {
            if (field && !this.validateField(field)) {
                isValid = false;
            }
        });
        
        if (!this.validatePasswordMatch()) {
            isValid = false;
        }
        
        if (this.submitBtn) {
            this.submitBtn.disabled = !isValid;
        }
        
        return isValid;
    }
    
    updateFieldStatus(input, isValid, errorMessage = '') {
        const group = input.closest('.form__group');
        if (!group) return;
        
        group.classList.remove('form__group--error', 'form__group--success');
        
        const existingError = group.querySelector('.form__error');
        if (existingError) {
            existingError.remove();
        }
        
        if (!isValid && errorMessage) {
            group.classList.add('form__group--error');
            
            const errorElement = document.createElement('div');
            errorElement.className = 'form__error';
            errorElement.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${errorMessage}`;
            group.appendChild(errorElement);
            
            input.style.borderColor = '#ef4444';
        } else if (isValid && input.value.trim()) {
            group.classList.add('form__group--success');
            input.style.borderColor = '#10b981';
        } else {
            input.style.borderColor = '';
        }
    }
    
    // =========================================================================
    // MANEJAR ENVÍO DEL FORMULARIO - CORREGIDO CON DEBUGGING
    // =========================================================================
    
    async handleSubmit() {
        console.log('🔐 Enviando solicitud de cambio de administrador...');
        
        // Validar formulario
        if (!this.validateForm()) {
            showAlert('Por favor corrige los errores en el formulario', 'error');
            return;
        }
        
        // Obtener valores
        const formData = {
            nuevoUsuario: this.newAdminUserInput.value.trim(),
            nuevoCorreo: this.newAdminEmailInput.value.trim(),
            nuevaPassword: this.newAdminPasswordInput.value,
            confirmarPassword: this.confirmAdminPasswordInput.value
        };
        
        console.log('📋 Datos del formulario:', {
            nuevoUsuario: formData.nuevoUsuario,
            nuevoCorreo: formData.nuevoCorreo,
            nuevaPasswordLength: formData.nuevaPassword.length,
            confirmarPasswordLength: formData.confirmarPassword.length
        });
        
        // Confirmación adicional por seguridad
        const confirmation = confirm(
            '⚠️ CONFIRMACIÓN DE SEGURIDAD\n\n' +
            'Estás a punto de solicitar un cambio de administrador. Esto:\n\n' +
            '1. Enviará un correo de confirmación a tu email\n' +
            '2. Requerirá que confirmes desde ese correo\n' +
            '3. Desactivará tu cuenta cuando sea confirmado\n\n' +
            '¿Continuar?'
        );
        
        if (!confirmation) {
            return;
        }
        
        // Deshabilitar botón de envío
        const originalText = this.submitBtn.innerHTML;
        this.submitBtn.disabled = true;
        this.submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Procesando...';
        
        try {
            // Verificar contraseña actual primero
            console.log('🔐 Verificando contraseña actual...');
            const verifyResponse = await api.call('/auth/verify-password', {
                method: 'POST',
                body: {
                    password: this.currentPasswordInput.value
                }
            });
            
            if (!verifyResponse.success) {
                throw new Error(verifyResponse.message || 'Contraseña actual incorrecta');
            }
            
            console.log('✅ Contraseña verificada, enviando solicitud...');
            
            // Enviar solicitud de cambio
            const response = await api.call('/admin/request-change', {
                method: 'POST',
                body: formData
            });
            
            console.log('📨 Respuesta del servidor:', response);
            
            if (!response.success) {
                throw new Error(response.message || 'Error al enviar solicitud');
            }
            
            // Éxito
            this.showSuccessMessage(response);
            
        } catch (error) {
            console.error('❌ Error en cambio de administrador:', error);
            
            // Mostrar error específico
            let errorMessage = error.message;
            
            if (errorMessage.includes('Contraseña actual incorrecta')) {
                this.updateFieldStatus(this.currentPasswordInput, false, 'Contraseña incorrecta');
                errorMessage = 'La contraseña actual es incorrecta';
            } else if (errorMessage.includes('ya está registrado')) {
                this.updateFieldStatus(this.newAdminEmailInput, false, 'Correo ya registrado');
                errorMessage = 'Este correo ya está registrado en el sistema';
            } else if (errorMessage.includes('nombre de usuario')) {
                this.updateFieldStatus(this.newAdminUserInput, false, 'Usuario ya en uso');
                errorMessage = 'Este nombre de usuario ya está en uso';
            } else if (errorMessage.includes('password')) {
                this.updateFieldStatus(this.newAdminPasswordInput, false, 'Contraseña inválida');
                errorMessage = 'La contraseña no cumple con los requisitos';
            }
            
            showAlert(`Error: ${errorMessage}`, 'error');
            
        } finally {
            // Restaurar botón
            this.submitBtn.disabled = false;
            this.submitBtn.innerHTML = originalText;
        }
    }
    
    // =========================================================================
    // MOSTRAR MENSAJE DE ÉXITO
    // =========================================================================
    
    showSuccessMessage(response) {
        this.closeModal();
        
        const message = `
            <div style="text-align: left;">
                <p><strong>✅ Solicitud enviada exitosamente</strong></p>
                <p>Se ha enviado un correo de verificación a tu email.</p>
                <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #3b82f6;">
                    <p style="margin: 5px 0; font-size: 14px;">
                        <i class="fas fa-id-badge"></i> <strong>ID de solicitud:</strong> ${response.requestId}
                    </p>
                    <p style="margin: 5px 0; font-size: 14px;">
                        <i class="fas fa-clock"></i> <strong>Expira:</strong> ${new Date(response.expiresAt).toLocaleString('es-MX')}
                    </p>
                    ${response.debug ? `
                    <p style="margin: 5px 0; font-size: 12px; color: #6b7280;">
                        <i class="fas fa-bug"></i> <strong>Debug:</strong> Contraseña procesada correctamente
                    </p>
                    ` : ''}
                </div>
                <p style="font-size: 13px; color: #6b7280;">
                    <i class="fas fa-info-circle"></i> Revisa tu correo para completar el proceso.
                </p>
            </div>
        `;
        
        if (typeof window.mostrarNotificacion === 'function') {
            window.mostrarNotificacion(message, 'success', 10000);
        } else {
            showAlert(message, 'success');
        }
        
        console.log('✅ Solicitud de cambio enviada:', response);
    }
    
    // =========================================================================
    // ABRIR/CERRAR MODAL
    // =========================================================================
    
    openModal() {
        if (!this.modal) return;
        
        this.form.reset();
        
        const formGroups = this.form.querySelectorAll('.form__group');
        formGroups.forEach(group => {
            group.classList.remove('form__group--error', 'form__group--success');
            const error = group.querySelector('.form__error');
            if (error) error.remove();
        });
        
        const inputs = this.form.querySelectorAll('input');
        inputs.forEach(input => {
            input.style.borderColor = '';
        });
        
        if (this.submitBtn) {
            this.submitBtn.disabled = true;
        }
        
        this.modal.style.display = 'flex';
        
        if (this.currentPasswordInput) {
            this.currentPasswordInput.focus();
        }
    }
    
    closeModal() {
        if (!this.modal) return;
        this.modal.style.display = 'none';
        this.form.reset();
    }
}

// =============================================================================
// EXPORTAR E INICIALIZAR
// =============================================================================

let adminChangeManager = null;

export function initializeAdminChange() {
    console.log('🔧 Inicializando sistema de cambio de administrador...');
    
    try {
        adminChangeManager = new AdminChangeManager();
        
        window.openAdminChangeModal = () => {
            if (adminChangeManager) {
                adminChangeManager.openModal();
            }
        };
        
        window.closeAdminChangeModal = () => {
            if (adminChangeManager) {
                adminChangeManager.closeModal();
            }
        };
        
        console.log('✅ Sistema de cambio de administrador inicializado');
        
    } catch (error) {
        console.error('❌ Error inicializando AdminChangeManager:', error);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeAdminChange);
} else {
    initializeAdminChange();
}

export default {
    initializeAdminChange,
    AdminChangeManager
};