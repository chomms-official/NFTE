import * as THREE from "three";

/** Lightweight procedural twinjet. Nose -Z, dorsal surface +Y, starboard +X. */
export function createAirliner() {
  const aircraft = new THREE.Group();
  aircraft.name = "mosquito-airplane";
  const paint = new THREE.MeshPhongMaterial({ color: 0xf4f7fb, shininess: 85, specular: 0x718096 });
  const wingPaint = new THREE.MeshPhongMaterial({ color: 0xcbd5e1, shininess: 65 });
  const red = new THREE.MeshPhongMaterial({ color: 0xc92336, shininess: 70 });
  const glass = new THREE.MeshPhongMaterial({ color: 0x12283d, shininess: 160, specular: 0xa4dfff });
  const dark = new THREE.MeshPhongMaterial({ color: 0x16202c, shininess: 35 });
  const metal = new THREE.MeshPhongMaterial({ color: 0x8899aa, shininess: 110 });
  const add = (name: string, geometry: THREE.BufferGeometry, material: THREE.Material, x = 0, y = 0, z = 0) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = name; mesh.position.set(x, y, z); aircraft.add(mesh); return mesh;
  };
  // Rounded radome, near cylindrical cabin, gently tapering tail cone.
  const profile = [[0,-6.2],[0.18,-6.05],[0.36,-5.7],[0.5,-5.1],[0.56,-4.2],
    [0.56,2.6],[0.49,3.8],[0.3,4.8],[0.1,5.6],[0,5.95]];
  const fuselage = new THREE.LatheGeometry(profile.map(([r,z]) => new THREE.Vector2(r,z)), 32);
  fuselage.rotateX(Math.PI / 2);
  add("fuselage", fuselage, paint);
  const surface = (name: string, outline: number[][], thickness: number, material: THREE.Material, vertical = false) => {
    const shape = new THREE.Shape();
    outline.forEach(([x,z], i) => i ? shape.lineTo(x,z) : shape.moveTo(x,z)); shape.closePath();
    const geometry = new THREE.ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: true, bevelSegments: 1, steps: 1, bevelSize: 0.025, bevelThickness: 0.025 });
    if (vertical) {
      // Shape X is aircraft Z, shape Y is aircraft Y, extrusion is aircraft X.
      geometry.rotateY(-Math.PI / 2); geometry.translate(thickness / 2, 0, 0);
    } else { geometry.rotateX(Math.PI / 2); geometry.translate(0, thickness / 2, 0); }
    return add(name, geometry, material);
  };
  for (const side of [-1, 1]) {
    const label = side < 0 ? "port" : "starboard";
    const wing = surface(`${label}-swept-wing`, [[0.4,-1.6],[side*5.7,1.45],[side*5.75,2.15],[side*2.1,1.45],[0.4,1.25]].map(([x,z], i) => [i === 0 || i === 4 ? side*x : x,z]), 0.12, wingPaint);
    wing.position.y = -0.12;
    surface(`${label}-stabilizer`, [[side*0.2,3.45],[side*2.35,4.65],[side*2.4,5.25],[side*0.22,4.65]], 0.09, wingPaint).position.y = 0.12;
    // Slightly canted blended winglets.
    const winglet = add(`${label}-winglet`, new THREE.BoxGeometry(0.08,0.65,0.7), red, side*5.7,0.22,1.82);
    winglet.rotation.z = -side*0.22;
    const nacelle = new THREE.CylinderGeometry(0.38,0.32,1.65,24,1,true); nacelle.rotateX(Math.PI/2);
    add(`${label}-engine`, nacelle, paint, side*1.85,-0.59,0.05);
    const intake = new THREE.TorusGeometry(0.33,0.055,8,24);
    add(`${label}-intake-rim`, intake, metal, side*1.85,-0.59,-0.78);
    const fan = new THREE.CircleGeometry(0.32,24); fan.rotateY(Math.PI);
    add(`${label}-fan`, fan, dark, side*1.85,-0.59,-0.74);
    const hub = new THREE.SphereGeometry(0.11,10,8);
    add(`${label}-fan-hub`, hub, metal, side*1.85,-0.59,-0.78);
    add(`${label}-engine-pylon`, new THREE.BoxGeometry(0.13,0.55,0.8), wingPaint,side*1.85,-0.24,0.3);
    const cockpit = add(`${label}-cockpit`, new THREE.SphereGeometry(1,12,8), glass,side*0.23,0.37,-4.96);
    cockpit.scale.set(0.23,0.11,0.45); cockpit.rotation.y = side*0.18;
    const windowGeometry = new THREE.SphereGeometry(1,8,6);
    for (let i=0;i<19;i++) {
      const window = add(`${label}-window-${i}`, windowGeometry, glass,side*0.535,0.17,-3.95+i*0.36);
      window.scale.set(0.035,0.075,0.095);
    }
    const light = new THREE.MeshBasicMaterial({color: side < 0 ? 0xff354f : 0x43ffb0});
    add(`${label}-navigation-light`,new THREE.SphereGeometry(0.085,8,6),light,side*5.76,0.57,1.8);
  }
  surface("vertical-tail", [[2.65,0.35],[4.3,2.45],[4.95,2.45],[5.35,0.25]],0.12,red,true);
  const beaconMaterial = new THREE.MeshBasicMaterial({color:0xff354f});
  add("beacon",new THREE.SphereGeometry(0.08,8,6),beaconMaterial,0,0.59,0.7);
  return aircraft;
}

