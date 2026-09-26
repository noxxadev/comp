(() => {
  'use strict';
  function getConfig(){return window.CompGoogleSheetsConfig||{webAppUrl:'',requestKey:''};}
  async function loadHistory(limit=2000){
    const config=getConfig(),baseUrl=String(config.webAppUrl||'').trim();
    if(!baseUrl) throw new Error('Google Sheets belum dikonfigurasi.');
    const params=new URLSearchParams({action:'getWorkHistory',limit:String(limit)});
    if(config.requestKey) params.set('requestKey',String(config.requestKey));
    const separator=baseUrl.includes('?')?'&':'?';
    const response=await fetch(baseUrl+separator+params.toString(),{method:'GET',cache:'no-store',credentials:'omit',redirect:'follow'});
    const responseText=await response.text(); let result;
    try{result=JSON.parse(responseText);}catch(_){throw new Error('Response Work History tidak valid (HTTP '+response.status+').');}
    if(!response.ok||!result?.ok) throw new Error(result?.error||'Gagal membaca Work History (HTTP '+response.status+').');
    return result;
  }
  function normalizeSerial(value){return String(value??'').replace(/\s+/g,'').trim().toUpperCase();}
  function getSelectedSerial(){return new URLSearchParams(window.location.search).get('serial')||'';}
  function getTodayInputValue(){const now=new Date();return now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0')+'-'+String(now.getDate()).padStart(2,'0');}
  function normalizeEngineer(value){return String(value??'').trim().toLowerCase();}
  function getSelectedDate(){const input=document.getElementById('historyDate');return String(input?.value||'').trim();}
  function getRowDate(row){
    const date=new Date(String(row?.timestamp||'').trim());
    if(Number.isNaN(date.getTime())) return '';
    return date.getFullYear()+'-'+String(date.getMonth()+1).padStart(2,'0')+'-'+String(date.getDate()).padStart(2,'0');
  }
  function formatTimestamp(value){
    const date=new Date(String(value??'').trim());
    if(Number.isNaN(date.getTime())) return String(value??'').trim()||'-';
    return date.getMonth()+1+'/'+date.getDate()+'/'+date.getFullYear();
  }
  function escapeHtml(value){return String(value??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\"/g,'&quot;').replace(/'/g,'&#039;');}
  function render(rows,total){
    const body=document.getElementById('historyBody'),summary=document.getElementById('historySummary'),empty=document.getElementById('historyEmpty');
    if(!body||!summary||!empty)return;
    body.innerHTML='';empty.hidden=rows.length>0;
    rows.forEach(row=>{
      const tr=document.createElement('tr');
      tr.innerHTML='<td>'+escapeHtml(formatTimestamp(row.timestamp))+'</td>'+'<td>'+escapeHtml(row.ip||'-')+'</td>'+'<td><strong>'+escapeHtml(row.serialNumber||'-')+'</strong></td>'+'<td>'+escapeHtml(row.locationId||'-')+'</td>'+'<td>'+escapeHtml(row.zone||'-')+'</td>'+'<td>'+escapeHtml(String(row.repeat??'-'))+'</td>'+'<td>'+escapeHtml(row.engineerName||row.engineerId||'-')+'</td>'+'<td>'+escapeHtml(row.status||'-')+'</td>'+'<td>'+escapeHtml(row.note||'-')+'</td>'+'<td>'+escapeHtml(row.resolutionStatus||'-')+'</td>';
      body.appendChild(tr);
    });
    updateStats(rows);
    const selectedSerial=getSelectedSerial(),engineerQuery=String(document.getElementById('engineerSearch')?.value||'').trim(),selectedDate=getSelectedDate();
    const filterParts=['tanggal '+selectedDate];if(engineerQuery)filterParts.push('Engineer "'+engineerQuery+'"');
    summary.textContent=selectedSerial?'Menampilkan '+rows.length.toLocaleString('id-ID')+' event untuk SN '+selectedSerial+' pada '+filterText+' dari '+Number(total||0).toLocaleString('id-ID')+' total event.':'Menampilkan '+rows.length.toLocaleString('id-ID')+' event pada '+filterText+' dari '+Number(total||0).toLocaleString('id-ID')+' total event.';
  }
  function updateStats(rows){
    const countValues=values=>{const counts=new Map();values.forEach(value=>{const key=String(value??'').trim();if(!key||key==='-')return;counts.set(key,(counts.get(key)||0)+1);});return[...counts.entries()].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]))[0]||null;};
    const zoneTop=countValues(rows.map(row=>row.zone)),locationTop=countValues(rows.map(row=>row.locationId)),ipCount=rows.filter(row=>String(row.ip??'').trim()&&String(row.ip).trim()!=='-').length;
    const zone=document.getElementById('historyTopZone'),zoneCount=document.getElementById('historyTopZoneCount'),location=document.getElementById('historyTopLocation'),locationCount=document.getElementById('historyTopLocationCount'),ip=document.getElementById('historyIpCount');
    if(zone)zone.textContent=zoneTop?.[0]||'-';if(zoneCount)zoneCount.textContent=(zoneTop?.[1]||0).toLocaleString('id-ID')+' kali';if(location)location.textContent=locationTop?.[0]||'-';if(locationCount)locationCount.textContent=(locationTop?.[1]||0).toLocaleString('id-ID')+' kali';if(ip)ip.textContent=ipCount.toLocaleString('id-ID');
  }
  function updateFilterState(){const selectedSerial=getSelectedSerial(),filter=document.getElementById('historyFilter'),filterSerial=document.getElementById('historyFilterSerial');if(!filter||!filterSerial)return;filter.hidden=!selectedSerial;filterSerial.textContent=selectedSerial;}
  function applyFilters(rows){
    const engineerQuery=normalizeEngineer(document.getElementById('engineerSearch')?.value),selectedDate=getSelectedDate();
    return rows.filter(row=>{
      const matchesEngineer=!engineerQuery||normalizeEngineer(row.engineerName||row.engineerId).includes(engineerQuery);
      const matchesDate=!selectedDate||getRowDate(row)===selectedDate;
      return matchesEngineer&&matchesDate;
    });
  }
  async function refresh(){
    const status=document.getElementById('historyStatus'),refreshButton=document.getElementById('refreshHistoryBtn');
    if(status)status.textContent='Memuat...';if(refreshButton)refreshButton.disabled=true;
    try{
      const result=await loadHistory(),allRows=Array.isArray(result.rows)?result.rows:[],selectedSerial=normalizeSerial(getSelectedSerial());
      const serialRows=selectedSerial?allRows.filter(row=>normalizeSerial(row.serialNumber)===selectedSerial):allRows,rows=applyFilters(serialRows);
      render(rows,result.total);updateFilterState();if(status)status.textContent='Google Sheets — Work History';
    }catch(error){console.error('Cleaning History:',error);render([],0);if(status)status.textContent='Gagal: '+(error.message||'tidak tersedia');}
    finally{if(refreshButton)refreshButton.disabled=false;}
  }
  function initializeSearch(){
    const engineerSearch=document.getElementById('engineerSearch'),historyDate=document.getElementById('historyDate');
    if(historyDate&&!historyDate.value&&!getSelectedSerial())historyDate.value=getTodayInputValue();
    engineerSearch?.addEventListener('input',refresh);historyDate?.addEventListener('change',refresh);
  }
  window.CompCleaningHistory={loadHistory,refresh};
  document.addEventListener('DOMContentLoaded',()=>{
    document.getElementById('refreshHistoryBtn')?.addEventListener('click',refresh);
    document.getElementById('clearHistoryFilter')?.addEventListener('click',()=>{window.location.href='cleaning-history.html';});
    initializeSearch();updateFilterState();refresh();
  },{once:true});
})();