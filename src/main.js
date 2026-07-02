import "./styles.css";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

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
controls.maxDistance = 145;
controls.minDistance = 12;
controls.maxPolarAngle = Math.PI * 0.49;

const clock = new THREE.Clock();
const cathedralLights = [];
const emissiveFixtures = [];
const animatedWater = [];
const clockHands = [];
const stainedGlass = [];
const starLayers = [];
const facadeDetail = [];
let frameCount = 0;

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

const materials = makeMaterials();
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
presetDusk.addEventListener("click", () => setTime(18.5));
presetNight.addEventListener("click", () => setTime(22));
timeSlider.addEventListener("input", () => setTime(Number.parseFloat(timeSlider.value)));

lightsAutoButton.addEventListener("click", () => setLightMode("auto"));
lightsOnButton.addEventListener("click", () => setLightMode("on"));
lightsOffButton.addEventListener("click", () => setLightMode("off"));

viewFront.addEventListener("click", () => moveCamera(new THREE.Vector3(0, 17, -100), new THREE.Vector3(0, 10.5, -24)));
viewSide.addEventListener("click", () => moveCamera(new THREE.Vector3(48, 18, -5), new THREE.Vector3(0, 10, 4)));
viewAerial.addEventListener("click", () => moveCamera(new THREE.Vector3(40, 62, -48), new THREE.Vector3(0, 5, 0)));
exportButton.addEventListener("click", export4K);
window.addEventListener("resize", resize);

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
  model.add(gableRoof(32, 13.4, 4.3, 0, 12.5, 17, materials.roof));
  model.add(leanRoof(-1, -9.95, 9.1, 5, 3.9, 63, materials.roof));
  model.add(leanRoof(1, 9.95, 9.1, 5, 3.9, 63, materials.roof));
  model.add(createApse());

  const facade = box(18.8, 20.4, 2.4, 0, 10.9, -40.7, materials.stone);
  facade.name = "west facade mass";
  model.add(facade);

  model.add(createTower(-6.35));
  model.add(createTower(6.35));
  model.add(createFacadeDetails());
  model.add(createSideDetails(-1));
  model.add(createSideDetails(1));
  model.add(createTranseptDetails(-1));
  model.add(createTranseptDetails(1));
  model.add(createSpire());
  model.add(createInteriorHints());
}

function createTower(x) {
  const tower = new THREE.Group();
  tower.name = x < 0 ? "north western tower" : "south western tower";
  tower.add(box(7.6, 25, 8.5, x, 12.9, -37.6, materials.stone));
  tower.add(box(8.25, 0.7, 9.15, x, 25.75, -37.6, materials.trim));
  tower.add(box(8.45, 0.55, 9.35, x, 21.35, -37.6, materials.trim));
  tower.add(box(8.25, 0.42, 9.15, x, 15.6, -37.6, materials.trim));

  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      tower.add(createPinnacle(x + sx * 3.78, 25.95, -37.6 + sz * 4.16, 1.15, 3.3));
    }
  }

  for (const localX of [-1.35, 1.35]) {
    const belfry = archPanel(1.8, 7.4, 0.24, materials.trim, materials.deepGlass);
    belfry.position.set(x + localX, 17.4, -42.02);
    tower.add(belfry);
  }
  for (const localX of [-2.15, 0, 2.15]) {
    tower.add(column(x + localX, 12.2, -42.12, 0.16, 6.3, materials.trim));
  }

  for (const side of [-1, 1]) {
    for (const z of [-39.8, -37.4, -35]) {
      tower.add(column(x + side * 3.98, 16.1, z, 0.12, 10, materials.trim));
    }
  }

  for (let i = 0; i < 16; i += 1) {
    const offset = -3.65 + i * 0.49;
    tower.add(box(0.18, 0.9, 0.38, x + offset, 26.35, -42.4, materials.trim));
    tower.add(box(0.18, 0.9, 0.38, x + offset, 26.35, -32.75, materials.trim));
  }

  for (let i = 0; i < 6; i += 1) {
    tower.add(createGargoyle(x - 4.45 + i * 1.78, 14.95, -42.92, 0.55, 0));
  }

  const sideWindowLeft = archPanel(1.3, 4.8, 0.18, materials.trim, materials.deepGlass);
  sideWindowLeft.rotation.y = Math.PI / 2;
  sideWindowLeft.position.set(x - 4.08, 16.3, -37.7);
  tower.add(sideWindowLeft);

  const sideWindowRight = archPanel(1.3, 4.8, 0.18, materials.trim, materials.deepGlass);
  sideWindowRight.rotation.y = -Math.PI / 2;
  sideWindowRight.position.set(x + 4.08, 16.3, -37.7);
  tower.add(sideWindowRight);

  return tower;
}

