const fs = require('fs');
let code = fs.readFileSync('src/components/ui/chomms-house-3d-hero.tsx', 'utf8');

// Replace all meshToonMaterial with meshToonMaterial + Outlines
code = code.replace(/(<meshToonMaterial[^>]*?\/>)/g, '$1\n          <Outlines thickness={0.015} color="#2a2a2a" />');

fs.writeFileSync('src/components/ui/chomms-house-3d-hero.tsx', code);
