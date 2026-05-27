# Google My Maps suggestions

This repo can import public Google My Maps overlays into the overlay data pipeline.

Use the `Suggest a Google My Maps overlay` issue template when a user wants to propose a new curated map.

Direct issue link:
`https://github.com/happydugong/cyclesg/issues/new?template=map_suggestion.yml`

The GitHub workflow creates a PR automatically when the issue is opened. After that PR is merged to `main`, another workflow opens a second PR with regenerated overlay config plus the fetched and converted data files for the new source.

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
5. After merge, let the post-merge workflow open a second PR with [`src/config/overlay-sources.generated.json`](../src/config/overlay-sources.generated.json) and the new source files under [`data/<source-id>/`](../data/).
6. Review and merge that generated-files PR to deploy the final state.
7. If the generated route import looks wrong, close that generated-files PR and adjust the overlay record or conversion inputs in a follow-up PR.

## What automation does

1. Parse the issue body.
2. Extract the Google My Maps `mid` value from the page URL.
3. Build the KML export URL as `https://www.google.com/maps/d/kml?mid=...&forcekml=1`.
4. Create a new overlay record file in [`src/config/overlay-sources/`](../src/config/overlay-sources/).
5. Open a PR for that record.
6. After the PR is merged to `main`, run `pnpm generate:overlay-sources`.
7. Then run `pnpm overlay:fetch:my-maps`.
8. Then run `pnpm overlay:convert:my-maps`.
9. Open a second PR with the generated config and `data/<source-id>/` updates.

## Notes

- This process is only for `google-my-maps` overlays.
- GPX or local file suggestions still need a different maintainer workflow.
- Each Google My Maps source now writes its own raw, converted, and metadata files under `data/<source-id>/`.
