import { useQuery } from '@tanstack/react-query';
import { formatUnits } from 'viem';
import { SUPPORTED_NETWORKS } from './web3';

// Common tokens across networks with their addresses
const NETWORK_TOKENS = {
  // Ethereum
  1: [
    { address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', symbol: 'WETH', decimals: 18 },
    { address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', symbol: 'USDC', decimals: 6 },
    { address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', symbol: 'USDT', decimals: 6 }
  ],
  // Polygon
  137: [
    { address: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270', symbol: 'WMATIC', decimals: 18 },
    { address: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', symbol: 'USDC', decimals: 6 }
  ],
  // Arbitrum
  42161: [
    { address: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', symbol: 'WETH', decimals: 18 },
    { address: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8', symbol: 'USDC', decimals: 6 }
  ],
  // Optimism
  10: [
    { address: '0x4200000000000000000000000000000000000006', symbol: 'WETH', decimals: 18 },
    { address: '0x7F5c764cBc14f9669B88837ca1490cCa17c31607', symbol: 'USDC', decimals: 6 }
  ],
  // Base
  8453: [
    { address: '0x4200000000000000000000000000000000000006', symbol: 'WETH', decimals: 18 },
    { address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', symbol: 'USDC', decimals: 6 }
  ],
  // Avalanche
  43114: [
    { address: '0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7', symbol: 'WAVAX', decimals: 18 },
    { address: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E', symbol: 'USDC', decimals: 6 }
  ],
  // BNB Chain
  56: [
    { address: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c', symbol: 'WBNB', decimals: 18 },
    { address: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d', symbol: 'USDC', decimals: 6 }
  ]
};

export function useTokenBalances(address: string) {
  return useQuery({
    queryKey: ['token-balances', address],
    queryFn: async () => {
      const balances = await Promise.all(
        SUPPORTED_NETWORKS.flatMap(async (network) => {
          const networkTokens = NETWORK_TOKENS[network.id as keyof typeof NETWORK_TOKENS] || [];

          const networkBalances = await Promise.all(
            networkTokens.map(async (token) => {
              try {
                console.log(`Requesting balance for ${token.symbol} on ${network.name} (Chain ID: ${network.id})`);
                const result = await fetch('/api/tokens/balance', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    tokenAddress: token.address,
                    userAddress: address,
                    chainId: network.id
                  }),
                });

                const data = await result.json();
                console.log(`Received balance for ${token.symbol} on ${network.name}: ${data.balance}`);
                return {
                  ...token,
                  balance: formatUnits(BigInt(data.balance), token.decimals),
                  value: 0, // Price fetching will be implemented later
                  network: network.name
                };
              } catch (error) {
                console.error(`Error fetching balance for ${token.symbol} on ${network.name}:`, error);
                return {
                  ...token,
                  balance: '0',
                  value: 0,
                  network: network.name
                };
              }
            })
          );

          return networkBalances;
        })
      );

      // Flatten the array of arrays into a single array
      return balances.flat();
    },
    enabled: !!address
  });
}