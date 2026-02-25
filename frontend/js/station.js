/* ═══════════════════════════════════════════════════════════════
   Station-wise Dashboard — Charts + Click-to-expand Modal
   ═══════════════════════════════════════════════════════════════ */

let stationCharts = {};
let selectedStation = null;
let modalChart = null;
const stationRenderers = {};

function destroyStationCharts() {
    Object.values(stationCharts).forEach(c => { if (c && c.destroy) c.destroy(); });
    stationCharts = {};
}

Chart.defaults.font.family = "'Inter', 'Segoe UI', 'Nirmala UI', system-ui, sans-serif";
Chart.defaults.font.size = 11;
Chart.defaults.color = '#374151';
Chart.defaults.plugins.legend.labels.usePointStyle = true;
Chart.defaults.plugins.tooltip.backgroundColor = '#1f2937';
Chart.defaults.plugins.tooltip.titleColor = '#f9fafb';
Chart.defaults.plugins.tooltip.bodyColor = '#e5e7eb';
Chart.defaults.plugins.tooltip.cornerRadius = 6;
Chart.defaults.plugins.tooltip.padding = 10;

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

    if (modalChart) { modalChart.destroy(); modalChart = null; }

    setTimeout(() => {
        if (stationRenderers[key]) {
            modalChart = stationRenderers[key](canvas);
        }
    }, 50);
}

function closeModal() {
    const overlay = document.getElementById('chartModal');
    overlay.classList.remove('active');
    document.body.style.overflow = '';
    if (modalChart) { modalChart.destroy(); modalChart = null; }
}

document.getElementById('modalClose')?.addEventListener('click', closeModal);
document.getElementById('chartModal')?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeModal();
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });

// ─── Main ───────────────────────────────────────────────────
function renderAllCharts() {
    renderStationSelector();
    if (selectedStation) renderStationDashboard();
}

function renderStationSelector() {
    const container = document.getElementById('stationSelector');
    if (!container || !allData) return;

    const grouped = groupBy(filteredRecords, 'policeStation');
    const allStations = allData.filters.stations;
    container.innerHTML = '';

    allStations.forEach((station, i) => {
        const count = grouped[station] ? grouped[station].length : 0;
        const card = document.createElement('div');
        card.className = 'station-card reveal-scale' + (station === selectedStation ? ' active' : '');
        card.style.setProperty('--d', (0.03 * i) + 's');
        card.innerHTML = `
            <div class="station-name-text">${station}</div>
            <div class="station-count">${count}</div>
            <div class="station-label">${t('cases')}</div>
        `;
        card.addEventListener('click', () => selectStation(station));
        container.appendChild(card);
    });

    // Re-observe for scroll-reveal
    requestAnimationFrame(() => {
        container.querySelectorAll('.reveal-scale:not(.revealed)').forEach(el => {
            if (window._revealObserver) window._revealObserver.observe(el);
            else el.classList.add('revealed'); // fallback
        });
    });
}

function selectStation(station) {
    selectedStation = station;
    document.querySelectorAll('.station-card').forEach(card => {
        card.classList.toggle('active', card.querySelector('.station-name-text').textContent === station);
    });
    document.getElementById('stationContent').style.display = 'block';
    renderStationDashboard();
}

function renderStationDashboard() {
    if (!selectedStation) return;
    const records = filteredRecords.filter(r => r.policeStation === selectedStation);
    destroyStationCharts();

    const total = records.length;
    const inv = records.reduce((s, r) => s + r.underInvestigation, 0);
    const closed = records.reduce((s, r) => s + r.closed, 0);
    const rate = (inv + closed) > 0 ? ((closed / (inv + closed)) * 100).toFixed(1) : 0;

    setKPI('kpiTotal', total);
    setKPI('kpiInvestigation', inv);
    setKPI('kpiClosed', closed);
    setKPI('kpiRate', rate + '%');

    renderStationCrimeTypes(records);
    renderStationTrend(records);
    renderStationDoughnut(records);
    renderStationMonthly(records);
    renderStationTable(records);
    bindChartClicks();
}

// ─── Crime Types ────────────────────────────────────────────
function renderStationCrimeTypes(records) {
    const cfg = getCrimeTypeCfg(records);
    stationCharts.crimeTypes = new Chart(document.getElementById('chartStationCrimes'), cfg);
    stationRenderers.stationCrimes = (canvas) => new Chart(canvas, getCrimeTypeCfg(records));
}

