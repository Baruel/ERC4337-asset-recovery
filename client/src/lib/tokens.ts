import { useQuery } from '@tanstack/react-query';
import { mainnet } from 'wagmi/chains';
import { formatUnits, parseAbiItem } from 'viem';

const ERC20_ABI = [
  parseAbiItem('function balanceOf(address) view returns (uint256)'),
  parseAbiItem('function symbol() view returns (string)'),
  parseAbiItem('function decimals() view returns (uint8)')
] as const;

const COMMON_TOKENS = [
  {
    address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    symbol: 'WETH',
    decimals: 18
  },
  {
    address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    symbol: 'USDC',
    decimals: 6
  },
  {
    address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    symbol: 'USDT',
    decimals: 6
  }
];

export function useTokenBalances(address: string) {
  return useQuery({
    queryKey: ['token-balances', address],
    queryFn: async () => {
      const balances = await Promise.all(
        COMMON_TOKENS.map(async (token) => {
          try {
            const result = await fetch('/api/tokens/balance', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                tokenAddress: token.address,
                userAddress: address,
              }),
            });

            const data = await result.json();
            return {
              ...token,
              balance: formatUnits(BigInt(data.balance), token.decimals),
              value: 0 // Price fetching will be implemented later
            };
          } catch (error) {
            console.error(`Error fetching balance for ${token.symbol}:`, error);
            return {
              ...token,
              balance: '0',
              value: 0
            };
          }
        })
      );

      return balances;
    },
    enabled: !!address
  });
}