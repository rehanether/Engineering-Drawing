import { useEffect, useState } from "react";
import { Contract, JsonRpcProvider, formatUnits } from "ethers";
import presaleMeta from "../../EDGPresaleABI.json";

const BSC_RPC = process.env.REACT_APP_BSC_RPC || "https://bsc-dataseed.bnbchain.org";

export function useEdgLivePrice(edgAmount = 5000) {
  const [price, setPrice] = useState({ loading: true, bnb: 0.18, stage: null });

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const provider = new JsonRpcProvider(BSC_RPC, 56, { staticNetwork: true });
        const presale = new Contract(presaleMeta.ADDRESS, presaleMeta.ABI, provider);
        const stage = await presale.currentStage();
        const [bnbUsdRaw, edgUsdRaw] = await Promise.all([
          presale.bnbUsd1e18(),
          presale.stagePricesUsd(stage),
        ]);
        const bnbUsd = Number(formatUnits(bnbUsdRaw, 18));
        const edgUsd = Number(formatUnits(edgUsdRaw, 18));
        const bnb = bnbUsd > 0 ? (Number(edgAmount) * edgUsd) / bnbUsd : 0.18;
        if (active) setPrice({ loading: false, bnb, stage: Number(stage) + 1 });
      } catch {
        if (active) setPrice({ loading: false, bnb: 0.18, stage: null });
      }
    };

    load();
    const timer = window.setInterval(load, 60000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [edgAmount]);

  return price;
}

