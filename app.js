/* app.js — Loo Locator PWA core */

/* ── State ── */
let map, userMarker, currentCity = 'budapest';
let allMarkers = [];
let filters = { free: false, accessible: false, open247: false };
let darkMode = false;
let selectedToilet = null;
let addLat = null, addLng = null;
let addMarker = null;
let deferredInstallPrompt = null;
let isOnline = navigator.onLine;
let pendingPhotoDataUrl = null;

/* ── Init ── */
document.addEventListener('DOMContentLoaded', () => {
  initMap();
  initCityTabs();
  restorePrefs();
  checkOnline();
  registerServiceWorker();
  listenInstallPrompt();
  loadCity(currentCity);
  loadUserToiletsForCity(currentCity);
  updateOfflineBadge();
});

/* ── Map setup ── */
function initMap() {
  map = L.map('map', {
    zoomControl: true,
    attributionControl: true,
  });

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
  }).addTo(map);

  map.on('click', onMapClick);
}

function onMapClick(e) {
  /* If add sheet is open, let user pick a location on the map */
  if (document.getElementById('addSheet').classList.contains('open')) {
    setAddLocation(e.latlng.lat, e.latlng.lng);
  }
}

/* ── City loading ── */
function loadCity(cityKey, forceOsm = false) {
  currentCity = cityKey;
  clearMarkers();

  const city = CITIES[cityKey];
  map.setView([city.lat, city.lng], city.zoom);

  const toilets = CURATED_TOILETS.filter(t => t.city === cityKey);
  toilets.forEach(addMarker_);

  /* Merge any cached OSM data */
  if (!forceOsm) {
    const cached = OSM.loadCache(cityKey);
    if (cached && cached.length > 0) {
      cached.forEach(addMarker_);
      markOsmLoaded();
    }
  }
}

function loadUserToiletsForCity(cityKey) {
  const userToilets = UserData.forCity(cityKey);
  userToilets.forEach(addMarker_);
}

/* ── Markers ── */
function markerColor(t) {
  if (t.source === 'osm') return '#7b61ff';
  if (t.source === 'user') return '#e91e8c';
  return t.free ? '#2d9f5e' : '#e08c1a';
}

