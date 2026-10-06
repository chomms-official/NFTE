const fs = require('fs');
let code = fs.readFileSync('src/components/ui/chomms-house-3d-hero.tsx', 'utf8');

const removeProps = [
  'roughness={0.9}', 'roughness={0.95}', 'roughness={0.8}', 'roughness={0.6}', 'roughness={0.7}', 
  'roughness={1}', 'roughness={0.15}', 'roughness={0.3}', 'roughness={0.12}', 'roughness={0.2}',
  'roughness={0.1}', 'roughness={0.05}', 'metalness={0.8}', 'metalness={0.1}',
  'transmission={1}', 'transmission={0.98}', 'ior={1.52}', 'ior={1.33}', 'thickness={0.5}',
  'clearcoat={1}', 'clearcoatRoughness={0.05}', 'clearcoatRoughness={0.08}',
  'attenuationColor="#a9c9b5"', 'attenuationDistance={3}',
  'bumpMap={bumpTex}', 'bumpMap={filmBumpTex}', 'bumpMap={pouchBumpTex}',
  'bumpScale={0.01}', 'bumpScale={0.005}', 'bumpScale={0.015}', 'bumpScale={0.03}', 
  'bumpScale={0.08}', 'bumpScale={0.002}', 'bumpScale={0.0005}', 'bumpScale={0.0002}'
];

removeProps.forEach(p => {
  code = code.split(' ' + p).join('');
  code = code.split('\\n            ' + p).join('');
});

// Update Glass transparent color manually
code = code.replace(/<meshToonMaterial \r?\n\s*color="#ffffff"/g, '<meshToonMaterial \n            color="#e0f0ff" transparent opacity={0.3}');
code = code.replace(/<meshToonMaterial \r?\n\s*ref=\{waterRef\}\r?\n\s*color="#cde3d6"/g, '<meshToonMaterial \n            ref={waterRef as any}\n            color="#70b5ff" transparent opacity={0.6}');
code = code.replace(/<meshToonMaterial color="#9cb8a5"/g, '<meshToonMaterial color="#70b5ff" transparent opacity={0.6}');

// Also change waterRef type
code = code.replace(/useRef<THREE\.MeshPhysicalMaterial>/g, 'useRef<THREE.MeshToonMaterial>');

fs.writeFileSync('src/components/ui/chomms-house-3d-hero.tsx', code);
