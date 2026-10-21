const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const app=readFileSync(join(__dirname,'../public/app.js'),'utf8');
const sw=readFileSync(join(__dirname,'../public/sw.js'),'utf8');
const start=app.indexOf('const GEOLOCATION_TIMEOUT_MS=');
const end=app.indexOf('function activeCells()',start);
assert.ok(start>=0&&end>start);
const fragment=app.slice(start,end);
function harness({available=true,preview=false,view='explorar'}={}){
 const calls=[],toasts=[],pending=[],timers=new Map();
 const state={view,userSelected:false};
 const button={disabled:false,classList:{add(){},remove(){}},setAttribute(){},removeAttribute(){}};
 let nextTimer=1;
 const fakeSetTimeout=fn=>{const id=nextTimer++;timers.set(id,fn);return id;};
 const fakeClearTimeout=id=>timers.delete(id);
 const navigator=available?{geolocation:{getCurrentPosition(success,error,options){pending.push({success,error,options});}}}:{};
 const location=new Function('navigator','PREVIEW_MODE','state','EL','toast','chooseLocation','setTimeout','clearTimeout',
  fragment+'\nreturn {locateUser,markLocationIntent,placeFromGeolocation};')(
  navigator,preview,state,id=>id==='myLocation'?button:null,x=>toasts.push(x),
  (place,zoom,automatic)=>calls.push({place,zoom,automatic}),fakeSetTimeout,fakeClearTimeout);
 return {location,calls,toasts,pending,state,timers,button};
}
const good={coords:{latitude:37.3891,longitude:-5.9845}};
test('Browser geolocation automatically centers the map on mobile and desktop',()=>{
 const h=harness();h.location.locateUser(true);
 assert.equal(h.pending.length,1);
 assert.equal(h.pending[0].options.enableHighAccuracy,false);
 assert.ok(h.pending[0].options.timeout>0);
 h.pending[0].success(good);
 assert.deepEqual(h.calls,[{place:{name:'Mi ubicación',lat:37.3891,lng:-5.9845},zoom:14,automatic:true}]);
 assert.equal(h.timers.size,0);
 assert.match(app,/if\(!PREVIEW_MODE\)locateUser\(true\)/);
 assert.match(sw,/v46-auto-geolocation/);
});
test('Permission rejection and unsupported devices keep the old fallback silently',()=>{
 const denied=harness();denied.location.locateUser(true);denied.pending[0].error({code:1});
 assert.equal(denied.calls.length,0);assert.equal(denied.toasts.length,0);
 const notSupported=harness({available:false});notSupported.location.locateUser(true);
 assert.equal(notSupported.calls.length,0);assert.equal(notSupported.toasts.length,0);
 const sample=harness({preview:true});sample.location.locateUser(true);
 assert.equal(sample.pending.length,0);
});
test('Coordinates outside supported Spain viewport are rejected',()=>{
 const h=harness();h.location.locateUser(true);
 h.pending[0].success({coords:{latitude:48.8566,longitude:2.35}});
 assert.equal(h.calls.length,0);
 assert.equal(h.location.placeFromGeolocation({coords:{latitude:'bad',longitude:0}}),null);
 assert.equal(h.location.placeFromGeolocation({coords:{latitude:0,longitude:0}}),null);
});
test('User navigation and chosen sectors beat slow automatic geolocation',()=>{
 const nav=harness();nav.location.locateUser(true);nav.location.markLocationIntent();nav.pending[0].success(good);
 assert.equal(nav.calls.length,0);
 const chosen=harness();chosen.location.locateUser(true);chosen.state.userSelected=true;chosen.pending[0].success(good);
 assert.equal(chosen.calls.length,0);
 const away=harness();away.location.locateUser(true);away.state.view='comparar';away.pending[0].success(good);
 assert.equal(away.calls.length,0);
 assert.match(app,/if\(!automatic\)markLocationIntent\(\)/);
 assert.match(app,/EL\('placeSearch'\)\.addEventListener\('input',markLocationIntent\)/);
 assert.match(app,/markLocationIntent\(\); \/\/ Any map touch/);
});
test('Manual location button still works and always stops waiting',()=>{
 const denied=harness();denied.location.locateUser(false);assert.equal(denied.button.disabled,true);
 denied.pending[0].error({code:1});assert.equal(denied.toasts.length,1);assert.equal(denied.button.disabled,false);
 const manual=harness();manual.location.locateUser(false);manual.pending[0].success(good);
 assert.equal(manual.calls[0].automatic,false);
 assert.equal(manual.pending[0].options.enableHighAccuracy,true);
 const delayed=harness();delayed.location.locateUser(false);
 for(const fn of Array.from(delayed.timers.values()))fn();
 delayed.pending[0].success(good);
 assert.equal(delayed.calls.length,0);
 assert.equal(delayed.button.disabled,false);
 assert.ok(delayed.toasts[0].includes('tarda demasiado'));
});
test('Precise device coordinates are never put into local storage by geolocation',()=>{
 assert.doesNotMatch(fragment,/localStorage|saveStore|sessionStorage/);
 assert.match(app,/function chooseLocation\(place,zoom=14,automatic=false\)/);
});

test('Explicit location works even when another sector was selected earlier',()=>{
 const h=harness();h.state.userSelected=true;h.location.locateUser(false);h.pending[0].success(good);
 assert.equal(h.calls.length,1);
 assert.equal(h.calls[0].automatic,false);
});
