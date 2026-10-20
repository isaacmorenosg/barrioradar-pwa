const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const css=readFileSync(join(__dirname,'../public/radar-dark.css'),'utf8');
const ui=readFileSync(join(__dirname,'../public/radar-ui.js'),'utf8');
const html=readFileSync(join(__dirname,'../public/index.html'),'utf8');
const sw=readFileSync(join(__dirname,'../public/sw.js'),'utf8');
const fix=css.split('/* Fix: independently scrollable sector sheet on touch devices (v17). */')[1];
test('scrollable mobile sheet has a bounded viewport height',()=>{
  assert.ok(fix);
  assert.ok(fix.includes('height:86dvh!important'));
  assert.ok(fix.includes('max-height:calc(100dvh - env(safe-area-inset-top) - 12px)'));
  assert.ok(fix.includes('display:flex!important'));
});
test('comments and details can scroll vertically with momentum',()=>{
  assert.ok(fix.includes('#viewExplorar #detailsContent'));
  assert.ok(fix.includes('flex:1 1 0%'));
  assert.ok(fix.includes('min-height:0!important'));
  assert.ok(fix.includes('overflow-y:auto!important'));
  assert.ok(fix.includes('-webkit-overflow-scrolling:touch'));
  assert.ok(fix.includes('touch-action:pan-y'));
  assert.ok(fix.includes('overflow-wrap:anywhere'));
});
test('close controls remain accessible without hijacking inner scroll',()=>{
  assert.ok(fix.includes('.sheet-topbar'));
  assert.ok(fix.includes('position:relative'));
  assert.ok(html.includes('id="sheetClose"'));
  assert.ok(ui.includes("dismiss?.addEventListener('click'"));
  assert.ok(!ui.includes("detailsContent').addEventListener('touchmove'"));
});
test('service worker refreshes cached CSS in installed PWA',()=>{
  assert.ok(sw.includes('barrioradar-pulse-mapas-v17-sheet-scroll'));
  assert.ok(sw.includes("'/radar-dark.css'"));
});
