const fs = require('fs');
let code = fs.readFileSync('src/components/ui/chomms-house-3d-hero.tsx', 'utf8');

const autoScrollHook = `
  useEffect(() => {
    let animationFrameId: number;
    let lastUserInteraction = Date.now();
    let scrollingDown = true;

    const onUserInteraction = () => {
      lastUserInteraction = Date.now();
    };

    window.addEventListener('wheel', onUserInteraction);
    window.addEventListener('touchmove', onUserInteraction);
    window.addEventListener('keydown', onUserInteraction);

    const autoScroll = () => {
      if (Date.now() - lastUserInteraction > 10000) {
        window.scrollBy({ top: scrollingDown ? 1.5 : -1.5, behavior: 'instant' });
        if (window.scrollY >= document.body.scrollHeight - window.innerHeight - 10) {
           scrollingDown = false;
        } else if (window.scrollY <= 10) {
           scrollingDown = true;
        }
      }
      animationFrameId = requestAnimationFrame(autoScroll);
    };
    
    autoScroll();

    return () => {
      window.removeEventListener('wheel', onUserInteraction);
      window.removeEventListener('touchmove', onUserInteraction);
      window.removeEventListener('keydown', onUserInteraction);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);
`;

const insertIndex = code.indexOf('const stepIndexFor = useCallback((p: number) => {');
if (insertIndex !== -1 && !code.includes('autoScroll')) {
  code = code.substring(0, insertIndex) + autoScrollHook + '\n  ' + code.substring(insertIndex);
  fs.writeFileSync('src/components/ui/chomms-house-3d-hero.tsx', code);
}
