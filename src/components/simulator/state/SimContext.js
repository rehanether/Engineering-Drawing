import React, { createContext, useContext, useReducer, useEffect } from "react";
import { runFlowsheet } from "../simCore/engine";

const SimCtx = createContext(null);
const LS_KEY = "edg_sim_project_v1";

export const initialSimState = {
  projectName: "Untitled Simulation",
  propPack: "Raoult",
  nodes: [
    { id:"F1",  type:"FEED",    name:"Feed-1",   spec:{ F:100, T:360, P:101, z:0.6 }, pos:{x:120,y:200} },
    { id:"F2",  type:"FEED",    name:"Feed-2",   spec:{ F: 50, T:300, P:101, z:0.2 }, pos:{x:200,y:320} },
    { id:"M1",  type:"MIXER",   name:"Mixer-1",  spec:{},                                          pos:{x:360,y:240} },
    { id:"FL1", type:"FLASH",   name:"Flash-1",  spec:{ P:101, T:340, LK:"Benzene", HK:"Toluene" }, pos:{x:540,y:300} },
    { id:"H1",  type:"HEATER",  name:"Heater-1", spec:{ Tset:380 },                                 pos:{x:720,y:240} },
    { id:"P1",  type:"PUMP",    name:"Pump-1",   spec:{ dP:300, eta:0.7 },                          pos:{x:900,y:300} },
    { id:"PRD", type:"PRODUCT", name:"Product",  spec:{},                                          pos:{x:1080,y:240} }
  ],
  edges: [
    { id:"eF1M1", from:"F1", to:"M1" },
    { id:"eF2M1", from:"F2", to:"M1" },
    { id:"eM1FL", from:"M1", to:"FL1" },
    { id:"eFLH1", from:"FL1",to:"H1" },
    { id:"eH1P1", from:"H1", to:"P1" },
    { id:"eP1PR", from:"P1", to:"PRD" },
  ],
  selection: null,
  results: { streams:{}, meta:{}, diagnostics:{status:"ready",errors:[],warnings:[],iterations:0} },
  _counters: { FEED:2, MIXER:1, FLASH:1, HEATER:1, PUMP:1, PRODUCT:1 },
  ui: { connectFrom: null, selectedEdge: null }
};

function normalizeCase(value){
  if(!value||typeof value!=="object")return initialSimState;
  return {...initialSimState,...value,projectName:String(value.projectName||"Untitled Simulation").slice(0,100),nodes:Array.isArray(value.nodes)?value.nodes:initialSimState.nodes,edges:Array.isArray(value.edges)?value.edges:initialSimState.edges,results:{streams:{},meta:{},diagnostics:{status:"ready",errors:[],warnings:[],iterations:0}},_counters:{...initialSimState._counters,...(value._counters||{})},ui:{...initialSimState.ui,...(value.ui||{})}};
}

function makeId(type, counters) {
  const next = (counters[type] || 0) + 1;
  return [ `${type[0]}${next}`, { ...counters, [type]: next } ];
}

export function simReducer(state, action){
  switch(action.type){
    case "LOAD":
    case "LOAD_STATE": return normalizeCase(action.payload);
    case "RESET": return normalizeCase(initialSimState);

    case "SET_NAME": return {...state, projectName: action.name };
    case "SET_PROP": return {...state, propPack: action.pack };
    case "SET_NODE_SPEC": {
      const nodes = state.nodes.map(n => n.id===action.id ? {...n, spec:{...n.spec, ...action.spec}} : n);
      return {...state, nodes};
    }

    case "SELECT": return {...state, selection: action.id,ui:{...state.ui,selectedEdge:null} };
    case "SELECT_EDGE": return {...state,selection:null,ui:{...state.ui,selectedEdge:action.id,connectFrom:null}};

    case "SET_CONNECT_FROM": return { ...state, ui:{...state.ui, connectFrom: action.id } };
    case "CLEAR_CONNECT":    return { ...state, ui:{...state.ui, connectFrom: null } };

    case "ADD_NODE": {
      const { nodeType: type, pos, afterId } = action;
      const [ newId, counters ] = makeId(type, state._counters);

      const defaultSpec = {
        FEED:   { F:50, T:300, P:101, z:0.5 },
        MIXER:  {},
        FLASH:  { P:101, T:340, comp1:"Benzene", comp2:"Toluene" },
        HEATER: { Tset:350 },
        COOLER: { Tset:290 },
        PUMP:   { dP:200, eta:0.7 },
        COMPRESSOR:{ Pout:500, eta:0.75 },
        SEP:    { recovery:0.95 },
        CSTR:   { conversion:0.7, Tset:350 },
        PRODUCT:{}
      }[type] || {};

      const node = { id:newId, type, name:`${type[0]}-${newId}`, spec: defaultSpec, pos: pos || {x:120,y:120} };
      let nodes = [...state.nodes, node];
      let edges = state.edges;

      if (afterId) edges = [...edges, { id:`e${afterId}${newId}`, from:afterId, to:newId }];

      return { ...state, nodes, edges, selection:newId, _counters: counters };
    }

    case "MOVE_NODE": {
      const nodes = state.nodes.map(n => n.id===action.id ? {...n, pos:{...action.pos}} : n);
      return { ...state, nodes };
    }

    case "ADD_EDGE": {
      if (action.from === action.to) return state;
      const id = `e${action.from}${action.to}`;
      if (state.edges.some(e=>e.from===action.from && e.to===action.to)) return state;
      return { ...state, edges:[...state.edges, { id, from:action.from, to:action.to }],ui:{...state.ui,connectFrom:null,selectedEdge:null},selection:action.to };
    }

    case "DELETE_EDGE": return {...state,edges:state.edges.filter(e=>e.id!==action.id),ui:{...state.ui,selectedEdge:null}};
    case "DELETE_SELECTION": {
      if(state.ui?.selectedEdge)return {...state,edges:state.edges.filter(e=>e.id!==state.ui.selectedEdge),ui:{...state.ui,selectedEdge:null}};
      if(!state.selection)return state;
      return {...state,nodes:state.nodes.filter(n=>n.id!==state.selection),edges:state.edges.filter(e=>e.from!==state.selection&&e.to!==state.selection),selection:null};
    }

    case "DELETE_NODE": {
      const nodes = state.nodes.filter(n=>n.id!==action.id);
      const edges = state.edges.filter(e=>e.from!==action.id && e.to!==action.id);
      return { ...state, nodes, edges, selection:null };
    }

    case "RUN": {
      try{return {...state,results:runFlowsheet(state)};}
      catch(error){return {...state,results:{streams:{},meta:{},diagnostics:{status:"error",errors:[error?.message||"The solver could not complete this case."],warnings:[],iterations:0}}};}
    }
    default: return state;
  }
}

export function SimProvider({ children }){
  const [state, dispatch] = useReducer(simReducer, initialSimState, (init)=>{
    try{ const raw = localStorage.getItem(LS_KEY); return raw? normalizeCase(JSON.parse(raw)) : init; } catch{ return init; }
  });
  useEffect(()=>{ localStorage.setItem(LS_KEY, JSON.stringify(state)); }, [state]);
  useEffect(()=>{ dispatch({ type:"RUN" }); }, []);
  useEffect(()=>{ dispatch({ type:"RUN" }); }, [state.nodes, state.edges, state.propPack]);

  return <SimCtx.Provider value={{ state, dispatch }}>{children}</SimCtx.Provider>;
}
export const useSim = ()=> useContext(SimCtx);

