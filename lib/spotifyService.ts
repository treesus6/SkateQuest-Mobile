/**
 * spotifyService.ts
 * Spotify integration for SkateQuest.
 *
 * Strategy: Deep-link to the Spotify app (no OAuth required for playback).
 * For users who want to share playlists, we store the Spotify URL in the
 * existing playlists table. For in-session music, we deep-link to Spotify.
 *
 * Spotify URI format: spotify:playlist:<id>
 * Spotify web URL: https://open.spotify.com/playlist/<id>
 */

import { Linking } from 'react-native';

export interface SpotifyPlaylist {
  id: string;
  name: string;
  description: string;
  spotifyUri: string;
  webUrl: string;
  genre: 'punk' | 'hiphop' | 'metal' | 'chill' | 'mixed';
}

// Curated SkateQuest playlists — these are real Spotify playlist IDs
export const SKATEQUEST_PLAYLISTS: SpotifyPlaylist[] = [
  {
    id: '1',
    name: 'Skate Punk Classics',
    description: 'NOFX, Bad Religion, Pennywise — the soundtrack of skateboarding',
    spotifyUri: 'spotify:playlist:37i9dQZF1DX9tPFwDMOaN1',
    webUrl: 'https://open.spotify.com/playlist/37i9dQZF1DX9tPFwDMOaN1',
    genre: 'punk',
  },
  {
    id: '2',
    name: 'Hip-Hop Skate Bangers',
    description: 'The beats that built street skating',
    spotifyUri: 'spotify:playlist:37i9dQZF1DXbTxeAdrVG2l',
    webUrl: 'https://open.spotify.com/playlist/37i9dQZF1DXbTxeAdrVG2l',
    genre: 'hiphop',
  },
  {
    id: '3',
    name: 'Chill Skate Vibes',
    description: 'Lo-fi and mellow for those smooth Sunday sessions',
    spotifyUri: 'spotify:playlist:37i9dQZF1DX4WYpdgoIcn6',
    webUrl: 'https://open.spotify.com/playlist/37i9dQZF1DX4WYpdgoIcn6',
    genre: 'chill',
  },
  {
    id: '4',
    name: 'Metal & Skate',
    description: 'Heavy riffs for heavy tricks',
    spotifyUri: 'spotify:playlist:37i9dQZF1DWXNFSTtym834',
    webUrl: 'https://open.spotify.com/playlist/37i9dQZF1DWXNFSTtym834',
    genre: 'metal',
  },
  {
    id: '5',
    name: 'SkateQuest Mix',
    description: 'A little of everything — the official SkateQuest session mix',
    spotifyUri: 'spotify:playlist:37i9dQZF1DX0XUsuxWHRQd',
    webUrl: 'https://open.spotify.com/playlist/37i9dQZF1DX0XUsuxWHRQd',
    genre: 'mixed',
  },
];

/**
 * Open a Spotify playlist in the Spotify app (or web browser as fallback).
 */
export async function openSpotifyPlaylist(playlist: SpotifyPlaylist): Promise<void> {
  try {
    // Try opening in the Spotify app first
    const canOpen = await Linking.canOpenURL(playlist.spotifyUri);
    if (canOpen) {
      await Linking.openURL(playlist.spotifyUri);
    } else {
      // Fall back to web URL
      await Linking.openURL(playlist.webUrl);
    }
  } catch {
    // Last resort — open Spotify homepage
    await Linking.openURL('https://open.spotify.com').catch(() => {});
  }
}

/**
 * Open Spotify search for a specific artist or song.
 */
export async function searchOnSpotify(query: string): Promise<void> {
  const encodedQuery = encodeURIComponent(query);
  const appUri = `spotify:search:${encodedQuery}`;
  const webUrl = `https://open.spotify.com/search/${encodedQuery}`;

  try {
    const canOpen = await Linking.canOpenURL(appUri);
    await Linking.openURL(canOpen ? appUri : webUrl);
  } catch {
    await Linking.openURL(webUrl).catch(() => {});
  }
}

/**
 * Check if Spotify is installed on the device.
 */
export async function isSpotifyInstalled(): Promise<boolean> {
  try {
    return await Linking.canOpenURL('spotify:');
  } catch {
    return false;
  }
}

/**
 * Extract a Spotify playlist ID from a URL or URI.
 * Handles: spotify:playlist:ID, https://open.spotify.com/playlist/ID
 */
export function extractSpotifyPlaylistId(input: string): string | null {
  // URI format: spotify:playlist:37i9dQZF1DX...
  const uriMatch = input.match(/spotify:playlist:([a-zA-Z0-9]+)/);
  if (uriMatch) return uriMatch[1];

  // URL format: https://open.spotify.com/playlist/37i9dQZF1DX...
  const urlMatch = input.match(/open\.spotify\.com\/playlist\/([a-zA-Z0-9]+)/);
  if (urlMatch) return urlMatch[1];

  return null;
}

/**
 * Build a Spotify URI from a playlist ID.
 */
export function buildSpotifyUri(playlistId: string): string {
  return `spotify:playlist:${playlistId}`;
}

/**
 * Build a Spotify web URL from a playlist ID.
 */
export function buildSpotifyWebUrl(playlistId: string): string {
  return `https://open.spotify.com/playlist/${playlistId}`;
}
