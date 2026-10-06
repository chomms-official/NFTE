const fs = require('fs');
let code = fs.readFileSync('src/components/ui/chomms-house-3d-hero.tsx', 'utf8');

code = code.replace(/<meshToonMaterial([^>]*?)\/?>/g, (match, propsString) => {
  const allowedProps = [
    'color', 'map', 'transparent', 'opacity', 'side', 
    'clippingPlanes', 'clipIntersection', 'alphaTest', 
    'gradientMap', 'ref', 'visible'
  ];
  
  let cleanProps = '';
  const propRegex = /([a-zA-Z0-9]+)=({[^}]+}|"[^"]+"|'[^']+')/g;
  
  let matchProp;
  while ((matchProp = propRegex.exec(propsString)) !== null) {
    const key = matchProp[1];
    const value = matchProp[2];
    if (allowedProps.includes(key)) {
      cleanProps += ' ' + key + '=' + value;
    }
  }
  
  if (/\\btransparent\\b(?![={])/.test(propsString)) {
      cleanProps += ' transparent';
  }
  
  return '<meshToonMaterial' + cleanProps + ' />';
});

fs.writeFileSync('src/components/ui/chomms-house-3d-hero.tsx', code);
