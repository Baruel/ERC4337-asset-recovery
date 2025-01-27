import { createConfig, http } from 'wagmi';
import { mainnet, polygon, arbitrum, optimism, base, avalanche, bsc } from 'wagmi/chains';
import { create } from 'zustand';
import { privateKeyToAccount } from 'viem/accounts';
import { createWalletClient, encodeFunctionData, keccak256, concat, toBytes, createPublicClient } from 'viem';
import { computeSmartWalletAddress, generateInitCode, signMessage } from './smartWallet';
import { useQuery, useMutation } from '@tanstack/react-query';
import { verifyDeployment } from './deployment';
import { deploySmartWallet } from './smartWallet';

// Define supported networks
export const SUPPORTED_NETWORKS = [
  mainnet,
  polygon,
  arbitrum,
  optimism,
  base,
  avalanche,
  bsc
] as const;

// Initialize wagmi config with all supported networks
export const config = createConfig({
  chains: SUPPORTED_NETWORKS,
  transports: SUPPORTED_NETWORKS.reduce((acc, network) => ({
    ...acc,
    [network.id]: http()
  }), {} as Record<(typeof SUPPORTED_NETWORKS)[number]['id'], ReturnType<typeof http>>)
});

interface BundlerConfig {
  type: 'alchemy';
  apiKey: string;
  paymasterUrl?: string;
}

// Enhanced bundler configuration hook with better error handling
export function useBundlerConfig() {
  return useMutation({
    mutationFn: async (config: BundlerConfig) => {
      try {
        const response = await fetch('/api/config/bundler', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: config.type,
            apiKey: config.apiKey,
            paymasterUrl: config.paymasterUrl
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          let errorMessage = 'Failed to update bundler configuration';

          try {
            const errorData = JSON.parse(errorText);
            errorMessage = errorData.error || errorData.message || errorText;
          } catch {
            errorMessage = errorText;
          }

          throw new Error(`Configuration failed: ${errorMessage}`);
        }

        return response.json();
      } catch (error) {
        console.error('Bundler configuration error:', error);
        throw error instanceof Error ? error : new Error('Unknown error occurred');
      }
    },
  });
}

// Hook for account management
export function useAccount() {
  const { address, smartWalletAddress, connect } = useWalletStore();
  return {
    address,
    smartWalletAddress,
    isConnected: !!address,
    connect
  };
}

// Hook for disconnecting
export function useDisconnect() {
  const { disconnect } = useWalletStore();
  return { disconnect };
}

// Hook for transaction history
export function useTransactionHistory(address: string) {
  return useQuery({
    queryKey: ['transactions', address],
    queryFn: async () => {
      const response = await fetch(`/api/transactions/${address}`);
      if (!response.ok) {
        throw new Error('Failed to fetch transaction history');
      }
      return response.json();
    },
    enabled: !!address
  });
}

// Helper functions for transaction handling
async function fetchNonce(address: string, chainId: number): Promise<bigint> {
  const response = await fetch(`/api/smart-wallet/nonce?address=${address}&chainId=${chainId}`);
  if (!response.ok) {
    throw new Error('Failed to fetch nonce');
  }
  return BigInt((await response.text()).trim());
}

