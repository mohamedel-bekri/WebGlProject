import * as THREE from 'three';
import { createArena } from './arena.js';
import { createPlayer, updatePlayer } from './player.js';
import { createWeapon } from './weapon.js';
import { createHUD } from './hud.js';
import { createEnemies } from './enemies.js';
import { createSoundSystem } from './sound.js';

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
const sound = createSoundSystem();
const enemies = createEnemies(scene, arena.solids, sound);
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
let score = 0;
const clock = new THREE.Clock();

function shoot(event) {
  if (event.button !== 0 || gameState !== 'playing') return;
  if (!weapon.fire(clock.elapsedTime)) return;
  sound.shoot();

  // Alerte sonore des ennemis proches du tir
  enemies.alertFromGunshot(player.camera.position);

  raycaster.setFromCamera(aimPoint, camera);
  // On teste les murs/cibles ET les hitboxes (corps + tête) des ennemis en vie
  const activeEnemyHitboxes = enemies.hitboxes.filter((box) => box.userData.enemy.alive);
  const targets = [...arena.shootables, ...activeEnemyHitboxes];
  const hits = raycaster.intersectObjects(targets, false);

  if (hits.length > 0) {
    const firstHit = hits[0];
    const hitEnemy = firstHit.object.userData.enemy;

    if (hitEnemy && hitEnemy.alive) {
      const isHeadshot = firstHit.object.userData.isHead;
      const damageAmount = isHeadshot ? 100 : 35;
      sound.hitEnemy(isHeadshot);
      const killed = enemies.damage(hitEnemy, damageAmount);

      if (killed) {
        score += isHeadshot ? 200 : 100;
        hud.setWaveStats(enemies.getWave(), enemies.getAliveCount(), score);
      }
    } else {
      addBulletHole(firstHit);
    }
  }
}

function startGame() {
  gameState = 'playing';
  player.active = true;
  hud.showGame();
  hud.setWaveStats(enemies.getWave(), enemies.getAliveCount(), score);
  hud.announceWave(enemies.getWave());
  player.controls.lock();
}

function resumeGame() {
  gameState = 'playing';
  player.active = true;
  hud.showGame();
  player.controls.lock();
}

function damagePlayer(amount) {
  if (gameState !== 'playing') return;
  sound.playerHurt();
  player.health = Math.max(0, player.health - amount);
  hud.setHealth(player.health, player.maxHealth);
  hud.triggerDamageFlash();

  if (player.health <= 0) {
    gameState = 'gameover';
    player.active = false;
    player.keys.clear();
    hud.showGameOver(enemies.getWave(), score);
    if (player.controls.isLocked) {
      player.controls.unlock();
    }
  }
}

function restartGame() {
  clearBulletHoles();
  const initialCount = enemies.reset();
  score = 0;
  player.health = player.maxHealth;
  hud.setHealth(player.health, player.maxHealth);
  hud.setWaveStats(1, initialCount, score);
  hud.announceWave(1);

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
    sound.reload();
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

  if (gameState === 'playing') {
    enemies.update(
      deltaTime,
      player.camera.position,
      (damage) => damagePlayer(damage),
      (newWave, spawnedCount) => {
        hud.setWaveStats(newWave, spawnedCount, score);
        hud.announceWave(newWave);
      },
    );
  }

  weapon.update(clock.elapsedTime, deltaTime, walking);
  renderer.render(scene, camera);
}

animate();

// Release controls and dispose of renderer resources when the page closes.
window.addEventListener('beforeunload', () => {
  sound.dispose();
  enemies.dispose();
  player.dispose();
  weapon.dispose();
  renderer.dispose();
  bulletHoleGeometry.dispose();
  bulletHoleMaterial.dispose();
},
 { once: true });