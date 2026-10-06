const fs = require('fs');
let code = fs.readFileSync('src/components/ui/chomms-house-3d-hero.tsx', 'utf8');

// Replace Glass body material
code = code.replace(/<meshPhysicalMaterial[\s\S]*?color="#ffffff"[\s\S]*?transmission=\{1\}[\s\S]*?transparent\s*\/>/, '<meshToonMaterial color="#e0f0ff" transparent opacity={0.3} side={THREE.DoubleSide} gradientMap={toonGradient} />');

// Replace Glass water material
code = code.replace(/<meshPhysicalMaterial[\s\S]*?ref=\{waterRef\}[\s\S]*?color="#cde3d6"[\s\S]*?transmission=\{0\.98\}[\s\S]*?transparent\s*\/>/, '<meshToonMaterial ref={waterRef as any} color="#70b5ff" transparent opacity={0.6} side={THREE.DoubleSide} gradientMap={toonGradient} />');

// waterRef typing was THREE.MeshPhysicalMaterial, change to THREE.MeshToonMaterial
code = code.replace(/const waterRef = useRef<THREE\.MeshPhysicalMaterial>\(null\);/, 'const waterRef = useRef<THREE.MeshToonMaterial>(null);');

fs.writeFileSync('src/components/ui/chomms-house-3d-hero.tsx', code);
