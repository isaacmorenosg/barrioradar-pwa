const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const app=fs.readFileSync(path.join(__dirname,'../public/app.js'),'utf8');
const sql=fs.readFileSync(path.join(__dirname,'../supabase/migrations/20261019_smaller_sectors.sql'),'utf8');
const src=app.slice(app.indexOf('const R='),app.indexOf('const state='));
function prepare() {
 const storage=new Map();
 const raw={id:'100:200',q:100,r:200,lat:0,lng:0,x:0,y:0,city:'Huelva',snapshot:{count:2}};
 storage.set('br_saved_v2',JSON.stringify([raw]));
 storage.set('br_compare_v2',JSON.stringify([raw]));
 const localStorage={getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v)};
 const c={URLSearchParams,Intl,localStorage,location:{search:''}};
 vm.runInNewContext(src+'\nglobalThis.geom={HEX,cellAt,cell,toLL,centerXY,migrateSavedSectors};',c);
 return {geom:c.geom,storage};
}
const {geom,storage}=prepare();
assert.equal(geom.HEX,200,'Grid radius must be 200 Web Mercator metres');
assert.match(app,/zoom:14/,'Default zoom must help select smaller hexes');
assert.match(app,/function chooseLocation\(place,zoom=14\)/,'Search results should open with the new zoom');
for(const [q,r] of [[100,200],[-4845,7459],[-100,-100],[0,0]]){
 const oldXY={x:400*Math.sqrt(3)*(q+r/2),y:600*r};
 const oldCenter=geom.toLL(oldXY.x,oldXY.y);
 const finer=geom.cellAt(oldCenter.lat,oldCenter.lng);
 assert.equal(finer.id,`${q*2}:${r*2}`,'Old center must map exactly to twice the axial coordinates');
 const newCenter=geom.centerXY(q*2,r*2);
 assert.ok(Math.abs(newCenter.x-oldXY.x)<1e-6 && Math.abs(newCenter.y-oldXY.y)<1e-6,'Center coordinates must remain unchanged');
}
let saved=JSON.parse(storage.get('br_saved_v2'));
assert.equal(saved[0].id,'200:400');
assert.equal(saved[0].snapshot,null,'Old grid aggregates must not be cached');
assert.equal(saved[0].city,'Huelva');
geom.migrateSavedSectors();
assert.equal(JSON.parse(storage.get('br_saved_v2'))[0].id,'200:400','Migration must only run once');
assert.equal(JSON.parse(storage.get('br_compare_v2'))[0].id,'200:400');
assert.equal(storage.get('br_sector_grid_revision'),'200');
assert.match(sql,/v_legacy_id:=v_id;/,'Legacy clients must remain compatible');
assert.match(sql,/v_center_x:=200\*sqrt\(3\)/);
assert.match(sql,/v_center_y:=300\*v_rz/);
assert.match(sql,/CREATE OR REPLACE FUNCTION public.br_my_sector_review_v2/);
assert.match(sql,/UPDATE public.br_reviews\s+SET cell_id/);
console.log('PASS: geometry, old-cell conversion, saved selections and migration assumptions');