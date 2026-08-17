// ==========================================
// DATA DROPDOWN DINAMIS (MEMUAT DARI LOCALSTORAGE / DEFAULT)
// ==========================================

let SENDER_DATA = JSON.parse(localStorage.getItem("sj_sender_data")) || [
    {
        id: "sender1",
        label: "PT. CAKRA WISESA UNGGUL PRATAMA (KAB. KARAWANG)",
        name: "PT. CAKRA WISESA UNGGUL PRATAMA",
        address: "CIBUNTUT, MARGAMULYA, KEC. TELUKJAMBE BARAT\nKAB. KARAWANG, JAWA BARAT 41361",
        pic: "Imam Fahrudin",
        contact: "+62 856-9566-8500"
    },
    {
        id: "sender2",
        label: "PT. CAKRA WISESA UNGGUL PRATAMA (JAKARTA)",
        name: "PT. CAKRA WISESA UNGGUL PRATAMA",
        address: "GEDUNG GRAND SLIPI TOWER LT. 18, SLIPI, PALMERAH\nKOTA JAKARTA BARAT, DKI JAKARTA 11480",
        pic: "Imam Fahrudin",
        contact: "+62 856-9566-8500"
    }
];

let RECIPIENT_DATA = JSON.parse(localStorage.getItem("sj_recipient_data")) || [
    {
        id: "rec1",
        label: "PT. PANCA SAKTI MAHKOTA MAJU (PIK 1)",
        name: "PT.PANCA SAKTI MAHKOTA MAJU (PIK 1)",
        address: "JL. PANTAI INDAH SELATAN 2, RW.1 KAPUK MUARA\nKEC.PENJARINGAN, KOTA JKT UTARA",
        pic: "DITUS / ABIL",
        contact: "0811-8113-6551 / 0811-8113-6554"
    },
    {
        id: "rec2",
        label: "PT. CAKRA WISESA UNGGUL PRATAMA (CIBUNTUT)",
        name: "PT. CAKRA WISESA UNGGUL PRATAMA",
        address: "CIBUNTUT, MARGAMULYA, KEC. TELUKJAMBE BARAT\nKAB. KARAWANG, JAWA BARAT 41361",
        pic: "Imam Fahrudin",
        contact: "+62 856-9566-8500"
    }
];

let DRIVER_DATA = JSON.parse(localStorage.getItem("sj_driver_data")) || [
    {
        id: "driver1",
        label: "Ohen - B 9572 FXW",
        name: "Ohen",
        phone: "0816-1793-9428",
        plate: "B 9572 FXW"
    },
    {
        id: "driver2",
        label: "Budi - B 1234 XYZ",
        name: "Budi",
        phone: "0812-3456-7890",
        plate: "B 1234 XYZ"
    },
    {
        id: "driver3",
        label: "Mulyadi - F 8899 AA",
        name: "Mulyadi",
        phone: "0857-7788-9900",
        plate: "F 8899 AA"
    }
];

let PIC_DATA = JSON.parse(localStorage.getItem("sj_pic_data")) || [
    { id: "pic1", name: "Imam Fahrudin" },
    { id: "pic2", name: "Ditus" },
    { id: "pic3", name: "Abil" }
];

let ITEM_DATA = JSON.parse(localStorage.getItem("sj_item_data")) || [
    { itemId: "SGMZ010004", description: "S19J XP_136T", uom: "unit" },
    { itemId: "SGMZ010006", description: "S19J XP_151T", uom: "unit" },
    { itemId: "SGMZ010008", description: "S19J XP_141T", uom: "unit" },
    { itemId: "SGMZ010010", description: "Antminer L7 9050M", uom: "unit" },
    { itemId: "SGMZ010012", description: "Antminer S19 Pro 110T", uom: "unit" }
];

function saveAllDataToStorage() {
    localStorage.setItem("sj_sender_data", JSON.stringify(SENDER_DATA));
    localStorage.setItem("sj_recipient_data", JSON.stringify(RECIPIENT_DATA));
    localStorage.setItem("sj_driver_data", JSON.stringify(DRIVER_DATA));
    localStorage.setItem("sj_pic_data", JSON.stringify(PIC_DATA));
    localStorage.setItem("sj_item_data", JSON.stringify(ITEM_DATA));
}


