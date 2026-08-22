import {
  getMapboxAvailabilityError,
  getMapInitializationError,
  WEBGL_UNAVAILABLE_MESSAGE,
} from '../../lib/mapboxWebSupport';

const mapbox = (supported?: () => boolean) => ({ supported }) as unknown as MapboxGLGlobal;

describe('mapbox web support', () => {
  it('rejects browsers that Mapbox reports cannot use WebGL', () => {
    expect(
      getMapboxAvailabilityError(
        mapbox(() => false),
        'token'
      )
    ).toBe(WEBGL_UNAVAILABLE_MESSAGE);
  });

  it('treats a failing support probe as unavailable', () => {
    const failingProbe = mapbox(() => {
      throw new Error('canvas context failure');
    });

    expect(getMapboxAvailabilityError(failingProbe, 'token')).toBe(WEBGL_UNAVAILABLE_MESSAGE);
  });

  it('allows Mapbox initialization when the browser and token are available', () => {
    expect(
      getMapboxAvailabilityError(
        mapbox(() => true),
        'token'
      )
    ).toBeNull();
  });

  it('turns constructor WebGL failures into a recoverable user message', () => {
    expect(getMapInitializationError(new Error('Failed to initialize WebGL.'))).toBe(
      WEBGL_UNAVAILABLE_MESSAGE
    );
  });
});
