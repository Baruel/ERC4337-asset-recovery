import type { Express } from "express";
import { createServer, type Server } from "http";
import { createPublicClient, http } from 'viem';
import { mainnet, polygon, arbitrum, optimism, base, avalanche, bsc } from 'viem/chains';
import { createBundlerProvider, type BundlerProvider } from './bundler/providers';

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

// Constants for Account Abstraction with updated Polygon factory and paymaster

const SIMPLE_ACCOUNT_FACTORY = {
  1: '0x9406Cc6185a346906296840746125a0E44976454',
  137: '0xE77f2C7D79B2743d39Ad73DC47a8e9C6416aD3f3', // Polygon-specific factory
  42161: '0x9406Cc6185a346906296840746125a0E44976454',
  10: '0x9406Cc6185a346906296840746125a0E44976454',
  8453: '0x9406Cc6185a346906296840746125a0E44976454',
  56: '0x9406Cc6185a346906296840746125a0E44976454',
  43114: '0x9406Cc6185a346906296840746125a0E44976454'
} as const;


// Remove hardcoded paymaster configuration and make it part of the bundler config
interface BundlerConfig {
  type?: string;
  apiKey: string;
  paymasterUrl?: string;
}

// Updated bundler provider initialization with configuration
let bundlerProvider: BundlerProvider | null = null;
let bundlerConfig: BundlerConfig | null = null;

function initializeBundlerProvider(config: BundlerConfig) {
  bundlerConfig = config;
  bundlerProvider = createBundlerProvider({
    type: config.type,
    apiKey: config.apiKey
  });
  console.log('Bundler provider initialized with configuration');
}

// Initialize with environment variables by default
try {
  if (process.env.ALCHEMY_API_KEY) {
    initializeBundlerProvider({ apiKey: process.env.ALCHEMY_API_KEY });
  } else {
    console.log('No default configuration found. Waiting for user configuration...');
  }
} catch (error) {
  console.warn('Failed to initialize bundler provider with environment variables:', error);
  console.log('Waiting for user-provided configuration...');
}

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
}, {
  inputs: [
    { name: 'owner', type: 'address' },
    { name: 'salt', type: 'uint256' }
  ],
  name: 'createAccount',
  outputs: [{ name: 'ret', type: 'address' }],
  stateMutability: 'nonpayable',
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

      const factoryAddress = SIMPLE_ACCOUNT_FACTORY[chainId as keyof typeof SIMPLE_ACCOUNT_FACTORY];
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

  // Add configuration endpoint for bundler settings
  app.post('/api/config/bundler', (req, res) => {
    try {
      const { type, apiKey, paymasterUrl } = req.body;

      if (!apiKey) {
        return res.status(400).json({ error: 'API key is required' });
      }

      initializeBundlerProvider({ type, apiKey, paymasterUrl });
      res.json({ 
        success: true, 
        message: 'Bundler configuration updated successfully',
        config: {
          type: type || 'alchemy',
          hasPaymaster: !!paymasterUrl
        }
      });
    } catch (error) {
      console.error('Error updating bundler configuration:', error);
      res.status(500).json({ error: 'Failed to update bundler configuration' });
    }
  });

  // Updated send-user-operation endpoint with proper paymaster handling
  app.post('/api/send-user-operation', async (req, res) => {
    try {
      const { userOp, chainId, usePaymaster = false } = req.body;

      if (!bundlerProvider) {
        throw new Error('Bundler provider not configured. Please configure bundler settings first.');
      }

      if (!chainId) {
        throw new Error('Missing chainId parameter');
      }

      const factoryAddress = SIMPLE_ACCOUNT_FACTORY[chainId as keyof typeof SIMPLE_ACCOUNT_FACTORY];
      if (!factoryAddress) {
        throw new Error(`Unsupported chain ID: ${chainId}`);
      }

      const entryPoint = ENTRY_POINT_ADDRESSES[chainId as keyof typeof ENTRY_POINT_ADDRESSES];
      if (!entryPoint) {
        throw new Error(`No entry point address for chain ID: ${chainId}`);
      }

      // Clear paymaster data if not using paymaster
      if (!usePaymaster || !bundlerConfig?.paymasterUrl) {
        userOp.paymasterAndData = '0x';
        console.log('Paymaster disabled for this transaction');
      }

      // Enhanced logging for debugging
      console.log(`Sending UserOperation to network ${chainId}`);
      console.log('UserOperation:', JSON.stringify(userOp, null, 2));
      console.log('Factory Address:', factoryAddress);
      console.log('EntryPoint:', entryPoint);
      console.log('Paymaster Enabled:', usePaymaster && !!bundlerConfig?.paymasterUrl);

      // Send the operation using the bundler
      const result = await bundlerProvider.sendUserOperation(
        userOp,
        entryPoint,
        chainId
      );

      res.json(result);
    } catch (error: any) {
      console.error('Error in send-user-operation:', error);

      // Enhanced error response with context
      res.status(500).json({
        error: error.message,
        context: {
          chainId: req.body.chainId,
          factoryAddress: SIMPLE_ACCOUNT_FACTORY[req.body.chainId as keyof typeof SIMPLE_ACCOUNT_FACTORY],
          entryPoint: ENTRY_POINT_ADDRESSES[req.body.chainId as keyof typeof ENTRY_POINT_ADDRESSES],
          usePaymaster: req.body.usePaymaster,
          hasPaymasterConfig: !!bundlerConfig?.paymasterUrl,
          timestamp: new Date().toISOString()
        }
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}