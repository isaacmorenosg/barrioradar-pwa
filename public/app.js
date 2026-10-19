/* BarrioRadar: datos reales; muestra visual segregada mediante ?muestras=1 */
(() => {
'use strict';
const R=6378137, TAU=Math.PI*2, WORLD=TAU*R, HEX=400, SQRT3=Math.sqrt(3);
const PRESETS={
  'sevilla':{name:'Sevilla',lat:37.3891,lng:-5.9845},
  'huelva':{name:'Huelva',lat:37.2614,lng:-6.9447},
  'madrid':{name:'Madrid',lat:40.4168,lng:-3.7038},
  'barcelona':{name:'Barcelona',lat:41.3874,lng:2.1686},
  'valencia':{name:'Valencia',lat:39.4699,lng:-0.3763},
  'malaga':{name:'Málaga',lat:36.7213,lng:-4.4214},
  'zaragoza':{name:'Zaragoza',lat:41.6488,lng:-0.8891},
  'granada':{name:'Granada',lat:37.1773,lng:-3.5986},
  'cadiz':{name:'Cádiz',lat:36.5297,lng:-6.2927},
  'cordoba':{name:'Córdoba',lat:37.8882,lng:-4.7794},
  'alicante':{name:'Alicante',lat:38.3452,lng:-0.4810},
  'murcia':{name:'Murcia',lat:37.9922,lng:-1.1307},
  'bilbao':{name:'Bilbao',lat:43.2630,lng:-2.9350},
  'santander':{name:'Santander',lat:43.4623,lng:-3.8099},
  'san sebastian':{name:'San Sebastián',lat:43.3183,lng:-1.9812},
  'pamplona':{name:'Pamplona',lat:42.8125,lng:-1.6458},
  'valladolid':{name:'Valladolid',lat:41.6523,lng:-4.7245},
  'salamanca':{name:'Salamanca',lat:40.9701,lng:-5.6635},
  'vigo':{name:'Vigo',lat:42.2406,lng:-8.7207},
  'a coruna':{name:'A Coruña',lat:43.3623,lng:-8.4115},
  'santiago de compostela':{name:'Santiago de Compostela',lat:42.8782,lng:-8.5448},
  'oviedo':{name:'Oviedo',lat:43.3614,lng:-5.8494},
  'gijon':{name:'Gijón',lat:43.5322,lng:-5.6611},
  'burgos':{name:'Burgos',lat:42.3439,lng:-3.6969},
  'toledo':{name:'Toledo',lat:39.8628,lng:-4.0273},
  'badajoz':{name:'Badajoz',lat:38.8794,lng:-6.9707},
  'caceres':{name:'Cáceres',lat:39.4753,lng:-6.3724},
  'almeria':{name:'Almería',lat:36.8340,lng:-2.4637},
  'jaen':{name:'Jaén',lat:37.7796,lng:-3.7849},
  'logrono':{name:'Logroño',lat:42.4627,lng:-2.4449},
  'leon':{name:'León',lat:42.5987,lng:-5.5671},
  'las palmas de gran canaria':{name:'Las Palmas de Gran Canaria',lat:28.1235,lng:-15.4363},
  'santa cruz de tenerife':{name:'Santa Cruz de Tenerife',lat:28.4636,lng:-16.2518},
  'palma':{name:'Palma',lat:39.5696,lng:2.6502}
};
const EL=id=>document.getElementById(id);
const icon=name=>`<svg class="icon"><use href="/icons.svg#${name}"/></svg>`;
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
const clean=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim().replace(/\s+/g,' ');
const fmtNum=n=>new Intl.NumberFormat('es-ES').format(n);
function safeRead(key,def){try{return JSON.parse(localStorage.getItem(key))||def;}catch{return def;}}
function saveStore(key,value){try{localStorage.setItem(key,JSON.stringify(value));}catch{}}
function meters(lat,lng){return{x:R*lng*Math.PI/180,y:R*Math.log(Math.tan(Math.PI/4+lat*Math.PI/360))};}
function toLL(x,y){return {lat:(2*Math.atan(Math.exp(y/R))-Math.PI/2)*180/Math.PI,lng:x/R*180/Math.PI};}
function toPx(lat,lng,z){const scale=256*2**z;const ll=meters(lat,lng);return{x:(ll.x+WORLD/2)/WORLD*scale,y:(WORLD/2-ll.y)/WORLD*scale};}
function pxToLL(x,y,z){const scale=256*2**z;return toLL(x/scale*WORLD-WORLD/2,WORLD/2-y/scale*WORLD);}
function cubeRound(q,r){let x=q,z=r,y=-x-z;let rx=Math.round(x),ry=Math.round(y),rz=Math.round(z);let dx=Math.abs(rx-x),dy=Math.abs(ry-y),dz=Math.abs(rz-z);if(dx>dy&&dx>dz)rx=-ry-rz;else if(dy>dz)ry=-rx-rz;else rz=-rx-ry;return{q:rx,r:rz};}
function axial(x,y){return cubeRound((SQRT3/3*x-y/3)/HEX,(2/3*y)/HEX);}
function centerXY(q,r){return{x:HEX*SQRT3*(q+r/2),y:HEX*1.5*r};}
function cellAt(lat,lng){const m=meters(lat,lng);const {q,r}=axial(m.x,m.y);return cell(q,r);}
function cell(q,r){const pos=centerXY(q,r),loc=toLL(pos.x,pos.y);return {q,r,id:`${q}:${r}`,x:pos.x,y:pos.y,lat:loc.lat,lng:loc.lng};}
function sectorName(c){const n=Math.abs((c.q*31337+c.r*7919)%65535);return `Sector ${n.toString(16).toUpperCase().padStart(4,'0')}`;}

// VISTA OPCIONAL Y EXPLICITA: no son experiencias reales ni se guardan en Supabase.
// Se activa unicamente con ?muestras=1 y nunca se mezcla con los agregados reales.
const PREVIEW_MODE = new URLSearchParams(location.search).get('muestras')==='1';
const SAMPLE_PLACES = [
  // Referencias de mapa aproximadas; todas las valoraciones, textos y cantidades son ficticios.
  {name:'Centro',lat:37.2601,lng:-6.9500,count:12,day:4.4,night:3.7,light:3.9,noise:2.8,notes:['De día se percibe más movimiento.','Por la noche, la iluminación podría influir en la experiencia.']},
  {name:'La Merced',lat:37.2653,lng:-6.9490,count:8,day:4.1,night:3.3,light:3.0,noise:3.6,notes:['El ambiente cambia según la hora.','Preferiría algunas zonas más iluminadas.']},
  {name:'Zafra',lat:37.2677,lng:-6.9560,count:11,day:3.8,night:3.5,light:3.8,noise:2.8,notes:['Me resultan más cómodos los recorridos conocidos.','El ruido es distinto por la tarde y por la noche.']},
  {name:'Alameda Sundheim',lat:37.2534,lng:-6.9446,count:15,day:4.5,night:4.0,light:4.1,noise:3.0,notes:['Se valoraría positivamente una buena iluminación.','La sensación de tranquilidad depende del momento.']},
  {name:'Barrio Reina Victoria',lat:37.2548,lng:-6.9350,count:9,day:4.0,night:3.8,light:3.2,noise:4.2,notes:['Me parece importante el entorno al caminar.','Suelo fijarme en el ambiente de cada calle.']},
  {name:'Isla Chica',lat:37.2583,lng:-6.9285,count:17,day:3.9,night:3.2,light:3.5,noise:2.6,notes:['Hay más actividad en unas horas que en otras.','El confort acústico influye en mi valoración.']},
  {name:'El Conquero',lat:37.2735,lng:-6.9416,count:7,day:4.3,night:4.0,light:3.4,noise:4.2,notes:['Me gustaría comparar la zona de día y de noche.','Valoro la sensación de calma al pasear.']},
  {name:'El Matadero',lat:37.2483,lng:-6.9492,count:10,day:3.8,night:3.1,light:2.9,noise:3.7,notes:['La iluminación puede cambiar la percepción nocturna.','Prefiero rutas con más presencia de gente.']},
  {name:'Molino de la Vega',lat:37.2693,lng:-6.9622,count:6,day:3.5,night:2.9,light:2.6,noise:3.4,notes:['Me fijaría en la iluminación de las calles.','Mi percepción varía según el trayecto.']},
  {name:'La Orden',lat:37.2800,lng:-6.9417,count:13,day:4.0,night:3.4,light:3.3,noise:3.7,notes:['El ambiente cotidiano puede cambiar según la hora.','La experiencia depende de cada persona.']}
];
// Las ubicaciones elegidas son solo para comprobar los colores y la interfaz.
// Si dos puntos acaban en la misma cuadricula, se usa una sola muestra.
function previewRecords(){
  const seen=new Set();
  return SAMPLE_PLACES.map(p=>({...cellAt(p.lat,p.lng),...p,preview:true}))
    .filter(p=>{if(seen.has(p.id))return false;seen.add(p.id);return true;});
}

const state={city:'Huelva',center:{lat:37.2614,lng:-6.9447},zoom:PREVIEW_MODE?14:13,mode:'night',realCells:[],selected:null,saved:safeRead('br_saved_v2',[]).filter(i=>!i.demo).map(i=>({...i,snapshot:null})),comparison:safeRead('br_compare_v2',[]).filter(i=>!i.demo).map(i=>({...i,snapshot:null})),view:'explorar',deferredInstall:null};
const map={viewport:null,tiles:null,overlay:null,w:0,h:0,drag:null,readSeq:0};
let toastTimer=0;
function toast(message){const el=EL('toast');el.textContent=message;el.classList.add('shown');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('shown'),3300);}
function activeCells(){return state.realCells;}
function scoreColor(value){if(value>=3.7)return {fill:'#7fc99b',stroke:'#4eab7a',label:'Más tranquilidad',text:'#246246'};if(value>=2.8)return{fill:'#f5bd75',stroke:'#df9d48',label:'Opiniones mixtas',text:'#78572d'};return{fill:'#ed9d8a',stroke:'#d87c6b',label:'Más reservas',text:'#824337'};}
function currentScore(item){return Number(item[state.mode]||0);}
function selectedRecord(){return activeCells().find(c=>c.id===state.selected?.id)||null;}
function displayedCity(){return state.city.replace(/, España$/i,'');}
function drawBackground(){map.viewport.style.backgroundPosition=`${Math.round(state.center.lng*11)%200}px ${Math.round(state.center.lat*11)%200}px`;}
function mapBounds(){const cp=toPx(state.center.lat,state.center.lng,state.zoom),padding=25;const sw=pxToLL(cp.x-map.w/2-padding,cp.y+map.h/2+padding,state.zoom),ne=pxToLL(cp.x+map.w/2+padding,cp.y-map.h/2-padding,state.zoom);return {west:sw.lng,south:sw.lat,east:ne.lng,north:ne.lat};}
function tileRender(){
  if(!map.w||!map.h)return;
  const center=toPx(state.center.lat,state.center.lng,state.zoom),size=256,n=2**state.zoom;
  const x0=Math.floor((center.x-map.w/2)/size),x1=Math.floor((center.x+map.w/2)/size);
  const y0=Math.floor((center.y-map.h/2)/size),y1=Math.floor((center.y+map.h/2)/size);
  const desired=new Map();
  for(let x=x0;x<=x1;x++)for(let y=y0;y<=y1;y++){
    if(y<0||y>=n)continue;
    const normalizedX=((x%n)+n)%n;
    const key=`${state.zoom}/${normalizedX}/${y}`;
    const left=Math.floor(x*256-center.x+map.w/2),top=Math.floor(y*256-center.y+map.h/2);
    desired.set(`${state.zoom}/${x}/${y}`,{key,left,top});
  }
  const current=Array.from(map.tiles.children);
  for(const img of current)if(!desired.has(img.dataset.tile))img.remove();
  const existing=new Map(Array.from(map.tiles.children).map(img=>[img.dataset.tile,img]));
  for(const [key,tile] of desired){
    let img=existing.get(key);
    if(!img){img=document.createElement('img');img.dataset.tile=key;img.alt='';img.draggable=false;img.decoding='async';img.loading='eager';img.onerror=()=>img.remove();img.referrerPolicy='strict-origin-when-cross-origin';img.src=`https://tile.openstreetmap.org/${tile.key}.png`;map.tiles.appendChild(img);}
    img.style.left=`${tile.left}px`;img.style.top=`${tile.top}px`;
  }
  drawBackground();
}
function projectedXY(lat,lng){const center=toPx(state.center.lat,state.center.lng,state.zoom),pt=toPx(lat,lng,state.zoom);return{x:pt.x-center.x+map.w/2,y:pt.y-center.y+map.h/2};}
function hexPoints(c){const pts=[];for(let i=0;i<6;i++){const angle=Math.PI/180*(60*i-30);const p=toLL(c.x+HEX*.96*Math.cos(angle),c.y+HEX*.96*Math.sin(angle));const scr=projectedXY(p.lat,p.lng);pts.push(`${scr.x.toFixed(1)},${scr.y.toFixed(1)}`);}return pts.join(' ');}
function overlayRender(){
  if(!map.w||!map.h)return;
  map.overlay.setAttribute('viewBox',`0 0 ${map.w} ${map.h}`);
  const active=activeCells();
  let out='';
  for(const c of active){
    const cp=projectedXY(c.lat,c.lng);
    if(cp.x< -85||cp.x>map.w+85||cp.y< -85||cp.y>map.h+85)continue;
    const tone=scoreColor(currentScore(c));
    const isSelected=c.id===state.selected?.id;
    out+=`<polygon data-cell="${c.id}" points="${hexPoints(c)}" fill="${tone.fill}" fill-opacity="${isSelected?.79:(!PREVIEW_MODE&&c.count<5?.38:.58)}" stroke="${isSelected?'#20533e':tone.stroke}" stroke-width="${isSelected?2.5:1.4}" stroke-opacity=".9" stroke-dasharray="${!PREVIEW_MODE&&c.count<5?'5 4':'none'}"/>`;
    if(state.zoom>=14.5)out+=`<text class="polygon-count" x="${cp.x.toFixed(1)}" y="${(cp.y+4).toFixed(1)}" text-anchor="middle">${c.count}</text>`;
  }
  if(state.selected){out+=`<polygon class="selected-ring" points="${hexPoints(state.selected)}"/>`;}
  map.overlay.innerHTML=out;
}
function renderAllMap(){tileRender();overlayRender();}
function positionFromPointer(event){const box=map.viewport.getBoundingClientRect();return{x:event.clientX-box.left,y:event.clientY-box.top};}
function pointerToCoord(pt){const center=toPx(state.center.lat,state.center.lng,state.zoom);return pxToLL(center.x+pt.x-map.w/2,center.y+pt.y-map.h/2,state.zoom);}
function initMap(){
  map.viewport=EL('mapViewport');map.tiles=EL('mapTiles');map.overlay=EL('mapOverlay');
  const resize=()=>{const box=map.viewport.getBoundingClientRect();map.w=Math.round(box.width);map.h=Math.round(box.height);renderAllMap();};
  new ResizeObserver(resize).observe(map.viewport);resize();
  map.viewport.addEventListener('pointerdown',e=>{
    if(e.button!==0&&e.pointerType==='mouse')return;
    const point=positionFromPointer(e);map.drag={x:e.clientX,y:e.clientY,startPoint:point,center:toPx(state.center.lat,state.center.lng,state.zoom),moved:false};
    map.viewport.setPointerCapture(e.pointerId);
  });
  map.viewport.addEventListener('pointermove',e=>{
    if(!map.drag)return;
    const dx=e.clientX-map.drag.x,dy=e.clientY-map.drag.y;
    if(Math.hypot(dx,dy)>5)map.drag.moved=true;
    if(map.drag.moved){map.viewport.classList.add('is-dragging');map.tiles.style.transform=`translate(${dx}px, ${dy}px)`;map.overlay.style.transform=`translate(${dx}px, ${dy}px)`;}
  });
  const endDrag=(e)=>{
    if(!map.drag)return;
    const drag=map.drag;map.drag=null;
    map.viewport.classList.remove('is-dragging');map.tiles.style.transform='';map.overlay.style.transform='';
    if(drag.moved){
      const dx=e.clientX-drag.x,dy=e.clientY-drag.y;
      const center=pxToLL(drag.center.x-dx,drag.center.y-dy,state.zoom);
      state.center={lat:clamp(center.lat,27,44.7),lng:clamp(center.lng,-18.7,5.1)};
      renderAllMap();refreshRealData();
    } else {
      const loc=pointerToCoord(positionFromPointer(e));
      if(loc.lat>=27&&loc.lat<=44.5&&loc.lng>=-18.5&&loc.lng<=5){state.selected=cellAt(loc.lat,loc.lng);overlayRender();renderDetails();}
    }
  };
  map.viewport.addEventListener('pointerup',endDrag);
  map.viewport.addEventListener('pointercancel',e=>{if(map.drag)endDrag(e);});
  map.viewport.addEventListener('wheel',e=>{e.preventDefault();changeZoom(e.deltaY<0?1:-1,positionFromPointer(e));},{passive:false});
  map.viewport.addEventListener('keydown',e=>{
    if(e.key==='+'||e.key==='='){e.preventDefault();changeZoom(1);return;}
    if(e.key==='-'){e.preventDefault();changeZoom(-1);return;}
    if(e.key==='Enter'){e.preventDefault();state.selected=cellAt(state.center.lat,state.center.lng);overlayRender();renderDetails();return;}
    const directions={ArrowLeft:[-90,0],ArrowRight:[90,0],ArrowUp:[0,-90],ArrowDown:[0,90]};
    if(directions[e.key]){e.preventDefault();const [dx,dy]=directions[e.key];const center=toPx(state.center.lat,state.center.lng,state.zoom);state.center=pxToLL(center.x+dx,center.y+dy,state.zoom);renderAllMap();refreshRealData();}
  });
  EL('zoomIn').addEventListener('click',()=>changeZoom(1));
  EL('zoomOut').addEventListener('click',()=>changeZoom(-1));
  EL('myLocation').addEventListener('click',()=>{
    if(!navigator.geolocation){toast('Este dispositivo no permite consultar la ubicación');return;}
    navigator.geolocation.getCurrentPosition(position=>{
      const {latitude:lat,longitude:lng}=position.coords;
      if(lat<27||lat>44.5||lng< -18.5||lng>5){toast('La ubicación parece estar fuera de España');return;}
      chooseLocation({name:'Mi entorno',lat,lng});
    },()=>toast('No se pudo acceder a tu ubicación. Comprueba los permisos.'),{timeout:9000,enableHighAccuracy:false,maximumAge:120000});
  });
}
function changeZoom(delta,anchor){
  const old=state.zoom,next=clamp(old+delta,11,16);
  if(next===old)return;
  const px=anchor||{x:map.w/2,y:map.h/2};
  const at=pointerToCoord(px);
  state.zoom=next;
  const atPx=toPx(at.lat,at.lng,next),centerPx={x:atPx.x-px.x+map.w/2,y:atPx.y-px.y+map.h/2};
  state.center=pxToLL(centerPx.x,centerPx.y,next);
  renderAllMap();refreshRealData();
}
function renderCounters(){
  const cells=activeCells();
  EL('statVotes').closest('.data-tile')?.classList.toggle('preview-count',PREVIEW_MODE);
  EL('statZones').textContent=fmtNum(cells.length);
  EL('statVotes').textContent=fmtNum(cells.reduce((total,c)=>total+c.count,0));
  EL('savedCount').textContent=state.saved.length;
  EL('compareCount').textContent=state.comparison.length;
  
  EL('mapAttributionDemo').textContent=PREVIEW_MODE?'MUESTRA SIMULADA · NO REAL':'Aportaciones comunitarias';
  
}
function selectedIsSaved(){return state.saved.some(s=>s.id===state.selected?.id);}
function selectedIsCompared(){return state.comparison.some(s=>s.id===state.selected?.id);}
function currentSnapshot(){
  const c=state.selected,rec=selectedRecord();
  if(!c)return null;
  return {...c,city:state.city,demo:PREVIEW_MODE,snapshot:rec?{count:rec.count,day:rec.day,night:rec.night,light:rec.light,noise:rec.noise}:null,savedAt:Date.now()};
}
function renderDetails(){
  const root=EL('detailsContent');
  const c=state.selected,record=selectedRecord();
  if(!c){root.innerHTML=`<div class="details-topline"><span class="detail-eyebrow">EXPLORA SIN PRISA</span>${icon('map-pin')}</div><div class="empty-details"><div class="empty-visual"></div><h3>Elige una zona<br>del mapa</h3><p>Pulsa cualquier punto del mapa para ver las opiniones existentes o añadir la tuya.</p><button class="primary-button" id="detailsStart">${icon('compass')} Explorar el mapa</button></div>`;EL('detailsStart').addEventListener('click',()=>map.viewport.focus());return;}
  if(!record){root.innerHTML=`<div class="details-topline"><span class="detail-eyebrow">${sectorName(c)}</span><span class="detail-eyebrow">SIN DATOS</span></div><div class="detail-head"><h3>Esta zona espera voces</h3><p>${escapeHtml(displayedCity())} · cuadrícula aproximada</p></div><div class="empty-details"><div class="empty-visual"></div><h3>Aún no hay opiniones aprobadas</h3><p>La primera valoración aprobada aparecerá aquí. Una opinión aislada no representa al barrio ni permite sacar conclusiones de seguridad.</p></div><div class="detail-actions"><button class="primary-button" id="detailRate">${icon('message')} Compartir mi experiencia</button><button class="secondary-button" id="detailSave">${icon('bookmark')} ${selectedIsSaved()?'Quitar de guardadas':'Guardar esta zona'}</button></div>`;bindDetails();return;}
  const score=currentScore(record),tone=scoreColor(score),confidence=record.count===1?'Solo 1 opinión: muestra muy limitada':record.count<5?'Muy pocas opiniones: muestra limitada':record.count>=25?'Más aportaciones':record.count>=10?'Muestra moderada':'Muestra pequeña';
  const ring=((score-1)/4*100).toFixed(1)+'%';
  const metric=(label,value)=>`<div class="meter-row"><div class="meter-label"><span>${label}</span><strong>${value.toFixed(1)} / 5</strong></div><div class="meter-track"><div class="meter-fill" style="width:${((value-1)/4*100).toFixed(1)}%"></div></div></div>`;
  root.innerHTML=`<div class="details-topline"><span class="detail-eyebrow">${sectorName(c)}</span><span class="detail-eyebrow">${PREVIEW_MODE?'MUESTRA FICTICIA':'COMUNIDAD'}</span></div><div class="detail-head"><h3>${PREVIEW_MODE?'Ejemplo: '+escapeHtml(record.name):'Entorno seleccionado'}</h3><p>${escapeHtml(displayedCity())} · ${record.count} ${PREVIEW_MODE?'opiniones simuladas':record.count===1?'opinión moderada':'opiniones moderadas'}</p></div><div class="signal-block"><div class="score-ring" style="--score-percent:${ring};background:conic-gradient(${tone.fill} ${ring},#dfebe1 0)"><div><strong>${score.toFixed(1)}</strong><small>de 5</small></div></div><div class="signal-copy"><strong>${tone.label}</strong><p>Percepción al caminar ${state.mode==='day'?'de día':'de noche'}.</p></div></div><div class="detail-section-title">Mirada a la zona</div><div class="meter-list">${metric('Seguridad percibida de día',record.day)}${metric('Seguridad percibida de noche',record.night)}${metric('Iluminación percibida',record.light)}${metric('Confort acústico',record.noise)}</div><div class="data-confidence">${icon('info')} <span>${PREVIEW_MODE?'Datos 100 % inventados para probar la interfaz, no describen esta zona.':confidence+' ('+record.count+'). Las notas son percepciones subjetivas: con pocas opiniones no son representativas ni datos oficiales de delitos.'}</span></div>${PREVIEW_MODE?`<div class="sample-quotes"><strong>Opiniones de ejemplo · inventadas</strong>${record.notes.map(n=>`<p>«${escapeHtml(n)}»</p>`).join('')}</div>`:record.comments?.length?`<div class="community-comments"><strong>Comentarios de vecinos · revisados</strong>${record.comments.map(n=>`<p>«${escapeHtml(n)}»</p>`).join('')}<small>Opiniones personales, no hechos comprobados. Hasta 5 comentarios recientes.</small></div>`:''}<div class="detail-actions"><button class="primary-button" id="detailRate">${icon('plus')} ${PREVIEW_MODE?'Ir al modo real para opinar':'Compartir mi experiencia'}</button><div class="detail-secondary-actions"><button class="secondary-button" id="detailSave">${icon('bookmark')} ${selectedIsSaved()?'Guardada':'Guardar'}</button><button class="secondary-button" id="detailCompare">${icon('compare')} ${selectedIsCompared()?'Quitar':'Comparar'}</button></div></div>`;
  bindDetails();
}
function bindDetails(){
  EL('detailRate')?.addEventListener('click',PREVIEW_MODE?()=>{location.href=location.pathname}:openRating);
  EL('detailSave')?.addEventListener('click',toggleSave);
  EL('detailCompare')?.addEventListener('click',toggleCompare);
}
function persist(){saveStore('br_saved_v2',state.saved);saveStore('br_compare_v2',state.comparison);renderCounters();}
function toggleSave(){
  if(PREVIEW_MODE){toast('Para guardar zonas, vuelve al modo real.');return;}
  const item=currentSnapshot();if(!item)return;
  const exists=state.saved.findIndex(s=>s.id===item.id);
  if(exists!==-1){state.saved.splice(exists,1);toast('Zona eliminada de guardadas');}
  else if(state.saved.length>=3){toast('Puedes guardar hasta 3 zonas en esta versión');return;}
  else{state.saved.unshift(item);toast('Zona guardada en este dispositivo');}
  persist();renderDetails();renderSavedPage();
}
function toggleCompare(){
  if(PREVIEW_MODE){toast('Para guardar zonas, vuelve al modo real.');return;}
  const item=currentSnapshot();if(!item)return;
  const exists=state.comparison.findIndex(s=>s.id===item.id);
  if(exists!==-1){state.comparison.splice(exists,1);toast('Zona quitada de la comparación');}
  else if(state.comparison.length>=2){toast('Compara dos zonas: elimina una antes de añadir otra');return;}
  else{state.comparison.push(item);toast(state.comparison.length===2?'¡Dos zonas listas para comparar!':'Primera zona añadida a la comparación');}
  persist();renderDetails();renderComparePage();
}
function chooseLocation(place,zoom=13){
  state.city=place.name;state.center={lat:Number(place.lat),lng:Number(place.lng)};state.zoom=zoom;
  state.selected=cellAt(state.center.lat,state.center.lng);state.realCells=[];
  EL('crumbCity').textContent=state.city;EL('headingCity').textContent='/ '+state.city;EL('mapCityLabel').textContent=state.city+', España';
  EL('placeSearch').value='';
  changeView('explorar');
  renderCounters();renderAllMap();renderDetails();refreshRealData();
}
async function refreshRealData(){
  const token=++map.readSeq;
  if(!map.w||!map.h)return;
  const box=mapBounds();
  const clipped={west:clamp(box.west,-18.5,5),south:clamp(box.south,27,44.5),east:clamp(box.east,-18.5,5),north:clamp(box.north,27,44.5)};
  if(clipped.east<=clipped.west||clipped.north<=clipped.south)return;
  if(PREVIEW_MODE){
    state.realCells=previewRecords().filter(p=>p.lng>=clipped.west-.015&&p.lng<=clipped.east+.015&&p.lat>=clipped.south-.015&&p.lat<=clipped.north+.015);
    renderCounters();overlayRender();renderDetails();return;
  }
  try{
    if(!window.BarrioAPI?.configured){state.realCells=[];renderCounters();overlayRender();renderDetails();return;}
    const json=await window.BarrioAPI.getRatings(clipped);
    if(map.readSeq!==token)return;
    state.realCells=(json.cells||[]).map(c=>{const [q,r]=c.id.split(':').map(Number);return {...cell(q,r),count:c.count,day:c.day,night:c.night,light:c.light,noise:c.noise,comments:Array.isArray(c.comments)?c.comments.filter(x=>typeof x==='string').slice(0,5):[]};});
    renderCounters();overlayRender();renderDetails();
  }catch{state.realCells=[];renderCounters();overlayRender();renderDetails();toast('Sin conexión con las valoraciones. Inténtalo más tarde.');}
}
function escapeHtml(str){return String(str).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
async function searchPlace(term){
  const query=term.trim();if(query.length<2){toast('Introduce al menos dos caracteres');return;}
  const found=PRESETS[clean(query.replace(/,.*$/,''))];
  if(found){chooseLocation(found);return;}
  EL('mapLoader').hidden=false;
  EL('searchButton').disabled=true;
  try{
    const places=await window.BarrioAPI.searchPlaces(query);
    if(!places?.length){toast('No se ha encontrado esta zona en España');return;}
    if(places.length===1){chooseLocation(places[0]);return;}
    openPlaceResults(places);
  }catch(e){toast(e.message||'Error buscando ciudad');}
  finally{EL('mapLoader').hidden=true;EL('searchButton').disabled=false;}
}
function openPlaceResults(places){
  openModal(`<div class="modal-heading"><div><div class="modal-kicker">RESULTADOS DE BÚSQUEDA</div><h2>¿Qué lugar buscas?</h2></div><button class="modal-x" data-close aria-label="Cerrar">${icon('x')}</button></div><p class="modal-description">Hemos encontrado varios lugares que coinciden con tu búsqueda.</p><div class="modal-list" id="placeResultList">${places.map((p,i)=>`<button class="secondary-button" data-result="${i}" style="justify-content:flex-start;padding:12px">${icon('map-pin')} ${escapeHtml(p.name||'Lugar')} ${icon('arrow-right')}</button>`).join('')}</div>`);
  EL('placeResultList').querySelectorAll('[data-result]').forEach(btn=>btn.addEventListener('click',()=>{const place=places[Number(btn.dataset.result)];closeModal();chooseLocation(place);}));
}
function changeView(view){
  state.view=view;
  const mapViews={explorar:'viewExplorar',guardadas:'viewGuardadas',comparar:'viewComparar',metodologia:'viewMetodologia'};
  for(const [key,id] of Object.entries(mapViews))EL(id).classList.toggle('hidden',key!==view);
  document.querySelectorAll('[data-view]').forEach(btn=>btn.classList.toggle('active',btn.dataset.view===view));
  document.querySelectorAll('.page-view').forEach(p=>p.setAttribute('aria-hidden',p.classList.contains('hidden')?'true':'false'));
  if(view==='guardadas')renderSavedPage();if(view==='comparar')renderComparePage();
  if(view==='explorar')setTimeout(()=>{const box=map.viewport.getBoundingClientRect();map.w=Math.round(box.width);map.h=Math.round(box.height);renderAllMap();},0);
  window.scrollTo({top:0,behavior:'instant'});
}
function renderSavedPage(){
  const list=EL('savedList');if(!list)return;
  if(!state.saved.length){list.innerHTML=`<div class="empty-state">${icon('bookmark')}<h3>Todavía no has guardado ninguna zona</h3><p>Explora el mapa, elige un sector y pulsa «Guardar» para regresar a él más adelante.</p><button id="goExploreSaved">Explorar mapa</button></div>`;EL('goExploreSaved').addEventListener('click',()=>changeView('explorar'));return;}
  list.innerHTML=state.saved.map((item,i)=>`<div class="saved-card"><span class="saved-pill">GUARDADA</span><h3>${sectorName(item)}</h3><p>${escapeHtml(item.city)} · ${item.snapshot?`Última consulta: ${item.snapshot.count} opiniones`:'Consulta de nuevo para ver datos actualizados'}.</p><div class="saved-card-actions"><button data-open-saved="${i}">Ver en el mapa ${icon('arrow-right')}</button><button data-delete-saved="${i}">Eliminar</button></div></div>`).join('');
  list.querySelectorAll('[data-open-saved]').forEach(btn=>btn.addEventListener('click',()=>goToSnapshot(state.saved[Number(btn.dataset.openSaved)])));
  list.querySelectorAll('[data-delete-saved]').forEach(btn=>btn.addEventListener('click',()=>{state.saved.splice(Number(btn.dataset.deleteSaved),1);persist();renderSavedPage();toast('Zona eliminada');}));
}
function goToSnapshot(item){
  if(!item)return;

  chooseLocation({name:item.city,lat:item.lat,lng:item.lng},14);
  state.selected=cell(item.q,item.r);renderDetails();overlayRender();renderCounters();
}
function renderComparePage(){
  const root=EL('compareList');if(!root)return;
  if(state.comparison.length<2){root.innerHTML=`<div class="empty-state">${icon('compare')}<h3>${state.comparison.length?'Solo falta una zona':'Selecciona dos zonas para comparar'}</h3><p>${state.comparison.length?'Ya tienes una zona añadida.':'Añade dos sectores desde su ficha en el mapa.'} La comparación siempre incluye el origen y número de opiniones.</p><button id="goExploreCompare">Buscar zonas</button></div>${state.comparison.length?`<p class="modal-caption">Seleccionada: ${sectorName(state.comparison[0])} · ${escapeHtml(state.comparison[0].city)}</p>`:''}`;EL('goExploreCompare').addEventListener('click',()=>changeView('explorar'));return;}
  const cards=state.comparison.map((c,i)=>`<div class="compare-card"><span class="saved-pill" style="font-size:9px;background:#e7f4e9;color:#4a7e55;border-radius:6px;padding:6px 9px">ZONA ${i+1}</span><h3>${sectorName(c)}</h3><p>${escapeHtml(c.city)} · captura realizada al guardar</p>${c.snapshot?`<div class="compare-number">${Number(c.snapshot.night).toFixed(1)} <span>/5, de noche</span></div><div class="compare-metric"><span>Percepción de día</span><b>${Number(c.snapshot.day).toFixed(1)} / 5</b></div><div class="compare-metric"><span>Iluminación</span><b>${Number(c.snapshot.light).toFixed(1)} / 5</b></div><div class="compare-metric"><span>Confort acústico</span><b>${Number(c.snapshot.noise).toFixed(1)} / 5</b></div><div class="compare-metric"><span>Opiniones</span><b>${c.snapshot.count}</b></div>`:`<div class="empty-state" style="min-height:160px"><h3>Sin opiniones suficientes</h3></div>`}<div class="saved-card-actions" style="margin-top:18px"><button data-compare-open="${i}">Ver en el mapa</button><button data-compare-remove="${i}">Quitar</button></div></div>`).join('');
  root.innerHTML=`<div class="method-banner">${icon('info')}<p>Una diferencia entre notas <strong>no prueba</strong> que una zona sea más peligrosa que otra. Las muestras, momentos y opiniones pueden ser distintos.</p></div><div class="comparison-layout">${cards}</div>`;
  root.querySelectorAll('[data-compare-open]').forEach(btn=>btn.addEventListener('click',()=>goToSnapshot(state.comparison[Number(btn.dataset.compareOpen)])));
  root.querySelectorAll('[data-compare-remove]').forEach(btn=>btn.addEventListener('click',()=>{state.comparison.splice(Number(btn.dataset.compareRemove),1);persist();renderComparePage();}));
}
function openModal(markup){EL('modalContent').innerHTML=`<div class="modal-body">${markup}</div>`;EL('modalRoot').classList.remove('hidden');document.body.style.overflow='hidden';EL('modalContent').querySelectorAll('[data-close]').forEach(btn=>btn.addEventListener('click',closeModal));}
function closeModal(){EL('modalRoot').classList.add('hidden');EL('modalContent').innerHTML='';document.body.style.overflow='';}
const QUESTIONS=[
  ['day','Sensación al caminar de día','Poca tranquilidad','Mucha tranquilidad'],
  ['night','Sensación al caminar de noche','Poca tranquilidad','Mucha tranquilidad'],
  ['light','Iluminación de las calles','Muy escasa','Muy buena'],
  ['noise','Confort acústico','Mucho ruido','Muy poco ruido']
];
const TAGS=[['buena_iluminacion','Buena iluminación'],['poca_iluminacion','Poca iluminación'],['ambiente_tranquilo','Ambiente tranquilo'],['ruido_nocturno','Ruido nocturno'],['mucho_trafico','Tráfico intenso'],['vida_en_la_calle','Vida en la calle'],['calles_solitarias','Calles solitarias']];
async function updateAccountButton(){
  const btn=EL('accountButton'); if(!btn)return;
  try {
    const user=await window.BarrioAPI?.getCommunityUser();
    btn.textContent=user?'Cuenta verificada':'Mi cuenta';
    btn.title=user?'Sesion iniciada con correo verificado':'Iniciar sesion con correo';
  } catch { btn.textContent='Mi cuenta'; }
}
async function openAccount(){
  if(!window.BarrioAPI?.configured){
    toast('Esta version aun no esta conectada a Supabase.');return;
  }
  const user=await window.BarrioAPI.getCommunityUser();
  if(user){
    openModal(`<div class="modal-heading"><div><div class="modal-kicker">TU PARTICIPACION</div><h2>Cuenta verificada</h2></div><button class="modal-x" data-close aria-label="Cerrar">${icon('x')}</button></div><p class="modal-description">Correo: ${escapeHtml(user.email)}. Tu correo no se muestra en el mapa ni al resto de participantes.</p><div class="modal-list"><div>${icon('shield')} Tus valoraciones se guardan en una zona aproximada y se publican solo en conjunto tras moderacion.</div></div><button class="secondary-button" id="logoutCommunity" style="width:100%">Cerrar sesion</button>`);
    EL('logoutCommunity').addEventListener('click',async()=>{
      try { await window.BarrioAPI.logoutCommunity();closeModal();await updateAccountButton();toast('Has cerrado la sesion.'); }
      catch(error){toast(error.message||'No se pudo cerrar la sesion.');}
    });
    return;
  }
  openModal(`<div class="modal-heading"><div><div class="modal-kicker">CUENTA GRATUITA</div><h2>Verifica tu correo para opinar</h2></div><button class="modal-x" data-close aria-label="Cerrar">${icon('x')}</button></div><p class="modal-description">Enviaremos un enlace a tu correo. No publicamos tu direccion ni la utilizamos como puntuacion. Para valorar un sector debes tener acceso a ese correo.</p><form id="emailLoginForm"><label for="loginEmail" style="display:block;font-size:12px;font-weight:700;margin-bottom:7px">Correo electronico</label><input id="loginEmail" type="email" name="email" autocomplete="email" inputmode="email" required maxlength="254" placeholder="tu@email.es" style="display:block;width:100%;border:1px solid #cbdcd0;border-radius:10px;padding:13px;margin-bottom:13px"><button type="submit" class="primary-button" style="width:100%" id="loginSend">Enviar enlace de acceso</button></form><p id="loginStatus" class="modal-caption" role="status">Al abrir el enlace desde este dispositivo, vuelve a BarrioRadar para continuar.</p><div style="border-top:1px solid #e5ede5;margin-top:19px;padding-top:14px"><label style="display:block;font-size:12px;font-weight:700;margin-bottom:6px" for="emailCode">¿Tu correo incluye un codigo numerico?</label><div style="display:flex;gap:8px"><input id="emailCode" inputmode="numeric" pattern="[0-9]{6,8}" placeholder="Codigo de 6 digitos" style="min-width:0;width:100%;border:1px solid #cbdcd0;border-radius:9px;padding:10px"><button class="secondary-button" id="checkCode">Verificar</button></div></div><p class="modal-caption">El acceso usa Supabase Auth. Revisa la <a href="/privacidad.html" target="_blank" rel="noopener">informacion de privacidad</a>. No uses correos ajenos.</p>`);
  EL('emailLoginForm').addEventListener('submit',async e=>{
    e.preventDefault();const send=EL('loginSend');send.disabled=true;
    const email=EL('loginEmail').value.trim();
    try{await window.BarrioAPI.sendLoginEmail(email);EL('loginStatus').textContent='Revisa tu correo. Pulsa el enlace de acceso; luego vuelve a BarrioRadar.';}
    catch(error){EL('loginStatus').textContent=error.message||'No se pudo enviar el enlace.';}
    finally{send.disabled=false;}
  });
  EL('checkCode').addEventListener('click',async()=>{
    const btn=EL('checkCode');btn.disabled=true;
    try {
      const email=EL('loginEmail').value.trim();
      await window.BarrioAPI.confirmEmailCode(email,EL('emailCode').value.trim());
      closeModal();await updateAccountButton();toast('Cuenta verificada: ya puedes opinar.');
    } catch(error){EL('loginStatus').textContent=error.message||'Codigo incorrecto.';}
    finally{btn.disabled=false;}
  });
}

function openRating(){
  if(PREVIEW_MODE){toast('Las muestras no aceptan votos. Abre el modo real.');return;}
  if(!state.selected){toast('Primero selecciona una zona');return;}
  const selected=state.selected;
  openModal(`<div class="modal-heading"><div><div class="modal-kicker">COMPARTE TU EXPERIENCIA</div><h2>¿Cómo se vive esta zona?</h2></div><button class="modal-x" data-close aria-label="Cerrar">${icon('x')}</button></div><p class="modal-description">${sectorName(selected)} · ${escapeHtml(state.city)}. Valora únicamente lo que conozcas de primera mano. No se pedirán nombres ni descripciones de personas.</p><form id="ratingForm"><div id="existingReviewNotice" class="rating-replace-notice" role="status" hidden><strong>Ya has valorado esta zona</strong><p>Al volver a enviarla, sustituirás tu valoración y comentario anteriores. Solo se conserva una valoración por cuenta y zona, y la nueva pasará otra vez por moderación.</p></div>${QUESTIONS.map(([key,label,low,high])=>`<div class="slider-group"><div class="slider-group-top"><label for="range-${key}">${label}</label><output class="slider-value" id="value-${key}">3/5</output></div><input aria-label="${label}" id="range-${key}" class="rating-slider" name="${key}" type="range" min="1" max="5" step="1" value="3"><div class="slider-tips"><span>${low}</span><span>${high}</span></div></div>`).join('')}<div class="detail-section-title">¿Qué destacarías? <span style="font-weight:500;color:#94a79a">(opcional, máximo 4)</span></div><div class="tag-options">${TAGS.map(([key,label])=>`<label><input type="checkbox" name="tags" value="${key}">${label}</label>`).join('')}</div><div class="rating-comment-field"><label for="ratingComment">Cuenta tu experiencia <span>(opcional)</span></label><textarea id="ratingComment" name="comment" rows="4" maxlength="500" placeholder="¿Qué te gusta de esta zona o qué mejorarías? Cuéntalo sin identificar a otras personas."></textarea><div class="rating-comment-hint"><span>No incluyas nombres, direcciones concretas, datos privados ni acusaciones sobre personas. El mensaje se revisará antes de publicarse.</span><output id="ratingCommentCount" aria-live="polite">0 / 500</output></div></div><div class="modal-footer"><button type="button" class="secondary-button" data-close>Cerrar</button><button type="submit" class="primary-button" id="sendRating">Enviar valoración ${icon('arrow-right')}</button></div><p class="modal-caption">Las contribuciones pasan por moderación. Puedes valorar tantas zonas como quieras y actualizar cada valoración las veces que necesites (con una pausa de 2 minutos entre cambios). Solo se mantiene una por cuenta y zona, y cada cambio requiere moderación. Solo aceptamos cuentas con correo verificado. Evita compartir datos personales.</p></form>`);
  const form=EL('ratingForm');
  for(const [key] of QUESTIONS){form.querySelector(`#range-${key}`).addEventListener('input',e=>EL(`value-${key}`).textContent=e.target.value+'/5');}
  form.querySelectorAll('[name=tags]').forEach(el=>el.addEventListener('change',e=>{if(form.querySelectorAll('[name=tags]:checked').length>4){e.target.checked=false;toast('Selecciona como máximo cuatro aspectos');}}));
  form.elements.comment.addEventListener('input',()=>{EL('ratingCommentCount').textContent=form.elements.comment.value.length+' / 500';});
  // Show a warning early for returning contributors. Recheck before actual submission.
  (async () => {
    try {
      if (await window.BarrioAPI.getCommunityUser() && await window.BarrioAPI.hasMyReview(selected.id)) {
        const note = EL('existingReviewNotice');
        const sendButton = EL('sendRating');
        if (note?.isConnected && sendButton?.isConnected) {
          note.hidden = false;
          sendButton.innerHTML = `Actualizar mi valoración ${icon('arrow-right')}`;
        }
      }
    } catch { /* A fresh server-side check still runs before any change. */ }
  })();
  form.querySelectorAll('[data-close]').forEach(btn=>btn.addEventListener('click',closeModal));
  form.addEventListener('submit',async e=>{
    e.preventDefault();const btn=EL('sendRating');btn.disabled=true;btn.textContent='Enviando…';
    const values=Object.fromEntries(QUESTIONS.map(([key])=>[key,Number(form.elements[key].value)]));
    const tags=Array.from(form.querySelectorAll('[name=tags]:checked')).map(el=>el.value);
    const comment=form.elements.comment.value.trim();
    if(comment.length>500){toast('El comentario no puede superar los 500 caracteres');btn.disabled=false;btn.textContent='Enviar valoración';return;}
    try{
      // Never silently overwrite an existing contribution, even if the pre-warning
      // could not load (offline, expired login, or delayed Auth initialization).
      if (!await window.BarrioAPI.getCommunityUser()) {
        const loginError = new Error('Debes verificar tu correo antes de valorar.');
        loginError.code = 'LOGIN_REQUIRED';
        throw loginError;
      }
      if (await window.BarrioAPI.hasMyReview(selected.id)) {
        const confirmed = window.confirm('Ya tienes una valoración de esta zona.\n\nSi continúas, sustituiremos tu puntuación, etiquetas y comentario anteriores. La nueva valoración quedará pendiente de moderación.\n\n¿Quieres reemplazar tu valoración anterior?');
        if (!confirmed) {
          toast('Se ha conservado tu valoración anterior.');
          return;
        }
      }
      await window.BarrioAPI.sendReview({...values,lat:selected.lat,lng:selected.lng,cellId:selected.id,tags,comment});
      openModal(`<div class="modal-heading"><div><div class="modal-kicker">APORTACIÓN RECIBIDA</div><h2>Gracias por compartir.</h2></div><button class="modal-x" data-close aria-label="Cerrar">${icon('x')}</button></div><div class="success-card"><div class="success-icon">${icon('check')}</div><h3>Tu opinión está en revisión</h3><p>Se mostrará en el mapa en cuanto un moderador la apruebe, aunque sea la primera opinión del sector. Se indicará que es una muestra muy limitada.</p><button class="primary-button" id="closeSuccess" style="width:100%">Volver al mapa</button></div>`);
      EL('closeSuccess').addEventListener('click',closeModal);
    }catch(error){if(error.code==='LOGIN_REQUIRED'){await openAccount();}else{toast(error.message||'Error de conexion');}btn.disabled=false;btn.innerHTML=`Enviar valoración ${icon('arrow-right')}`;}
    finally {
      // A cancelled confirmation must leave the form usable.
      if (btn.isConnected) {
        btn.disabled = false;
        if (btn.textContent === 'Enviando…') btn.innerHTML = `Enviar valoración ${icon('arrow-right')}`;
      }
    }
  });
}
function openPlan(){openModal(`<div class="modal-heading"><div><div class="modal-kicker">BARRIORADAR PLUS · EN DESARROLLO</div><h2>Una decisión importante merece contexto.</h2></div><button class="modal-x" data-close aria-label="Cerrar">${icon('x')}</button></div><p class="modal-description">La versión inicial siempre permitirá explorar y contribuir gratuitamente. Estamos preparando herramientas para comparar direcciones y entender mejor cada zona.</p><div class="modal-list"><div>${icon('check')} Informes comparativos de varios entornos.</div><div>${icon('check')} Evolución de opiniones a lo largo del tiempo.</div><div>${icon('check')} Alertas sobre cambios, con controles de calidad.</div></div><p class="modal-caption">No existe todavía pago ni suscripción activa. Estas funciones son una propuesta de producto.</p><button class="primary-button" data-close style="width:100%;margin-top:16px">Entendido</button>`);EL('modalContent').querySelectorAll('[data-close]').forEach(btn=>btn.addEventListener('click',closeModal));}
function openLegend(){openModal(`<div class="modal-heading"><div><div class="modal-kicker">CÓMO LEER EL MAPA</div><h2>Los colores son percepciones.</h2></div><button class="modal-x" data-close aria-label="Cerrar">${icon('x')}</button></div><div class="modal-list"><div><i class="legend-dot green" style="margin-top:6px"></i> Verde: media desde 3,7 sobre 5.</div><div><i class="legend-dot orange" style="margin-top:6px"></i> Ámbar: media de 2,8 a menos de 3,7.</div><div><i class="legend-dot red" style="margin-top:6px"></i> Coral: media por debajo de 2,8. No significa que haya delitos confirmados.</div><div>${icon('info')} Sin color significa falta de datos, nunca ausencia de riesgo.</div></div><p class="modal-description">Una zona aparece desde su primera opinión moderada de una cuenta con correo verificado en los últimos 180 días. Con menos de cinco opiniones, los polígonos se dibujan con línea discontinua y la fiabilidad es muy limitada.</p><button class="primary-button" id="legendMethod" style="width:100%">Ver metodología ${icon('arrow-right')}</button>`);EL('legendMethod').addEventListener('click',()=>{closeModal();changeView('metodologia');});}
function openInstallHelp(){openModal(`<div class="modal-heading"><div><div class="modal-kicker">UNA APP EN TU MÓVIL</div><h2>Instala BarrioRadar</h2></div><button class="modal-x" data-close aria-label="Cerrar">${icon('x')}</button></div><p class="modal-description">Es una PWA: puedes añadirla a la pantalla de inicio sin pasar por una tienda de aplicaciones. El mapa y las aportaciones requieren conexión a Internet.</p><div class="modal-list"><div>${icon('download')} En Android/Chrome, abre el menú del navegador y elige «Instalar aplicación» o «Añadir a pantalla de inicio».</div><div>${icon('download')} En iPhone/Safari, usa «Compartir» y después «Añadir a pantalla de inicio».</div><div>${icon('shield')} Para instalarla desde un servidor remoto, necesitas HTTPS.</div></div><button class="primary-button" data-close style="width:100%">Entendido</button>`);EL('modalContent').querySelectorAll('[data-close]').forEach(btn=>btn.addEventListener('click',closeModal));}
function bindUI(){
  document.querySelectorAll('[data-view]').forEach(btn=>btn.addEventListener('click',()=>changeView(btn.dataset.view)));
  document.querySelectorAll('[data-city]').forEach(btn=>btn.addEventListener('click',()=>chooseLocation(PRESETS[clean(btn.dataset.city)])));
  EL('placeForm').addEventListener('submit',e=>{e.preventDefault();searchPlace(EL('placeSearch').value);});
  EL('dayBtn').addEventListener('click',()=>{state.mode='day';EL('dayBtn').classList.add('selected');EL('nightBtn').classList.remove('selected');overlayRender();renderDetails();});
  EL('nightBtn').addEventListener('click',()=>{state.mode='night';EL('nightBtn').classList.add('selected');EL('dayBtn').classList.remove('selected');overlayRender();renderDetails();});
  EL('howScoring').addEventListener('click',()=>changeView('metodologia'));
  EL('legendInfo').addEventListener('click',openLegend);
  EL('footerMethod').addEventListener('click',()=>changeView('metodologia'));
  EL('planBtn').addEventListener('click',openPlan);
  EL('mobileMenu').addEventListener('click',openInstallHelp);
  EL('accountButton').addEventListener('click',openAccount);
  EL('installApp').addEventListener('click',async()=>{if(state.deferredInstall){state.deferredInstall.prompt();await state.deferredInstall.userChoice;state.deferredInstall=null;}else openInstallHelp();});
  EL('modalRoot').addEventListener('click',e=>{if(e.target===EL('modalRoot'))closeModal();});
  document.addEventListener('keydown',e=>{if(e.key==='Escape')closeModal();});
  window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();state.deferredInstall=e;});
  if('serviceWorker' in navigator&&(location.protocol==='https:'||location.hostname==='localhost'||location.hostname==='127.0.0.1')){
    window.addEventListener('load',()=>navigator.serviceWorker.register('/sw.js').catch(()=>{}));
  }
}
function start(){
  if(!window.BarrioAPI?.configured){
    const notice=EL('communityNotice');
    if(notice){notice.querySelector('strong').textContent='Datos reales: pendiente de configurar';
      notice.querySelector('span').textContent='La app todavia no esta conectada a la base de datos. No hay cifras ficticias y no se pueden enviar votos hasta terminar el despliegue.';}
  }
  if(PREVIEW_MODE){
    EL('crumbCity').textContent='Huelva'; EL('headingCity').textContent='/ Huelva'; EL('mapCityLabel').textContent='Huelva, España';
    const notice=EL('communityNotice');
    notice.classList.add('preview-notice');
    notice.querySelector('strong').textContent='MODO MUESTRA · OPINIONES INVENTADAS EN HUELVA';
    notice.querySelector('span').innerHTML='Estas valoraciones se han creado <b>solo para comprobar el diseño</b>. No proceden de vecinos, no reflejan la realidad de Huelva y no cuentan en la base de datos. <a href="/">Volver a datos reales ↗</a>';
    EL('statVotes').nextElementSibling.textContent='Opiniones simuladas';
    EL('statZones').nextElementSibling.textContent='Zonas de muestra';
    document.querySelector('.data-tile.stretch').innerHTML='<div class="data-symbol lavender">!</div><div><strong>Muestra ficticia</strong><span>No son datos vecinales</span></div>';
    const intro=document.getElementById('sampleBanner');
    if(intro)intro.hidden=false;
  }
  state.selected=PREVIEW_MODE?previewRecords()[0]:cellAt(state.center.lat,state.center.lng);
  bindUI();initMap();renderDetails();renderCounters();refreshRealData();updateAccountButton();
  if(window.BarrioAPI?.configured)window.BarrioAPI.onCommunityAuthChange(updateAccountButton);
}
document.addEventListener('DOMContentLoaded',start);
})();
