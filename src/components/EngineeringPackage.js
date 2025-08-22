// src/components/EngineeringPackage.js
import React, { useMemo, useState } from "react";
import GeneratedDiagram from "./GeneratedDiagram"; // your PFD canvas

export default function EngineeringPackage({ results }) {
  // Tabs: 0 = PFD, 1 = HMB/streams
  const [tab, setTab] = useState(0);

  // Safely pick numbers/strings from results (works even if results is null)
  const {
    feedFlow = "",
    vaporFlow = "",
    condensate = "",
    productFlow = "",
    sizingParams = {},
  } = results || {};
  const { heatTransferCoeff, deltaT, heatLoadKW, area, areaWithMargin } =
    sizingParams || {};

  // Prepare a simple HMB/streams table – computed once per results change
  const hmbRows = useMemo(() => {
    return [
      { name: "Feed", value: feedFlow ? `${feedFlow} kg/h` : "—" },
      {
        name: "Vapor to Compressor",
        value: vaporFlow ? `${vaporFlow} kg/h` : "—",
      },
      { name: "Condensate", value: condensate ? `${condensate} kg/h` : "—" },
      { name: "Product", value: productFlow ? `${productFlow} kg/h` : "—" },
    ];
  }, [feedFlow, vaporFlow, condensate, productFlow]);

  const sizingRows = useMemo(() => {
    return [
      { k: "U (W/m²·K)", v: heatTransferCoeff ?? "—" },
      { k: "ΔT (°C)", v: deltaT ?? "—" },
      { k: "Heat Load (kW)", v: heatLoadKW ?? "—" },
      { k: "Area Required (m²)", v: area ?? "—" },
      { k: "Area w/ 15% Margin (m²)", v: areaWithMargin ?? "—" },
    ];
  }, [heatTransferCoeff, deltaT, heatLoadKW, area, areaWithMargin]);

  return (
    <section className="eng-pack">
      <div className="eng-pack__tabs">
        <button
          className={`eng-pack__tab ${tab === 0 ? "is-active" : ""}`}
          onClick={() => setTab(0)}
        >
          Option 1 — PFD
        </button>
        <button
          className={`eng-pack__tab ${tab === 1 ? "is-active" : ""}`}
          onClick={() => setTab(1)}
        >
          Option 2 — HMB & Sizing
        </button>
      </div>

      <div className="eng-pack__body">
        {tab === 0 && (
          <div className="eng-pack__panel">
            {/* Your existing PFD widget */}
            <GeneratedDiagram results={results} />
          </div>
        )}

        {tab === 1 && (
          <div className="eng-pack__panel">
            <div className="eng-grid">
              <div className="eng-card">
                <div className="eng-card__title">Stream Summary</div>
                <table className="eng-table">
                  <tbody>
                    {hmbRows.map((r) => (
                      <tr key={r.name}>
                        <td className="k">{r.name}</td>
                        <td className="v">{r.value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="eng-card">
                <div className="eng-card__title">Key Sizing Parameters</div>
                <table className="eng-table">
                  <tbody>
                    {sizingRows.map((r) => (
                      <tr key={r.k}>
                        <td className="k">{r.k}</td>
                        <td className="v">{r.v}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