// ==========================================
// LOGIKA UTAMA APLIKASI
// ==========================================

let currentItems = [
    { itemId: "SGMZ010004", description: "S19J XP_136T", pallet: "", qty: 10, uom: "unit" },
    { itemId: "SGMZ010006", description: "S19J XP_151T", pallet: "", qty: 1, uom: "unit" }
];

document.addEventListener("DOMContentLoaded", () => {
    initFormInputs();
    renderFormItems();
    updatePreview();
    setupEventListeners();
});

// Mengisi dropdown pilihan pada Form
function initFormInputs() {
    repopulateDropdowns();

    // Set Default Tanggal ke hari ini
    const today = new Date();
    const localDate = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
    document.getElementById("deliveryDate").value = localDate;
}

// Memperbarui opsi pilihan pada dropdown secara dinamis
function repopulateDropdowns() {
    // 1. Populate Senders
    const senderSelect = document.getElementById("senderSelect");
    const prevSenderVal = senderSelect.value;
    senderSelect.innerHTML = "";
    SENDER_DATA.forEach(s => {
        const opt = document.createElement("option");
        opt.value = s.id;
        opt.textContent = s.label;
        senderSelect.appendChild(opt);
    });
    if (prevSenderVal && SENDER_DATA.some(s => s.id === prevSenderVal)) {
        senderSelect.value = prevSenderVal;
    }

    // 2. Populate Recipients
    const deliverToSelect = document.getElementById("deliverToSelect");
    const prevRecVal = deliverToSelect.value;
    deliverToSelect.innerHTML = "";
    RECIPIENT_DATA.forEach(r => {
        const opt = document.createElement("option");
        opt.value = r.id;
        opt.textContent = r.label;
        deliverToSelect.appendChild(opt);
    });
    if (prevRecVal && RECIPIENT_DATA.some(r => r.id === prevRecVal)) {
        deliverToSelect.value = prevRecVal;
    }

    // 3. Populate Drivers
    const driverSelect = document.getElementById("driverSelect");
    const prevDriverVal = driverSelect.value;
    driverSelect.innerHTML = "";
    DRIVER_DATA.forEach(d => {
        const opt = document.createElement("option");
        opt.value = d.id;
        opt.textContent = d.label;
        driverSelect.appendChild(opt);
    });
    if (prevDriverVal && DRIVER_DATA.some(d => d.id === prevDriverVal)) {
        driverSelect.value = prevDriverVal;
    }

    // 4. Populate PICs
    const picSelect = document.getElementById("picSelect");
    const prevPicVal = picSelect.value;
    picSelect.innerHTML = "";
    PIC_DATA.forEach(p => {
        const opt = document.createElement("option");
        opt.value = p.id;
        opt.textContent = p.name;
        picSelect.appendChild(opt);
    });
    if (prevPicVal && PIC_DATA.some(p => p.id === prevPicVal)) {
        picSelect.value = prevPicVal;
    }
}

