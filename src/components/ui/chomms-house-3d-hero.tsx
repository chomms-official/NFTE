"use client";

import * as React from "react";
import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, PerspectiveCamera, ContactShadows, Float, Sparkles, RoundedBox, SoftShadows, AccumulativeShadows, RandomizedLight } from "@react-three/drei";
import * as THREE from "three";

export type FrameSequenceStep = {
  from: number; to: number; color: string; num: string; total: string;
  icon?: React.ReactNode; title: string; description: string; label: string;
};

export type ChommsHouseHeroProps = {
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

function ProceduralMaterials() {
  // Generate a noisy bump map for Kraft paper and Citrus
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    for (let x = 0; x < 512; x++) {
      for (let y = 0; y < 512; y++) {
        const v = Math.random() * 255;
        ctx.fillStyle = 'rgb(' + Math.round(v) + ',' + Math.round(v) + ',' + Math.round(v) + ')';
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }
  const noiseTex = new THREE.CanvasTexture(canvas);
  noiseTex.wrapS = THREE.RepeatWrapping;
  noiseTex.wrapT = THREE.RepeatWrapping;
  return noiseTex;
}

function Pouch({ progress, noiseTex }: { progress: number, noiseTex: THREE.Texture | null }) {
  const ref = useRef<THREE.Group>(null);
  
  useFrame(() => {
    if (!ref.current) return;
    if (progress < 0.055) {
      ref.current.position.set(0, 0, 0);
      ref.current.rotation.set(0, mapRange(progress, 0, 0.055, 0, 0.1), 0);
      ref.current.scale.setScalar(1.2);
    } else if (progress < 0.145) {
      ref.current.position.set(0, mapRange(progress, 0.055, 0.145, 0, -1), mapRange(progress, 0.055, 0.145, 0, 1.5));
      ref.current.rotation.set(mapRange(progress, 0.055, 0.145, 0, -0.2), 0.1, 0);
    } else if (progress < 0.235) {
      ref.current.position.set(0, -1, 1.5);
      ref.current.rotation.set(-0.2, 0.1, 0);
      ref.current.scale.setScalar(mapRange(progress, 0.145, 0.235, 1.2, 0.8));
    } else if (progress < 0.9) {
      ref.current.position.set(0, -10, 0);
    } else {
      ref.current.position.set(-1.2, 0.2, -0.5);
      ref.current.rotation.set(0, 0.3, 0);
      ref.current.scale.setScalar(1);
    }
  });

  return (
    <group ref={ref}>
      <RoundedBox args={[1.5, 2.2, 0.12]} radius={0.05} smoothness={4} castShadow receiveShadow>
        <meshStandardMaterial 
          color="#a37b56" 
          roughness={0.95} 
          bumpMap={noiseTex} 
          bumpScale={0.002}
        />
      </RoundedBox>
      {/* Front Label */}
      <mesh position={[0, 0, 0.065]} receiveShadow>
        <planeGeometry args={[1.2, 1.6]} />
        <meshStandardMaterial color="#fdfbf7" roughness={0.8} />
      </mesh>
    </group>
  );
}

function Film({ progress }: { progress: number }) {
  const ref = useRef<THREE.Mesh>(null);
  const matRef = useRef<THREE.MeshPhysicalMaterial>(null);

  useFrame(() => {
    if (!ref.current || !matRef.current) return;
    if (progress < 0.145) {
      ref.current.position.set(0, 0.5, 1.5);
      matRef.current.opacity = 0;
    } else if (progress < 0.235) {
      matRef.current.opacity = 0.9;
      ref.current.position.set(0, mapRange(progress, 0.145, 0.235, 0.5, 1.5), mapRange(progress, 0.145, 0.235, 1.5, 2.5));
      ref.current.rotation.set(mapRange(progress, 0.145, 0.235, 0, -0.5), 0, 0);
    } else if (progress < 0.325) {
      ref.current.position.set(0, 2, 0);
      ref.current.rotation.set(-0.5, 0, 0);
      matRef.current.opacity = 0.9;
    } else if (progress < 0.425) {
      ref.current.position.set(0, mapRange(progress, 0.325, 0.425, 2, 0), 0);
      matRef.current.opacity = mapRange(progress, 0.325, 0.425, 0.9, 0);
    } else {
      matRef.current.opacity = 0;
    }
  });

  return (
    <mesh ref={ref} castShadow>
      <planeGeometry args={[1, 1.4, 16, 16]} />
      <meshPhysicalMaterial 
        ref={matRef} 
        color="#F3EDE4" 
        transmission={0.8} 
        roughness={0.2} 
        thickness={0.01}
        transparent 
        side={THREE.DoubleSide} 
      />
    </mesh>
  );
}

function Glass({ progress }: { progress: number }) {
  const ref = useRef<THREE.Group>(null);
  const waterRef = useRef<THREE.MeshPhysicalMaterial>(null);
  
  useFrame(() => {
    if (!ref.current || !waterRef.current) return;
    if (progress < 0.235) {
      ref.current.position.set(0, -10, 0);
    } else if (progress < 0.515) {
      ref.current.position.set(0, 0, 0);
      ref.current.rotation.set(0, progress * Math.PI, 0);
      waterRef.current.color.setHex(0xcde3d6); // normal water
    } else if (progress < 0.635) {
      ref.current.position.set(mapRange(progress, 0.515, 0.635, 0, -2), mapRange(progress, 0.515, 0.635, 0, 1.5), 0);
      ref.current.rotation.z = mapRange(progress, 0.515, 0.635, 0, -Math.PI / 2.5);
    } else {
      ref.current.position.set(0, -10, 0);
    }
    
    // Dissolve color change
    if (progress >= 0.325 && progress < 0.515) {
      const dissolve = mapRange(progress, 0.325, 0.515, 0, 1);
      waterRef.current.color.lerpColors(new THREE.Color(0xcde3d6), new THREE.Color(0x9cb8a5), dissolve);
    }
  });

  return (
    <group ref={ref}>
      <mesh castShadow receiveShadow position={[0, 0, 0]}>
        <cylinderGeometry args={[0.7, 0.6, 1.8, 64]} />
        <meshPhysicalMaterial 
          color="#ffffff" 
          transmission={1} 
          roughness={0.02} 
          ior={1.52} 
          thickness={0.1}
          transparent 
          side={THREE.DoubleSide} 
        />
      </mesh>
      <mesh position={[0, -0.1, 0]}>
        <cylinderGeometry args={[0.67, 0.57, 1.5, 64]} />
        <meshPhysicalMaterial 
          ref={waterRef}
          color="#cde3d6" 
          transmission={0.95} 
          roughness={0.1} 
          ior={1.33}
          attenuationColor="#a9c9b5"
          attenuationDistance={2}
          transparent 
        />
      </mesh>
    </group>
  );
}

function Bottle({ progress }: { progress: number }) {
  const ref = useRef<THREE.Group>(null);
  const pumpRef = useRef<THREE.Group>(null);
  
  useFrame(() => {
    if (!ref.current || !pumpRef.current) return;
    if (progress < 0.425) {
      ref.current.position.set(10, -10, 0);
    } else if (progress < 0.635) {
      ref.current.position.set(mapRange(progress, 0.515, 0.635, 3, 0), 0, 0);
      ref.current.rotation.set(0, 0, 0);
      pumpRef.current.position.y = 3;
    } else if (progress < 0.715) {
      ref.current.position.set(0, 0, 0);
      pumpRef.current.position.y = mapRange(progress, 0.635, 0.715, 3, 0);
    } else if (progress < 0.805) {
      ref.current.position.set(mapRange(progress, 0.715, 0.805, 0, 0.5), mapRange(progress, 0.715, 0.805, 0, 0.5), 0);
      ref.current.rotation.z = Math.sin(progress * 150) * 0.15;
    } else if (progress < 0.915) {
      ref.current.position.set(0.5, 0.5, 0);
      ref.current.rotation.z = 0;
    } else {
      ref.current.position.set(1.2, 0, 0.5);
      ref.current.rotation.set(0, -0.2, 0);
    }
  });

  return (
    <group ref={ref}>
      {/* Bottle Body */}
      <mesh castShadow receiveShadow position={[0, -0.6, 0]}>
        <cylinderGeometry args={[0.6, 0.6, 1.4, 64]} />
        <meshPhysicalMaterial color="#f0eee9" roughness={0.15} clearcoat={1} clearcoatRoughness={0.1} />
      </mesh>
      {/* Bottle Shoulder */}
      <mesh castShadow receiveShadow position={[0, 0.1, 0]}>
        <sphereGeometry args={[0.6, 64, 32, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshPhysicalMaterial color="#f0eee9" roughness={0.15} clearcoat={1} />
      </mesh>
      
      {/* Pump Assembly */}
      <group ref={pumpRef} position={[0, 0, 0]}>
        {/* Neck */}
        <mesh castShadow receiveShadow position={[0, 0.8, 0]}>
          <cylinderGeometry args={[0.2, 0.2, 0.3, 32]} />
          <meshStandardMaterial color="#dddddd" roughness={0.4} metalness={0.8} />
        </mesh>
        {/* Actuator Base */}
        <mesh castShadow receiveShadow position={[0, 1.05, 0]}>
          <cylinderGeometry args={[0.22, 0.22, 0.2, 32]} />
          <meshStandardMaterial color="#fafafa" roughness={0.3} />
        </mesh>
        {/* Actuator Head */}
        <mesh castShadow receiveShadow position={[0, 1.25, 0]}>
          <cylinderGeometry args={[0.18, 0.18, 0.3, 32]} />
          <meshStandardMaterial color="#fafafa" roughness={0.3} />
        </mesh>
        {/* Nozzle */}
        <mesh castShadow receiveShadow position={[0.25, 1.25, 0]} rotation={[0, 0, -Math.PI/2]}>
          <cylinderGeometry args={[0.08, 0.08, 0.3, 32]} />
          <meshStandardMaterial color="#e0e0e0" roughness={0.4} />
        </mesh>
      </group>
    </group>
  );
}

function Botanicals({ progress, noiseTex }: { progress: number, noiseTex: THREE.Texture | null }) {
  const ref = useRef<THREE.Group>(null);
  
  useFrame(() => {
    if (!ref.current) return;
    if (progress < 0.9) {
      ref.current.position.set(0, -10, 0);
    } else {
      ref.current.position.set(0, -1.8, 0);
    }
  });

  return (
    <group ref={ref}>
      {/* Tangerine */}
      <mesh castShadow receiveShadow position={[-2, 0.4, 1]}>
        <sphereGeometry args={[0.4, 32, 32]} />
        <meshStandardMaterial color="#e87c31" roughness={0.7} bumpMap={noiseTex} bumpScale={0.01} />
      </mesh>
      {/* Kaffir Lime */}
      <mesh castShadow receiveShadow position={[-1.2, 0.3, 1.8]}>
        <sphereGeometry args={[0.3, 32, 32]} />
        <meshStandardMaterial color="#4a633a" roughness={0.8} bumpMap={noiseTex} bumpScale={0.02} />
      </mesh>
      {/* Cedarwood Stick */}
      <mesh castShadow receiveShadow position={[2, 0.1, 1]} rotation={[Math.PI/2, 0.2, 0.5]}>
        <cylinderGeometry args={[0.1, 0.1, 1.5, 16]} />
        <meshStandardMaterial color="#5c4033" roughness={1} bumpMap={noiseTex} bumpScale={0.05} />
      </mesh>
    </group>
  );
}

function ParticlesAndMist({ progress }: { progress: number }) {
  const mistRef = useRef<THREE.Group>(null);
  
  useFrame(() => {
    if (mistRef.current) {
      mistRef.current.visible = (progress >= 0.805 && progress < 0.915);
      if (mistRef.current.visible) {
        mistRef.current.position.x = 1.0 + Math.random() * 0.1;
      }
    }
  });

  return (
    <>
      <Sparkles count={80} scale={6} size={1.5} speed={0.2} opacity={0.3} color="#ffffff" />
      <group ref={mistRef} position={[1, 1.8, 0]}>
        <Sparkles count={400} scale={[4, 1.5, 1.5]} size={3} speed={3} opacity={0.6} color="#ffffff" />
      </group>
    </>
  );
}

function Scene({ progress }: { progress: number }) {
  const [noiseTex, setNoiseTex] = useState<THREE.Texture | null>(null);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      setNoiseTex(ProceduralMaterials());
    }
  }, []);

  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 1.5, 7]} fov={30} />
      <Environment preset="apartment" environmentIntensity={0.8} />
      <SoftShadows size={20} samples={16} focus={0.5} />
      
      <ambientLight intensity={0.2} color="#ffffff" />
      <directionalLight 
        position={[8, 12, 5]} 
        intensity={1.2} 
        color="#fff1e0" 
        castShadow 
        shadow-mapSize={[2048, 2048]} 
        shadow-camera-near={0.5} 
        shadow-camera-far={25} 
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
        shadow-bias={-0.0001} 
      />
      <directionalLight position={[-5, 5, -5]} intensity={0.4} color="#d4e1ed" />
      
      <Float speed={1.5} rotationIntensity={0.02} floatIntensity={0.05}>
        <Pouch progress={progress} noiseTex={noiseTex} />
        <Film progress={progress} />
        <Glass progress={progress} />
        <Bottle progress={progress} />
      </Float>
      
      <Botanicals progress={progress} noiseTex={noiseTex} />
      <ParticlesAndMist progress={progress} />

      {/* Studio Backdrop for soft bouncing and contact shadows */}
      <mesh position={[0, -2, -2]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial color="#f0eae1" roughness={1} />
      </mesh>
      <mesh position={[0, 0, -5]} receiveShadow>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial color="#f0eae1" roughness={1} />
      </mesh>
      
      {/* High Quality Contact Shadows */}
      <ContactShadows position={[0, -1.99, 0]} opacity={0.7} scale={15} blur={2.5} far={4} resolution={1024} color="#3e3a35" />
    </>
  );
}

