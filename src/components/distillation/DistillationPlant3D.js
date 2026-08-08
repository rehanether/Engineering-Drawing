import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import "./Distillation.css";

const mat=(color,metalness=.35)=>new THREE.MeshStandardMaterial({color,metalness,roughness:.34});
function box(g,size,pos,color){const m=new THREE.Mesh(new THREE.BoxGeometry(...size),mat(color));m.position.set(...pos);g.add(m);return m;}
function cyl(g,r,h,pos,color,segments=28){const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,segments),mat(color,.68));m.position.set(...pos);g.add(m);return m;}
function pipe(g,points,color,r=.055){for(let i=1;i<points.length;i++){const a=new THREE.Vector3(...points[i-1]),b=new THREE.Vector3(...points[i]),d=b.clone().sub(a),m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,d.length(),16),mat(color,.2));m.position.copy(a.clone().add(b).multiplyScalar(.5));m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.clone().normalize());g.add(m);}}
function tank(g,r,h,pos,color){cyl(g,r,h,pos,color);cyl(g,r*1.02,r*.48,[pos[0],pos[1]+h/2+r*.16,pos[2]],color).scale.y=.5;cyl(g,r*1.02,r*.48,[pos[0],pos[1]-h/2-r*.16,pos[2]],color).scale.y=.5;}
function pump(g,pos,color){cyl(g,.18,.5,pos,color).rotation.z=Math.PI/2;box(g,[.55,.38,.38],[pos[0]-.42,pos[1],pos[2]],0x44546b);}
function label(g,text,pos){const c=document.createElement("canvas");c.width=500;c.height=90;const x=c.getContext("2d");x.fillStyle="rgba(255,255,255,.94)";x.fillRect(2,2,496,86);x.strokeStyle="#9aa7b8";x.strokeRect(2,2,496,86);x.fillStyle="#172238";x.font="700 31px Arial";x.textAlign="center";x.textBaseline="middle";x.fillText(text,250,46);const s=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(c),transparent:true,depthTest:false}));s.position.set(...pos);s.scale.set(2.6,.47,1);g.add(s);}