function createFacadeDetails() {
  const group = new THREE.Group();
  group.name = "west facade rose portals gallery tracery";
  const frontZ = -42.06;

  group.add(box(19.6, 0.75, 0.42, 0, 19.95, frontZ - 0.05, materials.trim));
  group.add(box(19.7, 0.58, 0.46, 0, 14.65, frontZ - 0.08, materials.trim));
  group.add(box(19.7, 0.5, 0.48, 0, 8.95, frontZ - 0.1, materials.trim));

  const rose = createRoseWindow(3.05);
  rose.position.set(0, 13.05, frontZ - 0.32);
  group.add(rose);

  for (const x of [-6.25, 6.25]) {
    const smallerRose = createRoseWindow(1.15);
    smallerRose.position.set(x, 12.95, frontZ - 0.31);
    group.add(smallerRose);
  }

  for (const [x, w, h] of [
    [-6.2, 4.1, 7.5],
    [0, 4.65, 8.35],
    [6.2, 4.1, 7.5]
  ]) {
    const portal = archPanel(w, h, 0.46, materials.trim, materials.door);
    portal.position.set(x, 1.75, frontZ - 0.42);
    group.add(portal);
    for (let i = 0; i < 4; i += 1) {
      const nested = archPanel(w - 0.55 - i * 0.38, h - 0.55 - i * 0.55, 0.08, materials.shadowStone, materials.transparentAir);
      nested.position.set(x, 2.04 + i * 0.06, frontZ - 0.52 - i * 0.03);
      group.add(nested);
    }
  }

  for (let i = 0; i < 24; i += 1) {
    const x = -9.1 + i * 0.79;
    group.add(createStatue(x, 9.2, frontZ - 0.48, 0.55));
    group.add(column(x + 0.33, 9.8, frontZ - 0.5, 0.055, 1.65, materials.trim));
  }

  for (let i = 0; i < 17; i += 1) {
    const x = -7.95 + i * 0.99;
    const lancet = archPanel(0.58, 3.15, 0.07, materials.trim, materials.deepGlass);
    lancet.position.set(x, 16.2, frontZ - 0.43);
    group.add(lancet);
  }

  for (const x of [-8.9, -3.15, 3.15, 8.9]) {
    group.add(createPinnacle(x, 15.2, frontZ - 0.22, 0.7, 2.25));
  }

  for (let i = 0; i < 34; i += 1) {
    group.add(box(0.18, 0.62, 0.34, -9.55 + i * 0.58, 19.15, frontZ - 0.28, materials.trim));
  }

  for (const x of [-9.9, -4.4, 4.4, 9.9]) {
    group.add(createGargoyle(x, 8.7, frontZ - 0.85, 0.48, 0));
  }

  return group;
}

function createSideDetails(side) {
  const group = new THREE.Group();
  group.name = side < 0 ? "north nave buttresses" : "south nave buttresses";
  const sideX = side * 10.15;
  const naveX = side * 6.1;
  const zPositions = [-22, -14, -6, 2, 10, 18, 26, 34];

  for (const z of zPositions) {
    const lower = archPanel(1.22, 3.8, 0.12, materials.trim, materials.glass);
    lower.rotation.y = side < 0 ? Math.PI / 2 : -Math.PI / 2;
    lower.position.set(sideX + side * 0.1, 5.1, z);
    group.add(lower);

    const clerestory = archPanel(1.05, 4.8, 0.11, materials.trim, materials.glass);
    clerestory.rotation.y = side < 0 ? Math.PI / 2 : -Math.PI / 2;
    clerestory.position.set(naveX + side * 0.12, 10.0, z);
    group.add(clerestory);

    group.add(createFlyingButtress(side, z));
  }

  for (const z of [-28, -20, -12, -4, 4, 12, 20, 28, 36]) {
    group.add(column(side * 6.18, 9.1, z, 0.12, 8.6, materials.trim, side));
  }

  return group;
}

