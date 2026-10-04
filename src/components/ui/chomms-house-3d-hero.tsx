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
  // 1. Kraft Paper Base + Graphic Label (Combined for PERFECT mapping)
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    // Kraft noise
    const id = ctx.createImageData(1024, 1024);
    const d = id.data;
    for (let x = 0; x < 1024; x += 2) {
      for (let y = 0; y < 1024; y += 2) {
        const noise = Math.random();
        const r = 140 + noise * 30;
        const g = 100 + noise * 20;
        const b = 65 + noise * 15;
        for (let dx = 0; dx < 2; dx++) {
          for (let dy = 0; dy < 2; dy++) {
            const i = ((y + dy) * 1024 + (x + dx)) * 4;
            d[i] = r; d[i+1] = g; d[i+2] = b; d[i+3] = 255;
          }
        }
      }
    }
    ctx.putImageData(id, 0, 0);
    
    // Draw fibers
    ctx.strokeStyle = "rgba(0,0,0,0.08)";
    ctx.beginPath();
    for (let i = 0; i < 1000; i++) {
      ctx.moveTo(Math.random() * 1024, Math.random() * 1024);
      ctx.lineTo(Math.random() * 1024, Math.random() * 1024);
    }
    ctx.stroke();

    // -- DRAW THE GRAPHIC LABEL DIRECTLY ON THE KRAFT PAPER --
    ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
    ctx.lineWidth = 3;
    for(let i=0; i<40; i++) {
      ctx.beginPath();
      const sx = Math.random() * 1024, sy = Math.random() * 1024;
      ctx.moveTo(sx, sy);
      ctx.quadraticCurveTo(sx + (Math.random()-0.5)*200, sy + (Math.random()-0.5)*200, sx + (Math.random()-0.5)*300, sy + (Math.random()-0.5)*300);
      ctx.stroke();
    }
    ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
    ctx.save();
    ctx.translate(512, 280); ctx.rotate(Math.PI/4);
    ctx.fillRect(-25, -25, 50, 50); ctx.clearRect(-12, -12, 24, 24); 
    ctx.restore();
    ctx.textAlign = "center"; ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
    ctx.font = "italic 700 110px Georgia, serif";
    ctx.fillText("Chomm's", 512, 440);
    ctx.font = "bold 32px sans-serif";
    ctx.fillText("H   O   U   S   E", 512, 510);
    ctx.font = "500 36px sans-serif";
    ctx.fillText("MOSQUITO", 512, 640);
    ctx.fillText("REPELLENT FILM", 512, 690);
    ctx.beginPath();
    ctx.arc(512, 740, 5, 0, Math.PI*2);
    ctx.moveTo(512, 740); ctx.lineTo(495, 730);
    ctx.moveTo(512, 740); ctx.lineTo(529, 730);
    ctx.moveTo(512, 745); ctx.lineTo(505, 755);
    ctx.moveTo(512, 745); ctx.lineTo(519, 755);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.95)"; ctx.lineWidth = 3; ctx.stroke(); ctx.fill();
    ctx.font = "italic 28px Georgia, serif"; ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
    ctx.fillText("Tangerine - Geraniol - Kaffir Lime", 512, 850);
    ctx.fillText("Lemon - Eucalyptus - Cedarwood", 512, 895);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping; tex.wrapT = THREE.RepeatWrapping;
  
  // 2. Glass Bump
  const bumpCanvas = document.createElement("canvas");
  bumpCanvas.width = 128;
  bumpCanvas.height = 128;
  const bctx = bumpCanvas.getContext("2d");
  if (bctx) {
    const id = bctx.createImageData(128, 128);
    for(let i=0; i<id.data.length; i+=4) {
       const v = Math.random() * 255;
       id.data[i] = id.data[i+1] = id.data[i+2] = v; id.data[i+3] = 255;
    }
    bctx.putImageData(id, 0, 0);
  }
  const bumpTex = new THREE.CanvasTexture(bumpCanvas);
  bumpTex.wrapS = THREE.RepeatWrapping; bumpTex.wrapT = THREE.RepeatWrapping;

  // 3. Pouch Wrinkle Bump (Optimized)
  const pouchBumpCanvas = document.createElement("canvas");
  pouchBumpCanvas.width = 1024;
  pouchBumpCanvas.height = 1024;
  const pctx = pouchBumpCanvas.getContext("2d");
  if (pctx) {
    pctx.fillStyle = "#808080";
    pctx.fillRect(0, 0, 1024, 1024);
    for (let i = 0; i < 20; i++) {
      const x = Math.random() * 1024, y = Math.random() * 1024, r = 100 + Math.random() * 200;
      const grad = pctx.createRadialGradient(x, y, 0, x, y, r);
      const intensity = (Math.random() - 0.5) * 80;
      const c = Math.round(128 + intensity);
      grad.addColorStop(0, "rgba(" + c + "," + c + "," + c + ", 0.6)");
      grad.addColorStop(1, "rgba(128,128,128,0)");
      pctx.fillStyle = grad; pctx.beginPath(); pctx.arc(x, y, r, 0, Math.PI * 2); pctx.fill();
    }
    pctx.beginPath();
    for (let i = 0; i < 15; i++) {
      pctx.moveTo(Math.random() * 1024, Math.random() * 1024);
      pctx.lineTo(Math.random() * 1024, Math.random() * 1024);
    }
    pctx.strokeStyle = "rgba(200,200,200,0.5)"; pctx.lineWidth = 6; pctx.stroke();
  }
  const pouchBumpTex = new THREE.CanvasTexture(pouchBumpCanvas);
  pouchBumpTex.wrapS = THREE.RepeatWrapping; pouchBumpTex.wrapT = THREE.RepeatWrapping;

  // 4. Label Tex is now baked
  const labelTex = tex;

  // 5. Film Fibrous Bump
  const filmBumpCanvas = document.createElement("canvas");
  filmBumpCanvas.width = 256;
  filmBumpCanvas.height = 256;
  const fctx = filmBumpCanvas.getContext("2d");
  if (fctx) {
     fctx.fillStyle = "#808080"; fctx.fillRect(0,0,256,256);
     fctx.beginPath();
     for(let i=0; i<500; i++) {
        fctx.moveTo(Math.random()*256, Math.random()*256);
        fctx.lineTo(Math.random()*256, Math.random()*256);
     }
     fctx.strokeStyle = "rgba(255,255,255,0.4)"; fctx.lineWidth = 1.5; fctx.stroke();
  }
  const filmBumpTex = new THREE.CanvasTexture(filmBumpCanvas);
  filmBumpTex.wrapS = THREE.RepeatWrapping; filmBumpTex.wrapT = THREE.RepeatWrapping;

  return { tex, bumpTex, pouchBumpTex, labelTex, filmBumpTex };
}

