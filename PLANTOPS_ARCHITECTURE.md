# EDG PlantOps MVP architecture

PlantOps is a simulation-first supervisory operations module. The browser dashboard never writes to a real actuator. The MVP path is:

`MockScadaAdapter → tag snapshot → MVR digital twin → KPI/recommendation service → operator approval → simulated setpoint → response verification → audit`

## Extension points

- **SCADA and historian ingestion:** implement the same adapter methods as `MockScadaAdapter` in `src/services/plantops`. Production connectors should run in a secured server/edge gateway—not in the browser—and may support OPC UA, MQTT, Modbus TCP, REST, or historian APIs.
- **Tag mapping and twin:** replace or extend `calculateMvrTwin` with versioned equipment models, engineering-unit validation, data-quality checks, and persisted time-series state.
- **Model inference and optimization:** replace `getRecommendations` with an authenticated inference service. Every recommendation must include evidence, confidence, operating constraints, and rollback conditions.
- **Approval:** persist named-operator approvals with role-based access, electronic signatures where required, expiry, and immutable audit events.
- **Control write:** add a separate server-side write service only after site validation. It must enforce allow-listed tags, bounded rate-of-change and absolute limits, two-person/site approval where required, watchdogs, verification, and automatic rollback. PLC/DCS/SIS/interlocks remain authoritative and must never be bypassed.

Only **Read Only**, **Copilot**, and the simulated approval workflow are intended for this MVP. Supervised and Constrained Control are visibly locked until a future secure connector is configured and commissioned.
