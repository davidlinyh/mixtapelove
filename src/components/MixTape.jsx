import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Play, Pause, SkipForward, SkipBack, Share2, Music, Copy, Check } from 'lucide-react';
import spotifyService from '../services/spotify';
import youtubeService from '../services/youtube';
import supabaseService from '../services/supabase';

// Cassette color schemes - curated pastel, warm, cozy, vintage bookstore inspired
const CASSETTE_COLORS = [
  // Pastels & Soft tones
  { id: 'ocean', name: 'Ocean Blue', shell: '#2C5F8D', inner: '#87CEEB', label: '#E8F4F8' },
  { id: 'lavender', name: 'Lavender', shell: '#8B7BA8', inner: '#B8A8D4', label: '#F3F0FF' },
  { id: 'mint', name: 'Mint', shell: '#4A9B7F', inner: '#98D8C8', label: '#E8F5F1' },
  { id: 'peach', name: 'Peach', shell: '#D4997D', inner: '#FFB69A', label: '#FFF4EE' },

  // Warm & Cozy tones
  { id: 'sunset', name: 'Sunset', shell: '#D97941', inner: '#FFB347', label: '#FFF3E0' },
  { id: 'terracotta', name: 'Terracotta', shell: '#B8634F', inner: '#D4896B', label: '#FFF1EC' },
  { id: 'honey', name: 'Honey', shell: '#C8A870', inner: '#E6C896', label: '#FFF8EC' },

  // Vintage Bookstore tones
  { id: 'burgundy', name: 'Burgundy', shell: '#6B2D3C', inner: '#9A5064', label: '#F9EDF0' },
  { id: 'forest', name: 'Forest', shell: '#2D5016', inner: '#7CB342', label: '#F1F8E9' },
  { id: 'espresso', name: 'Espresso', shell: '#3E2723', inner: '#6D4C41', label: '#F5F0ED' },

  // Classic & Neutral
  { id: 'smoke', name: 'Smoke', shell: '#1a1a1a', inner: '#4A4A4A', label: '#F5F5F5' },
  { id: 'cream', name: 'Cream', shell: '#C9B8A3', inner: '#E6D9C8', label: '#FFFBF5' },
];

// Background colors - curated selection
const BACKGROUND_COLORS = [
  { id: 'parchment', color: '#F5F1E8' },
  { id: 'sage', color: '#B5C4A1' },
  { id: 'sky', color: '#C5D9E8' },
  { id: 'blush', color: '#F4E4E0' },
  { id: 'charcoal', color: '#545454' },
];

// Font styles for title and message
const FONT_STYLES = [
  { id: 'typewriter', name: 'Typewriter', family: 'Courier, monospace' },
  { id: 'handwritten', name: 'Handwritten', family: "'Indie Flower', cursive" },
  { id: 'serif', name: 'Serif', family: 'Georgia, serif' },
  { id: 'modern', name: 'Modern', family: 'Arial, sans-serif' },
  { id: 'retro', name: 'Retro', family: "'Bungee', cursive" },
];

