import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

// ---------- Scene ----------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x101827);

// ---------- Camera ----------
const camera = new THREE.PerspectiveCamera(
  58,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(8.5, 5.2, 9.5);

// ---------- Renderer ----------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputEncoding = THREE.sRGBEncoding;
document.body.appendChild(renderer.domElement);

// ---------- Controls ----------
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.target.set(0, 1.45, 0);

// ---------- Texture Helpers ----------
function createWoodTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#8b5a2b";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let y = 0; y < canvas.height; y += 72) {
    ctx.fillStyle = y % 144 === 0 ? "#9b6738" : "#754620";
    ctx.fillRect(0, y, canvas.width, 72);

    ctx.strokeStyle = "rgba(45, 22, 8, 0.45)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }

  for (let i = 0; i < 180; i++) {
    ctx.strokeStyle = "rgba(255, 220, 160, 0.12)";
    ctx.lineWidth = Math.random() * 2 + 0.5;
    const y = Math.random() * canvas.height;

    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(
      250,
      y + Math.random() * 40,
      650,
      y - Math.random() * 40,
      1024,
      y
    );
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3, 3);
  return texture;
}

function createWallTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#31405d";
  ctx.fillRect(0, 0, 512, 512);

  ctx.fillStyle = "rgba(255,255,255,0.04)";
  for (let i = 0; i < 90; i++) {
    ctx.fillRect(Math.random() * 512, Math.random() * 512, 3, 3);
  }

  ctx.strokeStyle = "rgba(255,255,255,0.05)";
  ctx.lineWidth = 2;
  for (let y = 0; y < 512; y += 80) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(512, y);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);
  return texture;
}

function createSkyTexture(isNight = false) {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");

  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);

  if (isNight) {
    gradient.addColorStop(0, "#020617");
    gradient.addColorStop(0.58, "#172554");
    gradient.addColorStop(1, "#334155");
  } else {
    gradient.addColorStop(0, "#74b8ff");
    gradient.addColorStop(0.55, "#badcff");
    gradient.addColorStop(1, "#f7fbff");
  }

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (isNight) {
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    for (let i = 0; i < 230; i++) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height * 0.55;
      const r = Math.random() * 1.8 + 0.25;

      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    ctx.fillStyle = "rgba(255,255,255,0.38)";
    for (let i = 0; i < 14; i++) {
      const x = Math.random() * canvas.width;
      const y = 130 + Math.random() * 170;

      ctx.beginPath();
      ctx.ellipse(
        x,
        y,
        80 + Math.random() * 90,
        22 + Math.random() * 20,
        0,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }
  }

  return new THREE.CanvasTexture(canvas);
}

// ---------- Lights ----------
const ambientLight = new THREE.AmbientLight(0xffffff, 0.45);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xfff2d0, 1.0);
directionalLight.position.set(4, 8, 5);
directionalLight.castShadow = true;
scene.add(directionalLight);

const pointLight = new THREE.PointLight(0xffc66b, 1.5, 35);
pointLight.position.set(-3.5, 4.2, 3);
pointLight.castShadow = true;
scene.add(pointLight);

const spotLight = new THREE.SpotLight(0xffffff, 1.9, 35, Math.PI / 8, 0.35, 1);
spotLight.position.set(0, 6.2, 4.5);
spotLight.castShadow = true;
scene.add(spotLight);
scene.add(spotLight.target);

// Small visible moving light indicator
const pointLightBall = new THREE.Mesh(
  new THREE.SphereGeometry(0.16, 24, 12),
  new THREE.MeshBasicMaterial({ color: 0xffc66b })
);
pointLightBall.position.copy(pointLight.position);
scene.add(pointLightBall);

// ---------- Materials ----------
const woodMat = new THREE.MeshStandardMaterial({
  map: createWoodTexture(),
  roughness: 0.72
});

const wallMat = new THREE.MeshStandardMaterial({
  map: createWallTexture(),
  roughness: 0.78
});

const creamMat = new THREE.MeshStandardMaterial({ color: 0xd8c7aa, roughness: 0.7 });
const darkWoodMat = new THREE.MeshStandardMaterial({ color: 0x5a351c, roughness: 0.65 });
const counterMat = new THREE.MeshStandardMaterial({ color: 0xddd0ba, roughness: 0.55 });
const metalMat = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, metalness: 0.45, roughness: 0.28 });
const yellowMat = new THREE.MeshStandardMaterial({ color: 0xffcf4a, roughness: 0.45 });
const redMat = new THREE.MeshStandardMaterial({ color: 0xc94f4f, roughness: 0.5 });
const blueMat = new THREE.MeshStandardMaterial({ color: 0x4f8edc, roughness: 0.5 });
const greenMat = new THREE.MeshStandardMaterial({ color: 0x62d2a2, roughness: 0.45 });
const rugMat = new THREE.MeshStandardMaterial({ color: 0x8c2f39, roughness: 0.9 });
const blackMat = new THREE.MeshStandardMaterial({ color: 0x1e1e1e, roughness: 0.6 });

