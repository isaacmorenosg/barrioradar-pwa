const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const app=readFileSync(join(__dirname,'../public/app.js'),'utf8');
const css=readFileSync(join(__dirname,'../public/zonenta-theme.css'),'utf8');
test('bounded request helper settles when server never responds and clears timer',async()=>{
 const start=app.indexOf('const NETWORK_WAIT_MS=');
 const end=app.indexOf('function smallSpinner()',start);
 assert.ok(start>=0&&end>start);
 const fakeSetTimeout=(f)=>{queueMicrotask(f);return 13;};
 let cleared=false;
 const lib=new Function('setTimeout','clearTimeout',app.slice(start,end)+';return {waitForReply};')(fakeSetTimeout,()=>{cleared=true});
 await assert.rejects(lib.waitForReply(()=>new Promise(()=>{}),10),e=>e.code==='REQUEST_TIMEOUT');
 assert.equal(cleared,true);
});
test('verification is not duplicated after sign out, retry and cancel are possible',()=>{
 assert.match(app,/confirmedSignedOut=true/);
 assert.match(app,/if\(confirmedSignedOut\)\{await openAccount\(\{fromRating:true,skipLookup:true\}\);return;\}/);
 assert.match(app,/if\(!pending\?\.isConnected\)return;/);
 assert.match(app,/if\(!pending\?\.isConnected\|\|state\.selected\?\.id!==sectorId\)return;/);
 assert.match(app,/id="retryAuthCheck"/);
 assert.match(app,/buttonProgress\(send,'Enviando enlace…'\)/);
 assert.match(app,/finally\{restore\(\);\}/);
 assert.match(css,/\.zonenta-spinner\{/);
});
