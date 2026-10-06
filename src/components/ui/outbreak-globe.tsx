"use client";

import React, { useEffect, useState, useRef, useMemo } from "react";
import dynamic from "next/dynamic";

const Globe = dynamic(() => import("react-globe.gl"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center w-full h-[700px]">
      <div className="w-16 h-16 border-4 border-red-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
  ),
});

// Real-world high-risk dengue/malaria regions
const REAL_WORLD_HOTSPOTS = [
  { lat: -23.5505, lng: -46.6333, city: "São Paulo, Brazil", weight: 9.5 },
  { lat: -22.9068, lng: -43.1729, city: "Rio de Janeiro, Brazil", weight: 8.8 },
  { lat: 13.7563, lng: 100.5018, city: "Bangkok, Thailand", weight: 8.2 },
  { lat: -6.2088, lng: 106.8456, city: "Jakarta, Indonesia", weight: 9.1 },
  { lat: 14.5995, lng: 120.9842, city: "Manila, Philippines", weight: 7.9 },
  { lat: 19.076, lng: 72.8777, city: "Mumbai, India", weight: 8.5 },
  { lat: 28.6139, lng: 77.209, city: "New Delhi, India", weight: 7.2 },
  { lat: 6.5244, lng: 3.3792, city: "Lagos, Nigeria", weight: 9.0 },
  { lat: -4.3224, lng: 15.307, city: "Kinshasa, DRC", weight: 8.7 },
  { lat: 23.8103, lng: 90.4125, city: "Dhaka, Bangladesh", weight: 8.3 },
  { lat: 10.7626, lng: 106.6602, city: "Ho Chi Minh City, Vietnam", weight: 7.8 },
  { lat: 3.139, lng: 101.6869, city: "Kuala Lumpur, Malaysia", weight: 6.5 },
  { lat: 18.5204, lng: 73.8567, city: "Pune, India", weight: 6.8 },
  { lat: -12.0464, lng: -77.0428, city: "Lima, Peru", weight: 5.5 },
  { lat: 4.711, lng: -74.0721, city: "Bogotá, Colombia", weight: 5.0 },
  { lat: -1.2921, lng: 36.8219, city: "Nairobi, Kenya", weight: 6.0 },
];

