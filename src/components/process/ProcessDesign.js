import React from "react";
import Simulator from "../simulator/Simulator";   // point to your simulator
import "./Process.css";                          // keep margins/spacing consistent

export default function ProcessDesign() {
  return (
    <div className="process-page">
      <Simulator />
    </div>
  );
}

