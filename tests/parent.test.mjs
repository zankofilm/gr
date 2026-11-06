import test from 'node:test';
import assert from 'node:assert/strict';
import {consentsForStudent,requestsForStudent,guardianStatus,schoolHighlights,externalHttps} from '../src/parent.mjs';
const data={
 consentForms:[
  {id:'consent-a',title:'اردو',description:'برنامه سفر',childResponses:[{studentId:'ST-1',response:null},{studentId:'ST-2',response:{decision:'approved'}}]},
  {id:'consent-b',title:'ورزش',childResponses:[{studentId:'ST-1',response:{decision:'declined'}}]},
  {id:'consent-c',title:'اولیا',childResponses:[]}
 ],
 requests:[{id:'r1',studentId:'ST-1',status:'open',createdAt:'2026-11-01',message:'meeting A'},
  {id:'r2',studentId:'ST-2',status:'closed',createdAt:'2026-11-03',message:'meeting B'},
  {id:'r3',studentId:'ST-1',status:'approved',createdAt:'2026-11-05',message:'meeting C'}]
};
test('consents are strictly scoped to selected child',()=>{assert.deepEqual(consentsForStudent(data,'ST-1').map(c=>c.id),['consent-a','consent-b']);assert.deepEqual(consentsForStudent(data,'ST-2').map(c=>c.id),['consent-a']);assert.equal(consentsForStudent(data,'alien').length,0);});
test('consent response is preserved for approval status',()=>{assert.equal(consentsForStudent(data,'ST-1')[1].response.decision,'declined');assert.equal(consentsForStudent(data,'ST-1')[0].response,null);});
test('meeting requests show only linked child and sorted latest first',()=>{assert.deepEqual(requestsForStudent(data,'ST-1').map(x=>x.id),['r3','r1']);assert.equal(requestsForStudent(data,'ST-2').length,1);});
test('handles omitted dashboard fields without synthetic records',()=>{assert.deepEqual(consentsForStudent({},'ST-1'),[]);assert.deepEqual(requestsForStudent(null,'ST-1'),[]);});
test('school signals never interpret unregistered day as absence',()=>{assert.equal(schoolHighlights({attendanceToday:{summary:{}},weeklySchedule:[]}).attendance,'ثبت نشده');assert.equal(schoolHighlights({attendanceToday:{summary:{present:2}},weeklySchedule:[{},{}]}).attendance,'حاضر');assert.equal(schoolHighlights({attendanceToday:{summary:{absent:1}}}).attendance,'غایب');});
test('only https links without credentials can leave app with explicit approval',()=>{assert.equal(externalHttps('https://example.com/meeting'),'https://example.com/meeting');for(const s of ['http://example.com','javascript:alert(1)','https://user:pass@example.com','file:///tmp/test','intent://blah',''])assert.equal(externalHttps(s),null);});
test('request states map to parent-facing Persian labels',()=>{assert.equal(guardianStatus('open'),'در انتظار بررسی');assert.equal(guardianStatus('approved'),'تأییدشده');});
