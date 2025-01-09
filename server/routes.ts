import type { Express } from "express";
import { createServer, type Server } from "http";
import { createPublicClient, http, formatUnits } from 'viem';
import { mainnet, polygon, arbitrum, optimism, base, avalanche, bsc } from 'viem/chains';

const NETWORKS = {
  1: mainnet,
  137: polygon,
  42161: arbitrum,
  10: optimism,
  8453: base,
  43114: avalanche,
  56: bsc
};

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

      console.log(`Balance result for ${tokenAddress} on ${chain.name}: ${balance.toString()}`);

      res.json({ balance: balance.toString() });
    } catch (error) {
      console.error('Error fetching token balance:', error);
      res.status(500).json({ error: 'Failed to fetch token balance' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}