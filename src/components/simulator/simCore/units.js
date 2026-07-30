import { Stream } from "./stream.js";
import { flashRaoultBinary, AntoineDB } from "./thermo.js";

/* very simple property helpers for demonstration */
function Cp_liq_mixture_JpmolK(zLK){
  // benzene (136), toluene (159) J/mol-K at ~25–60°C; linear mix
  return 136*zLK + 159*(1 - zLK);
}
function rho_liq_mixture_kgpm3(zLK){
  // benzene 874, toluene 867 kg/m3 @ ~20–25°C; linear
  return 874*zLK + 867*(1 - zLK);
}
function Mmix_gpmol(zLK){
  // benzene 78.11, toluene 92.14 g/mol
  return 78.11*zLK + 92.14*(1 - zLK);
}

export const Units = {
  FEED: {
    compute: (u)=>({ out: [new Stream({ id:`S-${u.id}`, name:u.name, ...u.spec })] })
  },
  PRODUCT: {
    compute: (u, ins)=>({ out: ins })
  },
  MIXER: {
    compute: (u, ins)=>{
      const F = ins.reduce((s,x)=>s+x.F,0);
      const T = F? ins.reduce((s,x)=>s+x.F*x.T,0)/F : 298.15;
      const P = ins[0]?.P ?? u.spec.P ?? 101;
      const z = F? ins.reduce((s,x)=>s+x.F*x.z,0)/F : 0.5;
      return { out: [new Stream({ id:`S-${u.id}`, name:u.name||u.id, F,T,P,z,phase:"L" })] };
    }
  },
  FLASH: {
    compute: (u, [feed])=>{
      const { P=101, T=340, LK="Benzene", HK="Toluene" } = u.spec;
      const { Vfrac, x1, y1 } = flashRaoultBinary(feed, P, T, AntoineDB[LK], AntoineDB[HK]);
      const V = Math.max(0, Math.min(1, Vfrac)) * feed.F, L = feed.F - V;
      const VAP = new Stream({ id:`V-${u.id}`, name:`V-${u.name||u.id}`, F:V, T, P, z:y1, phase:"V" });
      const LIQ = new Stream({ id:`L-${u.id}`, name:`L-${u.name||u.id}`, F:L, T, P, z:x1, phase:"L" });
      return { out: [VAP, LIQ] };
    }
  },
  HEATER: {
    compute: (u,[feed])=>{
      const Tset = u.spec.Tset ?? feed.T;
      const Cp = Cp_liq_mixture_JpmolK(feed.z);
      // Q [kW] = (F mol/h)*(Cp J/mol-K)*(ΔT K) / 3.6e6
      const QkW = (feed.F * Cp * (Tset - feed.T)) / 3.6e6;
      const out = new Stream({ ...feed, id:`H-${u.id}`, name:u.name||u.id, T:Tset });
      return { out: [out], meta: { duty_kW: QkW } };
    }
  },
  PUMP: {
    compute: (u,[feed])=>{
      const dP = u.spec.dP ?? 0; const eta = u.spec.eta ?? 0.7;
      const rho = rho_liq_mixture_kgpm3(feed.z);
      const MM = Mmix_gpmol(feed.z);
      const m_dot = (feed.F * MM) / 3600 / 1000; // kg/s
      const shaft_kW = (m_dot * (dP * 1e3) / rho) / Math.max(eta, 1e-3) / 1000;
      const out = new Stream({ ...feed, id:`P-${u.id}`, name:u.name||u.id, P: feed.P + dP });
      return { out:[out], meta:{ shaft_kW } };
    }
  }
};

