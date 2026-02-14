// =============================================================================
// ADMIN ENHANCED - Funciones mejoradas para el panel de administración
// =============================================================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Admin Enhanced inicializado');
    
    // Inicializar password strength meter
    const passwordInput = document.getElementById('userPassword');
    if (passwordInput) {
        passwordInput.addEventListener('input', evaluarFortalezaPassword);
    }
    
    // Inicializar toggle de estado de usuario
    const userActive = document.getElementById('userActive');
    const userActiveLabel = document.getElementById('userActiveLabel');
    if (userActive && userActiveLabel) {
        userActive.addEventListener('change', (e) => {
            userActiveLabel.textContent = e.target.checked ? 'Activo' : 'Inactivo';
        });
    }
    
    // Inicializar exportación de usuarios
    const exportUsersBtn = document.getElementById('exportUsersBtn');
    if (exportUsersBtn) {
        exportUsersBtn.addEventListener('click', exportarUsuarios);
    }
    
    // Inicializar exportación de logs
    const exportLogsBtn = document.getElementById('exportLogsBtn');
    if (exportLogsBtn) {
        exportLogsBtn.addEventListener('click', exportarLogs);
    }
    
    // Inicializar date range picker (simulado)
    const dateRange = document.getElementById('dateRange');
    if (dateRange) {
        dateRange.addEventListener('click', () => {
            mostrarInfo('Selecciona un rango de fechas en el filtro avanzado');
        });
    }
});

// =============================================================================
// PASSWORD STRENGTH METER
// =============================================================================

function evaluarFortalezaPassword() {
    const password = document.getElementById('userPassword')?.value || '';
    const strengthBar = document.querySelector('.strength-bar::before');
    const strengthText = document.querySelector('.strength-text');
    const container = document.querySelector('.password-strength');
    
    if (!container) return;
    
    if (password.length === 0) {
        container.classList.remove('show');
        return;
    }
    
    container.classList.add('show');
    
    // Criterios de fortaleza
    const tieneMinLength = password.length >= 6;
    const tieneMayuscula = /[A-Z]/.test(password);
    const tieneMinuscula = /[a-z]/.test(password);
    const tieneNumero = /\d/.test(password);
    const tieneEspecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    
    const criteriosCumplidos = [tieneMinLength, tieneMayuscula, tieneMinuscula, tieneNumero, tieneEspecial].filter(Boolean).length;
    
    let fortaleza = 0;
    let mensaje = '';
    let color = '';
    
    if (criteriosCumplidos <= 2) {
        fortaleza = 25;
        mensaje = 'Débil';
        color = 'var(--danger)';
    } else if (criteriosCumplidos <= 4) {
        fortaleza = 50;
        mensaje = 'Media';
        color = 'var(--warning)';
    } else {
        fortaleza = 100;
        mensaje = 'Fuerte';
        color = 'var(--success)';
    }
    
    // Actualizar barra (usando CSS variable)
    document.querySelector('.strength-bar').style.setProperty('--strength-width', fortaleza + '%');
    document.querySelector('.strength-bar').style.background = `linear-gradient(90deg, ${color} 0%, ${color} ${fortaleza}%, var(--bg-tertiary) ${fortaleza}%)`;
    
    if (strengthText) {
        strengthText.textContent = `Fortaleza: ${mensaje}`;
        strengthText.style.color = color;
    }
}

// =============================================================================
// EXPORTAR DATOS
// =============================================================================

function exportarUsuarios() {
    try {
        // Preparar datos para exportar
        const datos = usuarios.map(user => ({
            Usuario: user.usuario,
            Correo: user.correo,
            Rol: user.rol,
            Estado: user.activo ? 'Activo' : 'Inactivo',
            'Último Acceso': user.ultimoAcceso ? new Date(user.ultimoAcceso).toLocaleString('es-MX') : 'Nunca',
            'Total Permisos': obtenerPermisosEfectivos(user).length
        }));
        
        if (datos.length === 0) {
            mostrarAdvertencia('No hay datos para exportar');
            return;
        }
        
        // Convertir a CSV
        const csv = convertirACSV(datos);
        
        // Descargar archivo
        descargarArchivo(csv, 'usuarios.csv', 'text/csv');
        
        mostrarExito(`${datos.length} usuarios exportados correctamente`);
        
    } catch (error) {
        console.error('Error exportando usuarios:', error);
        mostrarError('Error al exportar usuarios');
    }
}

