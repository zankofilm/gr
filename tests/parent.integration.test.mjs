import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {guardianApi,ApiError} from '../src/api.mjs';

test('end-to-end guardian API contract: login, dashboard, meeting, consent, expired session',async()=>{
 const requests=[];
 const server=http.createServer(async(req,res)=>{
   const body=await new Promise(resolve=>{let s='';req.on('data',b=>s+=b);req.on('end',()=>resolve(s?JSON.parse(s):{}));});
   requests.push({path:req.url,method:req.method,authorization:req.headers.authorization,body});
   res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');
   if(req.url==='/api/guardian/login')return res.end(JSON.stringify({token:'local-test-token'}));
   if(req.headers.authorization!=='Bearer local-test-token'){res.statusCode=401;return res.end(JSON.stringify({error:'نشست نامعتبر'}));}
   if(req.url==='/api/guardian/dashboard')return res.end(JSON.stringify({children:[{student:{id:'s1',firstName:'دانش‌آموز آزمایشی'}}],consentForms:[],requests:[]}));
   if(req.url==='/api/guardian/meeting-request'&&body.studentId==='s1')return res.end(JSON.stringify({ok:true,request:{status:'open'}}));
   if(req.url==='/api/guardian/consents/respond'&&body.studentId==='s1'&&body.decision==='approved')return res.end(JSON.stringify({ok:true}));
   res.statusCode=403;res.end(JSON.stringify({error:'دسترسی مجاز نیست'}));
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const addr=server.address(), base=`http://127.0.0.1:${addr.port}`;
 try{
   const login=await guardianApi(base,'/api/guardian/login',{method:'POST',body:{guardianNationalId:'0000000000',password:'no-real-password'}});
   assert.equal(login.token,'local-test-token');
   const dash=await guardianApi(base,'/api/guardian/dashboard',{token:login.token});
   assert.equal(dash.children[0].student.id,'s1');
   const meet=await guardianApi(base,'/api/guardian/meeting-request',{token:login.token,method:'POST',body:{studentId:'s1',message:'جلسه آزمایشی'}});
   assert.equal(meet.request.status,'open');
   const consent=await guardianApi(base,'/api/guardian/consents/respond',{token:login.token,method:'POST',body:{studentId:'s1',consentId:'c1',decision:'approved'}});
   assert.equal(consent.ok,true);
   await assert.rejects(()=>guardianApi(base,'/api/guardian/dashboard',{token:'expired'}),e=>e instanceof ApiError&&e.status===401);
   assert.equal(requests[2].authorization,'Bearer local-test-token');
   assert.equal(requests[2].body.studentId,'s1');
   assert.equal(requests[3].body.decision,'approved');
 } finally{await new Promise(resolve=>server.close(resolve));}
});
