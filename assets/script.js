const container = document.getElementById("webgl-container");
const isMobile =
  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent,
  ) || window.innerWidth < 768;
const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
let reduceMotion = motionPreference.matches;
motionPreference.addEventListener("change", (event) => {
  reduceMotion = event.matches;
});

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x060312, 0.008);

const camera = new THREE.PerspectiveCamera(
  isMobile ? 60 : 45,
  window.innerWidth / window.innerHeight,
  0.1,
  1000,
);

const DEFAULT_CAM_POS = isMobile
  ? new THREE.Vector3(0, 12, 45)
  : new THREE.Vector3(0, 10, 40);
const DEFAULT_CAM_TARGET = new THREE.Vector3(0, 6.0, 0);

camera.position.copy(DEFAULT_CAM_POS);

const renderer = new THREE.WebGLRenderer({
  antialias: !isMobile,
  alpha: false,
  powerPreference: "high-performance",
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.25;
renderer.shadowMap.enabled = !isMobile;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
container.appendChild(renderer.domElement);

const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.maxPolarAngle = Math.PI / 2 + 0.05;
controls.minDistance = 8;
controls.maxDistance = 85;
controls.target.copy(DEFAULT_CAM_TARGET);

// LIGHTS
const ambientLight = new THREE.AmbientLight(0x2a103d, 1.4);
scene.add(ambientLight);

const treeLight = new THREE.PointLight(0xffb6c1, 2.5, 45);
treeLight.position.set(0, 8, 0);
treeLight.castShadow = !isMobile;
treeLight.shadow.mapSize.set(1024,1024);
scene.add(treeLight);

const warmLight = new THREE.PointLight(0xffaa33, 2.0, 30);
warmLight.position.set(0, -2, 0);
scene.add(warmLight);

// MOON, CLOUDS & OCCASIONAL SHOOTING STAR
function createMoonTexture(){
  const canvas=document.createElement("canvas");canvas.width=512;canvas.height=512;const ctx=canvas.getContext("2d");
  const base=ctx.createRadialGradient(180,150,20,256,256,260);base.addColorStop(0,"#fff9dd");base.addColorStop(.68,"#ead39b");base.addColorStop(1,"#a77b50");ctx.fillStyle=base;ctx.fillRect(0,0,512,512);
  const seeded=[ [105,125,34],[335,110,25],[260,245,42],[390,330,31],[145,365,48],[310,410,18],[70,270,22] ];
  seeded.forEach(([x,y,r])=>{const g=ctx.createRadialGradient(x-r*.2,y-r*.2,2,x,y,r);g.addColorStop(0,"rgba(115,79,55,.28)");g.addColorStop(.72,"rgba(150,105,69,.14)");g.addColorStop(1,"rgba(255,245,210,.08)");ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();});
  const texture=new THREE.CanvasTexture(canvas);texture.encoding=THREE.sRGBEncoding;return texture;
}
const moon = new THREE.Mesh(
  new THREE.SphereGeometry(isMobile ? 5.5 : 7, 40, 40),
  new THREE.MeshStandardMaterial({ map:createMoonTexture(), emissive:0xb18452, emissiveIntensity:.35, roughness:.9 }),
);
moon.position.set(-25, 27, -58);
scene.add(moon);

const moonGlow = new THREE.Sprite(
  new THREE.SpriteMaterial({
    map: createParticleTexture(), color: 0xffd98a, transparent: true,
    opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false,
  }),
);
moonGlow.position.copy(moon.position);
moonGlow.scale.set(25, 25, 1);
scene.add(moonGlow);

const cloudGroups = [];
for (let i = 0; i < (isMobile ? 4 : 7); i++) {
  const cloud = new THREE.Group();
  const cloudMat = new THREE.MeshBasicMaterial({
    color: 0xbca8cb, transparent: true, opacity: 0.09, depthWrite: false,
  });
  for (let j = 0; j < 5; j++) {
    const puff = new THREE.Mesh(new THREE.SphereGeometry(2 + Math.random() * 2, 12, 8), cloudMat);
    puff.position.set(j * 2.2, Math.sin(j) * 0.6, 0);
    puff.scale.y = 0.45;
    cloud.add(puff);
  }
  cloud.position.set(-50 + Math.random() * 100, 18 + Math.random() * 25, -35 - Math.random() * 45);
  cloud.userData.speed = 0.002 + Math.random() * 0.004;
  scene.add(cloud);
  cloudGroups.push(cloud);
}

const shootingStar = new THREE.Mesh(
  new THREE.PlaneGeometry(8, 0.05),
  new THREE.MeshBasicMaterial({ color: 0xfff2bd, transparent: true, opacity: 0, blending: THREE.AdditiveBlending }),
);
shootingStar.rotation.z = -0.45;
shootingStar.userData.nextAt = 8 + Math.random() * 12;
scene.add(shootingStar);

// ISLAND
const islandGroup = new THREE.Group();
scene.add(islandGroup);

const islandGeo = new THREE.CylinderGeometry(
  8.5,
  2.2,
  7.5,
  isMobile ? 32 : 48,
  12,
);
const posAttr = islandGeo.attributes.position;
for (let i = 0; i < posAttr.count; i++) {
  const vx = posAttr.getX(i);
  const vy = posAttr.getY(i);
  const vz = posAttr.getZ(i);

  const distFromCenter = Math.sqrt(vx * vx + vz * vz);
  const noise =
    Math.sin(vx * 0.8) * Math.cos(vz * 0.8) * 0.6 +
    Math.sin(vx * 1.8 + vz * 1.5) * 0.3;

  if (vy > 0) {
    posAttr.setY(i, vy + noise * (1.0 - distFromCenter / 12));
  } else {
    posAttr.setX(i, vx + (Math.random() - 0.5) * 1.4);
    posAttr.setZ(i, vz + (Math.random() - 0.5) * 1.4);
  }
}
islandGeo.computeVertexNormals();

const islandMat = new THREE.MeshStandardMaterial({
  color: 0x3d231b,
  roughness: 0.85,
  flatShading: true,
});
const islandMesh = new THREE.Mesh(islandGeo, islandMat);
islandGroup.add(islandMesh);

const topGeo = new THREE.CylinderGeometry(8.6, 7.8, 0.8, isMobile ? 32 : 48, 4);
const topPos = topGeo.attributes.position;
for (let i = 0; i < topPos.count; i++) {
  const vx = topPos.getX(i);
  const vy = topPos.getY(i);
  const vz = topPos.getZ(i);
  const noise = Math.sin(vx * 0.9) * Math.cos(vz * 0.9) * 0.5;
  topPos.setY(i, vy + noise * 0.4);
}
topGeo.computeVertexNormals();
const topMat = new THREE.MeshStandardMaterial({
  color: 0x22130e,
  roughness: 0.9,
  flatShading: true,
});
const topMesh = new THREE.Mesh(topGeo, topMat);
topMesh.position.y = 3.6;
topMesh.receiveShadow = true;
islandGroup.add(topMesh);

// BỆ MẶT ĐÁ NHỎ & ĐÁ TẢNG RẢI RÁC ÍT HƠN
const stoneMat = new THREE.MeshStandardMaterial({
  color: 0x4a4d52,
  roughness: 0.85,
  metalness: 0.1,
  flatShading: true,
});

// 1. Bệ đá nhỏ dẹt ẩn nhẹ dưới gốc cây
const mainStonePlatformGeo = new THREE.CylinderGeometry(2.5, 3.0, 0.15, 6);
const mainStonePlatform = new THREE.Mesh(mainStonePlatformGeo, stoneMat);
mainStonePlatform.position.set(0, 3.9, 0);
islandGroup.add(mainStonePlatform);

// 2. Chỉ 3 viên đá nhỏ điểm xuyết trên mặt đất
const rockCount = 3;
for (let i = 0; i < rockCount; i++) {
  const rockGeo = new THREE.DodecahedronGeometry(0.2 + Math.random() * 0.25, 0);
  const rockMesh = new THREE.Mesh(rockGeo, stoneMat);

  const angle = (i / rockCount) * Math.PI * 2 + 0.5;
  const dist = 3.8 + Math.random() * 2.0;

  rockMesh.position.set(Math.cos(angle) * dist, 3.9, Math.sin(angle) * dist);
  rockMesh.rotation.set(
    Math.random() * Math.PI,
    Math.random() * Math.PI,
    Math.random() * Math.PI,
  );
  islandGroup.add(rockMesh);
}

// TREE TRUNK & BRANCHES
const treeGroup = new THREE.Group();
treeGroup.position.set(0, 4.0, 0);
islandGroup.add(treeGroup);

const trunkMat = new THREE.MeshStandardMaterial({
  color: 0x2b140e,
  roughness: 0.85,
});

const trunkCurve = new THREE.CatmullRomCurve3([
  new THREE.Vector3(0, 0, 0),
  new THREE.Vector3(0.15, 2.5, -0.1),
  new THREE.Vector3(-0.1, 5.0, 0.1),
  new THREE.Vector3(0.0, 7.5, 0.0),
]);

const trunkGeo = new THREE.TubeGeometry(trunkCurve, 32, 0.28, 8, false);
const trunkMesh = new THREE.Mesh(trunkGeo, trunkMat);
treeGroup.add(trunkMesh);

const branchClusters = [];
const mainBranchCount = 12;
for (let i = 0; i < mainBranchCount; i++) {
  const angle = (i / mainBranchCount) * Math.PI * 2 + Math.random() * 0.3;
  const h = 3.0 + Math.random() * 4.0;
  const startP = trunkCurve.getPointAt(h / 7.5);
  const len = 3.0 + Math.random() * 2.2;

  const endP = new THREE.Vector3(
    startP.x + Math.cos(angle) * len,
    startP.y + 0.8 + Math.random() * 1.0,
    startP.z + Math.sin(angle) * len,
  );

  const midP = new THREE.Vector3().addVectors(startP, endP).multiplyScalar(0.5);
  midP.y += 0.4;

  const bCurve = new THREE.CatmullRomCurve3([startP, midP, endP]);
  const bGeo = new THREE.TubeGeometry(bCurve, 10, 0.09, 6, false);
  const bMesh = new THREE.Mesh(bGeo, trunkMat);
  treeGroup.add(bMesh);

  branchClusters.push({ center: endP, radius: 3.2 + Math.random() * 1.0 });
}

// HỆ THỐNG TÁN LÁ
const particleCount = isMobile ? 6000 : 12000;
const blossomGeo = new THREE.BufferGeometry();
const blossomPos = new Float32Array(particleCount * 3);
const blossomColors = new Float32Array(particleCount * 3);

const colorDustyPink = new THREE.Color(0xe8a2a8);
const colorSoftPink = new THREE.Color(0xf0b6bc);
const colorPaleRose = new THREE.Color(0xf7d1d5);
const colorSoftWhite = new THREE.Color(0xfdf0f2);

const clusters = [
  { center: new THREE.Vector3(0, 9.5, 0), radius: 6.2 },
  { center: new THREE.Vector3(0, 7.5, 0), radius: 7.0 },
  { center: new THREE.Vector3(0, 5.5, 0), radius: 6.0 },
  ...branchClusters,
];

for (let i = 0; i < particleCount; i++) {
  const c = clusters[Math.floor(Math.random() * clusters.length)];

  const u = Math.random();
  const r = Math.pow(u, 0.65) * c.radius;
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);

  const x = c.center.x + r * Math.sin(phi) * Math.cos(theta);
  const y = c.center.y + r * Math.sin(phi) * Math.sin(theta) * 0.8;
  const z = c.center.z + r * Math.cos(phi);

  blossomPos[i * 3] = x;
  blossomPos[i * 3 + 1] = y;
  blossomPos[i * 3 + 2] = z;

  const heightFactor = THREE.MathUtils.clamp((y - 3) / 7, 0, 1);
  const randC = Math.random();
  let col;

  if (heightFactor < 0.3) {
    col = randC < 0.6 ? colorDustyPink : colorSoftPink;
  } else if (heightFactor < 0.7) {
    col =
      randC < 0.4
        ? colorSoftPink
        : randC < 0.8
          ? colorPaleRose
          : colorDustyPink;
  } else {
    col = randC < 0.5 ? colorSoftWhite : colorPaleRose;
  }

  blossomColors[i * 3] = col.r;
  blossomColors[i * 3 + 1] = col.g;
  blossomColors[i * 3 + 2] = col.b;
}

blossomGeo.setAttribute("position", new THREE.BufferAttribute(blossomPos, 3));
blossomGeo.setAttribute("color", new THREE.BufferAttribute(blossomColors, 3));

function createParticleTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 32;
  canvas.height = 32;
  const ctx = canvas.getContext("2d");
  const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
  grad.addColorStop(0, "rgba(255,255,255,0.9)");
  grad.addColorStop(0.4, "rgba(240,182,188,0.6)");
  grad.addColorStop(1, "rgba(240,182,188,0)");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(16, 16, 16, 0, Math.PI * 2);
  ctx.fill();
  return new THREE.CanvasTexture(canvas);
}

