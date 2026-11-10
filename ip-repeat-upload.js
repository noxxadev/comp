(() => {
'use strict';
const $=id=>document.getElementById(id);
const fileInput=$('excelFile'),uploadArea=$('fileUploadArea'),fileName=$('fileName'),processBtn=$('processBtn');
const uploadError=$('uploadError'),uploadMessage=$('uploadMessage'),loading=$('loading');
const masterDataStatus=$('masterDataStatus'),sharedDataStatus=$('sharedDataStatus'),resultSummary=$('resultSummary');
const menuToggle=$('menuToggle'),sidebar=$('sidebar'),sidebarOverlay=$('sidebarOverlay');
let selectedFile=null,saving=false;
function normalizeIp(value){if(value===null||value===undefined)return '';return String(value).replace(/\s+/g,'').trim();}
function isIpv4(value){const parts=value.split('.');return parts.length===4&&parts.every(part=>{if(!/^\d{1,3}$/.test(part))return false;const n=Number(part);return n>=0&&n<=255;});}
function findIpColumn(headers){const normalized=headers.map(h=>String(h??'').replace(/\uFEFF/g,'').replace(/\s+/g,'').toLowerCase());let i=normalized.findIndex(h=>h==='ip');if(i!==-1)return i;return normalized.findIndex(h=>h==='ipaddress'||h==='ipaddr');}
function getZoneFromMasterName(name){if(!name)return '-';const m=String(name).trim().match(/^GBE\.([A-Z])/i);return m?'Line '+m[1].toUpperCase():'-';}
function showError(message){uploadError.textContent=message;uploadError.classList.add('visible');uploadMessage.classList.remove('visible');}
function showMessage(message,isError=false){uploadMessage.textContent=message;uploadMessage.classList.toggle('visible',Boolean(message));uploadMessage.classList.toggle('error',Boolean(isError));if(message)uploadError.classList.remove('visible');}
function getSheetsConfig(){return window.CompGoogleSheetsConfig||{webAppUrl:'',requestKey:''};}
async function getSharedIpRepeat(){
 const c=getSheetsConfig(),url=String(c.webAppUrl||'').trim();if(!url)throw new Error('Google Sheets belum dikonfigurasi.');
 const p=new URLSearchParams({action:'getIpRepeat'});if(c.requestKey)p.set('requestKey',String(c.requestKey));
 const response=await fetch(url+(url.includes('?')?'&':'?')+p.toString(),{method:'GET',cache:'no-store'}),body=await response.text();let result;
 try{result=JSON.parse(body);}catch(_){throw new Error('Google Apps Script mengembalikan response tidak valid (HTTP '+response.status+').');}
 if(!response.ok||!result?.ok)throw new Error(result?.error||'Gagal membaca dataset bersama (HTTP '+response.status+').');return result;
}
async function saveSharedIpRepeat(rows,sourceFileName){
 const c=getSheetsConfig(),url=String(c.webAppUrl||'').trim();if(!url)throw new Error('Google Sheets belum dikonfigurasi.');
 const response=await fetch(url,{method:'POST',headers:{'Content-Type':'text/plain;charset=UTF-8'},body:JSON.stringify({action:'replaceIpRepeat',rows,sourceFileName,requestKey:String(c.requestKey||'')})});
 const body=await response.text();let result;
 try{result=JSON.parse(body);}catch(_){throw new Error('Google Apps Script mengembalikan response tidak valid (HTTP '+response.status+').');}
 if(!response.ok||!result?.ok)throw new Error(result?.error||'Gagal menyimpan IP Repeat bersama (HTTP '+response.status+').');
 if(Number(result.saved||0)!==rows.length)throw new Error('Google Sheets menyimpan '+(result.saved||0)+' dari '+rows.length+' IP.');return result;
}
function setFile(file){
 uploadError.classList.remove('visible');showMessage('');if(!file)return;
 const ext=file.name.split('.').pop().toLowerCase();if(!['xls','xlsx'].includes(ext)){selectedFile=null;processBtn.disabled=true;fileName.textContent='Belum ada file';showError('Format file tidak didukung. Gunakan file .xls atau .xlsx.');return;}
 selectedFile=file;fileName.textContent=file.name;processBtn.disabled=false;uploadArea.classList.add('has-file');
}
async function processFile(){
 if(!selectedFile||saving)return;uploadError.classList.remove('visible');showMessage('');saving=true;loading.classList.add('visible');processBtn.disabled=true;
 try{
  const buffer=await selectedFile.arrayBuffer(),workbook=XLSX.read(buffer,{type:'array',cellDates:false});
  if(!workbook.SheetNames.length)throw new Error('File Excel tidak memiliki worksheet.');
  const sheet=workbook.Sheets[workbook.SheetNames[0]],matrix=XLSX.utils.sheet_to_json(sheet,{header:1,defval:'',raw:false});
  let headerRowIndex=-1,ipColumnIndex=-1;
  for(let i=0;i<Math.min(matrix.length,20);i++){const candidate=findIpColumn(matrix[i]||[]);if(candidate!==-1){headerRowIndex=i;ipColumnIndex=candidate;break;}}
  if(headerRowIndex===-1)throw new Error('Kolom IP tidak ditemukan. Pastikan file memiliki header bernama IP.');
  const counts=new Map();let validIpRows=0;
  for(let i=headerRowIndex+1;i<matrix.length;i++){const ip=normalizeIp(matrix[i]?.[ipColumnIndex]);if(!ip||!isIpv4(ip))continue;validIpRows++;counts.set(ip,(counts.get(ip)||0)+1);}
  if(!counts.size)throw new Error('Tidak ditemukan IP IPv4 valid. Dataset Google Sheets lama tidak diubah.');
  const rows=Array.from(counts,([ip,repeat])=>{
   const name=window.masterData&&Object.prototype.hasOwnProperty.call(window.masterData,ip)?String(window.masterData[ip]??'').trim():null;
   return {ip,name:name||'Bukan IP DC',zone:getZoneFromMasterName(name),repeat};
  });
  const result=await saveSharedIpRepeat(rows,selectedFile.name),mapped=rows.filter(r=>r.name!=='Bukan IP DC').length,unmatched=rows.length-mapped;
  const stamp=result.updatedAt?new Date(result.updatedAt).toLocaleString('id-ID'):'waktu tidak tersedia';
  resultSummary.textContent=validIpRows.toLocaleString('id-ID')+' baris IP valid → '+rows.length.toLocaleString('id-ID')+' IP unik. '+mapped.toLocaleString('id-ID')+' IP cocok dengan Master Data; '+unmatched.toLocaleString('id-ID')+' IP tidak terpetakan.';
  sharedDataStatus.textContent=rows.length.toLocaleString('id-ID')+' IP • Google Sheets • '+stamp;
  showMessage('Berhasil menyimpan '+rows.length.toLocaleString('id-ID')+' IP unik ke database IP Repeat Current. Buka IP Repeat Analyzer untuk melihat hasil.');
 }catch(error){console.error(error);showError(error.message||'Gagal memproses file Excel.');}
 finally{saving=false;loading.classList.remove('visible');processBtn.disabled=!selectedFile;}
}
async function loadSharedStatus(){try{const r=await getSharedIpRepeat(),n=Array.isArray(r.rows)?r.rows.length:0,stamp=r.updatedAt?new Date(r.updatedAt).toLocaleString('id-ID'):'';sharedDataStatus.textContent=n?n.toLocaleString('id-ID')+' IP • Google Sheets'+(stamp?' • '+stamp:''):'Database belum memiliki dataset';}catch(e){sharedDataStatus.textContent='Tidak dapat terhubung';console.warn('Status dataset bersama tidak tersedia:',e);}}
fileInput.addEventListener('change',e=>setFile(e.target.files?.[0]));
['dragenter','dragover'].forEach(type=>uploadArea.addEventListener(type,e=>{e.preventDefault();uploadArea.classList.add('drag-over');}));
['dragleave','drop'].forEach(type=>uploadArea.addEventListener(type,e=>{e.preventDefault();uploadArea.classList.remove('drag-over');}));
uploadArea.addEventListener('drop',e=>setFile(e.dataTransfer.files?.[0]));processBtn.addEventListener('click',processFile);
menuToggle?.addEventListener('click',()=>{sidebar.classList.toggle('active');sidebarOverlay.classList.toggle('active');});
sidebarOverlay?.addEventListener('click',()=>{sidebar.classList.remove('active');sidebarOverlay.classList.remove('active');});
window.addEventListener('resize',()=>{if(window.innerWidth>1024){sidebar.classList.remove('active');sidebarOverlay.classList.remove('active');}});
masterDataStatus.textContent=window.masterData&&typeof window.masterData==='object'?Object.keys(window.masterData).length.toLocaleString('id-ID')+' IP':'Tidak tersedia';
loadSharedStatus();
})();