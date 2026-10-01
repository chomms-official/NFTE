"use client";

import * as React from "react";
import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, PerspectiveCamera, ContactShadows, Float, Sparkles, RoundedBox, SoftShadows, SpotLight } from "@react-three/drei";
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

function ProceduralMaterials() {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    // Advanced Kraft Paper Texture Generation
    for (let x = 0; x < 1024; x++) {
      for (let y = 0; y < 1024; y++) {
        const noise = Math.random();
        const r = 160 + noise * 40;
        const g = 120 + noise * 30;
        const b = 80 + noise * 20;
        ctx.fillStyle = 'rgb(' + Math.round(r) + ',' + Math.round(g) + ',' + Math.round(b) + ')';
        ctx.fillRect(x, y, 1, 1);
      }
    }
    // Add fibers
    for (let i = 0; i < 5000; i++) {
      ctx.beginPath();
      ctx.moveTo(Math.random() * 1024, Math.random() * 1024);
      ctx.lineTo(Math.random() * 1024, Math.random() * 1024);
      ctx.strokeStyle = 'rgba(0,0,0,0.05)';
      ctx.lineWidth = Math.random() * 1.5;
      ctx.stroke();
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  
  // Bump Map for Glass/Plastic imperfections
  const bumpCanvas = document.createElement("canvas");
  bumpCanvas.width = 512;
  bumpCanvas.height = 512;
  const bctx = bumpCanvas.getContext("2d");
  if (bctx) {
    for (let x = 0; x < 512; x++) {
      for (let y = 0; y < 512; y++) {
        const v = Math.round(Math.random() * 255);
        bctx.fillStyle = 'rgb(' + v + ',' + v + ',' + v + ')';
        bctx.fillRect(x, y, 1, 1);
      }
    }
  }
  const bumpTex = new THREE.CanvasTexture(bumpCanvas);
  bumpTex.wrapS = THREE.RepeatWrapping;
  bumpTex.wrapT = THREE.RepeatWrapping;

  return { tex, bumpTex };
}

function Pouch({ progress, tex, bumpTex }: { progress: number, tex: THREE.Texture | null, bumpTex: THREE.Texture | null }) {
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
      {/* Main Pouch Body */}
      <RoundedBox args={[1.5, 2.0, 0.15]} position={[0, -0.1, 0]} radius={0.05} smoothness={8} castShadow receiveShadow>
        <meshStandardMaterial 
          map={tex}
          color="#d9bfa3" 
          roughness={0.9} 
          bumpMap={bumpTex} 
          bumpScale={0.005}
        />
      </RoundedBox>
      {/* Top Seal */}
      <RoundedBox args={[1.5, 0.3, 0.04]} position={[0, 1.05, 0]} radius={0.01} smoothness={4} castShadow receiveShadow>
        <meshStandardMaterial map={tex} color="#d9bfa3" roughness={0.9} bumpMap={bumpTex} bumpScale={0.005} />
      </RoundedBox>
      {/* Side Seams */}
      <RoundedBox args={[0.04, 2.0, 0.12]} position={[-0.75, -0.1, 0]} radius={0.01} castShadow receiveShadow>
        <meshStandardMaterial map={tex} color="#d9bfa3" roughness={0.9} bumpMap={bumpTex} bumpScale={0.005} />
      </RoundedBox>
      <RoundedBox args={[0.04, 2.0, 0.12]} position={[0.75, -0.1, 0]} radius={0.01} castShadow receiveShadow>
        <meshStandardMaterial map={tex} color="#d9bfa3" roughness={0.9} bumpMap={bumpTex} bumpScale={0.005} />
      </RoundedBox>
      {/* Front Label with high-end print look */}
      <mesh position={[0, -0.1, 0.08]} receiveShadow>
        <planeGeometry args={[1.2, 1.6]} />
        <meshPhysicalMaterial 
          color="#fdfbf7" 
          roughness={0.7} 
          clearcoat={0.1} 
          clearcoatRoughness={0.8}
        />
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
      <cylinderGeometry args={[2, 2, 1.4, 32, 1, true, -0.25, 0.5]} />
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

function Glass({ progress, bumpTex }: { progress: number, bumpTex: THREE.Texture | null }) {
  const ref = useRef<THREE.Group>(null);
  const waterRef = useRef<THREE.MeshPhysicalMaterial>(null);
  
  const glassPoints = useMemo(() => {
    const pts = [];
    for (let i = 0; i <= 10; i++) pts.push(new THREE.Vector2(0.6 * (i/10), -0.9)); 
    for (let i = 0; i <= 20; i++) pts.push(new THREE.Vector2(0.6 + 0.1*(i/20), -0.9 + 1.8*(i/20))); 
    pts.push(new THREE.Vector2(0.7, 0.9)); 
    pts.push(new THREE.Vector2(0.66, 0.9)); 
    for (let i = 20; i >= 0; i--) pts.push(new THREE.Vector2(0.56 + 0.1*(i/20), -0.75 + 1.65*(i/20))); 
    pts.push(new THREE.Vector2(0, -0.75)); 
    return pts;
  }, []);

  const waterPoints = useMemo(() => {
    const pts = [];
    pts.push(new THREE.Vector2(0, -0.75));
    for (let i = 0; i <= 20; i++) pts.push(new THREE.Vector2(0.56 + 0.1*(i/20), -0.75 + 1.2*(i/20)));
    pts.push(new THREE.Vector2(0, 0.45)); 
    return pts;
  }, []);

  useFrame(() => {
    if (!ref.current || !waterRef.current) return;
    if (progress < 0.235) {
      ref.current.position.set(0, -10, 0);
    } else if (progress < 0.515) {
      ref.current.position.set(0, 0, 0);
      ref.current.rotation.set(0, progress * Math.PI, 0);
      waterRef.current.color.setHex(0xcde3d6); 
    } else if (progress < 0.635) {
      ref.current.position.set(mapRange(progress, 0.515, 0.635, 0, -2), mapRange(progress, 0.515, 0.635, 0, 1.5), 0);
      ref.current.rotation.z = mapRange(progress, 0.515, 0.635, 0, -Math.PI / 2.5);
    } else {
      ref.current.position.set(0, -10, 0);
    }
    
    if (progress >= 0.325 && progress < 0.515) {
      const dissolve = mapRange(progress, 0.325, 0.515, 0, 1);
      waterRef.current.color.lerpColors(new THREE.Color(0xcde3d6), new THREE.Color(0x9cb8a5), dissolve);
    }
  });

  return (
    <group ref={ref}>
      <mesh castShadow receiveShadow>
        <latheGeometry args={[glassPoints, 64]} />
        <meshPhysicalMaterial 
          color="#ffffff" 
          transmission={1} 
          roughness={0.05}
          ior={1.52} 
          thickness={0.5}
          clearcoat={1}
          clearcoatRoughness={0.05}
          bumpMap={bumpTex}
          bumpScale={0.0005}
          transparent 
        />
      </mesh>
      <mesh position={[0, 0.001, 0]}>
        <latheGeometry args={[waterPoints, 64]} />
        <meshPhysicalMaterial 
          ref={waterRef}
          color="#cde3d6" 
          transmission={0.98} 
          roughness={0.05} 
          ior={1.33}
          attenuationColor="#a9c9b5"
          attenuationDistance={3}
          transparent 
        />
      </mesh>
    </group>
  );
}

function Bottle({ progress, bumpTex }: { progress: number, bumpTex: THREE.Texture | null }) {
  const ref = useRef<THREE.Group>(null);
  const pumpRef = useRef<THREE.Group>(null);
  
  const bottlePoints = useMemo(() => {
    const pts = [];
    pts.push(new THREE.Vector2(0, -0.8));
    pts.push(new THREE.Vector2(0.55, -0.8)); 
    pts.push(new THREE.Vector2(0.6, -0.75)); 
    for(let i=0; i<=10; i++) pts.push(new THREE.Vector2(0.6, -0.75 + 1.25*(i/10))); 
    pts.push(new THREE.Vector2(0.55, 0.55)); 
    pts.push(new THREE.Vector2(0.4, 0.65)); 
    pts.push(new THREE.Vector2(0.25, 0.75)); 
    pts.push(new THREE.Vector2(0.2, 0.85)); 
    pts.push(new THREE.Vector2(0.2, 1.0)); 
    pts.push(new THREE.Vector2(0, 1.0)); 
    return pts;
  }, []);

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
      {/* High-fidelity Bottle Body using Lathe */}
      <mesh castShadow receiveShadow>
        <latheGeometry args={[bottlePoints, 64]} />
        <meshPhysicalMaterial 
          color="#f4f1eb" 
          roughness={0.12} 
          clearcoat={1} 
          clearcoatRoughness={0.08} 
          bumpMap={bumpTex}
          bumpScale={0.0002}
        />
      </mesh>
      
      {/* Complex Pump Assembly */}
      <group ref={pumpRef} position={[0, 0, 0]}>
        {/* Neck Collar */}
        <mesh castShadow receiveShadow position={[0, 0.9, 0]}>
          <cylinderGeometry args={[0.22, 0.22, 0.3, 64]} />
          <meshStandardMaterial color="#d4d4d4" roughness={0.3} metalness={0.8} />
        </mesh>
        {/* Actuator Base */}
        <mesh castShadow receiveShadow position={[0, 1.15, 0]}>
          <cylinderGeometry args={[0.24, 0.24, 0.2, 64]} />
          <meshPhysicalMaterial color="#ffffff" roughness={0.2} clearcoat={1} />
        </mesh>
        {/* Actuator Head with Curved Top */}
        <mesh castShadow receiveShadow position={[0, 1.35, 0]}>
          <cylinderGeometry args={[0.2, 0.2, 0.3, 64]} />
          <meshPhysicalMaterial color="#ffffff" roughness={0.2} clearcoat={1} />
        </mesh>
        <mesh castShadow receiveShadow position={[0, 1.5, 0]}>
          <sphereGeometry args={[0.2, 64, 32, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshPhysicalMaterial color="#ffffff" roughness={0.2} clearcoat={1} />
        </mesh>
        {/* Nozzle Array */}
        <mesh castShadow receiveShadow position={[0.25, 1.35, 0]} rotation={[0, 0, -Math.PI/2]}>
          <cylinderGeometry args={[0.08, 0.08, 0.2, 32]} />
          <meshPhysicalMaterial color="#ffffff" roughness={0.2} clearcoat={1} />
        </mesh>
        <mesh castShadow receiveShadow position={[0.36, 1.35, 0]} rotation={[0, 0, -Math.PI/2]}>
          <cylinderGeometry args={[0.04, 0.04, 0.02, 32]} />
          <meshStandardMaterial color="#333333" roughness={0.8} />
        </mesh>
      </group>
    </group>
  );
}

function Botanicals({ progress, bumpTex }: { progress: number, bumpTex: THREE.Texture | null }) {
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
      {/* High-res Tangerine */}
      <mesh castShadow receiveShadow position={[-2, 0.4, 1]}>
        <sphereGeometry args={[0.4, 64, 64]} />
        <meshStandardMaterial color="#eb7b28" roughness={0.6} bumpMap={bumpTex} bumpScale={0.015} />
      </mesh>
      {/* High-res Kaffir Lime */}
      <mesh castShadow receiveShadow position={[-1.2, 0.3, 1.8]}>
        <sphereGeometry args={[0.3, 64, 64]} />
        <meshStandardMaterial color="#40592e" roughness={0.8} bumpMap={bumpTex} bumpScale={0.03} />
      </mesh>
      {/* Cedarwood Stick */}
      <mesh castShadow receiveShadow position={[2, 0.1, 1]} rotation={[Math.PI/2, 0.2, 0.5]}>
        <cylinderGeometry args={[0.1, 0.1, 1.5, 32]} />
        <meshStandardMaterial color="#5c4033" roughness={1} bumpMap={bumpTex} bumpScale={0.08} />
      </mesh>
      {/* Eucalyptus Leaves (Procedural) */}
      <mesh castShadow receiveShadow position={[1.5, 0.05, 1.5]} rotation={[-Math.PI/2, 0, 0.3]}>
        <cylinderGeometry args={[0.3, 0.3, 0.02, 32, 1, false, 0, Math.PI]} />
        <meshStandardMaterial color="#687d6d" roughness={0.7} bumpMap={bumpTex} bumpScale={0.002} />
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
      <Sparkles count={150} scale={8} size={1.5} speed={0.2} opacity={0.3} color="#ffffff" />
      <group ref={mistRef} position={[1, 1.8, 0]}>
        <Sparkles count={800} scale={[5, 2, 2]} size={2} speed={4} opacity={0.6} color="#ffffff" />
      </group>
    </>
  );
}

function Scene({ progress }: { progress: number }) {
  const [mats, setMats] = useState<{ tex: THREE.Texture, bumpTex: THREE.Texture } | null>(null);

  useEffect(() => {
    if (typeof document !== "undefined") {
      setMats(ProceduralMaterials());
    }
  }, []);

  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 1.5, 7]} fov={30} />
      <Environment preset="studio" environmentIntensity={1.2} />
      <SoftShadows size={25} samples={24} focus={0.5} />
      
      <ambientLight intensity={0.4} color="#ffffff" />
      
      {/* Cinematic SpotLight for Premium Product Feel */}
      <SpotLight
        position={[5, 12, 6]}
        angle={0.4}
        penumbra={0.8}
        intensity={2.5}
        color="#fff5e6"
        castShadow
        shadow-mapSize={[4096, 4096]}
        shadow-bias={-0.0001}
      />
      
      <directionalLight position={[-8, 5, -5]} intensity={0.6} color="#e0ecf8" />
      
      <Float speed={1.2} rotationIntensity={0.015} floatIntensity={0.03}>
        <Pouch progress={progress} tex={mats?.tex || null} bumpTex={mats?.bumpTex || null} />
        <Film progress={progress} />
        <Glass progress={progress} bumpTex={mats?.bumpTex || null} />
        <Bottle progress={progress} bumpTex={mats?.bumpTex || null} />
      </Float>
      
      <Botanicals progress={progress} bumpTex={mats?.bumpTex || null} />
      <ParticlesAndMist progress={progress} />

      {/* Infinite Infinity Cove Backdrop */}
      <mesh position={[0, -2, -3]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[200, 200]} />
        <meshPhysicalMaterial color="#f2eee9" roughness={1} clearcoat={0.1} />
      </mesh>
      
      <ContactShadows position={[0, -1.99, 0]} opacity={0.8} scale={20} blur={3} far={4} resolution={2048} color="#2e2a25" />
    </>
  );
}

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
          {loaded ? "Ready" : "Preparing Ultra-High Fidelity Models"}
        </div>
        <div className="ch-loader-track">
          <span className="ch-loader-fill" style={{ width: loaded ? "100%" : "60%" }} />
        </div>
      </div>

      <div className="ch-stage">
        <div className="ch-canvas-wrap">
          <Canvas shadows dpr={[1, 2]} gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.2 }}>
            <React.Suspense fallback={null}>
              <Scene progress={progress} />
            </React.Suspense>
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
                        <span style={{ transform: 'scaleX(' + (j < activeIdx ? 1 : j === activeIdx ? stepLocal : 0) + ')' }} />
                      </i>
                    ))}
                  </div>
                  <span className="ch-card-label">{s.label}</span>
                </div>
              </div>
            </article>
          ))}
        </div>

        <div className="ch-progress"><span style={{ width: (progress * 100) + "%" }} /></div>
        <div className="ch-step-badge">{String(activeIdx + 1).padStart(2, "0")} <i/> {String(steps.length).padStart(2, "0")}</div>
      </div>

      <div ref={spacerRef} className="ch-spacer" style={{ height: scrollHeight }} />
    </div>
  );
}
