// Drag and drop functionality - PERBAIKAN
const fileUploadArea = document.getElementById('fileUploadArea');
const fileInput = document.getElementById('excelFile');

// Variabel global untuk menyimpan data asli - DITAMBAHKAN
let originalData = [];
let currentHeaders = [];

// Fungsi handleFile
function handleFile(e) {
    const file = e.target.files[0];
    
    if (!file) return;
    
    // Validasi tipe file
    if (!file.name.match(/\.(xls|xlsx)$/)) {
        alert('Harap unggah file Excel yang valid (.xls atau .xlsx)');
        return;
    }
    
    // Tampilkan loading
    const loading = document.getElementById('loading');
    const controls = document.getElementById('controls');
    const output = document.getElementById('output');
    
    if (loading) loading.style.display = 'block';
    if (controls) controls.style.display = 'none';
    if (output) output.innerHTML = '';
    
    // Process file Excel
    processExcelFile(file);
}

// Fungsi untuk memproses file Excel
function processExcelFile(file) {
    const reader = new FileReader();
    
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            
            // Ambil sheet pertama
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            
            // Konversi ke JSON
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            
            // Process data dan tampilkan hasil
            displayResults(jsonData);
            
        } catch (error) {
            console.error('Error processing Excel file:', error);
            alert('Error memproses file Excel: ' + error.message);
            
            const loading = document.getElementById('loading');
            if (loading) loading.style.display = 'none';
        }
    };
    
    reader.onerror = function() {
        alert('Error membaca file');
        const loading = document.getElementById('loading');
        if (loading) loading.style.display = 'none';
    };
    
    reader.readAsArrayBuffer(file);
}

// Fungsi untuk menampilkan hasil - DIPERBAIKI DENGAN LOGIKA VALIDASI BARU
function displayResults(data) {
    const loading = document.getElementById('loading');
    const controls = document.getElementById('controls');
    const output = document.getElementById('output');
    
    // Sembunyikan loading
    if (loading) loading.style.display = 'none';
    
    if (!data || data.length === 0) {
        output.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-file-excel"></i>
                <h3>Tidak ada data yang ditemukan</h3>
                <p>File Excel tidak mengandung data atau format tidak sesuai.</p>
            </div>
        `;
        return;
    }
    
    // Ambil header
    currentHeaders = data[0];
    
    // Cari indeks kolom yang diperlukan
    const logicalZoneIndex = currentHeaders.findIndex(header => 
        header && header.toString().toLowerCase().includes('logical') && 
        header.toString().toLowerCase().includes('zone')
    );
    
    const subAccountIndex = currentHeaders.findIndex(header => 
        header && header.toString().toLowerCase().includes('sub') && 
        header.toString().toLowerCase().includes('account')
    );

    // Cari indeks kolom Status untuk fallback - DITAMBAHKAN
    const statusIndex = currentHeaders.findIndex(header => 
        header && header.toString().toLowerCase().includes('status')
    );

    // Cari indeks kolom IP
    const ipIndex = currentHeaders.findIndex(header => 
        header && header.toString().toLowerCase().includes('ip')
    );
    
    // Validasi kolom yang diperlukan
    if (logicalZoneIndex === -1 || subAccountIndex === -1) {
        output.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Format File Tidak Sesuai</h3>
                <p>File harus mengandung kolom "Logical Zone" dan "Sub-account".</p>
            </div>
        `;
        return;
    }
    
    // Process data rows dengan logika validasi baru
    originalData = []; // Reset data sebelumnya
    for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (row && row[logicalZoneIndex] !== undefined && row[subAccountIndex] !== undefined) {
            
            // LOGIKA PEMROSESAN DATA SEPERTI DI app.js - DITAMBAHKAN
            const subAccountValue = String(row[subAccountIndex] || '').trim();
            const statusValue = statusIndex !== -1 ? String(row[statusIndex] || '').trim() : '';
            
            // Prioritaskan 'Sub-account', fallback ke 'Status' jika kosong
            const finalSubAccount = (subAccountValue === null || subAccountValue === undefined || subAccountValue === '') 
                ? statusValue 
                : subAccountValue;
            
            let logicalZone = String(row[logicalZoneIndex] || '').trim();
            let subAccount = finalSubAccount;
            const ipAddress = ipIndex !== -1 ? String(row[ipIndex] || '').trim() : '';
            
            // PEMBERSIHAN STRING SEPERTI DI app.js - DITAMBAHKAN
            if (subAccount) {
                let cleanSubAccount = subAccount.toString();
                cleanSubAccount = cleanSubAccount.replace(/gbeab/gi, '');
                cleanSubAccount = cleanSubAccount.replace(/gbe5mw/gi, '');
                cleanSubAccount = cleanSubAccount.replace(/gbegb/gi, '');
                subAccount = cleanSubAccount.trim();
            }
            
            // Hapus karakter '-' dari Logical Zone
            logicalZone = logicalZone.toString().replace(/-/g, '');
            
            // VALIDASI UTAMA SEPERTI DI app.js - DIPERBAIKI
            const isValid = validateData(logicalZone, subAccount);
            
            originalData.push({
                logicalZone,
                subAccount,
                ipAddress,
                isValid,
                status: isValid ? 'online' : 'offline',
                rowIndex: i
            });
        }
    }
    
    // Tampilkan controls
    if (controls) {
        controls.style.display = 'block';
        updateCounts(originalData);
    }
    
    // Render table dengan data asli pertama kali
    renderTable(originalData);
    
    // Reset filter controls ke default
    resetFilterControls();
}

