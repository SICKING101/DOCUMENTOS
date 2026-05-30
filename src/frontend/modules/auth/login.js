// =========================================================================
    // login.js inline — Lógica de login + validación de token de invitación
    // =========================================================================

    const API_URL = window.location.origin;

    // ── Referencias DOM ───────────────────────────────────────────────────────
    const loginPanel        = document.getElementById('loginPanel');
    const tokenPanel        = document.getElementById('tokenPanel');
    const registerPanel     = document.getElementById('registerPanel');
    const loading           = document.getElementById('loading');

    const loginForm         = document.getElementById('loginForm');
    const tokenForm         = document.getElementById('tokenForm');
    const registerAdminForm = document.getElementById('registerAdminForm');

    const goToTokenBtn      = document.getElementById('goToTokenBtn');
    const backToLoginBtn    = document.getElementById('backToLoginBtn');
    const backToTokenBtn    = document.getElementById('backToTokenBtn');

    // Panel info (izquierda)
    const panelTitle      = document.getElementById('panelTitle');
    const panelSubtitle   = document.getElementById('panelSubtitle');
    const loginFeatures   = document.getElementById('loginFeatures');
    const tokenFeatures   = document.getElementById('tokenFeatures');

    // Estado interno
    let validatedToken = null;     // Token que fue validado exitosamente
    let invitationData = null;     // Datos devueltos por la API tras validar

    // ── Utilidades ────────────────────────────────────────────────────────────

    // =============================================================================
// LOGIN PRELOADER - 4 segundos obligatorios al cargar login.html
// =============================================================================

