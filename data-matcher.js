// ===== DATA VARIABLES =====
let f2poolData = [];
let machinelistData = [];
let matchedResults = [];
let currentFilter = 'all';
let detectedSegmentCount = 2;
let currentSort = { column: null, direction: null }; // added: sort A-Z feature (null = default priority order)

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('f2poolFile').addEventListener('change', handleF2PoolFileChange);
    document.getElementById('machinelistFile').addEventListener('change', handleMachinelistFileChange);
    document.getElementById('matchBtn').addEventListener('click', matchData);
    document.getElementById('clearBtn').addEventListener('click', handleClear);

    // added: sortable header listeners (sort A-Z feature)
    document.querySelectorAll('th.sortable').forEach(th => {
        th.addEventListener('click', function () {
            handleSortClick(this.dataset.column);
        });
    });

    // added: Auto Grab F2Pool (auto download per DC)
    populateDCDropdown();
    document.getElementById('dcSelect').addEventListener('change', handleDcSelectChange);
    document.getElementById('dcDownloadBtn').addEventListener('click', handleDcDownload);
});

// ===== FILE INPUT HANDLERS =====
function handleF2PoolFileChange(e) {
    const file = e.target.files[0];
    if (file) {
        document.getElementById('f2poolName').textContent = '✅ ' + file.name;
        parseF2PoolFile(file);
    } else {
        document.getElementById('f2poolName').textContent = 'No file selected';
    }
    updateMatchButton();
}

function handleMachinelistFileChange(e) {
    const file = e.target.files[0];
    if (file) {
        document.getElementById('machinelistName').textContent = '✅ ' + file.name;
        parseMachinelistFile(file);
    } else {
        document.getElementById('machinelistName').textContent = 'No file selected';
    }
    updateMatchButton();
}

// ===== AUTO GRAB F2POOL (added: auto download CSV per DC) =====
// Catatan: download native (cross-origin). Status bersifat optimis karena
// browser menangani download; JavaScript tidak dapat memverifikasi isi file
// tersimpan atau teralihkan ke halaman login. Compare tetap via upload manual.
function populateDCDropdown() {
    const select = document.getElementById('dcSelect');
    if (!select || !window.f2poolDCLinks) return;

    window.f2poolDCLinks.forEach(entry => {
        const opt = document.createElement('option');
        opt.value = entry.user;
        opt.textContent = entry.dc;
        select.appendChild(opt);
    });
}

function handleDcSelectChange(e) {
    const user = e.target.value;
    const downloadBtn = document.getElementById('dcDownloadBtn');
    const status = document.getElementById('dcStatus');

    downloadBtn.disabled = !user;

    if (user) {
        const dcLabel = e.target.options[e.target.selectedIndex].textContent;
        status.textContent = `Siap download: ${dcLabel}`;
        status.className = 'dc-status';
    } else {
        status.textContent = 'Belum ada download';
        status.className = 'dc-status';
    }
}

function handleDcDownload() {
    const select = document.getElementById('dcSelect');
    const user = select.value;
    if (!user) return;

    const dcLabel = select.options[select.selectedIndex].textContent;
    const status = document.getElementById('dcStatus');

    if (!window.f2poolBaseUrl || !window.f2poolExportParams) {
        status.textContent = '❌ Konfigurasi URL F2Pool tidak ditemukan';
        status.className = 'dc-status error';
        return;
    }

    const url = window.f2poolBaseUrl + '?user_name=' + user + window.f2poolExportParams;

    status.textContent = `⬇️ Memulai download untuk ${dcLabel}…`;
    status.className = 'dc-status loading';

    try {
        // Trigger download native (cross-origin): browser yang menangani.
        const a = document.createElement('a');
        a.href = url;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        // Status optimis setelah jeda singkat.
        setTimeout(() => {
            status.textContent = `✅ Download dimulai untuk ${dcLabel} — periksa folder Downloads, lalu gunakan "Pilih File CSV" untuk compare.`;
            status.className = 'dc-status success';
        }, 800);
    } catch (error) {
        status.textContent = `❌ Gagal memulai download: ${error.message}`;
        status.className = 'dc-status error';
    }
}