// Render baris barang di dalam Form Input
function renderFormItems() {
    const tbody = document.getElementById("itemsListBody");
    tbody.innerHTML = "";

    currentItems.forEach((item, index) => {
        const tr = document.createElement("tr");

        // Cell Item ID (dropdown + value)
        const tdItem = document.createElement("td");
        const selectItem = document.createElement("select");
        selectItem.addEventListener("change", (e) => handleItemSelectChange(index, e.target.value));
        
        // Add default item list options
        ITEM_DATA.forEach(i => {
            const opt = document.createElement("option");
            opt.value = i.itemId;
            opt.textContent = i.itemId;
            if (i.itemId === item.itemId) opt.selected = true;
            selectItem.appendChild(opt);
        });
        tdItem.appendChild(selectItem);

        // Cell Description
        const tdDesc = document.createElement("td");
        const inputDesc = document.createElement("input");
        inputDesc.type = "text";
        inputDesc.value = item.description;
        inputDesc.addEventListener("input", (e) => {
            currentItems[index].description = e.target.value;
            updatePreview();
        });
        tdDesc.appendChild(inputDesc);

        // Cell Pallet
        const tdPallet = document.createElement("td");
        const inputPallet = document.createElement("input");
        inputPallet.type = "text";
        inputPallet.value = item.pallet;
        inputPallet.addEventListener("input", (e) => {
            currentItems[index].pallet = e.target.value;
            updatePreview();
        });
        tdPallet.appendChild(inputPallet);

        // Cell Qty
        const tdQty = document.createElement("td");
        const inputQty = document.createElement("input");
        inputQty.type = "number";
        inputQty.min = "1";
        inputQty.value = item.qty;
        inputQty.addEventListener("input", (e) => {
            currentItems[index].qty = parseInt(e.target.value) || 0;
            updatePreview();
        });
        tdQty.appendChild(inputQty);

        // Cell UOM
        const tdUom = document.createElement("td");
        const inputUom = document.createElement("input");
        inputUom.type = "text";
        inputUom.value = item.uom;
        inputUom.addEventListener("input", (e) => {
            currentItems[index].uom = e.target.value;
            updatePreview();
        });
        tdUom.appendChild(inputUom);

        // Cell Action
        const tdAction = document.createElement("td");
        const btnDel = document.createElement("button");
        btnDel.type = "button";
        btnDel.className = "btn-delete-row";
        btnDel.innerHTML = '<i class="fas fa-trash-alt"></i>';
        btnDel.addEventListener("click", () => {
            deleteItemRow(index);
        });
        tdAction.appendChild(btnDel);

        tr.appendChild(tdItem);
        tr.appendChild(tdDesc);
        tr.appendChild(tdPallet);
        tr.appendChild(tdQty);
        tr.appendChild(tdUom);
        tr.appendChild(tdAction);

        tbody.appendChild(tr);
    });
}

// Mengubah Deskripsi & UOM secara otomatis ketika Item ID dipilih
function handleItemSelectChange(index, selectedItemId) {
    const match = ITEM_DATA.find(i => i.itemId === selectedItemId);
    if (match) {
        currentItems[index].itemId = match.itemId;
        currentItems[index].description = match.description;
        currentItems[index].uom = match.uom;
        renderFormItems();
        updatePreview();
    }
}

// Menghapus baris item barang
function deleteItemRow(index) {
    if (currentItems.length > 1) {
        currentItems.splice(index, 1);
        renderFormItems();
        updatePreview();
    } else {
        alert("Harus ada minimal 1 baris barang!");
    }
}

// Menambahkan baris item baru
function addItemRow() {
    const firstOption = ITEM_DATA[0];
    currentItems.push({
        itemId: firstOption.itemId,
        description: firstOption.description,
        pallet: "",
        qty: 1,
        uom: firstOption.uom
    });
    renderFormItems();
    updatePreview();
}