(function() {
  'use strict';

  const PRELOADER_DURATION = 4000; // 4 segundos
  const preloader = document.getElementById('loginPreloader');
  const progressBar = document.getElementById('preloaderProgressBar');

  if (!preloader) return;

  const startTime = Date.now();

  // ── Animación de la barra de progreso ──────────────────────────────
  function updateProgress() {
    if (!progressBar) return;
    
    const elapsed = Date.now() - startTime;
    const progress = Math.min((elapsed / PRELOADER_DURATION) * 100, 100);
    progressBar.style.width = progress + '%';

    if (elapsed < PRELOADER_DURATION) {
      requestAnimationFrame(updateProgress);
    }
  }

  requestAnimationFrame(updateProgress);

  // ── Ocultar preloader después del tiempo definido ──────────────────
  setTimeout(() => {
    preloader.classList.add('hidden');
    
    setTimeout(() => {
      if (preloader.parentNode) {
        preloader.remove();
      }
    }, 500);
    
    console.log('✅ Login listo - sesiones previas limpiadas');
  }, PRELOADER_DURATION);

  // ── Funciones globales para mostrar/ocultar durante procesos ─────
  window.showLoginProcessPreloader = function(message = 'Procesando...') {
    let processPreloader = document.getElementById('loginProcessPreloader');
    
    if (!processPreloader) {
      processPreloader = document.createElement('div');
      processPreloader.id = 'loginProcessPreloader';
      processPreloader.className = 'login-preloader-overlay';
      processPreloader.innerHTML = `
        <div class="login-preloader-content">
          <div class="login-preloader-spinner"></div>
          <h2 class="login-preloader-title">Gestacks</h2>
          <p class="login-preloader-subtitle" id="loginProcessMessage">${message}</p>
        </div>
      `;
      document.body.appendChild(processPreloader);
    } else {
      const msg = document.getElementById('loginProcessMessage');
      if (msg) msg.textContent = message;
      processPreloader.classList.remove('hidden');
    }
  };

  window.hideLoginProcessPreloader = function() {
    const processPreloader = document.getElementById('loginProcessPreloader');
    if (processPreloader) {
      processPreloader.classList.add('hidden');
      setTimeout(() => {
        if (processPreloader.parentNode) {
          processPreloader.remove();
        }
      }, 500);
    }
  };

})();

    function setLoading(show) {
      loading.classList.toggle('hidden', !show);
    }

    function showAlert(containerId, message, type = 'error') {
      const container = document.getElementById(containerId);
      if (!container) return;
      const icon = type === 'success' ? 'check-circle' : type === 'warning' ? 'exclamation-triangle' : 'exclamation-circle';
      container.innerHTML = `
        <div class="alert alert-${type}" style="margin-bottom: 16px;">
          <i class="fas fa-${icon}"></i> ${message}
        </div>
      `;
    }

    function clearAlert(containerId) {
      const container = document.getElementById(containerId);
      if (container) container.innerHTML = '';
    }

    function togglePasswordVisibility(inputId, btnId) {
      const input = document.getElementById(inputId);
      const btn   = document.getElementById(btnId);
      if (!input || !btn) return;
      btn.addEventListener('click', () => {
        const isPassword = input.type === 'password';
        input.type = isPassword ? 'text' : 'password';
        const icon = btn.querySelector('i');
        icon.classList.toggle('fa-eye', !isPassword);
        icon.classList.toggle('fa-eye-slash', isPassword);
      });
    }

    // ── Función para escapar HTML ──────────────────────────────────
    function escapeHtml(text) {
      if (!text) return '';
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }

    // ── Función para mostrar modal de sistema cerrado ──────────────
    function showSystemClosedModal(type, reason) {
      const existing = document.getElementById('systemClosedModal');
      if (existing) existing.remove();

      const modalHTML = `
        <div class="sa-modal" id="systemClosedModal" style="display:flex;z-index:10000;">
          <div class="sa-modal__backdrop" onclick="document.getElementById('systemClosedModal').remove()"></div>
          <div class="sa-modal__dialog" style="max-width:480px;text-align:center;">
            <div class="sa-modal__header" style="justify-content:center;border-bottom:none;">
              <div class="sa-modal__header-icon" style="background:rgba(251,191,36,0.15);border:1px solid rgba(251,191,36,0.3);">
                <i class="fas fa-triangle-exclamation" style="color:#f59e0b;"></i>
              </div>
            </div>
            <div class="sa-modal__body">
              <div style="display:flex;flex-direction:column;align-items:center;gap:1rem;padding:1rem 0;">
                <div style="width:72px;height:72px;border-radius:50%;background:rgba(251,191,36,0.15);border:2px solid rgba(251,191,36,0.3);display:flex;align-items:center;justify-content:center;">
                  <i class="fas fa-lock" style="font-size:2rem;color:#f59e0b;"></i>
                </div>
                <h3 style="font-family:'Syne',sans-serif;font-size:1.3rem;color:#2d3748;margin:0;">
                  ${type === 'system_closed' ? 'Sistema Cerrado' : 'Acceso Suspendido'}
                </h3>
                <p style="color:#6b7280;font-size:.95rem;line-height:1.6;margin:0;">
                  ${type === 'system_closed'
                    ? 'El sistema se encuentra temporalmente cerrado por mantenimiento.'
                    : 'El acceso para tu escuela ha sido temporalmente suspendido.'
                  }
                </p>
                ${reason ? `
                  <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:1rem;width:100%;text-align:left;">
                    <strong style="font-size:.8rem;color:#9ca3af;">Motivo:</strong>
                    <p style="margin:.25rem 0 0 0;font-size:.85rem;color:#6b7280;">${escapeHtml(reason)}</p>
                  </div>
                ` : ''}
                <p style="font-size:.8rem;color:#9ca3af;margin:0;">
                  <i class="fas fa-circle-info"></i>
                  Intenta nuevamente más tarde o contacta al administrador.
                </p>
              </div>
            </div>
            <div class="sa-modal__footer" style="justify-content:center;border-top:none;">
              <button class="sa-btn sa-btn--primary" onclick="document.getElementById('systemClosedModal').remove()">
                <i class="fas fa-check"></i> Entendido
              </button>
            </div>
          </div>
        </div>
      `;

      document.body.insertAdjacentHTML('beforeend', modalHTML);

      const escHandler = (e) => {
        if (e.key === 'Escape') {
          document.getElementById('systemClosedModal')?.remove();
          document.removeEventListener('keydown', escHandler);
        }
      };
      document.addEventListener('keydown', escHandler);
    }

    // ── Navegación entre paneles ──────────────────────────────────────────────

    function showPanel(panel) {
      loginPanel.classList.add('hidden');
      tokenPanel.classList.add('hidden');
      registerPanel.classList.add('hidden');

      if (panel === 'login') {
        loginPanel.classList.remove('hidden');
        panelTitle.textContent    = 'Sistema de Gestión de Documentos';
        panelSubtitle.textContent = 'Plataforma de administración institucional';
        loginFeatures.classList.remove('hidden');
        tokenFeatures.classList.add('hidden');
      } else if (panel === 'token') {
        tokenPanel.classList.remove('hidden');
        panelTitle.textContent    = 'Validar Token de Invitación';
        panelSubtitle.textContent = 'Acceso exclusivo por invitación';
        loginFeatures.classList.add('hidden');
        tokenFeatures.classList.remove('hidden');
      } else if (panel === 'register') {
        registerPanel.classList.remove('hidden');
        panelTitle.textContent    = 'Crear cuenta de Administrador';
        panelSubtitle.textContent = 'Último paso para acceder al sistema';
        loginFeatures.classList.add('hidden');
        tokenFeatures.classList.remove('hidden');
      }
    }

    goToTokenBtn.addEventListener('click', () => {
      clearAlert('alertContainerLogin');
      document.getElementById('invitationToken').value = '';
      showPanel('token');
    });

    backToLoginBtn.addEventListener('click', () => {
      clearAlert('alertContainerToken');
      showPanel('login');
    });

    backToTokenBtn.addEventListener('click', () => {
      clearAlert('alertContainerRegister');
      validatedToken  = null;
      invitationData  = null;
      showPanel('token');
    });

    // ── Auto-mayúsculas en el input del token ─────────────────────────────────
    document.getElementById('invitationToken').addEventListener('input', function () {
      const val = this.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
      this.value = val;
    });

    // ── Toggle passwords ──────────────────────────────────────────────────────
    togglePasswordVisibility('loginPassword', 'toggleLoginPassword');
    togglePasswordVisibility('registerPassword', 'toggleRegisterPassword');
    togglePasswordVisibility('registerPasswordConfirm', 'toggleRegisterConfirm');

    // =========================================================================
    // FORMULARIO 1: LOGIN (COMPLETO - CON MANEJO DE SISTEMA CERRADO)
    // =========================================================================

    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearAlert('alertContainerLogin');

      const usuarioOCorreo = document.getElementById('loginUsuario').value.trim();
      const password       = document.getElementById('loginPassword').value;

      if (!usuarioOCorreo || !password) {
        showAlert('alertContainerLogin', 'Por favor completa todos los campos');
        return;
      }

      const btn = document.getElementById('loginBtn');
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Iniciando...';
      setLoading(true);

      try {
        const response = await fetch(`${API_URL}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ usuarioOCorreo, password }),
        });

        const data = await response.json();

        // ═══════════════════════════════════════════════════════
        // MANEJO DE SISTEMA CERRADO
        // ═══════════════════════════════════════════════════════
        if (response.status === 503 && data.accessDenied) {
          console.log(`🚫 Login bloqueado: ${data.type} - ${data.reason}`);
          showSystemClosedModal(data.type, data.reason);
          btn.disabled = false;
          btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Iniciar Sesión';
          setLoading(false);
          return;
        }
        // ═══════════════════════════════════════════════════════

        if (data.success) {
          localStorage.setItem('token', data.token);
          localStorage.setItem('user', JSON.stringify(data.user));

          if (data.user?.isSuperAdmin) {
            console.log('🛡️ SuperAdmin detectado → redirigiendo al dashboard especial');
            window.location.href = '/superadmin-dashboard.html';
          } else {
            console.log('✅ Login exitoso → redirigiendo al dashboard principal');
            window.location.href = '/index.html';
          }
        } else {
          showAlert('alertContainerLogin', data.message || 'Credenciales incorrectas');
          btn.disabled = false;
          btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Iniciar Sesión';
        }
      } catch (err) {
        console.error('Error en login:', err);
        showAlert('alertContainerLogin', 'Error al conectar con el servidor. Intenta de nuevo.');
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Iniciar Sesión';
      } finally {
        setLoading(false);
      }
    });

    // =========================================================================
    // FORMULARIO 2: VALIDAR TOKEN DE INVITACIÓN
    // =========================================================================

    tokenForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearAlert('alertContainerToken');

      const token = document.getElementById('invitationToken').value.trim().toUpperCase();

      if (!token || token.length !== 8) {
        showAlert('alertContainerToken', 'El token debe tener exactamente 8 caracteres');
        return;
      }

      const btn = document.getElementById('validateTokenBtn');
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Validando...';
      setLoading(true);

      try {
        const response = await fetch(`${API_URL}/api/superadmin/invitations/validate/${encodeURIComponent(token)}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });

        const data = await response.json();

        if (data.success) {
          // Token válido → guardar datos y pasar al registro
          validatedToken = token;
          invitationData = data.data;

          console.log('✅ Token válido:', invitationData);

          // Pre-llenar el formulario de registro
          document.getElementById('registerEmail').value = invitationData.email;
          document.getElementById('registerSubtitle').textContent =
            `Administrador de ${invitationData.schoolName}`;

          // Mostrar info de la escuela
          const schoolInfoBox = document.getElementById('schoolInfoBox');
          document.getElementById('schoolNameDisplay').textContent = invitationData.schoolName;
          document.getElementById('schoolIdDisplay').textContent   = `ID: ${invitationData.schoolId}`;
          schoolInfoBox.style.display = 'flex';

          showPanel('register');
        } else {
          // Mensajes de error específicos por código
          const msgMap = {
            TOKEN_NOT_FOUND: 'Token no encontrado. Verifica que lo hayas escrito correctamente.',
            TOKEN_USED:      'Este token ya fue utilizado. Contacta al administrador.',
            TOKEN_REVOKED:   'Este token fue revocado. Solicita una nueva invitación.',
            TOKEN_EXPIRED:   'Este token ha expirado. Solicita una nueva invitación.',
            TOO_MANY_ATTEMPTS: 'Demasiados intentos fallidos. El token fue revocado por seguridad.',
          };
          showAlert('alertContainerToken', msgMap[data.code] || data.message || 'Token inválido');
        }
      } catch (err) {
        console.error('Error validando token:', err);
        showAlert('alertContainerToken', 'Error al conectar con el servidor. Intenta de nuevo.');
      } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-check-circle"></i> Validar Token';
        setLoading(false);
      }
    });

        // =========================================================================
    // FORMULARIO 3: REGISTRO DE ADMINISTRADOR (VALIDACIONES PERSISTENTES)
    // =========================================================================

    // ── Referencias a los inputs de registro ──────────────────────────────
    const registerUsuarioInput  = document.getElementById('registerUsuario');
    const registerPasswordInput = document.getElementById('registerPassword');
    const registerConfirmInput  = document.getElementById('registerPasswordConfirm');
    const registerBtn           = document.getElementById('registerBtn');

    // ── Funciones de validación inline ────────────────────────────────────

    const COMMON_PASSWORDS = [
        '123456', 'password', 'qwerty', '123456789', 'abc123', 'letmein',
        'welcome', 'monkey', 'dragon', 'master', '111111', '123123',
        'admin123', 'pass123', 'iloveyou', 'sunshine', 'princess',
        'football', 'shadow', 'superman'
    ];

    function validateUsernameLocal(username) {
        const errors = [];
        if (!username || username.trim() === '') {
            errors.push('El usuario no puede estar vacío');
            return { isValid: false, errors };
        }
        if (username.length < 3) {
            errors.push('El usuario debe tener al menos 3 caracteres');
        }
        if (username.length > 30) {
            errors.push('Máximo 30 caracteres');
        }
        if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
            errors.push('Solo letras, números, guiones y guiones bajos');
        }
        if (/^\d+$/.test(username)) {
            errors.push('El usuario no puede ser solo números');
        }
        return { isValid: errors.length === 0, errors };
    }

    function validatePasswordLocal(password) {
        const errors = [];
        let strengthScore = 0;

        if (!password || password.trim() === '') {
            errors.push('La contraseña no puede estar vacía');
            return { isValid: false, errors, strength: 'debil' };
        }

        if (password.length < 8) {
            errors.push('Mínimo 8 caracteres');
        } else {
            strengthScore += 1;
            if (password.length >= 12) strengthScore += 1;
        }

        const hasUpper   = /[A-Z]/.test(password);
        const hasLower   = /[a-z]/.test(password);
        const hasNumber  = /[0-9]/.test(password);
        const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};:'"\\|,.<>\/?]/.test(password);

        const complexity = [hasUpper, hasLower, hasNumber, hasSpecial].filter(Boolean).length;

        if (complexity < 3) {
            const missing = [];
            if (!hasUpper)   missing.push('mayúscula');
            if (!hasLower)   missing.push('minúscula');
            if (!hasNumber)  missing.push('número');
            if (!hasSpecial) missing.push('carácter especial (!@#$...)');
            errors.push(`Falta: ${missing.join(', ')}`);
        }

        strengthScore += complexity;

        if (COMMON_PASSWORDS.some(cp => password.toLowerCase().includes(cp))) {
            errors.push('Contraseña muy común o débil');
            strengthScore = Math.max(0, strengthScore - 2);
        }

        let strength = 'debil';
        if (strengthScore >= 5 && errors.length === 0) {
            strength = 'fuerte';
        } else if (strengthScore >= 3) {
            strength = 'media';
        }

        return { isValid: errors.length === 0, errors, strength };
    }

    function validateConfirmPasswordLocal(password, confirmPassword) {
        const errors = [];
        if (!confirmPassword || confirmPassword.trim() === '') {
            errors.push('Confirma tu contraseña');
            return { isValid: false, errors };
        }
        if (password !== confirmPassword) {
            errors.push('Las contraseñas no coinciden');
            return { isValid: false, errors };
        }
        return { isValid: true, errors: [] };
    }

    function getStrengthColor(strength) {
        return { debil: '#dc3545', media: '#ffc107', fuerte: '#28a745' }[strength] || '#dc3545';
    }

    function getStrengthText(strength) {
        return { debil: 'Débil', media: 'Media', fuerte: 'Fuerte' }[strength] || 'Débil';
    }

    // ═════════════════════════════════════════════════════════════════════
    // FUNCIÓN CLAVE: Actualizar UI de validación (NUNCA DESAPARECE)
    // ═════════════════════════════════════════════════════════════════════

