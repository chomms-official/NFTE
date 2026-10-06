const fs = require('fs');
let code = fs.readFileSync('src/components/ui/chomms-house-3d-hero.tsx', 'utf8');

// We will replace ProceduralMaterials and Pouch entirely to ensure perfection.
const optimizedCode = `function ProceduralMaterials() {
  // 1. Kraft Paper Base
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const id = ctx.createImageData(512, 512);
    const d = id.data;
    for (let i = 0; i < d.length; i += 4) {
      const noise = Math.random();
      d[i] = 140 + noise * 30;
      d[i+1] = 100 + noise * 20;
      d[i+2] = 65 + noise * 15;
      d[i+3] = 255;
    }
    ctx.putImageData(id, 0, 0);
    // Draw fibers
    ctx.strokeStyle = "rgba(0,0,0,0.08)";
    ctx.beginPath();
    for (let i = 0; i < 500; i++) {
      ctx.moveTo(Math.random() * 512, Math.random() * 512);
      ctx.lineTo(Math.random() * 512, Math.random() * 512);
    }
    ctx.stroke();
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
  pouchBumpCanvas.width = 512;
  pouchBumpCanvas.height = 512;
  const pctx = pouchBumpCanvas.getContext("2d");
  if (pctx) {
    pctx.fillStyle = "#808080";
    pctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 20; i++) {
      const x = Math.random() * 512, y = Math.random() * 512, r = 50 + Math.random() * 100;
      const grad = pctx.createRadialGradient(x, y, 0, x, y, r);
      const intensity = (Math.random() - 0.5) * 80;
      const c = Math.round(128 + intensity);
      grad.addColorStop(0, "rgba(" + c + "," + c + "," + c + ", 0.6)");
      grad.addColorStop(1, "rgba(128,128,128,0)");
      pctx.fillStyle = grad; pctx.beginPath(); pctx.arc(x, y, r, 0, Math.PI * 2); pctx.fill();
    }
    pctx.beginPath();
    for (let i = 0; i < 15; i++) {
      pctx.moveTo(Math.random() * 512, Math.random() * 512);
      pctx.lineTo(Math.random() * 512, Math.random() * 512);
    }
    pctx.strokeStyle = "rgba(200,200,200,0.5)"; pctx.lineWidth = 4; pctx.stroke();
  }
  const pouchBumpTex = new THREE.CanvasTexture(pouchBumpCanvas);
  pouchBumpTex.wrapS = THREE.RepeatWrapping; pouchBumpTex.wrapT = THREE.RepeatWrapping;

  // 4. Pouch Graphic Label (Isolated transparent texture)
  const labelCanvas = document.createElement("canvas");
  labelCanvas.width = 1024;
  labelCanvas.height = 1024;
  const lctx = labelCanvas.getContext("2d");
  if (lctx) {
    lctx.clearRect(0, 0, 1024, 1024);
    lctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
    lctx.lineWidth = 3;
    for(let i=0; i<40; i++) {
      lctx.beginPath();
      const sx = Math.random() * 1024, sy = Math.random() * 1024;
      lctx.moveTo(sx, sy);
      lctx.quadraticCurveTo(sx + (Math.random()-0.5)*200, sy + (Math.random()-0.5)*200, sx + (Math.random()-0.5)*300, sy + (Math.random()-0.5)*300);
      lctx.stroke();
    }
    lctx.fillStyle = "rgba(255, 255, 255, 0.95)";
    lctx.save();
    lctx.translate(512, 350); lctx.rotate(Math.PI/4); // Shifted down so it doesn't get torn
    lctx.fillRect(-25, -25, 50, 50); lctx.clearRect(-12, -12, 24, 24); 
    lctx.restore();
    lctx.textAlign = "center"; lctx.fillStyle = "rgba(255, 255, 255, 0.95)";
    lctx.font = "italic 700 110px Georgia, serif";
    lctx.fillText("Chomm's", 512, 510);
    lctx.font = "bold 32px sans-serif";
    lctx.fillText("H   O   U   S   E", 512, 580);
    lctx.font = "500 36px sans-serif";
    lctx.fillText("MOSQUITO", 512, 710);
    lctx.fillText("REPELLENT FILM", 512, 760);
    lctx.beginPath();
    lctx.arc(512, 810, 5, 0, Math.PI*2);
    lctx.moveTo(512, 810); lctx.lineTo(495, 800);
    lctx.moveTo(512, 810); lctx.lineTo(529, 800);
    lctx.moveTo(512, 815); lctx.lineTo(505, 825);
    lctx.moveTo(512, 815); lctx.lineTo(519, 825);
    lctx.strokeStyle = "rgba(255, 255, 255, 0.95)"; lctx.lineWidth = 3; lctx.stroke(); lctx.fill();
    lctx.font = "italic 28px Georgia, serif"; lctx.fillStyle = "rgba(255, 255, 255, 0.7)";
    lctx.fillText("Tangerine - Geraniol - Kaffir Lime", 512, 920);
    lctx.fillText("Lemon - Eucalyptus - Cedarwood", 512, 965);
  }
  const labelTex = new THREE.CanvasTexture(labelCanvas);

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
  
  // The Pouch center is at y=-0.1. Height is 2.0. (Top edge is 0.9, bottom edge is -1.1).
  // Let's tear it near the top. Tear line at y=0.7 (0.2 units from the top edge).
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
        {/* Front Label Bottom */}
        <mesh position={[0, -0.1, 0.08]} receiveShadow>
          <planeGeometry args={[1.4, 1.9]} />
          <meshStandardMaterial map={labelTex} transparent={true} alphaTest={0.05} depthWrite={false} clippingPlanes={[clipBottom]} clipIntersection={false} />
        </mesh>
        {/* Back Label Bottom */}
        <mesh position={[0, -0.1, -0.08]} rotation={[0, Math.PI, 0]} receiveShadow>
          <planeGeometry args={[1.4, 1.9]} />
          <meshStandardMaterial map={labelTex} transparent={true} alphaTest={0.05} depthWrite={false} clippingPlanes={[clipBottom]} clipIntersection={false} />
        </mesh>
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
        {/* Front Label Top */}
        <mesh position={[0, -0.1, 0.08]} receiveShadow>
          <planeGeometry args={[1.4, 1.9]} />
          <meshStandardMaterial map={labelTex} transparent={true} alphaTest={0.05} depthWrite={false} clippingPlanes={[clipTop]} clipIntersection={false} />
        </mesh>
        {/* Back Label Top */}
        <mesh position={[0, -0.1, -0.08]} rotation={[0, Math.PI, 0]} receiveShadow>
          <planeGeometry args={[1.4, 1.9]} />
          <meshStandardMaterial map={labelTex} transparent={true} alphaTest={0.05} depthWrite={false} clippingPlanes={[clipTop]} clipIntersection={false} />
        </mesh>
        
        {/* Tear Notches exactly at y=0.7 */}
        <mesh position={[-0.75, 0.7, 0]} rotation={[0, 0, Math.PI/4]}>
          <boxGeometry args={[0.1, 0.1, 0.1]} />
          <meshStandardMaterial color="#181916" />
        </mesh>
        <mesh position={[0.75, 0.7, 0]} rotation={[0, 0, Math.PI/4]}>
          <boxGeometry args={[0.1, 0.1, 0.1]} />
          <meshStandardMaterial color="#181916" />
        </mesh>
      </group>
    </group>
  );
}`;

const start = code.indexOf('function ProceduralMaterials() {');
const end = code.indexOf('function Film({');
if (start !== -1 && end !== -1) {
  code = code.substring(0, start) + optimizedCode + '\n\n' + code.substring(end);
}

fs.writeFileSync('src/components/ui/chomms-house-3d-hero.tsx', code);
