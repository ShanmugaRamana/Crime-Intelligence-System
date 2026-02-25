/* ═══════════════════════════════════════════════════════════════
   Overall Dashboard — Charts + Click-to-expand Modal
   Balanced palette (not neon, not muted)
   ═══════════════════════════════════════════════════════════════ */

let charts = {};
let modalChart = null;

function destroyCharts() {
    Object.values(charts).forEach(c => { if (c && c.destroy) c.destroy(); });
    charts = {};
}

function renderAllCharts() {
    destroyCharts();
    if (!filteredRecords || filteredRecords.length === 0) return;
    renderHotspot();
    renderTopCrimes();
    renderMonthlyTrend();
    renderDistribution();
    renderInvVsClosed();
    renderRadar();
    renderHeatmap();
    renderClosureRate();
    bindChartClicks();
}

// ─── Chart defaults ─────────────────────────────────────────
Chart.defaults.font.family = "'Inter', 'Segoe UI', 'Nirmala UI', system-ui, sans-serif";
Chart.defaults.font.size = 11;
Chart.defaults.color = '#374151';
Chart.defaults.plugins.legend.labels.usePointStyle = true;
Chart.defaults.plugins.tooltip.backgroundColor = '#1f2937';
Chart.defaults.plugins.tooltip.titleColor = '#f9fafb';
Chart.defaults.plugins.tooltip.bodyColor = '#e5e7eb';
Chart.defaults.plugins.tooltip.cornerRadius = 6;
Chart.defaults.plugins.tooltip.padding = 10;

// 24 distinct colors — ordered so adjacent items look different
const PAL = [
    '#6366f1', '#10b981', '#f59e0b', '#ef4444',
    '#06b6d4', '#8b5cf6', '#ec4899', '#14b8a6',
    '#f97316', '#3b82f6', '#84cc16', '#e11d48',
    '#0ea5e9', '#a855f7', '#22c55e', '#d946ef',
    '#0d9488', '#eab308', '#7c3aed', '#fb923c',
    '#2563eb', '#059669', '#dc2626', '#6d28d9'
];

const GRID = '#f1f5f9';

// ─── Modal system ───────────────────────────────────────────
const chartRenderers = {};

function bindChartClicks() {
    document.querySelectorAll('.chart-card[data-chart]').forEach(card => {
        card.addEventListener('click', () => {
            const key = card.getAttribute('data-chart');
            const title = card.querySelector('.chart-title')?.textContent || '';
            openModal(key, title);
        });
    });
}

function openModal(key, title) {
    const overlay = document.getElementById('chartModal');
    const titleEl = document.getElementById('modalTitle');
    const canvas = document.getElementById('modalChart');

    titleEl.textContent = title;
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';

    // Destroy previous modal chart
    if (modalChart) { modalChart.destroy(); modalChart = null; }

    // Re-render the chart in modal at larger size
    setTimeout(() => {
        if (chartRenderers[key]) {
            modalChart = chartRenderers[key](canvas);
        }
    }, 50);
}

function closeModal() {
    const overlay = document.getElementById('chartModal');
    overlay.classList.remove('active');
    document.body.style.overflow = '';
    if (modalChart) { modalChart.destroy(); modalChart = null; }
}

// Close handlers
document.getElementById('modalClose')?.addEventListener('click', closeModal);
document.getElementById('chartModal')?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeModal();
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });

// ─── 1. Crime Hotspot ───────────────────────────────────────
function renderHotspot() {
    const cfg = getHotspotConfig();
    charts.hotspot = new Chart(document.getElementById('chartHotspot'), cfg);
    chartRenderers.hotspot = (canvas) => new Chart(canvas, getHotspotConfig());
}

function getHotspotConfig() {
    const grouped = groupBy(filteredRecords, 'policeStation');
    const labels = Object.keys(grouped).sort((a, b) => grouped[b].length - grouped[a].length);
    const data = labels.map(s => grouped[s].length);
    const max = Math.max(...data);
    const colors = data.map(v => {
        const r = v / max;
        if (r >= 0.75) return '#ef4444';
        if (r >= 0.5) return '#f97316';
        if (r >= 0.25) return '#f59e0b';
        return '#10b981';
    });

    return {
        type: 'bar',
        data: { labels, datasets: [{ data, backgroundColor: colors, borderRadius: 4, barThickness: 22, borderSkipped: false }] },
        options: {
            indexAxis: 'y', responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { beginAtZero: true, grid: { color: GRID }, ticks: { precision: 0, color: '#374151' } },
                y: { grid: { display: false }, ticks: { color: '#1f2937', font: { weight: '500' } } }
            }
        }
    };
}

// ─── 2. Top Crime Types ─────────────────────────────────────
function renderTopCrimes() {
    const cfg = getTopCrimesConfig();
    charts.topCrimes = new Chart(document.getElementById('chartTopCrimes'), cfg);
    chartRenderers.topCrimes = (canvas) => new Chart(canvas, getTopCrimesConfig());
}

