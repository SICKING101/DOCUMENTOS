// =============================================================================
// src/frontend/modules/chartsManager.js
// Sistema de Gráficas Moderno - Exportación Excel con Gráficos
// =============================================================================

import { CONFIG } from '../config.js';
import { showAlert } from '../utils.js';

let currentChart = null;
let autoRefreshInterval = null;

// =============================================================================
// PALETA DE COLORES MODERNA - ESTILO DASHBOARD
// =============================================================================

const COLORS = {
    primary: '#6366F1',
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444',
    info: '#3B82F6',
    purple: '#8B5CF6',
    pink: '#EC4899',
    cyan: '#06B6D4',
    lime: '#84CC16',
    orange: '#F97316',
    
    // Paleta para gráficos
    chart: [
        '#6366F1', '#10B981', '#F59E0B', '#EF4444',
        '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16',
        '#F97316', '#3B82F6', '#14B8A6', '#D946EF'
    ],
    
    // Gradientes modernos
    gradientBlue: ['#6366F1', '#818CF8'],
    gradientGreen: ['#10B981', '#34D399'],
    gradientOrange: ['#F59E0B', '#FBBF24'],
    gradientRed: ['#EF4444', '#F87171'],
};

// =============================================================================
// CONFIGURACIÓN GLOBAL DE CHART.JS
// =============================================================================

Chart.defaults.font.family = "'Inter', 'Segoe UI', system-ui, sans-serif";
Chart.defaults.font.size = 13;
Chart.defaults.color = '#6B7280';
Chart.defaults.plugins.tooltip.backgroundColor = 'rgba(17, 24, 39, 0.95)';
Chart.defaults.plugins.tooltip.titleFont = { size: 14, weight: '700' };
Chart.defaults.plugins.tooltip.bodyFont = { size: 13 };
Chart.defaults.plugins.tooltip.padding = 16;
Chart.defaults.plugins.tooltip.cornerRadius = 12;
Chart.defaults.plugins.tooltip.displayColors = true;
Chart.defaults.plugins.tooltip.boxPadding = 8;

// =============================================================================
// FUNCIÓN PRINCIPAL
// =============================================================================

export async function loadReportChart() {
    console.group('📊 [CHART] Cargando gráfica...');

    try {
        const canvas = document.getElementById('reportChart');
        if (!canvas) throw new Error('Canvas no encontrado');

        const ctx = canvas.getContext('2d');
        const config = getConfig();
        
        showLoader(true);
        hideMessages();
        
        const rawData = await fetchData(config);
        
        // ═══════════════════════════════════════════════════════════
        // ✅ CORRECCIÓN: Validación diferente según tipo de gráfico
        // ═══════════════════════════════════════════════════════════
        if (config.chartType === 'comparison') {
            // Comparativa: rawData.data es un objeto { current, previous, change }
            const d = rawData?.data;
            if (!d || (d.current?.total === 0 && d.previous?.total === 0)) {
                showEmpty(config.chartType);
                return;
            }
        } else {
            // Distribución/Timeline: rawData.data es un array [...]
            if (!rawData?.data || !Array.isArray(rawData.data) || rawData.data.length === 0) {
                showEmpty(config.chartType);
                return;
            }
        }
        // ═══════════════════════════════════════════════════════════
        
        destroyChart();
        renderChart(ctx, rawData, config);
        updateInfo(rawData, config);
        
        console.log('✅ Gráfica renderizada');
        
    } catch (error) {
        console.error('❌ Error:', error);
        showError(error.message);
    } finally {
        showLoader(false);
        console.groupEnd();
    }
}

// =============================================================================
// CONFIGURACIÓN
// =============================================================================

function getConfig() {
    return {
        chartType: document.getElementById('chartType')?.value || 'category',
        chartPeriod: document.getElementById('chartPeriod')?.value || '30d',
        chartStyle: document.getElementById('chartStyle')?.value || 'bar',
        theme: document.documentElement.getAttribute('data-theme') || 'light',
    };
}

// =============================================================================
// FETCH DE DATOS
// =============================================================================

async function fetchData(config) {
    const { chartType, chartPeriod } = config;
    
    if (chartType === 'timeline') {
        return fetchTimeSeries(chartPeriod);
    }
    if (chartType === 'comparison') {
        return fetchComparison(chartPeriod);
    }
    return fetchDistribution(chartType, chartPeriod);
}

