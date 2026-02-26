/* ═══════════════════════════════════════════════════════════════
   Station-wise Dashboard — ACP-Grouped Cards + Diverse Charts
   ═══════════════════════════════════════════════════════════════ */

let stationCharts = {};
let selectedStation = null;
let selectedACPGroup = null;
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

// ACP color themes
const ACP_THEMES = {
    acpCity: { gradient: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', light: '#eef2ff', accent: '#6366f1', icon: '<svg class="acp-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="6" width="7" height="16" rx="1"/><rect x="9" y="2" width="7" height="20" rx="1"/><rect x="17" y="9" width="6" height="13" rx="1"/><line x1="3" y1="10" x2="6" y2="10"/><line x1="3" y1="14" x2="6" y2="14"/><line x1="11" y1="6" x2="14" y2="6"/><line x1="11" y1="10" x2="14" y2="10"/><line x1="11" y1="14" x2="14" y2="14"/><line x1="19" y1="13" x2="21" y2="13"/></svg>' },
    acpChavni: { gradient: 'linear-gradient(135deg, #059669 0%, #10b981 100%)', light: '#ecfdf5', accent: '#059669', icon: '<svg class="acp-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 22V8l9-6 9 6v14"/><path d="M7 22v-6h4v6"/><path d="M13 22v-6h4v6"/><line x1="2" y1="22" x2="22" y2="22"/><line x1="12" y1="2" x2="12" y2="8"/></svg>' }
};

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
    renderACPSelector();
    if (selectedStation || selectedACPGroup) renderStationDashboard();
}

// ─── Station Selector — DCP Zone wrapper + ACP boxes ─────────
function renderACPSelector() {
    const container = document.getElementById('acpSelector');
    if (!container || !allData) return;
    container.innerHTML = '';

    const grouped = groupBy(filteredRecords, 'policeStation');

    // Outer DCP Zone wrapper
    const dcpWrapper = document.createElement('div');
    dcpWrapper.className = 'dcp-zone-wrapper reveal-scale';

    // DCP Zone header bar
    const dcpHeader = document.createElement('div');
    dcpHeader.className = 'dcp-zone-header';
    dcpHeader.textContent = 'DCP Zone 1';
    dcpWrapper.appendChild(dcpHeader);

    // Inner row for ACP boxes
    const acpRow = document.createElement('div');
    acpRow.className = 'acp-boxes-row';

    // Footer row for ACP labels
    const acpFooter = document.createElement('div');
    acpFooter.className = 'acp-footer-row';

    STATION_ORDER.forEach((acpGroup, acpIdx) => {
        const theme = ACP_THEMES[acpGroup.acp] || ACP_THEMES.acpCity;

        const acpStationNames = acpGroup.stations.map(s => {
            return allData.filters.stations.find(
                ds => ds.toLowerCase() === s.toLowerCase()
            ) || s;
        });

        // Each ACP gets its own bordered box (stations only)
        const acpBox = document.createElement('div');
        acpBox.className = 'acp-box';
        acpBox.style.setProperty('--acp-accent', theme.accent);
        acpBox.style.setProperty('--acp-light', theme.light);

        // Station cards row
        const stationsRow = document.createElement('div');
        stationsRow.className = 'station-cards-row';

        acpStationNames.forEach((station) => {
            const count = grouped[station] ? grouped[station].length : 0;
            const card = document.createElement('div');
            card.className = 'station-card' + (selectedStation === station ? ' active' : '');
            card.innerHTML = `
                <div class="station-card-name">${station}</div>
                <div class="station-card-count">${count}</div>
                <div class="station-card-label">${t('cases')}</div>
            `;
            card.addEventListener('click', () => selectStation(station));
            stationsRow.appendChild(card);
        });

        acpBox.appendChild(stationsRow);
        acpRow.appendChild(acpBox);

        // ACP label goes into the footer row
        const acpLabel = document.createElement('div');
        acpLabel.className = 'acp-label' + (selectedACPGroup === acpGroup.acp ? ' acp-label-active' : '');
        acpLabel.style.setProperty('--acp-accent', theme.accent);
        acpLabel.style.setProperty('--acp-light', theme.light);
        acpLabel.innerHTML = `<span class="acp-label-icon">${theme.icon}</span> ${t(acpGroup.acp)}`;
        acpLabel.addEventListener('click', () => selectACPGroup(acpGroup));
        acpFooter.appendChild(acpLabel);
    });

    dcpWrapper.appendChild(acpFooter);
    dcpWrapper.appendChild(acpRow);
    container.appendChild(dcpWrapper);

    // Unknown stations (outside the DCP wrapper)
    const knownStations = STATION_FLAT_ORDER.map(s => s.toLowerCase());
    const unknownStations = allData.filters.stations.filter(
        s => !knownStations.includes(s.toLowerCase())
    );

    if (unknownStations.length > 0) {
        const groupWrap = document.createElement('div');
        groupWrap.className = 'acp-box reveal-scale';
        groupWrap.style.setProperty('--acp-accent', '#64748b');
        groupWrap.style.setProperty('--acp-light', '#f8fafc');
        groupWrap.style.marginTop = '16px';

        const stationsRow = document.createElement('div');
        stationsRow.className = 'station-cards-row';

        unknownStations.forEach(station => {
            const count = grouped[station] ? grouped[station].length : 0;
            const card = document.createElement('div');
            card.className = 'station-card' + (selectedStation === station ? ' active' : '');
            card.innerHTML = `
                <div class="station-card-name">${station}</div>
                <div class="station-card-count">${count}</div>
                <div class="station-card-label">${t('cases')}</div>
            `;
            card.addEventListener('click', () => selectStation(station));
            stationsRow.appendChild(card);
        });

        groupWrap.appendChild(stationsRow);

        const acpLabel = document.createElement('div');
        acpLabel.className = 'acp-label';
        acpLabel.innerHTML = `<svg class="acp-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg> ${t('otherStations')}`;
        groupWrap.appendChild(acpLabel);

        container.appendChild(groupWrap);
    }

    // Re-observe for scroll-reveal
    requestAnimationFrame(() => {
        container.querySelectorAll('.reveal-scale:not(.revealed)').forEach(el => {
            if (window._revealObserver) window._revealObserver.observe(el);
            else el.classList.add('revealed');
        });
    });
}


