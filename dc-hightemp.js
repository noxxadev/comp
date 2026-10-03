(() => {
  'use strict';

  const state = { file: null, rows: [], ipColumn: -1, ranking: [], total: 0, progressRows: [], selectedDc: '', selectedProgressId: '' };

  const $ = (id) => document.getElementById(id);
  const historyFile = $('historyFile');
  const uploadArea = $('uploadArea');
  const fileName = $('fileName');
  const fileStatus = $('fileStatus');
  const processBtn = $('processBtn');
  const clearBtn = $('clearBtn');
  const errorMessage = $('errorMessage');
  const loading = $('loading');
  const resultsSection = $('resultsSection');
  const stats = $('stats');
  const rankingBody = $('rankingBody');
  const emptyRanking = $('emptyRanking');
  const resultNote = $('resultNote');
  const periodStart = $('periodStart');
  const periodEnd = $('periodEnd');
  const periodDuration = $('periodDuration');
  const progressPanel = $('progressPanel');
  const progressTitle = $('progressTitle');
  const closeProgressBtn = $('closeProgressBtn');
  const lifecycleSelect = $('lifecycleSelect');
  const newLifecycleBtn = $('newLifecycleBtn');
  const checkpointBtn = $('checkpointBtn');
  const progressSummary = $('progressSummary');
  const progressHistoryBody = $('progressHistoryBody');
  const progressEmpty = $('progressEmpty');

  const getConfig = () => window.CompGoogleSheetsConfig || { webAppUrl: '', requestKey: '' };
  const apiGet = async (action, extra = {}) => { const c=getConfig(); if(!c.webAppUrl) throw new Error('Google Sheets belum dikonfigurasi.'); const p=new URLSearchParams({action,...extra}); if(c.requestKey)p.set('requestKey',String(c.requestKey)); const r=await fetch(c.webAppUrl+(c.webAppUrl.includes('?')?'&':'?')+p.toString(),{cache:'no-store'}); const raw=await r.text(); let x; try{x=JSON.parse(raw)}catch(_){throw new Error('Google Apps Script mengembalikan response tidak valid.')} if(!r.ok||!x?.ok)throw new Error(x?.error||'Request gagal.'); return x; };
  const apiPost = async payload => { const c=getConfig(); if(!c.webAppUrl) throw new Error('Google Sheets belum dikonfigurasi.'); const r=await fetch(c.webAppUrl,{method:'POST',headers:{'Content-Type':'text/plain;charset=UTF-8'},body:JSON.stringify({...payload,requestKey:String(c.requestKey||'')})}); const raw=await r.text(); let x; try{x=JSON.parse(raw)}catch(_){throw new Error('Google Apps Script mengembalikan response tidak valid.')} if(!r.ok||!x?.ok)throw new Error(x?.error||'Request gagal.'); return x; };
  const formatRate = v => Number(v||0).toLocaleString('id-ID',{minimumFractionDigits:2,maximumFractionDigits:2})+'%';
  const formatDuration = m => { m=Math.max(0,Number(m||0)); if(!m)return '-'; const d=Math.floor(m/1440),h=Math.floor((m%1440)/60),n=Math.round(m%60); return [d?d+'h':'',h?h+'j':'',n?n+'m':''].filter(Boolean).join(' ')||'0m'; };
  const getPeriod = () => { if(!periodStart.value||!periodEnd.value) throw new Error('Isi Periode History Mulai dan Selesai sebelum menyimpan Progress.'); const s=new Date(periodStart.value),e=new Date(periodEnd.value); if(!Number.isFinite(s.getTime())||!Number.isFinite(e.getTime())||e<=s)throw new Error('Periode History tidak valid.'); return {periodStart:s.toISOString(),periodEnd:e.toISOString(),durationMinutes:Math.round((e-s)/60000)}; };
  const loadProgress = async () => { try { const x=await apiGet('getDcProgress'); state.progressRows=Array.isArray(x.rows)?x.rows:[]; } catch(e){ console.warn('DC Progress belum tersedia:',e); state.progressRows=[]; } };

  const showError = (message) => {
    errorMessage.textContent = message || '';
    errorMessage.classList.toggle('visible', Boolean(message));
  };

  const normalizeHeader = (value) => String(value ?? '')
    .trim().toLowerCase()
    .replace(/[\s_\-]+/g, '');

  const isIPv4 = (value) => {
    const parts = String(value ?? '').trim().split('.');
    return parts.length === 4 && parts.every(part => /^\d+$/.test(part) && Number(part) >= 0 && Number(part) <= 255);
  };

  const normalizeIP = (value) => {
    const ip = String(value ?? '').trim().replace(/\s+/g, '');
    return isIPv4(ip) ? ip : '';
  };

  const findIpColumn = (headers, rows) => {
    const preferred = new Set(['ip','ipaddress','ipaddr','minerip','ipminer','ipaddressminer']);
    const normalized = headers.map(normalizeHeader);
    const preferredIndex = normalized.findIndex(value => preferred.has(value));
    if (preferredIndex >= 0) return preferredIndex;

    const containsIndex = normalized.findIndex(value => value.includes('ip') && !value.includes('zipcode'));
    if (containsIndex >= 0) return containsIndex;

    let bestIndex = -1;
    let bestScore = 0;
    for (let col = 0; col < headers.length; col++) {
      let score = 0;
      for (let row = 0; row < Math.min(rows.length, 100); row++) {
        if (normalizeIP(rows[row][col])) score++;
      }
      if (score > bestScore) {
        bestScore = score;
        bestIndex = col;
      }
    }
    return bestScore > 0 ? bestIndex : -1;
  };

  const readWorkbook = async (file) => {
    if (typeof XLSX === 'undefined') throw new Error('Library Excel belum termuat. Refresh halaman lalu coba lagi.');
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array', raw: true });
    if (!workbook.SheetNames.length) throw new Error('File tidak memiliki sheet.');
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const matrix = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: true });
    if (!matrix.length) throw new Error('File kosong.');

    let headerIndex = matrix.findIndex(row => row.some(cell => normalizeHeader(cell).includes('ip')));
    if (headerIndex < 0) headerIndex = 0;

    const headers = matrix[headerIndex] || [];
    const dataRows = matrix.slice(headerIndex + 1).filter(row => row.some(cell => String(cell ?? '').trim() !== ''));
    const ipColumn = findIpColumn(headers, dataRows);

    if (ipColumn < 0) throw new Error('Kolom IP tidak ditemukan. Pastikan file memiliki kolom IP atau IP Address.');

    state.rows = dataRows;
    state.ipColumn = ipColumn;
    state.file = file;

    const validCount = dataRows.reduce((count, row) => count + (normalizeIP(row[ipColumn]) ? 1 : 0), 0);
    fileName.textContent = file.name;
    fileStatus.textContent = `Kolom IP: ${headers[ipColumn] || `Kolom ${ipColumn + 1}`} • ${validCount.toLocaleString('id-ID')} IP valid dari ${dataRows.length.toLocaleString('id-ID')} baris`;
    processBtn.disabled = validCount === 0;
    showError('');
    resultsSection.hidden = true;
  };

  const renderStats = (values) => {
    const cards = [
      ['Total IP', values.total.toLocaleString('id-ID'), 'Seluruh IP valid yang dibaca'],
      ['Unique IP', values.unique.toLocaleString('id-ID'), 'IP unik dalam history'],
      ['DC Teridentifikasi', values.recognized.toLocaleString('id-ID'), 'Kemunculan IP yang punya mapping'],
      ['Bukan IP DC', values.unrecognized.toLocaleString('id-ID'), 'Kemunculan IP tanpa mapping']
    ];
    stats.innerHTML = cards.map(([label, value, sub]) =>
      `<div class="dc-stat"><span class="dc-stat-label">${label}</span><strong class="dc-stat-value">${value}</strong><span class="dc-stat-sub">${sub}</span></div>`
    ).join('');
  };

  const extractDcName = (location) => {
    const parts = String(location ?? '').trim().split('.');
    if (parts.length >= 2 && parts[0].toUpperCase() === 'GBE' && parts[1].trim()) {
      return parts[1].trim();
    }
    return '';
  };

  const calculate = () => {
    const counts = new Map();
    const uniqueIps = new Set();
    let total = 0;
    let recognized = 0;

    for (const row of state.rows) {
      const ip = normalizeIP(row[state.ipColumn]);
      if (!ip) continue;
      total++;
      uniqueIps.add(ip);

      const location = window.masterData && window.masterData[ip];
      const dcName = extractDcName(location);
      if (!dcName) continue;

      recognized++;
      counts.set(dcName, (counts.get(dcName) || 0) + 1);
    }

    const unrecognized = total - recognized;
    state.total = total;
    const ranking = [...counts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, undefined, { numeric: true }))
      .slice(0, 5).map(item => ({ ...item, rate: total ? item.count / total * 100 : 0 }));

    state.ranking = ranking;
    renderStats({ total, unique: uniqueIps.size, recognized, unrecognized });
    rankingBody.innerHTML = ranking.map((item, index) => '<tr><td class="dc-rank">#'+(index+1)+'</td><td class="dc-name">'+item.name+'</td><td class="dc-count">'+item.count.toLocaleString('id-ID')+'</td><td class="dc-rate">'+formatRate(item.rate)+'</td><td><button class="dc-progress-btn" type="button" data-progress-dc="'+encodeURIComponent(item.name)+'"><i class="fas fa-chart-line"></i> Progress</button></td></tr>').join('');

    emptyRanking.hidden = ranking.length !== 0;
    resultNote.textContent = ranking.length
      ? `Menampilkan 5 DC teratas dari ${counts.size.toLocaleString('id-ID')} Nama DC yang teridentifikasi. Perhitungan menggunakan setiap kemunculan IP, bukan hanya IP unik.`
      : 'Tidak ada Nama DC yang dapat diambil dari mapping master-data.js.';

    resultsSection.hidden = false;
  };

  const renderProgress = async () => { const rows=state.progressRows.filter(x=>String(x.dcName||'').trim()===state.selectedDc); progressTitle.textContent='Progress '+state.selectedDc; lifecycleSelect.innerHTML=rows.length?rows.map(x=>'<option value="'+x.progressId+'">Lifecycle #'+x.lifecycleNo+' • Baseline '+Number(x.baselineCount||0).toLocaleString('id-ID')+' IP</option>').join(''):'<option value="">Belum ada lifecycle</option>'; if(!state.selectedProgressId||!rows.some(x=>x.progressId===state.selectedProgressId))state.selectedProgressId=rows[0]?.progressId||''; lifecycleSelect.value=state.selectedProgressId; const cur=rows.find(x=>x.progressId===state.selectedProgressId); if(!cur){progressSummary.innerHTML='';progressHistoryBody.innerHTML='';progressEmpty.hidden=false;checkpointBtn.disabled=true;return;} checkpointBtn.disabled=false; progressSummary.innerHTML=[['Baseline',Number(cur.baselineCount||0).toLocaleString('id-ID')],['Baseline Rate',formatRate(cur.baselineRate)],['Current',Number(cur.currentCount||0).toLocaleString('id-ID')],['Current Rate',formatRate(cur.currentRate)],['Progress',formatRate(cur.progressPercent)]].map(x=>'<div class="dc-progress-metric"><span>'+x[0]+'</span><strong>'+x[1]+'</strong></div>').join(''); const x=await apiGet('getDcProgressHistory',{progressId:cur.progressId}); const history=Array.isArray(x.rows)?x.rows:[]; progressHistoryBody.innerHTML=history.map(row=>'<tr><td>#'+row.checkpointNo+'</td><td>'+(row.periodStart?new Date(row.periodStart).toLocaleString('id-ID'):'-')+'</td><td class="dc-count">'+Number(row.count||0).toLocaleString('id-ID')+'</td><td class="dc-rate">'+formatRate(row.rate)+'</td><td>#'+(row.rank||'-')+'</td><td class="'+(row.isTop5?'yes':'no')+'">'+(row.isTop5?'Ya':'Tidak')+'</td><td class="dc-progress-value">'+formatRate(row.progressPercent)+'</td></tr>').join(''); progressEmpty.hidden=history.length!==0; };
  const openProgress = async dc => { state.selectedDc=dc; state.selectedProgressId=''; progressPanel.hidden=false; await renderProgress(); progressPanel.scrollIntoView({behavior:'smooth',block:'nearest'}); };
  const startLifecycle = async () => { try { const p=getPeriod(),item=state.ranking.find(x=>x.name===state.selectedDc); if(!item)throw new Error('DC tidak ditemukan pada Top 5.'); newLifecycleBtn.disabled=true; const x=await apiPost({action:'startDcProgress',dcName:item.name,baselineCount:item.count,baselineTotal:state.total,baselineRate:item.rate,baselineRank:state.ranking.findIndex(y=>y.name===item.name)+1,baselineTop5:true,...p}); await loadProgress(); state.selectedProgressId=x.progress?.progressId||''; await renderProgress(); } catch(e){showError(e.message)} finally{newLifecycleBtn.disabled=false} };
  const saveCheckpoint = async () => { try { const p=getPeriod(),item=state.ranking.find(x=>x.name===state.selectedDc),cur=state.progressRows.find(x=>x.progressId===state.selectedProgressId); if(!item||!cur)throw new Error('Lifecycle atau DC tidak tersedia.'); checkpointBtn.disabled=true; const x=await apiPost({action:'saveDcProgressCheckpoint',progressId:cur.progressId,count:item.count,total:state.total,rate:item.rate,rank:state.ranking.findIndex(y=>y.name===item.name)+1,isTop5:true,...p,requestId:'web-'+cur.progressId+'-'+Date.now()}); await loadProgress(); state.selectedProgressId=x.progress?.progressId||cur.progressId; await renderProgress(); } catch(e){showError(e.message)} finally{checkpointBtn.disabled=false} };
  const updatePeriodDuration = () => { if(!periodStart.value||!periodEnd.value){periodDuration.textContent='Durasi: -';return;} const s=new Date(periodStart.value),e=new Date(periodEnd.value); periodDuration.textContent=e>s?'Durasi: '+formatDuration((e-s)/60000):'Durasi: tidak valid'; };

  const handleFile = async (file) => {
    if (!file) return;
    const allowed = /\.(xls|xlsx|csv)$/i.test(file.name);
    if (!allowed) {
      showError('Format file tidak didukung. Gunakan .xls, .xlsx, atau .csv.');
      return;
    }

    try {
      processBtn.disabled = true;
      fileStatus.textContent = 'Membaca file...';
      await readWorkbook(file);
    } catch (error) {
      state.file = null;
      state.rows = [];
      state.ipColumn = -1;
      fileName.textContent = file.name;
      fileStatus.textContent = 'File belum siap diproses.';
      showError(error instanceof Error ? error.message : 'Gagal membaca file.');
    }
  };

  periodStart.addEventListener('change',updatePeriodDuration); periodEnd.addEventListener('change',updatePeriodDuration); lifecycleSelect.addEventListener('change',()=>{state.selectedProgressId=lifecycleSelect.value;renderProgress()}); newLifecycleBtn.addEventListener('click',startLifecycle); checkpointBtn.addEventListener('click',saveCheckpoint); closeProgressBtn.addEventListener('click',()=>{progressPanel.hidden=true}); rankingBody.addEventListener('click',e=>{const b=e.target.closest('[data-progress-dc]');if(b)openProgress(decodeURIComponent(b.dataset.progressDc||''))}); loadProgress();

  historyFile.addEventListener('change', (event) => handleFile(event.target.files?.[0]));

  ['dragenter', 'dragover'].forEach(type => uploadArea.addEventListener(type, (event) => {
    event.preventDefault();
    uploadArea.classList.add('drag-over');
  }));
  ['dragleave', 'drop'].forEach(type => uploadArea.addEventListener(type, (event) => {
    event.preventDefault();
    uploadArea.classList.remove('drag-over');
  }));
  uploadArea.addEventListener('drop', (event) => handleFile(event.dataTransfer?.files?.[0]));

  processBtn.addEventListener('click', () => {
    if (!state.file || state.ipColumn < 0) return;
    showError('');
    loading.hidden = false;
    processBtn.disabled = true;
    setTimeout(() => {
      try {
        calculate();
      } finally {
        loading.hidden = true;
        processBtn.disabled = false;
      }
    }, 0);
  });

  clearBtn.addEventListener('click', () => {
    state.file = null;
    state.rows = [];
    state.ipColumn = -1;
    historyFile.value = '';
    fileName.textContent = 'Belum ada file dipilih';
    fileStatus.textContent = 'Belum ada data.';
    processBtn.disabled = true;
    resultsSection.hidden = true;
    progressPanel.hidden = true;
    stats.innerHTML = '';
    rankingBody.innerHTML = '';
    emptyRanking.hidden = true;
    resultNote.textContent = '';
    showError('');
  });

  const menuToggle = $('menuToggle');
  const sidebar = $('sidebar');
  const overlay = $('sidebarOverlay');
  if (menuToggle && sidebar && overlay) {
    const closeSidebar = () => {
      sidebar.classList.remove('active');
      overlay.classList.remove('active');
      menuToggle.setAttribute('aria-expanded', 'false');
    };
    menuToggle.addEventListener('click', () => {
      const active = sidebar.classList.toggle('active');
      overlay.classList.toggle('active', active);
      menuToggle.setAttribute('aria-expanded', String(active));
    });
    overlay.addEventListener('click', closeSidebar);
    sidebar.querySelectorAll('a').forEach(link => link.addEventListener('click', closeSidebar));
    window.addEventListener('resize', () => { if (window.innerWidth > 780) closeSidebar(); });
  }
})();