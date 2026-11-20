import { ethers } from 'ethers';
import EtherBallotABI from '../contracts/EtherBallotABI.json';

// Default / fallback deployed contract address
// In production, set VITE_CONTRACT_ADDRESS in .env
export const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS || '0x5FbDB2315678afecb367f032d93F642f64180aa3';

// Supported networks (e.g., Sepolia Testnet, Localhost)
export const NETWORKS = {
  11155111: {
    chainId: '0xaa36a7',
    chainName: 'Sepolia Testnet',
    nativeCurrency: { name: 'Sepolia ETH', symbol: 'SEP', decimals: 18 },
    rpcUrls: ['https://rpc.sepolia.org'],
    blockExplorerUrls: ['https://sepolia.etherscan.io']
  },
  31337: {
    chainId: '0x7a69',
    chainName: 'Hardhat Localhost',
    nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
    rpcUrls: ['http://127.0.0.1:8545']
  }
};

class Web3Service {
  constructor() {
    this.provider = null;
    this.signer = null;
    this.contract = null;
    this.readOnlyContract = null;
    this.account = null;
    this.chainId = null;
    this.listeners = new Set();
  }

  // Check if MetaMask or any Web3 wallet is present in window
  isMetaMaskAvailable() {
    return typeof window !== 'undefined' && Boolean(window.ethereum);
  }

  // Get Injected Browser Provider (Ethers v6)
  getProvider() {
    if (!this.provider && this.isMetaMaskAvailable()) {
      this.provider = new ethers.BrowserProvider(window.ethereum, 'any');
    }
    return this.provider;
  }

  // Get Read-Only Contract Instance
  getReadOnlyContract() {
    if (this.readOnlyContract) return this.readOnlyContract;

    const provider = this.getProvider();
    if (provider) {
      this.readOnlyContract = new ethers.Contract(CONTRACT_ADDRESS, EtherBallotABI, provider);
      return this.readOnlyContract;
    }
    return null;
  }