const blossomMat = new THREE.PointsMaterial({
  size: isMobile ? 0.5 : 0.42,
  vertexColors: true,
  map: createParticleTexture(),
  transparent: true,
  opacity: 0.75,
  blending: THREE.NormalBlending,
  depthWrite: false,
});

const blossomParticles = new THREE.Points(blossomGeo, blossomMat);
treeGroup.add(blossomParticles);

// TREE ORNAMENTS: MINI LANTERNS, WISH TAGS, BELLS, RIBBONS & PAPER CRANES
const treeOrnaments = [];
const ornamentGold = new THREE.MeshStandardMaterial({ color: 0xf4c95d, emissive: 0x8f5b16, emissiveIntensity: .35, metalness: .45, roughness: .35 });
const ornamentRed = new THREE.MeshStandardMaterial({ color: 0xb92f4b, emissive: 0x621426, emissiveIntensity: .22, side: THREE.DoubleSide });
const ornamentPaper = new THREE.MeshStandardMaterial({ color: 0xffe8c3, side: THREE.DoubleSide, roughness: .8 });
for (let i = 0; i < (isMobile ? 14 : 24); i++) {
  const ornament = new THREE.Group();
  const kind = i % 5;
  if (kind === 0) {
    ornament.add(new THREE.Mesh(new THREE.SphereGeometry(.15, 8, 6), ornamentRed));
    const tassel = new THREE.Mesh(new THREE.CylinderGeometry(.018,.018,.35,5), ornamentGold); tassel.position.y=-.28; ornament.add(tassel);
  } else if (kind === 1) {
    const tag = new THREE.Mesh(new THREE.PlaneGeometry(.28,.48), ornamentPaper); tag.position.y=-.15; ornament.add(tag);
  } else if (kind === 2) {
    const bell = new THREE.Mesh(new THREE.ConeGeometry(.16,.28,10,1,true), ornamentGold); bell.position.y=-.12; ornament.add(bell);
  } else if (kind === 3) {
    const ribbon = new THREE.Mesh(new THREE.PlaneGeometry(.09,.9,1,5), ornamentRed); ribbon.position.y=-.38; ornament.add(ribbon);
  } else {
    const crane = new THREE.Mesh(new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-.3,0,0),new THREE.Vector3(0,.12,0),new THREE.Vector3(.3,0,0),new THREE.Vector3(0,-.1,0),new THREE.Vector3(-.3,0,0),
    ]), new THREE.LineBasicMaterial({ color: 0xffe8c3, transparent:true, opacity:.9 })); ornament.add(crane);
  }
  const angle = (i / (isMobile ? 14 : 24)) * Math.PI * 2 + Math.random() * .35;
  const radius = 2.2 + Math.random() * 4.8;
  ornament.position.set(Math.cos(angle)*radius, 5.5 + Math.random()*7.2, Math.sin(angle)*radius);
  ornament.userData = { phase: Math.random()*Math.PI*2, baseRotation: ornament.rotation.z };
  treeGroup.add(ornament); treeOrnaments.push(ornament);
}

