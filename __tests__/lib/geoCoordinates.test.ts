import { isRenderableMapPoint, parseMapCoordinates } from '../../lib/geoCoordinates';

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

describe('isRenderableMapPoint', () => {
  it('accepts real numeric coordinates including the origin and boundaries', () => {
    expect(isRenderableMapPoint(45.64, -122.67)).toBe(true);
    expect(isRenderableMapPoint(0, 0)).toBe(true);
    expect(isRenderableMapPoint(-90, 180)).toBe(true);
  });

  it('rejects invalid cached or database coordinates before native map rendering', () => {
    expect(isRenderableMapPoint(null, -122.67)).toBe(false);
    expect(isRenderableMapPoint('45.64', -122.67)).toBe(false);
    expect(isRenderableMapPoint(45.64, '-122.67')).toBe(false);
    expect(isRenderableMapPoint(NaN, -122.67)).toBe(false);
    expect(isRenderableMapPoint(45.64, Infinity)).toBe(false);
    expect(isRenderableMapPoint(91, 0)).toBe(false);
    expect(isRenderableMapPoint(0, -181)).toBe(false);
  });
});
