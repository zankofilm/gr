import React, {useCallback, useEffect, useRef, useState} from 'react';
import {ActivityIndicator, Alert, AppState, BackHandler, Image, ImageBackground, KeyboardAvoidingView, Linking, Platform, Pressable, RefreshControl, ScrollView, StatusBar as RNStatusBar, StyleSheet, Text, TextInput, View, useWindowDimensions} from 'react-native';
import {SafeAreaProvider, SafeAreaView} from 'react-native-safe-area-context';
import {LinearGradient} from 'expo-linear-gradient';
import {Ionicons} from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import * as Print from 'expo-print';
import {WebView} from 'react-native-webview';
import {C,MODULES,EXTRA} from './src/theme';
import {GUARDIAN_VIEWS,normalizeBase,guardianUrl,studentName,parentName,ensureAuthorizedStudent,publishedReport,homeworkPending,totalNotices,portalScript,escapeHTML,englishDigits,allowedStudentPhoto} from './src/logic.mjs';
import {guardianApi,ApiError} from './src/api.mjs';
import {consentsForStudent,requestsForStudent,meetingInvitationsForStudent,meetingDecisionLabel,guardianStatus,schoolHighlights,externalHttps,attendanceStatus,guardianSessionExpiryLabel} from './src/parent.mjs';
import {termReportHtml} from './src/printing.mjs';

const APP_VERSION='1.2.0';
const STORE={base:'msy.parent.base.v1',plain:'msy.parent.session.v1',bio:'msy.parent.securebio.v1',bioFlag:'msy.parent.bio.enabled.v1'};
async function fingerprintAvailable(){try{const types=await LocalAuthentication.supportedAuthenticationTypesAsync();return types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)&&await LocalAuthentication.isEnrolledAsync();}catch{return false;}}
const HEADER=require('./assets/school-header.jpg');
const PENCILS=require('./assets/calendar-illustration.png');
const fmt=n=>new Intl.NumberFormat('fa-IR').format(Number(n||0));
const datefa=s=>{try{return new Intl.DateTimeFormat('fa-IR',{dateStyle:'medium'}).format(new Date(s));}catch{return String(s||'—');}};
const M={home:{title:'خانه',icon:'home-outline'},report:{title:'گزارش‌ها',icon:'stats-chart-outline'},messages:{title:'پیام‌ها',icon:'chatbox-outline'},profile:{title:'پروفایل',icon:'person-outline'}};
const nativeSkin=`
  body{background:#F7F8FC!important;font-family:Tahoma,Arial,sans-serif!important}
  .top,.guardian-head,.dashboard-title,.p34-sidebar,.p35-topbar,.p34-side-quote,.p36-compact-student{display:none!important}
  .shell{max-width:none!important;padding:8px!important;margin:0!important}
  #children,#app{width:100%!important}
  .p34-main-layout,.p35-layout,.p34-main-column,.p35-main-column{display:block!important;width:100%!important;max-width:100%!important;min-width:0!important;margin:0!important;padding:0!important}
  .p34-panel,.analysis-card,.attendance-card,.p34-hero{border-radius:17px!important;border:1px solid #DFE5EE!important;background:#fff!important;box-shadow:0 6px 22px rgba(6,24,50,.055)!important}
  .p34-panel h3,.analysis-card h3,.attendance-head h2{color:#102947!important;font-size:16px!important}
  .btn,.p35-primary{border-radius:11px!important;background:#143760!important;color:#fff!important}
  .p34-panel,.analysis-card{padding:14px!important}
  *{overflow-wrap:anywhere}
  @media(max-width:700px){.p34-home-grid,.p34-profile-grid,.analysis-summary{grid-template-columns:1fr 1fr!important}.attendance-date-tools{flex-wrap:wrap}.attendance-head{align-items:flex-start!important;flex-wrap:wrap!important}}
`;

function Icon({name,size=25,color=C.gold,style}) {return <Ionicons name={name} color={color} size={size} style={style}/>;}
function RaisedIcon({name,size=32}) {return <LinearGradient colors={['#FFF9EA','#F8EACB','#ECD49C']} start={{x:0,y:0}} end={{x:1,y:1}} style={styles.raisedIcon}><View style={styles.raisedIconInset}><Icon name={name} size={size} color={C.gold}/></View></LinearGradient>;}

function Label({children,style,numberOfLines}) {return <Text numberOfLines={numberOfLines} style={[styles.label,style]}>{children}</Text>;}
function Btn({children,onPress,variant='primary',disabled=false,icon}) {return <Pressable accessibilityRole="button" onPress={onPress} disabled={disabled} style={[styles.btn,variant==='outline'&&styles.btnOutline,variant==='ghost'&&styles.btnGhost,disabled&&{opacity:.6}]}>{icon&&<Icon name={icon} size={19} color={variant==='primary'?C.white:C.navy}/>}<Text style={[styles.btnText,variant!=='primary'&&{color:C.navy}]}>{children}</Text></Pressable>;}
function TextField({label,value,onChangeText,placeholder,secureTextEntry=false,keyboardType='default',autoCapitalize='none',editable=true}) {return <View style={{marginBottom:13}}><Label style={styles.fieldLabel}>{label}</Label><TextInput style={[styles.input,!editable&&{opacity:.6}]} value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor="#8C98AB" secureTextEntry={secureTextEntry} autoCorrect={false} keyboardType={keyboardType} autoCapitalize={autoCapitalize} editable={editable} textAlign="right" /></View>}
function SectionHeader({title,subtitle,action,onPress}) {return <View style={styles.sectionHead}><View style={{flex:1}}><Label style={styles.sectionTitle}>{title}</Label>{subtitle&&<Label style={styles.mutedSmall}>{subtitle}</Label>}</View>{action&&<Pressable onPress={onPress} accessibilityRole="button" style={styles.sectionAction}><Text style={styles.sectionActionText}>{action}</Text><Icon name="chevron-back" size={14} color={C.gold}/></Pressable>}</View>}
function Panel({children,style}){return <View style={[styles.panel,style]}>{children}</View>}
function Tabbar({tab,onTab}){return <LinearGradient colors={[C.navy2,C.deep]} style={styles.tabbar}>{Object.entries(M).map(([id,v])=><Pressable key={id} onPress={()=>onTab(id)} accessibilityRole="tab" accessibilityState={{selected:tab===id}} style={[styles.tabItem,tab===id&&styles.activeTab]}><Icon name={tab===id?v.icon.replace('-outline',''):v.icon} color={tab===id?C.white:'#E0EAF4'} size={25}/><Text style={[styles.tabTitle,tab===id&&{fontWeight:'800',color:C.white}]}>{v.title}</Text></Pressable>)}</LinearGradient>}

