const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const read=name=>readFileSync(join(__dirname,'../public',name),'utf8');
const app=read('app.js'),html=read('index.html'),sw=read('sw.js'),css=read('radar-dark.css');
test('sector color combines day, night, lighting and noise with equal weights',()=>{
 const code=app.match(/function currentScore\(item\)\{[\s\S]*?\n\}/);
 assert.ok(code,'Missing score function');
 const mean=new Function(code[0]+';return currentScore;')();
 assert.equal(mean({day:5,night:4.5,light:4.5,noise:4}),4.5);
 assert.equal(mean({day:2,night:5,light:2,noise:5}),3.5);
 assert.equal(mean({day:4,night:4,light:4,noise:4}),4);
});
test('no numeric opinion overlays are drawn over the hexagons',()=>{
 assert.doesNotMatch(app,/polygon-count-bg/);
 assert.doesNotMatch(app,/class="polygon-count"/);
 assert.match(css,/\.map-overlay \.polygon-count,\.map-overlay \.polygon-count-bg,\.mobile-sheet-count\{display:none!important\}/);
});
test('day/night selector and featured score ring are absent',()=>{
 assert.doesNotMatch(html,/class="time-segment"/);
 assert.doesNotMatch(app,/EL\('dayBtn'\)|EL\('nightBtn'\)/);
 assert.doesNotMatch(app,/class="signal-block"|class="score-ring"/);
});
test('zone detail retains four equally presented indicators',()=>{
 for(const label of ['Seguridad percibida de día','Seguridad percibida de noche','Iluminación percibida','Confort acústico'])assert.ok(app.includes(label));
 assert.ok(app.includes('Percepciones de la zona'));
});
test('selected sector retains localized opinion count while map remains uncluttered',()=>{
 assert.match(app,/mobileSelectedOpinions/);
 assert.match(app,/fmtNum\(count\)/);
 assert.match(app,/\$\{fmtNum\(record\.count\)\}/);
 assert.match(html,/id="mobileSheetChip"/);
});
test('color legend explains composite average and the offline shell changes',()=>{
 assert.match(app,/25 % cada indicador/);
 assert.match(sw,/barrioradar-pulse-mapas-v25-light-theme/);
});
