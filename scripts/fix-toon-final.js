const fs = require('fs');
let code = fs.readFileSync('src/components/ui/chomms-house-3d-hero.tsx', 'utf8');

const toonGradientCode = `
  const toonGradient = useMemo(() => {
    const colors = new Uint8Array([
      80, 80, 80, 255,
      160, 160, 160, 255,
      255, 255, 255, 255,
    ]);
    const gradientMap = new THREE.DataTexture(colors, 3, 1, THREE.RGBAFormat);
    gradientMap.needsUpdate = true;
    gradientMap.minFilter = THREE.NearestFilter;
    gradientMap.magFilter = THREE.NearestFilter;
    gradientMap.generateMipmaps = false;
    return gradientMap;
  }, []);
`;

code = code.replace(/function Scene\(\{ progress \}: \{ progress: number \}\) \{/, 'function Scene({ progress }: { progress: number }) {\n' + toonGradientCode);

// Add toonGradient to all components in Scene
code = code.replace(/<Pouch progress=\{progress\}/g, '<Pouch progress={progress} toonGradient={toonGradient}');
code = code.replace(/<Film progress=\{progress\}/g, '<Film progress={progress} toonGradient={toonGradient}');
code = code.replace(/<Glass progress=\{progress\}/g, '<Glass progress={progress} toonGradient={toonGradient}');
code = code.replace(/<Bottle progress=\{progress\}/g, '<Bottle progress={progress} toonGradient={toonGradient}');
code = code.replace(/<WaterStream progress=\{progress\}/g, '<WaterStream progress={progress} toonGradient={toonGradient}');
code = code.replace(/<Botanicals progress=\{progress\}/g, '<Botanicals progress={progress} toonGradient={toonGradient}');

// Now update all components' signatures!
const componentsToPatch = ['Pouch', 'Film', 'Glass', 'Bottle', 'Botanicals', 'WaterStream'];
for (const comp of componentsToPatch) {
  const regex = new RegExp('function ' + comp + '\\\\((.*?)\\\\) \\\\{', 'g');
  code = code.replace(regex, (match, args) => {
    // args = `{ progress, bumpTex }: { progress: number, bumpTex: THREE.Texture | null }`
    if (!args.includes('toonGradient')) {
      const newArgs = args.replace(/\\}: \\{/, ', toonGradient }: { ').replace(/ \\}$/, ', toonGradient: THREE.DataTexture }');
      return 'function ' + comp + '(' + newArgs + ') {';
    }
    return match;
  });
}

// And finally add gradientMap={toonGradient} to ALL meshToonMaterial!
code = code.replace(/<meshToonMaterial/g, '<meshToonMaterial gradientMap={toonGradient} ');

// Ensure Outlines is imported
if (!code.includes('Outlines,')) {
  code = code.replace('import { Environment,', 'import { Environment, Outlines,');
}

// Add Outlines to all meshes
code = code.replace(/(<meshToonMaterial[^>]*?\/>)/g, '$1\n          <Outlines thickness={0.02} color="#1c1c1c" />');


fs.writeFileSync('src/components/ui/chomms-house-3d-hero.tsx', code);
