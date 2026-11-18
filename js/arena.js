import * as THREE from 'three';

export function createArena(scene) {
  const solids = [];
  const targetMeshes = [];
  const floorMaterial = new THREE.MeshStandardMaterial({ color: 0x555a56, roughness: 0.9 });
  const wallMaterial = new THREE.MeshStandardMaterial({ color: 0x696e68, roughness: 0.9 });
  const crateMaterials = [
    new THREE.MeshStandardMaterial({ color: 0x625744, roughness: 0.85 }),
    new THREE.MeshStandardMaterial({ color: 0x515a50, roughness: 0.85 }),
    new THREE.MeshStandardMaterial({ color: 0x454a47, roughness: 0.85 }),
  ];

  function addBox(width, height, depth, x, y, z, material) {
    const box = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
    box.position.set(x, y, z);
    box.castShadow = true;
    box.receiveShadow = true;
    scene.add(box);
    solids.push(box);
    return box;
  }

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(30, 24), floorMaterial);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  addBox(30, 4, 0.6, 0, 2, -12, wallMaterial);
  addBox(30, 4, 0.6, 0, 2, 12, wallMaterial);
  addBox(0.6, 4, 24, -15, 2, 0, wallMaterial);
  addBox(0.6, 4, 24, 15, 2, 0, wallMaterial);

  addBox(3.2, 1.2, 2, -9, 0.6, -6, crateMaterials[0]);
  addBox(3.2, 1.2, 2, 9, 0.6, 6, crateMaterials[0]);
  addBox(2.5, 1.4, 2.5, 9, 0.7, -6, crateMaterials[1]);
  addBox(2.5, 1.4, 2.5, -9, 0.7, 6, crateMaterials[1]);
  addBox(3, 1.1, 1.8, 0, 0.55, -8, crateMaterials[2]);
  addBox(3, 1.1, 1.8, 0, 0.55, 8, crateMaterials[2]);
  addBox(2, 1.5, 2, -5, 0.75, 0, crateMaterials[0]);
  addBox(2, 1.5, 2, 5, 0.75, 0, crateMaterials[1]);
  addBox(1.4, 3.2, 1.4, -2.5, 1.6, -3.5, wallMaterial);
  addBox(1.4, 3.2, 1.4, 2.5, 1.6, 3.5, wallMaterial);

  const laneBaseMaterial = new THREE.MeshStandardMaterial({ color: 0x484e49, roughness: 0.88 });
  const laneLineMaterial = new THREE.MeshStandardMaterial({ color: 0x9a7948, roughness: 0.8 });
  for (const laneX of [-8, 0, 8]) {
    const lane = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 9.5), laneBaseMaterial);
    lane.rotation.x = -Math.PI / 2;
    lane.position.set(laneX, 0.012, -5.6);
    lane.receiveShadow = true;
    scene.add(lane);

    for (const side of [-1, 1]) {
      const line = new THREE.Mesh(new THREE.PlaneGeometry(0.07, 9.5), laneLineMaterial);
      line.rotation.x = -Math.PI / 2;
      line.position.set(laneX + side * 1.6, 0.02, -5.6);
      scene.add(line);
    }

    const stopLine = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 0.12), laneLineMaterial);
    stopLine.rotation.x = -Math.PI / 2;
    stopLine.position.set(laneX, 0.021, -10.35);
    scene.add(stopLine);
  }

  const targetBacking = new THREE.MeshStandardMaterial({ color: 0x3b413d, roughness: 0.8 });
  const targetMaterials = [
    new THREE.MeshStandardMaterial({ color: 0xc6c2b3, side: THREE.DoubleSide, roughness: 0.75 }),
    new THREE.MeshStandardMaterial({ color: 0x9a5545, side: THREE.DoubleSide, roughness: 0.75 }),
    new THREE.MeshStandardMaterial({ color: 0xd0c9b7, side: THREE.DoubleSide, roughness: 0.75 }),
    new THREE.MeshStandardMaterial({ color: 0x9a5545, side: THREE.DoubleSide, roughness: 0.75 }),
    new THREE.MeshStandardMaterial({ color: 0x353a36, side: THREE.DoubleSide, roughness: 0.75 }),
  ];
  const targetRadii = [1, 0.8, 0.59, 0.39, 0.17];
  const targetXPositions = [-8, 0, 8];

  targetXPositions.forEach((targetX) => {
    addBox(2.8, 3.25, 0.18, targetX, 2.05, -11.48, targetBacking);

    targetRadii.forEach((radius, ringIndex) => {
      const ring = new THREE.Mesh(
        new THREE.CircleGeometry(radius, 48),
        targetMaterials[ringIndex],
      );
      ring.position.set(targetX, 2.25, -11.365 + ringIndex * 0.006);
      ring.userData.isTarget = true;
      scene.add(ring);
      targetMeshes.push(ring);
    });
  });

  scene.add(new THREE.AmbientLight(0xffffff, 1.1));
  const sunlight = new THREE.DirectionalLight(0xffffff, 2.2);
  sunlight.position.set(-8, 16, 10);
  sunlight.castShadow = true;
  sunlight.shadow.mapSize.set(2048, 2048);
  sunlight.shadow.camera.left = -20;
  sunlight.shadow.camera.right = 20;
  sunlight.shadow.camera.top = 20;
  sunlight.shadow.camera.bottom = -20;
  sunlight.shadow.camera.near = 1;
  sunlight.shadow.camera.far = 45;
  sunlight.shadow.bias = -0.0005;
  scene.add(sunlight);

  return { solids, targets: targetMeshes, shootables: [...solids, ...targetMeshes], sunlight };
}
