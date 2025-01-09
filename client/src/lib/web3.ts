import { createConfig, http } from 'wagmi';
import { mainnet, polygon, arbitrum, optimism, base, avalanche, bsc } from 'wagmi/chains';
import { create } from 'zustand';
import { privateKeyToAccount } from 'viem/accounts';
import { createWalletClient, encodeFunctionData, keccak256, concat, toBytes } from 'viem';
import { computeSmartWalletAddress, generateInitCode, signMessage } from './smartWallet';
import { useQuery } from '@tanstack/react-query';
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

// Initialize wagmi config with all supported networks
export const config = createConfig({
  chains: SUPPORTED_NETWORKS,
  transports: Object.fromEntries(
    SUPPORTED_NETWORKS.map(network => [
      network.id,
      http()
    ])
  )
});

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

// Convert BigInt values to hex strings for serialization
function serializeUserOp(userOp: any) {
  const formatHex = (value: bigint | string) => {
    const hex = typeof value === 'bigint' ? value.toString(16) : value;
    return hex.startsWith('0x') ? hex : `0x${hex}`;
  };

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
    signature: formatHex(userOp.signature || '0x')
  };

  Object.entries(serialized).forEach(([key, value]) => {
    if (!value.startsWith('0x')) {
      throw new Error(`Invalid ${key}: must start with 0x`);
    }
    if (key === 'sender' && value.length !== 42) {
      throw new Error('Invalid sender address length');
    }
  });

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

// Hook for sending transactions
export function useSendTransaction() {
  const { privateKey, address, smartWalletAddress } = useWalletStore();

  return {
    mutateAsync: async (values: {
      recipient: string;
      amount: string;
      network: string;
      token: string;
    }) => {
      try {
        if (!privateKey || !address) {
          throw new Error('Wallet not connected');
        }

        // Find the selected network
        const network = SUPPORTED_NETWORKS.find(n => n.name === values.network);
        if (!network) {
          throw new Error('Network not supported');
        }

        // Check wallet deployment status
        const isDeployed = await verifyDeployment(address, network.id);
        if (!isDeployed) {
          console.log('Smart wallet not deployed, deploying now...');
          await deploySmartWallet(address, network.id, privateKey || '');
          console.log('Smart wallet deployed successfully');
        }

        // Create transfer calldata
        const callData = encodeFunctionData({
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
        });

        // Generate initCode if this is a new smart wallet
        let initCode = '0x';
        if (!smartWalletAddress) {
          console.log('No smart wallet found, generating initCode...');
          initCode = await generateInitCode(address, network.id);
          console.log('Generated initCode:', initCode);
        }

        // Fetch the current nonce
        const nonceResponse = await fetch(`/api/smart-wallet/nonce?address=${smartWalletAddress || address}&chainId=${network.id}`);
        if (!nonceResponse.ok) {
          throw new Error('Failed to fetch nonce');
        }

        const nonce = BigInt((await nonceResponse.text()).trim());
        console.log('Using nonce:', nonce.toString());

        // Create UserOperation with increased gas values
        const userOp = {
          sender: smartWalletAddress || address,
          nonce,
          initCode,
          callData,
          callGasLimit: BigInt(500000),
          verificationGasLimit: BigInt(500000),
          preVerificationGas: BigInt(50000),
          maxFeePerGas: BigInt(5000000000),
          maxPriorityFeePerGas: BigInt(5000000000),
          paymasterAndData: '0x'
        };

        console.log('Created user operation:', {
          ...userOp,
          nonce: userOp.nonce.toString(),
          callGasLimit: userOp.callGasLimit.toString(),
          verificationGasLimit: userOp.verificationGasLimit.toString(),
          preVerificationGas: userOp.preVerificationGas.toString(),
          maxFeePerGas: userOp.maxFeePerGas.toString(),
          maxPriorityFeePerGas: userOp.maxPriorityFeePerGas.toString(),
        });

        // Get the entry point address
        const entryPointResponse = await fetch(`/api/smart-wallet/entry-point?chainId=${network.id}`);
        if (!entryPointResponse.ok) {
          throw new Error('Failed to fetch entry point address');
        }
        const entryPoint = await entryPointResponse.text();
        const cleanEntryPoint = entryPoint.trim().replace(/['"]/g, '');

        console.log('Using entry point:', cleanEntryPoint);

        // Sign the user operation
        const signature = await signUserOp(userOp, network.id, cleanEntryPoint, privateKey);
        const signedUserOp = { ...userOp, signature };

        // Serialize before sending
        const serializedUserOp = serializeUserOp(signedUserOp);
        console.log('Sending serialized UserOperation:', JSON.stringify(serializedUserOp, null, 2));

        // Send to bundler
        const response = await fetch('/api/send-user-operation', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userOp: serializedUserOp,
            network: network.id
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Raw bundler response:', errorText);
          const errorMessage = parseBundlerError(errorText);

          const error = new Error(errorMessage);
          (error as any).userOperation = serializedUserOp;
          (error as any).rawError = errorText;
          throw error;
        }

        const result = await response.json();
        console.log('Transaction result:', result);
        return result;
      } catch (error) {
        console.error('Transaction error:', error);
        throw error;
      }
    },
    isLoading: false
  };
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

// Add the verifyUserOperation function
export async function verifyUserOperation(txResponse: any, chainId: number) {
  try {
    if (!txResponse || !txResponse.hash) {
      return { success: false, error: 'Invalid transaction response' };
    }

    // Wait for a few seconds to allow the transaction to propagate
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Create a public client for the specific chain
    const network = SUPPORTED_NETWORKS.find(n => n.id === chainId);
    if (!network) {
      return { success: false, error: `Unsupported chain ID: ${chainId}` };
    }

    const client = createPublicClient({
      chain: network,
      transport: http()
    });

    // Check transaction receipt
    const receipt = await client.getTransactionReceipt({
      hash: txResponse.hash as `0x${string}`
    });

    if (!receipt) {
      return { success: false, error: 'Transaction receipt not found' };
    }

    // Verify if the transaction was successful
    if (receipt.status === 1) { //Corrected status check
      return { success: true };
    } else {
      return { success: false, error: 'Transaction failed on-chain' };
    }
  } catch (error) {
    console.error('Error verifying user operation:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during verification'
    };
  }
}