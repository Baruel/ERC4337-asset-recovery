import { createWalletClient, encodeFunctionData, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { mainnet } from 'viem/chains';
import { estimateDeploymentGas, trackDeployment, verifyDeployment } from './deployment';

// Constants for Account Abstraction with updated Polygon factory
export const SIMPLE_ACCOUNT_FACTORY = {
  1: '0x9406Cc6185a346906296840746125a0E44976454',
  137: '0xE77f2C7D79B2743d39Ad73DC47a8e9C6416aD3f3', // Polygon-specific factory
  42161: '0x9406Cc6185a346906296840746125a0E44976454',
  10: '0x9406Cc6185a346906296840746125a0E44976454',
  8453: '0x9406Cc6185a346906296840746125a0E44976454',
  43114: '0x9406Cc6185a346906296840746125a0E44976454',
  56: '0x9406Cc6185a346906296840746125a0E44976454'
} as const;

// Factory ABI for computing counterfactual address
export const FACTORY_ABI = [
  {
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'salt', type: 'uint256' }
    ],
    name: 'createAccount',
    outputs: [{ name: 'ret', type: 'address' }],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'salt', type: 'uint256' }
    ],
    name: 'getAddress',
    outputs: [{ name: 'ret', type: 'address' }],
    stateMutability: 'view',
    type: 'function'
  }
] as const;

// Function to compute the counterfactual wallet address
export async function computeSmartWalletAddress(ownerAddress: string, chainId: number): Promise<string> {
  const factoryAddress = SIMPLE_ACCOUNT_FACTORY[chainId as keyof typeof SIMPLE_ACCOUNT_FACTORY];
  if (!factoryAddress) {
    throw new Error(`No factory address for chain ID ${chainId}`);
  }

  try {
    const response = await fetch('/api/smart-wallet/compute-address', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ownerAddress,
        chainId,
        salt: 0 // Using a fixed salt for simplicity
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to compute smart wallet address');
    }

    const { address } = await response.json();
    return address;
  } catch (error) {
    console.error('Error computing smart wallet address:', error);
    throw error;
  }
}

// Function to generate initCode for wallet deployment
export async function generateInitCode(ownerAddress: string, chainId: number): Promise<string> {
  const factoryAddress = SIMPLE_ACCOUNT_FACTORY[chainId as keyof typeof SIMPLE_ACCOUNT_FACTORY];
  if (!factoryAddress) {
    throw new Error(`No factory address for chain ID ${chainId}`);
  }

  // Ensure proper formatting of addresses
  const formattedFactoryAddress = factoryAddress.toLowerCase();
  const formattedOwnerAddress = ownerAddress.toLowerCase();

  // Encode the createAccount function call
  const createAccountData = encodeFunctionData({
    abi: FACTORY_ABI,
    functionName: 'createAccount',
    args: [formattedOwnerAddress as `0x${string}`, BigInt(0)] // Using salt 0 for simplicity
  });

  // Generate initCode by concatenating factory address with the encoded function data
  const initCode = formattedFactoryAddress + createAccountData.slice(2);

  console.log('Generated initCode:', {
    factoryAddress: formattedFactoryAddress,
    ownerAddress: formattedOwnerAddress,
    chainId,
    createAccountData,
    initCode
  });

  return initCode;
}

// Function to deploy the smart wallet
export async function deploySmartWallet(ownerAddress: string, chainId: number): Promise<string> {
  const factoryAddress = SIMPLE_ACCOUNT_FACTORY[chainId as keyof typeof SIMPLE_ACCOUNT_FACTORY];
  if (!factoryAddress) {
    throw new Error(`No factory address for chain ID ${chainId}`);
  }

  // First compute the expected address
  const expectedAddress = await computeSmartWalletAddress(ownerAddress, chainId);
  console.log('Expected wallet address:', expectedAddress);

  // Check if already deployed
  const isDeployed = await verifyDeployment(expectedAddress, chainId);
  if (isDeployed) {
    console.log('Smart wallet already deployed at:', expectedAddress);
    return expectedAddress;
  }

  // Generate initCode for deployment
  const initCode = await generateInitCode(ownerAddress, chainId);

  // Estimate deployment gas
  const gasEstimate = await estimateDeploymentGas(factoryAddress, ownerAddress, chainId);

  // Create deployment UserOperation
  const deploymentOp = {
    sender: expectedAddress,
    nonce: '0x0',
    initCode,
    callData: '0x',
    callGasLimit: gasEstimate.toString(16),
    verificationGasLimit: '0x100000',
    preVerificationGas: '0xc350',
    maxFeePerGas: '0x12a05f200',
    maxPriorityFeePerGas: '0x12a05f200',
    paymasterAndData: '0x',
    signature: '0x'
  };

  console.log('Sending deployment UserOperation:', JSON.stringify(deploymentOp, null, 2));

  // Track deployment with retries
  try {
    const result = await trackDeployment(
      fetch('/api/send-user-operation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userOp: deploymentOp,
          chainId
        })
      })
    );

    // Wait for deployment confirmation
    let attempts = 0;
    const maxAttempts = 10;
    while (attempts < maxAttempts) {
      const isConfirmed = await verifyDeployment(expectedAddress, chainId);
      if (isConfirmed) {
        console.log('Wallet deployment confirmed at:', expectedAddress);
        return expectedAddress;
      }
      await new Promise(resolve => setTimeout(resolve, 2000));
      attempts++;
    }

    throw new Error('Deployment verification timeout');
  } catch (error) {
    console.error('Deployment failed:', error);
    throw error;
  }
}

// Function to sign messages for the smart wallet
export async function signMessage(message: string, privateKey: string): Promise<string> {
  const account = privateKeyToAccount(privateKey as `0x${string}`);
  const client = createWalletClient({
    account,
    chain: mainnet,
    transport: http()
  });

  const signature = await client.signMessage({ message });
  return signature;
}