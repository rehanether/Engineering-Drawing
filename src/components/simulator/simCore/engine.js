import {
  cpMol,
  volumetricFlow_m3s,
  flashBinary,
  KPA_TO_PA,
} from "./thermo";

// ---------- graph helpers ----------
function buildAdj(edges) {
  const out = {};
  for (const e of edges) (out[e.from] ||= []).push(e);
  return out;
}
function incomingCount(nodes, edges) {
  const inc = {};
  nodes.forEach((n) => (inc[n.id] = 0));
  edges.forEach((e) => (inc[e.to] = (inc[e.to] || 0) + 1));
  return inc;
}
function topoOrder(nodes, edges) {
  const inc = incomingCount(nodes, edges);
  const q = nodes.filter((n) => inc[n.id] === 0).map((n) => n.id);
  const order = [];
  while (q.length) {
    const u = q.shift();
    order.push(u);
    edges
      .filter((e) => e.from === u)
      .forEach((e) => {
        inc[e.to] -= 1;
        if (inc[e.to] === 0) q.push(e.to);
      });
  }
  if (order.length < nodes.length) {
    nodes.forEach((n) => {
      if (!order.includes(n.id)) order.push(n.id);
    });
  }
  return order;
}
const clone = (o) => JSON.parse(JSON.stringify(o));