const glowMat = new THREE.MeshStandardMaterial({
  color: 0xffd166,
  emissive: 0xffaa33,
  emissiveIntensity: 0.6,
  roughness: 0.35
});

const bulbMat = new THREE.MeshStandardMaterial({
  color: 0xfff0b0,
  emissive: 0xffc85c,
  emissiveIntensity: 0.95,
  roughness: 0.25
});

const roofMat = new THREE.MeshStandardMaterial({
  color: 0xb8c3d8,
  transparent: true,
  opacity: 0.24,
  roughness: 0.7,
  side: THREE.DoubleSide
});

// ---------- Ground ----------
const ground = new THREE.Mesh(new THREE.PlaneGeometry(24, 24), woodMat);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// ---------- Skybox ----------
const skyMaterial = new THREE.MeshBasicMaterial({
  map: createSkyTexture(false),
  side: THREE.BackSide
});
const skybox = new THREE.Mesh(new THREE.BoxGeometry(200, 200, 200), skyMaterial);
scene.add(skybox);

// ---------- Helper ----------
function addMesh(mesh, x, y, z) {
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);
  return mesh;
}

// ---------- Room ----------
// Room walls and roof should not cast shadows, otherwise they create ugly giant diagonal shadows.
function addRoomMesh(mesh, x, y, z) {
  mesh.position.set(x, y, z);
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  scene.add(mesh);
  return mesh;
}

addRoomMesh(new THREE.Mesh(new THREE.BoxGeometry(24, 6, 0.25), wallMat), 0, 3, -8);
addRoomMesh(new THREE.Mesh(new THREE.BoxGeometry(0.25, 6, 16), wallMat), -8, 3, 0);
addRoomMesh(new THREE.Mesh(new THREE.BoxGeometry(0.25, 6, 16), wallMat), 8, 3, 0);

const roof = addRoomMesh(
  new THREE.Mesh(new THREE.BoxGeometry(24, 0.18, 16), roofMat),
  0,
  6.05,
  0
);

// Window
const windowSkyMat = new THREE.MeshBasicMaterial({
  map: createSkyTexture(false),
  side: THREE.DoubleSide
});

addRoomMesh(new THREE.Mesh(new THREE.BoxGeometry(4.4, 2.5, 0.1), blackMat), 3.5, 3.25, -7.82);
addRoomMesh(new THREE.Mesh(new THREE.BoxGeometry(3.85, 1.95, 0.08), windowSkyMat), 3.5, 3.25, -7.74);
addRoomMesh(new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.1, 0.16), blackMat), 3.5, 3.25, -7.65);
addRoomMesh(new THREE.Mesh(new THREE.BoxGeometry(4.0, 0.12, 0.16), blackMat), 3.5, 3.25, -7.64);


// Rug
addMesh(new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.04, 3.2), rugMat), 0, 0.03, 1.6);

// ---------- Kitchen Island / Table ----------
addMesh(new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.35, 2.6), counterMat), 0, 1.25, -2.2);

const legGeo = new THREE.CylinderGeometry(0.11, 0.11, 1.25, 24);
addMesh(new THREE.Mesh(legGeo, metalMat), -2.3, 0.62, -3.25);
addMesh(new THREE.Mesh(legGeo, metalMat), 2.3, 0.62, -3.25);
addMesh(new THREE.Mesh(legGeo, metalMat), -2.3, 0.62, -1.15);
addMesh(new THREE.Mesh(legGeo, metalMat), 2.3, 0.62, -1.15);

// Plates and food
const plateGeo = new THREE.CylinderGeometry(0.48, 0.52, 0.1, 36);
for (let i = 0; i < 5; i++) {
  addMesh(new THREE.Mesh(plateGeo, yellowMat), -1.6 + i * 0.8, 1.5, -2.2);
}

const sphereGeo = new THREE.SphereGeometry(0.25, 32, 16);
addMesh(new THREE.Mesh(sphereGeo, redMat), -1.6, 1.82, -2.2);
addMesh(new THREE.Mesh(sphereGeo, blueMat), -0.8, 1.82, -2.2);
addMesh(new THREE.Mesh(sphereGeo, redMat), 0.0, 1.82, -2.2);
addMesh(new THREE.Mesh(sphereGeo, blueMat), 0.8, 1.82, -2.2);
addMesh(new THREE.Mesh(sphereGeo, greenMat), 1.6, 1.82, -2.2);

