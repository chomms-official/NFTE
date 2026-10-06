const fs = require('fs');
let code = fs.readFileSync('src/components/ui/chomms-house-3d-hero.tsx', 'utf8');

// 1. Add import
if (!code.includes('Outlines,')) {
  code = code.replace('import { Environment,', 'import { Environment, Outlines,');
}

// 2. Insert toonGradient into Scene
const toonGradientCode = "\\n  const toonGradient = useMemo(() => {\\n    const colors = new Uint8Array([\\n      60, 60, 60, 255,\\n      140, 140, 140, 255,\\n      255, 255, 255, 255,\\n    ]);\\n    const gradientMap = new THREE.DataTexture(colors, 3, 1, THREE.RGBAFormat);\\n    gradientMap.needsUpdate = true;\\n    gradientMap.minFilter = THREE.NearestFilter;\\n    gradientMap.magFilter = THREE.NearestFilter;\\n    gradientMap.generateMipmaps = false;\\n    return gradientMap;\\n  }, []);\\n";
code = code.replace(/function Scene\(\{ progress \}: \{ progress: number \}\) \{/, 'function Scene({ progress }: { progress: number }) {' + toonGradientCode);

// 3. Pass toonGradient down
code = code.replace(/<Pouch progress=\{progress\}/g, '<Pouch progress={progress} toonGradient={toonGradient}');
code = code.replace(/<Film progress=\{progress\}/g, '<Film progress={progress} toonGradient={toonGradient}');
code = code.replace(/<Glass progress=\{progress\}/g, '<Glass progress={progress} toonGradient={toonGradient}');
code = code.replace(/<Bottle progress=\{progress\}/g, '<Bottle progress={progress} toonGradient={toonGradient}');
code = code.replace(/<WaterStream progress=\{progress\}/g, '<WaterStream progress={progress} toonGradient={toonGradient}');
code = code.replace(/<Botanicals progress=\{progress\}/g, '<Botanicals progress={progress} toonGradient={toonGradient}');

// 4. Update signatures to accept toonGradient
const comps = ['Pouch', 'Film', 'Glass', 'Bottle', 'Botanicals', 'WaterStream'];
for (const comp of comps) {
  const regex = new RegExp('function ' + comp + '\\\\((.*?)\\\\) \\\\{', 'g');
  code = code.replace(regex, (match, args) => {
    if (!args.includes('toonGradient')) {
      const newArgs = args.replace(/\\}: \\{/, ', toonGradient }: { ').replace(/ \\}$/, ', toonGradient: THREE.DataTexture }');
      return 'function ' + comp + '(' + newArgs + ') {';
    }
    return match;
  });
}

// 5. Replace materials and append Outlines
code = code.replace(/<meshStandardMaterial([^>]*?)\/>/g, (match, props) => {
  let newProps = props;
  const invalid = ['roughness', 'metalness', 'bumpMap', 'bumpScale', 'clearcoatRoughness', 'clearcoat'];
  for (const inv of invalid) {
    newProps = newProps.replace(new RegExp('\\\\s' + inv + '=\\\\{[^\\\\}]+\\\\\\}', 'g'), '');
    newProps = newProps.replace(new RegExp('\\\\s' + inv + '="[^"]+"', 'g'), '');
  }
  return '<meshToonMaterial gradientMap={toonGradient}' + newProps + '/>\\n          <Outlines thickness={0.015} color="#1c1c1c" />';
});

code = code.replace(/<meshPhysicalMaterial([^>]*?)\/>/g, (match, props) => {
  let newProps = props;
  const invalid = ['roughness', 'metalness', 'transmission', 'ior', 'thickness', 'clearcoatRoughness', 'clearcoat', 'attenuationColor', 'attenuationDistance', 'bumpMap', 'bumpScale'];
  for (const inv of invalid) {
    newProps = newProps.replace(new RegExp('\\\\s' + inv + '=\\\\{[^\\\\}]+\\\\\\}', 'g'), '');
    newProps = newProps.replace(new RegExp('\\\\s' + inv + '="[^"]+"', 'g'), '');
  }
  return '<meshToonMaterial gradientMap={toonGradient}' + newProps + '/>\\n          <Outlines thickness={0.015} color="#1c1c1c" />';
});

// 6. Fix glass/water specific opacity to look like anime
code = code.replace(/<meshToonMaterial gradientMap=\{toonGradient\}\s*color="#ffffff"/g, '<meshToonMaterial gradientMap={toonGradient} color="#dcedfc" transparent opacity={0.3} side={THREE.DoubleSide} ');
code = code.replace(/<meshToonMaterial gradientMap=\{toonGradient\}\s*ref=\{waterRef\}\s*color="#cde3d6"/g, '<meshToonMaterial gradientMap={toonGradient} ref={waterRef as any} color="#72b2f2" transparent opacity={0.6} side={THREE.DoubleSide} ');
code = code.replace(/<meshToonMaterial gradientMap=\{toonGradient\}\s*color="#9cb8a5"/g, '<meshToonMaterial gradientMap={toonGradient} color="#72b2f2" transparent opacity={0.6} ');

// 7. Update Ref type
code = code.replace(/useRef<THREE\.MeshPhysicalMaterial>/g, 'useRef<THREE.MeshToonMaterial>');


fs.writeFileSync('src/components/ui/chomms-house-3d-hero.tsx', code);