function addMarker_(toilet) {
  const color = markerColor(toilet);
  const icon = L.divIcon({
    className: '',
    html: `<div class="wc-marker" style="background:${color}" data-id="${toilet.id}">WC</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });

  const marker = L.marker([toilet.lat, toilet.lng], { icon })
    .addTo(map)
    .on('click', () => openDetail(toilet));

  marker._toiletId = toilet.id;
  allMarkers.push({ marker, toilet });
}

function clearMarkers() {
  allMarkers.forEach(({ marker }) => map.removeLayer(marker));
  allMarkers = [];
}

function applyFilters() {
  allMarkers.forEach(({ marker, toilet }) => {
    let show = true;
    if (filters.free && !toilet.free) show = false;
    if (filters.accessible && !toilet.accessible) show = false;
    if (filters.open247 && !toilet.open247) show = false;
    marker.setOpacity(show ? 1 : 0.15);
  });
}

/* ── Detail sheet ── */
function openDetail(toilet) {
  selectedToilet = toilet;
  const myRating = Ratings.get(toilet.id);

  const feeText = toilet.free ? 'Free' : (toilet.fee || 'Fee applies');
  const distText = toilet._dist ? formatDist(toilet._dist) : null;

  const sourceLabels = {
    curated: '',
    osm: '<span class="detail-badge badge-osm">OpenStreetMap</span>',
    user: '<span class="detail-badge badge-user">User submitted</span>',
  };

  const starsHtml = [1,2,3,4,5].map(n => `
    <span class="star ${myRating >= n ? 'lit' : ''}" data-val="${n}" onclick="rateToilet(${n})">${myRating >= n ? '★' : '☆'}</span>
  `).join('');

  const avgRating = toilet.rating ? `${toilet.rating.toFixed(1)} (${toilet.ratingCount})` : 'No ratings yet';

  const photosHtml = (toilet.photos && toilet.photos.length)
    ? `<div class="photo-strip">${toilet.photos.map(p => `<img class="photo-thumb" src="${p}" alt="Photo">`).join('')}
       <div class="photo-add-thumb" onclick="addPhotoToToilet()">
         <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
         Add photo
       </div></div>`
    : `<div class="photo-strip">
         <div class="photo-add-thumb" onclick="addPhotoToToilet()">
           <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
           Add photo
         </div>
       </div>`;

  document.getElementById('detailContent').innerHTML = `
    <div class="detail-name">${toilet.name}</div>
    <div class="detail-area">${toilet.area}</div>
    <div class="detail-badges">
      ${toilet.free ? '<span class="detail-badge badge-free">Free</span>' : `<span class="detail-badge badge-paid">${feeText}</span>`}
      ${toilet.accessible ? '<span class="detail-badge badge-accessible">Accessible</span>' : ''}
      ${toilet.open247 ? '<span class="detail-badge badge-open247">Open 24/7</span>' : ''}
      ${distText ? `<span class="detail-badge badge-nearest">${distText}</span>` : ''}
      ${sourceLabels[toilet.source] || ''}
    </div>
    <div class="rating-row">
      <div class="stars">${starsHtml}</div>
      <span class="rating-count">${avgRating}</span>
    </div>
    ${photosHtml}
    <div class="detail-rows">
      <div class="detail-row"><span class="lbl">Hours</span><span class="val">${toilet.hours || 'Unknown'}</span></div>
      <div class="detail-row"><span class="lbl">Fee</span><span class="val ${toilet.free ? 'green' : ''}">${feeText}</span></div>
      <div class="detail-row"><span class="lbl">Accessible</span><span class="val">${toilet.accessible ? 'Yes' : 'No'}</span></div>
      ${distText ? `<div class="detail-row"><span class="lbl">Distance</span><span class="val accent">${distText}</span></div>` : ''}
      ${toilet.notes ? `<div class="detail-row"><span class="lbl">Notes</span><span class="val">${toilet.notes}</span></div>` : ''}
    </div>
    <div class="dir-btns">
      <a class="dir-btn google" href="https://www.google.com/maps/dir/?api=1&destination=${toilet.lat},${toilet.lng}&travelmode=walking" target="_blank" rel="noopener">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="10" r="3"/><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/></svg>
        Google Maps
      </a>
      <a class="dir-btn apple" href="https://maps.apple.com/?daddr=${toilet.lat},${toilet.lng}&dirflg=w" target="_blank" rel="noopener">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="10" r="3"/><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/></svg>
        Apple Maps
      </a>
    </div>
    <div class="action-btns">
      <button class="action-btn" onclick="openReportForm()">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        Report an issue
      </button>
      ${toilet.source !== 'user' && toilet.osmId ? `<button class="action-btn" onclick="openOsmLink(${toilet.osmId}, '${toilet.osmType}')">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
        View on OSM
      </button>` : ''}
    </div>
  `;

  openSheet('detailSheet');
}

function openOsmLink(osmId, osmType) {
  const url = `https://www.openstreetmap.org/${osmType}/${osmId}`;
  window.open(url, '_blank', 'noopener');
}

/* ── Rating ── */
function rateToilet(stars) {
  if (!selectedToilet) return;
  Ratings.set(selectedToilet.id, stars);
  /* Update display stars immediately */
  document.querySelectorAll('.star').forEach((el, i) => {
    const lit = (i + 1) <= stars;
    el.classList.toggle('lit', lit);
    el.textContent = lit ? '★' : '☆';
  });
  showToast(`Rated ${stars} star${stars !== 1 ? 's' : ''}`);
}

/* ── Photo upload ── */
function addPhotoToToilet() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.capture = 'environment';
  input.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (!selectedToilet) return;
      if (!selectedToilet.photos) selectedToilet.photos = [];
      selectedToilet.photos.push(ev.target.result);
      /* If user-submitted, persist */
      if (selectedToilet.source === 'user') {
        const all = UserData.load();
        const idx = all.findIndex(t => t.id === selectedToilet.id);
        if (idx >= 0) { all[idx].photos = selectedToilet.photos; UserData.save(all); }
      }
      openDetail(selectedToilet);
      showToast('Photo added');
    };
    reader.readAsDataURL(file);
  };
  input.click();
}

