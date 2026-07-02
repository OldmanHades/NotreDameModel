import "./styles.css";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

const canvas = document.querySelector("#scene");
const timeSlider = document.querySelector("#time-slider");
const timeLabel = document.querySelector("#time-label");
const presetDay = document.querySelector("#preset-day");
const presetDusk = document.querySelector("#preset-dusk");
const presetNight = document.querySelector("#preset-night");
const lightsAutoButton = document.querySelector("#lights-auto");
const lightsOnButton = document.querySelector("#lights-on");
const lightsOffButton = document.querySelector("#lights-off");
const exportButton = document.querySelector("#export-4k");
const viewFront = document.querySelector("#view-front");
const viewSide = document.querySelector("#view-side");
const viewAerial = document.querySelector("#view-aerial");
const viewApse = document.querySelector("#view-apse");

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x66717f, 0.008);

const camera = new THREE.PerspectiveCamera(44, window.innerWidth / window.innerHeight, 0.1, 700);
camera.position.set(0, 17, -100);

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  preserveDrawingBuffer: true,
  powerPreference: "high-performance"
});
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.target.set(0, 10.5, -24);
controls.maxDistance = 170;
controls.minDistance = 12;
controls.maxPolarAngle = Math.PI * 0.49;

const clock = new THREE.Clock();
const cathedralLights = [];
const glowMaterials = [];
const animatedWater = [];
const animatedBoats = [];
const clockHands = [];
const starLayers = [];
let frameCount = 0;
let starNight = 0;
let cameraTween = null;

let timeOfDay = Number.parseFloat(timeSlider.value);
let lightMode = "auto";
let exporting = false;
window.__notreDameDiagnostics = { status: "initializing" };

const palette = {
  stone: 0xcdbd9f,
  warmStone: 0xd7c6aa,
  trim: 0xe3d6bf,
  shadowStone: 0x8b806f,
  roof: 0x6c7881,
  darkGlass: 0x121820,
  gold: 0xf4ba63,
  nightBlue: 0x06112a,
  water: 0x14384a
};

const waterDayColor = new THREE.Color(0x2b5a70);
const waterNightColor = new THREE.Color(0x0a1826);

const buildingTextures = buildingCanvasTexture();
const materials = makeMaterials();
registerGlow(materials.glass, 0.28, 1.7, "cathedral", 0x172846, 0xff9d4f);
registerGlow(materials.roseGlass, 0.12, 1.4, "cathedral", 0x1d2866, 0xcfae72);
registerGlow(materials.bulb, 0.12, 2.6, "ambient");
registerGlow(materials.boatCabin, 0.04, 1.7, "ambient");
registerGlow(materials.clockFace, 0.12, 1.0, "cathedral");

const lampGlowMaterial = new THREE.SpriteMaterial({
  map: glowCanvasTexture(),
  color: 0xffbe6a,
  transparent: true,
  opacity: 0,
  depthWrite: false,
  blending: THREE.AdditiveBlending
});

const shared = makeSharedGeometries();

const sky = createSkyDome();
scene.add(sky.mesh);
scene.add(createStars());

const hemiLight = new THREE.HemisphereLight(0xb9d5ff, 0x4a3829, 1.8);
scene.add(hemiLight);

const fillLight = new THREE.AmbientLight(0xfff1da, 0.18);
scene.add(fillLight);

const sunLight = new THREE.DirectionalLight(0xfff0d3, 3.3);
sunLight.castShadow = true;
sunLight.shadow.mapSize.set(4096, 4096);
sunLight.shadow.camera.left = -75;
sunLight.shadow.camera.right = 75;
sunLight.shadow.camera.top = 75;
sunLight.shadow.camera.bottom = -75;
sunLight.shadow.camera.near = 5;
sunLight.shadow.camera.far = 180;
sunLight.shadow.bias = -0.00035;
sunLight.shadow.normalBias = 0.02;
scene.add(sunLight);

const moonLight = new THREE.DirectionalLight(0xaec9ff, 0.18);
scene.add(moonLight);

const model = new THREE.Group();
model.name = "Notre Dame Cathedral detailed procedural model";
scene.add(model);

buildEnvironment();
buildCathedral();
buildReferenceMarkers();
updateTime(true);
resize();
animate();

presetDay.addEventListener("click", () => setTime(13));
presetDusk.addEventListener("click", () => setTime(19.5));
presetNight.addEventListener("click", () => setTime(22));
timeSlider.addEventListener("input", () => setTime(Number.parseFloat(timeSlider.value)));

lightsAutoButton.addEventListener("click", () => setLightMode("auto"));
lightsOnButton.addEventListener("click", () => setLightMode("on"));
lightsOffButton.addEventListener("click", () => setLightMode("off"));

viewFront.addEventListener("click", () => moveCamera(new THREE.Vector3(0, 17, -100), new THREE.Vector3(0, 10.5, -24)));
viewSide.addEventListener("click", () => moveCamera(new THREE.Vector3(48, 18, -5), new THREE.Vector3(0, 10, 4)));
viewAerial.addEventListener("click", () => moveCamera(new THREE.Vector3(40, 62, -48), new THREE.Vector3(0, 5, 0)));
if (viewApse) {
  viewApse.addEventListener("click", () => moveCamera(new THREE.Vector3(-36, 16, 80), new THREE.Vector3(0, 9, 30)));
}
exportButton.addEventListener("click", export4K);
window.__notreDame = {
  setTime,
  setLightMode,
  lookAt(position, target) {
    camera.position.set(position[0], position[1], position[2]);
    controls.target.set(target[0], target[1], target[2]);
    controls.update();
  },
  renderOnce() {
    resize();
    controls.update();
    renderer.render(scene, camera);
    updateRenderDiagnostics();
    return window.__notreDameDiagnostics;
  }
};
controls.addEventListener("start", () => {
  cameraTween = null;
});
window.addEventListener("resize", resize);

// ---------------------------------------------------------------------------
// Cathedral
// ---------------------------------------------------------------------------

function buildCathedral() {
  const foundation = box(17.5, 1.4, 83, 0, 0.7, 1, materials.foundation);
  foundation.name = "limestone plinth";
  model.add(foundation);

  const nave = box(11.8, 13.5, 70, 0, 7.55, 3, materials.stone);
  const leftAisle = box(4.1, 8.2, 63, -7.9, 4.8, 5, materials.stone);
  const rightAisle = box(4.1, 8.2, 63, 7.9, 4.8, 5, materials.stone);
  const transept = box(31, 12, 12.4, 0, 6.7, 17, materials.stone);
  model.add(nave, leftAisle, rightAisle, transept);

  model.add(gableRoof(13.2, 71.5, 5.3, 0, 14.2, 3, materials.roof));
  model.add(gableRoof(13.4, 32, 4.3, 0, 12.5, 17, materials.roof, Math.PI / 2));
  model.add(leanRoof(1, 5.95, 8.9, 5, 4.1, 63, materials.roof, 1.5));
  model.add(leanRoof(-1, -5.95, 8.9, 5, 4.1, 63, materials.roof, 1.5));
  model.add(createApse());

  const facade = box(20.3, 17.0, 2.4, 0, 9.0, -40.7, materials.stone);
  facade.name = "west facade mass";
  model.add(facade);

  // west gable of the nave roof, seen between the towers above the gallery
  model.add(gablet(13.2, 5.3, 0.8, 0, 14.2, -39.6, materials.stone));

  model.add(createTower(-6.35));
  model.add(createTower(6.35));
  model.add(createFacadeDetails());
  model.add(createSideDetails(-1));
  model.add(createSideDetails(1));
  model.add(createTranseptDetails(-1));
  model.add(createTranseptDetails(1));
  model.add(createSpire());
  model.add(createRoofscape());
}

// --- west facade -----------------------------------------------------------