async function fetchDistribution(type, period) {
    const url = `${CONFIG.API_BASE_URL}/reports/chart-data?type=${type}&period=${period}`;
    return apiGet(url);
}

async function fetchTimeSeries(period) {
    const monthsMap = { '7d': 1, '30d': 1, '90d': 3, '1y': 12, 'all': 24 };
    const months = monthsMap[period] || 12;
    const granularity = period === '7d' ? 'daily' : period === '30d' ? 'weekly' : 'monthly';
    const url = `${CONFIG.API_BASE_URL}/reports/time-series?period=${granularity}&months=${months}`;
    return apiGet(url);
}

async function fetchComparison(period) {
    const compareMap = { '7d': 'week', '30d': 'month', '90d': 'quarter', '1y': 'year', 'all': 'year' };
    const compareType = compareMap[period] || 'month';
    const url = `${CONFIG.API_BASE_URL}/reports/comparison?compareType=${compareType}`;
    return apiGet(url);
}

async function apiGet(url) {
    const token = localStorage.getItem('token');
    const res = await fetch(url, {
        credentials: 'include',
        headers: {
            'Accept': 'application/json',
            'Authorization': token ? `Bearer ${token}` : ''
        }
    });
    
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || `Error ${res.status}`);
    }
    
    return res.json();
}

// =============================================================================
// RENDERIZADOR PRINCIPAL
// =============================================================================

function renderChart(ctx, data, config) {
    const { chartType, chartStyle, theme } = config;
    const isDark = theme === 'dark';
    const textColor = isDark ? '#D1D5DB' : '#374151';
    const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
    
    // Configurar colores según tema
    Chart.defaults.color = textColor;
    
    switch (chartType) {
        case 'timeline':
            renderTimeline(ctx, data, config, { textColor, gridColor });
            break;
        case 'comparison':
            renderComparison(ctx, data, config, { textColor, gridColor });
            break;
        default:
            renderDistribution(ctx, data, config, { textColor, gridColor });
            break;
    }
}

// =============================================================================
// GRÁFICO DE DISTRIBUCIÓN - DISEÑO MODERNO
// =============================================================================

function renderDistribution(ctx, data, config, theme) {
    const labels = data.data.map(d => d._id?.length > 25 ? d._id.substring(0, 22) + '...' : (d._id || 'Sin nombre'));
    const values = data.data.map(d => d.count || 0);
    const total = values.reduce((a, b) => a + b, 0);
    const maxValue = Math.max(...values);
    
    const isCircular = ['doughnut', 'pie', 'polarArea'].includes(config.chartStyle);
    const chartType = isCircular ? config.chartStyle : 'bar';
    
    // Crear gradientes para cada barra
    let datasets;
    
    if (chartType === 'bar') {
        datasets = [{
            label: getLabel(config.chartType),
            data: values,
            backgroundColor: values.map((_, i) => {
                const gradient = ctx.createLinearGradient(0, 0, 0, 400);
                gradient.addColorStop(0, COLORS.chart[i % COLORS.chart.length]);
                gradient.addColorStop(1, COLORS.chart[i % COLORS.chart.length] + '99');
                return gradient;
            }),
            borderColor: values.map((_, i) => COLORS.chart[i % COLORS.chart.length]),
            borderWidth: 0,
            borderRadius: 8,
            borderSkipped: false,
            barPercentage: 0.7,
            categoryPercentage: 0.8,
        }];
    } else {
        datasets = [{
            data: values,
            backgroundColor: COLORS.chart.slice(0, values.length),
            borderColor: '#FFFFFF',
            borderWidth: 3,
            hoverBorderWidth: 4,
            hoverBorderColor: '#FFFFFF',
        }];
    }
    
    currentChart = new Chart(ctx, {
        type: chartType,
        data: { labels, datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            plugins: {
                legend: {
                    display: isCircular,
                    position: 'bottom',
                    align: 'center',
                    labels: {
                        padding: 20,
                        usePointStyle: true,
                        pointStyleWidth: 10,
                        pointStyleHeight: 10,
                        font: { size: 12, weight: '500' },
                        color: theme.textColor,
                        generateLabels: chart => {
                            return chart.data.labels.map((label, i) => ({
                                text: `${label} (${chart.data.datasets[0].data[i]})`,
                                fillStyle: chart.data.datasets[0].backgroundColor[i],
                                strokeStyle: chart.data.datasets[0].borderColor[i],
                                lineWidth: 2,
                                hidden: false,
                                index: i,
                                borderRadius: 3,
                            }));
                        }
                    }
                },
                title: {
                    display: false, // Usamos nuestro propio título
                },
                tooltip: {
                    backgroundColor: 'rgba(17, 24, 39, 0.95)',
                    titleFont: { size: 14, weight: '700' },
                    bodyFont: { size: 13 },
                    padding: 16,
                    cornerRadius: 12,
                    boxPadding: 6,
                    callbacks: {
                        label: ctx => {
                            const val = ctx.raw;
                            const pct = total > 0 ? ((val / total) * 100).toFixed(1) : 0;
                            return ` ${val} documentos (${pct}%)`;
                        }
                    }
                }
            },
            scales: chartType === 'bar' ? {
                x: {
                    grid: { display: false },
                    border: { display: false },
                    ticks: { 
                        font: { size: 11, weight: '500' },
                        color: theme.textColor,
                        maxRotation: 45,
                    }
                },
                y: {
                    beginAtZero: true,
                    grid: { 
                        color: theme.gridColor,
                        drawBorder: false,
                    },
                    border: { display: false },
                    ticks: {
                        stepSize: Math.max(1, Math.ceil(maxValue / 8)),
                        font: { size: 11 },
                        color: theme.textColor,
                        padding: 10,
                        callback: val => val % 1 === 0 ? val : '',
                    }
                }
            } : {},
            animation: {
                duration: 1000,
                easing: 'easeInOutCubic',
            },
            layout: {
                padding: { top: 5, right: 15, bottom: 5, left: 5 }
            }
        }
    });
}

