let masterData = {};
let locationToIpMap = {};
let minerPlusIPs = [];
let machineListEntries = [];
let machineListIPs = [];
let validationResults = [];
let currentFilter = 'all';

document.addEventListener('DOMContentLoaded', function() {
    if (typeof window.masterData !== 'undefined') {
        masterData = window.masterData;
        document.getElementById('masterDataStatus').textContent = 
            `Loaded ${Object.keys(masterData).length} records`;
        document.getElementById('masterDataStatus').style.color = 'green';
        
        // Build reverse mapping (location_id -> IP)
        locationToIpMap = {};
        Object.entries(masterData).forEach(([ip, loc]) => {
            if (ip && loc) {
                locationToIpMap[loc.trim()] = ip.trim();
            }
        });
    } else {
        document.getElementById('masterDataStatus').textContent = 
            'Error: Master data not found';
        document.getElementById('masterDataStatus').style.color = 'red';
    }
    
    setupFilterButtons();

    // Check for exported IPs from offline-analyzer
    const exportedIPs = sessionStorage.getItem('exportedOfflineIPs');
    if (exportedIPs) {
        const manualInput = document.getElementById('manualIpInput');
        if (manualInput) {
            manualInput.value = exportedIPs;
        }
        // Clean up so it doesn't persist
        sessionStorage.removeItem('exportedOfflineIPs');
    }
});

// Helper to show file upload success or error messages
function showFileFeedback(elementId, text, isSuccess) {
    const errorDiv = document.getElementById(elementId);
    if (!errorDiv) return;
    errorDiv.textContent = text;
    errorDiv.style.color = isSuccess ? '#28a745' : '#dc3545';
}

// Extract column values matching a list of possible headers
function extractColumnData(sheetData, possibleHeaders) {
    if (!sheetData || sheetData.length === 0) return null;
    
    const firstRow = sheetData[0];
    let actualKey = null;
    
    for (const key of Object.keys(firstRow)) {
        const normalizedKey = key.trim().toLowerCase().replace(/[\s_-]+/g, '');
        const matched = possibleHeaders.some(h => {
            const normalizedH = h.toLowerCase().replace(/[\s_-]+/g, '');
            return normalizedKey === normalizedH;
        });
        if (matched) {
            actualKey = key;
            break;
        }
    }
    
    if (!actualKey) return null;
    
    return sheetData
        .map(row => (row[actualKey] ? String(row[actualKey]).trim() : ''))
        .filter(val => val !== '');
}

// Handle MinerPlus File Upload
document.getElementById('minerPlusFile').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet);
            
            const ips = extractColumnData(jsonData, ['IP', 'ip_address', 'IP Address']);
            if (ips === null) {
                showFileFeedback('minerPlusFileError', 'Gagal: Kolom "IP" tidak ditemukan di file MinerPlus!', false);
                minerPlusIPs = [];
                return;
            }
            
            minerPlusIPs = ips;
            showFileFeedback('minerPlusFileError', `Sukses: Berhasil memuat ${minerPlusIPs.length} IP dari file MinerPlus.`, true);
        } catch (err) {
            showFileFeedback('minerPlusFileError', 'Error membaca file: ' + err.message, false);
            minerPlusIPs = [];
        }
    };
    reader.readAsArrayBuffer(file);
});

// Handle Machine List File Upload
document.getElementById('machineListFile').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet);
            
            const locations = extractColumnData(jsonData, ['location_id', 'location id', 'location']);
            if (locations === null) {
                showFileFeedback('machineListFileError', 'Gagal: Kolom "location_id" tidak ditemukan di file Machine List!', false);
                machineListEntries = [];
                machineListIPs = [];
                return;
            }
            
            machineListEntries = [];
            machineListIPs = [];
            
            locations.forEach(loc => {
                const ip = locationToIpMap[loc] || null;
                machineListEntries.push({ locationId: loc, ip: ip });
                if (ip) {
                    machineListIPs.push(ip);
                }
            });
            
            showFileFeedback('machineListFileError', `Sukses: Berhasil memuat ${machineListEntries.length} lokasi dari file Machine List.`, true);
        } catch (err) {
            showFileFeedback('machineListFileError', 'Error membaca file: ' + err.message, false);
            machineListEntries = [];
            machineListIPs = [];
        }
    };
    reader.readAsArrayBuffer(file);
});

function setupFilterButtons() {
    document.getElementById('filterAll').addEventListener('click', function() {
        setFilter('all');
    });
    document.getElementById('filterTrue').addEventListener('click', function() {
        setFilter('true');
    });
    document.getElementById('filterFalse').addEventListener('click', function() {
        setFilter('false');
    });
}

function setFilter(filter) {
    currentFilter = filter;
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    let btnId = 'filterAll';
    if (filter === 'true') btnId = 'filterTrue';
    else if (filter === 'false') btnId = 'filterFalse';
    
    document.getElementById(btnId).classList.add('active');
    displayResults();
}

