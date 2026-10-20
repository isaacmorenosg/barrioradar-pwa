const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..','public');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const html=read('index.html'),css=read('radar-light.css'),sw=read('sw.js'),app=read('app.js'),manifest=JSON.parse(read('manifest.webmanifest'));
test('light theme loads after original dark layer and mobile patch',()=>{
 const dark=html.indexOf('href="/radar-dark.css"'),fix=html.indexOf('href="/mobile-sheet-fix.css"'),light=html.indexOf('href="/radar-light.css"');
 const brand=html.indexOf('href="/zonenta-theme.css"');
 assert.ok(dark>=0&&fix>dark&&light>fix&&brand>light);
 assert.match(html,/<meta name="color-scheme" content="light">/);
 assert.equal(manifest.theme_color,'#F8F9FB');
});
test('light theme covers core views, controls and mobile sheets',()=>{
 for(const cls of ['.sidebar','.search-field','.map-card','.details-card','.mobile-nav','.modal-card','.modal-body .slider-value','.map-tiles img','.mobile-sector-preview']) assert.ok(css.includes(cls),cls);
 assert.match(css,/color-scheme:\s*light/);
 assert.match(css,/\.map-tiles img\s*\{filter:none\}/);
 assert.match(css,/\.search-section\s*\{top:calc\(78px/);
});
test('rating numbers remain visible against their badges',()=>{
 assert.match(app,/id="value-\$\{key\}">3\/5<\/output>/);
 assert.match(css,/\.modal-body \.slider-value\s*\{[^}]*color:#14563c!important/);
 assert.match(css,/\.modal-body \.slider-value\s*\{[^}]*background:#e0f3e9/);
});
test('updated service worker precaches and invalidates light theme',()=>{
 assert.match(sw,/zonenta-pwa-v30-install-icons/);
 assert.match(sw,/'\/radar-light.css'/);
});
