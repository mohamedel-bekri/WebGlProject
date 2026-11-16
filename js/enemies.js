import * as THREE from 'three';

const ENEMY_HEIGHT = 1.75;
const ENEMY_RADIUS = 0.42;

const SPAWN_POINTS = [
  {
    start: new THREE.Vector3(-11, 0, -9),
    waypoints: [new THREE.Vector3(-11, 0, -9), new THREE.Vector3(-4, 0, -9), new THREE.Vector3(-4, 0, -2)],
  },
  {
    start: new THREE.Vector3(11, 0, -9),
    waypoints: [new THREE.Vector3(11, 0, -9), new THREE.Vector3(5, 0, -9), new THREE.Vector3(11, 0, -4)],
  },
  {
    start: new THREE.Vector3(-11, 0, 8),
    waypoints: [new THREE.Vector3(-11, 0, 8), new THREE.Vector3(-6, 0, 2), new THREE.Vector3(-11, 0, 1)],
  },
  {
    start: new THREE.Vector3(0, 0, -4),
    waypoints: [new THREE.Vector3(-3, 0, -6), new THREE.Vector3(3, 0, -6)],
  },
  {
    start: new THREE.Vector3(11, 0, 2),
    waypoints: [new THREE.Vector3(11, 0, 2), new THREE.Vector3(6, 0, -2), new THREE.Vector3(11, 0, -4)],
  },
  {
    start: new THREE.Vector3(0, 0, 4),
    waypoints: [new THREE.Vector3(-3, 0, 5), new THREE.Vector3(3, 0, 5)],
  },
];

function buildEnemyMesh(type, materials) {
  const root = new THREE.Group();

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.85, 0.38), materials.body);
  torso.position.y = 1.05;
  torso.castShadow = true;
  torso.receiveShadow = true;
  root.add(torso);

  if (type === 'shooter') {
    const leftPad = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.24, 0.44), materials.armor);
    leftPad.position.set(-0.42, 0.31, 0);
    leftPad.castShadow = true;
    torso.add(leftPad);

    const rightPad = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.24, 0.44), materials.armor);
    rightPad.position.set(0.42, 0.31, 0);
    rightPad.castShadow = true;
    torso.add(rightPad);
  }

  const legs = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.65, 0.32), materials.limbs);
  legs.position.y = 0.325;
  legs.castShadow = true;
  legs.receiveShadow = true;
  root.add(legs);

  const head = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.38, 0.38), materials.head);
  head.position.y = 1.68;
  head.castShadow = true;
  root.add(head);

  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.1, 0.05), materials.visorIdle);
  visor.position.set(0, 1.7, 0.18);
  root.add(visor);

  // --- Barre de vie flottante 3D au-dessus de la tête ---
  const hpGroup = new THREE.Group();
  hpGroup.position.set(0, 2.12, 0);

  const hpBg = new THREE.Mesh(new THREE.PlaneGeometry(0.84, 0.11), materials.hpBg);
  hpGroup.add(hpBg);

  const hpFillMaterial = new THREE.MeshBasicMaterial({ color: 0x4caf50, side: THREE.DoubleSide });
  const hpFill = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.075), hpFillMaterial);
  hpFill.position.z = 0.005;
  hpGroup.add(hpFill);
  root.add(hpGroup);

  const bodyHitbox = new THREE.Mesh(
    new THREE.CylinderGeometry(ENEMY_RADIUS, ENEMY_RADIUS, 1.45, 10),
    new THREE.MeshBasicMaterial({ visible: false }),
  );
  bodyHitbox.position.y = 0.725;
  root.add(bodyHitbox);

  const headHitbox = new THREE.Mesh(
    new THREE.SphereGeometry(0.28, 8, 8),
    new THREE.MeshBasicMaterial({ visible: false }),
  );
  headHitbox.position.y = 1.68;
  root.add(headHitbox);

  return { root, torso, legs, head, visor, hpGroup, hpFill, hpFillMaterial, bodyHitbox, headHitbox };
}

