import { BundlerProvider, UserOperation } from './types';
import { AlchemyBundlerProvider } from './providers/alchemy';
import { createBundlerProvider as createProvider } from './factory';

// Factory to create bundler provider instances
export function createBundlerProvider(): BundlerProvider {
  if (!process.env.ALCHEMY_API_KEY) {
    throw new Error('ALCHEMY_API_KEY environment variable is not set');
  }

  // Initialize Alchemy provider with API key from environment
  return createProvider('alchemy', {
    apiKey: process.env.ALCHEMY_API_KEY
  });
}

export class StackupBundlerProvider implements BundlerProvider {
  constructor(private apiKey: string, private baseUrl: string = 'https://api.stackup.sh/v1/bundler') {}

  async sendUserOperation(userOp: UserOperation, entryPoint: string, chainId: number): Promise<any> {
    console.log(`[Stackup] Sending UserOperation to chain ${chainId}`);
    console.log(`[Stackup] EntryPoint: ${entryPoint}`);

    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_sendUserOperation',
        params: [userOp, entryPoint]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Stackup] Request failed: ${errorText}`);
      throw new Error(`Bundler request failed: ${response.status} ${errorText}`);
    }

    const result = await response.json();
    console.log(`[Stackup] UserOperation sent successfully`, result);
    return result;
  }
}