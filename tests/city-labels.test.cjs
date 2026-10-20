const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root=path.join(__dirname,'..','public');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
for (const [id,label] of [['crumbCity','Huelva'],['headingCity','/ Huelva'],['mapCityLabel','Huelva, España']]) {
 assert.match(html,new RegExp(`id="${id}">${label.replace(/\//g,'\\/')}<`));
}
assert.ok(app.indexOf('syncCityLabels();\n  if(PREVIEW_MODE)') > app.indexOf('function start()'),'Boot must sync selected city labels');
assert.match(app,/function chooseLocation\(place,zoom=14\)\{[\s\S]*?syncCityLabels\(\);/,'Search city should synchronize all city labels');
assert.match(app,/values.reduce\(\(sum,value\)=>sum\+value,0\)\/4/,'Map color is now the mean of all four metrics');
assert.match(sw,/barrioradar-pulse-mapas-v25-light-theme/,'The service-worker cache must be invalidated');
const labels = {crumbCity:{textContent:''},headingCity:{textContent:''},mapCityLabel:{textContent:''}};
const state={city:'Huelva'};
const code = app.slice(app.indexOf('function displayedCity()'),app.indexOf('function drawBackground()'));
vm.runInNewContext(code+'\nsyncCityLabels()', {state,EL:(id)=>labels[id]});
assert.deepEqual(Object.values(labels).map(x=>x.textContent),['Huelva','/ Huelva','Huelva, España']);
state.city='Sevilla, España';
vm.runInNewContext(code+'\nsyncCityLabels()', {state,EL:(id)=>labels[id]});
assert.deepEqual(Object.values(labels).map(x=>x.textContent),['Sevilla','/ Sevilla','Sevilla, España']);
console.log('PASS: Huelva by default; all three labels track the selected city and no duplicate country');