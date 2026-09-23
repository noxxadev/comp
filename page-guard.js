(() => {
  'use strict';
  const SESSION_KEY = 'comp.auth.session';
  const USER_KEY = 'comp.auth.user';
  const pageMode = document.documentElement.getAttribute('data-auth-page') || 'protected';
  document.documentElement.style.visibility = 'hidden';

  const getSession = () => {
    try { return sessionStorage.getItem(SESSION_KEY) || ''; } catch (_) { return ''; }
  };
  const clearAuth = () => {
    try { sessionStorage.removeItem(SESSION_KEY); sessionStorage.removeItem(USER_KEY); } catch (_) {}
  };
  const goLogin = () => {
    if (!location.pathname.endsWith('/login.html') && !location.pathname.endsWith('login.html')) location.replace('login.html');
  };
  const goHome = () => {
    if (!location.pathname.endsWith('/index.html') && !location.pathname.endsWith('index.html')) location.replace('index.html');
  };
  const showPage = () => { document.documentElement.style.visibility = ''; };

  function addLogoutUI() {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar || sidebar.querySelector('[data-comp-logout]')) return;
    let user = null;
    try { user = JSON.parse(sessionStorage.getItem(USER_KEY) || 'null'); } catch (_) {}
    const wrap = document.createElement('div');
    wrap.style.cssText='margin:16px 0 0;padding:12px;border-top:1px solid var(--border,rgba(127,127,127,.2));display:flex;flex-direction:column;gap:8px;';
    const label=document.createElement('span');
    label.textContent=user?.username ? 'Login: '+user.username : 'Authenticated';
    label.style.cssText='font-size:12px;color:var(--muted,#888);word-break:break-word;';
    const button=document.createElement('button');
    button.type='button'; button.textContent='Logout'; button.setAttribute('data-comp-logout','');
    button.style.cssText='width:100%;padding:9px 12px;border:1px solid var(--border,rgba(127,127,127,.3));border-radius:8px;background:var(--surface-2,var(--surface,#fff));color:var(--text,#222);cursor:pointer;font:inherit;';
    button.addEventListener('click',async()=>{button.disabled=true;button.textContent='Logging out...';try{if(window.CompAuth?.logout)await window.CompAuth.logout();}finally{clearAuth();goLogin();}});
    wrap.append(label,button); sidebar.appendChild(wrap);
  }

  async function run() {
    const session=getSession();
    if(pageMode==='guest'){
      if(!session){showPage();return;}
      if(!window.CompAuth?.validateSession){clearAuth();showPage();return;}
      const result=await window.CompAuth.validateSession();
      if(result?.authenticated) goHome(); else showPage();
      return;
    }
    if(!session){goLogin();return;}
    if(!window.CompAuth?.validateSession){clearAuth();goLogin();return;}
    const result=await window.CompAuth.validateSession();
    if(!result?.authenticated){clearAuth();goLogin();return;}
    showPage();
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',addLogoutUI,{once:true});else addLogoutUI();
  }
  run().catch(()=>{clearAuth();if(pageMode==='guest')showPage();else goLogin();});
})();