export default function App(){
 const {width}=useWindowDimensions();
 const [phase,setPhase]=useState('boot'); // boot, config, login, change, home, module, locked, offline
 const [base,setBase]=useState(''); const [baseDraft,setBaseDraft]=useState('');
 const [nid,setNid]=useState('');const [pass,setPass]=useState('');const [newPass,setNewPass]=useState('');const [repeatPass,setRepeatPass]=useState('');
 const [token,setToken]=useState('');const tokenRef=useRef('');const [dashboard,setDashboard]=useState(null);const [selected,setSelected]=useState('');const [picker,setPicker]=useState(false);
 const [biometric,setBiometric]=useState(false);const biometricRef=useRef(false);const promptRef=useRef(false);const [bioSupport,setBioSupport]=useState(false);
 const [photo,setPhoto]=useState(null);const [busy,setBusy]=useState(false);const [webLoading,setWebLoading]=useState(false);const [meetingText,setMeetingText]=useState('');const [meetingNote,setMeetingNote]=useState('');const [message,setMessage]=useState('');const [tab,setTab]=useState('home');const [currentModule,setCurrentModule]=useState({key:'home',title:'خانه',view:'home'});const [fullWeb,setFullWeb]=useState(false);const [webKey,setWebKey]=useState(0);const webRef=useRef(null); const [showAll,setShowAll]=useState(false);
 const [analysisData,setAnalysisData]=useState(null);const [analysisPeriod,setAnalysisPeriod]=useState('month');const [analysisSubject,setAnalysisSubject]=useState('');const [analysisLoading,setAnalysisLoading]=useState(false);const [analysisError,setAnalysisError]=useState('');const analysisSerial=useRef(0);
 const [attendanceData,setAttendanceData]=useState(null);const [attendanceDate,setAttendanceDate]=useState('');const [attendanceLoading,setAttendanceLoading]=useState(false);const [attendanceError,setAttendanceError]=useState('');const attendanceSerial=useRef(0);
 const [contactCategory,setContactCategory]=useState('general');const [contactTitle,setContactTitle]=useState('');const [contactMessage,setContactMessage]=useState('');const [contactLoading,setContactLoading]=useState(false);
 const [sessions,setSessions]=useState([]);const [sessionsLoading,setSessionsLoading]=useState(false);const [sessionsError,setSessionsError]=useState('');const [sessionActionBusy,setSessionActionBusy]=useState(false);const sessionsSerial=useRef(0);
 const phaseRef=useRef(phase);const resumePhase=useRef('home');useEffect(()=>{phaseRef.current=phase},[phase]);useEffect(()=>{tokenRef.current=token},[token]);useEffect(()=>{biometricRef.current=biometric},[biometric]);
 const child=ensureAuthorizedStudent(dashboard,selected);const guardian=dashboard?.guardian;
 const linkedConsents=consentsForStudent(dashboard,child?.student?.id);
 const linkedRequests=requestsForStudent(dashboard,child?.student?.id);
 const meetingInvitations=meetingInvitationsForStudent(dashboard,child?.student?.id);
 const highlights=schoolHighlights(child);
 const signedIn=['home','module'].includes(phase);
 useEffect(()=>{if(Platform.OS!=='android')return;const back=BackHandler.addEventListener('hardwareBackPress',()=>{
   if(phaseRef.current==='module'){setPhase('home');setTab('home');return true;}
   if(phaseRef.current==='home'){Alert.alert('مدرسه‌یار','برای خروج از حساب، گزینه خروج امن را در تنظیمات انتخاب کنید.');return true;}
   return false;
 });return()=>back.remove();},[]);

 useEffect(()=>{let active=true;setPhoto(null);if(!base||!token||!child?.student?.id||!['home','module'].includes(phase))return()=>{active=false};
   guardianApi(base,`/api/guardian/student-dossier?studentId=${encodeURIComponent(child.student.id)}`,{token}).then(r=>{if(active)setPhoto(allowedStudentPhoto(r?.dossier?.photoDataUrl));}).catch(()=>{});
   return()=>{active=false};
 },[base,token,child?.student?.id]);

 const clearSecrets=async()=>{await Promise.allSettled([SecureStore.deleteItemAsync(STORE.plain),SecureStore.deleteItemAsync(STORE.bio),SecureStore.setItemAsync(STORE.bioFlag,'0')]);setBiometric(false);biometricRef.current=false;};
 const fail=(e)=>{setMessage(e instanceof Error?e.message:'خطای نامشخص. دوباره تلاش کنید.');};
 const boot=useCallback(async()=>{
   setPhase('boot');setMessage('');
   try{
     const stored=await SecureStore.getItemAsync(STORE.base), host=stored||process.env.EXPO_PUBLIC_PARENT_PORTAL_URL||'';
     if(!host||host.includes('YOUR-SCHOOL-DOMAIN')){setPhase('config');return;}
     const url=normalizeBase(host);setBase(url);setBaseDraft(url);
     const fingerprint=await fingerprintAvailable();setBioSupport(fingerprint);
     const enabled=await SecureStore.getItemAsync(STORE.bioFlag)==='1';setBiometric(enabled);biometricRef.current=enabled;
     if(enabled&&fingerprint){setPhase('locked');return;}
     if(enabled&&!fingerprint){await clearSecrets();setMessage('اثر انگشت ثبت‌شده روی دستگاه در دسترس نیست؛ برای امنیت، دوباره با رمز وارد شوید.');}
     const storedToken=await SecureStore.getItemAsync(STORE.plain);
     if(storedToken){await loadSession(url,storedToken);return;}
     setPhase('login');
   }catch(e){fail(e);setPhase('config');}
 },[]);
 useEffect(()=>{boot();},[boot]);
 // Protect the visible account screen whenever the app goes to the background.
 useEffect(()=>{const sub=AppState.addEventListener('change',next=>{if((next==='background'||next==='inactive')&&biometricRef.current&&!promptRef.current&&tokenRef.current&&['home','module'].includes(phaseRef.current)){resumePhase.current=phaseRef.current;setPhase('locked');}});return()=>sub.remove();},[]);

 async function loadSession(server,session){
   setBusy(true);setMessage('');
   try{
     const data=await guardianApi(server,'/api/guardian/dashboard',{token:session});
     setToken(session);tokenRef.current=session;setDashboard(data);setSelected(prev=>ensureAuthorizedStudent(data,prev)?.student?.id||'');setPhase('home');setTab('home');
     guardianApi(server,'/api/guardian/sessions/client-info',{token:session,method:'POST',body:{platform:Platform.OS,platformVersion:String(Platform.Version||''),model:'مدرسه‌یار · اپلیکیشن اولیا',architecture:'mobile',mobile:true,userAgent:`Madreseyar Parent App/${APP_VERSION}`}}).catch(()=>{});
     return true;
   }catch(e){
     if(e?.status===401||e?.status===403){await clearSecrets();setToken('');tokenRef.current='';setPhase('login');setMessage('نشست قبلی منقضی شده است. دوباره وارد شوید.');}
     else if(e?.status===428){setToken(session);tokenRef.current=session;setPhase('change');setMessage('برای ادامه، رمز اولیه را تغییر دهید.');}
     else{setToken(session);tokenRef.current=session;setPhase('offline');fail(e);}
     return false;
   }finally{setBusy(false);}
 }
 async function saveBase(){try{setBusy(true);const b=normalizeBase(baseDraft);await SecureStore.setItemAsync(STORE.base,b);await clearSecrets();setToken('');tokenRef.current='';setDashboard(null);setBase(b);setPhase('login');setMessage('');}catch(e){fail(e)}finally{setBusy(false)}}
 async function onLogin(){
   if(!/^\d{10}$/.test(nid.trim())){setMessage('کد ملی ولی باید ۱۰ رقم باشد.');return;}
   if(!pass){setMessage('رمز عبور را وارد کنید.');return;}
   setBusy(true);setMessage('');
   try{
     const r=await guardianApi(base,'/api/guardian/login',{method:'POST',body:{guardianNationalId:englishDigits(nid).trim(),password:pass}});
     if(!r.token)throw new Error('سرور توکن معتبر ارسال نکرد.');
     await clearSecrets();await SecureStore.setItemAsync(STORE.plain,r.token);
     setToken(r.token);tokenRef.current=r.token;
     if(r.mustChangePassword){setPhase('change');setMessage('برای امنیت حساب، رمز اولیه باید تغییر کند.');}
     else{
       setPass('');await loadSession(base,r.token);
       const fingerprint=await fingerprintAvailable();setBioSupport(fingerprint);
       if(fingerprint){Alert.alert('فعال‌سازی اثر انگشت','برای ورودهای بعدی، اثر انگشت ثبت‌شده روی همین دستگاه استفاده شود؟',[{text:'بعداً',style:'cancel'},{text:'فعال‌سازی',onPress:()=>enableBio(r.token)}]);}
     }
   }catch(e){fail(e)}finally{setBusy(false)}
 }
 async function onChangePassword(){
   if(newPass!==repeatPass){setMessage('تکرار رمز جدید یکسان نیست.');return;}
   setBusy(true);setMessage('');
   try{
     const r=await guardianApi(base,'/api/guardian/change-password',{token,method:'POST',body:{currentPassword:pass,newPassword:newPass}});
     if(!r.token)throw new Error('پاسخ تغییر رمز ناقص است.');
     await clearSecrets();await SecureStore.setItemAsync(STORE.plain,r.token);
     setPass('');setNewPass('');setRepeatPass('');await loadSession(base,r.token);
     const fingerprint=await fingerprintAvailable();setBioSupport(fingerprint);if(fingerprint)Alert.alert('ورود با اثر انگشت','برای دفعات بعدی ورود با اثر انگشت فعال شود؟',[{text:'بعداً'},{text:'فعال‌سازی',onPress:()=>enableBio(r.token)}]);
   }catch(e){fail(e)}finally{setBusy(false)}
 }
 async function enableBio(value=tokenRef.current){
   if(!value)return;
   try{
     const ok=await fingerprintAvailable();
     if(!ok){Alert.alert('اثر انگشت در دسترس نیست','این دستگاه باید حسگر اثر انگشت داشته باشد و اثر انگشت در تنظیمات امنیتی آن ثبت شده باشد. تشخیص چهره یا رمز دستگاه به‌تنهایی کافی نیست.');return;}
     promptRef.current=true;
     const auth=await LocalAuthentication.authenticateAsync({promptMessage:'تأیید اثر انگشت برای فعال‌سازی ورود امن',cancelLabel:'انصراف',disableDeviceFallback:true});
     promptRef.current=false;
     if(!auth.success)return;
     await SecureStore.setItemAsync(STORE.bio,value,{requireAuthentication:true,authenticationPrompt:'ورود امن اولیا'});
     await SecureStore.setItemAsync(STORE.bioFlag,'1');
     await SecureStore.deleteItemAsync(STORE.plain);
     setBiometric(true);biometricRef.current=true;
     Alert.alert('ورود امن فعال شد','از این پس برای باز کردن پنل اولیا، اثر انگشت ثبت‌شده روی دستگاه درخواست می‌شود.');
   }catch(e){promptRef.current=false;fail(e);Alert.alert('خطای راه‌اندازی','این دستگاه یا نسخه سیستم‌عامل اجازه ذخیره امن بیومتریک را نداد. ورود با رمز همچنان فعال است.');}
 }
 async function disableBio(){
   setBusy(true);try{await SecureStore.setItemAsync(STORE.plain,tokenRef.current);await SecureStore.deleteItemAsync(STORE.bio);await SecureStore.setItemAsync(STORE.bioFlag,'0');setBiometric(false);biometricRef.current=false;Alert.alert('غیرفعال شد','ورود بیومتریک غیرفعال شد.')}catch(e){fail(e)}finally{setBusy(false)}
 }
 async function unlock(){
   if(promptRef.current)return;promptRef.current=true;setMessage('');setBusy(true);
   try{
     let valid=tokenRef.current;
     if(valid){const r=await LocalAuthentication.authenticateAsync({promptMessage:'ورود به پنل اولیا با اثر انگشت',cancelLabel:'انصراف',disableDeviceFallback:true});if(!r.success)return;}
     else{if(!await fingerprintAvailable())throw new Error('اثر انگشت در دستگاه در دسترس نیست. برای ورود با رمز عبور اقدام کنید.');valid=await SecureStore.getItemAsync(STORE.bio,{requireAuthentication:true,authenticationPrompt:'ورود با اثر انگشت به مدرسه‌یار'});if(!valid)throw new Error('اعتبار بیومتریک از دست رفته است. با رمز وارد شوید.');}
     const restored=await loadSession(base,valid);
     if(restored&&resumePhase.current==='module' && currentModule?.key!=='home')setPhase('module');
   }catch(e){fail(e)}finally{promptRef.current=false;setBusy(false)}
 }
 async function onLogout(){
   const current=tokenRef.current; const host=base;
   setToken('');tokenRef.current='';setDashboard(null);setAnalysisData(null);setAttendanceData(null);setSessions([]);setPhase('login');setMessage('');setPass('');setMeetingText('');setMeetingNote('');setContactTitle('');setContactMessage('');
   await clearSecrets();
   if(current) guardianApi(host,'/api/guardian/logout',{token:current,method:'POST'}).catch(()=>{});
 }
 async function refresh(){if(tokenRef.current&&base){const session=tokenRef.current;setBusy(true);try{const d=await guardianApi(base,'/api/guardian/dashboard',{token:session});if(tokenRef.current===session){setDashboard(d);setMessage('');}}catch(e){if(tokenRef.current!==session)return;if(e?.status===401||e?.status===403){await onLogout();setMessage('نشست پایان یافته است. دوباره وارد شوید.')}else fail(e)}finally{setBusy(false)}}}
 function openModule(m){setMessage('');setFullWeb(false);setCurrentModule(m);setWebKey(k=>k+1);setPhase('module');setTab(m.key==='profile'?'profile':m.key==='messages'?'messages':m.key==='grades'||m.key==='examreport'?'report':'home');}
 function selectTab(id){if(id==='home'){setPhase('home');setTab('home');return;}if(id==='report')return openModule({key:'examreport',title:'گزارش جامع آزمون‌ها',view:'examreport'});if(id==='messages')return openModule({key:'messages',title:'ارتباط با مدرسه',view:'messages'});return openModule({key:'profile',title:'مشخصات دانش‌آموز',view:'profile'});}
 function selectChild(c){setSelected(String(c.student.id));setPicker(false);setWebKey(k=>k+1);setMeetingText('');setMeetingNote('');setAnalysisSubject('');setAnalysisData(null);setAttendanceDate('');setAttendanceData(null);}
 async function submitMeeting(){
   const id=child?.student?.id, content=meetingText.trim();
   if(!id)return;
   if(content.length<3){Alert.alert('درخواست ملاقات','لطفاً موضوع و توضیح درخواست را بنویسید.');return;}
   setBusy(true);setMessage('');
   try{await guardianApi(base,'/api/guardian/meeting-request',{token:tokenRef.current,method:'POST',body:{studentId:id,message:content}});setMeetingText('');await refresh();Alert.alert('درخواست ثبت شد','درخواست ملاقات برای مدرسه ارسال شد و در فهرست پیگیری قرار گرفت.');}
   catch(e){fail(e);Alert.alert('ارسال درخواست',e?.message||'امکان ثبت درخواست وجود ندارد.');}finally{setBusy(false)}
 }

 async function respondMeetingInvitation(request,decision){
   const labels={accepted:'تأیید حضور',unavailable:'عدم امکان حضور',request_new_time:'درخواست زمان دیگر'};
   Alert.alert('پاسخ به دعوت ملاقات',`پاسخ «${labels[decision]}» برای مدرسه ثبت شود؟`,[
     {text:'انصراف',style:'cancel'},
     {text:'ثبت پاسخ',onPress:async()=>{setBusy(true);try{await guardianApi(base,'/api/guardian/meeting-invitations/respond',{token:tokenRef.current,method:'POST',body:{requestId:String(request.id),decision,note:meetingNote.trim().slice(0,1000)}});setMeetingNote('');await refresh();Alert.alert('پاسخ ثبت شد','پاسخ دعوت ملاقات به مدرسه ارسال شد.');}catch(e){Alert.alert('خطا',e?.message||'ثبت پاسخ انجام نشد.');}finally{setBusy(false)}}}
   ]);
 }
 async function submitContactRequest(){
   const id=child?.student?.id,title=contactTitle.trim(),content=contactMessage.trim();
   if(!id)return;
   if(title.length<3||content.length<3){Alert.alert('درخواست به مدرسه','عنوان و متن درخواست باید حداقل ۳ نویسه داشته باشند.');return;}
   setContactLoading(true);
   try{await guardianApi(base,'/api/guardian/contact-request',{token:tokenRef.current,method:'POST',body:{studentId:id,title,message:content,category:contactCategory}});setContactTitle('');setContactMessage('');await refresh();Alert.alert('درخواست ارسال شد','درخواست شما با موفقیت در کارتابل مدرسه ثبت شد.');}
   catch(e){Alert.alert('ارسال درخواست',e?.message||'امکان ثبت درخواست وجود ندارد.');}finally{setContactLoading(false)}
 }
 async function loadAnalysis(){
   const id=child?.student?.id;if(!id||!base||!tokenRef.current)return;
   const serial=++analysisSerial.current;setAnalysisLoading(true);setAnalysisError('');
   try{const q=new URLSearchParams({studentId:String(id),period:analysisPeriod});if(analysisSubject)q.set('subject',analysisSubject);const d=await guardianApi(base,`/api/guardian/student-analysis?${q.toString()}`,{token:tokenRef.current});if(serial===analysisSerial.current)setAnalysisData(d.analysis||null);}
   catch(e){if(serial===analysisSerial.current){setAnalysisData(null);setAnalysisError(e?.message||'دریافت تحلیل ممکن نشد.');}}
   finally{if(serial===analysisSerial.current)setAnalysisLoading(false)}
 }
 async function loadAttendance(){
   const id=child?.student?.id;if(!id||!base||!tokenRef.current)return;
   const serial=++attendanceSerial.current;
   if(attendanceDate&&!/^\d{4}-\d{2}-\d{2}$/.test(englishDigits(attendanceDate))){setAttendanceError('تاریخ را با قالب میلادی YYYY-MM-DD وارد کنید.');setAttendanceLoading(false);return;}setAttendanceLoading(true);setAttendanceError('');
   try{const q=new URLSearchParams({studentId:String(id)});if(attendanceDate)q.set('date',englishDigits(attendanceDate));const d=await guardianApi(base,`/api/guardian/attendance-day?${q.toString()}`,{token:tokenRef.current});if(serial===attendanceSerial.current)setAttendanceData(d.attendance||null);}
   catch(e){if(serial===attendanceSerial.current){setAttendanceData(null);setAttendanceError(e?.message||'دریافت حضور و غیاب ممکن نشد.');}}
   finally{if(serial===attendanceSerial.current)setAttendanceLoading(false)}
 }
 async function loadSessions(){
   if(!base||!tokenRef.current)return;
   const serial=++sessionsSerial.current;setSessionsLoading(true);setSessionsError('');
   try{const d=await guardianApi(base,'/api/guardian/sessions',{token:tokenRef.current});if(serial===sessionsSerial.current)setSessions(Array.isArray(d.sessions)?d.sessions:[]);}
   catch(e){if(serial===sessionsSerial.current){setSessions([]);setSessionsError(e?.message||'دریافت نشست‌ها ممکن نشد.');}}
   finally{if(serial===sessionsSerial.current)setSessionsLoading(false)}
 }
 async function revokeSession(session){
   Alert.alert('لغو نشست',`دسترسی دستگاه «${session.deviceLabel||session.userAgent||'دستگاه ناشناس'}» لغو شود؟`,[
     {text:'انصراف',style:'cancel'},
     {text:'لغو دسترسی',style:'destructive',onPress:async()=>{setSessionActionBusy(true);try{const d=await guardianApi(base,'/api/guardian/sessions/revoke',{token:tokenRef.current,method:'POST',body:{sessionId:session.id}});if(d.requiresLogin||session.current){await onLogout();return;}await loadSessions();Alert.alert('انجام شد','دسترسی این دستگاه لغو شد.');}catch(e){Alert.alert('خطا',e?.message||'لغو نشست انجام نشد.');}finally{setSessionActionBusy(false)}}}
   ]);
 }
 async function revokeOtherSessions(){
   Alert.alert('خروج از دستگاه‌های دیگر','تمام نشست‌های دیگر حساب شما لغو شوند؟',[
     {text:'انصراف',style:'cancel'},
     {text:'لغو نشست‌های دیگر',style:'destructive',onPress:async()=>{setSessionActionBusy(true);try{const d=await guardianApi(base,'/api/guardian/sessions/revoke-others',{token:tokenRef.current,method:'POST',body:{}});await loadSessions();Alert.alert('انجام شد',`${fmt(d.revoked||0)} نشست دیگر لغو شد.`);}catch(e){Alert.alert('خطا',e?.message||'لغو نشست‌ها انجام نشد.');}finally{setSessionActionBusy(false)}}}
   ]);
 }
 async function revokeAllSessions(){
   Alert.alert('خروج از همه دستگاه‌ها','تمام نشست‌ها، از جمله این دستگاه، لغو و از حساب خارج شوید؟',[
     {text:'انصراف',style:'cancel'},
     {text:'خروج از همه',style:'destructive',onPress:async()=>{setSessionActionBusy(true);try{await guardianApi(base,'/api/guardian/sessions/revoke-all',{token:tokenRef.current,method:'POST',body:{}});await onLogout();}catch(e){Alert.alert('خطا',e?.message||'لغو همه نشست‌ها انجام نشد.');}finally{setSessionActionBusy(false)}}}
   ]);
 }
 useEffect(()=>{if(phase==='module'&&currentModule.key==='analysis')loadAnalysis();else analysisSerial.current++;},[phase,currentModule.key,child?.student?.id,analysisPeriod,analysisSubject,base,token]);
 useEffect(()=>{if(phase==='module'&&currentModule.key==='attendance')loadAttendance();else attendanceSerial.current++;},[phase,currentModule.key,child?.student?.id,attendanceDate,base,token]);
 useEffect(()=>{if(phase==='module'&&currentModule.key==='sessions')loadSessions();else sessionsSerial.current++;},[phase,currentModule.key,base,token]);
 function confirmConsent(entry,decision){
   const title=decision==='approved'?'تأیید رضایت‌نامه':'ثبت عدم موافقت';
   Alert.alert(title,`پاسخ شما برای «${entry.title||'رضایت‌نامه'}» در مدرسه ثبت می‌شود.`,[
     {text:'انصراف',style:'cancel'},
     {text:decision==='approved'?'تأیید می‌کنم':'موافقت نمی‌کنم',style:decision==='declined'?'destructive':'default',onPress:async()=>{
       const id=child?.student?.id;if(!id)return;
       setBusy(true);setMessage('');
       try{await guardianApi(base,'/api/guardian/consents/respond',{token:tokenRef.current,method:'POST',body:{studentId:id,consentId:entry.id,decision}});await refresh();Alert.alert('ثبت شد','پاسخ رضایت‌نامه با موفقیت ثبت شد.');}
       catch(e){fail(e);Alert.alert('خطای رضایت‌نامه',e?.message||'ثبت پاسخ موفق نبود.');}finally{setBusy(false)}
     }}]);
 }
 function showExternalLink(url){const valid=externalHttps(url);if(!valid)return;Alert.alert('باز کردن لینک خارج از مدرسه‌یار',`نشانی مقصد: ${new URL(valid).hostname}\nتنها در صورت اطمینان به این نشانی ادامه دهید.`,[{text:'انصراف',style:'cancel'},{text:'ادامه',onPress:()=>Linking.openURL(valid).catch(()=>Alert.alert('خطا','امکان باز کردن نشانی وجود ندارد.'))}]);}

 async function printTerm(period){try{const html=termReportHtml(child,period);await Print.printAsync({html});}catch(e){Alert.alert('چاپ کارنامه',e?.message||'خطا در تهیه کارنامه')}}
 async function printDossier(){
   try{const id=child?.student?.id;if(!id)return;setBusy(true);const r=await guardianApi(base,`/api/guardian/student-dossier?studentId=${encodeURIComponent(id)}`,{token});const d=r.dossier||{},s=d.student||{};
     const fields=[['نام',studentName(s)],['کلاس',s.className],['کد دانش‌آموزی',s.studentCode],['کد ملی',s.nationalId]];
     const html=`<html dir="rtl"><meta charset="utf-8"><style>body{font-family:Tahoma,Arial;color:#102a4c;margin:28px}h1{border-bottom:3px solid #a67a27;padding:18px}section{border:1px solid #dce3ec;border-radius:12px;padding:16px;margin:12px 0}</style><h1>پرونده تحصیلی دانش‌آموز</h1><section>${fields.map(x=>`<p><b>${escapeHTML(x[0])}:</b> ${escapeHTML(x[1]??'—')}</p>`).join('')}</section><p>گزارش دریافت‌شده از سامانه مدرسه‌یار</p></html>`;await Print.printAsync({html});}
   catch(e){Alert.alert('پرونده دانش‌آموز',e?.message||'خطا در دریافت پرونده')}
   finally{setBusy(false)}
 }
 const onWebLoad=()=>{
   const js=portalScript({token,studentId:child?.student?.id,view:currentModule.view});
   const skin=fullWeb?'document.getElementById("msy-native-skin")?.remove();':`(function(){var style=document.getElementById('msy-native-skin');if(!style){style=document.createElement('style');style.id='msy-native-skin';document.head.appendChild(style)}style.textContent=${JSON.stringify(nativeSkin)};})();`;
   webRef.current?.injectJavaScript(js+skin+'true;');
 };
 const shouldLoad=(request)=>{const u=request.url||'';if(u==='about:blank')return true;try{const target=new URL(u);const host=new URL(base);if(target.origin===host.origin && (target.pathname.startsWith(host.pathname.replace(/\/$/,'')+'/')||target.pathname===host.pathname))return true;if(externalHttps(u)){showExternalLink(u);return false;}return false;}catch{return false;}};

 let inner=null;
 if(phase==='boot'){inner=<View style={styles.center}><Image source={require('./assets/icon.png')} style={{width:110,height:110,borderRadius:26}}/><Label style={{marginTop:20,color:C.navy,fontSize:18,fontWeight:'800'}}>در حال آماده‌سازی پنل اولیا</Label><ActivityIndicator color={C.gold} style={{marginTop:20}}/></View>}
 if(['config','login','change','locked','offline'].includes(phase)){
   const heading={config:'اتصال به سامانه مدرسه',login:'ورود اولیا',change:'تغییر رمز اولیه',locked:'ورود امن با اثر انگشت',offline:'ارتباط با سامانه'}[phase];
   inner=<KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':undefined}><ScrollView contentContainerStyle={{flexGrow:1}} keyboardShouldPersistTaps="handled"><ImageBackground source={HEADER} style={styles.loginHeader} resizeMode="cover"><LinearGradient colors={['#071c3b77',C.navy]} style={StyleSheet.absoluteFill}/><View style={styles.loginLogo}><Icon name="school-outline" color={C.goldLight} size={40}/></View><Label style={styles.loginSmall}>سامانه آموزش هوشمند</Label><Label style={styles.loginTitle}>پنل اولیا</Label><Label style={styles.loginSubtitle}>مدرسه‌یار • نسخه سازمانی</Label></ImageBackground><View style={styles.authCard}><Label style={styles.authHeading}>{heading}</Label>
      {phase==='config'&&<><Label style={styles.authDescription}>نشانی HTTPS همان سروری را وارد کنید که پنل اولیا روی آن فعال است.</Label><TextField label="نشانی سرور مدرسه" value={baseDraft} onChangeText={setBaseDraft} placeholder="https://school.example.com" keyboardType="url"/><Btn onPress={saveBase} disabled={busy}>ذخیره و ادامه</Btn></>}
      {phase==='login'&&<><Label style={styles.authDescription}>با کد ملی ولی و رمز اختصاص‌یافته توسط مدرسه وارد شوید.</Label><TextField label="کد ملی ولی" value={nid} onChangeText={x=>setNid(englishDigits(x).replace(/[^0-9]/g,''))} placeholder="کد ملی ۱۰ رقمی" keyboardType="number-pad"/><TextField label="رمز عبور" value={pass} onChangeText={setPass} placeholder="رمز عبور" secureTextEntry/><Btn onPress={onLogin} disabled={busy} icon="log-in-outline">ورود به پنل</Btn><Pressable onPress={()=>{setBaseDraft(base);setPhase('config');setMessage('')}} style={styles.textAction}><Text style={styles.subtleLink}>تغییر نشانی سرور</Text></Pressable></>}
      {phase==='change'&&<><Label style={styles.authDescription}>رمز اولیه باید با رمز شخصی حداقل ۸ نویسه شامل حرف و عدد جایگزین شود.</Label><TextField label="رمز فعلی" value={pass} onChangeText={setPass} secureTextEntry/><TextField label="رمز جدید" value={newPass} onChangeText={setNewPass} secureTextEntry/><TextField label="تکرار رمز جدید" value={repeatPass} onChangeText={setRepeatPass} secureTextEntry/><Btn onPress={onChangePassword} disabled={busy}>ثبت رمز جدید</Btn></>}
      {phase==='locked'&&<><View style={styles.biometricHero}><Icon name="finger-print-outline" size={84} color={C.gold}/><Label style={{fontSize:15,textAlign:'center',color:C.muted,marginTop:15}}>برای مشاهده اطلاعات فرزند، هویت خود را تأیید کنید.</Label></View><Btn onPress={unlock} disabled={busy} icon="finger-print-outline">تأیید با اثر انگشت</Btn><Btn variant="ghost" onPress={()=>{setToken('');tokenRef.current='';setPhase('login');setMessage('');}}>ورود با رمز عبور</Btn></>}
      {phase==='offline'&&<><Label style={styles.authDescription}>اتصال به سرور برقرار نشد. هیچ اطلاعاتی به‌صورت ساختگی نمایش داده نمی‌شود.</Label><Btn onPress={()=>loadSession(base,tokenRef.current)} disabled={busy} icon="refresh-outline">تلاش دوباره</Btn><Btn variant="ghost" onPress={()=>setPhase('login')}>بازگشت به ورود</Btn></>}
      {!!message&&<View style={styles.errorBox}><Icon name="alert-circle-outline" color={C.danger} size={20}/><Text style={styles.errorText}>{message}</Text></View>}{busy&&<ActivityIndicator color={C.gold} style={{marginTop:13}}/>}
   </View><Label style={styles.authFoot}>اتصال امن HTTPS • اطلاعات دانش‌آموز فقط برای اولیای مجاز</Label></ScrollView></KeyboardAvoidingView>;
 }
 if(phase==='home'&&child){
   const s=child.student||{},report=publishedReport(child),rate=report?.average!=null?`${fmt(report.average)} از ${fmt(report.scoreScale||20)}`:'در انتظار انتشار';const count=totalNotices(child);
   const gridWidth=Math.min(width-44,520),tileWidth=(gridWidth-20)/3;
   inner=<View style={{flex:1,backgroundColor:C.ivory}}><ScrollView style={{flex:1}} contentContainerStyle={{paddingBottom:24}} refreshControl={<RefreshControl refreshing={busy} onRefresh={refresh} tintColor={C.gold}/> }>
     <ImageBackground source={HEADER} style={styles.heroHead} resizeMode="cover"><LinearGradient colors={['#061D3BB2','#061B3B99','#071B3BEA']} style={StyleSheet.absoluteFill}/><View style={styles.heroUpper}><Pressable onPress={()=>openModule({key:'notice',title:'اطلاعیه‌های مدرسه',view:'home'})} style={styles.bellWrap}><Icon name="notifications-outline" color={C.white} size={27}/>{count>0&&<View style={styles.dot}/>}</Pressable><View style={{alignItems:'center',flex:1}}><Label style={styles.heroEyebrow}>سامانه آموزش هوشمند</Label><Label style={styles.heroTitle}>پنل اولیا</Label></View><View style={styles.brandBook}><Icon name="school-outline" size={40} color={C.white}/></View></View><View style={styles.heroCurve}/></ImageBackground>
     <View style={{paddingHorizontal:18,marginTop:-25}}>
       <Pressable style={styles.studentCard} onPress={()=>setPicker(x=>!x)} accessibilityLabel="انتخاب فرزند"><View style={styles.profileBadge}>{photo?<Image source={{uri:photo}} style={{width:59,height:59,borderRadius:35}}/>:<Icon name="person-outline" size={26} color={C.navy}/>}</View><View style={{flex:1,alignItems:'flex-end',marginHorizontal:12}}><Label style={styles.studentName}>{studentName(s)}</Label><Label style={styles.studentClass}>{s.className||'کلاس ثبت نشده'} {s.studentCode?' · '+s.studentCode:''}</Label></View><Icon name={picker?'chevron-up':'chevron-down'} size={23} color={C.navy}/></Pressable>
       {picker&&<Panel style={{marginTop:7,padding:6}}>{(dashboard?.children||[]).map(ch=><Pressable key={ch.student.id} onPress={()=>selectChild(ch)} style={styles.childChoice}><Icon name="person-circle-outline" size={24} color={C.gold}/><Text style={styles.childChoiceName}>{studentName(ch.student)} • {ch.student.className||'—'}</Text><Icon name={String(ch.student.id)===String(selected)?'checkmark-circle':'ellipse-outline'} size={20} color={C.gold}/></Pressable>)}</Panel>}
       <View style={[styles.tiles,{width:gridWidth,alignSelf:'center'}]}>{MODULES.map((mod)=><Pressable key={mod.key} onPress={()=>openModule(mod)} accessibilityRole="button" style={[styles.tile,{width:tileWidth,minHeight:tileWidth*1.03}]}><RaisedIcon name={mod.icon} size={Math.min(34,tileWidth*.28)}/><Text numberOfLines={2} style={styles.tileLabel}>{mod.title}</Text>{mod.key==='notice'&&count>0&&<View style={styles.tileBadge}><Text style={styles.tileBadgeText}>{fmt(count)}</Text></View>}</Pressable>)}</View>
       <Pressable onPress={()=>openModule({key:'calendar',title:'تقویم آموزشی',view:'schedule'})} style={styles.calendarBanner}><View style={{flex:1,justifyContent:'center',paddingRight:16}}><Label style={styles.calendarTitle}>تقویم آموزشی مدرسه</Label><Label style={styles.calendarSubtitle}>زمان‌بندی آزمون‌ها و رویدادها</Label></View><Image source={PENCILS} style={styles.calendarIllustration} resizeMode="cover"/><Icon name="chevron-back" size={22} color={C.gold} style={{position:'absolute',left:15,top:38}}/></Pressable>
       <SectionHeader title="وضعیت تحصیلی فرزند" action="جزئیات" onPress={()=>openModule({key:'grades',title:'کارنامه تحصیلی',view:'grades'})}/>
       <View style={styles.twoStats}><Pressable onPress={()=>openModule({key:'grades',title:'کارنامه تحصیلی',view:'grades'})} style={[styles.stat,{marginLeft:6}]}><Icon name="ribbon-outline" color={C.gold} size={25}/><Label style={styles.statValue}>{rate}</Label><Label style={styles.statCaption}>آخرین کارنامه رسمی</Label></Pressable><Pressable onPress={()=>openModule({key:'homework',title:'تکالیف و فعالیت‌ها',view:'homework'})} style={styles.stat}><Icon name="book-outline" color={C.gold} size={25}/><Label style={styles.statValue}>{fmt(homeworkPending(child))}</Label><Label style={styles.statCaption}>تکالیف تحویل‌نشده</Label></Pressable></View>
       <SectionHeader title="خلاصه امروز" action="حضور و غیاب" onPress={()=>openModule({key:'attendance',title:'حضور و غیاب',view:'attendance'})}/>
       <View style={styles.summaryBand}><View style={styles.summaryCell}><Icon name="checkmark-circle-outline" size={22} color={C.gold}/><Label style={styles.summaryValue}>{highlights.attendance}</Label><Label style={styles.mutedSmall}>وضعیت حضور</Label></View><View style={styles.summaryCell}><Icon name="calendar-outline" size={22} color={C.gold}/><Label style={styles.summaryValue}>{fmt(highlights.scheduleCount)}</Label><Label style={styles.mutedSmall}>برنامه هفتگی</Label></View><View style={styles.summaryCell}><Icon name="chatbubbles-outline" size={22} color={C.gold}/><Label style={styles.summaryValue}>{fmt(linkedConsents.filter(x=>!x.response).length)}</Label><Label style={styles.mutedSmall}>رضایت‌نامه باز</Label></View></View>
       <SectionHeader title="خدمات بیشتر اولیا" subtitle="همه خدمات ثبت‌شده در پنل وب"/>
       <View style={styles.extraGrid}>{EXTRA.map(item=><Pressable key={item.key} onPress={()=>openModule(item)} style={styles.extraItem}><Icon name={item.icon} size={21} color={C.gold}/><Text style={styles.extraText}>{item.title}</Text><Icon name="chevron-back" size={16} color={C.muted}/></Pressable>)}</View>
     </View>
   </ScrollView><Tabbar tab="home" onTab={selectTab}/></View>;
 }
 if(phase==='home'&&!child){inner=<View style={styles.center}><Icon name="people-outline" size={50}/><Label style={{marginTop:15}}>هنوز فرزندی به حساب شما متصل نشده است.</Label><Btn onPress={refresh}>به‌روزرسانی</Btn><Btn variant="ghost" onPress={onLogout}>خروج</Btn></View>}
 if(phase==='module'&&child){
   const isNotices=currentModule.key==='notice',isAccount=currentModule.key==='account',isMeetings=currentModule.key==='meeting',isConsents=currentModule.key==='consents',isOnline=currentModule.key==='online',isAnalysis=currentModule.key==='analysis',isAttendance=currentModule.key==='attendance',isContact=currentModule.key==='contact',isSessions=currentModule.key==='sessions';
   const notices=child.notifications||[];
   const regularRequests=linkedRequests.filter(r=>String(r.kind||r.type||'')!=='meeting_invitation');
   const periods=[['week','هفتگی'],['month','ماهانه'],['quarter','سه‌ماهه'],['semester','نیم‌سال'],['year','سالانه']];
   const categories=[['general','عمومی'],['academic','آموزشی'],['administrative','اداری'],['welfare','امور رفاهی']];
   const a=analysisData||{};
   const attendanceSummary=attendanceData?.summary||{};
   inner=<View style={{flex:1,backgroundColor:C.ivory}}><LinearGradient colors={[C.navy2,C.navy]} style={styles.moduleHeader}><Pressable onPress={()=>{setPhase('home');setTab('home')}} accessibilityRole="button" style={styles.backBtn}><Icon name="arrow-forward" color={C.white} size={24}/></Pressable><View style={{flex:1,alignItems:'center'}}><Label style={styles.moduleTitle}>{currentModule.title}</Label><Label style={styles.moduleSubtitle}>{studentName(child.student)}</Label></View><Pressable onPress={refresh} style={styles.backBtn}><Icon name="refresh-outline" color={C.white} size={21}/></Pressable></LinearGradient>
      {isAccount?<ScrollView contentContainerStyle={{padding:17,paddingBottom:35}}>
        <Panel><SectionHeader title="حساب ولی"/><Label style={{fontSize:17,fontWeight:'800'}}>{parentName(guardian)}</Label><Label style={styles.mutedSmall}>تعداد فرزندان متصل: {fmt(dashboard?.children?.length||0)}</Label><Label style={styles.mutedSmall}>سال تحصیلی: {dashboard?.academicYear||'—'}</Label></Panel>
        <Panel><SectionHeader title="امنیت حساب و ورود" subtitle="ورود سریع با اثر انگشت ثبت‌شده روی همین دستگاه"/><Label style={{fontSize:12,color:bioSupport?C.success:C.muted,lineHeight:22}}>{biometric?'ورود با اثر انگشت فعال است.':bioSupport?'حسگر اثر انگشت و اثر انگشت ثبت‌شده شناسایی شد.':'برای فعال‌سازی، دستگاه باید حسگر اثر انگشت داشته باشد و اثر انگشت در تنظیمات گوشی ثبت شده باشد.'}</Label><View style={{marginTop:8}}>{biometric?<Btn variant="outline" onPress={disableBio} icon="finger-print-outline">غیرفعال‌سازی ورود با اثر انگشت</Btn>:<Btn onPress={()=>enableBio()} disabled={!bioSupport} icon="finger-print-outline">فعال‌سازی ورود با اثر انگشت</Btn>}</View></Panel>
        <Panel><SectionHeader title="دستگاه‌ها و نشست‌های فعال" subtitle="کنترل دسترسی حساب روی گوشی‌ها و مرورگرهای دیگر"/><Btn variant="outline" onPress={()=>openModule({key:'sessions',title:'دستگاه‌های متصل',view:'settings'})} icon="phone-portrait-outline">مدیریت دستگاه‌های متصل</Btn></Panel>
        <Panel><SectionHeader title="اطلاعات سامانه"/><Label style={{color:C.muted,fontSize:12}}>{base}</Label><Btn variant="outline" onPress={()=>openModule({key:'websettings',title:'تنظیمات پنل وب',view:'settings'})} icon="settings-outline">تنظیمات و تغییر رمز در وب</Btn><Btn variant="ghost" onPress={()=>Alert.alert('خروج از حساب','آیا از حساب اولیا خارج می‌شوید؟',[{text:'انصراف',style:'cancel'},{text:'خروج',style:'destructive',onPress:onLogout}])} icon="log-out-outline">خروج امن از حساب</Btn></Panel>
      </ScrollView>:isSessions?<ScrollView contentContainerStyle={{padding:15,paddingBottom:40}}>
        <Panel><SectionHeader title="نشست‌ها و دستگاه‌های متصل" subtitle="دستگاه‌هایی که با حساب اولیای شما وارد شده‌اند"/><Label style={styles.mutedSmall}>نشست فعلی با برچسب «این دستگاه» مشخص شده است. با لغو نشست، دسترسی همان دستگاه قطع می‌شود.</Label><Btn variant="outline" onPress={loadSessions} disabled={sessionsLoading||sessionActionBusy} icon="refresh-outline">به‌روزرسانی فهرست دستگاه‌ها</Btn></Panel>
        {sessionsLoading?<ActivityIndicator color={C.gold} style={{margin:20}}/>:sessionsError?<Panel><Label style={{color:C.danger}}>{sessionsError}</Label></Panel>:sessions.length?sessions.map((row,i)=><Panel key={String(row.id||i)}><View style={{flexDirection:'row-reverse',alignItems:'center',gap:10}}><RaisedIcon name="phone-portrait-outline" size={25}/><View style={{flex:1,alignItems:'flex-end'}}><Label style={{fontWeight:'900'}}>{row.current?'این دستگاه · نشست فعلی':row.deviceLabel||row.userAgent||'دستگاه دیگر'}</Label><Label style={styles.mutedSmall}>انقضا: {guardianSessionExpiryLabel(row.expiresAt)}</Label><Label style={styles.mutedSmall}>IP: {row.ip||'ثبت نشده'}</Label></View>{row.current&&<Icon name="shield-checkmark" color={C.success} size={23}/>}</View>{!row.current&&<Btn variant="outline" disabled={sessionActionBusy} onPress={()=>revokeSession(row)} icon="close-circle-outline">لغو دسترسی این دستگاه</Btn>}</Panel>):<Panel><Label>نشست دیگری برای این حساب ثبت نشده است.</Label></Panel>}
        <Panel><SectionHeader title="اقدامات امنیتی"/><Btn variant="outline" disabled={sessionActionBusy} onPress={revokeOtherSessions} icon="log-out-outline">خروج از همه دستگاه‌های دیگر</Btn><Btn variant="ghost" disabled={sessionActionBusy} onPress={revokeAllSessions} icon="shield-outline">لغو همه نشست‌ها و خروج از حساب</Btn></Panel>
      </ScrollView>:isMeetings?<ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{padding:15,paddingBottom:40}}>
        <Panel><SectionHeader title="درخواست ملاقات با مدرسه" subtitle="ثبت درخواست برای فرزند انتخاب‌شده"/><TextInput value={meetingText} onChangeText={setMeetingText} multiline maxLength={1000} placeholder="موضوع و توضیح درخواست ملاقات را وارد کنید..." placeholderTextColor={C.muted} textAlign="right" style={styles.meetingBox}/><Label style={styles.mutedSmall}>{fmt(meetingText.length)} / ۱۰۰۰ نویسه</Label><Btn onPress={submitMeeting} disabled={busy} icon="paper-plane-outline">ثبت درخواست ملاقات</Btn></Panel>
        <SectionHeader title="دعوت‌های ملاقات مدرسه" subtitle="دعوت‌هایی که معلم یا مدرسه برای شما ارسال کرده‌اند"/>
        {meetingInvitations.length?meetingInvitations.map((r,i)=>{const responded=Boolean(r.guardianResponse||r.responseStatus);const closed=['cancelled','canceled','completed','done'].includes(String(r.status||'').toLowerCase());const canRespond=!responded&&!closed;return <Panel key={String(r.id||i)}><View style={{flexDirection:'row-reverse',alignItems:'center',gap:8}}><Icon name="calendar-outline" color={C.gold} size={22}/><Label style={{flex:1,fontWeight:'900'}}>{r.title||'دعوت ملاقات با مدرسه'}</Label><Label style={{fontSize:11,color:responded?C.success:C.gold}}>{responded?meetingDecisionLabel(r.guardianResponse||r.responseStatus):guardianStatus(r.status)}</Label></View><Label style={{lineHeight:23,marginTop:8}}>{r.description||r.message||r.reason||'—'}</Label><Label style={styles.mutedSmall}>زمان پیشنهادی: {r.meetingDate||r.date||r.proposedDate||'اعلام نشده'} {r.meetingTime||r.time||r.proposedTime||''}</Label><Label style={styles.mutedSmall}>محل: {r.location||r.place||r.meetingLocation||'مدرسه'}</Label>{responded?<View style={styles.consentDone}><Icon name="checkmark-circle-outline" color={C.success} size={20}/><Label style={{color:C.success,fontWeight:'800'}}>پاسخ شما ثبت شده است</Label></View>:canRespond?<><TextInput value={meetingNote} onChangeText={setMeetingNote} multiline maxLength={1000} placeholder="توضیح اختیاری برای مدرسه..." placeholderTextColor={C.muted} textAlign="right" style={[styles.meetingBox,{minHeight:72}]}/><View style={{flexDirection:'row-reverse',gap:7}}><View style={{flex:1}}><Btn onPress={()=>respondMeetingInvitation(r,'accepted')} disabled={busy} icon="checkmark-outline">می‌پذیرم</Btn></View><View style={{flex:1}}><Btn variant="outline" onPress={()=>respondMeetingInvitation(r,'request_new_time')} disabled={busy} icon="calendar-outline">زمان دیگر</Btn></View></View><Btn variant="ghost" onPress={()=>respondMeetingInvitation(r,'unavailable')} disabled={busy} icon="close-outline">امکان حضور ندارم</Btn></>:<Label style={styles.mutedSmall}>این دعوت دیگر قابل پاسخ نیست.</Label>}</Panel>}):<Panel><Label>دعوت ملاقات فعالی برای این فرزند ثبت نشده است.</Label></Panel>}
        <SectionHeader title="پیگیری درخواست‌های من" subtitle="درخواست‌هایی که خودتان به مدرسه ارسال کرده‌اید"/>
        {regularRequests.length?regularRequests.map((r,i)=><Panel key={String(r.id||i)}><View style={{flexDirection:'row-reverse',alignItems:'center',gap:9}}><Icon name="document-text-outline" size={23}/><Label style={{flex:1,fontWeight:'800'}}>{guardianStatus(r.status)}</Label></View><Label style={{lineHeight:24,marginTop:9}}>{r.title?`${r.title} · `:''}{r.message||'—'}</Label><Label style={styles.mutedSmall}>{datefa(r.createdAt)}</Label></Panel>):<Panel><Label>هنوز درخواستی ثبت نکرده‌اید.</Label></Panel>}
        <Btn variant="outline" onPress={()=>openModule({key:'contact',title:'ارسال درخواست به مدرسه',view:'messages'})} icon="mail-open-outline">ارسال درخواست غیرحضوری به مدرسه</Btn>
      </ScrollView>:isContact?<ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{padding:15,paddingBottom:40}}>
        <Panel><SectionHeader title="ارسال درخواست به مدرسه" subtitle="درخواست شما در کارتابل مدیریت مدرسه ثبت می‌شود."/><Label style={styles.fieldLabel}>دسته‌بندی درخواست</Label><View style={{flexDirection:'row-reverse',flexWrap:'wrap',gap:7,marginBottom:13}}>{categories.map(([key,label])=><Pressable key={key} onPress={()=>setContactCategory(key)} style={{paddingHorizontal:12,paddingVertical:9,borderRadius:12,borderWidth:1,borderColor:contactCategory===key?C.gold:C.line,backgroundColor:contactCategory===key?'#F8EFD9':C.white}}><Text style={{color:C.navy,fontSize:12,fontWeight:contactCategory===key?'900':'600'}}>{label}</Text></Pressable>)}</View><TextField label="عنوان درخواست" value={contactTitle} onChangeText={setContactTitle} placeholder="مثلاً پیگیری وضعیت آموزشی"/><Label style={styles.fieldLabel}>شرح درخواست</Label><TextInput value={contactMessage} onChangeText={setContactMessage} multiline maxLength={1200} placeholder="توضیحات خود را بنویسید..." placeholderTextColor={C.muted} textAlign="right" style={styles.meetingBox}/><Label style={styles.mutedSmall}>{fmt(contactMessage.length)} / ۱۲۰۰ نویسه</Label><Btn onPress={submitContactRequest} disabled={contactLoading} icon="send-outline">ارسال درخواست</Btn></Panel>
        <Btn variant="outline" onPress={()=>openModule({key:'messages',title:'ارتباط با مدرسه',view:'messages'})} icon="globe-outline">مشاهده بخش ارتباطات کامل پنل وب</Btn>
      </ScrollView>:isConsents?<ScrollView contentContainerStyle={{padding:15,paddingBottom:40}}>
        <SectionHeader title="رضایت‌نامه‌های مدرسه" subtitle="پاسخ فقط برای فرزند انتخاب‌شده ثبت می‌شود"/>
        {linkedConsents.length?linkedConsents.map((c,i)=><Panel key={String(c.id||i)}><View style={{flexDirection:'row-reverse',alignItems:'center',gap:9}}><Icon name="document-text-outline" size={23}/><Label style={{flex:1,fontSize:16,fontWeight:'800'}}>{c.title||'رضایت‌نامه مدرسه'}</Label></View><Label style={{lineHeight:25,color:C.text,marginTop:12}}>{c.description||c.body||'—'}</Label>{c.response?<View style={styles.consentDone}><Icon name="checkmark-circle-outline" color={C.success} size={21}/><Label style={{color:C.success,fontWeight:'800'}}>{c.response.decision==='approved'?'موافقت ثبت شده':'عدم موافقت ثبت شده'}</Label></View>:<View style={{flexDirection:'row-reverse',gap:8,marginTop:10}}><View style={{flex:1}}><Btn onPress={()=>confirmConsent(c,'approved')} disabled={busy} icon="checkmark-outline">موافقم</Btn></View><View style={{flex:1}}><Btn variant="outline" onPress={()=>confirmConsent(c,'declined')} disabled={busy} icon="close-outline">مخالفم</Btn></View></View>}</Panel>):<Panel><Label>در حال حاضر رضایت‌نامه‌ای برای این فرزند وجود ندارد.</Label></Panel>}
      </ScrollView>:isOnline?<ScrollView contentContainerStyle={{padding:15,paddingBottom:40}}>
        <SectionHeader title="کلاس‌های آنلاین و منابع آموزشی" subtitle="اطلاعات ثبت‌شده در سامانه مدرسه"/>
        {(child.onlineClassSessions||[]).length?(child.onlineClassSessions||[]).map((session,i)=><Panel key={String(session.id||i)}><View style={{flexDirection:'row-reverse',alignItems:'center',gap:10}}><Icon name="videocam-outline" size={24}/><View style={{flex:1,alignItems:'flex-end'}}><Label style={{fontWeight:'800',fontSize:15}}>{session.subject||'کلاس آنلاین'}</Label><Label style={styles.mutedSmall}>{session.date||'تاریخ اعلام نشده'} · زنگ {fmt(session.periodNo||0)} · {session.status||'ثبت شده'}</Label></View></View>{externalHttps(session.meetingUrl)&&<Btn variant="outline" onPress={()=>showExternalLink(session.meetingUrl)} icon="open-outline">ورود به جلسه</Btn>}</Panel>):<Panel><Label>هنوز جلسه آنلاین برای این فرزند ثبت نشده است.</Label></Panel>}
        <Btn variant="outline" onPress={()=>openModule({key:'schedule',title:'برنامه هفتگی و منابع آموزشی',view:'schedule'})} icon="calendar-outline">برنامه هفتگی و منابع در پنل وب</Btn>
      </ScrollView>:isNotices?<ScrollView contentContainerStyle={{padding:15,paddingBottom:35}}>{notices.length?notices.map((n,i)=><Panel key={String(n.id||i)}><View style={{flexDirection:'row-reverse',alignItems:'center'}}><Icon name="notifications-outline" size={21} color={C.gold}/><Label style={{fontSize:15,fontWeight:'800',flex:1,textAlign:'right',marginRight:9}}>{n.title||'اطلاعیه مدرسه'}</Label></View><Label style={{lineHeight:23,marginTop:9,color:C.muted}}>{n.message||n.body||n.text||'—'}</Label><Label style={styles.mutedSmall}>{datefa(n.createdAt||n.at)}</Label></Panel>):<Panel><Label style={{textAlign:'center'}}>در حال حاضر اطلاعیه‌ای ثبت نشده است.</Label></Panel>}</ScrollView>:isAttendance?<ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{padding:15,paddingBottom:40}}>
        <Panel><SectionHeader title="حضور و غیاب زنگ‌به‌زنگ" subtitle="وضعیت رسمی ثبت‌شده توسط معلم؛ روز ثبت‌نشده به معنی غیبت نیست."/><TextField label="تاریخ میلادی" value={attendanceDate} onChangeText={v=>setAttendanceDate(englishDigits(v).replace(/[^0-9-]/g,''))} placeholder="YYYY-MM-DD" keyboardType="numbers-and-punctuation"/><Btn onPress={loadAttendance} disabled={attendanceLoading} icon="search-outline">نمایش وضعیت این روز</Btn>{attendanceError?<Label style={{color:C.danger,marginTop:10}}>{attendanceError}</Label>:null}</Panel>
        {attendanceLoading?<ActivityIndicator color={C.gold} style={{margin:18}}/>:attendanceData?<><Panel><Label style={{fontWeight:'900',fontSize:16}}>{attendanceData.dayName||''} · {attendanceData.dateFa||attendanceData.date||''}</Label><View style={{flexDirection:'row-reverse',flexWrap:'wrap',gap:7,marginTop:12}}>{[['حاضر',attendanceSummary.present,C.success],['در انتظار',attendanceSummary.pending,'#B47B20'],['موجه',attendanceSummary.excused,C.success],['غیرموجه',attendanceSummary.unexcused,C.danger],['تأخیر',attendanceSummary.late,'#B47B20']].map(([label,value,color])=><View key={label} style={{flexGrow:1,minWidth:'28%',padding:10,borderRadius:12,backgroundColor:C.ivory,borderWidth:1,borderColor:C.line,alignItems:'center'}}><Label style={{fontWeight:'900',fontSize:17,color}}>{fmt(value||0)}</Label><Label style={styles.mutedSmall}>{label}</Label></View>)}</View>{attendanceData.firstPresentAt?<Label style={styles.mutedSmall}>اولین حضور: {attendanceData.firstPresentAt} · آخرین کلاس حاضر: {attendanceData.lastPresentUntil||attendanceData.firstPresentAt}</Label>:null}</Panel>
          {attendanceData.blockedReason?<Panel><Label style={{fontWeight:'800',color:C.gold}}>{attendanceData.blockedReason} — برای این روز حضور کلاسی ثبت نمی‌شود.</Label></Panel>:null}
          {(attendanceData.rows||[]).length?(attendanceData.rows||[]).map((r,i)=>{const st=attendanceStatus(r.status,r.state),color=st.tone==='success'?C.success:st.tone==='danger'?C.danger:st.tone==='warning'?'#B47B20':C.muted;return <Panel key={String(r.scheduleEntryId||r.sessionId||i)}><View style={{flexDirection:'row-reverse',alignItems:'center',gap:10}}><View style={{width:54,alignItems:'center'}}><Label style={{fontWeight:'900',color:C.navy}}>{r.startTime||'—'}</Label><Label style={styles.mutedSmall}>تا {r.endTime||'—'}</Label></View><View style={{flex:1,alignItems:'flex-end'}}><Label style={{fontWeight:'900'}}>{`زنگ ${fmt(r.periodNo||0)} · ${r.subject||'کلاس'}`}</Label><Label style={styles.mutedSmall}>{r.teacherName||'دبیر ثبت نشده'}{r.className?` · ${r.className}`:''}</Label>{r.onlineCheckInTime?<Label style={styles.mutedSmall}>ورود آنلاین: {r.onlineCheckInTime}{r.punctuality==='late'?' · با تأخیر':''}</Label>:null}{r.markedAtTime?<Label style={styles.mutedSmall}>ثبت معلم: {r.markedAtTime}</Label>:null}{r.absenceReasonText?<Label style={[styles.mutedSmall,{color:C.danger}]}>علت: {r.absenceReasonText}</Label>:null}</View><Icon name={st.icon} size={22} color={color}/></View><Label style={{color,fontWeight:'800',marginTop:7}}>{st.label}</Label></Panel>}):<Panel><Label>برای این تاریخ زنگ درسی ثبت نشده است.</Label></Panel>}
        </>:<Panel><Label>برای مشاهده، تاریخ را انتخاب کنید یا دکمه نمایش روز را بزنید تا وضعیت امروز دریافت شود.</Label></Panel>}
        <Btn variant="outline" onPress={()=>openModule({key:'attendance-web',title:'حضور و غیاب در پنل وب',view:'attendance'})} icon="globe-outline">نمای کامل حضور و غیاب در پنل وب</Btn>
      </ScrollView>:isAnalysis?<ScrollView contentContainerStyle={{padding:15,paddingBottom:40}}>
        <Panel><SectionHeader title="تحلیل پیشرفت تحصیلی" subtitle="فقط نتایج نهایی و مجاز ثبت‌شده در سامانه"/><View style={{flexDirection:'row-reverse',flexWrap:'wrap',gap:7,marginTop:7}}>{periods.map(([key,label])=><Pressable key={key} onPress={()=>setAnalysisPeriod(key)} style={{paddingHorizontal:12,paddingVertical:9,borderRadius:12,borderWidth:1,borderColor:analysisPeriod===key?C.gold:C.line,backgroundColor:analysisPeriod===key?'#F8EFD9':C.white}}><Text style={{color:C.navy,fontSize:12,fontWeight:analysisPeriod===key?'900':'600'}}>{label}</Text></Pressable>)}</View><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{flexDirection:'row-reverse',gap:7,paddingVertical:10}}>{[['','همه درس‌ها'],...(child.analysisSubjects||[]).map(x=>[x,x])].map(([value,label])=><Pressable key={value||'all'} onPress={()=>setAnalysisSubject(value)} style={{paddingHorizontal:12,paddingVertical:8,borderRadius:11,borderWidth:1,borderColor:analysisSubject===value?C.navy:C.line,backgroundColor:analysisSubject===value?C.navy:C.white}}><Text style={{fontSize:11,color:analysisSubject===value?C.white:C.navy,fontWeight:'700'}}>{label}</Text></Pressable>)}</ScrollView><Btn variant="outline" onPress={loadAnalysis} disabled={analysisLoading} icon="refresh-outline">به‌روزرسانی تحلیل</Btn></Panel>
        {analysisLoading?<ActivityIndicator color={C.gold} style={{margin:20}}/>:analysisError?<Panel><Label style={{color:C.danger}}>{analysisError}</Label></Panel>:analysisData?<><Panel><SectionHeader title="خلاصه عملکرد"/><View style={{flexDirection:'row-reverse',flexWrap:'wrap',gap:8}}>{[['میانگین',a.current?.averagePercent==null?'—':`${fmt(a.current.averagePercent)}٪`],['تعداد آزمون',fmt(a.current?.examCount||0)],['غیبت',fmt(a.attendance?.absent||0)],['تأخیر',fmt(a.attendance?.late||0)]].map(([label,value])=><View key={label} style={{flexGrow:1,minWidth:'42%',backgroundColor:C.ivory,borderRadius:12,padding:12,alignItems:'center'}}><Label style={{fontWeight:'900',fontSize:18,color:C.navy}}>{value}</Label><Label style={styles.mutedSmall}>{label}</Label></View>)}</View><Label style={{marginTop:12,fontWeight:'800'}}>وضعیت: {a.status?.label||'بدون داده'} · روند: {a.trend?.label||'بدون داده'}</Label></Panel>
          <Panel><SectionHeader title="عملکرد درس‌ها"/>{(a.subjects||[]).length?(a.subjects||[]).map((row,i)=><View key={`${row.subject||'subject'}-${i}`} style={{paddingVertical:10,borderBottomWidth:1,borderColor:C.line,flexDirection:'row-reverse',alignItems:'center'}}><View style={{flex:1,alignItems:'flex-end'}}><Label style={{fontWeight:'800'}}>{row.subject||'درس'}</Label><Label style={styles.mutedSmall}>{fmt(row.count||0)} نتیجه نهایی</Label></View><Label style={{fontWeight:'900',color:C.navy}}>{row.percent==null?'—':`${fmt(row.percent)}٪`}</Label></View>):<Label style={styles.mutedSmall}>برای تحلیل درس‌ها هنوز داده کافی وجود ندارد.</Label>}</Panel>
          <Panel><SectionHeader title="مباحث نیازمند تمرین"/>{(a.weakAreas||[]).length?(a.weakAreas||[]).map((row,i)=><Label key={i} style={{lineHeight:25}}>{row.subject||'درس'} · {row.chapter||'مبحث'} · {fmt(row.percent||0)}٪</Label>):<Label style={styles.mutedSmall}>با داده‌های موجود، مبحث نیازمند توجه مشخصی ثبت نشده است.</Label>}</Panel>
          <Panel><SectionHeader title="نتایج آزمون‌های اخیر"/>{(a.exams||[]).slice(0,10).length?(a.exams||[]).slice(0,10).map((row,i)=><View key={String(row.id||i)} style={{paddingVertical:9,borderBottomWidth:1,borderColor:C.line}}><Label style={{fontWeight:'800'}}>{row.title||'آزمون'}</Label><Label style={styles.mutedSmall}>{row.subject||'—'} · {row.chapter||'—'}</Label><Label style={{fontWeight:'900',color:C.navy,marginTop:4}}>{fmt(row.score||0)} از {fmt(row.total||0)} · {fmt(row.percent||0)}٪</Label></View>):<Label style={styles.mutedSmall}>در این بازه نتیجه نهایی آزمون ثبت نشده است.</Label>}</Panel>
          <Panel><SectionHeader title="نظر معلم"/>{(a.teacherNotes||[]).length?(a.teacherNotes||[]).map((row,i)=><View key={i} style={{paddingVertical:9,borderBottomWidth:1,borderColor:C.line}}><Label style={{fontWeight:'800'}}>{row.teacherName||'معلم'}</Label><Label style={styles.mutedSmall}>{row.periodLabel||''}{row.subject?` · ${row.subject}`:''}</Label><Label style={{lineHeight:24,marginTop:5}}>{row.teacherComment||''}</Label></View>):<Label style={styles.mutedSmall}>هنوز نظر منتشرشده‌ای از معلم ثبت نشده است.</Label>}</Panel>
        </>:<Panel><Label>برای این بازه هنوز گزارش قابل نمایش وجود ندارد.</Label></Panel>}
        <Btn variant="outline" onPress={()=>openModule({key:'examreport',title:'گزارش جامع آزمون‌ها',view:'examreport'})} icon="analytics-outline">گزارش جامع آزمون‌ها و تحلیل کتاب/فصل</Btn>
      </ScrollView>:<><View style={styles.webTools}><Pressable onPress={()=>{setFullWeb(x=>!x);setWebKey(x=>x+1)}} style={styles.webChip}><Icon name="globe-outline" size={17} color={C.blue}/><Text style={styles.webToolText}>{fullWeb?'نمای بهینه موبایل':'نمای کامل پنل وب'}</Text></Pressable>{currentModule.key==='grades'&&<Pressable onPress={()=>{const options=Object.entries(child.termReports||{}).filter(([,v])=>v?.reportCardStatus==='published');if(!options.length){Alert.alert('کارنامه','هنوز کارنامه رسمی منتشر نشده است.');return;}Alert.alert('چاپ کارنامه','نیم‌سال موردنظر را انتخاب کنید.',[...options.map(([p])=>({text:({semester1:'نیم‌سال اول',semester2:'نیم‌سال دوم',annual:'سالانه'})[p]||p,onPress:()=>printTerm(p)})),{text:'انصراف',style:'cancel'}]);}} style={styles.webChip}><Icon name="print-outline" size={17} color={C.blue}/><Text style={styles.webToolText}>چاپ کارنامه</Text></Pressable>}{currentModule.key==='profile'&&<Pressable onPress={printDossier} style={styles.webChip}><Icon name="print-outline" size={17} color={C.blue}/><Text style={styles.webToolText}>چاپ پرونده</Text></Pressable>}</View>
        <WebView key={`${webKey}-${fullWeb}`} ref={webRef} source={{uri:guardianUrl(base)}} originWhitelist={[new URL(base).origin]} injectedJavaScriptBeforeContentLoaded={portalScript({token,studentId:child?.student?.id,view:currentModule.view})} onLoadEnd={onWebLoad} onShouldStartLoadWithRequest={shouldLoad} onMessage={e=>{try{const m=JSON.parse(e.nativeEvent.data);if(m.type==='guardian-logout')onLogout();}catch{}}} sharedCookiesEnabled={false} thirdPartyCookiesEnabled={false} incognito cacheEnabled={false} javaScriptEnabled domStorageEnabled setSupportMultipleWindows={false} allowsBackForwardNavigationGestures={false} mixedContentMode="never" allowFileAccess={false} allowUniversalAccessFromFileURLs={false} startInLoadingState renderLoading={()=><View style={styles.center}><ActivityIndicator color={C.gold}/><Label style={{marginTop:10}}>در حال دریافت اطلاعات از مدرسه...</Label></View>} onError={()=>setMessage('نمایش پنل وب ممکن نشد. اتصال به اینترنت و سرور را بررسی کنید.')} onHttpError={e=>{if(e.nativeEvent.statusCode===401)setMessage('نشست به پایان رسیده است.')}} style={{flex:1,backgroundColor:C.ivory}} />
        {!!message&&<Pressable onPress={()=>setMessage('')} style={styles.smallBanner}><Text style={{color:C.danger,textAlign:'right',flex:1}}>{message}</Text><Icon name="close" size={18} color={C.danger}/></Pressable>}
       </>}
       <Tabbar tab={tab} onTab={selectTab}/></View>;
 }
 return <SafeAreaProvider><SafeAreaView style={{flex:1,backgroundColor:C.ivory}} edges={['top','bottom']}><RNStatusBar barStyle={['home','module'].includes(phase)?'dark-content':'light-content'} backgroundColor={['home','module'].includes(phase)?C.ivory:C.navy}/>{inner}</SafeAreaView></SafeAreaProvider>;
}

