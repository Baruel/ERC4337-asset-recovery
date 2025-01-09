import type { Express } from "express";
import { createServer, type Server } from "http";
import { createPublicClient, http } from 'viem';
import { mainnet, polygon, arbitrum, optimism, base, avalanche, bsc } from 'viem/chains';
import { createBundlerProvider } from './bundler/providers';
import type { BundlerConfig } from './bundler/types';

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

// Create bundler provider based on environment configuration
const bundlerConfig: BundlerConfig = {
  type: process.env.BUNDLER_PROVIDER || 'stackup',
  apiKey: process.env.STACKUP_API_KEY || process.env.BUNDLER_API_KEY,
  baseUrl: process.env.BUNDLER_URL
};

let bundlerProvider: ReturnType<typeof createBundlerProvider>;
try {
  bundlerProvider = createBundlerProvider(bundlerConfig.type, bundlerConfig);
} catch (error) {
  console.error('Failed to initialize bundler provider:', error);
  // Continue without bundler provider - will fail at runtime if transactions are attempted
}

const ERC20_ABI = [{
  name: 'balanceOf',
  type: 'function',
  stateMutability: 'view',
  inputs: [{ name: 'account', type: 'address' }],
  outputs: [{ name: 'balance', type: 'uint256' }]
}] as const;

export function registerRoutes(app: Express): Server {
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

  // Token balance endpoint supporting multiple chains
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
      if (!bundlerProvider) {
        throw new Error('Bundler provider not configured');
      }

      const { userOp, network } = req.body;
      const entryPoint = ENTRY_POINT_ADDRESSES[network as keyof typeof ENTRY_POINT_ADDRESSES];

      if (!entryPoint) {
        throw new Error(`Unsupported network: ${network}`);
      }

      const result = await bundlerProvider.sendUserOperation(userOp, entryPoint, network);
      res.json(result);
    } catch (error) {
      console.error('Error sending UserOperation:', error);
      res.status(500).json({ error: 'Failed to send UserOperation' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}