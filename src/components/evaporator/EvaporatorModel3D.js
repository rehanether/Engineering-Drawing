import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";

const COLORS = {
  steel: 0xb9c4cf, dark: 0x243247, feed: 0x22a06b, vapor: 0xe45756,
  condensate: 0x2f80ed, product: 0x8b5cf6, floor: 0xe8edf3,
};

function cylinder(scene, radius, height, position, color = COLORS.steel) {
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, height, 32),
    new THREE.MeshStandardMaterial({ color, metalness: 0.65, roughness: 0.3 })
  );
  mesh.position.set(...position);
  scene.add(mesh);
  return mesh;
}

function box(scene, size, position, color = COLORS.dark) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(...size),
    new THREE.MeshStandardMaterial({ color, metalness: 0.35, roughness: 0.45 })
  );
  mesh.position.set(...position);
  scene.add(mesh);
  return mesh;
}

function vessel(scene, radius, height, position, color = COLORS.steel) {
  const body = cylinder(scene, radius, height, position, color);
  const material = body.material;
  const top = new THREE.Mesh(new THREE.ConeGeometry(radius, radius * 0.55, 32), material);
  top.position.set(position[0], position[1] + height / 2 + radius * 0.27, position[2]);
  scene.add(top);
  const bottom = new THREE.Mesh(new THREE.ConeGeometry(radius, radius * 0.45, 32), material);
  bottom.rotation.z = Math.PI;
  bottom.position.set(position[0], position[1] - height / 2 - radius * 0.22, position[2]);
  scene.add(bottom);
  [-height * .28, height * .28].forEach((offset) => {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(radius * 1.02, .035, 8, 32), new THREE.MeshStandardMaterial({ color: 0x6e7988, metalness: .8 }));
    ring.rotation.x = Math.PI / 2;
    ring.position.set(position[0], position[1] + offset, position[2]);
    scene.add(ring);
  });
  return body;
}

function valve(scene, position, color = 0xd8a52e) {
  const body = new THREE.Mesh(new THREE.SphereGeometry(.14, 16, 12), new THREE.MeshStandardMaterial({ color, metalness: .55 }));
  body.position.set(...position);
  scene.add(body);
  box(scene, [.05, .28, .05], [position[0], position[1] + .2, position[2]], 0x3c4656);
  box(scene, [.3, .04, .05], [position[0], position[1] + .34, position[2]], 0x3c4656);
}

function pipe(scene, points, color, radius = 0.08) {
  const curve = new THREE.CatmullRomCurve3(points.map(([x, y, z]) => new THREE.Vector3(x, y, z)));
  const mesh = new THREE.Mesh(
    new THREE.TubeGeometry(curve, 32, radius, 10, false),
    new THREE.MeshStandardMaterial({ color, metalness: 0.25, roughness: 0.35 })
  );
  scene.add(mesh);
  return mesh;
}

function pump(scene, position, color) {
  cylinder(scene, 0.28, 0.32, [position[0], position[1], position[2]], color).rotation.z = Math.PI / 2;
  box(scene, [0.45, 0.35, 0.35], [position[0] - 0.42, position[1], position[2]], COLORS.dark);
  cylinder(scene, .36, .08, [position[0] + .17, position[1], position[2]], 0x667487).rotation.z = Math.PI / 2;
  box(scene, [1.05, .08, .58], [position[0] - .18, position[1] - .23, position[2]], 0x536174);
}

function flange(scene, position, axis = "z", radius = .18) {
  const mesh = cylinder(scene, radius, .08, position, 0x697789);
  mesh.rotation[axis] = Math.PI / 2;
  return mesh;
}

function cadLine(scene, points, color = 0x35445a) {
  const geometry = new THREE.BufferGeometry().setFromPoints(points.map((point) => new THREE.Vector3(...point)));
  const object = new THREE.Line(geometry, new THREE.LineBasicMaterial({ color }));
  scene.add(object);
  return object;
}

function labelSprite(scene, text, position, color = "#182337", scale = 1) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 112;
  const context = canvas.getContext("2d");
  context.fillStyle = "rgba(255,255,255,.94)";
  context.strokeStyle = "#aab5c3";
  context.lineWidth = 3;
  context.fillRect(2, 2, 508, 108);
  context.strokeRect(2, 2, 508, 108);
  context.fillStyle = color;
  context.font = "700 38px Arial";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(text, 256, 58);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(canvas), transparent: true, depthTest: false }));
  sprite.position.set(...position);
  sprite.scale.set(2.5 * scale, .55 * scale, 1);
  scene.add(sprite);
}

