const fs = require('fs');
let code = fs.readFileSync('src/components/ui/chomms-house-3d-hero.tsx', 'utf8');

const toonHook = `
function ToonEffect() {
  const { scene } = useThree();
  const toonGradient = useMemo(() => {
    const colors = new Uint8Array([
      60, 60, 60, 255,
      140, 140, 140, 255,
      255, 255, 255, 255,
    ]);
    const gradientMap = new THREE.DataTexture(colors, 3, 1, THREE.RGBAFormat);
    gradientMap.needsUpdate = true;
    gradientMap.minFilter = THREE.NearestFilter;
    gradientMap.magFilter = THREE.NearestFilter;
    gradientMap.generateMipmaps = false;
    return gradientMap;
  }, []);

  useEffect(() => {
    // Traverse and replace materials
    scene.traverse((child: any) => {
      if (child.isMesh && child.material) {
        // Skip if already toon
        if (child.material.type === 'MeshToonMaterial') return;
        
        const old = child.material;
        
        // Special case for glass/water to look like anime glass
        let opacity = old.opacity;
        let transparent = old.transparent;
        if (old.transmission > 0 || old.type === 'MeshPhysicalMaterial') {
          transparent = true;
          opacity = 0.6;
        }

        const toon = new THREE.MeshToonMaterial({
          color: old.color,
          map: old.map,
          transparent: transparent,
          opacity: opacity,
          side: old.side,
          clippingPlanes: old.clippingPlanes,
          clipIntersection: old.clipIntersection,
          alphaTest: old.alphaTest,
          gradientMap: toonGradient
        });
        
        child.material = toon;
      }
    });
  }, [scene, toonGradient]);
  
  return null;
}
`;

code = code.replace(/function Scene\(\{ progress \}: \{ progress: number \}\) \{/, toonHook + '\nfunction Scene({ progress }: { progress: number }) {');

code = code.replace(/<Environment preset="studio" environmentIntensity=\{1\.2\} \/>/, '<Environment preset="studio" environmentIntensity={1.2} />\n        <ToonEffect />');

fs.writeFileSync('src/components/ui/chomms-house-3d-hero.tsx', code);
