import * as THREE from 'three';
import { createArena } from './arena.js';
import { createPlayer, updatePlayer } from './player.js';
import { createWeapon } from './weapon.js';
import { createHUD } from './hud.js';

// The scene contains all objects that Three.js will draw.
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x343936);
scene.fog = new THREE.Fog(0x343936, 35, 65);

// The camera is attached to the player and gives the first-person view.
const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 100);
// Adding the camera to the scene also makes its attached gun render as a child.
scene.add(camera);

// The renderer draws the scene into the canvas in index.html.
const canvas = document.querySelector('#game-canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

// Build the arena, then pass its solid objects to the player for collision.
const arena = createArena(scene);
const player = createPlayer(camera, canvas, arena.solids);
const hud = createHUD();
const weapon = createWeapon(camera, (amount) => hud.setAmmo(amount));

// Shooting checks the center of the camera and adds a small mark to the hit.
const raycaster = new THREE.Raycaster();
const aimPoint = new THREE.Vector2(0, 0);
const hitNormal = new THREE.Vector3();
const bulletHoleGeometry = new THREE.CircleGeometry(0.055, 10);
const bulletHoleMaterial = new THREE.MeshBasicMaterial({ color: 0x171a18, side: THREE.DoubleSide });
const bulletHoles = [];
const maxBulletHoles = 30;

function addBulletHole(hit) {
  hitNormal.copy(hit.face.normal).transformDirection(hit.object.matrixWorld);
  const hole = new THREE.Mesh(bulletHoleGeometry, bulletHoleMaterial);
  hole.position.copy(hit.point).addScaledVector(hitNormal, 0.012);
  hole.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), hitNormal);
  scene.add(hole);
  bulletHoles.push(hole);

  if (bulletHoles.length > maxBulletHoles) {
    scene.remove(bulletHoles.shift());
  }
}

function clearBulletHoles() {
  while (bulletHoles.length > 0) {
    scene.remove(bulletHoles.pop());
  }
}

let gameState = 'menu';
const clock = new THREE.Clock();

function shoot(event) {
  if (event.button !== 0 || gameState !== 'playing') return;
  if (!weapon.fire(clock.elapsedTime)) return;

  raycaster.setFromCamera(aimPoint, camera);
  const hits = raycaster.intersectObjects(arena.shootables, false);
  if (hits.length > 0) addBulletHole(hits[0]);
}

function startGame() {
  gameState = 'playing';
  player.active = true;
  hud.showGame();
  player.controls.lock();
}

function resumeGame() {
  gameState = 'playing';
  player.active = true;
  hud.showGame();
  player.controls.lock();
}

function restartGame() {
  clearBulletHoles();
  const position = player.camera.position;
  position.set(6, player.height, 10);
  player.camera.rotation.set(0, 0, 0, 'YXZ');
  player.verticalSpeed = 0;
  player.grounded = true;
  player.keys.clear();
  player.active = true;
  gameState = 'playing';
  hud.showGame();
  weapon.reload();
  player.controls.lock();
}

hud.bind({ start: startGame, resume: resumeGame, restart: restartGame });
player.controls.addEventListener('lock', () => {
  gameState = 'playing';
  hud.showGame();
});
player.controls.addEventListener('unlock', () => {
  if (gameState === 'playing') {
    gameState = 'paused';
    player.active = false;
    hud.showPause();
  }
});

canvas.addEventListener('mousedown', shoot);
canvas.addEventListener('click', () => {
  if (gameState === 'playing' && !player.controls.isLocked) {
    player.controls.lock();
  }
});

// If pointer lock is unavailable, use mouse movement over the page to aim.
window.addEventListener('mousemove', (event) => {
  if (gameState !== 'playing' || player.controls.isLocked) return;
  camera.rotation.order = 'YXZ';
  camera.rotation.y -= event.movementX * 0.002;
  camera.rotation.x -= event.movementY * 0.002;
  camera.rotation.x = THREE.MathUtils.clamp(camera.rotation.x, -1.45, 1.45);
});

function pauseWithoutPointerLock() {
  gameState = 'paused';
  player.active = false;
  hud.showPause();
}

window.addEventListener('keydown', (event) => {
  if (event.code === 'Escape' && gameState === 'playing' && !player.controls.isLocked) {
    pauseWithoutPointerLock();
  }
  if (event.code === 'KeyR' && gameState === 'playing') {
    weapon.reload();
  }
});

// Match the renderer and camera to the canvas size.
function resizeRenderer() {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

window.addEventListener('resize', resizeRenderer);
resizeRenderer();

// Update the player and weapon, then render the scene each frame.
function animate() {
  requestAnimationFrame(animate);
  const deltaTime = Math.min(clock.getDelta(), 0.05);
  const walking = updatePlayer(player, deltaTime);
  weapon.update(clock.elapsedTime, deltaTime, walking);
  renderer.render(scene, camera);
}

animate();

// Release controls and dispose of renderer resources when the page closes.
window.addEventListener('beforeunload', () => {
  player.dispose();
  weapon.dispose();
  renderer.dispose();
  bulletHoleGeometry.dispose();
  bulletHoleMaterial.dispose();
}, { once: true });
