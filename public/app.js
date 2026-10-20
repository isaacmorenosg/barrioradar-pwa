/* Zonenta: datos reales; muestra visual segregada mediante ?muestras=1 */
(() => {
'use strict';
const R=6378137, TAU=Math.PI*2, WORLD=TAU*R, HEX=200, SQRT3=Math.sqrt(3);
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

// Migración local de sectores guardados, al pasar de radio 400 a 200 (proyección web).
// Los centros antiguos pasan al sector (2*q, 2*r), sin perder la ubicación.
function migrateSavedSectors(){
  try{
    if(localStorage.getItem('br_sector_grid_revision')==='200')return;
    for(const key of ['br_saved_v2','br_compare_v2']){
      const existing=safeRead(key,[]);
      if(!Array.isArray(existing))continue;
      const updated=existing.map(item=>{
        if(!item||!Number.isInteger(item.q)||!Number.isInteger(item.r))return item;
        return {...item,...cell(2*item.q,2*item.r),snapshot:null};
      });
      saveStore(key,updated);
    }
    localStorage.setItem('br_sector_grid_revision','200');
  }catch{}
}
migrateSavedSectors();

const state={city:'Huelva',center:{lat:37.2614,lng:-6.9447},zoom:14,realCells:[],selected:null,saved:safeRead('br_saved_v2',[]).filter(i=>!i.demo).map(i=>({...i,snapshot:null})),comparison:safeRead('br_compare_v2',[]).filter(i=>!i.demo).map(i=>({...i,snapshot:null})),view:'explorar',userSelected:false,deferredInstall:null};
const map={viewport:null,tiles:null,overlay:null,w:0,h:0,drag:null,readSeq:0,ratingsAbort:null,refreshFrame:0,lastRatingsSuccess:0};
const commentsView={cellId:null,items:[],total:0,loaded:false,loading:false,error:false,seq:0};
let toastTimer=0;
function toast(message){const el=EL('toast');el.textContent=message;el.classList.add('shown');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('shown'),3300);}
function activeCells(){return state.realCells;}
function scoreColor(value){if(value>=3.7)return {fill:'#7fc99b',stroke:'#4eab7a',label:'Más tranquilidad',text:'#246246'};if(value>=2.8)return{fill:'#f5bd75',stroke:'#df9d48',label:'Opiniones mixtas',text:'#78572d'};return{fill:'#ed9d8a',stroke:'#d87c6b',label:'Más reservas',text:'#824337'};}
function currentScore(item){
  const values=[item.day,item.night,item.light,item.noise].map(Number);
  if(values.some(value=>!Number.isFinite(value)||value<1||value>5))return 0;
  return values.reduce((sum,value)=>sum+value,0)/4;
}
function selectedRecord(){return activeCells().find(c=>c.id===state.selected?.id)||null;}
function displayedCity(){return state.city.replace(/, España$/i,'');}
function syncCityLabels(){
  const city=displayedCity();
  EL('crumbCity').textContent=city;
  EL('headingCity').textContent='/ '+city;
  EL('mapCityLabel').textContent=city+', España';
}
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
    // Fill is transparent enough to preserve street detail, but visible on dark tiles.
    // Sectors with fewer than 5 approved reviews remain dashed and slightly paler.
    out+=`<polygon data-cell="${c.id}" points="${hexPoints(c)}" fill="${tone.fill}" fill-opacity="${isSelected?.88:(!PREVIEW_MODE&&c.count<5?.60:.76)}" stroke="${isSelected?'#20533e':tone.stroke}" stroke-width="${isSelected?2.9:1.8}" stroke-opacity=".95" stroke-dasharray="${!PREVIEW_MODE&&c.count<5?'5 4':'none'}"/>`;

  }
  if(state.selected&&(state.userSelected||window.innerWidth>760)){out+=`<polygon class="selected-ring" points="${hexPoints(state.selected)}"/>`;}
  map.overlay.innerHTML=out;
}
function renderAllMap(){tileRender();overlayRender();}
// The map can be hidden when navigating between pages. Fetch only after it is
// visible and has real dimensions; repainting tiles alone cannot restore ratings.
function ratingsStatus(message='',canRetry=false){
  const status=EL('ratingsStatus');
  if(!status)return;
  status.hidden=!message;
  EL('ratingsStatusText').textContent=message;
  EL('retryRatings').hidden=!canRetry;
  status.classList.toggle('is-error',canRetry);
}
function cancelRatingsRequest(){
  map.readSeq++;
  if(map.ratingsAbort){map.ratingsAbort.abort();map.ratingsAbort=null;}
}
function scheduleMapRefresh(){
  if(map.refreshFrame)cancelAnimationFrame(map.refreshFrame);
  map.refreshFrame=requestAnimationFrame(()=>{
    map.refreshFrame=0;
    if(state.view!=='explorar'||!map.viewport)return;
    const rect=map.viewport.getBoundingClientRect();
    const width=Math.round(rect.width),height=Math.round(rect.height);
    if(width<1||height<1)return;
    map.w=width;map.h=height;
    renderAllMap();
    refreshRealData();
  });
}
function positionFromPointer(event){const box=map.viewport.getBoundingClientRect();return{x:event.clientX-box.left,y:event.clientY-box.top};}
function pointerToCoord(pt){const center=toPx(state.center.lat,state.center.lng,state.zoom);return pxToLL(center.x+pt.x-map.w/2,center.y+pt.y-map.h/2,state.zoom);}
function initMap(){
  map.viewport=EL('mapViewport');map.tiles=EL('mapTiles');map.overlay=EL('mapOverlay');
  const resize=()=>{
    if(state.view!=='explorar')return;
    const box=map.viewport.getBoundingClientRect();
    const width=Math.round(box.width),height=Math.round(box.height);
    if(width<1||height<1||width===map.w&&height===map.h)return;
    map.w=width;map.h=height;
    renderAllMap();
    scheduleMapRefresh();
  };
  new ResizeObserver(resize).observe(map.viewport);resize();
  // Track both fingers. A pinch is not a tap: never send it to sector selection.
  const activePointers=new Map();
  let pinch=null,pinchUsed=false;
  const resetPan=()=>{
    map.drag=null;
    map.viewport.classList.remove('is-dragging');
    map.tiles.style.transform='';
    map.overlay.style.transform='';
  };
  const pinchData=()=>{
    const [a,b]=[...activePointers.values()].slice(0,2);
    const middle={x:(a.x+b.x)/2,y:(a.y+b.y)/2};
    return {distance:Math.hypot(a.x-b.x,a.y-b.y),middle};
  };
  map.viewport.addEventListener('pointerdown',e=>{
    if(e.button!==0&&e.pointerType==='mouse')return;
    activePointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
    map.viewport.setPointerCapture(e.pointerId);
    if(activePointers.size>=2){
      resetPan();
      pinch=pinchData();
      pinchUsed=true;
      return;
    }
    if(pinchUsed)return;
    const point=positionFromPointer(e);
    map.drag={pointerId:e.pointerId,x:e.clientX,y:e.clientY,startPoint:point,center:toPx(state.center.lat,state.center.lng,state.zoom),moved:false};
  });
  map.viewport.addEventListener('pointermove',e=>{
    if(!activePointers.has(e.pointerId))return;
    activePointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(activePointers.size>=2 && pinch){
      const current=pinchData();
      if(pinch.distance>=12&&current.distance>=12){
        const ratio=current.distance/pinch.distance;
        if(ratio>=1.22||ratio<=1/1.22){
          const box=map.viewport.getBoundingClientRect();
          // Zoom anchored halfway between fingers; the map's tile zoom stays integral.
          changeZoom(ratio>1?1:-1,{x:current.middle.x-box.left,y:current.middle.y-box.top});
          pinch=current;
        }
      }
      return;
    }
    if(pinchUsed||!map.drag||map.drag.pointerId!==e.pointerId)return;
    const dx=e.clientX-map.drag.x,dy=e.clientY-map.drag.y;
    if(Math.hypot(dx,dy)>5)map.drag.moved=true;
    if(map.drag.moved){map.viewport.classList.add('is-dragging');map.tiles.style.transform=`translate(${dx}px, ${dy}px)`;map.overlay.style.transform=`translate(${dx}px, ${dy}px)`;}
  });
  const endDrag=e=>{
    const tracked=activePointers.has(e.pointerId);
    if(tracked)activePointers.delete(e.pointerId);
    if(pinchUsed){
      resetPan();
      pinch=null;
      if(activePointers.size===0)pinchUsed=false;
      return;
    }
    if(!tracked||!map.drag||map.drag.pointerId!==e.pointerId)return;
    const drag=map.drag;
    resetPan();
    if(e.type==='pointercancel')return;
    if(drag.moved){
      const dx=e.clientX-drag.x,dy=e.clientY-drag.y;
      const center=pxToLL(drag.center.x-dx,drag.center.y-dy,state.zoom);
      state.center={lat:clamp(center.lat,27,44.7),lng:clamp(center.lng,-18.7,5.1)};
      renderAllMap();refreshRealData();
    } else {
      const loc=pointerToCoord(positionFromPointer(e));
      if(loc.lat>=27&&loc.lat<=44.5&&loc.lng>=-18.5&&loc.lng<=5){state.selected=cellAt(loc.lat,loc.lng);state.userSelected=true;overlayRender();renderDetails();}
    }
  };
  map.viewport.addEventListener('pointerup',endDrag);
  map.viewport.addEventListener('pointercancel',endDrag);
  map.viewport.addEventListener('wheel',e=>{e.preventDefault();changeZoom(e.deltaY<0?1:-1,positionFromPointer(e));},{passive:false});
  map.viewport.addEventListener('keydown',e=>{
    if(e.key==='+'||e.key==='='){e.preventDefault();changeZoom(1);return;}
    if(e.key==='-'){e.preventDefault();changeZoom(-1);return;}
    if(e.key==='Enter'){e.preventDefault();state.selected=cellAt(state.center.lat,state.center.lng);state.userSelected=true;overlayRender();renderDetails();return;}
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
function updateMobileSelection(){
  const chip=EL('mobileSheetChip'),info=EL('mobileSectorPreview'),badge=EL('mobileSheetCount');
  if(!chip||!info||!badge)return;
  const chosen=Boolean(state.userSelected&&state.selected);
  info.hidden=!chosen;
  chip.disabled=!chosen;
  const share=EL('mobileRateCTA');
  if(share)share.disabled=!chosen;
  badge.hidden=!chosen;
  if(!chosen){chip.setAttribute('aria-label','Selecciona primero una zona del mapa');return;}
  const count=Math.max(0,Number(selectedRecord()?.count)||0);
  const countLabel=count===1?'1 opinión aprobada':`${fmtNum(count)} opiniones aprobadas`;
  EL('mobileSelectedSector').textContent=sectorName(state.selected);
  EL('mobileSelectedOpinions').textContent=countLabel;
  badge.textContent=fmtNum(count);
  chip.setAttribute('aria-label',`Ver ${sectorName(state.selected)}: ${countLabel}`);
}
function renderDetails(){
  updateMobileSelection();
  const root=EL('detailsContent');
  const c=state.selected,record=selectedRecord();
  if(commentsView.cellId!==(c?.id||null)){
    commentsView.cellId=c?.id||null;
    commentsView.items=[];commentsView.total=0;commentsView.loaded=false;
    commentsView.loading=false;commentsView.error=false;commentsView.seq++;
  }
  if(!c){root.innerHTML=`<div class="details-topline"><span class="detail-eyebrow">EXPLORA SIN PRISA</span>${icon('map-pin')}</div><div class="empty-details"><div class="empty-visual"></div><h3>Elige una zona<br>del mapa</h3><p>Pulsa cualquier punto del mapa para ver las opiniones existentes o añadir la tuya.</p><button class="primary-button" id="detailsStart">${icon('compass')} Explorar el mapa</button></div>`;EL('detailsStart').addEventListener('click',()=>map.viewport.focus());return;}
  if(!record){root.innerHTML=`<div class="details-topline"><span class="detail-eyebrow">${sectorName(c)}</span><span class="detail-eyebrow">SIN DATOS</span></div><div class="detail-head"><h3>Esta zona espera voces</h3><p>${escapeHtml(displayedCity())} · sector reducido · cuadrícula aproximada</p></div><div class="empty-details"><div class="empty-visual"></div><h3>Aún no hay opiniones aprobadas</h3><p>La primera valoración aprobada aparecerá aquí. Una opinión aislada no representa al barrio ni permite sacar conclusiones de seguridad.</p></div><div class="detail-actions"><button class="primary-button" id="detailRate">${icon('message')} Compartir mi experiencia</button><button class="secondary-button" id="detailSave">${icon('bookmark')} ${selectedIsSaved()?'Quitar de guardadas':'Guardar esta zona'}</button></div>`;bindDetails();return;}
  const confidence=record.count===1?'Solo 1 opinión: muestra muy limitada':record.count<5?'Muy pocas opiniones: muestra limitada':record.count>=25?'Más aportaciones':record.count>=10?'Muestra moderada':'Muestra pequeña';
  const metric=(label,value)=>`<div class="meter-row"><div class="meter-label"><span>${label}</span><strong>${value.toFixed(1)} / 5</strong></div><div class="meter-track"><div class="meter-fill" style="width:${((value-1)/4*100).toFixed(1)}%"></div></div></div>`;
  root.innerHTML=`<div class="details-topline"><span class="detail-eyebrow">${sectorName(c)}</span><span class="detail-eyebrow">${PREVIEW_MODE?'MUESTRA FICTICIA':'COMUNIDAD'}</span></div><div class="detail-head"><h3>${PREVIEW_MODE?'Ejemplo: '+escapeHtml(record.name):'Entorno seleccionado'}</h3><p>${escapeHtml(displayedCity())} · ${fmtNum(record.count)} ${PREVIEW_MODE?'opiniones simuladas':record.count===1?'opinión moderada':'opiniones moderadas'}</p></div><div class="detail-section-title">Percepciones de la zona</div><div class="meter-list">${metric('Seguridad percibida de día',record.day)}${metric('Seguridad percibida de noche',record.night)}${metric('Iluminación percibida',record.light)}${metric('Confort acústico',record.noise)}</div><div class="data-confidence">${icon('info')} <span>${PREVIEW_MODE?'Datos 100 % inventados para probar la interfaz, no describen esta zona.':confidence+' ('+fmtNum(record.count)+'). Las notas son percepciones subjetivas: con pocas opiniones no son representativas ni datos oficiales de delitos.'}</span></div>${PREVIEW_MODE?`<div class="sample-quotes"><strong>Opiniones de ejemplo · inventadas</strong>${record.notes.map(n=>`<p>«${escapeHtml(n)}»</p>`).join('')}</div>`:'<div id="communityCommentsContainer"></div>'}<div class="detail-actions"><button class="primary-button" id="detailRate">${icon('plus')} ${PREVIEW_MODE?'Ir al modo real para opinar':'Compartir mi experiencia'}</button><div class="detail-secondary-actions"><button class="secondary-button" id="detailSave">${icon('bookmark')} ${selectedIsSaved()?'Guardada':'Guardar'}</button><button class="secondary-button" id="detailCompare">${icon('compare')} ${selectedIsCompared()?'Quitar':'Comparar'}</button></div></div>`;
  bindDetails();
  if(!PREVIEW_MODE){renderSectorComments();if(!commentsView.loaded&&!commentsView.loading)loadSectorComments();}
}
function renderSectorComments(){
  const box=EL('communityCommentsContainer');
  if(!box||PREVIEW_MODE)return;
  const preview=selectedRecord()?.comments||[];
  const shown=commentsView.loaded?commentsView.items:preview.map(text=>({text}));
  const rows=shown.map(item=>`<p>«${escapeHtml(item.text)}»</p>`).join('');
  const total=commentsView.total;
  const loading=commentsView.loading;
  const more=commentsView.loaded&&shown.length<total;
  const retry=commentsView.error&&!loading;
  const label=loading?'Cargando comentarios…':retry?'No se pudieron cargar los comentarios.':'Opiniones personales moderadas, no hechos comprobados.';
  box.innerHTML=`<div class="community-comments" aria-live="polite"><strong>Comentarios de vecinos · aprobados</strong>${rows||(!loading&&!retry?'<p>Aún no hay comentarios escritos.</p>':'')}<small>${commentsView.loaded?`Mostrando ${shown.length} de ${total} comentarios. `:''}${label}</small>${more||retry?`<button type="button" id="moreSectorComments" class="secondary-button" ${loading?'disabled':''}>${retry?'Reintentar':'Ver más comentarios'}</button>`:''}</div>`;
  EL('moreSectorComments')?.addEventListener('click',loadSectorComments);
}
async function loadSectorComments(){
  const id=state.selected?.id;
  if(PREVIEW_MODE||!id||commentsView.loading||commentsView.cellId!==id)return;
  const seq=commentsView.seq;
  commentsView.loading=true;commentsView.error=false;renderSectorComments();
  try{
    const page=await window.BarrioAPI.getSectorComments(id,commentsView.items.length,20);
    if(seq!==commentsView.seq||state.selected?.id!==id)return;
    commentsView.items.push(...page.comments);
    commentsView.total=page.total;
    commentsView.loaded=true;
  }catch(error){
    if(seq===commentsView.seq){commentsView.error=true;}
  }finally{
    if(seq===commentsView.seq){commentsView.loading=false;renderSectorComments();}
  }
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
function chooseLocation(place,zoom=14){
  const changingCity=state.city!==place.name;
  cancelRatingsRequest();
  state.city=place.name;state.center={lat:Number(place.lat),lng:Number(place.lng)};state.zoom=zoom;
  state.selected=cellAt(state.center.lat,state.center.lng);state.userSelected=false;
  // Keep already loaded opinions when opening a compared/saved sector in this city.
  // New locations must still load their own data rather than showing stale votes.
  if(changingCity)state.realCells=[];
  syncCityLabels();
  EL('placeSearch').value='';
  changeView('explorar');
  renderCounters();renderDetails();
}
async function refreshRealData(){
  if(state.view!=='explorar'||!map.w||!map.h)return;
  const box=mapBounds();
  const clipped={west:clamp(box.west,-18.5,5),south:clamp(box.south,27,44.5),east:clamp(box.east,-18.5,5),north:clamp(box.north,27,44.5)};
  cancelRatingsRequest();
  const token=map.readSeq;
  if(clipped.east<=clipped.west||clipped.north<=clipped.south){
    state.realCells=[];renderCounters();overlayRender();renderDetails();ratingsStatus('Fuera del área cubierta por el mapa.');return;
  }
  if(PREVIEW_MODE){
    state.realCells=previewRecords().filter(p=>p.lng>=clipped.west-.015&&p.lng<=clipped.east+.015&&p.lat>=clipped.south-.015&&p.lat<=clipped.north+.015);
    renderCounters();overlayRender();renderDetails();ratingsStatus();return;
  }
  if(!window.BarrioAPI?.configured){
    state.realCells=[];renderCounters();overlayRender();renderDetails();ratingsStatus('Las valoraciones todavía no están disponibles.');return;
  }
  const controller=new AbortController();
  map.ratingsAbort=controller;
  ratingsStatus(state.realCells.length?'Actualizando opiniones…':'Cargando opiniones del mapa…');
  try{
    let json;
    // Retry once after a transient network error. An older request can never
    // erase the results of a newer one, even when the old request fails late.
    for(let attempt=0;attempt<2;attempt++){
      try{json=await window.BarrioAPI.getRatings(clipped,controller.signal);break;}
      catch(error){
        if(map.readSeq!==token||controller.signal.aborted)return;
        if(attempt===1)throw error;
        await new Promise(resolve=>setTimeout(resolve,450));
        if(map.readSeq!==token||controller.signal.aborted)return;
      }
    }
    if(map.readSeq!==token||controller.signal.aborted||state.view!=='explorar')return;
    if(!json||!Array.isArray(json.cells))throw new Error('Respuesta incompleta de las valoraciones.');
    state.realCells=json.cells.map(c=>{const [q,r]=c.id.split(':').map(Number);return {...cell(q,r),count:c.count,day:c.day,night:c.night,light:c.light,noise:c.noise,comments:Array.isArray(c.comments)?c.comments.filter(x=>typeof x==='string').slice(0,5):[]};});
    map.lastRatingsSuccess=Date.now();
    renderCounters();overlayRender();renderDetails();
    ratingsStatus(state.realCells.length?'':'Todavía no hay opiniones aprobadas en esta parte del mapa.');
  }catch(error){
    if(map.readSeq!==token||controller.signal.aborted||state.view!=='explorar')return;
    // Never replace valid visible sectors with an empty map on network errors.
    ratingsStatus(state.realCells.length?'No se pudieron actualizar las opiniones.':'No se pudieron cargar las opiniones.',true);
  }finally{
    if(map.ratingsAbort===controller)map.ratingsAbort=null;
  }
}
function escapeHtml(str){return String(str).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
async function searchPlace(term){
  const query=term.trim();if(query.length<2){toast('Introduce al menos dos caracteres');return;}
  // Quick city buttons use presets, but typed searches cover ALL Spain.
  const found=PRESETS[clean(query)];
  if(found){chooseLocation(found);return;}
  EL('mapLoader').hidden=false;
  EL('searchButton').disabled=true;
  try{
    const places=await window.BarrioAPI.searchPlaces(query);
    if(!places?.length){toast('No hay coincidencias. Prueba con el nombre completo o añade la provincia.');return;}
    if(places.length===1){chooseLocation(await window.BarrioAPI.resolvePlace(places[0]));return;}
    openPlaceResults(places);
  }catch(e){toast(e.message||'Error buscando la localidad');}
  finally{EL('mapLoader').hidden=true;EL('searchButton').disabled=false;}
}
function openPlaceResults(places){
  openModal(`<div class="modal-heading"><div><div class="modal-kicker">MUNICIPIOS Y LOCALIDADES DE ESPAÑA</div><h2>¿Qué lugar buscas?</h2></div><button class="modal-x" data-close aria-label="Cerrar">${icon('x')}</button></div><p class="modal-description">Selecciona el pueblo o ciudad correctos. Mostramos también su municipio o provincia para evitar confusiones.</p><div class="modal-list" id="placeResultList">${places.map((p,i)=>`<button type="button" class="secondary-button" data-result="${i}" style="justify-content:flex-start;padding:12px">${icon('map-pin')} ${escapeHtml(p.name||'Lugar')} ${icon('arrow-right')}</button>`).join('')}</div>`);
  EL('placeResultList').querySelectorAll('[data-result]').forEach(btn=>btn.addEventListener('click',async()=>{
    if(EL('mapLoader').hidden===false)return;
    const place=places[Number(btn.dataset.result)];
    EL('mapLoader').hidden=false;
    EL('mapLoader').textContent='Localizando pueblo o ciudad…';
    try {
      const position=await window.BarrioAPI.resolvePlace(place);
      closeModal();chooseLocation(position);
    } catch(e) {toast(e.message||'No se pudo localizar esta población');}
    finally {EL('mapLoader').hidden=true;EL('mapLoader').textContent='Buscando zona…';}
  }));
}
function changeView(view){
  if(view!=='explorar'&&state.view==='explorar'){
    cancelRatingsRequest();ratingsStatus();
  }
  state.view=view;
  const mapViews={explorar:'viewExplorar',guardadas:'viewGuardadas',comparar:'viewComparar',metodologia:'viewMetodologia'};
  for(const [key,id] of Object.entries(mapViews))EL(id).classList.toggle('hidden',key!==view);
  document.querySelectorAll('[data-view]').forEach(btn=>btn.classList.toggle('active',btn.dataset.view===view));
  document.querySelectorAll('.page-view').forEach(p=>p.setAttribute('aria-hidden',p.classList.contains('hidden')?'true':'false'));
  if(view==='guardadas')renderSavedPage();if(view==='comparar')renderComparePage();
  if(view==='explorar')scheduleMapRefresh();
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
  state.selected=cell(item.q,item.r);state.userSelected=true;renderDetails();overlayRender();renderCounters();
}
function renderComparePage(){
  const root=EL('compareList');if(!root)return;
  if(state.comparison.length<2){root.innerHTML=`<div class="empty-state">${icon('compare')}<h3>${state.comparison.length?'Solo falta una zona':'Selecciona dos zonas para comparar'}</h3><p>${state.comparison.length?'Ya tienes una zona añadida.':'Añade dos sectores desde su ficha en el mapa.'} La comparación siempre incluye el origen y número de opiniones.</p><button id="goExploreCompare">Buscar zonas</button></div>${state.comparison.length?`<p class="modal-caption">Seleccionada: ${sectorName(state.comparison[0])} · ${escapeHtml(state.comparison[0].city)}</p>`:''}`;EL('goExploreCompare').addEventListener('click',()=>changeView('explorar'));return;}
  const cards=state.comparison.map((c,i)=>`<div class="compare-card"><span class="saved-pill" style="font-size:9px;background:#e7f4e9;color:#4a7e55;border-radius:6px;padding:6px 9px">ZONA ${i+1}</span><h3>${sectorName(c)}</h3><p>${escapeHtml(c.city)} · captura realizada al guardar</p>${c.snapshot?`<div class="compare-number">${Number(c.snapshot.night).toFixed(1)} <span>/5, de noche</span></div><div class="compare-metric"><span>Percepción de día</span><b>${Number(c.snapshot.day).toFixed(1)} / 5</b></div><div class="compare-metric"><span>Iluminación</span><b>${Number(c.snapshot.light).toFixed(1)} / 5</b></div><div class="compare-metric"><span>Confort acústico</span><b>${Number(c.snapshot.noise).toFixed(1)} / 5</b></div><div class="compare-metric"><span>Opiniones</span><b>${c.snapshot.count}</b></div>`:`<div class="empty-state" style="min-height:160px"><h3>Sin opiniones suficientes</h3></div>`}<div class="saved-card-actions" style="margin-top:18px"><button data-compare-open="${i}">Ver en el mapa</button><button data-compare-remove="${i}">Quitar</button></div></div>`).join('');
  root.innerHTML=`<div class="method-banner">${icon('info')}<p>Una diferencia entre notas <strong>no prueba</strong> que una zona sea más peligrosa que otra. Las muestras, momentos y opiniones pueden ser distintos.</p></div><div class="comparison-layout">${cards}</div>`;
  root.querySelectorAll('[data-compare-open]').forEach(btn=>btn.addEventListener('click',()=>goToSnapshot(state.comparison[Number(btn.dataset.compareOpen)])));
  root.querySelectorAll('[data-compare-remove]').forEach(btn=>btn.addEventListener('click',()=>{state.comparison.splice(Number(btn.dataset.compareRemove),1);persist();renderComparePage();}));
}
function openModal(markup){EL('modalContent').innerHTML=`<div class="modal-body">${markup}</div>`;const heading=EL('modalContent').querySelector('h2');if(heading)heading.id='modalTitle';EL('modalRoot').classList.remove('hidden');document.body.style.overflow='hidden';EL('modalContent').querySelectorAll('[data-close]').forEach(btn=>btn.addEventListener('click',closeModal));}
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
async function openAccount({fromRating=false}={}){
  if(!window.BarrioAPI?.configured){
    toast('Esta versión aún no está conectada a Supabase.');return;
  }
  let user;
  try { user=await window.BarrioAPI.getCommunityUser(); }
  catch(error){ toast(error.message||'No pudimos comprobar tu cuenta.');return; }
  if(user){
    openModal(`<div class="modal-heading"><div><div class="modal-kicker">TU CUENTA</div><h2>Correo verificado</h2></div><button class="modal-x" data-close aria-label="Cerrar">${icon('x')}</button></div><p class="modal-description">Has iniciado sesión como <strong>${escapeHtml(user.email)}</strong>. Tu correo no se muestra en el mapa.</p><div class="modal-list"><div>${icon('shield')} Tus valoraciones se publican solo cuando un moderador las aprueba.</div></div><div class="modal-footer"><button class="secondary-button" id="logoutCommunity">Cerrar sesión</button><button class="primary-button" id="accountDone">${fromRating?'Continuar con la valoración':'Volver al mapa'}</button></div>`);
    EL('accountDone').addEventListener('click',()=>{closeModal();if(fromRating)openRating();});
    EL('logoutCommunity').addEventListener('click',async()=>{
      try { await window.BarrioAPI.logoutCommunity();closeModal();await updateAccountButton();toast('Has cerrado la sesión.'); }
      catch(error){toast(error.message||'No se pudo cerrar la sesión.');}
    });
    return;
  }
  openModal(`<div class="modal-heading"><div><div class="modal-kicker">ACCESO GRATUITO</div><h2>${fromRating?'Primero verifica tu correo':'Entra en Zonenta'}</h2></div><button class="modal-x" data-close aria-label="Cerrar">${icon('x')}</button></div>
    <p class="modal-description">${fromRating?'Para poder puntuar un sector necesitamos comprobar que tienes acceso a un correo electrónico. Todavía no puedes rellenar la valoración.':'Verifica tu correo para poder compartir experiencias. Consultar el mapa no requiere iniciar sesión.'}</p>
    <ol class="auth-steps" aria-label="Cómo acceder">
      <li><span>1</span><p><strong>Introduce tu correo.</strong> Te enviaremos un enlace de acceso.</p></li>
      <li><span>2</span><p><strong>Abre tu correo</strong> y pulsa «Entrar» en el mensaje de Zonenta.</p></li>
      <li><span>3</span><p><strong>Vuelve a Zonenta.</strong> Al estar verificado, ya podrás valorar la zona.</p></li>
    </ol>
    <form id="emailLoginForm" class="auth-email-form">
      <label for="loginEmail">Tu correo electrónico</label>
      <input id="loginEmail" type="email" name="email" autocomplete="email" inputmode="email" required maxlength="254" placeholder="tu@correo.es">
      <button type="submit" class="primary-button" id="loginSend">Enviarme el enlace por correo ${icon('arrow-right')}</button>
    </form>
    <div id="authSentState" class="auth-sent" hidden>
      <strong>¡Revisa tu correo!</strong>
      <p>Hemos solicitado un enlace para <strong id="authSentEmail"></strong>.</p>
      <p>Busca el mensaje de Zonenta (también en Spam) y pulsa su enlace. No tienes que copiar códigos ni contraseñas.</p>
      <button class="secondary-button" id="changeLoginEmail" type="button">Usar otro correo</button>
    </div>
    <p id="loginStatus" class="auth-status" role="status" aria-live="polite"></p>
    <p class="modal-caption">Tu dirección no se publica. Consulta la <a href="/privacidad.html" target="_blank" rel="noopener">información de privacidad</a>. No utilices correos ajenos.</p>`);
  EL('emailLoginForm').addEventListener('submit',async e=>{
    e.preventDefault();
    const send=EL('loginSend'),status=EL('loginStatus');
    send.disabled=true;send.textContent='Enviando enlace…';status.textContent='';
    const email=EL('loginEmail').value.trim();
    try{
      await window.BarrioAPI.sendLoginEmail(email);
      EL('emailLoginForm').hidden=true;
      EL('authSentEmail').textContent=email;
      EL('authSentState').hidden=false;
      status.textContent='En cuanto pulses el enlace recibido, podrás volver a Zonenta y opinar.';
    }catch(error){
      status.textContent=error.message||'No se pudo enviar el enlace. Inténtalo de nuevo.';
    }finally{send.disabled=false;send.innerHTML=`Enviarme el enlace por correo ${icon('arrow-right')}`;}
  });
  EL('changeLoginEmail').addEventListener('click',()=>{
    EL('authSentState').hidden=true;
    EL('emailLoginForm').hidden=false;
    EL('loginStatus').textContent='';
    EL('loginEmail').focus();
  });
}

async function openRating(){
  if(PREVIEW_MODE){toast('Las muestras no aceptan votos. Abre el modo real.');return;}
  if(!state.selected){toast('Primero selecciona una zona');return;}
  // No rating controls until Supabase confirms a verified user.
  if(!window.BarrioAPI?.configured){toast('El acceso aún no está disponible.');return;}
  let verifiedUser;
  try{verifiedUser=await window.BarrioAPI.getCommunityUser();}
  catch(error){toast(error.message||'No pudimos comprobar tu acceso.');return;}
  if(!verifiedUser){await openAccount({fromRating:true});return;}
  const selected=state.selected;
  openModal(`<div class="modal-heading"><div><div class="modal-kicker">COMPARTE TU EXPERIENCIA</div><h2>¿Cómo se vive esta zona?</h2></div><button class="modal-x" data-close aria-label="Cerrar">${icon('x')}</button></div><p class="modal-description">${sectorName(selected)} · ${escapeHtml(state.city)}. Valora únicamente lo que conozcas de primera mano. No se pedirán nombres ni descripciones de personas.</p><form id="ratingForm"><div id="existingReviewNotice" class="rating-replace-notice" role="status" hidden><strong>Ya has valorado esta zona</strong><p>Al volver a enviarla, sustituirás tu valoración y comentario anteriores. Solo se conserva una valoración por cuenta y zona, y la nueva pasará otra vez por moderación.</p></div>${QUESTIONS.map(([key,label,low,high])=>`<div class="slider-group"><div class="slider-group-top"><label for="range-${key}">${label}</label><output class="slider-value" id="value-${key}">3/5</output></div><input aria-label="${label}" id="range-${key}" class="rating-slider" name="${key}" type="range" min="1" max="5" step="1" value="3"><div class="slider-tips"><span>${low}</span><span>${high}</span></div></div>`).join('')}<div class="detail-section-title">¿Qué destacarías? <span style="font-weight:500;color:#94a79a">(opcional, máximo 4)</span></div><div class="tag-options">${TAGS.map(([key,label])=>`<label><input type="checkbox" name="tags" value="${key}">${label}</label>`).join('')}</div><div class="rating-comment-field"><label for="ratingComment">Cuenta tu experiencia <span>(opcional)</span></label><textarea id="ratingComment" name="comment" rows="4" maxlength="500" placeholder="¿Qué te gusta de esta zona o qué mejorarías? Cuéntalo sin identificar a otras personas."></textarea><div class="rating-comment-hint"><span>No incluyas nombres, direcciones concretas, datos privados ni acusaciones sobre personas. El mensaje se revisará antes de publicarse.</span><output id="ratingCommentCount" aria-live="polite">0 / 500</output></div></div><div id="replaceReviewConfirm" class="rating-replace-confirm" role="group" aria-label="Confirmar actualización de valoración" hidden><strong>¿Quieres sustituir tu valoración anterior?</strong><p>Se reemplazarán las puntuaciones, etiquetas y comentario guardados de esta zona. La nueva valoración volverá a moderación.</p><div class="rating-replace-buttons"><button type="button" class="secondary-button" id="cancelReplaceReview">Conservar anterior</button><button type="button" class="primary-button" id="confirmReplaceReview">Sí, actualizar valoración</button></div></div><p class="rating-submit-error" id="ratingSubmitError" role="alert" hidden></p><div class="modal-footer"><button type="button" class="secondary-button" data-close>Cerrar</button><button type="submit" class="primary-button" id="sendRating">Enviar valoración ${icon('arrow-right')}</button></div><p class="modal-caption">Las contribuciones pasan por moderación. Puedes valorar tantas zonas como quieras y actualizar cada valoración las veces que necesites (con una pausa de 2 minutos entre cambios). Solo se mantiene una por cuenta y zona, y cada cambio requiere moderación. Solo aceptamos cuentas con correo verificado. Evita compartir datos personales.</p></form>`);
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
    e.preventDefault();const btn=EL('sendRating');if(btn.disabled)return;EL('ratingSubmitError').hidden=true;btn.disabled=true;btn.textContent='Enviando…';
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
        const confirmed = await new Promise(resolve => {
          const notice = EL('replaceReviewConfirm');
          const keep = EL('cancelReplaceReview');
          const replace = EL('confirmReplaceReview');
          const finish = decision => {
            keep.removeEventListener('click', cancel);
            replace.removeEventListener('click', accept);
            notice.hidden = true;
            resolve(decision);
          };
          const cancel = () => finish(false);
          const accept = () => finish(true);
          notice.hidden = false;
          keep.addEventListener('click', cancel, {once:true});
          replace.addEventListener('click', accept, {once:true});
          keep.focus({preventScroll:true});
          notice.scrollIntoView({block:'nearest',behavior:'smooth'});
        });
        if (!confirmed) {
          toast('Se ha conservado tu valoración anterior.');
          return;
        }
        // Do not send after the modal/form has been closed while awaiting confirmation.
        if (!form.isConnected) return;
      }
      await window.BarrioAPI.sendReview({...values,lat:selected.lat,lng:selected.lng,cellId:selected.id,tags,comment});
      openModal(`<div class="modal-heading"><div><div class="modal-kicker">APORTACIÓN RECIBIDA</div><h2>Gracias por compartir.</h2></div><button class="modal-x" data-close aria-label="Cerrar">${icon('x')}</button></div><div class="success-card"><div class="success-icon">${icon('check')}</div><h3>Tu opinión está en revisión</h3><p>Se mostrará en el mapa en cuanto un moderador la apruebe, aunque sea la primera opinión del sector. Se indicará que es una muestra muy limitada.</p><button class="primary-button" id="closeSuccess" style="width:100%">Volver al mapa</button></div>`);
      EL('closeSuccess').addEventListener('click',closeModal);
    }catch(error){if(error.code==='LOGIN_REQUIRED'){await openAccount({fromRating:true});}else{const message=error.message||'No se pudo enviar la valoración. Inténtalo de nuevo.';const messageBox=EL('ratingSubmitError');if(messageBox?.isConnected){messageBox.textContent=message;messageBox.hidden=false;}toast(message);}btn.disabled=false;btn.innerHTML=`Enviar valoración ${icon('arrow-right')}`;}
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
function openLegend(){openModal(`<div class="modal-heading"><div><div class="modal-kicker">CÓMO LEER EL MAPA</div><h2>Los colores resumen cuatro percepciones.</h2><p class="modal-caption">El color de cada sector se calcula como la media aritmética de seguridad de día, seguridad de noche, iluminación y confort acústico (25 % cada indicador). Es un resumen de percepciones subjetivas y no una medida oficial de seguridad.</p></div><button class="modal-x" data-close aria-label="Cerrar">${icon('x')}</button></div><div class="modal-list"><div><i class="legend-dot green" style="margin-top:6px"></i> Verde: media desde 3,7 sobre 5.</div><div><i class="legend-dot orange" style="margin-top:6px"></i> Ámbar: media de 2,8 a menos de 3,7.</div><div><i class="legend-dot red" style="margin-top:6px"></i> Coral: media por debajo de 2,8. No significa que haya delitos confirmados.</div><div>${icon('info')} Sin color significa falta de datos, nunca ausencia de riesgo.</div></div><p class="modal-description">Una zona aparece desde su primera opinión moderada de una cuenta con correo verificado en los últimos 180 días. Con menos de cinco opiniones, los polígonos se dibujan con línea discontinua y la fiabilidad es muy limitada.</p><button class="primary-button" id="legendMethod" style="width:100%">Ver metodología ${icon('arrow-right')}</button>`);EL('legendMethod').addEventListener('click',()=>{closeModal();changeView('metodologia');});}
function openInstallHelp(){openModal(`<div class="modal-heading"><div><div class="modal-kicker">UNA APP EN TU MÓVIL</div><h2>Instala Zonenta</h2></div><button class="modal-x" data-close aria-label="Cerrar">${icon('x')}</button></div><p class="modal-description">Es una PWA: puedes añadirla a la pantalla de inicio sin pasar por una tienda de aplicaciones. El mapa y las aportaciones requieren conexión a Internet.</p><div class="modal-list"><div>${icon('download')} En Android/Chrome, abre el menú del navegador y elige «Instalar aplicación» o «Añadir a pantalla de inicio».</div><div>${icon('download')} En iPhone/Safari, usa «Compartir» y después «Añadir a pantalla de inicio».</div><div>${icon('shield')} Para instalarla desde un servidor remoto, necesitas HTTPS.</div></div><button class="primary-button" data-close style="width:100%">Entendido</button>`);EL('modalContent').querySelectorAll('[data-close]').forEach(btn=>btn.addEventListener('click',closeModal));}
function bindUI(){
  document.querySelectorAll('[data-view]').forEach(btn=>btn.addEventListener('click',()=>changeView(btn.dataset.view)));
  document.querySelectorAll('[data-city]').forEach(btn=>btn.addEventListener('click',()=>chooseLocation(PRESETS[clean(btn.dataset.city)])));
  EL('placeForm').addEventListener('submit',e=>{e.preventDefault();searchPlace(EL('placeSearch').value);});
  EL('howScoring').addEventListener('click',()=>changeView('metodologia'));
  EL('legendInfo').addEventListener('click',openLegend);
  EL('footerMethod').addEventListener('click',()=>changeView('metodologia'));
  EL('planBtn').addEventListener('click',openPlan);
  EL('mobileMenu').addEventListener('click',openInstallHelp);
  EL('accountButton').addEventListener('click',openAccount);
  EL('retryRatings').addEventListener('click',scheduleMapRefresh);
  window.addEventListener('pageshow',event=>{
    if(event.persisted&&state.view==='explorar')scheduleMapRefresh();
  });
  document.addEventListener('visibilitychange',()=>{
    if(!document.hidden&&state.view==='explorar'&&(!map.lastRatingsSuccess||Date.now()-map.lastRatingsSuccess>60000))scheduleMapRefresh();
  });
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
  syncCityLabels();
  if(PREVIEW_MODE){
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
  bindUI();initMap();renderDetails();renderCounters();scheduleMapRefresh();updateAccountButton();
  if(window.BarrioAPI?.configured)window.BarrioAPI.onCommunityAuthChange(async()=>{await updateAccountButton();if(EL('emailLoginForm')&&!EL('modalRoot').classList.contains('hidden')){try{const u=await window.BarrioAPI.getCommunityUser();if(u){closeModal();toast('Correo verificado. Ya puedes opinar.');}}catch{}}});
}
document.addEventListener('DOMContentLoaded',start);
})();