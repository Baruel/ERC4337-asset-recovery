import { BundlerProvider, UserOperation, BundlerProviderConfig } from '../types';

export class AlchemyBundlerProvider implements BundlerProvider {
  private readonly apiKey: string;
  private readonly paymasterUrl?: string;

  constructor(config: BundlerProviderConfig) {
    if (!config.apiKey) {
      throw new Error('Alchemy API key is required');
    }
    this.apiKey = config.apiKey;
    this.paymasterUrl = config.paymasterUrl;
    console.log('[Alchemy] Provider initialized', {
      hasPaymaster: !!this.paymasterUrl
    });
  }

  private validateUserOperation(userOp: UserOperation): void {
    // Validate sender address
    if (!userOp.sender?.match(/^0x[0-9a-fA-F]{40}$/)) {
      throw new Error('Invalid sender address format');
    }

    // Helper to validate hex format
    const isValidHex = (value: string | undefined | null): boolean => {
      if (!value) return true; // Allow empty values
      return value.toString().match(/^0x([0-9a-fA-F]*)?$/) !== null;
    };

    // Fields that must be validated
    const fields = {
      nonce: userOp.nonce,
      callGasLimit: userOp.callGasLimit,
      verificationGasLimit: userOp.verificationGasLimit,
      preVerificationGas: userOp.preVerificationGas,
      maxFeePerGas: userOp.maxFeePerGas,
      maxPriorityFeePerGas: userOp.maxPriorityFeePerGas,
      initCode: userOp.initCode,
      callData: userOp.callData,
      paymasterAndData: userOp.paymasterAndData,
      signature: userOp.signature
    };

    for (const [field, value] of Object.entries(fields)) {
      if (!isValidHex(value?.toString())) {
        throw new Error(`Invalid ${field} format: ${value}`);
      }
    }
  }

  async sendUserOperation(userOp: UserOperation, entryPoint: string, chainId: number): Promise<any> {
    try {
      const chainPrefix = this.getChainPrefix(chainId);
      const url = `https://${chainPrefix}.g.alchemy.com/v2/${this.apiKey}`;

      console.log(`[Alchemy] Sending UserOperation to chain ${chainId}`);
      console.log(`[Alchemy] EntryPoint: ${entryPoint}`);

      // Validate UserOperation format
      this.validateUserOperation(userOp);

      // If paymaster URL is configured, fetch paymaster data
      if (this.paymasterUrl) {
        try {
          console.log('[Alchemy] Fetching paymaster data');
          const paymasterResponse = await fetch(this.paymasterUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              userOp,
              entryPoint,
              chainId
            }),
          });

          if (!paymasterResponse.ok) {
            const errorText = await paymasterResponse.text();
            throw new Error(`Paymaster request failed: ${errorText}`);
          }

          const paymasterData = await paymasterResponse.json();
          if (!paymasterData.paymasterAndData) {
            throw new Error('Invalid paymaster response: missing paymasterAndData');
          }
          userOp.paymasterAndData = paymasterData.paymasterAndData;
          console.log('[Alchemy] Paymaster data applied:', userOp.paymasterAndData);
        } catch (error) {
          console.error('[Alchemy] Failed to fetch paymaster data:', error);
          throw new Error(`Paymaster error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      } else {
        console.log('[Alchemy] No paymaster configured, proceeding without paymaster');
      }

      // Log the operation for debugging
      console.log(`[Alchemy] Sending UserOperation:`, JSON.stringify(userOp, null, 2));

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          id: 1,
          jsonrpc: '2.0',
          method: 'eth_sendUserOperation',
          params: [userOp, entryPoint]
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[Alchemy] Request failed:`, errorText);
        throw new Error(`Bundler request failed: ${response.status} ${errorText}`);
      }

      const result = await response.json();

      if (result.error) {
        console.error(`[Alchemy] RPC error:`, result.error);
        throw new Error(result.error.message || 'Unknown RPC error');
      }

      console.log(`[Alchemy] UserOperation sent successfully:`, result);
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