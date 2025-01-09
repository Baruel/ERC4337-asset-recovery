import { BundlerProvider, BundlerProviderConfig, BundlerState } from './types';
import { AlchemyBundlerProvider } from './providers/alchemy';

let bundlerState: BundlerState = {
  isConfigured: false
};

export function getBundlerState(): BundlerState {
  return { ...bundlerState };
}

export function createBundlerProvider(type: string = 'alchemy', config: BundlerProviderConfig): BundlerProvider {
  try {
    console.log(`Creating bundler provider of type: ${type}`);

    if (!config.apiKey) {
      bundlerState = {
        isConfigured: false,
        error: 'API key is required'
      };
      throw new Error('API key is required');
    }

    let provider: BundlerProvider;
    switch (type.toLowerCase()) {
      case 'alchemy':
        provider = new AlchemyBundlerProvider(config);
        bundlerState = {
          isConfigured: true,
          type: 'alchemy',
          hasPaymaster: !!config.paymasterUrl
        };
        return provider;
      default:
        bundlerState = {
          isConfigured: false,
          error: `Unsupported bundler provider: ${type}`
        };
        throw new Error(`Unsupported bundler provider: ${type}`);
    }
  } catch (error) {
    console.error('Failed to create bundler provider:', error);
    if (!bundlerState.error) {
      bundlerState = {
        isConfigured: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
    throw error;
  }
}