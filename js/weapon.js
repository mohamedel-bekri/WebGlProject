import * as THREE from 'three';

// Build a small geometric gun and attach it to the first-person camera.
export function createWeapon(camera, onAmmoChanged) {
  const root = new THREE.Group();
  root.position.set(0.34, -0.29, -0.55);
  root.rotation.set(-0.04, -0.08, -0.02);
  camera.add(root);

  const metal = new THREE.MeshStandardMaterial({ color: 0x454b48, metalness: 0.55, roughness: 0.48 });
  const polymer = new THREE.MeshStandardMaterial({ color: 0x303633, roughness: 0.78 });
  const sightGlass = new THREE.MeshStandardMaterial({ color: 0x777d77, metalness: 0.35, roughness: 0.35 });

  function addBox(width, height, depth, x, y, z, material) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
    mesh.position.set(x, y, z);
    mesh.frustumCulled = false;
    root.add(mesh);
    return mesh;
  }

  // Receiver, handguard, barrel, stock, magazine, grip, rail, and sight.
  addBox(0.16, 0.15, 0.38, 0, 0, 0, metal);
  addBox(0.13, 0.11, 0.27, 0, 0.01, -0.28, polymer);
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.027, 0.027, 0.42, 10), metal);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.035, -0.59);
  root.add(barrel);
  addBox(0.14, 0.13, 0.2, 0, -0.005, 0.27, polymer);
  addBox(0.12, 0.2, 0.13, 0, -0.17, 0.03, metal);
  addBox(0.1, 0.18, 0.12, 0, -0.15, 0.19, polymer);
  addBox(0.07, 0.025, 0.28, 0, 0.095, -0.16, metal);
  addBox(0.08, 0.09, 0.1, 0, 0.15, -0.1, metal);
  addBox(0.045, 0.035, 0.018, 0, 0.15, -0.155, sightGlass);

  const flash = new THREE.Group();
  flash.position.set(0, 0.035, -0.83);
  const flashShape = new THREE.Mesh(
    new THREE.ConeGeometry(0.065, 0.18, 6),
    new THREE.MeshBasicMaterial({ color: 0xe0a34d }),
  );
  flashShape.rotation.x = -Math.PI / 2;
  flash.add(flashShape);
  const flashLight = new THREE.PointLight(0xffc16c, 2, 2);
  flash.add(flashLight);
  flash.visible = false;
  root.add(flash);

  const weapon = {
    root,
    ammo: 30,
    recoil: 0,
    nextShotTime: 0,
    flashUntil: 0,
    flash,
    onAmmoChanged,
  };

  weapon.fire = (time) => {
    if (weapon.ammo <= 0 || time < weapon.nextShotTime) return false;
    weapon.ammo -= 1;
    weapon.nextShotTime = time + 0.14;
    weapon.recoil = 1;
    weapon.flash.visible = true;
    weapon.flashUntil = time + 0.05;
    weapon.onAmmoChanged(weapon.ammo);
    return true;
  };

  weapon.reload = () => {
    weapon.ammo = 30;
    weapon.onAmmoChanged(weapon.ammo);
  };

  weapon.update = (time, deltaTime, walking) => {
    weapon.recoil *= Math.exp(-16 * deltaTime);
    weapon.root.position.z = -0.55 + weapon.recoil * 0.07;
    weapon.root.rotation.x = -0.04 + weapon.recoil * 0.1;
    weapon.root.position.y = -0.29 + (walking ? Math.sin(time * 10) * 0.008 : 0);
    if (time >= weapon.flashUntil) weapon.flash.visible = false;
  };

  weapon.dispose = () => {
    camera.remove(root);
    root.traverse((object) => {
      object.geometry?.dispose();
      if (Array.isArray(object.material)) object.material.forEach((material) => material.dispose());
      else object.material?.dispose();
    });
  };

  return weapon;
}
