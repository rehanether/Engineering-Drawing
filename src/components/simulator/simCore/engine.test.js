import { runFlowsheet, validateFlowsheet } from "./engine";

const base={projectName:"Test",propPack:"Raoult",nodes:[{id:"F1",type:"FEED",name:"Feed",spec:{F:100,T:350,P:101,z:.5}},{id:"P1",type:"PRODUCT",name:"Product",spec:{}}],edges:[{id:"e1",from:"F1",to:"P1"}]};

test("solves a valid connected flowsheet",()=>{
  const result=runFlowsheet(base);
  expect(result.diagnostics.status).toBe("solved");
  expect(result.streams["F1->P1"].F).toBe(100);
});

test("blocks invalid feed specifications without throwing",()=>{
  const broken={...base,nodes:base.nodes.map(n=>n.type==="FEED"?{...n,spec:{...n.spec,F:0,z:2}}:n)};
  expect(validateFlowsheet(broken).errors.length).toBeGreaterThan(0);
  expect(runFlowsheet(broken).diagnostics.status).toBe("invalid");
});

test("reports malformed recycle loops instead of crashing",()=>{
  const recycle={...base,nodes:[...base.nodes,{id:"R1",type:"RECYCLE",name:"Recycle",spec:{}}]};
  expect(()=>runFlowsheet(recycle)).not.toThrow();
  expect(runFlowsheet(recycle).diagnostics.status).toBe("invalid");
});

test("zero-flow heat exchanger never produces infinite values",()=>{
  const hx={...base,nodes:[{...base.nodes[0],spec:{...base.nodes[0].spec,F:1e-9}},{id:"H1",type:"HX",name:"HX",spec:{UA:50,eff:.7,dT:20}},base.nodes[1]],edges:[{id:"a",from:"F1",to:"H1"},{id:"b",from:"H1",to:"P1"}]};
  const result=runFlowsheet(hx);
  expect(Number.isFinite(result.streams["H1->P1"].T)).toBe(true);
});
