import React, { useEffect, useState } from 'react';
import { BigNumber, utils } from "ethers";
import TOKEN_CONFIG from '../tokenConfig'; // Import your token configuration correctly
import './Presale.css'; // Assuming you have a CSS file to style the progress bars


function Presale() {
  const [presaleContract, setPresaleContract] = useState(null);
  const [connectedAccount, setConnectedAccount] = useState(null);
  const [ethToUsdtPrice, setEthToUsdtPrice] = useState(0);
  const [bnbToUsdtPrice, setBnbToUsdtPrice] = useState(0);
  const [tokensSold, setTokensSold] = useState({ stage1: 0, stage2: 0, stage3: 0 });
  const [bnbAmount, setBnbAmount] = useState('');
  const [estimatedTokens, setEstimatedTokens] = useState(0);
  const [error, setError] = useState(null);
  const [currentStage, setCurrentStage] = useState(0);
  const [presaleOpen, setPresaleOpen] = useState(true);
  const stageSupply = { stage1: 500000, stage2: 1000000, stage3: 1500000 };

  const TOKEN_ADDRESS = TOKEN_CONFIG.TOKEN_ADDRESS;
  const TOKEN_ABI = TOKEN_CONFIG.TOKEN_ABI;

  // Setup presale contract on page load
  useEffect(() => {
    const setupProvider = async () => {
      try {
        if (window.ethereum) {
          const provider = new ethers.BrowserProvider(window.ethereum);
          await window.ethereum.request({ method: 'eth_requestAccounts' }); // Request account access
          const signer = provider.getSigner();
          const contractInstance = new ethers.Contract(TOKEN_ADDRESS, TOKEN_ABI, signer);
          setPresaleContract(contractInstance);
        } else {
          setError('Please install MetaMask to use this presale feature.');
        }
      } catch (setupError) {
        console.error('Setup error:', setupError);
        setError('Failed to initialize the provider or signer.');
      }
    };
    setupProvider();
  }, [TOKEN_ADDRESS, TOKEN_ABI]);

  // Fetch initial presale data, such as token prices, current stage, etc.
  const fetchInitialData = async () => {
    try {
      if (presaleContract) {
        // Fetch ETH to USDT and BNB to USDT prices
        const ethPrice = await presaleContract.getETHPrice();
        const bnbPrice = await presaleContract.getBNBPrice();
        const stage = await presaleContract.currentStage();
        const open = await presaleContract.presaleOpen();

        setEthToUsdtPrice(parseFloat(ethers.utils.formatUnits(ethPrice, 18))); // Assuming price feed uses 18 decimals
        setBnbToUsdtPrice(parseFloat(ethers.utils.formatUnits(bnbPrice, 18)));
        setCurrentStage(stage);
        setPresaleOpen(open);

        // Fetch tokens sold for each stage
        const totalTokensSold = await presaleContract.tokensSold();
        const stage1MaxSupply = stageSupply.stage1;
        const stage2MaxSupply = stageSupply.stage2;

        let stage1Sold, stage2Sold, stage3Sold;

        if (totalTokensSold <= stage1MaxSupply) {
          stage1Sold = totalTokensSold;
          stage2Sold = 0;
          stage3Sold = 0;
        } else if (totalTokensSold <= stage1MaxSupply + stage2MaxSupply) {
          stage1Sold = stage1MaxSupply;
          stage2Sold = totalTokensSold - stage1MaxSupply;
          stage3Sold = 0;
        } else {
          stage1Sold = stage1MaxSupply;
          stage2Sold = stage2MaxSupply;
          stage3Sold = totalTokensSold - stage1MaxSupply - stage2MaxSupply;
        }

        setTokensSold({
          stage1: parseFloat(ethers.utils.formatUnits(stage1Sold, 18)),
          stage2: parseFloat(ethers.utils.formatUnits(stage2Sold, 18)),
          stage3: parseFloat(ethers.utils.formatUnits(stage3Sold, 18)),
        });
      }
    } catch (dataError) {
      console.error('Data fetch error:', dataError);
      setError('Failed to fetch initial presale data.');
    }
  };

  // Use effect to fetch the initial data after the contract is set
  useEffect(() => {
    if (presaleContract) {
      fetchInitialData();
    }
  }, [presaleContract]);

  // Calculate estimated tokens
  useEffect(() => {
    const calculateEstimate = () => {
      if (bnbAmount && bnbToUsdtPrice > 0) {
        let currentTokenPrice;
        switch (currentStage) {
          case 1:
            currentTokenPrice = 0.02;
            break;
          case 2:
            currentTokenPrice = 0.03;
            break;
          case 3:
            currentTokenPrice = 0.04;
            break;
          default:
            currentTokenPrice = 0;
        }
        const bnbInUsd = bnbAmount * bnbToUsdtPrice;
        const estimated = bnbInUsd / currentTokenPrice;
        setEstimatedTokens(estimated);
      } else {
        setEstimatedTokens(0);
      }
    };
    calculateEstimate();
  }, [bnbAmount, bnbToUsdtPrice, currentStage]);

  // Connect MetaMask wallet
  const connectWallet = async () => {
    try {
      if (window.ethereum) {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        setConnectedAccount(accounts[0]);
      } else {
        setError('Please install MetaMask to use this feature.');
      }
    } catch (walletError) {
      console.error('Wallet connection error:', walletError);
      setError('Failed to connect wallet.');
    }
  };

  // Handle token purchase
  const handleTokenPurchase = async () => {
    try {
      if (!bnbAmount) {
        setError('Please enter an amount to buy.');
        return;
      }
      if (!connectedAccount) {
        setError('Please connect your wallet first.');
        return;
      }
      if (!presaleContract) {
        setError('Presale contract is not loaded.');
        return;
      }
      if (!presaleOpen) {
        setError('Presale is not open.');
        return;
      }

      const transaction = await presaleContract.buyTokens(ethers.BigNumber.from(1), {
        value: ethers.utils.parseEther(bnbAmount), // Assuming BNB is used for the transaction
        gasLimit: 300000,
      });
      await transaction.wait();
      setError(null);
      alert('Purchase successful!');

      // Refetch the presale data to update the stage and tokens sold
      await fetchInitialData();
    } catch (purchaseError) {
      console.error('Purchase error:', purchaseError);
      setError('Failed to purchase tokens. Please try again.');
    }
  };

  // Helper function to calculate percentage
  const calculatePercentage = (sold, supply) => {
    return ((sold / supply) * 100).toFixed(2);
  };

  return (
    <div className="presale-container">
      <h1>Engineering Drawing Presale Page</h1>
      {error && <div className="error-message">{error}</div>}
      <div className="connected-account">
        Connected Account: {connectedAccount ? connectedAccount : 'Not connected'}
      </div>
      <div>ETH to USDT Price: {ethToUsdtPrice} USDT</div>
      <div>BNB to USDT Price: {bnbToUsdtPrice} USDT</div>

      <div className="stage-info">
        <h3>Presale Stages</h3>
        {['stage1', 'stage2', 'stage3'].map((stage, index) => (
          <div key={stage} className="stage">
            <h4>Stage {index + 1}</h4>
            <p>Price: {index === 0 ? '0.02' : index === 1 ? '0.03' : '0.04'} USDT per Token</p>
            <p>Tokens Sold: {tokensSold[stage]}</p>
            <div className="progress-bar">
              <div
                className="progress"
                style={{
                  width: `${calculatePercentage(tokensSold[stage], stageSupply[stage])}%`,
                }}
              >
                {calculatePercentage(tokensSold[stage], stageSupply[stage])}%
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="buy-tokens-section">
        <input
          type="text"
          placeholder="Enter amount in BNB"
          value={bnbAmount}
          onChange={(e) => setBnbAmount(e.target.value)}
        />
        <button onClick={handleTokenPurchase}>Buy Tokens</button>
        <div>Estimated EDG Tokens: {estimatedTokens.toFixed(2)}</div>
      </div>
      {!connectedAccount && <button onClick={connectWallet}>Connect Wallet</button>}
    </div>
  );
}

export default Presale;
