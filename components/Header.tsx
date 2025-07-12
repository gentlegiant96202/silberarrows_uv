"use client";
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/components/AuthProvider'
import { useRouter, usePathname } from 'next/navigation';
import { LogOut, User, ChevronDown, Sun, CloudSun, CloudRain, Music2, Check, Calculator } from 'lucide-react';
import { useSearchStore } from '@/lib/searchStore';

// -------------------- Global Calm-Mode Audio --------------------
// Persisted across component unmounts so music keeps playing while navigating.
let globalAudio: HTMLAudioElement | null = null;
let globalTrackKey: string | null = null;
// module-level weather cache
let weatherCache: { temp: number; code: number; ts: number } | null = null;

export default function Header() {
  const routerHook = useRouter();
  const pathname = usePathname();
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'CRM' | 'CUSTOMERS' | 'INVENTORY' | 'CONSIGNMENTS'>('DASHBOARD');
  const { user, signOut } = useAuth();
  const { query, setQuery } = useSearchStore();
  const [showProfile, setShowProfile] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const [weather, setWeather] = useState<{temp:number; code:number}|null>(null);
  const [clock, setClock] = useState<string>('');
  const [dark, setDark] = useState(true);

  // calm mode audio
  const tracks = {
    happy:       { label: 'Happy',       file: 'Happy.mp3' },
    ocean:       { label: 'Ocean',       file: 'Ocean.mp3' },
    tokyo_rain:  { label: 'Tokyo Rain',  file: 'Tokyo Rain.mp3' },
    birds:       { label: 'Birds',       file: 'Birds.mp3' },
    rock:        { label: 'Rock',        file: 'Rock.mp3' },
    lofi:        { label: 'Lo-Fi',       file: 'LoFi.mp3' }
  } as const;
  type TrackKey = keyof typeof tracks;
  const [track, setTrack] = useState<TrackKey>((globalTrackKey as TrackKey) || 'happy');
  const [audio, setAudio] = useState<HTMLAudioElement | null>(globalAudio);
  const [playing, setPlaying] = useState<boolean>(globalAudio ? !globalAudio.paused : false);
  const [showSelector, setShowSelector] = useState(false);

  // finance calculator state
  const [showFinance, setShowFinance] = useState(false);
  const [finPrice, setFinPrice] = useState('');
  const [finYears, setFinYears] = useState(5);
  const calcMonthly = () => {
    const p = parseFloat(finPrice || '0');
    if(!p) return { zero: 0, twenty: 0 };
    const r = 0.025/12;
    const n = finYears*12;
    const pay = (principal:number)=> Math.round(principal*r/(1-Math.pow(1+r,-n)));
    return { zero: pay(p), twenty: pay(p*0.8) };
  };

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
    }

    const src = `/music/${encodeURIComponent(tracks[key].file)}`;
    const el = new Audio(src);
    el.loop = true;
    el.volume = 0.25;
    el.play();

    // Update globals so other Header instances can reuse
    globalAudio = el;
    globalTrackKey = key;

    // Sync local state
    setAudio(el);
    setTrack(key);
    setPlaying(true);
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

  // cached Dubai weather
  useEffect(() => {
    if (weatherCache && Date.now() - weatherCache.ts < 10 * 60_000) {
      setWeather(weatherCache);
      return;
    }
    (async () => {
      try {
        const res = await fetch('https://api.open-meteo.com/v1/forecast?latitude=25.2048&longitude=55.2708&current_weather=true&timezone=Asia%2FDubai');
        const json = await res.json();
        const w = json.current_weather;
        const cached = { temp: w.temperature, code: w.weathercode, ts: Date.now() };
        weatherCache = cached;
        setWeather(cached);
      } catch {}
    })();
  }, []);

  // local time clock
  useEffect(() => {
    const tick = () => setClock(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    tick();
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, []);

  // theme persistence
  useEffect(() => {
    const stored = localStorage.getItem('theme');
    const prefersDark = stored ? stored === 'dark' : true;
    setDark(prefersDark);
    document.documentElement.classList.toggle('dark', prefersDark);
  }, []);

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('theme', next ? 'dark' : 'light');
  };

  useEffect(() => {
    if (!pathname) return;
    if (pathname.startsWith('/dashboard')) setActiveTab('DASHBOARD');
    else if (pathname.startsWith('/customers')) setActiveTab('CUSTOMERS');
    else if (pathname.startsWith('/inventory')) setActiveTab('INVENTORY');
    else if (pathname.startsWith('/consignments')) setActiveTab('CONSIGNMENTS');
    else setActiveTab('CRM');
  }, [pathname]);

  // close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setShowProfile(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-50 bg-black border-b border-white/10 overflow-visible">
      <div className="px-4 overflow-visible relative">
        <div className="flex flex-wrap items-center py-3 overflow-y-visible">
          {/* Logo */}
          <div className="flex items-center mr-10">
            <div className="w-10 h-10 flex items-center justify-center">
              <img 
                src="https://res.cloudinary.com/dw0ciqgwd/image/upload/v1748497977/qgdbuhm5lpnxuggmltts.png" 
                alt="Logo" 
                className="w-10 h-10 object-contain"
              />
            </div>
          </div>
          
          {/* Navigation Tabs + Search */}
          <div className="flex-1 flex items-center space-x-4">
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => routerHook.push('/dashboard')}
                className={`px-4 py-1.5 rounded-full font-medium text-xs md:text-sm transition-all duration-200 bg-black/40 backdrop-blur-sm border border-white/10 ${
                  activeTab === 'DASHBOARD'
                    ? 'text-brand shadow-lg'
                    : 'text-white/70 hover:text-white hover:bg-black/60'
                }`}
              >
                DASHBOARD
              </button>
              <button
                onClick={() => routerHook.push('/')}
                className={`px-4 py-1.5 rounded-full font-medium text-xs md:text-sm transition-all duration-200 bg-black/40 backdrop-blur-sm border border-white/10 ${
                  activeTab === 'CRM'
                    ? 'text-brand shadow-lg'
                    : 'text-white/70 hover:text-white hover:bg-black/60'
                }`}
              >
                CRM
              </button>

              <button
                onClick={() => routerHook.push('/customers')}
                className={`px-4 py-1.5 rounded-full font-medium text-xs md:text-sm transition-all duration-200 bg-black/40 backdrop-blur-sm border border-white/10 ${
                  activeTab === 'CUSTOMERS'
                    ? 'text-brand shadow-lg'
                    : 'text-white/70 hover:text-white hover:bg-black/60'
                }`}
              >
                DATABASE
              </button>

              <button
                onClick={() => routerHook.push('/inventory')}
                className={`px-4 py-1.5 rounded-full font-medium text-xs md:text-sm transition-all duration-200 bg-black/40 backdrop-blur-sm border border-white/10 ${
                  activeTab === 'INVENTORY'
                    ? 'text-brand shadow-lg'
                    : 'text-white/70 hover:text-white hover:bg-black/60'
                }`}
              >
                INVENTORY
              </button>

              <button
                onClick={() => routerHook.push('/consignments')}
                className={`px-4 py-1.5 rounded-full font-medium text-xs md:text-sm transition-all duration-200 bg-black/40 backdrop-blur-sm border border-white/10 ${
                  activeTab === 'CONSIGNMENTS'
                    ? 'text-brand shadow-lg'
                    : 'text-white/70 hover:text-white hover:bg-black/60'
                }`}
              >
                CONSIGNMENTS
              </button>
            </div>

            {/* Search Bar */}
            <input
              type="text"
              placeholder="Search…"
              value={query}
              onChange={(e)=>setQuery(e.target.value.toUpperCase())}
              className="hidden sm:block w-44 md:w-60 px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-sm border border-white/10 text-white text-xs md:text-sm placeholder-white/40 focus:outline-none focus:ring-1 focus:ring-white/30"
            />
          </div>
          
          {/* Weather / Time / Theme – desktop only */}
          <div className="hidden lg:flex items-center gap-3 text-white/80 text-xs">
            {weather && (
              <div className="flex items-center gap-1 animate-pulse-slow">
                {weather.code < 3 ? (
                  <Sun className="w-4 h-4 animate-spin-slow text-yellow-400" />
                ) : weather.code < 60 ? (
                  <CloudSun className="w-4 h-4 text-yellow-400" />
                ) : (
                  <CloudRain className="w-4 h-4" />
                )}
                <span>{Math.round(weather.temp)}°C</span>
              </div>
            )}
            {clock && <span>{clock}</span>}

            {/* Calm mode */}
            <div className="relative flex items-center mr-3">
              {/* Play / Pause toggle */}
              <button
                onClick={togglePlay}
                className={`w-5 h-5 flex items-center justify-center ${playing ? 'animate-pulse text-emerald-400' : 'text-white/60'} hover:text-white`}
                title={playing ? 'Pause Calm Mode' : 'Play Calm Mode'}
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

            {/* Finance calculator */}
            <div className="relative">
              <button
                onClick={()=>setShowFinance(p=>!p)}
                className="w-5 h-5 flex items-center justify-center text-white/60 hover:text-white"
                title="Finance Calculator"
              >
                <Calculator className="w-4 h-4" />
              </button>
              {showFinance && (
                <div className="fixed right-32 top-16 w-60 bg-black/90 backdrop-blur border border-white/10 rounded-lg shadow-lg p-4 z-50 origin-top transition-transform transition-opacity duration-200">
                  <p className="text-white/70 text-sm mb-2">Finance Calculator</p>
                  <label className="block text-white/60 text-xs mb-0.5">Vehicle Price (AED)</label>
                  <input
                    type="number"
                    value={finPrice}
                    onChange={e=>setFinPrice(e.target.value)}
                    className="w-full px-2 py-1 rounded bg-black/40 border border-white/20 text-white text-xs mb-2"
                    placeholder="0"
                  />

                  <label className="block text-white/60 text-xs mb-0.5">Loan Term (Years)</label>
                  <select
                    value={finYears}
                    onChange={e=>setFinYears(parseInt(e.target.value))}
                    className="w-full px-2 py-1 rounded bg-black/40 border border-white/20 text-white text-xs mb-3"
                  >
                    {[1,2,3,4,5].map(y=><option key={y} value={y}>{y}</option>)}
                  </select>

                  {(()=>{const m=calcMonthly(); return (
                    <div className="text-white text-sm space-y-0.5">
                      <p>0% Down: <span className="font-semibold">AED {m.zero.toLocaleString()}</span>/mo</p>
                      <p>20% Down: <span className="font-semibold">AED {m.twenty.toLocaleString()}</span>/mo</p>
                    </div>
                  );})()}
                </div>
              )}
            </div>
          </div>

          {/* Profile Dropdown */}
          <div ref={profileRef} className="relative flex items-center ml-4">
            {user ? (
              <>
                <button
                  onClick={() => setShowProfile(prev => !prev)}
                  className="flex items-center space-x-1 px-2 py-1.5 bg-gradient-to-br from-gray-200 via-gray-100 to-gray-400 text-black rounded-full shadow-inner hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-brand"
                  title={user.email || 'User'}
                >
                  <User className="w-4 h-4" />
                  <ChevronDown className="w-4 h-4" />
                </button>

                {/* Animated dropdown */}
                <div
                  className={`fixed right-4 top-16 w-56 bg-black/90 backdrop-blur border border-white/10 rounded-lg shadow-lg p-4 z-50 origin-top transition-transform transition-opacity duration-200 ${showProfile ? 'scale-y-100 opacity-100' : 'scale-y-0 opacity-0 pointer-events-none'}`}
                >
                    <p className="text-sm text-white break-all mb-3">{user.email}</p>
                    <button
                      onClick={async () => {
                        await signOut();
                        routerHook.push('/login');
                      }}
                      className="flex items-center space-x-2 w-full text-left text-sm text-white hover:text-brand"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Logout</span>
                    </button>
                </div>
              </>
            ) : (
              <a
                href="/login"
                className="px-4 py-1.5 rounded-full bg-brand text-white text-sm font-medium hover:bg-brand/90"
              >
                Login
              </a>
            )}
          </div>
        </div>
      </div>
    </header>
  );
} 