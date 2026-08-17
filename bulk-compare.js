// ===== BULK COMPARE - Multi-DC F2Pool vs Machinelist =====
// Logika matching (unit conversion, prefix variations, IP lookup) diadaptasi
// dari data-matcher.js agar halaman ini berdiri sendiri tanpa menyentuh
// event listener single-DC di data-matcher.js.

// ===== DATA VARIABLES =====
let f2poolData = [];          // gabungan semua CSV F2Pool
let machinelistData = [];     // 1 file machinelist (bisa multi-DC)
let matchedResults = [];
let currentFilter = 'all';
let detectedSegmentCount = 2;
let currentSort = { column: null, direction: null }; // sort A-Z feature (null = default priority order)

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('f2poolFiles').addEventListener('change', handleF2PoolFilesChange);
    document.getElementById('machinelistFile').addEventListener('change', handleMachinelistFileChange);
    document.getElementById('matchBtn').addEventListener('click', matchData);
    document.getElementById('clearBtn').addEventListener('click', handleClear);

    // sortable header listeners
    document.querySelectorAll('th.sortable').forEach(th => {
        th.addEventListener('click', function () {
            handleSortClick(this.dataset.column);
        });
    });

    // Multi-DC checkbox grid
    populateDCCheckboxGrid();
    document.getElementById('dcSearch').addEventListener('input', handleDcSearch);
    document.getElementById('dcDownloadBtn').addEventListener('click', handleBulkDownload);

    // group buttons (All / A / B / C / D / E / F / Bersihkan)
    document.querySelectorAll('.btn-group').forEach(btn => {
        btn.addEventListener('click', function () {
            handleGroupSelect(this.dataset.group);
        });
    });
});

// ===== DC CHECKBOX GRID =====
function populateDCCheckboxGrid() {
    const grid = document.getElementById('dcCheckboxGrid');
    if (!grid || !window.f2poolDCLinks) return;

    window.f2poolDCLinks.forEach(entry => {
        const label = document.createElement('label');
        label.className = 'dc-checkbox-item';
        label.dataset.dc = entry.dc;
        label.dataset.user = entry.user;

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.value = entry.user;
        checkbox.dataset.dc = entry.dc;

        const textSpan = document.createElement('span');
        textSpan.className = 'dc-label';
        textSpan.textContent = entry.dc;

        checkbox.addEventListener('change', updateSelectedCount);

        label.appendChild(checkbox);
        label.appendChild(textSpan);
        grid.appendChild(label);
    });
}

// Toggle .checked class saat checkbox berubah (untuk styling label)
function updateSelectedCount() {
    const checkboxes = document.querySelectorAll('#dcCheckboxGrid input[type="checkbox"]');
    let count = 0;
    checkboxes.forEach(cb => {
        const item = cb.closest('.dc-checkbox-item');
        if (cb.checked) {
            count++;
            item.classList.add('checked');
        } else {
            item.classList.remove('checked');
        }
    });

    document.getElementById('dcSelectedCount').innerHTML =
        `<strong>${count}</strong> DC dipilih`;
    document.getElementById('dcDownloadBtn').disabled = count === 0;
}

// Search filter untuk grid
function handleDcSearch(e) {
    const term = e.target.value.toLowerCase().trim();
    document.querySelectorAll('#dcCheckboxGrid .dc-checkbox-item').forEach(item => {
        const dcName = item.dataset.dc.toLowerCase();
        item.style.display = dcName.includes(term) ? '' : 'none';
    });
}

// Group select: All = pilih semua, A/B/C/D/E/F = filter prefix, '' = bersihkan
function handleGroupSelect(group) {
    const checkboxes = document.querySelectorAll('#dcCheckboxGrid input[type="checkbox"]');
    checkboxes.forEach(cb => {
        const item = cb.closest('.dc-checkbox-item');
        // Hanya proses DC yang terlihat (tidak tersembunyi oleh search)
        if (item.style.display === 'none') return;

        if (group === 'all') {
            cb.checked = true;
        } else if (group === '') {
            cb.checked = false;
        } else {
            // Filter: "DC A1" -> match prefix "DC A"
            const dcName = cb.dataset.dc;
            cb.checked = dcName.startsWith('DC ' + group);
        }
    });
    updateSelectedCount();
}

