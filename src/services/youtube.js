/**
 * YouTube API Service with Multi-Key Rotation and Database Caching
 *
 * Features:
 * - Automatic API key rotation when quota is exceeded
 * - Database caching to avoid repeated searches
 * - In-memory cache for session performance
 */

import supabaseService from './supabase';

const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';
// Public Invidious instances (will try each until one works)
// Updated list from https://api.invidious.io/instances.json
const INVIDIOUS_INSTANCES = [
  'https://invidious.fdn.fr',
  'https://inv.riverside.rocks',
  'https://invidious.slipfox.xyz',
  'https://invidious.protokolla.fi',
  'https://iv.ggtyler.dev'
];

class YouTubeService {
  constructor() {
    this.cache = new Map(); // In-memory cache for YouTube matches
    this.currentKeyIndex = 0; // Current API key index
    this.apiKeys = this.loadApiKeys();
  }

  /**
   * Load all available YouTube API keys from environment
   */
  loadApiKeys() {
    const keys = [];
    for (let i = 1; i <= 10; i++) {
      const key = process.env[`REACT_APP_YOUTUBE_API_KEY_${i}`];
      if (key) {
        keys.push(key);
      }
    }

    // Fallback to old single key format for backward compatibility
    if (keys.length === 0 && process.env.REACT_APP_YOUTUBE_API_KEY) {
      keys.push(process.env.REACT_APP_YOUTUBE_API_KEY);
    }

    console.log(`✓ Loaded ${keys.length} YouTube API key(s)`);
    return keys;
  }

  /**
   * Get current API key and rotate if needed
   */
  getCurrentApiKey() {
    if (this.apiKeys.length === 0) {
      return null;
    }
    return this.apiKeys[this.currentKeyIndex];
  }

  /**
   * Rotate to next API key
   */
  rotateApiKey() {
    if (this.apiKeys.length <= 1) {
      console.warn('⚠️ No additional API keys available for rotation');
      return false;
    }

    this.currentKeyIndex = (this.currentKeyIndex + 1) % this.apiKeys.length;
    console.log(`🔄 Rotated to API key #${this.currentKeyIndex + 1}`);
    return true;
  }

  /**
   * Search YouTube for a track and return the best match
   * @param {string} trackName - Name of the track
   * @param {string} artistName - Name of the artist
   * @param {number} durationMs - Track duration in milliseconds
   * @returns {Object|null} { videoId, title, duration, thumbnailUrl } or null if no match
   */
  async searchTrack(trackName, artistName, durationMs) {
    // Create cache key
    const cacheKey = `${artistName} - ${trackName}`.toLowerCase();

    // Check in-memory cache first
    if (this.cache.has(cacheKey)) {
      console.log(`💾 Memory cache hit: ${cacheKey}`);
      return this.cache.get(cacheKey);
    }

    // Check database cache
    const dbCached = await this.checkDatabaseCache(trackName, artistName);
    if (dbCached) {
      console.log(`🗄️ Database cache hit: ${cacheKey}`);
      this.cache.set(cacheKey, dbCached); // Also cache in memory
      return dbCached;
    }

    const apiKey = this.getCurrentApiKey();
    if (!apiKey) {
      console.warn('❌ No YouTube API keys configured');
      return null;
    }

    // Try with current key, rotate on quota error
    let attempts = 0;
    const maxAttempts = this.apiKeys.length;

    while (attempts < maxAttempts) {
      try {
        const result = await this.searchWithYouTube(trackName, artistName, durationMs);

        if (result) {
          this.cache.set(cacheKey, result);
          console.log(`✓ Matched: ${artistName} - ${trackName} -> ${result.videoId}`);

          // Save to database cache for future use
          await this.saveToDatabaseCache(trackName, artistName, durationMs, result);

          return result;
        }

        return null;
      } catch (error) {
        if (error.quotaExceeded) {
          console.warn(`⚠️ Quota exceeded on key #${this.currentKeyIndex + 1}`);
          if (this.rotateApiKey()) {
            attempts++;
            console.log(`Retrying with key #${this.currentKeyIndex + 1}...`);
            continue;
          } else {
            console.error('❌ All API keys exhausted');
            return null;
          }
        }

        console.error(`Error searching: ${error.message}`);
        return null;
      }
    }

    console.error('❌ Failed to match after trying all API keys');
    return null;
  }

