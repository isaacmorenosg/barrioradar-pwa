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
 assert.match(html,/class="topbar-mobile-logo"[^>]+zonenta-lockup\.svg/);
 assert.match(css,/\.topbar-crumb #crumbCity,\.topbar-crumb \.crumb-chevron\{display:none!important\}/);
 assert.match(read('icons/zonenta-wordmark.svg'),/<path fill="#0F2D5B"/);
 assert.match(read('icons/zonenta-lockup.svg'),/cx="336" cy="61" r="8"/);
 assert.match(html,/class="mobile-rate-cta" id="mobileRateCTA" disabled/);
 assert.match(html,/class="mobile-sheet-chip" id="mobileSheetChip"[^>]*disabled/);
 assert.equal(manifest.short_name,'Zonenta');
 assert.equal(manifest.theme_color,'#F8F9FB');
});
test('brand colors do not overwrite sector assessment fills',()=>{
 assert.match(css,/--zonenta-navy:#0F2D5B/);
 assert.match(css,/--zonenta-orange:#FF6B3D/);
 assert.doesNotMatch(css,/\.map-overlay polygon\s*\{[^}]*fill:/);
 assert.match(sw,/zonenta-pwa-v31-brand-splash/);
});

test('Android installation uses updated PNG brand icons and maskable artwork',()=>{
 assert.deepEqual(manifest.icons.filter(i=>i.type==='image/png').map(i=>i.sizes),['192x192','512x512','512x512']);
 assert.ok(manifest.icons.some(i=>i.purpose==='maskable'&&i.src==='/icons/zonenta-maskable-512.png'));
 for(const file of ['zonenta-192.png','zonenta-512.png','zonenta-maskable-512.png','icon-192.png','icon-512.png']){
  const bytes=readFileSync(join(__dirname,'../public/icons',file));
  assert.equal(bytes.subarray(0,4).toString('hex'),'89504e47');
 }
 assert.match(html,/rel="apple-touch-icon"[^>]+zonenta-192\.png/);
 assert.match(sw,/zonenta-pwa-v31-brand-splash/);
});

test('splash and header use a complete logo image',()=>{assert.match(html,/id="zonentaSplash"/);assert.match(html,/zonenta-opening\.svg/);assert.match(html,/zonenta-lockup\.svg/);assert.match(read('splash.js'),/zonenta:app-ready/);assert.equal(manifest.name,'Zonenta');});

test('orange dot does not touch the last letter at small sizes',()=>{
 const lockup=read('icons/zonenta-lockup.svg');
 const compact=read('icons/zonenta-wordmark.svg');
 for(const svg of [lockup,compact]){
  const dot=svg.match(/<circle cx="([0-9.]+)" cy="61" r="([0-9.]+)"/);
  assert.ok(dot,'A standalone orange punctuation mark must be present');
  // The final letter's rightmost vector x-coordinate is 312.18.
  const clearSpace=Number(dot[1])-Number(dot[2])-312.18;
  assert.ok(clearSpace>=15,'The orange dot must be visibly separated from the last a');
 }
 assert.match(compact,/viewBox="0 0 356 90"/);
 assert.match(lockup,/viewBox="0 0 1000 350"/);
});