export default function OutbreakGlobe() {
  const globeEl = useRef<any>(null);
  const [mounted, setMounted] = useState(false);
  const [windowWidth, setWindowWidth] = useState(800);
  
  useEffect(() => {
    setMounted(true);
    const handleResize = () => setWindowWidth(window.innerWidth);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Generate realistic data based on known hotspots + random spread
  const { hexData, ringData } = useMemo(() => {
    if (!mounted) return { hexData: [], ringData: [] };
    
    const hex: any[] = [];
    const rings: any[] = [];
    
    // Add primary hotspots as pulsing rings
    REAL_WORLD_HOTSPOTS.forEach(spot => {
      rings.push({
        lat: spot.lat,
        lng: spot.lng,
        maxR: spot.weight * 1.5,
        propagationSpeed: (spot.weight / 10) * 3,
        repeatPeriod: 1000 - (spot.weight * 50), // faster pulse for higher weight
        color: spot.weight > 8 ? "#ff1a1a" : "#ff4d4d",
        name: spot.city,
        cases: Math.floor(spot.weight * 15000 + Math.random() * 5000)
      });
      
      // Add cluster of hexes around hotspot
      for(let i=0; i < spot.weight * 10; i++) {
        hex.push({
          lat: spot.lat + (Math.random() - 0.5) * 5,
          lng: spot.lng + (Math.random() - 0.5) * 5,
          weight: Math.random() * spot.weight
        });
      }
    });

    // Add general tropical noise
    for (let i = 0; i < 800; i++) {
      const u = Math.random();
      const v = Math.random();
      let lat = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v) * 15;
      lat = Math.max(-45, Math.min(45, lat)); 
      const lng = (Math.random() - 0.5) * 360;
      
      const equatorProximity = 1 - Math.abs(lat) / 45;
      const weight = Math.random() * 2 + (equatorProximity * 3);

      hex.push({ lat, lng, weight });
    }
    
    return { hexData: hex, ringData: rings };
  }, [mounted]);

  useEffect(() => {
    if (globeEl.current) {
      const controls = globeEl.current.controls();
      controls.autoRotate = true;
      controls.autoRotateSpeed = 1.0;
      controls.enableZoom = true;
      
      // Point camera to Southeast Asia / India initially
      globeEl.current.pointOfView({ lat: 15, lng: 100, altitude: 2 }, 2000);
    }
  }, [mounted, globeEl.current]);

  if (!mounted) return null;

  return (
    <div className="relative w-full h-[700px] flex items-center justify-center cursor-move overflow-hidden rounded-2xl border border-red-900/30 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-zinc-900 via-zinc-950 to-black shadow-[0_0_80px_rgba(220,38,38,0.15)]">
      <Globe
        ref={globeEl}
        width={Math.min(windowWidth - 40, 1200)}
        height={700}
        backgroundColor="rgba(0,0,0,0)"
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-dark.jpg"
        bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
        
        // HexBins for static/accumulated outbreak cases
        hexBinPointsData={hexData}
        hexBinPointWeight="weight"
        hexBinResolution={4}
        hexMargin={0.2}
        hexTopColor={(d) => weightToColor(d.sumWeight, true)}
        hexSideColor={(d) => weightToColor(d.sumWeight, false)}
        hexAltitude={(d) => Math.max(0.01, d.sumWeight * 0.005)}
        hexBinMerge={true}
        hexTransitionDuration={1000}
        
        // Rings for active live outbreaks!
        ringsData={ringData}
        ringColor="color"
        ringMaxRadius="maxR"
        ringPropagationSpeed="propagationSpeed"
        ringRepeatPeriod="repeatPeriod"
      />
      
      {/* Overlay UI */}
      <div className="absolute top-6 left-6 flex flex-col gap-2 pointer-events-none">
        <div className="flex items-center gap-3 bg-zinc-950/80 px-4 py-2 rounded-full border border-red-900/50 backdrop-blur-md">
          <span className="w-3 h-3 rounded-full bg-red-500 animate-ping absolute"></span>
          <span className="w-3 h-3 rounded-full bg-red-500 relative"></span>
          <span className="text-red-500 font-bold text-sm tracking-widest uppercase">Live Global Feed</span>
        </div>
      </div>
      
      <div className="absolute bottom-6 left-6 bg-zinc-950/80 p-5 rounded-xl border border-red-900/50 backdrop-blur-md pointer-events-none">
        <h4 className="text-zinc-100 font-bold text-sm uppercase tracking-widest mb-3">Outbreak Severity (Live)</h4>
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 rounded-full border-2 border-[#ff1a1a] shadow-[0_0_10px_#ff1a1a]"></div>
            <span className="text-xs text-zinc-300 font-medium">Critical Active Zone (Pulsing)</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 rounded-sm bg-[#ff1a1a] shadow-[0_0_8px_#ff1a1a]"></div>
            <span className="text-xs text-zinc-300">High Density Cluster</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 rounded-sm bg-[#b30000]"></div>
            <span className="text-xs text-zinc-300">Moderate Warning</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 rounded-sm bg-[#4d0000]"></div>
            <span className="text-xs text-zinc-300">Low Risk Cases</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function weightToColor(weight: number, isTop: boolean) {
  if (weight > 20) {
    return isTop ? "#ff1a1a" : "#cc0000"; 
  } else if (weight > 10) {
    return isTop ? "#e60000" : "#990000";
  } else if (weight > 5) {
    return isTop ? "#b30000" : "#660000";
  } else {
    return isTop ? "#800000" : "#330000";
  }
}
