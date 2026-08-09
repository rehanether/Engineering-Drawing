export const KPA_TO_PA = 1000;
export const R = 8.314462618;

export const COMPONENT_DB = {
  Water:    { antoine:[8.07131,1730.63,233.426], Tc:647.10, Pc:22064, omega:0.344, mw:18.015, rho:997, cp:75.3 },
  Ethanol:  { antoine:[8.20417,1642.89,230.300], Tc:514.00, Pc:6137,  omega:0.644, mw:46.069, rho:789, cp:112.4 },
  Methanol: { antoine:[8.08097,1582.27,239.730], Tc:512.60, Pc:8090,  omega:0.565, mw:32.042, rho:792, cp:81.1 },
  Benzene:  { antoine:[6.90565,1211.03,220.790], Tc:562.02, Pc:4894,  omega:0.212, mw:78.114, rho:876, cp:136.1 },
  Toluene:  { antoine:[6.95464,1344.80,219.480], Tc:591.75, Pc:4126,  omega:0.264, mw:92.141, rho:867, cp:157.3 },
  Acetone:  { antoine:[7.11714,1210.60,229.664], Tc:508.10, Pc:4700,  omega:0.307, mw:58.080, rho:784, cp:125.5 },
  "n-Hexane": { antoine:[6.87630,1171.53,224.366], Tc:507.60, Pc:3025, omega:0.301, mw:86.178, rho:655, cp:195.0 },
};

export const COMPONENTS = Object.keys(COMPONENT_DB);
export const AntoineDB = Object.fromEntries(Object.entries(COMPONENT_DB).map(([name,c])=>[name,{A:c.antoine[0],B:c.antoine[1],C:c.antoine[2]}]));

export function cpMol(component="Water") { return COMPONENT_DB[component]?.cp || 100; }
export function volumetricFlow_m3s(F_mol_h, T_K=298, P_kPa=101, component="Water") {
  const c=COMPONENT_DB[component] || COMPONENT_DB.Water;
  return ((F_mol_h/3600)*c.mw/1000)/c.rho;
}

function psatKPa(component,T_K){
  const c=COMPONENT_DB[component] || COMPONENT_DB.Water;
  const T_C=T_K-273.15;
  return Math.pow(10,c.antoine[0]-c.antoine[1]/(T_C+c.antoine[2]))/7.50062;
}

function wilsonK(component,T_K,P_kPa){
  const c=COMPONENT_DB[component] || COMPONENT_DB.Water;
  return (c.Pc/P_kPa)*Math.exp(5.373*(1+c.omega)*(1-c.Tc/T_K));
}

function rachfordRice(z1,K1,K2){
  const z=Math.max(0,Math.min(1,z1));
  const f=v=>z*(K1-1)/(1+v*(K1-1))+(1-z)*(K2-1)/(1+v*(K2-1));
  if(f(0)<=0) return 0;
  if(f(1)>=0) return 1;
  let lo=0,hi=1;
  for(let i=0;i<80;i++){const mid=(lo+hi)/2;if(f(mid)>0)lo=mid;else hi=mid;}
  return (lo+hi)/2;
}

export function flashBinary({F=0,zLK=0.5,T_K=340,P_kPa=101,comp1="Benzene",comp2="Toluene",method="Raoult"}){
  const K1=method.startsWith("Peng")?wilsonK(comp1,T_K,P_kPa):psatKPa(comp1,T_K)/P_kPa;
  const K2=method.startsWith("Peng")?wilsonK(comp2,T_K,P_kPa):psatKPa(comp2,T_K)/P_kPa;
  const vf=rachfordRice(zLK,K1,K2);
  const x1=zLK/(1+vf*(K1-1));
  const y1=K1*x1;
  return {V:F*vf,L:F*(1-vf),Vfrac:vf,xLK:x1,yLK:y1,K1,K2,method};
}

export const flashRaoultBinary = args => flashBinary({...args,method:"Raoult"});
