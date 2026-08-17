// Navigation back button
document.querySelector('.back-button')?.addEventListener('click', function(e) {
    e.preventDefault();
    window.location.href = 'index.html';
});

// Event listeners
document.getElementById('excelFile')?.addEventListener('change', handleFile, false);
document.getElementById('offlineIpInput')?.addEventListener('input', function() {
    if (excelActiveIPs.size > 0 || uploadedExcelData.length > 0) {
        compareAndDisplayData();
    }
});

// Drag and drop functionality
const fileUploadArea = document.getElementById('fileUploadArea');
const fileInput = document.getElementById('excelFile');

if (fileUploadArea && fileInput) {
    fileUploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        fileUploadArea.style.borderColor = 'var(--primary)';
        fileUploadArea.style.backgroundColor = 'var(--light)';
    });

    fileUploadArea.addEventListener('dragleave', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const rect = fileUploadArea.getBoundingClientRect();
        if (e.clientX <= rect.left || e.clientX >= rect.right ||
            e.clientY <= rect.top || e.clientY >= rect.bottom) {
            fileUploadArea.style.borderColor = 'var(--gray-light)';
            fileUploadArea.style.backgroundColor = 'white';
        }
    });

    fileUploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        fileUploadArea.style.borderColor = 'var(--gray-light)';
        fileUploadArea.style.backgroundColor = 'white';
        
        if (e.dataTransfer.files.length) {
            fileInput.files = e.dataTransfer.files;
            handleFile({ target: { files: e.dataTransfer.files } });
        }
    });

    fileUploadArea.addEventListener('click', (e) => {
        fileInput.click();
    });
}

// State variables
let locationToIpMap = {};
let excelActiveIPs = new Set();
let uploadedExcelData = []; // Store raw location_ids for reprocessing if textbox changes
let currentTab = 'harus-cek';
let currentData = {
    'harus-cek': [],
    'sudah-turun': [],
    'dhcp': []
};
let selectedLines = new Set(); // Track which Line filter buttons are active

// Initialize reverse lookup from master-data.js
function initMasterData() {
    locationToIpMap = {};
    if (window.masterData) {
        Object.entries(window.masterData).forEach(([ip, loc]) => {
            if (ip && loc) {
                locationToIpMap[loc.trim()] = ip.trim();
            }
        });
        console.log('Master data loaded. Reversed map size:', Object.keys(locationToIpMap).length);
    } else {
        console.error('masterData not found. Make sure master-data.js is loaded.');
    }
}

// Run init on DOM load
document.addEventListener('DOMContentLoaded', () => {
    initMasterData();
    setupTabEventListeners();
    setupLineFilterListeners();
});

// Setup event listeners for tabs
function setupTabEventListeners() {
    const tabButtons = document.querySelectorAll('.analyzer-tabs .tab-btn');
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const selectedTab = btn.getAttribute('data-tab');
            switchTab(selectedTab);
        });
    });
}

// Switch between active tabs
function switchTab(tabId) {
    currentTab = tabId;
    
    // Update active class on tab buttons
    const tabButtons = document.querySelectorAll('.analyzer-tabs .tab-btn');
    tabButtons.forEach(btn => {
        if (btn.getAttribute('data-tab') === tabId) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    // Render content of the active tab
    renderActiveTab();
}

// Setup event listeners for line filter buttons
function setupLineFilterListeners() {
    const lineButtons = document.querySelectorAll('.line-filter-btn');
    lineButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const line = btn.getAttribute('data-line');
            if (selectedLines.has(line)) {
                selectedLines.delete(line);
                btn.classList.remove('active');
            } else {
                selectedLines.add(line);
                btn.classList.add('active');
            }
            // Re-render active tab with new filter
            renderActiveTab();
        });
    });
}

// Extract line letter from location_id (e.g. "GBE.A9" -> "A")
function extractLineLetter(locationId) {
    if (!locationId) return null;
    const match = locationId.match(/\.([A-Fa-f])/);
    return match ? match[1].toUpperCase() : null;
}

// Filter data based on selected lines
function filterBySelectedLines(data) {
    if (selectedLines.size === 0) return data; // No filter active, show all
    return data.filter(item => {
        const lineLetter = extractLineLetter(item.location);
        return lineLetter && selectedLines.has(lineLetter);
    });
}

