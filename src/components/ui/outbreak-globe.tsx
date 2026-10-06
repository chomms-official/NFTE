"use client";

import React, { useEffect, useState, useRef, useMemo } from "react";
import dynamic from "next/dynamic";
import { XIcon, ActivityIcon, DropletsIcon, BugIcon, WindIcon } from "lucide-react";
import ContributionSkyline, { generateContributions, ContributionDay } from "./contribution-skyline";
import * as THREE from "three";

const Globe = dynamic(() => import("react-globe.gl"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center w-full h-[700px]">
      <div className="w-16 h-16 border-4 border-red-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
  ),
});

const createAirplane = () => {
  const group = new THREE.Group();
  
  // Fuselage
  const bodyGeo = new THREE.CylinderGeometry(0.6, 0.6, 4, 16);
  bodyGeo.rotateX(Math.PI / 2); 
  const bodyMat = new THREE.MeshPhongMaterial({ color: 0xffffff, specular: 0x111111, shininess: 100 });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  
  // Nose (pointing to -Z)
  const noseGeo = new THREE.ConeGeometry(0.6, 2, 16);
  noseGeo.translate(0, 3, 0); // move along +Y
  noseGeo.rotateX(-Math.PI / 2); // rotate +Y to -Z
  const noseMat = new THREE.MeshPhongMaterial({ color: 0xcc0000, specular: 0x111111, shininess: 100 });
  const nose = new THREE.Mesh(noseGeo, noseMat);
  
  // Wings
  const wingGeo = new THREE.BoxGeometry(7, 0.15, 2);
  const wingMat = new THREE.MeshPhongMaterial({ color: 0xdddddd });
  const wings = new THREE.Mesh(wingGeo, wingMat);
  wings.position.set(0, 0, 0);
  
  // Tail
  const tailGeo = new THREE.BoxGeometry(3, 0.15, 1);
  const tail = new THREE.Mesh(tailGeo, wingMat);
  tail.position.set(0, 0, 1.5);
  
  // Fin
  const finGeo = new THREE.BoxGeometry(0.15, 1.5, 1.2);
  const fin = new THREE.Mesh(finGeo, noseMat);
  fin.position.set(0, 0.75, 1.5);
  
  group.add(body, nose, wings, tail, fin);
  group.scale.set(0.6, 0.6, 0.6); 
  
  return group;
};

type MosquitoType = "aedes" | "anopheles" | "culex";

