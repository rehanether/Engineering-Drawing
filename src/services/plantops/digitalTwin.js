const value = (tags, key) => tags[key]?.value ?? 0;

export function calculateMvrTwin(snapshot) {
  const { tags } = snapshot;
  const feed = value(tags, 'feedFlow');
  const evaporation = (value(tags, 'vaporRate') + value(tags, 'condensateRate')) / 2;
  const sec = value(tags, 'compressorPower') / Math.max(evaporation, .1);
  const concentration = value(tags, 'productConcentration');
  const uValue = value(tags, 'heatTransferCoefficient');
  return {
    process: 'Single-effect MVR Evaporator', confidence: 96,
    kpis: {
      feedFlow: feed, evaporationRate: evaporation, specificEnergy: sec,
      concentration, productionEfficiency: Math.min(100, evaporation / 8.7 * 100),
      foulingIndex: Math.max(0, (2.12 - uValue) / 2.12 * 100), vacuum: value(tags, 'vacuum'),
      compressorLoad: value(tags, 'compressorLoad'), circulationFlow: value(tags, 'circulationFlow'),
      condensateRate: value(tags, 'condensateRate'), vaporTemperature: value(tags, 'vaporTemperature')
    },
    equipment: [
      { id: 'V-201', name: 'Evaporator body', health: 92 },
      { id: 'C-401', name: 'MVR compressor', health: 88 },
      { id: 'P-301', name: 'Circulation pump', health: 95 },
      { id: 'E-201', name: 'Calandria', health: 83 }
    ]
  };
}
