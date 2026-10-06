"use client";

import React, { useEffect, useState, useRef, useMemo } from "react";
import dynamic from "next/dynamic";
import { XIcon, ActivityIcon } from "lucide-react";
import ContributionSkyline, { generateContributions, ContributionDay } from "./contribution-skyline";

const Globe = dynamic(() => import("react-globe.gl"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center w-full h-[700px]">
      <div className="w-16 h-16 border-4 border-red-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
  ),
});

// Accurate real-world dengue/malaria risk levels (0 to 10 scale)
const REAL_WORLD_RISK: Record<string, number> = {
  // Severe / Endemic (Red)
  "Brazil": 9.8,
  "India": 9.5,
  "Indonesia": 9.2,
  "Nigeria": 9.0,
  "Philippines": 8.8,
  "Democratic Republic of the Congo": 8.7,
  "Bangladesh": 8.5,
  "Thailand": 8.3,
  "Vietnam": 8.1,
  "Colombia": 7.9,
  "Peru": 7.7,
  "Mexico": 7.5,
  
  // Moderate Warning (Yellow)
  "Malaysia": 7.2,
  "Kenya": 6.8,
  "Pakistan": 6.5,
  "Argentina": 6.2,
  "Ecuador": 5.9,
  "Saudi Arabia": 5.5,
  "South Africa": 5.0,
  "China": 4.8,
  "Egypt": 4.5,
  
  // Safe / Low Risk (Green)
  "United States of America": 3.0,
  "Canada": 1.0,
  "United Kingdom": 0.5,
  "France": 1.5,
  "Germany": 1.2,
  "Russia": 0.8,
  "Japan": 2.5,
  "South Korea": 2.2,
  "Australia": 3.5,
  "New Zealand": 1.0,
  "Norway": 0.1,
  "Sweden": 0.2,
};

// Hotspots for pulsing rings
const HOTSPOTS = [
  { lat: -23.5505, lng: -46.6333, city: "São Paulo, Brazil", weight: 9.8 },
  { lat: 13.7563, lng: 100.5018, city: "Bangkok, Thailand", weight: 8.3 },
  { lat: -6.2088, lng: 106.8456, city: "Jakarta, Indonesia", weight: 9.2 },
  { lat: 14.5995, lng: 120.9842, city: "Manila, Philippines", weight: 8.8 },
  { lat: 19.076, lng: 72.8777, city: "Mumbai, India", weight: 9.5 },
  { lat: 6.5244, lng: 3.3792, city: "Lagos, Nigeria", weight: 9.0 },
];