// ─── Select single station ─────────────────────────────────
function selectStation(station) {
    if (selectedStation === station) {
        selectedStation = null;
        document.getElementById('stationContent').style.display = 'none';
        destroyStationCharts();
        renderACPSelector();
        return;
    }
    selectedStation = station;
    selectedACPGroup = null;
    document.getElementById('stationContent').style.display = 'block';
    renderACPSelector();
    renderStationDashboard();
}

// ─── Select ACP group (combined view) ──────────────────────
function selectACPGroup(acpGroup) {
    if (selectedACPGroup === acpGroup.acp) {
        selectedACPGroup = null;
        document.getElementById('stationContent').style.display = 'none';
        destroyStationCharts();
        renderACPSelector();
        return;
    }
    selectedACPGroup = acpGroup.acp;
    selectedStation = null;
    document.getElementById('stationContent').style.display = 'block';
    renderACPSelector();
    renderStationDashboard();
}

// ─── Get records for current selection ──────────────────────
function getSelectedRecords() {
    if (selectedACPGroup) {
        const acpGroup = STATION_ORDER.find(g => g.acp === selectedACPGroup);
        if (!acpGroup) return [];
        const acpStationNames = acpGroup.stations.map(s => {
            return allData.filters.stations.find(
                ds => ds.toLowerCase() === s.toLowerCase()
            ) || s;
        });
        return filteredRecords.filter(r => acpStationNames.includes(r.policeStation));
    }
    if (selectedStation) {
        return filteredRecords.filter(r => r.policeStation === selectedStation);
    }
    return [];
}

// ─── Dashboard rendering ────────────────────────────────────
function renderStationDashboard() {
    if (!selectedStation && !selectedACPGroup) return;
    const records = getSelectedRecords();
    destroyStationCharts();

    const total = records.length;
    const inv = records.reduce((s, r) => s + r.underInvestigation, 0);
    const closed = records.reduce((s, r) => s + r.closed, 0);
    const rate = (inv + closed) > 0 ? ((closed / (inv + closed)) * 100).toFixed(1) : 0;

    setKPI('kpiTotal', total);
    setKPI('kpiInvestigation', inv);
    setKPI('kpiClosed', closed);
    setKPI('kpiRate', rate + '%');

    renderStationCrimeTypes(records);     // Horizontal Bar
    renderStationPolar(records);          // Polar Area (NEW)
    renderStationRadar(records);          // Radar (NEW)
    renderStationStackedArea(records);    // Stacked Area (NEW)
    renderStationTable(records);
    bindChartClicks();
}

// ─── 1. Crime Types — Horizontal Bar ────────────────────────
function renderStationCrimeTypes(records) {
    const cfg = getCrimeTypeCfg(records);
    stationCharts.crimeTypes = new Chart(document.getElementById('chartStationCrimes'), cfg);
    stationRenderers.stationCrimes = (canvas) => new Chart(canvas, getCrimeTypeCfg(records));
}

