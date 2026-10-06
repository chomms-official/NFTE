"use client";

import React, { useEffect, useState, useRef, useMemo } from "react";
import dynamic from "next/dynamic";

// Dynamically import react-globe.gl to avoid SSR issues with canvas/window
const Globe = dynamic(() => import("react-globe.gl"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center w-full h-full min-h-[500px]">
      <div className="w-16 h-16 border-4 border-red-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
  ),
});

export default function OutbreakGlobe() {
  const globeEl = useRef<any>(null);
  const [mounted, setMounted] = useState(false);
  
  // Use window size for responsive globe
  const [windowWidth, setWindowWidth] = useState(800);
  
  useEffect(() => {
    setMounted(true);
    const handleResize = () => setWindowWidth(window.innerWidth);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Generate mosquito outbreak data centered around tropical/subtropical regions
  const outbreakData = useMemo(() => {
    if (!mounted) return [];
    const data = [];
    // 2000 random outbreak clusters
    for (let i = 0; i < 2000; i++) {
      // Mosquitoes thrive near the equator (roughly -40 to +40 latitude)
      // We use a bell curve distribution to concentrate them near the equator
      const u = Math.random();
      const v = Math.random();
      let lat = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v) * 20;
      lat = Math.max(-60, Math.min(60, lat)); // Cap at lat 60

      const lng = (Math.random() - 0.5) * 360;

      // Severity (weight) based on proximity to equator + randomness
      const equatorProximity = 1 - Math.abs(lat) / 60;
      const weight = Math.random() * 0.8 + (equatorProximity * 0.5);

      data.push({ lat, lng, weight });
    }
    return data;
  }, [mounted]);

  useEffect(() => {
    if (globeEl.current) {
      // Setup auto-rotation
      const controls = globeEl.current.controls();
      controls.autoRotate = true;
      controls.autoRotateSpeed = 1.5; // Spin nicely
      controls.enableZoom = true;
    }
  }, [mounted, globeEl.current]);

  if (!mounted) return null;

  return (
    <div className="relative w-full h-[600px] flex items-center justify-center cursor-move overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950/80 shadow-[0_0_50px_rgba(220,38,38,0.1)]">
      <Globe
        ref={globeEl}
        width={Math.min(windowWidth - 40, 1000)}
        height={600}
        backgroundColor="rgba(0,0,0,0)"
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-dark.jpg"
        bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
        
        // Hexbin for 3D red bars
        hexBinPointsData={outbreakData}
        hexBinPointWeight="weight"
        hexBinResolution={4}
        hexMargin={0.2}
        hexTopColor={(d) => weightToColor(d.sumWeight, true)}
        hexSideColor={(d) => weightToColor(d.sumWeight, false)}
        hexAltitude={(d) => Math.max(0.01, d.sumWeight * 0.008)}
        hexBinMerge={true}
        hexTransitionDuration={1000}
      />
      
      {/* Overlay UI */}
      <div className="absolute bottom-4 left-4 bg-zinc-950/80 p-4 rounded-lg border border-red-900/50 backdrop-blur-md pointer-events-none">
        <h4 className="text-red-500 font-bold text-sm uppercase tracking-wider mb-2">Outbreak Severity Map</h4>
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-sm bg-[#ff1a1a] shadow-[0_0_10px_#ff1a1a]"></div>
            <span className="text-xs text-zinc-300">Critical Outbreak (High Density)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-sm bg-[#b30000]"></div>
            <span className="text-xs text-zinc-300">Moderate Warning</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-sm bg-[#4d0000]"></div>
            <span className="text-xs text-zinc-300">Low Risk Cases</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function weightToColor(weight: number, isTop: boolean) {
  // Map sumWeight to a red color gradient
  // High weight = bright glowing red
  // Low weight = dark blood red
  if (weight > 15) {
    return isTop ? "#ff1a1a" : "#cc0000"; 
  } else if (weight > 8) {
    return isTop ? "#e60000" : "#990000";
  } else if (weight > 4) {
    return isTop ? "#b30000" : "#660000";
  } else {
    return isTop ? "#800000" : "#330000";
  }
}
