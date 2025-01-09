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

export interface BundlerProviderConfig {
  apiKey: string;
  baseUrl?: string;
}

export interface BundlerProvider {
  sendUserOperation(userOp: UserOperation, entryPoint: string, chainId: number): Promise<any>;
}