  /**
   * Search using Invidious API (no quota limits)
   */
  async searchWithInvidious(trackName, artistName, durationMs) {
    const query = `${artistName} - ${trackName} official audio`;

    for (let i = 0; i < INVIDIOUS_INSTANCES.length; i++) {
      try {
        const instance = INVIDIOUS_INSTANCES[i];
        const searchUrl = `${instance}/api/v1/search?q=${encodeURIComponent(query)}&type=video`;

        const response = await fetch(searchUrl, { signal: AbortSignal.timeout(5000) });

        if (!response.ok) {
          console.warn(`Invidious instance ${instance} failed, trying next...`);
          continue;
        }

        const results = await response.json();

        if (!results || results.length === 0) {
          console.warn(`No Invidious results for: ${artistName} - ${trackName}`);
          return null;
        }

        // Filter music videos and find best match
        const bestMatch = this.findBestMatchInvidious(results, durationMs, trackName, artistName);

        if (bestMatch) {
          this.currentInvidiousInstance = instance; // Remember working instance
          return bestMatch;
        }

        return null;
      } catch (error) {
        console.warn(`Invidious instance failed: ${error.message}`);
        continue;
      }
    }

    console.error('All Invidious instances failed');
    return null;
  }

  /**
   * Search using YouTube API (has quota limits)
   */
  async searchWithYouTube(trackName, artistName, durationMs) {
    const apiKey = this.getCurrentApiKey();
    const query = `${artistName} - ${trackName} official audio`;

    const searchUrl = new URL(`${YOUTUBE_API_BASE}/search`);
    searchUrl.searchParams.append('part', 'snippet');
    searchUrl.searchParams.append('q', query);
    searchUrl.searchParams.append('type', 'video');
    searchUrl.searchParams.append('videoCategoryId', '10');
    searchUrl.searchParams.append('maxResults', '5');
    searchUrl.searchParams.append('key', apiKey);

    const searchResponse = await fetch(searchUrl);

    if (!searchResponse.ok) {
      const errorText = await searchResponse.text();
      try {
        const errorData = JSON.parse(errorText);
        if (errorData.error?.errors?.[0]?.reason === 'quotaExceeded') {
          const error = new Error('Quota exceeded');
          error.quotaExceeded = true;
          throw error;
        }
      } catch (e) {
        if (e.quotaExceeded) throw e;
      }
      throw new Error(`YouTube API error: ${searchResponse.status}`);
    }

    const searchData = await searchResponse.json();

    if (!searchData.items || searchData.items.length === 0) {
      return null;
    }

    const videoIds = searchData.items.map(item => item.id.videoId).join(',');

    const detailsUrl = new URL(`${YOUTUBE_API_BASE}/videos`);
    detailsUrl.searchParams.append('part', 'contentDetails,snippet');
    detailsUrl.searchParams.append('id', videoIds);
    detailsUrl.searchParams.append('key', apiKey);

    const detailsResponse = await fetch(detailsUrl);

    if (!detailsResponse.ok) {
      throw new Error(`YouTube video details error: ${detailsResponse.status}`);
    }

    const detailsData = await detailsResponse.json();
    return this.findBestMatch(detailsData.items, durationMs, trackName, artistName);
  }

  /**
   * Find best match from Invidious results
   */
  findBestMatchInvidious(videos, targetDurationMs, trackName, artistName) {
    const DURATION_TOLERANCE_MS = 15000; // ±15 seconds

    let bestMatch = null;
    let bestScore = 0;

    for (const video of videos) {
      const videoDurationMs = video.lengthSeconds * 1000;
      const durationDiff = Math.abs(videoDurationMs - targetDurationMs);

      if (durationDiff > DURATION_TOLERANCE_MS) {
        continue;
      }

      let score = 100 - (durationDiff / DURATION_TOLERANCE_MS) * 50;

      const title = video.title.toLowerCase();
      const searchTerms = [
        trackName.toLowerCase(),
        artistName.toLowerCase(),
        'official',
        'audio',
        'music video'
      ];

      searchTerms.forEach(term => {
        if (title.includes(term)) {
          score += 10;
        }
      });

      const badTerms = ['cover', 'remix', 'live', 'karaoke', 'instrumental', 'lyrics'];
      badTerms.forEach(term => {
        if (title.includes(term)) {
          score -= 20;
        }
      });

      if (score > bestScore) {
        bestScore = score;
        bestMatch = {
          videoId: video.videoId,
          title: video.title,
          duration: videoDurationMs,
          thumbnailUrl: `https://i.ytimg.com/vi/${video.videoId}/mqdefault.jpg`,
          channelTitle: video.author
        };
      }
    }

    return bestMatch;
  }