// =============================================================================
// GRÁFICO DE LÍNEA TEMPORAL - DISEÑO MODERNO
// =============================================================================

function renderTimeline(ctx, data, config, theme) {
    const labels = data.data.map(d => d._id);
    const values = data.data.map(d => d.count || 0);
    
    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, 'rgba(99, 102, 241, 0.25)');
    gradient.addColorStop(0.5, 'rgba(99, 102, 241, 0.08)');
    gradient.addColorStop(1, 'rgba(99, 102, 241, 0.0)');
    
    currentChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label: 'Documentos',
                data: values,
                borderColor: COLORS.primary,
                backgroundColor: gradient,
                borderWidth: 2.5,
                pointBackgroundColor: '#FFFFFF',
                pointBorderColor: COLORS.primary,
                pointBorderWidth: 2.5,
                pointRadius: 5,
                pointHoverRadius: 8,
                pointHoverBackgroundColor: COLORS.primary,
                pointHoverBorderColor: '#FFFFFF',
                pointHoverBorderWidth: 3,
                tension: 0.35,
                fill: true,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(17, 24, 39, 0.95)',
                    padding: 16,
                    cornerRadius: 12,
                    callbacks: {
                        label: ctx => ` ${ctx.raw} documentos`
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    border: { display: false },
                    ticks: { font: { size: 11, weight: '500' }, color: theme.textColor }
                },
                y: {
                    beginAtZero: true,
                    grid: { color: theme.gridColor, drawBorder: false },
                    border: { display: false },
                    ticks: {
                        stepSize: Math.max(1, Math.ceil(Math.max(...values) / 8)),
                        font: { size: 11 },
                        color: theme.textColor,
                        padding: 10,
                    }
                }
            },
            animation: { duration: 1200, easing: 'easeInOutCubic' },
            layout: { padding: { top: 5, right: 15, bottom: 5, left: 5 } }
        }
    });
}

// =============================================================================
// GRÁFICO COMPARATIVO - DISEÑO MODERNO
// =============================================================================