function createTranseptDetails(side) {
  const group = new THREE.Group();
  group.name = side < 0 ? "north transept facade" : "south transept facade";
  const x = side * 15.85;

  const wallRose = createRoseWindow(2.15);
  wallRose.rotation.y = side < 0 ? Math.PI / 2 : -Math.PI / 2;
  wallRose.position.set(x + side * 0.2, 11.6, 17);
  group.add(wallRose);

  for (const z of [12.9, 17, 21.1]) {
    const arch = archPanel(1.2, 5.2, 0.12, materials.trim, materials.glass);
    arch.rotation.y = side < 0 ? Math.PI / 2 : -Math.PI / 2;
    arch.position.set(x + side * 0.22, 4.6, z);
    group.add(arch);
  }

  group.add(createPinnacle(x, 12.5, 11.1, 0.72, 2.8));
  group.add(createPinnacle(x, 12.5, 22.9, 0.72, 2.8));
  group.add(box(0.48, 0.55, 12, x + side * 0.2, 11.85, 17, materials.trim));
  return group;
}

function createApse() {
  const group = new THREE.Group();
  group.name = "eastern apse";
  const apseWall = new THREE.Mesh(
    new THREE.CylinderGeometry(7.05, 7.05, 11.2, 48, 1, false, 0, Math.PI),
    materials.stone
  );
  apseWall.rotation.y = Math.PI / 2;
  apseWall.position.set(0, 6.25, 39);
  apseWall.castShadow = true;
  apseWall.receiveShadow = true;
  group.add(apseWall);

  const apseRoof = new THREE.Mesh(
    new THREE.ConeGeometry(7.3, 4.9, 48, 1, false, 0, Math.PI),
    materials.roof
  );
  apseRoof.rotation.y = Math.PI / 2;
  apseRoof.position.set(0, 13.0, 39);
  apseRoof.castShadow = true;
  group.add(apseRoof);

  for (let i = 0; i < 7; i += 1) {
    const angle = Math.PI * (i / 6) - Math.PI / 2;
    const x = Math.sin(angle) * 7.2;
    const z = 39 + Math.cos(angle) * 7.2;
    const arch = archPanel(0.9, 3.6, 0.1, materials.trim, materials.glass);
    arch.position.set(x, 5.5, z);
    arch.rotation.y = angle;
    group.add(arch);
    group.add(createFlyingButtress(Math.sign(x || 1), z - 2));
  }

  return group;
}

function createSpire() {
  const group = new THREE.Group();
  group.name = "crossing spire";
  group.add(box(5.3, 3, 5.3, 0, 16.0, 17, materials.roofDark));

  const base = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.7, 3.8, 8), materials.roofDark);
  base.position.set(0, 18.2, 17);
  base.castShadow = true;
  group.add(base);

  const spire = new THREE.Mesh(new THREE.ConeGeometry(1.65, 21, 8), materials.lead);
  spire.position.set(0, 30.0, 17);
  spire.castShadow = true;
  group.add(spire);

  for (let i = 0; i < 8; i += 1) {
    const angle = (Math.PI * 2 * i) / 8;
    const x = Math.cos(angle) * 2.2;
    const z = 17 + Math.sin(angle) * 2.2;
    const mini = createPinnacle(x, 18.4, z, 0.34, 3.0);
    mini.rotation.y = -angle;
    group.add(mini);
  }

  group.add(cylinderBetween(new THREE.Vector3(0, 40.9, 17), new THREE.Vector3(0, 45.1, 17), 0.035, materials.iron));
  group.add(cylinderBetween(new THREE.Vector3(-0.85, 43.1, 17), new THREE.Vector3(0.85, 43.1, 17), 0.035, materials.iron));
  return group;
}

function createInteriorHints() {
  const group = new THREE.Group();
  group.name = "visible interior lights and vault rhythm";
  for (let z = -18; z <= 32; z += 8) {
    const ribA = cylinderBetween(
      new THREE.Vector3(-4.7, 13.7, z - 2.8),
      new THREE.Vector3(0, 16.4, z),
      0.055,
      materials.trim
    );
    const ribB = cylinderBetween(
      new THREE.Vector3(4.7, 13.7, z - 2.8),
      new THREE.Vector3(0, 16.4, z),
      0.055,
      materials.trim
    );
    const ribC = cylinderBetween(
      new THREE.Vector3(-4.7, 13.7, z + 2.8),
      new THREE.Vector3(0, 16.4, z),
      0.055,
      materials.trim
    );
    const ribD = cylinderBetween(
      new THREE.Vector3(4.7, 13.7, z + 2.8),
      new THREE.Vector3(0, 16.4, z),
      0.055,
      materials.trim
    );
    group.add(ribA, ribB, ribC, ribD);
    group.add(createChandelier(0, 9.8, z));
  }
  return group;
}

