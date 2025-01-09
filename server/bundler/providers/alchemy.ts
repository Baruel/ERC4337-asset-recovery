import { BundlerProvider, UserOperation } from '../types';

export class AlchemyBundlerProvider implements BundlerProvider {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: { apiKey: string; baseUrl?: string }) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://eth-mainnet.g.alchemy.com/v2';
  }

  async sendUserOperation(userOp: UserOperation, entryPoint: string, chainId: number): Promise<any> {
    try {
      const chainPrefix = this.getChainPrefix(chainId);
      const url = `${this.baseUrl}/${this.apiKey}`;

      console.log(`[Alchemy] Sending UserOperation to chain ${chainId}`);
      console.log(`[Alchemy] EntryPoint: ${entryPoint}`);
      console.log(`[Alchemy] Chain Prefix: ${chainPrefix}`);
      console.log(`[Alchemy] User Operation:`, JSON.stringify(userOp, null, 2));

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: 1,
          jsonrpc: '2.0',
          method: 'eth_sendUserOperation',
          params: [
            {
              ...userOp,
              nonce: "0x" + userOp.nonce.toString(16),
              callGasLimit: "0x" + userOp.callGasLimit.toString(16),
              verificationGasLimit: "0x" + userOp.verificationGasLimit.toString(16),
              preVerificationGas: "0x" + userOp.preVerificationGas.toString(16),
              maxFeePerGas: "0x" + userOp.maxFeePerGas.toString(16),
              maxPriorityFeePerGas: "0x" + userOp.maxPriorityFeePerGas.toString(16)
            },
            entryPoint
          ],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[Alchemy] Request failed with status ${response.status}:`, errorText);
        throw new Error(`Bundler request failed: ${response.status} ${errorText}`);
      }

      const result = await response.json();

      if (result.error) {
        console.error(`[Alchemy] RPC error:`, result.error);
        throw new Error(result.error.message || 'Unknown RPC error');
      }

      console.log(`[Alchemy] UserOperation sent successfully`, result);
      return result;
    } catch (error) {
      console.error(`[Alchemy] Error in sendUserOperation:`, error);
      throw error;
    }
  }

  private getChainPrefix(chainId: number): string {
    switch (chainId) {
      case 1:
        return 'eth-mainnet';
      case 137:
        return 'polygon-mainnet';
      case 42161:
        return 'arb-mainnet';
      case 10:
        return 'opt-mainnet';
      case 8453:
        return 'base-mainnet';
      default:
        throw new Error(`Unsupported chain ID for Alchemy: ${chainId}`);
    }
  }
}