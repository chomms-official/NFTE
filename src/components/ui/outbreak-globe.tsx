"use client";

import React, { useEffect, useState, useRef, useMemo } from "react";
import dynamic from "next/dynamic";
import { XIcon, ActivityIcon, DropletsIcon, BugIcon, WindIcon } from "lucide-react";
import ContributionSkyline, { generateContributions, ContributionDay } from "./contribution-skyline";

const Globe = dynamic(() => import("react-globe.gl"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center w-full h-[700px]">
      <div className="w-16 h-16 border-4 border-red-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
  ),
});

type MosquitoType = "aedes" | "anopheles" | "culex";

const MOSQUITO_DATA: Record<MosquitoType, {
  name: string;
  diseases: string;
  icon: any;
  riskMap: Record<string, number>;
  hotspots: Array<{lat: number, lng: number, city: string, weight: number}>;
}> = {
  aedes: {
    name: "AEDES",
    diseases: "Dengue, Chikungunya, Zika, Yellow Fever",
    icon: DropletsIcon, // Represents blood/tropical rain
    riskMap: {
      "Brazil": 9.8, "India": 9.5, "Indonesia": 9.2, "Philippines": 8.8,
      "Thailand": 8.5, "Vietnam": 8.1, "Bangladesh": 8.0, "Colombia": 7.9, 
      "Nigeria": 7.5, "Democratic Republic of the Congo": 7.0, "Mexico": 6.8,
      "Malaysia": 7.2, "Argentina": 6.2, "Pakistan": 5.5, "Saudi Arabia": 5.0,
      "United States of America": 3.5,
    },
    hotspots: [
      { lat: -23.5505, lng: -46.6333, city: "São Paulo, Brazil", weight: 9.8 },
      { lat: 13.7563, lng: 100.5018, city: "Bangkok, Thailand", weight: 8.5 },
      { lat: -6.2088, lng: 106.8456, city: "Jakarta, Indonesia", weight: 9.2 },
      { lat: 14.5995, lng: 120.9842, city: "Manila, Philippines", weight: 8.8 },
    ]
  },
  anopheles: {
    name: "ANOPHELES",
    diseases: "Malaria",
    icon: BugIcon,
    riskMap: {
      "Nigeria": 9.9, "Democratic Republic of the Congo": 9.8, "Uganda": 9.5, 
      "Mozambique": 9.2, "Angola": 8.9, "Burkina Faso": 8.7, "Mali": 8.5,
      "India": 7.8, "Papua New Guinea": 8.0, "Brazil": 6.5, "Colombia": 5.5,
      "Pakistan": 6.0, "Indonesia": 6.5, "Myanmar": 7.0,
      "United States of America": 0.5, "China": 1.0, "Thailand": 3.0, "Argentina": 1.0
    },
    hotspots: [
      { lat: 9.0820, lng: 8.6753, city: "Abuja, Nigeria", weight: 9.9 },
      { lat: -4.3224, lng: 15.3070, city: "Kinshasa, DRC", weight: 9.8 },
      { lat: 0.3476, lng: 32.5825, city: "Kampala, Uganda", weight: 9.5 },
      { lat: -25.9692, lng: 32.5732, city: "Maputo, Mozambique", weight: 9.2 },
    ]
  },
  culex: {
    name: "CULEX",
    diseases: "Japanese Encephalitis (JE), West Nile Virus",
    icon: WindIcon, // Represents airborne/widespread
    riskMap: {
      "United States of America": 7.5, "China": 8.0, "India": 8.5, "Italy": 6.5,
      "Greece": 6.0, "Egypt": 6.5, "Vietnam": 7.8, "Thailand": 7.5, 
      "Indonesia": 7.0, "Philippines": 7.0, "Japan": 5.0, "South Korea": 5.5,
      "Russia": 4.0, "Brazil": 3.0, "Nigeria": 4.0, "Australia": 5.0
    },
    hotspots: [
      { lat: 39.9042, lng: 116.4074, city: "Beijing, China", weight: 8.0 },
      { lat: 28.6139, lng: 77.2090, city: "New Delhi, India", weight: 8.5 },
      { lat: 40.7128, lng: -74.0060, city: "New York, USA", weight: 7.5 },
      { lat: 41.9028, lng: 12.4964, city: "Rome, Italy", weight: 6.5 },
    ]
  }
};

function getRiskColor(risk: number) {
  if (risk >= 7.5) return "#dc2626"; // Red
  if (risk >= 4.5) return "#f97316"; // Orange
  return "#eab308"; // Yellow
}

function getRiskColorRGBA(risk: number, opacity: number) {
  if (risk >= 7.5) return `rgba(220, 38, 38, ${opacity})`;
  if (risk >= 4.5) return `rgba(249, 115, 22, ${opacity})`;
  return `rgba(234, 179, 8, ${opacity})`;
}

