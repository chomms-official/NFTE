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

// Seed data based on region roughly for color mapping
const REGION_RISK: Record<string, number> = {
  "Brazil": 9.5,
  "Thailand": 8.2,
  "Indonesia": 9.1,
  "Philippines": 7.9,
  "India": 8.5,
  "Nigeria": 9.0,
  "Democratic Republic of the Congo": 8.7,
  "Bangladesh": 8.3,
  "Vietnam": 7.8,
  "Malaysia": 6.5,
  "Peru": 5.5,
  "Colombia": 5.0,
  "Kenya": 6.0,
};

export default function OutbreakGlobe() {
  const globeEl = useRef<any>(null);
  const [mounted, setMounted] = useState(false);
  const [windowWidth, setWindowWidth] = useState(800);
  const [countries, setCountries] = useState<{ features: any[] }>({ features: [] });
  
  // Modal state
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
        // Assign a random risk or mapped risk to each country
        const features = data.features.map((f: any) => {
          const name = f.properties.ADMIN || f.properties.NAME;
          let risk = REGION_RISK[name];
          if (risk === undefined) {
            // Assign random low/mid risk for others, lower for high latitudes
            const lat = f.geometry.coordinates?.[0]?.[0]?.[0]?.[1] || 0;
            const latRisk = 1 - Math.min(1, Math.abs(lat) / 60); // Closer to equator = higher
            risk = Math.random() * 3 + (latRisk * 4);
          }
          return { ...f, properties: { ...f.properties, risk } };
        });
        setCountries({ features });
      });
      
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (globeEl.current && mounted) {
      const controls = globeEl.current.controls();
      controls.autoRotate = true;
      controls.autoRotateSpeed = 0.5; // Slower for picking countries
      controls.enableZoom = true;
      globeEl.current.pointOfView({ lat: 15, lng: 100, altitude: 2 }, 2000);
    }
  }, [mounted, globeEl.current]);

  // Generate unique skyline data per country when clicked
  const countryData = useMemo<ContributionDay[]>(() => {
    if (!activeCountry) return [];
    const seed = activeCountry.properties.ADMIN.length * 10;
    const risk = activeCountry.properties.risk;
    const raw = generateContributions(Date.now(), seed, 365);
    return raw.map((d) => ({
      date: d.date,
      count: d.count === 0 ? 0 : Math.floor(d.count * (risk * 200) + Math.random() * (risk * 50))
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
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-water.png"
        backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
        
        // Polygons for countries
        polygonsData={countries.features}
        polygonAltitude={(d: any) => d === activeCountry ? 0.05 : 0.01}
        polygonCapColor={(d: any) => {
          if (d === activeCountry) return "rgba(220, 38, 38, 0.8)"; // Bright red
          const risk = d.properties.risk;
          if (risk > 8) return "rgba(185, 28, 28, 0.6)"; // High
          if (risk > 5) return "rgba(153, 27, 27, 0.4)"; // Med
          return "rgba(69, 10, 10, 0.2)"; // Low
        }}
        polygonSideColor={() => "rgba(0,0,0,0.2)"}
        polygonStrokeColor={() => "rgba(220, 38, 38, 0.3)"}
        onPolygonClick={(d) => {
          setActiveCountry(d);
          // Pause rotation when inspecting
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
          <div style="background: rgba(0,0,0,0.9); border: 1px solid #dc2626; border-radius: 8px; padding: 10px; font-family: sans-serif; pointer-events: none;">
            <div style="color: white; font-size: 16px; margin-bottom: 4px; font-weight: bold;">${d.properties.ADMIN}</div>
            <div style="color: #ef4444; font-size: 13px;">Risk Level: ${d.properties.risk.toFixed(1)} / 10</div>
            <div style="color: #a1a1aa; font-size: 11px; margin-top: 4px;">Click to view historical outbreak data</div>
          </div>
        `}
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
      <div className="absolute bottom-6 left-6 bg-zinc-950/80 p-5 rounded-xl border border-red-900/50 backdrop-blur-md pointer-events-none">
        <h4 className="text-zinc-100 font-bold text-sm uppercase tracking-widest mb-3">Outbreak Risk by Country</h4>
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 rounded-sm bg-red-700/60 border border-red-500"></div>
            <span className="text-xs text-zinc-300">Severe / Endemic (Level 8-10)</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 rounded-sm bg-red-800/40 border border-red-700"></div>
            <span className="text-xs text-zinc-300">Moderate Warning (Level 5-7)</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 rounded-sm bg-red-950/20 border border-red-900"></div>
            <span className="text-xs text-zinc-300">Low Risk Area (Level 0-4)</span>
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
            className="absolute top-6 right-6 p-2 bg-zinc-800/50 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-full transition-colors"
          >
            <XIcon className="w-6 h-6" />
          </button>

          <div className="flex items-center gap-3 mb-2">
            <ActivityIcon className="text-red-500 w-8 h-8" />
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              {activeCountry.properties.ADMIN}
            </h2>
          </div>
          
          <div className="flex items-center gap-4 mb-8">
            <span className="px-3 py-1 bg-red-950/50 border border-red-900 rounded-full text-red-500 text-sm font-bold">
              Risk Level: {activeCountry.properties.risk.toFixed(1)} / 10
            </span>
            <span className="text-zinc-400 text-sm">
              Population: {Number(activeCountry.properties.POP_EST || 0).toLocaleString()}
            </span>
          </div>

          <div className="w-full p-2 rounded-2xl bg-gradient-to-br from-zinc-800 to-zinc-900 shadow-[0_0_30px_rgba(220,38,38,0.1)] ring-1 ring-zinc-800">
            <ContributionSkyline 
              data={countryData}
              palette="danger"
              unit="case"
              unitPlural="cases"
              defaultView="3d"
              orbit={true}
              title={
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-ping absolute"></span>
                  <span className="w-2 h-2 rounded-full bg-red-500 relative"></span>
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
