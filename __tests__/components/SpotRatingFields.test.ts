import { hasCompleteSpotRating } from '../../components/SpotRatingFields';

describe('hasCompleteSpotRating', () => {
  it('requires all three honest 1-to-5 scores', () => {
    expect(hasCompleteSpotRating({ potential: 5, difficulty: 3, quality: 4 })).toBe(true);
    expect(hasCompleteSpotRating({ potential: 0, difficulty: 3, quality: 4 })).toBe(false);
    expect(hasCompleteSpotRating({ potential: 5, difficulty: 6, quality: 4 })).toBe(false);
  });
});
