import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

const roomColors = [0xdbeafe, 0xede9fe, 0xdcfce7, 0xfef3c7, 0xfce7f3, 0xe0f2fe, 0xf3e8ff];

export default function ConstructionModel3D({ design }) {
  const mountRef = useRef(null);
  const roofRef = useRef(null);
  const [roofVisible, setRoofVisible] = useState(true);
  const [furnitureVisible, setFurnitureVisible] = useState(true);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf8fafc);
    scene.fog = new THREE.Fog(0xf8fafc, 75, 150);

    const camera = new THREE.PerspectiveCamera(42, mount.clientWidth / mount.clientHeight, 0.1, 300);
    const modelSpan = Math.max(design.width, design.length);
    camera.position.set(design.buildW / 2 + modelSpan * 0.78, design.buildD / 2 + modelSpan * 0.9, modelSpan * 0.72 + design.floors * 7);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.target.set(design.buildW / 2, design.buildD / 2, design.floors * 4);
    controls.minDistance = Math.max(16, modelSpan * 0.45);
    controls.maxDistance = Math.max(105, modelSpan * 2.4);
    controls.maxPolarAngle = Math.PI / 2.02;

    scene.add(new THREE.HemisphereLight(0xffffff, 0x94a3b8, 2.3));
    const sun = new THREE.DirectionalLight(0xffffff, 3.2);
    sun.position.set(-25, -30, 55);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    scene.add(sun);

    const site = new THREE.Mesh(
      new THREE.BoxGeometry(design.width + 12, design.length + 12, 0.6),
      new THREE.MeshStandardMaterial({ color: 0xc7d2a6, roughness: 1 }),
    );
    site.position.set(design.buildW / 2, design.buildD / 2, -0.5);
    site.receiveShadow = true;
    scene.add(site);

    const drive = new THREE.Mesh(
      new THREE.BoxGeometry(Math.min(11, design.buildW * 0.4), 8, 0.15),
      new THREE.MeshStandardMaterial({ color: 0xbfc6cf, roughness: 0.9 }),
    );
    drive.position.set(design.buildW * 0.72, -4, -0.12);
    drive.receiveShadow = true;
    scene.add(drive);

    const wallMaterial = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.82 });
    const internalMaterial = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.86 });
    const frameMaterial = new THREE.MeshStandardMaterial({ color: 0x1e40af, roughness: 0.45 });
    const glassMaterial = new THREE.MeshPhysicalMaterial({ color: 0x93c5fd, transparent: true, opacity: 0.62, roughness: 0.08, metalness: 0.05 });
    const doorMaterial = new THREE.MeshStandardMaterial({ color: 0x7c3aed, roughness: 0.5 });
    const roofMaterial = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.72 });
    const woodMaterial = new THREE.MeshStandardMaterial({ color: 0x9a6a45, roughness: 0.72 });
    const fabricMaterial = new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.92 });
    const mattressMaterial = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 1 });
    const fixtureMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.35 });
    const applianceMaterial = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.3, metalness: 0.35 });

    const addBox = (w, d, h, x, y, z, material, parent = scene) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, d, h), material);
      mesh.position.set(x, y, z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    };
    const addCylinder = (radius, height, x, y, z, material, parent = scene) => {
      const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, 20), material);
      mesh.position.set(x, y, z);
      mesh.rotation.x = Math.PI / 2;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    };

    const house = new THREE.Group();
    scene.add(house);
    const furniture = new THREE.Group();
    furniture.visible = furnitureVisible;
    house.add(furniture);
    const wall = 0.5;
    const floorHeight = 9.5;
    addBox(design.buildW + 1.5, design.buildD + 1.5, 1.1, design.buildW / 2, design.buildD / 2, 0.1, new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.95 }), house);

    for (let floor = 0; floor < design.floors; floor += 1) {
      const base = floor * floorHeight;
      addBox(design.buildW, design.buildD, 0.45, design.buildW / 2, design.buildD / 2, base + 0.15, new THREE.MeshStandardMaterial({ color: 0xd4d4d8 }), house);

      design.rooms.forEach((room, index) => {
        addBox(room.w - 0.35, room.d - 0.35, 0.09, room.x + room.w / 2, room.y + room.d / 2, base + 0.42, new THREE.MeshStandardMaterial({ color: roomColors[index % roomColors.length], roughness: 0.95 }), house);
      });

      design.rooms.forEach((room) => {
        const cx = room.x + room.w / 2;
        const cy = room.y + room.d / 2;
        const name = room.name.toLowerCase();
        if (name.includes("bedroom")) {
          const bedW = Math.min(5.6, room.w * 0.58);
          const bedD = Math.min(6.7, room.d * 0.64);
          addBox(bedW, bedD, 0.7, cx, room.y + bedD / 2 + 0.7, base + 0.85, woodMaterial, furniture);
          addBox(bedW - 0.25, bedD - 0.25, 0.55, cx, room.y + bedD / 2 + 0.7, base + 1.45, mattressMaterial, furniture);
          addBox(bedW, 0.28, 3.2, cx, room.y + 0.65, base + 2, woodMaterial, furniture);
          addBox(bedW * 0.36, 1.05, 0.28, cx - bedW * 0.22, room.y + 1.35, base + 1.9, fixtureMaterial, furniture);
          addBox(bedW * 0.36, 1.05, 0.28, cx + bedW * 0.22, room.y + 1.35, base + 1.9, fixtureMaterial, furniture);
          addBox(Math.min(2, room.w * 0.2), 0.7, 6.6, room.x + 1.15, room.y + room.d - 0.65, base + 3.5, woodMaterial, furniture);
        } else if (name.includes("living") || name.includes("lounge")) {
          const sofaW = Math.min(7, room.w * 0.55);
          addBox(sofaW, 2.2, 1.25, room.x + sofaW / 2 + 0.8, room.y + 1.45, base + 1.05, fabricMaterial, furniture);
          addBox(sofaW, 0.45, 2.1, room.x + sofaW / 2 + 0.8, room.y + 0.5, base + 1.6, fabricMaterial, furniture);
          addBox(Math.min(3.6, room.w * 0.3), 1.8, 0.45, cx, cy, base + 1, woodMaterial, furniture);
          addBox(Math.min(5, room.w * 0.4), 0.55, 1.4, room.x + room.w - Math.min(5, room.w * 0.4) / 2 - 0.5, room.y + room.d - 0.55, base + 1.05, applianceMaterial, furniture);
        } else if (name.includes("kitchen")) {
          addBox(room.w - 1.1, 1.8, 3, cx, room.y + 1.05, base + 1.9, woodMaterial, furniture);
          addBox(1.8, Math.max(2, room.d - 2.8), 3, room.x + 1.05, room.y + room.d / 2 + 0.45, base + 1.9, woodMaterial, furniture);
          addBox(Math.min(2.4, room.w * 0.28), 1.45, 0.12, room.x + room.w - 2.1, room.y + 1, base + 3.45, applianceMaterial, furniture);
          addBox(2.1, 2, 6, room.x + room.w - 1.35, room.y + room.d - 1.25, base + 3.4, applianceMaterial, furniture);
        } else if (name.includes("dining")) {
          const tableW = Math.min(6, room.w * 0.62);
          const tableD = Math.min(3.2, room.d * 0.44);
          addBox(tableW, tableD, 0.35, cx, cy, base + 2.55, woodMaterial, furniture);
          [[-tableW / 2, 0], [tableW / 2, 0], [0, -tableD / 2], [0, tableD / 2]].forEach(([dx, dy]) => addBox(1.1, 1.1, 1.3, cx + dx * 0.78, cy + dy * 1.35, base + 1.25, fabricMaterial, furniture));
        } else if (name.includes("bath")) {
          addCylinder(0.72, 1.15, room.x + 1.15, room.y + 1.35, base + 1.05, fixtureMaterial, furniture);
          addBox(1.35, 0.65, 1.45, room.x + 1.15, room.y + 0.7, base + 1.55, fixtureMaterial, furniture);
          addBox(1.8, 1.25, 0.28, room.x + room.w - 1.2, room.y + 1, base + 2.75, fixtureMaterial, furniture);
          addBox(0.12, 2.2, 6.5, room.x + room.w - 1.25, room.y + room.d - 1.35, base + 3.7, glassMaterial, furniture);
        } else if (name.includes("study")) {
          addBox(Math.min(5, room.w * 0.6), 2, 0.3, cx, room.y + 1.2, base + 2.5, woodMaterial, furniture);
          addBox(1.5, 1.5, 1.3, cx, room.y + 3, base + 1.2, fabricMaterial, furniture);
        } else if (name.includes("court")) {
          addCylinder(0.8, 1.1, cx, cy, base + 0.95, new THREE.MeshStandardMaterial({ color: 0x8b5a2b }), furniture);
          addCylinder(1.55, 2.2, cx, cy, base + 2.6, new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 1 }), furniture);
        }
      });

      const openingRanges = [
        { start: 2.3, end: Math.min(6.3, design.buildW * 0.27), type: "window" },
        { start: Math.max(8, design.buildW * 0.47), end: Math.max(11.5, design.buildW * 0.47 + 3.5), type: "door" },
        { start: Math.max(16, design.buildW * 0.73), end: Math.min(design.buildW - 2, design.buildW * 0.88), type: "window" },
      ].filter((opening) => opening.end < design.buildW && opening.end > opening.start);
      let cursor = 0;
      openingRanges.forEach((opening) => {
        if (opening.start > cursor) addBox(opening.start - cursor, wall, floorHeight, cursor + (opening.start - cursor) / 2, 0, base + floorHeight / 2, wallMaterial, house);
        const openingWidth = opening.end - opening.start;
        if (opening.type === "window") {
          addBox(openingWidth, wall, 3, opening.start + openingWidth / 2, 0, base + 1.5, wallMaterial, house);
          addBox(openingWidth, wall, 2, opening.start + openingWidth / 2, 0, base + 8.5, wallMaterial, house);
          addBox(openingWidth - 0.3, 0.18, 3.9, opening.start + openingWidth / 2, -0.18, base + 5.15, glassMaterial, house);
          addBox(openingWidth, 0.18, 0.18, opening.start + openingWidth / 2, -0.28, base + 5.15, frameMaterial, house);
        } else {
          addBox(openingWidth, wall, 1.7, opening.start + openingWidth / 2, 0, base + 8.65, wallMaterial, house);
          addBox(openingWidth - 0.25, 0.2, 7.55, opening.start + openingWidth / 2, -0.2, base + 4, doorMaterial, house);
        }
        cursor = opening.end;
      });
      if (cursor < design.buildW) addBox(design.buildW - cursor, wall, floorHeight, cursor + (design.buildW - cursor) / 2, 0, base + floorHeight / 2, wallMaterial, house);

      addBox(design.buildW, wall, floorHeight, design.buildW / 2, design.buildD, base + floorHeight / 2, wallMaterial, house);
      addBox(wall, design.buildD, floorHeight, 0, design.buildD / 2, base + floorHeight / 2, wallMaterial, house);
      addBox(wall, design.buildD, floorHeight, design.buildW, design.buildD / 2, base + floorHeight / 2, wallMaterial, house);

      const horizontal = [...new Set(design.rooms.map((room) => room.y + room.d).filter((y) => y < design.buildD))];
      horizontal.forEach((y) => addBox(design.buildW, wall * 0.65, floorHeight, design.buildW / 2, y, base + floorHeight / 2, internalMaterial, house));
      design.rooms.filter((room) => room.x + room.w < design.buildW).forEach((room) => {
        addBox(wall * 0.65, room.d, floorHeight, room.x + room.w, room.y + room.d / 2, base + floorHeight / 2, internalMaterial, house);
      });

      if (floor < design.floors - 1) {
        const stairW = Math.min(6, design.buildW * 0.24);
        const stairD = Math.min(11, design.buildD * 0.34);
        const stairX = design.buildW - stairW / 2 - 0.8;
        const stairY = design.buildD - stairD / 2 - 0.8;
        for (let step = 0; step < 12; step += 1) {
          const depth = stairD / 12;
          addBox(stairW, depth, (floorHeight / 12) * (step + 1), stairX, stairY - stairD / 2 + depth * (step + 0.5), base + (floorHeight / 12) * (step + 1) / 2, new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.85 }), house);
        }
      }

      if (floor > 0) {
        const balconyW = Math.min(12, design.buildW * 0.48);
        const balconyD = 4;
        const balconyX = design.buildW / 2;
        addBox(balconyW, balconyD, 0.45, balconyX, -balconyD / 2, base + 0.1, new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.9 }), house);
        addBox(balconyW, 0.16, 3.2, balconyX, -balconyD, base + 1.8, glassMaterial, house);
        addBox(0.16, balconyD, 3.2, balconyX - balconyW / 2, -balconyD / 2, base + 1.8, glassMaterial, house);
        addBox(0.16, balconyD, 3.2, balconyX + balconyW / 2, -balconyD / 2, base + 1.8, glassMaterial, house);
        addBox(balconyW + 0.2, 0.18, 0.18, balconyX, -balconyD, base + 3.45, frameMaterial, house);
      }

      [[0, design.buildD * 0.33], [design.buildW, design.buildD * 0.33], [0, design.buildD * 0.72], [design.buildW, design.buildD * 0.72]].forEach(([x, y]) => {
        const pane = addBox(0.16, 4, 3.7, x + (x === 0 ? -0.18 : 0.18), y, base + 5.2, glassMaterial, house);
        pane.rotation.z = 0;
      });
    }

    const roof = addBox(design.buildW + 1.2, design.buildD + 1.2, 0.55, design.buildW / 2, design.buildD / 2, design.floors * floorHeight + 0.25, roofMaterial, house);
    roofRef.current = roof;
    roof.visible = roofVisible;

    const grid = new THREE.GridHelper(Math.max(design.width, design.length) + 12, 24, 0x7c3aed, 0xcbd5e1);
    grid.position.set(design.buildW / 2, design.buildD / 2, -0.15);
    scene.add(grid);

    const onResize = () => {
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };
    window.addEventListener("resize", onResize);

    let animationFrame;
    const render = () => {
      controls.update();
      renderer.render(scene, camera);
      animationFrame = requestAnimationFrame(render);
    };
    render();

    return () => {
      cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", onResize);
      controls.dispose();
      renderer.dispose();
      scene.traverse((object) => {
        object.geometry?.dispose();
        if (Array.isArray(object.material)) object.material.forEach((material) => material.dispose());
        else object.material?.dispose();
      });
      mount.replaceChildren();
    };
  }, [design, roofVisible, furnitureVisible]);

  const toggleRoof = () => {
    setRoofVisible((visible) => !visible);
  };

  const toggleFurniture = () => {
    setFurnitureVisible((visible) => !visible);
  };

  return (
    <div className="cd-live-model">
      <div className="cd-model-toolbar">
        <span>Drag to orbit · Scroll to zoom</span>
        <div><button onClick={toggleFurniture}>{furnitureVisible ? "Hide furniture" : "Show furniture"}</button><button onClick={toggleRoof}>{roofVisible ? "Hide roof" : "Show roof"}</button></div>
      </div>
      <div className="cd-webgl" ref={mountRef} />
      <div className="cd-model-legend"><span><i className="blue" /> Furniture</span><span><i className="purple" /> Entry</span><span><i className="green" /> Site</span><span><i className="white" /> Fixtures</span></div>
    </div>
  );
}