function createFlyingButtress(side, z) {
  const group = new THREE.Group();
  const outerX = side * 13.0;
  const aisleX = side * 9.95;
  const upperX = side * 6.0;
  group.add(box(0.82, 7.6, 0.92, outerX, 4.6, z, materials.stone));
  group.add(createPinnacle(outerX, 8.6, z, 0.46, 2.4));
  group.add(cylinderBetween(new THREE.Vector3(outerX, 8.7, z), new THREE.Vector3(upperX, 12.4, z), 0.16, materials.trim));
  group.add(cylinderBetween(new THREE.Vector3(outerX, 6.9, z), new THREE.Vector3(aisleX, 8.9, z), 0.12, materials.shadowStone));
  group.add(createGargoyle(outerX + side * 0.44, 8.4, z - 0.35, 0.34, side * Math.PI * 0.5));
  return group;
}

function createRoseWindow(radius) {
  const group = new THREE.Group();
  const glass = new THREE.Mesh(new THREE.CircleGeometry(radius * 0.88, 96), materials.roseGlass);
  glass.position.z = -0.03;
  stainedGlass.push(glass);
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
  const group = new THREE.Group();
  const base = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.54, radius * 0.67, height * 0.34, 6), materials.trim);
  base.position.set(x, y + height * 0.17, z);
  base.castShadow = true;
  group.add(base);
  const cone = new THREE.Mesh(new THREE.ConeGeometry(radius * 0.55, height * 0.66, 6), materials.trim);
  cone.position.set(x, y + height * 0.68, z);
  cone.castShadow = true;
  group.add(cone);
  const finial = new THREE.Mesh(new THREE.SphereGeometry(radius * 0.12, 8, 8), materials.trim);
  finial.position.set(x, y + height * 1.03, z);
  group.add(finial);
  return group;
}

function createStatue(x, y, z, scale = 1) {
  const group = new THREE.Group();
  const robe = new THREE.Mesh(new THREE.CylinderGeometry(0.11 * scale, 0.19 * scale, 0.72 * scale, 7), materials.statue);
  robe.position.set(x, y + 0.36 * scale, z);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.13 * scale, 10, 8), materials.statue);
  head.position.set(x, y + 0.83 * scale, z);
  const niche = archPanel(0.46 * scale, 1.12 * scale, 0.04 * scale, materials.trim, materials.transparentAir);
  niche.position.set(x, y - 0.08 * scale, z + 0.02);
  group.add(niche, robe, head);
  return group;
}

function createGargoyle(x, y, z, scale = 1, rotationY = 0) {
  const group = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.13 * scale, 0.18 * scale, 0.72 * scale, 8), materials.gargoyle);
  body.rotation.z = Math.PI / 2;
  body.position.set(0, 0, 0);
  const head = new THREE.Mesh(new THREE.ConeGeometry(0.16 * scale, 0.34 * scale, 8), materials.gargoyle);
  head.rotation.z = -Math.PI / 2;
  head.position.set(0.45 * scale, 0.02 * scale, 0);
  const wingA = new THREE.Mesh(new THREE.ConeGeometry(0.09 * scale, 0.36 * scale, 3), materials.gargoyle);
  wingA.position.set(-0.08 * scale, 0.18 * scale, 0.12 * scale);
  const wingB = wingA.clone();
  wingB.position.z = -0.12 * scale;
  group.add(body, head, wingA, wingB);
  group.position.set(x, y, z);
  group.rotation.y = rotationY;
  group.castShadow = true;
  return group;
}