function Pouch({ progress, tex, bumpTex, labelTex }: { progress: number, tex: THREE.Texture | null, bumpTex: THREE.Texture | null, labelTex: THREE.Texture | null }) {
  const ref = useRef<THREE.Group>(null);
  const topSealRef = useRef<THREE.Group>(null);
  
  // Create local clipping planes
  const clipBottom = React.useMemo(() => new THREE.Plane(new THREE.Vector3(0, -1, 0), 0.7), []);
  const clipTop = React.useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.7), []);

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

    if (topSealRef.current) {
      if (progress < 0.055) {
        topSealRef.current.position.set(0, 0, 0);
        topSealRef.current.rotation.set(0, 0, 0);
      } else if (progress < 0.145) {
        const tear = mapRange(progress, 0.055, 0.145, 0, 1);
        // Animate the torn top piece flying away
        topSealRef.current.position.set(tear * 3, -tear * 1.5, tear * 1.5);
        topSealRef.current.rotation.set(tear * 2, tear * 1.5, -tear * 0.8);
      } else {
        topSealRef.current.position.set(100, 100, 100);
      }
    }
  });

  return (
    <group ref={ref}>
      {/* Bottom Part (Keeps everything below y=0.7) */}
      <group>
        <RoundedBox args={[1.5, 2.0, 0.15]} position={[0, -0.1, 0]} radius={0.05} smoothness={4} castShadow receiveShadow>
          <meshStandardMaterial map={tex} color="#e0c5aa" roughness={0.95} bumpMap={bumpTex} bumpScale={0.04} side={THREE.DoubleSide} clippingPlanes={[clipBottom]} clipIntersection={false} />
        </RoundedBox>
        <RoundedBox args={[0.08, 2.0, 0.1]} position={[-0.75, -0.1, 0]} radius={0.02} castShadow receiveShadow>
          <meshStandardMaterial map={tex} color="#d4b496" roughness={0.9} bumpMap={bumpTex} bumpScale={0.01} side={THREE.DoubleSide} clippingPlanes={[clipBottom]} clipIntersection={false} />
        </RoundedBox>
        <RoundedBox args={[0.08, 2.0, 0.1]} position={[0.75, -0.1, 0]} radius={0.02} castShadow receiveShadow>
          <meshStandardMaterial map={tex} color="#d4b496" roughness={0.9} bumpMap={bumpTex} bumpScale={0.01} side={THREE.DoubleSide} clippingPlanes={[clipBottom]} clipIntersection={false} />
        </RoundedBox>
      </group>
      
      {/* Top Part (Tears Off, keeps everything above y=0.7) */}
      <group ref={topSealRef}>
        <RoundedBox args={[1.5, 2.0, 0.15]} position={[0, -0.1, 0]} radius={0.05} smoothness={4} castShadow receiveShadow>
          <meshStandardMaterial map={tex} color="#e0c5aa" roughness={0.95} bumpMap={bumpTex} bumpScale={0.04} side={THREE.DoubleSide} clippingPlanes={[clipTop]} clipIntersection={false} />
        </RoundedBox>
        <RoundedBox args={[0.08, 2.0, 0.1]} position={[-0.75, -0.1, 0]} radius={0.02} castShadow receiveShadow>
          <meshStandardMaterial map={tex} color="#d4b496" roughness={0.9} bumpMap={bumpTex} bumpScale={0.01} side={THREE.DoubleSide} clippingPlanes={[clipTop]} clipIntersection={false} />
        </RoundedBox>
        <RoundedBox args={[0.08, 2.0, 0.1]} position={[0.75, -0.1, 0]} radius={0.02} castShadow receiveShadow>
          <meshStandardMaterial map={tex} color="#d4b496" roughness={0.9} bumpMap={bumpTex} bumpScale={0.01} side={THREE.DoubleSide} clippingPlanes={[clipTop]} clipIntersection={false} />
        </RoundedBox>
        
        {/* Tear Notches (Black triangles) attached to the top part */}
        <mesh position={[-0.75, 0.65, 0]} rotation={[0, 0, Math.PI/4]}>
          <boxGeometry args={[0.1, 0.1, 0.08]} />
          <meshStandardMaterial color="#181916" />
        </mesh>
        <mesh position={[0.75, 0.65, 0]} rotation={[0, 0, Math.PI/4]}>
          <boxGeometry args={[0.1, 0.1, 0.08]} />
          <meshStandardMaterial color="#181916" />
        </mesh>
      </group>
    </group>
  );
}

