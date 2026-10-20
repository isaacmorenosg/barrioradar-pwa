const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const app=readFileSync(join(__dirname,'../public/app.js'),'utf8');
const api=readFileSync(join(__dirname,'../public/supabase-api.js'),'utf8');
const shell=readFileSync(join(__dirname,'../public/radar-ui.js'),'utf8');
const sw=readFileSync(join(__dirname,'../public/sw.js'),'utf8');
test('public sector comments have a dedicated paginated RPC',()=>{
  assert.match(api,/rpc\('br_sector_comments'/);
  assert.match(api,/p_offset:Number\(offset\)/);
  assert.match(api,/getSectorComments, sendReview/);
});
test('selected sector can progressively render all approved comments',()=>{
  assert.match(app,/commentsView\.items\.push\(\.\.\.page\.comments\)/);
  assert.match(app,/commentsView\.items\.length,20/);
  assert.match(app,/Ver más comentarios/);
  assert.doesNotMatch(app,/Hasta 5 comentarios recientes/);
  assert.match(app,/escapeHtml\(item\.text\)/);
});
test('pinch zoom uses two pointers without selecting a sector',()=>{
  assert.match(app,/const activePointers=new Map\(\)/);
  assert.match(app,/const ratio=current\.distance\/pinch\.distance/);
  assert.match(app,/changeZoom\(ratio>1\?1:-1/);
  assert.match(app,/if\(pinchUsed\)\{/);
  assert.doesNotMatch(shell,/map\.addEventListener\('pointerup'/); // All automatic mobile sheet opens were removed.
});
test('PWA cache version is bumped for gesture and comments changes',()=>{
  assert.match(sw,/zonenta-pwa-v35-original-splash/);
});
