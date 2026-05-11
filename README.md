# CycleSG MVP

Production-oriented MVP for a Singapore cycling planner PWA built with React, TypeScript, Vite, MapLibre GL JS, TailwindCSS, and Workbox-based PWA support.

## Features

- Fullscreen MapLibre map with mobile touch gestures
- Live GPS watch using the browser Geolocation API
- Floating `center on me` control
- Singapore Park Connector Network GeoJSON overlay from official NParks open data
- Singapore cycling path GeoJSON overlay from official LTA open data
- Installable PWA manifest and service worker registration
- Offline app-shell caching for startup
- Environment variable support for future map or API configuration

## Stack

- React
- TypeScript
- Vite
- MapLibre GL JS
- TailwindCSS
- `vite-plugin-pwa` with Workbox
- OpenFreeMap vector style based on OpenStreetMap data

## Project structure

```text
src/
  assets/
  components/
  hooks/
  pages/
  services/
  types/
```

## Local setup

### Prerequisites

- Node.js 20+
- pnpm 9+

### Install

```bash
pnpm install
```

### Environment

The repo includes `.env.example`.

```bash
cp .env.example .env.local
```

Current variables:

- `VITE_APP_NAME`
- `VITE_GA_MEASUREMENT_ID`
- `VITE_MAP_STYLE_URL`
- `VITE_SINGAPORE_CENTER_LNG`
- `VITE_SINGAPORE_CENTER_LAT`

### Run locally

```bash
pnpm dev
```

Vite serves the app on:

```text
http://localhost:5173
```

If you want to test on a phone on the same network, use the LAN URL printed by Vite and allow location permissions in the browser.

### Typecheck

```bash
pnpm typecheck
```

### Production build

```bash
pnpm build
```

### Preview production build

```bash
pnpm preview
```

## Google Analytics

This app supports Google Analytics 4 through the global site tag without adding a runtime dependency.

### 1. Create a GA4 web data stream

In Google Analytics:

- Create or open a GA4 property
- Add a `Web` data stream for your deployed site
- Copy the `Measurement ID` that looks like `G-XXXXXXXXXX`

### 2. Configure the app

Add the measurement ID to `.env.local`:

```bash
VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

If the variable is empty or missing, analytics stays disabled.

### 3. What the app tracks

- Initial SPA `page_view`
- `select_route` when a route segment is opened
- `toggle_follow_user` when the follow-my-location control is toggled
- `overlay_load_error` if route overlay data fails to load

### 4. Verify locally

Run the app with:

```bash
pnpm dev
```

Then open the site and confirm requests to `googletagmanager.com` in the browser network tab or use GA4 `DebugView`.

### 5. Deploy

Set `VITE_GA_MEASUREMENT_ID` in your hosting provider's build environment as well, then rebuild the app.

## PWA notes

- Android Chrome: use browser install prompt or menu action.
- iPhone Safari: use `Share > Add to Home Screen`.
- Service worker and manifest are configured through `vite-plugin-pwa`.
- Offline support currently targets app-shell startup caching, not full offline basemap tiles.

## Map data

- Basemap style defaults to OpenFreeMap Liberty:
  `https://tiles.openfreemap.org/styles/liberty`
- PCN data is stored at `src/assets/pcn.geojson`
- Cycling path data is stored at `src/assets/cycling-paths.geojson`
- The current file is sourced from NParks on data.gov.sg:
  `https://data.gov.sg/datasets/d_a69ef89737379f231d2ae93fd1c5707f/view`
- Cycling path data is sourced from LTA on data.gov.sg:
  `https://data.gov.sg/datasets/d_8f468b25193f64be8a16fa7d8f60f553/view`
- Dataset title: `Park Connector Loop`
- Dataset title: `Cycling Path Network (GEOJSON)`
- Dataset page showed `Last updated: 15 Apr 2026, 10:06 SGT` when fetched for this update
- The app loads GeoJSON through a small service abstraction so the asset is parsed explicitly instead of imported as executable code.

## PCN sync

- The repo includes a sync script at `scripts/sync-pcn.mjs`
- Run it locally with:

```bash
pnpm sync:pcn
```

- The script fetches the official NParks dataset, validates the GeoJSON, rewrites `src/assets/pcn.geojson`, and updates `src/assets/pcn-metadata.json`
- A GitHub Actions workflow at `.github/workflows/sync-pcn.yml` runs weekly by default every Monday at `03:15 UTC`
- You can also trigger the workflow manually from GitHub via `workflow_dispatch`

### Why git-backed sync instead of object storage

- For this project size, git is acceptable because the dataset is modest and changes infrequently
- The benefits are simplicity, full history, easy rollbacks, and zero extra infrastructure
- The downside is repository growth over time if large GeoJSON snapshots are committed often
- Weekly sync is a better default than daily if git is the persistence layer
- If the file grows substantially or update frequency increases, move the dataset out of git and into a storage bucket or backend cache

## Feedback

- Feature requests and bug reports go through GitHub Issues:
  `https://github.com/huishun98/cyclesg/issues`
- A dedicated feature request template is available in the issue chooser to keep submissions consistent.
