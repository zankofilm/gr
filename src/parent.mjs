/** Contracts sourced from school web server guardian API v72.82. */
export function consentsForStudent(dashboard,studentId){
  if(studentId===undefined||studentId===null)return [];
  return (Array.isArray(dashboard?.consentForms)?dashboard.consentForms:[]).flatMap(form=>
    (Array.isArray(form.childResponses)?form.childResponses:[])
      .filter(row=>String(row.studentId)===String(studentId))
      .map(row=>({id:String(form.id||''),title:form.title,description:form.description,body:form.body,response:row.response||null}))
  ).filter(x=>x.id);
}
export function requestsForStudent(dashboard,studentId){
  if(studentId===undefined||studentId===null)return [];
  return (Array.isArray(dashboard?.requests)?dashboard.requests:[])
    .filter(row=>String(row.studentId)===String(studentId))
    .sort((a,b)=>String(b.createdAt||'').localeCompare(String(a.createdAt||'')));
}
export function guardianStatus(status){
  return ({open:'در انتظار بررسی',pending:'در انتظار بررسی',approved:'تأییدشده',accepted:'پذیرفته‌شده',scheduled:'زمان ملاقات ثبت شده',unavailable:'عدم امکان حضور',new_time_requested:'درخواست زمان دیگر',rejected:'ردشده',closed:'پایان‌یافته',cancelled:'لغوشده',completed:'انجام‌شده'})[status]||'در حال بررسی';
}
export function schoolHighlights(child){
  const summary=child?.attendanceToday?.summary||{};
  const n=Number(summary.present||0)+Number(summary.absent||0)+Number(summary.late||0);
  const attendance=n>0?(summary.absent>0?'غایب':summary.late>0?'با تأخیر':'حاضر'):'ثبت نشده';
  return {attendance,scheduleCount:Array.isArray(child?.weeklySchedule)?child.weeklySchedule.length:0};
}
/** External meeting links must be HTTPS and explicitly approved by the user. */
export function externalHttps(raw){
  try{const u=new URL(String(raw||''));return u.protocol==='https:' && !u.username && !u.password?u.href:null;}catch{return null;}
}

/** Teacher-created meeting invitations are distinct from parent-created requests. */
export function meetingInvitationsForStudent(dashboard,studentId){
  if(studentId===undefined||studentId===null)return [];
  return (Array.isArray(dashboard?.requests)?dashboard.requests:[])
    .filter(row=>String(row.studentId)===String(studentId)&&String(row.kind||row.type||'')==='meeting_invitation')
    .sort((a,b)=>String(b.createdAt||'').localeCompare(String(a.createdAt||'')));
}
export function meetingDecisionLabel(value){
  return ({accepted:'حضور تأیید شده',unavailable:'عدم امکان حضور',request_new_time:'درخواست زمان دیگر',new_time_requested:'درخواست زمان دیگر',scheduled:'زمان ملاقات ثبت شده',cancelled:'لغو شده',completed:'انجام شده'})[String(value||'').toLowerCase()]||'در انتظار پاسخ';
}
export function attendanceStatus(status,state=''){
  const key=String(status||'unmarked');
  const map={
    present:{label:'حاضر',tone:'success',icon:'checkmark-circle'},
    absent:{label:'غایب · در انتظار بررسی',tone:'warning',icon:'time'},
    absent_pending:{label:'غایب · در انتظار بررسی',tone:'warning',icon:'time'},
    late:{label:'با تأخیر',tone:'warning',icon:'alert-circle'},
    excused:{label:'غیبت موجه',tone:'success',icon:'checkmark-circle'},
    absent_excused:{label:'غیبت موجه',tone:'success',icon:'checkmark-circle'},
    absent_unexcused:{label:'غیبت غیرموجه',tone:'danger',icon:'close-circle'},
    unmarked:{label:state==='upcoming'?'هنوز شروع نشده':state==='current'?'در حال برگزاری':'ثبت نشده',tone:'muted',icon:'ellipse'}
  };
  return map[key]||map.unmarked;
}
export function guardianSessionExpiryLabel(value){
  const raw=String(value??'').trim();const n=/^\d+(?:\.\d+)?$/.test(raw)?Number(raw):new Date(raw).getTime();if(!Number.isFinite(n)||n<=0)return 'نامشخص';
  try{return new Intl.DateTimeFormat('fa-IR',{dateStyle:'medium',timeStyle:'short'}).format(new Date(n));}catch{return 'نامشخص';}
}
