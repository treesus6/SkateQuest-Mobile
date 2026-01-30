export type SpotType = 'park' | 'street' | 'diy' | 'shop' | 'quest';

export const SPOT_THEMES: Record<SpotType, { color: string; icon: string; label: string }> = {
  park: { color: '#2ecc71', icon: '🏟️', label: 'Skatepark' },
  street: { color: '#e67e22', icon: '🏙️', label: 'Street Spot' },
  diy: { color: '#9b59b6', icon: '🔨', label: 'DIY' },
  shop: { color: '#3498db', icon: '🛹', label: 'Skate Shop' },
  quest: { color: '#f1c40f', icon: '🎁', label: 'Quest' },
};

// Function to get the marker color: Either the default theme OR the Crew's color
export const getMarkerColor = (spot: any) => {
  if (spot.crew_id && spot.crews?.color_hex) {
    return spot.crews.color_hex;
  }
  return SPOT_THEMES[spot.type as SpotType]?.color || '#cccccc';
};