// Sinkronisasi data ke tampilan Preview
function updatePreview() {
    // 1. Doc Number
    const docNum = document.getElementById("docNumber").value;
    document.getElementById("prev-doc-number").textContent = docNum;

    // 2. Sender Details
    const senderId = document.getElementById("senderSelect").value;
    const sender = SENDER_DATA.find(s => s.id === senderId);
    if (sender) {
        document.getElementById("prev-sender-details").innerHTML = `
            <strong>${sender.name}</strong><br>
            ${sender.address}<br>
            <strong>PIC :</strong> ${sender.pic}<br>
            <strong>Kontak :</strong> ${sender.contact}
        `;
    }

    // 3. Deliver To Details
    const recId = document.getElementById("deliverToSelect").value;
    const recipient = RECIPIENT_DATA.find(r => r.id === recId);
    if (recipient) {
        document.getElementById("prev-deliver-to-details").innerHTML = `
            <strong>${recipient.name}</strong><br>
            ${recipient.address}<br>
            <strong>PIC :</strong> ${recipient.pic}<br>
            <strong>Kontak :</strong> ${recipient.contact}
        `;
    }

    // 4. Date & Time
    const rawDate = document.getElementById("deliveryDate").value;
    let formattedDate = "";
    if (rawDate) {
        const d = rawDate.split("-");
        if (d.length === 3) {
            // YYYY-MM-DD to DD - MM - YYYY
            formattedDate = `${d[2]} - ${d[1]} - ${d[0]}`;
        }
    }
    document.getElementById("prev-delivery-date").textContent = formattedDate || "-";
    document.getElementById("prev-delivery-time").textContent = document.getElementById("deliveryTime").value;

    // 5. Driver Details
    const driverId = document.getElementById("driverSelect").value;
    const driver = DRIVER_DATA.find(d => d.id === driverId);
    if (driver) {
        document.getElementById("prev-driver-name").textContent = driver.name;
        document.getElementById("prev-driver-phone").textContent = driver.phone;
        document.getElementById("prev-driver-plate").textContent = driver.plate;
    }

    // 6. PIC Footer Name
    const picId = document.getElementById("picSelect").value;
    const pic = PIC_DATA.find(p => p.id === picId);
    if (pic) {
        document.getElementById("prev-pic-name").textContent = pic.name;
    }

    // 7. Notes
    document.getElementById("prev-note-text").textContent = "Note : " + document.getElementById("noteText").value;

    // 8. Rebuild Preview Table
    const prevTbody = document.getElementById("prev-items-body");
    prevTbody.innerHTML = "";

    const totalRowsCount = Math.max(10, currentItems.length); // minimal 10 baris untuk estetika template
    let totalQty = 0;
    let mainUom = "unit"; // Default UOM

    if (currentItems.length > 0) {
        mainUom = currentItems[0].uom;
    }

    for (let i = 0; i < totalRowsCount; i++) {
        const tr = document.createElement("tr");

        // Nomor
        const tdNo = document.createElement("td");
        tdNo.textContent = i < currentItems.length ? (i + 1) : "";
        tr.appendChild(tdNo);

        // Item ID
        const tdItem = document.createElement("td");
        tdItem.textContent = i < currentItems.length ? currentItems[i].itemId : "";
        tr.appendChild(tdItem);

        // Description
        const tdDesc = document.createElement("td");
        tdDesc.textContent = i < currentItems.length ? currentItems[i].description : "";
        tr.appendChild(tdDesc);

        // Pallet
        const tdPallet = document.createElement("td");
        tdPallet.textContent = (i < currentItems.length && currentItems[i].pallet) ? currentItems[i].pallet : "";
        tr.appendChild(tdPallet);

        // Qty
        const tdQty = document.createElement("td");
        if (i < currentItems.length) {
            tdQty.textContent = currentItems[i].qty;
            totalQty += currentItems[i].qty;
        } else {
            tdQty.textContent = "";
        }
        tr.appendChild(tdQty);

        // UOM
        const tdUom = document.createElement("td");
        tdUom.textContent = i < currentItems.length ? currentItems[i].uom : "";
        tr.appendChild(tdUom);

        // Keterangan - Merge Span for first row
        if (i === 0) {
            const tdKet = document.createElement("td");
            tdKet.rowSpan = totalRowsCount; // span exactly the number of item rows
            tdKet.className = "align-top pad-md";
            tdKet.id = "prev-ket-notes";
            
            // Only notes go here now, seal lock is in the tfoot
            tdKet.textContent = document.getElementById("keteranganText").value;
            tr.appendChild(tdKet);
        }

        prevTbody.appendChild(tr);
    }

    // Update TOTAL row static elements in tfoot
    document.getElementById("prev-total-qty").textContent = totalQty;
    document.getElementById("prev-seal-lock").textContent = document.getElementById("sealLock").value;
}