function renderComparison(ctx, data, config, theme) {
    const d = data.data;
    const change = d.change?.total || 0;
    const percentage = d.change?.percentage || 0;
    const isPositive = change >= 0;
    
    currentChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Total Docs', 'Vencidos'],
            datasets: [
                {
                    label: 'Anterior',
                    data: [d.previous.total || 0, d.previous.expired || 0],
                    backgroundColor: 'rgba(148, 163, 184, 0.6)',
                    borderColor: '#94A3B8',
                    borderWidth: 0,
                    borderRadius: 8,
                    borderSkipped: false,
                },
                {
                    label: 'Actual',
                    data: [d.current.total || 0, d.current.expired || 0],
                    backgroundColor: 'rgba(99, 102, 241, 0.8)',
                    borderColor: COLORS.primary,
                    borderWidth: 0,
                    borderRadius: 8,
                    borderSkipped: false,
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        usePointStyle: true,
                        pointStyleWidth: 10,
                        padding: 20,
                        font: { size: 12, weight: '500' },
                        color: theme.textColor,
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(17, 24, 39, 0.95)',
                    padding: 16,
                    cornerRadius: 12,
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    border: { display: false },
                    ticks: { font: { size: 12, weight: '600' }, color: theme.textColor }
                },
                y: {
                    beginAtZero: true,
                    grid: { color: theme.gridColor, drawBorder: false },
                    border: { display: false },
                    ticks: { font: { size: 11 }, color: theme.textColor, padding: 10 }
                }
            },
            animation: { duration: 1000, easing: 'easeInOutCubic' },
            layout: { padding: { top: 5, right: 15, bottom: 5, left: 5 } }
        }
    });
}

// =============================================================================
// EXPORTACIÓN A EXCEL CON GRÁFICO - CON PRELOADER
// =============================================================================

export async function exportToExcel() {
    console.log('📥 Exportando reporte con gráfico a Excel...');
    
    if (!currentChart) {
        showAlert('Primero genera una gráfica para exportar', 'warning');
        return;
    }
    
    // ═══════════════════════════════════════════════════════════
    // MOSTRAR PRELOADER
    // ═══════════════════════════════════════════════════════════
    showExportPreloader();
    
    try {
        const config = getConfig();
        
        // Actualizar etapa 1 del preloader
        updateExportStage(1, 'Preparando datos...');
        await delay(400);
        
        const rawData = await fetchData(config);
        
        // Validar según tipo de gráfico
        let payloadData;
        let total;
        
        if (config.chartType === 'comparison') {
            const d = rawData?.data;
            if (!d || (d.current?.total === 0 && d.previous?.total === 0)) {
                hideExportPreloader();
                showAlert('No hay datos para exportar', 'warning');
                return;
            }
            payloadData = [
                { _id: 'Total Docs (Actual)', count: d.current?.total || 0 },
                { _id: 'Vencidos (Actual)', count: d.current?.expired || 0 },
                { _id: 'Total Docs (Anterior)', count: d.previous?.total || 0 },
                { _id: 'Vencidos (Anterior)', count: d.previous?.expired || 0 },
            ];
            total = payloadData.reduce((s, item) => s + item.count, 0);
        } else {
            if (!rawData?.data || !Array.isArray(rawData.data) || rawData.data.length === 0) {
                hideExportPreloader();
                showAlert('No hay datos para exportar', 'warning');
                return;
            }
            payloadData = rawData.data;
            total = payloadData.reduce((s, d) => s + (d.count || 0), 0);
        }
        
        // Actualizar etapa 2 del preloader
        updateExportStage(2, 'Generando imagen de la gráfica...');
        await delay(300);
        
        // Obtener imagen de la gráfica en buena calidad
        const chartImage = currentChart.toBase64Image('image/png', 1.5);
        
        // Actualizar etapa 3 del preloader
        updateExportStage(3, 'Enviando datos al servidor...');
        await delay(200);
        
        const token = localStorage.getItem('token');
        
        const payload = {
            chartType: config.chartType,
            chartPeriod: config.chartPeriod,
            chartStyle: config.chartStyle,
            chartImage: chartImage,
            data: payloadData,
            title: getTitle(config.chartType),
            periodLabel: getPeriodLabel(config.chartPeriod),
            total: total,
            timestamp: new Date().toISOString(),
        };
        
        console.log('📤 Enviando payload:', {
            chartType: payload.chartType,
            dataCount: payload.data.length,
            total: payload.total,
            hasImage: !!payload.chartImage
        });
        
        // Iniciar animación de progreso
        startExportProgress();
        
        const response = await fetch(`${CONFIG.API_BASE_URL}/reports/excel-with-chart`, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': token ? `Bearer ${token}` : ''
            },
            body: JSON.stringify(payload)
        });
        
        stopExportProgress();
        
        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.message || 'Error generando Excel');
        }
        
        // Actualizar etapa 4 del preloader
        updateExportStage(4, 'Descargando archivo...');
        await delay(300);
        
        // Descargar archivo
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `reporte_grafico_${config.chartType}_${new Date().toISOString().slice(0, 10)}.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        console.log('✅ Excel descargado:', a.download);
        
        // Mostrar éxito en preloader
        showExportSuccess(`Reporte Excel generado exitosamente`);
        
        // Cerrar preloader después de un momento
        setTimeout(() => {
            hideExportPreloader();
            showAlert('✅ Reporte Excel con gráfico descargado exitosamente', 'success');
        }, 1500);
        
    } catch (error) {
        console.error('❌ Error exportando Excel:', error);
        stopExportProgress();
        
        // Mostrar error en preloader
        showExportError(error.message || 'Error al generar el reporte');
        
        // Cerrar preloader después de un momento
        setTimeout(() => {
            hideExportPreloader();
            showAlert('Error: ' + error.message, 'error');
        }, 2000);
    }
}

// ═══════════════════════════════════════════════════════════════
// FUNCIONES DEL PRELOADER DE EXPORTACIÓN
// ═══════════════════════════════════════════════════════════════

function showExportPreloader() {
    // Eliminar preloader anterior si existe
    const existing = document.getElementById('exportPreloader');
    if (existing) existing.remove();
    
    const preloader = document.createElement('div');
    preloader.id = 'exportPreloader';
    preloader.className = 'reportes-preloader';
    preloader.innerHTML = `
        <div class="reportes-preloader__overlay"></div>
        <div class="reportes-preloader__content">
            <div class="reportes-preloader__spinner">
                <div class="reportes-preloader__spinner-inner"></div>
            </div>
            <div class="reportes-preloader__text">
                <h4>Generando Reporte Excel</h4>
                <p>Por favor espere mientras procesamos su solicitud...</p>
                <div class="reportes-preloader__details">
                    <div class="reportes-preloader__detail reportes-preloader__detail--current">
                        <i class="fas fa-database"></i>
                        <span>Preparando datos...</span>
                    </div>
                    <div class="reportes-preloader__detail">
                        <i class="fas fa-chart-bar"></i>
                        <span>Generando gráfico...</span>
                    </div>
                    <div class="reportes-preloader__detail">
                        <i class="fas fa-server"></i>
                        <span>Procesando en servidor...</span>
                    </div>
                    <div class="reportes-preloader__detail">
                        <i class="fas fa-download"></i>
                        <span>Descargando archivo...</span>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(preloader);
}

