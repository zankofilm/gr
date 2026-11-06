import {normalizeBase} from './logic.mjs';
export class ApiError extends Error {constructor(message,status=0,code=''){super(message);this.name='ApiError';this.status=status;this.code=code;}}
/** Guardian API only: same-origin, no redirect follow to foreign sites, bounded network wait. */
export async function guardianApi(base,path,{token,method='GET',body,signal,timeoutMs=15000}={}){
  const origin=normalizeBase(base);
  if(!/^\/api\/guardian\/[a-z0-9/?=&._%-]+$/i.test(path)||path.startsWith('//'))throw new Error('API path not permitted');
  if(!['GET','POST'].includes(method))throw new Error('API method not permitted');
  const headers={'Accept':'application/json'};
  if(body!==undefined)headers['Content-Type']='application/json';
  if(token)headers.Authorization=`Bearer ${token}`;
  const controller=new AbortController();let timedOut=false;
  const abort=()=>controller.abort();
  if(signal?.aborted)abort();else signal?.addEventListener?.('abort',abort);
  const handle=setTimeout(()=>{timedOut=true;abort();},Math.max(100,Number(timeoutMs)||15000));
  let response;
  try{response=await fetch(origin+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body),signal:controller.signal,redirect:'error',cache:'no-store'});}
  catch(e){if(signal?.aborted)throw new ApiError('درخواست لغو شد.');throw new ApiError(timedOut?'زمان پاسخ‌گویی سرور به پایان رسید. دوباره تلاش کنید.':'اتصال به سرور برقرار نشد. اینترنت و نشانی سامانه را بررسی کنید.');}
  finally{clearTimeout(handle);signal?.removeEventListener?.('abort',abort);}
  const result=await response.json().catch(()=>null);
  if(!response.ok)throw new ApiError(result?.error||`خطای سرور (${response.status})`,response.status,result?.code||'');
  return result||{};
}