function createFacadeDetails() {
  const group = new THREE.Group();
  group.name = "west facade portals, kings gallery, rose, colonnade";
  const statueMatrices = [];
  const kingMatrices = [];
  const colonnetteMatrices = [];

  // projecting portal porch — a pierced wall with three pointed-arch openings
  const portals = [
    [-6.2, 4.3, 7.3],
    [0, 4.9, 8.3],
    [6.2, 4.3, 7.3]
  ];
  const porchShape = new THREE.Shape();
  porchShape.moveTo(-10.15, 0);
  porchShape.lineTo(10.15, 0);
  porchShape.lineTo(10.15, 8.6);
  porchShape.lineTo(-10.15, 8.6);
  porchShape.closePath();
  for (const [px, w, h] of portals) {
    porchShape.holes.push(archHolePath(px, 0.5, w + 0.2, h + 0.2));
  }
  const porch = new THREE.Mesh(
    new THREE.ExtrudeGeometry(porchShape, { depth: 0.95, bevelEnabled: false, curveSegments: 24 }),
    materials.stone
  );
  porch.position.set(0, 0, -42.85);
  porch.castShadow = true;
  porch.receiveShadow = true;
  group.add(porch);
  group.add(box(16.5, 0.24, 2.2, 0, 0.12, -43.15, materials.foundation));
  group.add(box(14.5, 0.24, 1.4, 0, 0.34, -42.95, materials.foundation));

  // three portals with receding archivolts, tympanum reliefs, doors, trumeau
  for (const [px, w, h] of portals) {
    for (let i = 1; i < 5; i += 1) {
      const frame = archPanel(
        w - i * 0.46,
        h - i * 0.5,
        0.26,
        materials.shadowStone,
        materials.transparentAir
      );
      frame.position.set(px, 0.55 + i * 0.03, -42.86 + i * 0.16);
      group.add(frame);
    }

    const innerW = w - 2.1;
    const innerH = h - 2.3;
    const tympanum = archPanel(innerW, innerH, 0.12, materials.trim, materials.shadowStone);
    tympanum.position.set(px, 0.68, -42.1);
    group.add(tympanum);

    const lintelY = 0.68 + innerH * 0.42;
    group.add(box(innerW + 0.2, 0.2, 0.26, px, lintelY, -42.2, materials.trim));

    const doorH = lintelY - 0.7;
    for (const s of [-1, 1]) {
      group.add(box(innerW / 2 - 0.2, doorH, 0.14, px + s * (innerW / 4 + 0.04), 0.6 + doorH / 2, -42.14, materials.door));
    }
    group.add(column(px, 0.6 + doorH / 2, -42.3, 0.13, doorH, materials.trim));
    statueMatrices.push(mat4(px, 0.78, -42.44, null, [1.0, doorH * 0.78, 1.0]));

    for (const row of [
      { y: lintelY + 0.24, n: Math.round(innerW / 0.42), s: 0.4 },
      { y: lintelY + 0.98, n: Math.round(innerW / 0.62), s: 0.52 }
    ]) {
      const step = row.s * 0.66;
      for (let i = 0; i < row.n; i += 1) {
        const rx = px - ((row.n - 1) / 2) * step + i * step;
        statueMatrices.push(mat4(rx, row.y, -42.25, null, row.s));
      }
    }
  }

  // full-height buttress piers dividing the facade into three bays
  for (const px of [-9.65, -3.45, 3.45, 9.65]) {
    group.add(box(1.35, 16.9, 1.15, px, 8.85, -42.42, materials.stone));
    group.add(box(1.55, 0.5, 1.35, px, 8.75, -42.42, materials.trim));
    group.add(box(1.5, 0.45, 1.3, px, 14.9, -42.42, materials.trim));
    group.add(createPinnacle(px, 17.3, -42.42, 0.66, 3.1));

    const niche = archPanel(0.72, 1.7, 0.08, materials.trim, materials.shadowStone);
    niche.position.set(px, 5.6, -43.02);
    group.add(niche);
    statueMatrices.push(mat4(px, 5.72, -42.98, null, [1.3, 1.5, 1.3]));

    group.add(createGargoyle(px, 8.95, -43.1, 0.5, Math.PI / 2));
    group.add(createGargoyle(px, 15.05, -43.0, 0.44, Math.PI / 2));
  }

  // Gallery of Kings — 28 crowned statues in a colonnaded band
  group.add(box(20.3, 0.4, 0.55, 0, 8.98, -42.2, materials.trim));
  group.add(box(20.3, 2.3, 0.4, 0, 10.25, -41.98, materials.shadowStone));
  for (let i = 0; i < 28; i += 1) {
    kingMatrices.push(mat4(-9.45 + i * 0.7, 9.28, -42.3, null, [1.05, 1.25, 1.05]));
  }
  for (let i = 0; i < 29; i += 1) {
    colonnetteMatrices.push(mat4(-9.8 + i * 0.7, 9.2, -42.34, null, [0.85, 0.95, 0.85]));
  }
  group.add(box(20.3, 0.42, 0.6, 0, 11.05, -42.24, materials.trim));
  group.add(balustrade(20.3, 0, 11.35, -42.3, 0));

  // rose level — great rose in a square recess, twin-lancet bays either side
  group.add(box(7.3, 7.3, 0.35, 0, 13.05, -41.95, materials.shadowStone));
  const rose = createRoseWindow(3.05);
  rose.position.set(0, 13.05, -42.34);
  group.add(rose);

  for (const s of [-1, 1]) {
    const bay = 6.35 * s;
    const big = archPanel(3.7, 6.1, 0.24, materials.trim, materials.deepGlass);
    big.position.set(bay, 11.45, -42.2);
    group.add(big);
    for (const off of [-0.92, 0.92]) {
      const lancet = archPanel(1.35, 4.35, 0.12, materials.trim, materials.glass);
      lancet.position.set(bay + off, 11.6, -42.3);
      group.add(lancet);
    }
    const oculus = createRoseWindow(0.78);
    oculus.position.set(bay, 16.35, -42.3);
    group.add(oculus);
  }

  // grand open colonnade linking the towers
  group.add(box(20.3, 0.5, 0.6, 0, 16.95, -42.15, materials.trim));
  group.add(box(19.9, 2.6, 0.25, 0, 18.35, -41.92, materials.shadowStone));
  for (let i = 0; i < 27; i += 1) {
    colonnetteMatrices.push(mat4(-9.36 + i * 0.72, 17.15, -42.26, null, [1.1, 1.5, 1.1]));
  }
  const archletMatrices = [];
  for (let i = 0; i < 26; i += 1) {
    archletMatrices.push(mat4(-9.0 + i * 0.72, 19.42, -42.26));
  }
  group.add(instanced(shared.archlet, materials.trim, archletMatrices));

  const dentils = [];
  for (let i = 0; i < 34; i += 1) {
    dentils.push([0.18, 0.5, 0.34, -9.9 + i * 0.6, 19.85, -42.2, null]);
  }
  group.add(instancedBoxes(materials.trim, dentils));
  group.add(box(20.3, 0.3, 0.7, 0, 20.15, -42.15, materials.trim));
  group.add(balustrade(20.3, 0, 20.35, -42.3, 0));

  group.add(instanced(shared.statue, materials.statue, statueMatrices));
  group.add(instanced(shared.king, materials.statue, kingMatrices));
  group.add(instanced(shared.colonnette, materials.trim, colonnetteMatrices));
  return group;
}

// --- towers ----------------------------------------------------------------

function createTower(x) {
  const tower = new THREE.Group();
  tower.name = x < 0 ? "north western tower" : "south western tower";
  tower.add(box(7.6, 25, 8.5, x, 12.9, -37.6, materials.stone));

  // stepped corner buttresses
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      tower.add(box(0.95, 21.3, 0.95, x + sx * 3.85, 10.65, -37.6 + sz * 4.25, materials.stone));
      tower.add(box(1.12, 0.42, 1.12, x + sx * 3.85, 17.1, -37.6 + sz * 4.25, materials.trim));
      tower.add(box(1.12, 0.42, 1.12, x + sx * 3.85, 21.35, -37.6 + sz * 4.25, materials.trim));
    }
  }

  // string courses
  tower.add(box(8.25, 0.7, 9.15, x, 25.75, -37.6, materials.trim));
  tower.add(box(8.45, 0.55, 9.35, x, 21.35, -37.6, materials.trim));
  tower.add(box(8.2, 0.45, 9.1, x, 17.15, -37.6, materials.trim));

  // belfry — paired lancets with louvres on front, back and outer faces
  const louvreMatrices = [];
  const outward = Math.sign(x);
  const faces = [
    { yaw: Math.PI, cx: x, cz: -41.95, dx: 1, dz: 0 },
    { yaw: 0, cx: x, cz: -33.25, dx: 1, dz: 0 },
    { yaw: outward > 0 ? Math.PI / 2 : -Math.PI / 2, cx: x + outward * 4.27, cz: -37.6, dx: 0, dz: 1 }
  ];
  for (const f of faces) {
    for (const lateral of [-1.25, 1.25]) {
      const wx = f.cx + f.dx * lateral;
      const wz = f.cz + f.dz * lateral;
      const lancet = archPanel(1.5, 6.9, 0.22, materials.trim, materials.deepGlass);
      lancet.rotation.y = f.yaw;
      lancet.position.set(wx, 17.3, wz);
      tower.add(lancet);
      for (let k = 0; k < 8; k += 1) {
        louvreMatrices.push(
          mat4(wx, 18.25 + k * 0.6, wz, new THREE.Euler(0.55, f.yaw, 0, "YXZ"), [1.15, 0.09, 0.06])
        );
      }
    }
  }
  tower.add(instanced(shared.unitBox, materials.lead, louvreMatrices));

  // top cornice dentils
  const dentils = [];
  for (let i = 0; i < 16; i += 1) {
    const offset = -3.65 + i * 0.49;
    dentils.push([0.18, 0.9, 0.38, x + offset, 26.35, -42.35, null]);
    dentils.push([0.18, 0.9, 0.38, x + offset, 26.35, -32.85, null]);
  }
  for (let i = 0; i < 16; i += 1) {
    const oz = -41.55 + i * 0.51;
    dentils.push([0.38, 0.9, 0.18, x - 4.12, 26.35, oz, null]);
    dentils.push([0.38, 0.9, 0.18, x + 4.12, 26.35, oz, null]);
  }
  tower.add(instancedBoxes(materials.trim, dentils));

  // crown — balustrades, corner pinnacles and brooding chimeras
  tower.add(balustrade(7.9, x, 26.15, -41.95, 0));
  tower.add(balustrade(7.9, x, 26.15, -33.25, 0));
  tower.add(balustrade(8.8, x - 3.95, 26.15, -37.6, Math.PI / 2));
  tower.add(balustrade(8.8, x + 3.95, 26.15, -37.6, Math.PI / 2));

  const chimeraMatrices = [];
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      tower.add(createPinnacle(x + sx * 3.85, 26.0, -37.6 + sz * 4.25, 1.05, 3.4));
      chimeraMatrices.push(
        mat4(x + sx * 3.05, 26.35, -37.6 + sz * 3.5, new THREE.Euler(0, Math.atan2(-sz, sx), 0), 1.25)
      );
    }
  }
  tower.add(instanced(shared.chimera, materials.gargoyle, chimeraMatrices));

  for (let i = 0; i < 4; i += 1) {
    tower.add(createGargoyle(x - 2.7 + i * 1.8, 21.7, -42.5, 0.5, Math.PI / 2));
  }

  return tower;
}

// --- nave flanks -----------------------------------------------------------

function createSideDetails(side) {
  const group = new THREE.Group();
  group.name = side < 0 ? "north nave elevation" : "south nave elevation";
  const rotY = side < 0 ? Math.PI / 2 : -Math.PI / 2;
  // the transept (z 10.8..23.2) interrupts the bay rhythm
  const zWindows = [-22, -14, -6, 2, 10, 26, 34];
  const zPiers = [-26, -18, -10, -2, 6, 30, 38];

  for (const z of zWindows) {
    const lower = archPanel(1.35, 3.9, 0.12, materials.trim, materials.glass);
    lower.rotation.y = rotY;
    lower.position.set(side * 10.0, 5.0, z);
    group.add(lower);
    group.add(gablet(1.9, 0.95, 0.22, side * 10.05, 8.95, z + 0.95, materials.trim, rotY));

    const clerestory = archPanel(1.15, 4.2, 0.11, materials.trim, materials.glass);
    clerestory.rotation.y = rotY;
    clerestory.position.set(side * 6.05, 10.0, z);
    group.add(clerestory);
  }

  // buttresses and wall pilasters between the bays
  for (const z of zPiers) {
    group.add(box(0.5, 7.6, 0.7, side * 10.05, 3.9, z, materials.stone));
    group.add(createFlyingButtress(side, z));
  }

  group.add(balustrade(63, side * 10.05, 9.0, 5, Math.PI / 2));
  group.add(balustrade(70, side * 6.05, 14.35, 3, Math.PI / 2));

  return group;
}

function createFlyingButtress(side, z) {
  const group = new THREE.Group();
  const pierX = side * 13.0;
  group.add(box(1.05, 8.6, 1.15, pierX, 4.3, z, materials.stone));
  group.add(box(1.35, 0.5, 1.45, pierX, 8.8, z, materials.trim));
  group.add(createPinnacle(pierX, 9.05, z, 0.55, 2.9));
  group.add(arcTube(new THREE.Vector3(pierX, 9.0, z), new THREE.Vector3(side * 6.05, 12.9, z), 1.5, 0.17, materials.trim));
  group.add(arcTube(new THREE.Vector3(pierX, 7.0, z), new THREE.Vector3(side * 9.98, 8.9, z), 0.9, 0.13, materials.shadowStone));
  group.add(createGargoyle(pierX + side * 0.7, 8.35, z, 0.5, side > 0 ? 0 : Math.PI));
  return group;
}

