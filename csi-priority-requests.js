(() => {
'use strict';
const $=id=>document.getElementById(id);
const TREATMENTS=["Pencopotan Frame","Pemasangan Frame","Penyemprotan Celldeck","Pembersihan Kisi-kisi","Perapihan/Penggantian Kain Flanel","Penggantian Celldeck","Perapihan pipa dan pengecekan saluran air"];
let requests=[],busy=false,loading=false,actionBusy=false,retryGroupId='',dcReferenceRows=[],dcReferenceLoading=false;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function notice(message,kind='info'){$('priorityNotice').textContent=message;$('priorityNotice').dataset.kind=kind;$('priorityNotice').hidden=!message}

function actionModal({title,description='',fields=[],confirmText='Simpan',danger=false}){return new Promise(resolve=>{let root=document.getElementById('priorityActionModal');if(!root){root=document.createElement('div');root.id='priorityActionModal';root.className='priority-action-modal';root.hidden=true;document.body.appendChild(root)}const fieldHtml=fields.map(f=>'<label class="priority-modal-field">'+esc(f.label)+(f.type==='textarea'?'<textarea name="'+esc(f.name)+'" rows="4" '+(f.required?'required':'')+' placeholder="'+esc(f.placeholder||'')+'"></textarea>':'<input name="'+esc(f.name)+'" type="'+esc(f.type||'text')+'" '+(f.required?'required':'')+' '+(f.value?'value="'+esc(f.value)+'"':'')+'>')+'</label>').join('');root.innerHTML='<div class="priority-modal-backdrop" data-modal-close></div><section class="priority-modal-panel" role="dialog" aria-modal="true" aria-labelledby="priorityModalTitle"><div class="priority-modal-head"><h2 id="priorityModalTitle">'+esc(title)+'</h2><button type="button" class="priority-modal-x" data-modal-close aria-label="Tutup">×</button></div>'+(description?'<p class="priority-modal-description">'+esc(description)+'</p>':'')+'<form class="priority-modal-form">'+fieldHtml+'<div class="priority-modal-actions"><button type="button" class="priority-modal-cancel" data-modal-close>Batal</button><button type="submit" class="priority-modal-submit '+(danger?'danger':'')+'">'+esc(confirmText)+'</button></div></form></section>';root.hidden=false;document.body.classList.add('priority-modal-open');const finish=value=>{root.hidden=true;document.body.classList.remove('priority-modal-open');root.innerHTML='';document.removeEventListener('keydown',onKey);resolve(value)};const onKey=e=>{if(e.key==='Escape')finish(null)};root.querySelectorAll('[data-modal-close]').forEach(el=>el.addEventListener('click',()=>finish(null)));root.querySelector('form').addEventListener('submit',e=>{e.preventDefault();const data={};fields.forEach(f=>data[f.name]=String(new FormData(e.currentTarget).get(f.name)||'').trim());finish(data)});document.addEventListener('keydown',onKey);root.querySelector('input,textarea')?.focus()})}
function session(){return window.CompAuth?.getSession?.()||localStorage.getItem('comp.auth.session')||''}
function url(){const value=String(window.CompCsiConfig?.webAppUrl||'').trim();if(!value)throw new Error('URL Web App CSI belum diatur.');return value}
async function api(action,payload={}){const res=await fetch(url(),{method:'POST',headers:{'Content-Type':'text/plain;charset=UTF-8'},body:JSON.stringify({action,session:session(),...payload}),cache:'no-store',credentials:'omit'});let data;try{data=JSON.parse(await res.text())}catch(_){throw new Error('Respons CSI tidak valid.')}if(!res.ok||!data?.ok)throw new Error(data?.error||'Permintaan gagal.');return data}
function dcNames(){const names=new Set();Object.values(window.masterData||{}).forEach(v=>{const m=String(v||'').trim().toUpperCase().match(/^(GBE\.[A-F]\d+[A-Z]?)(?:\.|$)/);if(m)names.add(m[1].replace(/^GBE\./,''))});return [...names].sort((a,b)=>a.localeCompare(b,undefined,{numeric:true}))}
function selected(){return [...$('requestDcList').querySelectorAll('input:checked')].map(el=>el.value)}
function localDateKey(date=new Date()){return date.getFullYear()+'-'+String(date.getMonth()+1).padStart(2,'0')+'-'+String(date.getDate()).padStart(2,'0')}
function recentCleaningWarnings(rows,dcs,frameSide,jobType){
  if(jobType!=='Cleaning')return [];
  const today=localDateKey();
  const todayUtc=Date.parse(today+'T00:00:00Z');
  const sides=frameSide==='Both'?['A','B']:[frameSide];
  const latest=new Map();
  (Array.isArray(rows)?rows:[]).forEach(row=>{
    const dc=String(row?.dcName||'').trim().toUpperCase().replace(/^GBE\./,'');
    const side=String(row?.frameSide||'').trim().toUpperCase();
    const date=String(row?.lastCleaningDate||'').slice(0,10);
    if(!dc||!['A','B'].includes(side)||!/^\d{4}-\d{2}-\d{2}$/.test(date))return;
    const age=Math.floor((todayUtc-Date.parse(date+'T00:00:00Z'))/86400000);
    if(age<0||age>=7)return;
    const key=dc+'|'+side;
    if(!latest.has(key)||date>latest.get(key))latest.set(key,date);
  });
  const warnings=[];
  dcs.forEach(dc=>sides.forEach(side=>{
    const date=latest.get(String(dc).trim().toUpperCase().replace(/^GBE\./,'')+'|'+side);
    if(date)warnings.push({dc,side,date});
  }));
  return warnings;
}
function formatWarningDate(value){const parts=String(value).split('-').map(Number);return parts.length===3?new Intl.DateTimeFormat('id-ID',{day:'2-digit',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(Date.UTC(parts[0],parts[1]-1,parts[2]))):value}
function updatePicker(){const boxes=[...$('requestDcList').querySelectorAll('input')],picked=boxes.filter(b=>b.checked);$('requestDcCount').textContent=picked.length+' DC dipilih';$('requestDcSummary').textContent=picked.length?picked.map(b=>b.value).join(', '):'Pilih Nama DC';$('requestDcAll').checked=boxes.length>0&&picked.length===boxes.length;$('requestDcAll').indeterminate=picked.length>0&&picked.length<boxes.length}
function initPicker(){const names=dcNames();if(!names.length)throw new Error('Nama DC tidak ditemukan dari master-data.js.');$('requestDcList').innerHTML=names.map(dc=>'<label class="csi-dc-option" data-search="'+esc(dc.toLowerCase())+'"><input type="checkbox" value="'+esc(dc)+'"><span>'+esc(dc)+'</span></label>').join('');updatePicker()}

function dateAge(date){
  const value=String(date||'').slice(0,10);
  if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return null;
  const today=localDateKey(),todayUtc=Date.parse(today+'T00:00:00Z'),dateUtc=Date.parse(value+'T00:00:00Z');
  if(!Number.isFinite(dateUtc)||dateUtc>todayUtc)return null;
  return Math.floor((todayUtc-dateUtc)/86400000);
}
function formatAge(age){return age===null?'Belum ada data':age+' hari'}
function buildDcReferenceRows(rows){
  const byDc=new Map();
  dcNames().forEach(dc=>byDc.set(dc,{dc,sides:{A:{cleanDate:'',replaceDate:''},B:{cleanDate:'',replaceDate:''}}}));
  (Array.isArray(rows)?rows:[]).forEach(row=>{
    const dc=String(row?.dcName||'').trim().toUpperCase().replace(/^GBE\./,'');
    const side=String(row?.frameSide||'').trim().toUpperCase();
    if(!byDc.has(dc)||!['A','B'].includes(side))return;
    const target=byDc.get(dc).sides[side];
    const clean=String(row?.lastCleaningDate||'').slice(0,10);
    const replace=String(row?.lastReplaceDate||'').slice(0,10);
    if(/^\d{4}-\d{2}-\d{2}$/.test(clean)&&(!target.cleanDate||clean>target.cleanDate))target.cleanDate=clean;
    if(/^\d{4}-\d{2}-\d{2}$/.test(replace)&&(!target.replaceDate||replace>target.replaceDate))target.replaceDate=replace;
  });
  return [...byDc.values()].map(item=>{
    const cleanA=dateAge(item.sides.A.cleanDate),cleanB=dateAge(item.sides.B.cleanDate);
    const replaceA=dateAge(item.sides.A.replaceDate),replaceB=dateAge(item.sides.B.replaceDate);
    const cleanAges=[cleanA,cleanB].filter(v=>v!==null),replaceAges=[replaceA,replaceB].filter(v=>v!==null);
    return {...item,cleanA,cleanB,replaceA,replaceB,cleanAge:cleanAges.length?Math.max(...cleanAges):null,replaceAge:replaceAges.length?Math.max(...replaceAges):null};
  }).sort((a,b)=>(b.cleanAge??-1)-(a.cleanAge??-1)||a.dc.localeCompare(b.dc,undefined,{numeric:true}));
}
function renderDcReference(){
  const list=$('dcReferenceList'),query=String($('dcReferenceSearch')?.value||'').trim().toLowerCase();
  const matches=dcReferenceRows.filter(row=>row.dc.toLowerCase().includes(query));
  const shown=query?matches:matches.slice(0,5);
  $('dcReferenceCount').textContent=query?matches.length+' DC ditemukan':dcReferenceRows.length+' DC';
    if(!shown.length){list.innerHTML='<p class="csi-empty">DC tidak ditemukan.</p>';return}
  list.innerHTML=shown.map(row=>{
    const detail=['A','B'].map(side=>{
      const s=row.sides[side],clean=dateAge(s.cleanDate),replace=dateAge(s.replaceDate);
      return '<div class="dc-reference-side"><b>Sisi '+side+'</b><span>Cleaning: '+esc(formatAge(clean))+'</span><span>Replace: '+esc(formatAge(replace))+'</span></div>';
    }).join('');
    const cleanClass=row.cleanAge!==null&&row.cleanAge>=30?' overdue':'';
    return '<details class="dc-reference-row"><summary><span class="dc-reference-name">'+esc(row.dc)+'</span><span class="dc-reference-value'+cleanClass+'">'+esc(row.cleanAge===null?'—':formatAge(row.cleanAge))+'</span><span class="dc-reference-value dc-reference-replace">'+esc(row.replaceAge===null?'—':formatAge(row.replaceAge))+'</span></summary><div class="dc-reference-detail">'+detail+'</div></details>';
  }).join('');
}
async function loadDcReference(){
  if(dcReferenceLoading)return;
  dcReferenceLoading=true;
  const list=$('dcReferenceList');
  try{const result=await api('getHighTempSummary');dcReferenceRows=buildDcReferenceRows(result.rows);renderDcReference()}
  catch(err){list.innerHTML='<p class="csi-empty">Gagal memuat referensi cleaning dan replace.</p>';$('dcReferenceCount').textContent='Data tidak tersedia'}
  finally{dcReferenceLoading=false}
}

function groupStatus(items){const st=items.map(x=>String(x.status||''));if(st.includes('Menunggu Konfirmasi Pembatalan'))return 'Menunggu Konfirmasi Pembatalan';if(st.includes('Pending'))return 'Pending';if(st.includes('Sedang Dikerjakan'))return 'Sedang Dikerjakan';if(st.includes('Diterima'))return 'Diterima';if(st.includes('Dijadwalkan Ulang'))return 'Dijadwalkan Ulang';if(st.every(x=>x==='Selesai'))return 'Selesai';if(st.includes('Dibatalkan'))return st.includes('Selesai')?'Dibatalkan sebagian':'Dibatalkan';if(st.includes('Ditolak'))return st.includes('Selesai')?'Sebagian ditolak':'Ditolak';return st[0]||''}
function render(){const box=$('priorityRequestList');const visible=requests.filter(r=>!['Selesai','Dibatalkan'].includes(String(r.status||'')));if(!visible.length){box.innerHTML='<p class="csi-empty">Tidak ada request yang perlu ditindaklanjuti.</p>';return}const map=new Map();visible.forEach(r=>{if(!map.has(r.groupId))map.set(r.groupId,[]);map.get(r.groupId).push(r)});const lines=[...map.entries()].flatMap(([id,items])=>items.map((r,index)=>{const status=String(r.status||''),cls=status==='Sedang Dikerjakan'?'working':status==='Pending'?'pending':'';const requested=r.frameSide==='Both'?['A','B']:[r.frameSide],done=Array.isArray(r.completedSides)?r.completedSides:[],progress=requested.map(side=>side+': '+(done.includes(side)?'Selesai':'Belum')).join(' · ');let actions='';if(index===0){const group=groupStatus(items);if(!['Selesai','Dibatalkan','Ditolak','Menunggu Konfirmasi Pembatalan'].includes(group))actions='<button data-cancel="'+esc(id)+'">Batalkan</button>';if(group==='Ditolak')actions='<button data-retry="'+esc(id)+'">Ajukan Ulang</button>';if(group==='Menunggu Konfirmasi Pembatalan'&&String(r.cancelRequestedByRole||'').toUpperCase()!=='ADMIN')actions='<button data-confirm-cancel="'+esc(id)+'">Konfirmasi</button><button data-decline-cancel="'+esc(id)+'">Lanjutkan</button>'}const details='<div><b>Alasan:</b> '+esc(r.reason)+'</div>'+(r.pendingReason?'<div><b>Pending:</b> '+esc(r.pendingReason)+'</div>':'')+(r.rejectReason?'<div><b>Penolakan:</b> '+esc(r.rejectReason)+'</div>':'')+(r.rescheduleReason?'<div><b>Jadwal ulang:</b> '+esc(r.rescheduleReason)+'</div>':'');return '<tr><td><b>'+esc(r.dcName)+'</b><small> #'+esc(String(id).slice(0,8))+'</small></td><td><span class="priority-tag '+(r.priority==='Mendesak'?'urgent':'high')+'">'+esc(r.priority)+'</span></td><td>'+esc(r.jobType)+'</td><td>'+esc(r.frameSide==='Both'?'A+B':r.frameSide)+'</td><td><span class="priority-status '+cls+'">'+esc(status)+'</span></td><td>'+esc(progress)+'</td><td><details class="priority-table-details"><summary>Lihat detail</summary>'+details+(r.scheduledDate?'<div><b>Jadwal:</b> '+esc(r.scheduledDate)+'</div>':'')+'</details></td><td><div class="priority-request-actions">'+actions+'</div></td></tr>'}));box.innerHTML='<div class="priority-table-scroll"><table class="priority-monitor-table"><thead><tr><th>Nama DC</th><th>Prioritas</th><th>Jenis</th><th>Sisi</th><th>Status</th><th>Progres</th><th>Keterangan</th><th>Aksi</th></tr></thead><tbody>'+lines.join('')+'</tbody></table></div>'}
async function load(silent=false){if(loading)return;loading=true;if(!silent)$('refreshPriorityBtn').disabled=true;try{const r=await api('listPriorityRequests');requests=Array.isArray(r.requests)?r.requests:[];render()}catch(err){if(!silent)throw err}finally{loading=false;if(!silent)$('refreshPriorityBtn').disabled=false}}
$('requestDcTrigger').addEventListener('click',()=>{$('requestDcPanel').hidden=!$('requestDcPanel').hidden;$('requestDcTrigger').setAttribute('aria-expanded',String(!$('requestDcPanel').hidden))});
$('requestDcDone').addEventListener('click',()=>{$('requestDcPanel').hidden=true;$('requestDcTrigger').setAttribute('aria-expanded','false')});
$('requestDcList').addEventListener('change',updatePicker);
$('requestDcAll').addEventListener('change',()=>{$('requestDcList').querySelectorAll('input').forEach(el=>{if(!el.closest('label').hidden)el.checked=$('requestDcAll').checked});updatePicker()});
$('requestDcSearch').addEventListener('input',()=>{const q=$('requestDcSearch').value.trim().toLowerCase();$('requestDcList').querySelectorAll('label').forEach(el=>el.hidden=!el.dataset.search.includes(q))});
function fillRetry(id){const rows=requests.filter(r=>r.groupId===id);if(!rows.length||rows.some(r=>r.status!=='Ditolak'))throw new Error('Hanya grup yang seluruhnya ditolak dapat diajukan ulang.');retryGroupId=id;const first=rows[0];$('requestDcList').querySelectorAll('input').forEach(b=>b.checked=rows.some(r=>String(r.dcName).replace(/^GBE\./,'')===b.value));updatePicker();$('requestSide').value=first.frameSide;$('requestJob').value=first.jobType;$('requestPriority').value=first.priority;$('requestDate').value=String(first.scheduledDate||'').slice(0,10);$('requestReason').value=first.reason;$('createPriorityBtn').textContent='Kirim Pengajuan Ulang';$('priorityRequestForm').scrollIntoView({behavior:'smooth',block:'start'});notice('Form pengajuan ulang dimuat. Jumlah DC dalam grup harus tetap sama.','info')}
$('priorityRequestForm').addEventListener('submit',async e=>{e.preventDefault();if(busy)return;const dcs=selected();if(!dcs.length){notice('Pilih minimal satu DC.','error');return}busy=true;$('createPriorityBtn').disabled=true;try{const frameSide=$('requestSide').value,jobType=$('requestJob').value;const history=await api('getHighTempSummary');const warnings=recentCleaningWarnings(history.rows,dcs,frameSide,jobType);if(warnings.length){const lines=warnings.map(item=>'• '+item.dc+' sisi '+item.side+' — cleaning terakhir '+formatWarningDate(item.date));const confirmation=await actionModal({title:'Konfirmasi Request Ulang Cleaning',description:'Ditemukan celldeck yang sudah di-cleaning dalam 7 hari terakhir:\n\n'+lines.join('\n')+'\n\nApakah Anda yakin ingin tetap mengirim request ini?',confirmText:'Tetap Request'});if(!confirmation)return}const payload={dcNames:dcs,frameSide,jobType,priority:$('requestPriority').value,reason:$('requestReason').value.trim(),scheduledDate:$('requestDate').value};if(retryGroupId){payload.groupId=retryGroupId;await api('retryPriorityRequest',payload)}else{const old=requests.filter(r=>r.status==='Ditolak'&&dcs.includes(String(r.dcName).replace(/^GBE\./,''))&&r.frameSide===frameSide&&r.jobType===jobType);if(old.length){const choice=await actionModal({title:'Riwayat request ditolak',description:'DC dan sisi yang sama pernah ditolak. Pilih Batal untuk menggunakan tombol Ajukan Ulang pada daftar lama, atau lanjutkan membuat request baru.',confirmText:'Buat Request Baru'});if(!choice)return}await api('createPriorityRequest',payload)}notice(retryGroupId?'Request lama berhasil diajukan ulang.':'Request berhasil dibuat untuk '+dcs.length+' DC.','success');retryGroupId='';$('createPriorityBtn').textContent='Kirim Request';e.target.reset();$('requestDcList').querySelectorAll('input').forEach(b=>b.checked=false);updatePicker();await load()}catch(err){notice(err.message||'Gagal membuat request.','error')}finally{busy=false;$('createPriorityBtn').disabled=false}});
$('priorityRequestList').addEventListener('click',async e=>{const retry=e.target.closest('[data-retry]');if(retry){try{fillRetry(retry.dataset.retry)}catch(err){notice(err.message,'error')}return}const cancel=e.target.closest('[data-cancel]'),confirmButton=e.target.closest('[data-confirm-cancel]'),declineButton=e.target.closest('[data-decline-cancel]');if(!cancel&&!confirmButton&&!declineButton)return;if(actionBusy)return;actionBusy=true;try{if(cancel){const d=await actionModal({title:'Batalkan Request',description:'Masukkan alasan pembatalan request prioritas ini.',fields:[{name:'reason',label:'Alasan pembatalan',type:'textarea',required:true,placeholder:'Tuliskan alasan...'}],confirmText:'Batalkan Request',danger:true});if(!d)return;await api('cancelPriorityRequest',{groupId:cancel.dataset.cancel,reason:d.reason});notice('Permintaan pembatalan diproses.','success')}else if(confirmButton){const d=await actionModal({title:'Konfirmasi Pembatalan',description:'Konfirmasi pembatalan request ini?',confirmText:'Ya, Batalkan',danger:true});if(!d)return;await api('respondCancelPriorityRequest',{groupId:confirmButton.dataset.confirmCancel,confirm:true});notice('Pembatalan dikonfirmasi.','success')}else if(declineButton){const d=await actionModal({title:'Lanjutkan Pekerjaan',description:'Tolak pembatalan dan lanjutkan pekerjaan?',confirmText:'Lanjutkan Pekerjaan'});if(!d)return;await api('respondCancelPriorityRequest',{groupId:declineButton.dataset.declineCancel,confirm:false});notice('Pembatalan ditolak; pekerjaan dilanjutkan.','success')}else return;await load()}catch(err){notice(err.message||'Aksi request gagal.','error')}finally{actionBusy=false}});
$('dcReferenceSearch').addEventListener('input',renderDcReference);
$('refreshDcReferenceBtn').addEventListener('click',()=>loadDcReference());
$('refreshPriorityBtn').addEventListener('click',()=>load().catch(e=>notice(e.message,'error')));
// Perbarui status secara berkala tanpa menghilangkan tombol Refresh manual.
const PRIORITY_AUTO_REFRESH_MS=15000;
setInterval(()=>{if(!busy&&!actionBusy&&!loading)load(true).catch(()=>{})},PRIORITY_AUTO_REFRESH_MS);
const toggle=$('menuToggle'),sidebar=$('sidebar'),overlay=$('sidebarOverlay');toggle?.addEventListener('click',()=>{const open=sidebar.classList.toggle('active');overlay.classList.toggle('active',open);toggle.setAttribute('aria-expanded',String(open))});overlay?.addEventListener('click',()=>{sidebar.classList.remove('active');overlay.classList.remove('active');toggle?.setAttribute('aria-expanded','false')});
(async()=>{try{if(!session()){location.replace('login.html');return}const access=await api('validateAccess');if(String(access.user?.role||'').toUpperCase()!=='ADMIN'){location.replace('index.html');return}initPicker();await Promise.all([load(),loadDcReference()])}catch(e){notice(e.message||'Gagal memuat request.','error');$('priorityRequestList').innerHTML='<p class="csi-empty">Gagal memuat request. Periksa konfigurasi dan deployment CSI.</p>'}})();
})();