// Mengatur event listener pada Form Input
function setupEventListeners() {
    // Dropdown change events
    document.getElementById("senderSelect").addEventListener("change", updatePreview);
    document.getElementById("deliverToSelect").addEventListener("change", updatePreview);
    document.getElementById("driverSelect").addEventListener("change", updatePreview);
    document.getElementById("picSelect").addEventListener("change", updatePreview);

    // Text inputs events
    document.getElementById("docNumber").addEventListener("input", updatePreview);
    document.getElementById("deliveryDate").addEventListener("change", updatePreview);
    document.getElementById("deliveryTime").addEventListener("input", updatePreview);
    document.getElementById("sealLock").addEventListener("input", updatePreview);
    document.getElementById("keteranganText").addEventListener("input", updatePreview);
    document.getElementById("noteText").addEventListener("input", updatePreview);

    // Buttons
    document.getElementById("addItemBtn").addEventListener("click", addItemRow);
    document.getElementById("resetBtn").addEventListener("click", resetForm);
    document.getElementById("downloadPdfBtn").addEventListener("click", downloadPdf);

    // Photo Upload
    document.getElementById("photoUpload").addEventListener("change", handlePhotoUpload);

    // Modal Kelola Data
    initManageDataModal();
}

// Menangani unggahan foto (bisa lebih dari satu)
function handlePhotoUpload(event) {
    const files = event.target.files;
    const fotoContainer = document.getElementById("prev-foto-container");
    
    // Kosongkan isi container
    fotoContainer.innerHTML = '';

    if (files.length === 0) {
        // Kembalikan teks default jika tidak ada file
        fotoContainer.innerHTML = '<span id="prev-foto-text" class="font-bold foto-text">tempat foto</span>';
        return;
    }

    // Proses setiap file yang diunggah
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Pastikan file adalah gambar
        if (!file.type.startsWith('image/')) continue;
        
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = document.createElement("img");
            img.className = "uploaded-img";
            img.src = e.target.result; // Base64 Data URL
            fotoContainer.appendChild(img);
        };
        reader.readAsDataURL(file);
    }
}

// Reset data Form ke nilai default
function resetForm() {
    if (confirm("Apakah Anda yakin ingin me-reset data kembali ke default?")) {
        // Reset item array
        currentItems = [
            { itemId: "SGMZ010004", description: "S19J XP_136T", pallet: "", qty: 10, uom: "unit" },
            { itemId: "SGMZ010006", description: "S19J XP_151T", pallet: "", qty: 1, uom: "unit" }
        ];

        // Reset selects to index 0
        document.getElementById("senderSelect").selectedIndex = 0;
        document.getElementById("deliverToSelect").selectedIndex = 0;
        document.getElementById("driverSelect").selectedIndex = 0;
        document.getElementById("picSelect").selectedIndex = 0;

        // Reset inputs
        document.getElementById("docNumber").value = "DLVRY/OUT/CWUP 01/10/V/2026";
        document.getElementById("sealLock").value = "12580";
        document.getElementById("keteranganText").value = "After repair Bitman ke PIK";
        document.getElementById("noteText").value = "barang yang kami kirim dalam keadaan baik dan jumlah yang sesuai antara fisik dengan surat jalan";
        document.getElementById("deliveryTime").value = "14:00";
        
        // Clear foto upload
        document.getElementById("photoUpload").value = "";
        document.getElementById("prev-foto-container").innerHTML = '<span id="prev-foto-text" class="font-bold foto-text">tempat foto</span>';

        const today = new Date();
        const localDate = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
        document.getElementById("deliveryDate").value = localDate;

        renderFormItems();
        updatePreview();
    }
}

// Mengunduh dokumen preview sebagai berkas PDF
function downloadPdf() {
    const element = document.getElementById("deliveryNoteDoc");
    const docNumber = document.getElementById("docNumber").value || "Surat_Jalan";
    
    // Clean document number to make a safe file name
    const safeFileName = docNumber.trim().replace(/[^a-zA-Z0-9]/g, "_") + ".pdf";

    // Options for html2pdf
    const opt = {
        margin:       [0, 0, 0, 0], // Zero margin because padding is handled internally in document CSS
        filename:     safeFileName,
        image:        { type: "jpeg", quality: 0.98 },
        html2canvas:  { 
            scale: 2, // High resolution scale
            useCORS: true,
            letterRendering: true
        },
        jsPDF:        { 
            unit: "mm", 
            format: "a4", 
            orientation: "portrait" 
        }
    };

    // Show loading style or disable button while rendering
    const btn = document.getElementById("downloadPdfBtn");
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Rendering PDF...';
    btn.disabled = true;

    // Run HTML to PDF conversion
    html2pdf().set(opt).from(element).save().then(() => {
        // Restore button state
        btn.innerHTML = originalText;
        btn.disabled = false;
    }).catch(err => {
        console.error("PDF Export error:", err);
        alert("Gagal membuat PDF: " + err.message);
        btn.innerHTML = originalText;
        btn.disabled = false;
    });
}