/* ── Report form ── */
function openReportForm() {
  if (!selectedToilet) return;
  closeSheet('detailSheet');

  const reasons = [
    'Permanently closed',
    'Temporarily closed or locked',
    'Incorrect location',
    'Not a public toilet',
    'Unclean or unsafe',
    'Fee information wrong',
    'Other',
  ];

  document.getElementById('detailContent').innerHTML = `
    <div class="detail-name">Report an issue</div>
    <div class="detail-area">${selectedToilet.name}</div>
    <div class="report-options" id="reportOptions">
      ${reasons.map((r, i) => `
        <button class="report-option" data-reason="${r}" onclick="selectReport(this)">${r}</button>
      `).join('')}
    </div>
    <label class="form-label">Additional notes (optional)
      <textarea id="reportNote" placeholder="Any extra detail that helps…" rows="2"></textarea>
    </label>
    <div class="form-actions">
      <button class="btn-secondary" onclick="openDetail(selectedToilet)">Back</button>
      <button class="btn-primary" onclick="submitReport()">Submit report</button>
    </div>
  `;

  openSheet('detailSheet');
}

function selectReport(el) {
  document.querySelectorAll('.report-option').forEach(b => b.classList.remove('selected'));
  el.classList.add('selected');
}

function submitReport() {
  const selected = document.querySelector('.report-option.selected');
  if (!selected) { showToast('Select a reason first'); return; }
  const note = document.getElementById('reportNote').value.trim();
  Reports.add(selectedToilet.id, selected.dataset.reason, note);
  closeSheet('detailSheet');
  showToast('Report submitted — thank you');
}

/* ── Add toilet form ── */
function openAddForm() {
  closeSheet('detailSheet');
  pendingPhotoDataUrl = null;
  addLat = null; addLng = null;
  document.getElementById('addLocation').value = '';
  document.getElementById('addName').value = '';
  document.getElementById('addHours').value = '';
  document.getElementById('addNotes').value = '';
  document.getElementById('addFree').checked = false;
  document.getElementById('addAccessible').checked = false;
  document.getElementById('add247').checked = false;
  document.getElementById('photoLabel').textContent = 'Tap to add a photo';
  const pu = document.getElementById('photoUploadArea');
  const img = pu.querySelector('img');
  if (img) pu.removeChild(img);
  openSheet('addSheet');
  showToast('Tap the map to set the location', 3000);
}

function setAddLocation(lat, lng) {
  addLat = lat; addLng = lng;
  document.getElementById('addLocation').value = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  if (addMarker) map.removeLayer(addMarker);
  addMarker = L.marker([lat, lng], {
    icon: L.divIcon({
      className: '',
      html: `<div class="wc-marker" style="background:#e91e8c;font-size:10px">NEW</div>`,
      iconSize: [36, 36], iconAnchor: [18, 18],
    })
  }).addTo(map);
}

function useCurrentLocationForAdd() {
  if (!navigator.geolocation) { showToast('Geolocation not available'); return; }
  navigator.geolocation.getCurrentPosition(
    pos => setAddLocation(pos.coords.latitude, pos.coords.longitude),
    () => showToast('Could not get location'),
    { enableHighAccuracy: true, timeout: 8000 }
  );
}

function handlePhotoSelect(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    pendingPhotoDataUrl = ev.target.result;
    document.getElementById('photoLabel').textContent = 'Photo selected ✓';
    const area = document.getElementById('photoUploadArea');
    const old = area.querySelector('img');
    if (old) area.removeChild(old);
    const img = document.createElement('img');
    img.src = pendingPhotoDataUrl;
    area.appendChild(img);
  };
  reader.readAsDataURL(file);
}

