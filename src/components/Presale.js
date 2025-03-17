import React, { useState, useEffect } from 'react';
import './Presale.css';

function Presale() {
  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());

  function calculateTimeLeft() {
    const targetDate = new Date('March 31, 2025 00:00:00').getTime();
    const now = new Date().getTime();
    const difference = targetDate - now;

    if (difference <= 0) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0 };
    }

    return {
      days: Math.floor(difference / (1000 * 60 * 60 * 24)),
      hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
      minutes: Math.floor((difference / 1000 / 60) % 60),
      seconds: Math.floor((difference / 1000) % 60),
    };
  }

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="presale-fullscreen">
      <h1>Presale Starts Soon, Stay Updated</h1>
      <div className="countdown-timer">
        <span>{timeLeft.days}d</span> :
        <span>{timeLeft.hours}h</span> :
        <span>{timeLeft.minutes}m</span> :
        <span>{timeLeft.seconds}s</span>
      </div>
    </div>
  );
}

export default Presale;


/*
======= HIDDEN CODE BELOW =======

import React, { useEffect, useState } from 'react';
import './Presale.css'; // Keep your existing styles
import { ethers } from 'ethers';
import TOKEN_CONFIG from '../tokenConfig'; // Ensure correct token configuration


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

  // Setup Ethereum provider and contract
  useEffect(() => {
    const setupProvider = async () => {
      try {
        if (window.ethereum) {
          const provider = new ethers.providers.Web3Provider(window.ethereum);
          await window.ethereum.request({ method: 'eth_requestAccounts' }); // Request user wallet access
          const signer = provider.getSigner();
          const contractInstance = new ethers.Contract(TOKEN_ADDRESS, TOKEN_ABI, signer);

          setPresaleContract(contractInstance);

          // Fetch connected account
          const accounts = await provider.listAccounts();
          if (accounts.length > 0) {
            setConnectedAccount(accounts[0]);
          }
        } else {
          setError('Please install MetaMask to use this presale feature.');
        }
      } catch (setupError) {
        console.error('Setup error:', setupError);
        setError('Failed to initialize provider or contract.');
      }
    };
    setupProvider();
  }, [TOKEN_ADDRESS, TOKEN_ABI]);

  // Fetch initial presale data (token prices, stage, etc.)
  useEffect(() => {
    const fetchInitialData = async () => {
      if (!presaleContract) return;

      try {
        const ethPrice = await presaleContract.getEthToUsdtPrice();
        const bnbPrice = await presaleContract.getBnbToUsdtPrice();
        const currentStage = await presaleContract.getCurrentStage();
        const tokensSoldStage1 = await presaleContract.getTokensSold(1);
        const tokensSoldStage2 = await presaleContract.getTokensSold(2);
        const tokensSoldStage3 = await presaleContract.getTokensSold(3);
        const isPresaleOpen = await presaleContract.isPresaleOpen();

        setEthToUsdtPrice(parseFloat(ethers.utils.formatUnits(ethPrice, 18)));
        setBnbToUsdtPrice(parseFloat(ethers.utils.formatUnits(bnbPrice, 18)));
        setCurrentStage(parseInt(currentStage));
        setTokensSold({
          stage1: parseInt(tokensSoldStage1),
          stage2: parseInt(tokensSoldStage2),
          stage3: parseInt(tokensSoldStage3),
        });
        setPresaleOpen(isPresaleOpen);
      } catch (fetchError) {
        console.error('Error fetching presale data:', fetchError);
        setError('Failed to load presale data.');
      }
    };

    fetchInitialData();
  }, [presaleContract]);

  // Handle BNB amount input change
  const handleBnbAmountChange = (e) => {
    const value = e.target.value;
    setBnbAmount(value);
    if (!isNaN(value) && bnbToUsdtPrice > 0) {
      setEstimatedTokens((value * bnbToUsdtPrice) / 0.1); // Assuming 0.1 USDT per token
    }
  };

  // Buy tokens function
  const buyTokens = async () => {
    if (!presaleContract || !connectedAccount) {
      setError('Please connect your wallet.');
      return;
    }
    if (!bnbAmount || isNaN(bnbAmount) || bnbAmount <= 0) {
      setError('Enter a valid BNB amount.');
      return;
    }

    try {
      const tx = await presaleContract.buyTokens({
        value: ethers.utils.parseEther(bnbAmount),
      });
      await tx.wait();
      alert('Purchase successful!');
      setBnbAmount('');
    } catch (txError) {
      console.error('Transaction error:', txError);
      setError('Transaction failed.');
    }
  };

  return (
    <div className="presale-container">
      <h1>Presale Dashboard</h1>

      {error && <p className="error-message">{error}</p>}

      <div>
        <p>Connected Wallet: {connectedAccount || 'Not Connected'}</p>
        <p>ETH to USDT Price: {ethToUsdtPrice} USDT</p>
        <p>BNB to USDT Price: {bnbToUsdtPrice} USDT</p>
        <p>Current Stage: {currentStage}</p>
        <p>Presale Status: {presaleOpen ? 'Open' : 'Closed'}</p>
      </div>

      <div className="progress-bars">
        <div>
          <p>Stage 1 Sold: {tokensSold.stage1} / {stageSupply.stage1}</p>
          <progress value={tokensSold.stage1} max={stageSupply.stage1}></progress>
        </div>
        <div>
          <p>Stage 2 Sold: {tokensSold.stage2} / {stageSupply.stage2}</p>
          <progress value={tokensSold.stage2} max={stageSupply.stage2}></progress>
        </div>
        <div>
          <p>Stage 3 Sold: {tokensSold.stage3} / {stageSupply.stage3}</p>
          <progress value={tokensSold.stage3} max={stageSupply.stage3}></progress>
        </div>
      </div>

      <div className="purchase-section">
        <input
          type="number"
          placeholder="Enter BNB amount"
          value={bnbAmount}
          onChange={handleBnbAmountChange}
        />
        <p>Estimated Tokens: {estimatedTokens}</p>
        <button onClick={buyTokens} disabled={!presaleOpen}>Buy Tokens</button>
      </div>
    </div>
  );
}

export default Presale;
*/