// MOON GARDEN DETAILS: POND, STEPPING STONES, GRASS, MUSHROOMS & TEA OFFERING
const pond = new THREE.Mesh(
  new THREE.CircleGeometry(2.05, 40),
  new THREE.MeshStandardMaterial({ color: 0x183f52, emissive: 0x102b44, emissiveIntensity:.35, metalness:.55, roughness:.18, transparent:true, opacity:.78 }),
);
pond.rotation.x=-Math.PI/2; pond.position.set(4.4,4.04,1.6); islandGroup.add(pond);
const pondRing = new THREE.Mesh(new THREE.RingGeometry(2.02,2.22,40), stoneMat); pondRing.rotation.x=-Math.PI/2; pondRing.position.copy(pond.position); islandGroup.add(pondRing);
const grassMat = new THREE.MeshStandardMaterial({ color:0x426a43, roughness:.9, side:THREE.DoubleSide });
for(let i=0;i<(isMobile?18:34);i++){
  const tuft=new THREE.Group();
  for(let b=0;b<3;b++){const blade=new THREE.Mesh(new THREE.PlaneGeometry(.06,.45),grassMat);blade.position.x=(b-1)*.06;blade.rotation.z=(b-1)*.18;tuft.add(blade)}
  const a=Math.random()*Math.PI*2,r=3+Math.random()*4.6;tuft.position.set(Math.cos(a)*r,4.06,Math.sin(a)*r);tuft.rotation.y=Math.random()*Math.PI;islandGroup.add(tuft);
}
for(let i=0;i<(isMobile?5:9);i++){
  const mushroom=new THREE.Group();const stem=new THREE.Mesh(new THREE.CylinderGeometry(.035,.055,.25,6),ornamentPaper);stem.position.y=.12;mushroom.add(stem);
  const cap=new THREE.Mesh(new THREE.SphereGeometry(.13,8,5,0,Math.PI*2,0,Math.PI/2),i%2?ornamentRed:ornamentGold);cap.position.y=.25;mushroom.add(cap);
  const a=i*2.4,r=2.7+(i%3)*1.1;mushroom.position.set(Math.cos(a)*r,4.05,Math.sin(a)*r);islandGroup.add(mushroom);
}
const teaTable=new THREE.Group();const woodMat=new THREE.MeshStandardMaterial({color:0x704128,roughness:.75});
const tableTop=new THREE.Mesh(new THREE.CylinderGeometry(.72,.72,.12,16),woodMat);tableTop.position.y=.68;teaTable.add(tableTop);
const tableLeg=new THREE.Mesh(new THREE.CylinderGeometry(.12,.18,.7,8),woodMat);tableLeg.position.y=.32;teaTable.add(tableLeg);
for(let i=0;i<3;i++){const cake=new THREE.Mesh(new THREE.CylinderGeometry(.16,.16,.09,12),ornamentGold);cake.position.set((i-1)*.24,.8,0);teaTable.add(cake)}
teaTable.position.set(-4.5,4.05,2.2);islandGroup.add(teaTable);

// RABBITS
const animalInteractiveObjects = [];
function createRabbit() {
  const group = new THREE.Group();
  const rabbitMat = new THREE.MeshStandardMaterial({
    color: 0xf8f8ff,
    roughness: 0.5,
  });

  const bodyGeo = new THREE.SphereGeometry(0.5, 12, 12);
  bodyGeo.scale(0.8, 1, 0.9);
  const bodyMesh = new THREE.Mesh(bodyGeo, rabbitMat);
  bodyMesh.position.y = 0.4;
  group.add(bodyMesh);

  const headGeo = new THREE.SphereGeometry(0.35, 12, 12);
  const headMesh = new THREE.Mesh(headGeo, rabbitMat);
  headMesh.position.set(0, 0.85, 0.2);
  group.add(headMesh);

  const earGeo = new THREE.CylinderGeometry(0.04, 0.08, 0.5, 8);
  const earLeft = new THREE.Mesh(earGeo, rabbitMat);
  earLeft.position.set(-0.12, 1.25, 0.18);
  earLeft.rotation.z = 0.15;
  earLeft.rotation.x = -0.1;
  group.add(earLeft);

  const earRight = earLeft.clone();
  earRight.position.x = 0.12;
  earRight.rotation.z = -0.15;
  group.add(earRight);

  const tail = new THREE.Mesh(new THREE.SphereGeometry(0.17, 8, 8), rabbitMat);
  tail.position.set(0, 0.45, -0.42);
  group.add(tail);

  const hitMesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.9, 8, 8),
    new THREE.MeshBasicMaterial({ visible: false }),
  );
  hitMesh.position.y = 0.65;
  hitMesh.userData.action = "rabbit";
  group.add(hitMesh);
  animalInteractiveObjects.push(hitMesh);

  return group;
}

const rabbits = [];
for (let i = 0; i < 4; i++) {
  const rabbitMesh = createRabbit();
  islandGroup.add(rabbitMesh);

  rabbits.push({
    mesh: rabbitMesh,
    orbitRadius: 2.8 + Math.random() * 3.2,
    orbitSpeed: (0.12 + Math.random() * 0.15) * (i % 2 === 0 ? 1 : -1),
    phase: (i / 4) * Math.PI * 2,
    baseY: 4.05,
    hopSpeed: 4.5 + Math.random() * 2.0,
    hopHeight: 0.15,
    scale: 0.75 + Math.random() * 0.25,
  });
  rabbits[i].mesh.scale.setScalar(rabbits[i].scale);
}

function updateRabbits(time) {
  rabbits.forEach((r) => {
    const angle = r.phase + time * r.orbitSpeed;
    const sign = Math.sign(r.orbitSpeed) || 1;

    const x = Math.cos(angle) * r.orbitRadius;
    const z = Math.sin(angle) * r.orbitRadius;
    const boosted = (r.mesh.userData.boostUntil || 0) > time;
    const hop = Math.abs(Math.sin(time * (boosted ? 10 : r.hopSpeed))) * (boosted ? .55 : r.hopHeight);

    r.mesh.position.set(x, r.baseY + hop, z);

    const dx = -Math.sin(angle) * sign;
    const dz = Math.cos(angle) * sign;
    r.mesh.rotation.y = Math.atan2(dx, dz);
  });
}

// LANTERNS & MESSAGES WITH IMAGES
const lanternsGroup = new THREE.Group();
scene.add(lanternsGroup);

const lanterns = [];
const interactiveObjects = [];

const wishList = [
  {
    text: "Chúc cậu luôn xinh đẹp, rạng rỡ và dịu dàng như ánh trăng đêm rằm.",
    img: "./assets/1790230176635_118967847828258086_4221998383065855767_e339734ff5d92d896379c397e67b7ae3.jpg",
  },
  {
    text: "Mong mọi khoảnh khắc của cậu đều bình yên, ngọt ngào và đầy ắp niềm vui.",
    img: "./assets/1790230228219_118967847828258086_4221998383065855767_4d7795de414eebb86463eb202d3cd8b8.jpg",
  },
  {
    text: "Chúc cậu có thật nhiều chuyến đi đáng nhớ và luôn tìm thấy bình yên trong tim.",
    img: "./assets/1790230228253_118967847828258086_4221998383065855767_96e79df0302250863d245766c09db6a9.jpg",
  },
  {
    text: "Chúc cậu luôn tự tin, duyên dáng và tỏa sáng theo cách riêng của mình.",
    img: "./assets/1790230248353_118967847828258086_4221998383065855767_06daf76b6290d7932135fbca01d2f9e1.jpg",
  },
  {
    text: "Mong những điều cậu ước sẽ dần thành hiện thực, mỗi ngày đều có thêm một niềm vui.",
    img: "./assets/1790230267044_118967847828258086_4221998383065855767_a51cc7bfc563874e3c34ecfae6ada74d.jpg",
  },
  {
    text: "Chúc cậu luôn giữ nụ cười trong veo và gặp thật nhiều người yêu thương mình.",
    img: "./assets/1790230285115_118967847828258086_4221998383065855767_94d2fc384dcab08aa99597a5943b6916.jpg",
  },
  {
    text: "Chúc cậu một mùa Trung Thu ấm áp, hạnh phúc và luôn có người cùng sẻ chia.",
    img: "./assets/1790230304906_118967847828258086_4221998383065855767_179fa5376defa39415fd1c10edd6f833.jpg",
  },
];

function createLanternTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  const grad = ctx.createLinearGradient(0, 0, 0, 128);
  grad.addColorStop(0, "#ff4d4d");
  grad.addColorStop(0.5, "#e63946");
  grad.addColorStop(1, "#ffb703");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  ctx.strokeStyle = "#ffd700";
  ctx.lineWidth = 6;
  ctx.strokeRect(4, 4, 120, 120);
  return new THREE.CanvasTexture(canvas);
}

const lanternTex = createLanternTexture();
const lanternPalettes = [
  { color: 0xe83f4f, glow: 0xff743d },
  { color: 0xf1a735, glow: 0xffcf52 },
  { color: 0xee86aa, glow: 0xffa8c8 },
  { color: 0x8d63c7, glow: 0xba8cff },
  { color: 0x38a99a, glow: 0x74e5d4 },
  { color: 0xf5e6c8, glow: 0xffefbf },
];

function createStarShape() {
  const shape = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const radius = i % 2 === 0 ? .72 : .32;
    const angle = -Math.PI / 2 + (i * Math.PI) / 5;
    const x = Math.cos(angle) * radius, y = Math.sin(angle) * radius;
    if (i === 0) shape.moveTo(x, y); else shape.lineTo(x, y);
  }
  shape.closePath(); return shape;
}

function createLanternMesh(styleIndex, paletteIndex) {
  const group = new THREE.Group();
  const palette = lanternPalettes[paletteIndex % lanternPalettes.length];
  const bodyMat = new THREE.MeshStandardMaterial({
    color: palette.color, emissive: palette.glow, emissiveIntensity: .58,
    roughness: .34, side: THREE.DoubleSide,
  });
  let body;
  if (styleIndex === 0) {
    body = new THREE.Mesh(new THREE.SphereGeometry(.68, 12, 9), bodyMat); body.scale.y = 1.05;
  } else if (styleIndex === 1) {
    body = new THREE.Group();
    for (let p = 0; p < 8; p++) {
      const petal = new THREE.Mesh(new THREE.ConeGeometry(.3, 1.2, 5), bodyMat);
      petal.position.set(Math.cos(p * Math.PI / 4) * .34, 0, Math.sin(p * Math.PI / 4) * .34);
      petal.rotation.z = Math.PI; petal.rotation.y = -p * Math.PI / 4; body.add(petal);
    }
  } else if (styleIndex === 2) {
    body = new THREE.Group();
    const fishBody = new THREE.Mesh(new THREE.SphereGeometry(.58, 12, 8), bodyMat); fishBody.scale.set(.75, 1.15, .62); body.add(fishBody);
    const tail = new THREE.Mesh(new THREE.ConeGeometry(.5, .7, 3), bodyMat); tail.position.y = -.9; tail.rotation.z = Math.PI; body.add(tail);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x24121f });
    [-1,1].forEach((side) => { const eye = new THREE.Mesh(new THREE.SphereGeometry(.06,6,6),eyeMat); eye.position.set(side*.34,.32,.42); body.add(eye); });
  } else if (styleIndex === 3) {
    body = new THREE.Mesh(new THREE.ExtrudeGeometry(createStarShape(), { depth: .2, bevelEnabled: true, bevelSize: .05, bevelThickness: .05 }), bodyMat);
    body.position.z = -.1;
  } else {
    body = new THREE.Group();
    const face = new THREE.Mesh(new THREE.SphereGeometry(.58, 12, 9), bodyMat); body.add(face);
    [-1,1].forEach((side) => { const ear = new THREE.Mesh(new THREE.CylinderGeometry(.1,.13,.65,8),bodyMat); ear.position.set(side*.25,.82,0); ear.rotation.z=side*.12; body.add(ear); });
  }
  group.add(body);

  const capGeo = new THREE.CylinderGeometry(0.63, 0.63, 0.1, 6);
  const capMat = new THREE.MeshStandardMaterial({
    color: 0xffd700,
    metalness: 0.5,
  });
  const capTop = new THREE.Mesh(capGeo, capMat);
  capTop.position.y = 0.7;
  group.add(capTop);

  const tagGeo = new THREE.PlaneGeometry(0.35, 0.7);
  const tagMat = new THREE.MeshBasicMaterial({
    color: 0xd90429,
    side: THREE.DoubleSide,
  });
  const tag = new THREE.Mesh(tagGeo, tagMat);
  tag.position.set(0, -1.1, 0);
  group.add(tag);

  const spriteMat = new THREE.SpriteMaterial({
    map: createParticleTexture(),
    color: palette.glow,
    transparent: true,
    opacity: 0.7,
    blending: THREE.AdditiveBlending,
  });
  const glow = new THREE.Sprite(spriteMat);
  glow.scale.set(3.2, 3.2, 1);
  group.add(glow);

  const hitGeo = new THREE.SphereGeometry(1.6, 8, 8);
  const hitMat = new THREE.MeshBasicMaterial({ visible: false });
  const hitMesh = new THREE.Mesh(hitGeo, hitMat);
  group.add(hitMesh);

  group.userData.styleIndex = styleIndex;
  return { group, hitMesh, bodyMat, glow };
}

// ENCHANTED ANIMALS: BUTTERFLIES, FIREFLIES, FLYING KOI & A HIDDEN DEER
const butterflies = [];
const butterflyColors = [0xffb3d1, 0xffdf75, 0xbca7ff, 0x8df0df];
for (let i = 0; i < (isMobile ? 7 : 12); i++) {
  const butterfly = new THREE.Group();
  const wingMat = new THREE.MeshBasicMaterial({
    color: butterflyColors[i % butterflyColors.length], side: THREE.DoubleSide,
    transparent: true, opacity: 0.78, blending: THREE.AdditiveBlending,
  });
  const wingGeo = new THREE.CircleGeometry(0.22, 12, 0, Math.PI);
  const leftWing = new THREE.Mesh(wingGeo, wingMat);
  const rightWing = new THREE.Mesh(wingGeo, wingMat);
  leftWing.position.x = -0.16; rightWing.position.x = 0.16;
  leftWing.rotation.z = -0.55; rightWing.rotation.z = 0.55;
  butterfly.add(leftWing, rightWing);
  butterfly.userData = { leftWing, rightWing, radius: 3 + Math.random() * 5, phase: Math.random() * Math.PI * 2, speed: .22 + Math.random() * .22 };
  scene.add(butterfly); butterflies.push(butterfly);
}

const fireflyCount = isMobile ? 24 : 48;
const fireflyGeo = new THREE.BufferGeometry();
const fireflyPos = new Float32Array(fireflyCount * 3);
for (let i = 0; i < fireflyCount; i++) {
  fireflyPos[i * 3] = (Math.random() - .5) * 18;
  fireflyPos[i * 3 + 1] = 4 + Math.random() * 10;
  fireflyPos[i * 3 + 2] = (Math.random() - .5) * 18;
}
fireflyGeo.setAttribute("position", new THREE.BufferAttribute(fireflyPos, 3));
const fireflies = new THREE.Points(fireflyGeo, new THREE.PointsMaterial({
  size: isMobile ? .28 : .22, color: 0xffec8b, map: createParticleTexture(),
  transparent: true, opacity: .85, blending: THREE.AdditiveBlending, depthWrite: false,
}));
scene.add(fireflies);

