const BASE_TAGS = {
  feedFlow: { value: 12.8, unit: 't/h', source: 'FT-101' },
  feedTemperature: { value: 74.2, unit: '°C', source: 'TT-101' },
  vaporRate: { value: 8.42, unit: 't/h', source: 'FT-201' },
  condensateRate: { value: 8.31, unit: 't/h', source: 'FT-202' },
  vacuum: { value: -0.82, unit: 'bar(g)', source: 'PT-201' },
  vaporTemperature: { value: 61.4, unit: '°C', source: 'TT-201' },
  circulationFlow: { value: 184, unit: 'm³/h', source: 'FT-301' },
  compressorLoad: { value: 76.5, unit: '%', source: 'ZT-401' },
  compressorPower: { value: 612, unit: 'kW', source: 'PWR-401' },
  productConcentration: { value: 47.8, unit: '% w/w', source: 'AIT-501' },
  productTarget: { value: 48, unit: '% w/w', source: 'SP-501' },
  heatTransferCoefficient: { value: 1.84, unit: 'kW/m²·K', source: 'CALC-U01' }
};

/** Simulated implementation of the connector contract used by PlantOps. */
export class MockScadaAdapter {
  constructor() { this.connected = false; this.startedAt = Date.now(); this.circulationTarget = 184; this.circulation = 184; }
  async connect() { this.connected = true; return this.getConnection(); }
  disconnect() { this.connected = false; }
  getConnection() {
    return { connected: this.connected, source: 'MVR-SIM-01', protocol: 'Simulated OPC UA', latency: 38, readOnly: true };
  }
  async readSnapshot() {
    if (!this.connected) throw new Error('Simulator disconnected');
    this.circulation += (this.circulationTarget - this.circulation) * .65;
    const phase = (Date.now() - this.startedAt) / 1000;
    const tags = Object.fromEntries(Object.entries(BASE_TAGS).map(([key, tag], index) => [key, {
      ...tag,
      value: Number((tag.value + Math.sin(phase / (4 + index % 3)) * Math.max(Math.abs(tag.value) * .006, .02)).toFixed(2)),
      quality: 'Good', timestamp: new Date().toISOString()
    }]));
    tags.circulationFlow.value = this.circulation;
    // Illustrative dynamic response only; this is not a calibrated plant model.
    const gain = 1 + (this.circulation - 184) * .003;
    tags.vaporRate.value *= gain;
    tags.condensateRate.value *= gain;
    return { tags, timestamp: new Date().toISOString() };
  }
  async writeSetpoint() { throw new Error('Real actuator writes are disabled. Use the simulation workflow.'); }
  async simulateSetpointWrite(tag, value) {
    if (!this.connected) throw new Error('Simulator disconnected');
    if (tag !== 'SP-FT-301' || !Number.isFinite(value) || value < 175 || value > 205 || Math.abs(value - this.circulationTarget) > 6) {
      throw new Error('Rejected: unknown tag or setpoint outside demo limits');
    }
    this.circulationTarget = value;
    return { tag, value, simulated: true, accepted: true, timestamp: new Date().toISOString() };
  }
}

export const connectorCapabilities = ['OPC UA', 'MQTT', 'Modbus TCP', 'REST', 'Historian API'];