// ===== BULK DOWNLOAD (multi-DC berurutan dengan delay) =====
function handleBulkDownload() {
    const selected = Array.from(
        document.querySelectorAll('#dcCheckboxGrid input[type="checkbox"]:checked')
    ).map(cb => ({ dc: cb.dataset.dc, user: cb.value }));

    if (selected.length === 0) return;

    if (!window.f2poolBaseUrl || !window.f2poolExportParams) {
        showMessage('❌ Konfigurasi URL F2Pool tidak ditemukan', 'error');
        return;
    }

    const downloadBtn = document.getElementById('dcDownloadBtn');
    const progressWrapper = document.getElementById('dcProgressWrapper');
    const progressFill = document.getElementById('dcProgressFill');
    const progressText = document.getElementById('dcProgressText');

    downloadBtn.disabled = true;
    progressWrapper.style.display = 'flex';
    showMessage(`⬇️ Memulai download ${selected.length} DC...`, 'success');

    // Trigger download native via hidden iframe (Content-Disposition: attachment
    // -> file langsung tersimpan, tidak buka tab baru -> aman dari popup blocker).
    // Delay 600ms antar DC untuk menghindari rate-limit Cloudflare.
    const DELAY_MS = 600;
    let i = 0;

    function downloadNext() {
        if (i >= selected.length) {
            // selesai
            progressFill.style.width = '100%';
            progressText.textContent = `${selected.length} / ${selected.length} ✓`;
            downloadBtn.disabled = false;
            showMessage(
                `✅ Download ${selected.length} DC selesai! Periksa folder Downloads, ` +
                `lalu upload semua file CSV via "Pilih Beberapa File CSV" di Step 2.`,
                'success'
            );
            return;
        }

        const { dc, user } = selected[i];
        const url = window.f2poolBaseUrl + '?user_name=' + user + window.f2poolExportParams;

        // hidden iframe: trigger download tanpa navigasi
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframe.src = url;
        document.body.appendChild(iframe);

        // cleanup iframe setelah beberapa detik
        setTimeout(() => iframe.remove(), 5000);

        i++;
        const pct = Math.round((i / selected.length) * 100);
        progressFill.style.width = pct + '%';
        progressText.textContent = `${i} / ${selected.length}`;

        // lanjut ke DC berikutnya setelah delay
        setTimeout(downloadNext, DELAY_MS);
    }

    downloadNext();
}

// ===== FILE INPUT HANDLERS =====
function handleF2PoolFilesChange(e) {
    const files = Array.from(e.target.files).filter(f => f.name.toLowerCase().endsWith('.csv'));
    if (files.length === 0) {
        document.getElementById('f2poolName').textContent = 'Belum ada file dipilih';
        f2poolData = [];
        updateMatchButton();
        return;
    }

    document.getElementById('f2poolName').textContent =
        `✅ ${files.length} file dipilih (menggabungkan...)`;
    parseMultipleF2PoolFiles(files);
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

// ===== FILE PARSING =====
// Parse multiple CSV F2Pool lalu merge jadi satu array f2poolData.
function parseMultipleF2PoolFiles(files) {
    f2poolData = [];
    let processed = 0;
    let totalWorkers = 0;

    files.forEach(file => {
        const reader = new FileReader();
        reader.onload = function (e) {
            try {
                const csv = e.target.result;

                // Sanity check: file harus berupa CSV, bukan halaman HTML (login redirect).
                const firstLine = csv.split('\n')[0] || '';
                if (firstLine.toLowerCase().includes('<!doctype') ||
                    firstLine.toLowerCase().includes('<html')) {
                    console.warn(`File "${file.name}" terlihat seperti HTML, bukan CSV. Dilewati.`);
                    processed++;
                    finishMerge();
                    return;
                }

                const lines = csv.split('\n');
                const headers = lines[0].split(',').map(h => h.trim());

                for (let i = 1; i < lines.length; i++) {
                    if (!lines[i].trim()) continue;
                    const values = lines[i].split(',').map(v => v.trim());
                    const row = {};
                    headers.forEach((h, idx) => {
                        row[h] = values[idx] || '';
                    });
                    f2poolData.push(row);
                }

                totalWorkers += lines.length - 1; // perkiraan
            } catch (error) {
                console.error(`Error parsing "${file.name}":`, error);
            }

            processed++;
            finishMerge();
        };
        reader.readAsText(file);
    });

    function finishMerge() {
        if (processed < files.length) return; // tunggu semua file selesai
        document.getElementById('f2poolName').textContent =
            `✅ ${files.length} file -> ${f2poolData.length} workers tergabung`;
        showMessage(`✅ Loaded ${f2poolData.length} F2Pool workers dari ${files.length} file`, 'success');
        updateMatchButton();
    }
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
            machinelistData = XLSX.utils.sheet_to_json(worksheet);
            showMessage(`✅ Loaded ${machinelistData.length} machines from Machinelist`, 'success');
        } catch (error) {
            showMessage('❌ Error parsing Excel file. Error: ' + error.message, 'error');
        }
    };
    reader.readAsArrayBuffer(file);
}