function createKoi(color) {
  const koi = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: .18, roughness: .45 });
  const body = new THREE.Mesh(new THREE.SphereGeometry(.55, 16, 10), mat);
  body.scale.set(1.6, .62, .72); koi.add(body);
  const tail = new THREE.Mesh(new THREE.ConeGeometry(.52, .8, 3), mat);
  tail.position.x = -.95; tail.rotation.z = Math.PI / 2; koi.add(tail);
  const finMat = mat.clone(); finMat.transparent = true; finMat.opacity = .68; finMat.side = THREE.DoubleSide;
  const fin = new THREE.Mesh(new THREE.CircleGeometry(.38, 8, 0, Math.PI), finMat);
  fin.position.set(0, -.25, 0); fin.rotation.x = Math.PI / 2; koi.add(fin);
  const hitMesh = new THREE.Mesh(new THREE.SphereGeometry(1.15, 8, 8), new THREE.MeshBasicMaterial({ visible: false }));
  hitMesh.userData.action = "koi"; koi.add(hitMesh); animalInteractiveObjects.push(hitMesh);
  return koi;
}
const koiSchool = [0xff8855, 0xffd26a, 0xf4ecdf].map((color, i) => {
  const koi = createKoi(color); koi.userData = { phase: i * 2.1, radius: 11 + i * 1.4 };
  scene.add(koi); return koi;
});

function createDeer() {
  const deer = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0xf6f0dc, emissive: 0xb9d8ff, emissiveIntensity: .35, roughness: .6 });
  const body = new THREE.Mesh(new THREE.SphereGeometry(.8, 14, 10), mat); body.scale.set(.72, 1.25, .62); body.position.y = 1.8; deer.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(.48, 12, 10), mat); head.position.set(0, 3, .18); deer.add(head);
  [-.32,.32].forEach((x) => { const leg = new THREE.Mesh(new THREE.CylinderGeometry(.08,.1,1.5,7),mat); leg.position.set(x,.65,0); deer.add(leg); });
  [-1,1].forEach((side) => { const antler = new THREE.Mesh(new THREE.CylinderGeometry(.025,.05,.85,6),mat); antler.position.set(side*.25,3.65,0); antler.rotation.z=side*.28; deer.add(antler); });
  deer.position.set(-7, 3.7, -5); deer.scale.setScalar(.75); deer.visible = false;
  scene.add(deer); return deer;
}
const moonDeer = createDeer();

function updateEnchantedAnimals(time) {
  butterflies.forEach((b) => {
    const a = time * b.userData.speed + b.userData.phase;
    b.position.set(Math.cos(a) * b.userData.radius, 6.5 + Math.sin(a * 2.3) * 1.5, Math.sin(a) * b.userData.radius);
    const flap = Math.sin(time * 10 + b.userData.phase) * .65;
    b.userData.leftWing.rotation.y = flap; b.userData.rightWing.rotation.y = -flap;
  });
  const fp = fireflyGeo.attributes.position.array;
  for (let i = 0; i < fireflyCount; i++) {
    fp[i * 3] += Math.sin(time * .7 + i) * .002;
    fp[i * 3 + 1] += Math.sin(time * 1.3 + i * 2) * .0015;
  }
  fireflyGeo.attributes.position.needsUpdate = true;
  koiSchool.forEach((koi, i) => {
    const a = time * .12 + koi.userData.phase;
    koi.position.set(Math.cos(a) * koi.userData.radius, 10 + Math.sin(a * 2 + i) * 2.5, Math.sin(a) * koi.userData.radius);
    koi.rotation.y = -a + Math.PI / 2; koi.rotation.z = Math.sin(time * 2 + i) * .08;
  });
  if (moonDeer.visible) moonDeer.rotation.y = Math.sin(time * .25) * .15 + .45;
}

const lanternCount = isMobile ? 24 : 38;
for (let i = 0; i < lanternCount; i++) {
  const { group: lantern, hitMesh, bodyMat, glow } = createLanternMesh(i % 5, i % lanternPalettes.length);

  const radius = 9 + Math.random() * 25;
  const angle = Math.random() * Math.PI * 2;
  const y = -1 + Math.random() * 30;

  lantern.position.set(Math.cos(angle) * radius, y, Math.sin(angle) * radius);

  // Phân bổ tuần tự để cả 7 ảnh và lời chúc đều chắc chắn xuất hiện.
  const wishData = wishList[i % wishList.length];

  lantern.userData = {
    speedY: 0.008 + Math.random() * 0.012,
    swingSpeed: 0.8 + Math.random() * 1.2,
    initialX: lantern.position.x,
    initialZ: lantern.position.z,
    wish: wishData.text,
    imgUrl: wishData.img,
    wishIndex: i % wishList.length,
    bodyMat,
    glow,
    styleIndex: i % 5,
    visited: false,
    id: i,
  };

  const sc = 0.75 + Math.random() * 0.5;
  lantern.scale.set(sc, sc, sc);

  hitMesh.userData.parentLantern = lantern;

  lanternsGroup.add(lantern);
  lanterns.push(lantern);
  interactiveObjects.push(hitMesh);
}

// HIGH-FIDELITY GLB ASSETS WITH PROCEDURAL FALLBACKS
if (THREE.GLTFLoader) {
  const gltfLoader = new THREE.GLTFLoader();
  gltfLoader.load("./assets/models/ancient-oak.glb", (gltf) => {
    const model = gltf.scene;
    const bounds = new THREE.Box3().setFromObject(model);
    const size = bounds.getSize(new THREE.Vector3());
    const scale = 9.5 / Math.max(size.y, .001);
    model.scale.setScalar(scale);
    bounds.setFromObject(model);
    const center = bounds.getCenter(new THREE.Vector3());
    model.position.set(-center.x, -bounds.min.y, -center.z);
    model.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = !isMobile;
        child.receiveShadow = true;
        if (child.material) {
          child.material = child.material.clone();
          child.material.roughness = Math.max(.55, child.material.roughness ?? .7);
        }
      }
    });
    treeGroup.children.slice(0, 1 + mainBranchCount).forEach((child) => { if (child.isMesh) child.visible = false; });
    treeGroup.add(model);
  }, undefined, () => { console.warn("Using procedural tree fallback."); });

  gltfLoader.load("./assets/models/silk-lantern.glb", (gltf) => {
    lanterns.filter((lantern) => lantern.userData.styleIndex === 0).forEach((lantern) => {
      const model = gltf.scene.clone(true);
      const bounds = new THREE.Box3().setFromObject(model);
      const size = bounds.getSize(new THREE.Vector3());
      const scale = 1.7 / Math.max(size.y, .001);
      model.scale.setScalar(scale);
      bounds.setFromObject(model);
      const center = bounds.getCenter(new THREE.Vector3());
      model.position.set(-center.x, -bounds.getCenter(new THREE.Vector3()).y, -center.z);
      const accent = lantern.userData.bodyMat.color;
      model.traverse((child) => {
        if (!child.isMesh) return;
        child.castShadow = !isMobile;
        child.material = child.material.clone();
        if (child.material.color) child.material.color.lerp(accent, .38);
        if (child.material.emissive) { child.material.emissive.copy(accent); child.material.emissiveIntensity = .32; }
      });
      lantern.children[0].visible = false;
      lantern.add(model);
      lantern.userData.glbModel = model;
    });
  }, undefined, () => { console.warn("Using procedural lantern fallback."); });
}

// FALLING PETALS & STARS
const fallingPetalsCount = isMobile ? 80 : 180;
const petalsGeo = new THREE.BufferGeometry();
const petalsPos = new Float32Array(fallingPetalsCount * 3);
const petalsData = [];

