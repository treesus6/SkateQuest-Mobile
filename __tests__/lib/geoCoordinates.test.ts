import { parseMapCoordinates } from '../../lib/geoCoordinates';

describe('parseMapCoordinates', () => {
  it('accepts valid coordinates including zero and boundary values', () => {
    expect(parseMapCoordinates(45.64, -122.67)).toEqual([-122.67, 45.64]);
    expect(parseMapCoordinates(0, 0)).toEqual([0, 0]);
    expect(parseMapCoordinates('-90', '180')).toEqual([180, -90]);
  });

  it('rejects absent and empty deep-link coordinates', () => {
    expect(parseMapCoordinates(undefined, undefined)).toBeNull();
    expect(parseMapCoordinates(null, null)).toBeNull();
    expect(parseMapCoordinates('', '0')).toBeNull();
    expect(parseMapCoordinates(' ', '-122')).toBeNull();
  });

  it('rejects nonfinite and out-of-range positions', () => {
    expect(parseMapCoordinates(91, 0)).toBeNull();
    expect(parseMapCoordinates(-91, 0)).toBeNull();
    expect(parseMapCoordinates(0, 181)).toBeNull();
    expect(parseMapCoordinates(0, -181)).toBeNull();
    expect(parseMapCoordinates(NaN, 0)).toBeNull();
    expect(parseMapCoordinates(Infinity, 0)).toBeNull();
    expect(parseMapCoordinates('not-a-latitude', 0)).toBeNull();
  });
});
