import test from 'node:test';
import assert from 'node:assert/strict';
import {meetingInvitationsForStudent,meetingDecisionLabel,attendanceStatus,guardianSessionExpiryLabel,guardianStatus} from '../src/parent.mjs';
import {guardianApi} from '../src/api.mjs';

test('meeting invitations are scoped to the selected linked student and sorted newest first',()=>{
  const d={requests:[
    {id:'m1',studentId:'s1',kind:'meeting_invitation',createdAt:'2026-10-01'},
    {id:'m2',studentId:'s2',kind:'meeting_invitation',createdAt:'2026-11-01'},
    {id:'m3',studentId:'s1',kind:'meeting_invitation',createdAt:'2026-11-03'},
    {id:'r1',studentId:'s1',kind:'meeting',createdAt:'2026-11-04'}
  ]};
  assert.deepEqual(meetingInvitationsForStudent(d,'s1').map(x=>x.id),['m3','m1']);
  assert.deepEqual(meetingInvitationsForStudent(d,'s2').map(x=>x.id),['m2']);
  assert.deepEqual(meetingInvitationsForStudent(d,'alien'),[]);
});

test('meeting response and attendance labels cover server status values',()=>{
  assert.equal(meetingDecisionLabel('accepted'),'حضور تأیید شده');
  assert.equal(meetingDecisionLabel('request_new_time'),'درخواست زمان دیگر');
  assert.equal(guardianStatus('scheduled'),'زمان ملاقات ثبت شده');
  assert.equal(attendanceStatus('present').label,'حاضر');
  assert.equal(attendanceStatus('absent_pending').tone,'warning');
  assert.equal(attendanceStatus('absent_unexcused').tone,'danger');
  assert.equal(attendanceStatus('unmarked','upcoming').label,'هنوز شروع نشده');
  assert.equal(attendanceStatus('unmarked','current').label,'در حال برگزاری');
});

test('session expiry renders a valid Persian date or a safe fallback',()=>{
  assert.equal(guardianSessionExpiryLabel(0),'نامشخص');
  assert.notEqual(guardianSessionExpiryLabel(Date.now()+60000),'نامشخص');
});

test('native parent endpoints preserve authenticated, student-scoped request payloads',async()=>{
  const old=globalThis.fetch,seen=[];
  try{
    globalThis.fetch=async(url,opts)=>{
      seen.push({url:String(url),method:opts.method,authorization:opts.headers.Authorization,body:opts.body?JSON.parse(opts.body):null});
      let payload={ok:true};
      if(String(url).includes('/attendance-day?'))payload={ok:true,attendance:{studentId:'s1',summary:{present:2},rows:[]}};
      if(String(url).includes('/sessions'))payload={sessions:[{id:'current',current:true}]};
      return {ok:true,status:200,json:async()=>payload};
    };
    const token='test-token';
    const attendance=await guardianApi('https://school.example.com','/api/guardian/attendance-day?studentId=s1&date=2026-11-06',{token});
    const sessions=await guardianApi('https://school.example.com','/api/guardian/sessions',{token});
    await guardianApi('https://school.example.com','/api/guardian/contact-request',{token,method:'POST',body:{studentId:'s1',title:'پیگیری آموزشی',message:'درخواست بررسی وضعیت آموزشی',category:'academic'}});
    await guardianApi('https://school.example.com','/api/guardian/meeting-invitations/respond',{token,method:'POST',body:{requestId:'meeting-1',decision:'request_new_time',note:'زمان دیگری پیشنهاد شود'}});
    await guardianApi('https://school.example.com','/api/guardian/sessions/revoke-others',{token,method:'POST',body:{}});
    assert.equal(attendance.attendance.studentId,'s1');
    assert.equal(sessions.sessions[0].current,true);
    assert.equal(seen.every(x=>x.authorization==='Bearer test-token'),true);
    assert.equal(seen[2].body.studentId,'s1');
    assert.equal(seen[2].body.category,'academic');
    assert.equal(seen[3].body.requestId,'meeting-1');
    assert.equal(seen[3].body.decision,'request_new_time');
    assert.equal(seen[4].url,'https://school.example.com/api/guardian/sessions/revoke-others');
  } finally {globalThis.fetch=old;}
});
