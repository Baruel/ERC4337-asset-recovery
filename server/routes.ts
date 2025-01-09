import type { Express } from "express";
import { createServer, type Server } from "http";
import { createPublicClient, http } from 'viem';
import { mainnet, polygon, arbitrum, optimism, base, avalanche, bsc } from 'viem/chains';
import { createBundlerProvider } from './bundler/providers';

// Network configurations with RPC URLs
const NETWORKS = {
  1: mainnet,
  137: {
    ...polygon,
    rpcUrls: {
      default: {
        http: ['https://polygon.llamarpc.com']
      },
      public: {
        http: ['https://polygon.llamarpc.com']
      }
    }
  },
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

// Simple Account Factory addresses
const FACTORY_ADDRESSES = {
  1: '0x9406Cc6185a346906296840746125a0E44976454',
  137: '0x9406Cc6185a346906296840746125a0E44976454',
  42161: '0x9406Cc6185a346906296840746125a0E44976454',
  10: '0x9406Cc6185a346906296840746125a0E44976454',
  8453: '0x9406Cc6185a346906296840746125a0E44976454',
  43114: '0x9406Cc6185a346906296840746125a0E44976454',
  56: '0x9406Cc6185a346906296840746125a0E44976454'
};

// Initialize the bundler provider
const bundlerProvider = createBundlerProvider();

// Factory ABI for computing counterfactual address
const FACTORY_ABI = [{
  inputs: [
    { name: 'owner', type: 'address' },
    { name: 'salt', type: 'uint256' }
  ],
  name: 'getAddress',
  outputs: [{ name: 'ret', type: 'address' }],
  stateMutability: 'view',
  type: 'function'
}] as const;

// Full ERC20 ABI for better error handling
const ERC20_ABI = [
  {
    constant: true,
    inputs: [{ name: '_owner', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: 'balance', type: 'uint256' }],
    type: 'function',
    stateMutability: 'view'
  },
  {
    constant: true,
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    type: 'function',
    stateMutability: 'view'
  }
] as const;

// Helper function to serialize BigInt values
function serializeBigIntValues(obj: any): any {
  if (typeof obj === 'bigint') {
    return obj.toString();
  }
  if (Array.isArray(obj)) {
    return obj.map(serializeBigIntValues);
  }
  if (obj !== null && typeof obj === 'object') {
    const entries = Object.entries(obj).map(([key, value]) => {
      if (typeof value === 'bigint') {
        return [key, value.toString()];
      }
      if (typeof value === 'string' && /^\d+$/.test(value)) {
        // Handle numeric strings that might be BigInt values
        try {
          const bigIntValue = BigInt(value);
          return [key, bigIntValue.toString()];
        } catch {
          return [key, value];
        }
      }
      return [key, serializeBigIntValues(value)];
    });
    return Object.fromEntries(entries);
  }
  return obj;
}

// Enhanced error handling helper
function formatServerError(error: any, context: Record<string, any> = {}) {
  const errorResponse = {
    error: 'Failed to send UserOperation',
    message: error instanceof Error ? error.message : 'Unknown error',
    details: error instanceof Error ? error.stack : JSON.stringify(error),
    timestamp: new Date().toISOString(),
    context
  };

  // Log detailed error information for debugging
  console.error('Error details:', {
    ...errorResponse,
    originalError: error
  });

  return errorResponse;
}

export function registerRoutes(app: Express): Server {
  // Add endpoint to compute smart wallet address
  app.post('/api/smart-wallet/compute-address', async (req, res) => {
    try {
      const { ownerAddress, chainId, salt } = req.body;

      const chain = NETWORKS[chainId as keyof typeof NETWORKS];
      if (!chain) {
        return res.status(400).json({ error: 'Unsupported chain ID' });
      }

      const factoryAddress = FACTORY_ADDRESSES[chainId as keyof typeof FACTORY_ADDRESSES];
      if (!factoryAddress) {
        return res.status(400).json({ error: 'No factory address for this chain' });
      }

      const client = createPublicClient({
        chain,
        transport: http()
      });

      const address = await client.readContract({
        address: factoryAddress as `0x${string}`,
        abi: FACTORY_ABI,
        functionName: 'getAddress',
        args: [ownerAddress as `0x${string}`, BigInt(salt)]
      });

      res.json({ address });
    } catch (error) {
      console.error('Error computing smart wallet address:', error);
      res.status(500).json({ error: 'Failed to compute smart wallet address' });
    }
  });

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

  // API routes for token balances with improved error handling and logging
  app.post('/api/tokens/balance', async (req, res) => {
    try {
      const { tokenAddress, userAddress, chainId } = req.body;

      console.log(`Fetching balance for token ${tokenAddress} on chain ${chainId} for user ${userAddress}`);

      // Special logging for Polygon USDC
      if (chainId === 137 && tokenAddress === '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359') {
        console.log('Fetching Polygon USDC balance with detailed logging');
        console.log('Network:', NETWORKS[137].name);
        console.log('RPC URL:', NETWORKS[137].rpcUrls.default.http[0]);
      }

      const chain = NETWORKS[chainId as keyof typeof NETWORKS];
      if (!chain) {
        return res.status(400).json({ error: 'Unsupported chain ID' });
      }

      const client = createPublicClient({
        chain,
        transport: http(chain.rpcUrls.default.http[0])
      });

      // First get token decimals for proper formatting
      let decimals = 18; // default
      try {
        decimals = await client.readContract({
          address: tokenAddress as `0x${string}`,
          abi: ERC20_ABI,
          functionName: 'decimals'
        });
        console.log(`Token decimals for ${tokenAddress}: ${decimals}`);
      } catch (error) {
        console.warn(`Failed to fetch decimals for token ${tokenAddress}:`, error);
      }

      // Create the balance query parameters
      const balanceParams = {
        address: tokenAddress as `0x${string}`,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [userAddress as `0x${string}`]
      };

      console.log('Balance query params:', JSON.stringify(balanceParams, null, 2));

      // Then get balance with more detailed logging
      const balance = await client.readContract(balanceParams);

      console.log(`Raw balance result for ${tokenAddress}: ${balance.toString()}`);
      console.log(`Formatted balance (with ${decimals} decimals): ${Number(balance) / Math.pow(10, decimals)}`);

      res.json({ balance: balance.toString(), decimals });
    } catch (error) {
      console.error('Error fetching token balance:', error);
      res.status(500).json({
        error: 'Failed to fetch token balance',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Updated send-user-operation endpoint with enhanced error handling
  app.post('/api/send-user-operation', async (req, res) => {
    try {
      const { userOp, network } = req.body;
      const entryPoint = ENTRY_POINT_ADDRESSES[network as keyof typeof ENTRY_POINT_ADDRESSES];

      if (!entryPoint) {
        throw new Error(`Unsupported network: ${network}`);
      }

      console.log(`Sending UserOperation to network ${network} via Alchemy bundler`);

      // Ensure userOp is properly serialized before logging and sending
      const serializedUserOp = serializeBigIntValues(userOp);
      console.log('UserOperation:', JSON.stringify(serializedUserOp, null, 2));

      const result = await bundlerProvider.sendUserOperation(serializedUserOp, entryPoint, network);

      // Serialize any BigInt values in the response
      const serializedResult = serializeBigIntValues(result);
      res.json(serializedResult);
    } catch (error) {
      console.error('Error sending UserOperation:', error);

      // Get the error context
      const context = {
        network,
        entryPoint: ENTRY_POINT_ADDRESSES[network as keyof typeof ENTRY_POINT_ADDRESSES],
        userOp: serializeBigIntValues(userOp),
        path: '/api/send-user-operation',
        timestamp: new Date().toISOString()
      };

      // Format and send detailed error response
      res.status(500).json(formatServerError(error, context));
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}