// ---------- Cabinets ----------
for (let i = 0; i < 5; i++) {
  addMesh(new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.0, 0.9), darkWoodMat), -5.3, 0.5, -2.6 + i * 1.1);
}
addMesh(new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.15, 5.6), counterMat), -5.3, 1.08, -0.4);

for (let i = 0; i < 5; i++) {
  addMesh(new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.45), metalMat), -4.72, 0.62, -2.6 + i * 1.1);
}

// ---------- Stools ----------
function addStool(x, z) {
  addMesh(new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.42, 0.16, 32), creamMat), x, 0.92, z);
  addMesh(new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.9, 18), metalMat), x, 0.46, z);
  addMesh(new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.3, 0.06, 24), metalMat), x, 0.06, z);
}
addStool(-1.6, 0.3);
addStool(0, 0.3);
addStool(1.6, 0.3);

// ---------- Decorative Boxes ----------
addMesh(new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 0.9), redMat), -3.6, 0.45, 3.7);
addMesh(new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 0.9), blueMat), -3.6, 1.35, 3.7);
addMesh(new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 0.9), greenMat), 4.2, 0.45, 3.2);
addMesh(new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 0.9), yellowMat), 4.2, 1.35, 3.2);

// ---------- Ceiling-Attached Pendant Lamps ----------
function addPendantLamp(x, z) {
  // ceiling mount disk, directly attached to roof
  const mount = addMesh(
    new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.06, 24), blackMat),
    x,
    5.93,
    z
  );
  mount.rotation.x = Math.PI / 2;

  // long wire from roof to lampshade
  addMesh(
    new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 2.2, 12), blackMat),
    x,
    4.8,
    z
  );

  // lampshade: cone shape, wider at bottom
  const shade = new THREE.Mesh(
    new THREE.ConeGeometry(0.45, 0.62, 32, 1, true),
    blackMat
  );
  addMesh(shade, x, 3.55, z);

  // glowing bulb under shade
  const bulb = addMesh(
    new THREE.Mesh(new THREE.SphereGeometry(0.14, 24, 12), bulbMat),
    x,
    3.25,
    z
  );
  bulb.castShadow = false;

  // warm real light
  const lampLight = new THREE.PointLight(0xffc66b, 0.68, 8);
  lampLight.position.set(x, 3.25, z);
  scene.add(lampLight);
}

addPendantLamp(-1.4, -2.2);
addPendantLamp(0, -2.2);
addPendantLamp(1.4, -2.2);

// ---------- Animated Objects ----------
const floatingCube = addMesh(
  new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.72, 0.72), greenMat),
  0,
  1.1,
  2.7
);

const torus = addMesh(
  new THREE.Mesh(new THREE.TorusGeometry(0.85, 0.16, 16, 64), metalMat),
  0,
  3.0,
  -5.5
);

// Glowing food crumb trail
for (let i = 0; i < 14; i++) {
  const angle = (i / 14) * Math.PI * 2;
  const x = Math.cos(angle) * 3.1;
  const z = Math.sin(angle) * 2.1 + 1.7;

  const crumb = addMesh(
    new THREE.Mesh(new THREE.SphereGeometry(0.09, 18, 10), glowMat),
    x,
    0.11,
    z
  );
  crumb.castShadow = false;
}

// ---------- Custom Textured GLB Model ----------
let duckModel = null;

const loader = new GLTFLoader();