function getCrimeTypeCfg(records) {
    const grouped = groupBy(records, 'crimeType');
    const sorted = Object.entries(grouped).sort((a, b) => b[1].length - a[1].length).slice(0, 8);
    const labels = sorted.map(e => translateCrimeType(e[0]));
    const data = sorted.map(e => e[1].length);
    const maxVal = Math.max(...data, 1);
    return {
        type: 'bar',
        data: { labels, datasets: [{ data, backgroundColor: PAL.slice(0, labels.length), borderRadius: 6, barThickness: 24, borderSkipped: false, categoryPercentage: 0.7, barPercentage: 0.65 }] },
        options: {
            indexAxis: 'y', responsive: true, maintainAspectRatio: false,
            layout: { padding: { right: 40, top: 10, bottom: 10 } },
            plugins: {
                legend: { display: false },
                tooltip: { enabled: true }
            },
            scales: {
                x: { beginAtZero: true, max: maxVal + Math.ceil(maxVal * 0.25), grid: { color: GRID }, ticks: { precision: 0, color: '#374151', font: { size: 11 } } },
                y: { grid: { display: false }, ticks: { color: '#1f2937', font: { size: 11, weight: '600' } } }
            }
        },
        plugins: [{
            id: 'barLabels',
            afterDatasetsDraw(chart) {
                const ctx = chart.ctx;
                chart.data.datasets.forEach((ds, i) => {
                    const meta = chart.getDatasetMeta(i);
                    meta.data.forEach((bar, idx) => {
                        const val = ds.data[idx];
                        ctx.save();
                        ctx.fillStyle = '#374151';
                        ctx.font = 'bold 12px Inter, sans-serif';
                        ctx.textAlign = 'left';
                        ctx.textBaseline = 'middle';
                        ctx.fillText(val, bar.x + 8, bar.y);
                        ctx.restore();
                    });
                });
            }
        }]
    };
}

// ─── 2. Polar Area — Case Status Breakdown ──────────────────
function renderStationPolar(records) {
    const cfg = getPolarCfg(records);
    stationCharts.polar = new Chart(document.getElementById('chartStationPolar'), cfg);
    stationRenderers.stationPolar = (canvas) => new Chart(canvas, getPolarCfg(records));
}

function getPolarCfg(records) {
    const total = records.length;

    // Top 6 crime types for readable polar chart
    const grouped = groupBy(records, 'crimeType');
    const sorted = Object.entries(grouped).sort((a, b) => b[1].length - a[1].length);
    const topN = sorted.slice(0, 6);

    const labels = topN.map(e => translateCrimeType(e[0]));
    const data = topN.map(e => e[1].length);

    return {
        type: 'polarArea',
        data: {
            labels,
            datasets: [{
                data,
                backgroundColor: PAL.slice(0, labels.length).map(c => c + 'cc'),
                borderColor: PAL.slice(0, labels.length),
                borderWidth: 1.5
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            layout: { padding: { top: 10, bottom: 5 } },
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        color: '#1f2937', font: { size: 10 },
                        boxWidth: 10, padding: 10,
                        usePointStyle: true, pointStyle: 'circle'
                    }
                },
                tooltip: {
                    callbacks: {
                        label: ctx => {
                            const pct = total > 0 ? ((ctx.raw / total) * 100).toFixed(1) : 0;
                            return ` ${ctx.label}: ${ctx.raw} (${pct}%)`;
                        }
                    }
                }
            },
            scales: {
                r: {
                    ticks: { display: false },
                    grid: { color: '#e5e7eb' }
                }
            }
        }
    };
}

// ─── 3. Radar — Monthly Crime Pattern ───────────────────────
function renderStationRadar(records) {
    const cfg = getRadarCfg(records);
    stationCharts.radar = new Chart(document.getElementById('chartStationRadar'), cfg);
    stationRenderers.stationRadar = (canvas) => new Chart(canvas, getRadarCfg(records));
}

function getRadarCfg(records) {
    const monthData = {};
    for (let m = 1; m <= 12; m++) monthData[m] = 0;
    records.forEach(r => { monthData[r.month] = (monthData[r.month] || 0) + 1; });

    const labels = [];
    const data = [];
    for (let m = 1; m <= 12; m++) {
        labels.push(getMonthName(m));
        data.push(monthData[m]);
    }

    // If ACP mode, also show individual station lines
    const isACPMode = !!selectedACPGroup;
    const datasets = [];

    if (isACPMode) {
        const acpGroup = STATION_ORDER.find(g => g.acp === selectedACPGroup);
        if (acpGroup) {
            const acpStationNames = acpGroup.stations.map(s => {
                return allData.filters.stations.find(
                    ds => ds.toLowerCase() === s.toLowerCase()
                ) || s;
            });
            acpStationNames.forEach((st, idx) => {
                const stRecords = records.filter(r => r.policeStation === st);
                const stData = [];
                for (let m = 1; m <= 12; m++) {
                    stData.push(stRecords.filter(r => r.month === m).length);
                }
                datasets.push({
                    label: st,
                    data: stData,
                    borderColor: PAL[idx],
                    backgroundColor: PAL[idx] + '25',
                    fill: true,
                    pointBackgroundColor: PAL[idx],
                    pointBorderColor: '#fff',
                    pointBorderWidth: 1.5,
                    pointRadius: 3,
                    borderWidth: 2
                });
            });
        }
    } else {
        datasets.push({
            label: selectedStation || '',
            data,
            borderColor: '#6366f1',
            backgroundColor: 'rgba(99,102,241,0.15)',
            fill: true,
            pointBackgroundColor: '#6366f1',
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 6,
            borderWidth: 2.5
        });
    }

    return {
        type: 'radar',
        data: { labels, datasets },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: isACPMode,
                    position: 'bottom',
                    labels: { color: '#1f2937', font: { size: 10 }, boxWidth: 8, padding: 6, usePointStyle: true, pointStyle: 'circle' }
                }
            },
            scales: {
                r: {
                    beginAtZero: true,
                    angleLines: { color: '#e5e7eb' },
                    grid: { color: '#e5e7eb' },
                    pointLabels: { color: '#374151', font: { size: 11, weight: '500' } },
                    ticks: { precision: 0, backdropColor: 'transparent', color: '#9ca3af', font: { size: 9 } }
                }
            }
        }
    };
}