function createChandelier(x, y, z) {
  const group = new THREE.Group();
  group.position.set(x, y, z);
  const stem = cylinderBetween(new THREE.Vector3(0, 1.4, 0), new THREE.Vector3(0, 0.15, 0), 0.025, materials.brass);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.025, 8, 48), materials.brass);
  ring.rotation.x = Math.PI / 2;
  group.add(stem, ring);
  for (let i = 0; i < 10; i += 1) {
    const angle = (Math.PI * 2 * i) / 10;
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 8), materials.bulb);
    bulb.position.set(Math.cos(angle) * 0.72, 0, Math.sin(angle) * 0.72);
    const light = new THREE.PointLight(0xffc072, 0.15, 6, 2);
    light.position.copy(bulb.position);
    light.userData.baseIntensity = 0.36;
    cathedralLights.push(light);
    emissiveFixtures.push(bulb);
    group.add(bulb, light);
  }
  return group;
}

function buildEnvironment() {
  const plaza = new THREE.Mesh(new THREE.PlaneGeometry(150, 150), materials.cobble);
  plaza.rotation.x = -Math.PI / 2;
  plaza.receiveShadow = true;
  scene.add(plaza);

  const river = new THREE.Mesh(new THREE.PlaneGeometry(24, 150, 32, 32), materials.water);
  river.name = "Seine water plane";
  river.position.set(33, 0.035, 5);
  river.rotation.x = -Math.PI / 2;
  river.receiveShadow = true;
  animatedWater.push(river);
  scene.add(river);

  scene.add(box(3, 1.2, 135, 19.2, 0.6, 5, materials.embankment));
  scene.add(box(3, 1.2, 135, 46.8, 0.6, 5, materials.embankment));

  for (let i = 0; i < 14; i += 1) {
    scene.add(createStreetLamp(21, -52 + i * 8.3));
    scene.add(createStreetLamp(45, -52 + i * 8.3));
  }

  for (let i = 0; i < 18; i += 1) {
    const z = -55 + i * 6.5;
    scene.add(createTree(-24 + Math.sin(i) * 4, z, 1.2 + (i % 3) * 0.2));
  }

  for (let i = 0; i < 12; i += 1) {
    const width = 5 + (i % 4);
    const height = 5 + (i % 5) * 0.8;
    const depth = 4 + (i % 3);
    const building = box(width, height, depth, -39 - (i % 4) * 6, height / 2, -34 + Math.floor(i / 4) * 15, materials.parisStone);
    scene.add(building);
    scene.add(gableRoof(width * 1.04, depth * 1.1, 1.2, building.position.x, height + 0.1, building.position.z, materials.roofDark));
  }

  const westSpotPositions = [
    [-8, 1.4, -45],
    [0, 1.4, -46],
    [8, 1.4, -45],
    [-12, 5.3, -38],
    [12, 5.3, -38]
  ];
  for (const [x, y, z] of westSpotPositions) {
    const light = new THREE.SpotLight(0xffba67, 0.0, 46, 0.42, 0.5, 1.2);
    light.position.set(x, y, z);
    light.target.position.set(x * 0.35, 13.5, -41.7);
    light.userData.baseIntensity = 12;
    scene.add(light, light.target);
    cathedralLights.push(light);
  }

  for (const [x, y, z, intensity] of [
    [-7.4, 5.2, -46.5, 5.5],
    [0, 6.4, -47.2, 6.8],
    [7.4, 5.2, -46.5, 5.5],
    [-5.4, 17.0, -45.6, 4.4],
    [5.4, 17.0, -45.6, 4.4]
  ]) {
    const glow = new THREE.PointLight(0xffb15f, 0.0, 34, 1.15);
    glow.position.set(x, y, z);
    glow.userData.baseIntensity = intensity;
    scene.add(glow);
    cathedralLights.push(glow);
  }
}

function buildReferenceMarkers() {
  const guideGroup = new THREE.Group();
  guideGroup.name = "asset-informed proportions and lighting cues";
  guideGroup.userData.assets = [
    "Assests/08772490-ae4f-11ef-8ab9-9192db313061.jpg.jpg",
    "Assests/1328836-notredame-cathedral-paris.jpg",
    "Assests/Notre-Dame-de-Paris.jpg",
    "Assests/notredame.png",
    "Assests/shutterstock-745547653.jpg"
  ];
  scene.add(guideGroup);
}

