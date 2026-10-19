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
    const { data, error } = await getClient().rpc('br_my_sector_review', {p_cell_id: String(cellId || '')});
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

  async function searchPlaces(query) {
    const value = String(query || '').trim().slice(0, 110);
    if (value.length < 2) throw new Error('Introduce al menos dos caracteres.');
    const key = value.toLocaleLowerCase('es');
    const cached = temporaryCache.get(key);
    if (cached && Date.now() - cached.at < 7 * 86400000) return cached.places;
    if (Date.now() - lastGeocode < 1200) throw new Error('Espera unos segundos antes de buscar de nuevo.');
    lastGeocode = Date.now();
    const url = new URL('https://photon.komoot.io/api/');
    url.searchParams.set('q', value);
    url.searchParams.set('limit', '5');
    url.searchParams.set('lang', 'es');
    url.searchParams.set('bbox', '-18.5,27,5,44.5');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);
    let result;
    try {
      const response = await fetch(url, { signal: controller.signal, credentials: 'omit' });
      if (!response.ok) throw new Error('Busqueda externa no disponible. Prueba con una ciudad sugerida.');
      result = await response.json();
    } finally { clearTimeout(timeout); }
    const places = (result.features || []).filter(f => String(f.properties?.countrycode || '').toUpperCase() === 'ES')
      .slice(0, 4).map(f => ({
        lat: Number(f.geometry.coordinates[1]), lng: Number(f.geometry.coordinates[0]),
        name: [f.properties?.name, f.properties?.city || f.properties?.county]
          .filter((x, i, arr) => x && arr.indexOf(x) === i).join(', ')
      }));
    if (temporaryCache.size > 50) temporaryCache.clear();
    temporaryCache.set(key, { places, at: Date.now() });
    return places;
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

  window.BarrioAPI = Object.freeze({ configured, getRatings, sendReview, hasMyReview, searchPlaces,
    getCommunityUser, sendLoginEmail, confirmEmailCode, logoutCommunity, onCommunityAuthChange,
    currentAdmin, adminQueue, moderate, logoutAdmin });
}());
