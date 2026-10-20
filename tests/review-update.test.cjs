const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.join(__dirname, '../public');
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const api = fs.readFileSync(path.join(root, 'supabase-api.js'), 'utf8');
const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
let passed = 0;
function test(name, fn) { fn(); passed++; console.log('PASS', name); }
function makeApi({verified=true, present=false, malformed=false}={}) {
 let calls=[];
 const supabase = {
  createClient: ()=>({
   auth:{
    getUser:async()=>({data:{user:verified?{id:'auth1',email:'example@example.com',email_confirmed_at:'2026-10-19T00:00:00Z'}:null},error:null}),
    onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})
   },
   rpc:async(name,args)=>{calls.push([name,args]);return {data:malformed?{}:{exists:present},error:null};}
  })
 };
 const context={window:{supabase,BARRIORADAR_CONFIG:{supabaseUrl:'https://abcd.supabase.co',supabasePublishableKey:'sb_publishable_TESTKEY'}},location:{origin:'https://barrioradar-pwa.onrender.com'},setTimeout};
 vm.runInNewContext(api, context, {filename:'supabase-api.js'});
 return {API:context.window.BarrioAPI,calls};
}
async function main(){
 test('PWA cache version bumped',()=>assert.match(sw,/barrioradar-pulse-mapas-v20-map-selection-legend/));
 test('New sector form describes unlimited reviews',()=>assert.match(app,/Puedes valorar tantas zonas como quieras/));
 test('Existing sector message informs about replacing previous',()=>assert.match(app,/Ya has valorado esta zona/));
 test('Existing sector message remains hidden initially',()=>assert.match(app,/id="existingReviewNotice"[^>]+hidden/));
 test('Submit rechecks server immediately before sending',()=>assert.ok(app.lastIndexOf('BarrioAPI.hasMyReview(selected.id)') < app.indexOf('BarrioAPI.sendReview({...values')));
 test('Submit requires user consent before overwriting',()=>assert.match(app,/if \(await window\.BarrioAPI\.hasMyReview\(selected\.id\)\)\s*\{\s*const confirmed = window\.confirm/));
 test('Cancelled edit preserves existing record',()=>assert.match(app,/if \(!confirmed\)[\s\S]*?return;/));
 test('Review text remains optional, max 500 characters',()=>assert.match(app,/name="comment"[^>]*maxlength="500"/));
 test('Check does not disclose another email or user review content',()=>assert.doesNotMatch(api,/getClient\(\)\.from\('br_reviews'\)/));
 let x=makeApi({present:true});
 assert.equal(await x.API.hasMyReview('-4845:7459'),true);
 assert.equal(x.calls.length,1);
 assert.equal(x.calls[0][0],'br_my_sector_review_v2');
 assert.equal(x.calls[0][1].p_cell_id,'-4845:7459');
 console.log('PASS Authenticated existing review returns true');passed++;
 x=makeApi({present:false});assert.equal(await x.API.hasMyReview('-4845:7459'),false); console.log('PASS Authenticated new review returns false');passed++;
 x=makeApi({verified:false});await assert.rejects(x.API.hasMyReview('-4845:7459'),/verifica primero/);assert.equal(x.calls.length,0);console.log('PASS Unverified session rejected before RPC');passed++;
 x=makeApi({malformed:true});await assert.rejects(x.API.hasMyReview('-4845:7459'),/No se pudo comprobar/);console.log('PASS Uncertain result cannot overwrite');passed++;
 console.log(`${passed} tests passed`);
}
main().catch(e=>{console.error(e);process.exitCode=1;});