"use client";

import * as React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, PerspectiveCamera, ContactShadows, Float, Sparkles } from "@react-three/drei";
import * as THREE from "three";

export type FrameSequenceStep = {
  from: number; to: number; color: string; num: string; total: string;
  icon?: React.ReactNode; title: string; description: string; label: string;
};

export type ChommsHouseHeroProps = {
  frameCount: number;
  framePath: (i: number) => string;
  fallbackFrames: string[];
  scrollHeight?: string;
  brand?: React.ReactNode;
  navLinks?: { label: string; href: string }[];
  ctaLabel?: string; ctaHref?: string;
  title: React.ReactNode; subtitle?: string | React.ReactNode;
  steps: FrameSequenceStep[];
  className?: string;
};

const cx = (...v: (string | false | null | undefined)[]) => v.filter(Boolean).join(" ");
const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));

function easeInOutCubic(x: number): number {
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}
function mapRange(val: number, inMin: number, inMax: number, outMin: number, outMax: number) {
  const t = clamp((val - inMin) / Math.max(0.0001, inMax - inMin));
  return outMin + easeInOutCubic(t) * (outMax - outMin);
}

// --- 3D Scene Components ---

function Pouch({ progress }: { progress: number }) {
  const ref = useRef<THREE.Group>(null);
  
  useFrame(() => {
    if (!ref.current) return;
    
    // Scene 01: Hero
    if (progress < 0.055) {
      ref.current.position.set(0, 0, 0);
      ref.current.rotation.set(0, mapRange(progress, 0, 0.055, 0, 0.1), 0);
      ref.current.scale.setScalar(1.2);
    } 
    // Scene 02: Open
    else if (progress < 0.145) {
      ref.current.position.set(0, mapRange(progress, 0.055, 0.145, 0, -1), mapRange(progress, 0.055, 0.145, 0, 1.5));
      ref.current.rotation.set(mapRange(progress, 0.055, 0.145, 0, -0.2), 0.1, 0);
    }
    // Scene 03: Film
    else if (progress < 0.235) {
      ref.current.position.set(0, -1, 1.5);
      ref.current.rotation.set(-0.2, 0.1, 0);
      ref.current.scale.setScalar(mapRange(progress, 0.145, 0.235, 1.2, 0.8));
    }
    // Scene 04-10: Hide
    else if (progress < 0.9) {
      ref.current.position.set(0, -10, 0);
    }
    // Scene 11: Final Hero
    else {
      ref.current.position.set(-1.2, 0.2, -0.5);
      ref.current.rotation.set(0, 0.3, 0);
      ref.current.scale.setScalar(1);
    }
  });

  return (
    <group ref={ref}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[1.5, 2.2, 0.1]} />
        <meshStandardMaterial color="#8B633E" roughness={0.9} />
      </mesh>
    </group>
  );
}

function Film({ progress }: { progress: number }) {
  const ref = useRef<THREE.Mesh>(null);
  const matRef = useRef<THREE.MeshPhysicalMaterial>(null);

  useFrame(() => {
    if (!ref.current || !matRef.current) return;
    
    // Scene 01-02: Hidden inside pouch
    if (progress < 0.145) {
      ref.current.position.set(0, 0.5, 1.5);
      matRef.current.opacity = 0;
    }
    // Scene 03: Remove Film
    else if (progress < 0.235) {
      matRef.current.opacity = 0.9;
      ref.current.position.set(0, mapRange(progress, 0.145, 0.235, 0.5, 1.5), mapRange(progress, 0.145, 0.235, 1.5, 2.5));
      ref.current.rotation.set(mapRange(progress, 0.145, 0.235, 0, -0.5), 0, 0);
    }
    // Scene 04: Above water
    else if (progress < 0.325) {
      ref.current.position.set(0, 2, 0);
      ref.current.rotation.set(-0.5, 0, 0);
      matRef.current.opacity = 0.9;
    }
    // Scene 05: Dissolve
    else if (progress < 0.425) {
      ref.current.position.set(0, mapRange(progress, 0.325, 0.425, 2, 0), 0);
      matRef.current.opacity = mapRange(progress, 0.325, 0.425, 0.9, 0);
    }
    // Scene 06+: Dissolved
    else {
      matRef.current.opacity = 0;
    }
  });

  return (
    <mesh ref={ref} castShadow>
      <planeGeometry args={[1, 1.4, 8, 8]} />
      <meshPhysicalMaterial ref={matRef} color="#F3EDE4" transmission={0.5} roughness={0.2} transparent side={THREE.DoubleSide} />
    </mesh>
  );
}