// Handle Excel Upload
function handleFile(e) {
    const files = e.target.files;
    if (!files.length) return;
    
    const f = files[0];
    const reader = new FileReader();

    const loadingDiv = document.getElementById('loading');
    const outputDiv = document.getElementById('output');
    const controlsDiv = document.getElementById('controls');

    loadingDiv.style.display = 'block';
    outputDiv.innerHTML = '';
    controlsDiv.style.display = 'none';

    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });

            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet);

            // Clear old active set
            excelActiveIPs.clear();
            uploadedExcelData = [];

            // Extract location_ids and convert to IPs
            jsonData.forEach(row => {
                const locId = (row['location_id'] || row['Location ID'] || row['Location'] || row['Logical Zone'] || row['logical_zone'] || row['Zone'] || row['Zona Logis'] || '').trim();
                if (locId) {
                    uploadedExcelData.push(locId);
                    const mappedIp = locationToIpMap[locId];
                    if (mappedIp) {
                        excelActiveIPs.add(mappedIp);
                    }
                }
            });

            loadingDiv.style.display = 'none';
            controlsDiv.style.display = 'block';

            compareAndDisplayData();
        } catch (error) {
            loadingDiv.style.display = 'none';
            outputDiv.innerHTML = `
                <div class="empty-state" style="background: white; border-radius: var(--border-radius); box-shadow: var(--shadow);">
                    <i class="fas fa-exclamation-triangle" style="color: #ea5455;"></i>
                    <h3>Terjadi Kesalahan</h3>
                    <p>File tidak dapat diproses. Pastikan file adalah format Excel yang valid.</p>
                    <p style="font-size: 0.9rem; margin-top: 0.5rem; color: var(--gray);">Error: ${error.message}</p>
                </div>
            `;
            console.error('Error processing file:', error);
        }
    };

    reader.onerror = function() {
        loadingDiv.style.display = 'none';
        outputDiv.innerHTML = `
            <div class="empty-state" style="background: white; border-radius: var(--border-radius); box-shadow: var(--shadow);">
                <i class="fas fa-times-circle" style="color: #ea5455;"></i>
                <h3>Gagal Membaca File</h3>
                <p>Terjadi kesalahan saat membaca file. Coba lagi dengan file yang berbeda.</p>
            </div>
        `;
    };

    reader.readAsArrayBuffer(f);
}

// Compare TextBox IPs with Excel Active IPs
function compareAndDisplayData() {
    const rawInput = document.getElementById('offlineIpInput').value;
    const offlineIPs = rawInput.split('\n')
        .map(ip => ip.trim())
        .filter(ip => ip.length > 0);

    // Categories
    const harusCek = [];
    const sudahTurun = [];
    const dhcp = [];

    offlineIPs.forEach(ip => {
        // Step 1: Check in master data
        if (!window.masterData || !window.masterData[ip]) {
            dhcp.push({ ip: ip, location: 'Tidak Terdaftar (DHCP)' });
        } else {
            const locId = window.masterData[ip];
            // Step 2: Check if active in Excel IPs
            if (excelActiveIPs.has(ip)) {
                harusCek.push({ ip: ip, location: locId });
            } else {
                sudahTurun.push({ ip: ip, location: locId });
            }
        }
    });

    // Update Counts in UI
    document.getElementById('totalCount').textContent = offlineIPs.length;
    document.getElementById('harusCekCount').textContent = harusCek.length;
    document.getElementById('sudahTurunCount').textContent = sudahTurun.length;
    document.getElementById('dhcpCount').textContent = dhcp.length;

    // Update global state data
    currentData['harus-cek'] = harusCek;
    currentData['sudah-turun'] = sudahTurun;
    currentData['dhcp'] = dhcp;

    // Render active tab content
    renderActiveTab();
}