const MixTape = () => {
  const { id: mixtapeId } = useParams();
  const navigate = useNavigate();

  const [view, setView] = useState('landing');
  const [playlistUrl, setPlaylistUrl] = useState('');
  const [playlistData, setPlaylistData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [matchingProgress, setMatchingProgress] = useState({ current: 0, total: 0 });

  // Customization
  const [selectedColor, setSelectedColor] = useState(CASSETTE_COLORS[0]);
  const [selectedBg, setSelectedBg] = useState(BACKGROUND_COLORS[0]); // Parchment
  const [customShellColor, setCustomShellColor] = useState('#2C5F8D');
  const [customInnerColor, setCustomInnerColor] = useState('#87CEEB');
  const [customLabelColor, setCustomLabelColor] = useState('#E8F4F8');
  const [isCustomColor, setIsCustomColor] = useState(false);
  const [customBgColor, setCustomBgColor] = useState('#F5F1E8');
  const [isCustomBg, setIsCustomBg] = useState(false);
  const [selectedFont, setSelectedFont] = useState(FONT_STYLES[0]);
  const [mixtapeTitle, setMixtapeTitle] = useState('');
  const [personalMessage, setPersonalMessage] = useState('');
  const [senderName, setSenderName] = useState('');

  // Player
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [shareableUrl, setShareableUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const playerRef = useRef(null);

  // Get current color (either preset or custom)
  const getCurrentColor = () => {
    if (isCustomColor) {
      return {
        id: 'custom',
        name: 'Custom',
        shell: customShellColor,
        inner: customInnerColor,
        label: customLabelColor
      };
    }
    return selectedColor;
  };

  // Get current background color (either preset or custom)
  const getCurrentBgColor = () => {
    if (isCustomBg) {
      return customBgColor;
    }
    return selectedBg.color;
  };

  const fetchPlaylistData = async (url) => {
    setLoading(true);
    setError('');
    setMatchingProgress({ current: 0, total: 0 });

    try {
      // Step 1: Fetch playlist data from Spotify
      const playlistData = await spotifyService.getPlaylistFromUrl(url);

      // Step 2: Match tracks with YouTube videos
      setMatchingProgress({ current: 0, total: playlistData.tracks.length });

      const tracksWithYouTube = await youtubeService.searchTracks(
        playlistData.tracks,
        (current, total) => {
          setMatchingProgress({ current, total });
        }
      );

      // Step 3: Transform final data
      const transformedData = {
        id: playlistData.id,
        name: playlistData.name,
        description: playlistData.description,
        image: playlistData.image,
        tracks: tracksWithYouTube
      };

      setPlaylistData(transformedData);
      setMixtapeTitle(transformedData.name);
      setLoading(false);
      setView('create');
    } catch (err) {
      console.error('Error loading playlist:', err);
      setError(err.message || 'Could not load playlist. Please check the URL and try again.');
      setLoading(false);
    }
  };

  const handleImportPlaylist = () => {
    if (!playlistUrl.trim()) {
      setError('Please enter a Spotify playlist URL.');
      return;
    }
    fetchPlaylistData(playlistUrl);
  };

  const handleCreateMixtape = async () => {
    setLoading(true);
    setError('');

    try {
      // Prepare mixtape data for database
      const mixtapeData = {
        spotifyPlaylistId: playlistData?.id || null,
        playlistName: playlistData?.name || '',
        playlistDescription: playlistData?.description || '',
        playlistImage: playlistData?.image || null,
        mixtapeTitle: mixtapeTitle,
        senderName: senderName || null,
        personalMessage: personalMessage || null,
        cassetteColor: getCurrentColor(),
        backgroundColor: getCurrentBgColor(),
        fontStyle: selectedFont,
        tracks: playlistData?.tracks || [],
      };

      // Save to Supabase
      const { id, url, error: saveError } = await supabaseService.createMixtape(mixtapeData);

      if (saveError) {
        setError(`Failed to create mixtape: ${saveError}`);
        setLoading(false);
        return;
      }

      setShareableUrl(url);
      setLoading(false);
      setView('player');

      // Navigate to the new mixtape URL
      navigate(`/mixtape/${id}`);
    } catch (err) {
      console.error('Error creating mixtape:', err);
      setError('An unexpected error occurred while creating your mixtape.');
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: mixtapeTitle,
          text: `${senderName || 'Someone'} made you a mixtape`,
          url: shareableUrl,
        });
      } catch (err) {
        copyToClipboard();
      }
    } else {
      copyToClipboard();
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareableUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleNext = useCallback(() => {
    if (!playlistData) return;

    let nextIndex = (currentTrackIndex + 1) % playlistData.tracks.length;
    let attempts = 0;

    // Auto-skip tracks without YouTube IDs (max attempts = playlist length)
    while (!playlistData.tracks[nextIndex]?.youtubeId && attempts < playlistData.tracks.length) {
      nextIndex = (nextIndex + 1) % playlistData.tracks.length;
      attempts++;
    }

    setCurrentTrackIndex(nextIndex);
    setIsPlaying(false);
  }, [playlistData, currentTrackIndex]);

  const handlePrevious = useCallback(() => {
    if (!playlistData) return;

    let prevIndex = currentTrackIndex === 0 ? playlistData.tracks.length - 1 : currentTrackIndex - 1;
    let attempts = 0;

    // Auto-skip tracks without YouTube IDs (max attempts = playlist length)
    while (!playlistData.tracks[prevIndex]?.youtubeId && attempts < playlistData.tracks.length) {
      prevIndex = prevIndex === 0 ? playlistData.tracks.length - 1 : prevIndex - 1;
      attempts++;
    }

    setCurrentTrackIndex(prevIndex);
    setIsPlaying(false);
  }, [playlistData, currentTrackIndex]);

  const initializePlayer = useCallback(() => {
    if (!playlistData || !playlistData.tracks[currentTrackIndex]) return;

    const currentTrack = playlistData.tracks[currentTrackIndex];

    // Skip tracks without YouTube IDs
    if (!currentTrack.youtubeId) {
      console.warn(`No YouTube ID for track: ${currentTrack.name}`);
      return;
    }

    // If player already exists, just load the new video
    if (playerRef.current && playerRef.current.loadVideoById) {
      playerRef.current.loadVideoById(currentTrack.youtubeId);
      return;
    }

    // Create new player
    playerRef.current = new window.YT.Player('youtube-player', {
      height: '360',
      width: '640',
      videoId: currentTrack.youtubeId,
      playerVars: {
        autoplay: 0,
        controls: 1, // Show controls for better UX
        modestbranding: 1,
        rel: 0,
      },
      events: {
        onReady: (event) => {
          console.log('YouTube player ready');
        },
        onStateChange: (event) => {
          if (event.data === window.YT.PlayerState.ENDED) {
            handleNext();
          }
          if (event.data === window.YT.PlayerState.PLAYING) {
            setIsPlaying(true);
          }
          if (event.data === window.YT.PlayerState.PAUSED) {
            setIsPlaying(false);
          }
        },
        onError: (event) => {
          console.error('YouTube player error:', event.data);
          // Auto-skip to next track on error
          handleNext();
        },
      },
    });
  }, [playlistData, currentTrackIndex, handleNext]);

  // YouTube player
  useEffect(() => {
    if (view === 'player' && !window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

      window.onYouTubeIframeAPIReady = () => {
        initializePlayer();
      };
    } else if (view === 'player' && window.YT) {
      initializePlayer();
    }
  }, [view, initializePlayer]);

  const handlePlayPause = () => {
    if (!playerRef.current || !playerRef.current.playVideo) {
      console.warn('YouTube player not ready');
      return;
    }

    const currentTrack = playlistData?.tracks[currentTrackIndex];
    if (!currentTrack?.youtubeId) {
      console.warn('Current track has no YouTube ID');
      return;
    }

    if (isPlaying) {
      playerRef.current.pauseVideo();
    } else {
      playerRef.current.playVideo();
    }
  };

  useEffect(() => {
    if (view === 'player' && playerRef.current && playerRef.current.loadVideoById && playlistData) {
      const currentTrack = playlistData.tracks[currentTrackIndex];
      if (currentTrack?.youtubeId) {
        playerRef.current.loadVideoById(currentTrack.youtubeId);
        setIsPlaying(false);
      }
    }
  }, [currentTrackIndex, view, playlistData]);

  // Load mixtape from database when viewing a shared link
  useEffect(() => {
    const loadSharedMixtape = async () => {
      if (!mixtapeId) return;

      setLoading(true);
      setError('');

      try {
        const { mixtape, error: loadError } = await supabaseService.loadMixtape(mixtapeId);

        if (loadError) {
          setError(loadError === 'Mixtape not found'
            ? 'This mixtape does not exist or has been removed.'
            : `Failed to load mixtape: ${loadError}`);
          setLoading(false);
          setView('landing');
          return;
        }

        // Set all the state from loaded mixtape
        setPlaylistData({
          id: mixtape.spotifyPlaylistId,
          name: mixtape.playlistName,
          description: mixtape.playlistDescription,
          image: mixtape.playlistImage,
          tracks: mixtape.tracks,
        });
        setMixtapeTitle(mixtape.mixtapeTitle);
        setSenderName(mixtape.senderName || '');
        setPersonalMessage(mixtape.personalMessage || '');

        // Set colors
        if (mixtape.cassetteColor.id === 'custom') {
          setIsCustomColor(true);
          setCustomShellColor(mixtape.cassetteColor.shell);
          setCustomInnerColor(mixtape.cassetteColor.inner);
          setCustomLabelColor(mixtape.cassetteColor.label);
        } else {
          const colorMatch = CASSETTE_COLORS.find(c => c.id === mixtape.cassetteColor.id);
          if (colorMatch) setSelectedColor(colorMatch);
        }

        // Set background
        const bgMatch = BACKGROUND_COLORS.find(b => b.color === mixtape.backgroundColor);
        if (bgMatch) {
          setSelectedBg(bgMatch);
          setIsCustomBg(false);
        } else {
          setIsCustomBg(true);
          setCustomBgColor(mixtape.backgroundColor);
        }

        // Set font
        const fontMatch = FONT_STYLES.find(f => f.id === mixtape.fontStyle.id);
        if (fontMatch) setSelectedFont(fontMatch);

        // Set shareable URL
        const url = `${window.location.origin}/#/mixtape/${mixtapeId}`;
        setShareableUrl(url);

        setLoading(false);
        setView('player');

        // Increment view count (fire and forget)
        supabaseService.incrementViewCount(mixtapeId);
      } catch (err) {
        console.error('Error loading shared mixtape:', err);
        setError('An unexpected error occurred while loading this mixtape.');
        setLoading(false);
        setView('landing');
      }
    };

    loadSharedMixtape();
  }, [mixtapeId]);

  // Cassette component matching the reference image
  const Cassette = ({ color, bgColor, title, message, sender, font, size = 'large', showBgSelector = false }) => {
    const scale = size === 'small' ? 0.65 : 1;

    return (
      <div
        className="cassette-wrapper relative mx-auto transition-all duration-300"
        style={{
          width: `${480 * scale}px`,
          padding: `${60 * scale}px ${40 * scale}px`,
          backgroundColor: bgColor,
          borderRadius: `${12 * scale}px`,
        }}
      >
        {/* Cassette body */}
        <div
          className="relative rounded-lg shadow-2xl overflow-hidden"
          style={{
            backgroundColor: color.shell,
            aspectRatio: '1.56/1',
          }}
        >
          {/* Corner screws */}
          <div className="absolute top-3 left-3 w-3 h-3 rounded-full bg-black opacity-30 shadow-inner"></div>
          <div className="absolute top-3 right-3 w-3 h-3 rounded-full bg-black opacity-30 shadow-inner"></div>
          <div className="absolute bottom-3 left-3 w-3 h-3 rounded-full bg-black opacity-30 shadow-inner"></div>
          <div className="absolute bottom-3 right-3 w-3 h-3 rounded-full bg-black opacity-30 shadow-inner"></div>

          {/* Top section - label area */}
          <div className="p-5">
            {/* White sticker circle (top left) */}
            <div className="absolute top-6 left-6 w-8 h-8 rounded-full bg-white opacity-90 shadow"></div>

            {/* Label sticker */}
            <div
              className="relative rounded mx-6 mt-2 p-5 shadow-md"
              style={{
                backgroundColor: color.label,
                minHeight: '80px'
              }}
            >
              <div className="text-center">
                <div className="text-sm font-bold text-gray-800 mb-1 leading-tight" style={{ fontFamily: font?.family || 'Courier, monospace' }}>
                  {title || 'Untitled Mix'}
                </div>
                {sender && (
                  <div className="text-xs text-gray-600 italic" style={{ fontFamily: font?.family || 'Georgia, serif' }}>
                    from {sender}
                  </div>
                )}
                {message && size === 'large' && (
                  <div className="mt-3 pt-2 border-t border-gray-300">
                    <p className="text-xs text-gray-700 italic leading-relaxed line-clamp-3" style={{ fontFamily: font?.family || 'Georgia, serif' }}>
                      "{message}"
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Middle section - tape mechanism */}
          <div
            className="relative px-8 py-4"
            style={{ backgroundColor: color.inner }}
          >
            <div className="flex justify-between items-center">
              {/* Left spool */}
              <div className="relative">
                <div className="w-20 h-20 rounded-full bg-white bg-opacity-40 flex items-center justify-center shadow-lg">
                  <div
                    className={`w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center relative ${isPlaying ? 'animate-spin-slow' : ''}`}
                    style={{
                      boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.3)'
                    }}
                  >
                    {/* Center hole */}
                    <div className="w-4 h-4 rounded-full bg-gray-600"></div>
                    {/* Spool teeth */}
                    {[...Array(6)].map((_, i) => (
                      <div
                        key={i}
                        className="absolute w-1 h-6 bg-gray-700 rounded"
                        style={{
                          transform: `rotate(${i * 60}deg) translateY(-24px)`,
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Center tape window with counter */}
              <div className="flex-1 mx-4">
                <div
                  className="bg-black bg-opacity-60 rounded px-4 py-3 text-center shadow-inner"
                  style={{ fontFamily: 'monospace' }}
                >
                  <div className="flex justify-center items-baseline gap-4 text-white opacity-80">
                    <span className="text-xs">150</span>
                    <span className="text-lg font-bold">50</span>
                    <span className="text-xs">0</span>
                  </div>
                  <div className="flex justify-center gap-1 mt-1">
                    {[...Array(12)].map((_, i) => (
                      <div
                        key={i}
                        className="w-0.5 h-2 bg-white opacity-40"
                        style={{ height: i % 3 === 0 ? '8px' : '6px' }}
                      ></div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right spool */}
              <div className="relative">
                <div className="w-20 h-20 rounded-full bg-white bg-opacity-40 flex items-center justify-center shadow-lg">
                  <div
                    className={`w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center relative ${isPlaying ? 'animate-spin-slow' : ''}`}
                    style={{
                      boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.3)'
                    }}
                  >
                    {/* Center hole */}
                    <div className="w-4 h-4 rounded-full bg-gray-600"></div>
                    {/* Spool teeth */}
                    {[...Array(6)].map((_, i) => (
                      <div
                        key={i}
                        className="absolute w-1 h-6 bg-gray-700 rounded"
                        style={{
                          transform: `rotate(${i * 60}deg) translateY(-24px)`,
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Tape guides (triangles on sides) */}
            <div className="absolute left-8 top-1/2 -translate-y-1/2 w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-gray-700 border-t-[8px] border-t-transparent border-b-[8px] border-b-transparent opacity-40"></div>
            <div className="absolute right-8 top-1/2 -translate-y-1/2 w-0 h-0 border-l-[12px] border-l-gray-700 border-r-[12px] border-r-transparent border-t-[8px] border-t-transparent border-b-[8px] border-b-transparent opacity-40"></div>
          </div>

          {/* Bottom section - darker shell */}
          <div
            className="relative h-16"
            style={{ backgroundColor: color.shell }}
          >
            {/* Bottom roller holes */}
            <div className="absolute left-16 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-black opacity-40"></div>
            <div className="absolute right-16 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-black opacity-40"></div>

            {/* Center screw */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-black opacity-30"></div>
          </div>
        </div>

        {/* Color options below cassette - only show if showBgSelector is true */}
        {showBgSelector && (
          <div className="mt-8">
            <div className="text-center mb-3" style={{ opacity: 0.6 }}>
              <p className="text-sm" style={{ fontFamily: 'Georgia, serif', color: '#2C2416' }}>
                background
              </p>
            </div>
            <div className="flex justify-center gap-2 items-center">
              {BACKGROUND_COLORS.map((bg) => (
                <button
                  key={bg.id}
                  onClick={() => {
                    setSelectedBg(bg);
                    setIsCustomBg(false);
                  }}
                  className={`w-10 h-10 rounded-full transition-all ${
                    selectedBg.id === bg.id && !isCustomBg ? 'ring-2 ring-gray-800 ring-offset-2' : ''
                  }`}
                  style={{ backgroundColor: bg.color }}
                />
              ))}

              {/* Custom background color picker */}
              <button
                onClick={() => setIsCustomBg(true)}
                className={`w-10 h-10 rounded-full transition-all flex items-center justify-center ${
                  isCustomBg
                    ? 'ring-2 ring-gray-800 ring-offset-2 bg-gradient-to-br from-pink-300 via-purple-300 to-indigo-300'
                    : 'bg-gradient-to-br from-pink-200 via-purple-200 to-indigo-200'
                }`}
                title="Custom background color"
              >
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                </svg>
              </button>
            </div>

            {/* Custom background color input */}
            {isCustomBg && (
              <div className="mt-4 flex justify-center gap-2 items-center">
                <input
                  type="color"
                  value={customBgColor}
                  onChange={(e) => setCustomBgColor(e.target.value)}
                  className="w-12 h-8 rounded border border-gray-300 cursor-pointer"
                />
                <input
                  type="text"
                  value={customBgColor}
                  onChange={(e) => setCustomBgColor(e.target.value)}
                  className="px-3 py-1 text-sm rounded border border-gray-300 font-mono w-32"
                  placeholder="#F5F1E8"
                />
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // Landing Page
  if (view === 'landing') {
    return (
      <div className="min-h-screen bg-warmwhite p-6" style={{ backgroundColor: '#F5F1E8' }}>
        <div className="max-w-4xl mx-auto pt-12 pb-20">
          {/* Header */}
          <div className="text-center mb-16">
            <h1 className="text-5xl mb-3 text-warmblack" style={{ fontFamily: 'Georgia, serif', color: '#2C2416' }}>
              MixTape
            </h1>
            <p className="text-lg text-gray-600 mb-1" style={{ fontFamily: 'Georgia, serif' }}>
              Share music the way it was meant to be shared
            </p>
            <p className="text-sm text-gray-500">
              Create a cassette, send a feeling
            </p>
          </div>

          {/* Sample cassette */}
          <div className="mb-12">
            <Cassette
              color={CASSETTE_COLORS[0]}
              bgColor={BACKGROUND_COLORS[0].color}
              title="Cozy Evening Mix"
              sender="a friend"
              message="For the moments between chapters"
              font={FONT_STYLES[0]}
            />
          </div>

          {/* Input area */}
          <div className="max-w-xl mx-auto">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
              <label className="block text-sm text-gray-700 mb-3" style={{ fontFamily: 'Georgia, serif' }}>
                Paste a Spotify playlist URL
              </label>

              <input
                type="text"
                placeholder="https://open.spotify.com/playlist/..."
                className="w-full px-4 py-3 rounded border border-gray-300 focus:border-gray-500 focus:outline-none text-sm mb-4"
                style={{ fontFamily: 'monospace' }}
                value={playlistUrl}
                onChange={(e) => setPlaylistUrl(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleImportPlaylist()}
              />

              {error && (
                <p className="text-red-600 text-sm mb-4">{error}</p>
              )}

              <button
                onClick={handleImportPlaylist}
                disabled={loading || !playlistUrl}
                className="w-full bg-warmblack text-white py-3 rounded hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                style={{ backgroundColor: '#2C2416', fontFamily: 'Georgia, serif' }}
              >
                {loading ? (
                  matchingProgress.total > 0 ?
                    `Matching tracks... (${matchingProgress.current}/${matchingProgress.total})` :
                    'Loading playlist...'
                ) : 'Create mixtape'}
              </button>
            </div>

            <p className="text-center text-xs text-gray-500 mt-6">
              Free • No account required • Works on any device
            </p>
          </div>

          {/* Info cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto mt-20">
            <div className="text-center">
              <div className="text-3xl mb-3">📼</div>
              <h3 className="font-semibold text-gray-800 mb-2" style={{ fontFamily: 'Georgia, serif' }}>
                Authentic design
              </h3>
              <p className="text-sm text-gray-600">
                Realistic cassette tapes with customizable colors
              </p>
            </div>

            <div className="text-center">
              <div className="text-3xl mb-3">🎧</div>
              <h3 className="font-semibold text-gray-800 mb-2" style={{ fontFamily: 'Georgia, serif' }}>
                Full playback
              </h3>
              <p className="text-sm text-gray-600">
                Recipients can listen without any accounts
              </p>
            </div>

            <div className="text-center">
              <div className="text-3xl mb-3">💌</div>
              <h3 className="font-semibold text-gray-800 mb-2" style={{ fontFamily: 'Georgia, serif' }}>
                Add a note
              </h3>
              <p className="text-sm text-gray-600">
                Include a personal message on the label
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Create/Customize Page
  if (view === 'create') {
    return (
      <div className="min-h-screen bg-warmwhite p-6" style={{ backgroundColor: '#F5F1E8' }}>
        <div className="max-w-5xl mx-auto pt-8 pb-20">
          <button
            onClick={() => setView('landing')}
            className="text-gray-600 hover:text-gray-800 mb-8 text-sm"
          >
            ← Back
          </button>

          <h1 className="text-3xl mb-12 text-center text-warmblack" style={{ fontFamily: 'Georgia, serif', color: '#2C2416' }}>
            Customize your cassette
          </h1>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Preview - left side, sticky */}
            <div className="lg:sticky lg:top-8 lg:self-start">
              <Cassette
                color={getCurrentColor()}
                bgColor={getCurrentBgColor()}
                title={mixtapeTitle}
                message={personalMessage}
                sender={senderName}
                font={selectedFont}
                showBgSelector={true}
              />
            </div>

            {/* Customization - right side, scrollable */}
            <div className="space-y-6">
              {/* Track list */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-sm font-semibold mb-4 text-gray-700" style={{ fontFamily: 'Georgia, serif' }}>
                  Track list ({playlistData?.tracks.length} songs)
                </h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {playlistData?.tracks.map((track, idx) => (
                    <div key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                      <span className="text-gray-400 font-mono text-xs mt-0.5">{String(idx + 1).padStart(2, '0')}</span>
                      <div>
                        <div className="font-medium">{track.name}</div>
                        <div className="text-xs text-gray-500">{track.artist}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Customization options */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold mb-6 text-gray-800" style={{ fontFamily: 'Georgia, serif' }}>
                  Details
                </h3>

                <div className="space-y-5">
                  <div>
                    <label className="block text-sm text-gray-700 mb-2">
                      Cassette title
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 rounded border border-gray-300 focus:border-gray-500 focus:outline-none text-sm"
                      value={mixtapeTitle}
                      onChange={(e) => setMixtapeTitle(e.target.value)}
                      placeholder="Cozy Evening Mix"
                      style={{ fontFamily: 'Courier, monospace' }}
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-gray-700 mb-2">
                      Your name <span className="text-gray-400">(optional)</span>
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 rounded border border-gray-300 focus:border-gray-500 focus:outline-none text-sm"
                      value={senderName}
                      onChange={(e) => setSenderName(e.target.value)}
                      placeholder="Alex"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-gray-700 mb-2">
                      Personal message <span className="text-gray-400">(optional)</span>
                    </label>
                    <textarea
                      className="w-full px-3 py-2 rounded border border-gray-300 focus:border-gray-500 focus:outline-none text-sm resize-none"
                      rows="3"
                      value={personalMessage}
                      onChange={(e) => setPersonalMessage(e.target.value)}
                      placeholder="For the quiet moments"
                      style={{ fontFamily: 'Georgia, serif' }}
                    />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold mb-6 text-gray-800" style={{ fontFamily: 'Georgia, serif' }}>
                  Cassette color
                </h3>

                <div className="grid grid-cols-4 gap-3 mb-4">
                  {CASSETTE_COLORS.map((color) => (
                    <button
                      key={color.id}
                      onClick={() => {
                        setSelectedColor(color);
                        setIsCustomColor(false);
                      }}
                      className={`aspect-square rounded-lg border-2 transition-all hover:scale-105 ${
                        selectedColor.id === color.id && !isCustomColor
                          ? 'border-gray-800 shadow-md'
                          : 'border-gray-200 hover:border-gray-400'
                      }`}
                      style={{ backgroundColor: color.shell }}
                      title={color.name}
                    />
                  ))}

                  {/* Custom color button */}
                  <button
                    onClick={() => setIsCustomColor(true)}
                    className={`aspect-square rounded-lg border-2 transition-all hover:scale-105 flex items-center justify-center ${
                      isCustomColor
                        ? 'border-gray-800 shadow-md bg-gradient-to-br from-red-400 via-yellow-400 to-blue-400'
                        : 'border-gray-200 hover:border-gray-400 bg-gradient-to-br from-red-200 via-yellow-200 to-blue-200'
                    }`}
                    title="Custom color"
                  >
                    <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                    </svg>
                  </button>
                </div>

                {/* Custom color pickers */}
                {isCustomColor && (
                  <div className="space-y-3 pt-4 border-t border-gray-200">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Shell (outer)</label>
                      <div className="flex gap-2 items-center">
                        <input
                          type="color"
                          value={customShellColor}
                          onChange={(e) => setCustomShellColor(e.target.value)}
                          className="w-12 h-8 rounded border border-gray-300 cursor-pointer"
                        />
                        <input
                          type="text"
                          value={customShellColor}
                          onChange={(e) => setCustomShellColor(e.target.value)}
                          className="flex-1 px-2 py-1 text-xs rounded border border-gray-300 font-mono"
                          placeholder="#2C5F8D"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Inner (tape area)</label>
                      <div className="flex gap-2 items-center">
                        <input
                          type="color"
                          value={customInnerColor}
                          onChange={(e) => setCustomInnerColor(e.target.value)}
                          className="w-12 h-8 rounded border border-gray-300 cursor-pointer"
                        />
                        <input
                          type="text"
                          value={customInnerColor}
                          onChange={(e) => setCustomInnerColor(e.target.value)}
                          className="flex-1 px-2 py-1 text-xs rounded border border-gray-300 font-mono"
                          placeholder="#87CEEB"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Label (sticker)</label>
                      <div className="flex gap-2 items-center">
                        <input
                          type="color"
                          value={customLabelColor}
                          onChange={(e) => setCustomLabelColor(e.target.value)}
                          className="w-12 h-8 rounded border border-gray-300 cursor-pointer"
                        />
                        <input
                          type="text"
                          value={customLabelColor}
                          onChange={(e) => setCustomLabelColor(e.target.value)}
                          className="flex-1 px-2 py-1 text-xs rounded border border-gray-300 font-mono"
                          placeholder="#E8F4F8"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Font Style Selector */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold mb-4 text-gray-800" style={{ fontFamily: 'Georgia, serif' }}>
                  Font style
                </h3>
                <div className="grid grid-cols-5 gap-2">
                  {FONT_STYLES.map((font) => (
                    <button
                      key={font.id}
                      onClick={() => setSelectedFont(font)}
                      className={`p-3 rounded-lg border-2 transition-all hover:scale-105 text-center ${
                        selectedFont.id === font.id
                          ? 'border-gray-800 shadow-md bg-gray-50'
                          : 'border-gray-200 hover:border-gray-400'
                      }`}
                      title={font.name}
                    >
                      <div className="text-lg mb-1" style={{ fontFamily: font.family }}>
                        Aa
                      </div>
                      <div className="text-[10px] text-gray-600 leading-tight truncate">{font.name}</div>
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleCreateMixtape}
                className="w-full bg-warmblack text-white py-4 rounded hover:bg-opacity-90 transition-all font-semibold"
                style={{ backgroundColor: '#2C2416', fontFamily: 'Georgia, serif' }}
              >
                Create mixtape
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Player Page
  if (view === 'player' && playlistData) {
    const currentTrack = playlistData.tracks[currentTrackIndex];

    return (
      <div className="min-h-screen bg-warmwhite p-6" style={{ backgroundColor: '#F5F1E8' }}>
        <div className="max-w-3xl mx-auto pt-12 pb-20">
          {/* Header message */}
          <div className="text-center mb-12">
            <h1 className="text-3xl mb-3 text-warmblack" style={{ fontFamily: 'Georgia, serif', color: '#2C2416' }}>
              {senderName ? `${senderName} made you a mixtape` : 'You received a mixtape'}
            </h1>
            {personalMessage && (
              <p className="text-gray-600 italic max-w-md mx-auto" style={{ fontFamily: 'Georgia, serif' }}>
                "{personalMessage}"
              </p>
            )}
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 mb-8">
            <Cassette
              color={getCurrentColor()}
              bgColor={getCurrentBgColor()}
              title={mixtapeTitle}
              sender={senderName}
              font={selectedFont}
              size="large"
            />

            {/* YouTube player - visible as per PRD requirement */}
            <div className="mt-8">
              <div className="bg-black rounded-lg overflow-hidden shadow-lg mx-auto" style={{ maxWidth: '640px' }}>
                <div id="youtube-player"></div>
              </div>
            </div>

            {/* Now playing */}
            <div className="mt-8 text-center">
              <div className="text-sm text-gray-500 mb-1">Now playing</div>
              <div className="text-lg font-semibold text-gray-800">{currentTrack.name}</div>
              <div className="text-sm text-gray-600">{currentTrack.artist}</div>
              <div className="text-xs text-gray-400 mt-2">
                {currentTrackIndex + 1} of {playlistData.tracks.length}
              </div>
              {!currentTrack.youtubeId && (
                <div className="mt-2 text-xs text-red-500">
                  ⚠ This track could not be matched on YouTube
                </div>
              )}
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-6 mt-8">
              <button
                onClick={handlePrevious}
                className="p-3 rounded-full hover:bg-gray-100 transition-all"
              >
                <SkipBack className="w-5 h-5 text-gray-700" />
              </button>

              <button
                onClick={handlePlayPause}
                className="p-5 rounded-full bg-warmblack text-white hover:bg-opacity-90 transition-all"
                style={{ backgroundColor: '#2C2416' }}
              >
                {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
              </button>

              <button
                onClick={handleNext}
                className="p-3 rounded-full hover:bg-gray-100 transition-all"
              >
                <SkipForward className="w-5 h-5 text-gray-700" />
              </button>
            </div>
          </div>

          {/* Track list */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
            <h3 className="text-sm font-semibold mb-4 text-gray-700" style={{ fontFamily: 'Georgia, serif' }}>
              All tracks
            </h3>
            <div className="space-y-1 max-h-80 overflow-y-auto">
              {playlistData.tracks.map((track, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentTrackIndex(idx)}
                  disabled={!track.youtubeId}
                  className={`w-full text-left p-3 rounded transition-all ${
                    idx === currentTrackIndex
                      ? 'bg-gray-100'
                      : track.youtubeId
                      ? 'hover:bg-gray-50'
                      : 'opacity-50 cursor-not-allowed'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-gray-400 font-mono text-xs mt-0.5">{String(idx + 1).padStart(2, '0')}</span>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-800">{track.name}</div>
                      <div className="text-xs text-gray-500">{track.artist}</div>
                      {!track.youtubeId && (
                        <div className="text-xs text-red-500 mt-1">Unavailable</div>
                      )}
                    </div>
                    {idx === currentTrackIndex && isPlaying && (
                      <Music className="w-4 h-4 text-gray-400 animate-pulse" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Share section */}
          <div className="flex gap-3">
            <button
              onClick={handleShare}
              className="flex-1 bg-warmblack text-white py-3 px-6 rounded hover:bg-opacity-90 transition-all flex items-center justify-center gap-2"
              style={{ backgroundColor: '#2C2416', fontFamily: 'Georgia, serif' }}
            >
              <Share2 className="w-4 h-4" />
              Share this mixtape
            </button>

            <button
              onClick={copyToClipboard}
              className="bg-white border border-gray-300 text-gray-700 py-3 px-6 rounded hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied!' : 'Copy link'}
            </button>
          </div>

          <div className="text-center mt-8">
            <button
              onClick={() => {
                navigate('/');
                setView('landing');
                setPlaylistUrl('');
                setPlaylistData(null);
              }}
              className="text-sm text-gray-600 hover:text-gray-800"
            >
              Make your own mixtape →
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

// Add animations
const style = document.createElement('style');
style.textContent = `
  @keyframes spin-slow {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  .animate-spin-slow {
    animation: spin-slow 4s linear infinite;
  }
`;
document.head.appendChild(style);

export default MixTape;