function getTopCrimesConfig() {
    const grouped = groupBy(filteredRecords, 'crimeType');
    const sorted = Object.entries(grouped).sort((a, b) => b[1].length - a[1].length).slice(0, 10);
    const labels = sorted.map(e => translateCrimeType(e[0]));
    const data = sorted.map(e => e[1].length);

    return {
        type: 'bar',
        data: { labels, datasets: [{ data, backgroundColor: PAL.slice(0, labels.length), borderRadius: 4, barThickness: 18, borderSkipped: false }] },
        options: {
            indexAxis: 'y', responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { beginAtZero: true, grid: { color: GRID }, ticks: { precision: 0, color: '#374151' } },
                y: { grid: { display: false }, ticks: { color: '#1f2937', font: { size: 10.5, weight: '500' } } }
            }
        }
    };
}

// ─── 3. Monthly Trend ───────────────────────────────────────
function renderMonthlyTrend() {
    const cfg = getTrendConfig(document.getElementById('chartMonthlyTrend'));
    charts.trend = new Chart(document.getElementById('chartMonthlyTrend'), cfg);
    chartRenderers.monthlyTrend = (canvas) => new Chart(canvas, getTrendConfig(canvas));
}

function getTrendConfig(canvas) {
    const monthData = {};
    for (let m = 1; m <= 12; m++) monthData[m] = 0;
    filteredRecords.forEach(r => { monthData[r.month] = (monthData[r.month] || 0) + 1; });

    const labels = [], data = [];
    for (let m = 1; m <= 12; m++) { labels.push(getMonthName(m)); data.push(monthData[m]); }

    const ctx = canvas.getContext('2d');
    const grad = ctx.createLinearGradient(0, 0, 0, 250);
    grad.addColorStop(0, 'rgba(99,102,241,0.15)');
    grad.addColorStop(1, 'rgba(99,102,241,0)');

    return {
        type: 'line',
        data: {
            labels, datasets: [{
                data, borderColor: '#6366f1', backgroundColor: grad,
                fill: true, tension: 0.35,
                pointBackgroundColor: '#6366f1', pointBorderColor: '#fff',
                pointBorderWidth: 2, pointRadius: 3.5, pointHoverRadius: 6,
                borderWidth: 2.5
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, grid: { color: GRID }, ticks: { precision: 0, color: '#374151' } },
                x: { grid: { color: GRID }, ticks: { color: '#374151' } }
            }
        }
    };
}

// ─── 4. Distribution (Doughnut) ─────────────────────────────
function renderDistribution() {
    const cfg = getDistConfig();
    charts.distribution = new Chart(document.getElementById('chartDistribution'), cfg);
    chartRenderers.distribution = (canvas) => new Chart(canvas, getDistConfig());
}

function getDistConfig() {
    const grouped = groupBy(filteredRecords, 'crimeType');
    const sorted = Object.entries(grouped).sort((a, b) => b[1].length - a[1].length);
    const top = sorted.slice(0, 8);
    const othersCount = sorted.slice(8).reduce((s, e) => s + e[1].length, 0);

    const labels = top.map(e => translateCrimeType(e[0]));
    const data = top.map(e => e[1].length);
    const colors = PAL.slice(0, top.length);

    if (othersCount > 0) {
        labels.push(currentLang === 'mr' ? 'इतर' : 'Others');
        data.push(othersCount);
        colors.push('#9ca3af');
    }

    return {
        type: 'doughnut',
        data: { labels, datasets: [{ data, backgroundColor: colors, borderWidth: 2, borderColor: '#fff', hoverOffset: 6 }] },
        options: {
            responsive: true, maintainAspectRatio: false, cutout: '55%',
            plugins: {
                legend: { position: 'bottom', labels: { color: '#1f2937', font: { size: 10 }, padding: 8, boxWidth: 8, usePointStyle: true, pointStyle: 'circle' } },
                tooltip: { callbacks: { label: ctx => { const tot = ctx.dataset.data.reduce((a, b) => a + b, 0); return ` ${ctx.label}: ${ctx.raw} (${((ctx.raw / tot) * 100).toFixed(1)}%)`; } } }
            }
        }
    };
}

// ─── 5. Investigation vs Closed ─────────────────────────────
function renderInvVsClosed() {
    const cfg = getInvConfig();
    charts.invVsClosed = new Chart(document.getElementById('chartInvVsClosed'), cfg);
    chartRenderers.invVsClosed = (canvas) => new Chart(canvas, getInvConfig());
}

function getInvConfig() {
    const grouped = groupBy(filteredRecords, 'policeStation');
    const labels = Object.keys(grouped).sort();
    return {
        type: 'bar',
        data: {
            labels,
            datasets: [
                { label: t('underInvestigation'), data: labels.map(s => sumField(grouped[s], 'underInvestigation')), backgroundColor: '#f59e0b', borderRadius: 3 },
                { label: t('closedCases'), data: labels.map(s => sumField(grouped[s], 'closed')), backgroundColor: '#10b981', borderRadius: 3 }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { position: 'top', labels: { color: '#1f2937' } } },
            scales: {
                x: { stacked: true, grid: { display: false }, ticks: { color: '#374151' } },
                y: { stacked: true, beginAtZero: true, grid: { color: GRID }, ticks: { precision: 0, color: '#374151' } }
            }
        }
    };
}

