const express = require('express');
const XLSX = require('xlsx');
const chokidar = require('chokidar');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

// Path to the Excel file
const EXCEL_PATH = path.join(__dirname, 'data', 'Crime_Data_Template (3).xlsx');

// SSE clients
let sseClients = [];

// ─── Excel Parser ────────────────────────────────────────────
function readExcelData() {
    try {
        const workbook = XLSX.readFile(EXCEL_PATH);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rawData = XLSX.utils.sheet_to_json(worksheet);

        // Normalize column names (handle possible variations)
        const records = rawData.map(row => ({
            year: row['Year'] || row['year'] || 0,
            month: row['Month'] || row['month'] || 0,
            policeStation: row['Police Station'] || row['police station'] || '',
            crimeType: row['Crime Type'] || row['crime type'] || '',
            underInvestigation: parseInt(row['Under Investigation'] || row['under investigation'] || 0),
            closed: parseInt(row['Closed'] || row['closed'] || 0)
        }));

        // Compute summary
        const totalCrimes = records.length;
        const totalUnderInvestigation = records.reduce((s, r) => s + r.underInvestigation, 0);
        const totalClosed = records.reduce((s, r) => s + r.closed, 0);
        const closureRate = totalUnderInvestigation + totalClosed > 0
            ? ((totalClosed / (totalUnderInvestigation + totalClosed)) * 100).toFixed(1)
            : 0;

        // Unique values for filters
        const years = [...new Set(records.map(r => r.year))].sort();
        const months = [...new Set(records.map(r => r.month))].sort((a, b) => a - b);
        const stations = [...new Set(records.map(r => r.policeStation))].sort();
        const crimeTypes = [...new Set(records.map(r => r.crimeType))].sort();

        // Get file modification time
        const stats = fs.statSync(EXCEL_PATH);
        const lastModified = stats.mtime.toISOString();

        return {
            records,
            summary: {
                totalCrimes,
                totalUnderInvestigation,
                totalClosed,
                closureRate: parseFloat(closureRate)
            },
            filters: { years, months, stations, crimeTypes },
            lastModified
        };
    } catch (err) {
        console.error('Error reading Excel file:', err.message);
        return {
            records: [],
            summary: { totalCrimes: 0, totalUnderInvestigation: 0, totalClosed: 0, closureRate: 0 },
            filters: { years: [], months: [], stations: [], crimeTypes: [] },
            lastModified: null,
            error: err.message
        };
    }
}

// ─── Static Files ────────────────────────────────────────────
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// ─── API: Get Data ───────────────────────────────────────────
app.get('/api/data', (req, res) => {
    const data = readExcelData();
    res.json(data);
});

// ─── API: SSE Events ─────────────────────────────────────────
app.get('/api/events', (req, res) => {
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
    });

    // Send initial heartbeat
    res.write('data: {"type":"connected"}\n\n');

    // Register client
    sseClients.push(res);

    // Remove client on disconnect
    req.on('close', () => {
        sseClients = sseClients.filter(c => c !== res);
    });
});

function notifyClients() {
    const message = JSON.stringify({ type: 'data-updated', timestamp: new Date().toISOString() });
    sseClients.forEach(client => {
        client.write(`data: ${message}\n\n`);
    });
}

// ─── File Watcher ────────────────────────────────────────────
let debounceTimer = null;
const watcher = chokidar.watch(EXCEL_PATH, {
    persistent: true,
    awaitWriteFinish: {
        stabilityThreshold: 1000,
        pollInterval: 300
    }
});

watcher.on('change', (filePath) => {
    // Debounce to avoid multiple rapid triggers
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
        console.log(`[${new Date().toLocaleTimeString()}] Excel file changed — pushing update to ${sseClients.length} client(s)`);
        notifyClients();
    }, 500);
});

watcher.on('error', (error) => {
    console.error('File watcher error:', error);
});

// ─── Start Server ────────────────────────────────────────────
app.listen(PORT, () => {
    console.log('');
    console.log('  ╔══════════════════════════════════════════════╗');
    console.log('  ║   Zone 1 Crime Intelligence System           ║');
    console.log('  ║   झोन 1 गुन्हे गुप्तचर प्रणाली                  ║');
    console.log('  ╠══════════════════════════════════════════════╣');
    console.log(`  ║   Server:  http://localhost:${PORT}              ║`);
    console.log(`  ║   Excel:   ${path.basename(EXCEL_PATH)}   ║`);
    console.log('  ║   Status:  Watching for changes...           ║');
    console.log('  ╚══════════════════════════════════════════════╝');
    console.log('');
});
