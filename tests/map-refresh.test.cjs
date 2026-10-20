const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const read=path=>readFileSync(join(__dirname,'../public',path),'utf8');
const app=read('app.js'),api=read('supabase-api.js'),html=read('index.html'),sw=read('sw.js');
const extract=(start,end)=>{
  const from=app.indexOf(start);
  assert.ok(from>=0,'Missing function '+start);
  const to=app.indexOf(end,from);
  assert.ok(to>from,'Missing delimiter '+end);
  return app.slice(from,to);
};
const refresh=extract('async function refreshRealData(){','function escapeHtml(');
const changeView=extract('function changeView(view){','function renderSavedPage(');
const chooseLocation=extract('function chooseLocation(place,zoom=14){','async function refreshRealData(){');

function harness(getRatings,initialCells=[]){
  const statuses=[];
  const state={view:'explorar',realCells:[...initialCells]};
  const map={w:360,h:680,readSeq:0,ratingsAbort:null,lastRatingsSuccess:0};
  const context={
    state,map,PREVIEW_MODE:false,AbortController,Date,
    setTimeout(callback){queueMicrotask(callback);return 1;},
    clamp:(n,min,max)=>Math.max(min,Math.min(max,n)),
    mapBounds:()=>({west:-7,south:37,east:-6.9,north:37.1}),
    cell:(q,r)=>({q,r,id:q+':'+r,lat:37,lng:-6.95}),
    renderCounters(){},overlayRender(){},renderDetails(){},
    ratingsStatus(message='',retry=false){statuses.push({message,retry});},
    cancelRatingsRequest(){
      map.readSeq++;
      if(map.ratingsAbort){map.ratingsAbort.abort();map.ratingsAbort=null;}
    },
    window:{BarrioAPI:{configured:true,getRatings}}
  };
  vm.runInNewContext(refresh,context);
  return {context,state,map,statuses,refresh:context.refreshRealData};
}
const sample=(id='11:22')=>({id,count:3,day:4,night:3,light:4,noise:3});

test('Returning from comparison schedules data loading after the view is visible',()=>{
  let refreshes=0;
  const ctx={
    state:{view:'comparar'},
    EL:()=>({classList:{toggle(){},contains(){return false;}},setAttribute(){}}),
    document:{querySelectorAll:()=>[],body:{classList:{toggle(){}}}},window:{scrollTo(){}},
    scheduleMapRefresh(){refreshes++;},cancelRatingsRequest(){},
    ratingsStatus(){},renderSavedPage(){},renderComparePage(){}
  };
  vm.runInNewContext(changeView,ctx);
  ctx.changeView('explorar');
  assert.equal(refreshes,1);
  assert.match(app,/const resize=\(\)=>\{[\s\S]*?scheduleMapRefresh\(\);/);
  assert.match(app,/bindUI\(\);initMap\(\);renderDetails\(\);renderCounters\(\);scheduleMapRefresh\(\)/);
  assert.match(app,/if\(width<1\|\|height<1\)return;/);
  assert.match(html,/id="ratingsStatus"/);
});
test('Compared or saved sector in the same city retains current ratings until re-fetch',()=>{
  const previous=[sample()];
  const state={view:'comparar',city:'Huelva',realCells:previous,center:{lat:37,lng:-7},zoom:14};
  let changed=0,canceled=0;
  const ctx={state,cancelRatingsRequest(){canceled++;},cellAt:(lat,lng)=>({id:'11:22',lat,lng}),
    syncCityLabels(){},EL:()=>({value:''}),changeView(){changed++;},renderDetails(){},renderCounters(){}};
  vm.runInNewContext(chooseLocation,ctx);
  ctx.chooseLocation({name:'Huelva',lat:37.25,lng:-6.95},14);
  assert.equal(state.realCells,previous);
  assert.equal(changed,1);assert.equal(canceled,1);
  ctx.chooseLocation({name:'Madrid',lat:40.4,lng:-3.7},14);
  assert.equal(state.realCells.length,0,'No stale votes from another city');
});
test('A stale failed request does not wipe a newer successful set of sectors',async()=>{
  const tasks=[];
  const h=harness(()=>new Promise((resolve,reject)=>tasks.push({resolve,reject})));
  const slow=h.refresh();
  const fast=h.refresh();
  assert.equal(tasks.length,2);
  tasks[1].resolve({cells:[sample()]});
  await fast;
  tasks[0].reject(new Error('Old network request failed'));
  await slow;
  assert.equal(h.state.realCells.length,1);
  assert.equal(h.state.realCells[0].id,'11:22');
  assert.equal(h.statuses.at(-1).message,'');
});
test('A transient failure retries without destroying the existing sectors',async()=>{
  let calls=0;
  const h=harness(async()=>{calls++;throw new Error('network offline');},[sample()]);
  await h.refresh();
  assert.equal(calls,2);
  assert.equal(h.state.realCells.length,1);
  assert.equal(h.statuses.at(-1).retry,true);
  assert.match(h.statuses.at(-1).message,/No se pudieron actualizar/);
});
test('The initial request reports a loading state before data, and distinguishes empty results',async()=>{
  let finish;
  const h=harness(()=>new Promise(resolve=>{finish=resolve;}));
  const task=h.refresh();
  assert.match(h.statuses.at(-1).message,/Cargando opiniones/);
  finish({cells:[]});
  await task;
  assert.equal(h.state.realCells.length,0);
  assert.match(h.statuses.at(-1).message,/Todavía no hay opiniones/);
  assert.equal(h.map.lastRatingsSuccess>0,true);
});
test('Queries are cancellable and time-limited; old PWA cache is invalidated',()=>{
  assert.match(api,/async function getRatings\(bounds, externalSignal\)/);
  assert.match(api,/abortSignal\(controller\.signal\)/);
  assert.match(api,/setTimeout\(\(\)=>controller\.abort\(\),14000\)/);
  assert.match(sw,/zonenta-pwa-v31-brand-splash/);
  assert.match(html,/id="retryRatings"/);
});