function getCrimeTypeCfg(records) {
    const grouped = groupBy(records, 'crimeType');
    const sorted = Object.entries(grouped).sort((a, b) => b[1].length - a[1].length);
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

// ─── Monthly Trend ──────────────────────────────────────────
function renderStationTrend(records) {
    const cfg = getStTrendCfg(records, document.getElementById('chartStationTrend'));
    stationCharts.trend = new Chart(document.getElementById('chartStationTrend'), cfg);
    stationRenderers.stationTrend = (canvas) => new Chart(canvas, getStTrendCfg(records, canvas));
}

function getStTrendCfg(records, canvas) {
    const monthData = {};
    for (let m = 1; m <= 12; m++) monthData[m] = 0;
    records.forEach(r => { monthData[r.month] = (monthData[r.month] || 0) + 1; });

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

// ─── Doughnut ───────────────────────────────────────────────
function renderStationDoughnut(records) {
    const cfg = getStDoughCfg(records);
    stationCharts.doughnut = new Chart(document.getElementById('chartStationDoughnut'), cfg);
    stationRenderers.stationDoughnut = (canvas) => new Chart(canvas, getStDoughCfg(records));
}

function getStDoughCfg(records) {
    const inv = records.reduce((s, r) => s + r.underInvestigation, 0);
    const closed = records.reduce((s, r) => s + r.closed, 0);
    return {
        type: 'doughnut',
        data: {
            labels: [t('underInvestigation'), t('closedCases')],
            datasets: [{ data: [inv, closed], backgroundColor: ['#f59e0b', '#10b981'], borderWidth: 2, borderColor: '#fff', hoverOffset: 6 }]
        },
        options: {
            responsive: true, maintainAspectRatio: false, cutout: '55%',
            plugins: {
                legend: { position: 'bottom', labels: { color: '#1f2937', font: { size: 11 }, padding: 10, usePointStyle: true, pointStyle: 'circle' } },
                tooltip: { callbacks: { label: ctx => { const total = inv + closed; return ` ${ctx.label}: ${ctx.raw} (${total > 0 ? ((ctx.raw / total) * 100).toFixed(1) : 0}%)`; } } }
            }
        }
    };
}

// ─── Monthly Breakdown ──────────────────────────────────────
function renderStationMonthly(records) {
    const cfg = getStMonthlyCfg(records);
    stationCharts.monthly = new Chart(document.getElementById('chartStationMonthly'), cfg);
    stationRenderers.stationMonthly = (canvas) => new Chart(canvas, getStMonthlyCfg(records));
}

function getStMonthlyCfg(records) {
    const crimeTypes = [...new Set(records.map(r => r.crimeType))];
    const monthLabels = [];
    for (let m = 1; m <= 12; m++) monthLabels.push(getMonthName(m));

    const datasets = crimeTypes.map((ct, i) => ({
        label: translateCrimeType(ct),
        data: Array.from({ length: 12 }, (_, m) =>
            records.filter(r => r.month === (m + 1) && r.crimeType === ct).length),
        backgroundColor: PAL[i % PAL.length],
        borderRadius: 2
    }));

    return {
        type: 'bar',
        data: { labels: monthLabels, datasets },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom', labels: { color: '#1f2937', font: { size: 9.5 }, boxWidth: 8, padding: 5, usePointStyle: true, pointStyle: 'circle' } } },
            scales: {
                x: { stacked: true, grid: { display: false }, ticks: { color: '#374151', font: { size: 10 } } },
                y: { stacked: true, beginAtZero: true, grid: { color: GRID }, ticks: { precision: 0, color: '#374151' } }
            }
        }
    };
}

// ─── Data Table ─────────────────────────────────────────────
function renderStationTable(records) {
    const container = document.getElementById('stationTableContainer');
    if (!container) return;

    let html = '<table class="data-table"><thead><tr>';
    html += `<th>${t('tableYear')}</th><th>${t('tableMonth')}</th><th>${t('tableCrimeType')}</th><th>${t('tableInvestigation')}</th><th>${t('tableClosed')}</th>`;
    html += '</tr></thead><tbody>';

    if (records.length === 0) {
        html += `<tr><td colspan="5" style="text-align:center;padding:20px;color:#6b7280">${t('noData')}</td></tr>`;
    } else {
        records.forEach(r => {
            html += `<tr><td>${r.year}</td><td>${getMonthName(r.month)}</td><td>${translateCrimeType(r.crimeType)}</td><td>${r.underInvestigation}</td><td>${r.closed}</td></tr>`;
        });
    }

    html += '</tbody></table>';
    container.innerHTML = html;
}

initApp(() => { renderStationSelector(); });
