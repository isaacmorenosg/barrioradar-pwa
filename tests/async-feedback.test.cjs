const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const get=file=>readFileSync(join(__dirname,'../public',file),'utf8');
const app=get('app.js'),theme=get('zonenta-theme.css'),sw=get('sw.js');
test('spinner buttons restore their original content and accessibility state',()=>{
 const start=app.indexOf('const busyButtons=new WeakMap();');
 const end=app.indexOf('const clamp=',start);
 assert.ok(start>=0&&end>start);
 const {actionBusy,actionIdle,busyButtons}=new Function('escapeHtml',app.slice(start,end)+';return {actionBusy,actionIdle,busyButtons};')(
   s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;')
 );
 const classes=new Set(),attrs=new Map();
 const button={innerHTML:'Enviar valoración',disabled:false,
   classList:{add:s=>classes.add(s),remove:s=>classes.delete(s)},
   getAttribute:k=>attrs.has(k)?attrs.get(k):null,
   setAttribute:(k,v)=>attrs.set(k,v),removeAttribute:k=>attrs.delete(k)};
 actionBusy(button,'Comprobando acceso…');
 assert.equal(button.disabled,true);
 assert.equal(attrs.get('aria-busy'),'true');
 assert.ok(button.innerHTML.includes('zonenta-spinner'));
 actionBusy(button,'Enviando…');
 assert.ok(button.innerHTML.includes('Enviando…'));
 actionIdle(button);
 assert.equal(button.innerHTML,'Enviar valoración');
 assert.equal(button.disabled,false);
 assert.equal(attrs.has('aria-busy'),false);
 assert.equal(classes.has('zonenta-busy'),false);
 assert.equal(busyButtons.has(button),false);
});
test('pending requests are always visible but never allow duplicate taps',()=>{
 for(const label of ['Comprobando acceso…','Comprobando valoración…','Enviando valoración…','Enviando enlace…','Cerrando sesión…','Buscando lugares…','Localizando…'])
   assert.ok(app.includes(label),label);
 assert.match(app,/if\(ratingOpening\)return/);
 assert.match(app,/if\(accountOpening\)return/);
 assert.match(app,/if\(busyButtons\.has\(send\)\)return/);
 assert.match(app,/id="reviewCheckStatus" class="review-check-status"/);
 assert.match(app,/finally\{if\(progress\?\.isConnected\)progress\.hidden=true;\}/);
 assert.match(app,/if \(await window\.BarrioAPI\.hasMyReview\(selected\.id\)\)/);
 assert.match(app,/actionIdle\(btn\);[\s\S]*?btn\.innerHTML=initialButtonHtml/);
 assert.match(app,/skipLookup:true/);
 assert.match(theme,/\.zonenta-spinner\{/);
 assert.match(theme,/prefers-reduced-motion:reduce/);
 assert.match(sw,/v37-async-feedback/);
});