function updateFieldUI(inputElement, validation, fieldType) {
    const inputGroup = inputElement.closest('.input-group');
    if (!inputGroup) return;

    // ── 1. Actualizar clases del input ──────────────────────────────
    inputElement.classList.remove('input-error', 'input-valid');
    if (validation.errors.length > 0) {
        inputElement.classList.add('input-error');
    } else if (inputElement.value.trim()) {
        inputElement.classList.add('input-valid');
    }

    // ── 2. Buscar o crear el contenedor de feedback ─────────────────
    // El feedback va DESPUÉS del input-group, como hermano siguiente
    let feedbackContainer = inputGroup.nextElementSibling;
    if (!feedbackContainer || !feedbackContainer.classList.contains('validation-feedback')) {
        feedbackContainer = document.createElement('div');
        feedbackContainer.className = 'validation-feedback';
        inputGroup.parentNode.insertBefore(feedbackContainer, inputGroup.nextSibling);
    }

    // ── 3. Limpiar contenido anterior ───────────────────────────────
    feedbackContainer.innerHTML = '';

    // ── 4. Renderizar errores ───────────────────────────────────────
    if (validation.errors.length > 0) {
        validation.errors.slice(0, 3).forEach(err => {
            const errorMsg = document.createElement('div');
            errorMsg.className = 'field-error-msg';
            errorMsg.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${err}`;
            feedbackContainer.appendChild(errorMsg);
        });
    }

    // ── 5. Renderizar fortaleza (solo para contraseña) ──────────────
    if (fieldType === 'password' && validation.strength && inputElement.value) {
        const color = getStrengthColor(validation.strength);
        const text  = getStrengthText(validation.strength);
        const widthMap = { debil: '33%', media: '66%', fuerte: '100%' };
        const width = widthMap[validation.strength] || '33%';

        const strengthDiv = document.createElement('div');
        strengthDiv.className = 'field-strength';
        strengthDiv.innerHTML = `
            <div class="field-strength-bar">
                <div class="field-strength-fill" style="width:${width};background:${color};"></div>
            </div>
            <span class="field-strength-text" style="color:${color};">🔒 ${text}</span>
        `;
        feedbackContainer.appendChild(strengthDiv);
    }

    // ── 6. Mensaje de éxito cuando está todo bien ───────────────────
    if (validation.errors.length === 0 && inputElement.value.trim()) {
        const successMsg = fieldType === 'confirm-password' ? 'Las contraseñas coinciden' : '✓ Válido';
        const icon = fieldType === 'confirm-password' ? 'fa-check-circle' : 'fa-check';

        const successDiv = document.createElement('div');
        successDiv.className = 'field-success-msg';
        successDiv.innerHTML = `<i class="fas ${icon}"></i> ${successMsg}`;
        feedbackContainer.appendChild(successDiv);
    }
}

    // ═════════════════════════════════════════════════════════════════════
    // ACTUALIZAR ESTADO DEL BOTÓN DE REGISTRO
    // ═════════════════════════════════════════════════════════════════════

    function updateRegisterButton() {
        if (!registerBtn) return;

        const userVal    = registerUsuarioInput?.value.trim() || '';
        const passVal    = registerPasswordInput?.value || '';
        const confirmVal = registerConfirmInput?.value || '';

        const userOk    = userVal && validateUsernameLocal(userVal).isValid;
        const passOk    = passVal && validatePasswordLocal(passVal).isValid;
        const confirmOk = confirmVal && validateConfirmPasswordLocal(passVal, confirmVal).isValid;

        const allValid = userOk && passOk && confirmOk;

        registerBtn.disabled = !allValid;
        if (allValid) {
            registerBtn.classList.add('btn-enabled');
        } else {
            registerBtn.classList.remove('btn-enabled');
        }
    }

    // ═════════════════════════════════════════════════════════════════════
    // EVENT LISTENERS: Validación en tiempo real SIEMPRE visible
    // ═════════════════════════════════════════════════════════════════════

    if (registerUsuarioInput) {
        registerUsuarioInput.addEventListener('input', function() {
            const validation = validateUsernameLocal(this.value);
            updateFieldUI(this, validation, 'username');
            updateRegisterButton();
        });

        registerUsuarioInput.addEventListener('blur', function() {
            const validation = validateUsernameLocal(this.value);
            updateFieldUI(this, validation, 'username');
            updateRegisterButton();
        });
    }

    if (registerPasswordInput) {
        registerPasswordInput.addEventListener('input', function() {
            const validation = validatePasswordLocal(this.value);
            updateFieldUI(this, validation, 'password');
            updateRegisterButton();

            // Re-validar confirmación si ya tiene texto
            if (registerConfirmInput && registerConfirmInput.value) {
                const confirmValidation = validateConfirmPasswordLocal(this.value, registerConfirmInput.value);
                updateFieldUI(registerConfirmInput, confirmValidation, 'confirm-password');
            }
        });

        registerPasswordInput.addEventListener('blur', function() {
            const validation = validatePasswordLocal(this.value);
            updateFieldUI(this, validation, 'password');
        });
    }

    if (registerConfirmInput && registerPasswordInput) {
        registerConfirmInput.addEventListener('input', function() {
            const validation = validateConfirmPasswordLocal(registerPasswordInput.value, this.value);
            updateFieldUI(this, validation, 'confirm-password');
            updateRegisterButton();
        });

        registerConfirmInput.addEventListener('blur', function() {
            const validation = validateConfirmPasswordLocal(registerPasswordInput.value, this.value);
            updateFieldUI(this, validation, 'confirm-password');
        });
    }

    // ═════════════════════════════════════════════════════════════════════
    // SUBMIT DEL FORMULARIO
    // ═════════════════════════════════════════════════════════════════════

    registerAdminForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearAlert('alertContainerRegister');

        if (!validatedToken || !invitationData) {
            showAlert('alertContainerRegister', 'Error: token no validado. Regresa al paso anterior.');
            return;
        }

        const usuario         = registerUsuarioInput.value.trim();
        const password        = registerPasswordInput.value;
        const confirmPassword = registerConfirmInput.value;

        // ── Validaciones finales ──────────────────────────────────────
        let hasErrors = false;

        const userValidation = validateUsernameLocal(usuario);
        updateFieldUI(registerUsuarioInput, userValidation, 'username');
        if (!userValidation.isValid) hasErrors = true;

        const passValidation = validatePasswordLocal(password);
        updateFieldUI(registerPasswordInput, passValidation, 'password');
        if (!passValidation.isValid) hasErrors = true;

        const confirmValidation = validateConfirmPasswordLocal(password, confirmPassword);
        updateFieldUI(registerConfirmInput, confirmValidation, 'confirm-password');
        if (!confirmValidation.isValid) hasErrors = true;

        if (hasErrors) {
            if (!userValidation.isValid) registerUsuarioInput.focus();
            else if (!passValidation.isValid) registerPasswordInput.focus();
            else registerConfirmInput.focus();
            return;
        }

        // ── Enviar al servidor ───────────────────────────────────────
        const btn = document.getElementById('registerBtn');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creando cuenta...';
        setLoading(true);

        try {
            const response = await fetch(`${API_URL}/api/superadmin/invitations/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: validatedToken, usuario, password, confirmPassword }),
            });

            const data = await response.json();

            if (data.success) {
                showAlert('alertContainerRegister',
                    '✅ Cuenta creada exitosamente. Redirigiendo al login...', 'success');
                setTimeout(() => {
                    window.location.href = data.loginUrl || '/login.html';
                }, 2500);
            } else {
                showAlert('alertContainerRegister', data.message || 'Error al crear la cuenta');
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-user-check"></i> Crear cuenta de Administrador';
            }
        } catch (err) {
            console.error('Error en registro:', err);
            showAlert('alertContainerRegister', 'Error al conectar con el servidor. Intenta de nuevo.');
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-user-check"></i> Crear cuenta de Administrador';
        } finally {
            setLoading(false);
        }
    });

    // =========================================================================
    // INICIALIZACIÓN
    // =========================================================================

    // Si venimos con ?token= en la URL, ir directo al panel de token
    const urlParams = new URLSearchParams(window.location.search);
    const urlToken  = urlParams.get('token');

    if (urlToken) {
      document.getElementById('invitationToken').value = urlToken.toUpperCase().substring(0, 8);
      showPanel('token');
    } else {
      showPanel('login');
    }

    console.log('✅ Login page inicializada');