// ===== FILE PARSING =====
function parseF2PoolFile(file) {
    const reader = new FileReader();
    reader.onload = function (e) {
        try {
            const csv = e.target.result;
            const lines = csv.split('\n');
            const headers = lines[0].split(',').map(h => h.trim());
            f2poolData = [];

            for (let i = 1; i < lines.length; i++) {
                if (!lines[i].trim()) continue;
                const values = lines[i].split(',').map(v => v.trim());
                const row = {};
                headers.forEach((h, idx) => {
                    row[h] = values[idx] || '';
                });
                f2poolData.push(row);
            }

            showMessage(`✅ Loaded ${f2poolData.length} F2Pool workers`, 'success');
        } catch (error) {
            showMessage('❌ Error parsing F2Pool file: ' + error.message, 'error');
        }
    };
    reader.readAsText(file);
}

function parseMachinelistFile(file) {
    if (file.name.endsWith('.xlsx')) {
        parseExcelFile(file);
    } else {
        parseCSVFile(file);
    }
}

function parseCSVFile(file) {
    const reader = new FileReader();
    reader.onload = function (e) {
        try {
            const csv = e.target.result;
            const lines = csv.split('\n');
            const headers = lines[0].split(',').map(h => h.trim());
            machinelistData = [];

            console.log('CSV Headers:', headers);

            for (let i = 1; i < lines.length; i++) {
                if (!lines[i].trim()) continue;
                const values = lines[i].split(',').map(v => v.trim());
                const row = {};
                headers.forEach((h, idx) => {
                    row[h] = values[idx] || '';
                });
                machinelistData.push(row);
            }

            showMessage(`✅ Loaded ${machinelistData.length} machines from Machinelist`, 'success');
        } catch (error) {
            showMessage('❌ Error parsing Machinelist file: ' + error.message, 'error');
        }
    };
    reader.readAsText(file);
}

function parseExcelFile(file) {
    const reader = new FileReader();
    reader.onload = function (e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet);
            machinelistData = jsonData;

            console.log('Excel Headers:', jsonData.length > 0 ? Object.keys(jsonData[0]) : 'NO DATA');
            console.log('First row:', jsonData.length > 0 ? jsonData[0] : 'NO DATA');

            showMessage(`✅ Loaded ${machinelistData.length} machines from Machinelist`, 'success');
        } catch (error) {
            showMessage('❌ Error parsing Excel file. Error: ' + error.message, 'error');
        }
    };
    reader.readAsArrayBuffer(file);
}

// ===== UNIT CONVERSION LOGIC =====
function rackLetterToNumber(letter) {
    if (!letter || letter.length === 0) return null;
    return letter.charCodeAt(0) - 64;
}

function rackNumberToLetter(num) {
    if (!num) return null;
    return String.fromCharCode(64 + num);
}

function buildPossibleWorkerFormats(locationId, storeroom, rackLetter, row, unit) {
    const formats2Segment = [];
    const formats4Segment = [];
    const rackNumber = rackLetterToNumber(rackLetter);
    
    // Special rule for unit 10: convert to (row+1)0
    let unitStr;
    if (parseInt(unit) === 10) {
        unitStr = String(parseInt(row) + 1) + '0';
    } else {
        unitStr = row + unit;
    }
    
    const storeLower = storeroom.toLowerCase();
    
    // Prefix variations based on F2Pool naming conventions
    const prefixes = [
        `gbeab${storeLower}`, // e.g., gbeabe4a
        `gbeg${storeLower}`,  // e.g., gbege4a
        storeLower            // fallback: e4a
    ];
    
    // 1. Generate 2-segment formats (e.g., gbeabe4a.1x52)
    prefixes.forEach(prefix => {
        formats2Segment.push(`${prefix}.${rackNumber}x${unitStr}`);
    });
    
    // 2. Generate 4-segment formats based on IP from masterData
    if (window.masterData) {
        // Build reverse IP map if it doesn't exist yet for fast lookups
        if (!window.locationToIpMap) {
            window.locationToIpMap = {};
            for (const [ip, loc] of Object.entries(window.masterData)) {
                window.locationToIpMap[loc.toLowerCase()] = ip;
            }
        }
        
        const ip = window.locationToIpMap[locationId.toLowerCase()];
        if (ip) {
            // Convert IP 10.225.1.55 to 10x225x1x55
            const ipFormat = ip.split('.').join('x');
            prefixes.forEach(prefix => {
                formats4Segment.push(`${prefix}.${ipFormat}`);
            });
        }
    }
    
    // Order formats based on the detected format of the uploaded F2Pool data
    if (detectedSegmentCount === 4 && formats4Segment.length > 0) {
        return [...formats4Segment, ...formats2Segment];
    } else {
        return [...formats2Segment, ...formats4Segment];
    }
}