// ==========================================
// MODUL KELOLA DATA DROPDOWN (TAB & MODAL)
// ==========================================

function initManageDataModal() {
    const modal = document.getElementById("manageDataModal");
    const openBtn = document.getElementById("openManageDataBtn");
    const closeBtn = document.getElementById("closeModalBtn");
    const tabBtns = document.querySelectorAll(".tab-btn");
    const tabContents = document.querySelectorAll(".tab-content");

    // Open Modal
    openBtn.addEventListener("click", () => {
        modal.style.display = "flex";
        renderModalLists();
    });

    // Close Modal
    closeBtn.addEventListener("click", () => {
        modal.style.display = "none";
    });

    // Close Modal when clicking outside
    modal.addEventListener("click", (e) => {
        if (e.target === modal) {
            modal.style.display = "none";
        }
    });

    // Tab Switching
    tabBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            tabBtns.forEach(b => b.classList.remove("active"));
            tabContents.forEach(c => c.classList.remove("active"));

            btn.classList.add("active");
            const targetTab = btn.getAttribute("data-tab");
            document.getElementById(targetTab).classList.add("active");
        });
    });

    // Add Buttons event handlers
    document.getElementById("addSenderBtn").addEventListener("click", () => addModalData("sender"));
    document.getElementById("addRecipientBtn").addEventListener("click", () => addModalData("recipient"));
    document.getElementById("addDriverBtn").addEventListener("click", () => addModalData("driver"));
    document.getElementById("addPicBtn").addEventListener("click", () => addModalData("pic"));
    document.getElementById("addItemOptBtn").addEventListener("click", () => addModalData("item"));

    // Export / Import Data event handlers
    document.getElementById("exportDataBtn").addEventListener("click", exportDropdownData);
    document.getElementById("importDataBtnClick").addEventListener("click", () => {
        document.getElementById("importDataFile").click();
    });
    document.getElementById("importDataFile").addEventListener("change", importDropdownData);
}

