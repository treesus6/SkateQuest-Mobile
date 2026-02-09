/**
 * Navigation param types for all routes.
 * Used by screens that need typed navigation props.
 */
export type RootStackParamList = {
  Auth: undefined;
  Map: undefined;
  Profile: undefined;
  Challenges: undefined;
  AddSpot: { latitude?: number; longitude?: number };
  Leaderboard: undefined;
  Shops: undefined;
  Crews: undefined;
  Events: undefined;
  Feed: undefined;
  UploadMedia: undefined;
  TrickTracker: undefined;
  SkateGame: undefined;
  Playlists: undefined;
  GameDetail: { gameId: string };
  SpotDetail: { spotId: string };
  QRScanner: undefined;
};