// --- transept facades ------------------------------------------------------

function createTranseptDetails(side) {
  const group = new THREE.Group();
  group.name = side < 0 ? "north transept facade" : "south transept facade";
  const x = side * 15.5;
  const rotY = side < 0 ? -Math.PI / 2 : Math.PI / 2;

  group.add(box(0.3, 5.4, 5.4, x + side * 0.05, 11.2, 17, materials.shadowStone));
  const wallRose = createRoseWindow(2.15);
  wallRose.rotation.y = side < 0 ? Math.PI / 2 : -Math.PI / 2;
  wallRose.position.set(x + side * 0.28, 11.2, 17);
  group.add(wallRose);

  // portal with nested archivolts
  for (let i = 0; i < 3; i += 1) {
    const frame = archPanel(2.9 - i * 0.42, 5.0 - i * 0.45, 0.22, i === 0 ? materials.trim : materials.shadowStone, i === 2 ? materials.door : materials.transparentAir);
    frame.rotation.y = side < 0 ? Math.PI / 2 : -Math.PI / 2;
    frame.position.set(x + side * (0.55 - i * 0.14), 0.55 + i * 0.03, 17);
    group.add(frame);
  }
  group.add(box(0.3, 0.24, 5.4, x + side * 0.6, 0.12, 17, materials.foundation));

  // flanking lancets
  for (const z of [12.6, 21.4]) {
    const arch = archPanel(1.2, 5.2, 0.12, materials.trim, materials.glass);
    arch.rotation.y = side < 0 ? Math.PI / 2 : -Math.PI / 2;
    arch.position.set(x + side * 0.22, 4.6, z);
    group.add(arch);
  }

  // gable with oculus above the rose
  group.add(gablet(6.8, 2.8, 0.55, side * 15.35, 12.85, 17, materials.stone, rotY));
  const gableRose = createRoseWindow(0.62);
  gableRose.rotation.y = side < 0 ? Math.PI / 2 : -Math.PI / 2;
  gableRose.position.set(side * 15.95, 13.85, 17);
  group.add(gableRose);
  group.add(createPinnacle(side * 15.5, 15.6, 17, 0.4, 1.7));

  // corner buttresses, pinnacles, balustrade, gargoyles
  for (const z of [11.1, 22.9]) {
    group.add(box(1.0, 12.5, 1.0, side * 15.7, 6.25, z, materials.stone));
    group.add(createPinnacle(side * 15.7, 12.5, z, 0.72, 2.8));
  }
  group.add(balustrade(12.4, x + side * 0.35, 12.95, 17, Math.PI / 2));
  group.add(createGargoyle(side * 16.15, 9.6, 13.6, 0.42, side > 0 ? 0 : Math.PI));
  group.add(createGargoyle(side * 16.15, 9.6, 20.4, 0.42, side > 0 ? 0 : Math.PI));

  return group;
}

// --- chevet ----------------------------------------------------------------

function createApse() {
  const group = new THREE.Group();
  group.name = "eastern apse and chevet";

  const apseWall = new THREE.Mesh(
    new THREE.CylinderGeometry(7.05, 7.05, 11.2, 48, 1, false, 0, Math.PI),
    materials.stone
  );
  apseWall.rotation.y = -Math.PI / 2;
  apseWall.position.set(0, 6.25, 39);
  apseWall.castShadow = true;
  apseWall.receiveShadow = true;
  group.add(apseWall);

  const apseRoof = new THREE.Mesh(
    new THREE.ConeGeometry(7.3, 4.9, 48, 1, false, 0, Math.PI),
    materials.roof
  );
  apseRoof.rotation.y = -Math.PI / 2;
  apseRoof.position.set(0, 13.0, 39);
  apseRoof.castShadow = true;
  group.add(apseRoof);

  // ring of radiating chapels around the base
  const chapelWall = new THREE.Mesh(
    new THREE.CylinderGeometry(10.4, 10.4, 5.4, 48, 1, false, 0, Math.PI),
    materials.stone
  );
  chapelWall.rotation.y = -Math.PI / 2;
  chapelWall.position.set(0, 2.7, 39);
  chapelWall.castShadow = true;
  chapelWall.receiveShadow = true;
  group.add(chapelWall);

  const chapelRoof = new THREE.Mesh(
    new THREE.ConeGeometry(10.7, 2.8, 48, 1, false, 0, Math.PI),
    materials.roof
  );
  chapelRoof.rotation.y = -Math.PI / 2;
  chapelRoof.position.set(0, 6.75, 39);
  chapelRoof.castShadow = true;
  group.add(chapelRoof);

  for (let j = 0; j < 9; j += 1) {
    const angle = (Math.PI * (j + 0.5)) / 9 - Math.PI / 2;
    const wx = Math.sin(angle) * 10.5;
    const wz = 39 + Math.cos(angle) * 10.5;
    const chapelWindow = archPanel(1.1, 2.9, 0.1, materials.trim, materials.glass);
    chapelWindow.position.set(wx, 2.1, wz);
    chapelWindow.rotation.y = angle;
    group.add(chapelWindow);
  }

  // upper choir windows
  for (let i = 0; i < 7; i += 1) {
    const angle = Math.PI * (i / 6) - Math.PI / 2;
    const wx = Math.sin(angle) * 7.2;
    const wz = 39 + Math.cos(angle) * 7.2;
    const arch = archPanel(0.9, 3.6, 0.1, materials.trim, materials.glass);
    arch.position.set(wx, 8.2, wz);
    arch.rotation.y = angle;
    group.add(arch);
  }

  // the great sweeping chevet flying buttresses
  for (let i = 0; i < 6; i += 1) {
    const angle = (Math.PI * (i + 0.5)) / 6 - Math.PI / 2;
    group.add(createChevetButtress(angle));
  }

  return group;
}

function createChevetButtress(angle) {
  const group = new THREE.Group();
  const dir = new THREE.Vector3(Math.sin(angle), 0, Math.cos(angle));
  const center = new THREE.Vector3(0, 0, 39);

  const pierPos = center.clone().add(dir.clone().multiplyScalar(13.2));
  const pier = box(0.85, 8.8, 0.85, pierPos.x, 4.4, pierPos.z, materials.stone);
  pier.rotation.y = angle;
  group.add(pier);
  group.add(box(1.05, 0.4, 1.05, pierPos.x, 8.85, pierPos.z, materials.trim));
  group.add(createPinnacle(pierPos.x, 9.05, pierPos.z, 0.5, 3.2));

  const wallHigh = center.clone().add(dir.clone().multiplyScalar(7.15));
  wallHigh.y = 10.25;
  const pierTop = pierPos.clone();
  pierTop.y = 9.0;
  group.add(arcTube(pierTop, wallHigh, 1.8, 0.15, materials.trim));

  const chapelEdge = center.clone().add(dir.clone().multiplyScalar(10.4));
  chapelEdge.y = 6.4;
  const pierMid = pierPos.clone();
  pierMid.y = 7.2;
  group.add(arcTube(pierMid, chapelEdge, 0.7, 0.11, materials.shadowStone));

  group.add(createGargoyle(pierPos.x + dir.x * 0.7, 8.4, pierPos.z + dir.z * 0.7, 0.42, Math.atan2(dir.x, dir.z) - Math.PI / 2));
  return group;
}

// --- crossing spire (Viollet-le-Duc) ----------------------------------------

function createSpire() {
  const group = new THREE.Group();
  group.name = "crossing spire";
  group.add(box(5.3, 3, 5.3, 0, 16.0, 17, materials.roofDark));

  // octagonal openwork drum
  const drum = new THREE.Mesh(new THREE.CylinderGeometry(2.05, 2.5, 3.4, 8), materials.roofDark);
  drum.position.set(0, 19.0, 17);
  drum.castShadow = true;
  group.add(drum);

  const drumColonnettes = [];
  for (let i = 0; i < 8; i += 1) {
    const a = (Math.PI * 2 * i) / 8 + Math.PI / 8;
    drumColonnettes.push(mat4(Math.sin(a) * 2.42, 17.4, 17 + Math.cos(a) * 2.42, null, [1.15, 2.0, 1.15]));
  }
  group.add(instanced(shared.colonnette, materials.lead, drumColonnettes));

  for (let i = 0; i < 8; i += 1) {
    const a = (Math.PI * 2 * i) / 8;
    const panel = archPanel(1.45, 2.9, 0.14, materials.lead, materials.deepGlass);
    panel.position.set(Math.sin(a) * 2.3, 17.5, 17 + Math.cos(a) * 2.3);
    panel.rotation.y = a;
    group.add(panel);
  }

  // gallery ring with mini pinnacles
  for (let i = 0; i < 8; i += 1) {
    const a = (Math.PI * 2 * i) / 8;
    const b = balustrade(1.75, Math.sin(a) * 2.2, 20.75, 17 + Math.cos(a) * 2.2, a);
    group.add(b);
    const pa = a + Math.PI / 8;
    group.add(createPinnacle(Math.sin(pa) * 2.3, 20.7, 17 + Math.cos(pa) * 2.3, 0.32, 2.2));
  }

  const collar = new THREE.Mesh(new THREE.CylinderGeometry(1.75, 2.3, 2.0, 8), materials.lead);
  collar.position.set(0, 21.6, 17);
  collar.castShadow = true;
  group.add(collar);

  // tall crocketed needle
  const needle = new THREE.Mesh(new THREE.ConeGeometry(1.72, 17, 8), materials.lead);
  needle.position.set(0, 31.0, 17);
  needle.castShadow = true;
  group.add(needle);

  const crockets = [];
  for (let row = 0; row < 11; row += 1) {
    const t = 0.04 + row * 0.088;
    const y = 22.5 + t * 17;
    const r = 1.72 * (1 - t) + 0.14;
    const s = THREE.MathUtils.lerp(1.5, 0.5, t);
    for (let k = 0; k < 8; k += 1) {
      const a = (Math.PI * 2 * k) / 8;
      const dirV = new THREE.Vector3(Math.sin(a) * 0.75, 0.66, Math.cos(a) * 0.75);
      crockets.push(mat4Dir(Math.sin(a) * r, y, 17 + Math.cos(a) * r, dirV, s));
    }
  }
  group.add(instanced(shared.crocket, materials.lead, crockets));

  // golden cross and rooster
  group.add(cylinderBetween(new THREE.Vector3(0, 39.3, 17), new THREE.Vector3(0, 42.4, 17), 0.05, materials.gold));
  group.add(cylinderBetween(new THREE.Vector3(-0.8, 41.35, 17), new THREE.Vector3(0.8, 41.35, 17), 0.05, materials.gold));
  const rooster = new THREE.Mesh(shared.rooster, materials.gold);
  rooster.position.set(0, 42.62, 17);
  rooster.castShadow = true;
  group.add(rooster);

  return group;
}