// Merender daftar item di dalam modal
function renderModalLists() {
    // 1. Sender List
    const senderList = document.getElementById("modalSenderList");
    senderList.innerHTML = "";
    SENDER_DATA.forEach((s, idx) => {
        const li = document.createElement("li");
        li.innerHTML = `
            <div class="data-info">
                <span class="data-title">${s.label}</span>
                <span class="data-desc">Nama: ${s.name} | PIC: ${s.pic} | Kontak: ${s.contact}<br>Alamat: ${s.address.replace(/\n/g, ' ')}</span>
            </div>
            <button class="btn-delete-item" onclick="deleteModalData('sender', ${idx})"><i class="fas fa-trash-alt"></i></button>
        `;
        senderList.appendChild(li);
    });

    // 2. Recipient List
    const recipientList = document.getElementById("modalRecipientList");
    recipientList.innerHTML = "";
    RECIPIENT_DATA.forEach((r, idx) => {
        const li = document.createElement("li");
        li.innerHTML = `
            <div class="data-info">
                <span class="data-title">${r.label}</span>
                <span class="data-desc">Nama: ${r.name} | PIC: ${r.pic} | Kontak: ${r.contact}<br>Alamat: ${r.address.replace(/\n/g, ' ')}</span>
            </div>
            <button class="btn-delete-item" onclick="deleteModalData('recipient', ${idx})"><i class="fas fa-trash-alt"></i></button>
        `;
        recipientList.appendChild(li);
    });

    // 3. Driver List
    const driverList = document.getElementById("modalDriverList");
    driverList.innerHTML = "";
    DRIVER_DATA.forEach((d, idx) => {
        const li = document.createElement("li");
        li.innerHTML = `
            <div class="data-info">
                <span class="data-title">${d.label}</span>
                <span class="data-desc">Nama: ${d.name} | HP: ${d.phone} | Plat: ${d.plate}</span>
            </div>
            <button class="btn-delete-item" onclick="deleteModalData('driver', ${idx})"><i class="fas fa-trash-alt"></i></button>
        `;
        driverList.appendChild(li);
    });

    // 4. PIC List
    const picList = document.getElementById("modalPicList");
    picList.innerHTML = "";
    PIC_DATA.forEach((p, idx) => {
        const li = document.createElement("li");
        li.innerHTML = `
            <div class="data-info">
                <span class="data-title">${p.name}</span>
            </div>
            <button class="btn-delete-item" onclick="deleteModalData('pic', ${idx})"><i class="fas fa-trash-alt"></i></button>
        `;
        picList.appendChild(li);
    });

    // 5. Item Options List
    const itemList = document.getElementById("modalItemList");
    itemList.innerHTML = "";
    ITEM_DATA.forEach((i, idx) => {
        const li = document.createElement("li");
        li.innerHTML = `
            <div class="data-info">
                <span class="data-title">${i.itemId}</span>
                <span class="data-desc">Deskripsi: ${i.description} | UOM: ${i.uom}</span>
            </div>
            <button class="btn-delete-item" onclick="deleteModalData('item', ${idx})"><i class="fas fa-trash-alt"></i></button>
        `;
        itemList.appendChild(li);
    });
}

// Menambahkan data baru melalui form di modal
function addModalData(category) {
    if (category === "sender") {
        const label = document.getElementById("mSenderLabel").value.trim();
        const name = document.getElementById("mSenderName").value.trim();
        const pic = document.getElementById("mSenderPic").value.trim();
        const contact = document.getElementById("mSenderContact").value.trim();
        const address = document.getElementById("mSenderAddress").value.trim();

        if (!label || !name || !pic || !contact || !address) {
            alert("Harap isi semua kolom pengirim!");
            return;
        }

        const newId = "sender_" + Date.now();
        SENDER_DATA.push({ id: newId, label, name, pic, contact, address });
        
        // Clear fields
        document.getElementById("mSenderLabel").value = "";
        document.getElementById("mSenderName").value = "";
        document.getElementById("mSenderPic").value = "";
        document.getElementById("mSenderContact").value = "";
        document.getElementById("mSenderAddress").value = "";

    } else if (category === "recipient") {
        const label = document.getElementById("mRecLabel").value.trim();
        const name = document.getElementById("mRecName").value.trim();
        const pic = document.getElementById("mRecPic").value.trim();
        const contact = document.getElementById("mRecContact").value.trim();
        const address = document.getElementById("mRecAddress").value.trim();

        if (!label || !name || !pic || !contact || !address) {
            alert("Harap isi semua kolom penerima!");
            return;
        }

        const newId = "rec_" + Date.now();
        RECIPIENT_DATA.push({ id: newId, label, name, pic, contact, address });

        // Clear fields
        document.getElementById("mRecLabel").value = "";
        document.getElementById("mRecName").value = "";
        document.getElementById("mRecPic").value = "";
        document.getElementById("mRecContact").value = "";
        document.getElementById("mRecAddress").value = "";

    } else if (category === "driver") {
        const label = document.getElementById("mDriverLabel").value.trim();
        const name = document.getElementById("mDriverName").value.trim();
        const phone = document.getElementById("mDriverPhone").value.trim();
        const plate = document.getElementById("mDriverPlate").value.trim();

        if (!label || !name || !phone || !plate) {
            alert("Harap isi semua kolom driver!");
            return;
        }

        const newId = "driver_" + Date.now();
        DRIVER_DATA.push({ id: newId, label, name, phone, plate });

        // Clear fields
        document.getElementById("mDriverLabel").value = "";
        document.getElementById("mDriverName").value = "";
        document.getElementById("mDriverPhone").value = "";
        document.getElementById("mDriverPlate").value = "";

    } else if (category === "pic") {
        const name = document.getElementById("mPicName").value.trim();

        if (!name) {
            alert("Harap isi nama PIC!");
            return;
        }

        const newId = "pic_" + Date.now();
        PIC_DATA.push({ id: newId, name });

        // Clear fields
        document.getElementById("mPicName").value = "";

    } else if (category === "item") {
        const itemId = document.getElementById("mItemId").value.trim();
        const description = document.getElementById("mItemDesc").value.trim();
        const uom = document.getElementById("mItemUom").value.trim();

        if (!itemId || !description || !uom) {
            alert("Harap isi semua kolom opsi barang!");
            return;
        }

        // Check duplicate
        if (ITEM_DATA.some(i => i.itemId.toLowerCase() === itemId.toLowerCase())) {
            alert("Item ID sudah terdaftar!");
            return;
        }

        ITEM_DATA.push({ itemId, description, uom });

        // Clear fields
        document.getElementById("mItemId").value = "";
        document.getElementById("mItemDesc").value = "";
        document.getElementById("mItemUom").value = "unit";
    }

    saveAllDataToStorage();
    repopulateDropdowns();
    renderFormItems();
    updatePreview();
    renderModalLists();
}

