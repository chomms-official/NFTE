const fs = require('fs');

// 1. Update CSS
let css = fs.readFileSync('src/app/globals.css', 'utf8');
css = css.replace(/font-size: 1rem;/g, 'font-size: 2.5rem; font-family: Georgia, serif;');
fs.writeFileSync('src/app/globals.css', css);

// 2. Update TSX
let code = fs.readFileSync('src/components/ui/chomms-house-3d-hero.tsx', 'utf8');

// A. Fix Loading Screen
code = code.replace(/\{loaded \? "Ready" : "Preparing Ultra-High Fidelity Models"\}/g, '{loaded ? "Welcome" : "Chomm\'s House x NFTE"}');
code = code.replace(/<div className="ch-loader-track">[\s\S]*?<\/div>/g, '');

// B. Move botanical lines to Kraft Paper, clean up Label Canvas
const labelCanvasStart = code.indexOf('const labelCanvas = document.createElement("canvas");');
const labelCanvasEnd = code.indexOf('const labelTex = new THREE.CanvasTexture(labelCanvas);') + 'const labelTex = new THREE.CanvasTexture(labelCanvas);'.length;

const newLabelCanvasCode = `const labelCanvas = document.createElement("canvas");
  labelCanvas.width = 1024;
  labelCanvas.height = 1024;
  const lctx = labelCanvas.getContext("2d");
  if (lctx) {
    lctx.clearRect(0, 0, 1024, 1024);
    lctx.fillStyle = "rgba(255, 255, 255, 0.95)";
    lctx.save();
    lctx.translate(512, 350); lctx.rotate(Math.PI/4); // Shifted down so it doesn't get torn
    lctx.fillRect(-25, -25, 50, 50); lctx.clearRect(-12, -12, 24, 24); 
    lctx.restore();
    lctx.textAlign = "center"; lctx.fillStyle = "rgba(255, 255, 255, 0.95)";
    lctx.font = "italic 700 110px Georgia, serif";
    lctx.fillText("Chomm's", 512, 510);
    lctx.font = "bold 32px sans-serif";
    lctx.fillText("H   O   U   S   E", 512, 580);
    lctx.font = "500 36px sans-serif";
    lctx.fillText("MOSQUITO", 512, 710);
    lctx.fillText("REPELLENT FILM", 512, 760);
    lctx.beginPath();
    lctx.arc(512, 810, 5, 0, Math.PI*2);
    lctx.moveTo(512, 810); lctx.lineTo(495, 800);
    lctx.moveTo(512, 810); lctx.lineTo(529, 800);
    lctx.moveTo(512, 815); lctx.lineTo(505, 825);
    lctx.moveTo(512, 815); lctx.lineTo(519, 825);
    lctx.strokeStyle = "rgba(255, 255, 255, 0.95)"; lctx.lineWidth = 3; lctx.stroke(); lctx.fill();
    lctx.font = "italic 28px Georgia, serif"; lctx.fillStyle = "rgba(255, 255, 255, 0.7)";
    lctx.fillText("Tangerine - Geraniol - Kaffir Lime", 512, 920);
    lctx.fillText("Lemon - Eucalyptus - Cedarwood", 512, 965);
  }
  const labelTex = new THREE.CanvasTexture(labelCanvas);`;

code = code.substring(0, labelCanvasStart) + newLabelCanvasCode + code.substring(labelCanvasEnd);

// Add botanical lines to Kraft Paper (tex)
const kraftFibers = `ctx.stroke();`;
const kraftBotanicals = `ctx.stroke();
    // Add botanical line-art directly to kraft paper to avoid grey translucent plane
    ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
    ctx.lineWidth = 3;
    for(let i=0; i<40; i++) {
      ctx.beginPath();
      const sx = Math.random() * 512, sy = Math.random() * 512;
      ctx.moveTo(sx, sy);
      ctx.quadraticCurveTo(sx + (Math.random()-0.5)*100, sy + (Math.random()-0.5)*100, sx + (Math.random()-0.5)*150, sy + (Math.random()-0.5)*150);
      ctx.stroke();
    }`;
code = code.replace(kraftFibers, kraftBotanicals);

// C. Auto-scroll logic
const autoScrollHook = `useEffect(() => {
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
  }, []);`;

const useEffectLoaded = `useEffect(() => {
    const t = setTimeout(() => setLoaded(true), 1500);
    return () => clearTimeout(t);
  }, []);`;

code = code.replace(useEffectLoaded, useEffectLoaded + '\n  ' + autoScrollHook);

fs.writeFileSync('src/components/ui/chomms-house-3d-hero.tsx', code);
