# Google My Maps suggestions

This repo can import public Google My Maps overlays into the curated routes dataset.

Use the `Suggest a Google My Maps overlay` issue template when a user wants to propose a new curated map.

Direct issue link:
`https://github.com/happydugong/cyclesg/issues/new?template=map_suggestion.yml`

## What the suggester needs to provide

- A clear overlay title.
- A public Google My Maps page URL.
- A KML export URL if they know it.
- A short description of what the map contains.
- Attribution name and attribution URL.
- Confirmation that the map is public and can be republished by CycleSG.
- Any layer notes, such as folders to hide or icons that should be customized.

## What the maintainer should do

1. Open the issue and confirm the Google My Maps page works without signing in.
2. Confirm permission and attribution are clear enough to republish the map in CycleSG.
3. Derive or verify the KML export URL.
   The import pipeline expects a URL like `https://www.google.com/maps/d/kml?mid=...&forcekml=1`.
   If the issue only contains a page URL, extract the `mid` value from that URL and build the KML URL.
4. Add a new `google-my-maps` entry to [`src/config/overlay-sources.json`](../src/config/overlay-sources.json).
5. Set `sourceKind` to `google-my-maps`, `featureAdapter` to `my-maps`, `asset.geoJson` to `src/assets/curated-routes.geojson`, `asset.metadata` to `src/assets/curated-routes-metadata.json`, `sync.sourceUrl` to the public KML export URL, and `attribution` from the issue details.
6. Add `layerRules` only if the issue or the imported result needs special handling.
7. Run:

```bash
pnpm sync:curated-routes
```

8. Review the generated changes in [`src/assets/curated-routes.geojson`](../src/assets/curated-routes.geojson) and [`src/assets/curated-routes-metadata.json`](../src/assets/curated-routes-metadata.json).
9. Check that features were imported, routes and POIs appear in Singapore, labels and attribution look correct, and no folders that should be hidden are leaking into the UI.
10. If needed, refine `layerRules` in [`src/config/overlay-sources.json`](../src/config/overlay-sources.json) and rerun `pnpm sync:curated-routes`.
11. Commit the config and generated asset changes together.

## Notes

- This process is only for `google-my-maps` overlays.
- GPX or local file suggestions still need a different maintainer workflow.
- The sync script combines all configured Google My Maps overlays into a single curated routes asset.