function Film({ progress, filmBumpTex }: { progress: number, filmBumpTex: THREE.Texture | null }) {
  const ref = useRef<THREE.Mesh>(null);
  const matRef = useRef<THREE.MeshPhysicalMaterial>(null);

  useFrame(() => {
    if (!ref.current || !matRef.current) return;
    if (progress < 0.145) {
      ref.current.position.set(0, 0.5, 1.5);
      matRef.current.opacity = 0;
    } else if (progress < 0.235) {
      matRef.current.opacity = 0.95;
      ref.current.position.set(0, mapRange(progress, 0.145, 0.235, 0.5, 1.5), mapRange(progress, 0.145, 0.235, 1.5, 2.5));
      ref.current.rotation.set(mapRange(progress, 0.145, 0.235, 0, -0.5), 0, 0);
    } else if (progress < 0.325) {
      ref.current.position.set(0, 2, 0);
      ref.current.rotation.set(-0.5, 0, 0);
      matRef.current.opacity = 0.95;
    } else if (progress < 0.425) {
      ref.current.position.set(0, mapRange(progress, 0.325, 0.425, 2, 0), 0);
      matRef.current.opacity = mapRange(progress, 0.325, 0.425, 0.95, 0);
    } else {
      matRef.current.opacity = 0;
    }
  });

  return (
    <mesh ref={ref} castShadow>
      {/* 5x5 perfectly flat sheet (scaled slightly relative to scene) */}
      <planeGeometry args={[1.5, 1.5, 32, 32]} />
      <meshPhysicalMaterial 
        ref={matRef} 
        color="#f7f3ec" 
        transmission={0.4} 
        roughness={0.8} 
        bumpMap={filmBumpTex}
        bumpScale={0.05}
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
      
      <group ref={pumpRef} position={[0, 0, 0]}>
        <mesh castShadow receiveShadow position={[0, 0.9, 0]}>
          <cylinderGeometry args={[0.22, 0.22, 0.3, 64]} />
          <meshStandardMaterial color="#d4d4d4" roughness={0.3} metalness={0.8} />
        </mesh>
        <mesh castShadow receiveShadow position={[0, 1.15, 0]}>
          <cylinderGeometry args={[0.24, 0.24, 0.2, 64]} />
          <meshPhysicalMaterial color="#ffffff" roughness={0.2} clearcoat={1} />
        </mesh>
        <mesh castShadow receiveShadow position={[0, 1.35, 0]}>
          <cylinderGeometry args={[0.2, 0.2, 0.3, 64]} />
          <meshPhysicalMaterial color="#ffffff" roughness={0.2} clearcoat={1} />
        </mesh>
        <mesh castShadow receiveShadow position={[0, 1.5, 0]}>
          <sphereGeometry args={[0.2, 64, 32, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshPhysicalMaterial color="#ffffff" roughness={0.2} clearcoat={1} />
        </mesh>
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
      <mesh castShadow receiveShadow position={[-2, 0.4, 1]}>
        <sphereGeometry args={[0.4, 64, 64]} />
        <meshStandardMaterial color="#eb7b28" roughness={0.6} bumpMap={bumpTex} bumpScale={0.015} />
      </mesh>
      <mesh castShadow receiveShadow position={[-1.2, 0.3, 1.8]}>
        <sphereGeometry args={[0.3, 64, 64]} />
        <meshStandardMaterial color="#40592e" roughness={0.8} bumpMap={bumpTex} bumpScale={0.03} />
      </mesh>
      <mesh castShadow receiveShadow position={[2, 0.1, 1]} rotation={[Math.PI/2, 0.2, 0.5]}>
        <cylinderGeometry args={[0.1, 0.1, 1.5, 32]} />
        <meshStandardMaterial color="#5c4033" roughness={1} bumpMap={bumpTex} bumpScale={0.08} />
      </mesh>
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
      <Sparkles count={50} scale={8} size={1.5} speed={0.2} opacity={0.3} color="#ffffff" />
      <group ref={mistRef} position={[1, 1.8, 0]}>
        <Sparkles count={200} scale={[5, 2, 2]} size={2} speed={4} opacity={0.6} color="#ffffff" />
      </group>
    </>
  );
}

function Scene({ progress }: { progress: number }) {
  const [mats, setMats] = useState<{ tex: THREE.Texture, bumpTex: THREE.Texture, pouchBumpTex: THREE.Texture, labelTex: THREE.Texture, filmBumpTex: THREE.Texture } | null>(null);

  useEffect(() => {
    if (typeof document !== "undefined") {
      setMats(ProceduralMaterials() as any);
    }
  }, []);

  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 1.5, 7]} fov={30} />
      <Environment preset="studio" environmentIntensity={1.2} />
            
      <ambientLight intensity={0.1} color="#ffffff" />
      
      <SpotLight
        position={[5, 12, 6]}
        angle={0.4}
        penumbra={0.8}
        intensity={3.5}
        color="#fff5e6"
        castShadow
        shadow-mapSize={[4096, 4096]}
        shadow-bias={-0.0001}
      />
      
      <directionalLight position={[-8, 5, -5]} intensity={0.6} color="#e0ecf8" />
      
      {mats && (
        <>
          <Float speed={1.2} rotationIntensity={0.015} floatIntensity={0.03}>
            <Pouch progress={progress} tex={mats.tex} bumpTex={mats.pouchBumpTex} labelTex={mats.labelTex} />
            <Film progress={progress} filmBumpTex={mats.filmBumpTex} />
            <Glass progress={progress} bumpTex={mats.bumpTex} />
            <Bottle progress={progress} bumpTex={mats.bumpTex} />
          </Float>
          <Botanicals progress={progress} bumpTex={mats.bumpTex} />
        </>
      )}
      
      <ParticlesAndMist progress={progress} />
      
      {/* ContactShadows floating on CSS background */}
      <ContactShadows position={[0, -1.99, 0]} opacity={0.6} scale={20} blur={2.5} far={4} resolution={512} color="#000000" />
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
          <Canvas shadows dpr={[1, 2]} gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.2, localClippingEnabled: true }}>
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
