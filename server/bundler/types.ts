import { UserOperation as InterfaceUserOperation } from './interfaces';

export type UserOperation = InterfaceUserOperation;

export interface BundlerProvider {
  sendUserOperation(userOp: UserOperation, entryPoint: string, chainId: number): Promise<any>;
}

export interface BundlerProviderConfig {
  apiKey: string;
  baseUrl?: string;
  paymasterUrl?: string;
}

export interface BundlerConfig {
  type: 'alchemy';
  apiKey: string;
  paymasterUrl?: string;
}

export interface BundlerState {
  isConfigured: boolean;
  type?: string;
  hasPaymaster?: boolean;
  error?: string;
}