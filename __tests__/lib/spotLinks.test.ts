import { getSpotDetailPath, getSpotShareUrl, normalizeSpotId } from '../../lib/spotLinks';

const SPOT_ID = '7f9d5ad6-e271-4ad2-8ca5-8e2537edb5bc';

describe('spot links', () => {
  it('normalizes valid Expo Router params', () => {
    expect(normalizeSpotId([SPOT_ID, 'ignored'])).toBe(SPOT_ID);
    expect(normalizeSpotId(` ${SPOT_ID} `)).toBe(SPOT_ID);
  });

  it.each([undefined, '', 'not-a-uuid', '00000000-0000-0000-0000-000000000000'])(
    'rejects invalid spot id %p',
    value => {
      expect(normalizeSpotId(value)).toBeNull();
    }
  );

  it('creates a canonical direct web route', () => {
    expect(getSpotDetailPath(SPOT_ID)).toBe(`/spot-detail?spotId=${SPOT_ID}`);
    expect(getSpotShareUrl(SPOT_ID, 'https://skatequest.me/')).toBe(
      `https://skatequest.me/spot-detail?spotId=${SPOT_ID}`
    );
  });

  it.each(['/SkateQuest-Mobile', '/SkateQuest-Mobile/', 'SkateQuest-Mobile'])(
    'preserves a configured project base path %s',
    basePath => {
      expect(getSpotShareUrl(SPOT_ID, 'https://treesus6.github.io/', basePath)).toBe(
        `https://treesus6.github.io/SkateQuest-Mobile/spot-detail?spotId=${SPOT_ID}`
      );
    }
  );

  it('uses the canonical production URL on native', () => {
    expect(getSpotShareUrl(SPOT_ID)).toBe(`https://skatequest.me/spot-detail?spotId=${SPOT_ID}`);
  });

  it('refuses to create a link for an invalid id', () => {
    expect(() => getSpotDetailPath('bad')).toThrow('valid spot ID');
  });
});