// --- roofscape ---------------------------------------------------------------

function createRoofscape() {
  const group = new THREE.Group();
  group.name = "ridge cresting, apostles, dormers, roof clock";

  const cresting = [];
  for (let z = -31.5; z <= 12.2; z += 0.9) cresting.push(mat4(0, 19.55, z));
  for (let z = 21.8; z <= 38.2; z += 0.9) cresting.push(mat4(0, 19.55, z));
  for (let xx = 3.6; xx <= 14.8; xx += 0.9) {
    cresting.push(mat4(xx, 16.85, 17));
    cresting.push(mat4(-xx, 16.85, 17));
  }
  group.add(instanced(shared.cresting, materials.brass, cresting));

  // twelve green-copper apostles descending toward the spire
  const apostles = [];
  for (const d of [3.3, 4.2, 5.1]) {
    apostles.push(mat4(0, 19.5, 17 + d, null, 1.45));
    apostles.push(mat4(0, 19.5, 17 - d, null, 1.45));
    apostles.push(mat4(d, 16.82, 17, null, 1.45));
    apostles.push(mat4(-d, 16.82, 17, null, 1.45));
  }
  group.add(instanced(shared.statue, materials.copper, apostles));

  // dormers
  for (const s of [-1, 1]) {
    for (const z of [-24, -8, 26]) {
      group.add(box(0.9, 1.1, 0.9, s * 5.4, 15.3, z, materials.roofDark));
      const cap = new THREE.Mesh(new THREE.ConeGeometry(0.75, 0.7, 4), materials.lead);
      cap.rotation.y = Math.PI / 4;
      cap.position.set(s * 5.4, 16.2, z);
      cap.castShadow = true;
      group.add(cap);
    }
  }

  // the little roof clock on the south slope, with working hands
  group.add(box(1.5, 1.6, 1.4, 4.95, 15.75, 10.5, materials.stone));
  const clockCap = new THREE.Mesh(new THREE.ConeGeometry(1.15, 0.9, 4), materials.lead);
  clockCap.rotation.y = Math.PI / 4;
  clockCap.position.set(4.95, 17.0, 10.5);
  clockCap.castShadow = true;
  group.add(clockCap);

  const face = new THREE.Mesh(new THREE.CircleGeometry(0.58, 24), materials.clockFace);
  face.rotation.y = Math.PI / 2;
  face.position.set(5.72, 15.8, 10.5);
  group.add(face);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.05, 8, 24), materials.brass);
  rim.rotation.y = Math.PI / 2;
  rim.position.set(5.72, 15.8, 10.5);
  group.add(rim);

  const hourGroup = new THREE.Group();
  hourGroup.position.set(5.76, 15.8, 10.5);
  hourGroup.rotation.y = Math.PI / 2;
  hourGroup.add(box(0.06, 0.32, 0.02, 0, 0.14, 0, materials.iron));
  const minuteGroup = new THREE.Group();
  minuteGroup.position.set(5.78, 15.8, 10.5);
  minuteGroup.rotation.y = Math.PI / 2;
  minuteGroup.add(box(0.045, 0.48, 0.02, 0, 0.21, 0, materials.iron));
  group.add(hourGroup, minuteGroup);
  clockHands.push({ group: hourGroup, type: "hour" }, { group: minuteGroup, type: "minute" });

  return group;
}

// ---------------------------------------------------------------------------
// Environment — parvis, Seine, bridges, Paris blocks
// ---------------------------------------------------------------------------

function buildEnvironment() {
  const plaza = new THREE.Mesh(new THREE.PlaneGeometry(150, 150), materials.cobble);
  plaza.rotation.x = -Math.PI / 2;
  plaza.receiveShadow = true;
  scene.add(plaza);

  const river = new THREE.Mesh(new THREE.PlaneGeometry(24, 150, 24, 96), materials.water);
  river.name = "Seine water plane";
  river.position.set(33, 0.05, 5);
  river.rotation.x = -Math.PI / 2;
  river.receiveShadow = false;
  animatedWater.push(river);
  scene.add(river);

  scene.add(box(3, 2.2, 135, 19.2, 1.1, 5, materials.embankment));
  scene.add(box(3, 2.2, 135, 46.8, 1.1, 5, materials.embankment));

  // quay lights along the embankment walls (like the reference dusk photo)
  for (let i = 0; i < 14; i += 1) {
    const z = -52 + i * 8.3;
    for (const qx of [20.85, 45.15]) {
      const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.2, 0.14), materials.bulb);
      bracket.position.set(qx, 1.7, z + 4);
      scene.add(bracket);
      const sprite = new THREE.Sprite(lampGlowMaterial);
      sprite.position.set(qx, 1.75, z + 4);
      sprite.scale.set(2.0, 2.0, 1);
      scene.add(sprite);
    }
  }

  // street lamps
  for (let i = 0; i < 14; i += 1) {
    const z = -52 + i * 8.3;
    scene.add(placeLamp(17.4, 2.2, z));
    scene.add(placeLamp(48.6, 2.2, z));
  }
  for (const [lx, lz] of [
    [-12, -48], [12, -48], [-14, -30], [14, -30], [-13, -10], [13.6, 6], [-13, 30], [13.6, 34]
  ]) {
    scene.add(placeLamp(lx, 0, lz));
  }

  // trees — left bank rows, cathedral garden, right bank
  for (let i = 0; i < 18; i += 1) {
    const z = -55 + i * 6.5;
    scene.add(createTree(-24 + Math.sin(i) * 4, z, 1.2 + (i % 3) * 0.2));
  }
  for (let i = 0; i < 6; i += 1) {
    scene.add(createTree(13.6 + (i % 2) * 2.2, 22 + i * 4.5, 0.9 + (i % 3) * 0.18));
  }
  for (let i = 0; i < 8; i += 1) {
    scene.add(createTree(50.5, -48 + i * 12.5, 1.15 + (i % 2) * 0.25));
  }

  // Paris blocks — left cluster and right bank
  for (let i = 0; i < 12; i += 1) {
    const width = 5 + (i % 4);
    const height = 5 + (i % 5) * 0.8;
    const depth = 4 + (i % 3);
    createBuilding(-39 - (i % 4) * 6, -34 + Math.floor(i / 4) * 15, width, height, depth);
  }
  for (let i = 0; i < 8; i += 1) {
    const width = 7 + (i % 3);
    const height = 6.5 + (i % 4) * 0.9;
    createBuilding(54 + (i % 2) * 7, -46 + i * 12.5, width, height, 6.5);
  }

  // bridges over the Seine
  scene.add(createBridge(-30));
  scene.add(createBridge(42));

  // bateaux-mouches
  scene.add(createBoat(0));
  scene.add(createBoat(1));

  // floodlights on the west facade
  for (const [x, y, z] of [
    [-8, 1.4, -45],
    [0, 1.4, -46],
    [8, 1.4, -45],
    [-12, 5.3, -38],
    [12, 5.3, -38]
  ]) {
    const light = new THREE.SpotLight(0xffba67, 0.0, 46, 0.42, 0.5, 1.2);
    light.position.set(x, y, z);
    light.target.position.set(x * 0.35, 13.5, -41.7);
    light.userData.baseIntensity = 12;
    scene.add(light, light.target);
    cathedralLights.push(light);
  }

  for (const [x, y, z, intensity] of [
    [0, 6.4, -47.2, 4.2],
    [-5.4, 17.0, -45.6, 4.4],
    [5.4, 17.0, -45.6, 4.4]
  ]) {
    const glow = new THREE.PointLight(0xffb15f, 0.0, 34, 1.15);
    glow.position.set(x, y, z);
    glow.userData.baseIntensity = intensity;
    scene.add(glow);
    cathedralLights.push(glow);
  }

  // side and chevet floods
  for (const [pos, target] of [
    [[30, 7, 2], [8, 11, 2]],
    [[27, 7, 40], [0, 9, 40]]
  ]) {
    const light = new THREE.SpotLight(0xffb15f, 0.0, 60, 0.55, 0.55, 1.2);
    light.position.set(...pos);
    light.target.position.set(...target);
    light.userData.baseIntensity = 9;
    scene.add(light, light.target);
    cathedralLights.push(light);
  }

  // tower crown uplights
  for (const tx of [-6.35, 6.35]) {
    const light = new THREE.SpotLight(0xffba67, 0.0, 70, 0.32, 0.55, 1.1);
    light.position.set(tx * 1.6, 1.5, -52);
    light.target.position.set(tx, 25, -37.6);
    light.userData.baseIntensity = 8;
    scene.add(light, light.target);
    cathedralLights.push(light);
  }

  // spire uplight
  const spireLight = new THREE.SpotLight(0xffc98a, 0.0, 60, 0.3, 0.6, 1.1);
  spireLight.position.set(10, 15, 6);
  spireLight.target.position.set(0, 32, 17);
  spireLight.userData.baseIntensity = 7;
  scene.add(spireLight, spireLight.target);
  cathedralLights.push(spireLight);
}

function createBuilding(x, z, width, height, depth) {
  const material = buildingMaterial(width, height);
  scene.add(box(width, height, depth, x, height / 2 + 0.01, z, material));
  scene.add(gableRoof(width * 1.04, depth * 1.08, Math.min(2.4, height * 0.3), x, height + 0.02, z, materials.roofDark, 0, false));
  scene.add(box(0.5, 1.0, 0.5, x - width * 0.28, height + Math.min(2.4, height * 0.3) * 0.4 + 0.5, z, materials.shadowStone));
  scene.add(box(0.5, 0.8, 0.5, x + width * 0.3, height + Math.min(2.4, height * 0.3) * 0.35 + 0.4, z, materials.shadowStone));
}

function createBridge(z) {
  const group = new THREE.Group();
  group.name = "Seine bridge";

  for (const ax of [26.5, 39.5]) {
    const arch = new THREE.Mesh(new THREE.TorusGeometry(2.6, 0.5, 8, 22, Math.PI), materials.embankment);
    arch.position.set(ax, 0.25, z);
    arch.castShadow = true;
    arch.receiveShadow = true;
    group.add(arch);
  }
  group.add(box(1.6, 2.6, 4.8, 33, 1.3, z, materials.embankment));
  group.add(box(1.4, 2.6, 4.8, 21.6, 1.3, z, materials.embankment));
  group.add(box(1.4, 2.6, 4.8, 44.4, 1.3, z, materials.embankment));

  group.add(box(29, 0.7, 4.6, 33, 3.15, z, materials.embankment));
  group.add(balustrade(29, 33, 3.5, z - 2.15, 0));
  group.add(balustrade(29, 33, 3.5, z + 2.15, 0));

  for (const lx of [23.5, 42.5]) {
    for (const lz of [z - 1.85, z + 1.85]) {
      group.add(placeLamp(lx, 3.5, lz, 0.75));
    }
  }
  return group;
}

