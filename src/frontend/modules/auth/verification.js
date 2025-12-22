const API_URL = window.location.origin;
        let userEmail = '';
        let userId = '';
        let countdownInterval = null;

        // Cargar datos de la página anterior
        document.addEventListener('DOMContentLoaded', () => {
            const params = new URLSearchParams(window.location.search);
            userEmail = params.get('email') || localStorage.getItem('recoveryEmail');
            userId = params.get('userId') || localStorage.getItem('recoveryUserId');

            if (!userEmail) {
                showAlert('Error: No se encontró el correo electrónico', 'error');
                setTimeout(() => window.location.href = 'forgot-password-step1.html', 2000);
                return;
            }

            document.getElementById('userEmail').textContent = userEmail;
            localStorage.setItem('recoveryEmail', userEmail);
            if (userId) localStorage.setItem('recoveryUserId', userId);

            // Crear inputs para código de 6 dígitos
            createCodeInputs();
            startCountdown(60); // 60 segundos para reenviar
        });

        // Crear inputs de código
        function createCodeInputs() {
            const container = document.getElementById('codeInputsContainer');
            container.innerHTML = '';

            for (let i = 0; i < 6; i++) {
                const input = document.createElement('input');
                input.type = 'text';
                input.maxLength = 1;
                input.className = 'code-input';
                input.dataset.index = i;
                input.inputMode = 'numeric';
                input.pattern = '[0-9]*';
                
                input.addEventListener('input', (e) => {
                    handleCodeInput(e, i);
                });
                
                input.addEventListener('keydown', (e) => {
                    handleCodeKeydown(e, i);
                });
                
                input.addEventListener('paste', handlePaste);
                
                container.appendChild(input);
            }

            // Enfocar el primer input
            container.firstElementChild.focus();
        }

        // Manejar entrada de código
        function handleCodeInput(e, index) {
            const input = e.target;
            const value = input.value;
            
            // Solo permitir números
            if (!/^\d*$/.test(value)) {
                input.value = '';
                return;
            }
            
            if (value && index < 5) {
                const nextInput = document.querySelector(`.code-input[data-index="${index + 1}"]`);
                if (nextInput) nextInput.focus();
            }
            
            checkCodeCompletion();
        }

        // Manejar teclas en código
        function handleCodeKeydown(e, index) {
            const input = e.target;
            
            if (e.key === 'Backspace' && !input.value && index > 0) {
                const prevInput = document.querySelector(`.code-input[data-index="${index - 1}"]`);
                if (prevInput) {
                    prevInput.focus();
                    prevInput.value = '';
                }
            }
            
            if (e.key === 'ArrowLeft' && index > 0) {
                const prevInput = document.querySelector(`.code-input[data-index="${index - 1}"]`);
                if (prevInput) prevInput.focus();
            }
            
            if (e.key === 'ArrowRight' && index < 5) {
                const nextInput = document.querySelector(`.code-input[data-index="${index + 1}"]`);
                if (nextInput) nextInput.focus();
            }
        }

        // Manejar pegado de código
        function handlePaste(e) {
            e.preventDefault();
            const pasteData = e.clipboardData.getData('text');
            const numbers = pasteData.replace(/\D/g, '').split('').slice(0, 6);
            
            const inputs = document.querySelectorAll('.code-input');
            numbers.forEach((num, i) => {
                if (inputs[i]) {
                    inputs[i].value = num;
                }
            });
            
            if (numbers.length === 6) {
                document.getElementById('verifyBtn').focus();
            } else if (numbers.length > 0) {
                inputs[numbers.length - 1].focus();
            }
            
            checkCodeCompletion();
        }

        // Verificar si el código está completo
        function checkCodeCompletion() {
            const inputs = document.querySelectorAll('.code-input');
            const code = Array.from(inputs).map(input => input.value).join('');
            const verifyBtn = document.getElementById('verifyBtn');
            
            verifyBtn.disabled = code.length !== 6;
        }

        // Mostrar alertas
        function showAlert(message, type = 'info') {
            const container = document.getElementById('alertContainer');
            const iconMap = {
                success: 'check-circle',
                error: 'exclamation-circle',
                info: 'info-circle'
            };
            
            container.innerHTML = `
                <div class="alert alert-${type}">
                    <i class="fas fa-${iconMap[type]}"></i>
                    <span>${message}</span>
                </div>
            `;
        }

        // Iniciar contador para reenvío
        function startCountdown(seconds) {
            const resendLink = document.getElementById('resendLink');
            const countdownSpan = document.getElementById('countdown');
            const resendContainer = document.getElementById('resendContainer');
            
            resendLink.style.display = 'none';
            countdownSpan.classList.remove('hidden');
            resendContainer.classList.add('disabled');
            
            let remaining = seconds;
            
            countdownInterval = setInterval(() => {
                countdownSpan.textContent = ` (${remaining}s)`;
                remaining--;
                
                if (remaining < 0) {
                    clearInterval(countdownInterval);
                    resendLink.style.display = 'inline';
                    countdownSpan.classList.add('hidden');
                    resendContainer.classList.remove('disabled');
                }
            }, 1000);
        }

        // Reenviar código
        document.getElementById('resendLink').addEventListener('click', async (e) => {
            e.preventDefault();
            
            const resendLink = document.getElementById('resendLink');
            if (resendLink.closest('.disabled')) return;
            
            const btn = document.getElementById('verifyBtn');
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';
            
            try {
                const response = await fetch(`${API_URL}/api/auth/forgot-password`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ correo: userEmail })
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    showAlert('Nuevo código enviado a tu correo', 'success');
                    clearCodeInputs();
                    startCountdown(60);
                } else {
                    showAlert(data.message || 'Error al reenviar código', 'error');
                }
            } catch (error) {
                console.error('Error:', error);
                showAlert('Error de conexión', 'error');
            } finally {
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-check"></i> Verificar Código';
            }
        });

        // Limpiar inputs de código
        function clearCodeInputs() {
            const inputs = document.querySelectorAll('.code-input');
            inputs.forEach(input => input.value = '');
            inputs[0].focus();
            checkCodeCompletion();
        }

        // Botón para volver
        document.getElementById('backBtn').addEventListener('click', () => {
            window.location.href = 'forgot-password-step1.html';
        });

        // Enviar formulario de verificación
        document.getElementById('verifyCodeForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const inputs = document.querySelectorAll('.code-input');
            const code = Array.from(inputs).map(input => input.value).join('');
            
            if (code.length !== 6) {
                showAlert('Por favor ingresa los 6 dígitos del código', 'error');
                return;
            }
            
            const btn = document.getElementById('verifyBtn');
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verificando...';
            
            try {
                const response = await fetch(`${API_URL}/api/auth/verify-code`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ 
                        correo: userEmail, 
                        codigo: code 
                    })
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    showAlert('✅ Código verificado correctamente', 'success');
                    
                    // Guardar token y redirigir a cambiar contraseña
                    localStorage.setItem('changePasswordToken', data.token);
                    
                    setTimeout(() => {
                        window.location.href = `reset-password.html?token=${data.token}`;
                    }, 1500);
                } else {
                    showAlert(data.message || 'Código incorrecto', 'error');
                    clearCodeInputs();
                    btn.disabled = false;
                    btn.innerHTML = '<i class="fas fa-check"></i> Verificar Código';
                }
            } catch (error) {
                console.error('Error:', error);
                showAlert('Error de conexión', 'error');
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-check"></i> Verificar Código';
            }
        });