function Glass({ progress }: { progress: number }) {
  const ref = useRef<THREE.Group>(null);
  
  useFrame(() => {
    if (!ref.current) return;
    // Hidden until Scene 04
    if (progress < 0.235) {
      ref.current.position.set(0, -10, 0);
    }
    // Scene 04-06: Center stage
    else if (progress < 0.515) {
      ref.current.position.set(0, 0, 0);
      ref.current.rotation.set(0, progress * Math.PI, 0);
    }
    // Scene 07: Pouring
    else if (progress < 0.635) {
      ref.current.position.set(mapRange(progress, 0.515, 0.635, 0, -2), mapRange(progress, 0.515, 0.635, 0, 1.5), 0);
      ref.current.rotation.z = mapRange(progress, 0.515, 0.635, 0, -Math.PI / 2.5);
    }
    // Scene 08+: Hide
    else {
      ref.current.position.set(0, -10, 0);
    }
  });

  return (
    <group ref={ref}>
      <mesh castShadow receiveShadow position={[0, 0, 0]}>
        <cylinderGeometry args={[0.7, 0.6, 1.8, 32]} />
        <meshPhysicalMaterial color="#ffffff" transmission={1} roughness={0.05} ior={1.5} transparent opacity={0.6} side={THREE.DoubleSide} />
      </mesh>
      {/* Water volume */}
      <mesh position={[0, -0.2, 0]}>
        <cylinderGeometry args={[0.65, 0.55, 1.3, 32]} />
        <meshPhysicalMaterial color="#cde3d6" transmission={0.9} roughness={0.1} transparent opacity={0.8} />
      </mesh>
    </group>
  );
}

function Bottle({ progress }: { progress: number }) {
  const ref = useRef<THREE.Group>(null);
  const pumpRef = useRef<THREE.Group>(null);
  
  useFrame(() => {
    if (!ref.current || !pumpRef.current) return;
    
    // Scene 01-06: Hidden
    if (progress < 0.425) {
      ref.current.position.set(10, -10, 0);
    }
    // Scene 07: Transfer
    else if (progress < 0.635) {
      ref.current.position.set(mapRange(progress, 0.515, 0.635, 3, 0), 0, 0);
      ref.current.rotation.set(0, 0, 0);
      pumpRef.current.position.y = 3;
    }
    // Scene 08: Close
    else if (progress < 0.715) {
      ref.current.position.set(0, 0, 0);
      pumpRef.current.position.y = mapRange(progress, 0.635, 0.715, 3, 0);
    }
    // Scene 09: Shake
    else if (progress < 0.805) {
      ref.current.position.set(mapRange(progress, 0.715, 0.805, 0, 0.5), mapRange(progress, 0.715, 0.805, 0, 0.5), 0);
      ref.current.rotation.z = Math.sin(progress * 150) * 0.15;
    }
    // Scene 10: Spray
    else if (progress < 0.915) {
      ref.current.position.set(0.5, 0.5, 0);
      ref.current.rotation.z = 0;
    }
    // Scene 11: Final
    else {
      ref.current.position.set(1.2, 0, 0.5);
      ref.current.rotation.set(0, -0.2, 0);
    }
  });

  return (
    <group ref={ref}>
      <mesh castShadow receiveShadow position={[0, -0.6, 0]}>
        <cylinderGeometry args={[0.5, 0.5, 1.4, 32]} />
        <meshPhysicalMaterial color="#ffffff" transmission={0.9} roughness={0.2} ior={1.5} />
      </mesh>
      
      <group ref={pumpRef} position={[0, 0, 0]}>
        <mesh castShadow receiveShadow position={[0, 0.3, 0]}>
          <cylinderGeometry args={[0.15, 0.15, 0.4, 16]} />
          <meshStandardMaterial color="#eeeeee" roughness={0.5} />
        </mesh>
        <mesh castShadow receiveShadow position={[0.2, 0.4, 0]} rotation={[0, 0, -Math.PI/2]}>
          <cylinderGeometry args={[0.08, 0.08, 0.3, 16]} />
          <meshStandardMaterial color="#dddddd" roughness={0.4} />
        </mesh>
      </group>
    </group>
  );
}

function ParticlesAndMist({ progress }: { progress: number }) {
  const mistRef = useRef<THREE.Group>(null);
  
  useFrame(() => {
    if (mistRef.current) {
      // Scene 10: Spray Mist
      mistRef.current.visible = (progress >= 0.805 && progress < 0.915);
      if (mistRef.current.visible) {
        mistRef.current.position.x = 0.5 + Math.random() * 0.1;
      }
    }
  });

  return (
    <>
      <Sparkles count={50} scale={5} size={2} speed={0.4} opacity={0.2} color="#8FA798" />
      <group ref={mistRef} position={[1, 1, 0]}>
        <Sparkles count={200} scale={[3, 1, 1]} size={4} speed={2} opacity={0.5} color="#ffffff" />
      </group>
    </>
  );
}