function updateExportStage(stage, message) {
    const preloader = document.getElementById('exportPreloader');
    if (!preloader) return;
    
    const details = preloader.querySelectorAll('.reportes-preloader__detail');
    
    details.forEach((detail, index) => {
        detail.classList.remove('reportes-preloader__detail--active', 'reportes-preloader__detail--current');
        
        if (index < stage - 1) {
            // Etapas completadas
            detail.classList.add('reportes-preloader__detail--active');
        } else if (index === stage - 1) {
            // Etapa actual
            detail.classList.add('reportes-preloader__detail--current');
        }
    });
    
    // Actualizar mensaje de la etapa actual
    if (details[stage - 1]) {
        details[stage - 1].querySelector('span').textContent = message;
    }
}

function startExportProgress() {
    const preloader = document.getElementById('exportPreloader');
    if (!preloader) return;
    
    // Verificar si ya existe la barra de progreso
    let progressBar = preloader.querySelector('.reportes-preloader__progress');
    
    if (!progressBar) {
        progressBar = document.createElement('div');
        progressBar.className = 'reportes-preloader__progress';
        progressBar.innerHTML = '<div class="reportes-preloader__progress-bar"></div>';
        
        const content = preloader.querySelector('.reportes-preloader__content');
        if (content) content.appendChild(progressBar);
    }
    
    // Animar la barra
    setTimeout(() => {
        const bar = progressBar.querySelector('.reportes-preloader__progress-bar');
        if (bar) bar.style.width = '90%';
    }, 100);
}

function stopExportProgress() {
    const preloader = document.getElementById('exportPreloader');
    if (!preloader) return;
    
    const progressBar = preloader.querySelector('.reportes-preloader__progress-bar');
    if (progressBar) {
        progressBar.style.width = '100%';
        progressBar.style.transition = 'width 0.3s ease-in-out';
    }
}