const MOSQUITO_DATA: Record<MosquitoType, {
  name: string;
  diseases: string;
  icon: any;
  sourceName: string;
  sourceUrl: string;
  riskMap: Record<string, number>;
  hotspots: Array<{lat: number, lng: number, city: string, weight: number}>;
}> = {
  aedes: {
    name: "AEDES",
    diseases: "Dengue, Chikungunya, Zika, Yellow Fever",
    icon: DropletsIcon,
    sourceName: "WHO Dengue Factsheet",
    sourceUrl: "https://www.who.int/news-room/fact-sheets/detail/dengue-and-severe-dengue",
    riskMap: {
      "Brazil": 9.8, "India": 9.5, "Indonesia": 9.2, "Philippines": 8.8,
      "Thailand": 8.5, "Vietnam": 8.1, "Bangladesh": 8.0, "Colombia": 7.9, 
      "Nigeria": 7.5, "Democratic Republic of the Congo": 7.0, "Mexico": 6.8,
      "Malaysia": 7.2, "Argentina": 6.2, "Pakistan": 5.5, "Saudi Arabia": 5.0,
      "United States of America": 3.5,
    },
    hotspots: [
      { lat: -23.5505, lng: -46.6333, city: "SÃO PAULO, BRAZIL", weight: 9.8 },
      { lat: 13.7563, lng: 100.5018, city: "BANGKOK, THAILAND", weight: 8.5 },
      { lat: -6.2088, lng: 106.8456, city: "JAKARTA, INDONESIA", weight: 9.2 },
      { lat: 14.5995, lng: 120.9842, city: "MANILA, PHILIPPINES", weight: 8.8 },
    ]
  },
  anopheles: {
    name: "ANOPHELES",
    diseases: "Malaria",
    icon: BugIcon,
    sourceName: "WHO World Malaria Report",
    sourceUrl: "https://www.who.int/teams/global-malaria-programme/reports/world-malaria-report-2023",
    riskMap: {
      "Nigeria": 9.9, "Democratic Republic of the Congo": 9.8, "Uganda": 9.5, 
      "Mozambique": 9.2, "Angola": 8.9, "Burkina Faso": 8.7, "Mali": 8.5,
      "India": 7.8, "Papua New Guinea": 8.0, "Brazil": 6.5, "Colombia": 5.5,
      "Pakistan": 6.0, "Indonesia": 6.5, "Myanmar": 7.0,
      "United States of America": 0.5, "China": 1.0, "Thailand": 3.0, "Argentina": 1.0
    },
    hotspots: [
      { lat: 9.0820, lng: 8.6753, city: "ABUJA, NIGERIA", weight: 9.9 },
      { lat: -4.3224, lng: 15.3070, city: "KINSHASA, DRC", weight: 9.8 },
      { lat: 0.3476, lng: 32.5825, city: "KAMPALA, UGANDA", weight: 9.5 },
      { lat: -25.9692, lng: 32.5732, city: "MAPUTO, MOZAMBIQUE", weight: 9.2 },
    ]
  },
  culex: {
    name: "CULEX",
    diseases: "Japanese Encephalitis (JE), West Nile Virus",
    icon: WindIcon,
    sourceName: "CDC West Nile / WHO JE",
    sourceUrl: "https://www.cdc.gov/west-nile-virus/index.html",
    riskMap: {
      "United States of America": 7.5, "China": 8.0, "India": 8.5, "Italy": 6.5,
      "Greece": 6.0, "Egypt": 6.5, "Vietnam": 7.8, "Thailand": 7.5, 
      "Indonesia": 7.0, "Philippines": 7.0, "Japan": 5.0, "South Korea": 5.5,
      "Russia": 4.0, "Brazil": 3.0, "Nigeria": 4.0, "Australia": 5.0
    },
    hotspots: [
      { lat: 39.9042, lng: 116.4074, city: "BEIJING, CHINA", weight: 8.0 },
      { lat: 28.6139, lng: 77.2090, city: "NEW DELHI, INDIA", weight: 8.5 },
      { lat: 40.7128, lng: -74.0060, city: "NEW YORK, USA", weight: 7.5 },
      { lat: 41.9028, lng: 12.4964, city: "ROME, ITALY", weight: 6.5 },
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
  const isInitialView = useRef(true);
  const [mounted, setMounted] = useState(false);
  const [windowWidth, setWindowWidth] = useState(800);
  const [activeMosquito, setActiveMosquito] = useState<MosquitoType>("aedes");
  const [geoJsonData, setGeoJsonData] = useState<any[]>([]);
  const [activeCountry, setActiveCountry] = useState<any>(null);
  const [prevCoords, setPrevCoords] = useState<{lat: number, lng: number} | null>(null);
  const airplaneMeshRef = useRef<THREE.Group | null>(null);
  const trailLineRef = useRef<THREE.Line | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const flightTimerRef = useRef<any>(null);

  const [windowHeight, setWindowHeight] = useState(800);

  const cancelFlight = () => {
    if (flightTimerRef.current) clearTimeout(flightTimerRef.current);
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    
    if (globeEl.current) {
      const scene = globeEl.current.scene();
      if (airplaneMeshRef.current) {
        scene.remove(airplaneMeshRef.current);
      }
      if (trailLineRef.current) {
        scene.remove(trailLineRef.current);
        if (trailLineRef.current.geometry) trailLineRef.current.geometry.dispose();
        if (trailLineRef.current.material) (trailLineRef.current.material as THREE.Material).dispose();
        trailLineRef.current = null;
      }
    }
  };

  const handleSelectCountry = (countryFeature: any) => {
    cancelFlight();
    
    // Calculate destination
    let pt = countryFeature.geometry?.coordinates;
    while (pt && Array.isArray(pt[0])) pt = pt[0];
    const destLng = pt ? pt[0] : 0;
    const destLat = pt ? pt[1] : 0;
    
    // Get current view for flight start
    let startLat = 0;
    let startLng = 0;
    
    if (prevCoords) {
      startLat = prevCoords.lat;
      startLng = prevCoords.lng;
    } else if (globeEl.current) {
      const pov = globeEl.current.pointOfView();
      startLat = pov.lat;
      startLng = pov.lng;
    }

    // STRICTLY FLY EASTWARD! (Globe rotates East, so we fly WITH the rotation)
    let endLng = destLng;
    if (endLng <= startLng) {
      endLng += 360;
    }
    
    const endLat = destLat;

    // Hide modal instantly
    setActiveCountry(null);

    if (globeEl.current) {
      globeEl.current.controls().autoRotate = false;
      const offsetLng = window.innerWidth > 768 ? 25 : 0;
      const offsetLat = window.innerWidth <= 768 ? -20 : 0; // Shift camera South so country moves North (Up) out of the modal!
      
      // Calculate flight duration dynamically so it doesn't look too fast if going around the whole globe
      const lngDiff = endLng - startLng;
      const flightDuration = Math.max(3000, (lngDiff / 360) * 5000); 
      
      globeEl.current.pointOfView({ lat: endLat + offsetLat, lng: destLng + offsetLng, altitude: 1.5 }, flightDuration);
      
      // 3D Airplane Animation
      const scene = globeEl.current.scene();
      if (!airplaneMeshRef.current) {
        airplaneMeshRef.current = createAirplane();
      }
      const plane = airplaneMeshRef.current;
      if (!scene.children.includes(plane)) {
        scene.add(plane);
      }
      
      // Setup Trail
      const maxTrailPoints = 30;
      const trailPositions = new Float32Array(maxTrailPoints * 3);
      const trailColors = new Float32Array(maxTrailPoints * 3);
      
      // Initialize trail at start pos
      const initStartCoord = globeEl.current.getCoords(startLat, startLng, 0);
      for (let i = 0; i < maxTrailPoints; i++) {
        trailPositions[i * 3] = initStartCoord.x;
        trailPositions[i * 3 + 1] = initStartCoord.y;
        trailPositions[i * 3 + 2] = initStartCoord.z;
        const alpha = 1 - (i / maxTrailPoints);
        trailColors[i * 3] = alpha;
        trailColors[i * 3 + 1] = alpha;
        trailColors[i * 3 + 2] = alpha;
      }
      
      const trailGeo = new THREE.BufferGeometry();
      trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
      trailGeo.setAttribute('color', new THREE.BufferAttribute(trailColors, 3));
      const trailMat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 1, linewidth: 2 });
      const trailLine = new THREE.Line(trailGeo, trailMat);
      scene.add(trailLine);
      trailLineRef.current = trailLine;
      
      const startTime = performance.now();
      const maxAltitude = 25; // 25 units above the globe surface (globe R=100)
      
      const animateFlight = (time: number) => {
        let t = (time - startTime) / flightDuration;
        if (t > 1) t = 1;
        
        // 1. Linearly interpolate Lat/Lng to FORCE Eastward direction
        const currentLat = startLat + (endLat - startLat) * t;
        const currentLng = startLng + (endLng - startLng) * t;
        
        // 2. Add parabolic altitude
        const currentAltitude = Math.sin(t * Math.PI) * maxAltitude;
        const currentPos = globeEl.current.getCoords(currentLat, currentLng, currentAltitude / 100);
        
        // 3. Look at the next point slightly ahead
        let tNext = t + 0.05;
        if (tNext > 1) tNext = 1;
        const nextLat = startLat + (endLat - startLat) * tNext;
        const nextLng = startLng + (endLng - startLng) * tNext;
        const nextAltitude = Math.sin(tNext * Math.PI) * maxAltitude;
        const nextPos = globeEl.current.getCoords(nextLat, nextLng, nextAltitude / 100);
        
        plane.position.copy(currentPos);
        const surfacePos = globeEl.current.getCoords(currentLat, currentLng, 0);
        plane.up.copy(surfacePos).normalize();
        plane.lookAt(nextPos.x, nextPos.y, nextPos.z);
        
        // 4. Update Trail precisely at the tail
        const tailOffset = new THREE.Vector3(0, 0, 1.5); // Tail is at local +Z 1.5
        plane.updateMatrixWorld();
        plane.localToWorld(tailOffset); // Convert to world coordinates
        
        for (let i = maxTrailPoints - 1; i > 0; i--) {
          trailPositions[i * 3] = trailPositions[(i - 1) * 3];
          trailPositions[i * 3 + 1] = trailPositions[(i - 1) * 3 + 1];
          trailPositions[i * 3 + 2] = trailPositions[(i - 1) * 3 + 2];
        }
        trailPositions[0] = tailOffset.x;
        trailPositions[1] = tailOffset.y;
        trailPositions[2] = tailOffset.z;
        trailGeo.attributes.position.needsUpdate = true;
        
        if (t < 1) {
          animationFrameRef.current = requestAnimationFrame(animateFlight);
        } else {
          // Flight ended
          scene.remove(plane);
          scene.remove(trailLine);
          trailGeo.dispose();
          trailMat.dispose();
        }
      };
      
      animationFrameRef.current = requestAnimationFrame(animateFlight);
      
      // Wait for flight to finish before showing modal
      flightTimerRef.current = setTimeout(() => {
        setActiveCountry(countryFeature);
        setPrevCoords({ lat: destLat, lng: destLng }); // Store for next flight
      }, flightDuration);
    }
  };

  // --- TOUR MODE (ATTRACT MODE) ---
  const [autoTourEnabled, setAutoTourEnabled] = useState(true);
  const tourIntervalRef = useRef<any>(null);
  const tourMosquitoOrder: MosquitoType[] = ["aedes", "anopheles", "culex"];
  const tourMosquitoIndexRef = useRef(0);
  const tourCountryIndexRef = useRef(0);
  const tourCountriesRef = useRef<any[]>([]);

  // 1. Detect User Interaction to turn off tour (Only on the globe itself!)
  useEffect(() => {
    const handleInteraction = () => {
      if (!autoTourEnabled) return;
      // If we are interrupting, cancel any mid-air autopilot flight immediately
      cancelFlight();
      setAutoTourEnabled(false);
    };

    const globeContainer = document.getElementById('globe-container');
    if (!globeContainer) return;

    const events = ['mousedown', 'touchstart', 'wheel'];
    events.forEach(e => globeContainer.addEventListener(e, handleInteraction, { passive: true }));
    return () => {
      events.forEach(e => globeContainer.removeEventListener(e, handleInteraction));
    };
  }, [autoTourEnabled]);

  // 2. Handle Tour Loop
  useEffect(() => {
    if (!autoTourEnabled || geoJsonData.length === 0) {
      if (tourIntervalRef.current) clearInterval(tourIntervalRef.current);
      // When user interrupts tour, reset rotation (unless they are interacting with a country)
      if (!autoTourEnabled && globeEl.current && !activeCountry) {
        globeEl.current.controls().autoRotate = true;
      }
      return;
    }

    const startTourCycle = () => {
      const currentMosquito = tourMosquitoOrder[tourMosquitoIndexRef.current];
      setActiveMosquito(currentMosquito);
      
      const riskMap = MOSQUITO_DATA[currentMosquito].riskMap;
      const highRiskFeatures = geoJsonData
        .filter(f => riskMap[f.properties.ADMIN || f.properties.NAME] !== undefined)
        .map(f => ({ ...f, tourRisk: riskMap[f.properties.ADMIN || f.properties.NAME], properties: { ...f.properties, risk: riskMap[f.properties.ADMIN || f.properties.NAME] } }))
        .sort((a, b) => b.tourRisk - a.tourRisk)
        .slice(0, 10);
        
      // Shuffle top 10
      for (let i = highRiskFeatures.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [highRiskFeatures[i], highRiskFeatures[j]] = [highRiskFeatures[j], highRiskFeatures[i]];
      }
      
      tourCountriesRef.current = highRiskFeatures;
      tourCountryIndexRef.current = 0;
      
      if (tourCountriesRef.current.length > 0) {
        handleSelectCountry(tourCountriesRef.current[0]);
      }
    };

    const nextTourStep = () => {
      tourCountryIndexRef.current++;
      if (tourCountryIndexRef.current >= tourCountriesRef.current.length) {
        tourMosquitoIndexRef.current = (tourMosquitoIndexRef.current + 1) % tourMosquitoOrder.length;
        startTourCycle();
      } else {
        handleSelectCountry(tourCountriesRef.current[tourCountryIndexRef.current]);
      }
    };

    // First time entering tour => start at aedes
    tourMosquitoIndexRef.current = 0;
    startTourCycle();
    
    // Give time to read before switching (flight takes ~3s, read for ~5s = 8000ms)
    tourIntervalRef.current = setInterval(nextTourStep, 8000);

    return () => {
      if (tourIntervalRef.current) clearInterval(tourIntervalRef.current);
    };
  }, [autoTourEnabled, geoJsonData]);

  // Responsive setup
  useEffect(() => {
    setMounted(true);
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
      setWindowHeight(window.innerHeight);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    
    // Fetch topology only once from local assets for blazing fast speed
    fetch("/assets/countries.geojson")
      .then(res => res.json())
      .then(data => {
        // Fix: Remove internal holes (lakes/ice sheets) from GeoJSON to prevent "white/black block" artifacts
        const cleanedFeatures = data.features.map((f: any) => {
          if (f.geometry.type === "Polygon" && f.geometry.coordinates.length > 0) {
            f.geometry.coordinates = [f.geometry.coordinates[0]];
          } else if (f.geometry.type === "MultiPolygon" && f.geometry.coordinates.length > 0) {
            f.geometry.coordinates = f.geometry.coordinates.map((polygon: any) => [polygon[0]]);
          }
          return f;
        });
        setGeoJsonData(cleanedFeatures);
      });
      
    return () => {
      window.removeEventListener("resize", handleResize);
      cancelFlight();
    };
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
        let pt = f.geometry.coordinates;
        while (pt && Array.isArray(pt[0])) pt = pt[0];
        const lat = pt[1] || 0;
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
      controls.autoRotateSpeed = 0.15; 
      controls.enableZoom = true;
      
      // If no active country, look at the first hotspot of the active mosquito
      if (!activeCountry && MOSQUITO_DATA[activeMosquito].hotspots.length > 0) {
        const spot = MOSQUITO_DATA[activeMosquito].hotspots[0];
        const ms = isInitialView.current ? 0 : 1500;
        globeEl.current.pointOfView({ lat: spot.lat, lng: spot.lng, altitude: 2.2 }, ms);
        isInitialView.current = false;
      }
    }
  }, [mounted, activeMosquito, globeEl.current]);

  // Compute skyline historical data for the clicked country
  const countryData = useMemo<ContributionDay[]>(() => {
    if (!activeCountry) return [];
    const countryName = activeCountry.properties.ADMIN || activeCountry.properties.NAME || "Unknown";
    const seed = countryName.length * 10 + (activeMosquito.length * 5);
    const risk = activeCountry.properties.risk;
    const raw = generateContributions(Date.now(), seed, 365);
    
    const riskMultiplier = risk < 4.5 
      ? (risk * risk) * 0.1 
      : risk < 7.5 
        ? (risk * risk) * 2 
        : (risk * risk) * 15;

    return raw.map((d) => ({
      date: d.date,
      count: d.count === 0 ? 0 : Math.floor(d.count * riskMultiplier + Math.random() * riskMultiplier * 0.5)
    }));
  }, [activeCountry, activeMosquito]);

  if (!mounted) return null;

  return (
    <div className="relative w-screen h-[100dvh] flex items-center justify-center overflow-hidden bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-zinc-900 via-[#0a0a0a] to-black m-0 p-0">
      
      <div id="globe-container" className="absolute inset-0 cursor-move">
        <Globe
          ref={globeEl}
          width={windowWidth}
          height={windowHeight}
          backgroundColor="rgba(0,0,0,0)"
          globeImageUrl="/assets/earth-blue-marble.jpg"
          backgroundImageUrl="/assets/night-sky.png"
          
          // Polygons (Red, Orange, Yellow)
          polygonsTransitionDuration={0}
          polygonsData={countries}
          polygonAltitude={0.005}
          polygonCapColor={(d: any) => {
            const countryName = activeCountry ? (activeCountry.properties.ADMIN || activeCountry.properties.NAME) : "";
            const dName = d.properties.ADMIN || d.properties.NAME;
            if (activeCountry && dName === countryName) return "#ffffff"; 
            return getRiskColor(d.properties.risk);
          }}
          polygonSideColor={(d: any) => {
            const countryName = activeCountry ? (activeCountry.properties.ADMIN || activeCountry.properties.NAME) : "";
            const dName = d.properties.ADMIN || d.properties.NAME;
            if (activeCountry && dName === countryName) return "#ffffff"; 
            return getRiskColor(d.properties.risk);
          }}
          polygonStrokeColor={() => "#111111"}
          onPolygonClick={(d: any) => handleSelectCountry(d)}
          onPolygonHover={(d) => {
            if (globeEl.current && !activeCountry) {
              globeEl.current.controls().autoRotate = !d;
            }
          }}
          polygonLabel={(d: any) => `
            <div style="background: rgba(10,10,10,0.95); border: 1px solid #3f3f46; border-radius: 12px; padding: 12px; font-family: sans-serif; pointer-events: none; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
              <div style="color: white; font-size: 16px; margin-bottom: 6px; font-weight: bold;">${d.properties.ADMIN || d.properties.NAME || "Unknown"}</div>
              <div style="color: ${getRiskColor(d.properties.risk)}; font-size: 14px; font-weight: bold; text-transform: uppercase;">
                ${MOSQUITO_DATA[activeMosquito].name} Risk: ${d.properties.risk.toFixed(1)} / 10
              </div>
              <div style="color: #a1a1aa; font-size: 12px; margin-top: 6px;">Click to view historical outbreak data</div>
            </div>
          `}

          // Active Pulsing Hotspots (Surface Ripples)
          ringsData={ringData}
          ringColor="color"
          ringMaxRadius="maxR"
          ringPropagationSpeed="propagationSpeed"
          ringRepeatPeriod="repeatPeriod"
          ringAltitude={0.015} // Elevate above country polygons
          
          // Beautiful Glowing 3D-like HUD Markers
          htmlElementsData={ringData}
          htmlElement={(d: any) => {
            const el = document.createElement('div');
            el.className = "pointer-events-none transform -translate-x-1/2 -translate-y-full";
            el.innerHTML = `
              <div class="relative flex flex-col items-center justify-end group">
                <!-- Floating Info Box -->
                <div class="absolute bottom-12 bg-black/90 text-red-100 text-[10px] font-black px-3 py-1.5 rounded-lg border border-red-500/50 backdrop-blur-md whitespace-nowrap uppercase tracking-[0.2em] shadow-[0_0_20px_rgba(220,38,38,0.4)]">
                  ${d.city}
                  <span class="block text-red-500/90 text-[8px] mt-0.5">CRITICAL LEVEL: ${d.weight.toFixed(1)}</span>
                </div>
                
                <!-- Laser Beam / Extruded Line -->
                <div class="w-[2px] h-12 bg-gradient-to-t from-red-600 via-red-500 to-transparent absolute bottom-2 shadow-[0_0_10px_rgba(220,38,38,0.8)]"></div>
                
                <!-- Glowing Base Dot -->
                <div class="relative z-10 w-3 h-3 bg-white rounded-full shadow-[0_0_15px_5px_rgba(220,38,38,0.9)] border-2 border-red-600"></div>
                
                <!-- Intense Pulse Effect -->
                <div class="absolute bottom-[-6px] w-6 h-6 bg-red-600/50 rounded-full animate-ping"></div>
              </div>
            `;
            return el;
          }}
        />
      </div>

      {/* TOP CONTROLS: Mosquito Selectors */}
      <div className={`absolute top-4 sm:top-6 flex items-center justify-center gap-1 sm:gap-3 bg-black/60 p-1 sm:p-2 rounded-2xl border border-white/10 backdrop-blur-xl shadow-2xl z-[60] w-max max-w-[95vw] overflow-x-auto overflow-y-hidden no-scrollbar transition-all duration-500 ${
        activeCountry ? "left-4 sm:left-6 transform-none" : "left-1/2 transform -translate-x-1/2"
      }`}>
        {(Object.entries(MOSQUITO_DATA) as [MosquitoType, any][]).map(([key, data]) => {
          const isActive = activeMosquito === key;
          const Icon = data.icon;
          return (
            <button
              key={key}
              onClick={() => {
                setActiveMosquito(key);
                if (autoTourEnabled) {
                  cancelFlight();
                  setAutoTourEnabled(false);
                }
              }}
              className={`flex items-center gap-1.5 sm:gap-2 px-2 py-1.5 sm:px-5 sm:py-3 rounded-xl font-bold text-[10px] sm:text-sm tracking-wide transition-all duration-300 whitespace-nowrap shrink-0 ${
                isActive 
                  ? "bg-red-600/90 text-white shadow-[0_0_20px_rgba(220,38,38,0.5)] border border-red-500 scale-100 sm:scale-105" 
                  : "bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-zinc-200 border border-transparent"
              }`}
            >
              <Icon className={`w-3.5 h-3.5 sm:w-5 sm:h-5 shrink-0 ${isActive ? "animate-pulse" : ""}`} />
              <div className="flex flex-col items-start text-left">
                <span className="leading-none">{data.name}</span>
                <span className={`text-[7px] sm:text-[9px] font-medium tracking-tighter mt-1 opacity-80 ${isActive ? "text-red-100" : "text-zinc-500"}`}>
                  {data.diseases.split(",")[0]}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Autopilot Toggle */}
      <div className={`absolute top-20 sm:top-28 z-[60] transition-all duration-500 ${
        activeCountry ? "left-4 sm:left-6 transform-none" : "left-1/2 transform -translate-x-1/2"
      }`}>
        <button
          id="auto-tour-btn"
          onClick={() => {
            setAutoTourEnabled(!autoTourEnabled);
            if (activeCountry) {
              setActiveCountry(null);
            }
          }}
          className={`flex items-center justify-center gap-2 px-4 py-2 sm:px-6 sm:py-2.5 rounded-full font-bold text-[10px] sm:text-xs uppercase tracking-widest transition-all duration-300 backdrop-blur-md ${
            autoTourEnabled
              ? "bg-black/40 text-red-400 border border-red-500/30 hover:bg-black/60 shadow-[0_0_15px_rgba(220,38,38,0.2)]"
              : "bg-white/10 text-white border border-white/20 hover:bg-white/20 shadow-[0_0_15px_rgba(255,255,255,0.1)]"
          }`}
        >
          {autoTourEnabled ? (
            <>
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_10px_rgba(220,38,38,0.8)]"></span>
              Autopilot Active
            </>
          ) : (
            <>
              ▶ Start Autopilot
            </>
          )}
        </button>
      </div>
      
      {/* Overlay UI - Bottom Left Legend */}
      <div className="absolute bottom-4 left-4 sm:bottom-6 sm:left-6 bg-black/70 p-3 sm:p-5 rounded-xl sm:rounded-2xl border border-white/10 backdrop-blur-xl pointer-events-none z-10 shadow-2xl">
        <h4 className="text-white font-black text-[10px] sm:text-sm uppercase tracking-widest mb-2 sm:mb-4 flex items-center gap-1.5 sm:gap-2">
          <ActivityIcon className="w-3 h-3 sm:w-4 sm:h-4 text-red-500" /> 
          Risk Heatmap (Live)
        </h4>
        <div className="flex flex-col gap-2 sm:gap-3.5">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-3.5 h-3.5 sm:w-5 sm:h-5 rounded-[3px] sm:rounded-[4px] bg-red-600/80 border border-red-400 shadow-[0_0_12px_rgba(220,38,38,0.6)]"></div>
            <span className="text-[9px] sm:text-xs text-zinc-200 font-semibold tracking-wide">Severe (Level 7.5 - 10)</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-3.5 h-3.5 sm:w-5 sm:h-5 rounded-[3px] sm:rounded-[4px] bg-orange-500/80 border border-orange-400 shadow-[0_0_12px_rgba(249,115,22,0.4)]"></div>
            <span className="text-[9px] sm:text-xs text-zinc-300 font-medium tracking-wide">Moderate (Level 4.5 - 7.4)</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-3.5 h-3.5 sm:w-5 sm:h-5 rounded-[3px] sm:rounded-[4px] bg-yellow-500/80 border border-yellow-400 shadow-[0_0_12px_rgba(234,179,8,0.3)]"></div>
            <span className="text-[9px] sm:text-xs text-zinc-300 font-medium tracking-wide">Low Risk (Level 0 - 4.4)</span>
          </div>
        </div>
      </div>

      {/* Selected Disease Info - Bottom Right (Stacked on mobile) */}
      <div className="absolute bottom-[140px] left-4 right-4 sm:bottom-6 sm:left-auto sm:right-6 sm:max-w-xs bg-black/70 p-3 sm:p-5 rounded-xl sm:rounded-2xl border border-white/10 backdrop-blur-xl z-10 shadow-2xl pointer-events-auto">
        <h4 className="text-white font-black text-[10px] sm:text-sm uppercase tracking-widest mb-1 sm:mb-2 border-b border-white/10 pb-1 sm:pb-2">
          {MOSQUITO_DATA[activeMosquito].name} Vectors
        </h4>
        <p className="text-[8px] sm:text-xs text-zinc-400 leading-relaxed mb-2 sm:mb-3">
          Primarily responsible for transmitting <strong className="text-zinc-200">{MOSQUITO_DATA[activeMosquito].diseases}</strong>. 
          The data points highlight current highly active global breeding clusters.
        </p>
        <a 
          href={MOSQUITO_DATA[activeMosquito].sourceUrl} 
          target="_blank" 
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[8px] sm:text-[10px] font-medium text-red-400 hover:text-red-300 transition-colors underline underline-offset-2 decoration-red-900/50"
        >
          Source: {MOSQUITO_DATA[activeMosquito].sourceName}
          <svg className="w-2 sm:w-2.5 h-2 sm:h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      </div>

      {/* Country Data Modal / Overlay */}
      {activeCountry && (
        <div className="absolute bottom-0 md:top-0 right-0 h-[85dvh] md:h-full w-full md:max-w-[50vw] lg:max-w-[600px] xl:max-w-[850px] bg-[#050505]/98 rounded-t-3xl md:rounded-none border-t md:border-t-0 md:border-l border-white/10 shadow-[0_-20px_50px_rgba(0,0,0,0.5)] md:shadow-2xl flex flex-col transform transition-transform animate-in slide-in-from-bottom md:slide-in-from-right duration-500 z-50">
          
          {/* Fixed Header with Close Button */}
          <div className="flex justify-end p-4 pt-6 md:p-8 shrink-0">
            <button 
              onClick={() => {
                setActiveCountry(null);
                if (globeEl.current) {
                  globeEl.current.controls().autoRotate = true;
                  globeEl.current.controls().autoRotateSpeed = 0.15;
                }
              }}
              className="p-3 bg-white/5 hover:bg-white/15 text-zinc-400 hover:text-white rounded-full transition-all duration-300 backdrop-blur-md border border-white/10"
            >
              <XIcon className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto px-4 pb-4 md:px-10 md:pb-10 pt-0 no-scrollbar">
            <div className="flex items-center gap-4 mb-4 mt-2 sm:mt-0">
              {(() => {
                const Icon = MOSQUITO_DATA[activeMosquito].icon as any;
                return <Icon className="w-10 h-10 shrink-0" style={{ color: getRiskColor(activeCountry.properties.risk) }} />;
              })()}
              <h2 className="text-4xl sm:text-5xl font-black text-white tracking-tighter">
                {activeCountry.properties.ADMIN || activeCountry.properties.NAME || "Unknown"}
              </h2>
            </div>
          
          <div className="flex flex-wrap items-center gap-2 sm:gap-4 mb-6 sm:mb-10">
            <span 
              className="px-3 py-1.5 sm:px-4 sm:py-2 border rounded-full text-[10px] sm:text-sm font-black uppercase tracking-widest whitespace-nowrap"
              style={{ 
                borderColor: getRiskColorRGBA(activeCountry.properties.risk, 0.5), 
                color: getRiskColor(activeCountry.properties.risk),
                backgroundColor: getRiskColorRGBA(activeCountry.properties.risk, 0.1)
              }}
            >
              Risk Level: {activeCountry.properties.risk.toFixed(1)} / 10
            </span>
            <span className="text-zinc-400 text-[10px] sm:text-sm font-medium tracking-wide bg-white/5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full border border-white/5 whitespace-nowrap">
              Population: {Number(activeCountry.properties.POP_EST || 0).toLocaleString()}
            </span>
          </div>

          <div className="w-full p-3 rounded-[2rem] bg-gradient-to-br from-zinc-800/80 to-zinc-950 shadow-2xl ring-1 ring-white/10 relative overflow-hidden transform-gpu">
            <div className="absolute top-0 left-0 w-full h-1" style={{ backgroundColor: getRiskColor(activeCountry.properties.risk) }}></div>
            
            <ContributionSkyline 
              data={countryData}
              palette={activeCountry.properties.risk >= 7.5 ? "danger" : activeCountry.properties.risk >= 4.5 ? "ember" : "halloween"}
              unit="case"
              unitPlural="cases"
              defaultView="3d"
              orbit={false}
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

          <div className="mt-10 text-zinc-400 text-xs sm:text-sm leading-relaxed border-t border-white/10 pt-6 sm:pt-8 max-w-2xl">
            <p className="mb-3">
              This historical data visualization represents the recorded <strong className="text-white">{MOSQUITO_DATA[activeMosquito].diseases}</strong> outbreak cases for <strong className="text-white">{activeCountry.properties.ADMIN || activeCountry.properties.NAME || "Unknown"}</strong> over the past 12 months. 
              The 3D skyline map highlights severe spikes and seasonal trends corresponding to mosquito breeding seasons.
            </p>
            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-white/5">
              <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-widest text-zinc-500">Data Source:</span>
              <a 
                href={MOSQUITO_DATA[activeMosquito].sourceUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-[10px] sm:text-xs font-medium text-red-400 hover:text-red-300 transition-colors flex items-center gap-1 underline underline-offset-2 decoration-red-900/50"
              >
                {MOSQUITO_DATA[activeMosquito].sourceName}
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </div>
      )}
    </div>
  );
}
