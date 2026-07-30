// Simple Antoine (mmHg, °C). Use your existing constants style.
export const Psat_mmHg = (A, B, C, T_C) => Math.pow(10, A - B / (T_C + C));

// Convert kPa<->mmHg
const kPa_to_mmHg = (P_kPa) => P_kPa * (760 / 101.325);

// Binary isothermal flash via Raoult (ideal gamma=1)
// inputs: feed {F, z} where z is LK mole fraction; P_kPa, T_C; antoine {LK:{A,B,C}, HK:{A,B,C}}
export function flash_isothermal_binary(feed, P_kPa, T_C, antoine) {
  const Pmm = kPa_to_mmHg(P_kPa);
  const P1 = Psat_mmHg(antoine.LK.A, antoine.LK.B, antoine.LK.C, T_C);
  const P2 = Psat_mmHg(antoine.HK.A, antoine.HK.B, antoine.HK.C, T_C);

  // K values
  const K1 = P1 / Pmm;
  const K2 = P2 / Pmm;

  // Rachford-Rice for 2 components reduces to:
  // f(V) = z1*(K1-1)/(1+V*(K1-1)) + (1-z1)*(K2-1)/(1+V*(K2-1)) = 0
  const z1 = Math.min(1, Math.max(0, feed.z));
  const f = (V) =>
    (z1 * (K1 - 1)) / (1 + V * (K1 - 1)) +
    ((1 - z1) * (K2 - 1)) / (1 + V * (K2 - 1));

  // bracket [0,1]
  let lo = 0, hi = 1, flo = f(lo), fhi = f(hi);
  // if no vaporization possible, V=0; if all vapor, V=1
  if (flo === 0) return { Vfrac: 0, x1: z1, y1: z1 };
  if (fhi === 0) return { Vfrac: 1, x1: z1, y1: z1 };

  // If f(0)*f(1)>0, no solution inside; clamp based on sign
  if (flo * fhi > 0) {
    const Vfrac = (flo > 0) ? 1 : 0;
    const x1 = z1, y1 = z1;
    return { Vfrac, x1, y1 };
  }

  for (let i = 0; i < 60; i++) {
    const mid = 0.5 * (lo + hi);
    const fm = f(mid);
    if (Math.abs(fm) < 1e-10) { lo = hi = mid; break; }
    if (flo * fm < 0) { hi = mid; fhi = fm; } else { lo = mid; flo = fm; }
  }
  const Vfrac = 0.5 * (lo + hi);
  const x1 = z1 / (1 + Vfrac * (K1 - 1));
  const y1 = K1 * x1;
  return { Vfrac, x1, y1 };
}
