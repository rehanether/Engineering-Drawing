// …existing imports…
import React from "react";
import { useSim } from "../state/SimContext";
import "../../process/Process.css";

export default function Toolbar() {
  const { state, dispatch } = useSim();
  const [filter,setFilter] = React.useState("");

  const add = (nodeType, title) => !title.toLowerCase().includes(filter.toLowerCase()) ? null : (
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
      <div className="edg-model-search"><input value={filter} onChange={e=>setFilter(e.target.value)} placeholder="Search unit operations" aria-label="Search unit operations"/></div>
      <div className="edg-palette-list">
        <small className="edg-library-group">STREAMS</small>
        {add("FEED", "Feed")}
        {add("PRODUCT", "Product")}
        <small className="edg-library-group">MIXING & PRESSURE</small>
        {add("MIXER", "Mixer")}
        {add("SPLITTER", "Splitter")}
        {add("PUMP", "Pump")}
        {add("COMPRESSOR", "Compressor")}
        {add("VALVE", "Valve")}
        <small className="edg-library-group">HEAT TRANSFER</small>
        {add("HEATER", "Heater")}
        {add("COOLER", "Cooler")}
        {add("HX", "Heat Exchanger")}
        <small className="edg-library-group">SEPARATION</small>
        {add("FLASH", "Flash Drum")}
        {add("SEP", "Component Separator")}
        <small className="edg-library-group">REACTION & LOOPS</small>
        {add("CSTR", "CSTR Reactor")}
        {add("RECYCLE", "Recycle")}
      </div>
    </aside>
  );
}