function createStreetLamp(x, z) {
  const group = new THREE.Group();
  const pole = cylinderBetween(new THREE.Vector3(x, 0, z), new THREE.Vector3(x, 3.5, z), 0.045, materials.iron);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 8), materials.bulb);
  bulb.position.set(x, 3.65, z);
  const light = new THREE.PointLight(0xffb75a, 0.0, 13, 2);
  light.position.copy(bulb.position);
  light.userData.streetLamp = true;
  light.userData.baseIntensity = 0.65;
  cathedralLights.push(light);
  emissiveFixtures.push(bulb);
  group.add(pole, bulb, light);
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
    roof: new THREE.MeshStandardMaterial({ color: palette.roof, roughness: 0.58, metalness: 0.12 }),
    roofDark: new THREE.MeshStandardMaterial({ color: 0x34434d, roughness: 0.56, metalness: 0.16 }),
    lead: new THREE.MeshStandardMaterial({ color: 0x53616a, roughness: 0.47, metalness: 0.25 }),
    iron: new THREE.MeshStandardMaterial({ color: 0x141419, roughness: 0.42, metalness: 0.5 }),
    brass: new THREE.MeshStandardMaterial({ color: 0xc29145, roughness: 0.34, metalness: 0.72 }),
    bulb: new THREE.MeshStandardMaterial({ color: 0xffd38a, emissive: 0xffa63d, emissiveIntensity: 1.2 }),
    transparentAir: new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.0, depthWrite: false }),
    cobble: new THREE.MeshStandardMaterial({ color: 0x9d9587, map: cobbleTexture, roughness: 0.96 }),
    water: new THREE.MeshStandardMaterial({
      color: palette.water,
      roughness: 0.18,
      metalness: 0.08,
      transparent: true,
      opacity: 0.86
    }),
    embankment: new THREE.MeshStandardMaterial({ color: 0xa1937d, map: stoneTexture, roughness: 0.9 }),
    parisStone: new THREE.MeshStandardMaterial({ color: 0xb8ad9c, roughness: 0.9 }),
    trunk: new THREE.MeshStandardMaterial({ color: 0x4b3423, roughness: 0.92 }),
    leaves: new THREE.MeshStandardMaterial({ color: 0x556b3b, roughness: 0.86 })
  };
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
    size: 0.7,
    transparent: true,
    opacity: 0.0,
    depthWrite: false
  });
  const points = new THREE.Points(geometry, material);
  starLayers.push(points);
  group.add(points);
  return group;
}

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

function gableRoof(width, length, height, x, y, z, material) {
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
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  addRoofRibs(mesh, width, length, height);
  return mesh;
}

function leanRoof(side, x, y, z, width, length, material) {
  const halfL = length / 2;
  const h = 2.6;
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

function updateTime(skipSlider = false) {
  if (!skipSlider) timeSlider.value = String(timeOfDay);
  const normalized = timeOfDay / 24;
  const sunAngle = (normalized - 0.25) * Math.PI * 2;
  const sunHeight = Math.sin(sunAngle);
  const sunStrength = smoothstep(-0.08, 0.58, sunHeight);
  const nightStrength = 1 - smoothstep(-0.24, 0.18, sunHeight);
  const duskStrength = 1 - Math.abs(THREE.MathUtils.clamp((timeOfDay - 18.6) / 2.4, -1, 1));
  const lightFactor = getCathedralLightFactor(nightStrength);

  timeLabel.textContent = formatTime(timeOfDay);
  sunLight.position.set(Math.cos(sunAngle) * 70, Math.max(5, sunHeight * 72 + 10), Math.sin(sunAngle) * 70);
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

  for (const fixture of emissiveFixtures) {
    fixture.material.emissiveIntensity = THREE.MathUtils.lerp(0.05, 2.3, lightFactor);
  }

  for (const glass of stainedGlass) {
    glass.material.emissiveIntensity = THREE.MathUtils.lerp(0.05, 0.9, lightFactor);
  }

  for (const star of starLayers) {
    star.material.opacity = nightStrength * 0.92;
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
  camera.position.copy(position);
  controls.target.copy(target);
  controls.update();
}

function animate() {
  requestAnimationFrame(animate);
  const elapsed = clock.getElapsedTime();
  controls.update();
  for (const water of animatedWater) {
    water.position.y = 0.035 + Math.sin(elapsed * 0.9) * 0.015;
  }
  model.rotation.y = Math.sin(elapsed * 0.08) * 0.006;
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
    stainedGlassCount: stainedGlass.length
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
