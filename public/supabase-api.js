/* BarrioRadar Supabase adapter; no private credentials in the browser. */
(function () {
  'use strict';
  const cfg = window.BARRIORADAR_CONFIG || {};
  const configured = /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(String(cfg.supabaseUrl || ''))
    && /^(sb_publishable_[A-Za-z0-9_-]+|eyJ[A-Za-z0-9._-]+)$/.test(String(cfg.supabasePublishableKey || ''));
  let communityClient;
  let lastGeocode = 0;
  const temporaryCache = new Map();

  // Both the public app and /admin.html share one verified Supabase Auth session.
  // Moderator permissions are checked on the database, never in the browser.
  function getClient() {
    if (!configured) throw new Error('La base de datos aun no esta configurada.');
    if (!window.supabase || typeof window.supabase.createClient !== 'function') {
      throw new Error('No se pudo cargar la conexion segura con la base de datos.');
    }
    if (!communityClient) communityClient = window.supabase.createClient(cfg.supabaseUrl, cfg.supabasePublishableKey, {
      auth: { storageKey: 'br-community-auth-v1', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    });
    return communityClient;
  }

  function throwIf(error) {
    if (error) throw new Error(error.message || 'Error de conexion con Supabase.');
  }
  async function getRatings(bounds) {
    const { data, error } = await getClient().rpc('br_public_ratings', {
      p_west: Number(bounds.west), p_south: Number(bounds.south),
      p_east: Number(bounds.east), p_north: Number(bounds.north)
    });
    throwIf(error);
    return data || { cells: [] };
  }
  // Only verified Supabase Auth identities may contribute to public aggregates.
  // An anonymous device/session is deliberately not accepted as a unique person.
  async function getCommunityUser() {
    if (!configured) return null;
    const {data, error} = await getClient().auth.getUser();
    if (error || !data?.user?.email || !data.user.email_confirmed_at) return null;
    return data.user;
  }
  async function sendLoginEmail(email, targetPath = "/") {
    if (!configured) throw new Error('El servicio todavia no esta configurado.');
    const clean = String(email || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean) || clean.length > 254) {
      throw new Error('Escribe una direccion de correo valida.');
    }
    // Return moderators to the panel where they requested the sign-in link.
    // Restrict redirect choices to known same-origin paths.
    const redirect = `${location.origin}${targetPath === "/admin.html" ? "/admin.html" : "/"}`;
    const {error} = await getClient().auth.signInWithOtp({
      email: clean,
      options: {emailRedirectTo: redirect, shouldCreateUser: true}
    });
    throwIf(error);
    return true;
  }
  async function confirmEmailCode(email, code) {
    const token = String(code || '').trim();
    if (!/^[0-9]{6,8}$/.test(token)) throw new Error('Introduce el codigo numerico de tu correo.');
    const {data, error} = await getClient().auth.verifyOtp({email: String(email || '').trim().toLowerCase(), token, type:'email'});
    throwIf(error);
    if (!data?.session) throw new Error('No se pudo completar la verificacion.');
    return data.user;
  }
  // Only the current authenticated reviewer can discover whether they already rated a sector.
  // The server never exposes their email or another person's history.
  async function hasMyReview(cellId) {
    const user = await getCommunityUser();
    if (!user) {
      const err = new Error('Para comprobar tu valoración, verifica primero tu correo en Mi cuenta.');
      err.code = 'LOGIN_REQUIRED';
      throw err;
    }
    const { data, error } = await getClient().rpc('br_my_sector_review_v2', {p_cell_id: String(cellId || '')});
    throwIf(error);
    if (typeof data?.exists !== 'boolean') throw new Error('No se pudo comprobar tu valoración anterior. Inténtalo de nuevo.');
    return data.exists;
  }
  async function sendReview(payload) {
    const client = getClient();
    const user = await getCommunityUser();
    if (!user) {
      const err = new Error('Para opinar, verifica primero tu correo en Mi cuenta.');
      err.code = 'LOGIN_REQUIRED';
      throw err;
    }
    const { data, error } = await client.rpc('br_submit_review_v2', {
      p_lat: payload.lat, p_lon: payload.lng, p_cell_id: payload.cellId,
      p_day: payload.day, p_night: payload.night, p_light: payload.light,
      p_noise: payload.noise, p_tags: payload.tags,
      p_comment: String(payload.comment || '').trim()
    });
    throwIf(error);
    if (!data?.ok) throw new Error('La valoracion no pudo guardarse.');
    return data;
  }
  async function logoutCommunity() {
    if (!configured) return;
    const {error} = await getClient().auth.signOut();
    throwIf(error);
  }
  function onCommunityAuthChange(callback) {
    if (!configured) return () => {};
    const {data} = getClient().auth.onAuthStateChange(() => {
      // The callback must not reenter the auth client synchronously.
      setTimeout(callback, 0);
    });
    return () => data.subscription.unsubscribe();
  }

  // Geocoding nationwide: CartoCiudad (IGN/CNIG, municipios y entidades de población)
  // with Photon/OpenStreetMap as a fallback and a complementary source of hamlets.
  // Search requests happen only on submit, never on every keystroke.
  const GEOCODING_AREA = {west:-18.5, south:27, east:5, north:44.5};
  const CARTOCIUDAD_BASE = 'https://www.cartociudad.es/geocoder/api/geocoder/';
  const PHOTON_BASE = 'https://photon.komoot.io/api/';
  const LOCALITY_TYPES = new Set(['municipio','poblacion','provincia','comunidad autonoma']);
  const OSM_PLACE_TYPES = new Set([
    'city','town','village','hamlet','isolated_dwelling','locality',
    'suburb','neighbourhood','quarter','municipality','borough'
  ]);
  function tidy(value) { return String(value ?? '').trim().replace(/\s+/g,' '); }
  function normalizePlaceName(value) {
    return tidy(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('es');
  }
  function validSpainCoords(lat,lng) {
    return lat !== null && lng !== null && lat !== undefined && lng !== undefined &&
      lat !== '' && lng !== '' && Number.isFinite(Number(lat)) && Number.isFinite(Number(lng)) &&
      Number(lat)>=GEOCODING_AREA.south && Number(lat)<=GEOCODING_AREA.north &&
      Number(lng)>=GEOCODING_AREA.west && Number(lng)<=GEOCODING_AREA.east;
  }
  async function geoFetch(url, maxWait=6500) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), maxWait);
    try {
      const response = await fetch(url, {signal:controller.signal, credentials:'omit', mode:'cors'});
      if (!response.ok) throw new Error(`Geocoder HTTP ${response.status}`);
      return await response.json();
    } finally { clearTimeout(timeout); }
  }
  function placeLabel(parts) {
    const unique=[];
    for (const part of parts) {
      const text=tidy(part);
      if (text && !unique.join(', ').split(',').some(item=>normalizePlaceName(item)===normalizePlaceName(text))) unique.push(text);
    }
    return unique.join(', ');
  }
  function normalizeCartoCandidates(raw) {
    const candidates=Array.isArray(raw)?raw:(raw?.candidates||raw?.results||[]);
    if(!Array.isArray(candidates))return [];
    return candidates.filter(p=>LOCALITY_TYPES.has(normalizePlaceName(p?.type)))
      .filter(p=>p?.id!=null && tidy(p.address||p.poblacion||p.muni))
      .map(p=>{
        const kind=normalizePlaceName(p.type), address=tidy(p.address||p.poblacion||p.muni);
        const localName=address.split(',')[0].trim();
        const province=tidy(p.province);
        const name=placeLabel([address,kind==='poblacion'?p.muni:'',province]);
        const positioned=validSpainCoords(p.lat,p.lng);
        return {name,localName,province,
          lat:positioned?Number(p.lat):null,lng:positioned?Number(p.lng):null,
          source:'cartociudad',cartoId:String(p.id),cartoType:String(p.type)};
      });
  }
  function normalizePhotonFeatures(raw) {
    const features=Array.isArray(raw?.features)?raw.features:[];
    return features.filter(f=>{
      const p=f?.properties||{};
      return String(p.countrycode||'').toUpperCase()==='ES' &&
        OSM_PLACE_TYPES.has(String(p.osm_value||'').toLowerCase()) &&
        Array.isArray(f.geometry?.coordinates) &&
        validSpainCoords(f.geometry.coordinates[1],f.geometry.coordinates[0]);
    }).map(f=>{
      const p=f.properties, province=tidy(p.county||p.state||'');
      const localName=tidy(p.name);
      const name=placeLabel([localName,p.city&&normalizePlaceName(p.city)!==normalizePlaceName(localName)?p.city:'',province]);
      return {name,localName,province,lat:Number(f.geometry.coordinates[1]),
        lng:Number(f.geometry.coordinates[0]),source:'photon'};
    }).filter(p=>p.localName);
  }
  function rankPlace(p,term) {
    const search=normalizePlaceName(term).split(',')[0].trim();
    const name=normalizePlaceName(p.localName);
    return name===search?0:name.startsWith(search)?1:name.includes(search)?2:3;
  }
  function mergePlaces(groups,term) {
    const seen=new Map();
    for(const p of groups.flat()) {
      if(!p.name)continue;
      const key=normalizePlaceName(p.localName)+'|'+normalizePlaceName(p.province);
      const previous=seen.get(key);
      if(!previous) {seen.set(key,p);continue;}
      // Prefer official names and locations. Keep OSM coordinates if the
      // official candidate needs a second request that later fails.
      if(p.source==='cartociudad' && previous.source!=='cartociudad') {
        seen.set(key,{...p,fallbackLat:previous.lat,fallbackLng:previous.lng});
      } else if(previous.source==='cartociudad' && p.source==='photon' &&
        validSpainCoords(p.lat,p.lng) && !validSpainCoords(previous.lat,previous.lng)) {
        previous.fallbackLat=p.lat;previous.fallbackLng=p.lng;
      }
    }
    return [...seen.values()].sort((a,b)=>rankPlace(a,term)-rankPlace(b,term)||
      a.name.localeCompare(b.name,'es')).slice(0,12);
  }
  async function searchCartoCiudad(value) {
    const url=new URL('candidates',CARTOCIUDAD_BASE);
    url.searchParams.set('q',value);
    url.searchParams.set('countrycodes','es');
    url.searchParams.set('limit','24');
    url.searchParams.set('no_process','callejero,carretera,portal,toponimo,ngbe,expendeduria,punto_recarga_electrica');
    return normalizeCartoCandidates(await geoFetch(url,6000));
  }
  async function searchPhoton(value) {
    const url=new URL(PHOTON_BASE);
    url.searchParams.set('q',value);
    url.searchParams.set('lang','es');
    url.searchParams.set('limit','30');
    url.searchParams.set('countrycode','ES');
    url.searchParams.set('bbox','-18.5,27,5,44.5');
    return normalizePhotonFeatures(await geoFetch(url,7000));
  }
  async function searchPlaces(query) {
    const value=tidy(query).slice(0,110);
    if(value.length<2)throw new Error('Introduce al menos dos caracteres.');
    const key=normalizePlaceName(value);
    const cached=temporaryCache.get(key);
    if(cached && Date.now()-cached.at<7*86400000)return cached.places;
    if(Date.now()-lastGeocode<1200)throw new Error('Espera unos segundos antes de buscar de nuevo.');
    lastGeocode=Date.now();
    const answers=await Promise.allSettled([searchCartoCiudad(value),searchPhoton(value)]);
    const groups=answers.map(a=>a.status==='fulfilled'?a.value:[]);
    const places=mergePlaces(groups,value);
    if(answers.every(a=>a.status==='rejected')) {
      throw new Error('Los servicios de búsqueda no responden. Reinténtalo dentro de unos instantes.');
    }
    if(temporaryCache.size>50)temporaryCache.clear();
    temporaryCache.set(key,{places,at:Date.now()});
    return places;
  }
  async function resolvePlace(place) {
    if(!place || typeof place.name!=='string')throw new Error('Selecciona una localidad válida.');
    if(place.source==='cartociudad' && place.cartoId && place.cartoType) {
      const url=new URL('find',CARTOCIUDAD_BASE);
      url.searchParams.set('id',place.cartoId);
      url.searchParams.set('type',place.cartoType);
      try {
        const raw=await geoFetch(url,6500);
        const item=Array.isArray(raw)?raw[0]:raw;
        if(validSpainCoords(item?.lat,item?.lng))return {...place,lat:Number(item.lat),lng:Number(item.lng)};
        // Some geocoder responses supply the geometry only as a WKT point.
        const wkt=/^POINT\s*\(\s*(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s*\)$/i.exec(item?.geom||'');
        if(wkt&&validSpainCoords(wkt[2],wkt[1]))return {...place,lat:Number(wkt[2]),lng:Number(wkt[1])};
      } catch { /* fall back to a previously validated coordinate */ }
    }
    if(validSpainCoords(place.lat,place.lng))return place;
    if(validSpainCoords(place.fallbackLat,place.fallbackLng))
      return {...place,lat:Number(place.fallbackLat),lng:Number(place.fallbackLng)};
    throw new Error('No se pudo obtener la ubicación de esta localidad. Prueba otro resultado.');
  }

  async function currentAdmin() {
    const { data, error } = await getClient().auth.getUser();
    if (error) return null;
    return data?.user || null;
  }
  async function adminQueue() {
    const { data, error } = await getClient().rpc('br_admin_queue');
    throwIf(error);
    return data?.rows || [];
  }
  async function moderate(id, status) {
    const {data, error} = await getClient().rpc('br_moderate_review', { p_id: id, p_status: status });
    throwIf(error);
    if (!data?.ok) throw new Error('La aportacion no existe o ya ha sido moderada.');
  }
  async function logoutAdmin() { await logoutCommunity(); }

  window.BarrioAPI = Object.freeze({ configured, getRatings, sendReview, hasMyReview, searchPlaces, resolvePlace,
    getCommunityUser, sendLoginEmail, confirmEmailCode, logoutCommunity, onCommunityAuthChange,
    currentAdmin, adminQueue, moderate, logoutAdmin });
}());