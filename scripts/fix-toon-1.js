const fs = require('fs');
let code = fs.readFileSync('src/components/ui/chomms-house-3d-hero.tsx', 'utf8');

// 1. Add toonGradient to components
const componentsToPatch = ['Pouch', 'Film', 'Glass', 'Bottle', 'Botanicals', 'WaterStream'];
for (const comp of componentsToPatch) {
  const regex = new RegExp('function ' + comp + '\\\\(\\\\{ progress([\\\\s\\\\S]*?)\\\\}: \\\\{ progress: number([\\\\s\\\\S]*?)\\\\}\\\\) \\\\{');
  code = code.replace(regex, 'function ' + comp + '({ progress$1, toonGradient }: { progress: number$2, toonGradient: THREE.DataTexture }) {');
}

// 2. Add toonGradient creation to Scene
const toonGradientCode = `
  const toonGradient = useMemo(() => {
    const colors = new Uint8Array([
      100, 100, 100, 255,
      180, 180, 180, 255,
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

// 3. Pass toonGradient down
code = code.replace(/<Pouch progress=\{progress\} tex=\{mats.tex\} bumpTex=\{mats.pouchBumpTex\} labelTex=\{mats.labelTex\} \/>/g, '<Pouch progress={progress} tex={mats.tex} bumpTex={mats.pouchBumpTex} labelTex={mats.labelTex} toonGradient={toonGradient} />');
code = code.replace(/<Film progress=\{progress\} filmBumpTex=\{mats.filmBumpTex\} \/>/g, '<Film progress={progress} filmBumpTex={mats.filmBumpTex} toonGradient={toonGradient} />');
code = code.replace(/<Glass progress=\{progress\} bumpTex=\{mats.bumpTex\} \/>/g, '<Glass progress={progress} bumpTex={mats.bumpTex} toonGradient={toonGradient} />');
code = code.replace(/<Bottle progress=\{progress\} bumpTex=\{mats.bumpTex\} \/>/g, '<Bottle progress={progress} bumpTex={mats.bumpTex} toonGradient={toonGradient} />');
code = code.replace(/<WaterStream progress=\{progress\} \/>/g, '<WaterStream progress={progress} toonGradient={toonGradient} />');
code = code.replace(/<Botanicals progress=\{progress\} bumpTex=\{mats.bumpTex\} \/>/g, '<Botanicals progress={progress} bumpTex={mats.bumpTex} toonGradient={toonGradient} />');

// 4. Replace Materials

// Pouch
code = code.replace(/<meshStandardMaterial map=\{tex\} color="#d4b496" roughness=\{0\.9\} bumpMap=\{bumpTex\} bumpScale=\{0\.01\} side=\{THREE\.DoubleSide\} clippingPlanes=\{\[clipBottom\]\} clipIntersection=\{false\} \/>/g, '<meshToonMaterial map={tex} color="#d4b496" side={THREE.DoubleSide} clippingPlanes={[clipBottom]} clipIntersection={false} gradientMap={toonGradient} />');
code = code.replace(/<meshStandardMaterial map=\{tex\} color="#d4b496" roughness=\{0\.9\} bumpMap=\{bumpTex\} bumpScale=\{0\.01\} side=\{THREE\.DoubleSide\} clippingPlanes=\{\[clipTop\]\} clipIntersection=\{false\} \/>/g, '<meshToonMaterial map={tex} color="#d4b496" side={THREE.DoubleSide} clippingPlanes={[clipTop]} clipIntersection={false} gradientMap={toonGradient} />');

// Label Planes
code = code.replace(/<meshStandardMaterial map=\{labelTex\} transparent=\{true\} alphaTest=\{0\.05\} clippingPlanes=\{\[clipBottom\]\} clipIntersection=\{false\} \/>/g, '<meshToonMaterial map={labelTex} transparent={true} alphaTest={0.05} clippingPlanes={[clipBottom]} clipIntersection={false} gradientMap={toonGradient} />');
code = code.replace(/<meshStandardMaterial map=\{labelTex\} transparent=\{true\} alphaTest=\{0\.05\} clippingPlanes=\{\[clipTop\]\} clipIntersection=\{false\} \/>/g, '<meshToonMaterial map={labelTex} transparent={true} alphaTest={0.05} clippingPlanes={[clipTop]} clipIntersection={false} gradientMap={toonGradient} />');
code = code.replace(/<meshStandardMaterial map=\{labelTex\} transparent=\{true\} alphaTest=\{0\.05\} clippingPlanes=\{\[clipBottom\]\} clipIntersection=\{false\} side=\{THREE\.BackSide\} \/>/g, '<meshToonMaterial map={labelTex} transparent={true} alphaTest={0.05} clippingPlanes={[clipBottom]} clipIntersection={false} side={THREE.BackSide} gradientMap={toonGradient} />');
code = code.replace(/<meshStandardMaterial map=\{labelTex\} transparent=\{true\} alphaTest=\{0\.05\} clippingPlanes=\{\[clipTop\]\} clipIntersection=\{false\} side=\{THREE\.BackSide\} \/>/g, '<meshToonMaterial map={labelTex} transparent={true} alphaTest={0.05} clippingPlanes={[clipTop]} clipIntersection={false} side={THREE.BackSide} gradientMap={toonGradient} />');

// Inner Pouch Seal
code = code.replace(/<meshStandardMaterial color="#8a735c" roughness=\{0\.95\} \/>/g, '<meshToonMaterial color="#8a735c" gradientMap={toonGradient} />');

// Film
code = code.replace(/<meshStandardMaterial map=\{filmBumpTex\} color="#e3e1df" roughness=\{0\.9\} bumpMap=\{filmBumpTex\} bumpScale=\{0\.005\} side=\{THREE\.DoubleSide\} \/>/g, '<meshToonMaterial map={filmBumpTex} color="#e3e1df" side={THREE.DoubleSide} gradientMap={toonGradient} />');
code = code.replace(/<meshStandardMaterial color="#333333" roughness=\{0\.8\} \/>/g, '<meshToonMaterial color="#333333" gradientMap={toonGradient} />');

// WaterStream
code = code.replace(/<meshPhysicalMaterial color="#9cb8a5" transmission=\{0\.98\} roughness=\{0\.1\} ior=\{1\.33\} transparent \/>/g, '<meshToonMaterial color="#70b5ff" transparent opacity={0.6} gradientMap={toonGradient} />');

// Bottle
code = code.replace(/<meshStandardMaterial color="#f0f0f0" roughness=\{0\.15\} metalness=\{0\.1\} \/>/g, '<meshToonMaterial color="#f0f0f0" gradientMap={toonGradient} />');
code = code.replace(/<meshStandardMaterial color="#d9d9d9" roughness=\{0\.3\} \/>/g, '<meshToonMaterial color="#d9d9d9" gradientMap={toonGradient} />');

// Botanicals
code = code.replace(/<meshStandardMaterial color="#eb7b28" roughness=\{0\.6\} bumpMap=\{bumpTex\} bumpScale=\{0\.015\} \/>/g, '<meshToonMaterial color="#eb7b28" gradientMap={toonGradient} />');
code = code.replace(/<meshStandardMaterial color="#40592e" roughness=\{0\.8\} bumpMap=\{bumpTex\} bumpScale=\{0\.03\} \/>/g, '<meshToonMaterial color="#40592e" gradientMap={toonGradient} />');
code = code.replace(/<meshStandardMaterial color="#5c4033" roughness=\{1\} bumpMap=\{bumpTex\} bumpScale=\{0\.08\} \/>/g, '<meshToonMaterial color="#5c4033" gradientMap={toonGradient} />');
code = code.replace(/<meshStandardMaterial color="#687d6d" roughness=\{0\.7\} bumpMap=\{bumpTex\} bumpScale=\{0\.002\} \/>/g, '<meshToonMaterial color="#687d6d" gradientMap={toonGradient} />');

fs.writeFileSync('src/components/ui/chomms-house-3d-hero.tsx', code);
