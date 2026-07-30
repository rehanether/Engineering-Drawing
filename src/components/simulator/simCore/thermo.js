// src/components/simulator/simCore/thermo.js

export const KPA_TO_PA = 1000;
export const R = 8.314; // J/mol-K

// Simple Antoine constants DB (T in °C, P in mmHg)
export const AntoineDB = {
  water: { A: 8.07131, B: 1730.63, C: 233.426 },
  ethanol: { A: 8.20417, B: 1642.89, C: 230.3 },
  methanol: { A: 8.0724, B: 1582.27, C: 239.7 },
  benzene: { A: 6.90565, B: 1211.033, C: 220.79 },
};

// Unique, nicely-cased component names for dropdowns
export const COMPONENTS = Array.from(
  new Set(
    Object.keys(AntoineDB).map(k => k[0].toUpperCase() + k.slice(1))
  )
).filter((v, i, arr) => arr.indexOf(v) === i);


// Cp molar (rough constant)
export function cpMol(comp = "water") {
  switch (comp) {
    case "ethanol": return 112; // J/mol-K
    case "methanol": return 81;
    case "benzene": return 136;
    default: return 75;
  }
}

// Volumetric flow from molar
export function volumetricFlow_m3s(n_mol_s, MW_gmol, rho_kgm3) {
  const mass_kg_s = (n_mol_s * MW_gmol) / 1000;
  return mass_kg_s / rho_kgm3;
}

// Simple Raoult’s law isothermal flash (binary mix)
export function flashRaoultBinary(z, T_C, P_kPa, comp1 = "water", comp2 = "ethanol") {
  const T = T_C;
  const P = P_kPa * 7.50062; // convert kPa → mmHg

  const Psat1 = Math.pow(10, AntoineDB[comp1].A - AntoineDB[comp1].B / (T + AntoineDB[comp1].C));
  const Psat2 = Math.pow(10, AntoineDB[comp2].A - AntoineDB[comp2].B / (T + AntoineDB[comp2].C));

  const K1 = Psat1 / P;
  const K2 = Psat2 / P;

  // Rachford–Rice for binary
  const f = v => (z[0] * (K1 - 1)) / (1 + v * (K1 - 1)) + (z[1] * (K2 - 1)) / (1 + v * (K2 - 1));
  let v = 0.5;
  for (let i = 0; i < 20; i++) {
    const fv = f(v);
    v -= fv / ((f(v + 1e-6) - fv) / 1e-6); // Newton
    v = Math.min(Math.max(v, 0), 1);
  }

  const x1 = z[0] / (1 + v * (K1 - 1));
  const x2 = 1 - x1;
  const y1 = K1 * x1;
  const y2 = 1 - y1;

  return { vaporFrac: v, x: [x1, x2], y: [y1, y2] };
}

// Existing stub
export function flashVT(F_mol_s = 100, T_K = 373, P_kPa = 101) {
  const Hvap = 40e3; // J/mol
  const fracV = Math.min(1, Math.max(0, (T_K - 350) / 50));
  return {
    vapor: F_mol_s * fracV,
    liquid: F_mol_s * (1 - fracV),
    Q_W: F_mol_s * fracV * Hvap,
  };
}