// ===== UNIT CONVERSION LOGIC (diadaptasi dari data-matcher.js) =====
function rackLetterToNumber(letter) {
    if (!letter || letter.length === 0) return null;
    return letter.charCodeAt(0) - 64;
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
        if (!window.locationToIpMap) {
            window.locationToIpMap = {};
            for (const [ip, loc] of Object.entries(window.masterData)) {
                window.locationToIpMap[loc.toLowerCase()] = ip;
            }
        }

        const ip = window.locationToIpMap[locationId.toLowerCase()];
        if (ip) {
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
    console.log(`Detected F2Pool format: ${detectedSegmentCount}-segment`);
}

// Infer DC label dari worker name (e.g., "gbeabe4a.xxx" -> DC E4A)
// dengan membandingkan prefix user dari f2poolDCLinks.
function inferDCFromWorker(workerName) {
    if (!workerName) return '-';
    const prefix = workerName.split('.')[0].toLowerCase();
    if (!window.f2poolDCLinks) return prefix;

    // cari entry yang user-nya cocok dengan prefix worker
    const match = window.f2poolDCLinks.find(entry =>
        entry.user.toLowerCase() === prefix
    );
    return match ? match.dc : prefix.toUpperCase();
}

function matchData() {
    if (f2poolData.length === 0 || machinelistData.length === 0) {
        showMessage('❌ Upload minimal 1 file F2Pool dan 1 file Machinelist', 'error');
        return;
    }

    detectF2PoolSegmentCount();

    console.log('=== STARTING BULK VERIFICATION ===');
    console.log('F2Pool workers (merged):', f2poolData.length);
    console.log('Machinelist machines:', machinelistData.length);

    matchedResults = [];

    // Build F2Pool lookup map
    const f2poolMap = {};
    f2poolData.forEach(worker => {
        const workerName = worker['Worker'];
        if (workerName) {
            f2poolMap[workerName.toLowerCase()] = worker;
        }
    });

    const statusPriority = {
        'Online': 3,
        'Offline': 2,
        'Dead': 1
    };

    // For each machine in Machinelist
    machinelistData.forEach((machine, machIdx) => {
        const locationId = machine['location_id'] || '';
        const serial = machine['serial_number'] || '';

        if (!locationId) return;

        // Parse location_id: GBE.B1.A.2.2
        const locParts = locationId.split('.');
        if (locParts.length < 5) return;

        const storeroom = locParts[1]; // B1
        const rackLetter = locParts[2]; // A
        const row = locParts[3]; // 2
        const unit = locParts[4]; // 2

        const possibleFormats = buildPossibleWorkerFormats(locationId, storeroom, rackLetter, row, unit);

        let bestWorker = null;
        let matchedWorkerName = possibleFormats[0];

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

        if (bestWorker) {
            const status = bestWorker['Miner Status'] || 'Unknown';
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
                priority: status === 'Dead',
                dc: inferDCFromWorker(matchedWorkerName)
            });
        } else {
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
                priority: true,
                // DC infer dari location_id (storeroom) sebagai fallback
                dc: inferDCFromLocation(storeroom)
            });
        }
    });

    console.log(`=== BULK VERIFICATION COMPLETE ===`);
    console.log(`Total Checked: ${matchedResults.length}`);
    console.log(`Found: ${matchedResults.filter(r => r.found).length}`);
    console.log(`Missing: ${matchedResults.filter(r => !r.found).length}`);

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

    showMessage(`✅ Verified ${matchedResults.length} machines (multi-DC)`, 'success');
    displayResults();
}

// Infer DC dari storeroom location_id sebagai fallback untuk NOT FOUND.
// e.g., storeroom "B1" -> cari entry yang user mengandung "b1"
function inferDCFromLocation(storeroom) {
    if (!storeroom || !window.f2poolDCLinks) return '-';
    const key = storeroom.toLowerCase();
    const match = window.f2poolDCLinks.find(entry =>
        entry.user.toLowerCase().includes(key)
    );
    return match ? match.dc : '-';
}

