import { UserOperation as InterfaceUserOperation } from './interfaces';

export type UserOperation = InterfaceUserOperation;

export interface BundlerProvider {
  sendUserOperation(userOp: UserOperation, entryPoint: string, chainId: number): Promise<any>;
}

export interface BundlerProviderConfig {
  apiKey: string;
  baseUrl?: string;
}

export interface BundlerConfig {
  type: string;
  apiKey?: string;
  baseUrl?: string;
}