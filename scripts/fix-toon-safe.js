const fs = require('fs');
let code = fs.readFileSync('src/components/ui/chomms-house-3d-hero.tsx', 'utf8');

const invalidProps = [
  'roughness', 'metalness', 'transmission', 'ior', 'thickness', 
  'clearcoatRoughness', 'clearcoat', 'attenuationColor', 'attenuationDistance',
  'bumpMap', 'bumpScale'
];

code = code.replace(/<meshToonMaterial([^>]+)>/g, (match, props) => {
  let newProps = props;
  invalidProps.forEach(prop => {
    const regex1 = new RegExp('\\\\s' + prop + '=\\\\{[^\\\\}]+\\\\\\}', 'g');
    const regex2 = new RegExp('\\\\s' + prop + '="[^"]+"', 'g');
    newProps = newProps.replace(regex1, '');
    newProps = newProps.replace(regex2, '');
  });
  
  if (!newProps.includes('gradientMap')) {
    newProps += ' gradientMap={toonGradient} ';
  }
  
  return '<meshToonMaterial' + newProps + '>';
});

// Fix Glass and Water opacity
code = code.replace(/<meshToonMaterial \r?\n\s*color="#ffffff"/g, '<meshToonMaterial \n            color="#e0f0ff" transparent opacity={0.3}');
code = code.replace(/<meshToonMaterial \r?\n\s*ref=\{waterRef\}\r?\n\s*color="#cde3d6"/g, '<meshToonMaterial \n            ref={waterRef as any}\n            color="#70b5ff" transparent opacity={0.6}');
code = code.replace(/<meshToonMaterial color="#9cb8a5"/g, '<meshToonMaterial color="#70b5ff" transparent opacity={0.6}');

// Also change waterRef type
code = code.replace(/useRef<THREE\\.MeshPhysicalMaterial>/g, 'useRef<THREE.MeshToonMaterial>');

// Insert ToonGradient into Scene
const toonGradientCode = "\\n  const toonGradient = useMemo(() => {\\n    const colors = new Uint8Array([\\n      60, 60, 60, 255,\\n      150, 150, 150, 255,\\n      255, 255, 255, 255,\\n    ]);\\n    const gradientMap = new THREE.DataTexture(colors, 3, 1, THREE.RGBAFormat);\\n    gradientMap.needsUpdate = true;\\n    gradientMap.minFilter = THREE.NearestFilter;\\n    gradientMap.magFilter = THREE.NearestFilter;\\n    gradientMap.generateMipmaps = false;\\n    return gradientMap;\\n  }, []);\\n";

code = code.replace(/function Scene\\(\\{ progress \\}: \\{ progress: number \\}\\) \\{/, 'function Scene({ progress }: { progress: number }) {' + toonGradientCode);

// Pass toonGradient to all components
code = code.replace(/<Pouch progress=\{progress\}/g, '<Pouch progress={progress} toonGradient={toonGradient}');
code = code.replace(/<Film progress=\{progress\}/g, '<Film progress={progress} toonGradient={toonGradient}');
code = code.replace(/<Glass progress=\{progress\}/g, '<Glass progress={progress} toonGradient={toonGradient}');
code = code.replace(/<Bottle progress=\{progress\}/g, '<Bottle progress={progress} toonGradient={toonGradient}');
code = code.replace(/<WaterStream progress=\{progress\}/g, '<WaterStream progress={progress} toonGradient={toonGradient}');
code = code.replace(/<Botanicals progress=\{progress\}/g, '<Botanicals progress={progress} toonGradient={toonGradient}');

// Update function signatures
const componentsToPatch = ['Pouch', 'Film', 'Glass', 'Bottle', 'Botanicals', 'WaterStream'];
for (const comp of componentsToPatch) {
  const regex = new RegExp('function ' + comp + '\\\\((\\\\{[^\\\\}]+\\\\}: \\\\{[^\\\\}]+\\\\})\\\\)', 'g');
  code = code.replace(regex, (match, args) => {
    const newArgs = args.replace(/\\}: \\{/, ', toonGradient }: { ').replace(/ \\}$/, ', toonGradient: THREE.DataTexture }');
    return 'function ' + comp + '(' + newArgs + ')';
  });
}

// Ensure Outlines is imported
if (!code.includes('Outlines,')) {
  code = code.replace('import { Environment,', 'import { Environment, Outlines,');
}

// Add Outlines to all meshes
code = code.replace(/(<meshToonMaterial[^>]*?\\/>)/g, '$1\\n          <Outlines thickness={0.015} color="#2a2a2a" />');

fs.writeFileSync('src/components/ui/chomms-house-3d-hero.tsx', code);
