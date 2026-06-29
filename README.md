# Loo Locator — PWA (v2)

A mobile-first Progressive Web App for finding public toilets across 14 European cities.
Built with Leaflet.js + OpenStreetMap. No backend required to get started.

## What's new in v2
- 14 cities: added Zaragoza, Lisbon, Porto, and Funchal (140 curated locations total)
- Close (×) button on the detail sheet — tap to dismiss without dragging
- Service worker cache bumped to v2

## Cities covered
Budapest · Vienna · Zurich · Strasbourg · Cologne · Helsinki ·
Barcelona · Madrid · Seville · Malaga · Zaragoza · Lisbon · Porto · Funchal

## Features
- Real map (Leaflet + OpenStreetMap tiles) — free, no API key
- 140 curated toilet locations across 14 cities
- Live data from OpenStreetMap Overpass API (on demand)
- GPS "Find nearest loo" with auto city detection
- Close button on the detail panel (tap × or drag down to dismiss)
- User-submitted locations (stored in browser localStorage)
- Star ratings per toilet (stored locally)
- Photo uploads (stored as base64 in localStorage)
- Report closed or incorrect listings
- Google Maps and Apple Maps walking directions
- Filter by: Free, Accessible, Open 24/7
- Dark mode
- Offline support via service worker and tile caching
- "Add to home screen" install prompt (PWA)
- Works on iOS Safari, Android Chrome, and desktop


## File structure

```
loo-locator-pwa/
├── index.html      — App shell (14 city tabs, close button on sheets)
├── style.css       — All styles (mobile-first, dark mode, close button)
├── app.js          — Core application logic
├── data.js         — Curated toilet data (140 locations, 14 cities)
├── osm.js          — OSM Overpass API + local storage helpers
├── sw.js           — Service worker (offline caching, v2 cache)
├── manifest.json   — PWA manifest
└── icons/
    ├── icon-192.png
    └── icon-512.png
```


## Deployment (5 minutes)

### Option A — Netlify (free, drag-and-drop, recommended)
1. Go to https://netlify.com and sign up free
2. Drag the entire `loo-locator-pwa` folder onto the Netlify dashboard
3. Done — live in ~30 seconds

### Option B — GitHub Pages (free)
1. Create a repository at https://github.com
2. Upload all files to the repository root
3. Go to Settings → Pages → Source: Deploy from branch → main → / (root)
4. Live at `https://yourusername.github.io/loo-locator`

### Option C — Vercel (free)
1. Install: `npm i -g vercel`
2. Run: `cd loo-locator-pwa && vercel`

HTTPS is required for geolocation, service worker, and PWA install prompt.


## Installing on a phone

### iOS (Safari)
1. Open your deployed URL in Safari
2. Tap the Share button → "Add to Home Screen"

### Android (Chrome)
1. Open the URL in Chrome
2. Tap the three-dot menu → "Add to Home screen"
   (or accept the install banner that appears automatically)


## Adding the app icon
Generate two PNG icons free at https://maskable.app/editor:
- `icons/icon-192.png` (192×192px)
- `icons/icon-512.png` (512×512px)


## Scaling up — next steps

### Backend for user submissions
Use Supabase (free tier) — replace `UserData.add()` in osm.js with a fetch() POST
to a Supabase REST endpoint so submissions are shared across all users.

### More cities
Add entries to `CITIES` and `CURATED_TOILETS` in data.js. The OSM live data works
automatically for any city once you define the bounding box coordinates.

### Native app
Use Capacitor (https://capacitorjs.com) to wrap this app in a native shell for
App Store and Play Store distribution: `npm install @capacitor/core @capacitor/cli`


## Data sources
- Curated data: manually researched and verified
- OpenStreetMap: community-maintained, queried via Overpass API
  Licensed under ODbL — attribution shown on map


## Privacy
No user accounts, no tracking, no analytics. Location is used only in-browser.
User submissions, ratings, and photos are stored only in device localStorage.