// Render active tab content dynamically
function renderActiveTab() {
    const outputDiv = document.getElementById('output');
    if (!outputDiv) return;
    
    outputDiv.className = 'output-container tab-panel-container ' + currentTab;
    outputDiv.innerHTML = '';
    
    const data = currentData[currentTab] || [];
    
    // Apply line filter
    const filteredData = filterBySelectedLines(data);
    // Tab descriptions
    const descriptions = {
        'harus-cek': 'IP ini offline, tetapi lokasinya masih terdaftar aktif di Excel.',
        'sudah-turun': 'IP ini offline, dan lokasinya sudah dihapus/tidak ada di Excel.',
        'dhcp': 'IP ini tidak terdaftar dalam database master-data.js.'
    };
    
    // Create tab pane element
    const pane = document.createElement('div');
    pane.className = 'tab-pane';
    
    // Header containing explanation and copy list button
    const header = document.createElement('div');
    header.className = 'tab-pane-header';
    
    const desc = document.createElement('p');
    desc.className = 'tab-pane-description';
    desc.textContent = descriptions[currentTab];
    header.appendChild(desc);
    
    if (filteredData.length > 0) {
        const copyListBtn = document.createElement('button');
        copyListBtn.className = 'btn-copy-small';
        copyListBtn.innerHTML = '<i class="fas fa-copy"></i> Copy IP List';
        copyListBtn.addEventListener('click', () => copyIpList(filteredData, copyListBtn));
        header.appendChild(copyListBtn);
    }
    
    pane.appendChild(header);
    
    // Body containing table or empty state
    const body = document.createElement('div');
    body.className = 'tab-pane-body';
    
    if (filteredData.length === 0) {
        const emptyMsg = (selectedLines.size > 0 && data.length > 0)
            ? 'Tidak ada IP yang cocok dengan filter Line yang dipilih.'
            : 'Tidak ada IP dalam kelompok ini.';
        body.innerHTML = `
            <div class="tab-empty-state">
                <i class="fas fa-info-circle"></i>
                <p>${emptyMsg}</p>
            </div>
        `;
    } else {
        const table = document.createElement('table');
        table.className = 'tab-table';
        
        const thead = table.createTHead();
        const headerRow = thead.insertRow();
        
        const thIp = document.createElement('th');
        thIp.textContent = 'IP Address';
        headerRow.appendChild(thIp);
        
        const thLoc = document.createElement('th');
        thLoc.textContent = 'Location ID';
        headerRow.appendChild(thLoc);
        
        const thAction = document.createElement('th');
        thAction.textContent = 'Aksi';
        headerRow.appendChild(thAction);
        
        const tbody = table.createTBody();
        filteredData.forEach(item => {
            const tr = tbody.insertRow();
            
            const cellIp = tr.insertCell();
            cellIp.textContent = item.ip;
            cellIp.style.fontWeight = '600';
            
            const cellLoc = tr.insertCell();
            cellLoc.textContent = item.location;
            
            const cellAction = tr.insertCell();
            const rowCopyBtn = document.createElement('button');
            rowCopyBtn.className = 'btn-copy-small';
            rowCopyBtn.style.padding = '4px 8px';
            rowCopyBtn.style.fontSize = '0.8rem';
            rowCopyBtn.innerHTML = '<i class="fas fa-copy"></i> Copy';
            
            rowCopyBtn.addEventListener('click', () => {
                const textToCopy = `${item.ip} - ${item.location}`;
                navigator.clipboard.writeText(textToCopy).then(() => {
                    const originalHTML = rowCopyBtn.innerHTML;
                    rowCopyBtn.innerHTML = '<i class="fas fa-check" style="color: #28c76f;"></i> Copied!';
                    setTimeout(() => {
                        rowCopyBtn.innerHTML = originalHTML;
                    }, 1500);
                }).catch(err => {
                    // Fallback copy
                    const textArea = document.createElement('textarea');
                    textArea.value = textToCopy;
                    document.body.appendChild(textArea);
                    textArea.select();
                    document.execCommand('copy');
                    document.body.removeChild(textArea);
                    const originalHTML = rowCopyBtn.innerHTML;
                    rowCopyBtn.innerHTML = '<i class="fas fa-check" style="color: #28c76f;"></i> Copied!';
                    setTimeout(() => {
                        rowCopyBtn.innerHTML = originalHTML;
                    }, 1500);
                });
            });
            cellAction.appendChild(rowCopyBtn);
        });
        
        body.appendChild(table);
    }
    
    pane.appendChild(body);
    outputDiv.appendChild(pane);
}

// Copy IP List function
function copyIpList(data, button) {
    const ipList = data.map(item => `${item.ip} - ${item.location}`).join('\n');
    navigator.clipboard.writeText(ipList).then(() => {
        const originalHTML = button.innerHTML;
        button.innerHTML = '<i class="fas fa-check"></i> Copied!';
        button.classList.add('copy-success');
        setTimeout(() => {
            button.innerHTML = originalHTML;
            button.classList.remove('copy-success');
        }, 2000);
    }).catch(err => {
        console.error('Clipboard copy failed:', err);
        // Fallback for copy
        const textArea = document.createElement('textarea');
        textArea.value = ipList;
        document.body.appendChild(textArea);
        textArea.select();
        alert('IP list copied to clipboard!');
    });
}

// Export to Validator functionality
document.getElementById('exportToValidatorBtn')?.addEventListener('click', function() {
    // Retrieve IPs from Sudah Turun and DHCP
    const sudahTurunIPs = currentData['sudah-turun'] ? currentData['sudah-turun'].map(item => item.ip) : [];
    const dhcpIPs = currentData['dhcp'] ? currentData['dhcp'].map(item => item.ip) : [];
    
    // Combine IPs
    const allExportIPs = [...sudahTurunIPs, ...dhcpIPs];
    
    if (allExportIPs.length === 0) {
        alert('Tidak ada IP "Sudah Turun" atau "DHCP" untuk diexport.');
        return;
    }
    
    // Save to sessionStorage
    sessionStorage.setItem('exportedOfflineIPs', allExportIPs.join('\n'));
    
    // Open Validator in new tab
    window.open('iplocationvalidator.html', '_blank');
});