/** Matching shaded twinjet silhouette for machines without WebGL. */
export function drawSoftwareAirliner(ctx: CanvasRenderingContext2D, bank: number) {
  ctx.save(); ctx.scale(Math.cos(bank), 1);
  ctx.shadowColor = "rgba(0,0,0,0.65)"; ctx.shadowBlur = 5; ctx.shadowOffsetY = 3;
  const polygon = (points: number[][], color: string) => {
    ctx.fillStyle = color; ctx.beginPath(); points.forEach(([x,y],i) => i ? ctx.lineTo(x,y) : ctx.moveTo(x,y)); ctx.closePath();ctx.fill();ctx.stroke();
  };
  ctx.strokeStyle = "#64748b"; ctx.lineWidth = 0.6;
  for (const s of [-1,1]) {
    ctx.fillStyle = "#e2e8f0"; ctx.beginPath(); ctx.roundRect(s*9-2,-5,4,11,2);ctx.fill();ctx.stroke();
    ctx.fillStyle = "#172536";ctx.fillRect(s*9-1.5,-4,3,1.6);
    polygon([[s*2,-9],[s*29,7],[s*29,11],[s*10,7],[s*2,6]],"#cbd5e1");
    polygon([[s*1,17],[s*12,24],[s*12,27],[s*1,24]],"#dbe3ed");
    ctx.fillStyle = "#ca263b"; ctx.fillRect(s*29-0.8,6,1.6,4.5);
  }
  const paint = ctx.createLinearGradient(-3,0,3,0);paint.addColorStop(0,"#94a3b8");paint.addColorStop(0.45,"#ffffff");paint.addColorStop(1,"#cbd5e1");
  ctx.fillStyle = paint;ctx.beginPath();ctx.moveTo(0,-32);ctx.bezierCurveTo(4,-31,3,-21,3,13);
  ctx.bezierCurveTo(3,20,1,28,0,30);ctx.bezierCurveTo(-1,28,-3,20,-3,13);ctx.bezierCurveTo(-3,-21,-4,-31,0,-32);ctx.fill();ctx.stroke();
  ctx.shadowBlur=0;ctx.shadowOffsetY=0;
  polygon([[-2,-25],[2,-25],[2.5,-22],[-2.5,-22]],"#18344b");
  ctx.fillStyle="#253c50";
  for(let i=0;i<14;i++){ctx.fillRect(-2.8,-18+i*2.2,0.8,1);ctx.fillRect(2,-18+i*2.2,0.8,1);}
  polygon([[0,14],[2,25],[0,29],[-1,24]],"#c92336");
  for(const s of [-1,1]){ctx.fillStyle=s<0?"#ff354f":"#43ffb0";ctx.beginPath();ctx.arc(s*29,7,1.2,0,Math.PI*2);ctx.fill();}
  ctx.restore();
}
