import { BundlerProvider, BundlerProviderConfig } from './types';
import { AlchemyBundlerProvider } from './providers/alchemy';

export function createBundlerProvider(type: string = 'alchemy', config: BundlerProviderConfig): BundlerProvider {
  console.log(`Creating bundler provider of type: ${type}`);

  switch (type.toLowerCase()) {
    case 'alchemy':
      return new AlchemyBundlerProvider(config);
    default:
      throw new Error(`Unsupported bundler provider: ${type}`);
  }
}