// ===== MATCHING LOGIC =====
function detectF2PoolSegmentCount() {
    let count4 = 0;
    let count2 = 0;
    
    f2poolData.forEach(row => {
        const workerName = row['Worker'] || '';
        const parts = workerName.split('.');
        if (parts.length > 1) {
            const segmentPart = parts[1];
            const xCount = (segmentPart.match(/x/g) || []).length;
            if (xCount >= 3) {
                count4++;
            } else if (xCount === 1) {
                count2++;
            }
        }
    });
    
    if (count4 > count2) {
        detectedSegmentCount = 4;
    } else {
        detectedSegmentCount = 2;
    }
    console.log(`Detected F2Pool format: ${detectedSegmentCount}-segment (4-seg: ${count4}, 2-seg: ${count2})`);
}

function matchData() {
    if (f2poolData.length === 0 || machinelistData.length === 0) {
        showMessage('❌ Please upload both F2Pool and Machinelist files', 'error');
        return;
    }

    detectF2PoolSegmentCount();

    console.log('=== STARTING VERIFICATION ===');
    console.log('F2Pool workers available:', f2poolData.length);
    console.log('Machinelist machines (PATOKAN):', machinelistData.length);

    matchedResults = [];

    // Build F2Pool lookup map for faster search
    const f2poolMap = {};
    f2poolData.forEach(worker => {
        const workerName = worker['Worker'];
        if (workerName) {
            f2poolMap[workerName.toLowerCase()] = worker;
        }
    });

    console.log('F2Pool map keys:', Object.keys(f2poolMap).slice(0, 5));

    // For each machine in Machinelist (PATOKAN)
    machinelistData.forEach((machine, machIdx) => {
        const locationId = machine['location_id'] || '';
        const serial = machine['serial_number'] || '';

        if (!locationId) {
            console.log(`[${machIdx}] Skipped: missing location_id`);
            return;
        }

        // Parse location_id: GBE.B1.A.2.2
        const locParts = locationId.split('.');
        if (locParts.length < 5) {
            console.log(`[${machIdx}] Skipped: invalid location_id format: ${locationId}`);
            return;
        }

        const storeroom = locParts[1]; // B1
        const rackLetter = locParts[2]; // A
        const row = locParts[3]; // 2
        const unit = locParts[4]; // 2

        const possibleFormats = buildPossibleWorkerFormats(locationId, storeroom, rackLetter, row, unit);

        console.log(`[${machIdx}] Location: ${locationId} | Searching variants:`, possibleFormats);

        // Search in F2Pool across all possible formats and pick the best status
        let bestWorker = null;
        let matchedWorkerName = possibleFormats[0]; // fallback default
        
        const statusPriority = {
            'Online': 3,
            'Offline': 2,
            'Dead': 1
        };

        for (const format of possibleFormats) {
            const worker = f2poolMap[format.toLowerCase()];
            if (worker) {
                if (!bestWorker) {
                    bestWorker = worker;
                    matchedWorkerName = format;
                } else {
                    const currentStatus = worker['Miner Status'] || 'Unknown';
                    const bestStatus = bestWorker['Miner Status'] || 'Unknown';
                    if ((statusPriority[currentStatus] || 0) > (statusPriority[bestStatus] || 0)) {
                        bestWorker = worker;
                        matchedWorkerName = format;
                    }
                }
            }
        }
        
        let f2poolWorker = bestWorker;

        if (f2poolWorker) {
            const status = f2poolWorker['Miner Status'] || 'Unknown';
            console.log(`✅ FOUND in F2Pool: ${matchedWorkerName} | Status: ${status}`);

            matchedResults.push({
                locationId: locationId,
                worker: matchedWorkerName,
                storeroom: storeroom,
                rack: rackLetter,
                row: row,
                unit: unit,
                status: status,
                machineSerial: serial,
                found: true,
                priority: status === 'Dead'
            });
        } else {
            console.log(`❌ NOT FOUND in F2Pool`);

            matchedResults.push({
                locationId: locationId,
                worker: matchedWorkerName + ' (NOT FOUND)',
                storeroom: storeroom,
                rack: rackLetter,
                row: row,
                unit: unit,
                status: 'NOT FOUND',
                machineSerial: serial,
                found: false,
                priority: true
            });
        }
    });

    console.log(`\n=== VERIFICATION COMPLETE ===`);
    console.log(`Total Machines Checked: ${matchedResults.length}`);
    console.log(`Found in F2Pool: ${matchedResults.filter(r => r.found).length}`);
    console.log(`Missing from F2Pool: ${matchedResults.filter(r => !r.found).length}`);

    if (matchedResults.length === 0) {
        showMessage('⚠️ No data to verify', 'error');
        document.getElementById('resultsSection').style.display = 'none';
        return;
    }

    // Sort by priority (NOT FOUND and Dead first)
    matchedResults.sort((a, b) => {
        if (a.priority && !b.priority) return -1;
        if (!a.priority && b.priority) return 1;
        return 0;
    });

    showMessage(`✅ Verified ${matchedResults.length} machines`, 'success');
    displayResults();
}