loader.load(
  "./assets/models/duck.glb",
  function (gltf) {
    duckModel = gltf.scene;

    duckModel.position.set(0, 0.22, 3.4);
    duckModel.scale.set(0.33, 0.33, 0.33);
    duckModel.rotation.y = Math.PI;

    duckModel.traverse(function (child) {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    scene.add(duckModel);
    console.log("Duck GLB model loaded successfully.");
  },
  undefined,
  function (error) {
    console.error("Error loading duck.glb:", error);
  }
);

// ---------- UI / Wow Features ----------
let isNight = false;
let duckPaused = false;
let focusDuck = false;
let duckSpeed = 1.0;

const dayNightButton = document.getElementById("dayNightButton");
const pauseButton = document.getElementById("pauseButton");
const roofButton = document.getElementById("roofButton");
const focusButton = document.getElementById("focusButton");
const speedSlider = document.getElementById("speedSlider");
const speedText = document.getElementById("speedText");
const statusText = document.getElementById("status");

function updateStatus() {
  const mode = isNight ? "Night mode" : "Day mode";
  const duckState = duckPaused ? "duck paused" : "duck moving";
  const roofState = roof.visible ? "roof visible" : "roof hidden";
  const cameraState = focusDuck ? "camera focusing duck" : "free camera";

  statusText.textContent =
    `Status: ${mode}, ${duckState}, ${roofState}, ${cameraState}, speed ${duckSpeed.toFixed(1)}x.`;
}

dayNightButton.addEventListener("click", function () {
  isNight = !isNight;

  if (isNight) {
    ambientLight.intensity = 0.18;
    directionalLight.intensity = 0.22;
    pointLight.intensity = 2.3;
    spotLight.intensity = 2.8;
    glowMat.emissiveIntensity = 1.35;
    bulbMat.emissiveIntensity = 1.35;

    skyMaterial.map = createSkyTexture(true);
    skyMaterial.needsUpdate = true;

    windowSkyMat.map = createSkyTexture(true);
    windowSkyMat.needsUpdate = true;
  } else {
    ambientLight.intensity = 0.45;
    directionalLight.intensity = 1.0;
    pointLight.intensity = 1.5;
    spotLight.intensity = 1.9;
    glowMat.emissiveIntensity = 0.6;
    bulbMat.emissiveIntensity = 0.95;

    skyMaterial.map = createSkyTexture(false);
    skyMaterial.needsUpdate = true;

    windowSkyMat.map = createSkyTexture(false);
    windowSkyMat.needsUpdate = true;
  }

  updateStatus();
});

pauseButton.addEventListener("click", function () {
  duckPaused = !duckPaused;
  pauseButton.textContent = duckPaused ? "Resume Duck" : "Pause Duck";
  updateStatus();
});

roofButton.addEventListener("click", function () {
  roof.visible = !roof.visible;
  roofButton.textContent = roof.visible ? "Hide Roof" : "Show Roof";
  updateStatus();
});

focusButton.addEventListener("click", function () {
  focusDuck = !focusDuck;
  focusButton.textContent = focusDuck ? "Free Camera" : "Focus Duck";
  updateStatus();
});

speedSlider.addEventListener("input", function () {
  duckSpeed = Number(speedSlider.value);
  speedText.textContent = `${duckSpeed.toFixed(1)}x`;
  updateStatus();
});

window.addEventListener("keydown", function (event) {
  if (event.code === "Space") {
    duckPaused = !duckPaused;
    pauseButton.textContent = duckPaused ? "Resume Duck" : "Pause Duck";
    updateStatus();
  }

  if (event.key.toLowerCase() === "r") {
    roof.visible = !roof.visible;
    roofButton.textContent = roof.visible ? "Hide Roof" : "Show Roof";
    updateStatus();
  }

  if (event.key.toLowerCase() === "f") {
    focusDuck = !focusDuck;
    focusButton.textContent = focusDuck ? "Free Camera" : "Focus Duck";
    updateStatus();
  }
});

updateStatus();

// ---------- Animation ----------
let duckTime = 0;

function animate() {
  requestAnimationFrame(animate);

  const time = Date.now() * 0.001;

  floatingCube.rotation.x += 0.012;
  floatingCube.rotation.y += 0.018;
  floatingCube.position.y = 1.15 + Math.sin(time * 2.2) * 0.22;

  torus.rotation.x += 0.006;
  torus.rotation.y += 0.016;

  pointLight.position.x = -3.5 + Math.sin(time * 0.9) * 1.0;
  pointLight.position.z = 3.0 + Math.cos(time * 0.9) * 1.0;
  pointLightBall.position.copy(pointLight.position);

  if (!duckPaused) {
    duckTime += 0.012 * duckSpeed;
  }

  if (duckModel) {
    const a = 3.1;
    const b = 2.1;
    const centerZ = 1.7;

    const x = Math.cos(duckTime) * a;
    const z = Math.sin(duckTime) * b + centerZ;

    const dx = -Math.sin(duckTime) * a;
    const dz = Math.cos(duckTime) * b;

    duckModel.position.x = x;
    duckModel.position.z = z;

    // Face direction of movement instead of random spinning.
    duckModel.rotation.y = Math.atan2(dx, dz) - Math.PI / 2;
    // Spotlight tracks the duck.
    spotLight.target.position.set(
      duckModel.position.x,
      duckModel.position.y + 0.45,
      duckModel.position.z
    );

    // Optional focus mode: camera target follows the duck smoothly.
    if (focusDuck) {
      const target = new THREE.Vector3(
        duckModel.position.x,
        duckModel.position.y + 0.6,
        duckModel.position.z
      );
      controls.target.lerp(target, 0.06);
    } else {
      controls.target.lerp(new THREE.Vector3(0, 1.45, 0), 0.035);
    }
  }

  controls.update();
  renderer.render(scene, camera);
}

animate();

// ---------- Resize ----------
window.addEventListener("resize", function () {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});