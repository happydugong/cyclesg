# Google My Maps suggestions

This repo can import public Google My Maps overlays into the curated routes dataset.

Use the `Suggest a Google My Maps overlay` issue template when a user wants to propose a new curated map.

Direct issue link:
`https://github.com/happydugong/cyclesg/issues/new?template=map_suggestion.yml`

The GitHub workflow creates a PR automatically when the issue is opened. After that PR is merged to `main`, another workflow opens a second PR with the regenerated overlay config and curated routes assets.

## What the suggester needs to provide

- A clear overlay title.
- A public Google My Maps page URL.
- A short description of what the map contains.
- Attribution name and attribution URL.
- Confirmation that the map is public and can be republished by CycleSG.
- Any layer notes, such as folders to hide or icons that should be customized.

## What the maintainer should review

1. Confirm the Google My Maps page works without signing in.
2. Confirm permission and attribution are clear enough to republish the map in CycleSG.
3. Review the auto-created PR that adds the overlay record under [`src/config/overlay-sources/`](../src/config/overlay-sources/).
4. Merge that PR only if the map should be accepted.
5. After merge, let the post-merge workflow open a second PR with [`src/config/overlay-sources.generated.json`](../src/config/overlay-sources.generated.json), [`src/assets/curated-routes.geojson`](../src/assets/curated-routes.geojson), and [`src/assets/curated-routes-metadata.json`](../src/assets/curated-routes-metadata.json).
6. Review and merge that generated-files PR to deploy the final state.
7. If the generated route import looks wrong, close that generated-files PR and adjust the overlay record or layer rules in a follow-up PR.

## What automation does

1. Parse the issue body.
2. Extract the Google My Maps `mid` value from the page URL.
3. Build the KML export URL as `https://www.google.com/maps/d/kml?mid=...&forcekml=1`.
4. Create a new overlay record file in [`src/config/overlay-sources/`](../src/config/overlay-sources/).
5. Open a PR for that record.
6. After the PR is merged to `main`, run `pnpm generate:overlay-sources`.
7. Then run `pnpm sync:my-maps-overlays`.
8. Open a second PR with the generated config and curated route asset updates.

## Notes

- This process is only for `google-my-maps` overlays.
- GPX or local file suggestions still need a different maintainer workflow.
- The sync script combines all configured Google My Maps overlays into a single curated routes asset.