function Scene({ progress }: { progress: number }) {
  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 1, 6]} fov={35} />
      <Environment preset="city" />
      
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 10, 5]} intensity={1.5} castShadow shadow-mapSize={[1024, 1024]} shadow-bias={-0.0001} />
      <directionalLight position={[-5, 5, -5]} intensity={0.5} color="#E8DED0" />
      
      <Float speed={2} rotationIntensity={0.05} floatIntensity={0.1}>
        <Pouch progress={progress} />
        <Film progress={progress} />
        <Glass progress={progress} />
        <Bottle progress={progress} />
      </Float>

      <ParticlesAndMist progress={progress} />

      {/* Ground plane for shadows */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2, 0]} receiveShadow>
        <planeGeometry args={[50, 50]} />
        <meshStandardMaterial color="#F3EDE4" roughness={1} />
      </mesh>
    </>
  );
}

// --- Main UI Component ---

export function ChommsHouse3DHero({
  frameCount, framePath, fallbackFrames,
  scrollHeight = "1100vh", brand, navLinks = [], ctaLabel,
  ctaHref = "#", title, subtitle, steps, className,
}: ChommsHouseHeroProps) {
  const spacerRef = useRef<HTMLDivElement>(null);
  
  const [progress, setProgress] = useState(0);
  const [activeIdx, setActiveIdx] = useState(0);
  const [stepLocal, setStepLocal] = useState(0);
  const [loaded, setLoaded] = useState(false);
  
  useEffect(() => {
    // Artificial load delay for presentation feel
    const t = setTimeout(() => setLoaded(true), 1500);
    return () => clearTimeout(t);
  }, []);
  
  const stepIndexFor = useCallback((p: number) => {
    for (let i = 0; i < steps.length; i++) {
      if (p >= steps[i].from && p < steps[i].to) return i;
    }
    return Math.max(0, steps.length - 1);
  }, [steps]);

  const onScroll = useCallback(() => {
    const spacer = spacerRef.current;
    if (!spacer) return;
    const total = Math.max(1, spacer.offsetHeight - window.innerHeight);
    const p = clamp(window.scrollY / total);
    const idx = stepIndexFor(p);
    const s = steps[idx];
    const local = clamp((p - s.from) / Math.max(0.0001, s.to - s.from));

    setProgress(p); 
    setActiveIdx(idx); 
    setStepLocal(local);
  }, [stepIndexFor, steps]);

  useEffect(() => {
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [onScroll]);

  const currentStep = steps[activeIdx] ?? steps[0];

  return (
    <div className={cx("ch-root", className)}>
      <div className={cx("ch-loader", loaded && "ch-loader-done")}>
        <div className="ch-loader-text">
          {loaded ? "Ready" : "Preparing your journey"}
        </div>
        <div className="ch-loader-track">
          <span className="ch-loader-fill" style={{ width: loaded ? "100%" : "60%" }} />
        </div>
      </div>

      <nav className="ch-nav">
        <div className="ch-brand">{brand}</div>
        <div className="ch-nav-links">
          {navLinks.map((l) => <a key={l.label} href={l.href}>{l.label}</a>)}
        </div>
        {ctaLabel && <a className="ch-cta" href={ctaHref}>{ctaLabel}</a>}
      </nav>

      <div className="ch-stage">
        <div className="ch-canvas-wrap">
          <Canvas shadows dpr={[1, 2]}>
            <Scene progress={progress} />
          </Canvas>
        </div>

        <div className="ch-copy">
          <h1 className="ch-title">{title}</h1>
          {subtitle && <p className={cx("ch-sub", progress > 0.02 && "ch-sub-hidden")}>{subtitle}</p>}
        </div>

        <div className="ch-card-wrap">
          {steps.map((s, i) => (
            <article key={s.num} className={cx("ch-card", i === activeIdx && "ch-card-active")}
              style={{ ["--c" as any]: s.color }} aria-hidden={i !== activeIdx}>
              <div className="ch-card-inner">
                <div className="ch-card-head">
                  <span className="ch-card-num"><strong>{s.num}</strong> / {s.total}</span>
                  <span className="ch-card-icon">{s.icon ?? "✦"}</span>
                </div>
                <h2 className="ch-card-title">{s.title}</h2>
                <p className="ch-card-desc">{s.description}</p>
                <div className="ch-card-foot">
                  <div className="ch-ticks">
                    {steps.map((_, j) => (
                      <i className="ch-tick" key={j}>
                        <span style={{ transform: `scaleX(${j < activeIdx ? 1 : j === activeIdx ? stepLocal : 0})` }} />
                      </i>
                    ))}
                  </div>
                  <span className="ch-card-label">{s.label}</span>
                </div>
              </div>
            </article>
          ))}
        </div>

        <div className="ch-progress"><span style={{ width: `${progress * 100}%` }} /></div>
        <div className="ch-step-badge">{String(activeIdx + 1).padStart(2, "0")} <i/> {String(steps.length).padStart(2, "0")}</div>
      </div>

      <div ref={spacerRef} className="ch-spacer" style={{ height: scrollHeight }} />
    </div>
  );
}