// Menghapus data dari list modal
function deleteModalData(category, index) {
    if (!confirm("Apakah Anda yakin ingin menghapus data ini?")) return;

    if (category === "sender") {
        if (SENDER_DATA.length <= 1) {
            alert("Minimal harus ada 1 data Pengirim!");
            return;
        }
        SENDER_DATA.splice(index, 1);
    } else if (category === "recipient") {
        if (RECIPIENT_DATA.length <= 1) {
            alert("Minimal harus ada 1 data Penerima!");
            return;
        }
        RECIPIENT_DATA.splice(index, 1);
    } else if (category === "driver") {
        if (DRIVER_DATA.length <= 1) {
            alert("Minimal harus ada 1 data Driver!");
            return;
        }
        DRIVER_DATA.splice(index, 1);
    } else if (category === "pic") {
        if (PIC_DATA.length <= 1) {
            alert("Minimal harus ada 1 data PIC!");
            return;
        }
        PIC_DATA.splice(index, 1);
    } else if (category === "item") {
        if (ITEM_DATA.length <= 1) {
            alert("Minimal harus ada 1 data Opsi Barang!");
            return;
        }
        ITEM_DATA.splice(index, 1);
    }

    saveAllDataToStorage();
    repopulateDropdowns();
    renderFormItems();
    updatePreview();
    renderModalLists();
}

// Export database dropdown sebagai file JSON
function exportDropdownData() {
    const backupData = {
        sender: SENDER_DATA,
        recipient: RECIPIENT_DATA,
        driver: DRIVER_DATA,
        pic: PIC_DATA,
        item: ITEM_DATA
    };

    const jsonString = JSON.stringify(backupData, null, 4);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "surat-jalan-data.json";
    document.body.appendChild(a);
    a.click();
    
    // Clean up
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Import database dropdown dari file JSON
function importDropdownData(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            
            // Validation check
            if (!data.sender || !data.recipient || !data.driver || !data.pic || !data.item) {
                throw new Error("Format berkas cadangan JSON tidak valid!");
            }

            SENDER_DATA = data.sender;
            RECIPIENT_DATA = data.recipient;
            DRIVER_DATA = data.driver;
            PIC_DATA = data.pic;
            ITEM_DATA = data.item;

            saveAllDataToStorage();
            repopulateDropdowns();
            renderFormItems();
            updatePreview();
            renderModalLists();

            alert("Data berhasil diimpor & dipulihkan!");
        } catch (err) {
            alert("Gagal mengimpor berkas: " + err.message);
        }
    };
    reader.readAsText(file);
    
    // Reset file input value so same file can be imported again
    event.target.value = "";
}

// Expose deleteModalData to global window scope so inline onclick works
window.deleteModalData = deleteModalData;

