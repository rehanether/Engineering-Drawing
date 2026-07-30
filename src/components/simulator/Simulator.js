// …existing imports…
import React, { useEffect } from "react";
import { ReactFlowProvider } from "reactflow";
import { SimProvider, useSim } from "./state/SimContext";
import Canvas from "./ui/Canvas";
import Toolbar from "./ui/Toolbar";
import Inspector from "./ui/Inspector";
import "../process/Process.css";

function InnerSim() {
  const { state, dispatch } = useSim();

  // Load on mount
  useEffect(() => {
    const raw = localStorage.getItem("edg-sim-state");
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        dispatch({ type: "LOAD_STATE", payload: parsed });
      } catch (e) {}
    }
    // eslint-disable-next-line
  }, []);

  // Save on any change
  useEffect(() => {
    const toSave = { ...state, results: { streams: {}, meta: {} } }; // don’t persist results
    localStorage.setItem("edg-sim-state", JSON.stringify(toSave));
  }, [state]);

  return (
    <div className="edg-page">
      <Toolbar />
      <div className="edg-sim-layout">
        <div className="edg-card" style={{ flex: 1 }}>
          <ReactFlowProvider>
            <Canvas />
          </ReactFlowProvider>
        </div>
        <Inspector />
      </div>
    </div>
  );
}

export default function Simulator() {
  return (
    <SimProvider>
      <InnerSim />
    </SimProvider>
  );
}



