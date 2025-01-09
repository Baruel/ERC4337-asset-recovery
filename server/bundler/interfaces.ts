export interface UserOperation {
  sender: string;
  nonce: string;
  initCode: string;
  callData: string;
  callGasLimit: string;
  verificationGasLimit: string;
  preVerificationGas: string;
  maxFeePerGas: string;
  maxPriorityFeePerGas: string;
  paymasterAndData: string;
  signature: string;
}

export interface BundlerProviderConfig {
  apiKey: string;
  baseUrl?: string;
  paymasterUrl?: string;
}

export interface BundlerProvider {
  sendUserOperation(userOp: UserOperation, entryPoint: string, chainId: number): Promise<any>;
}