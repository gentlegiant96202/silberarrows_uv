"use client";
import { useState, useEffect } from 'react';
import { Sun, CloudSun, CloudRain } from 'lucide-react';

// module-level weather cache
let weatherCache: { temp: number; code: number; ts: number } | null = null;

export default function WeatherClock() {
  const [weather, setWeather] = useState<{temp:number; code:number}|null>(null);
  const [clock, setClock] = useState<string>('');

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

  return (
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
    </div>
  );
} 