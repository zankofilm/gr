/** Dependency-free contracts shared by native screens and tests. */
export const GUARDIAN_VIEWS = Object.freeze(['home','profile','grades','examreport','attendance','homework','schedule','messages','settings']);
export function normalizeBase(raw) {
  let text=String(raw||'').trim();
  if (!text) throw new Error('نشانی HTTPS سامانه را وارد کنید.');
  if (!/^https?:\/\//i.test(text)) text='https://'+text;
  const url=new URL(text);
  const isLocal=['localhost','127.0.0.1','10.0.2.2'].includes(url.hostname);
  if (url.protocol!=='https:' && !(typeof process!=='undefined'&&process.env?.NODE_ENV!=='production'&&isLocal)) throw new Error('برای حفاظت از اطلاعات اولیا، نشانی سرور باید HTTPS باشد.');
  if (url.username||url.password||url.hash||url.search) throw new Error('نشانی سرور نباید شامل رمز، پارامتر یا # باشد.');
  if (url.pathname.includes('..')) throw new Error('مسیر نامعتبر است.');
  const path=url.pathname.replace(/\/+$/,'').replace(/\/guardian(?:\/index\.html)?$/i,'');
  return url.origin+(path==='/'?'':path);
}
export function englishDigits(value){return String(value??'').replace(/[۰-۹]/g,c=>String(c.charCodeAt(0)-1776)).replace(/[٠-٩]/g,c=>String(c.charCodeAt(0)-1632));}
export function guardianUrl(base) { return normalizeBase(base)+'/guardian/'; }
export function ensureAuthorizedStudent(dashboard,id) {
  const children=Array.isArray(dashboard?.children)?dashboard.children:[];
  return children.find(x=>String(x.student?.id)===String(id))||children[0]||null;
}
export function parentName(guardian) {return String(guardian?.name||guardian?.guardianName||'ولی دانش‌آموز');}
export function studentName(s) {return [s?.firstName,s?.lastName].filter(Boolean).join(' ')||'دانش‌آموز';}
export function publishedReport(ch){const reports=ch?.termReports||{};for(const k of ['semester2','semester1','annual'])if(reports[k]?.reportCardStatus==='published')return reports[k];return null;}
export function homeworkPending(ch){return (ch?.homework||[]).filter(h=>!(ch?.homeworkSubmissions||[]).some(s=>String(s.homeworkId)===String(h.id))).length;}
export function totalNotices(ch){return (ch?.notifications||[]).filter(n=>n.read!==true).length;}
export function allowedStudentPhoto(data){const s=String(data||'');return s.length<=3000000 && /^data:image\/(?:png|jpeg|webp);base64,[a-zA-Z0-9+/=]+$/.test(s)?s:null;}
export function escapeHTML(s){return String(s??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));}
/** Only IDs and view keys from trusted constant/selected linked child are emitted. */
export function portalScript({token,studentId,view='home'}) {
  if (!GUARDIAN_VIEWS.includes(view))throw new Error('Unsupported guardian view');
  const jsToken=JSON.stringify(String(token));
  const jsChild=JSON.stringify(String(studentId||''));
  const jsView=JSON.stringify(view);
  return `(function(){
    try {
      var t=${jsToken};
      if(localStorage.getItem('msy.guardian.token')!==t){localStorage.setItem('msy.guardian.token',t);location.reload();return true;}
      if(!window.__msyParentLogoutClick){
        window.__msyParentLogoutClick=true;
        document.addEventListener('click',function(e){
          if(e.target?.closest?.('[data-p34-logout]')){
            window.ReactNativeWebView?.postMessage(JSON.stringify({type:'guardian-logout'}));
          }
        },true);
      }
      if(!window.__msyParentLogoutWatcher){
        window.__msyParentLogoutWatcher=setInterval(function(){
          try{if(!localStorage.getItem('msy.guardian.token')){clearInterval(window.__msyParentLogoutWatcher);window.ReactNativeWebView?.postMessage(JSON.stringify({type:'guardian-logout'}));}}catch(e){}
        },800);
      }
      var child=${jsChild}, view=${jsView}, tick=0;
      var interval=setInterval(function(){
        tick++;
        var app=document.getElementById('app');
        if(app && !app.classList.contains('hidden')){
          var target=[].slice.call(document.querySelectorAll('[data-p34-child]')).find(function(el){return el.getAttribute('data-p34-child')===child;});
          if(target && !target.classList.contains('active'))target.click();
          var tab=document.querySelector('[data-p34-nav="'+view+'"]');
          if(tab && !tab.classList.contains('active'))tab.click();
          clearInterval(interval);
        }
        if(tick>200)clearInterval(interval);
      },150);
    }catch(e){}
  })();true;`;
}
