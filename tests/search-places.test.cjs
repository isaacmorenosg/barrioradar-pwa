const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../public/supabase-api.js'), 'utf8');
const app = fs.readFileSync(path.join(__dirname, '../public/app.js'), 'utf8');
const html = fs.readFileSync(path.join(__dirname, '../public/index.html'), 'utf8');
const sw = fs.readFileSync(path.join(__dirname, '../public/sw.js'), 'utf8');
function mockPhoton(place, province='Huelva') {
  return {features:[{properties:{name:place,osm_key:'place',osm_value:'village',countrycode:'ES',state:'Andalucía',county:province},geometry:{coordinates:[-6.543,37.821]}}]};
}
function harness(fn) {
  const requested=[];
  const context={
    window:{BARRIORADAR_CONFIG:{}},URL,AbortController,setTimeout,clearTimeout,
    fetch:async (url)=>{
      const u=new URL(url.toString());requested.push(u);
      const data=await fn(u);
      if(data instanceof Error)throw data;
      return {ok:true,json:async()=>data};
    },
  };
  vm.runInNewContext(source,context);
  return {api:context.window.BarrioAPI,requested};
}

test('Localidad muy pequeña: el servicio oficial permite buscar Zufre y localizarlo al seleccionar',async()=>{
  const {api,requested}=harness(url=>{
    if(url.pathname.endsWith('/candidates'))return [
      {id:'21080',type:'municipio',address:'Zufre, Huelva',province:'Huelva',lat:null,lng:null},
      {id:'100',type:'callejero',address:'Calle Zufre',province:'Huelva',lat:37.8,lng:-6.5}
    ];
    if(url.pathname.endsWith('/find'))return {id:'21080',type:'municipio',lat:37.833,lng:-6.336};
    if(url.pathname==='/api/')return {features:[]};
    throw new Error('Unknown request');
  });
  const results=await api.searchPlaces('Zufre');
  assert.equal(results.length,1);
  assert.equal(results[0].name,'Zufre, Huelva');
  assert.equal(results[0].lat,null);
  assert.equal(results[0].source,'cartociudad');
  const resolved=await api.resolvePlace(results[0]);
  assert.equal(resolved.lat,37.833);
  assert.equal(resolved.lng,-6.336);
  assert.equal(requested.filter(u=>u.pathname.endsWith('find')).length,1);
  assert.equal(requested[0].searchParams.get('countrycodes'),'es');
});

test('Búsqueda global sin lista cerrada: pueblos fuera de los presets, usando Photon solo con país ES',async()=>{
  const {api,requested}=harness(url=>{
    if(url.pathname.endsWith('/candidates'))return new Error('CartoCiudad temporalmente no disponible');
    return {features:[...mockPhoton('Jabugo').features,
      {properties:{name:'London',countrycode:'GB',osm_value:'city'},geometry:{coordinates:[-0.12,51.5]}},
      {properties:{name:'Hotel Jabugo',countrycode:'ES',osm_value:'hotel'},geometry:{coordinates:[-6.54,37.82]}}]};
  });
  const places=await api.searchPlaces('Jabugo');
  assert.equal(places.length,1);
  assert.match(places[0].name,/Jabugo/);
  assert.equal(places[0].source,'photon');
  assert.equal((await api.resolvePlace(places[0])).lat,37.821);
  const photon=requested.find(u=>u.hostname==='photon.komoot.io');
  assert.equal(photon.searchParams.get('countrycode'),'ES');
  assert.equal(photon.searchParams.get('limit'),'30');
  assert.equal(photon.searchParams.get('bbox'),'-18.5,27,5,44.5');
});

test('Municipio y localidad homónimos entre provincias no se fusionan; se prioriza el nombre exacto',async()=>{
  const {api}=harness(url=>url.pathname.endsWith('candidates')?[
    {id:'x1',type:'municipio',address:'Sada',province:'A Coruña'},
    {id:'x2',type:'municipio',address:'Sada',province:'Navarra'},
    {id:'x3',type:'municipio',address:'Caldas de Sada',province:'A Coruña'}
  ]:{features:[]});
  const places=await api.searchPlaces('Sada');
  assert.equal(places.length,3);
  assert.equal(places[0].name,'Sada, A Coruña');
  assert.equal(places[1].name,'Sada, Navarra');
  assert.equal(places[2].name,'Caldas de Sada, A Coruña');
});

test('Una localidad encontrada por ambos proveedores aparece una sola vez y conserva coordenada alternativa',async()=>{
  const {api}=harness(url=>url.pathname.endsWith('candidates')?
    [{id:'21',type:'poblacion',address:'El Rocío, Almonte',muni:'Almonte',province:'Huelva'}]:
    url.pathname.endsWith('find')?new Error('No disponible'):
    {features:[{properties:{name:'El Rocío',city:'Almonte',county:'Huelva',countrycode:'ES',osm_value:'village'},geometry:{coordinates:[-6.485,37.13]}}]});
  const places=await api.searchPlaces('El Rocío');
  assert.equal(places.length,1);
  assert.equal(places[0].name,'El Rocío, Almonte, Huelva');
  assert.equal(places[0].source,'cartociudad');
  const resolved=await api.resolvePlace(places[0]);
  assert.equal(resolved.lat,37.13);
  assert.equal(resolved.lng,-6.485);
});

test('La respuesta oficial puede dar coordenadas directamente, incluidas las georreferencias WKT',async()=>{
  const {api}=harness(url=>url.pathname.endsWith('candidates')?
    [{id:'1',type:'poblacion',address:'Aracena',province:'Huelva'}]:
    url.pathname.endsWith('find')?{geom:'POINT (-6.5612 37.8956)',lat:null,lng:null}:
    {features:[]});
  const [place]=await api.searchPlaces('Aracena');
  const r=await api.resolvePlace(place);
  assert.equal(r.lat,37.8956);
  assert.equal(r.lng,-6.5612);
});

test('Si ambos proveedores fallan, no se inventa un resultado',async()=>{
  const {api}=harness(()=>new Error('Sin conexión'));
  await assert.rejects(()=>api.searchPlaces('Moguer'),/servicios de búsqueda no responden/);
});

test('Cachea la misma búsqueda y no requiere nuevos envíos por cada tecla',async()=>{
  const {api,requested}=harness(url=>url.pathname.endsWith('candidates')?
    [{id:1,type:'municipio',address:'Bollullos Par del Condado',province:'Huelva',lat:37.34,lng:-6.54}]:{features:[]});
  const p1=await api.searchPlaces('Bollullos Par del Condado');
  const p2=await api.searchPlaces('Bollullos Par del Condado');
  assert.equal(p1.length,1);
  assert.equal(p2.length,1);
  assert.equal(requested.length,2);
});

test('Interfaz: se resuelven las coordenadas antes de centrar el mapa',()=>{
  assert.match(app,/chooseLocation\(await window\.BarrioAPI\.resolvePlace\(places\[0\]\)\)/);
  assert.match(app,/const position=await window\.BarrioAPI\.resolvePlace\(place\)/);
  assert.doesNotMatch(app,/PRESETS\[clean\(query\.replace\(/);
  assert.match(html,/Busca cualquier ciudad o pueblo de España/);
  assert.match(sw,/zonenta-pwa-v29-comparison-palette/);
});