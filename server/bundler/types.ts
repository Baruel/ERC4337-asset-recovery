export interface UserOperation {
  sender: string;
  nonce: bigint;
  initCode: string;
  callData: string;
  callGasLimit: bigint;
  verificationGasLimit: bigint;
  preVerificationGas: bigint;
  maxFeePerGas: bigint;
  maxPriorityFeePerGas: bigint;
  paymasterAndData: string;
  signature: string;
}

export interface BundlerProvider {
  sendUserOperation(userOp: UserOperation, entryPoint: string, chainId: number): Promise<any>;
}

export interface BundlerConfig {
  type: string;
  apiKey?: string;
  baseUrl?: string;
  // Add other provider-specific configuration options as needed
}