// --- Main UI Component ---

export function ChommsHouse3DHero({
  scrollHeight = "1100vh", brand, navLinks = [], ctaLabel,
  ctaHref = "#", title, subtitle, steps, className,
}: ChommsHouseHeroProps) {
  const spacerRef = useRef<HTMLDivElement>(null);
  
  const [progress, setProgress] = useState(0);
  const [activeIdx, setActiveIdx] = useState(0);
  const [stepLocal, setStepLocal] = useState(0);
  const [loaded, setLoaded] = useState(false);
  
  useEffect(() => {
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

  return (
    <div className={cx("ch-root", className)}>
      <div className={cx("ch-loader", loaded && "ch-loader-done")}>
        <div className="ch-loader-text">
          {loaded ? "Ready" : "Preparing High-Fidelity Experience"}
        </div>
        <div className="ch-loader-track">
          <span className="ch-loader-fill" style={{ width: loaded ? "100%" : "60%" }} />
        </div>
      </div>

      <div className="ch-stage">
        <div className="ch-canvas-wrap">
          <Canvas shadows dpr={[1, 2]} gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.1 }}>
            <Scene progress={progress} />
          </Canvas>
        </div>

        <div className="ch-copy">
          <h1 className="ch-title">{title}</h1>
          {subtitle && <p className={cx("ch-sub", progress > 0.02 && "ch-sub-hidden")}>{subtitle}</p>}
        </div>

        <div className="ch-card-wrap">
          {steps.map((s, i) => (
            <article key={s.num} className={cx("ch-card", i === activeIdx && "ch-card-active", i < activeIdx && "ch-card-prev")}
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