  // Connect Wallet (MetaMask)
  async connectWallet() {
    if (!this.isMetaMaskAvailable()) {
      throw new Error('MetaMask is not installed. Please install MetaMask to enable Web3 signing.');
    }

    try {
      const provider = this.getProvider();
      // Request account access
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts selected in wallet.');
      }

      this.account = ethers.getAddress(accounts[0].toLowerCase());
      this.signer = await provider.getSigner();
      this.contract = new ethers.Contract(CONTRACT_ADDRESS, EtherBallotABI, this.signer);

      const network = await provider.getNetwork();
      this.chainId = Number(network.chainId);

      this.setupEventListeners();
      this.notifyListeners();

      return {
        account: this.account,
        chainId: this.chainId,
        contractAddress: CONTRACT_ADDRESS
      };
    } catch (err) {
      console.error('Wallet connection error:', err);
      if (err.code === 4001) {
        throw new Error('Connection request was rejected in MetaMask.');
      }
      throw err;
    }
  }

  // Disconnect Wallet
  disconnectWallet() {
    this.account = null;
    this.signer = null;
    this.contract = null;
    this.notifyListeners();
  }

  // Switch to target network
  async switchNetwork(targetChainId = 11155111) {
    if (!this.isMetaMaskAvailable()) return;

    const hexChainId = '0x' + targetChainId.toString(16);
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: hexChainId }]
      });
    } catch (switchError) {
      // 4902 error code indicates the chain has not been added to MetaMask
      if (switchError.code === 4902 && NETWORKS[targetChainId]) {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [NETWORKS[targetChainId]]
        });
      } else {
        throw switchError;
      }
    }
  }

  // Listen to MetaMask account / network change events
  setupEventListeners() {
    if (!this.isMetaMaskAvailable() || this._eventsAttached) return;

    window.ethereum.on('accountsChanged', (accounts) => {
      if (!accounts || accounts.length === 0) {
        this.disconnectWallet();
      } else {
        this.account = ethers.getAddress(accounts[0].toLowerCase());
        if (this.provider) {
          this.provider.getSigner().then(s => {
            this.signer = s;
            this.contract = new ethers.Contract(CONTRACT_ADDRESS, EtherBallotABI, s);
            this.notifyListeners();
          });
        }
      }
    });

    window.ethereum.on('chainChanged', (chainIdHex) => {
      this.chainId = parseInt(chainIdHex, 16);
      this.provider = new ethers.BrowserProvider(window.ethereum, 'any');
      this.notifyListeners();
    });

    this._eventsAttached = true;
  }

  // Subscribe to state changes (React Context helper)
  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  notifyListeners() {
    for (const callback of this.listeners) {
      try {
        callback({
          account: this.account,
          chainId: this.chainId,
          isConnected: Boolean(this.account && this.signer)
        });
      } catch {}
    }
  }

  // ═══════════════════════════════════════════
  //  SMART CONTRACT VOTING FUNCTIONS
  // ═══════════════════════════════════════════

  /**
   * Cast vote directly on the Ethereum Smart Contract
   * @param {number|string} electionId 
   * @param {number|string} candidateId (1-based on smart contract)
   * @param {string} aadhaarNumber (12-digit string to compute keccak256 hash)
   */
  async castVoteOnChain(electionId, candidateId, aadhaarNumber) {
    if (!this.contract || !this.signer) {
      await this.connectWallet();
    }

    if (!this.contract) {
      throw new Error('Contract not initialized. Connect wallet first.');
    }

    // Convert candidateId to 1-based index if received as 0-based
    const contractCandidateId = Number(candidateId) + 1;
    const contractElectionId = Number(electionId);

    // Compute bytes32 keccak256 hash of Aadhaar number
    const aadhaarString = String(aadhaarNumber || '').trim();
    const aadhaarHash = ethers.keccak256(ethers.toUtf8Bytes(aadhaarString));

    try {
      // 1. Gas Estimation
      const gasEstimate = await this.contract.castVote.estimateGas(
        contractElectionId,
        contractCandidateId,
        aadhaarHash
      ).catch(() => 250000n); // Safe gas limit fallback

      // 2. Broadcast Transaction
      const tx = await this.contract.castVote(
        contractElectionId,
        contractCandidateId,
        aadhaarHash,
        { gasLimit: (gasEstimate * 120n) / 100n } // 20% safety margin
      );

      // 3. Wait for 1 block confirmation
      const receipt = await tx.wait(1);

      return {
        success: true,
        transactionHash: tx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        voteHash: tx.hash,
        receipt
      };
    } catch (err) {
      console.error('On-chain castVote error:', err);
      // Decode user-friendly errors
      if (err.message?.includes('already voted in this election')) {
        throw new Error('Smart Contract: You have already voted in this election.');
      }
      if (err.message?.includes('Aadhaar has already been used')) {
        throw new Error('Smart Contract: This Aadhaar has already been used to cast a ballot.');
      }
      if (err.code === 'ACTION_REJECTED' || err.code === 4001) {
        throw new Error('Transaction was rejected in MetaMask.');
      }
      throw err;
    }
  }

  /**
   * Check if an address has voted in an election on-chain
   */
  async hasVotedOnChain(electionId, voterAddress = this.account) {
    const contract = this.contract || this.getReadOnlyContract();
    if (!contract || !voterAddress) return false;

    try {
      return await contract.hasVoterVoted(Number(electionId), voterAddress);
    } catch (err) {
      console.warn('hasVoterVoted call error:', err);
      return false;
    }
  }

  /**
   * Fetch results directly from Smart Contract
   */
  async getResultsOnChain(electionId) {
    const contract = this.contract || this.getReadOnlyContract();
    if (!contract) throw new Error('Contract instance not available');

    try {
      const [names, parties, votes] = await contract.getResults(Number(electionId));
      return names.map((name, i) => ({
        candidateIndex: i,
        candidateName: name,
        party: parties[i],
        voteCount: Number(votes[i])
      }));
    } catch (err) {
      console.error('getResultsOnChain error:', err);
      throw err;
    }
  }

  /**
   * Fetch total votes for an election from Smart Contract
   */
  async getTotalVotesOnChain(electionId) {
    const contract = this.contract || this.getReadOnlyContract();
    if (!contract) return 0;
    try {
      const total = await contract.getTotalVotes(Number(electionId));
      return Number(total);
    } catch {
      return 0;
    }
  }

  /**
   * Fetch all candidates for an election from Smart Contract
   */
  async getAllCandidatesOnChain(electionId) {
    const contract = this.contract || this.getReadOnlyContract();
    if (!contract) return [];
    try {
      const candidates = await contract.getAllCandidates(Number(electionId));
      return candidates.map(c => ({
        id: Number(c.id),
        name: c.name,
        party: c.party,
        imageHash: c.imageHash,
        voteCount: Number(c.voteCount),
        exists: c.exists
      }));
    } catch (err) {
      console.warn('getAllCandidatesOnChain error:', err);
      return [];
    }
  }
}

export const web3Service = new Web3Service();
export default web3Service;
