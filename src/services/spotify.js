/**
 * Spotify API Service
 * Handles authentication and playlist data fetching
 */

const SPOTIFY_API_BASE = 'https://api.spotify.com/v1';
const SPOTIFY_ACCOUNTS_BASE = 'https://accounts.spotify.com';

class SpotifyService {
  constructor() {
    this.accessToken = null;
    this.tokenExpiry = null;
  }

  /**
   * Get Spotify access token using Client Credentials flow
   * This only works for public data and doesn't require user authorization
   */
  async getAccessToken() {
    // Check if we have a valid token
    if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    const clientId = process.env.REACT_APP_SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.REACT_APP_SPOTIFY_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error('Spotify API credentials not configured. Please add REACT_APP_SPOTIFY_CLIENT_ID and REACT_APP_SPOTIFY_CLIENT_SECRET to your .env file.');
    }

    try {
      const response = await fetch(`${SPOTIFY_ACCOUNTS_BASE}/api/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': 'Basic ' + btoa(`${clientId}:${clientSecret}`)
        },
        body: 'grant_type=client_credentials'
      });

      if (!response.ok) {
        throw new Error(`Failed to get access token: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      this.accessToken = data.access_token;
      // Set expiry to 5 minutes before actual expiry for safety
      this.tokenExpiry = Date.now() + (data.expires_in - 300) * 1000;

      return this.accessToken;
    } catch (error) {
      console.error('Error getting Spotify access token:', error);
      throw error;
    }
  }

  /**
   * Extract playlist ID from various Spotify URL formats
   * Supports:
   * - https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M
   * - https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M?si=xxx
   * - spotify:playlist:37i9dQZF1DXcBWIGoYBM5M
   */
  extractPlaylistId(url) {
    // Handle Spotify URI format
    if (url.startsWith('spotify:playlist:')) {
      return url.split(':')[2];
    }

    // Handle URL format
    const match = url.match(/playlist\/([a-zA-Z0-9]+)/);
    return match ? match[1] : null;
  }

  /**
   * Fetch playlist data from Spotify API
   * @param {string} playlistId - The Spotify playlist ID
   * @returns {Object} Playlist data with tracks
   */
  async fetchPlaylist(playlistId) {
    try {
      const token = await this.getAccessToken();

      const response = await fetch(
        `${SPOTIFY_API_BASE}/playlists/${playlistId}?fields=id,name,description,images,tracks.items(track(name,artists(name),duration_ms,album(images)))`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Playlist not found. Please check the URL and make sure the playlist is public.');
        } else if (response.status === 403) {
          throw new Error('This playlist is private. Please make it public or use a different playlist.');
        } else {
          throw new Error(`Failed to fetch playlist: ${response.status} ${response.statusText}`);
        }
      }

      const data = await response.json();

      // Transform the data to our app's format
      return this.transformPlaylistData(data);
    } catch (error) {
      console.error('Error fetching playlist:', error);
      throw error;
    }
  }

  /**
   * Transform Spotify API response to our app's format
   */
  transformPlaylistData(spotifyData) {
    const tracks = spotifyData.tracks.items
      .filter(item => item.track) // Filter out null tracks (deleted songs)
      .map(item => ({
        name: item.track.name,
        artist: item.track.artists.map(a => a.name).join(', '),
        duration_ms: item.track.duration_ms,
        albumArt: item.track.album.images[0]?.url || null
      }));

    return {
      id: spotifyData.id,
      name: spotifyData.name,
      description: spotifyData.description || '',
      image: spotifyData.images[0]?.url || null,
      tracks: tracks,
      trackCount: tracks.length
    };
  }

  /**
   * Main method to get playlist data from URL
   * @param {string} url - Spotify playlist URL or URI
   * @returns {Object} Playlist data
   */
  async getPlaylistFromUrl(url) {
    const playlistId = this.extractPlaylistId(url);

    if (!playlistId) {
      throw new Error('Invalid Spotify playlist URL. Please paste a valid link from Spotify.');
    }

    return await this.fetchPlaylist(playlistId);
  }
}

// Export a singleton instance
const spotifyService = new SpotifyService();
export default spotifyService;