// ===== DISPLAY & FILTERING =====
function displayResults() {
    const resultsSection = document.getElementById('resultsSection');
    const statsDiv = document.getElementById('stats');
    const filterSection = document.getElementById('filterSection');
    const dcSummarySection = document.getElementById('dcSummarySection');
    const dcSummaryGrid = document.getElementById('dcSummaryGrid');

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

    // Display per-DC summary
    const dcGroups = {};
    matchedResults.forEach(r => {
        if (!dcGroups[r.dc]) {
            dcGroups[r.dc] = { total: 0, online: 0, offline: 0, dead: 0, missing: 0 };
        }
        dcGroups[r.dc].total++;
        if (!r.found) {
            dcGroups[r.dc].missing++;
        } else if (r.status === 'Online') {
            dcGroups[r.dc].online++;
        } else if (r.status === 'Offline') {
            dcGroups[r.dc].offline++;
        } else if (r.status === 'Dead') {
            dcGroups[r.dc].dead++;
        }
    });

    dcSummaryGrid.innerHTML = Object.keys(dcGroups).sort().map(dc => {
        const g = dcGroups[dc];
        const hasIssue = (g.dead + g.missing) > 0;
        return `
            <div class="dc-summary-card ${hasIssue ? 'has-issue' : ''}">
                <div class="dc-name">${dc}</div>
                <div class="dc-line"><span>Total</span><strong>${g.total}</strong></div>
                <div class="dc-line"><span class="ok">Online</span><strong class="ok">${g.online}</strong></div>
                <div class="dc-line"><span class="warn">Offline</span><strong class="warn">${g.offline}</strong></div>
                <div class="dc-line"><span class="bad">Dead</span><strong class="bad">${g.dead}</strong></div>
                <div class="dc-line"><span class="bad">Missing</span><strong class="bad">${g.missing}</strong></div>
            </div>
        `;
    }).join('');
    dcSummarySection.style.display = 'block';

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
    resetSort();
    filterAndDisplayResults();
    resultsSection.style.display = 'block';
}

// ===== SORTING (sort A-Z feature, 3-state cycle) =====
function handleSortClick(column) {
    const isSameColumn = currentSort.column === column;

    let nextColumn, nextDirection;
    if (!isSameColumn || currentSort.direction === null) {
        nextColumn = column;
        nextDirection = 'asc';
    } else if (currentSort.direction === 'asc') {
        nextColumn = column;
        nextDirection = 'desc';
    } else {
        nextColumn = null;
        nextDirection = null;
    }

    currentSort = { column: nextColumn, direction: nextDirection };
    updateSortIndicators();
    filterAndDisplayResults();
}

function getSortValue(result, column) {
    if (column === 'dc') {
        return result.dc || '';
    }
    if (column === 'ip') {
        return result.ip || '';
    }
    return '';
}

function applySorting(rows) {
    if (currentSort.column === null || currentSort.direction === null) {
        return rows;
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
    if (currentFilter === 'online') {
        filtered = matchedResults.filter(r => r.status === 'Online');
    } else if (currentFilter === 'offline') {
        filtered = matchedResults.filter(r => r.status === 'Offline');
    } else if (currentFilter === 'dead') {
        filtered = matchedResults.filter(r => r.status === 'Dead');
    } else if (currentFilter === 'missing') {
        filtered = matchedResults.filter(r => !r.found);
    }

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

        // Lookup IP dari master data berdasarkan locationId
        const ip = (window.locationToIpMap && result.locationId)
            ? (window.locationToIpMap[result.locationId.toLowerCase()] || '-')
            : '-';

        row.innerHTML = `
            <td><strong>${result.dc}</strong></td>
            <td>${ip}</td>
        `;
    });
}

// ===== UTILITY FUNCTIONS =====
function updateMatchButton() {
    const matchBtn = document.getElementById('matchBtn');
    const f2poolFiles = document.getElementById('f2poolFiles').files.length > 0;
    const machinelistFile = document.getElementById('machinelistFile').files.length > 0;
    matchBtn.disabled = !(f2poolFiles && machinelistFile);
}

function showMessage(msg, type) {
    const messageDiv = document.getElementById('message');
    messageDiv.textContent = msg;
    messageDiv.className = `message ${type} show`;
    setTimeout(() => {
        messageDiv.classList.remove('show');
    }, 6000);
}

function handleClear() {
    document.getElementById('f2poolFiles').value = '';
    document.getElementById('machinelistFile').value = '';
    document.getElementById('f2poolName').textContent = 'Belum ada file dipilih';
    document.getElementById('machinelistName').textContent = 'No file selected';
    document.getElementById('resultsSection').style.display = 'none';

    // reset DC selection
    document.querySelectorAll('#dcCheckboxGrid input[type="checkbox"]').forEach(cb => {
        cb.checked = false;
    });
    updateSelectedCount();
    document.getElementById('dcProgressWrapper').style.display = 'none';
    document.getElementById('dcProgressFill').style.width = '0%';

    f2poolData = [];
    machinelistData = [];
    matchedResults = [];
    resetSort();
    updateMatchButton();
    showMessage('🔄 All data cleared', 'success');
}