  /**
   * Find the best matching video based on duration and title (YouTube API format)
   * @param {Array} videos - Array of YouTube video objects
   * @param {number} targetDurationMs - Target duration in milliseconds
   * @param {string} trackName - Track name for title matching
   * @param {string} artistName - Artist name for title matching
   * @returns {Object|null} Best match or null
   */
  findBestMatch(videos, targetDurationMs, trackName, artistName) {
    const DURATION_TOLERANCE_MS = 15000; // ±15 seconds as per PRD

    let bestMatch = null;
    let bestScore = 0;

    for (const video of videos) {
      const videoDurationMs = this.parseISO8601Duration(video.contentDetails.duration);
      const durationDiff = Math.abs(videoDurationMs - targetDurationMs);

      // Skip if duration is way off
      if (durationDiff > DURATION_TOLERANCE_MS) {
        continue;
      }

      // Calculate match score
      let score = 100 - (durationDiff / DURATION_TOLERANCE_MS) * 50; // Duration score (50-100)

      // Bonus for title match quality
      const title = video.snippet.title.toLowerCase();
      const searchTerms = [
        trackName.toLowerCase(),
        artistName.toLowerCase(),
        'official',
        'audio',
        'music video'
      ];

      searchTerms.forEach(term => {
        if (title.includes(term)) {
          score += 10;
        }
      });

      // Penalty for likely covers/remixes/live versions
      const badTerms = ['cover', 'remix', 'live', 'karaoke', 'instrumental', 'lyrics'];
      badTerms.forEach(term => {
        if (title.includes(term)) {
          score -= 20;
        }
      });

      if (score > bestScore) {
        bestScore = score;
        bestMatch = {
          videoId: video.id,
          title: video.snippet.title,
          duration: videoDurationMs,
          thumbnailUrl: video.snippet.thumbnails?.medium?.url || video.snippet.thumbnails?.default?.url,
          channelTitle: video.snippet.channelTitle
        };
      }
    }

    return bestMatch;
  }

  /**
   * Parse ISO 8601 duration format (e.g., PT4M13S) to milliseconds
   * @param {string} duration - ISO 8601 duration string
   * @returns {number} Duration in milliseconds
   */
  parseISO8601Duration(duration) {
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);

    if (!match) {
      return 0;
    }

    const hours = parseInt(match[1] || 0, 10);
    const minutes = parseInt(match[2] || 0, 10);
    const seconds = parseInt(match[3] || 0, 10);

    return (hours * 3600 + minutes * 60 + seconds) * 1000;
  }

  /**
   * Batch search multiple tracks
   * @param {Array} tracks - Array of track objects with name, artist, duration_ms
   * @param {Function} onProgress - Callback for progress updates (current, total)
   * @returns {Array} Array of tracks with youtubeId added
   */
  async searchTracks(tracks, onProgress = null) {
    const results = [];

    for (let i = 0; i < tracks.length; i++) {
      const track = tracks[i];

      if (onProgress) {
        onProgress(i + 1, tracks.length);
      }

      const match = await this.searchTrack(
        track.name,
        track.artist,
        track.duration_ms
      );

      results.push({
        ...track,
        youtubeId: match?.videoId || null,
        youtubeTitle: match?.title || null,
        youtubeThumbnail: match?.thumbnailUrl || null,
        matched: !!match
      });

      // Rate limiting: wait a bit between requests to avoid hitting quota too hard
      if (i < tracks.length - 1) {
        await this.sleep(100); // 100ms delay between requests
      }
    }

    return results;
  }

  /**
   * Helper to sleep for a given duration
   * @param {number} ms - Milliseconds to sleep
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Check database cache for existing match
   */
  async checkDatabaseCache(trackName, artistName) {
    try {
      const { data, error } = await supabaseService.client
        .from('youtube_cache')
        .select('*')
        .ilike('artist_name', artistName)
        .ilike('track_name', trackName)
        .limit(1)
        .single();

      if (error || !data) {
        return null;
      }

      return {
        videoId: data.video_id,
        title: data.video_title,
        duration: data.video_duration,
        thumbnailUrl: data.thumbnail_url,
        channelTitle: data.channel_title
      };
    } catch (error) {
      console.warn('Database cache lookup failed:', error.message);
      return null;
    }
  }

  /**
   * Save match to database cache
   */
  async saveToDatabaseCache(trackName, artistName, durationMs, result) {
    try {
      await supabaseService.client
        .from('youtube_cache')
        .insert({
          track_name: trackName,
          artist_name: artistName,
          duration_ms: durationMs,
          video_id: result.videoId,
          video_title: result.title,
          video_duration: result.duration,
          thumbnail_url: result.thumbnailUrl,
          channel_title: result.channelTitle
        });

      console.log(`💾 Saved to database cache: ${artistName} - ${trackName}`);
    } catch (error) {
      // Ignore duplicate key errors (already cached)
      if (!error.message?.includes('duplicate')) {
        console.warn('Failed to save to database cache:', error.message);
      }
    }
  }

  /**
   * Clear the cache (useful for testing or if needed)
   */
  clearCache() {
    this.cache.clear();
  }
}

// Export a singleton instance
const youtubeService = new YouTubeService();
export default youtubeService;
