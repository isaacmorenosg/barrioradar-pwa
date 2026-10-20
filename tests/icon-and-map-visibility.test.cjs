const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const read=n=>readFileSync(join(__dirname,'../public',n),'utf8');
const icons=read('icons.svg'),css=read('radar-dark.css'),html=read('index.html'),app=read('app.js'),sw=read('sw.js');
test('user icon exists in the SVG sprite and matches mobile account button',()=>{
  assert.match(html,/id="mobileAccountButton"[^>]*>[\s\S]*?<use href="\/icons\.svg#user"\/>/);
  assert.match(icons,/<symbol id="user" viewBox="0 0 24 24">/);
  assert.match(icons,/<circle cx="12" cy="8" r="4"\/>/);
});
test('map tiles are readable with dark themed controls remaining intact',()=>{
  assert.match(css,/\.map-tiles img\{filter:brightness\(\.88\) saturate\(\.92\) contrast\(1\.05\)\}/);
  assert.match(css,/  \.map-tiles img\{filter:brightness\(\.86\) saturate\(\.92\) contrast\(1\.05\)\}/);
  assert.doesNotMatch(css,/brightness\(\.48\)|brightness\(\.55\)/);
  assert.match(css,/\.mobile-nav\{height:/);
});
test('map simplified selection and equal-weight four metric color are preserved',()=>{
  assert.doesNotMatch(app,/polygon-count-bg|class="polygon-count"/);
  assert.match(app,/values\.reduce\(\(sum,value\)=>sum\+value,0\)\/4/);
  assert.match(html,/id="mobileSelectedOpinions"/);
  assert.match(html,/id="mobileSheetChip"/);
});
test('installed PWA invalidates old icons and styles cache',()=>{
  assert.match(sw,/zonenta-pwa-v27-mobile-header/);
  assert.match(sw,/'\/icons\.svg'/);
  assert.match(sw,/'\/radar-dark\.css'/);
});