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
            window.location.href = '/';
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
    // FORMULARIO 3: REGISTRO DE ADMINISTRADOR (post-validación de token)
    // =========================================================================

    registerAdminForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearAlert('alertContainerRegister');

      if (!validatedToken || !invitationData) {
        showAlert('alertContainerRegister', 'Error: token no validado. Regresa al paso anterior.');
        return;
      }

      const usuario         = document.getElementById('registerUsuario').value.trim();
      const password        = document.getElementById('registerPassword').value;
      const confirmPassword = document.getElementById('registerPasswordConfirm').value;

      // ── Validaciones cliente ──────────────────────────────────────────────
      if (!usuario) {
        showAlert('alertContainerRegister', 'El nombre de usuario es obligatorio');
        document.getElementById('registerUsuario').focus();
        return;
      }
      if (usuario.length < 3 || usuario.length > 30) {
        showAlert('alertContainerRegister', 'El nombre de usuario debe tener entre 3 y 30 caracteres');
        return;
      }
      if (!password || password.length < 6) {
        showAlert('alertContainerRegister', 'La contraseña debe tener al menos 6 caracteres');
        document.getElementById('registerPassword').focus();
        return;
      }
      if (password !== confirmPassword) {
        showAlert('alertContainerRegister', 'Las contraseñas no coinciden');
        document.getElementById('registerPasswordConfirm').focus();
        return;
      }

      const btn = document.getElementById('registerBtn');
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creando cuenta...';
      setLoading(true);

      try {
        const response = await fetch(`${API_URL}/api/superadmin/invitations/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token: validatedToken,
            usuario,
            password,
            confirmPassword,
          }),
        });

        const data = await response.json();

        if (data.success) {
          showAlert('alertContainerRegister',
            '✅ Cuenta creada exitosamente. Redirigiendo al login...', 'success');
          console.log('✅ Admin registrado:', data.user);

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