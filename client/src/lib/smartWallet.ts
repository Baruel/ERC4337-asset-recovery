import { createWalletClient, encodeFunctionData, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { mainnet } from 'viem/chains';

// Constants for Account Abstraction
export const SIMPLE_ACCOUNT_FACTORY = {
  1: '0x9406Cc6185a346906296840746125a0E44976454',
  137: '0x9406Cc6185a346906296840746125a0E44976454',
  42161: '0x9406Cc6185a346906296840746125a0E44976454',
  10: '0x9406Cc6185a346906296840746125a0E44976454',
  8453: '0x9406Cc6185a346906296840746125a0E44976454',
  43114: '0x9406Cc6185a346906296840746125a0E44976454',
  56: '0x9406Cc6185a346906296840746125a0E44976454'
} as const;

// Simple Account Factory ABI
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

  // Ensure the factory address is properly formatted
  const formattedFactoryAddress = factoryAddress.toLowerCase().startsWith('0x')
    ? factoryAddress.toLowerCase()
    : `0x${factoryAddress}`;

  if (formattedFactoryAddress.length !== 42) {
    throw new Error(`Invalid factory address length: ${formattedFactoryAddress}`);
  }

  // Encode the createAccount function call
  const initCode = encodeFunctionData({
    abi: FACTORY_ABI,
    functionName: 'createAccount',
    args: [ownerAddress as `0x${string}`, BigInt(0)] // Using salt 0 for simplicity
  });

  console.log('Generated initCode parameters:', {
    factoryAddress: formattedFactoryAddress,
    ownerAddress,
    chainId,
    initCode
  });

  // Concatenate factory address with encoded function data
  return formattedFactoryAddress + initCode.slice(2);
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
