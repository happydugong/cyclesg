import { describe, expect, it } from 'vitest';
import {
  buildKmlExportUrl,
  buildOverlayRecord,
  extractMidFromUrl,
  parseMapSuggestionIssueBody
} from './create-overlay-source-from-issue.mjs';

const issueBody = `### Map title
East Coast Food Stops

### Google My Maps page URL
https://www.google.com/maps/d/viewer?mid=1abcDEFghiJKLmnop

### What is in this map?
Food stops and connector routes in the east.

### Layer notes
Hide the Draft layer.

### Attribution name
Jane Tan

### Attribution URL
https://example.com/jane

### Additional context
Please review the food icons before merging.
`;

describe('create-overlay-source-from-issue', () => {
  it('parses the GitHub issue form body', () => {
    expect(parseMapSuggestionIssueBody(issueBody)).toEqual({
      title: 'East Coast Food Stops',
      myMapsPageUrl: 'https://www.google.com/maps/d/viewer?mid=1abcDEFghiJKLmnop',
      description: 'Food stops and connector routes in the east.',
      layerNotes: 'Hide the Draft layer.',
      attributionName: 'Jane Tan',
      attributionUrl: 'https://example.com/jane',
      additionalContext: 'Please review the food icons before merging.'
    });
  });

  it('derives the KML export URL from the My Maps page URL', () => {
    expect(extractMidFromUrl('https://www.google.com/maps/d/viewer?mid=1abcDEFghiJKLmnop')).toBe(
      '1abcDEFghiJKLmnop'
    );
    expect(buildKmlExportUrl('https://www.google.com/maps/d/viewer?mid=1abcDEFghiJKLmnop')).toBe(
      'https://www.google.com/maps/d/kml?mid=1abcDEFghiJKLmnop&forcekml=1'
    );
  });

  it('builds a normalized overlay record', () => {
    expect(
      buildOverlayRecord({
        title: 'East Coast Food Stops',
        myMapsPageUrl: 'https://www.google.com/maps/d/viewer?mid=1abcDEFghiJKLmnop',
        description: 'Food stops and connector routes in the east.',
        attributionName: 'Jane Tan',
        attributionUrl: 'https://example.com/jane'
      })
    ).toEqual(
      expect.objectContaining({
        id: 'east-coast-food-stops',
        label: 'East Coast Food Stops',
        sourceKind: 'google-my-maps',
        featureAdapter: 'my-maps',
        sync: {
          sourceUrl: 'https://www.google.com/maps/d/kml?mid=1abcDEFghiJKLmnop&forcekml=1'
        },
        attribution: {
          message: 'Map by',
          sourceLabel: 'Jane Tan',
          sourceUrl: 'https://example.com/jane'
        }
      })
    );
  });
});
