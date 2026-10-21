const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const get=p=>readFileSync(join(__dirname,'../public',p),'utf8');
const app=get('app.js'),html=get('index.html'),privacy=get('privacidad.html'),sw=get('sw.js');
test('Public-facing counts and comments use simple opinion labels',()=>{
 assert.match(app,/'1 opinión':\x60\$\{fmtNum\(count\)\} opiniones\x60/);
 assert.match(app,/record\.count===1\?'opinión':'opiniones'/);
 assert.match(app,/<strong>Comentarios de vecinos<\/strong>/);
 assert.match(app,/Muestra intermedia/);
 assert.doesNotMatch(html,/moderad|aprobada|moderaci[oó]n/i);
 assert.doesNotMatch(privacy,/moderad|aprobados|moderaci[oó]n/i);
});
test('Before submitting, no public screen describes opinions as moderated',()=>{
 const before=app.slice(0,app.indexOf('APORTACIÓN RECIBIDA'));
 assert.doesNotMatch(before,/opiniones? moderadas?|opiniones? aprobadas?|moderaci[oó]n|un moderador/i);
 assert.match(app,/Puedes valorar tantas zonas como quieras/);
});
test('After submitting, moderation and publication remain clearly explained',()=>{
 assert.match(app,/await window\.BarrioAPI\.sendReview/);
 assert.match(app,/Tu opinión está en revisión/);
 assert.match(app,/Se mostrará en el mapa en cuanto un moderador la apruebe/);
 assert.match(sw,/v46-auto-geolocation/);
});