export default function OutbreakGlobe() {
  const globeEl = useRef<any>(null);
  const [mounted, setMounted] = useState(false);
  const [windowWidth, setWindowWidth] = useState(800);
  const [activeMosquito, setActiveMosquito] = useState<MosquitoType>("aedes");
  const [geoJsonData, setGeoJsonData] = useState<any[]>([]);
  const [activeCountry, setActiveCountry] = useState<any>(null);

  const [windowHeight, setWindowHeight] = useState(800);

  // Responsive setup
  useEffect(() => {
    setMounted(true);
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
      setWindowHeight(window.innerHeight);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    
    // Fetch topology only once
    fetch("https://raw.githubusercontent.com/vasturiano/react-globe.gl/master/example/datasets/ne_110m_admin_0_countries.geojson")
      .then(res => res.json())
      .then(data => {
        setGeoJsonData(data.features);
      });
      
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Compute countries with currently selected mosquito risk data
  const countries = useMemo(() => {
    if (!geoJsonData.length) return [];
    
    const currentData = MOSQUITO_DATA[activeMosquito].riskMap;
    
    return geoJsonData.map((f: any) => {
      const name = f.properties.ADMIN || f.properties.NAME;
      let risk = currentData[name];
      
      if (risk === undefined) {
        // Fallback default logic based on mosquito type
        const lat = f.geometry.coordinates?.[0]?.[0]?.[0]?.[1] || 0;
        const absLat = Math.abs(lat);
        
        if (activeMosquito === "aedes") {
          risk = absLat < 35 ? Math.random() * 3 + 2 : Math.random();
        } else if (activeMosquito === "anopheles") {
          risk = absLat < 20 ? Math.random() * 2 + 1 : Math.random();
        } else {
          // Culex is more widespread
          risk = absLat < 50 ? Math.random() * 3 + 2 : Math.random();
        }
      }
      
      return { ...f, properties: { ...f.properties, risk } };
    });
  }, [geoJsonData, activeMosquito]);

  // Compute hotspots for the active mosquito
  const ringData = useMemo(() => {
    return MOSQUITO_DATA[activeMosquito].hotspots.map(spot => ({
      lat: spot.lat,
      lng: spot.lng,
      maxR: spot.weight * 1.2,
      propagationSpeed: (spot.weight / 10) * 3,
      repeatPeriod: 1000 - (spot.weight * 50),
      color: "#ff1a1a", // Hotspots are always alarming red
      city: spot.city,
      weight: spot.weight
    }));
  }, [activeMosquito]);

  // Setup globe controls on mount/change
  useEffect(() => {
    if (globeEl.current && mounted) {
      const controls = globeEl.current.controls();
      controls.autoRotate = true;
      controls.autoRotateSpeed = 0.5; 
      controls.enableZoom = true;
      
      // If no active country, look at the first hotspot of the active mosquito
      if (!activeCountry && MOSQUITO_DATA[activeMosquito].hotspots.length > 0) {
        const spot = MOSQUITO_DATA[activeMosquito].hotspots[0];
        globeEl.current.pointOfView({ lat: spot.lat, lng: spot.lng, altitude: 2.2 }, 1500);
      }
    }
  }, [mounted, activeMosquito, globeEl.current]);

  // Compute skyline historical data for the clicked country
  const countryData = useMemo<ContributionDay[]>(() => {
    if (!activeCountry) return [];
    const seed = activeCountry.properties.ADMIN.length * 10 + (activeMosquito.length * 5);
    const risk = activeCountry.properties.risk;
    const raw = generateContributions(Date.now(), seed, 365);
    return raw.map((d) => ({
      date: d.date,
      count: d.count === 0 ? 0 : Math.floor(d.count * (risk * 250) + Math.random() * (risk * 50))
    }));
  }, [activeCountry, activeMosquito]);

  if (!mounted) return null;

  return (
    <div className="relative w-screen h-screen flex items-center justify-center overflow-hidden bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-zinc-900 via-[#0a0a0a] to-black m-0 p-0">
      
      <div className="absolute inset-0 cursor-move">
        <Globe
          ref={globeEl}
          width={windowWidth}
          height={windowHeight}
          backgroundColor="rgba(0,0,0,0)"
          globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
          backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
          
          // Polygons (Red, Orange, Yellow)
          polygonsData={countries}
          polygonAltitude={(d: any) => d.properties.ADMIN === activeCountry?.properties?.ADMIN ? 0.01 : 0.005}
          polygonCapColor={(d: any) => {
            if (d.properties.ADMIN === activeCountry?.properties?.ADMIN) return "rgba(255, 255, 255, 0.9)"; 
            return getRiskColor(d.properties.risk);
          }}
          polygonSideColor={() => "rgba(0, 0, 0, 0.05)"}
          polygonStrokeColor={() => "rgba(255, 255, 255, 0.1)"}
          onPolygonClick={(d: any) => {
            setActiveCountry(d);
            if (globeEl.current) {
              globeEl.current.controls().autoRotate = false;
              // Point to the clicked country
              const centerLat = d.geometry.coordinates[0]?.[0]?.[0]?.[1] || 0;
              const centerLng = d.geometry.coordinates[0]?.[0]?.[0]?.[0] || 0;
              globeEl.current.pointOfView({ lat: centerLat, lng: centerLng, altitude: 1.5 }, 1000);
            }
          }}
          onPolygonHover={(d) => {
            if (globeEl.current && !activeCountry) {
              globeEl.current.controls().autoRotate = !d;
            }
          }}
          polygonLabel={(d: any) => `
            <div style="background: rgba(10,10,10,0.95); border: 1px solid #3f3f46; border-radius: 12px; padding: 12px; font-family: sans-serif; pointer-events: none; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
              <div style="color: white; font-size: 16px; margin-bottom: 6px; font-weight: bold;">${d.properties.ADMIN}</div>
              <div style="color: ${getRiskColor(d.properties.risk)}; font-size: 14px; font-weight: bold; text-transform: uppercase;">
                ${MOSQUITO_DATA[activeMosquito].name} Risk: ${d.properties.risk.toFixed(1)} / 10
              </div>
              <div style="color: #a1a1aa; font-size: 12px; margin-top: 6px;">Click to view historical outbreak data</div>
            </div>
          `}

          // Active Pulsing Hotspots
          ringsData={ringData}
          ringColor="color"
          ringMaxRadius="maxR"
          ringPropagationSpeed="propagationSpeed"
          ringRepeatPeriod="repeatPeriod"
        />
      </div>

      {/* TOP CONTROLS: Mosquito Selectors */}
      <div className="absolute top-4 sm:top-6 left-1/2 transform -translate-x-1/2 flex items-center justify-center gap-1 sm:gap-3 bg-black/60 p-1 sm:p-2 rounded-2xl border border-white/10 backdrop-blur-xl shadow-2xl z-[60] w-max max-w-[95vw] overflow-x-auto overflow-y-hidden no-scrollbar">
        {(Object.entries(MOSQUITO_DATA) as [MosquitoType, any][]).map(([key, data]) => {
          const isActive = activeMosquito === key;
          const Icon = data.icon;
          return (
            <button
              key={key}
              onClick={() => {
                setActiveMosquito(key);
              }}
              className={`flex items-center gap-1.5 sm:gap-2 px-3 py-2 sm:px-5 sm:py-3 rounded-xl font-bold text-xs sm:text-sm tracking-wide transition-all duration-300 whitespace-nowrap ${
                isActive 
                  ? "bg-red-600/90 text-white shadow-[0_0_20px_rgba(220,38,38,0.5)] border border-red-500 scale-100 sm:scale-105" 
                  : "bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-zinc-200 border border-transparent"
              }`}
            >
              <Icon className={`w-4 h-4 sm:w-5 sm:h-5 shrink-0 ${isActive ? "animate-pulse" : ""}`} />
              <div className="flex flex-col items-start text-left">
                <span className="leading-none">{data.name}</span>
                <span className={`text-[8px] sm:text-[9px] font-medium tracking-tighter mt-1 opacity-80 ${isActive ? "text-red-100" : "text-zinc-500"}`}>
                  {data.diseases.split(",")[0]}
                </span>
              </div>
            </button>
          );
        })}
      </div>
      
      {/* Overlay UI - Bottom Left Legend */}
      <div className="absolute bottom-4 sm:bottom-6 left-4 sm:left-6 bg-black/70 p-3 sm:p-5 rounded-2xl border border-white/10 backdrop-blur-xl pointer-events-none z-10 shadow-2xl scale-90 sm:scale-100 origin-bottom-left">
        <h4 className="text-white font-black text-sm uppercase tracking-widest mb-4 flex items-center gap-2">
          <ActivityIcon className="w-4 h-4 text-red-500" /> 
          Risk Heatmap (Live)
        </h4>
        <div className="flex flex-col gap-3.5">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 rounded-[4px] bg-red-600/80 border border-red-400 shadow-[0_0_12px_rgba(220,38,38,0.6)]"></div>
            <span className="text-xs text-zinc-200 font-semibold tracking-wide">Severe (Level 7.5 - 10)</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 rounded-[4px] bg-orange-500/80 border border-orange-400 shadow-[0_0_12px_rgba(249,115,22,0.4)]"></div>
            <span className="text-xs text-zinc-300 font-medium tracking-wide">Moderate (Level 4.5 - 7.4)</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 rounded-[4px] bg-yellow-500/80 border border-yellow-400 shadow-[0_0_12px_rgba(234,179,8,0.3)]"></div>
            <span className="text-xs text-zinc-300 font-medium tracking-wide">Low Risk (Level 0 - 4.4)</span>
          </div>
        </div>
      </div>

      {/* Selected Disease Info - Bottom Right */}
      <div className="absolute bottom-6 right-6 max-w-xs bg-black/70 p-5 rounded-2xl border border-white/10 backdrop-blur-xl pointer-events-none z-10 shadow-2xl hidden sm:block">
        <h4 className="text-white font-black text-sm uppercase tracking-widest mb-2 border-b border-white/10 pb-2">
          {MOSQUITO_DATA[activeMosquito].name} Vectors
        </h4>
        <p className="text-xs text-zinc-400 leading-relaxed">
          Primarily responsible for transmitting <strong className="text-zinc-200">{MOSQUITO_DATA[activeMosquito].diseases}</strong>. 
          The data points highlight current highly active global breeding clusters.
        </p>
      </div>

      {/* Country Data Modal / Overlay */}
      {activeCountry && (
        <div className="absolute top-0 right-0 h-full w-full max-w-[850px] bg-black/80 border-l border-white/10 backdrop-blur-2xl shadow-2xl p-6 sm:p-10 overflow-y-auto transform transition-transform animate-in slide-in-from-right duration-500 z-50">
          <button 
            onClick={() => {
              setActiveCountry(null);
              if (globeEl.current) globeEl.current.controls().autoRotate = true;
            }}
            className="absolute top-8 right-8 p-3 bg-white/5 hover:bg-white/15 text-zinc-400 hover:text-white rounded-full transition-all duration-300 backdrop-blur-md border border-white/10"
          >
            <XIcon className="w-6 h-6" />
          </button>

          <div className="flex items-center gap-4 mb-4 mt-4">
            {(() => {
              const Icon = MOSQUITO_DATA[activeMosquito].icon as any;
              return <Icon className="w-10 h-10" style={{ color: getRiskColor(activeCountry.properties.risk) }} />;
            })()}
            <h2 className="text-4xl sm:text-5xl font-black text-white tracking-tighter">
              {activeCountry.properties.ADMIN}
            </h2>
          </div>
          
          <div className="flex flex-wrap items-center gap-4 mb-10">
            <span 
              className="px-4 py-2 border rounded-full text-sm font-black uppercase tracking-widest"
              style={{ 
                borderColor: getRiskColorRGBA(activeCountry.properties.risk, 0.5), 
                color: getRiskColor(activeCountry.properties.risk),
                backgroundColor: getRiskColorRGBA(activeCountry.properties.risk, 0.1)
              }}
            >
              Risk Level: {activeCountry.properties.risk.toFixed(1)} / 10
            </span>
            <span className="text-zinc-400 text-sm font-medium tracking-wide bg-white/5 px-4 py-2 rounded-full border border-white/5">
              Population: {Number(activeCountry.properties.POP_EST || 0).toLocaleString()}
            </span>
          </div>

          <div className="w-full p-3 rounded-[2rem] bg-gradient-to-br from-zinc-800/80 to-zinc-950 shadow-2xl ring-1 ring-white/10 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1" style={{ backgroundColor: getRiskColor(activeCountry.properties.risk) }}></div>
            
            <ContributionSkyline 
              data={countryData}
              palette={activeCountry.properties.risk >= 7.5 ? "danger" : activeCountry.properties.risk >= 4.5 ? "ember" : "halloween"}
              unit="case"
              unitPlural="cases"
              defaultView="3d"
              orbit={true}
              title={
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full animate-ping absolute" style={{ backgroundColor: getRiskColor(activeCountry.properties.risk) }}></span>
                  <span className="w-2.5 h-2.5 rounded-full relative" style={{ backgroundColor: getRiskColor(activeCountry.properties.risk) }}></span>
                  <span className="font-bold text-white tracking-widest uppercase text-xs">
                    {MOSQUITO_DATA[activeMosquito].name} Outbreak History
                  </span>
                </div>
              }
              className="border-none bg-transparent"
            />
          </div>

          <div className="mt-10 text-zinc-400 text-sm leading-relaxed border-t border-white/10 pt-8 max-w-2xl">
            <p>
              This historical data visualization represents the recorded <strong className="text-white">{MOSQUITO_DATA[activeMosquito].diseases}</strong> outbreak cases for <strong className="text-white">{activeCountry.properties.ADMIN}</strong> over the past 12 months. 
              The 3D skyline map highlights severe spikes and seasonal trends corresponding to mosquito breeding seasons.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
