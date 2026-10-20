const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const app=readFileSync(join(__dirname,'../public/app.js'),'utf8');
const sw=readFileSync(join(__dirname,'../public/sw.js'),'utf8');

test('coloured hexes are more visible while street names still show through',()=>{
  const fragment=app.match(/fill-opacity="\$\{([^}]+)\}"/);
  assert.ok(fragment,'Map polygon fill opacity should be explicitly defined');
  assert.equal(fragment[1],"isSelected?.88:(!PREVIEW_MODE&&c.count<5?.60:.76)");
  const calc=new Function('isSelected','PREVIEW_MODE','c',`return ${fragment[1]};`);
  assert.equal(calc(false,false,{count:1}),0.60);
  assert.equal(calc(false,false,{count:4}),0.60);
  assert.equal(calc(false,false,{count:5}),0.76);
  assert.equal(calc(false,false,{count:5000}),0.76);
  assert.equal(calc(true,false,{count:1}),0.88);
  for(const value of [calc(false,false,{count:1}),calc(false,false,{count:5}),calc(true,false,{count:5})]){
    assert.ok(value>0&&value<1,'Opacity must retain transparency');
  }
});
test('small samples remain visually distinguished with dashed outlines',()=>{
  assert.match(app,/stroke-dasharray="\$\{!PREVIEW_MODE&&c\.count<5\?'5 4':'none'\}"/);
  assert.match(app,/stroke-width="\$\{isSelected\?2\.9:1\.8\}"/);
  assert.match(app,/stroke-opacity="\.95"/);
  assert.match(app,/const tone=scoreColor\(currentScore\(c\)\)/);
});
test('no numeric opinion badges return on the map',()=>{
  assert.doesNotMatch(app,/class="polygon-count"|polygon-count-bg/);
});
test('installed PWA refreshes assets to the brighter sector style',()=>{
  assert.match(sw,/zonenta-pwa-v35-original-splash/);
});
