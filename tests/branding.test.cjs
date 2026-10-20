const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const read=p=>readFileSync(join(__dirname,'../public',p),'utf8');
const html=read('index.html'),css=read('zonenta-theme.css'),sw=read('sw.js'),manifest=JSON.parse(read('manifest.webmanifest'));
test('Zonenta identity replaces public branding',()=>{
 assert.match(html,/<title>Zonenta · Conoce el lugar antes de elegirlo\.<\/title>/);
 assert.match(html,/class="zonenta-brand"/);
 assert.match(html,/class="topbar-mobile-brand"/);
 assert.match(html,/class="topbar-mobile-logo"/);
 assert.match(html,/class="topbar-mobile-tagline">Conoce el lugar antes de elegirlo\./);
 assert.match(css,/\.topbar-crumb #crumbCity,\.topbar-crumb \.crumb-chevron\{display:none!important\}/);
 assert.match(read('icons/zonenta-wordmark.svg'),/<path fill="#0F2D5B"/);
 assert.ok(read('icons/zonenta-wordmark.svg').includes('<circle cx="317.32" cy="61" r="8"'), 'El punto naranja debe quedar junto a la palabra');
 assert.match(html,/class="mobile-rate-cta" id="mobileRateCTA" disabled/);
 assert.match(html,/class="mobile-sheet-chip" id="mobileSheetChip"[^>]*disabled/);
 assert.equal(manifest.short_name,'Zonenta');
 assert.equal(manifest.theme_color,'#F8F9FB');
});
test('brand colors do not overwrite sector assessment fills',()=>{
 assert.match(css,/--zonenta-navy:#0F2D5B/);
 assert.match(css,/--zonenta-orange:#FF6B3D/);
 assert.doesNotMatch(css,/\.map-overlay polygon\s*\{[^}]*fill:/);
 assert.match(sw,/zonenta-pwa-v28-ratings-refresh/);
});