for (let i = 0; i < fallingPetalsCount; i++) {
  petalsPos[i * 3] = (Math.random() - 0.5) * 36;
  petalsPos[i * 3 + 1] = Math.random() * 36;
  petalsPos[i * 3 + 2] = (Math.random() - 0.5) * 36;

  petalsData.push({
    speedY: 0.02 + Math.random() * 0.03,
  });
}

petalsGeo.setAttribute("position", new THREE.BufferAttribute(petalsPos, 3));
const petalsMat = new THREE.PointsMaterial({
  size: isMobile ? 0.35 : 0.3,
  color: 0xf7d1d5,
  transparent: true,
  opacity: 0.75,
  map: createParticleTexture(),
  blending: THREE.NormalBlending,
  depthWrite: false,
});

const petalsParticles = new THREE.Points(petalsGeo, petalsMat);
scene.add(petalsParticles);

const starCount = isMobile ? 400 : 900;
const starGeo = new THREE.BufferGeometry();
const starPos = new Float32Array(starCount * 3);
for (let i = 0; i < starCount; i++) {
  starPos[i * 3] = (Math.random() - 0.5) * 180;
  starPos[i * 3 + 1] = Math.random() * 90;
  starPos[i * 3 + 2] = (Math.random() - 0.5) * 180;
}
starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
const starMat = new THREE.PointsMaterial({
  color: 0xffffff,
  size: 0.4,
  transparent: true,
  opacity: 0.7,
});
scene.add(new THREE.Points(starGeo, starMat));

// SEVEN-STAR CONSTELLATION REVEALED WITH THE WISHES
const constellationPoints = [
  [-13,24,-38],[-9,27,-38],[-5,24,-38],[-1,28,-38],[3,24,-38],[7,27,-38],[11,24,-38],
].map((p)=>new THREE.Vector3(...p));
const constellationGeo = new THREE.BufferGeometry().setFromPoints(constellationPoints);
const constellationMat = new THREE.LineBasicMaterial({color:0xffd987,transparent:true,opacity:.08});
const constellationLine = new THREE.Line(constellationGeo,constellationMat);scene.add(constellationLine);
const constellationStars=constellationPoints.map((p)=>{const s=new THREE.Sprite(new THREE.SpriteMaterial({map:createParticleTexture(),color:0xffe9a9,transparent:true,opacity:.16,blending:THREE.AdditiveBlending}));s.position.copy(p);s.scale.set(.8,.8,1);scene.add(s);return s});

// FIREWORKS
let fireworks = [];
let audioContext = null;
let ambientGain = null;
function startAmbientSound(){
  if(!audioContext||ambientGain)return;
  const length=audioContext.sampleRate*2,buffer=audioContext.createBuffer(1,length,audioContext.sampleRate),data=buffer.getChannelData(0);
  for(let i=0;i<length;i++)data[i]=(Math.random()*2-1)*.16;
  const source=audioContext.createBufferSource(),filter=audioContext.createBiquadFilter();ambientGain=audioContext.createGain();
  source.buffer=buffer;source.loop=true;filter.type="lowpass";filter.frequency.value=420;ambientGain.gain.value=.018;
  source.connect(filter).connect(ambientGain).connect(audioContext.destination);source.start();
}
function playEffect(frequency=520,duration=.2,volume=.025){
  if(!audioContext||!isPlaying)return;
  const osc=audioContext.createOscillator(),gain=audioContext.createGain();
  osc.type="sine";osc.frequency.setValueAtTime(frequency,audioContext.currentTime);osc.frequency.exponentialRampToValueAtTime(Math.max(90,frequency*.55),audioContext.currentTime+duration);
  gain.gain.setValueAtTime(volume,audioContext.currentTime);gain.gain.exponentialRampToValueAtTime(.0001,audioContext.currentTime+duration);
  osc.connect(gain).connect(audioContext.destination);osc.start();osc.stop(audioContext.currentTime+duration);
}
function createFirework(pos, requestedType) {
  const types=["sphere","heart","willow","ring"];
  const type=requestedType||types[Math.floor(Math.random()*types.length)];
  const pCount = isMobile ? 42 : 76;
  const pGeo = new THREE.BufferGeometry();
  const pPositions = new Float32Array(pCount * 3);
  const velocities = [];

  for (let i = 0; i < pCount; i++) {
    pPositions[i * 3] = pos.x;
    pPositions[i * 3 + 1] = pos.y;
    pPositions[i * 3 + 2] = pos.z;

    const theta = (i/pCount)*Math.PI*2;
    let velocity;
    if(type==="heart"){
      const x=16*Math.pow(Math.sin(theta),3),y=13*Math.cos(theta)-5*Math.cos(2*theta)-2*Math.cos(3*theta)-Math.cos(4*theta);
      velocity=new THREE.Vector3(x*.011,y*.011,(Math.random()-.5)*.045);
    }else if(type==="ring"){
      const speed=.12+Math.random()*.04;velocity=new THREE.Vector3(Math.cos(theta)*speed,Math.sin(theta)*speed,(Math.random()-.5)*.025);
    }else{
      const phi=Math.random()*Math.PI,speed=.07+Math.random()*.12;
      velocity=new THREE.Vector3(speed*Math.sin(phi)*Math.cos(theta),speed*Math.sin(phi)*Math.sin(theta),speed*Math.cos(phi));
      if(type==="willow")velocity.y=Math.abs(velocity.y)*.75+.035;
    }
    velocities.push(velocity);
  }

  pGeo.setAttribute("position", new THREE.BufferAttribute(pPositions, 3));
  const pMat = new THREE.PointsMaterial({
    size: 0.35,
    color: [0xffd76a,0xff8fb7,0x9ee8ff,0xc3a2ff][Math.floor(Math.random()*4)],
    transparent: true,
    opacity: 1,
    blending: THREE.AdditiveBlending,
  });

  const pMesh = new THREE.Points(pGeo, pMat);
  scene.add(pMesh);
  const flash=new THREE.PointLight(pMat.color,2.8,24);flash.position.copy(pos);scene.add(flash);
  fireworks.push({ mesh: pMesh, velocities, life: 1.0, type, flash });
  playEffect(type==="heart"?660:420,.28,.018);
}

// RAYCASTER & INTERACTION
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let targetCamPos = null;
let targetCamTarget = null;
let selectedLantern = null;
let autoTour = false;

const wishModal = document.getElementById("wishModal");
const wishText = document.getElementById("wishText");
const wishImage = document.getElementById("wishImage");
const wishNumber = document.getElementById("wishNumber");
const closeWishBtn = document.getElementById("closeWishBtn");
const welcomeScreen = document.getElementById("welcomeScreen");
const helpModal = document.getElementById("helpModal");
const completionModal = document.getElementById("completionModal");
const progressText = document.getElementById("progressText");
const progressBar = document.getElementById("progressBar");
const liveRegion = document.getElementById("liveRegion");
const clickHint = document.getElementById("clickHint");
const visitedWishes = new Set();
let completionShown = false;
let lastFocusedElement = null;
let typingTimer = null;

wishList.forEach(({ img }) => {
  const preload = new Image();
  preload.src = img;
});

let pointerDownPos = { x: 0, y: 0 };

function onPointerDown(event) {
  pointerDownPos.x =
    event.clientX || (event.touches && event.touches[0].clientX) || 0;
  pointerDownPos.y =
    event.clientY || (event.touches && event.touches[0].clientY) || 0;
}