async function fetchEntryPoint(chainId: number): Promise<string> {
  const response = await fetch(`/api/smart-wallet/entry-point?chainId=${chainId}`);
  if (!response.ok) {
    throw new Error('Failed to fetch entry point address');
  }
  const entryPoint = await response.text();
  return entryPoint.trim().replace(/['"]/g, '');
}

// Convert BigInt values to hex strings for serialization
function serializeUserOp(userOp: any) {
  // Helper function to convert any value to a proper hex string
  const formatHex = (value: bigint | string | number | null | undefined): string => {
    if (value === null || value === undefined) {
      return '0x';
    }

    // Handle different value types
    if (typeof value === 'bigint') {
      return `0x${value.toString(16)}`;
    }
    if (typeof value === 'number') {
      return `0x${value.toString(16)}`;
    }
    if (typeof value === 'string') {
      // If already hex, return as is
      if (value.startsWith('0x')) {
        return value;
      }
      // If numeric string, convert to hex
      if (/^\d+$/.test(value)) {
        return `0x${BigInt(value).toString(16)}`;
      }
      // If regular string, convert to hex
      return `0x${value}`;
    }
    return '0x';
  };

  // Serialize all fields
  const serialized = {
    sender: formatHex(userOp.sender),
    nonce: formatHex(userOp.nonce),
    initCode: formatHex(userOp.initCode),
    callData: formatHex(userOp.callData),
    callGasLimit: formatHex(userOp.callGasLimit),
    verificationGasLimit: formatHex(userOp.verificationGasLimit),
    preVerificationGas: formatHex(userOp.preVerificationGas),
    maxFeePerGas: formatHex(userOp.maxFeePerGas),
    maxPriorityFeePerGas: formatHex(userOp.maxPriorityFeePerGas),
    paymasterAndData: formatHex(userOp.paymasterAndData),
    signature: formatHex(userOp.signature)
  };

  // Log the serialized operation for debugging
  console.log('Serialized UserOperation:', JSON.stringify(serialized, null, 2));

  return serialized;
}

async function signUserOp(userOp: any, chainId: number, entryPoint: string, privateKey: string) {
  if (!privateKey) throw new Error('No private key available');

  const formatHex = (value: bigint | string) => {
    const hex = typeof value === 'bigint' ? value.toString(16) : value;
    return hex.startsWith('0x') ? hex : `0x${hex}`;
  };

  // Pack the parameters in the correct order for EIP-4337
  const packed = concat([
    toBytes(formatHex(userOp.sender)),
    toBytes(formatHex(userOp.nonce)),
    toBytes(formatHex(userOp.initCode)),
    toBytes(formatHex(userOp.callData)),
    toBytes(formatHex(userOp.callGasLimit)),
    toBytes(formatHex(userOp.verificationGasLimit)),
    toBytes(formatHex(userOp.preVerificationGas)),
    toBytes(formatHex(userOp.maxFeePerGas)),
    toBytes(formatHex(userOp.maxPriorityFeePerGas)),
    toBytes(formatHex(userOp.paymasterAndData))
  ]);

  // Add chain ID and entry point to the message
  const message = concat([
    toBytes(entryPoint),
    toBytes(formatHex(BigInt(chainId))),
    packed
  ]);

  // Hash the message
  const userOpHash = keccak256(message);
  console.log('Generated user operation hash:', userOpHash);

  return signMessage(userOpHash.slice(2), privateKey);
}

// Helper to parse error stack trace and extract file information
function parseErrorStack(error: Error): { file: string; line: number; column?: number }[] {
  const stack = error.stack || '';
  const stackLines = stack.split('\n').slice(1); // Skip first line (error message)

  return stackLines
    .map(line => {
      const match = line.match(/at\s+(?:\w+\s+)?\(?(.+):(\d+):(\d+)\)?/);
      if (match) {
        const [_, file, line, column] = match;
        return {
          file: file.replace(window.location.origin, ''),
          line: parseInt(line, 10),
          column: parseInt(column, 10)
        };
      }
      return null;
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);
}

// Helper to parse bundler error messages
function parseBundlerError(errorText: string): string {
  try {
    const parsed = JSON.parse(errorText);
    if (parsed.error?.details) {
      try {
        const nestedError = JSON.parse(parsed.error.details);
        if (nestedError.error?.message) {
          return nestedError.error.message;
        }
      } catch (e) {
        // If nested parsing fails, use the outer error
        return parsed.error.details;
      }
    }
    if (parsed.error?.message) {
      return parsed.error.message;
    }
    return errorText;
  } catch (e) {
    return errorText;
  }
}

// Enhanced error handling for transaction errors
function formatTransactionError(error: any, context: Record<string, any> = {}) {
  const errorResponse = {
    error: 'Failed to send UserOperation',
    message: error instanceof Error ? error.message : 'Unknown error',
    details: error instanceof Error ? error.stack : JSON.stringify(error),
    timestamp: new Date().toISOString(),
    context
  };

  // Log detailed error information for debugging
  console.error('Error details:', {
    ...errorResponse,
    originalError: error
  });

  return errorResponse;
}


// Updated sendTransaction hook with explicit paymaster handling
export function useSendTransaction() {
  const { privateKey, address, smartWalletAddress } = useWalletStore();

  return {
    mutateAsync: async (values: {
      recipient: string;
      amount: string;
      network: string;
      token: string;
      usePaymaster?: boolean; // Optional parameter for paymaster usage
    }) => {
      let selectedNetwork;
      try {
        if (!privateKey || !address) {
          throw new Error('Wallet not connected');
        }

        // Find the selected network
        selectedNetwork = SUPPORTED_NETWORKS.find(n => n.name === values.network);
        if (!selectedNetwork) {
          throw new Error('Network not supported');
        }

        const sender = smartWalletAddress || address;

        // Check if the wallet is deployed
        const isDeployed = await verifyDeployment(sender, selectedNetwork.id);
        console.log('Wallet deployment status:', { isDeployed, sender, chainId: selectedNetwork.id });

        // Generate initCode if wallet is not deployed
        const initCode = !isDeployed ? await generateInitCode(address, selectedNetwork.id) : '0x';
        console.log('InitCode:', initCode);

        // Get the current nonce
        const nonce = await fetchNonce(sender, selectedNetwork.id);

        // Create the user operation
        const userOp = {
          sender,
          nonce: nonce.toString(),
          initCode,
          callData: encodeFunctionData({
            abi: [{
              name: 'transfer',
              type: 'function',
              stateMutability: 'nonpayable',
              inputs: [
                { name: 'recipient', type: 'address' },
                { name: 'amount', type: 'uint256' }
              ],
              outputs: [{ type: 'bool' }]
            }],
            functionName: 'transfer',
            args: [values.recipient as `0x${string}`, BigInt(values.amount)]
          }),
          callGasLimit: '500000',
          verificationGasLimit: '500000',
          preVerificationGas: '50000',
          maxFeePerGas: '5000000000',
          maxPriorityFeePerGas: '5000000000',
          paymasterAndData: '0x', // Will be handled by the server based on usePaymaster
          signature: '0x' // Will be filled after signing
        };

        // Get entry point and sign the operation
        const entryPoint = await fetchEntryPoint(selectedNetwork.id);
        const signature = await signUserOp(userOp, selectedNetwork.id, entryPoint, privateKey);
        const signedUserOp = { ...userOp, signature };

        // Serialize the operation before sending
        const serializedUserOp = serializeUserOp(signedUserOp);
        console.log('Sending serialized UserOperation:', JSON.stringify(serializedUserOp, null, 2));

        // Send to bundler with explicit paymaster flag
        const response = await fetch('/api/send-user-operation', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userOp: serializedUserOp,
            chainId: selectedNetwork.id,
            usePaymaster: values.usePaymaster ?? false // Default to false for safety
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          let errorMessage = 'Failed to send transaction';

          try {
            const errorData = JSON.parse(errorText);
            if (errorData.error?.includes('paymaster')) {
              errorMessage = `Paymaster error: ${errorData.error}. Consider sending without a paymaster or ensure your wallet has sufficient funds.`;
            } else {
              errorMessage = errorData.error || errorText;
            }
          } catch (e) {
            errorMessage = errorText;
          }

          throw new Error(errorMessage);
        }

        const result = await response.json();
        console.log('Transaction result:', result);

        return result;
      } catch (error) {
        console.error('Transaction error:', error);
        throw formatTransactionError(error, {
          network: selectedNetwork ? {
            name: selectedNetwork.name,
            chainId: selectedNetwork.id
          } : undefined,
          usePaymaster: values.usePaymaster,
          timestamp: new Date().toISOString()
        });
      }
    }
  };
}

// In verifyUserOperation function, fix the status comparison
export async function verifyUserOperation(txResponse: any, chainId: number) {
  try {
    if (!txResponse || !txResponse.hash) {
      return { success: false, error: 'Invalid transaction response' };
    }

    // Wait for a few seconds to allow the transaction to propagate
    await new Promise(resolve => setTimeout(resolve, 5000));

    const network = SUPPORTED_NETWORKS.find(n => n.id === chainId);
    if (!network) {
      return { success: false, error: `Unsupported chain ID: ${chainId}` };
    }

    const client = createPublicClient({
      chain: network,
      transport: http()
    });

    const receipt = await client.getTransactionReceipt({
      hash: txResponse.hash as `0x${string}`
    });

    if (!receipt) {
      return { success: false, error: 'Transaction receipt not found' };
    }

    // Handle different status types without direct comparison
    const isSuccess = receipt.status !== undefined && (
      String(receipt.status) === 'success' ||
      String(receipt.status) === '1'
    );

    return isSuccess 
      ? { success: true }
      : { success: false, error: 'Transaction failed on-chain' };
  } catch (error) {
    console.error('Error verifying user operation:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during verification'
    };
  }
}

interface WalletState {
  address: string | null;
  smartWalletAddress: string | null;
  privateKey: string | null;
  connect: (privateKey: string) => Promise<void>;
  disconnect: () => void;
}

// Create wallet store
const useWalletStore = create<WalletState>((set) => ({
  address: null,
  smartWalletAddress: null,
  privateKey: null,
  connect: async (privateKey: string) => {
    try {
      const account = privateKeyToAccount(privateKey as `0x${string}`);

      // For the first network (e.g., Ethereum mainnet), compute the smart wallet address
      const smartWalletAddress = await computeSmartWalletAddress(account.address, SUPPORTED_NETWORKS[0].id);

      set({
        address: account.address,
        smartWalletAddress,
        privateKey
      });
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      throw error;
    }
  },
  disconnect: () => {
    set({
      address: null,
      smartWalletAddress: null,
      privateKey: null
    });
  }
}));