import { BundlerProvider, UserOperation } from '../types';

export class AlchemyBundlerProvider implements BundlerProvider {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: { apiKey: string; baseUrl?: string }) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://eth-mainnet.g.alchemy.com/v2';
  }

  async sendUserOperation(userOp: UserOperation, entryPoint: string, chainId: number): Promise<any> {
    const chainPrefix = this.getChainPrefix(chainId);
    const url = `${this.baseUrl}/${this.apiKey}/${chainPrefix}`;

    console.log(`[Alchemy] Sending UserOperation to chain ${chainId}`);
    console.log(`[Alchemy] EntryPoint: ${entryPoint}`);
    console.log(`[Alchemy] Using URL: ${url}`);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        method: 'eth_sendUserOperation',
        params: [userOp, entryPoint],
        id: 1,
        jsonrpc: '2.0'
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Alchemy] Request failed: ${errorText}`);
      throw new Error(`Bundler request failed: ${response.status} ${errorText}`);
    }

    const result = await response.json();
    console.log(`[Alchemy] UserOperation sent successfully`, result);
    return result;
  }

  private getChainPrefix(chainId: number): string {
    switch (chainId) {
      case 1:
        return 'eth';  // Mainnet
      case 137:
        return 'polygon';
      case 42161:
        return 'arb';
      case 10:
        return 'opt';
      case 8453:
        return 'base';
      default:
        throw new Error(`Unsupported chain ID for Alchemy: ${chainId}`);
    }
  }
}