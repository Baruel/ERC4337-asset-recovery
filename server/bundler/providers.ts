import { type UserOperation } from './types';

export interface BundlerProvider {
  sendUserOperation(userOp: UserOperation, entryPoint: string, chainId: number): Promise<any>;
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

// Example of another bundler provider implementation
export class AlchemyBundlerProvider implements BundlerProvider {
  constructor(private apiKey: string, private baseUrl?: string) {}

  async sendUserOperation(userOp: UserOperation, entryPoint: string, chainId: number): Promise<any> {
    console.log(`[Alchemy] Would send UserOperation to chain ${chainId}`);
    // Implement Alchemy-specific bundler interaction
    throw new Error('Alchemy bundler implementation pending');
  }
}

// Factory to create bundler provider instances
export function createBundlerProvider(type: string, config: any): BundlerProvider {
  console.log(`Creating bundler provider of type: ${type}`);

  switch (type.toLowerCase()) {
    case 'stackup':
      return new StackupBundlerProvider(config.apiKey, config.baseUrl);
    case 'alchemy':
      return new AlchemyBundlerProvider(config.apiKey, config.baseUrl);
    default:
      throw new Error(`Unsupported bundler provider: ${type}`);
  }
}