// ---------- core, single forward pass (no recycle convergence) ----------
function forwardPass(state, recycleOverrides = {}) {
  const { nodes, edges } = state;
  const id2node = Object.fromEntries(nodes.map(n=>[n.id,n]));
  const results = { streams:{}, meta:{} };
  const inMap = {};
  const pushIn = (to, s)=> { (inMap[to] ||= []).push(s); return 0; };


  const emit = (edge, s) => {
    const st = clone(s);
    st.name = st.name || `${edge.from}-${edge.to}`;
    results.streams[`${edge.from}->${edge.to}`] = st;
    pushIn(edge.to, st);
  };

  // FEED injection
  for (const n of nodes) {
    if (n.type === "FEED") {
      const s = {
        id: `S_${n.id}`,
        name: n.name,
        F: n.spec?.F ?? 0,
        T: n.spec?.T ?? 298,
        P: n.spec?.P ?? 101,
        phase: "L",
        z: n.spec?.z ?? 0.5,
      };
      (inMap[n.id] ||= []).push(s);
    }
  }

  // RECYCLE overrides: inject guessed recycle stream into its target node
  // recycleOverrides keyed by recycle node id: {F,T,P,z,phase}
  for (const [rid, sGuess] of Object.entries(recycleOverrides)) {
    const rnode = id2node[rid];
    if (!rnode) continue;
    // recycle node has exactly ONE outgoing edge (to the "target" block)
    const outE = (buildAdj(edges)[rid] || [])[0];
    if (!outE) continue;
    (inMap[outE.to] ||= []).push(clone(sGuess));
  }

  for (const id of topoOrder(nodes, edges)) {
    const n = id2node[id];
    const feeds = inMap[id] || [];
    const one = feeds[0];
    const outEdges = (buildAdj(edges)[id] || []).slice();

    let outlet = one
      ? clone(one)
      : { F: 0, T: 298, P: 101, phase: "L", z: 0.5 };
    outlet.name = `${n.name}-OUT`;

    switch (n.type) {
      case "FEED":
      case "PRODUCT": {
        // pass-through (PRODUCT is sink but still forwards if connected)
        break;
      }

      case "MIXER": {
        const F = feeds.reduce((s, x) => s + (x.F || 0), 0);
        const T =
          F > 0
            ? feeds.reduce((s, x) => s + x.F * (x.T || 298), 0) / F
            : one?.T || 298;
        const P = Math.max(...feeds.map((x) => x.P || 101), 101);
        const z =
          F > 0
            ? feeds.reduce((s, x) => s + x.F * (x.z ?? 0.5), 0) / F
            : one?.z ?? 0.5;
        outlet = { ...outlet, F, T, P, z, phase: "L" };
        break;
      }

      case "SPLITTER": {
        // two outlets: first gets frac, second gets (1-frac)
        const frac = Math.min(1, Math.max(0, n.spec?.frac ?? 0.5));
        const s1 = { ...one, name: `${n.name}-S1`, F: (one?.F || 0) * frac };
        const s2 = {
          ...one,
          name: `${n.name}-S2`,
          F: (one?.F || 0) * (1 - frac),
        };
        if (outEdges[0]) emit(outEdges[0], s1);
        if (outEdges[1]) emit(outEdges[1], s2);
        continue;
      }

      case "HEATER": {
        const Tin = one?.T ?? 298;
        const Tout = n.spec?.Tset ?? Tin;
        const F = one?.F ?? 0;
        const Cp = cpMol((Tin + Tout) / 2);
        const Q_W = (F / 3600) * Cp * (Tout - Tin);
        outlet = {
          ...outlet,
          F,
          T: Tout,
          P: one?.P ?? 101,
          z: one?.z ?? 0.5,
          phase: one?.phase ?? "L",
        };
        results.meta[n.id] = { duty_kW: Q_W / 1000 };
        break;
      }

      case "VALVE": {
        // simple throttling valve: drop to target Pout, keep Tin (no JT for now)
        const Pout = n.spec?.Pout ?? (one?.P ?? 101);
        outlet = { ...outlet, P: Pout };
        break;
      }

      case "HX": {
        // one shell side only modeled for now (single-in-single-out) w/ UA & effectiveness
        const UA_kWperK = n.spec?.UA ?? 50; // kW/K
        const eff = Math.min(1, Math.max(0, n.spec?.eff ?? 0.7));
        const F = one?.F ?? 0;
        const Cp = cpMol(one?.T ?? 298) / 1000; // kW/mol-K
        const dT = n.spec?.dT ?? 20; // approach or desired change
        // crude: Q = eff * UA * dT_lm  ~ eff*UA*dT (placeholder)
        const Q_kW = eff * UA_kWperK * dT;
        const dT_fromQ = Q_kW / (F / 3600 * (Cp * 1000) / 1000); // convert back safely
        const Tout = (one?.T ?? 298) + dT_fromQ;
        outlet = { ...outlet, F, T: Tout };
        results.meta[n.id] = { Q_kW };
        break;
      }

      case "PUMP": {
        const F = one?.F ?? 0;
        const Pout = (one?.P ?? 101) + (n.spec?.dP ?? 0);
        const eta = Math.max(0.01, Math.min(1.0, n.spec?.eta ?? 0.7));
        const Vdot = volumetricFlow_m3s(F, one?.T ?? 298, one?.P ?? 101);
        const shaft_W = (Vdot * (n.spec?.dP ?? 0) * KPA_TO_PA) / eta;
        outlet = {
          ...outlet,
          F,
          T: one?.T ?? 298,
          P: Pout,
          z: one?.z ?? 0.5,
          phase: one?.phase ?? "L",
        };
        results.meta[n.id] = { shaft_kW: shaft_W / 1000 };
        break;
      }

      case "FLASH": {
        const F = one?.F ?? 0;
        const T = n.spec?.T ?? (one?.T ?? 340);
        const P = n.spec?.P ?? (one?.P ?? 101);
        const z = one?.z ?? 0.5;
        const comp1 = n.spec?.comp1 || "Benzene";
        const comp2 = n.spec?.comp2 || "Toluene";
        const { V, L, yLK, xLK, K1, K2, Vfrac, method } = flashBinary({
          F,
          zLK: z,
          T_K: T,
          P_kPa: P,
          comp1,
          comp2,
          method: state.propPack,
        });
        const vapor = {
          ...one,
          name: `${n.name}-VAP`,
          F: V,
          T,
          P,
          z: yLK,
          phase: "V",
        };
        const liq = {
          ...one,
          name: `${n.name}-LIQ`,
          F: L,
          T,
          P,
          z: xLK,
          phase: "L",
        };
        if (outEdges[0]) emit(outEdges[0], vapor);
        if (outEdges[1]) emit(outEdges[1], liq);
        results.meta[n.id] = {
          K_LK: K1,
          K_HK: K2,
          Vfrac,
          xLK,
          yLK,
          method,
        };
        continue;
      }

      case "RECYCLE": {
        // RECYCLE is a pass-through in the forward pass.
        // The loop closure is handled by the outer solver.
        break;
      }

      default:
        break;
    }

    for (const e of outEdges) emit(e, outlet);
  }

  return results;
}