// ===== DISPLAY & FILTERING =====
function displayResults() {
    const resultsSection = document.getElementById('resultsSection');
    const statsDiv = document.getElementById('stats');
    const filterSection = document.getElementById('filterSection');

    // Calculate stats
    const stats = {
        total: matchedResults.length,
        online: matchedResults.filter(r => r.found && r.status === 'Online').length,
        offline: matchedResults.filter(r => r.found && r.status === 'Offline').length,
        dead: matchedResults.filter(r => r.found && r.status === 'Dead').length,
        missing: matchedResults.filter(r => !r.found).length
    };

    // Display stats
    statsDiv.innerHTML = `
        <div class="stat-card">
            <h4>Total</h4>
            <div class="value">${stats.total}</div>
        </div>
        <div class="stat-card online">
            <h4>Online</h4>
            <div class="value">${stats.online}</div>
        </div>
        <div class="stat-card offline">
            <h4>Offline</h4>
            <div class="value">${stats.offline}</div>
        </div>
        <div class="stat-card dead">
            <h4>Dead</h4>
            <div class="value">${stats.dead}</div>
        </div>
        <div class="stat-card" style="border-left-color: #dc3545;">
            <h4>Missing</h4>
            <div class="value" style="color: #dc3545;">${stats.missing}</div>
        </div>
    `;

    // Display filter buttons
    filterSection.innerHTML = `
        <button class="btn-filter active" data-filter="all">All (${stats.total})</button>
        <button class="btn-filter" data-filter="online">Online (${stats.online})</button>
        <button class="btn-filter" data-filter="offline">Offline (${stats.offline})</button>
        <button class="btn-filter" data-filter="dead">Dead (${stats.dead})</button>
        <button class="btn-filter" data-filter="missing">Missing (${stats.missing})</button>
    `;

    filterSection.querySelectorAll('.btn-filter').forEach(btn => {
        btn.addEventListener('click', function () {
            filterSection.querySelectorAll('.btn-filter').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentFilter = this.dataset.filter;
            filterAndDisplayResults();
        });
    });

    currentFilter = 'all';
    resetSort(); // added: start each verification from default priority order
    filterAndDisplayResults();
    resultsSection.style.display = 'block';
}

// ===== SORTING (added: sort A-Z feature) =====
// 3-state cycle per column: null (default priority order) -> 'asc' (A-Z) -> 'desc' (Z-A) -> null
function handleSortClick(column) {
    const isSameColumn = currentSort.column === column;

    let nextColumn, nextDirection;
    if (!isSameColumn || currentSort.direction === null) {
        // null/other column -> A-Z
        nextColumn = column;
        nextDirection = 'asc';
    } else if (currentSort.direction === 'asc') {
        // A-Z -> Z-A
        nextColumn = column;
        nextDirection = 'desc';
    } else {
        // Z-A -> back to default priority order
        nextColumn = null;
        nextDirection = null;
    }

    currentSort = { column: nextColumn, direction: nextDirection };
    updateSortIndicators();
    filterAndDisplayResults();
}

// Get the comparison value for a result row given the target column.
// Matches what is visually displayed in each column.
function getSortValue(result, column) {
    if (column === 'locationId') {
        return result.locationId || '';
    }
    if (column === 'worker') {
        // Use the segment shown in the table (part after first dot)
        const worker = result.worker || '';
        const parts = worker.split('.');
        return parts.length > 1 ? parts[1] : worker;
    }
    return '';
}

