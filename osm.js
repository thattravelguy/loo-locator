/* osm.js — OpenStreetMap Overpass API integration */

const OSM = {
  loaded: {},

  /**
   * Query the Overpass API for toilets within a city bounding box.
   * Returns an array of normalised toilet objects.
   */
  async fetchCity(cityKey) {
    const city = CITIES[cityKey];
    if (!city) return [];
    const b = city.bounds;

    /* Overpass QL: nodes, ways, and relations tagged amenity=toilets */
    const query = `
      [out:json][timeout:25];
      (
        node["amenity"="toilets"](${b.minLat},${b.minLng},${b.maxLat},${b.maxLng});
        way["amenity"="toilets"](${b.minLat},${b.minLng},${b.maxLat},${b.maxLng});
      );
      out center;
    `;

    const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;

    const resp = await fetch(url, { signal: AbortSignal.timeout(20000) });
    if (!resp.ok) throw new Error(`Overpass HTTP ${resp.status}`);
    const json = await resp.json();

    return (json.elements || []).map((el, i) => {
      const lat = el.lat ?? el.center?.lat;
      const lng = el.lon ?? el.center?.lon;
      if (!lat || !lng) return null;

      const tags = el.tags || {};
      const name = tags.name || tags['name:en'] || tags.description || 'Public WC';
      const fee  = tags.fee === 'yes' || tags['charge'] ? true : false;
      const freeToUse = tags.fee === 'no' || (!fee && !tags['charge']);
      const wheelchair = (tags.wheelchair === 'yes' || tags.wheelchair === 'designated');
      const open247 = tags.opening_hours === '24/7' || tags.opening_hours === 'Mo-Su 00:00-24:00';
      const hours = tags.opening_hours || (open247 ? '24/7' : null);
      const charge = tags['charge'] || (fee ? 'Fee applies' : null);

      return {
        id: `osm_${el.type}_${el.id}`,
        city: cityKey,
        name,
        area: tags['addr:suburb'] || tags['addr:city'] || city.name,
        lat, lng,
        free: freeToUse,
        accessible: wheelchair,
        open247,
        hours: hours || 'See signage',
        fee: charge,
        notes: [
          tags.description,
          tags.operator ? `Operated by ${tags.operator}` : null,
          tags.male === 'yes' && tags.female === 'yes' ? 'Male and female' : null,
          tags.changing_table === 'yes' ? 'Baby changing available' : null,
          tags.drinking_water === 'yes' ? 'Drinking water nearby' : null,
        ].filter(Boolean).join('. ') || 'From OpenStreetMap',
        source: 'osm',
        osmId: el.id,
        osmType: el.type,
        rating: null,
        ratingCount: 0,
        photos: [],
      };
    }).filter(Boolean);
  },

  /**
   * Cache OSM results in localStorage (expires after 24 hours).
   */
  cacheKey(cityKey) { return `ll_osm_${cityKey}`; },

  saveCache(cityKey, toilets) {
    try {
      localStorage.setItem(this.cacheKey(cityKey), JSON.stringify({
        ts: Date.now(), toilets
      }));
    } catch (e) { /* storage full — ignore */ }
  },

  loadCache(cityKey) {
    try {
      const raw = localStorage.getItem(this.cacheKey(cityKey));
      if (!raw) return null;
      const { ts, toilets } = JSON.parse(raw);
      if (Date.now() - ts > 24 * 60 * 60 * 1000) return null; /* expired */
      return toilets;
    } catch { return null; }
  },

  clearCache(cityKey) {
    try { localStorage.removeItem(this.cacheKey(cityKey)); } catch {}
  },
};

/* User-submitted toilets — stored in localStorage */
const UserData = {
  key: 'll_user_toilets',

  load() {
    try { return JSON.parse(localStorage.getItem(this.key) || '[]'); }
    catch { return []; }
  },

  save(toilets) {
    try { localStorage.setItem(this.key, JSON.stringify(toilets)); }
    catch { /* storage full */ }
  },

  add(toilet) {
    const all = this.load();
    const id = `user_${Date.now()}_${Math.random().toString(36).slice(2,7)}`;
    const entry = { ...toilet, id, source: 'user', submittedAt: Date.now() };
    all.push(entry);
    this.save(all);
    return entry;
  },

  forCity(cityKey) {
    return this.load().filter(t => t.city === cityKey);
  },
};

/* Reports store */
const Reports = {
  key: 'll_reports',

  add(toiletId, reason, note) {
    try {
      const all = JSON.parse(localStorage.getItem(this.key) || '[]');
      all.push({ toiletId, reason, note, ts: Date.now() });
      localStorage.setItem(this.key, JSON.stringify(all));
    } catch {}
  },
};

/* Ratings store */
const Ratings = {
  key: 'll_ratings',

  get(toiletId) {
    try {
      const all = JSON.parse(localStorage.getItem(this.key) || '{}');
      return all[toiletId] ?? null;
    } catch { return null; }
  },

  set(toiletId, stars) {
    try {
      const all = JSON.parse(localStorage.getItem(this.key) || '{}');
      all[toiletId] = stars;
      localStorage.setItem(this.key, JSON.stringify(all));
    } catch {}
  },
};