function exportarLogs() {
    try {
        // Obtener datos de la tabla
        const rows = document.querySelectorAll('#logsTable tbody tr');
        const datos = [];
        
        rows.forEach(row => {
            const cells = row.querySelectorAll('td');
            if (cells.length === 5) {
                datos.push({
                    Fecha: cells[0].textContent,
                    Usuario: cells[1].textContent,
                    Acción: cells[2].textContent,
                    Detalles: cells[3].textContent,
                    IP: cells[4].textContent
                });
            }
        });
        
        if (datos.length === 0) {
            mostrarAdvertencia('No hay logs para exportar');
            return;
        }
        
        // Convertir a CSV
        const csv = convertirACSV(datos);
        
        // Descargar archivo
        const fecha = new Date().toISOString().split('T')[0];
        descargarArchivo(csv, `logs_${fecha}.csv`, 'text/csv');
        
        mostrarExito(`${datos.length} registros exportados correctamente`);
        
    } catch (error) {
        console.error('Error exportando logs:', error);
        mostrarError('Error al exportar logs');
    }
}

function convertirACSV(datos) {
    if (datos.length === 0) return '';
    
    const headers = Object.keys(datos[0]);
    const csvRows = [];
    
    // Agregar headers
    csvRows.push(headers.join(','));
    
    // Agregar datos
    for (const row of datos) {
        const values = headers.map(header => {
            const value = row[header]?.toString() || '';
            // Escapar comillas y envolver en comillas si es necesario
            return `"${value.replace(/"/g, '""')}"`;
        });
        csvRows.push(values.join(','));
    }
    
    return csvRows.join('\n');
}

function descargarArchivo(contenido, nombreArchivo, tipo) {
    const blob = new Blob([contenido], { type: tipo });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = nombreArchivo;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

// =============================================================================
// SELECCIÓN MÚLTIPLE DE USUARIOS
// =============================================================================

function seleccionarTodosUsuarios(checked) {
    document.querySelectorAll('.user-select').forEach(cb => {
        cb.checked = checked;
    });
}

function obtenerUsuariosSeleccionados() {
    const seleccionados = [];
    document.querySelectorAll('.user-select:checked').forEach(cb => {
        seleccionados.push(cb.value);
    });
    return seleccionados;
}

// =============================================================================
// VALIDACIONES EN TIEMPO REAL
// =============================================================================

function validarEmailEnTiempoReal(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const campo = document.getElementById('userEmail');
    const errorDiv = document.getElementById('userEmailError');
    
    if (!campo || !errorDiv) return true;
    
    if (!email) {
        campo.classList.remove('error');
        errorDiv.classList.remove('show');
        return true;
    }
    
    if (!emailRegex.test(email)) {
        campo.classList.add('error');
        errorDiv.textContent = 'Correo electrónico inválido';
        errorDiv.classList.add('show');
        return false;
    } else {
        campo.classList.remove('error');
        errorDiv.classList.remove('show');
        return true;
    }
}

// =============================================================================
// ANIMACIONES Y EFECTOS
// =============================================================================

function animarEntrada(elemento) {
    if (!elemento) return;
    elemento.style.animation = 'none';
    elemento.offsetHeight; // Forzar reflow
    elemento.style.animation = 'fadeIn 0.5s ease-out';
}

function resaltarElemento(elemento) {
    if (!elemento) return;
    elemento.style.transition = 'all 0.3s ease';
    elemento.style.transform = 'scale(1.02)';
    elemento.style.boxShadow = 'var(--shadow-lg)';
    
    setTimeout(() => {
        elemento.style.transform = 'scale(1)';
        elemento.style.boxShadow = 'var(--shadow-md)';
    }, 300);
}

// =============================================================================
// MANEJO DE ERRORES GLOBAL
// =============================================================================

window.addEventListener('error', (event) => {
    console.error('Error global capturado:', event.error);
    mostrarError('Ocurrió un error inesperado. Por favor, recarga la página.');
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('Promesa rechazada no manejada:', event.reason);
    mostrarError('Error de conexión. Intenta de nuevo.');
});