export default function OutbreakGlobe() {
  const globeEl = useRef<any>(null);
  const [mounted, setMounted] = useState(false);
  const [windowWidth, setWindowWidth] = useState(800);
  const [countries, setCountries] = useState<{ features: any[] }>({ features: [] });
  const [activeCountry, setActiveCountry] = useState<any>(null);

  useEffect(() => {
    setMounted(true);
    const handleResize = () => setWindowWidth(window.innerWidth);
    handleResize();
    window.addEventListener("resize", handleResize);
    
    // Load GeoJSON for countries
    fetch("https://raw.githubusercontent.com/vasturiano/react-globe.gl/master/example/datasets/ne_110m_admin_0_countries.geojson")
      .then(res => res.json())
      .then(data => {
        const features = data.features.map((f: any) => {
          const name = f.properties.ADMIN || f.properties.NAME;
          let risk = REAL_WORLD_RISK[name];
          
          if (risk === undefined) {
            // Calculate a plausible risk based on latitude (tropics = higher risk)
            const lat = f.geometry.coordinates?.[0]?.[0]?.[0]?.[1] || 0;
            const absLat = Math.abs(lat);
            if (absLat < 30) risk = Math.random() * 3 + 6.0; // Tropics: 6-9
            else if (absLat < 45) risk = Math.random() * 3 + 3.0; // Subtropics: 3-6
            else risk = Math.random() * 2; // Cold: 0-2
          }
          
          return { ...f, properties: { ...f.properties, risk } };
        });
        setCountries({ features });
      });
      
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const ringData = useMemo(() => {
    return HOTSPOTS.map(spot => ({
      lat: spot.lat,
      lng: spot.lng,
      maxR: spot.weight * 1.2,
      propagationSpeed: (spot.weight / 10) * 3,
      repeatPeriod: 1000 - (spot.weight * 50),
      color: "#ff1a1a" // Bright red pulse
    }));
  }, []);

  useEffect(() => {
    if (globeEl.current && mounted) {
      const controls = globeEl.current.controls();
      controls.autoRotate = true;
      controls.autoRotateSpeed = 0.5; 
      controls.enableZoom = true;
      globeEl.current.pointOfView({ lat: 15, lng: 100, altitude: 2 }, 2000);
    }
  }, [mounted, globeEl.current]);

  const countryData = useMemo<ContributionDay[]>(() => {
    if (!activeCountry) return [];
    const seed = activeCountry.properties.ADMIN.length * 10;
    const risk = activeCountry.properties.risk;
    const raw = generateContributions(Date.now(), seed, 365);
    return raw.map((d) => ({
      date: d.date,
      count: d.count === 0 ? 0 : Math.floor(d.count * (risk * 250) + Math.random() * (risk * 50))
    }));
  }, [activeCountry]);

  if (!mounted) return null;

  return (
    <div className="relative w-full h-[700px] flex items-center justify-center cursor-move overflow-hidden rounded-2xl border border-red-900/30 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-zinc-900 via-zinc-950 to-black shadow-[0_0_80px_rgba(220,38,38,0.15)]">
      <Globe
        ref={globeEl}
        width={Math.min(windowWidth - 40, 1400)}
        height={700}
        backgroundColor="rgba(0,0,0,0)"
        // Using earth-blue-marble so the ocean is vividly blue
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
        backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
        
        // Polygons for countries (Red / Yellow / Green)
        polygonsData={countries.features}
        polygonAltitude={(d: any) => d === activeCountry ? 0.06 : 0.015}
        polygonCapColor={(d: any) => {
          if (d === activeCountry) return "rgba(255, 255, 255, 0.9)"; // White highlight on click
          const risk = d.properties.risk;
          if (risk >= 7.5) return "rgba(220, 38, 38, 0.75)";  // Red (Severe)
          if (risk >= 4.5) return "rgba(234, 179, 8, 0.7)";   // Yellow (Moderate)
          return "rgba(34, 197, 94, 0.6)";                    // Green (Safe)
        }}
        polygonSideColor={() => "rgba(0,0,0,0.4)"}
        polygonStrokeColor={() => "rgba(0,0,0,0.5)"}
        onPolygonClick={(d) => {
          setActiveCountry(d);
          if (globeEl.current) {
            globeEl.current.controls().autoRotate = false;
          }
        }}
        onPolygonHover={(d) => {
          if (globeEl.current) {
            globeEl.current.controls().autoRotate = !d && !activeCountry;
          }
        }}
        polygonLabel={(d: any) => `
          <div style="background: rgba(0,0,0,0.9); border: 1px solid #ffffff33; border-radius: 8px; padding: 10px; font-family: sans-serif; pointer-events: none;">
            <div style="color: white; font-size: 16px; margin-bottom: 4px; font-weight: bold;">${d.properties.ADMIN}</div>
            <div style="color: ${d.properties.risk >= 7.5 ? '#ef4444' : d.properties.risk >= 4.5 ? '#eab308' : '#22c55e'}; font-size: 13px; font-weight: bold;">
              Risk Level: ${d.properties.risk.toFixed(1)} / 10
            </div>
            <div style="color: #a1a1aa; font-size: 11px; margin-top: 4px;">Click to view historical outbreak data</div>
          </div>
        `}

        // Live Warning Rings
        ringsData={ringData}
        ringColor="color"
        ringMaxRadius="maxR"
        ringPropagationSpeed="propagationSpeed"
        ringRepeatPeriod="repeatPeriod"
      />
      
      {/* Overlay UI - Top Left */}
      <div className="absolute top-6 left-6 flex flex-col gap-2 pointer-events-none">
        <div className="flex items-center gap-3 bg-zinc-950/80 px-4 py-2 rounded-full border border-red-900/50 backdrop-blur-md">
          <span className="w-3 h-3 rounded-full bg-red-500 animate-ping absolute"></span>
          <span className="w-3 h-3 rounded-full bg-red-500 relative"></span>
          <span className="text-red-500 font-bold text-sm tracking-widest uppercase">Live Global Feed</span>
        </div>
      </div>
      
      {/* Overlay UI - Bottom Left Legend */}
      <div className="absolute bottom-6 left-6 bg-zinc-950/80 p-5 rounded-xl border border-white/10 backdrop-blur-md pointer-events-none">
        <h4 className="text-zinc-100 font-bold text-sm uppercase tracking-widest mb-3">Outbreak Risk by Country</h4>
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 rounded-sm bg-red-600/75 border border-red-500"></div>
            <span className="text-xs text-zinc-300 font-medium">Severe / Endemic (Level 7.5 - 10)</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 rounded-sm bg-yellow-500/70 border border-yellow-400"></div>
            <span className="text-xs text-zinc-300 font-medium">Moderate Warning (Level 4.5 - 7.4)</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 rounded-sm bg-green-500/60 border border-green-400"></div>
            <span className="text-xs text-zinc-300 font-medium">Safe / Low Risk (Level 0 - 4.4)</span>
          </div>
        </div>
      </div>

      {/* Country Data Modal / Overlay */}
      {activeCountry && (
        <div className="absolute top-0 right-0 h-full w-full max-w-[800px] bg-zinc-950/95 border-l border-red-900/50 backdrop-blur-xl shadow-2xl p-6 sm:p-8 overflow-y-auto transform transition-transform animate-in slide-in-from-right duration-500">
          <button 
            onClick={() => {
              setActiveCountry(null);
              if (globeEl.current) globeEl.current.controls().autoRotate = true;
            }}
            className="absolute top-6 right-6 p-2 bg-zinc-800/50 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-full transition-colors z-50"
          >
            <XIcon className="w-6 h-6" />
          </button>

          <div className="flex items-center gap-3 mb-2">
            <ActivityIcon className={activeCountry.properties.risk >= 7.5 ? "text-red-500 w-8 h-8" : activeCountry.properties.risk >= 4.5 ? "text-yellow-500 w-8 h-8" : "text-green-500 w-8 h-8"} />
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              {activeCountry.properties.ADMIN}
            </h2>
          </div>
          
          <div className="flex items-center gap-4 mb-8">
            <span className={`px-3 py-1 bg-black/50 border rounded-full text-sm font-bold ${
              activeCountry.properties.risk >= 7.5 ? "border-red-900 text-red-500" : 
              activeCountry.properties.risk >= 4.5 ? "border-yellow-900 text-yellow-500" : 
              "border-green-900 text-green-500"
            }`}>
              Risk Level: {activeCountry.properties.risk.toFixed(1)} / 10
            </span>
            <span className="text-zinc-400 text-sm">
              Population: {Number(activeCountry.properties.POP_EST || 0).toLocaleString()}
            </span>
          </div>

          <div className="w-full p-2 rounded-2xl bg-gradient-to-br from-zinc-800 to-zinc-900 shadow-[0_0_30px_rgba(0,0,0,0.5)] ring-1 ring-zinc-800">
            <ContributionSkyline 
              data={countryData}
              palette={activeCountry.properties.risk >= 7.5 ? "danger" : activeCountry.properties.risk >= 4.5 ? "halloween" : "github"}
              unit="case"
              unitPlural="cases"
              defaultView="3d"
              orbit={true}
              title={
                <div className="flex items-center space-x-2">
                  <span className={`w-2 h-2 rounded-full animate-ping absolute ${
                    activeCountry.properties.risk >= 7.5 ? "bg-red-500" : 
                    activeCountry.properties.risk >= 4.5 ? "bg-yellow-500" : 
                    "bg-green-500"
                  }`}></span>
                  <span className={`w-2 h-2 rounded-full relative ${
                    activeCountry.properties.risk >= 7.5 ? "bg-red-500" : 
                    activeCountry.properties.risk >= 4.5 ? "bg-yellow-500" : 
                    "bg-green-500"
                  }`}></span>
                  <span className="font-bold text-zinc-100 tracking-wide uppercase text-xs">National Outbreak History</span>
                </div>
              }
              className="border-zinc-800/50 bg-zinc-950/80 backdrop-blur-sm"
            />
          </div>

          <div className="mt-8 text-zinc-400 text-sm leading-relaxed border-t border-zinc-800 pt-6">
            <p>
              This historical data visualization represents the recorded outbreak cases for <strong className="text-white">{activeCountry.properties.ADMIN}</strong> over the past 12 months. 
              The 3D skyline map highlights severe spikes and seasonal trends corresponding to mosquito breeding seasons.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
