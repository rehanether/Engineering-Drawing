const SYSTEMS = {
  "Benzene/Toluene": { alpha:2.5, lk:{name:"Benzene",mw:78.11,rho:876,latent:394,antoine:[6.90565,1211.033,220.79]}, hk:{name:"Toluene",mw:92.14,rho:867,latent:351,antoine:[6.95464,1344.8,219.48]} },
  "Hexane/Heptane": { alpha:2.35, lk:{name:"n-Hexane",mw:86.18,rho:655,latent:334,antoine:[6.8763,1171.53,224]}, hk:{name:"n-Heptane",mw:100.21,rho:684,latent:317,antoine:[6.893,1264,216]} },
  "Ethanol/Water": { alpha:2.1, lk:{name:"Ethanol",mw:46.07,rho:789,latent:841,antoine:[8.20417,1642.89,230.3]}, hk:{name:"Water",mw:18.02,rho:997,latent:2257,antoine:[8.14019,1810.94,244.485]} },
};

export const DISTILLATION_SYSTEMS = Object.keys(SYSTEMS);
export const DISTILLATION_DEFAULTS = {
  system:"Benzene/Toluene",feedFlow:100,zF:.5,xD:.95,xB:.05,alpha:2.5,q:1,refluxFactor:1.3,
  internals:"trays",efficiency:.7,traySpacingM:.5,pressureTopKpa:101,pressureBottomKpa:120,
  floodFraction:.8,soudersBrown:.11,coolingWaterInC:30,coolingWaterRiseK:10,
  condenserU:500,reboilerU:1500,steamTemperatureC:180,steamLatentKjKg:2100,moc:"SS316L",
};

const clamp=(value,min,max,fallback)=>Math.min(max,Math.max(min,Number.isFinite(Number(value))?Number(value):fallback));
const round=(value,digits=2)=>Number(Number(value||0).toFixed(digits));
const psat=(c,t)=>10**(c[0]-c[1]/(t+c[2]));
function bubbleTemperature(x,system,pressureKpa){
  const target=pressureKpa*(760/101.325);let low=-20,high=220;
  for(let i=0;i<80;i+=1){const mid=(low+high)/2;const p=x*psat(system.lk.antoine,mid)+(1-x)*psat(system.hk.antoine,mid);if(p>target)high=mid;else low=mid;}
  return (low+high)/2;
}
function underwoodTheta(alpha,z,q){
  const f=t=>q*(z/(alpha-t)+(1-z)/(1-t))-1;let low=.000001,high=.999999,flow=f(low);
  if(flow*f(high)>0)return null;
  for(let i=0;i<100;i+=1){const mid=(low+high)/2,fmid=f(mid);if(Math.abs(fmid)<1e-10)return mid;if(flow*fmid<0)high=mid;else{low=mid;flow=fmid;}}
  return (low+high)/2;
}