function showExportSuccess(message) {
    const preloader = document.getElementById('exportPreloader');
    if (!preloader) return;
    
    const content = preloader.querySelector('.reportes-preloader__content');
    content.innerHTML = `
        <div class="reportes-preloader__success">
            <div class="reportes-preloader__success-icon">
                <i class="fas fa-check-circle"></i>
            </div>
            <div class="reportes-preloader__success-text">
                <h4>¡Reporte Generado!</h4>
                <p>${message}</p>
                <div class="reportes-preloader__success-details">
                    <i class="fas fa-check"></i>
                    <span>El archivo se ha descargado correctamente</span>
                </div>
            </div>
        </div>
    `;
    
    content.classList.add('reportes-preloader__content--success');
}

function showExportError(message) {
    const preloader = document.getElementById('exportPreloader');
    if (!preloader) return;
    
    const content = preloader.querySelector('.reportes-preloader__content');
    content.innerHTML = `
        <div class="reportes-preloader__error">
            <div class="reportes-preloader__error-icon">
                <i class="fas fa-exclamation-circle"></i>
            </div>
            <div class="reportes-preloader__error-text">
                <h4>Error al Generar Reporte</h4>
                <p>${message}</p>
                <div class="reportes-preloader__error-details">
                    <i class="fas fa-redo"></i>
                    <span>Intente nuevamente o contacte al administrador</span>
                </div>
            </div>
        </div>
    `;
    
    content.classList.add('reportes-preloader__content--error');
}

function hideExportPreloader() {
    const preloader = document.getElementById('exportPreloader');
    if (!preloader) return;
    
    // Animar salida
    preloader.style.opacity = '0';
    preloader.style.transition = 'opacity 0.3s ease-out';
    
    setTimeout(() => {
        if (preloader.parentNode) {
            preloader.parentNode.removeChild(preloader);
        }
    }, 300);
}

// Función auxiliar para delays
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// =============================================================================
// UTILIDADES
// =============================================================================

function getLabel(type) {
    const labels = {
        category: 'Documentos',
        status: 'Documentos',
        person: 'Documentos',
        type: 'Archivos',
    };
    return labels[type] || 'Documentos';
}

function getTitle(type) {
    const titles = {
        category: 'Distribución por Categoría',
        status: 'Distribución por Estado de Vencimiento',
        person: 'Documentos por Persona',
        type: 'Distribución por Tipo de Archivo',
        timeline: 'Tendencia de Documentos',
        comparison: 'Comparativa de Períodos',
    };
    return titles[type] || 'Reporte de Documentos';
}

function getPeriodLabel(period) {
    const labels = {
        '7d': 'Últimos 7 días',
        '30d': 'Últimos 30 días',
        '90d': 'Últimos 90 días',
        '1y': 'Último año',
        'all': 'Histórico completo',
    };
    return labels[period] || period;
}

function destroyChart() {
    if (currentChart) {
        currentChart.destroy();
        currentChart = null;
    }
}

function showLoader(show) {
    const loader = document.getElementById('chartLoading');
    const canvas = document.getElementById('reportChart');
    if (loader) {
        loader.style.display = show ? 'flex' : 'none';
        if (show) {
            loader.innerHTML = `
                <div class="chart-loader-spinner"></div>
                <p>Cargando gráfica...</p>
            `;
        }
    }
    if (canvas) canvas.style.display = show ? 'none' : 'block';
}

function showError(msg) {
    const el = document.getElementById('chartError');
    const msgEl = document.getElementById('chartErrorMessage');
    const canvas = document.getElementById('reportChart');
    if (el) el.style.display = 'flex';
    if (msgEl) msgEl.textContent = msg;
    if (canvas) canvas.style.display = 'none';
    showLoader(false);
}

function showEmpty(type) {
    const el = document.getElementById('chartEmpty');
    const canvas = document.getElementById('reportChart');
    if (el) {
        el.querySelector('p').textContent = `No hay datos para "${getTitle(type)}" en este período`;
        el.style.display = 'flex';
    }
    if (canvas) canvas.style.display = 'none';
    showLoader(false);
}

function hideMessages() {
    ['chartError', 'chartEmpty'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });
    const canvas = document.getElementById('reportChart');
    if (canvas) canvas.style.display = 'block';
}