function createBoat(index) {
  const group = new THREE.Group();
  group.name = "bateau mouche";
  group.add(box(2.6, 0.55, 8.5, 0, 0.5, 0, materials.boatHull));
  group.add(box(2.1, 0.75, 5.4, 0, 1.1, -0.4, materials.boatCabin));
  group.add(box(2.3, 0.12, 5.8, 0, 1.53, -0.4, materials.boatHull));
  group.add(box(0.5, 0.5, 0.9, 0, 0.9, 3.4, materials.boatHull));
  group.position.set(index === 0 ? 30.5 : 36.5, 0, index === 0 ? -30 : 40);
  group.rotation.y = index === 0 ? 0 : Math.PI;
  group.userData = { speed: index === 0 ? 2.0 : -1.6, phase: index * 2.4 };
  animatedBoats.push(group);
  return group;
}

function placeLamp(x, y, z, scale = 1) {
  const group = new THREE.Group();
  group.add(cylinderBetween(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 3.4, 0), 0.05, materials.iron));
  group.add(box(0.3, 0.42, 0.3, 0, 3.62, 0, materials.iron));
  const bulb = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.3, 0.22), materials.bulb);
  bulb.position.set(0, 3.58, 0);
  group.add(bulb);
  const sprite = new THREE.Sprite(lampGlowMaterial);
  sprite.position.set(0, 3.62, 0);
  sprite.scale.set(2.4, 2.4, 1);
  group.add(sprite);
  group.position.set(x, y, z);
  group.scale.setScalar(scale);
  return group;
}

function createTree(x, z, scale = 1) {
  const group = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.15 * scale, 0.22 * scale, 2.2 * scale, 8), materials.trunk);
  trunk.position.set(x, 1.1 * scale, z);
  trunk.castShadow = true;
  const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(1.5 * scale, 2), materials.leaves);
  crown.position.set(x, 3.0 * scale, z);
  crown.castShadow = true;
  group.add(trunk, crown);
  return group;
}

function buildReferenceMarkers() {
  const guideGroup = new THREE.Group();
  guideGroup.name = "asset-informed proportions and lighting cues";
  guideGroup.userData.assets = [
    "Assests/08772490-ae4f-11ef-8ab9-9192db313061.jpg.jpg",
    "Assests/0000485_premium-series-notre-dame_1200.png",
    "Assests/0001684_premium-series-notre-dame.jpeg",
    "Assests/0001685_premium-series-notre-dame (1).jpeg",
    "Assests/0001686_premium-series-notre-dame.jpeg",
    "Assests/0001689_premium-series-notre-dame.jpeg",
    "Assests/0001690_premium-series-notre-dame.jpeg",
    "Assests/1328836-notredame-cathedral-paris.jpg",
    "Assests/1pe7VVzHMhyawonoa4Wi--0--UMk3j-topaz-enhance-6x.jpeg",
    "Assests/Notre-Dame-Cathedral-of-Paris-1576x1074.jpg",
    "Assests/Notre-Dame-de-Paris.jpg",
    "Assests/notredame.png",
    "Assests/shutterstock-745547653.jpg",
    "Assests/Paris_4e_-_Cathédrale_Notre-Dame_de_Paris_-_Nouvelle_flèche_terminée,_depuis_la_tour_sud.jpg"
  ];
  scene.add(guideGroup);
}

// ---------------------------------------------------------------------------
// Reusable architectural pieces
// ---------------------------------------------------------------------------

function createRoseWindow(radius) {
  const group = new THREE.Group();
  const glass = new THREE.Mesh(new THREE.CircleGeometry(radius * 0.88, 96), materials.roseGlass);
  glass.position.z = -0.03;
  group.add(glass);

  const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, radius * 0.052, 12, 112), materials.trim);
  group.add(ring);

  const innerRing = new THREE.Mesh(new THREE.TorusGeometry(radius * 0.42, radius * 0.036, 10, 80), materials.trim);
  group.add(innerRing);

  for (let i = 0; i < 16; i += 1) {
    const angle = (Math.PI * 2 * i) / 16;
    const start = new THREE.Vector3(Math.cos(angle) * radius * 0.18, Math.sin(angle) * radius * 0.18, 0.05);
    const end = new THREE.Vector3(Math.cos(angle) * radius * 0.88, Math.sin(angle) * radius * 0.88, 0.05);
    group.add(cylinderBetween(start, end, radius * 0.015, materials.trim));
  }

  for (let i = 0; i < 12; i += 1) {
    const angle = (Math.PI * 2 * i) / 12;
    const petal = new THREE.Mesh(new THREE.TorusGeometry(radius * 0.16, radius * 0.017, 8, 28), materials.trim);
    petal.position.set(Math.cos(angle) * radius * 0.58, Math.sin(angle) * radius * 0.58, 0.08);
    petal.scale.y = 1.55;
    petal.rotation.z = angle;
    group.add(petal);
  }
  return group;
}

function archPanel(width, height, rim, rimMat, fillMat) {
  const group = new THREE.Group();
  const fillShape = pointedArchShape(width, height);
  const fill = new THREE.Mesh(new THREE.ShapeGeometry(fillShape, 24), fillMat);
  fill.position.z = -0.015;
  fill.castShadow = true;
  group.add(fill);

  if (rim > 0) {
    const outer = pointedArchShape(width + rim * 2, height + rim * 2, -rim);
    const inner = pointedArchShape(width, height);
    inner.autoClose = true;
    outer.holes.push(inner);
    const frame = new THREE.Mesh(new THREE.ShapeGeometry(outer, 28), rimMat);
    frame.position.set(0, 0, 0.04);
    frame.castShadow = true;
    frame.receiveShadow = true;
    group.add(frame);
  }
  return group;
}

function archHolePath(cx, baseY, width, height) {
  const w = width / 2;
  const shoulder = height * 0.43;
  const path = new THREE.Path();
  path.moveTo(cx - w, baseY);
  path.lineTo(cx - w, baseY + shoulder);
  path.quadraticCurveTo(cx - w * 0.95, baseY + height * 0.73, cx, baseY + height);
  path.quadraticCurveTo(cx + w * 0.95, baseY + height * 0.73, cx + w, baseY + shoulder);
  path.lineTo(cx + w, baseY);
  path.lineTo(cx - w, baseY);
  return path;
}

function pointedArchShape(width, height, yOffset = 0) {
  const w = width / 2;
  const shoulder = height * 0.43;
  const shape = new THREE.Shape();
  shape.moveTo(-w, yOffset);
  shape.lineTo(-w, yOffset + shoulder);
  shape.quadraticCurveTo(-w * 0.95, yOffset + height * 0.73, 0, yOffset + height);
  shape.quadraticCurveTo(w * 0.95, yOffset + height * 0.73, w, yOffset + shoulder);
  shape.lineTo(w, yOffset);
  shape.lineTo(-w, yOffset);
  return shape;
}

function createPinnacle(x, y, z, radius, height) {
  const mesh = new THREE.Mesh(shared.pinnacle, materials.trim);
  mesh.position.set(x, y, z);
  mesh.scale.set(radius, height, radius);
  mesh.castShadow = true;
  return mesh;
}

function createGargoyle(x, y, z, scale = 1, rotationY = 0) {
  const mesh = new THREE.Mesh(shared.gargoyle, materials.gargoyle);
  mesh.position.set(x, y, z);
  mesh.scale.setScalar(scale);
  mesh.rotation.y = rotationY;
  mesh.castShadow = true;
  return mesh;
}

function balustrade(length, x, y, z, rotY = 0) {
  const group = new THREE.Group();
  const count = Math.max(2, Math.round(length / 0.42));
  const matrices = [];
  for (let i = 0; i <= count; i += 1) {
    matrices.push(mat4(-length / 2 + (i / count) * length, 0.04, 0));
  }
  group.add(instanced(shared.baluster, materials.trim, matrices));
  group.add(box(length, 0.09, 0.16, 0, 0.46, 0, materials.trim));
  group.add(box(length, 0.08, 0.18, 0, 0.02, 0, materials.trim));
  group.position.set(x, y, z);
  group.rotation.y = rotY;
  return group;
}

