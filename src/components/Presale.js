import React, { useState, useEffect, useMemo } from 'react';
import { ethers } from 'ethers';
import './Presale.css';
import tokenConfig from '../tokenConfig.json';

const Presale = () => {
  const [account, setAccount] = useState(null);
  const [presaleContract, setPresaleContract] = useState(null);
  const [ethToUsdtPrice, setEthToUsdtPrice] = useState('');
  const [inputAmount, setInputAmount] = useState('');
  const [estimatedTokens, setEstimatedTokens] = useState(0);
  const [tokensSold, setTokensSold] = useState({ stage1: 0, stage2: 0, stage3: 0 });
  const [isRequestingAccount, setIsRequestingAccount] = useState(false);

  const { TOKEN_ADDRESS, TOKEN_ABI } = tokenConfig;

  // Presale allocation information
  const STAGE_SUPPLIES = useMemo(() => ({
    stage1: 500000, // Stage 1: 5% of total supply
    stage2: 1000000, // Stage 2: 10% of total supply
    stage3: 1500000, // Stage 3: 15% of total supply
  }), []);

  const STAGE_PRICES = useMemo(() => ({
    stage1: 0.01,
    stage2: 0.02,
    stage3: 0.03,
  }), []);

  useEffect(() => {
    const setupProvider = async () => {
      if (!window.ethereum) {
        alert("Please install MetaMask to use this feature.");
        return;
      }

      if (isRequestingAccount) {
        console.log("Already processing a request. Please wait.");
        return;
      }

      try {
        setIsRequestingAccount(true);

        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const accounts = await provider.listAccounts();
        if (accounts.length > 0) {
          setAccount(accounts[0]);
        } else {
          await provider.send("eth_requestAccounts", []);
          const signer = provider.getSigner();
          const userAddress = await signer.getAddress();
          setAccount(userAddress);
        }

        const signer = provider.getSigner();
        const presaleContractInstance = new ethers.Contract(
          TOKEN_ADDRESS,
          TOKEN_ABI,
          signer
        );
        setPresaleContract(presaleContractInstance);

        // Fetch conversion rates (ETH/USDT)
        const [ethToUsdt] = await presaleContractInstance.getTokenConversionRates();
        setEthToUsdtPrice(ethers.utils.formatUnits(ethToUsdt, 18));

        // Fetch tokens sold for each stage
        const soldStage1 = await presaleContractInstance.tokensSoldStage1();
        const soldStage2 = await presaleContractInstance.tokensSoldStage2();
        const soldStage3 = await presaleContractInstance.tokensSoldStage3();
        setTokensSold({
          stage1: ethers.utils.formatUnits(soldStage1, 18),
          stage2: ethers.utils.formatUnits(soldStage2, 18),
          stage3: ethers.utils.formatUnits(soldStage3, 18),
        });
      } catch (error) {
        console.error("Error setting up provider:", error);
        alert(`Error setting up provider: ${error.message || JSON.stringify(error)}`);
      } finally {
        setIsRequestingAccount(false);
      }
    };

    if (!account && !isRequestingAccount) {
      setupProvider();
    }
  }, [account, isRequestingAccount, TOKEN_ABI, TOKEN_ADDRESS]);

  // Update estimated tokens whenever the inputAmount or ethToUsdtPrice changes
  useEffect(() => {
    if (inputAmount && ethToUsdtPrice) {
      const tokenPrice = STAGE_PRICES[`stage${getCurrentStage()}`];
      setEstimatedTokens((parseFloat(inputAmount) * parseFloat(ethToUsdtPrice)) / tokenPrice);
    }
  }, [inputAmount, ethToUsdtPrice, STAGE_PRICES, getCurrentStage]);

  const getCurrentStage = () => {
    if (tokensSold.stage1 < STAGE_SUPPLIES.stage1) return 1;
    if (tokensSold.stage2 < STAGE_SUPPLIES.stage2) return 2;
    return 3;
  };

  const handleBuyTokens = async () => {
    if (presaleContract && account) {
      try {
        console.log("Attempting to buy tokens...");
        if (!inputAmount || isNaN(inputAmount) || parseFloat(inputAmount) <= 0) {
          alert("Please enter a valid ETH amount.");
          return;
        }

        const ethValue = ethers.utils.parseEther(inputAmount);
        const numTokens = ethers.utils.parseUnits(estimatedTokens.toString(), 18);

        if (numTokens.lt(ethers.utils.parseUnits("100", 18))) {
          alert("You must purchase at least 100 EDG tokens");
          return;
        }

        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const balance = await provider.getBalance(account);
        if (balance.lt(ethValue)) {
          alert("Insufficient ETH balance to cover the token cost and gas fees.");
          return;
        }

        const gasLimit = ethers.utils.hexlify(500000);
        const tx = await presaleContract.buyTokens(numTokens, {
          value: ethValue,
          gasLimit,
        });

        await tx.wait();
        alert("Tokens purchased successfully!");

        // Update tokens sold after purchase
        const soldStage1 = await presaleContract.tokensSoldStage1();
        const soldStage2 = await presaleContract.tokensSoldStage2();
        const soldStage3 = await presaleContract.tokensSoldStage3();
        setTokensSold({
          stage1: ethers.utils.formatUnits(soldStage1, 18),
          stage2: ethers.utils.formatUnits(soldStage2, 18),
          stage3: ethers.utils.formatUnits(soldStage3, 18),
        });
      } catch (error) {
        console.error("Failed to buy tokens:", error);
        alert("Failed to buy tokens: " + (error.message || JSON.stringify(error)));
      }
    }
  };

  const connectWallet = async () => {
    if (isRequestingAccount) {
      alert("A wallet connection request is already being processed. Please wait.");
      return;
    }

    setIsRequestingAccount(true);

    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      const signer = provider.getSigner();
      const userAddress = await signer.getAddress();
      setAccount(userAddress);
    } catch (error) {
      console.error("Failed to connect wallet:", error);
      alert("Failed to connect wallet: " + error.message);
    } finally {
      setIsRequestingAccount(false);
    }
  };

  return (
    <div className="presale-container">
      <h2 className="presale-header">Token Presale - Stage {getCurrentStage()}</h2>
      <div className="presale-details">
        <p>ETH to USDT Price: {ethToUsdtPrice}</p>
        <p>Tokens Sold: {tokensSold[`stage${getCurrentStage()}`]}</p>
        <p>Remaining Tokens in Current Stage: {(STAGE_SUPPLIES[`stage${getCurrentStage()}`] - tokensSold[`stage${getCurrentStage()}`]).toLocaleString()} EDG</p>
      </div>
      <div className="presale-stages">
        {Object.keys(STAGE_SUPPLIES).map((stage, index) => (
          <div key={index} className="stage-card">
            <h3>Stage {index + 1}: {STAGE_SUPPLIES[stage].toLocaleString()} Tokens</h3>
            <p>Price: {STAGE_PRICES[stage]} USDT/USD</p>
            <div className="progress-bar">
              <div
                className="progress"
                style={{ width: `${(tokensSold[stage] / STAGE_SUPPLIES[stage]) * 100}%` }}
              ></div>
            </div>
          </div>
        ))}
      </div>
      {account ? (
        <div className="wallet-actions">
          <p>Connected Account: {account}</p>
          <input
            type="number"
            placeholder="Enter amount in ETH"
            value={inputAmount}
            onChange={(e) => setInputAmount(e.target.value)}
          />
          <p>Estimated Tokens: {estimatedTokens.toFixed(2)} EDG</p>
          <button className="connect-button" onClick={handleBuyTokens}>Buy Tokens</button>
          <button className="disconnect-button" onClick={() => setAccount(null)}>Disconnect Wallet</button>
        </div>
      ) : (
        <div className="wallet-actions">
          <button className="connect-button" onClick={connectWallet}>
            {isRequestingAccount ? 'Connecting...' : 'Connect Wallet'}
          </button>
        </div>
      )}
    </div>
  );
};

export default Presale;
