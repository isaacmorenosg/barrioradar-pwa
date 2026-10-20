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
 assert.match(read('icons/zonenta-lockup.svg'),/cx="325" cy="61" r="8"/);
 assert.match(html,/class="mobile-rate-cta" id="mobileRateCTA" disabled/);
 assert.match(html,/class="mobile-sheet-chip" id="mobileSheetChip"[^>]*disabled/);
 assert.equal(manifest.short_name,'Zonenta');
 assert.equal(manifest.theme_color,'#F8F9FB');
});
test('brand colors do not overwrite sector assessment fills',()=>{
 assert.match(css,/--zonenta-navy:#0F2D5B/);
 assert.match(css,/--zonenta-orange:#FF6B3D/);
 assert.doesNotMatch(css,/\.map-overlay polygon\s*\{[^}]*fill:/);
 assert.match(sw,/zonenta-pwa-v34-z-icon/);
});

test('Android installation uses updated PNG brand icons and maskable artwork',()=>{
 assert.deepEqual(manifest.icons.filter(i=>i.type==='image/png').map(i=>i.sizes),['192x192','512x512','512x512']);
 assert.ok(manifest.icons.some(i=>i.purpose==='maskable'&&i.src==='/icons/zonenta-z-maskable-512.png'));
 for(const file of ['zonenta-192.png','zonenta-512.png','zonenta-maskable-512.png','icon-192.png','icon-512.png']){
  const bytes=readFileSync(join(__dirname,'../public/icons',file));
  assert.equal(bytes.subarray(0,4).toString('hex'),'89504e47');
 }
 assert.match(html,/rel="apple-touch-icon"[^>]+zonenta-z-180\.png/);
 assert.match(sw,/zonenta-pwa-v34-z-icon/);
});

test('splash and header use a complete logo image',()=>{assert.match(html,/id="zonentaSplash"/);assert.match(html,/class="zonenta-splash-art" src="data:image\/svg\+xml,/);assert.match(html,/class="zonenta-splash-center" src="data:image\/svg\+xml,/);assert.match(read('splash.js'),/zonenta:app-ready/);assert.equal(manifest.name,'Zonenta');});

test('orange dot does not touch the last letter at small sizes',()=>{
 const lockup=read('icons/zonenta-lockup.svg');
 const compact=read('icons/zonenta-wordmark.svg');
 for(const svg of [lockup,compact]){
  const dot=svg.match(/<circle cx="([0-9.]+)" cy="61" r="([0-9.]+)"/);
  assert.ok(dot,'A standalone orange punctuation mark must be present');
  // The final letter's rightmost vector x-coordinate is 312.18.
  const clearSpace=Number(dot[1])-Number(dot[2])-312.18;
  assert.ok(clearSpace>=3&&clearSpace<=6,'The dot must be very close to the last a without touching it');
 }
 assert.match(compact,/viewBox="0 0 356 90"/);
 assert.match(lockup,/viewBox="0 0 1000 350"/);
});

test('in-app opening image is visible from the first document paint',()=>{
  assert.ok(html.indexOf('id="zonenta-splash-critical"')>0);
  assert.match(html,/class="zonenta-splash-art" src="data:image\/svg\+xml,/);
  assert.match(html,/class="zonenta-splash-center" src="data:image\/svg\+xml,/);
  assert.ok(html.indexOf('<script src="/splash.js" defer></script>')<html.indexOf('<link rel="stylesheet" href="/styles.css">'));
});

test('startup transitions from a plain white screen to the map before showing the app',()=>{
 const firstPaint=html.slice(html.indexOf('<style id="zonenta-splash-critical">'),html.indexOf('</style>'));
 assert.match(firstPaint,/\.zonenta-splash\{[^}]*background:#fff/);
 assert.match(firstPaint,/\.zonenta-splash-art\{[^}]*opacity:0;animation:zonenta-map-appear/);
 assert.match(firstPaint,/\.zonenta-splash-brand\{[^}]*opacity:0;animation:zonenta-logo-appear/);
 assert.match(read('splash.js'),/1500-\(performance\.now\(\)-started\)/);
 assert.match(sw,/zonenta-pwa-v34-z-icon/);
});

test('selected orange and navy Z icon is used across PWA, splash and favicon',()=>{
 const icon=read('icons/zonenta-brand-icon.svg');
 assert.match(icon,/aria-label="Zonenta/);
 assert.match(icon,/<path fill="url\(#navy\)"/);
 assert.match(icon,/<path fill="url\(#orange\)"/);
 assert.deepEqual(manifest.icons.slice(0,3).map(x=>x.src),[
  '/icons/zonenta-z-192.png','/icons/zonenta-z-512.png','/icons/zonenta-z-maskable-512.png'
 ]);
 assert.match(html,/class="zonenta-splash-icon" src="data:image\/svg\+xml,/);
 assert.match(html,/href="\/icons\/zonenta-brand-icon\.svg"/);
 assert.match(html,/href="\/icons\/zonenta-z-32\.png"/);
 assert.match(html,/href="\/favicon\.ico"/);
 assert.match(sw,/zonenta-pwa-v34-z-icon/);
});