function gablet(width, height, depth, x, y, z, material, rotY = 0) {
  const shape = new THREE.Shape();
  shape.moveTo(-width / 2, 0);
  shape.lineTo(width / 2, 0);
  shape.lineTo(0, height);
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  mesh.rotation.y = rotY;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function arcTube(from, to, lift, radius, material) {
  const mid = from.clone().add(to).multiplyScalar(0.5);
  mid.y += lift;
  const curve = new THREE.QuadraticBezierCurve3(from, mid, to);
  const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 14, radius, 7), material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

// ---------------------------------------------------------------------------
// Shared geometry (merged primitives, instanced everywhere)
// ---------------------------------------------------------------------------

function makeSharedGeometries() {
  const g = {};
  g.unitBox = new THREE.BoxGeometry(1, 1, 1);

  g.pinnacle = mergedGeometry([
    [new THREE.CylinderGeometry(0.54, 0.67, 0.34, 6), 0, 0.17, 0],
    [new THREE.ConeGeometry(0.55, 0.66, 6), 0, 0.67, 0],
    [new THREE.SphereGeometry(0.12, 8, 8), 0, 1.03, 0]
  ]);

  g.statue = mergedGeometry([
    [new THREE.CylinderGeometry(0.11, 0.19, 0.72, 7), 0, 0.36, 0],
    [new THREE.SphereGeometry(0.13, 10, 8), 0, 0.83, 0]
  ]);

  g.king = mergedGeometry([
    [new THREE.CylinderGeometry(0.12, 0.2, 0.78, 7), 0, 0.39, 0],
    [new THREE.SphereGeometry(0.13, 10, 8), 0, 0.9, 0],
    [new THREE.CylinderGeometry(0.1, 0.09, 0.09, 8), 0, 1.03, 0]
  ]);

  g.gargoyle = mergedGeometry([
    [new THREE.CylinderGeometry(0.13, 0.18, 0.72, 8), 0, 0, 0, 0, 0, Math.PI / 2],
    [new THREE.ConeGeometry(0.16, 0.34, 8), 0.45, 0.02, 0, 0, 0, -Math.PI / 2],
    [new THREE.ConeGeometry(0.09, 0.36, 3), -0.08, 0.18, 0.12],
    [new THREE.ConeGeometry(0.09, 0.36, 3), -0.08, 0.18, -0.12]
  ]);

  g.chimera = mergedGeometry([
    [new THREE.BoxGeometry(0.4, 0.12, 0.26), 0, 0.06, 0],
    [new THREE.CylinderGeometry(0.16, 0.2, 0.55, 7), 0, 0.38, 0, 0, 0, -0.35],
    [new THREE.SphereGeometry(0.14, 8, 7), 0.16, 0.62, 0],
    [new THREE.ConeGeometry(0.045, 0.16, 5), 0.13, 0.76, 0.07],
    [new THREE.ConeGeometry(0.045, 0.16, 5), 0.13, 0.76, -0.07],
    [new THREE.ConeGeometry(0.1, 0.42, 3), -0.14, 0.5, 0.14, 0.5, 0, 0],
    [new THREE.ConeGeometry(0.1, 0.42, 3), -0.14, 0.5, -0.14, -0.5, 0, 0]
  ]);

  g.crocket = new THREE.ConeGeometry(0.09, 0.26, 5);

  g.cresting = mergedGeometry([
    [new THREE.ConeGeometry(0.09, 0.3, 4), 0, 0.15, 0],
    [new THREE.SphereGeometry(0.05, 6, 6), 0, 0.34, 0]
  ]);

  g.baluster = mergedGeometry([
    [new THREE.CylinderGeometry(0.035, 0.045, 0.34, 6), 0, 0.19, 0],
    [new THREE.SphereGeometry(0.05, 6, 6), 0, 0.4, 0]
  ]);

  g.colonnette = mergedGeometry([
    [new THREE.CylinderGeometry(0.06, 0.06, 1.5, 8), 0, 0.75, 0],
    [new THREE.BoxGeometry(0.18, 0.1, 0.18), 0, 1.53, 0]
  ]);

  g.archlet = new THREE.TorusGeometry(0.36, 0.05, 6, 12, Math.PI);

  g.rooster = mergedGeometry([
    [new THREE.SphereGeometry(0.14, 10, 8), 0, 0, 0],
    [new THREE.ConeGeometry(0.05, 0.16, 6), 0.18, 0.02, 0, 0, 0, -Math.PI / 2],
    [new THREE.ConeGeometry(0.1, 0.24, 5), -0.16, 0.1, 0, 0, 0, 0.9],
    [new THREE.ConeGeometry(0.04, 0.12, 5), 0.02, 0.17, 0]
  ]);

  return g;
}

function mergedGeometry(parts) {
  const geometries = parts.map(([geometry, x, y, z, rx = 0, ry = 0, rz = 0]) => {
    const m = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(rx, ry, rz));
    m.setPosition(x, y, z);
    return geometry.applyMatrix4(m);
  });
  return mergeGeometries(geometries, false);
}

function instanced(geometry, material, matrices) {
  const mesh = new THREE.InstancedMesh(geometry, material, matrices.length);
  matrices.forEach((matrix, i) => mesh.setMatrixAt(i, matrix));
  mesh.instanceMatrix.needsUpdate = true;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function instancedBoxes(material, items) {
  const matrices = items.map(([w, h, d, x, y, z, euler]) => mat4(x, y, z, euler ?? null, [w, h, d]));
  return instanced(shared.unitBox, material, matrices);
}

function mat4(x, y, z, euler = null, scale = 1) {
  const q = new THREE.Quaternion();
  if (euler) q.setFromEuler(euler);
  const s = Array.isArray(scale)
    ? new THREE.Vector3(scale[0], scale[1], scale[2])
    : new THREE.Vector3(scale, scale, scale);
  return new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), q, s);
}

function mat4Dir(x, y, z, direction, scale = 1) {
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.clone().normalize());
  const s = new THREE.Vector3(scale, scale, scale);
  return new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), q, s);
}

// ---------------------------------------------------------------------------
// Materials and textures
// ---------------------------------------------------------------------------

function makeMaterials() {
  const stoneTexture = stoneCanvasTexture(1024, "#cdbd9f", "#918571");
  stoneTexture.wrapS = THREE.RepeatWrapping;
  stoneTexture.wrapT = THREE.RepeatWrapping;
  stoneTexture.repeat.set(6, 4);

  const cobbleTexture = cobbleCanvasTexture();
  cobbleTexture.wrapS = THREE.RepeatWrapping;
  cobbleTexture.wrapT = THREE.RepeatWrapping;
  cobbleTexture.repeat.set(18, 18);

  const glassTexture = roseCanvasTexture(512);

  const leadTexture = leadCanvasTexture();
  leadTexture.wrapS = THREE.RepeatWrapping;
  leadTexture.wrapT = THREE.RepeatWrapping;
  leadTexture.repeat.set(3, 5);
  const leadTextureDark = leadTexture.clone();
  leadTextureDark.repeat.set(2, 3);
  leadTextureDark.needsUpdate = true;

  const clockTexture = clockCanvasTexture();

  return {
    stone: new THREE.MeshStandardMaterial({ color: palette.stone, map: stoneTexture, roughness: 0.88 }),
    trim: new THREE.MeshStandardMaterial({ color: palette.trim, map: stoneTexture, roughness: 0.82, side: THREE.DoubleSide }),
    shadowStone: new THREE.MeshStandardMaterial({ color: palette.shadowStone, map: stoneTexture, roughness: 0.92, side: THREE.DoubleSide }),
    foundation: new THREE.MeshStandardMaterial({ color: 0x9a8b73, map: stoneTexture, roughness: 0.94 }),
    statue: new THREE.MeshStandardMaterial({ color: 0xb7aa91, roughness: 0.88 }),
    gargoyle: new THREE.MeshStandardMaterial({ color: 0x746d63, roughness: 0.95 }),
    door: new THREE.MeshStandardMaterial({ color: 0x261b15, roughness: 0.72, side: THREE.DoubleSide }),
    deepGlass: new THREE.MeshStandardMaterial({ color: 0x05070c, roughness: 0.42, metalness: 0.05, side: THREE.DoubleSide }),
    glass: new THREE.MeshStandardMaterial({
      color: 0x304a72,
      emissive: 0x172846,
      roughness: 0.18,
      metalness: 0.02,
      transparent: true,
      opacity: 0.78,
      side: THREE.DoubleSide
    }),
    roseGlass: new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: glassTexture,
      emissiveMap: glassTexture,
      emissive: 0x1d2866,
      roughness: 0.18,
      transparent: true,
      opacity: 0.88,
      side: THREE.DoubleSide
    }),
    roof: new THREE.MeshStandardMaterial({ color: 0x9fabb4, map: leadTexture, roughness: 0.74, metalness: 0.05 }),
    roofDark: new THREE.MeshStandardMaterial({ color: 0x77858f, map: leadTextureDark, roughness: 0.7, metalness: 0.06 }),
    lead: new THREE.MeshStandardMaterial({ color: 0x848f98, map: leadTextureDark, roughness: 0.62, metalness: 0.12 }),
    copper: new THREE.MeshStandardMaterial({ color: 0x69987f, roughness: 0.55, metalness: 0.35 }),
    gold: new THREE.MeshStandardMaterial({ color: 0xf7c860, roughness: 0.26, metalness: 0.85, emissive: 0x6b4a12, emissiveIntensity: 0.3 }),
    iron: new THREE.MeshStandardMaterial({ color: 0x141419, roughness: 0.42, metalness: 0.5 }),
    brass: new THREE.MeshStandardMaterial({ color: 0xc29145, roughness: 0.34, metalness: 0.72 }),
    bulb: new THREE.MeshStandardMaterial({ color: 0xffd38a, emissive: 0xffa63d, emissiveIntensity: 1.2 }),
    transparentAir: new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.0, depthWrite: false }),
    cobble: new THREE.MeshStandardMaterial({ color: 0x9d9587, map: cobbleTexture, roughness: 0.96 }),
    water: new THREE.MeshStandardMaterial({
      color: palette.water,
      roughness: 0.14,
      metalness: 0.1,
      transparent: true,
      opacity: 0.97
    }),
    embankment: new THREE.MeshStandardMaterial({ color: 0xa1937d, map: stoneTexture, roughness: 0.9 }),
    parisStone: new THREE.MeshStandardMaterial({ color: 0xb8ad9c, roughness: 0.9 }),
    trunk: new THREE.MeshStandardMaterial({ color: 0x4b3423, roughness: 0.92 }),
    leaves: new THREE.MeshStandardMaterial({ color: 0x556b3b, roughness: 0.86 }),
    boatHull: new THREE.MeshStandardMaterial({ color: 0xe6e1d4, roughness: 0.6 }),
    boatCabin: new THREE.MeshStandardMaterial({ color: 0x2e3e4a, emissive: 0xffc27a, emissiveIntensity: 0, roughness: 0.4 }),
    clockFace: new THREE.MeshStandardMaterial({
      map: clockTexture,
      emissiveMap: clockTexture,
      emissive: 0xfff2cf,
      emissiveIntensity: 0.12,
      roughness: 0.5
    })
  };
}

function registerGlow(material, dayIntensity, nightIntensity, mode, dayColor, nightColor) {
  const entry = { material, dayIntensity, nightIntensity, mode };
  if (dayColor !== undefined) {
    entry.dayColor = new THREE.Color(dayColor);
    entry.nightColor = new THREE.Color(nightColor);
  }
  glowMaterials.push(entry);
}

function buildingMaterial(width, height) {
  const map = buildingTextures.map.clone();
  const glow = buildingTextures.glow.clone();
  const rx = Math.max(1, Math.round(width / 3.4));
  const ry = Math.max(1, Math.round(height / 3.2));
  for (const texture of [map, glow]) {
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(rx, ry);
    texture.needsUpdate = true;
  }
  const material = new THREE.MeshStandardMaterial({
    map,
    emissiveMap: glow,
    emissive: 0xffb968,
    emissiveIntensity: 0,
    roughness: 0.85
  });
  registerGlow(material, 0, 0.75, "ambient");
  return material;
}

function stoneCanvasTexture(size, base, line) {
  const canvasTexture = document.createElement("canvas");
  canvasTexture.width = size;
  canvasTexture.height = size;
  const ctx = canvasTexture.getContext("2d");
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);

  const image = ctx.getImageData(0, 0, size, size);
  for (let i = 0; i < image.data.length; i += 4) {
    const n = seededNoise(i) * 22 - 10;
    image.data[i] = clamp(image.data[i] + n, 0, 255);
    image.data[i + 1] = clamp(image.data[i + 1] + n, 0, 255);
    image.data[i + 2] = clamp(image.data[i + 2] + n, 0, 255);
  }
  ctx.putImageData(image, 0, 0);

  ctx.strokeStyle = line;
  ctx.globalAlpha = 0.35;
  ctx.lineWidth = 2;
  for (let y = 70; y < size; y += 92) {
    ctx.beginPath();
    ctx.moveTo(0, y + seededNoise(y) * 7);
    ctx.lineTo(size, y + seededNoise(y + 9) * 7);
    ctx.stroke();
  }
  for (let x = 64; x < size; x += 126) {
    ctx.beginPath();
    ctx.moveTo(x + seededNoise(x) * 7, 0);
    ctx.lineTo(x + seededNoise(x + 17) * 7, size);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  return new THREE.CanvasTexture(canvasTexture);
}

