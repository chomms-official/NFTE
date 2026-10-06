const fs = require('fs');
let code = fs.readFileSync('src/components/ui/chomms-house-3d-hero.tsx', 'utf8');

['roughness', 'metalness', 'transmission', 'ior', 'thickness', 'clearcoatRoughness', 'clearcoat', 'bumpMap', 'bumpScale', 'attenuationDistance'].forEach(prop => {
  code = code.replace(new RegExp('\\\\s*' + prop + '=\\{[^}]*\\}', 'g'), '');
});
code = code.replace(/attenuationColor="[^"]*"/g, '');

fs.writeFileSync('src/components/ui/chomms-house-3d-hero.tsx', code);
