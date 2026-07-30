import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";

const C = { steel:0xb7c2cc, dark:0x243247, feed:0x1f9d73, product:0x7c4de8, utility:0x348bd6, hot:0xe25d47, floor:0xe7edf3 };

function material(color, metalness=.55) {
  return new THREE.MeshStandardMaterial({ color, metalness, roughness:.34 });
}
function box(group, size, position, color=C.dark) {
  const object = new THREE.Mesh(new THREE.BoxGeometry(...size), material(color,.35));
  object.position.set(...position); group.add(object); return object;
}
function cylinder(group, radius, height, position, color=C.steel, radial=28) {
  const object = new THREE.Mesh(new THREE.CylinderGeometry(radius,radius,height,radial),material(color));
  object.position.set(...position); group.add(object); return object;
}
function tank(group, radius, height, position, color=C.steel) {
  cylinder(group,radius,height,position,color);
  const top=new THREE.Mesh(new THREE.SphereGeometry(radius,28,14,0,Math.PI*2,0,Math.PI/2),material(color));
  top.position.set(position[0],position[1]+height/2,position[2]); group.add(top);
  const bottom=top.clone(); bottom.rotation.z=Math.PI; bottom.position.y=position[1]-height/2; group.add(bottom);
  return { top,bottom };
}
function pipe(group, points, color, radius=.065) {
  const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));
  const object=new THREE.Mesh(new THREE.TubeGeometry(curve,36,radius,9,false),material(color,.25));
  group.add(object); return object;
}
function pump(group, position, color=C.feed) {
  const casing=cylinder(group,.25,.3,position,color); casing.rotation.z=Math.PI/2;
  box(group,[.45,.32,.32],[position[0]-.4,position[1],position[2]],C.dark);
  box(group,[1,.09,.55],[position[0]-.18,position[1]-.22,position[2]],0x607085);
}
function valve(group, position, color=0xe2a928) {
  const body=new THREE.Mesh(new THREE.OctahedronGeometry(.14),material(color)); body.position.set(...position); group.add(body);
  box(group,[.04,.3,.04],[position[0],position[1]+.2,position[2]],0x364357);
  box(group,[.3,.04,.04],[position[0],position[1]+.35,position[2]],0x364357);
}
function label(group,text,position,scale=.72) {
  const canvas=document.createElement("canvas"); canvas.width=500; canvas.height=100;
  const ctx=canvas.getContext("2d"); ctx.fillStyle="rgba(255,255,255,.94)"; ctx.fillRect(2,2,496,96);
  ctx.strokeStyle="#9aa7b8"; ctx.lineWidth=3; ctx.strokeRect(2,2,496,96);
  ctx.fillStyle="#1f2b40"; ctx.font="700 34px Arial"; ctx.textAlign="center"; ctx.textBaseline="middle"; ctx.fillText(text,250,52);
  const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(canvas),transparent:true,depthTest:false}));
  sprite.position.set(...position); sprite.scale.set(2.5*scale,.5*scale,1); group.add(sprite);
}
function agitator(group,x,height,radius) {
  box(group,[.55,.65,.55],[x,height+.7,0],0x34465d);
  cylinder(group,.055,height*.72,[x,height*.64,0],0x667789);
  const blade=box(group,[radius*1.15,.08,.22],[x,height*.35,0],0x657a91); blade.rotation.y=.35;
}
function platform(group,x,height,width=3.1) {
  box(group,[width,.12,2.8],[x,height,0],0x6d7a8b);
  for(const dx of [-width/2,width/2]) for(const z of [-1.3,1.3]) box(group,[.09,height*2,.09],[x+dx,height/2,z],0x637083);
  for(const z of [-1.38,1.38]) {
    box(group,[width+.15,.06,.06],[x,height+.75,z],0x637083);
    for(let dx=-width/2;dx<=width/2;dx+=.6) box(group,[.04,1.4,.04],[x+dx,height+.35,z],0x637083);
  }
}

