const fs = require('fs');
let code = fs.readFileSync('src/components/ui/chomms-house-3d-hero.tsx', 'utf8');

const adjuster = `
function CameraAdjuster() {
  const { camera, size } = useThree();
  useEffect(() => {
    const aspect = size.width / size.height;
    if (aspect < 1) {
      camera.position.set(0, 1.5, 7 + (1 - aspect) * 12); // Move back on narrow screens
    } else {
      camera.position.set(0, 1.5, 7);
    }
  }, [camera, size]);
  return null;
}
`;

if (!code.includes('CameraAdjuster')) {
  code = code.replace(/function Scene\(\{ progress \}: \{ progress: number \}\) \{/, adjuster + '\nfunction Scene({ progress }: { progress: number }) {');
  code = code.replace(/<Environment preset="studio" environmentIntensity=\{1.2\} \/>/, '<Environment preset="studio" environmentIntensity={1.2} />\n        <CameraAdjuster />');
  fs.writeFileSync('src/components/ui/chomms-house-3d-hero.tsx', code);
}
