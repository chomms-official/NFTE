const fs = require('fs');
let code = fs.readFileSync('src/components/ui/chomms-house-3d-hero.tsx', 'utf8');

// The ultimate clean ToonMaterial tag parser!
code = code.replace(/<meshToonMaterial([^>]*?)\/?>/g, (match, propsString) => {
  const allowedProps = [
    'color', 'map', 'transparent', 'opacity', 'side', 
    'clippingPlanes', 'clipIntersection', 'alphaTest', 
    'gradientMap', 'ref', 'visible'
  ];
  
  // A crude but effective parser: split by space, but be careful with strings/braces
  // Since our JSX is nicely formatted, we can match key={value} or key="value"
  let cleanProps = '';
  const propRegex = /([a-zA-Z0-9]+)=({[^}]+}|"[^"]+"|'[^']+')/g;
  
  let matchProp;
  while ((matchProp = propRegex.exec(propsString)) !== null) {
    const key = matchProp[1];
    const value = matchProp[2];
    if (allowedProps.includes(key)) {
      cleanProps += \` \${key}=\${value}\`;
    }
  }
  
  // Also preserve boolean props like 'transparent' without value
  if (propsString.includes(' transparent ')) cleanProps += ' transparent={true}';
  if (propsString.includes('transparent/>')) cleanProps += ' transparent={true}';
  if (propsString.endsWith(' transparent')) cleanProps += ' transparent={true}';
  
  // Actually, 'transparent' might be matched as a string. Let's just do:
  if (/\btransparent\b(?!=[{="])/.test(propsString)) {
      cleanProps += ' transparent';
  }
  
  return \`<meshToonMaterial\${cleanProps} />\`;
});

fs.writeFileSync('src/components/ui/chomms-house-3d-hero.tsx', code);