// ---------- recycle solver (Wegstein) ----------
function streamDiff(a, b) {
  // L2 norm over [F, T, P, z]
  const ax = [a?.F || 0, a?.T || 0, a?.P || 0, a?.z || 0];
  const bx = [b?.F || 0, b?.T || 0, b?.P || 0, b?.z || 0];
  const d2 = ax.reduce((s, ai, i) => s + (ai - bx[i]) ** 2, 0);
  return Math.sqrt(d2);
}
function mixStreams(a, b, lambda) {
  return {
    F: a.F + lambda * (b.F - a.F),
    T: a.T + lambda * (b.T - a.T),
    P: a.P + lambda * (b.P - a.P),
    z: a.z + lambda * (b.z - a.z),
    phase: b.phase || a.phase || "L",
  };
}

export function runFlowsheet(state) {
  const { nodes, edges } = state;

  // Identify recycle nodes (node.type === "RECYCLE") and their loop edges:
  // convention: recycle node must have exactly 1 incoming edge (return stream)
  // and 1 outgoing edge (send guess to process).
  const recycles = nodes
    .filter((n) => n.type === "RECYCLE")
    .map((n) => {
      const incoming = edges.filter((e) => e.to === n.id)[0]; // return
      const outgoing = edges.filter((e) => e.from === n.id)[0]; // send
      return { id: n.id, incoming, outgoing };
    });

  if (recycles.length === 0) {
    // simple case: no recycles
    return forwardPass(state);
  }

  // Initialize guesses (from node spec or a tiny stream)
  let guess = {};
  for (const r of recycles) {
    const n = nodes.find((x) => x.id === r.id);
    guess[r.id] = {
      F: n.spec?.F0 ?? 1e-6,
      T: n.spec?.T0 ?? 320,
      P: n.spec?.P0 ?? 101,
      z: n.spec?.z0 ?? 0.5,
      phase: "L",
    };
  }

  const maxIter = 50;
  const tol = 1e-4;

  // Wegstein variables
  let prevGuess = clone(guess);
  let prevOut = null;

  for (let k = 0; k < maxIter; k++) {
    // Run forward with current recycle guesses
    const res = forwardPass(state, guess);

    // Read recycle *return* streams produced by process back into recycle nodes
    const newOut = {};
    for (const r of recycles) {
      const key = `${r.incoming.from}->${r.incoming.to}`;
      newOut[r.id] = clone(res.streams[key]) || clone(guess[r.id]);
    }

    // Check convergence
    let maxErr = 0;
    for (const r of recycles) {
      maxErr = Math.max(maxErr, streamDiff(newOut[r.id], guess[r.id]));
    }
    if (maxErr < tol) {
      // converged, return this solution
      return res;
    }

    // Wegstein acceleration
    if (prevOut) {
      for (const r of recycles) {
        const gk = guess[r.id];
        const fk = newOut[r.id];
        const gk1 = prevGuess[r.id];
        const fk1 = prevOut[r.id];

        // Compute scalar lambda from F component (robust & simple)
        const num = (fk.F - gk.F) - (fk1.F - gk1.F);
        const den = (fk.F - fk1.F) - (gk.F - gk1.F);
        let alpha = den !== 0 ? -num / den : 0.5;
        if (!isFinite(alpha)) alpha = 0.5;
        alpha = Math.max(-1, Math.min(1, alpha)); // damp

        // Next guess
        guess[r.id] = mixStreams(gk, fk, alpha);
      }
    } else {
      // simple relaxation on first step
      for (const r of recycles) guess[r.id] = mixStreams(guess[r.id], newOut[r.id], 0.5);
    }

    prevGuess = clone(guess);
    prevOut = clone(newOut);
  }

  // if we get here, didn’t converge: return last forward pass
  return forwardPass(state, guess);
}