export function calculateDistillationDesign(raw={}){
  const i={...DISTILLATION_DEFAULTS,...raw};
  const system=SYSTEMS[i.system]||SYSTEMS["Benzene/Toluene"];
  const F=clamp(i.feedFlow,1,5000,100),zF=clamp(i.zF,.01,.99,.5),xD=clamp(i.xD,zF+.01,.995,.95),xB=clamp(i.xB,.001,zF-.01,.05);
  const alpha=clamp(i.alpha,1.05,10,system.alpha),q=clamp(i.q,0,1.2,1),refluxFactor=clamp(i.refluxFactor,1.05,3,1.3);
  const pTop=clamp(i.pressureTopKpa,20,500,101),pBottom=clamp(i.pressureBottomKpa,pTop,650,120);
  const theta=underwoodTheta(alpha,zF,q);
  const nMin=Math.log((xD/(1-xD))*((1-xB)/xB))/Math.log(alpha);
  const rMin=theta==null?null:(xD*alpha/(alpha-theta)+(1-xD)/(1-theta)-1);
  const reflux=rMin&&rMin>0?refluxFactor*rMin:null;
  const y=reflux?(reflux-rMin)/(reflux+1):0;
  const xGill=1-Math.exp(((1+54.4*y)/(11+117.2*y))*(y-1));
  const theoreticalStages=reflux?Math.max(nMin,(nMin+xGill)/(1-xGill)):null;
  const D=F*(zF-xB)/(xD-xB),B=F-D,closure=F-D-B;
  const vapor=reflux?(reflux+1)*D:0;
  const topTemp=bubbleTemperature(xD,system,pTop),bottomTemp=bubbleTemperature(xB,system,pBottom);
  const topMw=xD*system.lk.mw+(1-xD)*system.hk.mw;
  const topRhoV=pTop*1000*(topMw/1000)/(8.314*(273.15+topTemp));
  const topRhoL=xD*system.lk.rho+(1-xD)*system.hk.rho;
  const latentTop=xD*system.lk.latent*system.lk.mw+(1-xD)*system.hk.latent*system.hk.mw;
  const latentBottom=xB*system.lk.latent*system.lk.mw+(1-xB)*system.hk.latent*system.hk.mw;
  const condenserKw=vapor*latentTop/3600,reboilerKw=(vapor+B)*latentBottom/3600;
  const flood=clamp(i.floodFraction,.5,.9,.8),ksb=clamp(i.soudersBrown,.05,.2,.11);
  const vaporM3S=(vapor*1000/3600)*8.314*(273.15+topTemp)/(pTop*1000);
  const allowableVelocity=ksb*Math.sqrt(Math.max(topRhoL-topRhoV,1)/Math.max(topRhoV,.01))*flood;
  const area=vaporM3S/Math.max(allowableVelocity,.01),diameter=Math.sqrt(4*area/Math.PI);
  const efficiency=clamp(i.efficiency,.35,.9,.7),actualStages=theoreticalStages?Math.ceil(theoreticalStages/efficiency):0;
  const traySpacing=clamp(i.traySpacingM,.35,.75,.5),activeHeight=i.internals==="trays"?actualStages*traySpacing:theoreticalStages*.55;
  const totalHeight=Math.max(6,activeHeight+4.5);
  const cwRise=clamp(i.coolingWaterRiseK,5,18,10),cwFlowKgH=condenserKw*3600/(4.18*cwRise);
  const steamLatent=clamp(i.steamLatentKjKg,1800,2300,2100),steamKgH=reboilerKw*3600/steamLatent;
  const condenserArea=condenserKw*1000/(clamp(i.condenserU,250,1200,500)*Math.max(topTemp-i.coolingWaterInC-cwRise/2,5));
  const reboilerArea=reboilerKw*1000/(clamp(i.reboilerU,500,2500,1500)*Math.max(i.steamTemperatureC-bottomTemp,8));
  const installedUsd=Math.round((290000+diameter*totalHeight*41000+(condenserArea+reboilerArea)*5200)*(i.moc==="SS316L"?1.18:1));
  const warnings=[];
  if(i.system==="Ethanol/Water"&&xD>.88)warnings.push("Ethanol/water is non-ideal and azeotropic; rigorous VLE and entrainer strategy may be required above the simple binary envelope.");
  if(flood>.85)warnings.push("Hydraulic design exceeds 85% of estimated flood; retain additional capacity margin.");
  if(!reflux)warnings.push("The selected separation basis does not provide a valid Underwood solution; review feed quality and composition.");
  return {inputs:{...i,feedFlow:F,zF,xD,xB,alpha,q,refluxFactor,pressureTopKpa:pTop,pressureBottomKpa:pBottom},system,F,zF,xD,xB,alpha,q,RR:refluxFactor,internals:i.internals,Nmin:round(nMin),theta:theta==null?null:round(theta,4),Rmin:rMin==null?null:round(rMin,3),R:reflux==null?null:round(reflux,3),Nth:theoreticalStages?round(theoreticalStages,1):null,D:round(D),B:round(B),Vkmolph:round(vapor),Qc_kJph:round(condenserKw*3600),Qr_kJph:round(reboilerKw*3600),Ttop:round(topTemp,1),Tbot:round(bottomTemp,1),rhoV:round(topRhoV,3),rhoL:round(topRhoL),vdot_m3s:round(vaporM3S,3),Vallow:round(allowableVelocity,3),area:round(area,3),Dcol:round(diameter,2),effMV:efficiency,traySpacing,Nactual:actualStages,Hcol:round(totalHeight,1),Hpack:i.internals==="packing"?round(activeHeight,1):null,mCW_kgph:round(cwFlowKgH),Ac:round(condenserArea,1),Ar:round(reboilerArea,1),mSteam:round(steamKgH),MOC:i.moc,closure:round(closure,4),installedUsd,installedInr:Math.round(installedUsd*84),warnings};
}
