const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');
const db = require('./database');

// Track sync state to prevent loops
let isSyncing = false;

// ─── Load Excel into SQLite ──────────────────────────────────
function loadExcelIntoDB(excelPath) {
    if (!fs.existsSync(excelPath)) {
        console.error(`  [Sync] Excel file not found: ${excelPath}`);
        return { success: false, error: 'File not found' };
    }

    isSyncing = true;
    try {
        const workbook = XLSX.readFile(excelPath);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rawData = XLSX.utils.sheet_to_json(worksheet);

        // Clear existing data
        db.clearAll();

        // Bulk insert using a transaction for speed
        const database = db.getDB();
        const insertStmt = database.prepare(`
            INSERT INTO crime_records (year, month, police_station, crime_type, under_investigation, closed)
            VALUES (@year, @month, @police_station, @crime_type, @under_investigation, @closed)
        `);

        const insertMany = database.transaction((rows) => {
            for (const row of rows) {
                insertStmt.run({
                    year: parseInt(row['Year'] || row['year'] || 0),
                    month: parseInt(row['Month'] || row['month'] || 0),
                    police_station: row['Police Station'] || row['police station'] || '',
                    crime_type: row['Crime Type'] || row['crime type'] || '',
                    under_investigation: parseInt(row['Under Investigation'] || row['under investigation'] || 0),
                    closed: parseInt(row['Closed'] || row['closed'] || 0)
                });
            }
        });

        insertMany(rawData);

        const count = db.getRecordCount();
        console.log(`  [Sync] Loaded ${count} records from Excel into SQLite`);
        return { success: true, count };
    } catch (err) {
        console.error('  [Sync] Error loading Excel:', err.message);
        return { success: false, error: err.message };
    } finally {
        isSyncing = false;
    }
}

// ─── Write SQLite data back to Excel ─────────────────────────
function writeBackToExcel(excelPath) {
    if (isSyncing) return; // prevent sync loops
    isSyncing = true;

    try {
        const records = db.getAllRecords();

        // Convert to Excel-friendly format (matching original column names)
        const excelData = records.map(r => ({
            'Year': r.year,
            'Month': r.month,
            'Police Station': r.police_station,
            'Crime Type': r.crime_type,
            'Under Investigation': r.under_investigation,
            'Closed': r.closed
        }));

        const worksheet = XLSX.utils.json_to_sheet(excelData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Crime Data');

        // Set column widths for readability
        worksheet['!cols'] = [
            { wch: 6 },   // Year
            { wch: 6 },   // Month
            { wch: 20 },  // Police Station
            { wch: 25 },  // Crime Type
            { wch: 20 },  // Under Investigation
            { wch: 10 }   // Closed
        ];

        XLSX.writeFile(workbook, excelPath);
        console.log(`  [Sync] Wrote ${records.length} records back to Excel`);
        return { success: true, count: records.length };
    } catch (err) {
        console.error('  [Sync] Error writing to Excel:', err.message);
        return { success: false, error: err.message };
    } finally {
        // Delay resetting flag to let file watcher debounce
        setTimeout(() => { isSyncing = false; }, 2000);
    }
}

// ─── Export to a new Excel file (download) ───────────────────
function exportToExcel(outputPath) {
    return writeBackToExcel(outputPath);
}

// ─── Check if currently syncing (to prevent watcher loops) ───
function getIsSyncing() {
    return isSyncing;
}

module.exports = {
    loadExcelIntoDB,
    writeBackToExcel,
    exportToExcel,
    getIsSyncing
};