function cobbleCanvasTexture() {
  const canvasTexture = document.createElement("canvas");
  canvasTexture.width = 512;
  canvasTexture.height = 512;
  const ctx = canvasTexture.getContext("2d");
  ctx.fillStyle = "#948b80";
  ctx.fillRect(0, 0, 512, 512);
  for (let y = 0; y < 512; y += 32) {
    for (let x = 0; x < 512; x += 32) {
      const shade = 120 + Math.floor(seededNoise(x * 17 + y * 7) * 48);
      ctx.fillStyle = `rgb(${shade}, ${shade - 6}, ${shade - 15})`;
      ctx.fillRect(x + 1, y + 1, 30, 30);
    }
  }
  ctx.strokeStyle = "rgba(55,49,43,.45)";
  ctx.lineWidth = 2;
  for (let y = 0; y <= 512; y += 32) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(512, y);
    ctx.stroke();
  }
  for (let x = 0; x <= 512; x += 32) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 512);
    ctx.stroke();
  }
  return new THREE.CanvasTexture(canvasTexture);
}

function leadCanvasTexture() {
  const canvasTexture = document.createElement("canvas");
  canvasTexture.width = 256;
  canvasTexture.height = 256;
  const ctx = canvasTexture.getContext("2d");
  ctx.fillStyle = "#6f7b85";
  ctx.fillRect(0, 0, 256, 256);

  for (let y = 0; y < 256; y += 4) {
    ctx.fillStyle = `rgba(30, 38, 46, ${0.03 + seededNoise(y * 3) * 0.05})`;
    ctx.fillRect(0, y, 256, 2);
  }
  ctx.strokeStyle = "rgba(38, 46, 54, 0.55)";
  ctx.lineWidth = 2;
  for (let x = 10; x < 256; x += 20) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 256);
    ctx.stroke();
  }
  ctx.strokeStyle = "rgba(210, 220, 228, 0.16)";
  for (let y = 32; y < 256; y += 64) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(256, y);
    ctx.stroke();
  }
  return new THREE.CanvasTexture(canvasTexture);
}

function buildingCanvasTexture() {
  const facade = document.createElement("canvas");
  facade.width = 128;
  facade.height = 128;
  const ctx = facade.getContext("2d");
  ctx.fillStyle = "#b5a891";
  ctx.fillRect(0, 0, 128, 128);
  for (let y = 0; y < 128; y += 6) {
    ctx.fillStyle = `rgba(96, 86, 70, ${0.04 + seededNoise(y * 11) * 0.05})`;
    ctx.fillRect(0, y, 128, 3);
  }
  ctx.fillStyle = "rgba(90, 80, 66, 0.4)";
  ctx.fillRect(0, 120, 128, 4);

  const glowCanvas = document.createElement("canvas");
  glowCanvas.width = 128;
  glowCanvas.height = 128;
  const gctx = glowCanvas.getContext("2d");
  gctx.fillStyle = "#000000";
  gctx.fillRect(0, 0, 128, 128);

  for (let wy = 0; wy < 3; wy += 1) {
    for (let wx = 0; wx < 5; wx += 1) {
      const px = 9 + wx * 24;
      const py = 16 + wy * 38;
      ctx.fillStyle = "#3d4650";
      ctx.fillRect(px, py, 11, 22);
      ctx.strokeStyle = "rgba(66, 58, 46, 0.85)";
      ctx.lineWidth = 2;
      ctx.strokeRect(px - 1, py - 1, 13, 24);
      ctx.fillStyle = "rgba(20, 24, 30, 0.5)";
      ctx.fillRect(px, py + 10, 11, 2);
      if (seededNoise(px * 13 + py * 7) > 0.45) {
        gctx.fillStyle = "#ffc069";
        gctx.fillRect(px, py, 11, 22);
      }
    }
  }
  return { map: new THREE.CanvasTexture(facade), glow: new THREE.CanvasTexture(glowCanvas) };
}

function clockCanvasTexture() {
  const canvasTexture = document.createElement("canvas");
  canvasTexture.width = 128;
  canvasTexture.height = 128;
  const ctx = canvasTexture.getContext("2d");
  ctx.fillStyle = "#0a0c10";
  ctx.fillRect(0, 0, 128, 128);
  ctx.fillStyle = "#f3ead6";
  ctx.beginPath();
  ctx.arc(64, 64, 58, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#3a3126";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(64, 64, 54, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = 3;
  for (let i = 0; i < 12; i += 1) {
    const a = (Math.PI * 2 * i) / 12;
    ctx.beginPath();
    ctx.moveTo(64 + Math.cos(a) * 44, 64 + Math.sin(a) * 44);
    ctx.lineTo(64 + Math.cos(a) * 51, 64 + Math.sin(a) * 51);
    ctx.stroke();
  }
  return new THREE.CanvasTexture(canvasTexture);
}

function roseCanvasTexture(size) {
  const canvasTexture = document.createElement("canvas");
  canvasTexture.width = size;
  canvasTexture.height = size;
  const ctx = canvasTexture.getContext("2d");
  const cx = size / 2;
  const cy = size / 2;
  const radius = size * 0.46;
  const gradient = ctx.createRadialGradient(cx, cy, size * 0.03, cx, cy, radius);
  gradient.addColorStop(0, "#fff0b8");
  gradient.addColorStop(0.25, "#f0596b");
  gradient.addColorStop(0.48, "#3054d8");
  gradient.addColorStop(0.72, "#7b39d0");
  gradient.addColorStop(1, "#07132f");
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(240,230,210,.72)";
  ctx.lineWidth = 5;
  for (let i = 0; i < 24; i += 1) {
    const angle = (Math.PI * 2 * i) / 24;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius);
    ctx.stroke();
  }
  for (let r = radius * 0.25; r < radius; r += radius * 0.23) {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
  }
  return new THREE.CanvasTexture(canvasTexture);
}