function submitNewToilet(e) {
  e.preventDefault();
  if (!addLat || !addLng) { showToast('Tap the map to set a location first'); return; }

  const name = document.getElementById('addName').value.trim();
  const free = document.getElementById('addFree').checked;
  const accessible = document.getElementById('addAccessible').checked;
  const open247 = document.getElementById('add247').checked;
  const hours = document.getElementById('addHours').value.trim() || (open247 ? '24/7' : 'Unknown');
  const notes = document.getElementById('addNotes').value.trim();

  const toilet = UserData.add({
    city: currentCity,
    name,
    area: CITIES[currentCity].name,
    lat: addLat, lng: addLng,
    free, accessible, open247, hours,
    fee: free ? null : 'Fee unknown',
    notes: notes || 'User-submitted location',
    photos: pendingPhotoDataUrl ? [pendingPhotoDataUrl] : [],
    rating: null, ratingCount: 0,
  });

  if (addMarker) { map.removeLayer(addMarker); addMarker = null; }
  addMarker_(toilet);
  closeSheet('addSheet');
  showToast('Location added — thank you!');
  setTimeout(() => openDetail(toilet), 400);
}

/* ── Find nearest ── */
function findNearest() {
  if (!navigator.geolocation) { showToast('Geolocation not supported'); return; }

  const btn = document.getElementById('locateBtn');
  btn.classList.add('locating');

  navigator.geolocation.getCurrentPosition(
    pos => {
      btn.classList.remove('locating');
      const { latitude: lat, longitude: lng } = pos.coords;

      if (userMarker) map.removeLayer(userMarker);
      userMarker = L.marker([lat, lng], {
        icon: L.divIcon({
          className: '',
          html: `<div class="user-dot"></div>`,
          iconSize: [16, 16], iconAnchor: [8, 8],
        })
      }).addTo(map);

      /* Detect city */
      const detected = Object.entries(CITIES).find(([k, c]) => {
        const b = c.bounds;
        return lat >= b.minLat && lat <= b.maxLat && lng >= b.minLng && lng <= b.maxLng;
      });
      if (detected) {
        const [detectedKey] = detected;
        if (detectedKey !== currentCity) switchCity(detectedKey);
      }

      /* Find nearest among visible toilets */
      const visible = allMarkers.filter(({ marker }) => marker.options.opacity !== 0.15);
      let nearest = null, minDist = Infinity;
      visible.forEach(({ toilet }) => {
        const d = haversine(lat, lng, toilet.lat, toilet.lng);
        toilet._dist = d;
        if (d < minDist) { minDist = d; nearest = toilet; }
      });

      if (nearest) {
        map.setView([nearest.lat, nearest.lng], 16);
        showToast(`Nearest: ${nearest.name} — ${formatDist(minDist)}`);
        setTimeout(() => openDetail(nearest), 600);
      } else {
        map.setView([lat, lng], 15);
        showToast('No toilets found nearby');
      }
    },
    err => {
      btn.classList.remove('locating');
      const msgs = { 1: 'Location access denied', 2: 'Location unavailable', 3: 'Request timed out' };
      showToast(msgs[err.code] || 'Could not get location');
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
  );
}

/* ── OSM live data ── */
async function loadOsmData() {
  const btn = document.getElementById('osmLoadBtn');
  if (btn.classList.contains('loaded')) {
    /* Clear and reload */
    OSM.clearCache(currentCity);
    btn.classList.remove('loaded');
    btn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:-2px;margin-right:4px"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.14"/></svg>Load live data`;
    /* Reload city without OSM */
    loadCity(currentCity, true);
    loadUserToiletsForCity(currentCity);
    return;
  }

  if (!isOnline) { showToast('No internet connection'); return; }
  btn.classList.add('loading');
  btn.textContent = 'Loading…';
  showLoading('Fetching live data from OpenStreetMap…');

  try {
    const toilets = await OSM.fetchCity(currentCity);
    OSM.saveCache(currentCity, toilets);
    toilets.forEach(addMarker_);
    hideLoading();
    markOsmLoaded();
    showToast(`${toilets.length} locations loaded from OpenStreetMap`);
  } catch (err) {
    hideLoading();
    btn.classList.remove('loading');
    btn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:-2px;margin-right:4px"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.14"/></svg>Load live data`;
    showToast('Could not load live data — try again');
    console.error('OSM fetch error:', err);
  }
}

function markOsmLoaded() {
  const btn = document.getElementById('osmLoadBtn');
  btn.classList.remove('loading');
  btn.classList.add('loaded');
  btn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:-2px;margin-right:4px"><polyline points="20 6 9 17 4 12"/></svg>Live data loaded`;
}

/* ── City tabs ── */
function initCityTabs() {
  document.getElementById('cityNav').addEventListener('click', e => {
    const tab = e.target.closest('.city-tab');
    if (!tab) return;
    switchCity(tab.dataset.city);
  });
}

function switchCity(cityKey) {
  if (cityKey === currentCity) return;
  closeSheet('detailSheet');
  closeSheet('addSheet');
  document.querySelectorAll('.city-tab').forEach(t => t.classList.toggle('active', t.dataset.city === cityKey));

  /* Reset OSM button */
  const btn = document.getElementById('osmLoadBtn');
  btn.classList.remove('loaded', 'loading');
  btn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:-2px;margin-right:4px"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.14"/></svg>Load live data`;

  loadCity(cityKey);
  loadUserToiletsForCity(cityKey);

  /* Auto-load cached OSM if available */
  const cached = OSM.loadCache(cityKey);
  if (cached && cached.length > 0) markOsmLoaded();
}

/* ── Filters ── */
function toggleFilter(el) {
  const f = el.dataset.filter;
  filters[f] = !filters[f];
  el.classList.toggle('active', filters[f]);
  applyFilters();
}

/* ── Dark mode ── */
function toggleDark() {
  darkMode = !darkMode;
  document.getElementById('app').setAttribute('data-theme', darkMode ? 'dark' : 'light');
  try { localStorage.setItem('ll_dark', darkMode ? '1' : '0'); } catch {}
}

function restorePrefs() {
  try {
    const d = localStorage.getItem('ll_dark');
    if (d === '1') { darkMode = true; document.getElementById('app').setAttribute('data-theme', 'dark'); }
    const c = localStorage.getItem('ll_city');
    if (c && CITIES[c]) {
      currentCity = c;
      document.querySelectorAll('.city-tab').forEach(t => t.classList.toggle('active', t.dataset.city === c));
    }
  } catch {}
}

/* ── Sheet helpers ── */
function openSheet(id) {
  document.getElementById(id).classList.add('open');
}
function closeSheet(id) {
  document.getElementById(id).classList.remove('open');
}

/* Close sheet on handle drag / tap outside */
document.addEventListener('click', e => {
  if (e.target.classList.contains('sheet-handle') || e.target.closest('.sheet-handle-row') === e.currentTarget) {
    document.querySelectorAll('.bottom-sheet.open').forEach(s => s.classList.remove('open'));
  }
});

/* ── Loading overlay ── */
function showLoading(msg) {
  document.getElementById('loadingText').textContent = msg || 'Loading…';
  document.getElementById('loadingOverlay').classList.add('visible');
}
function hideLoading() {
  document.getElementById('loadingOverlay').classList.remove('visible');
}

/* ── Toast ── */
let toastTimer;
function showToast(msg, dur = 2400) {
  clearTimeout(toastTimer);
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  toastTimer = setTimeout(() => t.classList.remove('show'), dur);
}

/* ── Online/Offline ── */
function checkOnline() {
  window.addEventListener('online', () => { isOnline = true; updateOfflineBadge(); });
  window.addEventListener('offline', () => { isOnline = false; updateOfflineBadge(); });
}
function updateOfflineBadge() {
  document.getElementById('offlineBtn').classList.toggle('offline-active', !isOnline);
}

/* ── PWA install prompt ── */
function listenInstallPrompt() {
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    deferredInstallPrompt = e;
    showInstallBanner();
  });
}

function showInstallBanner() {
  const banner = document.getElementById('installBanner');
  if (banner) banner.classList.add('show');
}

/* ── Service Worker ── */
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(err => {
      console.warn('SW registration failed:', err);
    });
  }
}

/* ── Utilities ── */
function haversine(la1, ln1, la2, ln2) {
  const R = 6371000;
  const dL = (la2 - la1) * Math.PI / 180;
  const dG = (ln2 - ln1) * Math.PI / 180;
  const a = Math.sin(dL / 2) ** 2 + Math.cos(la1 * Math.PI / 180) * Math.cos(la2 * Math.PI / 180) * Math.sin(dG / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDist(m) {
  return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`;
}
