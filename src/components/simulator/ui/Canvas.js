import React, { useMemo, useCallback, useEffect } from "react";
import ReactFlow, { Background, Controls, MiniMap, useReactFlow } from "reactflow";
import "reactflow/dist/style.css";
import { useSim } from "../state/SimContext";

export default function Canvas() {
  const { state, dispatch } = useSim();
  const rf = useReactFlow();

  const nodes = useMemo(
    () =>
      state.nodes.map((n) => ({
        id: n.id,
        position: n.pos || { x: 100, y: 100 },
        data: { label: `${n.type}\n${n.name}` },
        style: {
          padding: 8,
          border: "1px solid #334155",
          borderRadius: n.type === "FLASH" ? 18 : 6,
          background: "#fff",
          fontSize: 12,
        },
      })),
    [state.nodes]
  );

  const edges = useMemo(
    () => state.edges.map((e) => ({ id: e.id, source: e.from, target: e.to, animated: true,selected:e.id===state.ui?.selectedEdge,style:e.id===state.ui?.selectedEdge?{stroke:"#e24a3b",strokeWidth:4}:{},label:e.id===state.ui?.selectedEdge?"Selected · Disconnect":"" })),
    [state.edges,state.ui?.selectedEdge]
  );

  const onDragOver = useCallback((evt) => {
    evt.preventDefault();
    evt.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (evt) => {
      evt.preventDefault();
      const nodeType = evt.dataTransfer.getData("application/edg-node-type");
      if (!nodeType) return;
      const pt = rf.project({ x: evt.clientX, y: evt.clientY });
      dispatch({ type: "ADD_NODE", nodeType, pos: { x: pt.x, y: pt.y } });
    },
    [dispatch, rf]
  );

  const onNodesChange = useCallback(
    (changes) => {
      changes.forEach((ch) => {
        if (ch.type === "position" && ch.dragging === false) {
          dispatch({ type: "MOVE_NODE", id: ch.id, pos: ch.position });
        }
      });
    },
    [dispatch]
  );

  const onConnect = useCallback(
    (params) => {
      dispatch({ type: "ADD_EDGE", from: params.source, to: params.target });
    },
    [dispatch]
  );
  const selectNode=useCallback((_,node)=>{const from=state.ui?.connectFrom;if(from&&from!==node.id){dispatch({type:"ADD_EDGE",from,to:node.id});return;}dispatch({type:"SELECT",id:node.id});},[dispatch,state.ui?.connectFrom]);
  useEffect(()=>{const key=e=>{if((e.key==="Delete"||e.key==="Backspace")&&!/INPUT|TEXTAREA|SELECT/.test(e.target?.tagName))dispatch({type:"DELETE_SELECTION"});};window.addEventListener("keydown",key);return()=>window.removeEventListener("keydown",key);},[dispatch]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onConnect={onConnect}
      onNodeClick={selectNode}
      onEdgeClick={(_,edge)=>dispatch({type:"SELECT_EDGE",id:edge.id})}
      onEdgeDoubleClick={(_,edge)=>dispatch({type:"DELETE_EDGE",id:edge.id})}
      onPaneClick={()=>dispatch({type:"CLEAR_CONNECT"})}
      onDrop={onDrop}
      onDragOver={onDragOver}
      fitView
      fitViewOptions={{ padding: 0.15, minZoom: 0.55, maxZoom: 1 }}
      connectionRadius={28}
      elementsSelectable
    >
      <Background />
      <Controls />
      <MiniMap />
    </ReactFlow>
  );
}
