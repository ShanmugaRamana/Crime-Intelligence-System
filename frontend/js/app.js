/* ═══════════════════════════════════════════════════════════════
   Zone 1 Crime Intelligence System — Shared App Logic
   SSE, Data Fetching, Language Toggle, Filters
   ═══════════════════════════════════════════════════════════════ */

let currentLang = 'en';
let allData = null;
let filteredRecords = [];

// ─── Data Fetching ──────────────────────────────────────────
async function fetchData() {
    try {
        const res = await fetch('/api/data');
        allData = await res.json();
        applyFilters();
        return allData;
    } catch (err) {
        console.error('Failed to fetch data:', err);
        return null;
    }
}

// ─── SSE Connection ─────────────────────────────────────────
function connectSSE() {
    const evtSource = new EventSource('/api/events');

    evtSource.onmessage = function (event) {
        const msg = JSON.parse(event.data);
        if (msg.type === 'data-updated') {
            console.log('Data updated! Refreshing...');
            fetchData().then(() => {
                showToast();
            });
        }
    };

    evtSource.onerror = function () {
        console.warn('SSE connection lost, reconnecting in 3s...');
        evtSource.close();
        setTimeout(connectSSE, 3000);
    };
}

// ─── Toast Notification ─────────────────────────────────────
function showToast() {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = t('dataUpdated');
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

// ─── Language Toggle ────────────────────────────────────────
function t(key) {
    const entry = TRANSLATIONS[key];
    return entry ? (entry[currentLang] || entry.en) : key;
}

function getMonthName(num) {
    return MONTH_NAMES[currentLang][num] || num;
}

function toggleLanguage() {
    currentLang = currentLang === 'en' ? 'mr' : 'en';
    localStorage.setItem('z1cis_lang', currentLang);
    updateAllLabels();
    if (typeof renderAllCharts === 'function') renderAllCharts();
}

function updateAllLabels() {
    // Update all elements with data-t attribute
    document.querySelectorAll('[data-t]').forEach(el => {
        const key = el.getAttribute('data-t');
        el.textContent = t(key);
    });

    // Update lang toggle button text (preserve SVG icon)
    const langBtn = document.getElementById('langToggle');
    if (langBtn) {
        const span = langBtn.querySelector('span');
        if (span) span.textContent = t('langToggle');
    }

    // Update last updated
    updateLastUpdated();

    // Update filter labels
    document.querySelectorAll('[data-t-label]').forEach(el => {
        const key = el.getAttribute('data-t-label');
        el.textContent = t(key);
    });

    // Update select "All" options
    document.querySelectorAll('select option[value="all"]').forEach(opt => {
        opt.textContent = t('filterAll');
    });
}

function updateLastUpdated() {
    const el = document.getElementById('lastUpdated');
    if (el && allData && allData.lastModified) {
        const d = new Date(allData.lastModified);
        const formatted = d.toLocaleString(currentLang === 'mr' ? 'mr-IN' : 'en-IN');
        el.textContent = `${t('lastUpdated')}: ${formatted}`;
    }
}

// ─── Filters ────────────────────────────────────────────────
function populateFilters() {
    if (!allData) return;

    const yearSelect = document.getElementById('filterYear');
    const monthSelect = document.getElementById('filterMonth');

    if (yearSelect) {
        const currentVal = yearSelect.value;
        yearSelect.innerHTML = `<option value="all">${t('filterAll')}</option>`;
        allData.filters.years.forEach(y => {
            yearSelect.innerHTML += `<option value="${y}" ${y == currentVal ? 'selected' : ''}>${y}</option>`;
        });
    }

    if (monthSelect) {
        const currentVal = monthSelect.value;
        monthSelect.innerHTML = `<option value="all">${t('filterAll')}</option>`;
        for (let m = 1; m <= 12; m++) {
            const available = allData.filters.months.includes(m);
            const label = getMonthName(m);
            monthSelect.innerHTML += `<option value="${m}" ${m == currentVal ? 'selected' : ''} ${!available ? 'style="color:#bbb"' : ''}>${label}${available ? '' : ' (—)'}</option>`;
        }
    }

    // Station filter (only on station page or if exists)
    const stationSelect = document.getElementById('filterStation');
    if (stationSelect) {
        const currentVal = stationSelect.value;
        stationSelect.innerHTML = `<option value="all">${t('filterAll')}</option>`;
        allData.filters.stations.forEach(s => {
            stationSelect.innerHTML += `<option value="${s}" ${s === currentVal ? 'selected' : ''}>${s}</option>`;
        });
    }

    // Crime type filter — show translated names
    const crimeSelect = document.getElementById('filterCrimeType');
    if (crimeSelect) {
        const currentVal = crimeSelect.value;
        crimeSelect.innerHTML = `<option value="all">${t('filterAll')}</option>`;
        allData.filters.crimeTypes.forEach(ct => {
            const label = typeof translateCrimeType === 'function' ? translateCrimeType(ct) : ct;
            crimeSelect.innerHTML += `<option value="${ct}" ${ct === currentVal ? 'selected' : ''}>${label}</option>`;
        });
    }
}

function applyFilters() {
    if (!allData) return;

    const yearVal = document.getElementById('filterYear')?.value || 'all';
    const monthVal = document.getElementById('filterMonth')?.value || 'all';
    const stationVal = document.getElementById('filterStation')?.value || 'all';
    const crimeVal = document.getElementById('filterCrimeType')?.value || 'all';

    filteredRecords = allData.records.filter(r => {
        if (yearVal !== 'all' && r.year != yearVal) return false;
        if (monthVal !== 'all' && r.month != monthVal) return false;
        if (stationVal !== 'all' && r.policeStation !== stationVal) return false;
        if (crimeVal !== 'all' && r.crimeType !== crimeVal) return false;
        return true;
    });

    populateFilters();
    updateKPIs();
    updateLastUpdated();
    if (typeof renderAllCharts === 'function') renderAllCharts();
}

function resetFilters() {
    document.querySelectorAll('.filter-bar select').forEach(sel => sel.value = 'all');
    applyFilters();
}

// ─── KPI Update ─────────────────────────────────────────────
function updateKPIs() {
    const total = filteredRecords.length;
    const inv = filteredRecords.reduce((s, r) => s + r.underInvestigation, 0);
    const closed = filteredRecords.reduce((s, r) => s + r.closed, 0);
    const rate = (inv + closed) > 0 ? ((closed / (inv + closed)) * 100).toFixed(1) : 0;

    setKPI('kpiTotal', total);
    setKPI('kpiInvestigation', inv);
    setKPI('kpiClosed', closed);
    setKPI('kpiRate', rate + '%');
}

function setKPI(id, value) {
    const el = document.getElementById(id);
    if (el) {
        animateValue(el, value);
    }
}

function animateValue(el, newValue) {
    el.textContent = newValue;
}

// ─── Utility: Group By ──────────────────────────────────────
function groupBy(records, key) {
    const map = {};
    records.forEach(r => {
        const k = r[key];
        if (!map[k]) map[k] = [];
        map[k].push(r);
    });
    return map;
}

function sumField(records, field) {
    return records.reduce((s, r) => s + (r[field] || 0), 0);
}

// ─── Mobile menu (no sidebar — placeholder for mobile nav) ──
function toggleSidebar() {
    // No sidebar in this layout
}

// ─── Init ───────────────────────────────────────────────────
function initApp(onReady) {
    // Restore language preference
    const savedLang = localStorage.getItem('z1cis_lang');
    if (savedLang) currentLang = savedLang;

    // Bind filter events
    document.querySelectorAll('.filter-bar select').forEach(sel => {
        sel.addEventListener('change', applyFilters);
    });

    const resetBtn = document.getElementById('btnReset');
    if (resetBtn) resetBtn.addEventListener('click', resetFilters);

    const langBtn = document.getElementById('langToggle');
    if (langBtn) langBtn.addEventListener('click', toggleLanguage);

    const mobileBtn = document.getElementById('mobileToggle');
    if (mobileBtn) mobileBtn.addEventListener('click', toggleSidebar);

    const printBtn = document.getElementById('btnPrint');
    if (printBtn) printBtn.addEventListener('click', () => window.print());

    // Fetch data and start SSE
    fetchData().then(() => {
        updateAllLabels();
        if (onReady) onReady();
        connectSSE();
    });
}