const styles=StyleSheet.create({
 raisedIcon:{width:58,height:58,borderRadius:16,alignItems:'center',justifyContent:'center',borderColor:'#E1C58B',borderWidth:1,shadowColor:'#967033',shadowOffset:{width:0,height:5},shadowRadius:9,shadowOpacity:.24,elevation:6},raisedIconInset:{width:48,height:48,justifyContent:'center',alignItems:'center',borderRadius:13,borderTopWidth:1,borderTopColor:'#FFFFFFBB'},
 summaryBand:{backgroundColor:C.white,borderColor:C.line,borderWidth:1,borderRadius:17,flexDirection:'row-reverse',paddingVertical:10,marginBottom:8},summaryCell:{flex:1,alignItems:'center',justifyContent:'center',gap:4},summaryValue:{fontWeight:'800',fontSize:13,color:C.navy,marginTop:2},meetingBox:{minHeight:125,textAlignVertical:'top',marginTop:8,padding:15,borderColor:C.line,borderWidth:1,borderRadius:15,backgroundColor:C.ivory,fontSize:15,color:C.text},consentDone:{backgroundColor:'#EAF8EF',padding:11,marginTop:14,borderRadius:12,flexDirection:'row-reverse',alignItems:'center',gap:8},
 label:{fontSize:14,color:C.text,textAlign:'right',writingDirection:'rtl'},mutedSmall:{fontSize:11,color:C.muted,marginTop:3},center:{flex:1,justifyContent:'center',alignItems:'center',padding:24},
 btn:{backgroundColor:C.navy2,alignItems:'center',justifyContent:'center',flexDirection:'row-reverse',gap:9,minHeight:48,paddingHorizontal:18,paddingVertical:11,borderRadius:14,marginTop:8},btnOutline:{backgroundColor:C.white,borderWidth:1,borderColor:C.gold},btnGhost:{backgroundColor:'transparent'},btnText:{fontSize:15,color:C.white,fontWeight:'700'},fieldLabel:{fontSize:12,fontWeight:'700',color:C.navy,marginBottom:6},input:{height:52,backgroundColor:C.white,borderRadius:13,borderWidth:1,borderColor:C.line,paddingHorizontal:15,color:C.text,fontSize:16},
 loginHeader:{height:270,justifyContent:'center',alignItems:'center',backgroundColor:C.navy},loginLogo:{borderWidth:1.5,borderColor:C.goldLight,borderRadius:18,width:74,height:68,alignItems:'center',justifyContent:'center',marginBottom:10,backgroundColor:'#09244EB8'},loginSmall:{color:'#ECF3FA',fontSize:13},loginTitle:{color:C.white,fontSize:31,fontWeight:'900',marginTop:2},loginSubtitle:{color:C.goldLight,fontSize:12,marginTop:4},authCard:{backgroundColor:C.white,marginHorizontal:20,marginTop:-29,borderRadius:23,padding:22,borderWidth:1,borderColor:C.line,shadowColor:C.navy,shadowOpacity:.1,shadowRadius:13,elevation:5},authHeading:{fontSize:20,color:C.navy,fontWeight:'900',marginBottom:12},authDescription:{fontSize:13,color:C.muted,lineHeight:24,marginBottom:18},authFoot:{marginVertical:28,textAlign:'center',fontSize:11,color:C.muted},textAction:{alignItems:'center',padding:13},subtleLink:{fontSize:12,color:C.blue},errorBox:{borderRadius:12,backgroundColor:'#FEF0F1',flexDirection:'row-reverse',gap:8,alignItems:'center',padding:11,marginTop:12},errorText:{flex:1,color:C.danger,fontSize:12,textAlign:'right'},biometricHero:{alignItems:'center',paddingVertical:24},
 heroHead:{height:198,backgroundColor:C.navy,overflow:'hidden',borderBottomLeftRadius:34,borderBottomRightRadius:34},heroUpper:{flexDirection:'row',alignItems:'center',marginTop:30,paddingHorizontal:20},heroEyebrow:{color:C.white,fontSize:12,fontWeight:'700'},heroTitle:{color:C.white,fontSize:27,fontWeight:'900',marginTop:7},brandBook:{width:46,alignItems:'center'},bellWrap:{padding:5,width:45},dot:{width:9,height:9,backgroundColor:C.danger,borderRadius:9,position:'absolute',top:3,right:8,borderWidth:1,borderColor:C.white},heroCurve:{position:'absolute',bottom:0,left:15,right:15,height:2,backgroundColor:C.goldLight,opacity:.65},
 studentCard:{backgroundColor:'#F2F5FB',borderWidth:1,borderColor:'#CED9E7',borderRadius:26,minHeight:103,padding:14,flexDirection:'row-reverse',alignItems:'center',shadowColor:C.navy,shadowOpacity:.16,shadowRadius:10,elevation:6},profileBadge:{width:63,height:63,borderRadius:36,borderWidth:2,borderColor:C.white,backgroundColor:'#D5DFED',alignItems:'center',justifyContent:'center'},studentName:{fontSize:20,color:C.navy,fontWeight:'900'},studentClass:{color:C.muted,fontSize:13,marginTop:4},childChoice:{padding:13,flexDirection:'row-reverse',alignItems:'center',gap:8,borderBottomWidth:1,borderColor:C.line},childChoiceName:{textAlign:'right',flex:1,color:C.navy,fontSize:13},
 tiles:{flexDirection:'row-reverse',flexWrap:'wrap',justifyContent:'space-between',gap:10,marginTop:24,marginBottom:15},tile:{backgroundColor:'#FEFEFF',borderRadius:18,borderColor:'#CED8E7',borderWidth:1,alignItems:'center',justifyContent:'center',paddingVertical:13,paddingHorizontal:4,shadowColor:C.navy,shadowOpacity:.09,shadowRadius:9,elevation:3},tileLabel:{fontSize:13.3,color:C.navy,fontWeight:'800',textAlign:'center',marginTop:9,writingDirection:'rtl',lineHeight:20},tileBadge:{position:'absolute',top:8,right:8,backgroundColor:C.danger,minWidth:22,height:22,borderRadius:12,alignItems:'center',justifyContent:'center'},tileBadgeText:{color:C.white,fontSize:11,fontWeight:'900'},
 calendarBanner:{height:108,marginTop:2,marginBottom:17,backgroundColor:'#EFE8DF',borderRadius:19,flexDirection:'row-reverse',alignItems:'center',overflow:'hidden',borderWidth:1,borderColor:'#E8DFD4'},calendarTitle:{fontWeight:'900',fontSize:15,color:C.navy},calendarSubtitle:{fontSize:11,color:C.muted,marginTop:7},calendarIllustration:{height:108,width:105},
 sectionHead:{marginTop:15,marginBottom:9,flexDirection:'row-reverse',alignItems:'center',justifyContent:'space-between'},sectionTitle:{fontSize:16,fontWeight:'900',color:C.navy},sectionAction:{flexDirection:'row-reverse',alignItems:'center',gap:3,padding:6},sectionActionText:{fontSize:12,color:C.gold,fontWeight:'700'},twoStats:{flexDirection:'row-reverse',marginBottom:4},stat:{flex:1,backgroundColor:C.white,borderWidth:1,borderColor:C.line,borderRadius:15,padding:13,alignItems:'flex-end',minHeight:130},statValue:{fontSize:19,fontWeight:'900',marginTop:8,color:C.navy},statCaption:{fontSize:11,color:C.muted,marginTop:5},extraGrid:{marginBottom:8},extraItem:{flexDirection:'row-reverse',alignItems:'center',gap:12,padding:14,borderRadius:12,backgroundColor:C.white,borderBottomWidth:1,borderColor:C.line,marginBottom:5},extraText:{flex:1,color:C.navy,fontSize:13,fontWeight:'700',textAlign:'right'},
 tabbar:{minHeight:74,flexDirection:'row-reverse',justifyContent:'space-around',paddingVertical:7,paddingHorizontal:10,borderTopLeftRadius:25,borderTopRightRadius:25},tabItem:{minWidth:62,paddingHorizontal:10,alignItems:'center',justifyContent:'center',borderRadius:18,gap:4},activeTab:{backgroundColor:C.gold,borderColor:C.goldLight,borderWidth:1},tabTitle:{color:'#E0EAF4',fontSize:11,fontWeight:'600'},
 moduleHeader:{height:76,flexDirection:'row-reverse',alignItems:'center',paddingHorizontal:14},backBtn:{width:42,height:42,alignItems:'center',justifyContent:'center'},moduleTitle:{color:C.white,fontSize:19,fontWeight:'900',textAlign:'center'},moduleSubtitle:{color:'#C7D7E6',fontSize:11,marginTop:4,textAlign:'center'},webTools:{flexDirection:'row-reverse',flexWrap:'wrap',gap:8,padding:8,backgroundColor:C.white,borderBottomColor:C.line,borderBottomWidth:1},webChip:{flexDirection:'row-reverse',alignItems:'center',paddingHorizontal:10,paddingVertical:7,gap:5,backgroundColor:'#ECF1F9',borderRadius:9},webToolText:{fontSize:11,fontWeight:'700',color:C.blue},smallBanner:{flexDirection:'row-reverse',alignItems:'center',backgroundColor:'#FEEFF0',padding:7,gap:8},
 panel:{borderRadius:17,borderColor:C.line,borderWidth:1,backgroundColor:C.white,padding:15,marginBottom:10},
});
