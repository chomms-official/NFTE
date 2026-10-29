"use client";

import React, { useEffect, useState, useRef, useMemo, useCallback } from "react";
import dynamic from "next/dynamic";
import { XIcon, ActivityIcon, DropletsIcon, BugIcon, WindIcon } from "lucide-react";
import ContributionSkyline, { generateContributions, ContributionDay } from "./contribution-skyline";
import * as THREE from "three";
import { WebGLBoundary } from "./webgl-boundary";
import { SoftwareGlobe } from "./software-globe";
import { countryRisk, simulationSeed, scaleSimulatedHistory, type CountryFeature } from "@/lib/simulator";

import { countryFraming, flightDuration, flightSample, smoothFlightStep, type GlobeFlight } from "@/lib/globe-navigation";

const Globe = dynamic(() => import("react-globe.gl"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center w-full h-[700px]">
      <div className="w-16 h-16 border-4 border-red-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
  ),
});

import { createAirliner } from "@/lib/airliner";

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
      // Southeast Asia & South Asia (highest global dengue burden)
      "Brazil": 9.8, "India": 9.5, "Indonesia": 9.2, "Philippines": 8.8,
      "Thailand": 8.5, "Vietnam": 8.1, "Bangladesh": 8.0, "Colombia": 7.9,
      "Nigeria": 7.5, "Democratic Republic of the Congo": 7.0, "Mexico": 6.8,
      "Malaysia": 7.2, "Argentina": 6.2, "Pakistan": 5.5, "Saudi Arabia": 5.0,
      "United States of America": 3.5,
      // Americas
      "Venezuela": 8.5, "Peru": 7.6, "Ecuador": 7.4, "Bolivia": 7.0,
      "Paraguay": 7.8, "Honduras": 7.5, "Guatemala": 7.2, "El Salvador": 7.0,
      "Nicaragua": 7.3, "Costa Rica": 6.5, "Panama": 6.8, "Cuba": 5.8,
      "Dominican Republic": 6.5, "Haiti": 7.0, "Jamaica": 5.0, "Puerto Rico": 6.5,
      "Trinidad and Tobago": 5.8, "Guyana": 6.0, "Suriname": 5.5, "Belize": 5.2,
      "The Bahamas": 3.5, "Uruguay": 2.8, "Chile": 1.5, "Canada": 0.5,
      "Falkland Islands": 0.1,
      // Africa
      "Kenya": 7.0, "United Republic of Tanzania": 7.2, "Mozambique": 6.8,
      "Angola": 6.5, "Cameroon": 6.2, "Ghana": 6.0, "Ivory Coast": 6.5,
      "Senegal": 6.0, "Burkina Faso": 5.8, "Mali": 5.5, "Guinea": 5.5,
      "Sierra Leone": 5.2, "Liberia": 5.0, "Benin": 5.5, "Togo": 5.3,
      "Niger": 4.5, "Chad": 4.2, "Central African Republic": 5.0,
      "Republic of the Congo": 6.0, "Gabon": 5.5, "Equatorial Guinea": 5.0,
      "Uganda": 6.5, "Rwanda": 5.0, "Burundi": 5.2, "Ethiopia": 5.5,
      "Somalia": 4.8, "Somaliland": 4.5, "Djibouti": 4.8, "Eritrea": 4.0,
      "Sudan": 5.5, "South Sudan": 5.8, "Madagascar": 6.0, "Malawi": 5.5,
      "Zambia": 5.0, "Zimbabwe": 4.5, "Botswana": 3.0, "Namibia": 2.5,
      "South Africa": 3.5, "Lesotho": 1.0, "Swaziland": 2.0,
      "Mauritania": 3.5, "Western Sahara": 1.5, "Gambia": 5.0,
      "Guinea-Bissau": 5.0, "Libya": 2.0, "Tunisia": 2.5, "Algeria": 2.0,
      "Morocco": 2.5, "Egypt": 3.5,
      // Asia & Oceania
      "China": 5.5, "Myanmar": 7.5, "Cambodia": 7.8, "Laos": 7.2,
      "Sri Lanka": 7.5, "Nepal": 6.0, "Bhutan": 4.5, "Taiwan": 5.0,
      "Japan": 2.5, "South Korea": 2.0, "North Korea": 2.5,
      "Papua New Guinea": 7.0, "Solomon Islands": 6.5, "Vanuatu": 5.5,
      "Fiji": 6.0, "New Caledonia": 4.5, "East Timor": 7.0,
      "Australia": 3.5, "New Zealand": 0.5, "Mongolia": 0.5,
      "Afghanistan": 4.5, "Iran": 3.5, "Iraq": 3.0, "Syria": 2.5,
      "Jordan": 1.5, "Lebanon": 1.5, "Israel": 2.0, "Palestine": 1.8,
      "Turkey": 2.5, "Yemen": 5.5, "Oman": 3.0, "United Arab Emirates": 2.5,
      "Qatar": 2.0, "Kuwait": 1.5, "Brunei": 4.5,
      // Central Asia
      "Kazakhstan": 1.0, "Uzbekistan": 1.5, "Turkmenistan": 1.2,
      "Tajikistan": 1.5, "Kyrgyzstan": 1.0,
      // Europe (very low - occasional imported/autochthonous cases)
      "France": 2.0, "Spain": 2.0, "Portugal": 1.8, "Italy": 2.5,
      "Greece": 1.8, "Croatia": 1.5, "Germany": 0.8, "United Kingdom": 0.5,
      "Netherlands": 0.5, "Belgium": 0.5, "Austria": 0.5, "Switzerland": 0.5,
      "Poland": 0.3, "Czechia": 0.3, "Slovakia": 0.3, "Hungary": 0.5,
      "Romania": 0.8, "Bulgaria": 0.8, "Republic of Serbia": 0.5,
      "Bosnia and Herzegovina": 0.5, "Montenegro": 0.5, "Kosovo": 0.5,
      "Macedonia": 0.5, "Albania": 0.8, "Moldova": 0.3, "Ukraine": 0.5,
      "Belarus": 0.3, "Russia": 1.0, "Georgia": 0.8, "Armenia": 0.5,
      "Azerbaijan": 0.8, "Cyprus": 1.0, "Northern Cyprus": 1.0,
      "Slovenia": 0.3, "Luxembourg": 0.3,
      // Nordics
      "Sweden": 0.2, "Norway": 0.2, "Finland": 0.2, "Denmark": 0.3,
      "Iceland": 0.1, "Estonia": 0.2, "Latvia": 0.2, "Lithuania": 0.2,
      "Ireland": 0.3, "Greenland": 0.1,
      // Polar
      "Antarctica": 0.0, "French Southern and Antarctic Lands": 0.0,
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
      // Sub-Saharan Africa (highest global malaria burden - ~95% of deaths)
      "Nigeria": 9.9, "Democratic Republic of the Congo": 9.8, "Uganda": 9.5,
      "Mozambique": 9.2, "Angola": 8.9, "Burkina Faso": 8.7, "Mali": 8.5,
      "India": 7.8, "Papua New Guinea": 8.0, "Brazil": 6.5, "Colombia": 5.5,
      "Pakistan": 6.0, "Indonesia": 6.5, "Myanmar": 7.0,
      "United States of America": 0.5, "China": 1.0, "Thailand": 3.0, "Argentina": 1.0,
      // More Africa
      "Niger": 8.8, "Cameroon": 8.5, "Ghana": 8.2, "Ivory Coast": 8.0,
      "United Republic of Tanzania": 8.8, "Kenya": 7.5, "Senegal": 7.5,
      "Guinea": 8.0, "Sierra Leone": 8.2, "Liberia": 7.8, "Benin": 7.5,
      "Togo": 7.2, "Chad": 8.0, "Central African Republic": 8.5,
      "Republic of the Congo": 7.8, "Gabon": 7.0, "Equatorial Guinea": 7.5,
      "Rwanda": 7.0, "Burundi": 7.5, "Ethiopia": 7.0, "South Sudan": 9.0,
      "Sudan": 6.5, "Somalia": 7.0, "Somaliland": 6.5, "Djibouti": 5.0,
      "Eritrea": 6.0, "Madagascar": 7.5, "Malawi": 8.0, "Zambia": 7.8,
      "Zimbabwe": 6.0, "Botswana": 3.5, "Namibia": 4.0, "South Africa": 3.0,
      "Swaziland": 2.5, "Lesotho": 0.5, "Gambia": 7.5, "Guinea-Bissau": 7.0,
      "Mauritania": 5.5, "Western Sahara": 1.0,
      // Americas
      "Venezuela": 5.0, "Peru": 5.5, "Ecuador": 4.5, "Bolivia": 4.0,
      "Paraguay": 3.0, "Honduras": 4.5, "Guatemala": 4.0, "El Salvador": 3.0,
      "Nicaragua": 3.5, "Costa Rica": 2.5, "Panama": 3.5, "Cuba": 1.0,
      "Dominican Republic": 2.5, "Haiti": 5.5, "Jamaica": 1.0, "Mexico": 3.0,
      "Guyana": 5.0, "Suriname": 4.0, "Belize": 3.0, "Puerto Rico": 1.0,
      "Trinidad and Tobago": 1.5, "The Bahamas": 0.8, "Uruguay": 0.3,
      "Chile": 0.2, "Canada": 0.2, "Falkland Islands": 0.0,
      // Asia & Oceania
      "Philippines": 4.5, "Vietnam": 4.0, "Cambodia": 5.5, "Laos": 5.0,
      "Bangladesh": 4.5, "Sri Lanka": 2.0, "Nepal": 3.5, "Bhutan": 2.5,
      "Malaysia": 3.0, "Taiwan": 0.5, "Japan": 0.2, "South Korea": 0.2,
      "North Korea": 1.5, "East Timor": 6.0, "Solomon Islands": 7.0,
      "Vanuatu": 5.5, "Fiji": 2.0, "New Caledonia": 1.0,
      "Australia": 0.5, "New Zealand": 0.1, "Mongolia": 0.1,
      "Afghanistan": 5.5, "Iran": 2.5, "Iraq": 1.5, "Saudi Arabia": 2.5,
      "Yemen": 5.0, "Oman": 1.5, "United Arab Emirates": 0.5,
      "Syria": 0.5, "Jordan": 0.3, "Lebanon": 0.2, "Israel": 0.2,
      "Palestine": 0.3, "Turkey": 0.5, "Qatar": 0.3, "Kuwait": 0.3, "Brunei": 1.0,
      // Central Asia
      "Kazakhstan": 0.3, "Uzbekistan": 0.5, "Turkmenistan": 0.5,
      "Tajikistan": 1.0, "Kyrgyzstan": 0.3,
      // Europe (malaria-free, but historical/imported)
      "France": 0.2, "Spain": 0.2, "Portugal": 0.2, "Italy": 0.3,
      "Greece": 0.5, "Croatia": 0.2, "Germany": 0.1, "United Kingdom": 0.1,
      "Netherlands": 0.1, "Belgium": 0.1, "Austria": 0.1, "Switzerland": 0.1,
      "Poland": 0.1, "Czechia": 0.1, "Slovakia": 0.1, "Hungary": 0.1,
      "Romania": 0.2, "Bulgaria": 0.2, "Republic of Serbia": 0.1,
      "Bosnia and Herzegovina": 0.1, "Montenegro": 0.1, "Kosovo": 0.1,
      "Macedonia": 0.1, "Albania": 0.2, "Moldova": 0.1, "Ukraine": 0.1,
      "Belarus": 0.1, "Russia": 0.3, "Georgia": 0.3, "Armenia": 0.2,
      "Azerbaijan": 0.5, "Cyprus": 0.2, "Northern Cyprus": 0.2,
      "Slovenia": 0.1, "Luxembourg": 0.1,
      "Sweden": 0.1, "Norway": 0.1, "Finland": 0.1, "Denmark": 0.1,
      "Iceland": 0.0, "Estonia": 0.1, "Latvia": 0.1, "Lithuania": 0.1,
      "Ireland": 0.1, "Greenland": 0.0,
      // North Africa
      "Egypt": 1.5, "Libya": 0.5, "Tunisia": 0.3, "Algeria": 0.5, "Morocco": 0.5,
      // Polar
      "Antarctica": 0.0, "French Southern and Antarctic Lands": 0.0,
    },
    hotspots: [
      { lat: 9.0765, lng: 7.3986, city: "ABUJA, NIGERIA", weight: 9.9 },
      { lat: -4.3224, lng: 15.3070, city: "KINSHASA, DRC", weight: 9.8 },
      { lat: 0.3476, lng: 32.5825, city: "KAMPALA, UGANDA", weight: 9.5 },
      { lat: -25.9692, lng: 32.5732, city: "MAPUTO, MOZAMBIQUE", weight: 9.2 },
    ]
  },
  culex: {
    name: "CULEX",
    diseases: "Japanese Encephalitis (JE), West Nile Virus",
    icon: WindIcon,
    sourceName: "CDC West Nile Virus",
    sourceUrl: "https://www.cdc.gov/west-nile-virus/index.html",
    riskMap: {
      // Asia (Japanese Encephalitis endemic zone)
      "United States of America": 7.5, "China": 8.0, "India": 8.5, "Italy": 6.5,
      "Greece": 6.0, "Egypt": 6.5, "Vietnam": 7.8, "Thailand": 7.5,
      "Indonesia": 7.0, "Philippines": 7.0, "Japan": 5.0, "South Korea": 5.5,
      "Russia": 4.0, "Brazil": 3.0, "Nigeria": 4.0, "Australia": 5.0,
      // More Asia
      "Bangladesh": 7.0, "Myanmar": 7.2, "Cambodia": 7.5, "Laos": 7.0,
      "Malaysia": 6.0, "Sri Lanka": 6.5, "Nepal": 6.5, "Pakistan": 5.5,
      "Taiwan": 5.5, "North Korea": 5.0, "Bhutan": 4.5, "Brunei": 4.0,
      "East Timor": 5.0, "Papua New Guinea": 5.5, "Mongolia": 2.0,
      "Afghanistan": 3.5, "Iran": 3.5, "Iraq": 4.0, "Saudi Arabia": 3.5,
      "Yemen": 4.0, "Oman": 3.0, "United Arab Emirates": 2.5,
      "Syria": 3.0, "Jordan": 2.5, "Lebanon": 2.5, "Israel": 3.5,
      "Palestine": 2.5, "Turkey": 4.5, "Qatar": 2.0, "Kuwait": 2.0,
      // Central Asia
      "Kazakhstan": 3.0, "Uzbekistan": 3.5, "Turkmenistan": 3.0,
      "Tajikistan": 3.5, "Kyrgyzstan": 2.5, "Azerbaijan": 3.5,
      "Georgia": 3.0, "Armenia": 2.5,
      // Europe (West Nile Virus spreading)
      "France": 4.5, "Spain": 4.0, "Portugal": 3.5, "Croatia": 4.5,
      "Romania": 5.5, "Bulgaria": 4.5, "Hungary": 4.5, "Austria": 3.5,
      "Republic of Serbia": 5.0, "Bosnia and Herzegovina": 3.5,
      "Montenegro": 3.0, "Kosovo": 3.0, "Macedonia": 3.5, "Albania": 3.5,
      "Germany": 3.0, "United Kingdom": 2.0, "Netherlands": 2.5,
      "Belgium": 2.0, "Switzerland": 2.5, "Poland": 2.5, "Czechia": 2.5,
      "Slovakia": 3.0, "Moldova": 3.5, "Ukraine": 4.0, "Belarus": 2.5,
      "Cyprus": 3.5, "Northern Cyprus": 3.5, "Slovenia": 3.0,
      "Luxembourg": 2.0,
      // Nordics
      "Sweden": 1.5, "Norway": 1.0, "Finland": 1.5, "Denmark": 2.0,
      "Iceland": 0.3, "Estonia": 1.5, "Latvia": 2.0, "Lithuania": 2.0,
      "Ireland": 1.5, "Greenland": 0.2,
      // Africa
      "Democratic Republic of the Congo": 5.0, "Kenya": 4.5,
      "United Republic of Tanzania": 4.5, "Uganda": 4.0, "Ethiopia": 4.0,
      "Sudan": 4.5, "South Sudan": 4.0, "Cameroon": 4.0, "Ghana": 3.5,
      "Senegal": 4.0, "Ivory Coast": 3.5, "Burkina Faso": 3.5, "Mali": 3.5,
      "Guinea": 3.0, "Sierra Leone": 3.0, "Liberia": 3.0, "Benin": 3.5,
      "Togo": 3.0, "Niger": 3.5, "Chad": 3.5,
      "Central African Republic": 3.5, "Republic of the Congo": 3.5,
      "Gabon": 3.0, "Equatorial Guinea": 3.0, "Angola": 3.5,
      "Mozambique": 4.0, "Madagascar": 3.5, "Malawi": 3.5,
      "Zambia": 3.5, "Zimbabwe": 3.0, "Botswana": 2.5, "Namibia": 2.5,
      "South Africa": 4.0, "Swaziland": 2.0, "Lesotho": 1.0,
      "Rwanda": 3.0, "Burundi": 3.0, "Somalia": 3.5, "Somaliland": 3.0,
      "Djibouti": 3.0, "Eritrea": 3.0, "Gambia": 3.0, "Guinea-Bissau": 2.5,
      "Mauritania": 3.5, "Western Sahara": 2.0,
      "Libya": 3.5, "Tunisia": 4.0, "Algeria": 3.5, "Morocco": 3.5,
      // Americas
      "Colombia": 3.5, "Venezuela": 3.5, "Peru": 3.0, "Ecuador": 3.0,
      "Bolivia": 2.5, "Paraguay": 3.0, "Argentina": 4.0, "Chile": 1.5,
      "Mexico": 4.5, "Honduras": 3.0, "Guatemala": 3.0, "El Salvador": 3.0,
      "Nicaragua": 3.0, "Costa Rica": 2.5, "Panama": 3.0, "Cuba": 3.0,
      "Dominican Republic": 3.0, "Haiti": 3.0, "Jamaica": 2.5,
      "Puerto Rico": 3.0, "Trinidad and Tobago": 2.5, "Guyana": 2.5,
      "Suriname": 2.5, "Belize": 2.5, "The Bahamas": 2.5,
      "Uruguay": 2.5, "Canada": 4.0, "Falkland Islands": 0.2,
      // Oceania
      "Solomon Islands": 3.0, "Vanuatu": 3.0, "Fiji": 3.0,
      "New Caledonia": 2.5, "New Zealand": 1.0,
      // Polar
      "Antarctica": 0.0, "French Southern and Antarctic Lands": 0.0,
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
  const [flight, setFlight] = useState<(GlobeFlight & { countryName: string; originName: string }) | null>(null);
  const flightRef = useRef<GlobeFlight | null>(null);
  const flightIdRef = useRef(0);
  const destinationRef = useRef<CountryFeature | null>(null);
  // Country identity survives closing details and moving the camera.
  const departureRef = useRef<CountryFeature | null>(null);
  const queuedCountryRef = useRef<CountryFeature | null>(null);
  const [queuedCountryName, setQueuedCountryName] = useState<string | null>(null);
  const softwareView = useRef({ lat: 15, lng: 100, zoom: 1 });
  const mapContainer = useRef<HTMLDivElement>(null);
  const [globeReady, setGlobeReady] = useState(false);
  const [softwareReady, setSoftwareReady] = useState(false);
  const rendererReady = globeReady || softwareReady;
  const [geoJsonStatus, setGeoJsonStatus] = useState<"loading" | "ready" | "error">("loading");
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [simulationDate] = useState(() => Date.now());
  const [autoTourEnabled, setAutoTourEnabled] = useState(true);
  const autoTourEnabledRef = useRef(autoTourEnabled);
  const airplaneMeshRef = useRef<THREE.Group | null>(null);
  const trailLineRef = useRef<THREE.Line | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const [windowHeight, setWindowHeight] = useState(800);

  const cancelFlight = useCallback(() => {
    if (animationFrameRef.current !== null) cancelAnimationFrame(animationFrameRef.current);
    animationFrameRef.current = null;
    flightRef.current = null;
    destinationRef.current = null;
    queuedCountryRef.current = null;
    setQueuedCountryName(null);
    setFlight(null);
    if (mapContainer.current) mapContainer.current.dataset.flightVisible = "false";
    airplaneMeshRef.current?.removeFromParent();
    if (trailLineRef.current) {
      trailLineRef.current.removeFromParent();
      trailLineRef.current.geometry.dispose();
      (trailLineRef.current.material as THREE.Material).dispose();
      trailLineRef.current = null;
    }
  }, []);

  const attachGlobe = useMemo(() => ({
    get current() { return globeEl.current; },
    set current(instance: any) {
      globeEl.current = instance;
      if (!instance) { setGlobeReady(false); cancelFlight(); }
    },
  }), [cancelFlight]);

  const completeFlight = useCallback((id: number) => {
    if (flightRef.current?.id !== id) return;
    const destination = destinationRef.current;
    const queued = queuedCountryRef.current;
    cancelFlight();
    departureRef.current = destination;
    if (queued) {
      // Continue from the country just reached, never from an arbitrary camera view.
      selectCountryRef.current(queued);
    } else setActiveCountry(destination);
  }, [cancelFlight]);

  const panelWidth = windowWidth >= 768 ? Math.min(windowWidth * 0.48, 672) : windowWidth;
  const panelHeight = windowWidth >= 768 ? windowHeight : Math.round(windowHeight * 0.5);
  const mapWidth = activeCountry && windowWidth >= 768 ? windowWidth - panelWidth : windowWidth;
  const mapHeight = activeCountry && windowWidth < 768 ? windowHeight - panelHeight : windowHeight;
  const compactControls = !!activeCountry && windowWidth >= 768 && mapWidth < 600;

  const handleSelectCountry = (countryFeature: any, isManual = false) => {
    if (!rendererReady) return;
    if (isManual) setAutoTourEnabled(false);
    const name = String(countryFeature.properties.ADMIN || countryFeature.properties.NAME);
    if (flightRef.current) {
      const destination = destinationRef.current;
      const destinationName = destination?.properties.ADMIN || destination?.properties.NAME;
      queuedCountryRef.current = name === destinationName ? null : countryFeature;
      setQueuedCountryName(name === destinationName ? null : name);
      return;
    }
    cancelFlight();
    const selectedWidth = windowWidth >= 768 ? windowWidth - panelWidth : windowWidth;
    const selectedHeight = windowWidth >= 768 ? windowHeight : windowHeight - panelHeight;
    const framing = countryFraming(countryFeature, selectedWidth / selectedHeight);
    const gpu = globeReady ? globeEl.current : null;
    const current = gpu ? gpu.pointOfView() : softwareView.current;
    const departure = departureRef.current;
    const originName = String(departure?.properties.ADMIN || departure?.properties.NAME || "");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // The first selection establishes an origin. Re-selecting it is not a flight.
    // Reduced-motion users get the final country view without a camera sweep.
    if (!departure || originName === name || reducedMotion) {
      departureRef.current = countryFeature;
      setActiveCountry(countryFeature);
      return;
    }
    const from = countryFraming(departure).center;
    const nextFlight: GlobeFlight & { countryName: string; originName: string } = {
      id: ++flightIdRef.current, countryName: name, originName,
      from, to: framing.center, startedAt: performance.now(),
      duration: flightDuration(from, framing.center), zoom: framing.softwareZoom,
    };
    destinationRef.current = countryFeature;
    flightRef.current = nextFlight;
    setFlight(nextFlight);
    setActiveCountry(null);
    if (!gpu) return;

    gpu.controls().autoRotate = false;
    if (!airplaneMeshRef.current) airplaneMeshRef.current = createAirliner();
    const plane = airplaneMeshRef.current;
    plane.name = "mosquito-airplane";
    gpu.scene().add(plane);
    const maxTrailPoints = 35;
    const trailPositions = new Float32Array(maxTrailPoints * 3);
    const trailGeo = new THREE.BufferGeometry();
    trailGeo.setAttribute("position", new THREE.BufferAttribute(trailPositions, 3));
    const trailMat = new THREE.LineBasicMaterial({ color: 0xddeeff, transparent: true, opacity: 0.8 });
    const trailLine = new THREE.Line(trailGeo, trailMat);
    // Positions move around the entire sphere; avoid stale culling bounds.
    trailLine.frustumCulled = false;
    gpu.scene().add(trailLine); trailLineRef.current = trailLine;
    const startAltitude = Math.max(0.12, current.altitude);
    const cruiseAltitude = Math.max(1.4, Math.min(2.2, startAltitude));
    const smooth = smoothFlightStep;
    const previousPoint = new THREE.Vector3(), nextPoint = new THREE.Vector3();
    const direction = new THREE.Vector3(), target = new THREE.Vector3();
    const radialUp = new THREE.Vector3();
    const beacon = plane.getObjectByName("beacon");
    const animateFlight = (time: number) => {
      if (flightRef.current?.id !== nextFlight.id || !globeEl.current) return;
      const t = Math.max(0, Math.min(1, (time - nextFlight.startedAt) / nextFlight.duration));
      const position = flightSample(nextFlight, t);
      const currentPos = gpu.getCoords(position.lat, position.lng, position.altitude);
      const ahead = flightSample(nextFlight, Math.min(1, t + 0.002));
      const behind = flightSample(nextFlight, Math.max(0, t - 0.002));
      const next = gpu.getCoords(ahead.lat, ahead.lng, ahead.altitude);
      const previous = gpu.getCoords(behind.lat, behind.lng, behind.altitude);
      nextPoint.set(next.x, next.y, next.z); previousPoint.set(previous.x, previous.y, previous.z);
      plane.position.copy(currentPos);
      radialUp.copy(plane.position).normalize(); plane.up.copy(radialUp);
      direction.subVectors(nextPoint, previousPoint).normalize();
      // Tangent includes the altitude gradient: nose rises on climb and lowers on approach.
      target.copy(plane.position).add(direction);
      plane.lookAt(target); plane.rotateY(Math.PI); plane.rotateZ(position.bank);
      if (beacon) beacon.visible = (time % 1600) < 110 || (time % 1600 > 230 && time % 1600 < 310);
      for (let i = 0; i < maxTrailPoints; i++) {
        const tailT = Math.max(0, t - 0.18 * i / (maxTrailPoints - 1));
        const tail = flightSample(nextFlight, tailT);
        const point = gpu.getCoords(tail.lat, tail.lng, tail.altitude);
        trailPositions.set([point.x, point.y, point.z], i * 3);
      }
      trailGeo.attributes.position.needsUpdate = true;
      // Follow the plane before descending to a country-sized view.
      const altitude = t < 0.28 ? startAltitude + (cruiseAltitude - startAltitude) * smooth(t / 0.28)
        : cruiseAltitude + (framing.webglAltitude - cruiseAltitude) * smooth((t - 0.68) / 0.32);
      gpu.pointOfView({ lat: position.lat, lng: position.lng, altitude }, 0);
      // Keep a readable model size without engulfing small countries on approach.
      const camera = gpu.camera() as THREE.PerspectiveCamera;
      const viewHeight = Math.max(1, mapContainer.current?.clientHeight || windowHeight);
      const span = 2 * camera.position.distanceTo(plane.position) * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
      plane.scale.setScalar(span * (windowWidth < 600 ? 54 : 74) / viewHeight / 12.2);
      const projected = plane.position.clone().project(gpu.camera());
      if (mapContainer.current) {
        const bounds = mapContainer.current.getBoundingClientRect();
        Object.assign(mapContainer.current.dataset, {
          flightId: String(nextFlight.id), flightProgress: t.toFixed(4),
          flightFrom: originName, flightTo: name, flightPhase: position.phase,
          flightLatitude: position.lat.toFixed(6), flightLongitude: position.lng.toFixed(6),
          flightVisible: String(Math.abs(projected.x) <= 1 && Math.abs(projected.y) <= 1 && projected.z < 1),
          flightX: ((projected.x + 1) / 2 * bounds.width).toFixed(2),
          flightY: ((1 - projected.y) / 2 * bounds.height).toFixed(2), altitude: altitude.toFixed(4),
        });
      }
      if (t < 1) animationFrameRef.current = requestAnimationFrame(animateFlight);
      else completeFlight(nextFlight.id);
    };
    animationFrameRef.current = requestAnimationFrame(animateFlight);
  };

  const selectCountryRef = useRef(handleSelectCountry);
  useEffect(() => { selectCountryRef.current = handleSelectCountry; });

  // --- TOUR MODE (ATTRACT MODE) ---
  useEffect(() => {
    autoTourEnabledRef.current = autoTourEnabled;
  }, [autoTourEnabled]);

  const tourIntervalRef = useRef<any>(null);
  const tourMosquitoOrder: MosquitoType[] = ["aedes", "anopheles", "culex"];
  const tourMosquitoIndexRef = useRef(0);
  const tourCountryIndexRef = useRef(0);
  const tourCountriesRef = useRef<any[]>([]);



  // 2. Handle Tour Loop
  useEffect(() => {
    if (!autoTourEnabled || !rendererReady || geoJsonData.length === 0) {
      if (tourIntervalRef.current) clearInterval(tourIntervalRef.current);
      // When user interrupts tour, reset rotation (unless they are interacting with a country)
      if (!autoTourEnabled && globeEl.current && !activeCountry && !flightRef.current) {
        globeEl.current.controls().autoRotate = false;
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
        selectCountryRef.current(tourCountriesRef.current[0]);
      }
    };

    const nextTourStep = () => {
      tourCountryIndexRef.current++;
      if (tourCountryIndexRef.current >= tourCountriesRef.current.length) {
        tourMosquitoIndexRef.current = (tourMosquitoIndexRef.current + 1) % tourMosquitoOrder.length;
        startTourCycle();
      } else {
        selectCountryRef.current(tourCountriesRef.current[tourCountryIndexRef.current]);
      }
    };

    // First time entering tour => start at aedes
    tourMosquitoIndexRef.current = 0;
    startTourCycle();
    
    // Allow up to 6.8s of flight, then time to read the destination.
    tourIntervalRef.current = setInterval(nextTourStep, 12000);

    return () => {
      if (tourIntervalRef.current) clearInterval(tourIntervalRef.current);
    };
  }, [autoTourEnabled, geoJsonData, rendererReady]);

  // Responsive setup
  useEffect(() => {
    setMounted(true);
    document.documentElement.classList.add("simulator-page");
    
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
      setWindowHeight(window.innerHeight);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
      
    return () => {
      window.removeEventListener("resize", handleResize);
      document.documentElement.classList.remove("simulator-page");
      cancelFlight();
      if (airplaneMeshRef.current) {
        airplaneMeshRef.current.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            if (mesh.geometry) mesh.geometry.dispose();
            if (mesh.material) {
              if (Array.isArray(mesh.material)) {
                mesh.material.forEach(m => m.dispose());
              } else {
                mesh.material.dispose();
              }
            }
          }
        });
        airplaneMeshRef.current = null;
      }
    };
  }, []);

  // Abort stale fetches on retries/unmount; a failed asset must not leave a blank globe.
  useEffect(() => {
    const controller = new AbortController();
    setGeoJsonStatus("loading");
    fetch("/assets/countries.geojson", { signal: controller.signal })
      .then(res => {
        if (!res.ok) throw new Error(`Country data returned ${res.status}`);
        return res.json();
      })
      .then(data => {
        if (controller.signal.aborted) return;
        if (!Array.isArray(data.features) || !data.features.length || data.features.some((f: any) =>
          !f?.properties || !f?.geometry || !Array.isArray(f.geometry.coordinates)
        )) throw new Error("Invalid country data");
        // Interior rings include sovereign enclaves such as Lesotho. Preserve them.
        setGeoJsonData(data.features);
        setGeoJsonStatus("ready");
      })
      .catch(() => {
        if (!controller.signal.aborted) setGeoJsonStatus("error");
      });
    return () => controller.abort();
  }, [loadAttempt]);

  // Compute countries with currently selected mosquito risk data
  const countries = useMemo(() => {
    if (!geoJsonData.length) return [];
    
    const currentData = MOSQUITO_DATA[activeMosquito].riskMap;
    
    return geoJsonData.map((f: any) => ({
      ...f, properties: { ...f.properties, risk: countryRisk(f, activeMosquito, currentData) }
    }));
  }, [geoJsonData, activeMosquito]);

  // Compute hotspots for the active mosquito
  const ringData = useMemo(() => {
    return MOSQUITO_DATA[activeMosquito].hotspots.map(spot => ({
      lat: spot.lat,
      lng: spot.lng,
      maxR: spot.weight * 1.2,
      propagationSpeed: (spot.weight / 10) * 3,
      repeatPeriod: 1000 - (spot.weight * 50),
      color: getRiskColor(spot.weight),
      city: spot.city,
      weight: spot.weight
    }));
  }, [activeMosquito]);

  // Memoize all Globe callbacks to prevent WebGL re-evaluation and severe stuttering on every render!
  const getPolygonColor = useCallback((d: any) => {
    const countryName = activeCountry ? (activeCountry.properties.ADMIN || activeCountry.properties.NAME) : "";
    const dName = d.properties.ADMIN || d.properties.NAME;
    if (activeCountry && dName === countryName) return "#ffffff"; 
    return getRiskColor(d.properties.risk);
  }, [activeCountry]);

  const handlePolygonHover = useCallback(() => {
    if (globeEl.current && !activeCountry && !flightRef.current) {
      globeEl.current.controls().autoRotate = false;
    }
  }, [activeCountry]);

  const getPolygonLabel = useCallback((d: any) => `
    <div style="background: rgba(10,10,10,0.95); border: 1px solid #3f3f46; border-radius: 12px; padding: 12px; font-family: sans-serif; pointer-events: none; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
      <div style="color: white; font-size: 16px; margin-bottom: 6px; font-weight: bold;">${d.properties.ADMIN || d.properties.NAME || "Unknown"}</div>
      <div style="color: ${getRiskColor(d.properties.risk)}; font-size: 14px; font-weight: bold; text-transform: uppercase;">
        ${MOSQUITO_DATA[activeMosquito].name} Risk: ${d.properties.risk.toFixed(1)} / 10
      </div>
      <div style="color: #a1a1aa; font-size: 12px; margin-top: 6px;">Click to view simulated outbreak history</div>
    </div>
  `, [activeMosquito]);

  const createHtmlElement = useCallback((d: any) => {
    const el = document.createElement('div');
    el.className = "pointer-events-none transform -translate-x-1/2 -translate-y-full";
    el.innerHTML = `
      <div class="relative flex flex-col items-center justify-end group">
        <!-- Floating Info Box -->
        <div class="absolute bottom-12 bg-black/90 text-red-100 text-[10px] font-black px-3 py-1.5 rounded-lg border border-red-500/50 backdrop-blur-md whitespace-nowrap uppercase tracking-[0.2em] shadow-[0_0_20px_rgba(220,38,38,0.4)]">
          ${d.city}
          <span class="block text-red-500/90 text-[8px] mt-0.5">SIMULATED SCORE: ${d.weight.toFixed(1)}</span>
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
  }, []);

  const getPolygonStrokeColor = useCallback(() => "#111111", []);


  // The dynamic child becomes ready asynchronously; changing a ref does not rerender React.
  useEffect(() => {
    if (!globeReady || !globeEl.current) return;
    const controls = globeEl.current.controls();
    controls.autoRotate = false;
    controls.autoRotateSpeed = 0.15;
    controls.enableZoom = true;
    controls.minDistance = 101.5;
    controls.maxDistance = 700;
    controls.zoomSpeed = 0.8;
    const handleControlStart = () => {
      cancelFlight();
      controls.autoRotate = false;
      if (autoTourEnabledRef.current) setAutoTourEnabled(false);
    };
    const recordView = () => {
      if (!globeEl.current || !mapContainer.current) return;
      const view = globeEl.current.pointOfView();
      Object.assign(mapContainer.current.dataset, { latitude: view.lat.toFixed(4), longitude: view.lng.toFixed(4), altitude: view.altitude.toFixed(4) });
    };
    controls.addEventListener('start', handleControlStart);
    controls.addEventListener('change', recordView);
    recordView();
    if (isInitialView.current && !autoTourEnabledRef.current) {
      const spot = MOSQUITO_DATA[activeMosquito].hotspots[0];
      globeEl.current.pointOfView({ lat: spot.lat, lng: spot.lng, altitude: 2.2 }, 0);
    }
    isInitialView.current = false;
    return () => { controls.removeEventListener('start', handleControlStart); controls.removeEventListener('change', recordView); };
    // The controls belong to the renderer; species changes must not interrupt a flight.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [globeReady, cancelFlight]);

  // Compute skyline historical data for the clicked country
  const countryData = useMemo<ContributionDay[]>(() => {
    if (!activeCountry) return [];
    const risk = countryRisk(activeCountry, activeMosquito, MOSQUITO_DATA[activeMosquito].riskMap);
    const raw = generateContributions(simulationDate, simulationSeed(activeCountry, activeMosquito), 365);
    return scaleSimulatedHistory(activeCountry, activeMosquito, risk, raw);
  }, [activeCountry, activeMosquito, simulationDate]);
    
  const activeCountryLiveRisk = useMemo(() => activeCountry
    ? countryRisk(activeCountry, activeMosquito, MOSQUITO_DATA[activeMosquito].riskMap) : 0,
  [activeCountry, activeMosquito]);

  const softwareFocus = useMemo(() => {
    if (!activeCountry) return undefined;
    const framing = countryFraming(activeCountry, mapWidth / mapHeight);
    return { ...framing.center, zoom: framing.softwareZoom };
  }, [activeCountry, mapWidth, mapHeight]);

  useEffect(() => {
    if (!activeCountry || !globeReady || !globeEl.current) return;
    const framing = countryFraming(activeCountry, mapWidth / mapHeight);
    globeEl.current.pointOfView({ ...framing.center, altitude: framing.webglAltitude }, 0);
  }, [activeCountry, globeReady, mapWidth, mapHeight]);

  const changeGpuZoom = (factor: number) => {
    if (!globeEl.current) return;
    cancelFlight(); setAutoTourEnabled(false);
    const pov = globeEl.current.pointOfView();
    globeEl.current.controls().autoRotate = false;
    globeEl.current.pointOfView({ ...pov, altitude: Math.max(0.015, Math.min(6, pov.altitude * factor)) }, 180);
  };

  if (!mounted) return null;

  return (
    <div className="relative w-screen h-[100dvh] flex items-center justify-center overflow-hidden bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-zinc-900 via-[#0a0a0a] to-black m-0 p-0">
      
      <div ref={mapContainer} id="globe-container" className="absolute top-0 left-0 cursor-move" style={{ width: mapWidth, height: mapHeight }}>
        <WebGLBoundary fallback={
          <SoftwareGlobe
            countries={countries}
            getPolygonColor={getPolygonColor}
            hotspots={ringData}
            onCountrySelect={country => handleSelectCountry(country, true)}
            autoRotate={autoTourEnabled && !activeCountry}
            onInteraction={() => { setAutoTourEnabled(false); cancelFlight(); }}
            onReady={setSoftwareReady}
            onReset={() => { departureRef.current = null; setActiveCountry(null); }}
            focus={softwareFocus}
            flight={flight}
            onFlightComplete={completeFlight}
            onViewChange={view => { softwareView.current = view; }}
          />
        }>
        <Globe
          ref={attachGlobe}
          onGlobeReady={() => setGlobeReady(true)}
          width={mapWidth}
          height={mapHeight}
          backgroundColor="rgba(0,0,0,0)"
          globeImageUrl="/assets/earth-blue-marble.jpg"
          backgroundImageUrl="/assets/night-sky.png"
          
          // Polygons (Red, Orange, Yellow)
          polygonsTransitionDuration={0}
          polygonsData={countries}
          polygonAltitude={0.005}
          polygonCapColor={getPolygonColor}
          polygonSideColor={getPolygonColor}
          polygonStrokeColor={getPolygonStrokeColor}
          onPolygonClick={(d: any) => handleSelectCountry(d, true)}
          onPolygonHover={handlePolygonHover}
          polygonLabel={getPolygonLabel}

          // Active Pulsing Hotspots (Surface Ripples)
          ringsData={ringData}
          ringColor="color"
          ringMaxRadius="maxR"
          ringPropagationSpeed="propagationSpeed"
          ringRepeatPeriod="repeatPeriod"
          ringAltitude={0.015} // Elevate above country polygons
          
          // Beautiful Glowing 3D-like HUD Markers
          htmlElementsData={ringData}
          htmlElement={createHtmlElement}
        />
        </WebGLBoundary>
        {globeReady && <div className="absolute left-6 top-1/2 -translate-y-1/2 flex flex-col gap-2" aria-label="Globe view controls">
          <button type="button" aria-label="Zoom in" onClick={() => changeGpuZoom(1 / 1.3)} className="w-9 h-9 rounded-lg bg-black/70 border border-white/20 text-white text-xl">+</button>
          <button type="button" aria-label="Zoom out" onClick={() => changeGpuZoom(1.3)} className="w-9 h-9 rounded-lg bg-black/70 border border-white/20 text-white text-xl">−</button>
          <button type="button" aria-label="Reset globe view" onClick={() => {
            cancelFlight(); departureRef.current = null; setAutoTourEnabled(false); setActiveCountry(null);
            globeEl.current?.pointOfView({ lat: 15, lng: 100, altitude: 2.2 }, 350);
          }} className="w-9 h-9 rounded-lg bg-black/70 border border-white/20 text-white text-lg">↺</button>
        </div>}
      </div>
      {flight && <div data-testid="globe-flight" role="status" className="absolute top-44 sm:top-56 left-1/2 -translate-x-1/2 text-xs text-blue-100 bg-black/70 px-3 py-2 rounded-lg pointer-events-none z-30">
        <span>✈ {flight.originName} → {flight.countryName}</span>
        {queuedCountryName && <span className="block mt-1 text-blue-200/75">Next: {queuedCountryName}</span>}
      </div>}

      {!activeCountry && <div className="absolute top-32 sm:top-44 left-1/2 -translate-x-1/2 z-40 w-60 max-w-[80vw]">
        <label htmlFor="country-select" className="sr-only">Choose a country</label>
        <select id="country-select" className="w-full bg-black/80 text-zinc-100 border border-white/20 rounded-lg px-3 py-2 text-xs backdrop-blur-md" value="" disabled={!rendererReady || geoJsonStatus !== "ready"}
          onChange={event => {
            const country = countries.find(f => (f.properties.ADMIN || f.properties.NAME) === event.target.value);
            if (country) handleSelectCountry(country, true);
          }}>
          <option value="" disabled>{geoJsonStatus === "loading" ? "Loading countries…" : !rendererReady ? "Preparing globe…" : "Choose a country"}</option>
          {[...countries].sort((a, b) => String(a.properties.ADMIN || a.properties.NAME).localeCompare(String(b.properties.ADMIN || b.properties.NAME))).map(country => (
            <option key={country.properties.ADMIN || country.properties.NAME} value={country.properties.ADMIN || country.properties.NAME}>{country.properties.ADMIN || country.properties.NAME}</option>
          ))}
        </select>
      </div>}

      {geoJsonStatus === "error" && <div role="alert" className="absolute top-36 z-[1000] max-w-sm p-4 text-center rounded-xl bg-zinc-900 border border-red-500/50">
        Country data could not be loaded. <button className="underline" onClick={() => setLoadAttempt(attempt => attempt + 1)}>Retry country data</button>
      </div>}

      {/* TOP CONTROLS: Mosquito Selectors */}
      <div style={{ maxWidth: activeCountry && windowWidth >= 768 ? mapWidth - 32 : undefined }} className={`absolute top-4 sm:top-6 flex items-center justify-center gap-1 sm:gap-3 bg-black/60 p-1 sm:p-2 rounded-2xl border border-white/10 backdrop-blur-xl shadow-2xl z-[999] pointer-events-auto w-max max-w-[95vw] overflow-x-auto overflow-y-hidden no-scrollbar transition-all duration-500 ${
        activeCountry 
          ? "md:left-6 md:translate-x-0 left-1/2 -translate-x-1/2 opacity-100" 
          : "left-1/2 -translate-x-1/2 opacity-100"
      }`}>
        {(Object.entries(MOSQUITO_DATA) as [MosquitoType, any][]).map(([key, data]) => {
          const isActive = activeMosquito === key;
          const Icon = data.icon;
          return (
            <button
              key={key}
              onClick={() => {
                cancelFlight();
                setActiveMosquito(key);
                setAutoTourEnabled(false);
              }}
              className={`flex items-center gap-1.5 sm:gap-2 px-2 py-1.5 ${compactControls ? "text-[10px]" : "sm:px-5 sm:py-3 text-[10px] sm:text-sm"} rounded-xl font-bold tracking-wide transition-all duration-300 whitespace-nowrap shrink-0 ${
                isActive 
                  ? "bg-red-600/90 text-white shadow-[0_0_20px_rgba(220,38,38,0.5)] border border-red-500 scale-100 sm:scale-105" 
                  : "bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-zinc-200 border border-transparent"
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${compactControls ? "" : "sm:w-5 sm:h-5"} shrink-0 ${isActive ? "animate-pulse" : ""}`} />
              <div className="flex flex-col items-start text-left">
                <span className="leading-none">{data.name}</span>
                <span className={`${compactControls ? "hidden" : ""} text-[7px] sm:text-[9px] font-medium tracking-tighter mt-1 opacity-80 ${isActive ? "text-red-100" : "text-zinc-500"}`}>
                  {data.diseases.split(",")[0]}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Autopilot Toggle */}
      <div className={`absolute top-20 sm:top-28 z-[999] pointer-events-auto transition-all duration-500 ${
        activeCountry 
          ? "md:left-6 md:translate-x-0 left-1/2 -translate-x-1/2 opacity-100" 
          : "left-1/2 -translate-x-1/2 opacity-100"
      }`}>
        <button
          id="auto-tour-btn"
          disabled={!rendererReady || geoJsonStatus !== "ready"}
          aria-pressed={autoTourEnabled && rendererReady}
          onClick={() => {
            if (autoTourEnabled) {
              cancelFlight();
            }
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
          {autoTourEnabled && rendererReady ? (
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
      <div hidden={!!activeCountry} className="absolute bottom-4 left-4 sm:bottom-6 sm:left-6 bg-black/70 p-3 sm:p-5 rounded-xl sm:rounded-2xl border border-white/10 backdrop-blur-xl pointer-events-none z-10 shadow-2xl">
        <h4 className="text-white font-black text-[10px] sm:text-sm uppercase tracking-widest mb-2 sm:mb-4 flex items-center gap-1.5 sm:gap-2">
          <ActivityIcon className="w-3 h-3 sm:w-4 sm:h-4 text-red-500" /> 
          Simulated Risk Heatmap
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
      <div hidden={!!activeCountry} className="absolute bottom-[140px] left-4 right-4 sm:bottom-6 sm:left-auto sm:right-6 sm:max-w-xs bg-black/70 p-3 sm:p-5 rounded-xl sm:rounded-2xl border border-white/10 backdrop-blur-xl z-10 shadow-2xl pointer-events-auto">
        <h4 className="text-white font-black text-[10px] sm:text-sm uppercase tracking-widest mb-1 sm:mb-2 border-b border-white/10 pb-1 sm:pb-2">
          {MOSQUITO_DATA[activeMosquito].name} Vectors
        </h4>
        <p className="text-[8px] sm:text-xs text-zinc-400 leading-relaxed mb-2 sm:mb-3">
          Primarily responsible for transmitting <strong className="text-zinc-200">{MOSQUITO_DATA[activeMosquito].diseases}</strong>. 
          Scores and hotspots are illustrative simulation inputs, not live surveillance data.
        </p>
        <a 
          href={MOSQUITO_DATA[activeMosquito].sourceUrl} 
          target="_blank" 
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[8px] sm:text-[10px] font-medium text-red-400 hover:text-red-300 transition-colors underline underline-offset-2 decoration-red-900/50"
        >
          Background: {MOSQUITO_DATA[activeMosquito].sourceName}
          <svg className="w-2 sm:w-2.5 h-2 sm:h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      </div>

      {activeMosquito === "culex" && !activeCountry && <a
        href="https://www.who.int/news-room/fact-sheets/detail/japanese-encephalitis"
        target="_blank" rel="noopener noreferrer"
        className="absolute bottom-[132px] left-4 sm:bottom-2 sm:left-auto sm:right-6 z-20 text-[8px] sm:text-[10px] text-red-300 underline">
        Background: WHO Japanese encephalitis
      </a>}

      {/* Country Data Modal / Overlay */}
      {activeCountry && (
        <div data-testid="country-details" role="region" aria-label="Country details" style={{ width: panelWidth, height: panelHeight }} className="absolute bottom-0 right-0 bg-[#050505]/98 border-t md:border-t-0 md:border-l border-white/10 shadow-2xl flex flex-col z-50">

          {/* Fixed Header with Close Button */}
          <div className="flex justify-end p-2 md:p-5 shrink-0">
            <button 
              aria-label="Close country details"
              onClick={() => {
                setActiveCountry(null);
                if (globeEl.current) {
                  globeEl.current.controls().autoRotate = false;
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
                return <Icon className="w-10 h-10 shrink-0" style={{ color: getRiskColor(activeCountryLiveRisk) }} />;
              })()}
              <h2 className="text-4xl sm:text-5xl font-black text-white tracking-tighter">
                {activeCountry.properties.ADMIN || activeCountry.properties.NAME || "Unknown"}
              </h2>
            </div>
          
          <div className="flex flex-wrap items-center gap-2 sm:gap-4 mb-6 sm:mb-10">
            <span 
              className="px-3 py-1.5 sm:px-4 sm:py-2 border rounded-full text-[10px] sm:text-sm font-black uppercase tracking-widest whitespace-nowrap"
              style={{ 
                borderColor: getRiskColorRGBA(activeCountryLiveRisk, 0.5), 
                color: getRiskColor(activeCountryLiveRisk),
                backgroundColor: getRiskColorRGBA(activeCountryLiveRisk, 0.1)
              }}
            >
              Risk Level: {activeCountryLiveRisk.toFixed(1)} / 10
            </span>
            <span className="text-zinc-400 text-[10px] sm:text-sm font-medium tracking-wide bg-white/5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full border border-white/5 whitespace-nowrap">
              Population estimate{activeCountry.properties.POP_YEAR ? ` (${activeCountry.properties.POP_YEAR})` : ""}: {Number(activeCountry.properties.POP_EST || 0).toLocaleString()}
            </span>
          </div>

          <div className="w-full p-3 rounded-[2rem] bg-gradient-to-br from-zinc-800/80 to-zinc-950 shadow-2xl ring-1 ring-white/10 relative overflow-hidden transform-gpu">
            <div className="absolute top-0 left-0 w-full h-1" style={{ backgroundColor: getRiskColor(activeCountryLiveRisk) }}></div>
            
            <ContributionSkyline 
              data={countryData}
              palette={activeCountryLiveRisk >= 7.5 ? "danger" : activeCountryLiveRisk >= 4.5 ? "ember" : "halloween"}
              unit="simulated case"
              unitPlural="simulated cases"
              defaultView="3d"
              orbit={false}
              title={
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full animate-ping absolute" style={{ backgroundColor: getRiskColor(activeCountryLiveRisk) }}></span>
                  <span className="w-2.5 h-2.5 rounded-full relative" style={{ backgroundColor: getRiskColor(activeCountryLiveRisk) }}></span>
                  <span className="font-bold text-white tracking-widest uppercase text-xs">
                    {MOSQUITO_DATA[activeMosquito].name} Simulated History
                  </span>
                </div>
              }
              className="border-none bg-transparent [--color-background:#0a0a0a] [--color-foreground:#fbf9f6] [--color-border:#27272a]"
            />
          </div>

          <div className="mt-10 text-zinc-400 text-xs sm:text-sm leading-relaxed border-t border-white/10 pt-6 sm:pt-8 max-w-2xl">
            <p className="mb-3">
              This illustrative visualization uses generated, simulated <strong className="text-white">{MOSQUITO_DATA[activeMosquito].diseases}</strong> outbreak counts for <strong className="text-white">{activeCountry.properties.ADMIN || activeCountry.properties.NAME || "Unknown"}</strong> over the past 12 months.
              It demonstrates possible patterns and is not a record of reported cases or a forecast. The links below provide general disease background, not the plotted numbers.
            </p>
            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-white/5">
              <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-widest text-zinc-500">Background:</span>
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