function glowCanvasTexture() {
  const canvasTexture = document.createElement("canvas");
  canvasTexture.width = 64;
  canvasTexture.height = 64;
  const ctx = canvasTexture.getContext("2d");
  const gradient = ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
  gradient.addColorStop(0, "rgba(255, 224, 170, 1)");
  gradient.addColorStop(0.35, "rgba(255, 200, 120, 0.45)");
  gradient.addColorStop(1, "rgba(255, 190, 100, 0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(canvasTexture);
}

// ---------------------------------------------------------------------------
// Sky
// ---------------------------------------------------------------------------

function createSkyDome() {
  const uniforms = {
    topColor: { value: new THREE.Color(0x1c4a85) },
    bottomColor: { value: new THREE.Color(0xe6c6a2) }
  };
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(300, 32, 16),
    new THREE.ShaderMaterial({
      uniforms,
      side: THREE.BackSide,
      depthWrite: false,
      vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 bottomColor;
        varying vec3 vWorldPosition;
        void main() {
          float h = normalize(vWorldPosition).y;
          gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), 0.7), 0.0)), 1.0);
        }
      `
    })
  );
  return { mesh, uniforms };
}

function createStars() {
  const group = new THREE.Group();
  const geometry = new THREE.BufferGeometry();
  const positions = [];
  for (let i = 0; i < 520; i += 1) {
    const theta = seededNoise(i * 19) * Math.PI * 2;
    const phi = Math.acos(THREE.MathUtils.lerp(0.04, 0.95, seededNoise(i * 41)));
    const radius = 230;
    positions.push(
      Math.sin(phi) * Math.cos(theta) * radius,
      Math.cos(phi) * radius,
      Math.sin(phi) * Math.sin(theta) * radius
    );
  }
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({
    color: 0xeaf4ff,
    size: 1.3,
    transparent: true,
    opacity: 0.0,
    depthWrite: false
  });
  const points = new THREE.Points(geometry, material);
  starLayers.push(points);
  group.add(points);
  return group;
}

// ---------------------------------------------------------------------------
// Primitive helpers
// ---------------------------------------------------------------------------

function box(width, height, depth, x, y, z, material) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function column(x, y, z, radius, height, material) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, 16), material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function gableRoof(width, length, height, x, y, z, material, rotY = 0, withRibs = true) {
  const halfW = width / 2;
  const halfL = length / 2;
  const vertices = new Float32Array([
    -halfW, 0, -halfL,
    halfW, 0, -halfL,
    0, height, -halfL,
    -halfW, 0, halfL,
    halfW, 0, halfL,
    0, height, halfL
  ]);
  const indices = [0, 1, 2, 3, 5, 4, 0, 3, 4, 0, 4, 1, 1, 4, 5, 1, 5, 2, 2, 5, 3, 2, 3, 0];
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  mesh.rotation.y = rotY;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  if (withRibs) addRoofRibs(mesh, width, length, height);
  return mesh;
}

function leanRoof(side, x, y, z, width, length, material, height = 2.6) {
  const halfL = length / 2;
  const h = height;
  const w = width;
  const vertices = new Float32Array([
    0, 0, -halfL,
    side * w, 0, -halfL,
    0, h, -halfL,
    0, 0, halfL,
    side * w, 0, halfL,
    0, h, halfL
  ]);
  const indices = [0, 1, 2, 3, 5, 4, 0, 3, 4, 0, 4, 1, 1, 4, 5, 1, 5, 2, 2, 5, 3, 2, 3, 0];
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function addRoofRibs(mesh, width, length, height) {
  const group = new THREE.Group();
  const count = Math.max(6, Math.floor(length / 4));
  for (let i = 0; i <= count; i += 1) {
    const z = -length / 2 + (i / count) * length;
    const rib = cylinderBetween(
      new THREE.Vector3(-width / 2, 0.04, z),
      new THREE.Vector3(0, height + 0.08, z),
      0.035,
      materials.lead
    );
    const rib2 = cylinderBetween(
      new THREE.Vector3(width / 2, 0.04, z),
      new THREE.Vector3(0, height + 0.08, z),
      0.035,
      materials.lead
    );
    group.add(rib, rib2);
  }
  mesh.add(group);
}

function cylinderBetween(start, end, radius, material) {
  const direction = new THREE.Vector3().subVectors(end, start);
  const length = direction.length();
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, 10), material);
  mesh.position.copy(start).add(end).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

// ---------------------------------------------------------------------------
// Time of day, lighting and animation
// ---------------------------------------------------------------------------

function updateTime(skipSlider = false) {
  if (!skipSlider) timeSlider.value = String(timeOfDay);
  // Paris summer arc: sunrise ~05:30 in the east (+z), noon in the south (+x),
  // sunset ~21:00 in the west (-z), where the main facade catches golden light.
  const wrappedTime = ((timeOfDay % 24) + 24) % 24;
  let sunAngle;
  if (wrappedTime >= 5.5 && wrappedTime <= 21) {
    sunAngle = ((wrappedTime - 5.5) / 15.5) * Math.PI;
  } else {
    const nightHours = wrappedTime > 21 ? wrappedTime - 21 : wrappedTime + 3;
    sunAngle = Math.PI + (nightHours / 8.5) * Math.PI;
  }
  const sunHeight = Math.sin(sunAngle);
  const sunStrength = smoothstep(-0.08, 0.58, sunHeight);
  const nightStrength = 1 - smoothstep(-0.24, 0.18, sunHeight);
  const duskStrength = 1 - Math.abs(THREE.MathUtils.clamp((timeOfDay - 19.8) / 2.8, -1, 1));
  const lightFactor = getCathedralLightFactor(nightStrength);
  const ambientGlow = Math.max(
    smoothstep(0.22, 0.62, nightStrength),
    smoothstep(17.3, 19.0, timeOfDay),
    1 - smoothstep(5.8, 7.6, timeOfDay)
  );

  timeLabel.textContent = formatTime(timeOfDay);
  sunLight.position.set(Math.sin(sunAngle) * 70, Math.max(5, sunHeight * 72 + 10), Math.cos(sunAngle) * 70);
  sunLight.intensity = THREE.MathUtils.lerp(0.05, 4.2, sunStrength);
  sunLight.color.setHSL(0.11, THREE.MathUtils.lerp(0.25, 0.72, 1 - sunStrength + duskStrength * 0.5), THREE.MathUtils.lerp(0.58, 0.92, sunStrength));

  moonLight.position.set(-sunLight.position.x, 54, -sunLight.position.z);
  moonLight.intensity = 0.08 + nightStrength * 0.42;

  hemiLight.intensity = THREE.MathUtils.lerp(0.72, 2.2, sunStrength);
  hemiLight.color.set(sunStrength > 0.18 ? 0xb9d5ff : 0x7386c6);
  hemiLight.groundColor.set(sunStrength > 0.18 ? 0x5f4c36 : 0x171427);

  sky.uniforms.topColor.value.set(sunStrength > 0.4 ? 0x4a95d5 : nightStrength > 0.6 ? 0x06112a : 0x405f91);
  sky.uniforms.bottomColor.value.set(
    sunStrength > 0.4 ? (duskStrength > 0.35 ? 0xeeb071 : 0xcde8f6) : nightStrength > 0.6 ? 0x111626 : 0xd17d62
  );

  scene.fog.color.set(sunStrength > 0.4 ? 0xb2c7d6 : nightStrength > 0.6 ? 0x071020 : 0x8c6e75);
  scene.fog.density = THREE.MathUtils.lerp(0.013, 0.006, sunStrength);
  fillLight.intensity = THREE.MathUtils.lerp(0.34, 0.12, sunStrength);
  renderer.toneMappingExposure = THREE.MathUtils.lerp(1.35, 0.9, nightStrength) + lightFactor * 0.08;

  for (const light of cathedralLights) {
    const base = light.userData.baseIntensity ?? (light.isSpotLight ? 4.7 : 1.0);
    light.intensity = lightFactor * base;
  }

  for (const entry of glowMaterials) {
    const factor = entry.mode === "ambient" ? ambientGlow : lightFactor;
    entry.material.emissiveIntensity = THREE.MathUtils.lerp(entry.dayIntensity, entry.nightIntensity, factor);
    if (entry.dayColor) {
      entry.material.emissive.copy(entry.dayColor).lerp(entry.nightColor, factor);
    }
  }

  lampGlowMaterial.opacity = ambientGlow * 0.55;
  materials.water.color.copy(waterDayColor).lerp(waterNightColor, nightStrength);
  starNight = nightStrength;

  for (const { group, type } of clockHands) {
    const angle =
      type === "hour"
        ? ((timeOfDay % 12) / 12) * Math.PI * 2
        : (timeOfDay % 1) * Math.PI * 2;
    group.rotation.z = -angle;
  }

  setPresetActive();
}

function getCathedralLightFactor(nightStrength) {
  if (lightMode === "on") return 1;
  if (lightMode === "off") return 0;
  const evening = smoothstep(17.1, 19.2, timeOfDay);
  const morning = 1 - smoothstep(5.4, 7.2, timeOfDay);
  return Math.max(smoothstep(0.18, 0.68, nightStrength), evening, morning);
}

function setTime(value) {
  timeOfDay = value;
  updateTime();
}

function setLightMode(mode) {
  lightMode = mode;
  lightsAutoButton.classList.toggle("active", mode === "auto");
  lightsOnButton.classList.toggle("active", mode === "on");
  lightsOffButton.classList.toggle("active", mode === "off");
  updateTime(true);
}

function setPresetActive() {
  presetDay.classList.toggle("active", timeOfDay >= 9 && timeOfDay <= 16);
  presetDusk.classList.toggle("active", timeOfDay > 16 && timeOfDay < 20);
  presetNight.classList.toggle("active", timeOfDay >= 20 || timeOfDay < 5);
}

function moveCamera(position, target) {
  cameraTween = {
    fromPos: camera.position.clone(),
    toPos: position.clone(),
    fromTarget: controls.target.clone(),
    toTarget: target.clone(),
    start: clock.getElapsedTime(),
    duration: 1.1
  };
}

function animate() {
  requestAnimationFrame(animate);
  const elapsed = clock.getElapsedTime();

  if (cameraTween) {
    const t = THREE.MathUtils.clamp((elapsed - cameraTween.start) / cameraTween.duration, 0, 1);
    const k = t * t * (3 - 2 * t);
    camera.position.lerpVectors(cameraTween.fromPos, cameraTween.toPos, k);
    controls.target.lerpVectors(cameraTween.fromTarget, cameraTween.toTarget, k);
    if (t >= 1) cameraTween = null;
  }
  controls.update();

  for (const water of animatedWater) {
    const positionAttr = water.geometry.attributes.position;
    for (let i = 0; i < positionAttr.count; i += 1) {
      const wx = positionAttr.getX(i);
      const wy = positionAttr.getY(i);
      positionAttr.setZ(i, Math.sin(wx * 0.5 + elapsed) * 0.04 + Math.sin(wy * 0.18 + elapsed * 0.8) * 0.05);
    }
    positionAttr.needsUpdate = true;
    water.geometry.computeVertexNormals();
  }

  for (const boat of animatedBoats) {
    const { speed, phase } = boat.userData;
    const range = 120;
    const travelled = (elapsed * Math.abs(speed) + phase * 10) % range;
    boat.position.z = speed > 0 ? -58 + travelled : 62 - travelled;
    boat.position.y = 0.05 + Math.sin(elapsed * 1.3 + phase) * 0.05;
    boat.rotation.z = Math.sin(elapsed * 0.9 + phase) * 0.015;
  }

  for (const star of starLayers) {
    star.material.opacity = starNight * (0.75 + 0.22 * Math.sin(elapsed * 1.7));
  }

  renderer.render(scene, camera);
  frameCount += 1;
  if (frameCount <= 20 || frameCount % 90 === 0) updateRenderDiagnostics();
}

function resize() {
  if (exporting) return;
  const width = window.innerWidth;
  const height = window.innerHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(width, height, false);
}

function export4K() {
  exporting = true;
  const previousSize = new THREE.Vector2();
  renderer.getSize(previousSize);
  const previousPixelRatio = renderer.getPixelRatio();
  const previousAspect = camera.aspect;

  camera.aspect = 3840 / 2160;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(1);
  renderer.setSize(3840, 2160, false);
  renderer.render(scene, camera);

  const link = document.createElement("a");
  link.download = `notre-dame-${formatTime(timeOfDay).replace(":", "")}-4k.png`;
  link.href = renderer.domElement.toDataURL("image/png");
  link.click();

  renderer.setPixelRatio(previousPixelRatio);
  renderer.setSize(previousSize.x, previousSize.y, false);
  camera.aspect = previousAspect;
  camera.updateProjectionMatrix();
  exporting = false;
}

function formatTime(value) {
  const wrapped = ((value % 24) + 24) % 24;
  const hours = Math.floor(wrapped);
  const minutes = Math.round((wrapped - hours) * 60);
  const safeMinutes = minutes === 60 ? 0 : minutes;
  const safeHours = minutes === 60 ? (hours + 1) % 24 : hours;
  return `${String(safeHours).padStart(2, "0")}:${String(safeMinutes).padStart(2, "0")}`;
}

function smoothstep(edge0, edge1, x) {
  const t = THREE.MathUtils.clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function seededNoise(seed) {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function updateRenderDiagnostics() {
  const sceneStats = {
    timeOfDay,
    lightMode,
    objectCount: scene.children.length,
    cathedralLightCount: cathedralLights.length,
    glowMaterialCount: glowMaterials.length,
    drawCalls: renderer.info.render.calls,
    triangles: renderer.info.render.triangles
  };

  try {
    const gl = renderer.getContext();
    const width = gl.drawingBufferWidth;
    const height = gl.drawingBufferHeight;
    const sampleW = Math.min(96, width);
    const sampleH = Math.min(96, height);
    const pixels = new Uint8Array(sampleW * sampleH * 4);
    gl.readPixels(
      Math.floor((width - sampleW) / 2),
      Math.floor((height - sampleH) / 2),
      sampleW,
      sampleH,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      pixels
    );

    let lit = 0;
    let total = 0;
    let min = 255;
    let max = 0;
    for (let i = 0; i < pixels.length; i += 4) {
      const luma = (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3;
      if (luma > 10) lit += 1;
      total += luma;
      min = Math.min(min, luma);
      max = Math.max(max, luma);
    }

    window.__notreDameDiagnostics = {
      status: "ok",
      canvas: {
        width,
        height,
        sampleW,
        sampleH,
        litRatio: lit / (pixels.length / 4),
        averageLuma: total / (pixels.length / 4),
        minLuma: min,
        maxLuma: max
      },
      scene: sceneStats
    };
  } catch (error) {
    window.__notreDameDiagnostics = {
      status: "readback-error",
      message: error instanceof Error ? error.message : String(error),
      canvas: {
        width: renderer.domElement.width,
        height: renderer.domElement.height
      },
      scene: sceneStats
    };
  }
}