export function createEnemies(scene, solidObjects, sound = null) {
  const solids = solidObjects.map((object) => new THREE.Box3().setFromObject(object));

  const sharedMaterials = {
    limbs: new THREE.MeshStandardMaterial({ color: 0x2c302e, roughness: 0.85 }),
    head: new THREE.MeshStandardMaterial({ color: 0x454a47, roughness: 0.7 }),
    armor: new THREE.MeshStandardMaterial({ color: 0x253545, metalness: 0.4, roughness: 0.5 }),
    visorIdle: new THREE.MeshBasicMaterial({ color: 0x55cc77 }),
    visorAlert: new THREE.MeshBasicMaterial({ color: 0xff3b30 }),
    hpBg: new THREE.MeshBasicMaterial({ color: 0x171a18, side: THREE.DoubleSide }),
    laser: new THREE.LineBasicMaterial({ color: 0xff2a2a }),
    projectile: new THREE.MeshBasicMaterial({ color: 0xffaa00 }),
  };

  const projectileGeometry = new THREE.SphereGeometry(0.11, 8, 8);
  const projectiles = [];

  const list = [];
  const hitboxes = [];
  const raycaster = new THREE.Raycaster();

  const eyePos = new THREE.Vector3();
  const toPlayer = new THREE.Vector3();
  const forward = new THREE.Vector3();
  const testCenter = new THREE.Vector3();
  const testSize = new THREE.Vector3(ENEMY_RADIUS * 2, ENEMY_HEIGHT - 0.05, ENEMY_RADIUS * 2);
  const testBox = new THREE.Box3();

  let currentWave = 1;
  let nextWaveDelay = 0;

  function collidesAt(x, z) {
    testCenter.set(x, ENEMY_HEIGHT / 2 + 0.02, z);
    testBox.setFromCenterAndSize(testCenter, testSize);
    return solids.some((box) => testBox.intersectsBox(box));
  }

  function clearCurrentEnemies() {
    while (list.length > 0) {
      const enemy = list.pop();
      scene.remove(enemy.root);
      if (enemy.laserLine) {
        scene.remove(enemy.laserLine);
        enemy.laserLine.geometry.dispose();
      }
      enemy.bodyMaterial.dispose();
      enemy.hpFillMaterial.dispose();
    }
    hitboxes.length = 0;
  }

  function spawnWave(waveNumber) {
    clearCurrentEnemies();
    currentWave = waveNumber;

    const count = Math.min(3 + waveNumber, 8);
    const speedMultiplier = 1 + Math.min((waveNumber - 1) * 0.05, 0.4);

    for (let i = 0; i < count; i++) {
      const cfg = SPAWN_POINTS[i % SPAWN_POINTS.length];
      const isShooter = waveNumber === 1 ? i % 2 === 1 : i % 3 !== 0;
      const type = isShooter ? 'shooter' : 'rusher';
      const baseColor = isShooter ? 0x35587a : 0x7a3b32;

      const bodyMaterial = new THREE.MeshStandardMaterial({ color: baseColor, roughness: 0.75 });
      const parts = buildEnemyMesh(type, { ...sharedMaterials, body: bodyMaterial });
      parts.root.position.copy(cfg.start);
      scene.add(parts.root);

      let laserLine = null;
      if (isShooter) {
        const laserGeo = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(),
          new THREE.Vector3(),
        ]);
        laserLine = new THREE.Line(laserGeo, sharedMaterials.laser);
        laserLine.visible = false;
        laserLine.frustumCulled = false;
        scene.add(laserLine);
      }

      const enemy = {
        id: i,
        type,
        baseColor,
        ...parts,
        laserLine,
        bodyMaterial,
        waypoints: cfg.waypoints.map((wp) => wp.clone()),
        waypointIndex: 0,
        health: isShooter ? 120 : 100,
        maxHealth: isShooter ? 120 : 100,
        alive: true,
        deathTimer: 0, // Temps restant pour l'animation de chute
        walkPhase: Math.random() * Math.PI * 2,
        state: 'PATROL',
        speed: (isShooter ? 2.1 : 3.2) * speedMultiplier,
        detectionRange: isShooter ? 22 : 18,
        hearingRange: 14,
        fovCos: Math.cos(THREE.MathUtils.degToRad(65)),
        alertTimer: 0,
        attackCooldown: 0,
        aimTimer: 0,
        hitFlashTimer: 0,
      };

      parts.bodyHitbox.userData.enemy = enemy;
      parts.bodyHitbox.userData.isHead = false;
      parts.headHitbox.userData.enemy = enemy;
      parts.headHitbox.userData.isHead = true;

      hitboxes.push(parts.bodyHitbox, parts.headHitbox);
      list.push(enemy);
    }

    return count;
  }

  function getAliveCount() {
    let count = 0;
    for (const enemy of list) {
      if (enemy.alive) count++;
    }
    return count;
  }

  function canSeePlayer(enemy, playerPosition) {
    eyePos.copy(enemy.root.position).setY(1.68);
    toPlayer.subVectors(playerPosition, eyePos);
    const distance = toPlayer.length();

    if (distance > enemy.detectionRange) return false;

    toPlayer.normalize();
    forward.set(0, 0, 1).applyQuaternion(enemy.root.quaternion);

    if (forward.dot(toPlayer) < enemy.fovCos) return false;

    raycaster.set(eyePos, toPlayer);
    raycaster.far = distance;
    const obstacles = raycaster.intersectObjects(solidObjects, false);

    return obstacles.length === 0;
  }

  function alertFromGunshot(playerPosition) {
    for (const enemy of list) {
      if (!enemy.alive) continue;
      if (enemy.root.position.distanceTo(playerPosition) <= enemy.hearingRange) {
        if (enemy.state === 'PATROL' && sound) sound.enemyAlert();
        enemy.state = 'CHASE';
        enemy.alertTimer = 4.0;
        enemy.visor.material = sharedMaterials.visorAlert;
      }
    }
  }

  function spawnEnemyProjectile(origin, targetPos) {
    if (sound) sound.enemyLaserShot();
    const mesh = new THREE.Mesh(projectileGeometry, sharedMaterials.projectile);
    mesh.position.copy(origin);
    scene.add(mesh);

    const velocity = new THREE.Vector3()
      .subVectors(targetPos, origin)
      .normalize()
      .multiplyScalar(14);

    projectiles.push({ mesh, velocity, life: 2.5 });
  }

  function updateProjectiles(deltaTime, playerPosition, onPlayerHit) {
    for (let i = projectiles.length - 1; i >= 0; i--) {
      const proj = projectiles[i];
      proj.life -= deltaTime;

      const step = proj.velocity.clone().multiplyScalar(deltaTime);
      const nextPos = proj.mesh.position.clone().add(step);

      const hitWall = solids.some((box) => box.containsPoint(nextPos));
      const hitPlayer = nextPos.distanceTo(playerPosition) < 0.65;

      if (hitPlayer) {
        if (onPlayerHit) onPlayerHit(20);
        scene.remove(proj.mesh);
        projectiles.splice(i, 1);
      } else if (hitWall || proj.life <= 0) {
        scene.remove(proj.mesh);
        projectiles.splice(i, 1);
      } else {
        proj.mesh.position.copy(nextPos);
      }
    }
  }

  function clearProjectiles() {
    while (projectiles.length > 0) {
      scene.remove(projectiles.pop().mesh);
    }
  }

  function moveTowards(enemy, targetPos, speed, deltaTime) {
    const dx = targetPos.x - enemy.root.position.x;
    const dz = targetPos.z - enemy.root.position.z;
    const dist = Math.hypot(dx, dz);
    if (dist < 0.05) return false;

    const dirX = dx / dist;
    const dirZ = dz / dist;

    const targetAngle = Math.atan2(dirX, dirZ);
    const currentAngle = enemy.root.rotation.y;
    const diff = Math.atan2(Math.sin(targetAngle - currentAngle), Math.cos(targetAngle - currentAngle));
    enemy.root.rotation.y += diff * Math.min(1, deltaTime * 8);

    const step = speed * deltaTime;
    const nextX = enemy.root.position.x + dirX * step;
    if (!collidesAt(nextX, enemy.root.position.z)) {
      enemy.root.position.x = nextX;
    }

    const nextZ = enemy.root.position.z + dirZ * step;
    if (!collidesAt(enemy.root.position.x, nextZ)) {
      enemy.root.position.z = nextZ;
    }

    return true;
  }

  function update(deltaTime, playerPosition, onPlayerHit, onWaveStarted) {
    updateProjectiles(deltaTime, playerPosition, onPlayerHit);

    if (getAliveCount() === 0) {
      nextWaveDelay += deltaTime;
      if (nextWaveDelay >= 2.5) {
        nextWaveDelay = 0;
        const spawnedCount = spawnWave(currentWave + 1);
        if (onWaveStarted) onWaveStarted(currentWave, spawnedCount);
      }
    }

    for (const enemy of list) {
      // Animation de chute quand l'ennemi vient d'être éliminé
      if (!enemy.alive) {
        if (enemy.deathTimer > 0) {
          enemy.deathTimer -= deltaTime;
          const progress = 1 - Math.max(0, enemy.deathTimer) / 0.7;
          enemy.root.rotation.x = -progress * (Math.PI / 2);
          enemy.root.position.y = -progress * 0.25;
          if (enemy.deathTimer <= 0) {
            enemy.root.visible = false;
          }
        }
        continue;
      }

      // Orienter la barre de vie 3D toujours face au joueur
      enemy.hpGroup.lookAt(playerPosition.x, enemy.root.position.y + 2.12, playerPosition.z);

      if (enemy.hitFlashTimer > 0) {
        enemy.hitFlashTimer -= deltaTime;
        if (enemy.hitFlashTimer <= 0) {
          enemy.bodyMaterial.color.setHex(enemy.baseColor);
        }
      }

      if (enemy.attackCooldown > 0) enemy.attackCooldown -= deltaTime;

      const seesPlayer = canSeePlayer(enemy, playerPosition);

      if (seesPlayer) {
        if (enemy.state === 'PATROL' && sound) sound.enemyAlert();
        enemy.state = 'CHASE';
        enemy.alertTimer = 3.5;
        enemy.visor.material = sharedMaterials.visorAlert;
      } else if (enemy.alertTimer > 0) {
        enemy.alertTimer -= deltaTime;
        if (enemy.alertTimer <= 0) {
          enemy.state = 'PATROL';
          enemy.aimTimer = 0;
          if (enemy.laserLine) enemy.laserLine.visible = false;
          enemy.visor.material = sharedMaterials.visorIdle;
        }
      }

      let isMoving = false;

      if (enemy.state === 'PATROL') {
        if (enemy.laserLine) enemy.laserLine.visible = false;
        const targetWaypoint = enemy.waypoints[enemy.waypointIndex];
        isMoving = moveTowards(enemy, targetWaypoint, enemy.speed * 0.55, deltaTime);

        if (enemy.root.position.distanceTo(targetWaypoint) < 0.4) {
          enemy.waypointIndex = (enemy.waypointIndex + 1) % enemy.waypoints.length;
        }
      } else if (enemy.state === 'CHASE') {
        const distToPlayer = Math.hypot(
          playerPosition.x - enemy.root.position.x,
          playerPosition.z - enemy.root.position.z,
        );

        if (enemy.type === 'rusher') {
          if (distToPlayer > 2.2) {
            isMoving = moveTowards(enemy, playerPosition, enemy.speed, deltaTime);
          } else {
            enemy.root.rotation.y = Math.atan2(
              playerPosition.x - enemy.root.position.x,
              playerPosition.z - enemy.root.position.z,
            );
            if (enemy.attackCooldown <= 0) {
              enemy.attackCooldown = 1.1;
              if (onPlayerHit) onPlayerHit(15);
            }
          }
        }

        if (enemy.type === 'shooter') {
          enemy.root.rotation.y = Math.atan2(
            playerPosition.x - enemy.root.position.x,
            playerPosition.z - enemy.root.position.z,
          );

          if (!seesPlayer || distToPlayer > 12) {
            enemy.aimTimer = 0;
            if (enemy.laserLine) enemy.laserLine.visible = false;
            isMoving = moveTowards(enemy, playerPosition, enemy.speed, deltaTime);
          } else if (enemy.attackCooldown <= 0) {
            enemy.aimTimer += deltaTime;
            const muzzlePos = enemy.root.position.clone().setY(1.45);
            const targetAim = playerPosition.clone().setY(playerPosition.y - 0.25);

            if (enemy.laserLine) {
              enemy.laserLine.visible = true;
              const positions = enemy.laserLine.geometry.attributes.position.array;
              positions[0] = muzzlePos.x;
              positions[1] = muzzlePos.y;
              positions[2] = muzzlePos.z;
              positions[3] = targetAim.x;
              positions[4] = targetAim.y;
              positions[5] = targetAim.z;
              enemy.laserLine.geometry.attributes.position.needsUpdate = true;
            }

            if (enemy.aimTimer >= 1.1) {
              spawnEnemyProjectile(muzzlePos, targetAim);
              enemy.aimTimer = 0;
              enemy.attackCooldown = 2.0;
              if (enemy.laserLine) enemy.laserLine.visible = false;
            }
          }
        }
      }

      // Animation procédurale de marche (balancement du torse et de la tête)
      if (isMoving) {
        enemy.walkPhase += deltaTime * enemy.speed * 3.5;
        const bob = Math.abs(Math.sin(enemy.walkPhase)) * 0.05;
        enemy.torso.position.y = 1.05 + bob;
        enemy.torso.rotation.z = Math.sin(enemy.walkPhase) * 0.06;
        enemy.head.position.y = 1.68 + bob;
      } else {
        enemy.torso.position.y = 1.05;
        enemy.torso.rotation.z = 0;
        enemy.head.position.y = 1.68;
      }
    }
  }

  function damage(enemy, amount) {
    if (!enemy || !enemy.alive) return false;

    enemy.health = Math.max(0, enemy.health - amount);
    enemy.state = 'CHASE';
    enemy.alertTimer = 5.0;
    enemy.visor.material = sharedMaterials.visorAlert;
    enemy.bodyMaterial.color.setHex(0xffffff);
    enemy.hitFlashTimer = 0.08;

    // Mise à jour de la barre de vie 3D au-dessus de l'ennemi
    const ratio = enemy.health / enemy.maxHealth;
    enemy.hpFill.scale.x = Math.max(0.001, ratio);
    enemy.hpFill.position.x = -(1 - ratio) * 0.4;
    if (ratio > 0.5) enemy.hpFillMaterial.color.setHex(0x4caf50);
    else if (ratio > 0.25) enemy.hpFillMaterial.color.setHex(0xf59e0b);
    else enemy.hpFillMaterial.color.setHex(0xef4444);

    if (enemy.health <= 0) {
      enemy.alive = false;
      enemy.deathTimer = 0.7; // Déclenche l'animation de chute en arrière
      enemy.hpGroup.visible = false;
      if (enemy.laserLine) enemy.laserLine.visible = false;
      return true;
    }
    return false;
  }

  function reset() {
    clearProjectiles();
    nextWaveDelay = 0;
    return spawnWave(1);
  }

  function dispose() {
    clearProjectiles();
    clearCurrentEnemies();
    projectileGeometry.dispose();
    Object.values(sharedMaterials).forEach((mat) => mat.dispose());
  }

  spawnWave(1);

  return {
    list,
    hitboxes,
    getWave: () => currentWave,
    getAliveCount,
    update,
    damage,
    alertFromGunshot,
    reset,
    dispose,
  };
}