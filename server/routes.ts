import type { Express } from "express";
import { createServer, type Server } from "http";
import { createPublicClient, http } from 'viem';
import { mainnet, polygon, arbitrum, optimism, base, avalanche, bsc } from 'viem/chains';
import { createBundlerProvider } from './bundler/providers';

// Network configurations
const NETWORKS = {
  1: mainnet,
  137: polygon,
  42161: arbitrum,
  10: optimism,
  8453: base,
  43114: avalanche,
  56: bsc
};

// ERC-4337 EntryPoint addresses
const ENTRY_POINT_ADDRESSES = {
  1: '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789',
  137: '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789',
  42161: '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789',
  10: '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789',
  8453: '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789',
  43114: '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789',
  56: '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789'
};

// Initialize the bundler provider
const bundlerProvider = createBundlerProvider();

export function registerRoutes(app: Express): Server {
  // Add endpoints for smart wallet nonce and entry point
  app.get('/api/smart-wallet/nonce', async (req, res) => {
    try {
      const { address, chainId } = req.query;
      if (!address || !chainId) {
        return res.status(400).json({ error: 'Missing address or chainId' });
      }

      // For testing and development, return a zero nonce
      // In production, this should be fetched from the actual smart wallet contract
      console.log(`Returning test nonce for address ${address} on chain ${chainId}`);
      res.json(0);
    } catch (error) {
      console.error('Error fetching nonce:', error);
      res.status(500).json({ error: 'Failed to fetch nonce' });
    }
  });

  app.get('/api/smart-wallet/entry-point', async (req, res) => {
    try {
      const { chainId } = req.query;
      if (!chainId) {
        return res.status(400).json({ error: 'Missing chainId' });
      }

      const entryPoint = ENTRY_POINT_ADDRESSES[Number(chainId) as keyof typeof ENTRY_POINT_ADDRESSES];
      if (!entryPoint) {
        return res.status(400).json({ error: 'Unsupported chain ID' });
      }

      res.json(entryPoint);
    } catch (error) {
      console.error('Error fetching entry point:', error);
      res.status(500).json({ error: 'Failed to fetch entry point address' });
    }
  });

  // API routes for token prices and transaction history
  app.get('/api/tokens/prices', async (req, res) => {
    try {
      // Implement token price fetching
      res.json([]);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch token prices' });
    }
  });

  app.get('/api/transactions/:address', async (req, res) => {
    try {
      const { address } = req.params;
      // Implement transaction history fetching
      res.json([]);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch transactions' });
    }
  });

  // Token balance endpoint
  app.post('/api/tokens/balance', async (req, res) => {
    try {
      const { tokenAddress, userAddress, chainId } = req.body;

      console.log(`Fetching balance for token ${tokenAddress} on chain ${chainId} for user ${userAddress}`);

      if (chainId === 137 && tokenAddress === '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359') {
        console.log('Fetching Polygon USDC balance');
      }

      const chain = NETWORKS[chainId as keyof typeof NETWORKS];
      if (!chain) {
        return res.status(400).json({ error: 'Unsupported chain ID' });
      }

      const client = createPublicClient({
        chain,
        transport: http()
      });

      const balance = await client.readContract({
        address: tokenAddress as `0x${string}`,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [userAddress as `0x${string}`]
      });

      console.log(`Raw balance result for ${tokenAddress} on ${chain.name}: ${balance.toString()}`);

      res.json({ balance: balance.toString() });
    } catch (error) {
      console.error('Error fetching token balance:', error);
      res.status(500).json({ error: 'Failed to fetch token balance' });
    }
  });

  // Updated UserOperation submission endpoint
  app.post('/api/send-user-operation', async (req, res) => {
    try {
      const { userOp, network } = req.body;
      const entryPoint = ENTRY_POINT_ADDRESSES[network as keyof typeof ENTRY_POINT_ADDRESSES];

      if (!entryPoint) {
        throw new Error(`Unsupported network: ${network}`);
      }

      console.log(`Sending UserOperation to network ${network} via Alchemy bundler`);
      console.log('UserOperation:', JSON.stringify(userOp, null, 2));

      const result = await bundlerProvider.sendUserOperation(userOp, entryPoint, network);
      res.json(result);
    } catch (error) {
      console.error('Error sending UserOperation:', error);
      let errorMessage = error instanceof Error ? error.message : 'Unknown error';
      let errorDetails = error instanceof Error ? error.toString() : JSON.stringify(error);

      res.status(500).json({
        error: 'Failed to send UserOperation',
        message: errorMessage,
        details: errorDetails,
        timestamp: new Date().toISOString(),
        path: '/api/send-user-operation'
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

const ERC20_ABI = [{
  name: 'balanceOf',
  type: 'function',
  stateMutability: 'view',
  inputs: [{ name: 'account', type: 'address' }],
  outputs: [{ name: 'balance', type: 'uint256' }]
}] as const;