/**
 * Supabase Service
 * Handles database operations for mixtapes
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase credentials not configured. Please add REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY to your .env file.');
}

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

class SupabaseService {
  constructor() {
    this.client = supabase; // Expose client for direct access
  }

  /**
   * Generate a unique short ID for mixtapes
   * @returns {string} A random short ID (e.g., "abc123")
   */
  generateMixtapeId() {
    // Generate a random ID using timestamp and random string
    const timestamp = Date.now().toString(36);
    const randomStr = Math.random().toString(36).substring(2, 7);
    return `${timestamp}${randomStr}`;
  }

  /**
   * Create a new mixtape in the database
   * @param {Object} mixtapeData - The mixtape configuration
   * @returns {Object} { id, url, error }
   */
  async createMixtape(mixtapeData) {
    try {
      const mixtapeId = this.generateMixtapeId();

      const { data, error } = await supabase
        .from('mixtapes')
        .insert([
          {
            id: mixtapeId,
            spotify_playlist_id: mixtapeData.spotifyPlaylistId,
            playlist_name: mixtapeData.playlistName,
            playlist_description: mixtapeData.playlistDescription,
            playlist_image: mixtapeData.playlistImage,
            mixtape_title: mixtapeData.mixtapeTitle,
            sender_name: mixtapeData.senderName,
            personal_message: mixtapeData.personalMessage,
            cassette_color: mixtapeData.cassetteColor,
            background_color: mixtapeData.backgroundColor,
            font_style: mixtapeData.fontStyle,
            tracks: mixtapeData.tracks,
          },
        ])
        .select()
        .single();

      if (error) {
        console.error('Error creating mixtape:', error);
        return { id: null, url: null, error: error.message };
      }

      const url = `${window.location.origin}/#/mixtape/${mixtapeId}`;
      return { id: mixtapeId, url, error: null };
    } catch (err) {
      console.error('Unexpected error creating mixtape:', err);
      return { id: null, url: null, error: err.message };
    }
  }

  /**
   * Load a mixtape from the database by ID
   * @param {string} mixtapeId - The mixtape ID
   * @returns {Object} { mixtape, error }
   */
  async loadMixtape(mixtapeId) {
    try {
      const { data, error } = await supabase
        .from('mixtapes')
        .select('*')
        .eq('id', mixtapeId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned
          return { mixtape: null, error: 'Mixtape not found' };
        }
        console.error('Error loading mixtape:', error);
        return { mixtape: null, error: error.message };
      }

      // Transform database format to app format
      const mixtape = {
        id: data.id,
        spotifyPlaylistId: data.spotify_playlist_id,
        playlistName: data.playlist_name,
        playlistDescription: data.playlist_description,
        playlistImage: data.playlist_image,
        mixtapeTitle: data.mixtape_title,
        senderName: data.sender_name,
        personalMessage: data.personal_message,
        cassetteColor: data.cassette_color,
        backgroundColor: data.background_color,
        fontStyle: data.font_style,
        tracks: data.tracks,
        createdAt: data.created_at,
        viewCount: data.view_count,
        playCount: data.play_count,
      };

      return { mixtape, error: null };
    } catch (err) {
      console.error('Unexpected error loading mixtape:', err);
      return { mixtape: null, error: err.message };
    }
  }

  /**
   * Increment view count for a mixtape
   * @param {string} mixtapeId - The mixtape ID
   */
  async incrementViewCount(mixtapeId) {
    try {
      // Get current count
      const { data: current } = await supabase
        .from('mixtapes')
        .select('view_count')
        .eq('id', mixtapeId)
        .single();

      if (!current) return;

      // Increment
      const { error } = await supabase
        .from('mixtapes')
        .update({ view_count: (current.view_count || 0) + 1 })
        .eq('id', mixtapeId);

      if (error) {
        console.error('Error incrementing view count:', error);
      }
    } catch (err) {
      console.error('Unexpected error incrementing view count:', err);
    }
  }

  /**
   * Increment play count and update last played timestamp
   * @param {string} mixtapeId - The mixtape ID
   */
  async incrementPlayCount(mixtapeId) {
    try {
      const { error } = await supabase
        .from('mixtapes')
        .update({
          play_count: supabase.raw('play_count + 1'),
          last_played_at: new Date().toISOString(),
        })
        .eq('id', mixtapeId);

      if (error) {
        console.error('Error incrementing play count:', error);
      }
    } catch (err) {
      console.error('Unexpected error incrementing play count:', err);
    }
  }

  /**
   * Get analytics for a mixtape
   * @param {string} mixtapeId - The mixtape ID
   * @returns {Object} { analytics, error }
   */
  async getAnalytics(mixtapeId) {
    try {
      const { data, error } = await supabase
        .from('mixtapes')
        .select('view_count, play_count, last_played_at, created_at')
        .eq('id', mixtapeId)
        .single();

      if (error) {
        console.error('Error getting analytics:', error);
        return { analytics: null, error: error.message };
      }

      return {
        analytics: {
          viewCount: data.view_count,
          playCount: data.play_count,
          lastPlayedAt: data.last_played_at,
          createdAt: data.created_at,
        },
        error: null,
      };
    } catch (err) {
      console.error('Unexpected error getting analytics:', err);
      return { analytics: null, error: err.message };
    }
  }
}

// Export a singleton instance
const supabaseService = new SupabaseService();
export default supabaseService;
