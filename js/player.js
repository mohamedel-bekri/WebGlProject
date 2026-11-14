import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

const PLAYER_HEIGHT = 1.7;
const PLAYER_WIDTH = 0.7;

// Set up the camera controls, movement keys, and reusable collision boxes.
export function createPlayer(camera, canvas, solidObjects) {
  const controls = new PointerLockControls(camera, canvas);
  const solids = solidObjects.map((object) => {
    const box = new THREE.Box3().setFromObject(object);
    return {
      box,
      center: box.getCenter(new THREE.Vector3()),
      size: box.getSize(new THREE.Vector3()),
    };
  });
  const player = {
    controls,
    camera,
    active: false,
    keys: new Set(),
    speed: 5,
    height: PLAYER_HEIGHT,
    verticalSpeed: 0,
    grounded: true,
    forward: new THREE.Vector3(),
    right: new THREE.Vector3(),
    movement: new THREE.Vector3(),
    up: new THREE.Vector3(0, 1, 0),
    boxSize: new THREE.Vector3(PLAYER_WIDTH, PLAYER_HEIGHT - 0.02, PLAYER_WIDTH),
    boxCenter: new THREE.Vector3(),
    testBox: new THREE.Box3(),
    solids,
  };

  camera.position.set(6, player.height, 10);
  camera.lookAt(6, player.height, 0);

  function onKeyDown(event) {
    if (!player.active) return;
    if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space'].includes(event.code)) {
      event.preventDefault();
    }

    player.keys.add(event.code);
    if (event.code === 'Space' && player.grounded && !event.repeat) {
      player.verticalSpeed = 6.5;
      player.grounded = false;
    }
  }

  function onKeyUp(event) {
    player.keys.delete(event.code);
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  player.dispose = () => {
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    controls.dispose();
  };

  return player;
}

function collidesAt(player, x, eyeY, z) {
  player.boxCenter.set(x, eyeY - player.height / 2, z);
  player.boxCenter.y += 0.01;
  player.testBox.setFromCenterAndSize(player.boxCenter, player.boxSize);
  return player.solids.some((solid) => player.testBox.intersectsBox(solid.box));
}

// Move, jump, and resolve collisions. Delta time keeps movement frame-rate independent.
export function updatePlayer(player, deltaTime) {
  if (!player.active) return false;

  const position = player.camera.position;
  player.forward.set(0, 0, -1).applyQuaternion(player.camera.quaternion);
  player.forward.y = 0;
  player.forward.normalize();
  player.right.crossVectors(player.forward, player.up).normalize();
  player.movement.set(0, 0, 0);

  if (player.keys.has('KeyW')) player.movement.add(player.forward);
  if (player.keys.has('KeyS')) player.movement.sub(player.forward);
  if (player.keys.has('KeyD')) player.movement.add(player.right);
  if (player.keys.has('KeyA')) player.movement.sub(player.right);

  const walking = player.movement.lengthSq() > 0;
  if (walking) {
    player.movement.normalize().multiplyScalar(player.speed * deltaTime);

    // Resolve X and Z separately so the player can slide along a wall.
    const nextX = position.x + player.movement.x;
    if (!collidesAt(player, nextX, position.y, position.z)) position.x = nextX;
    const nextZ = position.z + player.movement.z;
    if (!collidesAt(player, position.x, position.y, nextZ)) position.z = nextZ;
  }

  // Apply gravity and detect landing on the floor or a box obstacle.
  const oldY = position.y;
  let nextY = oldY + (player.verticalSpeed - 18 * deltaTime) * deltaTime;
  player.verticalSpeed -= 18 * deltaTime;
  player.grounded = false;

  if (player.verticalSpeed <= 0) {
    const oldBottom = oldY - player.height;
    const nextBottom = nextY - player.height;
    for (const solid of player.solids) {
      const overlapsXZ = Math.abs(position.x - solid.center.x) < PLAYER_WIDTH / 2 + solid.size.x / 2
        && Math.abs(position.z - solid.center.z) < PLAYER_WIDTH / 2 + solid.size.z / 2;
      if (overlapsXZ && oldBottom >= solid.box.max.y - 0.02 && nextBottom <= solid.box.max.y) {
        nextY = solid.box.max.y + player.height;
        player.verticalSpeed = 0;
        player.grounded = true;
      }
    }
  } else {
    const oldTop = oldY;
    const nextTop = nextY;
    for (const solid of player.solids) {
      const overlapsXZ = position.x + PLAYER_WIDTH / 2 > solid.box.min.x && position.x - PLAYER_WIDTH / 2 < solid.box.max.x
        && position.z + PLAYER_WIDTH / 2 > solid.box.min.z && position.z - PLAYER_WIDTH / 2 < solid.box.max.z;
      if (overlapsXZ && oldTop <= solid.box.min.y && nextTop >= solid.box.min.y) {
        nextY = solid.box.min.y;
        player.verticalSpeed = 0;
      }
    }
  }

  if (nextY <= player.height) {
    nextY = player.height;
    player.verticalSpeed = 0;
    player.grounded = true;
  }

  position.y = nextY;
  return walking;
}