function dimension(scene, start, end, text, labelPosition) {
  cadLine(scene, [start, end], 0x6c4cff);
  const tick = .16;
  cadLine(scene, [[start[0] - tick, start[1], start[2]], [start[0] + tick, start[1], start[2]]], 0x6c4cff);
  cadLine(scene, [[end[0] - tick, end[1], end[2]], [end[0] + tick, end[1], end[2]]], 0x6c4cff);
  labelSprite(scene, text, labelPosition, "#5636dd", .74);
}

export default function EvaporatorModel3D({ design }) {
  const mountRef = useRef(null);
  const [labels, setLabels] = useState(true);
  const [view, setView] = useState("iso");

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;
    const width = mount.clientWidth || 760;
    const height = Math.max(430, Math.min(590, width * 0.63));
    const capacityScale = Math.sqrt(design.inputs.capacityTph);
    const feedTankRadius = Math.max(.72, Math.min(1.3, Math.cbrt(design.geometry.feedTankM3) * .55));
    const condensateRadius = Math.max(.66, Math.min(1.2, Math.cbrt(design.geometry.condensateTankM3) * .52));
    const productRadius = Math.max(.62, Math.min(1.05, Math.cbrt(design.geometry.productTankM3) * .56));
    const processPipeRadius = .07 + capacityScale * .018;
    const vaporPipeRadius = .11 + capacityScale * .035;
    const spread = 1 + (design.inputs.capacityTph - 1) * .08;
    const px = (value) => value * spread;
    const effectCount = design.plantLayout?.bodyTags?.length || design.inputs.capacityTph;
    const effectSpacing = 2.15;
    const effectXs = Array.from({ length: effectCount }, (_, index) => (index - (effectCount - 1) / 2) * effectSpacing);
    const firstEffectX = effectXs[0];
    const lastEffectX = effectXs[effectXs.length - 1];
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf4f7fb);
    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
    const views = {
      iso: [12 + capacityScale * 1.5, 9 + capacityScale * .7, 15 + capacityScale * 1.6],
      front: [0, 4.3, 20 + capacityScale],
      side: [20 + capacityScale, 4.3, 0],
      top: [0, 22 + capacityScale, .01],
    };
    camera.position.set(...views[view]);
    if (view === "top") camera.up.set(0, 0, -1);
    camera.lookAt(0, 2.5, 0);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    mount.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight(0xffffff, 0x738096, 1.5));
    const sun = new THREE.DirectionalLight(0xffffff, 2.2);
    sun.position.set(6, 10, 8);
    sun.castShadow = true;
    scene.add(sun);

    const floor = new THREE.Mesh(
      new THREE.BoxGeometry(19 + effectCount * 1.35, 0.25, 11 + capacityScale),
      new THREE.MeshStandardMaterial({ color: COLORS.floor, roughness: 0.85 })
    );
    floor.position.y = -0.15;
    floor.receiveShadow = true;
    scene.add(floor);
    const grid = new THREE.GridHelper(19 + effectCount * 1.35, 40, 0xaab5c3, 0xd6dde7);
    grid.position.y = 0.01;
    scene.add(grid);

    const feedX = px(-7.2);
    const storageX = px(7.2);
    vessel(scene, feedTankRadius, 1.8 + feedTankRadius, [feedX, 1.15, 2.35], COLORS.steel);
    const separatorHeight = Math.min(5.5, design.geometry.separatorHeightM);
    const bodyRadius = Math.max(.58, Math.min(.95, design.geometry.separatorDiameterM * .34));
    const bodyHeight = Math.max(2.7, Math.min(4.4, separatorHeight * .78));
    effectXs.forEach((x, index) => {
      const stagger = index % 2 ? .18 : 0;
      vessel(scene, bodyRadius, bodyHeight, [x, bodyHeight / 2 + stagger, 0], index === effectCount - 1 && effectCount >= 3 ? 0xaab8c8 : COLORS.steel);
      cylinder(scene, .31 + capacityScale * .025, 1.25, [x, 1.15, -1.75], 0xd7dee7).rotation.z = Math.PI / 2;
      pump(scene, [x, .38, -2.75], 0xf59e0b);
      pipe(scene, [[x, .35, -.35], [x, .35, -2.75], [x, 1.15, -2.75], [x, 1.15, -2.35]], 0xf59e0b, .075);
      pipe(scene, [[x, 1.15, -1.15], [x, 1.55, -.55]], COLORS.feed, processPipeRadius);
      valve(scene, [x, 1.15, -1.35], COLORS.feed);
      flange(scene, [x, bodyHeight + .2, 0], "z", bodyRadius * .48);
      flange(scene, [x, .48, -.3], "z", bodyRadius * .36);
      labelSprite(scene, design.plantLayout.bodyTags[index], [x, bodyHeight + .95, .25], "#182337", .7);
      if (index < effectXs.length - 1) pipe(scene, [[x + bodyRadius, 2.25, 0], [effectXs[index + 1] - bodyRadius, 2.25, 0]], COLORS.feed, processPipeRadius);
    });
    vessel(scene, condensateRadius, 1.4 + condensateRadius, [storageX, 1.0, 2.35], COLORS.condensate);
    vessel(scene, productRadius, 1.3 + productRadius, [storageX, .95, -2.35], COLORS.product);
    vessel(scene, .42, 1.85, [px(5.55), 1.45, .2], 0xd2dbe5);
    for (let index = 0; index < (design.plantLayout?.boosterCount || 1); index += 1) box(scene, [1.15, .9, .9], [px(3.9 + index * 1.2), 4.25, 2.5], 0x60758d);
    if (design.plantLayout?.blowerCount) cylinder(scene, .43, .75, [px(5.1), 3.15, 3.05], 0x6f8094).rotation.z = Math.PI / 2;
    cylinder(scene, 0.38, 1.1, [px(-5.55), 1.15, 0], 0xd4dbe3).rotation.z = Math.PI / 2;

    pump(scene, [px(-6.0), 0.38, 1.15], COLORS.feed);
    pump(scene, [px(6.0), 0.38, -2.35], COLORS.product);
    pump(scene, [px(6.0), 0.38, 2.35], COLORS.condensate);
    pump(scene, [px(5.0), 0.38, 3.45], 0x14b8a6);

    pipe(scene, [[feedX, .5, 2.35], [px(-6), .5, 2.35], [px(-6), 1.15, 0], [firstEffectX - bodyRadius, 1.15, 0]], COLORS.feed, processPipeRadius);
    pipe(scene, [[lastEffectX, bodyHeight + .2, 0], [lastEffectX, 5.15, 0], [px(4.5), 5.15, 0], [px(4.5), 4.7, 2.5]], COLORS.vapor, vaporPipeRadius);
    pipe(scene, [[px(4.5), 3.8, 2.5], [px(5.55), 3.8, 2.5], [px(5.55), 2.45, .2]], COLORS.vapor, vaporPipeRadius);
    pipe(scene, [[px(5.55), .55, .2], [px(6), .55, 2.35], [storageX, 1.45, 2.35]], COLORS.condensate);
    pipe(scene, [[lastEffectX, .45, -.25], [px(6), .45, -2.35], [storageX, 1.35, -2.35]], COLORS.product);
    valve(scene, [px(-5.5), 1.15, 0], COLORS.feed);
    valve(scene, [px(5.55), 2.75, 2.5], COLORS.vapor);
    valve(scene, [px(6.4), 1.45, 2.35], COLORS.condensate);
    valve(scene, [px(6.4), 1.35, -2.35], COLORS.product);

    box(scene, [1.25, 1.8, .35], [px(-6.2), 1.0, -2.7], 0x2d405b);
    for (let row = 0; row < 3; row += 1) for (let col = 0; col < 4; col += 1) {
      cylinder(scene, .035, .025, [px(-6.55) + col * .23, .55 + row * .32, -2.5], row === 0 ? 0x35c883 : 0xe8b23c).rotation.x = Math.PI / 2;
    }
    pipe(scene, [[px(-5.6), 2.8, -2.65], [px(5.3), 2.8, -2.65]], 0x777f8a, .055);

    const frameLength = Math.max(6.4, effectCount * 2.3);
    const platform = box(scene, [frameLength, .16, 2.8], [0, 2.65, 0], 0x6f7f91);
    platform.material.metalness = 0.7;
    const frameX = frameLength / 2;
    for (const x of [-frameX, 0, frameX]) for (const z of [-1.28, 1.28]) {
      box(scene, [.1, 5.4, .1], [x, 2.7, z], 0x637083);
      box(scene, [.42, .16, .42], [x, .08, z], 0x8a96a5);
    }
    [2.65, 5.05].forEach((level) => {
      box(scene, [frameLength + .2, .1, .1], [0, level, -1.28], 0x637083);
      box(scene, [frameLength + .2, .1, .1], [0, level, 1.28], 0x637083);
      box(scene, [.1, .1, 2.65], [-frameX, level, 0], 0x637083);
      box(scene, [.1, .1, 2.65], [frameX, level, 0], 0x637083);
    });
    for (let x = -frameX; x <= frameX + .01; x += Math.max(1.1, frameLength / 5)) {
      box(scene, [.045, .8, .045], [x, 3.08, -1.35], 0x7c8896);
      box(scene, [.045, .8, .045], [x, 3.08, 1.35], 0x7c8896);
    }
    box(scene, [frameLength + .1, .045, .045], [0, 3.45, -1.35], 0x7c8896);
    box(scene, [frameLength + .1, .045, .045], [0, 3.45, 1.35], 0x7c8896);
    for (let y = .25; y < 2.6; y += .34) box(scene, [.75, .06, .08], [frameX + .45, y, -1.35], 0x637083);
    for (let step = 0; step < 10; step += 1) box(scene, [.8, .08, .32], [frameX + 1.1 + step * .16, .15 + step * .27, -.65], 0x697789);

    const pipeRackX = -frameX - 1.05;
    for (const z of [-1.05, 1.05]) box(scene, [.08, 3.7, .08], [pipeRackX, 1.85, z], 0x637083);
    [1.65, 2.35, 3.05].forEach((level) => box(scene, [.08, .08, 2.5], [pipeRackX, level, 0], 0x637083));
    labelSprite(scene, "PIPE RACK", [pipeRackX, 3.75, 0], "#45556d", .6);

    const ga = design.plantLayout?.ga || { lengthM: frameLength, widthM: 3.1, heightM: 8 };
    dimension(scene, [-frameX, .04, -3.65], [frameX, .04, -3.65], `L ${ga.lengthM.toFixed(2)} m`, [0, .28, -3.65]);
    dimension(scene, [frameX + 2.15, .04, -1.55], [frameX + 2.15, 5.4, -1.55], `H ${ga.heightM.toFixed(2)} m`, [frameX + 2.15, 3, -1.55]);
    dimension(scene, [-frameX - 2, .04, -1.55], [-frameX - 2, .04, 1.55], `W ${ga.widthM.toFixed(2)} m`, [-frameX - 2, .3, 0]);

    let dragging = false;
    let previous = { x: 0, y: 0 };
    const plant = new THREE.Group();
    while (scene.children.length > 4) plant.add(scene.children[4]);
    scene.add(plant);
    plant.rotation.y = -0.28;
    const onDown = (event) => { dragging = true; previous = { x: event.clientX, y: event.clientY }; };
    const onMove = (event) => {
      if (!dragging) return;
      plant.rotation.y += (event.clientX - previous.x) * 0.007;
      plant.rotation.x = Math.max(-0.2, Math.min(0.35, plant.rotation.x + (event.clientY - previous.y) * 0.004));
      previous = { x: event.clientX, y: event.clientY };
    };
    const onUp = () => { dragging = false; };
    const onWheel = (event) => {
      event.preventDefault();
      camera.position.multiplyScalar(event.deltaY > 0 ? 1.08 : 0.93);
      camera.position.clampLength(8, 22);
    };
    renderer.domElement.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    renderer.domElement.addEventListener("wheel", onWheel, { passive: false });
    const onResize = () => {
      const nextWidth = mount.clientWidth || width;
      camera.aspect = nextWidth / height;
      camera.updateProjectionMatrix();
      renderer.setSize(nextWidth, height);
    };
    window.addEventListener("resize", onResize);
    let frame;
    const animate = () => { frame = requestAnimationFrame(animate); renderer.render(scene, camera); };
    animate();
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      renderer.domElement.removeEventListener("pointerdown", onDown);
      renderer.domElement.removeEventListener("wheel", onWheel);
      renderer.dispose();
      mount.removeChild(renderer.domElement);
    };
  }, [design, view]);

  return (
    <div className="ev-3d-shell">
      <div className="ev-3d-toolbar">
        <div><b>Best Energy Efficient Evaporator · {design.inputs.capacityTph} TPH</b><span>{design.plantLayout?.basis} · {design.plantLayout?.bodyTags.length} process train(s) · drag to rotate</span></div>
        <div className="ev-view-controls">
          {["iso", "front", "side", "top"].map((item) => <button type="button" className={view === item ? "active" : ""} onClick={() => setView(item)} key={item}>{item}</button>)}
          <button type="button" onClick={() => setLabels((value) => !value)}>{labels ? "Hide key" : "Show key"}</button>
        </div>
      </div>
      <div ref={mountRef} className="ev-3d-canvas" />
      {labels && (
        <>
          <div className="ev-equipment-key">
            <span><i className="feed" />Feed system</span><span><i className="steel" />Evaporator + heaters</span>
            <span><i className="vapor" />MVR vapor loop</span><span><i className="cond" />Condensate</span>
            <span><i className="product" />Concentrate</span><span><i className="pump" />Pumps + booster</span>
          </div>
          <div className="ev-layout-tags">
            {[...(design.plantLayout?.bodyTags || []), ...(design.plantLayout?.heaterTags || []), "TK-101 Feed", "TK-111 Condensate", "E-102 DCH", `${design.plantLayout?.recirculationPumps || 1}× Recirculation pump`, `${design.plantLayout?.boosterCount || 1}× MVR booster`, ...(design.plantLayout?.blowerCount ? ["1× Vapor blower"] : [])].map((tag) => <span key={tag}>{tag}</span>)}
          </div>
        </>
      )}
    </div>
  );
}
