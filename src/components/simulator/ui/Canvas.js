import React, { useMemo, useCallback } from "react";
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
    () => state.edges.map((e) => ({ id: e.id, source: e.from, target: e.to, animated: true })),
    [state.edges]
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

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onConnect={onConnect}
      onNodeClick={(_,node)=>dispatch({type:"SELECT",id:node.id})}
      onDrop={onDrop}
      onDragOver={onDragOver}
      fitView
    >
      <Background />
      <Controls />
      <MiniMap />
    </ReactFlow>
  );
}
