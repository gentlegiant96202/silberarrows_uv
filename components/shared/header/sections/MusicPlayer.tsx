"use client";
import { useState, useEffect } from 'react';
import { Music2, Check, ChevronDown } from 'lucide-react';

// -------------------- Global Calm-Mode Audio --------------------
// Persisted across component unmounts so music keeps playing while navigating.
let globalAudio: HTMLAudioElement | null = null;
let globalTrackKey: string | null = null;

export default function MusicPlayer() {
  // calm mode audio - all local files for reliability
  const tracks = {
    happy:            { label: 'Happy',            file: 'Happy.mp3', type: 'local' },
    ocean:            { label: 'Ocean',            file: 'Ocean.mp3', type: 'local' },
    tokyo_rain:       { label: 'Tokyo Rain',       file: 'Tokyo Rain.mp3', type: 'local' },
    birds:            { label: 'Birds',            file: 'Birds.mp3', type: 'local' },
    rock:             { label: 'Rock',             file: 'Rock.mp3', type: 'local' },
    lofi:             { label: 'Lo-Fi',            file: 'LoFi.mp3', type: 'local' },
    delilah:          { label: 'Delilah',          file: 'Delilah.mp3', type: 'local' },
    
    // High-quality ambient tracks
    zen_garden:       { label: 'Zen Garden',       file: 'Zen_Garden.mp3', type: 'local' },
    peaceful_piano:   { label: 'Peaceful Piano',   file: 'Peaceful_Piano.mp3', type: 'local' }
  } as const;
  type TrackKey = keyof typeof tracks;
  const [track, setTrack] = useState<TrackKey>((globalTrackKey as TrackKey) || 'happy');
  const [audio, setAudio] = useState<HTMLAudioElement | null>(globalAudio);
  const [playing, setPlaying] = useState<boolean>(globalAudio ? !globalAudio.paused : false);
  const [showSelector, setShowSelector] = useState(false);

  // Auto-close track selector after a few seconds
  useEffect(() => {
    if (!showSelector) return;
    const id = setTimeout(() => setShowSelector(false), 4000); // 4s
    return () => clearTimeout(id);
  }, [showSelector]);

  /**
   * Start playing the given track, stopping any existing audio first.
   */
  const playTrack = (key: TrackKey) => {
    // Stop current if different track
    if (globalAudio) {
      globalAudio.pause();
      globalAudio.src = '';
    }

    const trackInfo = tracks[key];
    const src = trackInfo.type === 'local' 
      ? `/music/${encodeURIComponent(trackInfo.file)}`
      : trackInfo.file;
    
    const el = new Audio();
    
    // Configure audio element
    el.volume = 0.25;
    el.preload = 'none';
    
    // Loop all local tracks
    el.loop = true;
    
    // Log track loading
    console.log(`🎵 Attempting to play ${trackInfo.type}: ${trackInfo.label}`);
    
    // Enhanced error handling
    el.onerror = (e) => {
      console.warn(`❌ Failed to load ${trackInfo.type}: ${trackInfo.label}`, e);
      setPlaying(false);
    };
    
    el.onloadstart = () => {
      console.log(`🔄 Loading ${trackInfo.type}: ${trackInfo.label}`);
    };
    
    el.oncanplay = () => {
      console.log(`✅ Ready to play ${trackInfo.type}: ${trackInfo.label}`);
    };
    
    // Set source and attempt to play
    el.src = src;
    
    const playPromise = el.play();
    
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          console.log(`🎵 Successfully playing ${trackInfo.type}: ${trackInfo.label}`);
          setPlaying(true);
        })
        .catch(err => {
          console.warn(`❌ Playback failed for ${trackInfo.type}: ${trackInfo.label}`, err);
          setPlaying(false);
        });
    }

    // Update globals so other Header instances can reuse
    globalAudio = el;
    globalTrackKey = key;

    // Sync local state
    setAudio(el);
    setTrack(key);
  };

  /**
   * Toggle playback (pause/resume) of the current track.
   */
  const togglePlay = () => {
    if (!globalAudio) {
      playTrack(track);
      return;
    }

    if (globalAudio.paused) {
      globalAudio.play();
      setPlaying(true);
    } else {
      globalAudio.pause();
      setPlaying(false);
    }
  };

  return (
    <div className="relative flex items-center mr-3">
      {/* Play / Pause toggle */}
      <button
        onClick={togglePlay}
        className={`w-5 h-5 flex items-center justify-center ${playing ? 'animate-pulse text-emerald-400' : 'text-white/60'} hover:text-white`}
        title={playing ? 'Pause Music' : 'Play Music'}
      >
        <Music2 className="w-4 h-4" />
      </button>

      {/* Track selector toggle */}
      <button
        onClick={() => setShowSelector(prev => !prev)}
        className="ml-1 flex items-center justify-center text-white/40 hover:text-white"
        title="Choose Track"
      >
        <ChevronDown className="w-3 h-3" />
      </button>

      {/* Dropdown */}
      {showSelector && (
        <div className={`fixed right-24 top-16 w-40 bg-black/90 backdrop-blur border border-white/10 rounded-lg shadow-lg p-3 z-50 origin-top transition-transform transition-opacity duration-200 ${showSelector ? 'scale-y-100 opacity-100' : 'scale-y-0 opacity-0 pointer-events-none'}`}>
          <p className="text-white/60 mb-2">Select Track</p>
          {Object.entries(tracks).map(([k, obj]) => {
            const selected = track === k;
            return (
              <button
                key={k}
                onClick={() => {
                  setShowSelector(false);
                  playTrack(k as TrackKey);
                }}
                className={`flex items-center justify-between w-full text-left px-2 py-0.5 rounded ${selected ? 'bg-white/10 text-white' : 'text-white/60 hover:bg-white/5'}`}
              >
                {obj.label}
                {selected && <Check className="w-3 h-3 text-emerald-400" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
} 