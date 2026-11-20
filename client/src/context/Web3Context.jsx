import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import web3Service, { CONTRACT_ADDRESS } from '../services/web3Service';
import toast from 'react-hot-toast';

const Web3Context = createContext(null);

export const useWeb3 = () => {
  const context = useContext(Web3Context);
  if (!context) {
    throw new Error('useWeb3 must be used within a Web3Provider');
  }
  return context;
};

export const Web3Provider = ({ children }) => {
  const [account, setAccount] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState(null);

  // Check initial connection on mount if wallet is already unlocked
  useEffect(() => {
    if (localStorage.getItem('eb_wallet_disconnected') === 'true') {
      // User explicitly disconnected in this session; wait for manual click
      return;
    }

    if (web3Service.isMetaMaskAvailable()) {
      window.ethereum
        .request({ method: 'eth_accounts' })
        .then(async (accounts) => {
          if (accounts && accounts.length > 0) {
            try {
              const res = await web3Service.connectWallet();
              setAccount(res.account);
              setChainId(res.chainId);
              setIsConnected(true);
            } catch (err) {
              console.debug('Auto-connect note:', err);
            }
          }
        })
        .catch(() => {});
    }

    // Subscribe to web3Service updates
    const unsubscribe = web3Service.subscribe((state) => {
      setAccount(state.account);
      setChainId(state.chainId);
      setIsConnected(state.isConnected);
    });

    return () => unsubscribe();
  }, []);

  // Connect Wallet
  const connectWallet = useCallback(async () => {
    if (!web3Service.isMetaMaskAvailable()) {
      toast.error('MetaMask extension is not detected in your browser.');
      return false;
    }

    setIsConnecting(true);
    setError(null);
    localStorage.removeItem('eb_wallet_disconnected');
    try {
      const res = await web3Service.connectWallet();
      setAccount(res.account);
      setChainId(res.chainId);
      setIsConnected(true);
      toast.success(`Wallet connected: ${res.account.slice(0, 6)}...${res.account.slice(-4)}`);
      setIsConnecting(false);
      return true;
    } catch (err) {
      setError(err.message);
      toast.error(err.message || 'Failed to connect MetaMask wallet.');
      setIsConnecting(false);
      return false;
    }
  }, []);

  // Disconnect Wallet
  const disconnectWallet = useCallback(() => {
    localStorage.setItem('eb_wallet_disconnected', 'true');
    web3Service.disconnectWallet();
    setAccount(null);
    setChainId(null);
    setIsConnected(false);
    toast('Wallet disconnected', { icon: '🔌' });
  }, []);

  // Cast vote on-chain
  const castVoteOnChain = useCallback(async (electionId, candidateId, aadhaarNumber) => {
    return await web3Service.castVoteOnChain(electionId, candidateId, aadhaarNumber);
  }, []);

  // Read results on-chain
  const getResultsOnChain = useCallback(async (electionId) => {
    return await web3Service.getResultsOnChain(electionId);
  }, []);

  // Check if voted on-chain
  const hasVotedOnChain = useCallback(async (electionId, voterAddress) => {
    return await web3Service.hasVotedOnChain(electionId, voterAddress);
  }, []);

  const value = {
    account,
    chainId,
    isConnected,
    isConnecting,
    error,
    contractAddress: CONTRACT_ADDRESS,
    isMetaMaskAvailable: web3Service.isMetaMaskAvailable(),
    connectWallet,
    disconnectWallet,
    castVoteOnChain,
    getResultsOnChain,
    hasVotedOnChain
  };

  return <Web3Context.Provider value={value}>{children}</Web3Context.Provider>;
};