// ─── 6. Radar ───────────────────────────────────────────────
function renderRadar() {
    const cfg = getRadarConfig();
    charts.radar = new Chart(document.getElementById('chartRadar'), cfg);
    chartRenderers.radar = (canvas) => new Chart(canvas, getRadarConfig());
}

function getRadarConfig() {
    const grouped = groupBy(filteredRecords, 'policeStation');
    const labels = Object.keys(grouped).sort();
    return {
        type: 'radar',
        data: {
            labels,
            datasets: [
                { label: t('totalCrimes'), data: labels.map(s => grouped[s].length), borderColor: '#6366f1', backgroundColor: 'rgba(99,102,241,0.08)', borderWidth: 2, pointBackgroundColor: '#6366f1', pointRadius: 3 },
                { label: t('underInvestigation'), data: labels.map(s => sumField(grouped[s], 'underInvestigation')), borderColor: '#f59e0b', backgroundColor: 'rgba(245,158,11,0.06)', borderWidth: 2, pointBackgroundColor: '#f59e0b', pointRadius: 3 }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { position: 'top', labels: { color: '#1f2937' } } },
            scales: {
                r: {
                    beginAtZero: true,
                    ticks: { precision: 0, backdropColor: 'transparent', color: '#6b7280' },
                    pointLabels: { color: '#1f2937', font: { size: 10 } },
                    grid: { color: '#e5e7eb' },
                    angleLines: { color: '#e5e7eb' }
                }
            }
        }
    };
}

// ─── 7. Heatmap ─────────────────────────────────────────────
function renderHeatmap() {
    const container = document.getElementById('heatmapContainer');
    if (!container) return;

    const grouped = groupBy(filteredRecords, 'policeStation');
    const stations = Object.keys(grouped).sort();
    const matrix = {};
    let gMax = 0;

    stations.forEach(s => {
        matrix[s] = {};
        for (let m = 1; m <= 12; m++) matrix[s][m] = 0;
        grouped[s].forEach(r => { matrix[s][r.month]++; if (matrix[s][r.month] > gMax) gMax = matrix[s][r.month]; });
    });

    let html = '<table class="heatmap-table"><thead><tr>';
    html += `<th>${t('filterStation')}</th>`;
    for (let m = 1; m <= 12; m++) html += `<th>${getMonthName(m).substring(0, 3)}</th>`;
    html += '<th>Total</th></tr></thead><tbody>';

    stations.forEach(s => {
        html += `<tr><td class="station-name">${s}</td>`;
        let rowTotal = 0;
        for (let m = 1; m <= 12; m++) {
            const v = matrix[s][m]; rowTotal += v;
            const bg = heatColor(v, gMax);
            const fg = v > 0 ? '#1f2937' : '#9ca3af';
            html += `<td style="background:${bg};color:${fg}">${v || '—'}</td>`;
        }
        html += `<td style="font-weight:600;color:#1f2937">${rowTotal}</td></tr>`;
    });

    html += '</tbody></table>';
    container.innerHTML = html;
}

function heatColor(v, max) {
    if (v === 0 || max === 0) return '#f9fafb';
    const r = v / max;
    if (r < 0.25) return '#eef2ff';
    if (r < 0.5) return '#c7d2fe';
    if (r < 0.75) return '#a5b4fc';
    return '#818cf8';
}

// ─── 8. Closure Rate ────────────────────────────────────────
function renderClosureRate() {
    const cfg = getClosureConfig();
    charts.closureRate = new Chart(document.getElementById('chartClosureRate'), cfg);
    chartRenderers.closureRate = (canvas) => new Chart(canvas, getClosureConfig());
}

function getClosureConfig() {
    const grouped = groupBy(filteredRecords, 'policeStation');
    const labels = Object.keys(grouped).sort();
    const rates = labels.map(s => {
        const inv = sumField(grouped[s], 'underInvestigation');
        const cl = sumField(grouped[s], 'closed');
        const total = inv + cl;
        return total > 0 ? parseFloat(((cl / total) * 100).toFixed(1)) : 0;
    });
    const colors = rates.map(r => r >= 50 ? '#10b981' : r >= 30 ? '#f59e0b' : '#ef4444');

    return {
        type: 'bar',
        data: { labels, datasets: [{ data: rates, backgroundColor: colors, borderRadius: 4, barThickness: 22, borderSkipped: false }] },
        options: {
            indexAxis: 'y', responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ` ${ctx.raw}%` } } },
            scales: {
                x: { beginAtZero: true, max: 100, grid: { color: GRID }, ticks: { callback: v => v + '%', color: '#374151' } },
                y: { grid: { display: false }, ticks: { color: '#1f2937', font: { weight: '500' } } }
            }
        }
    };
}

initApp(() => { renderAllCharts(); });
