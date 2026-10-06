const fs = require('fs');
let code = fs.readFileSync('src/components/ui/chomms-house-3d-hero.tsx', 'utf8');

code = code.replace(/function Pouch\(\{ progress, tex, bumpTex, labelTex \}: \{ progress: number, tex: THREE\.Texture \| null, bumpTex: THREE\.Texture \| null, labelTex: THREE\.Texture \| null \}\) \{/, 'function Pouch({ progress, tex, bumpTex, labelTex, toonGradient }: { progress: number, tex: THREE.Texture | null, bumpTex: THREE.Texture | null, labelTex: THREE.Texture | null, toonGradient: THREE.DataTexture }) {');

code = code.replace(/function Film\(\{ progress, filmBumpTex \}: \{ progress: number, filmBumpTex: THREE\.Texture \| null \}\) \{/, 'function Film({ progress, filmBumpTex, toonGradient }: { progress: number, filmBumpTex: THREE.Texture | null, toonGradient: THREE.DataTexture }) {');

code = code.replace(/function Glass\(\{ progress, bumpTex \}: \{ progress: number, bumpTex: THREE\.Texture \| null \}\) \{/, 'function Glass({ progress, bumpTex, toonGradient }: { progress: number, bumpTex: THREE.Texture | null, toonGradient: THREE.DataTexture }) {');

code = code.replace(/function Bottle\(\{ progress, bumpTex \}: \{ progress: number, bumpTex: THREE\.Texture \| null \}\) \{/, 'function Bottle({ progress, bumpTex, toonGradient }: { progress: number, bumpTex: THREE.Texture | null, toonGradient: THREE.DataTexture }) {');

code = code.replace(/function Botanicals\(\{ progress, bumpTex \}: \{ progress: number, bumpTex: THREE\.Texture \| null \}\) \{/, 'function Botanicals({ progress, bumpTex, toonGradient }: { progress: number, bumpTex: THREE.Texture | null, toonGradient: THREE.DataTexture }) {');

code = code.replace(/function WaterStream\(\{ progress \}: \{ progress: number \}\) \{/, 'function WaterStream({ progress, toonGradient }: { progress: number, toonGradient: THREE.DataTexture }) {');

fs.writeFileSync('src/components/ui/chomms-house-3d-hero.tsx', code);