function onPointerUp(event) {
  if (event.target.closest("button") || event.target.closest(".wish-modal") ||
      event.target.closest(".info-modal") || event.target.closest(".completion-modal") ||
      !welcomeScreen.classList.contains("hidden"))
    return;

  const clientX =
    event.clientX ||
    (event.changedTouches && event.changedTouches[0].clientX) ||
    0;
  const clientY =
    event.clientY ||
    (event.changedTouches && event.changedTouches[0].clientY) ||
    0;

  const distMoved = Math.hypot(
    clientX - pointerDownPos.x,
    clientY - pointerDownPos.y,
  );
  if (distMoved > 8) return;

  mouse.x = (clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects([...interactiveObjects, ...animalInteractiveObjects], false);

  if (intersects.length > 0) {
    const hitMesh = intersects[0].object;
    if (hitMesh.userData.action === "rabbit") {
      const worldPos = new THREE.Vector3(); hitMesh.getWorldPosition(worldPos);
      createFirework(worldPos.clone().add(new THREE.Vector3(0, 1.5, 0)));
      hitMesh.parent.userData.boostUntil = clock.getElapsedTime() + 1.2;
      liveRegion.textContent = "Thỏ ngọc vừa gửi cậu một chút may mắn!";
      return;
    }
    if (hitMesh.userData.action === "koi") {
      const worldPos = new THREE.Vector3(); hitMesh.getWorldPosition(worldPos);
      createFirework(worldPos);
      liveRegion.textContent = "Cá chép đã để lại một vòng sáng may mắn.";
      return;
    }
    selectedLantern = hitMesh.userData.parentLantern || hitMesh.parent;
    const lPos = selectedLantern.position;

    createFirework(lPos);

    const offset = new THREE.Vector3()
      .subVectors(camera.position, lPos)
      .normalize()
      .multiplyScalar(5.5);
    targetCamPos = new THREE.Vector3().addVectors(lPos, offset);
    targetCamTarget = lPos.clone();

    openWish(selectedLantern);
  }
}

window.addEventListener("pointerdown", onPointerDown, { passive: true });
window.addEventListener("pointerup", onPointerUp, { passive: true });
window.addEventListener("pointermove", (event) => {
  if (!welcomeScreen.classList.contains("hidden") || event.pointerType === "touch") return;
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);
  const hoverHits = raycaster.intersectObjects([...interactiveObjects, ...animalInteractiveObjects], false);
  document.body.style.cursor = hoverHits.length ? "pointer" : "default";
}, { passive: true });

function resetCamera() {
  targetCamPos = DEFAULT_CAM_POS.clone();
  targetCamTarget = DEFAULT_CAM_TARGET.clone();
  selectedLantern = null;
}

function updateProgress() {
  const count = visitedWishes.size;
  progressText.textContent = `${count} / ${wishList.length}`;
  progressBar.style.width = `${(count / wishList.length) * 100}%`;
  constellationMat.opacity = .08 + (count / wishList.length) * .65;
  constellationStars.forEach((star,index)=>{star.material.opacity=index<count ? .95 : .16;star.scale.setScalar(index<count ? 1.5 : .8)});
  blossomMat.opacity = .72 + count * .035;
  treeLight.intensity = 2.5 + count * .16;
  scene.fog.density = Math.max(.0055,.008-count*.0003);
  liveRegion.textContent = `Đã khám phá ${count} trên ${wishList.length} lời chúc.`;
  if (count > 0) clickHint.style.opacity = "0";
  if (count >= 5 && !moonDeer.visible) {
    moonDeer.visible = true;
    liveRegion.textContent = "Hươu trắng đã xuất hiện trong khu vườn dưới trăng.";
    createFirework(moonDeer.position.clone().add(new THREE.Vector3(0, 3, 0)));
  }
}

function markWishVisited(index) {
  visitedWishes.add(index);
  lanterns.filter((lantern) => lantern.userData.wishIndex === index).forEach((lantern) => {
    lantern.userData.visited = true;
    lantern.userData.bodyMat.emissive.setHex(0xffc533);
    lantern.userData.bodyMat.emissiveIntensity = 1.25;
    lantern.userData.glow.material.color.setHex(0xffe580);
    lantern.userData.glow.material.opacity = 0.95;
  });
  updateProgress();
}

function openWish(lantern) {
  const index = lantern.userData.wishIndex;
  lastFocusedElement = document.activeElement;
  markWishVisited(index);
  typeWish(`“${lantern.userData.wish}”`);
  wishNumber.textContent = `${String(index + 1).padStart(2, "0")} / ${String(wishList.length).padStart(2, "0")}`;
  wishImage.classList.remove("loaded");
  wishImage.alt = `Kỷ niệm số ${index + 1} trong hành trình lời chúc`;
  wishImage.src = lantern.userData.imgUrl;
  wishImage.parentElement.style.setProperty("--wish-bg", `url("${lantern.userData.imgUrl}")`);
  if (wishImage.complete) requestAnimationFrame(() => wishImage.classList.add("loaded"));
  wishModal.classList.add("active");
  playEffect(760,.16,.012);
  wishModal.setAttribute("aria-hidden", "false");
  setTimeout(() => closeWishBtn.focus(), reduceMotion ? 0 : 300);
}

function typeWish(message) {
  clearInterval(typingTimer);
  if (reduceMotion) {
    wishText.textContent = message;
    return;
  }
  let index = 0;
  wishText.textContent = "";
  typingTimer = setInterval(() => {
    index += 1;
    wishText.textContent = message.slice(0, index);
    if (index >= message.length) clearInterval(typingTimer);
  }, 22);
}

wishImage.addEventListener("load", () => wishImage.classList.add("loaded"));

function closeWishCard(e) {
  if (e) {
    e.stopPropagation();
    e.preventDefault();
  }
  wishModal.classList.remove("active");
  clearInterval(typingTimer);
  wishModal.setAttribute("aria-hidden", "true");
  resetCamera();
  if (lastFocusedElement?.focus) lastFocusedElement.focus();
  if (visitedWishes.size === wishList.length && !completionShown) {
    completionShown = true;
    setTimeout(showCompletion, reduceMotion ? 0 : 450);
  }
}

closeWishBtn.addEventListener("click", closeWishCard);
closeWishBtn.addEventListener("touchend", closeWishCard);

wishModal.addEventListener("click", (e) => {
  if (e.target === wishModal) closeWishCard(e);
});

window.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    if (wishModal.classList.contains("active")) closeWishCard();
    helpModal.classList.remove("active");
    completionModal.classList.remove("active");
  }
  if (e.key === "Enter" && welcomeScreen.classList.contains("hidden") &&
      !wishModal.classList.contains("active") && !helpModal.classList.contains("active") &&
      !completionModal.classList.contains("active") && document.activeElement === document.body) {
    const nextIndex = wishList.findIndex((_, index) => !visitedWishes.has(index));
    const lantern = lanterns.find((item) => item.userData.wishIndex === (nextIndex < 0 ? 0 : nextIndex));
    if (lantern) { selectedLantern = lantern; openWish(lantern); }
  }
});

// AUDIO
const bgm = document.getElementById("bgm");
const audioBtn = document.getElementById("audio-btn");
let isPlaying = false;

function toggleAudio() {
  if(!audioContext)audioContext=new (window.AudioContext||window.webkitAudioContext)();
  if(audioContext.state==="suspended")audioContext.resume();
  startAmbientSound();
  if (isPlaying) {
    bgm.pause();
    isPlaying = false;
    if(ambientGain)ambientGain.gain.setTargetAtTime(0,audioContext.currentTime,.08);
  } else {
    bgm.play().then(() => { isPlaying = true;if(ambientGain)ambientGain.gain.setTargetAtTime(.018,audioContext.currentTime,.08);updateAudioButton(); }).catch(() => {});
  }
  updateAudioButton();
}

function updateAudioButton() {
  audioBtn.setAttribute("aria-pressed", String(isPlaying));
  audioBtn.setAttribute("aria-label", isPlaying ? "Tắt nhạc" : "Bật nhạc");
  audioBtn.title = isPlaying ? "Tắt nhạc" : "Bật nhạc";
}

function enterGarden(playMusic) {
  welcomeScreen.classList.add("hidden");
  if (playMusic && !isPlaying) toggleAudio();
  targetCamPos = DEFAULT_CAM_POS.clone();
  targetCamTarget = DEFAULT_CAM_TARGET.clone();
}

