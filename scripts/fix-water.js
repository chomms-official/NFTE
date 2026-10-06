const fs = require('fs');
let code = fs.readFileSync('src/components/ui/chomms-house-3d-hero.tsx', 'utf8');

// 1. Add WaterStream component
const waterStreamCode = `
function WaterStream({ progress }: { progress: number }) {
  const ref = useRef<THREE.Mesh>(null);
  
  useFrame(() => {
    if (!ref.current) return;
    if (progress > 0.515 && progress < 0.635) {
      ref.current.visible = true;
      const p = mapRange(progress, 0.515, 0.635, 0, 1);
      
      const gx = mapRange(progress, 0.515, 0.635, 0, -2);
      const gy = mapRange(progress, 0.515, 0.635, 0, 1.5);
      const gRot = mapRange(progress, 0.515, 0.635, 0, -Math.PI / 2.5);
      
      const localLipX = 0.66;
      const localLipY = 0.9;
      
      const lipX = gx + localLipX * Math.cos(gRot) - localLipY * Math.sin(gRot);
      const lipY = gy + localLipX * Math.sin(gRot) + localLipY * Math.cos(gRot);
      
      const bx = mapRange(progress, 0.515, 0.635, 3, 0);
      const openX = bx;
      const openY = 1.05;
      
      const dx = openX - lipX;
      const dy = openY - lipY;
      const dist = Math.sqrt(dx*dx + dy*dy);
      const angle = Math.atan2(dy, dx);
      
      const width = Math.sin(Math.pow(p, 0.5) * Math.PI) * 0.08;
      
      ref.current.rotation.z = angle - Math.PI/2;
      
      if (p < 0.15) {
        const reach = p / 0.15;
        ref.current.scale.set(width, dist * reach, width);
        ref.current.position.set(lipX + (dx/2) * reach, lipY + (dy/2) * reach, 0);
      } else if (p > 0.85) {
        const drop = (p - 0.85) / 0.15;
        ref.current.scale.set(width, dist * (1 - drop), width);
        const currentLipX = lipX + dx * drop;
        const currentLipY = lipY + dy * drop;
        ref.current.position.set(currentLipX + (openX - currentLipX)/2, currentLipY + (openY - currentLipY)/2, 0);
      } else {
        ref.current.scale.set(width, dist, width);
        ref.current.position.set(lipX + dx/2, lipY + dy/2, 0);
      }
    } else {
      ref.current.visible = false;
    }
  });

  return (
    <mesh ref={ref} visible={false}>
      <cylinderGeometry args={[1, 1, 1, 16]} />
      <meshPhysicalMaterial color="#9cb8a5" transmission={0.98} roughness={0.1} ior={1.33} transparent />
    </mesh>
  );
}
`;

if (!code.includes('function WaterStream')) {
  code = code.replace(/function Pouch/, waterStreamCode + '\nfunction Pouch');
}

// 2. Add waterMeshRef to Glass
if (!code.includes('const waterMeshRef = useRef<THREE.Mesh>(null);')) {
  code = code.replace(/const waterRef = useRef<THREE.MeshPhysicalMaterial>\(null\);/, 'const waterRef = useRef<THREE.MeshPhysicalMaterial>(null);\n    const waterMeshRef = useRef<THREE.Mesh>(null);');
  
  const glassAnimationCode = `
      if (waterMeshRef.current) {
        if (progress >= 0.515 && progress < 0.635) {
          const pour = mapRange(progress, 0.515, 0.635, 0, 1);
          const s = 1 - pour * 0.9;
          waterMeshRef.current.scale.set(1, s, 1);
          waterMeshRef.current.position.y = 0.001 - 0.75 * (1 - s);
        } else if (progress >= 0.635) {
          waterMeshRef.current.scale.set(1, 0.1, 1);
          waterMeshRef.current.position.y = 0.001 - 0.75 * 0.9;
        } else {
          waterMeshRef.current.scale.set(1, 1, 1);
          waterMeshRef.current.position.y = 0.001;
        }
      }
`;
  
  code = code.replace(/waterRef\.current\.color\.lerpColors[\s\S]*?\}/, '$&\n' + glassAnimationCode);
  code = code.replace(/<mesh position=\{\[0, 0.001, 0\]\}>/, '<mesh ref={waterMeshRef} position={[0, 0.001, 0]}>');
}

// 3. Mount WaterStream in Scene
if (!code.includes('<WaterStream progress={progress} />')) {
  code = code.replace(/<Bottle progress=\{progress\} bumpTex=\{mats\.bumpTex\} \/>/, '<Bottle progress={progress} bumpTex={mats.bumpTex} />\n            <WaterStream progress={progress} />');
}

fs.writeFileSync('src/components/ui/chomms-house-3d-hero.tsx', code);
