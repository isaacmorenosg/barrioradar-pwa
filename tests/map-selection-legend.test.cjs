const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=n=>fs.readFileSync(path.join(__dirname,'../public',n),'utf8');
const html=read('index.html'),app=read('app.js'),ui=read('radar-ui.js'),css=read('radar-dark.css'),sw=read('sw.js');
test('legend remains visible above credits with no expandable colors button',()=>{
  assert.ok(html.indexOf('id="mapLegend"')<html.indexOf('class="map-attribution"'));
  assert.ok(!html.includes('id="mobileLegendToggle"'));
  assert.ok(!ui.includes('legend-expanded'));
  assert.match(css,/\.map-baseline \.map-legend\{display:flex!important/);
});
test('tapping only highlights and does not open the details until Ver zona',()=>{
  assert.match(app,/state\.selected=cellAt\(loc\.lat,loc\.lng\);state\.userSelected=true;overlayRender\(\);renderDetails\(\)/);
  assert.match(ui,/showButton\.addEventListener\('click',\(\)=>\{if\(!showButton\.disabled\)setOpen\(true,true\);\}\)/);
  assert.doesNotMatch(ui,/map\.addEventListener\('pointerup'/);
  assert.doesNotMatch(ui,/map\.addEventListener\('keydown'/);
  assert.match(html,/id="mobileSheetChip"[^>]*disabled/);
});
test('count and sector preview are updated from current approved votes',()=>{
  assert.match(html,/id="mobileSectorPreview" hidden aria-live="polite"/);
  assert.match(html,/id="mobileSheetCount"/);
  assert.match(app,/const count=Math\.max\(0,Number\(selectedRecord\(\)\?\.count\)\|\|0\)/);
  assert.match(app,/info\.hidden=!chosen/);
  assert.match(app,/function renderDetails\(\)\{\s*updateMobileSelection\(\)/);
});
test('all sectors with votes display a count at initial mobile map zoom',()=>{
  assert.match(app,/if\(state\.zoom>=14 \|\| \(isSelected&&state\.userSelected\)\)/);
  assert.match(app,/class="polygon-count-bg/);
  assert.match(css,/\.map-overlay \.polygon-count-bg\{/);
});
test('service worker updates mobile interface assets',()=>{
  assert.match(sw,/barrioradar-pulse-mapas-v20-map-selection-legend/);
});