function displayResults() {
    let detailedHTML = '<table class="result-table">';
    detailedHTML += '<tr><th>IP Address</th><th>Location ID</th><th>MinerPlus</th><th>Machine List</th><th>Status</th></tr>';
    
    let trueCount = 0;
    let falseCount = 0;
    let displayedCount = 0;
    
    validationResults.forEach(result => {
        if (result.isValid) {
            trueCount++;
        } else {
            falseCount++;
        }
        
        if (currentFilter === 'all' || 
            (currentFilter === 'true' && result.isValid) ||
            (currentFilter === 'false' && !result.isValid)) {
            
            detailedHTML += `<tr class="${result.isValid ? 'status-true' : 'status-false'}">`;
            detailedHTML += `<td><strong>${result.ip}</strong></td>`;
            detailedHTML += `<td>${result.locationId}</td>`;
            detailedHTML += `<td class="${result.inMinerPlus ? 'status-ada' : 'status-tidak-ada'}">${result.inMinerPlus ? 'ADA' : 'TIDAK ADA'}</td>`;
            detailedHTML += `<td class="${result.inMachineList ? 'status-ada' : 'status-tidak-ada'}">${result.inMachineList ? 'ADA' : 'TIDAK ADA'}</td>`;
            detailedHTML += `<td><strong>${result.isValid ? 'TRUE' : 'FALSE'}</strong></td>`;
            detailedHTML += '</tr>';
            displayedCount++;
        }
    });
    
    detailedHTML += '</table>';
    
    if (validationResults.length === 0) {
        document.getElementById('detailedResults').innerHTML = `
            <div style="padding: 20px; text-align: center; color: #28a745; font-weight: bold; border: 1px solid #c3e6cb; background-color: #d4edda; border-radius: 8px;">
                <i class="fas fa-check-circle"></i> Tidak ada data untuk dibandingkan.
            </div>
        `;
    } else if (displayedCount === 0) {
        document.getElementById('detailedResults').innerHTML = `
            <div style="padding: 20px; text-align: center; color: #856404; font-weight: bold; border: 1px solid #ffeaa7; background-color: #fff3cd; border-radius: 8px;">
                <i class="fas fa-info-circle"></i> Tidak ada data dengan status ini.
            </div>
        `;
    } else {
        document.getElementById('detailedResults').innerHTML = detailedHTML;
    }
    
    document.getElementById('summaryText').textContent = 
        `TRUE: ${trueCount}, FALSE: ${falseCount}, Total: ${validationResults.length}`;
}

document.getElementById('validateBtn').addEventListener('click', function() {
    // Reset status & error messages
    const minerPlusError = document.getElementById('minerPlusFileError');
    const machineListError = document.getElementById('machineListFileError');
    
    if (minerPlusIPs.length === 0) {
        minerPlusError.textContent = 'Silakan upload file MinerPlus terlebih dahulu!';
        minerPlusError.style.color = '#dc3545';
    }
    if (machineListEntries.length === 0) {
        machineListError.textContent = 'Silakan upload file Machine List terlebih dahulu!';
        machineListError.style.color = '#dc3545';
    }
    
    if (minerPlusIPs.length === 0 || machineListEntries.length === 0) {
        return;
    }
    
    document.getElementById('result').style.display = 'none';
    document.getElementById('outputSection').style.display = 'none';
    document.getElementById('warning').style.display = 'none';
    document.getElementById('detailedResults').innerHTML = '';
    
    // Parse manual IPs
    const manualIpInput = document.getElementById('manualIpInput').value.trim();
    const manualIps = manualIpInput.split('\n')
        .map(ip => ip.trim())
        .filter(ip => ip !== '');
        
    const manualIpSet = new Set(manualIps);
    
    validationResults = [];
    
    const minerPlusIPSet = new Set(minerPlusIPs);
    const machineListIPSet = new Set(machineListIPs);
    
    // Collect all unique non-null IPs to evaluate
    const allUniqueIps = new Set();
    minerPlusIPs.forEach(ip => allUniqueIps.add(ip));
    machineListIPs.forEach(ip => allUniqueIps.add(ip));
    
    // 1. Evaluate all valid mapped IPs
    allUniqueIps.forEach(ip => {
        if (!manualIpSet.has(ip)) {
            const inMinerPlus = minerPlusIPSet.has(ip);
            const inMachineList = machineListIPSet.has(ip);
            const isValid = inMinerPlus && inMachineList;
            
            // Find location ID
            let locationId = masterData[ip] || 'Tidak Terdaftar';
            if (locationId === 'Tidak Terdaftar') {
                const match = machineListEntries.find(e => e.ip === ip);
                if (match) {
                    locationId = match.locationId;
                }
            }
            
            validationResults.push({
                ip: ip,
                locationId: locationId,
                inMinerPlus: inMinerPlus,
                inMachineList: inMachineList,
                isValid: isValid
            });
        }
    });
    
    // 2. Evaluate locations in Machine List that do not map to any IP
    // Deduplicate Machine List entries by locationId
    const seenLocations = new Set();
    const uniqueMachineEntries = [];
    
    machineListEntries.forEach(entry => {
        if (!seenLocations.has(entry.locationId)) {
            seenLocations.add(entry.locationId);
            uniqueMachineEntries.push(entry);
        }
    });
    
    uniqueMachineEntries.forEach(entry => {
        if (entry.ip === null) {
            // Since it has no IP, it is not in manualIpSet (which stores IPs)
            // It is missing from MinerPlus (since MinerPlus only has IPs)
            validationResults.push({
                ip: 'Tidak Terdaftar di Master Data',
                locationId: entry.locationId,
                inMinerPlus: false,
                inMachineList: true,
                isValid: false
            });
        }
    });
    
    // Tampilkan hasil
    const hasDiscrepancy = validationResults.some(r => !r.isValid);
    const resultDiv = document.getElementById('result');
    resultDiv.textContent = `Hasil Perbandingan: ${hasDiscrepancy ? 'DITEMUKAN SELISIH (FALSE)' : 'SINKRON (TRUE)'}`;
    resultDiv.className = `result ${hasDiscrepancy ? 'false' : 'true'}`;
    resultDiv.style.display = 'block';
    
    document.getElementById('outputSection').style.display = 'block';
    displayResults();
});
