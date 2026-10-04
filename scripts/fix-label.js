const fs = require('fs');
let code = fs.readFileSync('src/components/ui/chomms-house-3d-hero.tsx', 'utf8');

const optimizedMats = `function ProceduralMaterials() {
  // 1. Kraft Paper Base + Graphic Label (Combined for PERFECT mapping)
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    // Kraft noise
    const id = ctx.createImageData(1024, 1024);
    const d = id.data;
    for (let x = 0; x < 1024; x += 2) {
      for (let y = 0; y < 1024; y += 2) {
        const noise = Math.random();
        const r = 140 + noise * 30;
        const g = 100 + noise * 20;
        const b = 65 + noise * 15;
        for (let dx = 0; dx < 2; dx++) {
          for (let dy = 0; dy < 2; dy++) {
            const i = ((y + dy) * 1024 + (x + dx)) * 4;
            d[i] = r; d[i+1] = g; d[i+2] = b; d[i+3] = 255;
          }
        }
      }
    }
    ctx.putImageData(id, 0, 0);
    
    // Draw fibers
    ctx.strokeStyle = "rgba(0,0,0,0.08)";
    ctx.beginPath();
    for (let i = 0; i < 1000; i++) {
      ctx.moveTo(Math.random() * 1024, Math.random() * 1024);
      ctx.lineTo(Math.random() * 1024, Math.random() * 1024);
    }
    ctx.stroke();

    // -- DRAW THE GRAPHIC LABEL DIRECTLY ON THE KRAFT PAPER --
    ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
    ctx.lineWidth = 3;
    for(let i=0; i<40; i++) {
      ctx.beginPath();
      const sx = Math.random() * 1024, sy = Math.random() * 1024;
      ctx.moveTo(sx, sy);
      ctx.quadraticCurveTo(sx + (Math.random()-0.5)*200, sy + (Math.random()-0.5)*200, sx + (Math.random()-0.5)*300, sy + (Math.random()-0.5)*300);
      ctx.stroke();
    }
    ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
    ctx.save();
    ctx.translate(512, 280); ctx.rotate(Math.PI/4);
    ctx.fillRect(-25, -25, 50, 50); ctx.clearRect(-12, -12, 24, 24); 
    ctx.restore();
    ctx.textAlign = "center"; ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
    ctx.font = "italic 700 110px Georgia, serif";
    ctx.fillText("Chomm's", 512, 440);
    ctx.font = "bold 32px sans-serif";
    ctx.fillText("H   O   U   S   E", 512, 510);
    ctx.font = "500 36px sans-serif";
    ctx.fillText("MOSQUITO", 512, 640);
    ctx.fillText("REPELLENT FILM", 512, 690);
    ctx.beginPath();
    ctx.arc(512, 740, 5, 0, Math.PI*2);
    ctx.moveTo(512, 740); ctx.lineTo(495, 730);
    ctx.moveTo(512, 740); ctx.lineTo(529, 730);
    ctx.moveTo(512, 745); ctx.lineTo(505, 755);
    ctx.moveTo(512, 745); ctx.lineTo(519, 755);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.95)"; ctx.lineWidth = 3; ctx.stroke(); ctx.fill();
    ctx.font = "italic 28px Georgia, serif"; ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
    ctx.fillText("Tangerine - Geraniol - Kaffir Lime", 512, 850);
    ctx.fillText("Lemon - Eucalyptus - Cedarwood", 512, 895);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping; tex.wrapT = THREE.RepeatWrapping;
  
  // 2. Glass Bump
  const bumpCanvas = document.createElement("canvas");
  bumpCanvas.width = 128;
  bumpCanvas.height = 128;
  const bctx = bumpCanvas.getContext("2d");
  if (bctx) {
    const id = bctx.createImageData(128, 128);
    for(let i=0; i<id.data.length; i+=4) {
       const v = Math.random() * 255;
       id.data[i] = id.data[i+1] = id.data[i+2] = v; id.data[i+3] = 255;
    }
    bctx.putImageData(id, 0, 0);
  }
  const bumpTex = new THREE.CanvasTexture(bumpCanvas);
  bumpTex.wrapS = THREE.RepeatWrapping; bumpTex.wrapT = THREE.RepeatWrapping;

  // 3. Pouch Wrinkle Bump (Optimized)
  const pouchBumpCanvas = document.createElement("canvas");
  pouchBumpCanvas.width = 1024;
  pouchBumpCanvas.height = 1024;
  const pctx = pouchBumpCanvas.getContext("2d");
  if (pctx) {
    pctx.fillStyle = "#808080";
    pctx.fillRect(0, 0, 1024, 1024);
    for (let i = 0; i < 20; i++) {
      const x = Math.random() * 1024, y = Math.random() * 1024, r = 100 + Math.random() * 200;
      const grad = pctx.createRadialGradient(x, y, 0, x, y, r);
      const intensity = (Math.random() - 0.5) * 80;
      const c = Math.round(128 + intensity);
      grad.addColorStop(0, "rgba(" + c + "," + c + "," + c + ", 0.6)");
      grad.addColorStop(1, "rgba(128,128,128,0)");
      pctx.fillStyle = grad; pctx.beginPath(); pctx.arc(x, y, r, 0, Math.PI * 2); pctx.fill();
    }
    pctx.beginPath();
    for (let i = 0; i < 15; i++) {
      pctx.moveTo(Math.random() * 1024, Math.random() * 1024);
      pctx.lineTo(Math.random() * 1024, Math.random() * 1024);
    }
    pctx.strokeStyle = "rgba(200,200,200,0.5)"; pctx.lineWidth = 6; pctx.stroke();
  }
  const pouchBumpTex = new THREE.CanvasTexture(pouchBumpCanvas);
  pouchBumpTex.wrapS = THREE.RepeatWrapping; pouchBumpTex.wrapT = THREE.RepeatWrapping;

  // 4. Pouch Graphic Label (Empty, now combined into tex)
  const labelTex = tex;

  // 5. Film Fibrous Bump
  const filmBumpCanvas = document.createElement("canvas");
  filmBumpCanvas.width = 256;
  filmBumpCanvas.height = 256;
  const fctx = filmBumpCanvas.getContext("2d");
  if (fctx) {
     fctx.fillStyle = "#808080"; fctx.fillRect(0,0,256,256);
     fctx.beginPath();
     for(let i=0; i<500; i++) {
        fctx.moveTo(Math.random()*256, Math.random()*256);
        fctx.lineTo(Math.random()*256, Math.random()*256);
     }
     fctx.strokeStyle = "rgba(255,255,255,0.4)"; fctx.lineWidth = 1.5; fctx.stroke();
  }
  const filmBumpTex = new THREE.CanvasTexture(filmBumpCanvas);
  filmBumpTex.wrapS = THREE.RepeatWrapping; filmBumpTex.wrapT = THREE.RepeatWrapping;

  return { tex, bumpTex, pouchBumpTex, labelTex, filmBumpTex };
}`;

code = code.replace(/function ProceduralMaterials\(\) \{[\s\S]*?return \{ tex, bumpTex, pouchBumpTex, labelTex, filmBumpTex \};\n\}/, optimizedMats);

// Remove the separate front/back labels from Pouch
code = code.replace(/\{\/\* Front Label \*\/\}[\s\S]*?\{\/\* Back Label \(Mirror\) \*\/\}[\s\S]*?<\/mesh>/g, '');

fs.writeFileSync('src/components/ui/chomms-house-3d-hero.tsx', code);