function showCompletion() {
  autoTour = false; controls.enabled = true;
  targetCamPos = new THREE.Vector3(0,18,52);
  targetCamTarget = new THREE.Vector3(0,7,0);
  completionModal.classList.add("active");
  completionModal.setAttribute("aria-hidden", "false");
  const finaleTypes=["ring","heart","willow","sphere","heart","ring"];
  for (let i = 0; i < finaleTypes.length; i++) {
    setTimeout(() => createFirework(new THREE.Vector3((Math.random() - .5) * 24, 14 + Math.random() * 11, -4 + (Math.random() - .5) * 8),finaleTypes[i]), i * 260);
  }
  document.getElementById("continueBtn").focus();
}

document.getElementById("startBtn").addEventListener("click", () => enterGarden(true));
document.getElementById("skipIntroBtn").addEventListener("click", () => enterGarden(false));
audioBtn.addEventListener("click", toggleAudio);
document.getElementById("reset-cam-btn").addEventListener("click", resetCamera);
document.getElementById("helpBtn").addEventListener("click", () => {
  helpModal.classList.add("active"); helpModal.setAttribute("aria-hidden", "false");
});
document.getElementById("tourBtn").addEventListener("click",()=>{
  autoTour=!autoTour;controls.enabled=!autoTour;
  const button=document.getElementById("tourBtn");button.setAttribute("aria-pressed",String(autoTour));button.setAttribute("aria-label",autoTour?"Tắt chế độ tự động tham quan":"Bật chế độ tự động tham quan");
  if(!autoTour)resetCamera();
});
document.querySelector('[data-close="helpModal"]').addEventListener("click", () => {
  helpModal.classList.remove("active"); helpModal.setAttribute("aria-hidden", "true");
});
helpModal.addEventListener("click", (e) => { if (e.target === helpModal) e.currentTarget.classList.remove("active"); });
document.getElementById("continueBtn").addEventListener("click", () => {
  completionModal.classList.remove("active"); completionModal.setAttribute("aria-hidden", "true");
});
document.getElementById("fullscreenBtn").addEventListener("click", async () => {
  try {
    if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
    else await document.exitFullscreen();
  } catch (_) {}
});
if (!document.documentElement.requestFullscreen) document.getElementById("fullscreenBtn").hidden = true;
if (new URLSearchParams(window.location.search).has("preview")) enterGarden(false);

// ANIMATION
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();
  const time = clock.getElapsedTime();

  lanterns.forEach((lantern) => {
    if (!reduceMotion) {
      lantern.position.y += lantern.userData.speedY;
      lantern.position.x = lantern.userData.initialX + Math.sin(time * lantern.userData.swingSpeed + lantern.userData.id) * 0.4;
      lantern.position.z = lantern.userData.initialZ + Math.cos(time * lantern.userData.swingSpeed + lantern.userData.id) * 0.4;
      lantern.rotation.y += 0.005;
    }
    const pulse=1+Math.sin(time*2+lantern.userData.id)*.08;
    lantern.userData.glow.scale.set(3.2*pulse,3.2*pulse,1);
    const body=lantern.children[0];
    if(!reduceMotion&&lantern.userData.styleIndex===1)body.rotation.y=Math.sin(time*.7+lantern.userData.id)*.22;
    if(!reduceMotion&&lantern.userData.styleIndex===2&&body.children[1])body.children[1].rotation.y=Math.sin(time*4+lantern.userData.id)*.35;
    if(!reduceMotion&&lantern.userData.styleIndex===4&&body.children.length>2){body.children[1].rotation.z=.12+Math.sin(time*3)*.08;body.children[2].rotation.z=-.12-Math.sin(time*3)*.08;}

    if (lantern.position.y > 30) {
      lantern.position.y = -3;
    }
  });

  if (!reduceMotion) {
    const pPos = petalsGeo.attributes.position.array;
    for (let i = 0; i < fallingPetalsCount; i++) {
      pPos[i * 3 + 1] -= petalsData[i].speedY;
      pPos[i * 3] += Math.sin(time + i) * 0.01;
      pPos[i * 3 + 2] += Math.cos(time + i) * 0.01;
      if (pPos[i * 3 + 1] < -3) {
        pPos[i * 3 + 1] = 30;
        pPos[i * 3] = (Math.random() - 0.5) * 36;
        pPos[i * 3 + 2] = (Math.random() - 0.5) * 36;
      }
    }
    petalsGeo.attributes.position.needsUpdate = true;
  }

  cloudGroups.forEach((cloud) => {
    if (!reduceMotion) cloud.position.x += cloud.userData.speed;
    if (cloud.position.x > 55) cloud.position.x = -55;
  });

  if (!reduceMotion && time > shootingStar.userData.nextAt) {
    const flight = time - shootingStar.userData.nextAt;
    if (flight < 1.3) {
      shootingStar.material.opacity = Math.sin((flight / 1.3) * Math.PI) * 0.75;
      shootingStar.position.set(-24 + flight * 38, 29 - flight * 11, -25);
    } else {
      shootingStar.material.opacity = 0;
      shootingStar.userData.nextAt = time + 12 + Math.random() * 20;
    }
  }

  for (let i = fireworks.length - 1; i >= 0; i--) {
    const fw = fireworks[i];
    fw.life -= delta * 1.2;
    const posArr = fw.mesh.geometry.attributes.position.array;

    for (let j = 0; j < fw.velocities.length; j++) {
      posArr[j * 3] += fw.velocities[j].x;
      posArr[j * 3 + 1] += fw.velocities[j].y;
      posArr[j * 3 + 2] += fw.velocities[j].z;
      if(fw.type==="willow"||fw.type==="sphere")fw.velocities[j].y-=.0015;
      fw.velocities[j].multiplyScalar(.993);
    }
    fw.mesh.geometry.attributes.position.needsUpdate = true;
    fw.mesh.material.opacity = fw.life;
    fw.flash.intensity=Math.max(0,fw.life*2.8);

    if (fw.life <= 0) {
      scene.remove(fw.mesh);
      scene.remove(fw.flash);
      fireworks.splice(i, 1);
    }
  }

  if (!reduceMotion) islandGroup.rotation.y = Math.sin(time * 0.15) * 0.05;

  if(!reduceMotion){
    treeOrnaments.forEach((ornament)=>{ornament.rotation.z=ornament.userData.baseRotation+Math.sin(time*1.2+ornament.userData.phase)*.08;});
    pond.material.emissiveIntensity=.28+Math.sin(time*.8)*.08;
  }

  if (!reduceMotion) {
    updateRabbits(time);
    updateEnchantedAnimals(time);
  }

  if (targetCamPos && targetCamTarget) {
    camera.position.lerp(targetCamPos, 0.04);
    controls.target.lerp(targetCamTarget, 0.04);

    if (camera.position.distanceTo(targetCamPos) < 0.1) {
      targetCamPos = null;
      targetCamTarget = null;
    }
  }

  if(autoTour&&!reduceMotion&&!wishModal.classList.contains("active")){
    const radius=isMobile?42:36,angle=time*.055;
    camera.position.lerp(new THREE.Vector3(Math.sin(angle)*radius,12+Math.sin(time*.15)*3,Math.cos(angle)*radius),.012);
    controls.target.lerp(new THREE.Vector3(0,7,0),.02);
  }

  controls.update();
  renderer.render(scene, camera);
}

// Give reduced-motion users a composed static scene instead of stacked objects.
updateRabbits(0);
updateEnchantedAnimals(0);
animate();

window.addEventListener("resize", () => {
  const width = window.innerWidth;
  const height = window.innerHeight;

  camera.aspect = width / height;
  camera.fov = width < 768 ? 60 : 45;
  camera.updateProjectionMatrix();

  renderer.setSize(width, height);
  renderer.setPixelRatio(
    Math.min(window.devicePixelRatio, width < 768 ? 1.5 : 2),
  );
});