// FUNGSI VALIDASI YANG DIPERBAIKI - SESUAI app.js
function validateData(logicalZone, subAccount) {
    if (logicalZone === '' || subAccount === '') {
        return false;
    }
    
    const logicalZoneLower = logicalZone.toLowerCase();
    const subAccountLower = subAccount.toLowerCase();
    
    // Validasi: Sub-account harus diawali dengan Logical Zone
    return subAccountLower.startsWith(logicalZoneLower);
}

// Fungsi untuk mereset filter controls
function resetFilterControls() {
    const filterElement = document.getElementById('filter');
    const hideOnlineElement = document.getElementById('hideOnline');
    const hideOfflineElement = document.getElementById('hideOffline');
    
    if (filterElement) filterElement.value = 'all';
    if (hideOnlineElement) hideOnlineElement.checked = false;
    if (hideOfflineElement) hideOfflineElement.checked = false;
}

// Fungsi untuk render tabel - DIPERBAIKI DENGAN LINK IP
function renderTable(data) {
    const output = document.getElementById('output');
    
    if (data.length === 0) {
        output.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-search"></i>
                <h3>Tidak ada data yang sesuai</h3>
                <p>Filter yang diterapkan tidak menghasilkan data.</p>
            </div>
        `;
        return;
    }
    
    // Cek apakah ada kolom IP dalam data
    const hasIP = data.some(item => item.ipAddress);
    
    let tableHTML = `
        <table>
            <thead>
                <tr>
                    <th>No</th>
                    <th>Logical Zone</th>
                    <th>Sub-account</th>
    `;
    
    // Tambahkan kolom IP jika ada
    if (hasIP) {
        tableHTML += `<th>IP Address</th>`;
    }
    
    tableHTML += `
                    <th>Status</th>
                    <th>Keterangan</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    data.forEach((item, index) => {
        tableHTML += `
            <tr>
                <td>${index + 1}</td>
                <td>${escapeHtml(item.logicalZone)}</td>
                <td>${escapeHtml(item.subAccount)}</td>
        `;
        
        // Tambahkan kolom IP dengan link jika ada
        if (hasIP) {
            if (item.ipAddress) {
                tableHTML += `
                    <td>
                        <a href="https://user-08fb3ecc9c6a408c977c6f246af37f31obs.minerplus.com/#/other/miner-view?minerFarmId=479279061059821444&ip=${encodeURIComponent(item.ipAddress)}" 
                           target="_blank" 
                           style="color: var(--primary); text-decoration: none; font-weight: 500;">
                            ${escapeHtml(item.ipAddress)}
                            <i class="fas fa-external-link-alt" style="margin-left: 5px; font-size: 0.8rem;"></i>
                        </a>
                    </td>
                `;
            } else {
                tableHTML += `<td>-</td>`;
            }
        }
        
        tableHTML += `
                <td>
                    <span class="status-tag ${item.isValid}">
                        ${item.isValid ? 'TRUE' : 'FALSE'}
                    </span>
                </td>
                <td>${item.isValid ? '✅ Sesuai' : '❌ Tidak Sesuai'}</td>
            </tr>
        `;
    });
    
    tableHTML += `
            </tbody>
        </table>
    `;
    
    output.innerHTML = tableHTML;
}

// Fungsi untuk update counts
function updateCounts(data) {
    const countsElement = document.getElementById('counts');
    if (!countsElement) return;
    
    const total = data.length;
    const trueCount = data.filter(item => item.isValid).length;
    const falseCount = data.filter(item => !item.isValid).length;
    
    countsElement.innerHTML = `
        <span><i class="fas fa-chart-bar"></i> Total: ${total}</span>
        <span><i class="fas fa-check-circle"></i> TRUE: ${trueCount}</span>
        <span><i class="fas fa-times-circle"></i> FALSE: ${falseCount}</span>
    `;
}

// FUNGSI APPLYFILTER YANG DIPERBAIKI
function applyFilter() {
    if (originalData.length === 0) return;
    
    const filterValue = document.getElementById('filter').value;
    const hideOnline = document.getElementById('hideOnline').checked;
    const hideOffline = document.getElementById('hideOffline').checked;
    
    let filteredData = [...originalData];
    
    // Apply status filter (TRUE/FALSE)
    if (filterValue === 'true') {
        filteredData = filteredData.filter(item => item.isValid === true);
    } else if (filterValue === 'false') {
        filteredData = filteredData.filter(item => item.isValid === false);
    }
    
    // Apply online/offline visibility filter
    if (hideOnline) {
        filteredData = filteredData.filter(item => !item.subAccount.toLowerCase().includes('online'));
    }
    if (hideOffline) {
        filteredData = filteredData.filter(item => !item.subAccount.toLowerCase().includes('offline'));
    }
    
    // Jika kedua checkbox dicentang, hasilnya akan kosong
    if (hideOnline && hideOffline) {
        filteredData = [];
    }
    
    // Update tampilan dengan data yang sudah difilter
    renderTable(filteredData);
    updateCounts(filteredData);
}

// Fungsi untuk escape HTML
function escapeHtml(text) {
    if (text === null || text === undefined) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Event listeners untuk drag & drop
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
        if (
            e.clientX <= rect.left || 
            e.clientX >= rect.right ||
            e.clientY <= rect.top || 
            e.clientY >= rect.bottom
        ) {
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
        if (e.target === fileUploadArea || e.target.classList.contains('upload-btn')) {
            fileInput.click();
        }
    });
}

// Event listeners untuk file input dan filter
if (fileInput) {
    fileInput.addEventListener('change', handleFile, false);
}

const filterElement = document.getElementById('filter');
const hideOnlineElement = document.getElementById('hideOnline');
const hideOfflineElement = document.getElementById('hideOffline');

if (filterElement) {
    filterElement.addEventListener('change', applyFilter);
}
if (hideOnlineElement) {
    hideOnlineElement.addEventListener('change', applyFilter);
}
if (hideOfflineElement) {
    hideOfflineElement.addEventListener('change', applyFilter);
}