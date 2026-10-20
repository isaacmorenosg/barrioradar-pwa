const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'../public');
const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const css=fs.readFileSync(path.join(root,'zonenta-theme.css'),'utf8');
const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
const start=app.indexOf('function renderComparePage(){');
const end=app.indexOf('function openModal(',start);
assert.ok(start>=0&&end>start);
const source=app.slice(start,end);
function harness(items){
 const calls={handlers:{},render:0,persist:0,navigate:[]};
 const root={innerHTML:'',querySelectorAll(selector){return (this.innerHTML.match(new RegExp(selector==='[data-compare-remove]'?'data-compare-remove="\\d+"':'data-compare-open="\\d+"','g'))||[]).map(match=>({dataset:{[selector==='[data-compare-remove]'?'compareRemove':'compareOpen']:match.split('"')[1]},addEventListener(type,fn){calls.handlers[selector+':'+this.dataset[selector==='[data-compare-remove]'?'compareRemove':'compareOpen']]=fn;}}));}};
 const buttons={goExploreCompare:{addEventListener(type,fn){calls.handlers.go=fn;}}};
 const state={comparison:[...items]};
 const ctx={state,EL:id=>id==='compareList'?root:buttons[id],icon:()=>'',sectorName:o=>o.name,escapeHtml:x=>x,
  changeView:v=>calls.navigate.push(v),goToSnapshot:()=>{},persist:()=>{calls.persist++},toast:()=>{}};
 vm.runInNewContext(source,ctx);
 return {ctx,root,state,calls};
}
const item=(id)=>({id,name:'Sector '+id,city:'Huelva',snapshot:{day:4,night:3,light:4,noise:2,count:1}});
test('one compared zone remains visible with a call to add another',()=>{
 const h=harness([item('A')]);h.ctx.renderComparePage();
 assert.match(h.root.innerHTML,/Sector A/);
 assert.match(h.root.innerHTML,/Añadir segunda zona/);
 assert.ok(!h.root.innerHTML.includes('Selecciona dos zonas para comparar'));
});
test('removing one of two zones preserves the other in storage and on screen',()=>{
 const h=harness([item('A'),item('B')]);h.ctx.renderComparePage();
 assert.match(h.root.innerHTML,/Sector A/);assert.match(h.root.innerHTML,/Sector B/);
 h.calls.handlers['[data-compare-remove]:0']();
 assert.deepEqual(h.state.comparison.map(x=>x.id),['B']);
 assert.match(h.root.innerHTML,/Sector B/);
 assert.ok(!h.root.innerHTML.includes('Sector A'));
 assert.equal(h.calls.persist,1);
});
test('a second zone can be added after a removal without resurrecting the first',()=>{
 const h=harness([item('A'),item('B')]);h.ctx.renderComparePage();
 h.calls.handlers['[data-compare-remove]:0']();
 h.state.comparison.push(item('C'));h.ctx.renderComparePage();
 assert.match(h.root.innerHTML,/Sector B/);assert.match(h.root.innerHTML,/Sector C/);
 assert.ok(!h.root.innerHTML.includes('Sector A'));
});
test('compare, saved, and help views use Zonenta palette with no floating map CTAs',()=>{
 assert.match(css,/body:not\(\.map-view-active\) \.mobile-rate-cta,/);
 assert.match(css,/body:not\(\.map-view-active\) \.mobile-sheet-chip\{display:none!important\}/);
 assert.match(css,/\.compare-card \.compare-number span/);
 assert.match(css,/\.saved-card-actions button:first-child/);
 assert.match(html,/<body class="map-view-active">/);
 assert.match(app,/document\.body\.classList\.toggle\('map-view-active',view==='explorar'\)/);
 assert.match(sw,/zonenta-pwa-v34-z-icon/);
});
