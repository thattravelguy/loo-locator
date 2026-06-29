# Loo Locator — PWA

A mobile-first Progressive Web App for finding public toilets across 10 European cities.
Built with Leaflet.js + OpenStreetMap. No backend required to get started.

## Features

- Real map (Leaflet + OpenStreetMap tiles) — free, no API key
- 100 curated toilet locations across 10 cities
- Live data from OpenStreetMap Overpass API (on demand)
- GPS "Find nearest loo" with auto city detection
- User-submitted locations (stored in browser localStorage)
- Star ratings per toilet (stored locally)
- Photo uploads (stored as base64 in localStorage)
- Report closed / incorrect listings
- Google Maps + Apple Maps walking directions
- Filter by: Free, Accessible, Open 24/7
- Dark mode with system preference detection
- Offline support via service worker + tile caching
- "Add to home screen" install prompt (PWA)
- Works on iOS Safari, Android Chrome, and desktop


## File structure

```
loo-locator-pwa/
├── index.html      — App shell
├── style.css       — All styles (mobile-first)
├── app.js          — Core application logic
├── data.js         — Curated toilet data (100 locations)
├── osm.js          — OSM Overpass API + local storage helpers
├── sw.js           — Service worker (offline caching)
├── manifest.json   — PWA manifest
└── icons/
    ├── icon-192.png
    └── icon-512.png
```


## Deployment (5 minutes)

### Option A — GitHub Pages (free, recommended)

1. Create a free account at https://github.com
2. Create a new repository (e.g. `loo-locator`)
3. Upload all files in this folder to the repository root
4. Go to Settings → Pages → Source: Deploy from branch → main → / (root)
5. Your app is live at `https://yourusername.github.io/loo-locator`

### Option B — Netlify (free, drag-and-drop)

1. Go to https://netlify.com and sign up free
2. Drag the entire `loo-locator-pwa` folder onto the Netlify dashboard
3. Done — live in ~30 seconds at a random URL (you can customise it)

### Option C — Vercel (free)

1. Install: `npm i -g vercel`
2. Run: `cd loo-locator-pwa && vercel`
3. Follow the prompts — live in seconds

### Option D — Any static host

Upload all files to any web server that serves static files over HTTPS.
HTTPS is required for:  geolocation, service worker, and PWA install prompt.


## Adding the app icon

The app needs two PNG icons. Generate them free at https://realfavicongenerator.net
or https://maskable.app/editor. Save as:
- `icons/icon-192.png` (192×192px)
- `icons/icon-512.png` (512×512px)

Use a toilet/map pin graphic on a blue (#1a73e8) background for best results.


## Using the app on a phone

### iOS (Safari)
1. Open your deployed URL in Safari
2. Tap the Share button (box with arrow)
3. Tap "Add to Home Screen"
4. The app installs like a native app

### Android (Chrome)
1. Open the URL in Chrome
2. Tap the three-dot menu
3. Tap "Add to Home screen" (or an install banner appears automatically)


## Scaling up — next steps

When you're ready to go beyond localStorage:

### 1. Backend for user submissions
Use Supabase (free tier) — a hosted Postgres database with a REST API:
- Sign up at https://supabase.com
- Create a `toilets` table matching the data schema in data.js
- Replace `UserData.add()` in osm.js with a `fetch()` POST to Supabase
- Submissions from all users become available to everyone

### 2. Moderation dashboard
Build a simple admin page (also deployable on Netlify) that reads from Supabase
and lets you approve/reject user submissions before they go live.

### 3. Push notifications
Use the Web Push API + a service like OneSignal (free tier) to notify
subscribed users when a new toilet is added near a saved location.

### 4. Native app (React Native)
Once you have a user base, use Capacitor (https://capacitorjs.com) to wrap
this existing HTML/CSS/JS app in a native shell for App Store + Play Store.
Run: `npm install @capacitor/core @capacitor/cli && npx cap init`

### 5. More cities
Add entries to `CITIES` and `CURATED_TOILETS` in data.js following the same
pattern. The OSM live data works automatically for any city — just define the
bounding box coordinates.


## Data sources

- Curated data: manually researched and verified
- OpenStreetMap: community-maintained, queried via Overpass API (overpass-api.de)
  Licensed under ODbL — attribution required (already shown on map)


## Privacy

- No user accounts, no tracking, no analytics
- Location is used only in-browser to calculate distances — never sent anywhere
- User submissions, ratings, and photos are stored only in the device's localStorage
- Reports are stored locally and not transmitted (add a backend to collect them)
