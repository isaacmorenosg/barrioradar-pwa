const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const read=p=>readFileSync(join(__dirname,'../public',p),'utf8');
const html=read('index.html'),css=read('zonenta-theme.css'),sw=read('sw.js'),manifest=JSON.parse(read('manifest.webmanifest'));
test('Zonenta identity replaces public branding',()=>{
 assert.match(html,/<title>Zonenta · Conoce el lugar antes de elegirlo\.<\/title>/);
 assert.match(html,/class="zonenta-brand"/);
 assert.match(html,/class="topbar-mobile-logo"/);
 assert.equal(manifest.short_name,'Zonenta');
 assert.equal(manifest.theme_color,'#F8F9FB');
});
test('brand colors do not overwrite sector assessment fills',()=>{
 assert.match(css,/--zonenta-navy:#0F2D5B/);
 assert.match(css,/--zonenta-orange:#FF6B3D/);
 assert.doesNotMatch(css,/\.map-overlay polygon\s*\{[^}]*fill:/);
 assert.match(sw,/zonenta-pwa-v26-branding/);
});
