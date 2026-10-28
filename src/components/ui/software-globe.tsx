"use client";

import { useEffect, useRef, useState } from "react";
import { geoGraticule10, geoPath } from "d3-geo";
import type { Feature, Geometry } from "geojson";
import { countryName, type CountryFeature } from "@/lib/simulator";
import { asGeoFeature, createGlobeProjection, countryAtGlobePoint, isVisibleOnGlobe } from "@/lib/software-globe-projection";

export type SoftwareGlobeProps = {
  countries: CountryFeature[];
  getPolygonColor: (feature: CountryFeature) => string;
  hotspots: { lat: number; lng: number; color?: string; city?: string }[];
  onCountrySelect: (feature: CountryFeature) => void;
  autoRotate: boolean;
  onInteraction?: () => void;
  onReady?: (ready: boolean) => void;
  focus?: { lat: number; lng: number };
  className?: string;
};

/** A real spherical projection rendered on the CPU when WebGL is unavailable. */
export function SoftwareGlobe(props: SoftwareGlobeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const config = useRef(props);
  const engine = useRef<{ draw: () => void; rotate: (x: number, y: number) => void; zoom: (factor: number) => void; reset: () => void; update: (previous: SoftwareGlobeProps) => void } | null>(null);
  const [hoveredName, setHoveredName] = useState("");

  useEffect(() => {
    const previous = config.current;
    config.current = props;
    engine.current?.update(previous);
  }, [props]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d", { alpha: false });
    if (!canvas || !context) return;
    const ctx = context;
    const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
    const projection = createGlobeProjection();
    const path = geoPath(projection, ctx);
    const graticule = geoGraticule10();
    let width = 0, height = 0, radius = 0, zoom = 1;
    let rotation: [number, number, number] = config.current.focus
      ? [-config.current.focus.lng, -config.current.focus.lat, 0] : [-100, -15, 0];
    let hovered: CountryFeature | undefined;
    let drag: { id: number; x: number; y: number; startX: number; startY: number; moved: boolean } | null = null;
    let interacting = false, visible = !document.hidden, frame = 0, lastTime = 0, announcedReady = false;

    const geometries = new WeakMap<CountryFeature, Feature<Geometry>>();
    const geometryFor = (feature: CountryFeature) => {
      let geometry = geometries.get(feature);
      if (!geometry) { geometry = asGeoFeature(feature); geometries.set(feature, geometry); }
      return geometry;
    };
    const setRotation = () => projection.rotate(rotation).scale(radius * zoom).translate([width / 2, height / 2]);
    const pauseForInput = () => {
      interacting = true;
      config.current.onInteraction?.();
    };
    const pick = (x: number, y: number) => countryAtGlobePoint(projection, config.current.countries, [x, y], geometryFor);
    const pointFromEvent = (event: PointerEvent) => {
      const bounds = canvas.getBoundingClientRect();
      return [event.clientX - bounds.left, event.clientY - bounds.top] as const;
    };
    const draw = () => {
      if (!width || !height) return;
      setRotation();
      const cx = width / 2, cy = height / 2, r = radius * zoom;
      const sky = ctx.createRadialGradient(cx, cy, r * 0.5, cx, cy, Math.max(width, height));
      sky.addColorStop(0, "#111a26"); sky.addColorStop(0.7, "#05080e"); sky.addColorStop(1, "#020306");
      ctx.fillStyle = sky; ctx.fillRect(0, 0, width, height);
      // Fixed stars, deterministic across renders and without a network dependency.
      for (let i = 0; i < 150; i++) {
        const x = ((Math.sin(i * 127.1 + 311.7) * 43758.5453) % 1 + 1) % 1 * width;
        const y = ((Math.sin(i * 269.5 + 183.3) * 19642.3491) % 1 + 1) % 1 * height;
        ctx.fillStyle = `rgba(220,231,255,${0.15 + (i % 5) * 0.12})`;
        ctx.fillRect(x, y, i % 11 === 0 ? 1.6 : 0.8, i % 11 === 0 ? 1.6 : 0.8);
      }
      const atmosphere = ctx.createRadialGradient(cx, cy, r * 0.96, cx, cy, r * 1.13);
      atmosphere.addColorStop(0, "rgba(70,145,235,0.0)");
      atmosphere.addColorStop(0.28, "rgba(78,164,248,0.22)");
      atmosphere.addColorStop(1, "rgba(36,100,200,0)");
      ctx.fillStyle = atmosphere; ctx.beginPath(); ctx.arc(cx, cy, r * 1.13, 0, Math.PI * 2); ctx.fill();
      ctx.save();
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.clip();
      const ocean = ctx.createRadialGradient(cx - r * 0.38, cy - r * 0.38, 0, cx, cy, r * 1.25);
      ocean.addColorStop(0, "#173c55"); ocean.addColorStop(0.6, "#0a2034"); ocean.addColorStop(1, "#020711");
      ctx.fillStyle = ocean; ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
      ctx.strokeStyle = "rgba(125,174,220,0.1)"; ctx.lineWidth = 0.6;
      ctx.beginPath(); path(graticule); ctx.stroke();
      for (const country of config.current.countries) {
        ctx.beginPath(); path(geometryFor(country));
        ctx.globalAlpha = country === hovered ? 1 : 0.87;
        ctx.fillStyle = country === hovered ? "#fff1c1" : config.current.getPolygonColor(country);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.strokeStyle = "rgba(10,12,18,0.72)"; ctx.lineWidth = 0.65; ctx.stroke();
      }
      // Lighting creates depth while leaving the projected data legible.
      const shade = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, r * 0.1, cx, cy, r);
      shade.addColorStop(0, "rgba(230,243,255,0.05)");
      shade.addColorStop(0.65, "rgba(0,3,12,0.04)"); shade.addColorStop(1, "rgba(0,3,12,0.72)");
      ctx.fillStyle = shade; ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
      for (const spot of config.current.hotspots) {
        const location: [number, number] = [spot.lng, spot.lat];
        if (!isVisibleOnGlobe(projection, location)) continue;
        const point = projection(location);
        if (!point) continue;
        const [x, y] = point;
        ctx.strokeStyle = spot.color || "#ff4545";
        ctx.fillStyle = "#fff4ed";
        ctx.shadowColor = spot.color || "#ff4545"; ctx.shadowBlur = 12;
        ctx.beginPath(); ctx.arc(x, y, 7, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.arc(x, y, 2.6, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
      }
      ctx.restore();
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(123,190,255,0.38)"; ctx.lineWidth = 1; ctx.stroke();
    };
    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      width = bounds.width; height = bounds.height;
      const dpr = Math.min(devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(width * dpr)); canvas.height = Math.max(1, Math.round(height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      radius = Math.min(width * (width < 640 ? 0.43 : 0.36), height * 0.35);
      draw();
      if (width && height && !announcedReady) {
        announcedReady = true; canvas.dataset.ready = "true"; config.current.onReady?.(true);
      }
    };
    const rotate = (x: number, y: number) => {
      pauseForInput();
      rotation = [(rotation[0] + x) % 360, Math.max(-85, Math.min(85, rotation[1] + y)), 0]; draw();
    };
    const changeZoom = (factor: number) => { pauseForInput(); zoom = Math.max(0.65, Math.min(2.2, zoom * factor)); draw(); };
    const onDown = (event: PointerEvent) => {
      if (event.button !== 0) return;
      pauseForInput();
      drag = { id: event.pointerId, x: event.clientX, y: event.clientY, startX: event.clientX, startY: event.clientY, moved: false };
      canvas.setPointerCapture(event.pointerId); canvas.style.cursor = "grabbing";
    };
    const onMove = (event: PointerEvent) => {
      if (drag && drag.id === event.pointerId) {
        if (Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) > 4) drag.moved = true;
        const sensitivity = 90 / Math.max(80, radius * zoom);
        rotation = [(rotation[0] + (event.clientX - drag.x) * sensitivity) % 360,
          Math.max(-85, Math.min(85, rotation[1] - (event.clientY - drag.y) * sensitivity)), 0];
        drag.x = event.clientX; drag.y = event.clientY;
        hovered = undefined; setHoveredName(""); draw(); return;
      }
      const point = pointFromEvent(event);
      const next = pick(point[0], point[1]);
      if (next !== hovered) { hovered = next; setHoveredName(next ? countryName(next) : ""); draw(); }
      canvas.style.cursor = next ? "pointer" : "grab";
    };
    const onUp = (event: PointerEvent) => {
      if (!drag || drag.id !== event.pointerId) return;
      const moved = drag.moved; drag = null;
      if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
      canvas.style.cursor = "grab";
      if (!moved) {
        const point = pointFromEvent(event); const country = pick(point[0], point[1]);
        if (country) config.current.onCountrySelect(country);
      }
    };
    const onCancel = () => { drag = null; canvas.style.cursor = "grab"; };
    const onLeave = () => { if (!drag) { hovered = undefined; setHoveredName(""); draw(); } };
    const onWheel = (event: WheelEvent) => { if (event.ctrlKey || event.metaKey) return; event.preventDefault(); changeZoom(Math.exp(-Math.max(-200, Math.min(200, event.deltaY)) * 0.0015)); };
    const onKey = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "+", "=", "-", "Enter", " "].includes(event.key)) return;
      event.preventDefault();
      if (event.key === "ArrowLeft") rotate(-10, 0);
      if (event.key === "ArrowRight") rotate(10, 0);
      if (event.key === "ArrowUp") rotate(0, 10);
      if (event.key === "ArrowDown") rotate(0, -10);
      if (event.key === "+" || event.key === "=") changeZoom(1.15);
      if (event.key === "-") changeZoom(1 / 1.15);
      if (event.key === "Enter" || event.key === " ") {
        const country = pick(width / 2, height / 2); if (country) config.current.onCountrySelect(country);
      }
    };
    const shouldAnimate = () => visible && config.current.autoRotate && !interacting && !reducedMotion.matches;
    const kick = () => { if (!frame && shouldAnimate()) frame = requestAnimationFrame(tick); };
    const tick = (time: number) => {
      frame = 0;
      if (!shouldAnimate()) { lastTime = 0; return; }
      const elapsed = time - (lastTime || time);
      // Software rendering is capped around 30fps to avoid saturating mobile CPUs.
      if (!lastTime || elapsed >= 32) {
        const delta = Math.min(elapsed, 80);
        rotation[0] = (rotation[0] + delta * 0.002) % 360; draw(); lastTime = time;
      }
      kick();
    };
    const onVisibility = () => {
      visible = !document.hidden; lastTime = 0;
      if (!visible && frame) { cancelAnimationFrame(frame); frame = 0; }
      kick();
    };
    const onMotion = () => {
      if (reducedMotion.matches && frame) { cancelAnimationFrame(frame); frame = 0; }
      lastTime = 0; kick();
    };
    engine.current = { draw, rotate, zoom: changeZoom, reset: () => {
      pauseForInput(); rotation = [-100, -15, 0]; zoom = 1; hovered = undefined; setHoveredName(""); draw();
    }, update: previous => {
      const next = config.current;
      if (next.autoRotate && !previous.autoRotate) interacting = false;
      if (next.focus && (next.focus.lat !== previous.focus?.lat || next.focus.lng !== previous.focus?.lng)) {
        rotation = [-next.focus.lng, -next.focus.lat, 0];
      }
      draw(); kick();
    } };
    const observer = new ResizeObserver(resize); observer.observe(canvas);
    canvas.addEventListener("pointerdown", onDown); canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp); canvas.addEventListener("pointercancel", onCancel);
    canvas.addEventListener("pointerleave", onLeave); canvas.addEventListener("wheel", onWheel, { passive: false });
    canvas.addEventListener("keydown", onKey); document.addEventListener("visibilitychange", onVisibility);
    reducedMotion.addEventListener("change", onMotion);
    resize(); kick();
    return () => {
      observer.disconnect(); if (frame) cancelAnimationFrame(frame); engine.current = null; config.current.onReady?.(false);
      canvas.removeEventListener("pointerdown", onDown); canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp); canvas.removeEventListener("pointercancel", onCancel);
      canvas.removeEventListener("pointerleave", onLeave); canvas.removeEventListener("wheel", onWheel);
      canvas.removeEventListener("keydown", onKey); document.removeEventListener("visibilitychange", onVisibility);
      reducedMotion.removeEventListener("change", onMotion);
    };
  }, []);

  return (
    <div className={`relative w-full h-full ${props.className || ""}`} data-renderer="software-globe">
      <canvas ref={canvasRef} data-testid="software-globe" data-renderer="software-globe" className="w-full h-full block outline-none focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:ring-inset"
        style={{ touchAction: "pinch-zoom", cursor: "grab" }} tabIndex={0}
        role="application" aria-label="Interactive mosquito risk globe. Drag or use arrow keys to rotate, plus and minus to zoom, Enter to select the centre country." />
      <div className="absolute left-1/2 -translate-x-1/2 top-[72%] pointer-events-none text-center text-xs text-zinc-200 drop-shadow-md" aria-live="polite">
        {hoveredName || "Drag to rotate · Click a country"}
      </div>
      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex flex-col gap-2" aria-label="Globe view controls">
        <button type="button" aria-label="Zoom in" onClick={() => engine.current?.zoom(1.2)} className="w-9 h-9 rounded-lg bg-black/70 border border-white/20 text-white text-xl">+</button>
        <button type="button" aria-label="Zoom out" onClick={() => engine.current?.zoom(1 / 1.2)} className="w-9 h-9 rounded-lg bg-black/70 border border-white/20 text-white text-xl">−</button>
        <button type="button" aria-label="Reset globe view" onClick={() => engine.current?.reset()} className="w-9 h-9 rounded-lg bg-black/70 border border-white/20 text-white text-lg">↺</button>
      </div>
    </div>
  );
}