export default function ReactorPlant3D({design}) {
  const mountRef=useRef(null);
  const [view,setView]=useState("iso");
  const [showLabels,setShowLabels]=useState(true);
  useEffect(()=>{
    const mount=mountRef.current; if(!mount) return undefined;
    const width=mount.clientWidth||800, height=Math.max(390,Math.min(590,width*.64));
    const scene=new THREE.Scene(); scene.background=new THREE.Color(0xf3f6fa);
    const camera=new THREE.PerspectiveCamera(38,width/height,.1,100);
    const views={iso:[14,10,16],front:[0,5,22],side:[22,5,0],top:[0,25,.01]};
    camera.position.set(...views[view]); if(view==="top") camera.up.set(0,0,-1); camera.lookAt(0,2.3,0);
    const renderer=new THREE.WebGLRenderer({antialias:true}); renderer.setPixelRatio(Math.min(devicePixelRatio,2)); renderer.setSize(width,height); renderer.shadowMap.enabled=true; mount.appendChild(renderer.domElement);
    scene.add(new THREE.HemisphereLight(0xffffff,0x738096,1.6));
    const sun=new THREE.DirectionalLight(0xffffff,2.2); sun.position.set(8,12,7); scene.add(sun);
    const plant=new THREE.Group(); scene.add(plant);
    box(plant,[design.layout.lengthM,.22,design.layout.widthM],[0,-.12,0],C.floor);
    const grid=new THREE.GridHelper(Math.max(design.layout.lengthM,design.layout.widthM),28,0xaeb8c5,0xd7dde5); grid.position.y=.01; plant.add(grid);

    const scale=Math.max(.8,Math.min(1.45,Math.cbrt(design.process.designVolumeM3)));
    const reactorR=Math.max(.7,Math.min(1.35,design.geometry.diameterM*.42));
    const reactorH=Math.max(2.2,Math.min(4.5,design.geometry.straightHeightM*.85));
    tank(plant,.8*scale,1.7*scale,[-5.1,1.05,2.1],C.steel);
    tank(plant,.5*scale,1.15*scale,[-5.15,.8,-.25],0xd7c8ef);
    pump(plant,[-4.25,.34,-.25],0x7c4de8);
    pump(plant,[-4.25,.38,1.1],C.feed);
    cylinder(plant,.34,.95,[-3.25,1.25,.3],0xcbd4dd).rotation.z=Math.PI/2;
    if(design.inputs.type==="PFR") {
      const count=design.inputs.capacity>=4?5:design.inputs.capacity>=2?4:3;
      box(plant,[3.8,2.9,2.8],[.35,1.7,0],0x718096);
      for(let i=0;i<count;i++) cylinder(plant,.22,3.3,[-1.1+i*(2.9/(count-1)),1.75,0],C.steel).rotation.z=Math.PI/2;
      label(plant,"R-101 TUBULAR REACTOR",[.35,4.05,0]);
    } else {
      tank(plant,reactorR,reactorH,[.2,reactorH/2+.45,0],C.steel);
      const jacket=cylinder(plant,reactorR*1.06,reactorH*.74,[.2,reactorH/2+.3,0],0x78a5ca);
      jacket.material=new THREE.MeshStandardMaterial({color:0x4d93cc,transparent:true,opacity:.26,metalness:.25,roughness:.45});
      agitator(plant,.2,reactorH,reactorR);
      platform(plant,.2,Math.min(3.2,reactorH*.7),Math.max(3,reactorR*3));
      label(plant,design.inputs.type==="Batch"?"R-101 BATCH REACTOR":"R-101 CSTR",[.2,reactorH+1.65,0]);
    }
    tank(plant,.63*scale,1.45*scale,[5.2,.95,-2.05],C.product);
    tank(plant,.6*scale,1.35*scale,[5.1,.9,2.1],C.utility);
    if(design.inputs.volatileService) {
      cylinder(plant,.32,1.45,[3.25,3.55,-2.05],0xcbd4dd).rotation.z=Math.PI/2;
      box(plant,[.95,1.7,.85],[4.75,1.05,.15],0x93a4b7);
    }
    if(design.inputs.cipRequired) {
      box(plant,[1.45,1.5,1.05],[-3.9,.78,-2.8],0xb9c6d3);
      pump(plant,[-3.05,.34,-2.8],C.utility);
    }
    pump(plant,[4.1,.38,-1.25],C.product); pump(plant,[4.1,.38,2.1],C.utility);
    box(plant,[1.35,1.9,.4],[-5.2,1.05,-2.25],0x2d405b);
    const reactorTop=design.inputs.type==="PFR"?2.8:reactorH+.4;
    pipe(plant,[[-5.1,.55,2.1],[-4.25,.55,2.1],[-4.25,1.25,.3],[-3.7,1.25,.3],[-1.35,1.25,0]],C.feed,.075);
    pipe(plant,[[-5.15,.45,-.25],[-4.25,.45,-.25],[-2.25,2.35,-.25],[-1.25,2.35,0]],0x7c4de8,.055);
    pipe(plant,[[1.45,.55,0],[4.1,.55,-1.25],[5.2,1.25,-2.05]],C.product,.075);
    pipe(plant,[[5.1,1.35,2.1],[3.35,1.35,2.1],[3.35,reactorTop*.65,1.2],[1.35,reactorTop*.65,1.2]],C.utility,.07);
    pipe(plant,[[1.35,reactorTop*.55,-1.15],[3.25,reactorTop*.55,-1.15],[3.25,.55,2.1],[4.1,.55,2.1]],C.hot,.07);
    pipe(plant,[[.2,reactorTop,0],[.2,reactorTop+.8,0],[3.3,reactorTop+.8,0],[3.3,2.1,-2.05],[5.2,2.1,-2.05]],C.hot,.09);
    if(design.inputs.volatileService) pipe(plant,[[.2,reactorTop+.8,0],[3.25,reactorTop+.8,0],[3.25,3.55,-2.05],[4.75,1.9,.15]],C.hot,.065);
    valve(plant,[-2.4,1.25,.15],C.feed); valve(plant,[3.25,reactorTop*.55,-1.15],C.hot); valve(plant,[4.1,.55,-1.25],C.product);
    if(showLabels) {
      label(plant,"TK-101 FEED",[-5.1,2.8,2.1],.62); label(plant,"E-101 PREHEATER",[-3.25,2.05,.3],.58);
      label(plant,"TK-103 REAGENT",[-5.15,2.05,-.25],.52);
      label(plant,"TK-102 PRODUCT",[5.2,2.45,-2.05],.58); label(plant,"CU-101 UTILITY",[5.1,2.35,2.1],.58);
      if(design.inputs.volatileService) label(plant,"E-102 CONDENSER",[3.25,4.45,-2.05],.52);
      if(design.inputs.cipRequired) label(plant,"CIP-101",[-3.9,1.9,-2.8],.48);
      label(plant,`${design.layout.lengthM} × ${design.layout.widthM} × ${design.layout.heightM} m GA`,[0,.38,-design.layout.widthM/2+.35],.7);
    }
    plant.rotation.y=-.28;
    let drag=false,last={x:0,y:0};
    const down=e=>{drag=true;last={x:e.clientX,y:e.clientY};}, up=()=>{drag=false;}, move=e=>{if(!drag)return;plant.rotation.y+=(e.clientX-last.x)*.008;plant.rotation.x=Math.max(-.3,Math.min(.35,plant.rotation.x+(e.clientY-last.y)*.004));last={x:e.clientX,y:e.clientY};};
    renderer.domElement.addEventListener("pointerdown",down); window.addEventListener("pointerup",up); window.addEventListener("pointermove",move);
    let frame; const render=()=>{frame=requestAnimationFrame(render);renderer.render(scene,camera);}; render();
    const resize=()=>{const w=mount.clientWidth||width;camera.aspect=w/height;camera.updateProjectionMatrix();renderer.setSize(w,height);}; window.addEventListener("resize",resize);
    return()=>{cancelAnimationFrame(frame);window.removeEventListener("resize",resize);window.removeEventListener("pointerup",up);window.removeEventListener("pointermove",move);renderer.domElement.removeEventListener("pointerdown",down);renderer.dispose();scene.traverse(o=>{o.geometry?.dispose();if(o.material){const materials=Array.isArray(o.material)?o.material:[o.material];materials.forEach(m=>{m.map?.dispose();m.dispose();});}});if(renderer.domElement.parentNode===mount)mount.removeChild(renderer.domElement);};
  },[design,view,showLabels]);
  return <div className="rx3-shell"><div className="rx3-toolbar"><div><b>Interactive 3D plant</b><span>{design.inputs.type} · {design.inputs.capacity} {design.inputs.type==="Batch"?"m³/batch":"m³/h"}</span></div><div>{["iso","front","side","top"].map(v=><button key={v} className={view===v?"active":""} onClick={()=>setView(v)}>{v}</button>)}<button onClick={()=>setShowLabels(v=>!v)}>{showLabels?"Hide":"Show"} tags</button></div></div><div className="rx3-canvas" ref={mountRef}/><div className="rx3-key"><span><i className="feed"/>Feed</span><span><i className="hot"/>Vent / return</span><span><i className="utility"/>Utility</span><span><i className="product"/>Product</span><small>Drag to rotate · preliminary GA concept</small></div></div>;
}
