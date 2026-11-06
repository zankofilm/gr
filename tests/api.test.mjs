import test from 'node:test';import assert from 'node:assert/strict';import {guardianApi,ApiError} from '../src/api.mjs';
test('guardian API sends bearer token and JSON to the same origin', async()=>{
  const old=globalThis.fetch;
  try{globalThis.fetch=async (url,opts)=>{assert.equal(url,'https://school.example.com/api/guardian/dashboard');assert.equal(opts.headers.Authorization,'Bearer TESTTOKEN');assert.equal(opts.headers.Accept,'application/json');return {ok:true,json:async()=>({children:[]})};};
    assert.deepEqual(await guardianApi('https://school.example.com','/api/guardian/dashboard',{token:'TESTTOKEN'}),{children:[]});}
  finally{globalThis.fetch=old;}
});
test('guardian API does not allow unrelated or absolute paths',async()=>{await assert.rejects(()=>guardianApi('https://school.example.com','https://evil.com/steal'),/not permitted/);await assert.rejects(()=>guardianApi('https://school.example.com','/api/admin/users'),/not permitted/);});
test('server 401 becomes explicit ApiError',async()=>{const old=globalThis.fetch;try{globalThis.fetch=async()=>({ok:false,status:401,json:async()=>({error:'نشست منقضی است'})});await assert.rejects(()=>guardianApi('https://school.example.com','/api/guardian/dashboard',{token:'expired'}),err=>err instanceof ApiError&&err.status===401);}finally{globalThis.fetch=old;}});
