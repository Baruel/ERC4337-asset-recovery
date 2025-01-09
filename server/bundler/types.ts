export interface UserOperation {
  sender: string;
  nonce: string; // Changed from bigint to string for proper serialization
  initCode: string;
  callData: string;
  callGasLimit: string; // Changed from bigint to string
  verificationGasLimit: string; // Changed from bigint to string
  preVerificationGas: string; // Changed from bigint to string
  maxFeePerGas: string; // Changed from bigint to string
  maxPriorityFeePerGas: string; // Changed from bigint to string
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
}