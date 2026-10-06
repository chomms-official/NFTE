const fs = require('fs');
let code = fs.readFileSync('src/components/ui/chomms-house-3d-hero.tsx', 'utf8');

// Replace all remaining meshStandardMaterial and meshPhysicalMaterial that weren't caught
code = code.replace(/<meshStandardMaterial([^>]*?)(\/>|>)/g, (match, p1, p2) => {
  // Strip out properties that meshToonMaterial doesn't support or that ruin cartoon look
  let props = p1.replace(/roughness=\{[^}]+\}/g, '');
  props = props.replace(/metalness=\{[^}]+\}/g, '');
  props = props.replace(/bumpMap=\{[^}]+\}/g, '');
  props = props.replace(/bumpScale=\{[^}]+\}/g, '');
  props = props.replace(/clearcoat=\{[^}]+\}/g, '');
  props = props.replace(/clearcoatRoughness=\{[^}]+\}/g, '');
  
  if (!props.includes('gradientMap')) {
    props += ' gradientMap={toonGradient} ';
  }
  return `<meshToonMaterial${props}${p2}`;
});

code = code.replace(/<meshPhysicalMaterial([^>]*?)(\/>|>)/g, (match, p1, p2) => {
  let props = p1.replace(/roughness=\{[^}]+\}/g, '');
  props = props.replace(/metalness=\{[^}]+\}/g, '');
  props = props.replace(/transmission=\{[^}]+\}/g, '');
  props = props.replace(/ior=\{[^}]+\}/g, '');
  props = props.replace(/thickness=\{[^}]+\}/g, '');
  props = props.replace(/clearcoat=\{[^}]+\}/g, '');
  props = props.replace(/clearcoatRoughness=\{[^}]+\}/g, '');
  props = props.replace(/attenuationColor="[^"]+"/g, '');
  props = props.replace(/attenuationDistance=\{[^}]+\}/g, '');
  props = props.replace(/bumpMap=\{[^}]+\}/g, '');
  props = props.replace(/bumpScale=\{[^}]+\}/g, '');
  
  if (!props.includes('gradientMap')) {
    props += ' gradientMap={toonGradient} ';
  }
  return `<meshToonMaterial${props}${p2}`;
});

fs.writeFileSync('src/components/ui/chomms-house-3d-hero.tsx', code);