// Returns a sorted copy (original array is never mutated, preserving the
// priority sort done in matchData()).
function applySorting(rows) {
    if (currentSort.column === null || currentSort.direction === null) {
        return rows; // default priority order (unchanged behavior)
    }
    const dir = currentSort.direction === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => {
        const va = getSortValue(a, currentSort.column);
        const vb = getSortValue(b, currentSort.column);
        return va.localeCompare(vb, undefined, { numeric: true, sensitivity: 'base' }) * dir;
    });
}

function updateSortIndicators() {
    document.querySelectorAll('th.sortable').forEach(th => {
        const indicator = th.querySelector('.sort-indicator');
        th.classList.remove('active');
        if (indicator) indicator.textContent = '';

        if (th.dataset.column === currentSort.column && currentSort.direction) {
            th.classList.add('active');
            if (indicator) indicator.textContent = currentSort.direction === 'asc' ? '↑' : '↓';
        }
    });
}

function resetSort() {
    currentSort = { column: null, direction: null };
    updateSortIndicators();
}

function filterAndDisplayResults() {
    const resultsBody = document.getElementById('resultsBody');
    const noData = document.getElementById('noData');
    const resultsTable = document.getElementById('resultsTable');

    let filtered = matchedResults;
    if (currentFilter === 'all') {
        // All
    } else if (currentFilter === 'online') {
        filtered = matchedResults.filter(r => r.status === 'Online');
    } else if (currentFilter === 'offline') {
        filtered = matchedResults.filter(r => r.status === 'Offline');
    } else if (currentFilter === 'dead') {
        filtered = matchedResults.filter(r => r.status === 'Dead');
    } else if (currentFilter === 'missing') {
        filtered = matchedResults.filter(r => !r.found);
    }

    // added: apply A-Z/Z-A sort on top of the active filter (ignores priority order when active)
    filtered = applySorting(filtered);

    resultsBody.innerHTML = '';

    if (filtered.length === 0) {
        resultsTable.style.display = 'none';
        noData.style.display = 'block';
        return;
    }

    resultsTable.style.display = 'table';
    noData.style.display = 'none';

    filtered.forEach(result => {
        const row = resultsBody.insertRow();
        if (result.priority) {
            row.classList.add('priority');
        }

        let statusClass = result.status.toLowerCase().replace(' ', '-');
        let statusBadge = `<span class="status-badge status-${statusClass}">${result.status}</span>`;
        let priorityBadge = '';

        if (!result.found) {
            statusBadge = `<span class="status-badge" style="background: #f8d7da; color: #721c24;">NOT FOUND</span>`;
            priorityBadge = '<span class="priority-badge">🔴 MISSING</span>';
        } else if (result.priority) {
            priorityBadge = '<span class="priority-badge">🔴 DEAD</span>';
        }

        let displayWorker = result.worker;
        const parts = displayWorker.split('.');
        if (parts.length > 1) {
            displayWorker = parts[1];
        }

        row.innerHTML = `
            <td>${result.locationId}</td>
            <td><strong>${displayWorker}</strong></td>
            <td>${statusBadge} ${priorityBadge}</td>
        `;
    });
}

// ===== UTILITY FUNCTIONS =====
function updateMatchButton() {
    const matchBtn = document.getElementById('matchBtn');
    const f2poolFile = document.getElementById('f2poolFile').files.length > 0;
    const machinelistFile = document.getElementById('machinelistFile').files.length > 0;
    matchBtn.disabled = !(f2poolFile && machinelistFile);
}

function showMessage(msg, type) {
    const messageDiv = document.getElementById('message');
    messageDiv.textContent = msg;
    messageDiv.className = `message ${type} show`;
    setTimeout(() => {
        messageDiv.classList.remove('show');
    }, 5000);
}

function handleClear() {
    document.getElementById('f2poolFile').value = '';
    document.getElementById('machinelistFile').value = '';
    document.getElementById('f2poolName').textContent = 'No file selected';
    document.getElementById('machinelistName').textContent = 'No file selected';
    document.getElementById('resultsSection').style.display = 'none';
    f2poolData = [];
    machinelistData = [];
    matchedResults = [];
    resetSort(); // added: clear sort state on reset
    // added: reset Auto Grab state on reset
    document.getElementById('dcSelect').value = '';
    document.getElementById('dcDownloadBtn').disabled = true;
    document.getElementById('dcStatus').textContent = 'Belum ada download';
    document.getElementById('dcStatus').className = 'dc-status';
    updateMatchButton();
    showMessage('🔄 All data cleared', 'success');
}
