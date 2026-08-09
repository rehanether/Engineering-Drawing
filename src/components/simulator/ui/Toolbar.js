// …existing imports…
import React from "react";
import { useSim } from "../state/SimContext";
import "../../process/Process.css";

export default function Toolbar() {
  const { state, dispatch } = useSim();

  const add = (nodeType, title) => (
    <div
      key={nodeType}
      className="edg-palette"
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("application/edg-node-type", nodeType);
        e.dataTransfer.effectAllowed = "move";
      }}
      onClick={() =>
        dispatch({ type: "ADD_NODE", nodeType, afterId: state.selection })
      }
      title="Drag onto the canvas or click to chain after selected block"
    >
      <><span className={`edg-unit-icon edg-unit-${nodeType.toLowerCase()}`}>{title.slice(0,2).toUpperCase()}</span><span>{title}</span><b>＋</b></>
    </div>
  );

  return (
    <aside className="edg-card edg-sim-toolbar">
      <div className="edg-toolbar-title"><span>Model library</span><small>Drag onto flowsheet</small></div>
      <div className="edg-palette-list">
        {add("FEED", "Feed")}
        {add("MIXER", "Mixer")}
        {add("SPLITTER", "Splitter")}
        {add("HEATER", "Heater")}
        {add("VALVE", "Valve")}
        {add("HX", "Heat Exchanger")}
        {add("PUMP", "Pump")}
        {add("FLASH", "Flash Drum")}
        {add("RECYCLE", "Recycle")}
        {add("PRODUCT", "Product")}
      </div>
    </aside>
  );
}
