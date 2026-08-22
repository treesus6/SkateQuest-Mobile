import {
  getSpotPersistenceError,
  parseSpotCoordinates,
} from '../../lib/spotSubmission';
import type { PersistedSpotExpectation } from '../../lib/spotSubmission';

describe('parseSpotCoordinates', () => {
  it('returns Mapbox longitude/latitude order for valid inputs', () => {
    expect(parseSpotCoordinates('45.638700', '-122.661500')).toEqual([
      -122.6615,
      45.6387,
    ]);
  });

  it('accepts real zero coordinates when zero is explicitly entered', () => {
    expect(parseSpotCoordinates('0', 0)).toEqual([0, 0]);
  });

  it('accepts the valid coordinate boundaries', () => {
    expect(parseSpotCoordinates('-90', '180')).toEqual([180, -90]);
    expect(parseSpotCoordinates('90', '-180')).toEqual([-180, 90]);
  });

  it.each([
    ['', ''],
    ['   ', '-122.6615'],
    ['45.6387', '   '],
    [undefined, '-122.6615'],
    ['45.6387', null],
  ])('rejects missing or blank inputs: %p, %p', (latitude, longitude) => {
    expect(parseSpotCoordinates(latitude, longitude)).toBeNull();
  });

  it.each([
    ['north', '-122.6615'],
    ['45.6387', 'west'],
    ['91', '0'],
    ['-91', '0'],
    ['0', '181'],
    ['0', '-181'],
    [Number.NaN, 0],
    [0, Number.POSITIVE_INFINITY],
    [['45.6387'], '-122.6615'],
  ])('rejects invalid or out-of-range inputs: %p, %p', (latitude, longitude) => {
    expect(parseSpotCoordinates(latitude, longitude)).toBeNull();
  });
});

describe('getSpotPersistenceError', () => {
  const expected: PersistedSpotExpectation = {
    id: 'spot-id',
    name: 'QA WebGL Spot',
    latitude: 45.6387,
    longitude: -122.6615,
    addedBy: 'user-id',
  };

  const saved = {
    id: expected.id,
    name: expected.name,
    latitude: expected.latitude,
    longitude: expected.longitude,
    added_by: expected.addedBy,
  };

  it('accepts an exact Supabase read-back', () => {
    expect(getSpotPersistenceError(saved, expected)).toBeNull();
  });

  it('accepts numeric coordinate strings returned by the API', () => {
    expect(
      getSpotPersistenceError(
        {
          ...saved,
          latitude: String(expected.latitude),
          longitude: String(expected.longitude),
        },
        expected
      )
    ).toBeNull();
  });

  it('rejects a missing row', () => {
    expect(getSpotPersistenceError(null, expected)).toBe(
      'The saved spot could not be read back.'
    );
  });

  it('rejects mismatched identity fields', () => {
    expect(getSpotPersistenceError({ ...saved, id: 'other-id' }, expected)).toBe(
      'The saved spot returned a different ID.'
    );
    expect(getSpotPersistenceError({ ...saved, added_by: 'other-user' }, expected)).toBe(
      'The saved spot owner could not be verified.'
    );
    expect(getSpotPersistenceError({ ...saved, name: 'Other spot' }, expected)).toBe(
      'The saved spot name could not be verified.'
    );
  });

  it('rejects missing or mismatched coordinates', () => {
    expect(getSpotPersistenceError({ ...saved, latitude: '' }, expected)).toBe(
      'The saved spot coordinates could not be verified.'
    );
    expect(
      getSpotPersistenceError({ ...saved, longitude: expected.longitude + 0.01 }, expected)
    ).toBe('The saved spot coordinates could not be verified.');
  });
});