function updateInfo(data, config) {
    const infoEl = document.getElementById('chartInfo');
    if (!infoEl) return;
    
    const metrics = infoEl.querySelectorAll('.charts-metric__value');
    if (!metrics.length) return;
    
    let total, items, topLabel, topValue;
    
    // ═══════════════════════════════════════════════════════════
    // ✅ Manejar ambos formatos de datos
    // ═══════════════════════════════════════════════════════════
    if (config.chartType === 'comparison') {
        // Formato comparativa: { current, previous, change }
        const d = data?.data || {};
        total = (d.current?.total || 0) + (d.previous?.total || 0);
        items = 2; // Dos períodos
        topLabel = 'Cambio';
        topValue = (d.change?.percentage || 0) + '%';
    } else {
        // Formato array: [{ _id, count }, ...]
        const arr = data?.data || [];
        total = arr.reduce((s, d) => s + (d.count || 0), 0);
        items = arr.length;
        const maxItem = arr.reduce((max, d) => (d.count || 0) > (max.count || 0) ? d : max, arr[0] || {});
        topLabel = maxItem?._id || '—';
        topValue = maxItem?.count || 0;
    }
    // ═══════════════════════════════════════════════════════════
    
    // Actualizar badge del header
    const badge = document.getElementById('chartsBadge');
    if (badge) {
        badge.innerHTML = `
            <i class="fas fa-check-circle" style="color: var(--success)"></i>
            <span>${total} registros</span>
        `;
    }
    
    // Actualizar métricas
    if (metrics.length >= 4) {
        metrics[0].textContent = total.toLocaleString();
        metrics[1].textContent = items;
        metrics[2].textContent = typeof topLabel === 'string' && topLabel.length > 20 
            ? topLabel.substring(0, 18) + '...' 
            : topLabel;
        metrics[3].textContent = topValue;
    }
}

// =============================================================================
// AUTO-REFRESH
// =============================================================================

function startAutoRefresh() {
    stopAutoRefresh();
    autoRefreshInterval = setInterval(() => {
        console.log('🔄 Auto-refrescando gráfica...');
        loadReportChart();
    }, 60000); // Cada 60 segundos
}

function stopAutoRefresh() {
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
        autoRefreshInterval = null;
    }
}

// =============================================================================
// INICIALIZACIÓN
// =============================================================================

export function initChartsModule() {
    console.log('📊 Inicializando sistema de gráficas...');
    
    if (typeof Chart === 'undefined') {
        console.error('❌ Chart.js no disponible');
        return;
    }
    
    // Configurar selectores
    ['chartType', 'chartPeriod', 'chartStyle'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('change', () => {
                if (id === 'chartType') updateStyleOptions(el.value);
                loadReportChart();
            });
        }
    });
    
    // Observer para cambios de tema
    new MutationObserver(() => {
        if (currentChart) loadReportChart();
    }).observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['data-theme']
    });
    
    // Iniciar auto-refresh
    startAutoRefresh();
    
    // Carga inicial
    setTimeout(() => loadReportChart(), 500);
    
    console.log('✅ Sistema de gráficas inicializado (auto-refresh: 60s)');
}

function updateStyleOptions(chartType) {
    const select = document.getElementById('chartStyle');
    if (!select) return;
    
    const current = select.value;
    select.innerHTML = '';
    
    const options = {
        timeline: [{ value: 'line', text: '📈 Línea de Tendencia' }],
        comparison: [{ value: 'bar', text: '📊 Barras Comparativas' }],
        default: [
            { value: 'bar', text: '📊 Barras' },
            { value: 'doughnut', text: '🍩 Dona' },
            { value: 'pie', text: '🥧 Pastel' },
            { value: 'polarArea', text: '🌐 Área Polar' },
        ]
    };
    
    const opts = options[chartType] || options.default;
    
    opts.forEach(opt => {
        const option = document.createElement('option');
        option.value = opt.value;
        option.textContent = opt.text;
        select.appendChild(option);
    });
    
    select.value = opts.map(o => o.value).includes(current) ? current : opts[0].value;
}

// Limpiar al salir
window.addEventListener('beforeunload', () => {
    stopAutoRefresh();
    destroyChart();
});

// Exports globales
window.loadReportChart = loadReportChart;
window.exportToExcel = exportToExcel;