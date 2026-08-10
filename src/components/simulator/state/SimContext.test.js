import { initialSimState, simReducer } from "./SimContext";

test("tap connection mode connects two selected blocks",()=>{
  let state=simReducer(initialSimState,{type:"SET_CONNECT_FROM",id:"F1"});
  state=simReducer(state,{type:"ADD_EDGE",from:"F1",to:"PRD"});
  expect(state.edges.some(e=>e.from==="F1"&&e.to==="PRD")).toBe(true);
  expect(state.ui.connectFrom).toBeNull();
});

test("selected connection can be disconnected",()=>{
  let state=simReducer(initialSimState,{type:"SELECT_EDGE",id:"eF1M1"});
  state=simReducer(state,{type:"DELETE_SELECTION"});
  expect(state.edges.some(e=>e.id==="eF1M1")).toBe(false);
  expect(state.ui.selectedEdge).toBeNull();
});

test("deleting a block also removes its connected lines",()=>{
  const state=simReducer({...initialSimState,selection:"M1"},{type:"DELETE_SELECTION"});
  expect(state.nodes.some(n=>n.id==="M1")).toBe(false);
  expect(state.edges.some(e=>e.from==="M1"||e.to==="M1")).toBe(false);
});
