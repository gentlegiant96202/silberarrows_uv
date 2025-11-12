"use client";
import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
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
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, right: 0 });
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Auto-close track selector after a few seconds
  useEffect(() => {
    if (!showSelector) return;
    const id = setTimeout(() => setShowSelector(false), 4000); // 4s
    return () => clearTimeout(id);
  }, [showSelector]);

  // Close dropdown when clicking outside and handle window resize
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node) &&
          buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
        setShowSelector(false);
      }
    }

    function handleResize() {
      if (showSelector) {
        updateDropdownPosition();
      }
    }

    if (showSelector) {
      document.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('resize', handleResize);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('resize', handleResize);
    };
  }, [showSelector]);

  const updateDropdownPosition = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 8, // 8px gap below button
        right: window.innerWidth - rect.right // Align right edge with button
      });
    }
  };

  const handleToggleDropdown = () => {
    if (!showSelector) {
      updateDropdownPosition();
    }
    setShowSelector(!showSelector);
  };

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
    // Enhanced error handling
    el.onerror = (e) => {
      setPlaying(false);
    };
    
    el.onloadstart = () => {
    };
    
    el.oncanplay = () => {
    };
    
    // Set source and attempt to play
    el.src = src;
    
    const playPromise = el.play();
    
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          setPlaying(true);
        })
        .catch(err => {
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
        className={`w-5 h-5 flex items-center justify-center ${playing ? 'animate-pulse' : ''} ${playing ? 'text-gray-300' : 'text-white/60'} hover:text-white transition-colors`}
        title={playing ? 'Pause Music' : 'Play Music'}
        style={playing ? {
          filter: 'drop-shadow(0 0 4px rgba(209, 213, 219, 0.6))'
        } : undefined}
      >
        <Music2 className="w-4 h-4" />
      </button>

      {/* Track selector toggle */}
      <button
        ref={buttonRef}
        onClick={handleToggleDropdown}
        className="ml-1 flex items-center justify-center text-white/40 hover:text-white"
        title="Choose Track"
      >
        <ChevronDown className="w-3 h-3" />
      </button>

      {/* Dropdown rendered via Portal */}
      {showSelector && typeof window !== 'undefined' && createPortal(
        <div 
          ref={dropdownRef}
          className="fixed w-40 bg-black/90 backdrop-blur border border-white/10 rounded-lg shadow-lg p-3 origin-top transition-transform transition-opacity duration-200 animate-in slide-in-from-top-2"
          style={{
            top: `${dropdownPosition.top}px`,
            right: `${dropdownPosition.right}px`,
            zIndex: 999999
          }}
        >
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
                <span className="flex-1">{obj.label}</span>
                {selected && (
                  <Check 
                    className="w-3 h-3 text-gray-300" 
                    style={{
                      filter: 'drop-shadow(0 0 2px rgba(209, 213, 219, 0.4))'
                    }}
                  />
                )}
              </button>
            );
          })}
        </div>,
        document.body
      )}
    </div>
  );
} 