export default function DistillationPlant3D({data,inputs}){
  const mountRef=useRef(null);const [view,setView]=useState("iso");const [showLabels,setShowLabels]=useState(true);
  useEffect(()=>{
    const mount=mountRef.current;if(!mount)return undefined;const w=mount.clientWidth||850,h=Math.max(420,Math.min(610,w*.62));
    const scene=new THREE.Scene();scene.background=new THREE.Color(0xf3f6fa);const camera=new THREE.PerspectiveCamera(38,w/h,.1,120);
    const views={iso:[17,12,19],front:[0,7,25],side:[25,7,0],top:[0,30,.01]};camera.position.set(...views[view]);if(view==="top")camera.up.set(0,0,-1);camera.lookAt(0,4,0);
    const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setSize(w,h);renderer.shadowMap.enabled=true;mount.appendChild(renderer.domElement);
    scene.add(new THREE.HemisphereLight(0xffffff,0x708097,1.7));const sun=new THREE.DirectionalLight(0xffffff,2.1);sun.position.set(8,15,10);scene.add(sun);
    const p=new THREE.Group();scene.add(p);box(p,[19,.22,11],[0,-.12,0],0xdce3ea);const grid=new THREE.GridHelper(19,28,0xaab5c3,0xd8dee7);grid.position.y=.01;p.add(grid);
    const columnD=Math.max(.75,Math.min(1.55,Number(data.Dcol||1)*.85));const columnH=Math.max(5.2,Math.min(10,Number(data.Hcol||data.Hpack||6)*.55));
    tank(p,columnD,columnH,[0,columnH/2+.45,0],0xbec9d4);for(let y=1;y<columnH;y+=.65)cyl(p,columnD*1.04,.06,[0,y+.45,0],0x728096);
    box(p,[4.2,.14,3.5],[0,3.2,0],0x667487);for(const x of [-2.05,2.05])for(const z of [-1.65,1.65])box(p,[.09,6.3,.09],[x,1.6,z],0x667487);
    tank(p,.78,1.6,[-6.2,1,2.4],0xc6d2dd);pump(p,[-5,.35,1.3],0x20a477);cyl(p,.42,1.7,[-3.7,1.2,.25],0xc3ced9).rotation.z=Math.PI/2;
    cyl(p,.48,2.2,[4.1,columnH+.2,-.2],0xc3ced9).rotation.z=Math.PI/2;tank(p,.72,1.35,[6.3,2,-1.6],0xb8c7d7);pump(p,[5.35,.36,-2.4],0x3b82f6);
    cyl(p,.5,2.2,[3.4,1.2,2.5],0xc3ced9).rotation.z=Math.PI/2;pump(p,[2.25,.36,2.5],0xe49a26);tank(p,.72,1.45,[6.2,1,-3.6],0xbfa9e8);tank(p,.72,1.45,[6.2,1,3.6],0xe7bd73);
    box(p,[1.3,2,.55],[-6.3,1.05,-2.6],0x394d68);box(p,[1.5,1.55,1.1],[-4.6,.8,-3.1],0x9eafc0);
    pipe(p,[[-6.2,.7,2.4],[-5,.7,2.4],[-5,1.2,.25],[-1.3,1.2,0]],0x20a477,.07);
    pipe(p,[[0,columnH+.5,0],[2.8,columnH+.5,0],[4.1,columnH+.2,-.2],[6.3,2.7,-1.6]],0xe7664f,.09);
    pipe(p,[[6.3,2,-1.6],[5.35,2,-2.4],[5.35,columnH*.68,-2.4],[1.3,columnH*.68,0]],0x3b82f6,.07);
    pipe(p,[[0,.55,0],[2.25,.55,2.5],[3.4,1.2,2.5],[0,1.1,0]],0xe49a26,.08);
    pipe(p,[[6.3,1.1,-1.6],[6.2,1.1,-3.6]],0x7c4de8,.065);pipe(p,[[0,.5,0],[6.2,.5,3.6]],0xe49a26,.065);
    if(showLabels){
      label(p,"C-101 DISTILLATION COLUMN",[0,columnH+1.45,0]);label(p,"E-101 FEED PREHEATER",[-3.7,2.35,.25]);label(p,"E-102 CONDENSER",[4.1,columnH+1.2,-.2]);label(p,"V-101 REFLUX DRUM",[6.3,3.35,-1.6]);label(p,"E-103 REBOILER",[3.4,2.5,2.5]);label(p,"TK-101 FEED",[-6.2,2.75,2.4]);label(p,"TK-102 DISTILLATE",[6.2,2.35,-3.6]);label(p,"TK-103 BOTTOMS",[6.2,2.35,3.6]);
    }
    p.rotation.y=-.28;let drag=false,last={x:0,y:0};const down=e=>{drag=true;last={x:e.clientX,y:e.clientY};},up=()=>drag=false,move=e=>{if(!drag)return;p.rotation.y+=(e.clientX-last.x)*.008;p.rotation.x=Math.max(-.25,Math.min(.3,p.rotation.x+(e.clientY-last.y)*.004));last={x:e.clientX,y:e.clientY};};
    renderer.domElement.addEventListener("pointerdown",down);window.addEventListener("pointerup",up);window.addEventListener("pointermove",move);let frame;const draw=()=>{frame=requestAnimationFrame(draw);renderer.render(scene,camera)};draw();
    const resize=()=>{const nw=mount.clientWidth||w;camera.aspect=nw/h;camera.updateProjectionMatrix();renderer.setSize(nw,h)};window.addEventListener("resize",resize);
    return()=>{cancelAnimationFrame(frame);window.removeEventListener("resize",resize);window.removeEventListener("pointerup",up);window.removeEventListener("pointermove",move);renderer.domElement.removeEventListener("pointerdown",down);renderer.dispose();scene.traverse(o=>{o.geometry?.dispose();o.material?.dispose?.()});if(renderer.domElement.parentNode===mount)mount.removeChild(renderer.domElement)};
  },[data,inputs,view,showLabels]);
  return <div className="ds3"><div className="ds3-toolbar"><div><b>Interactive 3D plant</b><span>{inputs.system} · {Number(data.F).toFixed(1)} kmol/h feed</span></div><div>{["iso","front","side","top"].map(v=><button key={v} className={view===v?"active":""} onClick={()=>setView(v)}>{v}</button>)}<button onClick={()=>setShowLabels(value=>!value)}>{showLabels?"Hide":"Show"} tags</button></div></div><div ref={mountRef} className="ds3-canvas"/><div className="ds3-key"><span><i className="feed"/>Feed</span><span><i className="vapor"/>Overhead vapor</span><span><i className="cooling"/>Reflux / cooling</span><span><i className="reboil"/>Reboiler circuit</span><span><i className="product"/>Products</span><small>Drag to rotate · capacity-responsive preliminary GA</small></div></div>;
}
