import {escapeHTML,studentName} from './logic.mjs';
const E=escapeHTML;
export function termReportHtml(ch,period){
  const r=ch?.termReports?.[period];
  if(!r || r.reportCardStatus!=='published')throw new Error('این کارنامه هنوز منتشر نشده است.');
  const s=ch.student||{}, subjectRows=(r.completeSubjects||r.subjects||[]);
  const name={semester1:'نیم‌سال اول',semester2:'نیم‌سال دوم',annual:'سالانه'}[period]||period;
  const rows=subjectRows.map((x,i)=>`<tr><td>${i+1}</td><td>${E(x.subject)}</td><td>${E(x.continuousScore??'—')}</td><td>${E(x.finalComponent??'—')}</td><td>${E(x.finalScore??'—')}</td></tr>`).join('');
  return `<!doctype html><html lang="fa" dir="rtl"><head><meta charset="utf-8"><style>body{font-family:Tahoma,Arial;color:#102543;margin:24px}h1{text-align:center;color:#123969}header{border-bottom:3px solid #a67a27;padding-bottom:16px}.meta{display:flex;justify-content:space-between;gap:12px;margin:20px 0}table{border-collapse:collapse;width:100%;margin-top:20px}td,th{border:1px solid #cbd3e1;padding:9px;text-align:right}th{background:#f1f5fb}footer{margin-top:25px;color:#516178;font-size:12px}@page{size:A4;margin:12mm}</style></head><body><header><h1>کارنامه تحصیلی ${E(name)}</h1><p>مدرسه‌یار | فقط گزارش منتشرشده رسمی</p></header><div class="meta"><b>${E(studentName(s))}</b><span>${E(s.className||'')}</span><b>معدل: ${E(r.average??'—')} از ${E(r.scoreScale??20)}</b></div><table><thead><tr><th>ردیف</th><th>درس</th><th>مستمر</th><th>پایانی</th><th>نمره نهایی</th></tr></thead><tbody>${rows}</tbody></table><footer>این فایل نمای چاپی اطلاعات منتشرشده توسط مدرسه است؛ اعتبار آن تابع وضعیت رسمی ثبت‌شده در سامانه است.</footer></body></html>`;
}