// ─── 4. Stacked Area — Crime Trend by Type ──────────────────
function renderStationStackedArea(records) {
    const cfg = getStackedAreaCfg(records);
    stationCharts.area = new Chart(document.getElementById('chartStationArea'), cfg);
    stationRenderers.stationArea = (canvas) => new Chart(canvas, getStackedAreaCfg(records));
}

function getStackedAreaCfg(records) {
    const crimeTypes = [...new Set(records.map(r => r.crimeType))];
    // Use short 3-letter month names to prevent rotation
    const monthLabels = [];
    for (let m = 1; m <= 12; m++) monthLabels.push(getMonthName(m).substring(0, 3));

    // Top 4 crime types for a clean, readable chart
    const crimeTypeCounts = {};
    crimeTypes.forEach(ct => {
        crimeTypeCounts[ct] = records.filter(r => r.crimeType === ct).length;
    });
    const sortedTypes = Object.entries(crimeTypeCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4)
        .map(e => e[0]);

    const datasets = sortedTypes.map((ct, i) => ({
        label: translateCrimeType(ct),
        data: Array.from({ length: 12 }, (_, m) =>
            records.filter(r => r.month === (m + 1) && r.crimeType === ct).length),
        borderColor: PAL[i % PAL.length],
        backgroundColor: PAL[i % PAL.length] + '30',
        fill: true,
        tension: 0.4,
        pointRadius: 3,
        pointHoverRadius: 6,
        borderWidth: 2
    }));

    return {
        type: 'line',
        data: { labels: monthLabels, datasets },
        options: {
            responsive: true, maintainAspectRatio: false,
            layout: { padding: { top: 10, bottom: 5, left: 5, right: 10 } },
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: '#1f2937', font: { size: 10.5 }, boxWidth: 10, padding: 12, usePointStyle: true, pointStyle: 'circle' }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false
                }
            },
            scales: {
                x: { grid: { display: false }, ticks: { color: '#374151', font: { size: 11 }, maxRotation: 0 } },
                y: {
                    stacked: true, beginAtZero: true,
                    grid: { color: GRID },
                    ticks: { precision: 0, color: '#374151', font: { size: 11 } }
                }
            },
            interaction: {
                mode: 'nearest',
                axis: 'x',
                intersect: false
            }
        }
    };
}

// ─── Data Table ─────────────────────────────────────────────
function renderStationTable(records) {
    const container = document.getElementById('stationTableContainer');
    if (!container) return;

    const isACPMode = !!selectedACPGroup;

    let html = '<table class="data-table"><thead><tr>';
    if (isACPMode) html += `<th>${t('tableStation')}</th>`;
    html += `<th>${t('tableYear')}</th><th>${t('tableMonth')}</th><th>${t('tableCrimeType')}</th><th>${t('tableInvestigation')}</th><th>${t('tableClosed')}</th>`;
    html += '</tr></thead><tbody>';

    const colSpan = isACPMode ? 6 : 5;

    if (records.length === 0) {
        html += `<tr><td colspan="${colSpan}" style="text-align:center;padding:20px;color:#6b7280">${t('noData')}</td></tr>`;
    } else {
        records.forEach(r => {
            html += '<tr>';
            if (isACPMode) html += `<td>${r.policeStation}</td>`;
            html += `<td>${r.year}</td><td>${getMonthName(r.month)}</td><td>${translateCrimeType(r.crimeType)}</td><td>${r.underInvestigation}</td><td>${r.closed}</td></tr>`;
        });
    }

    html += '</tbody></table>';
    container.innerHTML = html;
}

initApp(() => { renderACPSelector(); });
